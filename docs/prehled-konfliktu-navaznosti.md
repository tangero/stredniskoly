# Přehled konfliktů návazností: co je vyřešeno a co zbývá

Verze 1.0 · 12. 9. 2026. Návazné na [souhrnné zadání](ukol-navaznost-skol-a-oboru-2027.md).

Konfliktem se zde rozumí nabídka nebo školní jednotka, kterou konzervativní párování dvou ročníků nespojilo. Fronta jich obsahovala 436 otázek ve 192 úkolech. Tento dokument říká, čím byly vyřešeny a co na nich zůstává otevřené.

## Část 1: čím se konflikty vyřešily

Rozhodovaly čtyři zdroje, seřazené podle síly důkazu.

**Datované snímky rejstříku MŠMT.** Čtyři čtvrtletní snímky mezi 31. 3. 2025 a 30. 6. 2026 odpověděly na otázku, zda obor vůbec zanikl. Ukázalo se, že u drtivé většiny chybějících nabídek zůstává obor zapsán, takže nejde o zrušení oboru, ale o nevyhlášené přijímací řízení. Rejstřík zároveň oddělil sídlo od místa výuky a odhalil přesuny identifikátorů mezi subjekty.

**Vlastní stránky škol.** Nejsilnější jednotlivé důkazy jsou věty typu „obor se otevírá jednou za dva roky" nebo „nově otevíráme od září 2026". Bez nich by většina nálezů zůstala u stavu pravděpodobné.

**Data 1. kola z roku 2024.** Třetí bod v čase odlišil vynechaný ročník od vzniku oboru. Opravil pět nálezů, které označovaly za nový obor nabídku, do níž se v roce 2024 hlásily desítky uchazečů.

**Otevřený obchodní rejstřík ARES.** Rozhodl otázku zániku právnických osob, na které ztroskotalo javascriptové rozhraní justice.

Výsledek podle stavu nálezu:

| Stav | Nálezů | Co to znamená |
|---|---:|---|
| potvrzeno | 211 | Doložený zdroj pro konkrétní závěr a období |
| pravděpodobné | 41 | Nepřímé důkazy, chybí přímé vyjádření školy |
| rozpor zdrojů | 3 | Zdroje si odporují a nelze je srovnat |
| nedohledáno | 1 | Bez podkladu |

## Část 2: typy konfliktů a jejich řešení

| Typ konfliktu | Nálezů | Jak byl vyřešen | Zbývá |
|---|---:|---|---|
| Změna textu zaměření u téhož oboru | 26 | Porovnání textů a potvrzení na webu školy | U 3 není jisté, zda se změnil i obsah výuky |
| Nová nabídka bez předchůdce | 72 | Nepřítomnost v rejstříku 2025 a v datech 2024 plus oznámení školy | Hotovo, u části chybí datum zápisu do rejstříku |
| Ukončená nabídka | 60 | Obor zůstává zapsán, nabídka pro daný rok nevyhlášena | U 29 není jisté, zda je ukončení trvalé |
| Pokračování oboru | 71 | Shodné identifikátory a potvrzení školy | U 7 není jisté, zda se změnil i obsah výuky |
| Sloučení organizací | 16 | Přesun identifikátorů mezi snímky rejstříku plus ARES | U 8 chybí primární dokument o mechanismu |
| Rozdělení nabídky | 7 | Web školy s novými zaměřeními | Otevřenou otázku nese všech sedm, u dvou jde o rozdělení historických výsledků |
| Nejasné | 4 | Nerozhodnuto | Vyžaduje ruční přezkum |

## Část 3: co zbývá otevřené

Nálezy nesou 227 otevřených otázek ve 149 úkolech. Podstatné je, že jejich počet neodpovídá množství zbývající práce: část z nich je podle schválených pravidel mimo rozsah. Třídění vytváří `scripts/classify-open-questions.py`.

### A. Uzavře je rozhodnutí, ne rešerše

