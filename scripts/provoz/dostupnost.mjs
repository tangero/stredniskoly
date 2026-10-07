// Kontrola dostupnosti webu zvenčí (#355, etapa 1, docs/monitoring-produkce.md): každých 5 minut načte pět
// veřejných stránek (GET, bez cookies), ověří stavový kód, klíčový text a dobu odezvy. Výpadek a pomalý web
// otevře jako issue a pošle do Telegramu, dokud trvá, jen připomíná, po obnovení zavře.
//
// Stav (počty selhání, otevřené výpadky, histogram odezev za 8 dní) drží jeden komentář v issue „Dostupnost
// webu: stav monitoringu“ (značka `dostupnost:stav`). Týdenní přehled z něj čte oddíl Dostupnost.
// Do issue, Telegramu ani stavu nejdou osobní údaje ani IP adresy, jen cesta, stavový kód, doba a čas.
//
//   node scripts/provoz/dostupnost.mjs [--nanecisto]   (ZAMRZNUTI_OD, ZAMRZNUTI_DO = RRRR-MM-DD)

import { pathToFileURL } from 'node:url';
import { REPO, vytvorApi } from '../brana/data.mjs';

export const ZAKLADNI = 'https://www.prijimackynaskolu.cz';
export const ADRESY = [
  { cesta: '/', text: 'Přijímačky' },
  { cesta: '/skola/651028922-1-slovanske-gymnazium-a-jazykova-skola-masna', text: 'Slovanské gymnázium' },
  { cesta: '/skola/651028922-1-slovanske-gymnazium-a-jazykova-skola-masna-gymnazium-vseobecne-cesky-program', text: 'Gymnázium' },
  { cesta: '/simulator', text: 'Simulátor' },
  { cesta: '/mesto/praha', text: 'Praha' },
];
export const TIMEOUT = 15000;
export const OVERENI_PO = 30000;
const HOD = 60 * 60 * 1000;
// Prahy odezvy a intervaly (O3: předpoklady, po měsíci provozu se upraví podle naměřeného mediánu a p95).
export const REZIMY = {
  bezny: { otevreniPo: 2, pripominka: 6 * HOD, prahOdezvy: 3000 },
  zvyseny: { otevreniPo: 1, pripominka: 0.5 * HOD, prahOdezvy: 2000 },
};
export const POMALE_BEHY = 3;
export const DNI_STATISTIKY = 8;
// Horní hranice košů histogramu odezvy v ms; poslední koš je „nad“.
export const KOSE = [250, 500, 750, 1000, 1500, 2000, 3000, 5000, 10000];
export const ZNACKA_STAVU = 'dostupnost:stav';
export const NAZEV_STAVU = 'Dostupnost webu: stav monitoringu';

const den = (t) => new Date(t).toISOString().slice(0, 10);

/** Zvýšený režim: období zamrznutí (obě krajní data včetně) nebo sezóna 1. 1. až 31. 5. (předpoklad, O3). */
export function rezim(ted, zamrznuti = {}) {
  const d = den(ted);
  if (zamrznuti.od && zamrznuti.do && d >= zamrznuti.od && d <= zamrznuti.do) return 'zvyseny';
  const mesic = new Date(ted).getUTCMonth();
  return mesic <= 4 ? 'zvyseny' : 'bezny';
}

/** Vyhodnocení jedné odpovědi: stavový kód 200 a klíčový text; doba se posuzuje zvlášť (pomalý web). */
export function posudOdpoved({ status, text = '', ms = 0, chyba = null }, klic) {
  if (chyba) return { ok: false, duvod: `chyba spojení: ${String(chyba).slice(0, 60)}`, status: 0, ms };
  if (status !== 200) return { ok: false, duvod: `stavový kód ${status}`, status, ms };
  if (klic && !text.includes(klic)) return { ok: false, duvod: 'chybí klíčový text', status, ms };
  return { ok: true, duvod: '', status, ms };
}

/** Jedno načtení; `nacti(url, timeout)` vrací { status, text }. */
export async function zmer(url, klic, nacti, hodiny = Date.now) {
  const od = hodiny();
  try {
    const { status, text } = await nacti(url, TIMEOUT);
    return posudOdpoved({ status, text, ms: hodiny() - od }, klic);
  } catch (e) {
    return posudOdpoved({ ms: hodiny() - od, chyba: e.name === 'TimeoutError' ? 'timeout' : e.message }, klic);
  }
}

