// Cílový stav karty issue na tabuli projektu „Přijímačky – vývoj webu“ podle štítků a otevřených PR
// (docs/spoluprace-na-githubu.md, oddíl 3). Čistá logika bez sítě; I/O je v sync.mjs.

import { ZDROJ, STITKY_HLASENI } from '../brana/brana.mjs';

export const STAVY = {
  hlaseni: 'Hlášení',
  navrh: 'Návrh',
  oponentura: 'Oponentura',
  schvaleno: 'Schváleno',
  vPr: 'V PR',
  cekaNaSouhlas: 'Čeká na souhlas s merge',
  hotovo: 'Hotovo',
};

/**
 * @param {{ stav: 'OPEN'|'CLOSED', stitky: string[], telo?: string }} issue
 * @param {{ cekaNaSouhlas: boolean }[]} prs otevřené PR, které na issue odkazují
 * @returns {string|null} název stavu, nebo null, když karta na tabuli nepatří (trvale)
 */
export function cilovyStav(issue, prs = []) {
  const s = new Set(issue.stitky);
  if (issue.stav === 'CLOSED') return STAVY.hotovo;
  if (s.has('trvale')) return null;
  // Veto čeká na vlastníka. Oponentura běží i u návrhu (#339): štítek odebere workflow Oponentura a návrh
  // se vrátí k vlastníkovi. Zbylý `navrh` vedle `schvaleno` (zmeškaná úprava štítku) kartu do návrhu
  // nevrací; schválení je novější rozhodnutí.
  if (s.has('stop')) return STAVY.navrh;
  // Otázka AI na vlastníka (#385): na tahu je vlastník, i když je zadání schválené.
  if (s.has('otazka')) return STAVY.navrh;
  if (s.has('oponentura')) return STAVY.oponentura;
  if (s.has('navrh') && !s.has('schvaleno')) return STAVY.navrh;
  if (prs.length) return prs.some((p) => p.cekaNaSouhlas) ? STAVY.cekaNaSouhlas : STAVY.vPr;
  // Interní zadání s dokladem „Zdroj:“ zapisuje rozhodnutí vlastníka; schvaleno nepotřebuje (CLAUDE.md, pravidlo 1).
  if (s.has('schvaleno') || (s.has('interni') && !STITKY_HLASENI.some((h) => s.has(h)) && ZDROJ.test(issue.telo || ''))) return STAVY.schvaleno;
  return STAVY.hlaseni;
}

/** Brána čeká na souhlas vlastníka (štítek `schvaleno` na PR nebo issue). */
export function branaCekaNaSouhlas(kontrola) {
  return kontrola?.conclusion === 'failure' && /chybí souhlas vlastníka/.test(kontrola.output?.summary || '');
}

const NA_CO_CEKA_MAX = 120;
const zkrat = (t) => (t.length > NA_CO_CEKA_MAX ? `${t.slice(0, NA_CO_CEKA_MAX - 1)}…` : t);

