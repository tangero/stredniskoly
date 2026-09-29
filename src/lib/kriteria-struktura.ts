// ============================================================================
// Strukturované bodování oboru, které zadává škola v portálu
// (docs/prototyp-kriteria-prijeti.md, oddíl Strukturované zadání).
//
// Formát odpovídá schématu strojového přepisu PDF z DiPSy
// (scripts/dipsy-kriteria-usporny-pilot.py, SCHEMA): stejná jména polí `jpz`,
// `slozky`, `minima`, `rovnost` a `vyslovne_max_celkem`. Díky tomu jde přepis
// použít jako předvyplnění a údaj od školy později zobrazit stejnou cestou.
//
// Modul je čistý (bez fs a databáze), sdílí ho formulář i serverová validace.
// ============================================================================

export const DRUHY_SLOZEK = [
  ['prospech', 'Prospěch ze základní školy'],
  ['predmety', 'Známky z vybraných předmětů'],
  ['skolni_zkouska', 'Školní přijímací zkouška'],
  ['talentova', 'Talentová, praktická nebo fyzická zkouška'],
  ['pohovor', 'Pohovor nebo motivační dopis'],
  ['soutez', 'Soutěže a olympiády'],
  ['certifikat', 'Certifikáty a jazykové zkoušky'],
  ['bonus', 'Bonus (aktivity, doporučení, sourozenci)'],
  ['dod', 'Účast na dni otevřených dveří'],
  ['chovani', 'Chování (srážka)'],
  ['jine', 'Jiné'],
] as const;

export type DruhSlozky = (typeof DRUHY_SLOZEK)[number][0];
const DRUHY = new Set<string>(DRUHY_SLOZEK.map(([k]) => k));

export const NA_CO_MINIMUM = [
  ['jpz_celkem', 'Součet jednotné přijímací zkoušky'],
  ['cjl', 'Český jazyk a literatura (JPZ)'],
  ['mat', 'Matematika (JPZ)'],
  ['celkem', 'Celkový počet bodů'],
  ['jine', 'Jiné'],
] as const;
export type NaCoMinimum = (typeof NA_CO_MINIMUM)[number][0];
const NA_CO = new Set<string>(NA_CO_MINIMUM.map(([k]) => k));

/** Časté pravidlo při rovnosti bodů; nabídka formuláře, uloží se jako text. */
export const ROVNOST_NABIDKA = [
  'Lepší výsledek z matematiky (JPZ)',
  'Lepší výsledek z českého jazyka (JPZ)',
  'Lepší prospěch ze základní školy',
  'Lepší výsledek školní přijímací zkoušky',
  'Úspěch v soutěžích',
] as const;

export interface SlozkaKriterii {
  druh: DruhSlozky;
  nazev: string;
  /** Maximum bodů po případném přepočtu; záporné = srážka; null = neznámé. */
  max: number | null;
  poznamka: string;
}

export interface MinimumKriterii {
  na_co: NaCoMinimum;
  hodnota: number | null;
  jednotka: 'body' | 'procenta';
  popis: string;
}

export interface StrukturaKriterii {
  verze: 1;
  jpz: {
    cjl_max: number | null;
    mat_max: number | null;
    /** Výslovné násobení bodů JPZ, %; null = bez přepočtu. */
    prepoctovy_koeficient_pct: number | null;
    /** Jeden předmět JPZ se počítá s vyšší váhou. */
    vyssi_vaha: { predmet: 'cjl' | 'mat'; nasobek: number } | null;
  };
  slozky: SlozkaKriterii[];
  minima: MinimumKriterii[];
  /** Seřazená pravidla při rovnosti bodů, heslovitě. */
  rovnost: string[];
  /** Celkové maximum, jak ho škola vyhlásila; slouží ke kontrole součtu. */
  vyslovne_max_celkem: number | null;
}

export const prazdnaStruktura = (): StrukturaKriterii => ({
  verze: 1,
  jpz: { cjl_max: 50, mat_max: 50, prepoctovy_koeficient_pct: null, vyssi_vaha: null },
  slozky: [],
  minima: [],
  rovnost: [],
  vyslovne_max_celkem: null,
});

export interface SouhrnBodovani {
  /** Maximum z JPZ po vážení a přepočtu; null, když chybí maxima. */
  jpzMax: number | null;
  /** Součet kladných maxim ostatních složek; null, když některé chybí. */
  ostatniMax: number | null;
  celkem: number | null;
  /** Podíl přijímaček na bodování, % (slovník ukazatelů). */
  podilJpzPct: number | null;
  /** Rozdíl proti vyhlášenému celkovému maximu, když ho škola uvedla. */
  rozdilProtiVyhlasenemu: number | null;
  /** Boduje se jen prostý součet ČJL + MAT, bez přepočtu, vah a dalších bodů. */
  jenJpz: boolean;
}

