// Týdenní přehled pro vlastníka (docs/navrh-rizeni-vyvoje-2027.md, oddíly 2 a 16): co se sloučilo,
// všechna rozhodnutí štítky `schvaleno`, `zamitnuto` a `stop` za týden i s účtem, který je udělal,
// co čeká na vlastníka (i PR, kde smyčka oprav z review skončila štítkem `potrebuje-cloveka`), červené CI na main, expirace tokenů v secrets
// a měřítka vývoje z oddílu 20 (meritka.mjs). Slouží ke zpětné kontrole
// rozhodnutí podle RA35: co si vlastník nevybaví, vrátí.
//
//   node scripts/prehled/tydenni.mjs --nanecisto   jen vypíše (mimo Actions přes gh) i s počtem volání API
//
// Ve workflow tydenni-prehled.yml zapíše dlouhou verzi do souhrnu běhu a krátkou pošle do Telegramu.

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import yaml from 'js-yaml';
import { REPO, NAZEV_KONTROLY, vytvorApi } from '../brana/data.mjs';
import { nactiMeritka, spocitejMeritka, kratkaMeritka, oddilMeritka } from './meritka.mjs';
import { nactiStav, souhrnTydne } from '../provoz/dostupnost.mjs';

const DEN = 24 * 60 * 60 * 1000;
export const STITKY_ROZHODNUTI = ['schvaleno', 'zamitnuto', 'stop'];

const datum = (iso) => new Date(iso).toISOString().slice(0, 10);

export const MAX_POLOZEK = 15;
const MAX_DELKA_KRATKE = 3800; // limit Telegramu je 4096 znaků, zbytek zůstává na odkaz „Celý přehled“
const MAX_DELKA_TITULKU = 80;

const adresa = (cislo, pr = false) => `https://github.com/${REPO}/${pr ? 'pull' : 'issues'}/${cislo}`;
const odkaz = (cislo, pr = false) => `[#${cislo}](${adresa(cislo, pr)})`;
/** Celé položky nejvýš do `rozpocet` znaků a `max` kusů; zbytek shrne řádkem s počtem. */
export function vypisPolozek(polozky, rozpocet, max) {
  const vypis = [];
  let delka = 0;
  for (const p of polozky.slice(0, max)) {
    const dalsi = delka + p.length + 1;
    if (dalsi > rozpocet - 60) break; // 60 znaků rezerva na řádek „… a dalších N v celém přehledu“
    vypis.push(p);
    delka = dalsi;
  }
  if (vypis.length < polozky.length) vypis.push(`… a dalších ${polozky.length - vypis.length} v celém přehledu`);
  return vypis;
}
const zkrat = (t = '') => (t.length > MAX_DELKA_TITULKU ? `${t.slice(0, MAX_DELKA_TITULKU - 1)}…` : t);

async function strankuj(api, cesta, staci) {
  const vse = [];
  for (let strana = 1; strana <= 20; strana++) {
    const dil = await api(`${cesta}${cesta.includes('?') ? '&' : '?'}per_page=100&page=${strana}`);
    vse.push(...dil);
    if (dil.length < 100 || staci(dil)) break;
  }
  return vse;
}

async function posledniBrana(api, sha) {
  const d = await api(`repos/${REPO}/commits/${sha}/check-runs?check_name=${encodeURIComponent(NAZEV_KONTROLY)}&filter=latest`);
  return (d.check_runs || []).sort((a, b) => b.id - a.id)[0] || null;
}

/** Datum vypršení tokenu z hlavičky odpovědi GitHubu; null = bez expirace, 'neplatny' = 401. */
export async function expiraceTokenu(token, fetchFn = globalThis.fetch) {
  const odp = await fetchFn('https://api.github.com/rate_limit', {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' },
  });
  if (odp.status === 401) return 'neplatny';
  return odp.headers.get('github-authentication-token-expiration');
}

