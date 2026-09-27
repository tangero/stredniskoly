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
