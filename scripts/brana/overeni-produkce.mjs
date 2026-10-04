// Ověření kritérií zadání v produkci (#325, docs/navrh-rizeni-vyvoje-2027.md, oddíly 11 a 16): po nasazení
// main a jednou týdně projde zadání sloučená za posledních 14 dní a jejich kritéria K a P, která jako
// ověření uvádějí adresu na webu, zkontroluje na produkci. Bez modelu: adresa musí vrátit 200 a obsahovat
// očekávaný text, je-li uveden („…“), na šířce 390 i 1280 px.
//
// Komentář „Ověřeno v produkci“ jde do sloučeného PR jen poprvé, při regresi a po opravě, aby se po každém
// sloučení neopakoval u všech PR za 14 dní. Nesplnění: upozornění do Telegramu a issue se štítkem `rutina`.
//
//   node scripts/brana/overeni-produkce.mjs [--nanecisto]     (PLAYWRIGHT_MODULE = cesta k playwright/index.mjs)

import { pathToFileURL } from 'node:url';
import { duveryhodny, kriteriaZadani, uzaviranaIssues } from './brana.mjs';
import { REPO, vytvorApi } from './data.mjs';

const DEN = 24 * 60 * 60 * 1000;
export const OKNO = 14 * DEN;
export const SIRKY = [390, 1280];
export const PRODLEVA = 2000;
export const MAX_NACTENI = 60;
const ZNACKA = (stav, sha) => `<!-- overeni-produkce:stav=${stav} sha=${sha} -->`;
const CTI_ZNACKU = /<!-- overeni-produkce:stav=(ok|chyba) sha=([0-9a-f]{7,40}) -->/;

/**
 * Adresa a očekávaný text z kritéria: za „ověření:“ první cesta začínající lomítkem, za ní volitelně text
 * v „…“ nebo "…". Bez cesty (build, test, čtení souboru) se kritérium automaticky neověřuje.
 */
