import { promises as fs } from 'fs';
import path from 'path';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import type { PrevodTestu, TerminPrevodu } from '@/lib/prevod-testu-vypocet';

export type { PrevodTestu, TerminPrevodu };

// ============================================================================
// Převod výsledku cvičného testu TAU na body roku zobrazených pásem
// (slovník ukazatelů, *Převedený výsledek testu*). Tabulky počítá
// scripts/build-prevod-testu.py z položkových dat JPZ; rok testů určuje
// sada `cermat-prevod-testu` v registru.
// ============================================================================

export async function nactiPrevodTestu(): Promise<PrevodTestu | null> {
  const obdobi = await zobrazeneObdobi('cermat-prevod-testu');
  if (!obdobi) return null;
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
