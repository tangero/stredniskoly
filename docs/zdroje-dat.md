# Zdroje dat

Verze 1.11 · 18. 9. 2026 · **Závazný soupis. Před návrhem stránky nebo funkce se prochází celý.**

Tenhle dokument vznikl kvůli konkrétní chybě. Návrh stránky školy jsem sestavil z toho, co web už zobrazoval, místo z toho, co je ve zdrojových souborech. Tři užitečné údaje proto ležely nepoužité v souborech, které jsem měl otevřené: rozpad přihlášek podle priority jako podíl, souběžné přihlášky uchazečů a nejnižší výsledek jednotné zkoušky mezi přijatými. Poslední z nich byl dokonce už spočítaný a uložený v katalogu, zatímco [slovník ukazatelů](slovnik-ukazatelu.md) tvrdil, že ho nemáme.

Soupis jde proto **po sloupcích**, ne po polích, která se dnes zobrazují. U každého sloupce stojí, na jakou otázku rodiče by šel použít a jestli ho používáme.

## Povinný krok před návrhem

Než navrhneš stránku, sekci nebo ukazatel:

1. **Projdi oddíl 2 celý.** Ne jen zdroj, který máš zrovna v ruce.
2. **Projdi oddíl 3**, tedy soupis sloupců, které nepoužíváme. Je to jediné místo, kde se nevyužitá data dají najít, aniž bys věděl, že existují.
3. **Do návrhu napiš, které sloupce jsi zvážil a zamítl**, a proč. Zamítnutí je platný závěr, mlčení není.
4. **Přidáváš-li zdroj nebo sloupec, doplň ho sem** ve stejné dávce. Postup je v oddílu 6.
5. **Pracuješ-li s obdobím dat**, tedy ukazuješ, importuješ nebo přepínáš ročník, řiď se registrem stavu datových sad v oddílu 5.

Ukazatel se pak zavádí podle [slovníku ukazatelů](slovnik-ukazatelu.md). Tenhle dokument říká, **co existuje**, slovník říká, **jak se to jmenuje a počítá**.

## 1. Přehled zdrojů

| Zdroj | Původ | Rozsah | Klíč | Aktualizace |
|---|---|---|---|---|
| CERMAT, agregovaná data za obory | data.cermat.cz, XLSX | 1. kolo 2025 a 2026 | REDIZO + KKOV + zaměření | ročně po zveřejnění |
| CERMAT, data uchazečů | data.cermat.cz, XLSX | 1. a 2. kolo od 2024 | řádek = uchazeč | předběžně v květnu téhož roku, finálně o rok později |
| CERMAT, položková data JPZ | data.cermat.cz, XLSX | 2024 a 2025, 6 testů ročně | řádek = uchazeč a test | ročně |
| Rejstřík škol MŠMT, JSON-LD | rejstriky.msmt.gov.cz | 4 čtvrtletní snímky | REDIZO | čtvrtletně |
| Rejstřík škol MŠMT, CSV | rejstriky.msmt.gov.cz | jeden export | REDIZO + IZO + obor | ručně |
| Číselník AKKO | MŠMT | kmenové obory | 5místný kód | zřídka |
| Česká školní inspekce, seznam | opendata.csicr.cz | 9 564 škol | REDIZO | snímky s manifestem |
| Inspekční zprávy, extrakce | vlastní zpracování zpráv ČŠI | 849 škol | REDIZO | při nové zprávě |
| INSPIS, profily škol | portál ČŠI | 1 180 škol | REDIZO | ručně |
| CERMAT, maturitní výsledky | data.cermat.cz, XLSX | jaro 2015 až 2026, stav po podzimu do 2025 | REDIZO, volitelně + SMO16 | ročně |
| CERMAT, školní agregáty JPZ 2017–2023 | data.cermat.cz, XLSX | 7 ročníků | REDIZO + oborová skupina | uzavřená řada |
| CERMAT, agregáty 2. kola | data.cermat.cz, XLSX | kapacity, přihlášky, výsledky od 2024 | REDIZO + KKOV + zaměření | ročně, výsledky v září |
| Dopravní data | PID, GTFS ČR, jízdní řády | celá ČR | zastávka a spoj | podle vydání |
| Harmonogram přijímacího řízení MŠMT | opis termínů z metodiky MŠMT do `src/data/admissions-2027.json` | jedno přijímací řízení, 3 skupiny a 20 událostí | identifikátor události | ručně, jednou ročně |

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

Soubor výsledků má **91 sloupců** a stejnou stavbu v 1. i 2. kole. Verze 1.4 tohoto soupisu uváděla jen sedm z nich; zbytek doplněn 13. 9. 2026 při zapracování 2. kola. Sloupce 0 až 30 jsou shodné s tabulkou výše.

