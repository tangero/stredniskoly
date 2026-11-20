// Hlídač uvízlých PR (#306, varianta A z 18. 11. 2026): jednou za hodinu (Plánovač) projde otevřené PR do main
// od vlastníka nebo asistenta zadání. U PR s konfliktem s main nebo s červenými testy napíše tokenem App jeden
// komentář `@claude` se značkou hlídače; ten spustí smyčku oprav (workflow Oprava z review), která u konfliktu
// sloučí main do větve a u testů opraví příčinu. Za jednu hlavu PR a jeden důvod jen jednou. PR se `schvaleno`,
// `stop` nebo `potrebuje-cloveka` nechá být. PR, které stojí z jiného důvodu, ukazuje zpráva Čeká na tebe.
//
//   node scripts/provoz/hlidac-pr.mjs [--nanecisto]
//
// Čte tokenem GITHUB_TOKEN, komentáře píše tokenem APP_TOKEN (komentář z GITHUB_TOKEN by žádné workflow nespustil).

import fs from 'node:fs';
import yaml from 'js-yaml';
import { pathToFileURL } from 'node:url';
import { duveryhodny } from '../brana/brana.mjs';
import { REPO, vytvorApi, nactiKonfig } from '../brana/data.mjs';
import { ZNACKA_HLIDACE } from '../brana/oprava-z-review.mjs';

export const BEZ_HLIDACE = ['schvaleno', 'stop', 'potrebuje-cloveka'];
// Nejvýš tolik komentářů za jeden běh; zbytek přijde na řadu v dalším běhu.
export const MAX_KOMENTARU = 3;
const MAX_CHYB = 5;
const MAX_DELKA_CHYBY = 200;

/** Názvy kontrol z workflow Testy (jména jobů) kromě nasazení: selhání Vercelu Claude ve větvi neopraví. */
export function nazvyTestu(workflowYaml) {
  const w = yaml.load(workflowYaml) || {};
  return Object.entries(w.jobs || {})
    .filter(([klic]) => klic !== 'deploy')
    .map(([klic, job]) => job?.name || klic);
}

/**
 * Má hlídač u PR napsat? `pr`: { autor, zForku, stitky, sha, konflikt, testy: [{ nazev, stav, zaver }],
 * komentare: [{ autor, telo }] }; `testy` jen kontroly z nazvyTestu. Vrací { duvod, cervene }, nebo null.
 * Konflikt má přednost (testy na konfliktní větvi nic neříkají). U testů čeká, dokud všechny nedoběhnou.
 */
export function coHlidat(pr, konfig) {
  if (!duveryhodny(pr.autor, konfig) || pr.zForku) return null;
  if (BEZ_HLIDACE.some((s) => (pr.stitky || []).includes(s))) return null;
  let duvod = null;
  let cervene = [];
  if (pr.konflikt) duvod = 'konflikt';
  else {
    const testy = pr.testy || [];
    if (testy.some((t) => t.stav !== 'completed')) return null;
    cervene = testy.filter((t) => ['failure', 'timed_out'].includes(t.zaver)).map((t) => t.nazev);
    if (cervene.length) duvod = 'testy';
  }
  if (!duvod) return null;
  const znacka = ZNACKA_HLIDACE(pr.sha, duvod);
  const automatika = konfig.rezimy.automatika;
  if ((pr.komentare || []).some((k) => k.autor === automatika && (k.telo || '').includes(znacka))) return null;
  return { duvod, cervene: [...new Set(cervene)] };
}

/** Text komentáře hlídače. `chyby` jsou řádky z anotací červených kontrol (soubor:řádek a zpráva). */
export function textKomentare({ sha, duvod, cervene = [], chyby = [] }) {
  const kratke = sha.slice(0, 7);
  const ukol = duvod === 'konflikt'
    ? `@claude Větev PR má na commitu \`${kratke}\` konflikt s \`main\`. Slouč do ní aktuální \`main\` a konflikty vyřeš tak, aby zůstalo chování obou stran. Když obě strany mění tutéž logiku a výběr jedné by chování ztratil, sloučení nedokončuj a napiš, co je potřeba rozhodnout.`
    : `@claude Na commitu \`${kratke}\` selhaly testy: ${cervene.join(', ')}. Spusť je, najdi příčinu a oprav ji ve větvi PR. Testy nevypínej a nemaž.`;
  const radky = [ukol];
  if (chyby.length) radky.push('', 'Z výpisu kontrol:', ...chyby.map((c) => `- ${c}`));
  radky.push('', '— Hlídač uvízlých PR (#306), jeden komentář za hlavu PR a důvod', '', ZNACKA_HLIDACE(sha, duvod));
  return radky.join('\n');
}

