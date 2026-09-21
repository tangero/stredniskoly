/**
 * Model ceny vývoje pro manažerské shrnutí na /o-projektu.
 *
 * **Tohle není měření.** Je to odhad, kolik práce by stejný výsledek stál tým,
 * který ho dělá běžným způsobem. Odhad nemá jak být přesný, a proto je celý
 * rozepsaný: bloky, člověkodny, sazby i výhrady stojí na stránce, aby je šlo
 * oponovat po částech místo dohadování o výsledném čísle.
 *
 * Postup, kterým čísla vznikla:
 *  1. Rozsah každého bloku se změřil nad repozitářem (počet řádků kódu je
 *     v `radku`, datum měření v MERENO).
 *  2. Člověkodny odhadl model podle rozsahu a obtížnosti bloku, ne podle
 *     historie commitů. Commity u projektu psaného s AI o lidské práci neříkají
 *     nic použitelného.
 *  3. Sazby jsou běžné české fakturované ceny dodavatele, ne mzdové náklady.
 *
 * Kontrola střízlivosti: 66 471 řádků / 342 člověkodnů vychází na 194 řádků
 * denně. To je na horní hranici běžné produktivity, takže odhad spíš
 * podhodnocuje, než aby nafukoval.
 */

/** Datum, ke kterému se měřil rozsah repozitáře. */
export const MERENO = '21. 9. 2026';

/** Celkem řádků kódu v repozitáři k datu MERENO, bez generovaných dat a zámků závislostí. */
export const RADKU_CELKEM = 66_471;

/** Dokumentace projektu k datu MERENO. */
export const DOKUMENTACE = { souboru: 112, slov: 250_696 };

/** Souborů s automatickými testy k datu MERENO (`ls tests | wc -l`). */
export const TESTU = 59;

/** Pravidelných běhů v průběžné kontrole (`.github/workflows`) k datu MERENO. */
export const BEHU_CI = 8;

export interface Blok {
  nazev: string;
  /** Co blok obsahuje, jednou větou. */
  popis: string;
  /** Změřený rozsah v řádcích kódu; null u bloku, který se v řádcích neměří. */
  radku: number | null;
  clovekodnu: number;
  /** Proč právě tolik. Nejnapadnutelnější část odhadu, proto je vypsaná. */
  zduvodneni: string;
}

export const BLOKY: Blok[] = [
  {
    nazev: 'Web: stránky škol, oborů a vyhledávání',
    popis:
      '34 typů stránek, z nich se staticky generují tisíce adres pro jednotlivé školy a obory, k tomu vyhledávání, kraje, města, mapa webu a náhledy pro sociální sítě.',
    radku: 15_000,
    clovekodnu: 50,
    zduvodneni:
      'Největší blok rozsahem. Sám o sobě není obtížný, ale drží ho pravidlo „každá nabídka má vlastní stránku“, které si vynutilo vlastní systém adres oborů a jeho testy.',
  },
  {
    nazev: 'Katalog přijímacího řízení',
    popis:
      'Import tří zdrojů CERMAT za tři ročníky, spárování nabídek mezi ročníky, výpočet souhrnů za obor a skupinu srovnatelných škol.',
    radku: 12_000,
    clovekodnu: 45,
    zduvodneni:
      'Nejtěžší datová část. Obory se mezi ročníky přejmenovávají, slučují a ruší, takže párování má vlastní skript, ruční přepisy a doklady o chybovosti. Odhad počítá i s tím, že tohle se napoprvé neudělá správně.',
  },
  {
    nazev: 'Školní novinky z webů škol',
    popis:
      'Sklízeč RSS a Atom feedů, zařazení zprávy do rubriky, databáze, odběr e-mailem s dvojím potvrzením, odesílač a správa.',
    radku: 10_090,
    clovekodnu: 35,
    zduvodneni:
      'Sklízeč cizích feedů je práce s nespolehlivým vstupem: každá škola má jiný tvar, část webů odmítá spojení podle toho, odkud přichází. Odběr e-mailem k tomu přidává souhlasy, tokeny a doby uložení.',
  },
  {
    nazev: 'Dopravní dostupnost',
    popis:
      'Převod jízdních řádů do grafu, hledání nejkratšího spojení, geokódování škol a zastávek, dvě rozhraní pro dotaz na dojezd.',
    radku: 7_504,
    clovekodnu: 30,
    zduvodneni:
      'Algoritmicky nejnáročnější blok. Jízdní řády mají vlastní formáty, noční linky a přestupy vyžadují zvláštní ošetření a chyby se projeví až na konkrétní trase.',
  },
  {
    nazev: 'Portál pro školy',
    popis:
      'Účty škol, přihlášení odkazem bez hesla, pozvánky, profil školy, e-mailová komunikace a správcovské rozhraní.',
    radku: 8_211,
    clovekodnu: 25,
    zduvodneni:
      'Běžná aplikační práce s účty a oprávněními. Rozsah je daný počtem stavů, kterými účet projde: pozvánka, uplatnění kódu, přihlášení, změna profilu, odhlášení, odebrání.',
  },
  {
    nazev: 'Data České školní inspekce',
    popis:
      'Import seznamu inspekcí, strojový rozbor inspekčních zpráv do porovnatelné podoby, profily škol z portálu INSPIS a jejich zobrazení.',
    radku: 4_135,
    clovekodnu: 25,
    zduvodneni:
      'Řádků málo, práce hodně. Rozbor zpráv psaných volným textem potřebuje vlastní ověření, jak dobře vychází, jinak se do webu dostanou nesprávná tvrzení o konkrétní škole.',
  },
  {
    nazev: 'Analýza dat a metodika',
    popis:
      'Soupis zdrojů sloupec po sloupci, slovník ukazatelů, oponentury vlastních návrhů, audity a doklady k měřením.',
    radku: null,
    clovekodnu: 40,
    zduvodneni:
      'Práce datového analytika, ne programátora. Odhad odpovídá 112 dokumentům a zhruba 250 tisícům slov, které vznikly z rozboru dat, ne z popisu hotového kódu.',
  },
  {
    nazev: 'Návrh a vzhled',
    popis: 'Vizuální podoba, komponenty, chování na telefonu, přístupnost.',
    radku: null,
    clovekodnu: 25,
    zduvodneni:
      'Měří se špatně, protože je rozptýlený po celém webu. Odhad odpovídá jednomu redesignu a průběžné údržbě; dvě třetiny návštěv jsou z telefonu, takže to není okrajová položka.',
  },
  {
    nazev: 'Simulátor a obtížnost přijetí',
    popis:
      'Rozdělení uchazečů do kohort, pásma přijetí podle bodů a rozhraní, které k oboru vrátí, jak těžké bylo se na něj dostat.',
    radku: 2_556,
    clovekodnu: 20,
    zduvodneni:
      'Kódu je málo, ale rozhodnutí, co se smí a nesmí tvrdit, stálo víc než jeho napsání. Web záměrně nepředpovídá přijetí konkrétního dítěte; odhad zahrnuje i zamítnuté varianty výpočtu.',
  },
  {
    nazev: 'Testy, průběžná kontrola a nasazení',
    popis: '59 testů, osm automatických běhů v CI, nasazení webu a sklízeče.',
    radku: 6_991,
    clovekodnu: 20,
    zduvodneni:
      'Součet testů napříč bloky. Část z nich spouští celou datovou linku proti falešnému zdroji, což je dražší než běžné testy jednotek.',
  },
  {
    nazev: 'Datová linka',
    popis:
      'Automatické hlídání, zda zdroje vydaly nová data, jejich stažení a kontrola, oznámení správci a po jeho schválení příprava převzetí.',
    radku: 1_850,
    clovekodnu: 15,
    zduvodneni:
      'Malá věc s velkým dopadem: bez ní je každé nové vydání dat ruční prací. Odhad je vyšší, než by rozsah napovídal, protože podstatná část je v ošetření případů, kdy zdroj změní tvar souboru.',
  },
  {
    nazev: 'Maturitní výsledky',
    popis: 'Import dvanácti ročníků, napojení na obory a jejich zobrazení u školy i oboru.',
    radku: 2_014,
    clovekodnu: 12,
    zduvodneni:
      'Přímočařejší než ostatní datové bloky, protože zdroj nese klíč, kterým se výsledky na obory napojí, aniž by se mapa dohledávala.',
  },
];

