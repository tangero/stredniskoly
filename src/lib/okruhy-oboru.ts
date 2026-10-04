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

/**
 * Okruhy oborů pro stránku města (issue #277, etapa 2c): pole `mesta.{obec}` téhož souboru.
 * Okruh vznikl z oblastí přihlášek, obory z jiných obcí jsou v něm jako ukotvené obory z okolí.
 * Meze zveřejnění (aspoň 3 obory, aspoň 30 uchazečů, počty zaokrouhlené dolů na desítky, potlačení
 * dopočitatelných podílů) uplatnil generátor; tady se jen vybírá, co stránka ukáže:
 * okruh jedné školy se nezobrazuje (popisuje rozhodování mezi obory jedné školy).
 * Přednost v okruhu a podíl prvních voleb se zatím nezobrazují.
 */
export interface OborOkruhu {
  klic: string;
  obec: string;
  /** Počet uchazečů oboru v okruhu; řadí se podle něj, nikdy podle obtížnosti ani přednosti. */
  uchazecu: number;
}

export interface OkruhMesta {
  id: number;
  /** Uchazeči okruhu, generátorem zaokrouhlení dolů na desítky. */
  uchazecu: number;
  obory: OborOkruhu[];
  /** Věta o přesunu zájmu se smí říct jen nad šumem (návrh, oddíl 7.2). */
  presunNadSumem: boolean;
  rokPresunu: [number, number] | null;
}

export interface OkruheMesta {
  rok: number;
  okruhy: OkruhMesta[];
}

interface ZaznamMesta {
  zobrazit?: boolean;
  okruhy?: {
    id: number;
    uchazecu: number;
    obory: { klic: string; obec: string; uchazecu: number; ukotven?: boolean }[];
    presun_zajmu_v_okruhu?: { roky?: number[]; nad_sumem?: boolean };
  }[];
}

const cacheMest = new Map<number, Record<string, ZaznamMesta>>();

async function nactiMesta(rok: number): Promise<Record<string, ZaznamMesta>> {
  const hotovy = cacheMest.get(rok);
  if (hotovy) return hotovy;
  let mesta: Record<string, ZaznamMesta> = {};
  try {
    const json = JSON.parse(await fs.readFile(path.join(process.cwd(), 'public', `okruhy_oboru_${rok}.json`), 'utf-8'));
    mesta = json.mesta ?? {};
  } catch {
    // chybějící soubor není chyba, oddíl se nezobrazí
  }
  cacheMest.set(rok, mesta);
  return mesta;
}

/** Okruhy města seřazené podle počtu uchazečů; null, když město práh pro okruhy nesplňuje. */
export function vyberOkruhu(rok: number, zaznam: ZaznamMesta | undefined): OkruheMesta | null {
  if (!zaznam?.zobrazit) return null;
  const okruhy: OkruhMesta[] = [];
  for (const o of zaznam.okruhy ?? []) {
    const obory = o.obory
      // Obor z jiné obce jen když je ukotvený (aspoň 10 společných uchazečů s místním oborem okruhu).
      .filter((x) => x.klic && Number.isFinite(x.uchazecu) && x.ukotven === true)
      .sort((a, b) => b.uchazecu - a.uchazecu || a.klic.localeCompare(b.klic));
    // Okruh jedné školy by šel dopočítat z čísel na její stránce.
    if (new Set(obory.map((x) => x.klic.split('_')[0])).size < 2) continue;
    const roky = o.presun_zajmu_v_okruhu?.roky;
    okruhy.push({
      id: o.id,
      uchazecu: o.uchazecu,
      obory,
      presunNadSumem: o.presun_zajmu_v_okruhu?.nad_sumem === true && roky?.length === 2,
      rokPresunu: roky?.length === 2 ? [roky[0], roky[1]] : null,
    });
  }
  okruhy.sort((a, b) => b.uchazecu - a.uchazecu || a.id - b.id);
  return okruhy.length ? { rok, okruhy } : null;
}

export async function getOkruheMesta(obec: string): Promise<OkruheMesta | null> {
  const rok = await rokKontextu();
  if (!rok) return null;
  return vyberOkruhu(rok, (await nactiMesta(rok))[obec]);
}