/** Řádky z anotací kontroly (jen chyby), zkrácené. */
export function radkyAnotaci(anotace = []) {
  return anotace
    .filter((a) => a.annotation_level === 'failure')
    .map((a) => `${a.path && a.path !== '.github' ? `${a.path}:${a.start_line} ` : ''}${String(a.message || '').replace(/\s+/g, ' ').trim()}`.slice(0, MAX_DELKA_CHYBY))
    .filter((r) => r.trim());
}

async function vsechnyKomentare(api, cislo) {
  const vse = [];
  for (let strana = 1; ; strana++) {
    const d = await api(`repos/${REPO}/issues/${cislo}/comments?per_page=100&page=${strana}`);
    vse.push(...d.map((k) => ({ autor: k.user?.login, telo: k.body || '' })));
    if (d.length < 100) return vse;
  }
}

async function main() {
  const nanecisto = process.argv.includes('--nanecisto');
  const api = vytvorApi();
  const zapis = nanecisto ? null : vytvorApi({ token: process.env.APP_TOKEN });
  if (!nanecisto && !process.env.APP_TOKEN) throw new Error('chybí APP_TOKEN (komentář musí jít tokenem App)');
  const konfig = await nactiKonfig(api);
  const testy = new Set(nazvyTestu(fs.readFileSync('.github/workflows/testy.yml', 'utf8')));
  const otevrene = await api(`repos/${REPO}/pulls?state=open&base=main&per_page=100`);
  let napsano = 0;
  for (const p of otevrene) {
    if (napsano >= MAX_KOMENTARU) break;
    const stitky = p.labels.map((l) => l.name);
    if (!duveryhodny(p.user?.login, konfig) || BEZ_HLIDACE.some((s) => stitky.includes(s))) continue;
    const detail = await api(`repos/${REPO}/pulls/${p.number}`);
    const kontroly = (await api(`repos/${REPO}/commits/${p.head.sha}/check-runs?filter=latest&per_page=100`)).check_runs || [];
    const nase = kontroly.filter((k) => testy.has(k.name));
    const pr = {
      autor: p.user?.login,
      zForku: p.head?.repo?.full_name !== p.base?.repo?.full_name,
      stitky,
      sha: p.head.sha,
      konflikt: detail.mergeable_state === 'dirty',
      testy: nase.map((k) => ({ nazev: k.name, stav: k.status, zaver: k.conclusion })),
      komentare: await vsechnyKomentare(api, p.number),
    };
    const nalez = coHlidat(pr, konfig);
    if (!nalez) {
      console.log(`PR #${p.number}: nic (konflikt ${pr.konflikt}, testů ${nase.length}).`);
      continue;
    }
    const chyby = [];
    for (const k of nase.filter((x) => nalez.duvod === 'testy' && ['failure', 'timed_out'].includes(x.conclusion))) {
      if (chyby.length >= MAX_CHYB) break;
      chyby.push(...radkyAnotaci(await api(`repos/${REPO}/check-runs/${k.id}/annotations?per_page=50`)).map((r) => `${k.name}: ${r}`));
    }
    const telo = textKomentare({ sha: p.head.sha, duvod: nalez.duvod, cervene: nalez.cervene, chyby: chyby.slice(0, MAX_CHYB) });
    console.log(`PR #${p.number}: ${nalez.duvod}${nanecisto ? ' (nanečisto, nepíšu)' : ''}.`);
    if (zapis) await zapis(`repos/${REPO}/issues/${p.number}/comments`, { method: 'POST', body: { body: telo } });
    napsano += 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
