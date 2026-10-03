// Týdenní přehled pro vlastníka (docs/navrh-rizeni-vyvoje-2027.md, oddíly 2 a 16): co se sloučilo,
// všechna rozhodnutí štítky `schvaleno`, `zamitnuto` a `stop` za týden i s účtem, který je udělal,
// co čeká na vlastníka, červené CI na main a expirace tokenů v secrets. Slouží ke zpětné kontrole
// rozhodnutí podle RA35: co si vlastník nevybaví, vrátí.
//
//   node scripts/prehled/tydenni.mjs --nanecisto   jen vypíše (mimo Actions přes gh)
//
// Ve workflow tydenni-prehled.yml zapíše dlouhou verzi do souhrnu běhu a krátkou pošle do Telegramu.

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { REPO, NAZEV_KONTROLY, vytvorApi } from '../brana/data.mjs';

const DEN = 24 * 60 * 60 * 1000;
export const STITKY_ROZHODNUTI = ['schvaleno', 'zamitnuto', 'stop'];

const datum = (iso) => new Date(iso).toISOString().slice(0, 10);

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

export async function nactiData(api, ted, tokeny = {}) {
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

  return { od, ted, slouceno, rozhodnuti, navrhy, zastavene, cekajiNaSouhlas, cervenaMain, expirace };
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

  const kratky = [
    `Týdenní přehled stredniskoly (${datum(d.od)} až ${datum(d.ted)})`,
    `Sloučeno PR: ${d.slouceno.length}`,
    `Rozhodnutí štítky: ${d.rozhodnuti.length} (zkontroluj v přehledu, co si nevybavíš)`,
    d.navrhy.length ? `Čeká na tebe: ${d.navrhy.length} návrhů, ${d.cekajiNaSouhlas.length} PR bez souhlasu` : `Čeká na tebe: ${d.cekajiNaSouhlas.length} PR bez souhlasu`,
    d.zastavene.length ? `Zastaveno (stop): ${d.zastavene.map((z) => `#${z.cislo}`).join(', ')}` : '',
    d.cervenaMain.length ? `POZOR, červené CI na main: ${d.cervenaMain.join(', ')}` : '',
    ...tokenyPozor.map((t) => `POZOR, token ${t}`),
    ciziSchvaleni.length ? `POZOR, schvaleno z jiného účtu: ${ciziSchvaleni.map((r) => `#${r.cislo} (${r.kdo})`).join(', ')}` : '',
  ].filter(Boolean).join('\n');

  const radky = (pole, f, prazdne) => (pole.length ? pole.map(f) : [`- ${prazdne}`]);
  const dlouhy = [
    `# Týdenní přehled ${datum(d.od)} až ${datum(d.ted)}`,
    '',
    '## Rozhodnutí štítky (zpětná kontrola)',
    'Všechna přidání a odebrání `schvaleno`, `zamitnuto` a `stop`. Co si nevybavíš, vrať.',
    '',
    ...radky(d.rozhodnuti, (r) => `- ${datum(r.kdy)} #${r.cislo} ${r.akce === 'labeled' ? 'přidal' : 'odebral'} \`${r.stitek}\` účet ${r.kdo}: ${r.titulek}`, 'žádná'),
    '',
    '## Sloučené PR',
    ...radky(d.slouceno, (p) => `- #${p.cislo} ${p.titulek} (${datum(p.kdy)}${p.brana ? `, brána: ${p.brana}` : ''})`, 'žádné'),
    '',
    '## Čeká na vlastníka',
    ...radky(d.navrhy, (n) => `- návrh #${n.cislo} ${n.titulek} (od ${datum(n.od)})`, 'žádné návrhy'),
    ...radky(d.cekajiNaSouhlas, (p) => `- PR #${p.cislo} ${p.titulek}: brána čeká na \`schvaleno\``, 'žádné PR bez souhlasu'),
    '',
    '## Zastaveno štítkem stop',
    ...radky(d.zastavene, (z) => `- #${z.cislo} ${z.titulek}`, 'nic'),
    '',
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
  const data = await nactiData(vytvorApi(), Date.now(), {
    CSI_PR_TOKEN: process.env.CSI_PR_TOKEN,
    PROJECT_TOKEN: process.env.PROJECT_TOKEN,
  });
  const { kratky, dlouhy } = sestavPrehled(data);
  console.log(dlouhy);
  if (nanecisto) return;
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${dlouhy}\n`);
  await posliTelegram(`${kratky}\n\nCelý přehled: ${process.env.GITHUB_SERVER_URL}/${REPO}/actions/runs/${process.env.GITHUB_RUN_ID}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await main();