export async function nactiData(api, ted, tokeny = {}, { vlastnik = 'tangero', asistent = null } = {}) {
  const od = ted - 7 * DEN;

  const zavrene = await strankuj(api, `repos/${REPO}/pulls?state=closed&sort=updated&direction=desc`,
    (dil) => Date.parse(dil[dil.length - 1].updated_at) < od);
  const slouceno = [];
  for (const p of zavrene.filter((x) => x.merged_at && Date.parse(x.merged_at) >= od)) {
    const brana = await posledniBrana(api, p.head.sha);
    slouceno.push({ cislo: p.number, titulek: p.title, kdy: p.merged_at, brana: brana?.output?.title || null });
  }

  const udalosti = await strankuj(api, `repos/${REPO}/issues/events`,
    (dil) => Date.parse(dil[dil.length - 1].created_at) < od);
  const rozhodnuti = udalosti
    .filter((u) => (u.event === 'labeled' || u.event === 'unlabeled') && STITKY_ROZHODNUTI.includes(u.label?.name)
      && Date.parse(u.created_at) >= od)
    .map((u) => ({ cislo: u.issue?.number, titulek: u.issue?.title, akce: u.event, stitek: u.label.name, kdo: u.actor?.login, kdy: u.created_at }));

  const navrhy = (await api(`repos/${REPO}/issues?state=open&labels=navrh&per_page=100`))
    .filter((i) => !i.pull_request && !i.labels.some((l) => ['schvaleno', 'zamitnuto'].includes(l.name)))
    .map((i) => ({ cislo: i.number, titulek: i.title, od: i.created_at }));
  const zastavene = (await api(`repos/${REPO}/issues?state=open&labels=stop&per_page=100`))
    .map((i) => ({ cislo: i.number, titulek: i.title }));
  // Smyčka oprav z review vyčerpala kola nebo narazila na cestu H2 (oprava-z-review.yml).
  const potrebujiCloveka = (await api(`repos/${REPO}/issues?state=open&labels=potrebuje-cloveka&per_page=100`))
    .filter((i) => i.pull_request)
    .map((i) => ({ cislo: i.number, titulek: i.title }));

  const cekajiNaSouhlas = [];
  for (const p of await api(`repos/${REPO}/pulls?state=open&per_page=100`)) {
    const brana = await posledniBrana(api, p.head.sha);
    if (brana?.conclusion === 'failure' && /chybí souhlas vlastníka/.test(brana.output?.summary || '')) {
      cekajiNaSouhlas.push({ cislo: p.number, titulek: p.title });
    }
  }

  const hlavaMain = (await api(`repos/${REPO}/commits/main`)).sha;
  const kontrolyMain = (await api(`repos/${REPO}/commits/${hlavaMain}/check-runs?per_page=100`)).check_runs || [];
  const cervenaMain = [...new Set(kontrolyMain.filter((k) => k.conclusion === 'failure').map((k) => k.name))];

  const expirace = {};
  for (const [nazev, token] of Object.entries(tokeny)) {
    expirace[nazev] = token ? await expiraceTokenu(token) : 'chybi';
  }

  // Chyba měřítek nesmí zastavit zbytek přehledu; vypíše se místo oddílu.
  let meritka = null;
  try {
    const vstup = await nactiMeritka(api, ted, { navrhy, udalostiTydne: udalosti, vlastnik });
    meritka = spocitejMeritka(vstup, { ted, vlastnik, asistent });
  } catch (e) {
    meritka = { chyba: String(e.message || e).slice(0, 200) };
  }

  // Dostupnost (#355): souhrn ze stavu kontroly a výpadky za týden; chyba nesmí zastavit zbytek přehledu.
  let dostupnost = null;
  try {
    const { stav } = await nactiStav(api);
    const vypadky = (await api(`repos/${REPO}/issues?state=all&labels=oblast:provoz&since=${new Date(od).toISOString()}&per_page=100`))
      .filter((i) => !i.pull_request && /^(Výpadek|Pomalý web): /.test(i.title))
      .map((i) => ({ cislo: i.number, titulek: i.title, od: i.created_at, do: i.closed_at }));
    dostupnost = { adresy: souhrnTydne(stav, ted), vypadky };
  } catch (e) {
    dostupnost = { chyba: String(e.message || e).slice(0, 200) };
  }

  return { od, ted, slouceno, rozhodnuti, navrhy, zastavene, cekajiNaSouhlas, potrebujiCloveka, cervenaMain, expirace, meritka, dostupnost };
}

const ms = (x) => (x == null ? 'bez dat' : `${x} ms`);
const pct = (x) => (x == null ? 'bez dat' : `${String(x).replace('.', ',')} %`);

/** Jeden řádek do Telegramu: nejnižší dostupnost za týden a počet výpadků. */
export function kratkaDostupnost(dost) {
  if (!dost || dost.chyba || !dost.adresy.length) return '';
  const nejnizsi = Math.min(...dost.adresy.map((a) => a.dostupnost ?? 100));
  return `Dostupnost webu: nejnižší ${pct(nejnizsi)}, výpadků a pomalých úseků ${dost.vypadky.length}`;
}

