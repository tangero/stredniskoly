import { promises as fs } from 'fs';
import path from 'path';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';

/** Jedno bodové pásmo a podíl přijatých v něm. */
export interface PasmoPrijeti {
  od: number;
  do: number;
  prijato: number;
  soutezilo: number;
}

/**
 * Údaje o tom, jak dopadli uchazeči o obor v 1. kole zobrazeného roku.
 *
 * Zdroj jsou data CERMATu o jednotlivých uchazečích. Klíčem je REDIZO a KKOV
 * bez zaměření, takže nabídky lišící se jen zaměřením sdílejí jeden záznam.
 * Obsahuje jen obory s povinnou jednotnou zkouškou. Rok určuje registr
 * stavu datových sad u sady `cermat-uchazeci-kolo1`, ne kód.
 */
export interface PasmaPrijetiObor {
  soutezicich: number;
  prijatych: number;
  neveslo_se: number;
  /** Nepřijati sem, protože byli přijati na obor uvedený na přihlášce výš. */
  prijato_na_vyssi_prioritu: number;
  nesplnilo_podminky: number;
  /** Nejnižší výsledek mezi přijatými, škála 0–100. */
  min_prijaty: number;
  /** Tentýž výsledek jako celostátní percentil; nezávislý na obtížnosti testu. */
  min_prijaty_percentil: number;
  /** Nejvyšší výsledek mezi těmi, kdo se nevešli kvůli kapacitě. */
  max_neprijaty?: number;
  /** Meze rozmezí, ve kterém rozhodovala i jiná kritéria než test. */
  pasmo_nejistoty?: [number, number];
  /** Přesný počet soutěžících s výsledkem uvnitř pásma nejistoty. */
  pasmo_nejistoty_soutezilo?: number;
  /** Z toho přijatých. */
  pasmo_nejistoty_prijato?: number;
  /** Shoda pořadí podle testu s výsledkem přijímání, plocha pod ROC křivkou. */
  rozhodl_test?: number;
  hustota_u_hranice?: number;
  /** Záznam sdílí víc zaměření v katalogu nebo víc nabídek v aktuálním roce; údaje platí za obor jako celek. */
  vice_zamereni: boolean;
  talentova_zkouska: boolean;
  /**
   * Prostřední výsledek mezi přijatými, jen při aspoň deseti přijatých.
   * U šikmého rozdělení leží pod průměrem, který pár výborných výsledků táhne nahoru.
   */
  median_prijatych?: number;
  /** Nikdo nebyl odmítnut kvůli kapacitě. Neznamená, že se dostali všichni. */
  nikdo_neodmitnut_pro_kapacitu?: boolean;
  pasma?: PasmoPrijeti[];
}

/** Pod tímto počtem přijatých je nejnižší výsledek údaj o jednotlivci, ne o oboru (slovník ukazatelů). */
export const MIN_PRIJATYCH_PRO_HRANICI = 10;

const SADA = 'cermat-uchazeci-kolo1';
const cache = new Map<string, Record<string, PasmaPrijetiObor>>();
/** Celostátní medián uchazečů podle roku; bez něj se body dvou ročníků nedají srovnat. */
const cacheMedian = new Map<string, number | null>();

/** Rok dat o uchazečích, ze kterého se pásma zobrazují; null, když sada nic nezobrazuje. */
export async function rokPasemPrijeti(): Promise<number | null> {
  const obdobi = await zobrazeneObdobi(SADA);
  return obdobi ? Number(obdobi) : null;
}

async function nacti(rok: number): Promise<Record<string, PasmaPrijetiObor>> {
  const klic = String(rok);
  const ulozeno = cache.get(klic);
  if (ulozeno) return ulozeno;
  let data: Record<string, PasmaPrijetiObor> = {};
  let median: number | null = null;
  try {
    // Výstup nese rok v názvu (pasma_prijeti_2026.json); přepíná se s obdobím v registru.
    const soubor = path.join(process.cwd(), 'public', `pasma_prijeti_${klic}.json`);
    const obsah = JSON.parse(await fs.readFile(soubor, 'utf-8'));
    data = obsah.data ?? {};
    median = typeof obsah.celostatni_median_uchazecu === 'number' ? obsah.celostatni_median_uchazecu : null;
  } catch {
    // chybějící soubor není chyba, sekce se prostě nezobrazí
  }
  cache.set(klic, data);
  cacheMedian.set(klic, median);
  return data;
}

/**
 * Kolik bodů měl prostřední uchazeč v celé zemi v daném roce.
 *
 * Bez tohoto čísla se bodové výsledky dvou ročníků nesmí postavit vedle sebe:
 * posun mezi roky dělá obtížnost testu, ne nároky škol. Mezi 2025 a 2026 se
 * celostátní medián zvedl ze 46 na 49 bodů, zatímco percentil téhož uchazeče
 * se nezměnil (slovník ukazatelů, *Percentil nejnižšího přijatého*).
 */
export async function celostatniMedianUchazecu(rok: number): Promise<number | null> {
  await nacti(rok);
  return cacheMedian.get(String(rok)) ?? null;
}

/** Údaje o oboru za určený rok; pro srovnání se zobrazeným ročníkem. */
export async function getPasmaPrijetiZaRok(programId: string, rok: number): Promise<PasmaPrijetiObor | null> {
  const casti = programId.split('_');
  if (casti.length < 2) return null;
  const data = await nacti(rok);
  return data[`${casti[0]}_${casti[1]}`] ?? null;
}

/**
 * Najde údaje pro nabídku. Identifikátor katalogu má tvar
 * `REDIZO_KKOV` nebo `REDIZO_KKOV_zaměření`; data zaměření nerozlišují,
 * takže se hledá podle prvních dvou částí.
 */
export async function getPasmaPrijeti(programId: string): Promise<PasmaPrijetiObor | null> {
  const casti = programId.split('_');
  if (casti.length < 2) return null;
  const rok = await rokPasemPrijeti();
  if (!rok) return null;
  const data = await nacti(rok);
  return data[`${casti[0]}_${casti[1]}`] ?? null;
}
