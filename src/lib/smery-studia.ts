/**
 * Směr studia: skupina oborů podle toho, co se v nich učí, pro členění stránky města
 * (docs/navrh-prehled-oboru-ve-meste-2027.md, oddíl 4.1; pojem *směr studia* ve slovníku pojmů).
 *
 * Základem je skupina kmenových oborů z číselníku MŠMT, tedy první dvojčíslí kódu KKOV. Lycea
 * (78-42-M) a víceletá gymnázia se zařazují výčtem kódů, ne odhadem: lyceum podle předmětu,
 * protože tak se k němu uchazeči chovají (technické lyceum mají na přihlášce se strojírenstvím,
 * pedagogické se zdravotnickou školou), víceletá gymnázia zvlášť, protože se na ně hlásí žáci
 * 5. a 7. třídy. Pořadí směrů je pevné a nic neříká o obtížnosti přijetí.
 */
export type SmerStudia =
  | 'gymnazia'
  | 'viceleta'
  | 'technika'
  | 'zdravotnictvi'
  | 'ekonomika'
  | 'sluzby'
  | 'umeni'
  | 'priroda'
  | 'prakticke'
  | 'ostatni';

export interface PopisSmeru {
  id: SmerStudia;
  nazev: string;
  /** Krátký název na čip. */
  kratce: string;
}

export const SMERY_STUDIA: PopisSmeru[] = [
  { id: 'gymnazia', nazev: 'Gymnázia a všeobecná lycea', kratce: 'Gymnázia' },
  { id: 'viceleta', nazev: 'Víceletá gymnázia (z 5. a 7. třídy)', kratce: 'Víceletá gymnázia' },
  { id: 'technika', nazev: 'Technika a IT', kratce: 'Technika a IT' },
  { id: 'zdravotnictvi', nazev: 'Zdravotnictví, pedagogika a sociální práce', kratce: 'Zdravotnictví a pedagogika' },
  { id: 'ekonomika', nazev: 'Ekonomika, obchod a správa', kratce: 'Ekonomika a správa' },
  { id: 'sluzby', nazev: 'Gastronomie, potravinářství a služby', kratce: 'Gastronomie a služby' },
  { id: 'umeni', nazev: 'Umění a design', kratce: 'Umění a design' },
  { id: 'priroda', nazev: 'Příroda, zemědělství a veterina', kratce: 'Příroda a zemědělství' },
  { id: 'prakticke', nazev: 'Praktické školy', kratce: 'Praktické školy' },
  { id: 'ostatni', nazev: 'Ostatní obory', kratce: 'Ostatní' },
];

const LYCEA: Record<string, SmerStudia> = {
  '78-42-M/01': 'technika', // technické
  '78-42-M/02': 'ekonomika', // ekonomické
  '78-42-M/03': 'zdravotnictvi', // pedagogické
  '78-42-M/04': 'zdravotnictvi', // zdravotnické
  '78-42-M/05': 'gymnazia', // přírodovědné
  '78-42-M/06': 'gymnazia', // kombinované
  '78-42-M/07': 'gymnazia', // vojenské
  '78-42-M/08': 'gymnazia', // lyceum v pokusném ověřování
};

const SKUPINY: Record<string, SmerStudia> = {
  '16': 'priroda', '41': 'priroda', '43': 'priroda',
  '18': 'technika', '21': 'technika', '23': 'technika', '26': 'technika', '28': 'technika',
  '31': 'technika', '32': 'technika', '33': 'technika', '34': 'technika', '36': 'technika',
  '37': 'technika', '39': 'technika',
  '53': 'zdravotnictvi', '75': 'zdravotnictvi',
  '61': 'ekonomika', '63': 'ekonomika', '64': 'ekonomika', '66': 'ekonomika', '68': 'ekonomika', '72': 'ekonomika',
  '29': 'sluzby', '65': 'sluzby', '69': 'sluzby',
  '82': 'umeni',
};

/** Směr studia podle kódu oboru KKOV (například 79-41-K/41). */
export function smerOboru(kkov: string): SmerStudia {
  if (LYCEA[kkov]) return LYCEA[kkov];
  if (kkov.startsWith('78-62-')) return 'prakticke';
  if (kkov.startsWith('79-4')) return /K\/[68]\d$/.test(kkov) ? 'viceleta' : 'gymnazia';
  // Masér sportovní a rekondiční a podobné obory 69-41 stojí v okruzích u zdravotnických škol.
  if (kkov.startsWith('69-41')) return 'zdravotnictvi';
  return SKUPINY[kkov.slice(0, 2)] ?? 'ostatni';
}

/** Nástavba pro absolventy učebních oborů: kód končí L/5x (lycea L/0x mezi ně nepatří). */
export function jeNastavba(kkov: string): boolean {
  return /-L\/5\d$/.test(kkov);
}

/** Obor s výučním listem: kategorie E a H. */
export function jeVyucniList(kkov: string): boolean {
  return /-[EH]\/\d\d$/.test(kkov);
}
