import { promises as fs } from 'fs';
import path from 'path';

/**
 * Obory, které škola podle rejstříku dokončuje se stávajícími žáky a nenabírá
 * do nich; public/dobihajici_obory.json (scripts/build-dobihajici-obory.py).
 *
 * Používá se **jen u nabídky, která v zobrazeném ročníku chybí**. U vypsané
 * nabídky by tvrzení neplatilo: dobíhajících mezi nimi je nula. Párovat je
 * nutné na REDIZO + KKOV + délku studia, protože na hrubém klíči REDIZO + KKOV
 * má join doloženou 100% chybovost (dobíhá jiná forma nebo délka téhož oboru).
 */
let cache: Set<string> | null = null;

async function nacti(): Promise<Set<string>> {
  if (!cache) {
    try {
      const soubor = await fs.readFile(path.join(process.cwd(), 'public', 'dobihajici_obory.json'), 'utf-8');
      cache = new Set<string>(JSON.parse(soubor).obory ?? []);
    } catch {
      cache = new Set<string>();
    }
  }
  return cache;
}

/**
 * Nenabírá se obor podle rejstříku?
 *
 * @param redizo REDIZO školy.
 * @param kkov Kód oboru, například `63-41-M/02`.
 * @param delkaLet Délka studia v letech.
 */
export async function nenabiraSe(redizo: string, kkov: string, delkaLet: number): Promise<boolean> {
  return (await nacti()).has(`${redizo}|${kkov}|${delkaLet}`);
}

/** Období snímku rejstříku, ze kterého příznak pochází, pro uvedení zdroje. */
export async function obdobiSnimku(): Promise<string | null> {
  try {
    const soubor = await fs.readFile(path.join(process.cwd(), 'public', 'dobihajici_obory.json'), 'utf-8');
    return JSON.parse(soubor).meta?.obdobi ?? null;
  } catch {
    return null;
  }
}
