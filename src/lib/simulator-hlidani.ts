// ============================================================================
// Školy k hlídání ze zvažovaných oborů v simulátoru (zadání #523, E6b).
//
// Zvažovaný obor má id `RED IZO_KKOV[_zaměření]`. Rodina hlídá školu, ne obor,
// proto se obory téže školy sloučí do jedné položky. Pořadí drží pořadí
// zvažovaných oborů a počet je omezen stejně jako žádost o hlídání (20 škol).
// ============================================================================

export const MAX_SKOL_K_HLIDANI = 20;

export interface SkolaKHlidani {
  redizo: string;
  nazev: string;
}

/**
 * Seznam škol ze zvažovaných oborů. `nazev` vrátí název školy pro id oboru, nebo
 * null, když obor v katalogu není (taková škola se nenabídne: nevíme, jak se jmenuje).
 */
export function skolyKHlidani(ids: readonly string[], nazev: (id: string) => string | null): SkolaKHlidani[] {
  const vysledek: SkolaKHlidani[] = [];
  for (const id of ids) {
    const redizo = id.split('_')[0];
    if (!/^\d{9}$/.test(redizo) || vysledek.some(s => s.redizo === redizo)) continue;
    const n = nazev(id);
    if (!n) continue;
    vysledek.push({ redizo, nazev: n });
    if (vysledek.length >= MAX_SKOL_K_HLIDANI) break;
  }
  return vysledek;
}
