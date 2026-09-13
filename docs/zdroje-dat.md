# Zdroje dat

Verze 1.2 · 13. 9. 2026 · **Závazný soupis. Před návrhem stránky nebo funkce se prochází celý.**

Tenhle dokument vznikl kvůli konkrétní chybě. Návrh stránky školy jsem sestavil z toho, co web už zobrazoval, místo z toho, co je ve zdrojových souborech. Tři užitečné údaje proto ležely nepoužité v souborech, které jsem měl otevřené: rozpad přihlášek podle priority jako podíl, souběžné přihlášky uchazečů a nejnižší výsledek jednotné zkoušky mezi přijatými. Poslední z nich byl dokonce už spočítaný a uložený v katalogu, zatímco [slovník ukazatelů](slovnik-ukazatelu.md) tvrdil, že ho nemáme.

Soupis jde proto **po sloupcích**, ne po polích, která se dnes zobrazují. U každého sloupce stojí, na jakou otázku rodiče by šel použít a jestli ho používáme.

## Povinný krok před návrhem

Než navrhneš stránku, sekci nebo ukazatel:

1. **Projdi oddíl 2 celý.** Ne jen zdroj, který máš zrovna v ruce.
2. **Projdi oddíl 3**, tedy soupis sloupců, které nepoužíváme. Je to jediné místo, kde se nevyužitá data dají najít, aniž bys věděl, že existují.
3. **Do návrhu napiš, které sloupce jsi zvážil a zamítl**, a proč. Zamítnutí je platný závěr, mlčení není.
4. **Přidáváš-li zdroj nebo sloupec, doplň ho sem** ve stejné dávce. Postup je v oddílu 5.

Ukazatel se pak zavádí podle [slovníku ukazatelů](slovnik-ukazatelu.md). Tenhle dokument říká, **co existuje**, slovník říká, **jak se to jmenuje a počítá**.

## 1. Přehled zdrojů

| Zdroj | Původ | Rozsah | Klíč | Aktualizace |
|---|---|---|---|---|
| CERMAT, agregovaná data za obory | data.cermat.cz, XLSX | 1. kolo 2025 a 2026 | REDIZO + KKOV + zaměření | ročně po zveřejnění |
| CERMAT, data uchazečů | data.cermat.cz, XLSX | 1. a 2. kolo 2024 a 2025 | řádek = uchazeč | ročně, se zpožděním roku |
| CERMAT, položková data JPZ | data.cermat.cz, XLSX | 2024 a 2025, 6 testů ročně | řádek = uchazeč a test | ročně |
| Rejstřík škol MŠMT, JSON-LD | rejstriky.msmt.gov.cz | 4 čtvrtletní snímky | REDIZO | čtvrtletně |
| Rejstřík škol MŠMT, CSV | rejstriky.msmt.gov.cz | jeden export | REDIZO + IZO + obor | ručně |
| Číselník AKKO | MŠMT | kmenové obory | 5místný kód | zřídka |
| Česká školní inspekce, seznam | opendata.csicr.cz | 9 564 škol | REDIZO | snímky s manifestem |
| Inspekční zprávy, extrakce | vlastní zpracování zpráv ČŠI | 849 škol | REDIZO | při nové zprávě |
| INSPIS, profily škol | portál ČŠI | 1 180 škol | REDIZO | ručně |
| CERMAT, maturitní výsledky | data.cermat.cz, XLSX | jaro 2015 až 2026, stav po podzimu do 2025 | REDIZO, volitelně + SMO16 | ročně |
| CERMAT, školní agregáty JPZ 2017–2023 | data.cermat.cz, XLSX | 7 ročníků | REDIZO + oborová skupina | uzavřená řada |
| Dopravní data | PID, GTFS ČR, jízdní řády | celá ČR | zastávka a spoj | podle vydání |

**Co v repozitáři není.** Zdroj patří do soupisu i tehdy, když jeho soubor na disku neleží. Takových je několik:

