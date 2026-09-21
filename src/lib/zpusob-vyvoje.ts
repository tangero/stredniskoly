/**
 * Podklady pro stránku /o-projektu/jak-vznikal.
 *
 * Staví vedle sebe dva způsoby, jak tentýž web postavit: veřejnou zakázku
 * a rozhodování za pochodu. Smyslem je ukázat, že každý z nich chrání před jiným
 * rizikem a každý za tu ochranu platí jinou cenu. Vítěze tu nikdo nevyhlašuje.
 *
 * Co je tu měřené a co odhadnuté:
 *  - fáze zakázkového modelu jsou **odhad** postupu, který je v české veřejné
 *    správě běžný; čísla u nich jsou odhad téhož řádu jako zbytek stránky,
 *  - fáze agentního postupu jsou **popis toho, co se stalo**, a doklady k nim
 *    vedou do repozitáře,
 *  - agregát ze smluv je **měřený**, ale hrubým filtrem, viz SMLOUVY.
 */

export interface Faze {
  nazev: string;
  /** Co se v té fázi děje. */
  popis: string;
  /** Kdo v ní rozhoduje. Nejdůležitější sloupec celého srovnání. */
  rozhoduje: string;
  /** Co z fáze vypadne ven. */
  vystup: string;
  /** Kalendářní doba, ne odpracovaný čas. */
  doba: string;
}

/**
 * Zakázkový model. Sedm fází, které v té či oné podobě projde každá veřejná
 * zakázka na informační systém. Pořadí je závazné: fáze nelze přeskočit ani
 * prohodit, protože každá další se opírá o schválený výstup té předchozí.
 */
export const FAZE_ZAKAZKA: Faze[] = [
  {
    nazev: 'Záměr a příprava zadání',
    popis:
      'Ministerstvo popíše, co má web umět, komu slouží a z jakých peněz se zaplatí. Součástí bývá průzkum trhu, tedy dotaz dodavatelům, kolik by to asi stálo.',
    rozhoduje: 'zadavatel',
    vystup: 'schválený záměr a odhad ceny',
    doba: '2 až 4 měsíce',
  },
  {
    nazev: 'Zadávací řízení',
    popis:
      'Zakázka se vypíše, dodavatelé podávají nabídky, komise je hodnotí. Námitka neúspěšného uchazeče může řízení zdržet o měsíce, v krajním případě zrušit.',
    rozhoduje: 'hodnoticí komise podle předem daných kritérií',
    vystup: 'podepsaná smlouva o dílo',
    doba: '3 až 6 měsíců',
  },
  {
    nazev: 'Vstupní analýza a specifikace',
    popis:
      'Dodavatel rozepíše, co přesně postaví: obrazovky, datové vazby, ukazatele. Zadavatel to schválí. Od té chvíle je specifikace měřítkem, podle kterého se dílo přebírá.',
    rozhoduje: 'zadavatel schválením dokumentu',
    vystup: 'detailní specifikace díla',
    doba: '2 až 3 měsíce',
  },
  {
    nazev: 'Realizace po etapách',
    popis:
      'Vlastní stavba webu podle schválené specifikace, obvykle rozdělená na dílčí plnění s vlastními termíny a fakturami.',
    rozhoduje: 'dodavatel v mezích specifikace',
    vystup: 'dílčí plnění k převzetí',
    doba: '8 až 12 měsíců',
  },
  {
    nazev: 'Akceptační řízení',
    popis:
      'Zadavatel ověří, že dílo odpovídá specifikaci. Zkouší se shoda se zadáním. Jestli je web pro rodiče k něčemu dobrý, se v téhle fázi neřeší. Vady se sepíšou a dodavatel je odstraní.',
    rozhoduje: 'zadavatel podpisem akceptačního protokolu',
    vystup: 'protokol o převzetí',
    doba: '1 až 2 měsíce',
  },
  {
    nazev: 'Předání do provozu',
    popis:
      'Nasazení, předání zdrojového kódu a provozní dokumentace, zaškolení správců. Teprve tady web poprvé uvidí veřejnost.',
    rozhoduje: 'zadavatel',
    vystup: 'web v provozu',
    doba: '1 měsíc',
  },
  {
    nazev: 'Záruka a změnová řízení',
    popis:
      'Opravy vad ze záruky jsou zdarma. Všechno ostatní, včetně věcí, které se ukázaly až provozem, je změna zadání: nová objednávka, nová cena, nové schvalování.',
    rozhoduje: 'zadavatel objednávkou, dodavatel cenou',
    vystup: 'dodatky ke smlouvě',
    doba: 'průběžně',
  },
];