| Sloupce | Obsah | Otázka rodiče | Používáme |
|---|---|---|---|
| 31 `KAPACITA`, 32 `INDEX POPTÁVKY`, 33 `PŘIHLÁŠKY CELKEM` | stejné jako v souboru přihlášek | jaký je zájem | ano |
| 34 `PŘIJATÍ` | počet přijatých | naplnili obor | ano |
| 35–39 `PŘIHLÁŠKY - PRIORITA 1` až `5` | přihlášky podle pořadí | je to škola první volby | ano |
| 40–44 `PŘIJATÍ - PRIORITA 1` až `5` | přijatí podle pořadí na přihlášce | dostávají se sem ti, kdo ji chtěli nejvíc | **ano od 13. 9. 2026** v `souhrny_kolo1.json` jako přijatí podle priority; za rok 2026 vyplněno u 6 274 z 6 368 řádků |
| 45–47 `ČJ+MA`, `ČJ`, `MA - KONALI` | kolik uchazečů o obor psalo zkoušku | z kolika lidí jsou výsledky | `ČJ+MA - KONALI` **ano** v `souhrny_kolo1.json` jako jmenovatel; předměty zvlášť ne |
| 48–56 `% SKÓR - PRŮMĚR`, `MIN`, `MAX` všech uchazečů | výsledky všech, kdo se hlásili, nejen přijatých | jak si stojí konkurence | **ne** |
| 57–65 `PERCENTIL - PRŮMĚR`, `MIN`, `MAX` všech uchazečů | totéž jako celostátní percentil | kde je konkurence proti celé zemi | sloupec 57 **ano** jako průměrné percentilové umístění uchazečů; minimum, maximum a předměty ne, minimum a maximum určuje jediný uchazeč |
| 66–68 `KONALI (PŘIJATI)` | kolik přijatých má výsledek zkoušky | z kolika lidí je průměr přijatých | **ne** |
| 69–71 `% SKÓR - PRŮMĚR (PŘIJATI)` | průměr přijatých | s jakými spolužáky se dítě potká | ano |
| 72–74 `% SKÓR - MIN (PŘIJATI)` | **oficiální nejnižší výsledek přijatých**, po nabídkách včetně zaměření | s kolika body se sem někdo dostal | **ne**, počítáme ho sami z dat uchazečů bez zaměření, viz níže |
| 75–77 `% SKÓR - MAX (PŘIJATI)` | nejvyšší výsledek přijatých | rozpětí třídy | **ne** |
| 78–86 `PERCENTIL - PRŮMĚR`, `MIN`, `MAX (PŘIJATI)` | percentily přijatých | kde je hranice proti celé zemi | sloupec 78 **ano** jako průměrné percentilové umístění přijatých, sloupec 81 jako `min_prijaty_percentil_souhrn`; maximum a předměty ne |
| 87 `NEPŘIJATI - PŘIJAT NA VYŠŠÍ PRIORITU` | nepřijati sem, protože přijati na obor uvedený výš | jak často je to náhradní volba | ano |
| 88 `NEPŘIJATI - NEDOSTATEČNÁ KAPACITA` | splnili, ale nevešli se | jak velký je přetlak | ano |
| 89 `NEPŘIJATI - NESPLNĚNÍ PODMÍNEK` | neuspěli u podmínek školy | má škola vlastní požadavky | ano |
| 90 `NEPŘIJATI - VZDAL SE PŘIJETÍ` | odstoupili | okrajové | ano |

**Oficiální minimum přijatých odpovídá našemu výpočtu.** U 2 601 nabídek roku 2025 s jediným zaměřením se sloupec 72 shoduje s nejnižším přijatým spočítaným z dat uchazečů u 2 518, tedy u 97 %; rozdíly jsou převážně u nástaveb 64-41-L/51. Oficiální sloupec je navíc po zaměřeních a za rok 2026 vyplněn u 3 207 řádků. Hranici mezi nepřijatými, tedy horní mez pásma nejistoty, soubor nenese; ta dál vyžaduje data uchazečů.

Verze 1.4 tu tvrdila, že z tohoto zdroje nelze zjistit nejnižší přijatý výsledek a že přijatí podle priority za rok 2026 nejsou zveřejněni. Obojí bylo nepravdivé.

**Druhé kolo** vychází ve stejných třech souborech se stejnou stavbou: `PZ{rok}_kolo2_skolobory_kapacity.xlsx`, `…_prihlasky.xlsx` a `…_vysledky.xlsx`. Identifikátor `ID_SOF` se mezi koly **liší**; nabídky se párují podle `REDIZO`, `KKOV`, `ZAMĚŘENÍ OBORU`, `FORMA VZDĚLÁVÁNÍ`, `DÉLKA STUDIA`, `ZKRÁCENÉ STUDIUM` a `JAZYK STUDIA`. V roce 2026 má 2. kolo 1 060 denních nezkrácených nabídek s povinnou zkouškou, 886 z nich se spáruje s 1. kolem a 174 existuje jen ve 2. kole. Denní forma se v souborech vyskytuje i jako „den2“.

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
| `skolyAZarizeni[].obory[].dobihajiciObor` | obor se dobíhá | **doběhl tenhle obor, nebo ho škola letos jen nevypsala** | **ne na webu**, jen v rešeršních skriptech; párovat vždy i na formu a délku, viz oddíl 3 |
| `skolyAZarizeni[].obory[].jazykOboru`, `.formaVzdelavani`, `.delkaVzdelavani` | parametry oboru | v jakém jazyce a jak dlouho | ano |
| `skolyAZarizeni[].mistaVyuky[]` | kde se skutečně učí | kam bude dítě dojíždět | částečně |
| `emaily` | kontakty | koho oslovit | **ne** |