- `PZ2026_kolo1_skolobory_vysledky.xlsx` a `PZ2025_kolo1_skolobory_vysledky.xlsx` se stahují ručně a předávají skriptu přes `--input-dir`. V repozitáři zůstává odvozený `public/cermat_results_2026.json` a otisk sha256 v `public/cermat_results_meta.json`.
- **Maturitní výsledky** (oddíl 2.11) a **školní agregáty JPZ 2017–2023** (oddíl 2.12) staženy nejsou vůbec. Jejich adresy, kontrolní součty a rozměry ověřuje [podklad oponentury](podklady/oponentura-2027-r1.json) z 11. 9. 2026.

První verze tohoto soupisu obě chybějící skupiny vynechala, protože vznikala procházením adresáře `data/`. To je táž chyba v menším: inventura podle toho, co leží po ruce, místo podle toho, jaké zdroje projekt má.

## 2. Zdroje sloupec po sloupci

### 2.1 CERMAT, agregovaná data za obory

Tři soubory za ročník: přihlášky, kapacity, výsledky. Prvních 31 sloupců je ve všech třech shodných.

Identifikace a popis nabídky, sloupce 0 až 30:

| Sloupec | Obsah | Otázka rodiče | Používáme |
|---|---|---|---|
| `ID_SOF`, `ID_SO` | identifikátor nabídky a oboru | žádná, technické | ano, jako `source_id` |
| `IZO`, `REDIZO` | identifikátor školy | která škola to je | ano |
| `NÁZEV ŠKOLY`, `ULICE`, `OBEC`, `PSČ` | adresa | kde to je | ano |
| `KRAJ`, `OKRES`, `ORP` a jejich názvy | územní zařazení | je to v dosahu | ano |
| `ZŘIZOVATEL` a název | veřejná, církevní, soukromá | budeme platit školné | ano |
| `ROČNÍK` | z které třídy se hlásí | může se hlásit moje dítě | ano |
| `MATURITNÍ STATUS` | maturitní nebo výuční | co tím dítě získá | ano |
| `POVINNOST JPZ` | koná se jednotná zkouška | bude psát testy | ano |
| `TYP ŠKOLY`, `SKUPINA OBORŮ (16)` | GY8, LYC, SOS a další | s čím to srovnávat | ano, je to srovnatelná skupina |
| `KKOV`, `OBOR - NÁZEV`, `ZAMĚŘENÍ OBORU` | obor a jeho zaměření | co se tam učí | ano |
| `FORMA VZDĚLÁVÁNÍ`, `DÉLKA STUDIA`, `ZKRÁCENÉ STUDIUM`, `JAZYK STUDIA` | denní či dálkové, počet let | jak dlouho a jak | ano |
| `KAPACITA` | vypsaná místa | kolik jich berou | ano |

Soubor přihlášek přidává:

| Sloupec | Obsah | Otázka rodiče | Používáme |
|---|---|---|---|
| `PŘIHLÁŠKY CELKEM` | součet všech priorit | jaký je zájem | ano |
| `PŘIHLÁŠKY - PRIORITA 1` až `5` | rozpad podle pořadí na přihlášce | je to škola první volby, nebo pojistka | ano, od 13. 9. 2026 i jako podíl |
| `INDEX POPTÁVKY` | přihlášky děleno kapacitou | kolik uchazečů na místo | ano, ale nadsazuje konkurenci |

Soubor výsledků přidává:

| Sloupec | Obsah | Otázka rodiče | Používáme |
|---|---|---|---|
| `PŘIJATÍ` | počet přijatých | naplnili obor | ano |
| `NEPŘIJATI - NEDOSTATEČNÁ KAPACITA` | splnili, ale nevešli se | jak velký je přetlak | ano |
| `NEPŘIJATI - NESPLNĚNÍ PODMÍNEK` | neuspěli u podmínek školy | má škola vlastní požadavky | ano |
| `NEPŘIJATI - PŘIJAT NA VYŠŠÍ PRIORITU` | dostali se, ale šli jinam | jak často je to náhradní volba | ano |
| `NEPŘIJATI - VZDAL SE PŘIJETÍ` | odstoupili | okrajové | ano |
| `ČJ+MA - % SKÓR - PRŮMĚR (PŘIJATI)` | průměr přijatých | s jakými spolužáky se dítě potká | ano |
| `ČJ` a `MA - % SKÓR - PRŮMĚR (PŘIJATI)` | průměr po předmětech | který předmět je tu důležitější | ano |