/** Čas brány (UTC „RRRR-MM-DD HH:MM“) jako „8. 10. 14:30“ v pražském čase. */
function praha(utc) {
  const d = new Date(`${utc.replace(' ', 'T')}:00Z`);
  if (Number.isNaN(d.getTime())) return utc;
  const c = new Intl.DateTimeFormat('cs-CZ', { timeZone: 'Europe/Prague', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
  return c.replace(/\s+/g, ' ');
}

/**
 * Jedna věta o tom, na co PR čeká, pro pole „Na co čeká“.
 * @param {{ draft?: boolean, mergeable?: boolean|null, kontrola?: { status?: string, conclusion?: string, output?: { summary?: string } }, review?: 'ok'|'nalezy'|null }} p
 */
export function naCoCekaPr(p) {
  if (p.draft) return 'rozpracovaný (draft)';
  const review = p.review === 'ok' ? 'review bez P1/P2' : p.review === 'nalezy' ? 'review má nálezy k opravě' : 'review zatím není';
  if (p.mergeable === false) return `konflikt s main, opraví autor PR · ${review}`;
  const k = p.kontrola;
  if (!k || k.status !== 'completed') return `brána se vyhodnocuje · ${review}`;
  if (k.conclusion === 'success') return `brána prošla, sloučí se automaticky · ${review}`;
  const duvod = ((k.output?.summary || '').split('\n')[0] || '').replace(/^-\s*/, '');
  let co;
  if (/chybí protokol z preview/.test(duvod)) co = 'chybí protokol z preview';
  else if (/protokol z preview obsahuje nesplněné/.test(duvod)) co = 'protokol z preview má nesplněné kritérium';
  else if (/lhůta na veto běží do (\d{4}-\d\d-\d\d \d\d:\d\d)/.test(duvod)) co = `lhůta na veto do ${praha(duvod.match(/(\d{4}-\d\d-\d\d \d\d:\d\d)/)[1])}`;
  else if (/chybí souhlas vlastníka/.test(duvod)) co = 'čeká na tvé schvaleno';
  else if (/štítek stop/.test(duvod)) co = 'zastaveno štítkem stop';
  else if (/^zamrznutí/.test(duvod)) co = 'zamrznutí, sloučí se po něm';
  else co = `brána: ${duvod || 'neprošla'}`;
  return `${co} · ${review}`;
}

/**
 * Jedna věta o tom, na co issue čeká, pro pole „Na co čeká“; '' u zavřeného, null u trvale.
 * @param {{ stav: 'OPEN'|'CLOSED', stitky: string[], telo?: string, rodic?: number|null, ukoly?: { total: number, completed: number }|null }} issue
 * @param {{ cislo: number }[]} prs otevřené PR s hotovou větou `naCoCeka`
 * @param {string} dnes RRRR-MM-DD
 */
export function naCoCeka(issue, prs = [], dnes = new Date().toISOString().slice(0, 10)) {
  const s = new Set(issue.stitky);
  if (issue.stav === 'CLOSED') return '';
  if (s.has('trvale')) return null;
  if (s.has('stop')) return 'zastaveno štítkem stop';
  if (s.has('otazka')) return 'otázka čeká na tvou odpověď (komentář v issue, poslaná do Telegramu)';
  if (s.has('oponentura')) return 'oponentura, pak k tvému rozhodnutí';
  if (s.has('navrh') && !s.has('schvaleno')) return 'čeká na tvé rozhodnutí: schvaleno, nebo zamitnuto';
  if (s.has('pripominka')) {
    const t = (issue.telo || '').match(/Termín:?\s*(\d{4})-(\d{2})-(\d{2})/);
    if (t && `${t[1]}-${t[2]}-${t[3]}` > dnes) return `připomínka, termín ${Number(t[3])}. ${Number(t[2])}. ${t[1]}`;
    return 'připomínka je splatná, čeká na vyhodnocení';
  }
  if (prs.length) return zkrat(prs.map((p) => `PR #${p.cislo}: ${p.naCoCeka}`).join('; '));
  const hlaseni = STITKY_HLASENI.some((h) => s.has(h));
  if (hlaseni) return issue.rodic ? `patří k projektu #${issue.rodic}, vyřeší ho jeho etapa` : 'hlášení: čeká na třídění, schvaleno nebo připojení k projektu';
  const schvalene = s.has('schvaleno') || (s.has('interni') && ZDROJ.test(issue.telo || ''));
  if (!schvalene) {
    if (s.has('nova-data')) return 'čeká na nová data (datová linka)';
    return s.has('interni') ? 'chybí schvaleno nebo doklad Zdroj:' : 'čeká na třídění';
  }
  if (s.has('question')) return 'čeká na odpověď na dotaz v issue';
  if (s.has('projekt')) {
    const u = issue.ukoly;
    return u?.total ? `projekt: hotovo ${u.completed} z ${u.total} úkolů, čeká na další etapu` : 'projekt: čeká na další etapu';
  }
  return 'čeká na realizaci (hodinová úloha)';
}

// ---- Pilot tabule (#561): pole „Pro lidi“, „Čeká na“ a „Termín“ ----

const PRO_LIDI = /^Pro lidi:[ \t]*(\S.*)$/m;
// Formulář zadání vloží pole jako nadpis „### Pro lidi“ a text pod ním.
const PRO_LIDI_NADPIS = /^#{2,3}[ \t]*Pro lidi[ \t]*\n+(?!#)(\S[^\n]*)/m;
const PRO_LIDI_MAX = 240;
export const CEKA_NA = { vlastnik: 'Patrick', kolega: 'kolega', ai: 'AI', nikdo: 'nikdo' };

/**
 * Text pole „Pro lidi“: řádek `Pro lidi:` nebo oddíl „### Pro lidi“ z těla issue, jinak název issue (a `chybi: true`).
 * @param {{ titulek?: string, telo?: string }} issue
 */
export function proLidi(issue) {
  // HTML komentáře pryč: nevyplněný řádek ze šablony (`Pro lidi: <!-- … -->`) je prázdný, ne text.
  const telo = (issue.telo || '').replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?(-->|$)/g, '');
  const m = telo.match(PRO_LIDI) || telo.match(PRO_LIDI_NADPIS);
  const text = (m ? m[1] : issue.titulek || '').replace(/\s+/g, ' ').trim();
  return { text: text.length > PRO_LIDI_MAX ? `${text.slice(0, PRO_LIDI_MAX - 1)}…` : text, chybi: !m };
}

/** Termín připomínky (`Termín: RRRR-MM-DD` v těle) pro datové pole „Termín“, jinak null. */
export function termin(telo = '') {
  return telo.match(/Termín:?\s*(\d{4}-\d{2}-\d{2})/)?.[1] || null;
}

/**
 * Kdo je na tahu, pro pole „Čeká na“ (issue). Přiřazení kolegovi má přednost; jinak podle stavu karty:
 * vlastník rozhoduje návrh, souhlas s merge, veřejné hlášení bez rozhodnutí a splatnou připomínku, AI zbytek.
 * @param {{ stav: 'OPEN'|'CLOSED', stitky: string[], telo?: string, rodic?: number|null, prirazeni?: string[] }} issue
 * @param {string|null} karta cílový stav karty z `cilovyStav`
 * @param {{ kolegove?: string[], dnes?: string }} o
 * @returns {string|null} volba pole, nebo null u trvale
 */
export function cekaNa(issue, karta, { kolegove = [], dnes = new Date().toISOString().slice(0, 10) } = {}) {
  if (karta === null) return null;
  if (issue.stav === 'CLOSED' || karta === STAVY.hotovo) return CEKA_NA.nikdo;
  if ((issue.prirazeni || []).some((a) => kolegove.includes(a))) return CEKA_NA.kolega;
  if (karta === STAVY.navrh || karta === STAVY.cekaNaSouhlas) return CEKA_NA.vlastnik;
  const s = new Set(issue.stitky);
  if (s.has('pripominka')) {
    const t = termin(issue.telo);
    return t && t > dnes ? CEKA_NA.nikdo : CEKA_NA.vlastnik;
  }
  if (karta === STAVY.hlaseni && STITKY_HLASENI.some((h) => s.has(h)) && !s.has('schvaleno') && !issue.rodic) return CEKA_NA.vlastnik;
  return CEKA_NA.ai;
}

/** „Čeká na“ u PR: vlastník, když brána čeká na jeho souhlas; zavřený nikdo; jinak AI. */
export function cekaNaPr({ otevreny, cekaNaSouhlas }) {
  if (!otevreny) return CEKA_NA.nikdo;
  return cekaNaSouhlas ? CEKA_NA.vlastnik : CEKA_NA.ai;
}
