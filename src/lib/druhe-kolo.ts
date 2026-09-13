import { promises as fs } from 'fs';
import path from 'path';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';

/** Stav nabídky ve 2. kole; výklad v docs/druhe-kolo.md a ve slovníku ukazatelů. */
export type ZaznamDruhehoKola =
  | {
      stav: 'vypsano';
      kapacita: number;
      prihlasky: number;
      prijati: number;
      neveslo_se: number;
      nesplnilo_podminky: number;
      prijato_na_vyssi_prioritu: number;
      prijatych_s_vysledkem: number;
      /** Jen při aspoň deseti přijatých s výsledkem zkoušky. */
      min_prijaty?: number;
    }
  | { stav: 'nenaplneno_bez_2_kola'; kolo1_kapacita: number; kolo1_prijati: number }
  | { stav: 'bez_2_kola' };

export interface DruheKoloNabidky {
  rok: number;
  zaznam: ZaznamDruhehoKola;
  /** Stejná nabídka v předchozím roce, pokud je v datech. */
  predchozi: ZaznamDruhehoKola | null;
}

const SADA = 'cermat-kolo2-agregaty';
let cache: { roky: Record<string, Record<string, ZaznamDruhehoKola>> } | null = null;

async function nacti() {
  if (cache) return cache;
  try {
    const soubor = path.join(process.cwd(), 'public', 'druhe_kolo.json');
    cache = JSON.parse(await fs.readFile(soubor, 'utf-8'));
  } catch {
    cache = { roky: {} };
  }
  return cache!;
}

/** Stejná normalizace zaměření jako normalizeSchoolKey a scripts/build-druhe-kolo.py. */
function klic(redizo: string, kkov: string, zamereni?: string): string {
  const z = (zamereni ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
  return z ? `${redizo}_${kkov}_${z}` : `${redizo}_${kkov}`;
}

/**
 * Údaje o 2. kole pro nabídku. Rok bere z registru stavu datových sad,
 * nikdy z letopočtu v kódu.
 */
export async function getDruheKolo(programId: string, zamereni?: string): Promise<DruheKoloNabidky | null> {
  const obdobi = await zobrazeneObdobi(SADA);
  if (!obdobi) return null;
  const [redizo, kkov] = programId.split('_');
  if (!redizo || !kkov) return null;
  const data = await nacti();
  const k = klic(redizo, kkov, zamereni);
  const zaznam = data.roky[obdobi]?.[k];
  if (!zaznam) return null;
  const rok = Number(obdobi);
  return { rok, zaznam, predchozi: data.roky[String(rok - 1)]?.[k] ?? null };
}