**Co tenhle zdroj neumí:** nemá žádný údaj o jednotlivém uchazeči, takže z něj nelze zjistit nejnižší přijatý výsledek ani souběžné přihlášky. Ročník 2026 navíc zatím nemá zveřejněné přijaté podle priority.

### 2.2 CERMAT, data uchazečů

Jeden řádek je jeden uchazeč. Soubor má 40 sloupců a list `legenda` s výkladem kódů. Obsahuje **jen platné přihlášky k danému dni**; vzal-li uchazeč zpět první prioritu, sloupce `ss1_*` jsou prázdné, ale `ss2_*` a `ss3_*` vyplněné.

| Sloupec | Obsah | Otázka rodiče | Používáme |
|---|---|---|---|
| `rok`, `kolo` | kdy a které kolo | který ročník to popisuje | ano |
| `ss1_redizo` až `ss5_redizo` | škola na každé prioritě | kam se hlásili zároveň | **ano od 13. 9. 2026**, dřív nepoužito |
| `ss1_kkov` až `ss5_kkov` | obor na každé prioritě | jaké obory se kombinují | ano, tamtéž |
| `ss1_zrizovatel` až `ss5_` | zřizovatel každé volby | kombinují se veřejné a soukromé | **ne** |
| `ss1_forma` až `ss5_` | denní, dálková, večerní | žádná pro naši cílovou skupinu | **ne**, filtrujeme na denní |
| `ss1_zkraceno` až `ss5_` | zkrácené studium | netýká se přijímaček z 9. třídy | **ne** |
| `ss1_prijat` až `ss5_` | 1 = přijat a zařazen, 2 = ne | kdo se skutečně dostal | ano, pro minimum a kohorty |
| `ss1_duvod_neprijeti` až `ss5_` | důvod nepřijetí u každé volby | proč se nedostali | **ne**, používáme jen agregát |
| `c_m_procentni_skor` | ČJ+MA, lepší výsledek, 0 až 200 % | kolik bodů stačilo | ano, po dělení dvěma |
| `c_procentni_skor` | čeština, 0 až 100 % | jak těžká je tu čeština | částečně |
| `m_procentni_skor` | matematika, 0 až 100 % | jak těžká je tu matematika | částečně |

**Klíčové omezení:** soubor nese REDIZO a KKOV, ale **ne zaměření**. Vše z něj počítané platí za obor školy jako celek. U 213 z 2 558 kombinací REDIZO a KKOV to znamená, že několik zaměření sdílí jednu hodnotu.

**Soubory druhého kola** (`PZ2024_kolo2`, `PZ2025_kolo2`) mají stejnou strukturu a **nepoužíváme je nikde na webu**. Sahá na ně jen `scripts/offer-history.py`.

### 2.3 CERMAT, položková data JPZ

Dvanáct souborů, 390 MB, dohromady **zcela nepoužité**. Jeden řádek je jeden uchazeč a jeden didaktický test. Listy jsou po termínech: A a B jsou řádné, C a D náhradní.

| Sloupec | Obsah | Otázka rodiče | Používáme |
|---|---|---|---|
| `id_ss` | identifikátor uchazeče napříč testy | spojení češtiny a matematiky | **ne** |
| `ss1_redizo` až `ss5_redizo`, `ss1_kkov` až `ss5_` | volby uchazeče | kam se hlásili | **ne** |
| `ss1_smo16` až `ss5_` | skupina maturitních oborů | srovnatelná skupina | **ne** |
| `ss1_kraj` až `ss5_` | kraj každé volby | hlásí se i mimo kraj | **ne** |
| `zkouska_zkratka` | který test a termín | liší se řádné termíny | **ne** |
| `dt_body` | body z testu | jak si uchazeči stáli | **ne** |
| `dt_uspesnost` | procento z maxima | totéž v procentech | **ne** |
| `k1.1` až `k16.x` | odpovědi na jednotlivé položky | žádná přímá | **ne** a nemá smysl |
| `b1` až `b16.x` | body za jednotlivé úlohy | žádná přímá | **ne** a nemá smysl |

