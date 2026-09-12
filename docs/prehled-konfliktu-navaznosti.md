# Přehled konfliktů návazností: co je vyřešeno a co zbývá

Verze 1.2 · 12. 9. 2026. Skupiny A a B jsou dotažené, ze skupiny C je vyřešen seznam MŠMT. Návazné na [souhrnné zadání](ukol-navaznost-skol-a-oboru-2027.md).

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

Původně nesly nálezy 227 otevřených otázek ve 149 úkolech. Dnes jich zbývá **171 ve 122 úkolech**. Padesát tři otázek je uzavřeno v poli `resolved_questions` i s důvodem, dvě přesunuty do `decisions_required` jako věci k rozhodnutí, ne k dohledání. Třídění vytváří `scripts/classify-open-questions.py`.

### A. Uzavře je rozhodnutí, ne rešerše — **hotovo**

| Kategorie | Otázek | Jak vyřešeno |
|---|---:|---|
| Přesné datum události | 28 | Uzavřeno pravidlem 8: událost mezi dvěma snímky se datuje do intervalu |
| Příčina změny | 2 | Uzavřeno pravidlem 1: příčina samotné změny se nezkoumá |
| Datum plus zbytek otázky | 1 | Datová část uzavřena pravidlem 8, zbývající část ponechána otevřená |
| Hotový závěr zapsaný jako otázka | 2 | Přesunuto mezi pozorování, kam text patří |
| Vyžaduje rozhodnutí, ne zdroj | 2 | Přesunuto do `decisions_required` |

Zbylé otázky z původního odhadu skupiny A se ukázaly jako otázky na budoucnost a patří do skupiny E.

### B. Uzavřou je data, která už máme — **hotovo**

Vznikl `scripts/offer-history.py`, který k jedné nabídce vypíše její stopu napříč pěti soubory CERMAT: 1. a 2. kolo 2024, 1. a 2. kolo 2025 a 1. kolo 2026.

| Kategorie | Otázek | Výsledek |
|---|---:|---|
| Běžel obor i mimo 1. kolo | 5 | Zodpovězeno; ve všech pěti případech obor v daném roce nefiguroval ani ve 2. kole |
| Historie před rokem 2025 | 5 | Zodpovězeno z 1. kola 2024 |
| Perioda cyklu | 2 | Dvouletý cyklus potvrzen daty u obou nástavbových oborů |
| Kapacita 2026 | 1 | Doplněna z přehledu kapacit |
| Nelze uzavřít | 2 | Data 2. kola 2026 nejsou zveřejněna; otázky upřesněny místo uzavření |

Nejcennější nález skupiny: u technického gymnázia při VŠTE nebylo jasné, proč první ročník otevřený v září 2025 chybí v datech 1. kola. Odpověď je ve 2. kole 2025, kde má obor devatenáct přihlášek a čtrnáct přijatých.

### C. Uzavře je jeden sdílený dokument — **částečně hotovo**

**Seznam MŠMT je nalezen a použit.** Vyhlášení pokusného ověřování oboru 78-42-M/08 Lyceum má čj. MSMT-16031/2024-3 z 18. 10. 2024, dodatek č. 1 čj. MSMT-25860/2025-1 ze 4. 11. 2025 a dodatek č. 2 čj. MSMT-2941/2026-2 z 27. 2. 2026. Seznam zapojených škol platný k 15. 12. 2025 uvádí 45 škol s jejich REDIZO a s datem, odkdy mají obor zapsán ve školském rejstříku. Uložen je jako [strojová data](podklady/pokusne-overovani-lyceum-skoly.json).

Frontu se podařilo proti němu porovnat celou: z 22 úkolů s nabídkou tohoto oboru je 21 v seznamu jmenovitě uvedeno. Dvacátý druhý je Smíchovská SPŠ, která obor převzala sloučením s Radlickou až po datu platnosti seznamu.

| Kategorie | Otázek | Stav |
|---|---:|---|
| Seznam škol v pokusném ověřování | 10 → 1 | Devět uzavřeno seznamem MŠMT; zbývá jen policejní škola, jde o jiný obor 68-42-L/01 |
| Dokument zřizovatele | 9 | Nevyřešeno, usnesení krajů se odsud nepodařilo dohledat |
| Právní doklad o zániku subjektu | 8 → 7 | Jedno IČO ověřeno v ARES; sbírka listin zůstává nedostupná |

Navíc se tím uzavřel jeden ze tří rozporů zdrojů: u Digital Academy Kutná Hora chyběla nabídka oboru Lyceum na webu školy, ale seznam MŠMT ji uvádí s účinností od 1. 9. 2026. Nález je přepsán na potvrzenou novou nabídku.

**Proč zbytek skupiny C nevyšel.** Usnesení rad a zastupitelstev krajů leží za vyhledávacími formuláři jednotlivých krajů a bez funkčního vyhledávače se k nim nedostaneme. Sbírka listin je dnes ve všech třech přístupových cestách javascriptová aplikace: `or.justice.cz` vrací na dotaz podle IČO jen formulář, nový portál `verejnerejstriky.msp.gov.cz` i otevřená data `dataor.justice.cz` běží jako JavaScript bez dostupného rozhraní. U dotčených nálezů je to zaznamenáno včetně toho, co bylo zkoušeno.

### D. Vyžadují další rešerši — **zbývá**

Otázka „změnil se s názvem i obsah výuky" se netýká jen přejmenovaných nabídek. Z jednadvaceti jich sedm leží na nálezech o pokračování, šest na nových nabídkách, tři na přejmenování, tři na rozdělení a dvě na sloučení.

| Kategorie | Otázek | Čím |
|---|---:|---|
| Změnil se s názvem i obsah výuky | 21 | Školní vzdělávací program školy |
| Chybí datované oznámení školy | 5 | Výroční zpráva, nebo přiznat, že zdroj neexistuje |
| Zdroj byl technicky nedostupný | 3 | Opakovaný pokus jinou cestou |
| Nezařazeno | 47 | Ruční pohled, jde o různorodé jednotlivosti |

### E. Nerozhodnutelné do zveřejnění nabídky 2027 — **zbývá**

| Kategorie | Otázek | Proč |
|---|---:|---|
| Je ukončení trvalé, nebo dočasné | 45 | Odpoví až to, zda se obor v roce 2027 objeví |
| Kdy bude obor zapsán do rejstříku | 10 | Odpoví další snímek rejstříku |
| Které pracoviště obor vyučuje | 11 | Patří k úkolu dojezdovosti, ne k návaznostem |

Šestašedesát otázek nemá dnes odpověď a je poctivější to přiznat než je dohadovat.

## Stav a další postup

Skupiny A a B jsou hotové a ze skupiny C je vyřešen seznam MŠMT. Dohromady ubylo 56 otázek. Zbývá:

1. **Usnesení krajů a sbírka listin.** Obojí potřebuje buď funkční vyhledávač, nebo prohlížeč, který zvládne javascriptovou aplikaci. Devět a sedm otázek.
2. **Skupinu D nechat na cílenou rešerši** u těch škol, kde na odpovědi závisí přenos historických výsledků.
3. **Skupinu E označit v datech jako otevřenou** a vrátit se k ní s daty 2027. Na webu do té doby nepsat, že obor byl zrušen.

Nezávisle na tom zůstává 48 nálezů s doporučením ruční přezkum. Ty čekají na rozhodnutí člověka, ne na další zdroje.