/**
 * Agentní postup jako smyčka. Pět kroků, kterými projde každá jednotlivá funkce
 * zvlášť, a projde jimi i podruhé, když se ukáže, že napoprvé stála na špatném
 * předpokladu. Posloupnost v čase to není.
 */
export const FAZE_AGENTNI: Faze[] = [
  {
    nazev: 'Otevřít data a zjistit, co v nich je',
    popis:
      'Nejdřív se projdou zdrojové soubory sloupec po sloupci a sepíše se, na jakou otázku rodiče by každý z nich šel použít. Teprve pak se rozhoduje, co web ukáže.',
    rozhoduje: 'zdrojová data',
    vystup: 'soupis toho, co je k dispozici',
    doba: 'hodiny',
  },
  {
    nazev: 'Postavit nejmenší použitelnou verzi',
    popis:
      'Místo specifikace vznikne rovnou stránka, na kterou se dá kliknout. Zahodit ji vyjde levněji než ji popsat.',
    rozhoduje: 'autor',
    vystup: 'funkční stránka',
    doba: 'hodiny až dny',
  },
  {
    nazev: 'Nasadit a ukázat lidem',
    popis:
      'Web jde na veřejnou adresu hned, žádná přejímka se nekoná. Zpětná vazba chodí neformálně a průběžně od pedagogů, rodičů a lidí kolem projektu. Stálá skupina to není a zápisy z jednání nikdo nevede.',
    rozhoduje: 'autor po konzultaci',
    vystup: 'nasazená změna a reakce na ni',
    doba: 'tentýž den',
  },
  {
    nazev: 'Oponovat vlastní návrh',
    popis:
      'U každého ukazatele se sepíše, co tvrdí a čím se to dokládá. Co se nedá doložit, na web nesmí. Tohle je krok, kde se nejčastěji zjistí, že předchozí rozhodnutí bylo špatné.',
    rozhoduje: 'doklad',
    vystup: 'rozbor se zamítnutými variantami',
    doba: 'hodiny',
  },
  {
    nazev: 'Přepsat, co neobstálo',
    popis:
      'Chybný ukazatel se smaže a spočítá znovu. Žádné změnové řízení. Oprava stojí hodiny, takže se opraví i to, co by se jinak obhajovalo do konce projektu.',
    rozhoduje: 'autor',
    vystup: 'oprava a záznam, proč k ní došlo',
    doba: 'hodiny',
  },
];

export interface Srovnani {
  otazka: string;
  zakazka: string;
  agentni: string;
}

/** Srovnání vedené otázkami: otázka drží obě odpovědi u sebe a nutí je být souměřitelné. */
export const SROVNANI: Srovnani[] = [
  {
    otazka: 'Kdy se rozhodne, co web bude umět',
    zakazka: 'na začátku, v zadání a specifikaci',
    agentni: 'průběžně, podle toho, co se najde ve zdrojových datech',
  },
  {
    otazka: 'Co se stane, když se zadání ukáže jako špatné',
    zakazka: 'změnové řízení: nová cena, nové schvalování, spor o to, kdo to zavinil',
    agentni: 'přepíše se, protože přepis stojí hodiny',
  },
  {
    otazka: 'Podle čeho se pozná, že je hotovo',
    zakazka: 'shoda se schválenou specifikací',
    agentni: 'web je nasazený a lidé ho používají',
  },
  {
    otazka: 'Kdy výsledek poprvé uvidí veřejnost',
    zakazka: 'po přejímce, tedy zhruba po roce a půl',
    agentni: 'první den',
  },
  {
    otazka: 'Kdo nese riziko, že výsledek nikdo nepoužije',
    zakazka: 'zadavatel, tedy veřejné peníze',
    agentni: 'autor',
  },
  {
    otazka: 'Kdo kontroluje kvalitu',
    zakazka: 'akceptační komise nezávislá na dodavateli',
    agentni: 'autor sám, což je největší slabina tohoto postupu',
  },
  {
    otazka: 'Co po projektu zůstane doložitelného',
    zakazka: 'smlouva, specifikace, akceptační protokoly',
    agentni: 'veřejný kód, rozbory se zamítnutými variantami, changelog',
  },
  {
    otazka: 'Co se stane, když člověk odejde',
    zakazka: 'dodavatel nahradí člověka, smlouva platí dál',
    agentni: 'projekt se zastaví',
  },
];

