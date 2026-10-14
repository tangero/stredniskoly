// ============================================================================
// Ukazatel *počet akcí v kraji* (slovník ukazatelů, oddíl 6a).
//
// Listový modul bez dat a bez registru: importuje ho klientská komponenta
// seznamu. Kdyby sáhla do `./veletrhy.ts`, vzala by s sebou celý JSON akcí
// (i nepotvrzené záznamy, které stránka odmítá ukázat) a přes registr sad
// i `fs`, na kterém `next build` spadne.
// ============================================================================

import { tvar } from './cesky-tvar.ts';

/**
 * Den v českém kalendáři jako `YYYY-MM-DD`; UTC by mezi půlnocí a ránem
 * lhalo o den. Jedna definice pro server (sestavení stránky) i klienta
 * (přepočet po půlnoci), aby se serverový a klientský den nerozešly.
 */
export function cesskyDen(ke: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ke);
}

/** `2026-09-22` → „22. 9. 2026“: datum ověření, jak ho píše přehled i upoutávka. */
export function formatujDen(iso: string): string {
  const [r, m, d] = iso.split('-');
  return `${Number(d)}. ${Number(m)}. ${r}`;
}

/**
 * Akce seskupené podle `krajKod`, v pořadí, v jakém přišly. Jediná
 * definice seskupení pro klienta i testy, aby se čísla nerozešla.
 */
export function seskupPodleKraje<T extends { krajKod: string }>(akce: T[]): Map<string, T[]> {
  const podleKraje = new Map<string, T[]>();
  for (const a of akce) {
    const seznam = podleKraje.get(a.krajKod) ?? [];
    seznam.push(a);
    podleKraje.set(a.krajKod, seznam);
  }
  return podleKraje;
}

/** „1 akce“, „3 akce“, „5 akcí“ — tvar ukazatele v textu. */
export function akci(n: number): string {
  return `${n} ${tvar(n, 'akce', 'akce', 'akcí')}`;
}

const MESICE = [
  'leden', 'únor', 'březen', 'duben', 'květen', 'červen',
  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec',
];

/** Nejdelší titulek, který Google ukáže celý (~60 znaků). */
const TITULEK_MAX = 60;

export const TITULEK_VELETRHU = 'Veletrhy a přehlídky středních škol — přehled akcí';
export const POPISEK_VELETRHU =
  'Kde se dá potkat víc středních škol najednou: veletrhy a přehlídky po krajích, s městy, termíny a odkazy na pořadatele.';

/**
 * Titulek a popisek stránky /veletrhy ze zobrazených akcí (#483): měsíce, kraje a počet
 * se berou z dat, takže po skončení sezóny (žádná nadcházející akce) zůstane obecné znění bez měsíců.
 */
export function metaVeletrhu(akce: { start: string; end: string; krajKod: string }[]): {
  title: string;
  description: string;
} {
  if (akce.length === 0) return { title: TITULEK_VELETRHU, description: POPISEK_VELETRHU };
  const prvni = akce.reduce((m, a) => (a.start < m ? a.start : m), akce[0].start);
  const posledni = akce.reduce((m, a) => (a.end > m ? a.end : m), akce[0].end);
  const [r1, m1] = prvni.split('-').map(Number);
  const [r2, m2] = posledni.split('-').map(Number);
  const mesice = m1 === m2 && r1 === r2 ? MESICE[m1 - 1] : `${MESICE[m1 - 1]}–${MESICE[m2 - 1]}`;
  const rok = r1 === r2 ? `${r1}` : `${r1}/${String(r2).slice(2)}`;
  const kraju = new Set(akce.map((a) => a.krajKod)).size;
  let title = `Veletrhy středních škol po krajích: ${mesice} ${rok}`;
  if (title.length > TITULEK_MAX) title = `Veletrhy středních škol po krajích: ${mesice}`;
  const krajuText = `${kraju} ${tvar(kraju, 'kraji', 'krajích', 'krajích')}`;
  const description =
    `${akci(akce.length)} v ${krajuText} (${mesice}): veletrhy a přehlídky středních škol ` +
    'po krajích, s městy, termíny a odkazy na pořadatele.';
  return { title, description };
}
