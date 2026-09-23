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
import { krajNames } from './kraje.mjs';

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
export async function overSezonuProtiRegistru(): Promise<string | null> {
  const { zobrazeneObdobi } = await import('./stav-datovych-sad');
  const obdobi = await zobrazeneObdobi('veletrhy-skol');
  if (obdobi === null) return null;
  return obdobi === SEZONA ? obdobi : null;
}

/**
 * Dnešní datum v českém kalendáři.
 *
 * `toISOString()` by vrátilo den v UTC, takže mezi půlnocí a druhou
 * hodinou ranní letního času by se akce z včerejška tvářila jako dnešní.
 */
export function cesskyDen(ke: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ke);
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

/** Kraje, ve kterých nějaká zobrazitelná akce je. Pro filtr. */
export function krajeSAkcemi(ke: Date = new Date()): { kod: string; nazev: string; pocet: number }[] {
  const pocty = new Map<string, number>();
  for (const a of zobrazitelneAkce(ke)) {
    pocty.set(a.krajKod, (pocty.get(a.krajKod) ?? 0) + 1);
  }
  return [...pocty.entries()]
    .map(([kod, pocet]) => ({ kod, nazev: (krajNames as Record<string, string>)[kod] ?? kod, pocet }))
    .sort((a, b) => a.nazev.localeCompare(b.nazev, 'cs'));
}

/** Města, ve kterých nějaká zobrazitelná akce je. Online akce město nemá. */
export function mestaSAkcemi(ke: Date = new Date()): string[] {
  const mesta = new Set<string>();
  for (const a of zobrazitelneAkce(ke)) {
    if (a.mesto) mesta.add(a.mesto);
  }
  return [...mesta].sort((a, b) => a.localeCompare(b, 'cs'));
}

/** Název kraje ze číselníku; kód je jediný tvar, který se neplete. */
export function nazevKraje(kod: string): string {
  return (krajNames as Record<string, string>)[kod] ?? kod;
}