/** Oddíl Dostupnost dlouhého přehledu (#355): po adresách dostupnost, medián a p95 odezvy, podíl 5xx a výpadky. */
export function oddilDostupnost(dost, odkazFn) {
  if (!dost) return [];
  if (dost.chyba) return ['## Dostupnost', `- nepodařilo se načíst: ${dost.chyba}`, ''];
  if (!dost.adresy.length) return ['## Dostupnost', '- kontrola zatím nezaznamenala žádný běh', ''];
  return [
    '## Dostupnost',
    'Kontrola zvenčí na pěti stránkách, odezva z histogramu (horní hranice koše, p95 je přibližné).',
    '',
    '| adresa | kontrol | dostupnost | medián | p95 | odpovědi 5xx |',
    '|---|---|---|---|---|---|',
    ...dost.adresy.map((a) => `| ${a.cesta.length > 40 ? `${a.cesta.slice(0, 40)}…` : a.cesta} | ${a.kontrol} | ${pct(a.dostupnost)} | ${ms(a.p50)} | ${ms(a.p95)} | ${pct(a.podil5xx)} |`),
    '',
    ...(dost.vypadky.length
      ? dost.vypadky.map((v) => `- ${odkazFn(v.cislo)} ${v.titulek} (od ${datum(v.od)}${v.do ? `, skončil ${datum(v.do)}` : ', trvá'})`)
      : ['- žádný výpadek ani pomalý web']),
    '',
  ];
}

/** Text přehledu: krátký do Telegramu, dlouhý (markdown) do souhrnu běhu. */
export function sestavPrehled(d, { vlastnik = 'tangero' } = {}) {
  const tokenyPozor = Object.entries(d.expirace).flatMap(([nazev, e]) => {
    if (e === 'chybi') return [`${nazev}: secret chybí`];
    if (e === 'neplatny') return [`${nazev}: token neplatí`];
    if (!e) return [];
    const zbyva = Math.floor((Date.parse(e.replace(' UTC', 'Z').replace(' ', 'T')) - d.ted) / DEN);
    return zbyva <= 30 ? [`${nazev}: vyprší za ${zbyva} dní (${e.slice(0, 10)})`] : [];
  });
  const ciziSchvaleni = d.rozhodnuti.filter((r) => r.stitek === 'schvaleno' && r.akce === 'labeled' && r.kdo !== vlastnik);

  // Telegram dostává prostý text s plnými adresami (bez parse_mode), takže se nemusí nic escapovat.
  const polozka = (znacka, cislo, titulek, pr = false) => `${znacka} #${cislo} ${zkrat(titulek)}\n${adresa(cislo, pr)}`;
  const potrebujiCloveka = d.potrebujiCloveka || [];
  const cekajici = [
    ...potrebujiCloveka.map((p) => polozka('PR potřebuje člověka:', p.cislo, p.titulek, true)),
    ...d.navrhy.map((n) => polozka('Návrh:', n.cislo, n.titulek)),
    ...d.cekajiNaSouhlas.map((p) => polozka('PR čeká na schvaleno:', p.cislo, p.titulek, true)),
  ];
  const zastavene = d.zastavene.map((z) => polozka('', z.cislo, z.titulek).trimStart());
  const cizi = ciziSchvaleni.map((r) => `#${r.cislo} (${r.kdo})\n${adresa(r.cislo)}`);

  // Provozní varování jdou hned za souhrn a vejdou se vždy; seznamy se skládají po celých položkách
  // z toho, co zbyde do limitu, takže zkrácení nikdy neodřízne varování ani nepřeřízne titulek či adresu.
  const hlavicka = [
    `Týdenní přehled stredniskoly (${datum(d.od)} až ${datum(d.ted)})`,
    `Sloučeno PR: ${d.slouceno.length}`,
    `Rozhodnutí štítky: ${d.rozhodnuti.length} (zkontroluj v přehledu, co si nevybavíš)`,
    d.navrhy.length ? `Čeká na tebe: ${d.navrhy.length} návrhů, ${d.cekajiNaSouhlas.length} PR bez souhlasu` : `Čeká na tebe: ${d.cekajiNaSouhlas.length} PR bez souhlasu`,
    potrebujiCloveka.length ? `PR, kde smyčka oprav z review skončila: ${potrebujiCloveka.length}` : '',
    d.meritka && !d.meritka.chyba ? kratkaMeritka(d.meritka) : '',
    kratkaDostupnost(d.dostupnost),
    d.cervenaMain.length ? `POZOR, červené CI na main: ${d.cervenaMain.join(', ')}\nhttps://github.com/${REPO}/commits/main` : '',
    ...tokenyPozor.map((t) => `POZOR, token ${t}`),
    ciziSchvaleni.length ? `POZOR, schvaleno z jiného účtu:\n${vypisPolozek(cizi, Infinity, MAX_POLOZEK).join('\n')}` : '',
  ].filter(Boolean).join('\n');
  const cekajiciVypis = vypisPolozek(cekajici, MAX_DELKA_KRATKE - hlavicka.length, MAX_POLOZEK);
  const zbyva = MAX_DELKA_KRATKE - [hlavicka, ...cekajiciVypis].join('\n').length;
  const zastaveneVypis = zastavene.length ? vypisPolozek(zastavene, zbyva - 'Zastaveno (stop):\n'.length - 1, MAX_POLOZEK) : [];
  const kratky = [
    hlavicka,
    ...cekajiciVypis,
    zastaveneVypis.length ? `Zastaveno (stop):\n${zastaveneVypis.join('\n')}` : '',
  ].filter(Boolean).join('\n');

  const radky = (pole, f, prazdne) => (pole.length ? pole.map(f) : [`- ${prazdne}`]);
  const dlouhy = [
    `# Týdenní přehled ${datum(d.od)} až ${datum(d.ted)}`,
    '',
    '## Rozhodnutí štítky (zpětná kontrola)',
    'Všechna přidání a odebrání `schvaleno`, `zamitnuto` a `stop`. Co si nevybavíš, vrať.',
    '',
    ...radky(d.rozhodnuti, (r) => `- ${datum(r.kdy)} ${odkaz(r.cislo)} ${r.akce === 'labeled' ? 'přidal' : 'odebral'} \`${r.stitek}\` účet ${r.kdo}: ${r.titulek}`, 'žádná'),
    '',
    '## Sloučené PR',
    ...radky(d.slouceno, (p) => `- ${odkaz(p.cislo, true)} ${p.titulek} (${datum(p.kdy)}${p.brana ? `, brána: ${p.brana}` : ''})`, 'žádné'),
    '',
    '## Čeká na vlastníka',
    ...radky(d.navrhy, (n) => `- návrh ${odkaz(n.cislo)} ${n.titulek} (od ${datum(n.od)})`, 'žádné návrhy'),
    ...radky(d.cekajiNaSouhlas, (p) => `- PR ${odkaz(p.cislo, true)} ${p.titulek}: brána čeká na \`schvaleno\``, 'žádné PR bez souhlasu'),
    ...radky(potrebujiCloveka, (p) => `- PR ${odkaz(p.cislo, true)} ${p.titulek}: smyčka oprav z review skončila, štítek \`potrebuje-cloveka\``, 'žádné PR se štítkem potrebuje-cloveka'),
    '',
    '## Zastaveno štítkem stop',
    ...radky(d.zastavene, (z) => `- ${odkaz(z.cislo)} ${z.titulek}`, 'nic'),
    '',
    ...(d.meritka ? [d.meritka.chyba ? `## Měřítka\n- nepodařilo se spočítat: ${d.meritka.chyba}` : oddilMeritka(d.meritka, odkaz), ''] : []),
    ...oddilDostupnost(d.dostupnost, odkaz),
    '## Provoz',
    d.cervenaMain.length ? `- červené CI na main: ${d.cervenaMain.join(', ')}` : '- CI na main bez chyb',
    ...Object.entries(d.expirace).map(([n, e]) => `- token ${n}: ${e === 'chybi' ? 'secret chybí' : e === 'neplatny' ? 'neplatí' : e ? `vyprší ${e}` : 'bez expirace'}`),
    '',
    'Změny rulesetu a nastavení repozitáře přehled zatím nevidí (`GITHUB_TOKEN` k nim nemá přístup).',
  ].join('\n');

  return { kratky, dlouhy };
}

