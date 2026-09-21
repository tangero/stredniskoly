import { promises as fs } from 'fs';
import path from 'path';

/**
 * Podklady pro manažerské shrnutí na /o-projektu.
 *
 * Dvě skupiny čísel a každá se drží jinak:
 *
 *  1. **Čtená z dat.** Počty škol, nabídek, ročníků a pokrytí zdrojů se čtou
 *     ze souborů, které web stejně používá. Nesmí se psát napevno, protože by
 *     se rozešly se skutečností při prvním přepnutí ročníku (docs/zdroje-dat.md,
 *     oddíl 5, a `scripts/kontrola-letopoctu.py`).
 *  2. **Měřená jednou a datovaná.** Rozsah kódu a dokumentace se v nasazení
 *     spočítat nedá, repozitář tam není. Jsou to konstanty s datem měření
 *     a postupem, jak měření zopakovat. Zastarají pomalu a je na nich vidět, že
 *     jsou k datu.
 *
 * Odhad ceny vývoje je v ODHAD_VYVOJE. Není to měření, je to model, a jeho
 * předpoklady stojí na stránce vypsané, aby šly oponovat.
 */

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const DATA_DIR = path.join(process.cwd(), 'data');

async function readJson<T>(...segmenty: string[]): Promise<T> {
  return JSON.parse(await fs.readFile(path.join(...segmenty), 'utf-8')) as T;
}

/**
 * Počet položek v kolekci, která je podle zdroje buď pole, nebo slovník
 * klíčovaný identifikátorem školy. Oba tvary se v datech projektu vyskytují
 * a `.length` nad slovníkem tiše vrací undefined, ze kterého se na stránce
 * stane „NaN“. Proto se to počítá takhle a ne přímo.
 */
function pocet(kolekce: unknown): number {
  if (Array.isArray(kolekce)) return kolekce.length;
  if (kolekce && typeof kolekce === 'object') return Object.keys(kolekce).length;
  return 0;
}

// ---------------------------------------------------------------------------
// 1. Datové sady z registru
// ---------------------------------------------------------------------------

export type Pouziti = 'web' | 'analyza' | 'planovano' | 'nepouzito' | 'nezobrazovat';

export interface SadaProPrehled {
  klic: string;
  nazev: string;
  pouziti: Pouziti;
  cyklus: string;
  automatizace: string;
  obdobi: string | null;
  pocetUkazatelu: number;
  vystupy: string[];
}

interface RegistrSady {
  nazev?: string;
  pouziti?: Pouziti;
  cyklus?: string;
  zobrazeno?: { obdobi?: string | null };
  ukazatele?: string[];
  vystupy?: string[];
  aktualizace?: { automatizace?: string };
}

interface Registr {
  aktualizovano?: string;
  sady?: Record<string, RegistrSady>;
  ukazatele_z_vice_sad?: unknown[];
  ukazatele_mimo_registr?: unknown[];
}

export interface PrehledSad {
  aktualizovano: string | null;
  sady: SadaProPrehled[];
  /** Kolik sad web opravdu zobrazuje. Zbytek slouží analýze nebo leží ladem. */
  pocetNaWebu: number;
}

export async function prehledDatovychSad(): Promise<PrehledSad> {
  const registr = await readJson<Registr>(PUBLIC_DIR, 'stav_datovych_sad.json');
  const sady: SadaProPrehled[] = Object.entries(registr.sady ?? {}).map(([klic, s]) => ({
    klic,
    nazev: s.nazev ?? klic,
    pouziti: s.pouziti ?? 'nepouzito',
    cyklus: s.cyklus ?? 'neznámý',
    automatizace: s.aktualizace?.automatizace ?? 'zadna',
    obdobi: s.zobrazeno?.obdobi ?? null,
    pocetUkazatelu: (s.ukazatele ?? []).length,
    vystupy: s.vystupy ?? [],
  }));
  return {
    aktualizovano: registr.aktualizovano ?? null,
    sady,
    pocetNaWebu: sady.filter((s) => s.pouziti === 'web').length,
  };
}

// ---------------------------------------------------------------------------
// 2. Pokrytí, čtené z dat
// ---------------------------------------------------------------------------

export interface Pokryti {
  /** Nabídek (škola + obor + zaměření) v zobrazeném ročníku katalogu. */
  nabidek: number;
  /** Škol, které v zobrazeném ročníku něco nabízejí. */
  skol: number;
  kraju: number;
  /** Ročníky katalogu přijímacího řízení a počet nabídek v každém. */
  rocnikyKatalogu: { rok: string; nabidek: number }[];
  /** Škol v seznamu České školní inspekce, tedy všech stupňů, ne jen středních. */
  skolVSeznamuCSI: number;
  /** Inspekčních zpráv rozebraných do strojově čitelné podoby. */
  extrahovanychZprav: number;
  /** Profilů škol z portálu INSPIS. */
  profiluInspis: number;
  /** Středních škol, u kterých sklízíme novinky z jejich vlastního webu. */
  skolSFeedem: number;
}