Podrobnost jednotlivých úloh rodiči nepomůže přímo, ale součty bodů po úlohách ano: jsou jediným zdrojem o tom, **v čem byli silní ti, kdo se na obor hlásili**.

Rozdělení výsledků všech uchazečů o obor tenhle soubor **není** jediný způsob, jak získat. Data uchazečů nesou `c_m_procentni_skor` u 75 % řádků, tedy u všech, kdo jednotnou zkoušku konali. Položková data proti nim přidávají tři věci: body po jednotlivých úlohách, oddělené termíny místo lepšího výsledku, a hrubé body místo procentního skóru.

### 2.4 Rejstřík škol MŠMT

Dvě podoby téhož. **JSON-LD snímky** (`data/msmt_rejstrik/rssz-*.jsonld`, čtvrtletní, v gitu ignorované kvůli velikosti) se používají na návaznost oborů mezi roky a na doplnění názvů oborů bez jednotné zkoušky. **CSV export** (`data/Rejstrik_skol/`) je jednorázový.

Zajímavé sloupce JSON-LD, mimo adresu a názvy:

| Pole | Obsah | Otázka rodiče | Používáme |
|---|---|---|---|
| `redIzo`, `ico` | identifikátory | která právnická osoba to je | ano |
| `zrizovatele[]` | zřizovatel včetně IČO | kdo za školou stojí | ano, dohledání přes ARES |
| `reditel` | jméno a datum vzniku funkce | jak dlouho vede školu | **ne** |
| `platnostNaDobuNeurcitou` | časové omezení zápisu | hrozí zrušení školy | **ne** |
| `skolyAZarizeni[].obory[].kod`, `.nazev` | obory zapsané v rejstříku | co škola smí učit | ano |
| `skolyAZarizeni[].obory[].kapacita` | povolená kapacita oboru | kolik žáků smí mít | **ne**, používáme kapacitu z CERMATu |
| `skolyAZarizeni[].obory[].dobihajiciObor` | obor se dobíhá | **zavírá škola tenhle obor** | **ne na webu**, jen v rešeršních skriptech |
| `skolyAZarizeni[].obory[].jazykOboru`, `.formaVzdelavani`, `.delkaVzdelavani` | parametry oboru | v jakém jazyce a jak dlouho | ano |
| `skolyAZarizeni[].mistaVyuky[]` | kde se skutečně učí | kam bude dítě dojíždět | částečně |
| `emaily` | kontakty | koho oslovit | **ne** |

CSV export navíc nese `WWW`, `Telefon`, `Email 1`, `Ředitel` a `ID datové schránky`. **Odkaz na web školy nepoužíváme nikde**, přitom je to první věc, kterou rodič po přečtení profilu hledá.

### 2.5 Číselník AKKO

`data/AKKO-Kmenové obory vzdělání (KKOV 5místné).csv`, sloupce `id`, `kod`, `nazev`, `zkracenyNazev`, `specifikace`, `platnostOd`, `platnostDo`, `poznamka`. Dává skupinový název kmenového oboru, například `2368H` je Automechanik. Používáme okrajově; přesnější názvy oborů bere rejstřík.

Sloupce `platnostOd` a `platnostDo` by šly použít na upozornění, že obor končí. **Nepoužíváme.**

### 2.6 Česká školní inspekce, seznam inspekcí

`data/csi/inspections.csv` a snímky v `data/csi_snapshots/` s manifestem, který nese `source_download_url`, `sha256` a rozsah platnosti. Sloupce: `REDIZO`, `Jmeno`, `DatumOd`, `DatumDo`, `LinkIZ` (PDF zprávy), `PortalLink`. Všechny používáme, odvozený tvar je `public/csi_inspections.json` s polem `inspections[]`, `inspectionCount` a `lastInspectionDate`.

Otázka rodiče: **jak čerstvý je posudek na tuhle školu**. Datum poslední inspekce zobrazujeme, počet inspekcí ne.