/** Podíl navíc na vedení projektu, schůzky, koordinaci a přejímku. */
export const REZIE_RIZENI = 0.16;

export interface Sazba {
  nazev: string;
  kcZaHodinu: number;
  popis: string;
}

/** Běžné fakturované sazby českého dodavatele, stav září 2026. */
export const SAZBY: Sazba[] = [
  {
    nazev: 'Dolní mez',
    kcZaHodinu: 1_200,
    popis: 'Menší studio nebo samostatní vývojáři na dlouhodobé spolupráci.',
  },
  {
    nazev: 'Střed',
    kcZaHodinu: 1_400,
    popis: 'Vážený průměr rolí: datový inženýr, vývojář rozhraní, analytik, vedení projektu.',
  },
  {
    nazev: 'Horní mez',
    kcZaHodinu: 1_800,
    popis: 'Zavedená agentura se smlouvou o dostupnosti a zárukou na dílo.',
  },
];

export const HODIN_ZA_DEN = 8;

export const CLOVEKODNU_PRACE = BLOKY.reduce((s, b) => s + b.clovekodnu, 0);
export const CLOVEKODNU_RIZENI = Math.round(CLOVEKODNU_PRACE * REZIE_RIZENI);
export const CLOVEKODNU_CELKEM = CLOVEKODNU_PRACE + CLOVEKODNU_RIZENI;

export function cenaZaSazbu(kcZaHodinu: number): number {
  return CLOVEKODNU_CELKEM * HODIN_ZA_DEN * kcZaHodinu;
}

/** Co odhad nezahrnuje nebo kde se může mýlit. Patří na stránku, ne do poznámky pod čarou. */
export const VYHRADY: string[] = [
  'Člověkodny jsou odhad z rozsahu a obtížnosti, ne záznam odpracovaného času. Nikdo takový záznam nevede, protože projekt tímto způsobem nevznikal.',
  'Poměr 194 řádků kódu na člověkoden je na horní hranici běžné produktivity. Odhad proto spíš podhodnocuje; tým, který stejná data vidí poprvé, by strávil víc času rozborem zdrojů než psaním.',
  'Cena nezahrnuje průzkum mezi uživateli, testování s rodiči a žáky, právní posouzení ani provoz po spuštění.',
  'Sazba dodavatele obsahuje marži a nefakturovaný čas. Vlastní zaměstnanecký tým by týž rozsah zvládl levněji, veřejná zakázka na obdobný portál bývá dražší.',
  'Odhad říká, co by stál tento výsledek. Neříká, že by ho tým v tomto tvaru navrhl; část rozhodnutí vznikla až z toho, co se v datech našlo.',
];
