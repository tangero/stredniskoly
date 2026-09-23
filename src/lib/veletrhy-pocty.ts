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
