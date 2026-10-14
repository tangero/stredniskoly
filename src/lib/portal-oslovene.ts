/** Oslovené školy portálu: souhrn po vlnách a filtr pro `/admin/portal/oslovene` (#488). */

export interface OsloveneRadek {
  vlna: number;
  /** Jméno správce účtu, pokud ho škola má. */
  spravce: string | null;
  /** Počet odeslaných návrhů změn. */
  navrhy: number;
}

export interface SouhrnVlny {
  vlna: number;
  osloveno: number;
  seSpravcem: number;
  poslaloNavrh: number;
}

export type FiltrOslovenych = { typ: 'vse' } | { typ: 'spravce' } | { typ: 'vlna'; vlna: number };

/** Souhrn po vlnách seřazený podle čísla vlny. */
export function souhrnPoVlnach(radky: OsloveneRadek[]): SouhrnVlny[] {
  const vlny = new Map<number, SouhrnVlny>();
  for (const r of radky) {
    const s = vlny.get(r.vlna) ?? { vlna: r.vlna, osloveno: 0, seSpravcem: 0, poslaloNavrh: 0 };
    s.osloveno += 1;
    if (r.spravce) s.seSpravcem += 1;
    if (r.navrhy > 0) s.poslaloNavrh += 1;
    vlny.set(r.vlna, s);
  }
  return [...vlny.values()].sort((a, b) => a.vlna - b.vlna);
}

/** Filtr z parametrů adresy: `?filtr=spravce` nebo `?vlna=2`; cokoli jiného znamená všechny školy. */
export function filtrZAdresy(p: { filtr?: string; vlna?: string }): FiltrOslovenych {
  const vlna = Number(p.vlna);
  if (p.vlna && Number.isInteger(vlna) && vlna > 0) return { typ: 'vlna', vlna };
  if (p.filtr === 'spravce') return { typ: 'spravce' };
  return { typ: 'vse' };
}

export function filtrujOslovene<T extends OsloveneRadek>(radky: T[], filtr: FiltrOslovenych): T[] {
  if (filtr.typ === 'spravce') return radky.filter((r) => r.spravce);
  if (filtr.typ === 'vlna') return radky.filter((r) => r.vlna === filtr.vlna);
  return radky;
}
