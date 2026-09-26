// ============================================================================
// Veletrhy a přehlídky středních škol (docs/veletrhy-skol-2027.md).
//
// Tři pravidla, na kterých stojí důvěryhodnost přehledu:
//
// 1. Zobrazuje se jen akce s `terminPotvrzen`. Ověřenost pořadatele a
//    ověřenost termínu jsou dvě různé věci: xlsx má řádky s `overeno=ano`,
//    které u termínu nesou jen „2026 TBD" a loňské datum. Loňský termín
//    vydávaný za letošní je přesně ta chyba, kvůli které web přestal
//    používat pole `dny_otevrenych_dveri` z InspIS (71 % hodnot z roku
//    2024 a starších).
//
// 2. Proběhlá akce se nezobrazuje a platnost se počítá **při čtení**, ne
//    při sestavení dat. Stejné pravidlo jako u novinek škol: stránka se
//    staví jednou za build, ale čte se tři měsíce.
//
// 3. Město není vázané na seznam MESTA. Ten má práh tří škol a veletrh se
//    koná i v obcích pod ním (Kaplice, Boskovice). Vazba by akce tiše
//    zahodila.
// ============================================================================

import data from '@/data/veletrhy-2027.json';
import { cesskyDen } from './veletrhy-pocty.ts';

export interface Veletrh {
  id: string;
  nazev: string;
  poradatel: string;
  /** Null u online akce a u série, která se teprve rozepíše na města. */
  mesto: string | null;
  online?: boolean;
  krajKod: string;
  misto: string;
  start: string | null;
  end: string | null;
  /** Termín slovy pro čtenáře; strojové řazení jde přes `start`. */
  datum: string | null;
  cas?: string;
  terminPotvrzen: boolean;
  /** Termín je jen přibližný, pořadatel přesný harmonogram teprve zveřejní. */
  terminPribligny?: boolean;
  /** Termín máme z agregátoru akcí, web pořadatele ho neuvádí. */
  zdrojJenAgregator?: boolean;
  /** Věta, kterou stránka připojí k termínu, když není bez výhrad. */
  poznamkaTerminu?: string;
  url: string | null;
  zdrojOvereni: string | null;
  overeno: string | null;
  /** Jen u nepotvrzených: co chybí k zobrazení. */
  cekaNa?: string;
}

interface VeletrhySoubor {
  checkedAt: string;
  sezona: string;
  akce: Veletrh[];
  katalogy: { nazev: string; url: string | null; poznamka: string }[];
}

const soubor = data as unknown as VeletrhySoubor;

/** Datum ověření zdroje. Stránka ho ukazuje, aby čtenář věděl, jak je starý. */
export const OVERENO_K = soubor.checkedAt;

/**
 * Sezóna, kterou nese datový soubor.
 *
 * Zdroj pravdy o tom, které období se zobrazuje, je registr datových sad
 * (`veletrhy-skol`), ne tahle konstanta — proto ji stránka porovnává
 * s registrem přes `overSezonuProtiRegistru()`. Import souboru je pevný
 * záměrně: soubor je jediný a nese rok v názvu, takže nový ročník znamená
 * nový soubor a novou dávku, ne přepnutí za běhu.
 */
export const SEZONA = soubor.sezona;

/**
 * Ověří, že zobrazovaná data odpovídají období v registru.
 *
 * Vrací období z registru, nebo `null`, když se rozchází. Rozchod znamená,
 * že registr přepnul na nový ročník, ale data se nevyměnila — stránka pak
 * radši neukazuje nic než loňské akce jako letošní.
 */
export async function overSezonuProtiRegistru(
  /** Jen pro test: dovolí podstrčit registr a vyzkoušet rozchod. */
  cteniRegistru?: (sada: string) => Promise<string | null>,
): Promise<string | null> {
  const cti = cteniRegistru ?? (await import('./stav-datovych-sad')).zobrazeneObdobi;
  const obdobi = await cti('veletrhy-skol');
  if (obdobi === null) return null;
  return obdobi === SEZONA ? obdobi : null;
}


/**
 * Akce ke zobrazení: potvrzený termín a ještě neproběhla.
 *
 * `ke` je čas čtení — předává ho volající, aby šel test napsat bez
 * čekání na kalendář. Akce platí do konce svého posledního dne, proto
 * se porovnává `end`, ne `start`.
 */
export function zobrazitelneAkce(ke: Date = new Date()): Veletrh[] {
  const dnes = cesskyDen(ke);
  return soubor.akce
    .filter((a) => a.terminPotvrzen && a.start !== null && (a.end ?? a.start)! >= dnes)
    .sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''));
}

/** Akce, které čekají na potvrzení termínu. Na web nejdou, jsou to úkoly. */
export function cekajiciAkce(): Veletrh[] {
  return soubor.akce.filter((a) => !a.terminPotvrzen);
}

/**
 * Nadcházející akce v daném městě — pro stránku školy a stránku oboru.
 *
 * Shoda je přesná (`mesto === obec` z katalogu škol): ověřeno nad všemi městy
 * zdroje, že sedí na hodnoty `obec` v katalogu 2026. Na seznam MESTA se
 * nahlížet nesmí (pravidlo 3 v hlavičce). Online akce město nemají a městem
 * se nechytnou — patří na /veletrhy, ne na detail školy.
 *
 * Termín přibližný (`terminPribligny`) nebo převzatý jen z agregátoru
 * (`zdrojJenAgregator`) na detail nepatří (docs/zdroje-dat.md, oddíl 2.15):
 * upoutávka tvrdí, že termín ověřila na webu pořadatele, a u takové akce by
 * to nebyla pravda. Výhrada k termínu zůstává v přehledu na /veletrhy.
 */
export function akceProObec(obec: string, ke: Date = new Date()): Veletrh[] {
  return zobrazitelneAkce(ke).filter(
    (a) => a.mesto === obec && !a.terminPribligny && !a.zdrojJenAgregator,
  );
}
