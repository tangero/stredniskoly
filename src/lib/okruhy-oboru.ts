import { promises as fs } from 'fs';
import path from 'path';
import { rokKontextu } from '@/lib/kontext-prihlasek';

/**
 * Souběžné přihlášky podle obce pro stránku oboru (issue #277, etapa 2b): kolik uchazečů oboru
 * mělo na přihlášce i jiný obor v dané obci. Soubor public/okruhy_oboru_{rok}.json
 * (scripts/build-okruhy-oboru.py), pole `obory.{REDIZO_KKOV}`; rok určuje registr, sada
 * cermat-uchazeci-kolo1, stejně jako u kontextu přihlášek. Meze zveřejnění a kontrolu
 * dopočitatelnosti už provedl generátor: co v souboru je, smí se ukázat.
 * Ukazatel: *Souběžné přihlášky podle obce* (docs/slovnik-ukazatelu.md).
 */
export interface ObecPrihlasek {
  obec: string;
  /** Podíl uchazečů oboru 0–1; podíly se nesčítají, uchazeč může mít obory ve více obcích. */
  podil: number;
}

export interface SoubezneObce {
  rok: number;
  obce: ObecPrihlasek[];
  /** Kolik obcí generátor nezveřejnil kvůli mezím; stránka to řekne, počet neuvádí. */
  potlaceno: number;
}

interface ZaznamOboru {
  uchazecu?: number;
  obce?: ObecPrihlasek[];
  potlacene_obce?: number;
}

const cache = new Map<number, Record<string, ZaznamOboru>>();

async function nactiObory(rok: number): Promise<Record<string, ZaznamOboru>> {
  const hotovy = cache.get(rok);
  if (hotovy) return hotovy;
  let obory: Record<string, ZaznamOboru> = {};
  try {
    const json = JSON.parse(await fs.readFile(path.join(process.cwd(), 'public', `okruhy_oboru_${rok}.json`), 'utf-8'));
    obory = json.obory ?? {};
  } catch {
    // chybějící soubor není chyba, blok se nezobrazí
  }
  cache.set(rok, obory);
  return obory;
}

/** Obce seřazené od největšího podílu; null, když není co ukázat. */
export function souhrnObci(rok: number, zaznam: ZaznamOboru | undefined): SoubezneObce | null {
  const obce = (zaznam?.obce ?? [])
    .filter((o) => o.obec && Number.isFinite(o.podil) && o.podil > 0)
    .sort((a, b) => b.podil - a.podil || a.obec.localeCompare(b.obec, 'cs'));
  if (!obce.length) return null;
  return { rok, obce, potlaceno: zaznam?.potlacene_obce ?? 0 };
}

export async function getSoubezneObce(programId: string): Promise<SoubezneObce | null> {
  const rok = await rokKontextu();
  if (!rok) return null;
  const [redizo, kkov] = programId.split('_');
  return souhrnObci(rok, (await nactiObory(rok))[`${redizo}_${kkov}`]);
}
