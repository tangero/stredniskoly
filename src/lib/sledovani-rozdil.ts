import { stejnyObsah } from './portal-udalosti.ts';
import type { NovaUdalost } from './udalosti.ts';

// ============================================================================
// Rozdíl zobrazených hodnot po přepnutí datové sady
// (docs/sledovani-skol-2027.md, oddíl 2).
//
// Vstupem jsou dva snímky téže sady: RED IZO → hodnoty, které stránka školy
// opravdu zobrazí (ne celé zdrojové soubory), před přepnutím a po něm. Událost
// se týká jen škol, kde se zobrazená hodnota liší, takže technická regenerace
// bez změny hodnot žádnou událost nevyrobí.
// ============================================================================

export type SnimekSady = Record<string, unknown>;

/** Hodnota bez obsahu školu nezmění: nic se nezobrazí, nemá o čem zpráva být. */
function maObsah(v: unknown): boolean {
  if (v === null || v === undefined || v === '') return false;
  if (Array.isArray(v)) return v.some(maObsah);
  if (typeof v === 'object') return Object.values(v as object).some(maObsah);
  return true;
}

/**
 * Školy, jejichž zobrazená hodnota se po přepnutí liší. Škola, která v nové
 * sadě je a v dosavadní nebyla, se počítá (nové období jí něco přidalo); škola,
 * která z nové sady zmizela, ne.
 */
export function skolySeZmenou(stare: SnimekSady, nove: SnimekSady): string[] {
  const zmenene: string[] = [];
  for (const [redizo, hodnota] of Object.entries(nove)) {
    if (!maObsah(hodnota)) continue;
    if (!(redizo in stare) || !stejnyObsah(stare[redizo], hodnota)) zmenene.push(redizo);
  }
  return zmenene.sort();
}

export interface PrepnutiSady {
  sada: string;
  obdobi: string;
  /** Hotová věta souhrnu, např. „Zveřejnili jsme nabídku oborů pro přijímací řízení 2027.“ */
  veta: string;
  stare: SnimekSady;
  nove: SnimekSady;
}

/** Událost přepnutí sady, nebo null, když se žádné škole nic nezměnilo. */
export function udalostZPrepnuti(p: PrepnutiSady): NovaUdalost | null {
  const skoly = skolySeZmenou(p.stare, p.nove);
  if (skoly.length === 0) return null;
  return {
    // Tatáž sada a období dá vždy týž klíč, takže druhý běh nad týmž přepnutím nic nevytvoří.
    klic: `sada_prepnuta:${p.sada}:${p.obdobi}`,
    typ: 'sada_prepnuta',
    sada: p.sada,
    obdobi: p.obdobi,
    veta: p.veta,
    skoly,
  };
}
