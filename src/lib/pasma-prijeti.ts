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
  /** Nikdo nebyl odmítnut kvůli kapacitě. Neznamená, že se dostali všichni. */
  nikdo_neodmitnut_pro_kapacitu?: boolean;
  pasma?: PasmoPrijeti[];
}

/** Pod tímto počtem přijatých je nejnižší výsledek údaj o jednotlivci, ne o oboru (slovník ukazatelů). */
export const MIN_PRIJATYCH_PRO_HRANICI = 10;

const SADA = 'cermat-uchazeci-kolo1';
const cache = new Map<string, Record<string, PasmaPrijetiObor>>();

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
  try {
    // Výstup nese rok v názvu (pasma_prijeti_2026.json); přepíná se s obdobím v registru.
    const soubor = path.join(process.cwd(), 'public', `pasma_prijeti_${klic}.json`);
    data = JSON.parse(await fs.readFile(soubor, 'utf-8')).data ?? {};
  } catch {
    // chybějící soubor není chyba, sekce se prostě nezobrazí
  }
  cache.set(klic, data);
  return data;
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