### 2.7 Inspekční zprávy, extrakce

`data/inspection_extractions.json`, 849 škol. Strojová extrakce z PDF zpráv, u každé školy může být víc zpráv, každá nese `report_id`, rozsah inspekce a `model_id` použitého modelu.

| Pole v `parsed_output` | Obsah | Otázka rodiče | Používáme |
|---|---|---|---|
| `for_parents.strengths[]` | přednosti s doložením | co škola umí | ano |
| `for_parents.risks[]` | výtky s doložením | co jí vytýkají | ano |
| `for_parents.questions_for_open_day[]` | na co se zeptat | co mám zjistit sám | ano |
| `for_parents.who_school_fits` | komu škola sedne | je to škola pro moje dítě | ano |
| `for_parents.who_should_be_cautious` | kdo má být opatrný | není to pro nás past | ano |
| `for_parents.plain_czech_summary` | shrnutí bez žargonu | co si z toho odnést | ano |
| `hard_facts.maturita` | trend a čísla u maturity | jak to tu dopadá u maturity | **jen okrajově** |
| `hard_facts.absence` | absence včetně ročníků | chodí sem děti | **jen okrajově** |
| `hard_facts.support_services[]` | poradenství a podpora | pomůžou dítěti, když bude potřeba | **ne** |
| `school_profile.school_change_summary` | co se od minule změnilo | zlepšuje se škola | ano |

`hard_facts.maturita` je dnes jediný maturitní údaj, který o škole máme, dokud neproběhne import maturitních výsledků. Je to text ze zprávy, ne číslo, takže se nedá srovnávat mezi školami.

### 2.8 INSPIS, profily škol

`data/inspis_school_profiles.json`, 1 180 škol, 43 polí. Vyplněnost je nerovnoměrná a `completeness_pct` ji udává. **Všechna pole používáme**, ale dvě mají past:

- `dny_otevrenych_dveri` je volný text a u části škol obsahuje data z roku 2014. Bez kontroly roku se nesmí zobrazovat jako termín.
- `rocni_skolne` je vyplněné jen u 212 z 1 180 škol. Chybějící hodnota neznamená nula.

Prázdná jsou pole `pripravne_kurzy`, `vyuziti_internetu_ve_vyuce`, `pristup_k_pc` a `stipendium`. Zdroj je nikdy nenaplnil.

### 2.9 Dopravní data

`data/PID`, `data/GTFS_CR`, `data/GTFS_CZ`, `data/KOMPLET` (jízdní řády vlaků), `data/decoded_tt*`, odvozené `data/transit_graph.json` a `public/pid_stops_compact.json`. Standardní GTFS, sloupec po sloupci se nepopisuje; výklad je v [README ke konverzi](../scripts/README_GTFS_CONVERSION.md).

Otázka rodiče je jediná: **jak dlouho bude dítě dojíždět**. Odpovídáme na ni přes `src/app/api/dostupnost/route.ts`.

### 2.10 Odvozené soubory v `public/`

| Soubor | Vzniká z | Skript | Poznámka |
|---|---|---|---|
| `schools_data.json` | CERMAT agregáty + data uchazečů | `build-catalogue-2026.py`, `enrich_schools_data.py` | katalog, ročníky 2024 až 2026 |
| `applications_2026.json` | CERMAT přihlášky 2026 | `import_cermat_2026_real.py` | pole `pp` jsou priority |
| `cermat_results_2026.json` | CERMAT výsledky 2026 a 2025 | `refresh_cermat_data.py` | nese otisk zdroje |
| `school_analysis.json` | starší zpracování | nedohledaný | obsahuje `obtiznost` bez doloženého výpočtu |
| `soubeh_prihlasek_2025.json` | data uchazečů 2025 | `build-soubeh-prihlasek.py` | souběžné přihlášky |
| `pasma_prijeti_2025.json` | data uchazečů 2025 | `build-pasma-prijeti.py` | podíl přijatých podle bodového pásma a hranice |
| `csi_inspections.json` | seznam ČŠI | `process-csi-data.js` | |
| `navaznost_notes.json` | rešerše návaznosti | `build-navaznost-notes.py` | ruční poznámky v `school_notes.json` mají přednost |
| `offer_mapping_2026.json` | párování nabídek | `build-offer-mapping-2026.py` | |
| `cohort_meta.json` | normalizace kohort | ruční | |