/** Kontrola všech adres; selhání se v témže běhu ověří druhým dotazem po 30 s a platí až druhý výsledek. */
export async function zkontroluj(adresy, nacti, { spi = (ms) => new Promise((r) => setTimeout(r, ms)), hodiny = Date.now } = {}) {
  const vysledky = [];
  for (const a of adresy) {
    const url = `${ZAKLADNI}${a.cesta}`;
    let v = await zmer(url, a.text, nacti, hodiny);
    if (!v.ok) {
      await spi(OVERENI_PO);
      v = await zmer(url, a.text, nacti, hodiny);
    }
    vysledky.push({ cesta: a.cesta, ...v });
  }
  return vysledky;
}

const prazdnyHistogram = () => new Array(KOSE.length + 1).fill(0);
const kos = (ms) => { const i = KOSE.findIndex((h) => ms <= h); return i === -1 ? KOSE.length : i; };

/** Kvantil z histogramu: horní hranice koše, ve kterém kvantil leží (poslední koš vrací poslední hranici). */
export function kvantil(hist, q) {
  const n = hist.reduce((s, x) => s + x, 0);
  if (!n) return null;
  let soucet = 0;
  for (let i = 0; i < hist.length; i++) {
    soucet += hist[i];
    if (soucet >= q * n) return KOSE[Math.min(i, KOSE.length - 1)];
  }
  return KOSE[KOSE.length - 1];
}

export const novyStav = () => ({ verze: 1, adresy: {}, statistiky: {} });

const prazdnaAdresa = () => ({ selhani: 0, posledni: [], vypadek: null, pomaly: null });

/** Jeden slot (výpadek nebo pomalý web): otevře, připomíná a zavírá; vrací akci nebo null. */
function posunSlot(slot, trva, ted, pravidla, kdyOtevrit) {
  if (!slot && trva && kdyOtevrit) return { slot: { od: ted, pripomenuto: ted, issue: null }, akce: 'otevri' };
  if (slot && !trva) return { slot: null, akce: 'obnoveno', od: slot.od, issue: slot.issue };
  if (slot && trva && ted - slot.pripomenuto >= pravidla.pripominka) {
    return { slot: { ...slot, pripomenuto: ted }, akce: 'pripomen', od: slot.od, issue: slot.issue };
  }
  return { slot, akce: null };
}

/**
 * Čistá funkce: ze starého stavu a výsledků běhu vrátí nový stav a akce (otevři / pripomen / obnoveno
 * pro výpadek i pomalý web). Issue se doplní po otevření funkcí `zaznamenejIssue`.
 */
export function posunStav(stav, vysledky, { ted, rezimBehu }) {
  const pravidla = REZIMY[rezimBehu];
  const novy = structuredClone(stav);
  const akce = [];
  const dnes = den(ted);
  novy.statistiky[dnes] ||= {};
  for (const v of vysledky) {
    const a = (novy.adresy[v.cesta] ||= prazdnaAdresa());
    // Statistika dne: počet kontrol, úspěšných, odpovědí 5xx a histogram odezvy.
    const s = (novy.statistiky[dnes][v.cesta] ||= { n: 0, ok: 0, s5: 0, hist: prazdnyHistogram() });
    s.n++;
    if (v.ok) s.ok++;
    if (v.status >= 500) s.s5++;
    if (v.ok) s.hist[kos(v.ms)]++;

    a.selhani = v.ok ? 0 : a.selhani + 1;
    if (v.ok) a.posledni = [...a.posledni, v.ms].slice(-POMALE_BEHY);
    const vyp = posunSlot(a.vypadek, !v.ok, ted, pravidla, a.selhani >= pravidla.otevreniPo);
    a.vypadek = vyp.slot;
    if (vyp.akce) akce.push({ druh: 'vypadek', cesta: v.cesta, akce: vyp.akce, od: vyp.od ?? ted, issue: vyp.issue, duvod: v.duvod, status: v.status });

    // Pomalý web: medián posledních tří úspěšných odezev nad prahem (běh bez odpovědi se do mediánu nepočítá).
    const mediany = [...a.posledni].sort((x, y) => x - y);
    const pomale = v.ok && a.posledni.length === POMALE_BEHY && mediany[1] > pravidla.prahOdezvy;
    const pom = posunSlot(a.pomaly, v.ok ? pomale : Boolean(a.pomaly), ted, pravidla, pomale);
    a.pomaly = pom.slot;
    if (pom.akce) akce.push({ druh: 'pomaly', cesta: v.cesta, akce: pom.akce, od: pom.od ?? ted, issue: pom.issue, ms: v.ms, prah: pravidla.prahOdezvy });
  }
  const nejstarsi = den(ted - DNI_STATISTIKY * 24 * HOD);
  for (const d of Object.keys(novy.statistiky)) if (d < nejstarsi) delete novy.statistiky[d];
  return { stav: novy, akce };
}

