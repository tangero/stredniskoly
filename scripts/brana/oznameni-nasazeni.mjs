// Oznámení vlastníkovi po nasazení (#383, RA45): protokol z preview se nevyžaduje, místo něj vlastník po nasazení
// main dostane do Telegramu ke každému sloučenému PR se změnou webu veřejnou adresu, kde změnu uvidí, a dvě až tři
// věty lidskými slovy, co návštěvník uvidí jinak (oddíl „Pro vlastníka“ v popisu PR). Každý PR jednou: po odeslání dostane
// komentář se značkou. Spouští ho workflow Ověření v produkci po úspěšném nasazení main. Bez modelu.
//
//   node scripts/brana/oznameni-nasazeni.mjs [--nanecisto]

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { BOT, proVlastnika, rozbor } from './brana.mjs';
import { REPO, oblastiZLabeleru, vytvorApi } from './data.mjs';

const DEN = 24 * 60 * 60 * 1000;
export const OKNO = 3 * DEN;
// PR sloučené před zavedením oznámení se zpětně neoznamují.
export const OD = Date.parse('2026-10-05T00:00:00Z');
export const MAX_ADRES = 3;
export const ZNACKA = (sha) => `<!-- oznameni-nasazeni sha=${sha} -->`;
const CTI_ZNACKU = /<!-- oznameni-nasazeni sha=[0-9a-f]{7,40} -->/;

/** Text oddílu `## Název` (bez nadpisu) až po další nadpis druhé úrovně. */
export function oddil(telo = '', nazev) {
  const m = telo.match(new RegExp(`^##[ \\t]+${nazev}[^\\n]*\\n([\\s\\S]*?)(?=^##[ \\t]|(?![\\s\\S]))`, 'im'));
  return m ? m[1].trim() : '';
}

