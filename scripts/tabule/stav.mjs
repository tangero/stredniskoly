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
  // Veto a návrh čekají na vlastníka. Zbylý `navrh` vedle `schvaleno` (zmeškaná úprava štítku)
  // kartu do návrhu nevrací; schválení je novější rozhodnutí.
  if (s.has('stop') || (s.has('navrh') && !s.has('schvaleno'))) return STAVY.navrh;
  if (s.has('oponentura')) return STAVY.oponentura;
  if (prs.length) return prs.some((p) => p.cekaNaSouhlas) ? STAVY.cekaNaSouhlas : STAVY.vPr;
  // Interní zadání s dokladem „Zdroj:“ zapisuje rozhodnutí vlastníka; schvaleno nepotřebuje (CLAUDE.md, pravidlo 1).
  if (s.has('schvaleno') || (s.has('interni') && !STITKY_HLASENI.some((h) => s.has(h)) && ZDROJ.test(issue.telo || ''))) return STAVY.schvaleno;
  return STAVY.hlaseni;
}

/** Brána čeká na souhlas vlastníka (štítek `schvaleno` na PR nebo issue). */
export function branaCekaNaSouhlas(kontrola) {
  return kontrola?.conclusion === 'failure' && /chybí souhlas vlastníka/.test(kontrola.output?.summary || '');
}