CSV export navíc nese `WWW`, `Telefon`, `Email 1`, `Ředitel` a `ID datové schránky`. **`WWW` používáme od 13. 9. 2026** jako odkaz na kritéria přijetí na stránce oboru (`public/skoly_web.json`, `scripts/build-skoly-web.py`). Telefon a e-mail nezobrazujeme (e-mail slouží portálu pro školy), ředitele ne (osobní údaj bez vypovídací hodnoty).

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
| `kontext_prihlasek_{rok}.json` | data uchazečů, rejstřík škol MŠMT (názvy) | `build-kontext-prihlasek.py` | výsledek uchazečů o obor, obory výš a níž na přihlášce, odvozená hranice úspěšnosti; linka přepočítává s pásmy a souběhem; pole `mimo_prehled` nese název školy, obce a oboru u oborů, které katalog nevede (z `scripts/nazvy_oboru.py`, stejně jako souběžné přihlášky), a příznak kategorie bez jednotné zkoušky (C, E, H, J, P); rozsah dopadu vypíše `scripts/dopad-mimo-prehled.py` |
| `skoly_web.json` | rejstřík CSV, `WWW` | `build-skoly-web.py` | odkaz na web školy |
| `souhrny_kolo1.json` | CERMAT souhrny 1. kola všech ročníků v `data/` | `build-souhrny-kolo1.py` | nabídky po ročnících, párování ročníků (i podle mapy nabídek ročníku), rozdělení tlaku prvních voleb ve srovnatelných skupinách; doklad `docs/podklady/overeni-srovnani-rocniku.json` |
| `school_analysis.json` | starší zpracování | nedohledaný | obsahuje `obtiznost` bez doloženého výpočtu |
| `maturita_skoly.json` | CERMAT maturita, jaro, `redizo` a `redizo_smo16` | `build-maturita-skoly.py` přes datovou linku | společná část, čeština a matematika po letech od 2021; zařazení proti skupině oborů; meze zveřejnění jako kódy kvality; vzniká přes datovou linku od 14. 9. 2026 (PR #92), web ho čte na stránce školy |
| `soubeh_prihlasek_2025.json` | data uchazečů 2025 | `build-soubeh-prihlasek.py` | souběžné přihlášky; popis školy z katalogu přes `scripts/nazvy_oboru.py` — ročníky od nejnovějšího, uvnitř ročníku podle `id` abecedně (viz poznámka níže) |
| `pasma_prijeti_2025.json` | data uchazečů 2025 | `build-pasma-prijeti.py` | podíl přijatých podle bodového pásma a hranice |
| `csi_inspections.json` | seznam ČŠI | `process-csi-data.js` | |
| `navaznost_notes.json` | rešerše návaznosti | `build-navaznost-notes.py` | ruční poznámky v `school_notes.json` mají přednost |
| `offer_mapping_2026.json` | párování nabídek | `build-offer-mapping-2026.py` | nabídka 2026 → loňský klíč katalogu; kromě heuristik přebírá ručně ověřené páry z `docs/podklady/overene-pary-nabidek-2026.csv` (sloupce `id_2026`, `katalog_id`, `doklad`); čte ji katalog 2026, souhrny 1. kola i hledání souhrnu na stránce |
| `cohort_meta.json` | normalizace kohort | ruční | |

**Který záznam katalogu popisuje obor.** Klíč `REDIZO_KKOV` nenese zaměření, takže ho může nést několik nabídek téže školy, a ty se mohou lišit názvem, obcí i oborem: PORG má pod jedním klíčem osmileté gymnázium v Praze, Brně i Ostravě. V katalogu 2026 je takových klíčů **43**, v ročnících 2024 a 2025 po jednom.

`scripts/nazvy_oboru.py` proto vybírá stejně jako `nazvyOboru()` na webu: nejdřív **nejnovější ročník**, který klíč vede, a mezi nabídkami téhož ročníku **první v pořadí souboru**. Obě strany tak dávají identický popis — ověřeno na všech 5 434 klíčích, které souběh používá, s nulovým rozdílem. Do září 2026 se pravidla lišila: Python bral starší ročník, takže popis školy zněl v souběhu jinak než na stránce oboru.

Vybírat mezi nabídkami téhož ročníku abecedně podle `id` bylo zvažováno a **zavrženo**: u PORG by vyhrálo Brno jen proto, že jeho `id` je bez diakritiky, a obec by se proti dosavadnímu stavu změnila bez jakéhokoli dokladu, že je nová správnější. Nejednoznačnost se místo toho **hlásí** při každém běhu generátoru; rozhodnout ji z dat nejde, musela by odpovědět škola nebo rejstřík, která nabídka klíč zastupuje. Pořadí v souboru není záruka stability napříč přegenerováním katalogu — je to jen shoda s tím, co ukazuje stránka oboru.

Přechod na nejnovější ročník změnil popis u **36 klíčů, tedy 32 škol**: 30 dostalo delší název, nejčastěji o číslo popisné, **žádný se nezkrátil**, a 6 má jinou obec. U obcí to **není jednosměrné zlepšení** — Soukromá obchodní akademie Opava má místo Ostravy Opavu, ale MŠ Montessori Beroun má místo Berouna Králův Dvůr. Který zápis je správný, z katalogu nepoznáme. Rozpad, metoda výpočtu a všechny případy jsou v [dokladu](podklady/dopad-precedence-nazvu-2026-09-18.md).

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

### 2.13 Harmonogram přijímacího řízení MŠMT

`src/data/admissions-2027.json`, ruční opis termínů z metodiky MŠMT. Pole `checkedAt` nese datum ověření, `source` a `jpzSource` adresy, ze kterých se termíny opsaly. Tři skupiny (`stredni-skoly`, `konzervatore`, `jpz`) a 20 událostí.

| Pole události | Obsah | Otázka rodiče | Používáme |
|---|---|---|---|
| `id` | identifikátor události, například `ss-kriteria` | žádná, technické | ano, stránka podle něj vybírá termín |
| `start`, `end` | rozsah termínu | do kdy to musím stihnout | ano |
| `date` | termín slovy, například „15.–31. ledna“ | tamtéž | ano |
| `title` | název události | co se v ten den děje | ano |
| `note` | doporučení k události | co mám udělat | ano, na stránce přijímaček |

Používá ho stránka [přijímačky 2027](../src/app/prijimacky-2027/page.tsx) a od 17. 9. 2026 i **hlavní stránka**: z události `ss-kriteria` bere termín, kdy školy zveřejní kritéria přijetí a s nimi nabídku oborů. Rok, ze kterého web ukazuje obory a místa, bere z registru (sada `cermat-prihlasky`), ne z tohoto souboru.

V registru je jako sada `msmt-harmonogram`, období 2027, obnova nejpozději do 30. 9. 2027. Termíny se opisují ručně z harmonogramu a ze sdělení o termínech na webu MŠMT; adresy obou souborů nesou ročník i měsíc vydání, takže se při novém přijímacím řízení mění celé a dotazem HEAD na starou adresu se nová data nepoznají. Kontrola proto hlídá termín obnovy, ne zdroj.

Soubor nese rok v názvu: nový ročník znamená nový soubor a přepnutí období v registru.

## 3. Sloupce, které nepoužíváme

Tohle je hlavní důvod existence dokumentu. Seřazeno podle toho, kolik by to dalo rodiči.

| Co leží nevyužité | Kde | Na co by to bylo | Proč to zatím nepoužíváme |
|---|---|---|---|
| **Celé maturitní výsledky** | `MZ{rok}j_SC_skolobory.xlsx` | „Maturitu tu v roce 2026 udělalo 100 % žáků, v češtině jsou nad 80. percentilem.“ Jediná přímá odpověď na otázku, jaké jsou tu nároky. Spárovatelné u 2 782 z 3 091 nabídek | **zpracovává se od 14. 9. 2026** přes datovou linku do `public/maturita_skoly.json` (společná část, čeština, matematika, jaro 2021+); cizí jazyky, stav po podzimu a roky před 2021 zamítnuty v [návrhu stránky školy](stranka-skoly-2027.md), oddíl 10 |
| Vstupní úroveň školy 2017 až 2023 | `JPZ{rok}_skoly-skolobory_vysledky.xlsx` | „Škola je dlouhodobě žádaná, není to výkyv jednoho roku.“ | soubory nejsou stažené |
| Výsledek testu u **všech uchazečů**, nejen přijatých | data uchazečů, `c_m_procentni_skor`, vyplněno u 75 % řádků | „S 62 body byl loni v polovině těch, kdo se sem hlásili.“ Jediný způsob, jak dát dítěti vlastní číslo do kontextu | **zpracováno 13. 9. 2026**, na web zatím nenapojeno |
| **Profil dovedností** uchazečů o obor | položková data, `b1` až `b16.x` | „Kdo se sem dostal, byl silný v porozumění textu.“ Jediný zdroj o tom, co obor vybírá | soubory nikdo nezpracoval |
| Výsledky po termínech zvlášť | položková data, listy A až D | kontrola, zda jsou řádné termíny srovnatelně těžké | data uchazečů nesou jen lepší výsledek |
| **Oficiální nejnižší a nejvyšší výsledek přijatých** a jejich percentily | souhrny výsledků, sloupce 72–86 | „S 65 body se sem loni někdo dostal“ po zaměřeních a za aktuální rok, bez dat uchazečů | počítáme vlastní minimum z dat uchazečů za rok 2025 bez zaměření; oficiální sloupec se shoduje u 97 % oborů |
| **Přijatí podle priority** | souhrny výsledků, sloupce 40–44 | „Tři čtvrtiny přijatých si obor zapsaly jako první volbu“ | **zpracováno 13. 9. 2026** do `souhrny_kolo1.json`, na web zatím nenapojeno, viz `docs/grafy-skoly-a-oboru-2027.md` |
| Výsledky zkoušky **všech uchazečů** o obor v souhrnu | souhrny výsledků, sloupce 45–65 | průměr, minimum a maximum konkurence bez zpracování dat uchazečů | průměrné percentilové umístění **zpracováno 13. 9. 2026**; minimum a maximum zamítnuto, určuje je jediný uchazeč |
| **Agregáty 2. kola** za obory | `PZ{rok}_kolo2_skolobory_*.xlsx` | „Loni tu bylo 2. kolo s 12 místy“ | **zapracovává se od 13. 9. 2026**, viz `docs/druhe-kolo.md` |
| **Data uchazečů 2. kola** | `PZ{rok}_kolo2_uchazeci_prihlasky_vysledky.xlsx` | pásma přijetí ve 2. kole | zamítnuto pro 2. kolo: jen 133 oborů má ve 2. kole aspoň deset přijatých s výsledkem zkoušky |
| **Dobíhající obor** | rejstřík, `dobihajiciObor` | **ne varování před přihláškou**, ale rozlišení „obor se už nenabírá“ od „obor škola letos nevypsala“ u chybějící nabídky | **používá se od 18. 9. 2026** v bloku „Obory z dřívějších let“ na stránce školy; `scripts/build-dobihajici-obory.py` → `public/dobihajici_obory.json` (602 denních oborů ze snímku 30. 6. 2026), z toho se v zobrazeném ročníku trefí **jediná** nabídka a ta vypsaná není. Ze 602 klíčů nese 404 starý trojmístný kód oboru, který katalog nepoužívá; **normalizovat se nesmí**, protože u 180 oborů ve 92 školách je nový kód téhož oboru vypsaný v 1. kole 2026 |
| **Web a kontakt školy** | rejstřík CSV, `WWW`, `Email 1`, `Telefon` | kam jít pro kritéria přijetí a termíny | `WWW` **používáno od 13. 9. 2026** (`skoly_web.json`); telefon a e-mail na web nepatří |
| `jpz_prumer_actual`, `jpz_median` | katalog 2025 | medián říká víc než průměr, když je rozdělení šikmé | spočítané, nikdy nezobrazené |
| `hard_facts.support_services` | extrakce inspekce | „Mají školního psychologa a doučování.“ | nezobrazeno |
| `hard_facts.absence` | extrakce inspekce | absence po ročnících je signál o atmosféře | jen okrajově |
| Důvod nepřijetí u jednotlivce | data uchazečů, `ss*_duvod_neprijeti` | rozpad už máme z agregátu | duplicitní |
| Platnost oboru v číselníku | AKKO, `platnostDo` | obor se ruší celostátně | nezobrazeno |
| Ředitel a délka jeho funkce | rejstřík, `reditel` | stabilita vedení | sporná vypovídací hodnota |

**Dobíhající obor neříká, co se od něj čekalo.** Do 17. 9. 2026 tu stálo, že příznak poslouží jako varování „škola tenhle obor zavírá“ před podáním přihlášky. Měření to vyvrátilo: proti snímku rejstříku k 30. 6. 2026 je **nula z 3 091 nabídek** 1. kola 2026 vedena jako dobíhající. Hrubý join na REDIZO a KKOV dá 29 zásahů, ale **všech 29 je falešných** — pokaždé dobíhá jiná forma nebo délka téhož oboru, typicky dálková nástavba vedle denní. Závěr platí i při nejširší definici druhu školy. Reprodukuje `python3 scripts/dobihajici-obory.py`, doklad `docs/podklady/dobihajici-obory.json`.

Použitelná role je opačná: ze 723 dobíhajících záznamů středních škol se jich **722 v 1. kole 2026 nenabíralo v žádné formě**. Příznak tedy rozliší „obor už se nenabírá“ od „obor škola v tomto roce nevypsala“, což je přesně to, co chybí [dvouletému cyklu nabídky oboru](dvoulety-cyklus-nabidky-oboru.md). Dvě pravidla pro jakékoli použití: **párovat REDIZO + KKOV + forma + délka** (na hrubém klíči je chybovost 100 %) a používat **jen u nabídky, která v zobrazeném ročníku chybí**.

**Jak si vedou absolventi školy: zdroj neexistuje, a to ani mimo projekt.** Rešerše ze 17. 9. 2026 hledala, čím odpovědět na otázku po uplatnění absolventů konkrétní školy. Výsledek je záporný a zapisuje se sem, aby ho nikdo nehledal podruhé.

| Zdroj | Nejjemnější úroveň | Proč nepoužít |
|---|---|---|
| Infoabsolvent.cz (NPI ČR) | obor KKOV × kraj, **ne škola** | není v katalogu otevřených dat, tabulky jsou obrázky v PDF |
| MPSV, pololetní statistiky absolventů | **IZO školy × obor** | jediný nález s IZO, a přesto nepoužitelný, viz níže |
| MPSV, otevřená data „Kvalifikační struktura absolventů“ | okres × kategorie vzdělání | školy v ní nejsou |
| MŠMT, matrika SIMS, přechod na VŠ | kategorie vzdělání × přijímající VŠ | na úrovni školy neexistuje |
| Národní katalog otevřených dat | — | sada „uplatnění absolventů“ ani „nezaměstnanost absolventů“ v katalogu **není** |
| ČSÚ | ČR a kraje | školy nejsou předmětem |

Soubor MPSV nese IZO, a přesto z něj ukazatel udělat nejde: chybí **jmenovatel** (uvádí jen počet absolventů v evidenci úřadu práce, ne počet absolventů školy), okres je okres evidence uchazeče a ne sídlo školy, počty jsou mikroskopické (6 354 z 8 881 řádků má hodnotu 1, medián 6 osob na IZO) a řada se přestala doplňovat po 30. 9. 2024. Rozhodující je pátý důvod: **jmenovatel označuje za nevěrohodný sám jeho správce** — MŠMT píše, že školy do matriky nedoplňují složenou maturitu u celých ročníků a že u 11 % gymnázií se do vysokoškolského studia zapsalo víc absolventů, než jich ten rok maturovalo. Postavit na tom ukazatel by znamenalo tvrdit víc než ministerstvo, které data sbírá.

Zamítnuta je i **krajová míra nezaměstnanosti za skupinu oborů**: odpovídá na otázku o trhu práce v kraji, ne o této škole, a na stránce školy svádí přisoudit kraj škole. Rozbor je v [využití nepoužitých dat](navrh-vyuziti-nepouzitych-dat-2027.md), oddíl 3.1. Rozhodnutí se mění jen novým zdrojem zapsaným sem.

**Duplicity, které je třeba srovnat.** `school_analysis.json` už nese `priority_pcts`, tedy podíl priorit v procentech, a `total_applicants`. Je to totéž, co od 13. 9. 2026 počítáme jako podíl prvních voleb, ale ze staršího zpracování. U 1 550 z 1 602 nabídek se `total_applicants` shoduje s `prihlasky`; rozdíl u zbytku vzniká tím, že data uchazečů neznají zaměření, takže sčítají všechna zaměření jednoho KKOV dohromady. Jako zdroj pravdy platí `prihlasky_priority` z agregátů CERMATu.

## 4. Pasti, které platí napříč zdroji

1. **Zaměření.** Agregáty ho znají, data uchazečů ne. Cokoli počítaného z uchazečů platí za celý KKOV školy.
2. **Přihláška není uchazeč.** Jeden uchazeč podává až tři přihlášky, takže součty napříč obory počítají tytéž děti víckrát.
3. **Škála skóru.** Data uchazečů mají ČJ+MA v rozsahu 0 až 200 %, katalog v rozsahu 0 až 100 bodů. Poměr je dvě ku jedné.
4. **Chybějící údaj není nula.** U indexu obtížnosti se takhle 386 oborů bez dat tvářilo jako nejsnazší.
5. **Data uchazečů zaostávají za souhrny.** Web má přihlášky, kapacity a výsledky za rok 2026, ale data uchazečů jen za rok 2025, a to v předběžné verzi. CERMAT data uchazečů za rok 2026 zveřejnil už 20. 5. 2026; nepřevzali jsme je. Cokoli z uchazečů odvozeného je proto zatím za rok 2025. Do 13. 9. 2026 tu stálo, že data za rok 2026 neexistují.
6. **Malé počty.** 1 586 ze 4 350 oborů má méně než deset přijatých. Minimum a medián jsou tam velmi kolísavé.

## 5. Stav datových sad

Každá datová sada, kterou web nebo analýza používá, má záznam v registru `public/stav_datovych_sad.json`. Registr je jediné místo, které určuje, **které období sady se zobrazuje**. Kód ani dokumenty období napevno neurčují.

### Co registr u každé sady říká

| Pole | Význam |
|---|---|
| `zobrazeno` | Období, které web právě ukazuje, a odkud pochází: soubor, datum stažení nebo platnosti |
| `ocekavano` | Jaké období čekáme, kdy a s jakou jistotou: `znamo` doložené zdrojem, `odhad` se zdůvodněním, `neznamo` |
| `po_prepnuti` | Jakou roli dostanou stará data, například srovnání ročníků |
| `obnovit_nejpozdeji` | U průběžných a ručních sad termín, po kterém jsou data považována za zastaralá |
| `vystupy` | Odvozené soubory, které ze sady vznikají |
| `ukazatele` | Ukazatele ze [slovníku](slovnik-ukazatelu.md), které na sadě stojí; názvy musí přesně odpovídat nadpisům slovníku |
| `kontrola_obdobi` | Soubor a pole, podle kterých se ověří, že období v registru odpovídá skutečným datům |

Ukazatel spočítaný z více sad, například přihlášky na místo, je v oddílu `ukazatele_z_vice_sad`. Zobrazí se z nejstaršího ze zobrazených období těchto sad, takže nikdy nesmíchá kapacitu jednoho roku s přihláškami jiného.

### Pravidla

1. **Staré období se zobrazuje, dokud nové neprošlo přepnutím.** Pokud máme výsledky 2025 a ne 2026, ukazujeme 2025 s rokem 2025. Po přepnutí se rok 2025 ukazuje jen jako historie a kontext vývoje.
2. **Přepíná se sada, ale nabídka si bere nejbližší starší období, které má.** Obor, který škola v novém roce nevypsala, ukáže poslední rok, kdy existoval, a řekne to.
3. **Očekávaný termín se hlídá.** Kontrola varuje, když termín uplynul a sada se nepřepnula, nebo když uplynula lhůta obnovy.
4. **Registr se ručně neupravuje.** Mění se skriptem, aby každé přepnutí mělo záznam v `historie_prepnuti`.

### Postup přepnutí na nové období

1. **Import.** Importní skript nahraje nové období do dat, ale registr zatím ukazuje staré.
2. **Ověření.** Proběhnou kontroly importu, párování nabídek na stabilní identifikátory, dokladové skripty a testy.
3. **Přepnutí.** Skript změní období v registru a zapíše doklad:
   ```
   python3 scripts/stav-datovych-sad.py prepni cermat-vysledky 2027 \
     --kdy 2028-08 --zduvodneni "Výsledky 2027 vyšly v srpnu 2027." \
     --doklad "commit importu, testy prošly"
   ```
   Přepnutí se neuloží, pokud období v registru neodpovídá datům; nelze tak přepnout na rok, který ještě není naimportovaný.
4. **Vrácení.** Když se po přepnutí objeví chyba, jeden příkaz vrátí předchozí období:
   ```
   python3 scripts/stav-datovych-sad.py vrat cermat-vysledky --duvod "chyba v importu"
   ```
5. **Kontrola** běží při každé změně dat a v přípravě nasazení:
   ```
   python3 scripts/stav-datovych-sad.py kontrola
   ```

Přidává-li se nová sada nebo nový ukazatel, zapisuje se do registru ve stejné dávce. Kontrola selže, když ukazatel ze slovníku nepatří žádné sadě.

### Jak se sady aktualizují a co jde automatizovat

U každé sady vede registr v bloku `aktualizace`, odkud nová data přicházejí, jak se pozná, že vyšla, čím se importují, jakou úroveň automatizace sada unese a co musí udělat člověk. Přehled je v druhé tabulce níže.

Zjištění, co zdroje zveřejnily, je automatické a nic nestahuje:

```
python3 scripts/stav-datovych-sad.py zjisti
```

Příkaz pošle na sledované adresy dotaz HEAD. Nezveřejněný soubor vrací 404, přepsaný soubor nové datum `Last-Modified`. Takto se 13. 9. 2026 ukázalo, že CERMAT zveřejnil data o uchazečích za rok 2026 už 20. 5. 2026, že přepsal soubory za roky 2025 i 2026 a že existují agregáty 2. kola, které soupis neznal.

**Doporučené uspořádání automatizace ve třech vrstvách:**

1. **Detekce, týdně, pro všechny sady.** Workflow v GitHub Actions spustí `zjisti` a při novém souboru nebo novém datu změny založí úkol „nová data k převzetí“. Je levná a pokrývá i revize.
2. **Příprava, pro sady s importérem.** Workflow soubor stáhne, spustí import, dokladové skripty a testy a otevře pull request s rozdílem počtů. Stejný vzor už používá obnova seznamu inspekcí.
3. **Převzetí, vždy člověk.** Revize pull requestu, sloučení a `prepni`. Nasazení po sloučení zajistí Vercel.

Plné převzetí bez člověka se nedoporučuje: CERMAT soubory přepisuje i mění jejich strukturu, při revizi dat uchazečů přejmenoval list z „data“ na „Sheet 1“; převzetí dat uchazečů mění doklady v dokumentech; a nové nabídky je nutné párovat, v roce 2026 zůstalo 56 nejednoznačných.

**Co automatizaci dnes brání:**

- **Pull requesty obnovy inspekcí nikdo neslučuje.** Workflow běží každý týden úspěšně, pull request #54 s daty ze 7. 9. 2026 je otevřený od 13. 4. 2026. Web proto ukazuje seznam inspekcí z 11. 2. 2026.
- **Zdroj profilů InspIS zmizel.** Datová sada 70 z otevřených dat ČŠI vrací 404, workflow od 10. 8. 2026 padá a jeho soubor je v pracovním stromu smazaný.
- **Chybí importér jarní fáze.** Pro kapacity a přihlášky před zveřejněním výsledků není udržovaný skript; na jaře 2027 by se data nedala převzít.
- **Generátor extrakcí inspekčních zpráv není v repozitáři.**
- **Zdrojové soubory nejsou v gitu** a výstupy nesou rok v názvu, například `pasma_prijeti_2025.json`; workflow je musí stahovat a přejmenovávat.

### Aktuální stav

<!-- stav-datovych-sad:od -->

_Vygenerováno z `public/stav_datovych_sad.json` dne 2026-09-17. Neupravovat ručně._

| Sada | Použití | Zobrazujeme | Odkud | Zveřejněno, nepřevzato | Čekáme | Kdy | Po přepnutí |
|---|---|---|---|---|---|---|---|
| `cermat-kapacity` | web | 2026 | `PZ2026_kolo1_skolobory_vysledky.xlsx` | — | 2027 | 2027-03, odhad | Srovnání ročníků na stránce oboru. |
| `cermat-prihlasky` | web | 2026 | `PZ2026_kolo1_skolobory_vysledky.xlsx` | — | 2027 | 2027-03, odhad | Srovnání ročníků na stránce oboru. |
| `cermat-vysledky` | web | 2026 | `PZ2026_kolo1_skolobory_vysledky.xlsx` | — | 2027 | 2027-08, odhad | Srovnání ročníků na stránce oboru; výsledky 2025 slouží jako srovnávací zdroj v public/cermat_results_meta.json. |
| `cermat-uchazeci-kolo1` | web | 2026 | `PZ2026_kolo1_uchazeci_prihlasky_vysledky.xlsx` | — | — | 2027-05, odhad | Rok 2025 zůstává pro ověření stability mezi ročníky ve scripts/validate-pasma-prijeti.py a pro vývoj hranice přijetí. |
| `cermat-uchazeci-kolo2` | nepoužito | 2025 | `data/PZ2025_kolo2_uchazeci_prihlasky_vysledky.xlsx` | 2026 | 2027 | 2027-06, odhad | Není na webu. |
| `cermat-polozkova-jpz` | analýza | 2025 | `data/JPZ2025_M6_polozkova_data.xlsx` | 2026 | 2027 | 2027-05, odhad | Není na webu; slouží dokladu teze 4. |
| `cermat-maturita` | web | 2026 | `MZ2026j_SC_skolobory.xlsx` | — | — | 2027-08, odhad | Předchozí jarní ročníky zůstávají ve výstupu; stránka školy z nich počítá počet let nad skupinou oborů. |
| `cermat-jpz-skoly-2017-2023` | nepoužito | nic | `Uzavřená řada, soubory nejsou stažené.` | — | — | neznámo | Nepřepíná se. |
| `msmt-rejstrik-snimky` | web | 2026-06-30 | `data/msmt_rejstrik/rssz-2026-06-30.jsonld` | 2025-06-30, 2025-09-30 | 2026-09-30 | 2026-10, odhad | Starší snímky zůstávají pro návaznost oborů mezi roky. |
| `msmt-rejstrik-csv` | web | 2026-02-11 | `data/Rejstrik_skol/SkolyAMista.csv` | — | — | neznámo | Nahrazuje se celý. |
| `msmt-akko` | analýza | 2026-03-08 | `data/AKKO-Kmenové_obory vzdělání (KKOV 5místné).csv` | — | — | neznámo | Nahrazuje se celý. |
| `csi-inspekce` | web | 2026-09-07 | `data/csi_snapshots` | — | — | neznámo | Starší snímky zůstávají v data/csi_snapshots s manifestem. |
| `csi-extrakce` | web | 2025-11-25 | `data/inspection_extractions.json` | — | — | neznámo | Starší zpráva téže školy zůstává sbalená pod novější. |
| `csi-inspis` | web | 2026-02-11 | `data/inspis_school_profiles.json` | — | — | neznámo | Nahrazuje se celý. |
| `doprava-gtfs` | web | 2026-02-07 | `data/PID_GTFS.zip` | — | — | neznámo | Nahrazuje se celý. |
| `katalog-historie` | web | 2025 | `public/schools_data.json` | — | — | neznámo | Nepřepíná se. |
| `school-analysis-legacy` | nezobrazovat | 2025 | `public/school_analysis.json` | — | — | neznámo | Nepřepíná se. |
| `cermat-kolo2-agregaty` | web | 2026 | `PZ2026_kolo2_skolobory_vysledky.xlsx` | — | 2027 | 2027-09, odhad | Předchozí rok zůstává ve výstupu a na stránce slouží k větě, zda škola 2. kolo vypsala i tehdy. |
| `msmt-harmonogram` | web | 2027 | `src/data/admissions-2027.json` | — | 2028 | 2027-08, odhad | Termíny předchozího ročníku se nezobrazují; soubor zůstává jako doklad, co web ukazoval. |

#### Aktualizace a automatizace

| Sada | Automatizace | Jak zjistíme nová data | Import | Co musí udělat člověk |
|---|---|---|---|---|
| `cermat-kapacity` | jen detekce | HTTP HEAD: před zveřejněním 404, po revizi nové Last-Modified; katalogová stránka vypisuje dostupné roky. | Chybí udržovaný importér pro fázi před výsledky. scripts/import_cermat_2026_real.py je podle docs/aktualizace-kalendar-data-2027.md zastaralý; scripts/refresh_cermat_data.py čte až soubor výsledků. | Napsat importér kapacit a přihlášek pro jarní fázi, pak revize importu a přepnutí. |
| `cermat-prihlasky` | jen detekce | HTTP HEAD: před zveřejněním 404, po revizi nové Last-Modified; katalogová stránka vypisuje dostupné roky. | Chybí udržovaný importér pro fázi před výsledky. scripts/import_cermat_2026_real.py je podle docs/aktualizace-kalendar-data-2027.md zastaralý; scripts/refresh_cermat_data.py čte až soubor výsledků. | Napsat importér kapacit a přihlášek pro jarní fázi, pak revize importu a přepnutí. |
| `cermat-vysledky` | příprava | HTTP HEAD a katalogová stránka, stejně jako u kapacit. | scripts/refresh_cermat_data.py --input-dir s výsledky aktuálního a předchozího roku; kontroluje hlavičky, kolize, rozsah skóre a součet priorit a ukládá sha256 a datum platnosti. | Stáhnout oba soubory, spustit import a testy, zrevidovat rozdíly počtů a přepnout. |
| `cermat-uchazeci-kolo1` | příprava | HTTP HEAD a katalogová stránka Datové soubory. | scripts/build-pasma-prijeti.py, scripts/build-soubeh-prihlasek.py, scripts/build-kontext-prihlasek.py; doklad stability mezi ročníky scripts/validate-pasma-prijeti.py --rocniky STARY-NOVY. Výstupy nesou rok v názvu, registr ho drží zástupným {obdobi}, ne napevno. Pozor: scripts/enrich_schools_data.py čte sloupce podle pozice a s textovým příznakem přijetí by počítal chybně; datová linka ho nespouští a katalogové minimum se na webu nezobrazuje. | Převzetí mění čísla v dokladech tezí a na webu, proto revize výsledků validace před přepnutím. |
| `cermat-uchazeci-kolo2` | jen detekce | HTTP HEAD. | Neexistuje. | Rozhodnout o zpracování druhého kola. |
| `cermat-polozkova-jpz` | jen detekce | HTTP HEAD pro šest testů. | Jen dokladový výpočet v scripts/validate-pasma-prijeti.py. | Není na webu, převzetí podle potřeby analýzy. |
| `cermat-maturita` | příprava | HTTP HEAD a katalogová stránka. | scripts/build-maturita-skoly.py; v datové lince zpracovatel cermat-maturita stáhne k jarnímu souboru tři předchozí jarní ročníky a doplní je do stávajícího výstupu. Stav po podzimu (jap) se nepřebírá. | Schválit úlohu, zkontrolovat počty v pull requestu, přepnout období v registru. |
| `cermat-jpz-skoly-2017-2023` | neaktualizuje se | — | — | Uzavřená řada. |
| `msmt-rejstrik-snimky` | příprava | HTTP HEAD na adresu snímku ke konci čtvrtletí. Složka nese identifikátor ročníku, který se každý rok mění (e9c07729… pro 2025, 250d6b3f… pro 2026); na přelomu roku ho je nutné dohledat v Národním katalogu otevřených dat. | Soubory se ukládají do data/msmt_rejstrik/; zpracování scripts/enrich-continuity-registry.py a scripts/build-navaznost-notes.py. | Jednou ročně dohledat identifikátor nového ročníku. |
| `msmt-rejstrik-csv` | ruční | Nelze, export z webové aplikace. | scripts/validate-pasma-prijeti.py čte SkolyAMista.csv pro převod IZO na REDIZO. | Doporučeno nahradit čtvrtletním snímkem JSON-LD, který nese IZO i REDIZO; sada by pak zanikla. |
| `msmt-akko` | ruční | Nesledováno. | Žádný. | Stáhnout při změně číselníku. |
| `csi-inspekce` | plná | Workflow CSI Weekly Refresh každé pondělí, poslední úspěšný běh 7. 9. 2026. | scripts/process-csi-data.js, snímek s manifestem a rozdílem. | Revidovat a sloučit pull request. Chybí jen tento krok. |
| `csi-extrakce` | ruční | Nové zprávy jsou v rozdílu data/csi_diff_latest.json z obnovy seznamu inspekcí. | Generátor v repozitáři není; extrakce vznikla mimo repozitář modelem claude_haiku_4_5. | Automatizovatelné až po převzetí generátoru do repozitáře; každá extrakce stojí volání modelu a vyžaduje kontrolu proti textu zprávy. |
| `csi-inspis` | ruční | Datová sada 70 z otevřených dat ČŠI zmizela: stránka vrací 404 a v seznamu sad chybí. Workflow InspIS Weekly Refresh proto padá od 10. 8. 2026; pull request #34 s daty z 3. 8. 2026 je otevřený od 16. 2. 2026. | scripts/import-inspis-data.js | Najít nový zdroj profilů InspIS, nebo workflow vypnout. Soubor workflow je v pracovním stromu smazaný, necommitováno. |
| `doprava-gtfs` | příprava | PID se obnovuje denně, Last-Modified 13. 9. 2026. | scripts/build_transit_graph_v2.py a převodníky KOMPLET v scripts/. | PID lze stahovat automaticky; celostátní data KOMPLET se získávají ručně a stavba grafu je náročná, proto doporučeno obnovovat při změně jízdních řádů, ne průběžně. |
| `katalog-historie` | neaktualizuje se | — | — | Nepřepíná se. |
| `school-analysis-legacy` | neaktualizuje se | — | — | Generátor není dohledaný, soubor nejde aktualizovat, jen nahradit katalogem. |
| `cermat-kolo2-agregaty` | příprava | HTTP HEAD. | scripts/build-druhe-kolo.py; v datové lince zpracovatel cermat-kolo2-agregaty stáhne k souboru 2. kola i výsledky 1. kola téhož roku a doplní ročník do stávajícího výstupu. | Schválit úlohu, zkontrolovat počty v pull requestu a přepnout období v registru. |
| `msmt-harmonogram` | ruční | Ruční kontrola stránky MŠMT o přijímání na střední školy. Adresy souborů nesou ročník i měsíc vydání, takže se mění celé; HTTP HEAD na starou adresu nová data neodhalí. | Ruční opis do src/data/admissions-2027.json. Čte ho stránka přijímaček a hlavní stránka (termín zveřejnění kritérií). | Po vydání harmonogramu na další přijímací řízení opsat termíny do nového souboru, přepnout období a zkontrolovat věty na hlavní stránce. |

<!-- stav-datovych-sad:do -->

## 6. Jak přidat zdroj nebo sloupec

1. Zapiš zdroj do oddílu 1 s původem, rozsahem, klíčem a četností aktualizace.
2. Vypiš jeho sloupce do oddílu 2 včetně těch, které nepoužiješ. Sloupec, který v soupisu chybí, nikdo podruhé nenajde.
3. U každého sloupce napiš otázku rodiče, na kterou by šel použít. Když žádná není, napiš to.
4. Nepoužité sloupce s reálnou hodnotou přidej do oddílu 3.
5. Zapiš sadu do registru `public/stav_datovych_sad.json` s obdobím, očekávaným termínem a rolí starých dat, viz oddíl 5.
6. Zavádíš-li z toho ukazatel, zapiš ho do [slovníku ukazatelů](slovnik-ukazatelu.md) dřív, než ho zobrazíš, a v registru ho přiřaď sadě.

## 7. Historie

| Verze | Změna |
|---|---|
| 1.11 | Příznak `dobihajiciObor` se poprvé používá na webu: `build-dobihajici-obory.py` vyrábí `public/dobihajici_obory.json` a stránka školy jím v bloku „Obory z dřívějších let“ odlišuje obor, který se už nenabírá, od oboru, který škola v tomto roce jen nevypsala. Párování REDIZO + KKOV + denní forma + délka; nula dobíhajících mezi vypsanými nabídkami tím zůstává respektovaná. Soubor doplněn do výstupů sady `msmt-rejstrik-snimky`. |
| 1.10 | Zapsán **záporný nález o absolventech** (oddíl 3): na otázku, jak si vedou absolventi konkrétní školy, nemá odpověď žádný z šesti prověřených veřejných zdrojů. Soubor MPSV nese IZO, ale chybí mu jmenovatel a ten sám MŠMT označuje za nevěrohodný; krajová míra nezaměstnanosti za skupinu oborů zamítnuta, protože popisuje trh práce v kraji, ne školu. Rešerše ze 17. 9. 2026 tím přestává žít jen v návrhu. |
| 1.9 | Harmonogram přijímacího řízení MŠMT (`src/data/admissions-2027.json`) zapsaný jako zdroj, protože z něj od 17. 9. 2026 čerpá i hlavní stránka, a jako sada `msmt-harmonogram` v registru; termíny se opisují z webu MŠMT ručně, detekce nového ročníku dotazem HEAD nejde. |
| 1.8 | Maturitní výsledky přes datovou linku do `public/maturita_skoly.json`; zpracovatel sady `cermat-maturita`. |
| 1.7 | Kontext přihlášek po oborech (`kontext_prihlasek_{rok}.json`), web škol z rejstříku (`skoly_web.json`), kraj a body přijatých po předmětech v souhrnech. |
| 1.6 | Souhrny 1. kola po ročnících v `souhrny_kolo1.json`: přijatí podle priority, konající, průměrná percentilová umístění přijatých a uchazečů, oficiální percentil nejnižšího přijatého. |
| 1.5 | Úplný soupis 91 sloupců souboru výsledků, druhé kolo a párování nabídek mezi koly. Opravena nepravdivá tvrzení o nejnižším přijatém výsledku a o přijatých podle priority 2026. |
| 1.4 | Doplněna aktualizace a automatizace datových sad, příkaz `zjisti`, agregáty 2. kola jako nový zdroj; opraveno tvrzení, že data uchazečů 2026 nevyšla. |
| 1.3 | Doplněn oddíl 5 o stavu datových sad: registr období, očekávaných termínů a přepínání, kontrolní skript. |
| 1.2 | Doplněn odvozený soubor pásem přijetí; výsledky všech uchazečů už nejsou nevyužité. |
| 1.1 | Doplněny maturitní výsledky a školní agregáty JPZ 2017–2023, tedy ověřené zdroje, které nejsou stažené v repozitáři. První verze je vynechala, protože vznikla procházením adresáře `data/`. |
| 1.0 | První soupis. Vznikl po zjištění, že tři použitelné údaje ležely nepoužité ve zdrojích, které projekt už zpracovával. |