const zaokrouhli = (n: number) => Math.round(n * 100) / 100;

export function souhrnBodovani(s: StrukturaKriterii): SouhrnBodovani {
  const { cjl_max, mat_max, prepoctovy_koeficient_pct: koef, vyssi_vaha } = s.jpz;
  let jpzMax: number | null = null;
  if (cjl_max !== null && mat_max !== null) {
    const cj = cjl_max * (vyssi_vaha?.predmet === 'cjl' ? vyssi_vaha.nasobek : 1);
    const ma = mat_max * (vyssi_vaha?.predmet === 'mat' ? vyssi_vaha.nasobek : 1);
    jpzMax = zaokrouhli((cj + ma) * (koef ?? 100) / 100);
  }
  const pridavane = s.slozky.filter((x) => x.max === null || x.max > 0);
  const ostatniMax = pridavane.some((x) => x.max === null)
    ? null
    : zaokrouhli(pridavane.reduce((a, x) => a + (x.max ?? 0), 0));
  const celkem = jpzMax !== null && ostatniMax !== null ? zaokrouhli(jpzMax + ostatniMax) : null;
  const podilJpzPct = jpzMax !== null && celkem ? Math.round(jpzMax / celkem * 100) : null;
  const rozdilProtiVyhlasenemu = celkem !== null && s.vyslovne_max_celkem !== null
    ? zaokrouhli(s.vyslovne_max_celkem - celkem) : null;
  const jenJpz = s.slozky.every((x) => x.max === 0) && koef === null && vyssi_vaha === null;
  return { jpzMax, ostatniMax, celkem, podilJpzPct, rozdilProtiVyhlasenemu, jenJpz };
}

// ---------------------------------------------------------------------------
// Validace (server i klient)
// ---------------------------------------------------------------------------

const MAX_RADKU = 30;
const MAX_TEXT = 300;

function cislo(v: unknown, { min, max, pole }: { min: number; max: number; pole: string }): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max)
    throw new Error(`${pole}: zadejte číslo od ${min} do ${max}.`);
  return zaokrouhli(v);
}

function text(v: unknown, pole: string, delka = MAX_TEXT): string {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'string') throw new Error(`${pole}: neplatný text.`);
  const t = v.trim();
  if (t.length > delka) throw new Error(`${pole}: nejvýše ${delka} znaků.`);
  return t;
}

function pole(v: unknown, nazev: string, limit = MAX_RADKU): unknown[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new Error(`${nazev}: neplatný seznam.`);
  if (v.length > limit) throw new Error(`${nazev}: nejvýše ${limit} řádků.`);
  return v;
}

const objekt = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};

/** Ověří a znormalizuje strukturu; při chybě vyhodí Error se srozumitelnou větou. */
export function overStrukturu(raw: unknown): StrukturaKriterii {
  const r = objekt(raw);
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Chybí údaje o bodování.');
  const j = objekt(r.jpz);
  const vv = j.vyssi_vaha === null || j.vyssi_vaha === undefined ? null : objekt(j.vyssi_vaha);
  let vyssi_vaha: StrukturaKriterii['jpz']['vyssi_vaha'] = null;
  if (vv) {
    if (vv.predmet !== 'cjl' && vv.predmet !== 'mat') throw new Error('Vyšší váha: vyberte předmět.');
    const nasobek = cislo(vv.nasobek, { min: 0.1, max: 10, pole: 'Vyšší váha, násobek' });
    if (nasobek === null) throw new Error('Vyšší váha: zadejte násobek, například 1,5.');
    vyssi_vaha = { predmet: vv.predmet, nasobek };
  }
  const jpz = {
    cjl_max: cislo(j.cjl_max, { min: 0, max: 1000, pole: 'Maximum z češtiny' }),
    mat_max: cislo(j.mat_max, { min: 0, max: 1000, pole: 'Maximum z matematiky' }),
    prepoctovy_koeficient_pct: cislo(j.prepoctovy_koeficient_pct, { min: 1, max: 1000, pole: 'Přepočet JPZ' }),
    vyssi_vaha,
  };
  const slozky = pole(r.slozky, 'Další body').map((x, i) => {
    const o = objekt(x);
    const druh = typeof o.druh === 'string' && DRUHY.has(o.druh) ? o.druh as DruhSlozky : null;
    if (!druh) throw new Error(`Další body, řádek ${i + 1}: vyberte druh.`);
    const nazev = text(o.nazev, `Další body, řádek ${i + 1}`);
    return {
      druh,
      nazev,
      max: cislo(o.max, { min: -1000, max: 1000, pole: `Další body, řádek ${i + 1}, maximum` }),
      poznamka: text(o.poznamka, `Další body, řádek ${i + 1}, poznámka`),
    };
  });
  const minima = pole(r.minima, 'Minima').map((x, i) => {
    const o = objekt(x);
    const na_co = typeof o.na_co === 'string' && NA_CO.has(o.na_co) ? o.na_co as NaCoMinimum : null;
    if (!na_co) throw new Error(`Minimum, řádek ${i + 1}: vyberte, čeho se týká.`);
    const jednotka = o.jednotka === 'procenta' ? 'procenta' : 'body';
    const hodnota = cislo(o.hodnota, { min: 0, max: jednotka === 'procenta' ? 100 : 1000, pole: `Minimum, řádek ${i + 1}` });
    const popis = text(o.popis, `Minimum, řádek ${i + 1}, popis`);
    if (hodnota === null && !popis) throw new Error(`Minimum, řádek ${i + 1}: zadejte hodnotu nebo popis.`);
    return { na_co, hodnota, jednotka, popis } as MinimumKriterii;
  });
  const rovnost = pole(r.rovnost, 'Pravidla při rovnosti', 12)
    .map((x, i) => text(x, `Pravidlo při rovnosti ${i + 1}`, 200))
    .filter(Boolean);
  return {
    verze: 1,
    jpz,
    slozky,
    minima,
    rovnost,
    vyslovne_max_celkem: cislo(r.vyslovne_max_celkem, { min: 1, max: 10000, pole: 'Celkové maximum' }),
  };
}

