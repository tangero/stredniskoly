# Přehled konfliktů návazností: co je vyřešeno a co zbývá

Verze 2.1 · 12. 9. 2026. Návazné na [souhrnné zadání](ukol-navaznost-skol-a-oboru-2027.md).

Konfliktem se zde rozumí nabídka nebo školní jednotka, kterou konzervativní párování dvou ročníků nespojilo. Fronta jich obsahovala 436 otázek ve 192 úkolech.

## Zásada, podle které se běh uzavírá

Zápis školy nebo oboru v některém z číselníků, tedy v datech CERMAT, v rejstříku MŠMT nebo v ARES, je sám o sobě dostatečným dokladem, že daná věc po právu existuje. Tento běh proto neshromažďuje další potvrzení téhož a řeší jen místa, kde si zdroje odporují.

Z toho plyne dělba rolí mezi zdroji. Rejstřík MŠMT říká, co existuje. Data CERMAT říkají, co bylo v daném roce skutečně vypsáno. Nedatovaný katalog třetí strany neříká ani jedno, protože popisuje portfolio školy bez vazby na konkrétní ročník, a nabídku doloženou číselníkem proto nevyvrací. Odstup zápisu do rejstříku není spor: obor doložený daty CERMAT existuje, i když jej rejstřík ještě nevede.

## Kolik sporů zbylo

Spory hledá `scripts/find-data-conflicts.py` ve čtyřech podobách: nabídka u školy chybějící v rejstříku, IZO vedené pod jiným zřizovatelem, obor s jinou délkou studia než v rejstříku, a nález se stavem rozpor zdrojů nebo nerozhodnutým vztahem.

**Výsledek je nula.** Všechny tři spory, které rešerše nechala otevřené, jsou rozhodnuté; žádný číselník si s jiným neodporuje.

| Spor | Rozhodnutí |
|---|---|
| SŠ gastronomie Jeseník, obor Mechanizace a služby | Obor je registrován, v 1. kole 2026 nevypsán. Katalog třetí strany jej uvádí bez data, nabídku nevyvrací. |
| Gymnázium Globe Brno, zaměření živé jazyky | Šestileté studium se pro 2026 nevypsalo, osmileté se vypsalo poprvé. Nález rozdělen na dva podle konvence fronty. |
| SŠ automobilní Ústí nad Orlicí, samostatný Autotronik | Samostatný záznam nabídky v roce 2026 chybí, obor i varianta na webu školy trvají. Jde o změnu zápisu, ne doložený zánik. |

Po těchto rozhodnutích nese 216 nálezů stav potvrzeno a 41 stav pravděpodobné; žádný nález nezůstává ve stavu rozpor zdrojů ani nedohledáno.

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

Nálezy nesly 227 otevřených otázek ve 149 úkolech. Dnes jich je **nula**. Sto devadesát je uzavřeno v poli `resolved_questions` i s důvodem uzavření a 34 přesunuto do `decisions_required` jako věci k rozhodnutí při přezkumu, ne k dohledání. Třídění vytváří `scripts/classify-open-questions.py`.

Poslední skupinu, 45 otázek po tom, zda je nevypsání oboru trvalé, uzavřelo pravidlo, že se důvod ani trvalost nedohledávají. Škola obor v daném roce vypsala, nebo nevypsala; to je celé tvrzení, které data unesou.

## Párování mírně odlišných názvů

Hlavní prací zůstává spojit nabídky, které se jmenují jinými slovy. `scripts/match-zamereni.py` texty normalizuje a hledá vzájemně nejlepší dvojice u téhož kódu oboru a téže délky studia.

Kontrola nad hotovou rešerší našla **73 kandidátů a všech 73 už rešerše spárovala**; žádná dvojice nezůstala nespojená. Omezení na vzájemně nejlepší shodu je přitom nutné: u školy se třemi zaměřeními téhož kódu by se jinak nabídky spojily křížem, protože se shoduje jejich společný začátek.

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

### C. Sdílené dokumenty — **částečně hotovo**

**Seznam MŠMT je nalezen a použit.** Vyhlášení pokusného ověřování oboru 78-42-M/08 Lyceum má čj. MSMT-16031/2024-3 z 18. 10. 2024, dodatek č. 1 čj. MSMT-25860/2025-1 ze 4. 11. 2025 a dodatek č. 2 čj. MSMT-2941/2026-2 z 27. 2. 2026. Seznam zapojených škol platný k 15. 12. 2025 uvádí 45 škol s jejich REDIZO a s datem, odkdy mají obor zapsán ve školském rejstříku. Uložen je jako [strojová data](podklady/pokusne-overovani-lyceum-skoly.json). Z 22 úkolů fronty s nabídkou tohoto oboru je 21 v seznamu jmenovitě uvedeno.

**Usnesení krajů a sbírka listin se nedohledaly, ale už nejsou potřeba.** Podle zásady tohoto běhu je zápis v číselníku dokladem existence, takže dodatečné potvrzení usnesením zřizovatele nebo sbírkou listin nálezy nepotřebují. Otázky na ně jsou uzavřené s tímto odůvodněním. Pro pořádek: sbírka listin je dnes ve všech třech přístupových cestách javascriptová aplikace, `or.justice.cz` vrací na dotaz podle IČO jen formulář a totéž platí pro nový portál i pro otevřená data.

### D a E. Zbytek

Otázky na obsah školních vzdělávacích programů a na přenos historických výsledků nejsou mezerou v rešerši, ale rozhodnutím při přezkumu migrační mapy. Přesunuty jsou proto do pole `decisions_required`, kde jich je 32. Otázky na místa výuky patří k samostatnému úkolu dojezdovosti a jsou uzavřené odkazem na něj.

## Stav a další postup

Běh je uzavřen: žádný spor mezi číselníky nezůstává. Otevřených otázek je 53 a všechny čekají na data, která dnes neexistují.

1. **S nabídkou 2027** se vrátit k 47 otázkám, zda je ukončení nabídky trvalé.
2. **S daty 2. kola 2026**, až vyjdou, uzavřít 6 otázek na nábor mimo 1. kolo.
3. **Při přezkumu migrační mapy** projít 32 položek v `decisions_required` a 45 nálezů s doporučením ruční přezkum.
4. **Na webu** neuvádět obor jako zrušený, dokud to škola sama neoznámí; chybějící nabídka v jednom roce to nedokazuje.

Nezávisle na tom zůstává 48 nálezů s doporučením ruční přezkum. Ty čekají na rozhodnutí člověka, ne na další zdroje.
