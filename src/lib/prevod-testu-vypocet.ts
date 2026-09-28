// Čisté výpočty převodu výsledku testu; bez fs, aby je mohla použít i
// klientská komponenta (slovník ukazatelů, *Převedený výsledek testu*).

export interface TerminPrevodu {
  klic: string;
  nazev: string;
  radny: boolean;
  resitelu: number;
  spolehlive: boolean;
  /** Index = body z testu (ČJ + M, 0–100); hodnota = body cílového roku. */
  body_cil: number[];
}

export interface PrevodTestu {
  rok_testu: number;
  rok_cile: number;
  terminy: TerminPrevodu[];
}

/** Převede součet bodů z testu; mezi celými body lineárně. */
export function prevedBody(tabulka: number[], body: number): number {
  const b = Math.max(0, Math.min(tabulka.length - 1, body));
  const dole = Math.floor(b);
  const nahore = Math.min(dole + 1, tabulka.length - 1);
  return Math.round((tabulka[dole] + (tabulka[nahore] - tabulka[dole]) * (b - dole)) * 10) / 10;
}

/** Prostřední hodnota; u sudého počtu průměr dvou prostředních. */
export function median(hodnoty: number[]): number | null {
  if (!hodnoty.length) return null;
  const s = [...hodnoty].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 10) / 10;
}

// ----------------------------------------------------------------------------
// Pořadí mezi soutěžícími (slovník ukazatelů)
// ----------------------------------------------------------------------------

/** Kolik soutěžících uchazečů mělo který výsledek; klíč je výsledek jako text. */
export type PoziceOboru = Record<string, number>;

export interface Poradi {
  celkem: number;
  vyssi: number;
  stejny: number;
}

/** Kolik soutěžících mělo vyšší a kolik stejný výsledek než zadané body. */
export function poradiMeziSoutezicimi(pozice: PoziceOboru, body: number): Poradi {
  let celkem = 0, vyssi = 0, stejny = 0;
  for (const [b, n] of Object.entries(pozice)) {
    const v = Number(b);
    celkem += n;
    if (v > body) vyssi += n;
    else if (v === body) stejny += n;
  }
  return { celkem, vyssi, stejny };
}

// ----------------------------------------------------------------------------
// Kritéria předchozího ročníku z PDF v DiPSy (pracovní přepis)
// ----------------------------------------------------------------------------

export interface PrepisKriterii {
  source_id: string;
  zamereni: string;
  rezim: 'pouze_jpz' | 'jine';
  /** Podíl přijímaček na bodování, % (slovník ukazatelů). */
  podil_jpz_pct: number | null;
  slozky: { nazev: string; max: number | null }[];
  /** Body navíc z přijímaček, typicky vážení jednoho předmětu (matematika × 0,5). */
  jpz_navic: { nazev: string; max: number | null }[];
  minima: string[];
  nejasnosti: string[];
  prepis: 'rucni' | 'strojovy';
  /** Nálezy mechanické kontroly; prázdné neznamená ověřeno. */
  nalezy: string[];
}

export interface KriteriaOboru {
  rok: number;
  /** Máme PDF kritérií tohoto oboru za daný rok. */
  pdf: boolean;
  prepisy: PrepisKriterii[];
  /** Kdy školy zveřejní kritéria nového ročníku, z harmonogramu MŠMT. */
  noveKriteria: string | null;
}
