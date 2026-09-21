import { promises as fs } from 'fs';
import path from 'path';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import type { OdvozenaHranice, ZnackaMimoPrehled } from '@/lib/obor-profil';

/**
 * Kontext přihlášek po oborech, public/kontext_prihlasek_{rok}.json
 * (scripts/build-kontext-prihlasek.py). Rok určuje registr, sada cermat-uchazeci-kolo1.
 * Klíč REDIZO_KKOV: zdroj nenese zaměření, údaje platí za obor školy jako celek.
 */
export interface KontextPrihlasek {
  uchazecu: number;
  vysledek_uchazecu: { sem: number; vys: number; niz: number; nikam: number };
  obory_vys: [string, number][];
  obory_niz: [string, number][];
  odvozena_hranice?: OdvozenaHranice;
}

/** Obor výš nebo níž na přihlášce, který přehled nezahrnuje; název z rejstříku škol, může chybět. */
export interface OborMimoPrehled {
  skola: string | null;
  obec: string | null;
  obor: string | null;
  bez_jednotne_zkousky: boolean;
}

interface KontextSoubor {
  data: Record<string, KontextPrihlasek>;
  mimo: Record<string, OborMimoPrehled>;
}

const SADA = 'cermat-uchazeci-kolo1';
const cache = new Map<string, KontextSoubor>();

export async function rokKontextu(): Promise<number | null> {
  const obdobi = await zobrazeneObdobi(SADA);
  return obdobi ? Number(obdobi) : null;
}

async function nactiSoubor(rok: number): Promise<KontextSoubor> {
  const klic = String(rok);
  const hotovy = cache.get(klic);
  if (hotovy) return hotovy;
  let soubor: KontextSoubor = { data: {}, mimo: {} };
  try {
    const json = JSON.parse(await fs.readFile(path.join(process.cwd(), 'public', `kontext_prihlasek_${klic}.json`), 'utf-8'));
    soubor = { data: json.data ?? {}, mimo: json.mimo_prehled ?? {} };
  } catch {
    // chybějící soubor není chyba, oddíl se nezobrazí
  }
  cache.set(klic, soubor);
  return soubor;
}

export async function getKontextPrihlasek(programId: string): Promise<{
  rok: number; kontext: KontextPrihlasek; mimoPrehled: Record<string, OborMimoPrehled>;
} | null> {
  const rok = await rokKontextu();
  if (!rok) return null;
  const [redizo, kkov] = programId.split('_');
  const { data, mimo } = await nactiSoubor(rok);
  const kontext = data[`${redizo}_${kkov}`];
  return kontext ? { rok, kontext, mimoPrehled: mimo } : null;
}

/** Obor ve městě, který hlavní přehled nevede, i s důvodem proč. */
export interface DalsiOborVeMeste {
  /** Klíč `REDIZO_KKOV`; slouží k řazení a jako identifikátor řádku. */
  klic: string;
  redizo: string;
  skola: string;
  obor: string;
  /**
   * `bez_zkousky` — obor bez povinné jednotné zkoušky (učební obory, konzervatoře).
   * `jiny` — jednotnou zkoušku má, ale katalog ho nevede; bývají to umělecké obory
   * s talentovou zkouškou. Důvod je u každé skupiny jiný, proto se nesmí slít.
   */
  duvod: ZnackaMimoPrehled;
}

/** Kategorie oborů, u kterých se jednotná zkouška nekoná; shodné se `scripts/nazvy_oboru.py`. */
const KATEGORIE_BEZ_JPZ = new Set(['C', 'E', 'H', 'J', 'P']);

/** Písmeno kategorie v kódu oboru, například `65-51-H/01` → `H`. */
function kategorieOboru(kkov: string): string {
  return kkov.length > 6 ? kkov[6].toUpperCase() : '';
}

interface IndexRejstriku {
  /** REDIZO → [název školy, obec]. */
  skoly: Record<string, [string, string]>;
  /** KKOV → název oboru. */
  obory: Record<string, string>;
  /** REDIZO → seznam KKOV, které škola v rejstříku má. */
  nabidky: Record<string, string[]>;
}

let indexRejstriku: IndexRejstriku | null = null;

/** Index z rejstříku škol MŠMT; tentýž soubor čte portál (`portal-identifikace.ts`). */
async function nactiIndexRejstriku(): Promise<IndexRejstriku> {
  if (indexRejstriku) return indexRejstriku;
  try {
    const obsah = await fs.readFile(
      path.join(process.cwd(), 'data', 'msmt_rejstrik', 'nazvy-oboru.json'), 'utf-8',
    );
    const json = JSON.parse(obsah);
    indexRejstriku = { skoly: json.skoly ?? {}, obory: json.obory ?? {}, nabidky: json.nabidky ?? {} };
  } catch {
    indexRejstriku = { skoly: {}, obory: {}, nabidky: {} };
  }
  return indexRejstriku;
}

/**
 * Obory ve městě, které hlavní přehled nezahrnuje.
 *
 * Přehled stojí na denním nezkráceném studiu s povinnou jednotnou zkouškou, takže
 * v některých městech vypadne většina nabídky — v Chomutově 55 %, v České Lípě 52 %.
 * Rodina by jinak nevěděla, že se tam dá studovat i něco dalšího.
 *
 * **Podkladem je soupis oborů ročníku** (`data` téhož souboru), ne pole `mimo_prehled`.
 * To vzniká jen z prvních šesti souběžných voleb s aspoň deseti společnými uchazeči,
 * takže je to statistický výběr, ne nabídka města: oddíl by vynechal 704 oborů, které
 * data doloženě nesou, například Konzervatoř Jaroslava Ježka s 36 uchazeči. Platí
 * pravidlo projektu „nikdy neinventarizuj data podle toho, co web zobrazuje“.
 *
 * Vrací se **jen názvy**: u oborů bez jednotné zkoušky žádné výsledky neexistují,
 * takže se u nich nesmí zobrazit obtížnost přijetí ani se počítat do jejího
 * rozložení (`docs/zdroje-dat.md`, oddíl 4, past 4 — chybějící údaj není nula).
 *
 * @param obec název obce, jak ho nese rejstřík
 * @param vKatalogu klíče `REDIZO_KKOV`, které hlavní přehled už vede
 */
export async function dalsiOboryVeMeste(
  obec: string, vKatalogu: Set<string>,
): Promise<DalsiOborVeMeste[]> {
  const rok = await rokKontextu();
  if (!rok) return [];
  const { data } = await nactiSoubor(rok);
  const { skoly, obory } = await nactiIndexRejstriku();

  const out: DalsiOborVeMeste[] = [];
  const videne = new Set<string>();
  for (const klic of Object.keys(data)) {
    if (vKatalogu.has(klic) || videne.has(klic)) continue;
    const [redizo, kkov] = klic.split('_');
    const skola = skoly[redizo];
    if (!skola || skola[1] !== obec) continue;
    const nazevOboru = obory[kkov];
    if (!nazevOboru) continue;
    videne.add(klic);
    out.push({
      klic,
      redizo,
      skola: skola[0],
      obor: nazevOboru,
      duvod: KATEGORIE_BEZ_JPZ.has(kategorieOboru(kkov)) ? 'bez_zkousky' : 'jiny',
    });
  }
  return out.sort((a, b) =>
    a.skola.localeCompare(b.skola, 'cs') || a.obor.localeCompare(b.obor, 'cs'));
}