// ---------------------------------------------------------------------------
// Předvyplnění ze strojového přepisu PDF
// ---------------------------------------------------------------------------

/** Záznam z public/kriteria_prijeti_{rok}.json doplněný o kriteria_predvyplneni_{rok}.json. */
export interface PrepisProPredvyplneni {
  zamereni: string;
  slozky: { nazev: string; max: number | null }[];
  jpz_navic: { nazev: string; max: number | null }[];
  minima: string[];
  jpz?: { cjl_max: number | null; mat_max: number | null; prepoctovy_koeficient_pct: number | null } | null;
  rovnost?: string[];
}

const HADANI: [RegExp, DruhSlozky][] = [
  [/chování|chovani|kázeň|důtk/i, 'chovani'],
  [/olympi|soutěž|soutez/i, 'soutez'],
  [/certifik|jazykov[áé] zkouš|cambridge|\bdele\b|\bket\b|\bpet\b|\bfce\b/i, 'certifikat'],
  [/talent|praktick|fyzick|tělesn|sportovn|výtvarn|hudebn/i, 'talentova'],
  [/pohovor|motivač|rozhovor/i, 'pohovor'],
  [/dn[ůy]? otevřen|\bdod\b/i, 'dod'],
  [/školní (přijímací )?zkouš|vlastní zkouš|test školy/i, 'skolni_zkouska'],
  [/průměr|prospěch|vysvědčen|hodnocení (na|z) (vysvědčení|zš)|klasifikac/i, 'prospech'],
  [/známk[ay] z|z předmět|předmět/i, 'predmety'],
  [/bonus|aktivit|doporučen|sourozen|mimoškol/i, 'bonus'],
];

export function hadejDruh(nazev: string): DruhSlozky {
  return HADANI.find(([re]) => re.test(nazev))?.[1] ?? 'jine';
}

/** Struktura předvyplněná z přepisu; škola ji musí zkontrolovat. */
export function strukturaZPrepisu(p: PrepisProPredvyplneni): StrukturaKriterii {
  const koef = p.jpz?.prepoctovy_koeficient_pct ?? null;
  return {
    verze: 1,
    jpz: {
      cjl_max: p.jpz?.cjl_max ?? 50,
      mat_max: p.jpz?.mat_max ?? 50,
      prepoctovy_koeficient_pct: koef && koef !== 100 ? koef : null,
      vyssi_vaha: null,
    },
    slozky: [
      // Přijímačky zapsané jinak než prostým součtem (vážení, přepočet) přepis neumí
      // převést na pole JPZ. Zůstanou jako řádek s neznámým maximem, takže součet ani
      // „jen JPZ“ se nedopočítá, dokud je editor nevyřeší.
      ...p.jpz_navic.map((s) => ({
        druh: 'jine' as const, nazev: `Přijímačky jinak než prostým součtem: ${s.nazev}`.slice(0, MAX_TEXT), max: null,
        poznamka: 'Zadejte vyšší váhu předmětu nebo přepočet u JPZ výše a tento řádek smažte.',
      })),
      ...p.slozky.map((s) => ({ druh: hadejDruh(s.nazev), nazev: s.nazev.slice(0, MAX_TEXT), max: s.max, poznamka: '' })),
    ].slice(0, MAX_RADKU),
    minima: p.minima.slice(0, MAX_RADKU).map((m) => ({ na_co: 'jine', hodnota: null, jednotka: 'body', popis: m.slice(0, MAX_TEXT) })),
    rovnost: (p.rovnost ?? []).slice(0, 12).map((r) => r.slice(0, 200)),
    vyslovne_max_celkem: null,
  };
}