async function posliTelegram(text) {
  const { TELEGRAM_BOT_TOKEN: bot, TELEGRAM_CHAT_ID: chat } = process.env;
  if (!bot || !chat) return console.log('Telegram není nastavený, zprávu neposílám.');
  const odp = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  });
  if (!odp.ok) throw new Error(`Telegram: ${odp.status}`);
}

async function main() {
  const nanecisto = process.argv.includes('--nanecisto');
  const { vlastnik, asistent } = yaml.load(fs.readFileSync(new URL('../../.github/rezimy.yml', import.meta.url), 'utf8'));
  const api = vytvorApi();
  let volani = 0;
  const pocitaneApi = (...a) => { volani++; return api(...a); };
  const data = await nactiData(pocitaneApi, Date.now(), {
    CSI_PR_TOKEN: process.env.CSI_PR_TOKEN,
    PROJECT_TOKEN: process.env.PROJECT_TOKEN,
  }, { vlastnik, asistent });
  const { kratky, dlouhy } = sestavPrehled(data, { vlastnik });
  console.log(dlouhy);
  console.log(`\nVolání GitHub API: ${volani}`);
  if (nanecisto) { console.log(`\n--- krátká verze ---\n${kratky}`); return; }
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${dlouhy}\n`);
  await posliTelegram(`${kratky}\n\nCelý přehled: ${process.env.GITHUB_SERVER_URL}/${REPO}/actions/runs/${process.env.GITHUB_RUN_ID}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await main();
