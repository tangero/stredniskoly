/**
 * Výklad dat na stránce oboru: obtížnost přijetí slovy, stav nabídky, věty podle
 * slovníku pojmů a pořadí v kraji. Čisté funkce bez přístupu k souborům, aby šly
 * testovat. Definice: docs/slovnik-ukazatelu.md, pojmy: docs/slovnik-pojmu.md,
 * rozvržení stránky: docs/vrstvy-stranky-oboru-2027.md.
 */

/** Minimum polí ročníku souhrnu, se kterými výklad pracuje. */
export interface RocnikProVyklad {
  kapacita?: number;
  prihlasky?: number;
  prijati?: number;
  capacity_rejected?: number;
  conditions_not_met?: number;
  higher_priority?: number;
}

export type ZarazeniObtiznosti =
  | 'kapacita_nerozhodovala'
  | 'vetsina_uspela'
  | 'stredne_tezke'
  | 'tezke'
  | 'velmi_tezke';

/** Pod tímto počtem soutěžících uchazečů se obtížnost slovy nezobrazuje (slovník ukazatelů). */
export const MIN_SOUTEZICICH_PRO_ZARAZENI = 10;
/** Pod tímto počtem nabídek ve skupině kraje se pořadí nezobrazuje (slovník ukazatelů, pořadí v kraji). */
export const MIN_NABIDEK_PRO_PORADI = 10;

export const ZARAZENI_POPISEK: Record<ZarazeniObtiznosti, string> = {
  kapacita_nerozhodovala: 'místo pro všechny',
  vetsina_uspela: 'dostala se většina',
  stredne_tezke: 'středně těžké',
  tezke: 'těžké',
  velmi_tezke: 'velmi těžké',
};

export function soutezicichUchazecu(r: RocnikProVyklad): number | null {
  if (typeof r.prijati !== 'number' || typeof r.capacity_rejected !== 'number') return null;
  return r.prijati + r.capacity_rejected;
}

/** Obtížnost přijetí slovy podle podílu přijatých ze soutěžících uchazečů. */
export function zarazeniObtiznosti(r: RocnikProVyklad): ZarazeniObtiznosti | null {
  const soutezici = soutezicichUchazecu(r);
  if (soutezici === null) return null;
  if (r.capacity_rejected === 0) return 'kapacita_nerozhodovala';
  if (soutezici < MIN_SOUTEZICICH_PRO_ZARAZENI) return null;
  const podil = r.prijati! / soutezici;
  if (podil < 1 / 3) return 'velmi_tezke';
  if (podil < 1 / 2) return 'tezke';
  if (podil < 2 / 3) return 'stredne_tezke';
  return 'vetsina_uspela';
}

const RADOVE = ['', '', 'druhý', 'třetí', 'čtvrtý', 'pátý', 'šestý', 'sedmý', 'osmý', 'devátý', 'desátý'];

/** Podíl přijatých slovy: „zhruba každý čtvrtý“, „zhruba dva ze tří“. */
export function slovniPodil(prijati: number, celkem: number): string {
  if (celkem <= 0) return '';
  const q = prijati / celkem;
  if (q >= 0.9) return 'skoro všichni';
  if (q >= 0.75) return 'zhruba tři ze čtyř';
  if (q >= 0.62) return 'zhruba dva ze tří';
  if (q >= 0.45) return 'zhruba každý druhý';
  if (q < 0.095) return 'méně než každý desátý';
  return `zhruba každý ${RADOVE[Math.round(1 / q)]}`;
}

const JEDNOTKY = ['nula', 'jeden', 'dva', 'tři', 'čtyři', 'pět', 'šest', 'sedm', 'osm', 'devět'];
const NACTE = ['deset', 'jedenáct', 'dvanáct', 'třináct', 'čtrnáct', 'patnáct', 'šestnáct', 'sedmnáct', 'osmnáct', 'devatenáct'];
const DESITKY = ['', '', 'dvacet', 'třicet', 'čtyřicet', 'padesát', 'šedesát', 'sedmdesát', 'osmdesát', 'devadesát'];
const STOVKY = ['', 'sto', 'dvě stě', 'tři sta', 'čtyři sta', 'pět set', 'šest set', 'sedm set', 'osm set', 'devět set'];

/** První vyslovené slovo celého nezáporného čísla. */
function prvniSlovo(n: number): string {
  if (n >= 1000) {
    const tisice = Math.floor(n / 1000);
    return tisice === 1 ? 'tisíc' : prvniSlovo(tisice);
  }
  if (n >= 100) return STOVKY[Math.floor(n / 100)];
  if (n >= 20) return DESITKY[Math.floor(n / 10)];
  if (n >= 10) return NACTE[n - 10];
  return JEDNOTKY[n];
}

/**
 * Předložka před číslovkou podle výslovnosti: „ze“ před s, z, š, ž a před skupinami dv, tř, čt
 * („ze 112“, „ze 44“, „ze 67“, „ze 2“), jinak „z“ („z 30“, „z 55“, „z 1 000“).
 */
