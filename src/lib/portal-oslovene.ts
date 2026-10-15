import type { PilotSkola, StavSkolyPortalu } from './portal-admin';

// ============================================================================
// Oslovené školy portálu v administraci (#488): souhrn po vlnách a filtr.
// Bez Next.js a databáze, aby šel testovat.
// ============================================================================

export interface OslovenaSkola {
  skola: PilotSkola;
  stav: StavSkolyPortalu | null;
}

export interface SouhrnVlny {
  /** Číslo vlny; školy bez čísla jsou pilot (vlna 1). */
  vlna: number;
  osloveno: number;
  seSpravcem: number;
  sNavrhem: number;
}

export type FiltrOslovenych = { jenSeSpravcem: boolean; vlna: number | null };

export const vlnaSkoly = (s: PilotSkola): number => s.vlna ?? 1;

const souhrnZ = (vlna: number, skoly: OslovenaSkola[]): SouhrnVlny => ({
  vlna,
  osloveno: skoly.length,
  seSpravcem: skoly.filter((p) => p.stav?.spravce).length,
  sNavrhem: skoly.filter((p) => (p.stav?.navrhy ?? 0) > 0).length,
});

/** Souhrn po vlnách vzestupně; vlna 0 v souhrnu celkem znamená všechny vlny. */
export function souhrnVln(skoly: OslovenaSkola[]): { vlny: SouhrnVlny[]; celkem: SouhrnVlny } {
  const podleVlny = new Map<number, OslovenaSkola[]>();
  for (const p of skoly) {
    const v = vlnaSkoly(p.skola);
    podleVlny.set(v, [...(podleVlny.get(v) ?? []), p]);
  }
  return {
    vlny: [...podleVlny.entries()].sort(([a], [b]) => a - b).map(([v, s]) => souhrnZ(v, s)),
    celkem: souhrnZ(0, skoly),
  };
}

/** Parametry z adresy: `?spravce=1` jen školy se správcem, `?vlna=N` jedna vlna; neplatné hodnoty se ignorují. */
export function filtrZAdresy(p: { spravce?: string; vlna?: string }): FiltrOslovenych {
  const vlna = Number(p.vlna);
  return { jenSeSpravcem: p.spravce === '1', vlna: Number.isInteger(vlna) && vlna > 0 ? vlna : null };
}

/** Filtr a řazení: školy s aktivitou (správce, pak poslední přihlášení) nahoře, zbytek podle názvu. */
export function filtrujOslovene(skoly: OslovenaSkola[], f: FiltrOslovenych): OslovenaSkola[] {
  const posledni = (p: OslovenaSkola) => (p.stav?.posledni_prihlaseni ? Date.parse(p.stav.posledni_prihlaseni) : 0);
  return skoly
    .filter((p) => (!f.jenSeSpravcem || p.stav?.spravce) && (f.vlna === null || vlnaSkoly(p.skola) === f.vlna))
    .sort(
      (a, b) =>
        Number(Boolean(b.stav?.spravce)) - Number(Boolean(a.stav?.spravce)) ||
        posledni(b) - posledni(a) ||
        a.skola.nazev.localeCompare(b.skola.nazev, 'cs'),
    );
}
