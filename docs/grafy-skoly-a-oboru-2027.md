# Grafy na stránce školy a oboru

Verze 1.0 · 13. 9. 2026 · **Schváleno k realizaci.** Nejdřív se zpracují předpoklady v oddílu 6, grafy až po nich.

Vizuální prototyp nad skutečnými čísly Gymnázia J. S. Machara: [docs/prototypy/grafy-skoly-a-oboru-2027.html](prototypy/grafy-skoly-a-oboru-2027.html), publikovaná kopie [v artefaktu](https://claude.ai/code/artifact/351e5d0a-d1c0-4fd3-9bb1-78349f85bcae).

Navazuje na [návrh prezentace dat](navrh-prezentace-dat-skoly-2027.md) a [prototyp stránky školy](prototyp-stranky-skoly-2027.md), které rozhodují, **co** stránka říká. Tenhle dokument rozhoduje, **jak se to kreslí a jak se ukazuje vývoj v čase**. Názvy a výpočty drží [slovník ukazatelů](slovnik-ukazatelu.md), období [registr stavu datových sad](../public/stav_datovych_sad.json).

## 1. Proč předchozí prototyp nedošel na web

Prototyp stránky školy (verze 1.2) i návrh prezentace (verze 1.1) skončily ve stavu „k rozhodnutí“ a o realizaci nikdo nerozhodl. Iterace prototypu skončila závěrem, že stropem jsou chybějící data. Žádný pull request ho nepřevzal; na web se dostaly jen pásma přijetí (z tezí JPZ) a inspekce, obojí jinou cestou.

Co z něj zůstalo nevyřešené a přebírá to tenhle dokument:

- tlak prvních voleb, podíl prvních voleb, kohorta, přetlak a souběžné přihlášky jsou ve slovníku a v datech, na webu ne;
- přehled školy dál ukazuje součtový poměr přihlášek na místo za celou školu, který návrh prezentace (oddíl 8, bod 1) označil za prokazatelně zavádějící;
- `CHANGELOG.md` tvrdí, že index obtížnosti nahradil tlak prvních voleb, v kódu ho nahradil údaj „Přijatí v roce 2025“;
- prototyp neměl žádný vývoj v čase.

## 2. Výchozí stav webu (13. 9. 2026)

- **Žádný graf a žádná knihovna grafů.** Na stránkách škol je jediný datový prvek CSS pruh pořadí v `SchoolResults2026`.
- **Srovnání ročníků** je jedna tabulka 2025 a 2026 ve `StatsTab`. Data trendu `getTrendDataForPrograms` se načítají, ale nikde nevykreslují.
- **Stránka oboru míchá roky a opakuje čísla.** Stejný počet přihlášek stojí na čtyřech místech, oddělovač „Data z přijímacího řízení 2025“ stojí nad daty 2026, pásma přijetí jsou z roku 2025.
- **Letopočty napevno** v `page.tsx`, `StatsTab.tsx`, `SchoolResults2026.tsx`, `Applications2026Banner.tsx`, `admission-summary.ts` a dalších; rok výsledků se bere z `cermat_results_2026.json`, ne z registru.
- **Formát čísel** se liší: `toFixed` s desetinnou tečkou na kartách oborů, české formátování v banneru a ve `StatsTab`.

## 3. Jaké časové řady máme

| Řada | Roky | Stav | Použití v grafech |
|---|---|---|---|
| Souhrny 1. kola za obory, 91 sloupců | 2025, 2026 | spolehlivé, lokálně `data/PZ{rok}_kolo1_skolobory_vysledky.xlsx` | základ všech trendů |
| Katalog `schools_data.json`, ročník 2025 | 2025 | starší revize: proti oficiálnímu souboru chybí 222 nabídek, liší se kapacita u 23 a přihlášky u 39 | pro trendy nepoužívat |
| Katalog, ročník 2024 | 2024 | generátor chybí, pole `cohorts` je kopie roku 2025, skóre na škále 0–200 | nezobrazovat, dokud nebude doložený soubor CERMATu |
| Souhrny 2. kola | 2025, 2026 | spolehlivé | osa kol u oboru |
| Data uchazečů: pásma, souběh | 2024–2026 | bez zaměření; 2026 připravené, registr zobrazuje 2025 | pásma, souběh |
| Inspekce ČŠI | 2016–2026 | data událostí; aspoň dvě inspekce má 680 škol | časová osa školy |
| Školní agregáty JPZ | 2017–2023 | nestaženo | dlouhá řada zájmu a vstupní úrovně |
| Maturity | 2015–2026 | stažen jen soubor jaro 2026, import nezačal | po importu |

**Kontinuita nabídek 2026** podle párování `build-catalogue-2026.py`: přesný protějšek v roce 2025 má 2 664 z 3 091 nabídek (z toho 1 886 i v katalogu 2024), 405 je jen v roce 2026, 76 párů je nejednoznačných. U 559 párů se změnil jen text zaměření. Z 427 nabídek bez záznamu v katalogu 2025 jich 204 mají přesný klíč v oficiálním souboru 2025, jde tedy o neúplný katalog, ne o nové obory.

**Co se mezi 2025 a 2026 dá srovnat** (2 662 párů s jednoznačným protějškem v oficiálním souboru 2025):

| Veličina | Změna, dolní čtvrtina / medián / horní čtvrtina | Srovnatelné |
|---|---|---|
| Kapacita | 0 / 0 / 0, beze změny u 71 % | ano |
| Přihlášky na místo | −0,53 / −0,07 / +0,37 | ano |
| Tlak prvních voleb | −0,23 / −0,03 / +0,18 | ano |
| Podíl prvních voleb | −5,6 / 0 / +5,1 p. b. | ano |
| Průměr přijatých v bodech | −0,7 / +2,6 / +5,9 | **ne**, převážně jiná obtížnost testu |
| Percentil průměru přijatých | −5,0 / −0,1 / +5,0 | ano |

## 4. Grafy

Každý graf odpovídá na jednu otázku, má tabulkový ekvivalent, rok a zdroj u čísla a barvu nikdy jako jediný nositel významu. Paleta je referenční validovaná paleta pro barvoslepost (modrá, oranžová, tyrkysová, žlutá) a jednobarevná modrá stupnice pro pořadí priorit.

### 4.1 Stránka oboru

| Graf | Otázka | Forma | Data | Ve slovníku |
|---|---|---|---|---|
| Dlaždice | Jak je na tom obor letos a oproti loňsku | 4 dlaždice s hodnotou a změnou | tlak prvních voleb, přihlášky na místo, nepřijatí kvůli kapacitě, naplněnost | ano; změna mezi ročníky nově |
| Zájem o obor po letech | Roste, nebo klesá zájem | skládaný sloupec přihlášek podle priority, čárka kapacity, rok bez dat jako prázdný rámeček | `KAPACITA`, `PŘIHLÁŠKY – PRIORITA 1–5` | ano |
| Jak těžké je se dostat proti podobným oborům | Kde obor stojí v celé zemi | tečkový graf skupiny, zvýrazněný obor, loňská poloha kroužkem, medián a hranice 1× | tlak prvních voleb, rozdělení ve srovnatelné skupině | tlak ano; percentil ve skupině nově |
| Jak dopadly přihlášky | Nevejdu se, nebo jde o pojistku | skládaný pruh po letech | `PŘIJATÍ`, `NEPŘIJATI` – 4 důvody | ano |
| Kdo se dostal podle priority | Berou hlavně ty, kdo je chtěli nejvíc | skládaný pruh po letech | `PŘIJATÍ – PRIORITA 1–5` | nově |
| S jakými výsledky přicházejí spolužáci | Jaká je vstupní úroveň a mění se | úsečka nejnižší přijatý → průměr přijatých v percentilech, značka průměru uchazečů | `PERCENTIL – PRŮMĚR`, `MIN (PŘIJATI)`, `PERCENTIL – PRŮMĚR` všech | nově |
| Kam se hlásili titíž uchazeči | S kým obor soutěží | vodorovné pruhy podílu uchazečů | souběžné přihlášky | ano |

Pásma přijetí zůstávají v podobě karty „Jak to dopadlo“, tabulka pásem se může převést na sloupce přijato ze soutěžících se značkou pásma nejistoty.

### 4.2 Stránka školy

| Graf | Otázka | Forma | Data |
|---|---|---|---|
| Obory školy a změna zájmu | Které obory jsou žádané a jak se to mění | úsečka tlaku prvních voleb předchozí → aktuální rok u každého oboru, značka mediánu skupiny | tlak prvních voleb, medián skupiny |
| Nabídka oborů v čase | Které obory škola vypisuje a kdy se nenaplnily | mřížka obor × rok: naplněno, nenaplněno, 2. kolo, bez dat, čeká na vyhlášení | souhrny 1. a 2. kola, kalendář MŠMT |
| Hlavička | Kolik oborů a míst | počet oborů, součet kapacit, zřizovatel, poslední inspekce; **bez součtu přihlášek a bez poměru za školu** | katalog, registr ČŠI |
| Časová osa inspekcí | Jak čerstvý je posudek | body na ose s odkazem na zprávu | `csi_inspections.json` |
| Maturita | Jaké jsou nároky studia | úspěšnost a percentil po letech za školu ve skupině oborů, se jmenovatelem | až po importu maturit |

### 4.3 Uložit mezi zvažované

Stránka oboru a simulátor dostanou společnou akci **„Uložit mezi zvažované“** a web jednu stránku se všemi uloženými obory. Produktové zadání už existuje: [PRD Můj výběr](prd-muj-vyber-2027.md), schválená rozhodnutí D1 (okamžité ukládání) a základ D2 (účet bez hesla, odkaz k náhledu). Tenhle oddíl ho nemění, jen určuje vazbu na grafy a pořadí kroků.

**Výchozí stav:** simulátor ukládá výběr lokálně v prohlížeči pod klíčem `prijimacky-vyber-2027` a v URL (`?vyber=1`), má pohled „Můj výběr“ a sdílení odkazem ([dodávka simulátoru](dodavka-simulator-ux-2027.md)). Stránka oboru uložit neumí a samostatná stránka výběru neexistuje.

| Krok | Co | Vazba |
|---|---|---|
| V1 | Tlačítko „Uložit mezi zvažované“ na stránce oboru, stav „Uloženo v tomto prohlížeči“, odkaz „Otevřít zvažované obory“ | stejný klíč úložiště a stejné identifikátory nabídek jako simulátor, aby jeden výběr platil na obou místech; na přehledu školy s více obory nejdřív volba konkrétního oboru (PRD §4.1) |
| V2 | Stránka zvažovaných oborů, cesta podle PRD `/muj-vyber/{rok}` s rokem z kalendáře | seznam podle PRD §5.2; odložení místo smazání; neznámý údaj není nevýhoda |
| V3 | Porovnání uložených oborů | stejné grafové komponenty jako stránka oboru: úsečky tlaku prvních voleb předchozí → aktuální rok přes všechny uložené obory, percentil průměru přijatých, nabídka v čase; jen obory stejného typu se srovnávají proti mediánu skupiny |
| V4 | Záloha a synchronizace účtem bez hesla | PRD §9, až po V1–V3 |

Pravidla: ukládá se konkrétní nabídka, ne škola; pořadí určuje rodina, nikdy systém; počet uložených oborů není omezený zákonným počtem přihlášek (PRD §5.2); osobní poznámky nevstupují do analytiky.

## 5. Pravidla

1. **Jednotkou je nabídka.** Přihlášky na místo, tlak a průměry se nikdy nepočítají za školu. Sčítat za školu jde jen kapacitu a počet oborů.
2. **Mezi roky percentily, ne body.**
3. **Chybějící rok je mezera**, nikdy nula ani zánik: dvouletý cyklus a změna zaměření.
4. **Roky z registru**, žádný letopočet v kódu ani v textu.
5. **Malé počty potichu nezmizí.** Pod 10 přijatými se minimum nezobrazuje a graf řekne proč.
6. **Každý graf má tabulku.** Hodnoty jsou dostupné bez najetí myší.
7. **Srovnání ročníků jen u jednoznačně spárovaných nabídek.** Nejednoznačný pár se ukáže bez předchozího roku a s vysvětlením.

## 6. Předpoklady realizace

| # | Úkol | Stav |
|---|---|---|
| P1 | Rok 2025 pro srovnání brát z oficiálního souhrnu, ne ze starší revize katalogu | rozpracováno |
| P2 | Odvozený soubor souhrnů 1. kola po letech s rozdělením ve srovnatelných skupinách a knihovna, která ho čte podle registru | rozpracováno |
| P3 | Zrušit součtový poměr přihlášek na místo za školu v `Applications2026Banner` | rozpracováno |
| P4 | Letopočty v dotčených komponentách z registru, jednotný český formát čísel | rozpracováno |
| P5 | Záznam katalogu 2026, který míchá roky (`prvni_priority` 2026 vedle `prihlasky_priority` a `min_body` 2025 na škále 0–200): nové komponenty ho nečtou, čtou souhrny | rozpracováno |
| P6 | Slovník: změna mezi ročníky, percentil průměru přijatých, přijatí podle priority, percentil ve srovnatelné skupině; ověřit populaci historického průměru 2025 | rozpracováno |
| P7 | Grafové komponenty jako serverové SVG bez knihovny, s tabulkou | čeká na P1–P6 |
| P8 | Dlouhá řada: souhrn 1. kola 2024 a školní agregáty JPZ 2017–2023 přes datovou linku | ověřit dostupnost |

Po P7 následuje uložení mezi zvažované, kroky V1–V4 z oddílu 4.3.

## 7. Zvážené nepoužité sloupce

| Sloupec | Závěr |
|---|---|
| Přijatí podle priority, souhrny 40–44 | **použít**, graf „Kdo se dostal podle priority“ |
| Percentily přijatých, souhrny 78–86 | **použít**, vstupní úroveň srovnatelná mezi roky |
| Výsledky všech uchazečů, souhrny 45–65 | **použít** průměrný percentil uchazečů jako značku; minimum a maximum ne |
| Oficiální minimum a maximum přijatých v bodech, 72–77 | **zamítnuto pro trend**: určuje je jediný uchazeč a obtížnost testu; minimum zůstává v pásmech přijetí |
| Maturitní výsledky | **až po importu** |
| Školní agregáty JPZ 2017–2023 | **až po stažení**, P8 |
| Položková data JPZ | zamítnuto: pro graf stránky nevypovídají, nezpracovaná |
| Důvod nepřijetí jednotlivce | zamítnuto: duplicitní se souhrnem |
| Dobíhající obor z rejstříku | zamítnuto pro graf, patří do textu oboru a do portálu pro školy |
| Ředitel a délka funkce | zamítnuto: osobní údaj bez doložené vypovídací hodnoty |

## Historie

| Verze | Změna |
|---|---|
| 1.0 | Návrh grafů pro stránku školy a oboru, inventura časových řad, pravidla a předpoklady realizace, uložení oboru mezi zvažované s vazbou na PRD Můj výběr. Schváleno 13. 9. 2026. |
