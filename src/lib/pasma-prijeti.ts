import { promises as fs } from 'fs';
import path from 'path';

/** Jedno bodové pásmo a podíl přijatých v něm. */
export interface PasmoPrijeti {
  od: number;
  do: number;
  prijato: number;
  soutezilo: number;
}

/**
 * Údaje o tom, jak dopadli uchazeči o obor v 1. kole 2025.
 *
 * Zdroj jsou data CERMATu o jednotlivých uchazečích. Klíčem je REDIZO a KKOV
 * bez zaměření, takže nabídky lišící se jen zaměřením sdílejí jeden záznam.
 * Obsahuje jen obory s povinnou jednotnou zkouškou.
 */
export interface PasmaPrijetiObor {
  soutezicich: number;
  prijatych: number;
  neveslo_se: number;
  nastoupilo_jinam: number;
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
  /** Několik zaměření sdílí jeden záznam, údaje platí za obor jako celek. */
  vice_zamereni: boolean;
  talentova_zkouska: boolean;
  /** Nikdo nebyl odmítnut kvůli kapacitě. Neznamená, že se dostali všichni. */
  nikdo_neodmitnut_pro_kapacitu?: boolean;
  pasma?: PasmoPrijeti[];
}

let cache: Record<string, PasmaPrijetiObor> | null = null;

async function nacti(): Promise<Record<string, PasmaPrijetiObor>> {
  if (cache) return cache;
  try {
    const soubor = path.join(process.cwd(), 'public', 'pasma_prijeti_2025.json');
    const obsah = JSON.parse(await fs.readFile(soubor, 'utf-8'));
    cache = obsah.data ?? {};
  } catch {
    cache = {}; // chybějící soubor není chyba, sekce se prostě nezobrazí
  }
  return cache!;
}

/**
 * Najde údaje pro nabídku. Identifikátor katalogu má tvar
 * `REDIZO_KKOV` nebo `REDIZO_KKOV_zaměření`; data zaměření nerozlišují,
 * takže se hledá podle prvních dvou částí.
 */
export async function getPasmaPrijeti(programId: string): Promise<PasmaPrijetiObor | null> {
  const casti = programId.split('_');
  if (casti.length < 2) return null;
  const data = await nacti();
  return data[`${casti[0]}_${casti[1]}`] ?? null;
}