const ocisti = (t) => t.replace(/`/g, '').replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim();

/**
 * Lidské vysvětlení pro vlastníka: oddíl „Pro vlastníka“ bez řádků s adresami. Technický popis („Co se změnilo“)
 * se jako náhrada nepoužívá; PR bez oddílu se oznámí jen názvem.
 */
export function textProVlastnika(telo = '') {
  const vety = proVlastnika(telo).split('\n')
    .filter((r) => !/^\s*[-*]?\s*(adresa|adresy|zkontroluj|kde)\s*:/i.test(r) && !/^\s*[-*]?\s*(https?:\/\/|\/)\S*\s*$/.test(r));
  const t = ocisti(vety.join(' '));
  return t.length > 600 ? `${t.slice(0, 597)}…` : t;
}

/**
 * Cesty na webu z oddílů „Pro vlastníka“ a „Jak ověřit“: celé adresy náhledu nebo produkce, `<náhled>/cesta`
 * a samostatné cesty začínající lomítkem. Soubory (`/scripts/x.mjs`) a API se vynechají.
 */
export function cestyNaWebu(telo = '') {
  const text = [oddil(telo, 'Pro vlastníka'), oddil(telo, 'Jak ověřit')].join('\n');
  const cesty = [];
  const pridej = (c) => {
    const cesta = c.replace(/[)`"'“”„.,;:]+$/, '').replace(/#.*$/, '') || '/';
    if (/\.(m?js|ts|tsx|py|ya?ml|json|md|sql|sh|csv|xlsx)$/i.test(cesta) || cesta.startsWith('/api/')) return;
    if (!cesty.includes(cesta)) cesty.push(cesta);
  };
  // Pořadí podle výskytu v textu, oddíl Pro vlastníka první.
  const nalezy = [
    ...[...text.matchAll(/https?:\/\/[a-z0-9.-]+(?:vercel\.app|prijimackynaskolu\.cz)(\/[^\s)`"'“”<>]*)?/gi)].map((m) => [m.index, m[1] || '/']),
    ...[...text.matchAll(/<[^>\s]*>(\/[^\s)`"'“”<>]*)/g)].map((m) => [m.index, m[1]]),
    ...[...text.matchAll(/(?:^|[\s`(„"])(\/[a-z0-9][^\s)`"'“”<>,]*)/gi)].map((m) => [m.index, m[1]]),
  ].sort((a, b) => a[0] - b[0]);
  for (const [, c] of nalezy) pridej(c);
  return cesty.slice(0, MAX_ADRES);
}

/** Kandidáti: PR sloučené do main za posledních 3 dní (a po zavedení oznámení), nejstarší první. */
export function kandidati(prs, { ted }) {
  return prs
    .filter((p) => p.slouceno && p.zakladna === 'main' && Date.parse(p.slouceno) >= OD && ted - Date.parse(p.slouceno) <= OKNO)
    .sort((a, b) => Date.parse(a.slouceno) - Date.parse(b.slouceno));
}

export const oznameno = (komentare = []) => komentare.some((k) => k.autor === BOT && CTI_ZNACKU.test(k.telo || ''));

/** Text zprávy do Telegramu pro jeden nebo více nasazených PR. */
export function zprava(polozky, { zakladni, sha }) {
  const casti = polozky.map((p) => {
    const adresy = p.cesty.length ? p.cesty.map((c) => `${zakladni}${c}`).join('\n') : `${zakladni} (adresu PR neuvádí)`;
    return `#${p.cislo} ${p.titulek}\n${p.text || 'Popis pro vlastníka v PR chybí.'}\nZkontroluj:\n${adresy}`;
  });
  const hlava = polozky.length === 1 ? 'Nasazeno na web:' : `Nasazeno na web (${polozky.length} změny):`;
  const pata = `Commit ${sha.slice(0, 7)}. Když se ti změna nelíbí, řekni Eduardě nebo Claude Code „vrátit #číslo“.`;
  const text = [hlava, ...casti, pata].join('\n\n');
  return text.length > 4000 ? `${text.slice(0, 3990)}\n…` : text;
}

async function posliTelegram(text) {
  const { TELEGRAM_BOT_TOKEN: bot, TELEGRAM_CHAT_ID: chat } = process.env;
  const odp = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  });
  if (!odp.ok) throw new Error(`Telegram: ${odp.status}`);
}

async function main() {
  const nanecisto = process.argv.includes('--nanecisto');
  const api = vytvorApi();
  const zakladni = process.env.PRODUKCE_URL || 'https://www.prijimackynaskolu.cz';
  const ted = Date.now();
  const yaml = (await import('js-yaml')).default;
  const cti = (c) => yaml.load(fs.readFileSync(new URL(`../../${c}`, import.meta.url), 'utf8'));
  const konfig = { rezimy: cti('.github/rezimy.yml'), oblasti: oblastiZLabeleru(cti('.github/labeler.yml')) };
  const hlava = (await api(`repos/${REPO}/commits/main`)).sha;
  const sha = process.env.PRODUKCE_SHA || hlava;
  // Když se main mezitím posunul, nasazení tohoto commitu se přeskočilo; oznámí ho běh po dalším nasazení.
  if (sha !== hlava) return console.log(`Produkce je na ${sha.slice(0, 7)}, main na ${hlava.slice(0, 7)}: oznámení počká na další nasazení.`);
  if (!nanecisto && (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID)) return console.log('Telegram není nastavený, oznámení neposílám.');

  const zavrene = await api(`repos/${REPO}/pulls?state=closed&base=main&sort=updated&direction=desc&per_page=100`);
  const prs = zavrene.map((p) => ({ cislo: p.number, titulek: p.title, telo: p.body || '', slouceno: p.merged_at, zakladna: p.base.ref, merge: p.merge_commit_sha }));
  const polozky = [];
  for (const p of kandidati(prs, { ted })) {
    const komentare = (await api(`repos/${REPO}/issues/${p.cislo}/comments?per_page=100`)).map((k) => ({ autor: k.user?.login, telo: k.body || '' }));
    if (oznameno(komentare)) continue;
    const srovnani = await api(`repos/${REPO}/compare/${p.merge}...${sha}`).catch(() => null);
    if (!srovnani || !['ahead', 'identical'].includes(srovnani.status)) continue;
    const soubory = (await api(`repos/${REPO}/pulls/${p.cislo}/files?per_page=100`)).map((s) => ({ nazev: s.filename, puvodni: s.previous_filename, stav: s.status, pridano: s.additions, odebrano: s.deletions }));
    if (rozbor(soubory, konfig).jenBezPreview) continue;
    polozky.push({ ...p, text: textProVlastnika(p.telo), cesty: cestyNaWebu(p.telo) });
  }
  if (!polozky.length) return console.log('Žádná nová nasazená změna webu k oznámení.');
  const text = zprava(polozky, { zakladni, sha });
  console.log(text);
  if (nanecisto) return;
  await posliTelegram(text);
  for (const p of polozky) {
    const adresy = p.cesty.map((c) => `${zakladni}${c}`).join(', ') || zakladni;
    await api(`repos/${REPO}/issues/${p.cislo}/comments`, { method: 'POST', body: { body:
      `Nasazeno a oznámeno vlastníkovi do Telegramu (commit produkce ${sha.slice(0, 7)}). Kde změnu uvidí: ${adresy}\n\n${ZNACKA(sha.slice(0, 7))}\n\n— workflow Ověření v produkci (#383)` } });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