### 2.11 CERMAT, maturitní výsledky

Ověřeno na `MZ2026j_SC_skolobory.xlsx`, 13. 9. 2026: 2 199 369 bajtů, kontrolní součet sha256 `6a814e0a…`, shodný s auditem. Listy `2026` a `vysvetlivky`, dvě řádky hlavičky, 98 sloupců, 3 739 řádků. **Stažený v repozitáři není.**

Soubor obsahuje osm úrovní agregace ve sloupci `TŘÍDĚNÍ`:

| Třídění | Řádků | K čemu |
|---|---|---|
| `total` | 1 | celostátní referenční hodnota |
| `typ_skoly`, `smo16` | 5 a 16 | referenční rozdělení pro srovnatelnou skupinu |
| `kraj`, `kraj_typ_skoly`, `kraj_smo16` | 14, 70 a 222 | krajské srovnání |
| `redizo` | 1 112 | škola jako celek |
| `redizo_smo16` | 2 297 | **škola a skupina oborů, nejjemnější úroveň** |

Prvních 13 sloupců je identifikace: `id_row`, `TŘÍDĚNÍ`, `ROK`, `REDIZO`, `NÁZEV ŠKOLY`, `ADRESA ŠKOLY`, `TYP ŠKOLY`, `SMO16`, `KRAJ` a jejich názvy. U agregátních řádků je v `REDIZO` písmeno `x`.

Zbylých 85 sloupců je osm bloků se stejnou stavbou: společná část celkem, čeština, matematika, angličtina, němčina, ruština, francouzština, španělština.

| Sloupec v bloku | Obsah | Otázka rodiče | Používáme |
|---|---|---|---|
| `PŘIHLÁŠENI`, `KONALI`, `NEKONALI` | velikost populace | z kolika lidí to je | **ne** |
| `USPĚLI`, `NEUSPĚLI` | počty | kolik jich maturitu udělalo | **ne** |
| `PODÍL ÚSPĚŠNÝCH (%)` | úspěšní z přihlášených | jaká je šance maturitu udělat | **ne** |
| `ČISTÁ NEÚSPĚŠNOST (%)` | neuspěli z konajících | kolik jich u zkoušky propadlo | **ne** |
| `HRUBÁ NEÚSPĚŠNOST (%)` | neuspěli nebo nekonali z přihlášených | kolik jich maturitu nedokončilo | **ne** |
| `NEÚČAST (%)` | nekonali z přihlášených | kolik jich k maturitě vůbec nešlo | **ne** |
| `PRŮMĚRNÝ % SKÓR` | průměr z didaktického testu | jak dobře tu píší testy | **ne** |
| `SMĚRODATNÁ ODCHYLKA % SKÓRU` | rozptyl výsledků | táhne škola všechny, nebo jen špičku | **ne** |
| `PRŮMĚRNÉ PERCENTILOVÉ UMÍSTĚNÍ` | umístění proti celé zemi | jak si stojí proti ostatním | **ne** |
| `PODÍL VOLBY PŘEDMĚTU (%)` | u druhé povinné zkoušky | volí se tu matematika, nebo jazyk | **ne** |

Rozdíl mezi čistou a hrubou neúspěšností je zásadní a list `vysvetlivky` ho definuje. Čistá počítá z konajících, hrubá z přihlášených a započítává i ty, kdo ke zkoušce nešli. Škola může mít výbornou čistou neúspěšnost proto, že slabé žáky ke zkoušce nepustí.

**Napojení na náš katalog je přímé.** Kódy `SMO16` jsou tytéž, jaké nese sloupec `SKUPINA OBORŮ (16)` v agregátech JPZ: GY8, GY6, GY4, LYC, ST1, ST2, SEK, SHP, SHU, SZE, SZD, SUM, UTE, UOS, NTE, NOS. Zkouška napojení z 13. 9. 2026 dopadla takto:

| Výsledek | Nabídek 2026 |
|---|---|
| Spárováno na úrovni škola a skupina oborů | 2 782 |
| Jen agregát za celou školu | 240 |
| Škola v maturitních datech není | 69 |

Pro 2 782 z 3 091 nabídek tedy existuje maturitní výsledek na úrovni, kterou lze u oboru poctivě zobrazit. Návrh zpracování, deset přejímacích podmínek a rozbor rizik jsou v [maturitní výsledky a kvalita školy](maturitni-vysledky-a-kvalita-skoly-2027.md); slovník vede názvy polí jako kontrakt v oddílu 5.

**Co tenhle zdroj neumí:** týká se jen společné části, tedy didaktických testů. Neobsahuje profilovou část, obhajoby, praktické zkoušky ani uplatnění absolventů. `SMO16` není `KKOV`, takže u školy s více obory v jedné skupině je výsledek společný. A vysoký výsledek může být důsledkem toho, koho škola přijala, ne toho, jak učí.

### 2.12 CERMAT, školní agregáty JPZ 2017–2023

Sedm souborů `JPZ{rok}_skoly-skolobory_vysledky.xlsx`, 18 až 24 sloupců, zhruba 3 300 řádků ročně, kolem 1 070 škol. **Stažené v repozitáři nejsou.** Adresy a kontrolní součty jsou v [podkladu oponentury](podklady/oponentura-2027-r1.json).

Sloupce: identifikace školy a oborové skupiny, `ROČNÍK`, adresa, kraj, zřizovatel, a pak dvakrát blok `PŘIHLÁŠENI`, `KONALI`, `NEKONALI`, `PRŮMĚRNÉ PERCENTILOVÉ UMÍSTĚNÍ`, `SMĚRODATNÁ ODCHYLKA` zvlášť pro češtinu a matematiku.

Otázka rodiče: **jak dlouho už je tahle škola žádaná**. Je to jediný zdroj, ze kterého jde sestavit řadu vstupní úrovně školy delší než dva roky. Schéma se mezi ročníky mění, takže se musí adaptovat a ověřit zvlášť.

Nepoužíváme.

## 3. Sloupce, které nepoužíváme

Tohle je hlavní důvod existence dokumentu. Seřazeno podle toho, kolik by to dalo rodiči.

| Co leží nevyužité | Kde | Na co by to bylo | Proč to zatím nepoužíváme |
|---|---|---|---|
| **Celé maturitní výsledky** | `MZ{rok}j_SC_skolobory.xlsx` | „Maturitu tu loni udělalo 100 % žáků, v češtině jsou nad 80. percentilem.“ Jediná přímá odpověď na otázku, jaké jsou tu nároky. Spárovatelné u 2 782 z 3 091 nabídek | soubor není stažený, import nezačal |
| Vstupní úroveň školy 2017 až 2023 | `JPZ{rok}_skoly-skolobory_vysledky.xlsx` | „Škola je dlouhodobě žádaná, není to výkyv jednoho roku.“ | soubory nejsou stažené |
| Výsledek testu u **všech uchazečů**, nejen přijatých | data uchazečů, `c_m_procentni_skor`, vyplněno u 75 % řádků | „S 62 body byl loni v polovině těch, kdo se sem hlásili.“ Jediný způsob, jak dát dítěti vlastní číslo do kontextu | **zpracováno 13. 9. 2026**, na web zatím nenapojeno |
| **Profil dovedností** uchazečů o obor | položková data, `b1` až `b16.x` | „Kdo se sem dostal, byl silný v porozumění textu.“ Jediný zdroj o tom, co obor vybírá | soubory nikdo nezpracoval |
| Výsledky po termínech zvlášť | položková data, listy A až D | kontrola, zda jsou řádné termíny srovnatelně těžké | data uchazečů nesou jen lepší výsledek |
| **Druhé kolo** přijímacího řízení | `PZ*_kolo2` | „Loni tu po prvním kole zbylo osm míst.“ U nenaplněných oborů je to zásadní | nikdy jsme se na ně nepodívali |
| **Dobíhající obor** | rejstřík, `dobihajiciObor` | „Škola tenhle obor zavírá.“ Varování před podáním přihlášky | používá se jen v rešeršních skriptech |
| **Web a kontakt školy** | rejstřík CSV, `WWW`, `Email 1`, `Telefon` | kam jít pro kritéria přijetí a termíny | v datové vrstvě vůbec není |
| `jpz_prumer_actual`, `jpz_median` | katalog 2025 | medián říká víc než průměr, když je rozdělení šikmé | spočítané, nikdy nezobrazené |
| `hard_facts.support_services` | extrakce inspekce | „Mají školního psychologa a doučování.“ | nezobrazeno |
| `hard_facts.absence` | extrakce inspekce | absence po ročnících je signál o atmosféře | jen okrajově |
| Důvod nepřijetí u jednotlivce | data uchazečů, `ss*_duvod_neprijeti` | rozpad už máme z agregátu | duplicitní |
| Platnost oboru v číselníku | AKKO, `platnostDo` | obor se ruší celostátně | nezobrazeno |
| Ředitel a délka jeho funkce | rejstřík, `reditel` | stabilita vedení | sporná vypovídací hodnota |