export function adresaZKriteria(text = '') {
  const za = text.split(/ověření:/i)[1];
  if (!za) return null;
  const cesta = za.match(/(?:^|\s)(\/[^\s,;„“”"()]*)/);
  if (!cesta) return null;
  const zbytek = za.slice(za.indexOf(cesta[1]) + cesta[1].length);
  const ocekavany = zbytek.match(/[„"“]([^“”"]+)[“”"]/);
  return { adresa: cesta[1], ocekavany: ocekavany ? ocekavany[1] : null };
}

/** Zadání k ověření: PR sloučené do main za 14 dní, které uzavírají zadání vlastníka nebo asistenta s webovým kritériem. */
export function vyberZadani(prs, issues, { ted, konfig }) {
  const vysledek = [];
  for (const p of prs) {
    if (!p.slouceno || p.zakladna !== 'main' || ted - Date.parse(p.slouceno) > OKNO) continue;
    for (const n of uzaviranaIssues(p.telo)) {
      const i = issues[n];
      if (!i || !duveryhodny(i.autor, konfig)) continue;
      const kriteria = kriteriaZadani(i.telo).map((k) => ({ ...k, web: adresaZKriteria(k.text) }));
      // Bez kritéria s adresou na webu se nic neověřuje ani nekomentuje (jen protokol z náhledu).
      if (kriteria.some((k) => k.web)) vysledek.push({ pr: p.cislo, issue: n, titulek: p.titulek, oblasti: p.stitky.filter((s) => s.startsWith('oblast:')), kriteria });
    }
  }
  return vysledek.sort((a, b) => b.pr - a.pr);
}

/** Načítání stránek postupně s prodlevou mezi nimi (žádný souběh); `nacti(url, sirka)` vrací { status, text }. */
export function vytvorNacitac(nacti, { prodleva = PRODLEVA, spi = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  let prvni = true;
  let fronta = Promise.resolve();
  return (url, sirka) => {
    const vysledek = fronta.then(async () => {
      if (!prvni) await spi(prodleva);
      prvni = false;
      return nacti(url, sirka);
    });
    fronta = vysledek.catch(() => {});
    return vysledek;
  };
}

/** Ověří jedno kritérium na obou šířkách. */
export async function overKriterium(k, nacitac, zakladni) {
  if (!k.web) return { oznaceni: k.oznaceni, adresa: null, vysledky: null };
  const url = `${zakladni}${k.web.adresa}`;
  const vysledky = {};
  for (const sirka of SIRKY) {
    try {
      // Chyba spojení se zkusí ještě jednou, aby přechodný výpadek sítě nevyrobil falešnou regresi.
      const { status, text } = await nacitac(url, sirka).catch(() => nacitac(url, sirka));
      if (status !== 200) vysledky[sirka] = `nesplněno (HTTP ${status})`;
      else if (k.web.ocekavany && !text.includes(k.web.ocekavany)) vysledky[sirka] = 'nesplněno (chybí očekávaný text)';
      else vysledky[sirka] = 'splněno';
    } catch (e) {
      vysledky[sirka] = `nesplněno (${String(e.message || e).slice(0, 60)})`;
    }
  }
  return { oznaceni: k.oznaceni, adresa: k.web.adresa, vysledky };
}

export const splneno = (v) => !v.vysledky || Object.values(v.vysledky).every((x) => x === 'splněno');

/** Poslední stav z komentářů workflow v PR (ok / chyba), nebo null. */
export function posledniStav(komentare = []) {
  const z = komentare.filter((k) => k.autor === 'github-actions[bot]').map((k) => k.telo.match(CTI_ZNACKU)).filter(Boolean);
  return z.length ? z[z.length - 1][1] : null;
}

/** Co zapsat: první výsledek, regrese, oprava, nebo nic. Upozornění a issue jen při novém nesplnění. */
export function rozhodniZapis(predchozi, ok) {
  if (predchozi === null) return { komentar: true, upozornit: !ok, druh: ok ? 'prvni' : 'chyba' };
  if (predchozi === 'ok' && !ok) return { komentar: true, upozornit: true, druh: 'regrese' };
  if (predchozi === 'chyba' && ok) return { komentar: true, upozornit: false, druh: 'oprava' };
  return { komentar: false, upozornit: false, druh: 'beze-zmeny' };
}

export function textKomentare({ sha, zakladni, vysledky, druh }) {
  const nadpis = { prvni: 'Ověřeno v produkci', chyba: 'Ověřeno v produkci: nesplněno', regrese: 'Ověřeno v produkci: regrese', oprava: 'Ověřeno v produkci: opět splněno' }[druh];
  const radky = vysledky.map((v) => (v.vysledky
    ? `| ${v.oznaceni} | ${v.adresa} | ${v.vysledky[390]} | ${v.vysledky[1280]} |`
    : `| ${v.oznaceni} | – | nejde ověřit automaticky | nejde ověřit automaticky |`));
  const ok = vysledky.every(splneno);
  return [
    `## ${nadpis}`,
    '',
    `Commit produkce: ${sha.slice(0, 7)}`,
    `Web: ${zakladni}`,
    '',
    '| kritérium | adresa | 390 px | 1280 px |',
    '|---|---|---|---|',
    ...radky,
    '',
    'Automaticky se ověřuje jen kritérium, které za `ověření:` uvádí adresu na webu (a případně očekávaný text v „…“): adresa musí vrátit 200 a text obsahovat. Ostatní ověřuje protokol z náhledu.',
    '',
    `— workflow Ověření v produkci (#325)`,
    ZNACKA(ok ? 'ok' : 'chyba', sha.slice(0, 7)),
  ].join('\n');
}

/** Načtení stránky v Chromiu: stav odpovědi a viditelný text. */
export async function nacitacPlaywright(modul) {
  const { chromium } = await import(modul);
  // Proxy jen v cloudovém prostředí Claude Code (běh nanečisto); v Actions proxy není.
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
  const prohlizec = await chromium.launch({ proxy });
  const kontexty = {};
  const nacti = async (url, sirka) => {
    kontexty[sirka] ||= await prohlizec.newContext({ ignoreHTTPSErrors: Boolean(proxy), viewport: { width: sirka, height: sirka === 390 ? 844 : 800 } });
    const stranka = await kontexty[sirka].newPage();
    try {
      const odp = await stranka.goto(url, { waitUntil: 'load', timeout: 45000 });
      return { status: odp?.status() ?? 0, text: await stranka.evaluate(() => document.body.innerText) };
    } finally {
      await stranka.close();
    }
  };
  return { nacti, zavri: () => prohlizec.close() };
}

async function posliTelegram(text) {
  const { TELEGRAM_BOT_TOKEN: bot, TELEGRAM_CHAT_ID: chat } = process.env;
  if (!bot || !chat) return console.log('Telegram není nastavený, upozornění neposílám.');
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
  const fs = await import('node:fs');
  const konfig = { rezimy: yaml.load(fs.readFileSync(new URL('../../.github/rezimy.yml', import.meta.url), 'utf8')) };
  const sha = process.env.PRODUKCE_SHA || (await api(`repos/${REPO}/commits/main`)).sha;

  const zavrene = [];
  for (let strana = 1; strana <= 10; strana++) {
    const dil = await api(`repos/${REPO}/pulls?state=closed&base=main&sort=updated&direction=desc&per_page=100&page=${strana}`);
    zavrene.push(...dil);
    if (dil.length < 100 || ted - Date.parse(dil[dil.length - 1].updated_at) > OKNO) break;
  }
  const prs = zavrene.map((p) => ({ cislo: p.number, titulek: p.title, telo: p.body || '', slouceno: p.merged_at, zakladna: p.base.ref, stitky: p.labels.map((l) => l.name) }));
  const issues = {};
  for (const n of new Set(prs.filter((p) => p.slouceno && ted - Date.parse(p.slouceno) <= OKNO).flatMap((p) => uzaviranaIssues(p.telo)))) {
    const i = await api(`repos/${REPO}/issues/${n}`).catch(() => null);
    if (i && !i.pull_request) issues[n] = { autor: i.user?.login, telo: i.body || '' };
  }

  // Strop načtení: nejnovější zadání mají přednost.
  let zbyva = MAX_NACTENI;
  const zadani = vyberZadani(prs, issues, { ted, konfig }).filter((z) => {
    const potreba = z.kriteria.filter((k) => k.web).length * SIRKY.length;
    if (potreba > zbyva) return false;
    zbyva -= potreba;
    return true;
  });
  const pw = zadani.some((z) => z.kriteria.some((k) => k.web)) ? await nacitacPlaywright(process.env.PLAYWRIGHT_MODULE || 'playwright') : null;
  const nacitac = pw ? vytvorNacitac(pw.nacti) : null;
  try {
    for (const z of zadani) {
      const vysledky = [];
      for (const k of z.kriteria) vysledky.push(await overKriterium(k, nacitac, zakladni));
      const ok = vysledky.every(splneno);
      const komentare = (await api(`repos/${REPO}/issues/${z.pr}/comments?per_page=100`)).map((k) => ({ autor: k.user?.login, telo: k.body || '' }));
      const r = rozhodniZapis(posledniStav(komentare), ok);
      console.log(`PR #${z.pr} (zadání #${z.issue}): ${ok ? 'splněno' : 'nesplněno'}, ${r.druh}`);
      if (nanecisto || !r.komentar) continue;
      await api(`repos/${REPO}/issues/${z.pr}/comments`, { method: 'POST', body: { body: textKomentare({ sha, zakladni, vysledky, druh: r.druh }) } });
      if (!r.upozornit) continue;
      const chybna = vysledky.filter((v) => !splneno(v)).map((v) => `${v.oznaceni} ${v.adresa}`).join(', ');
      const issue = await api(`repos/${REPO}/issues`, { method: 'POST', body: {
        title: `Regrese v produkci: PR #${z.pr} (${chybna})`,
        body: `Ověření v produkci (commit ${sha.slice(0, 7)}) našlo nesplněná kritéria zadání #${z.issue} ze sloučeného PR #${z.pr}: ${chybna}.\n\nPodrobnosti v komentáři „Ověřeno v produkci“ u PR #${z.pr}. Rozhodne vlastník nebo denní úloha, zda jde o regresi, nebo o kritérium, které už neplatí.\n\n— workflow Ověření v produkci (#325)`,
        labels: ['interni', 'rutina', ...z.oblasti],
      } });
      await posliTelegram(`Regrese v produkci: PR #${z.pr} (${chybna})\n${issue.html_url}`);
    }
  } finally {
    await pw?.zavri();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
