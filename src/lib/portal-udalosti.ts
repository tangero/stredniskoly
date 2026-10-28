import type { NovaUdalost } from './udalosti.ts';

// ============================================================================
// Události z portálu pro školy (docs/sledovani-skol-2027.md, oddíl 2).
//
// Událost vzniká, když škola uloží údaj, na který se rodina při hlídání ptá:
// dny otevřených dveří a kritéria přijetí. Ostatní pole profilu (školné,
// ubytování…) na e-mail nejdou. Zápis do databáze je v `udalosti.ts`.
// ============================================================================

/** Pole profilu, jejichž změna je událost, a jak se jmenují ve větě souhrnu. */
export const POLE_S_UDALOSTI: Record<string, string> = {
  odkaz_kriteria: 'kritéria přijetí',
  kriteria_vlastnimi_slovy: 'kritéria přijetí',
  dny_otevrenych_dveri: 'dny otevřených dveří',
};

/** Pořadí podle důležitosti pro rozhodování rodiny; opakované názvy se spojí. */
const PORADI = ['kritéria přijetí', 'dny otevřených dveří'];

export function popisyZmen(pole: string[]): string[] {
  const popisy = new Set(pole.map((p) => POLE_S_UDALOSTI[p]).filter(Boolean));
  return PORADI.filter((p) => popisy.has(p));
}

/** Událost jedné školy; `zdrojId` je id zapsané verze, takže klíč je jedinečný pro každý zápis. */
export function udalostZPortalu(redizo: string, popisy: string[], zdrojId: string): NovaUdalost | null {
  if (popisy.length === 0) return null;
  return {
    klic: `portal_schvalen:${redizo}:${zdrojId}`,
    typ: 'portal_schvalen',
    redizo,
    veta: `Škola doplnila nebo změnila údaje pro rodiny: ${popisy.join(', ')}.`,
    skoly: [redizo],
  };
}

/** Porovnání obsahu nezávislé na pořadí klíčů (jsonb je řadí po svém). */
export function stejnyObsah(a: unknown, b: unknown): boolean {
  const normuj = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(normuj)
      : v && typeof v === 'object'
        ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([x], [y]) => (x < y ? -1 : 1)).map(([k, h]) => [k, normuj(h)]))
        : v;
  return JSON.stringify(normuj(a)) === JSON.stringify(normuj(b));
}