export function zOd(n: number): 'z' | 'ze' {
  const cele = Math.abs(Math.round(n));
  return /^(s|z|š|ž|dv|tř|čt)/.test(prvniSlovo(cele)) ? 'ze' : 'z';
}

export function cislo(n: number, desetin = 0): string {
  return n.toLocaleString('cs-CZ', { minimumFractionDigits: desetin, maximumFractionDigits: desetin });
}

export type StavNabidky = 'nevesli_se' | 'naplneno' | 'nenaplneno';

/** Co se v 1. kole stalo: nevešli se kvůli kapacitě, naplněno bez odmítnutých, nenaplněno. */
export function stavNabidky(r: RocnikProVyklad): StavNabidky {
  if ((r.capacity_rejected ?? 0) > 0) return 'nevesli_se';
  return (r.prijati ?? 0) >= (r.kapacita ?? 0) ? 'naplneno' : 'nenaplneno';
}

/** Počet nedosáhnuvších požadavku školy se uvádí, když dosáhne počtu přijatých nebo 20 % přihlášek. */
export function zminitPozadavek(r: RocnikProVyklad): boolean {
  const n = r.conditions_not_met ?? 0;
  if (n === 0) return false;
  return n >= (r.prijati ?? 0) || (!!r.prihlasky && n / r.prihlasky >= 0.2);
}

export interface OdvozenaHranice {
  typ: 'soucet' | 'slabsi_test' | 'nevysvetleno_vysledkem_jpz';
  nejvyse_nesplneny?: number;
  nejnize_soutezici?: number;
}

/** Věta o požadavku školy podle odvozené hranice úspěšnosti. */
export function vetaPozadavku(hranice: OdvozenaHranice | null | undefined): string {
  if (!hranice || hranice.typ === 'nevysvetleno_vysledkem_jpz' || hranice.nejnize_soutezici === undefined || hranice.nejvyse_nesplneny === undefined) {
    return 'nedosáhli požadavku školy, například minima bodů, výsledku školní zkoušky nebo jiného požadavku z kritérií';
  }
  const kde = hranice.typ === 'slabsi_test' ? 'v každém testu' : 'celkem';
  const minimum = hranice.nejnize_soutezici - hranice.nejvyse_nesplneny <= 1
    ? `${cislo(hranice.nejnize_soutezici)} bodů ${kde}`
    : `${cislo(hranice.nejvyse_nesplneny + 1)} až ${cislo(hranice.nejnize_soutezici)} bodů ${kde}`;
  return `nedosáhli požadavku školy; podle výsledků to odpovídá minimu ${minimum}`;
}

export interface Poradi {
  /** Nejlepší místo, které nabídka sdílí. */
  od: number;
  /** Nejhorší místo při shodě hodnot; rovná se `od`, když shoda není. */
  do: number;
  z: number;
}

/** Pořadí hodnoty mezi hodnotami skupiny, vyšší hodnota = lepší místo; null pod prahem skupiny. */
export function poradiVeSkupine(hodnota: number, hodnotySkupiny: number[]): Poradi | null {
  if (hodnotySkupiny.length < MIN_NABIDEK_PRO_PORADI) return null;
  const vyssi = hodnotySkupiny.filter(v => v > hodnota).length;
  const shodne = hodnotySkupiny.filter(v => v === hodnota).length;
  return { od: vyssi + 1, do: vyssi + Math.max(shodne, 1), z: hodnotySkupiny.length };
}

export function textPoradi(p: Poradi): string {
  return p.od === p.do ? `${p.od}.` : `${p.od}.–${p.do}.`;
}

/** Slovní označení srovnatelné skupiny v 2. pádě množného čísla: „osmiletých gymnázií“. */
export function nazevSkupiny(skupina: string): string {
  const [typ, delka] = skupina.split('_');
  const let_ = { '2': 'dvouletých', '3': 'tříletých', '4': 'čtyřletých', '5': 'pětiletých', '6': 'šestiletých', '8': 'osmiletých' }[delka] ?? '';
  const nazvy: Record<string, string> = {
    GY4: 'čtyřletých gymnázií', GY6: 'šestiletých gymnázií', GY8: 'osmiletých gymnázií',
    LYC: `${let_} lyceí`, SOS: `${let_} oborů středních odborných škol`, SOU: `${let_} maturitních oborů středních odborných učilišť`,
    NAS: `${let_} nástaveb`,
  };
  return (nazvy[typ] ?? `${let_} oborů stejného typu`).trim();
}

/** Kraj v 6. pádě s předložkou: „ve Středočeském kraji“, „v Praze“, „v Kraji Vysočina“. */
export function vKraji(krajNazev: string): string {
  if (krajNazev === 'Hlavní město Praha' || krajNazev === 'Praha') return 'v Praze';
  if (krajNazev === 'Kraj Vysočina') return 'v Kraji Vysočina';
  const lokal = krajNazev.replace(/ký$/, 'kém');
  return `${/^(S|Z)[^aeiouyáéíóúůý]/i.test(lokal) ? 've' : 'v'} ${lokal} kraji`;
}
