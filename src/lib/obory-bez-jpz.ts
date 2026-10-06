import { promises as fs } from 'fs';
import path from 'path';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import { MIN_SOUTEZICICH_PRO_ZARAZENI, type ZarazeniObtiznosti } from '@/lib/obor-profil';

/**
 * Nabídky bez jednotné přijímací zkoušky (issue #244, etapa 3a; docs/navrh-obory-bez-jpz-2027.md).
 *
 * Zdroj je `src/data/obory-bez-jpz-2026.json` z `scripts/build-obory-bez-jpz.py` (etapa 1): denní
 * nezkrácené nabídky učebních oborů (H), oborů E, C, J, uměleckých M a L a konzervatoří (P), nedenní
 * nástavby jako „kam dál“ a domovy mládeže. Ukazatele počítá Python stejně jako souhrny 1. kola;
 * tady se jen vybírají a uplatňují se pravidla zobrazení.
 *
 * Nabídky čtou stránka školy a stránka oboru (etapa 3a), od etapy 3b i u škol, které katalog nevede:
 * jejich identitu nese pole `skoly`. Stránka města, kraje a vyhledávání je dostanou v etapě 3c.
 */

export type KategorieBezJpz = 'H' | 'E' | 'C' | 'J' | 'M' | 'L' | 'P';

export interface NabidkaBezJpz {
  id: string;
  id_sof: string;
  redizo: string;
  kkov: string;
  kategorie: KategorieBezJpz;
  obor: string;
  zamereni: string;
  forma: string;
  delka: number | null;
  typ_skoly: string;
  kraj: string;
  obec: string;
  pokracovani: boolean;
  kapacita: number | null;
  prihlasky: number | null;
  prijati: number | null;
  zbyla_mista: number | null;
  prihlasky_priorita: (number | null)[];
  prijati_priorita: (number | null)[];
  nepr_vyssi_priorita: number | null;
  nepr_kapacita: number | null;
  nepr_podminky: number | null;
  nepr_vzdal_se: number | null;
  tlak_prvnich_voleb: number | null;
  podil_prvnich_voleb: number | null;
  index_poptavky: number | null;
  podil_prijatych_ze_soutezicich: number | null;
  zarazeni_obtiznosti: ZarazeniObtiznosti | null;
  rok_2025: null | {
    kapacita: number | null; prihlasky: number | null; prijati: number | null;
    prihlasky_priorita: (number | null)[]; podil_prvnich_voleb: number | null; jistota: string; shoda: string;
  };
  kolo_2: null | { id_sof: string; kapacita: number | null; prihlasky: number | null; prijati: number | null; zbyla_mista: number | null };
}

export interface DomovMladeze { druh: string; izo: string; kapacita: number | null; nazev: string; obec: string }

/** Identita školy z rejstříku MŠMT (etapa 3b), ve tvaru polí katalogu; bez osobních údajů. */
export interface SkolaBezJpz {
  nazev: string;
  zkraceny_nazev: string;
  uplny_nazev: string;
  adresa: string;
  ulice: string | null;
  obec: string;
  mestska_cast: string | null;
  okres: string | null;
  kraj_kod: string | null;
  kraj: string;
  zrizovatel: string;
}

interface SouborBezJpz {
  rok: number;
  nabidky: NabidkaBezJpz[];
  nastavby: NabidkaBezJpz[];
  domovy: Record<string, DomovMladeze[]>;
  skoly?: Record<string, SkolaBezJpz>;
}

let cache: Promise<SouborBezJpz | null> | null = null;

/**
 * Soubor se čte, jen když jeho ročník je ten, který web zobrazuje (registr, sada `cermat-prihlasky`).
 * Po přepnutí na nový ročník by jinak stránka ukázala čísla jiného roku než zbytek webu.
 */
async function nacti(): Promise<SouborBezJpz | null> {
  if (!cache) {
    cache = (async () => {
      const [obsah, obdobi] = await Promise.all([
        fs.readFile(path.join(process.cwd(), 'src', 'data', 'obory-bez-jpz-2026.json'), 'utf-8').catch(() => null),
        zobrazeneObdobi('cermat-prihlasky'),
      ]);
      if (!obsah) return null;
      const data = JSON.parse(obsah) as SouborBezJpz;
      return String(data.rok) === obdobi ? data : null;
    })();
  }
  return cache;
}