export interface Doklad {
  nalez: string;
  /** Jak by se týž nález řešil v zakázce. */
  vZakazce: string;
  zdroj: string;
}

/**
 * Doložené případy, kdy se rozhodnutí ukázalo jako špatné až po tom, co bylo
 * učiněno. Tohle je jádro celé stránky: v zakázkovém modelu by každý z nich
 * narazil na to, že zadání už je schválené.
 */
export const DOKLADY: Doklad[] = [
  {
    nalez:
      'Návrh stránky školy vznikl z toho, co web už zobrazoval, místo ze zdrojových souborů. Tři užitečné údaje proto ležely nepoužité v souborech, které byly celou dobu otevřené; jeden z nich byl dokonce už spočítaný.',
    vZakazce:
      'Specifikace by je nezmínila, protože by vznikla stejným způsobem. Doplnit je později znamená změnové řízení.',
    zdroj: 'docs/zdroje-dat.md',
  },
  {
    nalez:
      'Sedmistupňová škála obtížnosti přijetí se zamítla měřením: shodně zařadila jen 36,3 % oborů proti 52,8 % u pětistupňové.',
    vZakazce:
      'Počet stupňů by stál ve specifikaci. Měření, které ho vyvrátí, nikdo neobjedná.',
    zdroj: 'changelog 2.12.0',
  },
  {
    nalez:
      'Rozlišení dobíhajících oborů přes hrubý klíč mělo doloženou 100% chybovost, všech 29 zásahů bylo falešných. Funkce se postavila jinak.',
    vZakazce:
      'Funkce by prošla přejímkou, protože specifikaci by odpovídala. Že ukazuje nesmysl, by se zjistilo až od rodičů.',
    zdroj: 'changelog 2.12.0',
  },
  {
    nalez:
      'Čtrnáct nabídek sdílelo jednu adresu a jedna z nich ukazovala čísla té druhé. Vyšlo to najevo z kontroly nad celým katalogem, ne z hlášení uživatele.',
    vZakazce:
      'Vada v záruce, pokud se prokáže. Spor o to, zda šlo o vadu díla, nebo o chybu v datech dodaných zadavatelem.',
    zdroj: 'changelog 2.13.0',
  },
  {
    nalez:
      'Mapa mezi kódem oboru a skupinou maturitních oborů byla vedená jako chybějící zdroj, který je potřeba dohledat. Přitom ji zdrojový soubor nesl u každé nabídky.',
    vZakazce:
      'Dohledání chybějícího zdroje by bylo položkou rozpočtu. Zjištění, že chybějící nebyl, by cenu nesnížilo.',
    zdroj: 'changelog 2.14.0',
  },
];

/**
 * Agregát ze smluv veřejné správy, Registr smluv přes Hlídač státu, 21. 9. 2026.
 *
 * **Hrubý filtr.** Kategorie IT a klíčová slova „portál informační systém
 * vzdělávání“ v pásmu 3 až 40 milionů korun. Množina obsahuje vývoj, provoz
 * i licence dohromady. Co stojí postavit web, z ní nevyčtete. Říká jen, v jakém
 * řádu se pohybují smlouvy, pod které by takový web spadl.
 */
export const SMLOUVY = {
  pocet: 244,
  celkemKc: 2_862_089_496,
  pasmoOdKc: 3_000_000,
  pasmoDoKc: 40_000_000,
  kDatu: '21. 9. 2026',
  odkaz: 'https://www.hlidacstatu.cz/hledatsmlouvy',
};

/** Kalendářní doba zakázkového modelu, součet dolních a horních mezí fází. */
export const ZAKAZKA_MESICU = { od: 17, do: 28 };
