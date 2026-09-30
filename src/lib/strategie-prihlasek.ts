/**
 * Strategie „vaše pořadí + pojistka“ nad zvažovanými obory (návrh simulátoru, oddíl 4 a 12).
 *
 * Nic se tu nesimuluje: nepočítá se šance ani přiřazení uchazeče ke škole.
 * Funkce jen kontrolují seznam, který si rodina sama seřadila.
 */
import type { Skupina } from './poloha-vuci-pasmu';

/** Počet přihlášek z bloku `pravidla` v src/data/admissions-2027.json, nikdy napevno. */
export interface PravidlaPrihlasek {
  prihlasek_bezne: number;
  prihlasek_talentove: number;
  /** Rok pravidel, podle kterých je počet opsaný; text říká „podle pravidel {rok}“. */
  rok_pravidel: number;
  overeno_pro_rizeni: boolean;
  zdroj: string;
}

export interface PolozkaStrategie {
  id: string;
  /** null = bez zadaného testu nebo bez načtených pásem; skupinu neznáme. */
  skupina: Skupina | null;
  /** null = druh zkoušky neznáme (obor se dohledává, nebo se nenačetla pásma). */
  talentova: boolean | null;
}

export interface KontrolaStrategie {
  /** Skupiny známe (je zadaný test a načtená pásma). */
  znameSkupiny: boolean;
  /**
   * U některého oboru neznáme druh zkoušky: kontrola limitu přihlášek i pojistky je
   * pozastavená, protože bez něj nevíme, co se do přihlášky vejde.
   */
  pozastaveno: boolean;
  /** Aspoň jeden obor nad pásmem mezi těmi, které se vejdou do přihlášky. */
  maPojistku: boolean;
  /** Aspoň jeden obor „kde nikoho neodmítli“ mezi těmi, které se vejdou. */
  maNikdoNeodmitnut: boolean;
  /** Pojistka je v seznamu, ale až za posledním místem přihlášky. */
  pojistkaMimoPrihlasku: boolean;
  /** Obor „kde nikoho neodmítli“ je v seznamu, ale až za posledním místem přihlášky. */
  nikdoNeodmitnutMimoPrihlasku: boolean;
  /** Id běžných oborů, které se vejdou do přihlášky (prvních N v pořadí). */
  vejdeSeBezne: string[];
  vejdeSeTalentove: string[];
  /** Kolik zvažovaných oborů se do přihlášky nevejde. */
  navicBezne: number;
  navicTalentove: number;
}

/** Posune obor o jedno místo nahoru (-1) nebo dolů (+1); mimo okraj se nic nemění. */
export function posunVPoradi(ids: string[], id: string, smer: -1 | 1): string[] {
  const i = ids.indexOf(id);
  const j = i + smer;
  if (i < 0 || j < 0 || j >= ids.length) return ids;
  const out = [...ids];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/**
 * Kontrola seznamu: běžné a talentové obory se počítají zvlášť, protože pravidla
 * dávají na každý druh vlastní počet přihlášek. Pojistka se hledá jen mezi obory,
 * které se do přihlášky vejdou; talentový obor pojistkou není (patří do „bez srovnání“).
 */
export function zkontrolujStrategii(polozky: PolozkaStrategie[], pravidla: PravidlaPrihlasek): KontrolaStrategie {
  const znameSkupiny = polozky.some(p => p.skupina !== null);
  if (polozky.some(p => p.talentova === null)) {
    return {
      znameSkupiny, pozastaveno: true, maPojistku: false, maNikdoNeodmitnut: false, pojistkaMimoPrihlasku: false, nikdoNeodmitnutMimoPrihlasku: false,
      vejdeSeBezne: [], vejdeSeTalentove: [], navicBezne: 0, navicTalentove: 0,
    };
  }
  const bezne = polozky.filter(p => !p.talentova);
  const talentove = polozky.filter(p => p.talentova);
  const vejdeSe = bezne.slice(0, pravidla.prihlasek_bezne);
  const zbytek = bezne.slice(pravidla.prihlasek_bezne);
  const maPojistku = vejdeSe.some(p => p.skupina === 'nad');
  const maNikdoNeodmitnut = vejdeSe.some(p => p.skupina === 'nikdo_neodmitnut');
  return {
    znameSkupiny,
    pozastaveno: false,
    maPojistku,
    maNikdoNeodmitnut,
    pojistkaMimoPrihlasku: !maPojistku && zbytek.some(p => p.skupina === 'nad'),
    nikdoNeodmitnutMimoPrihlasku: !maNikdoNeodmitnut && zbytek.some(p => p.skupina === 'nikdo_neodmitnut'),
    vejdeSeBezne: vejdeSe.map(p => p.id),
    vejdeSeTalentove: talentove.slice(0, pravidla.prihlasek_talentove).map(p => p.id),
    navicBezne: zbytek.length,
    navicTalentove: Math.max(0, talentove.length - pravidla.prihlasek_talentove),
  };
}

/**
 * Návrh pojistky, když v seznamu chybí: nejbližší nabídky nad pásmem (podle dojezdu,
 * bez dojezdu podle názvu) se stejným oborem jako některý zvažovaný; když takové nejsou,
 * jakékoli nad pásmem. Kandidáti jsou výsledky hledání, tedy už omezené místem a filtrem.
 */
export function navrhniPojistku<T extends { id: string; obor: string }>(
  kandidati: T[], jeZvazovany: (id: string) => boolean, oboryZvazovanych: Set<string>,
  o: { skupina: (x: T) => Skupina | null; minuty: (x: T) => number | undefined; nazev: (x: T) => string },
  pocet = 3,
): T[] {
  const nad = kandidati.filter(k => !jeZvazovany(k.id) && o.skupina(k) === 'nad');
  const cas = (x: T) => o.minuty(x) ?? Infinity;
  const razeni = (a: T, b: T) => (cas(a) - cas(b)) || o.nazev(a).localeCompare(o.nazev(b), 'cs');
  const stejnyObor = nad.filter(k => oboryZvazovanych.has(k.obor)).sort(razeni);
  return (stejnyObor.length ? stejnyObor : nad.sort(razeni)).slice(0, pocet);
}

/**
 * Druh zkoušky zvažovaného oboru z indexu pásem. Obor bez řádku v indexu (nový obor,
 * starší uložená nabídka, obor bez JPZ) druh zkoušky nemá doložený: vrací null a
 * kontrola strategie se pozastaví, místo aby ho tiše počítala mezi běžné přihlášky.
 */
export function talentovaZPasem(pasma: unknown, radek: { talentova: boolean } | undefined | null): boolean | null {
  if (!pasma || !radek) return null;
  return radek.talentova;
}