/** Ročník nabídek bez JPZ, nebo null, když se nezobrazují. */
export async function rokBezJpz(): Promise<number | null> {
  return (await nacti())?.rok ?? null;
}

/** Všechny denní nabídky bez JPZ zobrazeného ročníku (pro vyhledávání). */
export async function vsechnyNabidkyBezJpz(): Promise<NabidkaBezJpz[]> {
  return (await nacti())?.nabidky ?? [];
}

/** Denní nabídky bez JPZ jedné školy (bez nedenních nástaveb). */
export async function nabidkyBezJpzSkoly(redizo: string): Promise<NabidkaBezJpz[]> {
  const data = await nacti();
  return data ? data.nabidky.filter(n => n.redizo === redizo) : [];
}

export async function nabidkaBezJpz(id: string): Promise<NabidkaBezJpz | null> {
  const data = await nacti();
  return data?.nabidky.find(n => n.id === id) ?? null;
}

/**
 * Kam dál po výučním listu (návrh, oddíl 10.6): nástavby L/5x téže školy, denní i nedenní; když
 * škola žádnou nemá, nástavby se stejným oborovým dvojčíslím v kraji. Denní nástavby jsou
 * v katalogu, předává je volající.
 */
export async function nastavbyNedenni(redizo: string, kraj: string, dvojcisli: string): Promise<{ skoly: NabidkaBezJpz[]; kraj: NabidkaBezJpz[] }> {
  const data = await nacti();
  if (!data) return { skoly: [], kraj: [] };
  return {
    skoly: data.nastavby.filter(n => n.redizo === redizo),
    kraj: data.nastavby.filter(n => n.redizo !== redizo && n.kraj === kraj && n.kkov.startsWith(dvojcisli)),
  };
}

/** Identita školy s nabídkami bez JPZ z rejstříku; null, když škola žádnou denní nabídku bez JPZ nemá. */
export async function skolaBezJpz(redizo: string): Promise<SkolaBezJpz | null> {
  const data = await nacti();
  if (!data?.skoly?.[redizo] || !data.nabidky.some(n => n.redizo === redizo)) return null;
  return data.skoly[redizo];
}

/** Školy, které nabízejí jen obory bez JPZ, a proto je katalog nevede (etapa 3b); REDIZO podle `jeVKatalogu`. */
export async function skolyMimoKatalog(jeVKatalogu: (redizo: string) => boolean): Promise<string[]> {
  const data = await nacti();
  if (!data?.skoly) return [];
  return [...new Set(data.nabidky.map(n => n.redizo))].filter(r => !jeVKatalogu(r) && data.skoly![r]).sort();
}

export async function domovyMladeze(redizo: string): Promise<DomovMladeze[]> {
  return (await nacti())?.domovy[redizo] ?? [];
}

/** Obory, u kterých se odznak ani filtr obtížnosti nezobrazují (návrh 10.1, oddíl 16.1). */
export const BEZ_OBTIZNOSTI: ReadonlySet<KategorieBezJpz> = new Set(['C', 'E', 'J', 'P']);

/**
 * Obtížnost přijetí slovy, jak ji smí zobrazit stránka nabídky bez JPZ. Návrh (10.1) ji připouští
 * jen nad prahem 10 soutěžících, **včetně stupně „místo pro všechny“**: pod prahem by i ten
 * vycházel z hrstky uchazečů. U C, E, J a P se nezobrazuje vůbec.
 */
export function obtiznostBezJpz(n: Pick<NabidkaBezJpz, 'kategorie' | 'prijati' | 'nepr_kapacita' | 'zarazeni_obtiznosti'>): ZarazeniObtiznosti | null {
  if (BEZ_OBTIZNOSTI.has(n.kategorie)) return null;
  if (n.prijati === null || n.nepr_kapacita === null) return null;
  if (n.prijati + n.nepr_kapacita < MIN_SOUTEZICICH_PRO_ZARAZENI) return null;
  return n.zarazeni_obtiznosti;
}

/** Pojmenování oboru podle kategorie (slovník pojmů): učební obor, obor E, konzervatoř… */
export function druhOboruBezJpz(kategorie: KategorieBezJpz): string {
  switch (kategorie) {
    case 'H':
    case 'E': return 'učební obor';
    case 'P': return 'konzervatoř';
    case 'C': return 'praktická škola';
    case 'J': return 'obor bez maturity i výučního listu';
    default: return 'umělecký obor s talentovou zkouškou';
  }
}
