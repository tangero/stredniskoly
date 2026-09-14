import { promises as fs } from 'fs';
import path from 'path';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import type { OdvozenaHranice } from '@/lib/obor-profil';

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

const SADA = 'cermat-uchazeci-kolo1';
const cache = new Map<string, Record<string, KontextPrihlasek>>();

export async function rokKontextu(): Promise<number | null> {
  const obdobi = await zobrazeneObdobi(SADA);
  return obdobi ? Number(obdobi) : null;
}

export async function getKontextPrihlasek(programId: string): Promise<{ rok: number; kontext: KontextPrihlasek } | null> {
  const rok = await rokKontextu();
  if (!rok) return null;
  const klic = String(rok);
  if (!cache.has(klic)) {
    let data: Record<string, KontextPrihlasek> = {};
    try {
      data = JSON.parse(await fs.readFile(path.join(process.cwd(), 'public', `kontext_prihlasek_${klic}.json`), 'utf-8')).data ?? {};
    } catch {
      // chybějící soubor není chyba, oddíl se nezobrazí
    }
    cache.set(klic, data);
  }
  const [redizo, kkov] = programId.split('_');
  const kontext = cache.get(klic)![`${redizo}_${kkov}`];
  return kontext ? { rok, kontext } : null;
}
