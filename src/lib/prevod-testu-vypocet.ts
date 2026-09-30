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

/** Druh testu podle délky studia: 4 = čtyřleté obory (9. třída), 6 a 8 = víceletá gymnázia. */
export type DruhTestu = '4' | '6' | '8';

export interface PrevodTestu {
  rok_testu: number;
  rok_cile: number;
  druhy: Partial<Record<DruhTestu, TerminPrevodu[]>>;
}

/** Převod jednoho druhu testu; stránka oboru dostává jen ten svůj. */
export interface PrevodDruhu {
  rok_testu: number;
  rok_cile: number;
  terminy: TerminPrevodu[];
}

/** Který test psal uchazeč o obor: víceletá gymnázia mají vlastní. */
export function druhTestu(kkov: string): DruhTestu {
  if (/K\/81$/.test(kkov)) return '8';
  if (/K\/61$/.test(kkov)) return '6';
  return '4';
}

/** Třída, pro kterou je test v aplikaci TAU. */
export const TRIDA_TAU: Record<DruhTestu, number> = { '4': 9, '6': 7, '8': 5 };

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
  /** `druh` jen u údajů školy (formulář portálu); u přepisu PDF se druh odhaduje z názvu. */
  slozky: { nazev: string; max: number | null; druh?: string }[];
  /** Body navíc z přijímaček, typicky vážení jednoho předmětu (matematika × 0,5). */
  /** Přijímačky zapsané v PDF jinak než prostým součtem (bonus, přepočet, váha pořadí); jen názvy. */
  jpz_navic: { nazev: string; max: number | null }[];
  minima: string[];
  nejasnosti: string[];
  /** `skola`: kritéria zadala škola v portálu; mají přednost před přepisem PDF. */
  prepis: 'rucni' | 'strojovy' | 'skola';
  /** Nálezy mechanické kontroly; prázdné neznamená ověřeno. */
  nalezy: string[];
  /** Přepis tvrdil „jen přijímačky“, kontrola Jevem našla i další bodování; složky v přepisu chybí. */
  chybi_slozky?: boolean;
  /** Další pravidla a výjimky slovy (jen údaje školy). */
  popis?: string;
  /** Odkaz na vyhlášená kritéria (jen údaje školy). */
  odkaz?: string;
}

export interface KriteriaOboru {
  rok: number;
  /** Máme PDF kritérií tohoto oboru za daný rok. */
  pdf: boolean;
  prepisy: PrepisKriterii[];
  /** Kdy školy zveřejní kritéria nového ročníku, z harmonogramu MŠMT. */
  noveKriteria: string | null;
  /** Kritéria jsou pro ročník novější než pásma (nové řízení); jen pro blok kritérií. */
  noveRizeni?: boolean;
  /**
   * Kritéria nového řízení zadaná školou. Historické věty pod proužkem dál stojí
   * na kritériích roku pásem (`prepisy`), blok kritérií ukáže tato.
   */
  nove?: { rok: number; prepisy: PrepisKriterii[] };
}
