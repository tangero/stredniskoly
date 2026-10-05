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
  /** Okruh, do kterého obor patří; generátor ho uvádí jen u zveřejněného okruhu. */
  okruh?: number;
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
  /** *Jistota zařazení do okruhu* (slovník ukazatelů), podíl 0 až 1; chybí u starších souborů. */
  jistota?: number | null;
}

/**
 * Práh *Jistoty zařazení do okruhu*, pod kterým stránka u oboru řekne „na pomezí okruhů“ (#366):
 * obor ve většině převzorkování skončil s většinou jiných oborů. Rozbor v slovníku ukazatelů.
 */
export const PRAH_POMEZI = 0.5;

/** Obor je na pomezí okruhů, jen když jistotu známe a je pod prahem; chybějící údaj nic netvrdí. */
export function naPomeziOkruhu(jistota: number | null | undefined): boolean {
  return typeof jistota === 'number' && Number.isFinite(jistota) && jistota < PRAH_POMEZI;
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
    obory: { klic: string; obec: string; uchazecu: number; ukotven?: boolean; jistota?: number | null }[];
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

/** Okruh, do kterého obor (REDIZO_KKOV) patří, i s obcí, jejíž okruhy ho nesou. */
export interface OkruhOboru {
  rok: number;
  obec: string;
  okruh: OkruhMesta;
}

/**
 * Okruh oboru pro stránku oboru: příslušnost z `obory.{klic}.okruh`, okruh sám z `mesta.{obec}`
 * se stejným výběrem jako na stránce města (`vyberOkruhu`), takže obě stránky ukazují týž okruh.
 */
export async function getOkruhOboru(programId: string): Promise<OkruhOboru | null> {
  const rok = await rokKontextu();
  if (!rok) return null;
  const [redizo, kkov] = programId.split('_');
  const klic = `${redizo}_${kkov}`;
  const id = (await nactiObory(rok))[klic]?.okruh;
  if (id === undefined) return null;
  // Stejné id okruhu nese více měst; vybere se město, kde obor leží (jeho domovská obec), jinak to s nejvíc obory okruhu.
  let nejlepsi: { obec: string; okruh: OkruhMesta; domov: boolean } | null = null;
  for (const [obec, zaznam] of Object.entries(await nactiMesta(rok))) {
    const okruh = vyberOkruhu(rok, zaznam)?.okruhy.find(o => o.id === id);
    const radek = okruh?.obory.find(o => o.klic === klic);
    if (!okruh || !radek) continue;
    const domov = radek.obec === obec;
    if (!nejlepsi || (domov && !nejlepsi.domov) || (domov === nejlepsi.domov && okruh.obory.length > nejlepsi.okruh.obory.length)) {
      nejlepsi = { obec, okruh, domov };
    }
  }
  return nejlepsi ? { rok, obec: nejlepsi.obec, okruh: nejlepsi.okruh } : null;
}

export async function getOkruheMesta(obec: string): Promise<OkruheMesta | null> {
  const rok = await rokKontextu();
  if (!rok) return null;
  return vyberOkruhu(rok, (await nactiMesta(rok))[obec]);
}

/** Záznam katalogu, ze kterého se skládá popis řádku okruhu. */
export interface ZaznamKataloguProOkruh {
  /** Název školy pro zobrazení s ulicí, například „Gymnázium, Křenová“. */
  nazevDisplay: string;
  obor: string;
  zamereni: string;
  delka: number | null;
}

/** Popis jednoho oboru okruhu pro řádek na stránce města. */
export interface PopisOboruOkruhu {
  skola: string;
  obor: string;
  /** Délka studia a zaměření, když je katalog nese jednoznačně. */
  doplnek: string | null;
}

/** Ulice z adresy rejstříku („Koněvova 100, 417 42 Krupka“ → „Koněvova“); bez ulice null. */
export function uliceZAdresy(adresa: string | undefined): string | null {
  const prvni = (adresa ?? '').split(',')[0].trim().replace(/\s+(č\.\s*p\.\s*)?\d[\dA-Za-z/]*$/, '').trim();
  // Ulice může začínat datem („17. listopadu“); bez ulice začíná adresa číslem popisným nebo „č. p.“.
  return prvni && !/^\d+(\/\d+)?$/.test(prvni) && !/^\d+\s/.test(prvni) && !/^č\.\s*p\./.test(prvni) ? prvni : null;
}

/**
 * Název školy pro řádek seznamu: z katalogu s ulicí, jinak zkrácený název z rejstříku doplněný o ulici
 * sídla. Zkrácený název sám nestačí, u 97 škol je to jen „Gymnázium“.
 */
export function nazevSkolyProRadek(
  redizo: string,
  nazvySkolKatalogu: Map<string, string>,
  rejstrik: { skola?: string; adresa?: string },
): string | null {
  const zKatalogu = nazvySkolKatalogu.get(redizo);
  if (zKatalogu) return zKatalogu;
  if (!rejstrik.skola) return null;
  const ulice = uliceZAdresy(rejstrik.adresa);
  return ulice && !rejstrik.skola.includes(ulice) ? `${rejstrik.skola}, ${ulice}` : rejstrik.skola;
}

/**
 * Jak řádek okruhu pojmenuje školu a obor. Zkrácený název z rejstříku je u 97 škol jen „Gymnázium“
 * a název oboru 79-41-K/41 také, takže řádek „Gymnázium / Gymnázium“ nic neřekl. Název školy se proto
 * bere z katalogu (s ulicí), a to i pro obor mimo katalog, když katalog zná jiný obor téže školy;
 * teprve škola mimo katalog dostane zkrácený název z rejstříku doplněný o ulici z adresy sídla.
 * Zaměření se uvede jen tehdy, když ho klíč REDIZO_KKOV má v katalogu jediné; víc zaměření se uvede počtem.
 */
export function popisOboruOkruhu(
  klic: string,
  katalog: Map<string, ZaznamKataloguProOkruh[]>,
  nazvySkolKatalogu: Map<string, string>,
  rejstrik: { skola?: string; adresa?: string; obor?: string },
): PopisOboruOkruhu | null {
  const zaznamy = katalog.get(klic) ?? [];
  const skola = nazevSkolyProRadek(klic.split('_')[0], nazvySkolKatalogu, rejstrik);
  const obor = zaznamy[0]?.obor || rejstrik.obor;
  if (!skola || !obor) return null;
  const casti: string[] = [];
  const delky = new Set(zaznamy.map((z) => z.delka).filter((d): d is number => typeof d === 'number' && d > 0));
  if (delky.size === 1) casti.push(`${Array.from(delky)[0]}leté`);
  const zamereni = Array.from(new Set(zaznamy.map((z) => z.zamereni.trim()).filter((z) => z && z !== obor)));
  if (zaznamy.length === 1 && zamereni.length === 1) casti.push(zamereni[0]);
  else if (zamereni.length > 1) casti.push(`${zamereni.length} zaměření`);
  return { skola, obor, doplnek: casti.length ? casti.join(', ') : null };
}