| Kategorie | Otázek | Proč |
|---|---:|---|
| Přesné datum události | 30 | Pravidlo 8 říká, že událost mezi dvěma snímky se datuje do intervalu |
| Příčina změny | 3 | Pravidlo 1 příčinu samotné změny nezkoumá |
| Přenos historických statistik | 7 | Rozhodnutí o srovnatelnosti je věcí člověka, ne dohledávání |

Těchto 40 otázek lze uzavřít bez jediného dalšího zdroje, jen zápisem rozhodnutí.

### B. Uzavřou je data, která už máme

| Kategorie | Otázek | Čím |
|---|---:|---|
| Běžel obor i mimo 1. kolo | 7 | Data 2. kola 2024 a 2025 v adresáři `data/` |
| Historie před rokem 2025 | 5 | Data 1. kola 2024, případně starší ročníky |
| Kapacity a počty přijímaných | 5 | Kapacity 1. kola 2026 v adresáři `data/` |
| Perioda cyklu | 2 | Test dvouletého cyklu, u delších period starší ročník |

Devatenáct otázek, na které stačí sáhnout do souborů, které v repozitáři leží.

### C. Uzavře je jeden sdílený dokument

| Kategorie | Otázek | Úkolů | Čím |
|---|---:|---:|---|
| Seznam škol v pokusném ověřování oboru Lyceum | 10 | 10 | Jediný seznam MŠMT k oboru 78-42-M/08 |
| Dokument zřizovatele | 9 | 9 | Usnesení rady nebo zastupitelstva kraje |
| Právní doklad o zániku subjektu | 8 | 7 | ARES již použit, zbývá sbírka listin pro datum a mechanismus |

Tato skupina má nejlepší poměr práce k výsledku: tři dokumenty uzavřou 27 otázek.

### D. Vyžadují další rešerši

Otázka „změnil se s názvem i obsah výuky" se netýká jen přejmenovaných nabídek. Z jednadvaceti jich sedm leží na nálezech o pokračování, šest na nových nabídkách, tři na přejmenování, tři na rozdělení a dvě na sloučení.

| Kategorie | Otázek | Čím |
|---|---:|---|
| Změnil se s názvem i obsah výuky | 21 | Školní vzdělávací program školy |
| Chybí datované oznámení školy | 5 | Výroční zpráva, nebo přiznat, že zdroj neexistuje |
| Zdroj byl technicky nedostupný | 3 | Opakovaný pokus jinou cestou |
| Nezařazeno | 50 | Ruční pohled, jde o různorodé jednotlivosti |

### E. Nerozhodnutelné do zveřejnění nabídky 2027

| Kategorie | Otázek | Proč |
|---|---:|---|
| Je ukončení trvalé, nebo dočasné | 39 | Odpoví až to, zda se obor v roce 2027 objeví |
| Kdy bude obor zapsán do rejstříku | 11 | Odpoví další snímek rejstříku |
| Které pracoviště obor vyučuje | 11 | Patří k úkolu dojezdovosti, ne k návaznostem |

Jednašedesát otázek nemá dnes odpověď a je poctivější to přiznat než je dohadovat.

## Návrh postupu

1. **Zapsat rozhodnutí u skupiny A.** Čtyřicet otázek zmizí bez rešerše, protože se ptají na to, co schválená pravidla vědomě nezkoumají.
2. **Dotáhnout skupinu B z vlastních dat.** Devatenáct otázek, jeden skript nad soubory, které už máme.
3. **Získat tři dokumenty skupiny C.** Seznam MŠMT k pokusnému ověřování je nejcennější, uzavře deset úkolů naráz.
4. **Skupinu D nechat na cílenou rešerši** u těch škol, kde na odpovědi závisí přenos historických výsledků.
5. **Skupinu E označit v datech jako otevřenou** a vrátit se k ní s daty 2027. Na webu do té doby nepsat, že obor byl zrušen.

Nezávisle na tom zůstává 48 nálezů s doporučením ruční přezkum. Ty čekají na rozhodnutí člověka, ne na další zdroje.
