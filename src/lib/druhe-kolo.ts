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
export function klicDruhehoKola(redizo: string, kkov: string, zamereni?: string): string {
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
  const k = klicDruhehoKola(redizo, kkov, zamereni);
  const zaznam = data.roky[obdobi]?.[k];
  if (!zaznam) return null;
  const rok = Number(obdobi);
  return { rok, zaznam, predchozi: data.roky[String(rok - 1)]?.[k] ?? null };
}

/** Nabídka, která v zobrazeném ročníku měla 2. kolo. */
export interface VypsaneDruheKolo {
  /** Klíč `REDIZO_KKOV` nebo `REDIZO_KKOV_zaměření`, stejný jako v souboru. */
  klic: string;
  redizo: string;
  kkov: string;
  kapacita: number;
  prijati: number;
}

/**
 * Nabídky daných škol, které v zobrazeném ročníku vypsaly 2. kolo.
 *
 * Pro přehledy nad více školami; jednotlivá nabídka se ptá přes `getDruheKolo`.
 * Vrací **jen vypsané 2. kolo** — stavy `nenaplneno_bez_2_kola` a `bez_2_kola`
 * říkají, že se nekonalo, a na přehledu města nemají co dodat.
 *
 * Je to **historie zobrazeného ročníku, ne nabídka na příští rok**: že škola
 * 2. kolo vypsala v jednom roce, o dalším neříká nic.
 */
export async function druheKoloPodleRedizo(
  redizoMnozina: Set<string>,
): Promise<Map<string, VypsaneDruheKolo[]>> {
  const out = new Map<string, VypsaneDruheKolo[]>();
  const obdobi = await zobrazeneObdobi(SADA);
  if (!obdobi) return out;
  const data = await nacti();
  for (const [k, zaznam] of Object.entries(data.roky[obdobi] ?? {})) {
    if (zaznam.stav !== 'vypsano') continue;
    const redizo = k.split('_')[0];
    if (!redizoMnozina.has(redizo)) continue;
    const seznam = out.get(redizo) ?? [];
    seznam.push({
      klic: k,
      redizo,
      kkov: k.split('_')[1] ?? '',
      kapacita: zaznam.kapacita,
      prijati: zaznam.prijati,
    });
    out.set(redizo, seznam);
  }
  return out;
}

/** Rok, za který se 2. kolo zobrazuje; z registru, nikdy z letopočtu v kódu. */
export async function rokDruhehoKola(): Promise<number | null> {
  const obdobi = await zobrazeneObdobi(SADA);
  return obdobi ? Number(obdobi) : null;
}