/** Doplní číslo otevřeného issue do slotu (po jeho založení). */
export function zaznamenejIssue(stav, cesta, druh, cislo) {
  const slot = stav.adresy[cesta]?.[druh === 'vypadek' ? 'vypadek' : 'pomaly'];
  if (slot) slot.issue = cislo;
}

const delka = (ms) => {
  const min = Math.max(1, Math.round(ms / 60000));
  return min < 120 ? `${min} min` : `${Math.round(min / 6) / 10} h`;
};

/** Texty pro issue a Telegram z jedné akce. */
export function textAkce(a, ted) {
  const co = a.druh === 'vypadek' ? 'Výpadek' : 'Pomalý web';
  const url = `${ZAKLADNI}${a.cesta}`;
  if (a.akce === 'otevri') {
    const popis = a.druh === 'vypadek'
      ? `Adresa ${url} selhává: ${a.duvod} (stavový kód ${a.status || 'žádný'}). Selhání potvrdil druhý dotaz po 30 s.`
      : `Adresa ${url} odpovídá pomalu: medián posledních ${POMALE_BEHY} kontrol je nad ${a.prah} ms (poslední ${a.ms} ms).`;
    return {
      titulek: `${co}: ${a.cesta}`,
      telo: `${popis}\n\nOtevřeno ${new Date(ted).toISOString()}. Issue zavře kontrola dostupnosti sama po obnovení.\n\n— workflow Dostupnost (#355)\n<!-- dostupnost:${a.druh}=${a.cesta} -->`,
      telegram: `${co}: ${url}\n${a.druh === 'vypadek' ? a.duvod : `odezva ${a.ms} ms, práh ${a.prah} ms`}`,
    };
  }
  if (a.akce === 'pripomen') {
    return { telegram: `${co} trvá už ${delka(ted - a.od)}: ${url}`, komentar: `${co} trvá už ${delka(ted - a.od)}.` };
  }
  return { telegram: `${co} skončil po ${delka(ted - a.od)}: ${url}`, komentar: `${co} skončil po ${delka(ted - a.od)} (${new Date(ted).toISOString()}).` };
}

/** Týdenní souhrn dostupnosti ze stavu: po adresách dostupnost v %, medián a p95 odezvy, podíl odpovědí 5xx. */
export function souhrnTydne(stav, ted, dni = 7) {
  const od = den(ted - dni * 24 * HOD);
  const adresy = {};
  for (const [d, podleAdres] of Object.entries(stav.statistiky || {})) {
    if (d < od) continue;
    for (const [cesta, s] of Object.entries(podleAdres)) {
      const a = (adresy[cesta] ||= { n: 0, ok: 0, s5: 0, hist: prazdnyHistogram() });
      a.n += s.n; a.ok += s.ok; a.s5 += s.s5;
      s.hist.forEach((x, i) => { a.hist[i] += x; });
    }
  }
  return Object.entries(adresy).map(([cesta, a]) => ({
    cesta, kontrol: a.n,
    dostupnost: a.n ? Math.round((a.ok / a.n) * 1000) / 10 : null,
    p50: kvantil(a.hist, 0.5), p95: kvantil(a.hist, 0.95),
    podil5xx: a.n ? Math.round((a.s5 / a.n) * 1000) / 10 : null,
  }));
}

// ---- Vstup a výstup (GitHub, Telegram, síť) ----

