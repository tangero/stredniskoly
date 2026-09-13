import { promises as fs } from 'fs';
import path from 'path';
import { normalizeSchoolKey } from '@/lib/school-key';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';

/**
 * Souhrny 1. kola za obory po ročnících, public/souhrny_kolo1.json.
 *
 * Generuje scripts/build-souhrny-kolo1.py z oficiálních souhrnů CERMATu. Názvy polí
 * odpovídají slovníku ukazatelů; chybějící pole znamená, že zdroj údaj nenese, ne nulu.
 * Zobrazený ročník určuje registr (sada cermat-vysledky), předchozí ročník se ukáže
 * jen u nabídky spárované podle docs/grafy-skoly-a-oboru-2027.md, pravidlo 7.
 */
export interface SouhrnRocniku {
  kapacita?: number;
  prihlasky?: number;
  prihlasky_priority?: (number | null)[];
  prijati?: number;
  prijati_priority?: (number | null)[];
  capacity_rejected?: number;
  conditions_not_met?: number;
  higher_priority?: number;
  withdrawn?: number;
  tlak_prvnich_voleb?: number;
  index_poptavky?: number;
  konali?: number;
  prijatych_s_vysledkem?: number;
  cj_ma_prijati?: number;
  prumerne_umisteni_prijatych?: number;
  prumerne_umisteni_uchazecu?: number;
  min_prijaty_percentil_souhrn?: number;
  /** Jen když se skupina v ročníku liší od skupiny nabídky. */
  skupina?: string;
}

interface SouhrnNabidkySoubor {
  redizo: string;
  kkov: string;
  zamereni: string;
  skupina: string;
  parovani?: Record<string, 'shoda_klice' | 'jedna_ku_jedne'>;
  roky: Record<string, SouhrnRocniku>;
}

interface SouhrnySoubor {
  meta: { rocniky: Record<string, { soubor: string; url: string; nabidek: number }> };
  skupiny: Record<string, Record<string, { n: number; tlak_prvnich_voleb: number[] }>>;
  nabidky: Record<string, SouhrnNabidkySoubor>;
}

export interface SouhrnNabidky {
  /** Zobrazený ročník podle registru. */
  rok: number;
  aktualni: SouhrnRocniku;
  /** Předchozí ročník, jen u spárované nabídky. */
  predchoziRok: number | null;
  predchozi: SouhrnRocniku | null;
  skupina: string;
}

/** Pod tímto počtem nabídek ve skupině se percentil ve skupině nezobrazuje (slovník, oddíl 4). */
export const MIN_NABIDEK_VE_SKUPINE = 30;

let cache: { soubor: SouhrnySoubor; index: Map<string, string> } | null = null;

async function nacti() {
  if (cache) return cache;
  const soubor: SouhrnySoubor = JSON.parse(
    await fs.readFile(path.join(process.cwd(), 'public', 'souhrny_kolo1.json'), 'utf-8'),
  );
  // Klíče katalogu se od klíčů souhrnu mohou lišit diakritikou a interpunkcí zaměření.
  const index = new Map<string, string>();
  const kolize = new Set<string>();
  for (const klic of Object.keys(soubor.nabidky)) {
    const n = normalizeSchoolKey(klic);
    if (index.has(n)) kolize.add(n);
    else index.set(n, klic);
  }
  kolize.forEach(n => index.delete(n));
  cache = { soubor, index };
  return cache;
}

/** Souhrn nabídky pro zobrazený ročník a spárovaný předchozí ročník; null, když nabídka v ročníku není. */
export async function getSouhrnNabidky(programId: string): Promise<SouhrnNabidky | null> {
  const obdobi = await zobrazeneObdobi('cermat-vysledky');
  if (!obdobi) return null;
  const { soubor, index } = await nacti();
  const klic = index.get(normalizeSchoolKey(programId));
  const nabidka = klic ? soubor.nabidky[klic] : undefined;
  const aktualni = nabidka?.roky[obdobi];
  if (!nabidka || !aktualni) return null;
  const rok = Number(obdobi);
  const starsi = Object.keys(nabidka.roky).map(Number).filter(r => r < rok).sort((a, b) => b - a)[0];
  const sparovano = starsi !== undefined && nabidka.parovani?.[`${starsi}-${rok}`] !== undefined;
  return {
    rok,
    aktualni,
    predchoziRok: sparovano ? starsi : null,
    predchozi: sparovano ? nabidka.roky[String(starsi)] : null,
    skupina: aktualni.skupina ?? nabidka.skupina,
  };
}

/**
 * Percentil tlaku prvních voleb ve srovnatelné skupině: podíl nabídek téhož ročníku
 * a skupiny s hodnotou menší nebo rovnou. Null pod MIN_NABIDEK_VE_SKUPINE.
 */
export async function percentilTlakuVeSkupine(rok: number, skupina: string, hodnota: number) {
  const { soubor } = await nacti();
  const s = soubor.skupiny[String(rok)]?.[skupina];
  if (!s || s.n < MIN_NABIDEK_VE_SKUPINE) return null;
  const hodnoty = s.tlak_prvnich_voleb;
  const pod = hodnoty.filter(v => v <= hodnota).length;
  const stred = Math.floor(hodnoty.length / 2);
  const median = hodnoty.length % 2 ? hodnoty[stred] : (hodnoty[stred - 1] + hodnoty[stred]) / 2;
  return { percentil: Math.round((pod / hodnoty.length) * 100), n: s.n, median };
}
