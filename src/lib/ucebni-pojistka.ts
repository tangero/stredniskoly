/**
 * Učební obor jako pojistka bez bodů (docs/navrh-simulator-doplnek-ucebni-obory.md, #244 etapa 5).
 *
 * Učební obor (kategorie H nebo E, denní nezkrácená forma) nemá jednotnou přijímací zkoušku, proto
 * se s výsledkem testu nesrovnává a do bodových skupin nepatří. Pojistkou je, když v 1. kole nikoho
 * neodmítli kvůli počtu míst a soutěžících bylo aspoň MIN_SOUTEZICICH_PRO_ZARAZENI. Chybějící údaj
 * není nula: bez počtů pojistkou není. Čisté funkce bez Reactu, aby šly testovat.
 */
import { MIN_SOUTEZICICH_PRO_ZARAZENI, zminitPozadavek } from '@/lib/obor-profil';

/** Údaje 1. kola nabídky bez jednotné zkoušky, jak je posílá katalog simulátoru (po celém id nabídky). */
export interface UdajeBezJpz {
  /** Kategorie z kódu oboru: H, E, C, J, M, L, P. */
  kategorie: string;
  prijati: number | null;
  /** Nepřijatí kvůli kapacitě (capacity_rejected). */
  nepr_kapacita: number | null;
  /** Uchazeči, kteří nedosáhli požadavku školy (conditions_not_met). */
  nepr_podminky: number | null;
  prihlasky: number | null;
}

export type StavUcebnihoOboru = 'pojistka' | 'odmitli' | 'pod_prahem' | 'chybi';

export interface VyhodnoceniUcebnihoOboru {
  stav: StavUcebnihoOboru;
  soutezici: number | null;
  prijati: number | null;
  /** Počet nedosáhnuvších požadavku školy, jen když se podle pravidla obtížnosti uvádí. */
  nedosahlo: number | null;
}

/** Učební obor podle slovníku pojmů: obor s výučním listem, kategorie H, případně E. */
export function jeUcebniObor(kategorie: string | null | undefined): boolean {
  return kategorie === 'H' || kategorie === 'E';
}

/** Obor s talentovou zkouškou bez jednotné zkoušky: umělecké M a L a konzervatoře. */
export function jeTalentovyBezJpz(kategorie: string | null | undefined): boolean {
  return kategorie === 'M' || kategorie === 'L' || kategorie === 'P';
}

export function vyhodnotUcebniObor(u: UdajeBezJpz): VyhodnoceniUcebnihoOboru {
  const { prijati, nepr_kapacita: kapacita } = u;
  if (prijati === null || kapacita === null) return { stav: 'chybi', soutezici: null, prijati, nedosahlo: null };
  const soutezici = prijati + kapacita;
  const nedosahlo = u.nepr_podminky !== null && zminitPozadavek({
    prijati, prihlasky: u.prihlasky ?? undefined, conditions_not_met: u.nepr_podminky,
  }) ? u.nepr_podminky : null;
  if (kapacita > 0) return { stav: 'odmitli', soutezici, prijati, nedosahlo };
  if (soutezici < MIN_SOUTEZICICH_PRO_ZARAZENI) return { stav: 'pod_prahem', soutezici, prijati, nedosahlo };
  return { stav: 'pojistka', soutezici, prijati, nedosahlo };
}

/** Učební pojistka: učební obor a stav `pojistka`. Jiné kategorie pojistkou bez bodů nejsou. */
export function jeUcebniPojistka(u: UdajeBezJpz | null | undefined): boolean {
  return !!u && jeUcebniObor(u.kategorie) && vyhodnotUcebniObor(u).stav === 'pojistka';
}

const uchazecu = (n: number) => `${n} ${n === 1 ? 'uchazeč' : n >= 2 && n <= 4 ? 'uchazeči' : 'uchazečů'}`;

/**
 * Věta u učebního oboru (doplněk, oddíl 3). Slova podle slovníku pojmů: „požadavek školy“,
 * bez „místo pro všechny“. Kritéria přijetí učebních oborů web nepřepisuje, proto odkaz na web školy.
 */
export function vetaUcebnihoOboru(v: VyhodnoceniUcebnihoOboru, rok: number): string {
  switch (v.stav) {
    case 'pojistka': {
      const zaklad = `V 1. kole ${rok} tu nikoho neodmítli kvůli počtu míst: přijali všechny soutěžící uchazeče (přijato ${v.prijati}).`;
      return v.nedosahlo === null ? zaklad
        : `${zaklad} Požadavku školy, například minima z kritérií, ale nedosáhlo ${uchazecu(v.nedosahlo)}. Přečti si kritéria, která škola vyhlašuje na svém webu.`;
    }
    case 'odmitli':
      return `V 1. kole ${rok} tu kvůli počtu míst někoho odmítli, proto ho jako pojistku nepočítáme. Podrobnosti jsou na stránce oboru.`;
    case 'pod_prahem':
      return `V 1. kole ${rok} tu nikoho neodmítli kvůli počtu míst, ale o místo soutěžilo jen ${uchazecu(v.soutezici ?? 0)}; z tak malého počtu pojistku neurčujeme.`;
    case 'chybi':
      return `Pro tento obor nemáme počty z 1. kola ${rok}.`;
  }
}