export async function pokryti(): Promise<Pokryti> {
  const [souhrny, katalog, csi, inspis, extrakce, feedy] = await Promise.all([
    readJson<{ nabidky: Record<string, { redizo: string; kraj_nazev?: string }> }>(
      PUBLIC_DIR, 'souhrny_kolo1.json',
    ),
    readJson<Record<string, unknown[]>>(PUBLIC_DIR, 'schools_data.json'),
    readJson<Record<string, unknown>>(PUBLIC_DIR, 'csi_inspections.json'),
    readJson<{ schools?: unknown }>(DATA_DIR, 'inspis_school_profiles.json'),
    readJson<{ schools?: unknown }>(DATA_DIR, 'inspection_extractions.json'),
    readJson<{ skoly?: unknown }>(PUBLIC_DIR, 'skoly_feedy.json'),
  ]);

  const nabidky = Object.values(souhrny.nabidky ?? {});
  return {
    nabidek: nabidky.length,
    skol: new Set(nabidky.map((n) => n.redizo)).size,
    kraju: new Set(nabidky.map((n) => n.kraj_nazev).filter(Boolean)).size,
    rocnikyKatalogu: Object.entries(katalog)
      .filter(([rok]) => /^\d{4}$/.test(rok))
      .map(([rok, obory]) => ({ rok, nabidek: Array.isArray(obory) ? obory.length : 0 }))
      .sort((a, b) => a.rok.localeCompare(b.rok)),
    skolVSeznamuCSI: Object.keys(csi).length,
    extrahovanychZprav: pocet(extrakce.schools),
    profiluInspis: pocet(inspis.schools),
    skolSFeedem: pocet(feedy.skoly),
  };
}

// ---------------------------------------------------------------------------
// 3. Časová osa, odvozená z veřejného changelogu
// ---------------------------------------------------------------------------

export interface MesicVyvoje {
  /** Klíč ve tvaru RRRR-MM, použitelný k řazení. */
  klic: string;
  /** Popisný tvar, například „únor 2026“. */
  popis: string;
  vydani: number;
  /** Názvy vydání, která přinesla novou funkci, tedy verze končící „.0“. */
  hlavni: string[];
}

const MESICE = [
  'leden', 'únor', 'březen', 'duben', 'květen', 'červen',
  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec',
];

/**
 * Rozloží datum changelogu ve tvaru „19. 9. 2026“ na rok a měsíc.
 * Vrací null u tvaru, kterému nerozumí, aby jediný překlep nezhodil stránku.
 */
function rozlozDatum(datum: string): { rok: number; mesic: number } | null {
  const m = datum.match(/^\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\s*$/);
  if (!m) return null;
  const mesic = Number(m[2]);
  const rok = Number(m[3]);
  if (mesic < 1 || mesic > 12) return null;
  return { rok, mesic };
}

/**
 * Časová osa vývoje po měsících.
 *
 * Bere veřejný changelog, ne git. Commity vypovídají o tom, jak se pracovalo,
 * vydání o tom, co z toho lidé dostali; pro manažerské shrnutí je užitečné
 * druhé. Osa se sama doplní s každým dalším vydáním.
 */
export function casovaOsa(
  zaznamy: { version: string; date: string; title: string }[],
): MesicVyvoje[] {
  const podleMesice = new Map<string, MesicVyvoje>();

  for (const z of zaznamy) {
    const d = rozlozDatum(z.date);
    if (!d) continue;
    const klic = `${d.rok}-${String(d.mesic).padStart(2, '0')}`;
    let mesic = podleMesice.get(klic);
    if (!mesic) {
      mesic = { klic, popis: `${MESICE[d.mesic - 1]} ${d.rok}`, vydani: 0, hlavni: [] };
      podleMesice.set(klic, mesic);
    }
    mesic.vydani += 1;
    if (z.version.endsWith('.0')) mesic.hlavni.push(z.title);
  }

  // Changelog jde od nejnovějšího; osa má číst odshora dolů v čase.
  for (const mesic of podleMesice.values()) mesic.hlavni.reverse();
  return [...podleMesice.values()].sort((a, b) => a.klic.localeCompare(b.klic));
}

/**
 * Kolik měsíců uplynulo mezi prvním a posledním vydáním.
 *
 * Počítá se z rozsahu osy, ne z počtu jejích položek: měsíce bez vydání
 * (červenec a srpen 2026) v ose nejsou, ale do doby vývoje patří.
 */
export function mesicuVyvoje(osa: MesicVyvoje[]): number {
  if (osa.length === 0) return 0;
  const [r1, m1] = osa[0].klic.split('-').map(Number);
  const [r2, m2] = osa[osa.length - 1].klic.split('-').map(Number);
  return (r2 - r1) * 12 + (m2 - m1) + 1;
}