export async function nactiStav(api) {
  const issues = await api(`repos/${REPO}/issues?state=open&labels=oblast:provoz&per_page=100`);
  const issue = issues.find((i) => !i.pull_request && i.title === NAZEV_STAVU);
  if (!issue) return { issue: null, komentar: null, stav: novyStav() };
  const komentare = await api(`repos/${REPO}/issues/${issue.number}/comments?per_page=100`);
  const k = komentare.find((x) => x.body?.includes(`<!-- ${ZNACKA_STAVU}`));
  if (!k) return { issue: issue.number, komentar: null, stav: novyStav() };
  const json = k.body.match(/```json\n([\s\S]*?)\n```/)?.[1];
  return { issue: issue.number, komentar: k.id, stav: json ? JSON.parse(json) : novyStav() };
}

const telo = (stav) => `<!-- ${ZNACKA_STAVU} -->\nStav monitoringu dostupnosti (zapisuje workflow Dostupnost, neupravovat).\n\n\`\`\`json\n${JSON.stringify(stav)}\n\`\`\``;

export async function ulozStav(api, ulozeni, stav) {
  let { issue, komentar } = ulozeni;
  if (!issue) {
    const i = await api(`repos/${REPO}/issues`, { method: 'POST', body: {
      title: NAZEV_STAVU,
      body: 'Úložiště stavu kontroly dostupnosti (#355). Komentář níže přepisuje workflow Dostupnost každých 5 minut; issue neupravovat ani nezavírat.',
      labels: ['interni', 'rutina', 'oblast:provoz'],
    } });
    issue = i.number;
  }
  if (komentar) await api(`repos/${REPO}/issues/comments/${komentar}`, { method: 'PATCH', body: { body: telo(stav) } });
  else await api(`repos/${REPO}/issues/${issue}/comments`, { method: 'POST', body: { body: telo(stav) } });
}

async function posliTelegram(text) {
  const { TELEGRAM_BOT_TOKEN: bot, TELEGRAM_CHAT_ID: chat } = process.env;
  if (!bot || !chat) return console.log('Telegram není nastavený, zprávu neposílám.');
  const odp = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  });
  if (!odp.ok) throw new Error(`Telegram: ${odp.status}`);
}

const nactiSiti = async (url, timeout) => {
  // Bez cookies a bez přihlášení, jen GET.
  const odp = await fetch(url, { signal: AbortSignal.timeout(timeout), redirect: 'follow', headers: { 'user-agent': 'prijimacky-dostupnost/1 (+https://github.com/tangero/stredniskoly)' } });
  return { status: odp.status, text: await odp.text() };
};

/** Provede akce: issue, komentář, zavření, Telegram. Chyba jedné akce nezastaví ostatní. */
export async function provedAkce(akce, stav, { api, telegram, ted }) {
  for (const a of akce) {
    const t = textAkce(a, ted);
    try {
      if (a.akce === 'otevri') {
        const i = await api(`repos/${REPO}/issues`, { method: 'POST', body: { title: t.titulek, body: t.telo, labels: ['interni', 'rutina', 'oblast:provoz'] } });
        zaznamenejIssue(stav, a.cesta, a.druh, i.number);
        await telegram(`${t.telegram}\nhttps://github.com/${REPO}/issues/${i.number}`);
      } else {
        if (a.issue) {
          await api(`repos/${REPO}/issues/${a.issue}/comments`, { method: 'POST', body: { body: `${t.komentar}\n\n— workflow Dostupnost (#355)` } });
          if (a.akce === 'obnoveno') await api(`repos/${REPO}/issues/${a.issue}`, { method: 'PATCH', body: { state: 'closed', state_reason: 'completed' } });
        }
        await telegram(t.telegram);
      }
    } catch (e) {
      console.log(`::warning::Akce ${a.druh} ${a.akce} ${a.cesta} selhala: ${e.message}`);
    }
  }
}

async function main() {
  const nanecisto = process.argv.includes('--nanecisto');
  const ted = Date.now();
  const rezimBehu = rezim(ted, { od: process.env.ZAMRZNUTI_OD || '', do: process.env.ZAMRZNUTI_DO || '' });
  const vysledky = await zkontroluj(ADRESY, nactiSiti);
  for (const v of vysledky) console.log(`${v.ok ? 'OK ' : 'CHYBA'} ${v.cesta} ${v.status} ${v.ms} ms ${v.duvod}`);
  if (nanecisto) return;
  const api = vytvorApi();
  const ulozeni = await nactiStav(api);
  const { stav, akce } = posunStav(ulozeni.stav, vysledky, { ted, rezimBehu });
  await provedAkce(akce, stav, { api, telegram: posliTelegram, ted });
  await ulozStav(api, ulozeni, stav);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
