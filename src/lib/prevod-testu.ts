import { promises as fs } from 'fs';
import path from 'path';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import type { DruhTestu, PrevodDruhu, PrevodTestu, TerminPrevodu } from '@/lib/prevod-testu-vypocet';

export type { PrevodDruhu, PrevodTestu, TerminPrevodu };

// ============================================================================
// Převod výsledku cvičného testu TAU na body roku zobrazených pásem
// (slovník ukazatelů, *Převedený výsledek testu*). Tabulky počítá
// scripts/build-prevod-testu.py z položkových dat JPZ; rok testů určuje
// sada `cermat-prevod-testu` v registru.
// ============================================================================

// Stránky oborů se generují po tisících; soubor se čte jednou na proces.
const cache = new Map<string, Promise<PrevodTestu | null>>();

export async function nactiPrevodTestu(): Promise<PrevodTestu | null> {
  const obdobi = await zobrazeneObdobi('cermat-prevod-testu');
  if (!obdobi) return null;
  let slib = cache.get(obdobi);
  if (!slib) {
    slib = nacti(obdobi).then((p) => {
      if (!p) cache.delete(obdobi);
      return p;
    });
    cache.set(obdobi, slib);
  }
  return slib;
}

async function nacti(obdobi: string): Promise<PrevodTestu | null> {
  try {
    const soubor = path.join(process.cwd(), 'public', `prevod_testu_${obdobi}.json`);
    const d = JSON.parse(await fs.readFile(soubor, 'utf-8'));
    type Surovy = TerminPrevodu & { celkem: { body_cil: number[] } };
    const druhy: PrevodTestu['druhy'] = {};
    for (const [druh, obsah] of Object.entries(d.druhy as Record<string, { terminy: Surovy[] }>)) {
      // Klientovi jde jen tabulka součtu.
      druhy[druh as keyof typeof druhy] = obsah.terminy.map((t) => ({
        klic: t.klic, nazev: t.nazev, radny: t.radny, resitelu: t.resitelu, spolehlive: t.spolehlive,
        body_cil: t.celkem.body_cil,
      }));
    }
    return { rok_testu: d.rok_testu, rok_cile: d.rok_cile, druhy };
  } catch {
    return null;
  }
}

/** Tabulka jen pro jeden druh testu: stránka oboru nemá klientovi posílat ostatní. */
export async function nactiPrevodDruhu(druh: DruhTestu): Promise<PrevodDruhu | null> {
  const p = await nactiPrevodTestu();
  const terminy = p?.druhy[druh];
  return p && terminy ? { rok_testu: p.rok_testu, rok_cile: p.rok_cile, terminy } : null;
}