/** Věta pod názvem bloku „Učební obory“; vysvětluje soutěžící uchazeče při prvním výskytu v bloku. */
export function popisBlokuUcebnichOboru(rok: number): string {
  return `Učební obory končí výučním listem. Jednotná přijímací zkouška se u nich nekoná, proto tvůj výsledek testu s nimi nesrovnáváme. Ukážeme jen, jestli v 1. kole ${rok} přijali všechny soutěžící uchazeče, tedy ty, kdo splnili požadavky školy a nedostali se na obor, který měli na přihlášce výš.`;
}

/** Kód oboru (KKOV) z id nabídky REDIZO_KKOV_zaměření. */
export const kkovNabidky = (id: string) => id.split('_')[1] ?? '';

/**
 * Návrh učební pojistky (doplněk, oddíl 3): jen když strategie pojistku nemá a mezi zvažovanými je
 * učební obor. Kandidáti jsou výsledky hledání (už omezené místem), které nejsou mezi zvažovanými, jsou
 * učební pojistkou a mají kód oboru shodný se zvažovaným učebním oborem. `navrhniPojistku` se nemění:
 * učební obor sám nenabízí, aby nevznikla hierarchie „maturita nahoře, učební obor dole“.
 */
export function navrhniUcebniPojistku<T extends { id: string }>(
  kandidati: T[], jeZvazovany: (id: string) => boolean, kkovZvazovanychUcebnich: Set<string>,
  o: { udaje: (x: T) => UdajeBezJpz | null | undefined; minuty: (x: T) => number | undefined; nazev: (x: T) => string },
  pocet = 3,
): T[] {
  if (!kkovZvazovanychUcebnich.size) return [];
  const cas = (x: T) => o.minuty(x) ?? Infinity;
  return kandidati
    .filter(k => !jeZvazovany(k.id) && kkovZvazovanychUcebnich.has(kkovNabidky(k.id)) && jeUcebniPojistka(o.udaje(k)))
    .sort((a, b) => (cas(a) - cas(b)) || o.nazev(a).localeCompare(o.nazev(b), 'cs'))
    .slice(0, pocet);
}

/**
 * Patička rozsahu výsledků (doplněk, oddíl 3): vyjmenuje jen kategorie, které výsledky opravdu obsahují.
 * `kategorie` jsou kategorie nabídek bez jednotné zkoušky ve výsledcích; obory se zkouškou jsou vždy.
 */
export function rozsahVysledku(kategorie: Iterable<string>): string {
  const k = new Set(kategorie);
  const casti = ['denních nezkrácených oborů s jednotnou zkouškou'];
  if (k.has('H') || k.has('E')) casti.push('učebních oborů');
  if (k.has('M') || k.has('L') || k.has('P')) casti.push('oborů s talentovou zkouškou bez jednotné zkoušky');
  if (k.has('C')) casti.push('praktických škol');
  if (k.has('J')) casti.push('oborů bez maturity i výučního listu');
  return casti.length === 1 ? casti[0] : `${casti.slice(0, -1).join(', ')} a ${casti[casti.length - 1]}`;
}

/**
 * Filtr „Po které třídě hledáš“ (doplněk, oddíl 4): obory se zkouškou po 5. a 7. třídě osmi- a šestiletá
 * studia, po 9. třídě čtyř- a pětiletá. Nabídky bez jednotné zkoušky (kategorie H, E, M, L, P, C, J) se
 * řadí podle druhu, ne podle délky: po 9. třídě všechny kromě osmiletých konzervatoří (P, 8 let), po 5. třídě
 * jen osmileté konzervatoře, po 7. třídě žádná; „all“ nefiltruje.
 */
export function projdeFiltremTridy(delka: number | undefined, kategorie: string | null | undefined, trida: string): boolean {
  if (kategorie) {
    const osmilete = kategorie === 'P' && delka === 8;
    if (trida === '5') return osmilete;
    if (trida === '7') return false;
    if (trida === '9') return !osmilete;
    return true;
  }
  if (trida === '5') return delka === 8;
  if (trida === '7') return delka === 6;
  if (trida === '9') return delka === 4 || delka === 5;
  return true;
}