**Duplicity, které je třeba srovnat.** `school_analysis.json` už nese `priority_pcts`, tedy podíl priorit v procentech, a `total_applicants`. Je to totéž, co od 13. 9. 2026 počítáme jako podíl prvních voleb, ale ze staršího zpracování. U 1 550 z 1 602 nabídek se `total_applicants` shoduje s `prihlasky`; rozdíl u zbytku vzniká tím, že data uchazečů neznají zaměření, takže sčítají všechna zaměření jednoho KKOV dohromady. Jako zdroj pravdy platí `prihlasky_priority` z agregátů CERMATu.

## 4. Pasti, které platí napříč zdroji

1. **Zaměření.** Agregáty ho znají, data uchazečů ne. Cokoli počítaného z uchazečů platí za celý KKOV školy.
2. **Přihláška není uchazeč.** Jeden uchazeč podává až tři přihlášky, takže součty napříč obory počítají tytéž děti víckrát.
3. **Škála skóru.** Data uchazečů mají ČJ+MA v rozsahu 0 až 200 %, katalog v rozsahu 0 až 100 bodů. Poměr je dvě ku jedné.
4. **Chybějící údaj není nula.** U indexu obtížnosti se takhle 386 oborů bez dat tvářilo jako nejsnazší.
5. **Rok 2026 je neúplný.** Máme přihlášky, kapacity a výsledky, ale ne data uchazečů. Cokoli z uchazečů odvozeného je za rok 2025.
6. **Malé počty.** 1 586 ze 4 350 oborů má méně než deset přijatých. Minimum a medián jsou tam velmi kolísavé.

## 5. Jak přidat zdroj nebo sloupec

1. Zapiš zdroj do oddílu 1 s původem, rozsahem, klíčem a četností aktualizace.
2. Vypiš jeho sloupce do oddílu 2 včetně těch, které nepoužiješ. Sloupec, který v soupisu chybí, nikdo podruhé nenajde.
3. U každého sloupce napiš otázku rodiče, na kterou by šel použít. Když žádná není, napiš to.
4. Nepoužité sloupce s reálnou hodnotou přidej do oddílu 3.
5. Zavádíš-li z toho ukazatel, zapiš ho do [slovníku ukazatelů](slovnik-ukazatelu.md) dřív, než ho zobrazíš.

## 6. Historie

| Verze | Změna |
|---|---|
| 1.2 | Doplněn odvozený soubor pásem přijetí; výsledky všech uchazečů už nejsou nevyužité. |
| 1.1 | Doplněny maturitní výsledky a školní agregáty JPZ 2017–2023, tedy ověřené zdroje, které nejsou stažené v repozitáři. První verze je vynechala, protože vznikla procházením adresáře `data/`. |
| 1.0 | První soupis. Vznikl po zjištění, že tři použitelné údaje ležely nepoužité ve zdrojích, které projekt už zpracovával. |
