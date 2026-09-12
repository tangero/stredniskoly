# Maturitní výsledky a kvalita školy

**Verze:** 1.1
**Datum:** 12. 9. 2026
**Stav:** schválený analytický návrh doplněný o katalog metrik, kritérium publikace výzkumné vrstvy a analytický prototyp; import maturitních dat do runtime a veřejná implementace ještě nezačaly.

Tento dokument ukládá kompletní návrh, jak v projektu pracovat s maturitními výsledky. Určuje zdroje, jejich granularitu, bezpečný rozsah zveřejnění, výzkumný pilot a přejímací podmínky. Nenavrhuje jednu známku ani žebříček „kvality škol“.

## 1. Rozhodnutí

Maturitní výsledky budeme prezentovat jako **výsledkový profil školy**. Uživatel uvidí, jak si vedli maturanti v určitém roce a skupině oborů, jak se výsledek liší od podobných škol a jak stabilní je v čase. Nebudeme tvrdit, že jde o přímé měření kvality výuky.

Profil bude mít tři oddělené vrstvy:

1. **Pozorovaný výsledek:** počty a podíly uvedené CERMATem, průměrný procentní skór, směrodatná odchylka a průměrný percentil podle předmětu.
2. **Kontextové srovnání:** výsledek proti školám stejné skupiny oborů `SMO16`, stejného období a předmětu. Srovnání není celostátní tabulka škol napříč obory.
3. **Odchylka od očekávání:** výzkumný výstup, který zohlední vstupní úroveň a srovnatelnou skupinu. Do veřejného profilu se dostane pouze po validaci; pracovní název není „kvalita školy“ ani „přidaná hodnota“.

Jednoduché pořadí podle průměrného skóre, barevná známka školy ani predikce výsledku konkrétního žáka jsou mimo rozsah.

## 2. Co data CERMAT skutečně pokrývají

CERMAT uvádí agregované výsledky na úrovni školy a skupiny oborů. Katalog obsahuje jarní výsledky za roky 2015–2026 a stavy po podzimním zkušebním období do roku 2025. Soubor `jap` je stav po podzimním období, nikoli samostatný podzimní termín. [Katalog agregovaných výsledků maturit](https://data.cermat.cz/maturitni-zkouska/agregovana-data.html)

Ověřený soubor `MZ2026j_SC_skolobory.xlsx` měl při auditu 3 739 fyzických řádků včetně dvou hlaviček a 98 sloupců. Obsahoval 1 112 řádků na úrovni `redizo` a 2 297 řádků `redizo_smo16`. List `vysvětlivky` určuje populaci a význam jednotlivých polí; při každém importu se musí uložit spolu s daty. [Důkazní podklady R1](podklady/oponentura-2027-r1.json)

Data se týkají společné části maturitní zkoušky, zejména didaktických testů. Neobsahují celý obraz profilové části, obhajob, praktických zkoušek, známek během studia ani dalšího uplatnění absolventů.

### Granularita

- `redizo` je agregát za právnickou osobu nebo školu podle definice zdrojového souboru.
- `redizo_smo16` je agregát školy a širší skupiny oborů.
- `SMO16` není totéž co konkrétní kód oboru `KKOV`.
- Jeden školní agregát nesmíme zobrazit jako výsledek každého jednotlivého oboru.
- Škola může mít více `SMO16`, více IZO, více pracovišť a organizační změny mezi roky.

Z toho plyne, že profil konkrétního oboru může zobrazit maturitní výsledek pouze tehdy, když je jasné, že jde o odpovídající skupinu `SMO16`. Jinak musí říct „výsledek školy ve skupině oborů“.

Praktický důsledek pro obory: u velké části SOŠ má škola v dané `SMO16` jediný obor a agregát `redizo_smo16` je pak fakticky výsledkem tohoto oboru (s výhradou zaměření a populace prvomaturantů). U gymnázií to platí téměř vždy. Podíl takových nabídek v katalogu se má spočítat v datovém profilu (krok 2 v §9); teprve podle něj se rozhodne, kolik oborů na webu dostane přímý výsledek a kolik jen „výsledek školy ve skupině oborů“.

### 2.1 Co data unesou a co ne

Střízlivé vymezení před návrhem metrik. Společná část maturity jsou od roku 2021 pouze didaktické testy z českého jazyka, matematiky a cizího jazyka, u populace prvomaturantů. Jde o tři testy z jedné ze dvou částí zkoušky.

- **Český jazyk je jediný povinný test pro všechny.** Je to jediný předmět, ve kterém se srovnává celý maturitní ročník školy. Matematika a cizí jazyk jsou samovýběr; jejich výsledek popisuje jen tu část ročníku, která si je zvolila.
- **Většinu rozptylu mezi školami vysvětlí vstup.** Gymnázium s vysokým vstupním percentilem bude mít u maturity lepší čísla než odborná škola s nízkým bez ohledu na výuku. Srovnání napříč `SMO16` je bezcenné a i uvnitř skupiny rozhoduje především to, kdo do školy nastoupil.
- **Stropový efekt na špičce.** U výběrových gymnázií se percentily tlačí k horní hranici a rozdíly mezi nimi jsou šum. Data odliší slabé školy od průměru mnohem spolehlivěji než dobré od výborných.
- **Survivorship.** Škola, která slabé žáky vyloučí nebo nepustí k maturitě, bude mít vysokou „úspěšnost“. Bez čísla o odpadu mezi 1. ročníkem a maturitou je úspěšnost polovina příběhu. CERMAT tuto mezeru nezaplní; viz §3.6.
- **Zlom 2020/2021.** Do roku 2020 se do společné části počítala i písemná práce a ústní zkouška, od 2021 jen didaktické testy. Procentní skór společné části před a po zlomu leží na jiné škále. Percentil didaktického testu je jediná veličina, kterou lze táhnout přes celou řadu 2015–2026; i u ní se musí označit rok 2021 (mimořádný ročník, změny testů) a rok 2020 (posunuté termíny).

Závěr: z dat CERMAT vznikne dobrý obraz **dosažené úrovně** maturitního ročníku. Obraz **kvality výuky** z nich vznikne jen jako reziduum po odečtení vstupu, a to bude slabý a hlučný signál. O jeho publikaci rozhodne backtest podle §5.3, nikoli dojem.

## 3. Úplný seznam zdrojů

### 3.1 Primární maturitní data

| Zdroj | Použití | Omezení |
|---|---|---|
| [CERMAT – katalog agregovaných dat MZ](https://data.cermat.cz/maturitni-zkouska/agregovana-data.html) | Seznam ročníků, období, vysvětlení a odkazy na reporty | Katalog sám není datová tabulka; význam polí je v konkrétním souboru a listu `vysvětlivky`. |
| [MZ2026j – školy a skupiny oborů](https://data.cermat.cz/files/files/MZ/agregovana_data_skoly/MZ2026j_SC_skolobory.xlsx) | Jaro 2026, první pilotní import | Společná část; školní a `SMO16` agregace, ne přesný `KKOV`. |
| [MZ2025jap – školy a skupiny oborů](https://data.cermat.cz/files/files/MZ/agregovana_data_skoly/MZ2025jap_SC_skolobory.xlsx) | Kontrola stavu po podzimu 2025 | Není to čisté jaro ani samostatný podzim; nelze bez označení spojit s jarním výsledkem. |
| `MZ{rok}j_SC_skolobory.xlsx` | Jarní řada 2015–2026 | URL a kontrolní součet každé revize se musí uložit. |
| `MZ{rok}jap_SC_skolobory.xlsx` | Stav po podzimním období 2015–2025 | Populace se liší od jara; období musí zůstat samostatné. |
| Reporty [SC výsledky škol jaro](https://data.cermat.cz/maturitni-zkouska/agregovana-data.html) v Power BI | Interaktivní kontrola a doplňkový pohled | Report není náhradou za archivovaný XLSX a jeho kontrolní součet. |

### 3.2 Vstupní data pro kontext a kohortní pilot

| Zdroj | Použití | Omezení |
|---|---|---|
| [CERMAT – agregovaná data JPZ](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/agregovana-data-jpz.html) | Vstupní výsledky JPZ 2017–2023, zejména percentily podle školy | Neobsahují přijetí na konkrétní školu; nejsou individuální kohortou nastupujících žáků. |
| [CERMAT – přehled dat JPZ](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska.html) | Individuální anonymizované přihlášky, přijetí a výsledky od roku 2024; popis rozsahu | Data neobsahují společný identifikátor žáka s maturitními soubory. |
| [JPZ školní agregáty 2017–2023](https://data.cermat.cz/files/files/JPZ/agregovana_data_skoly/JPZ{ROK}_skoly-skolobory_vysledky.xlsx) | Přímá reprodukce historické řady | Název souboru je pro roky před 2024 jiný než u novějších dat; schéma se musí adaptovat a ověřit. Sloupec směrodatné odchylky má v názvu slovo „percentil“; hledání sloupce podle názvu ho musí vyloučit (viz §9.1). |
| [JPZ 2026 – 1. kolo](https://data.cermat.cz/files/files/JPZ/agregovana_data_skoly/PZ2026_kolo1_skolobory_vysledky.xlsx) | Současná nabídka, kapacita, přihlášky a výsledky přijímání | Představuje přijímací řízení, ne maturitní výstup; rozsah je omezený filtrem projektu. |
| [Agregované výsledky úloh JPZ](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/agregovane-vysledky-uloh-jpz.html) | Doplňkový popis vstupní obtížnosti a chybovosti | Není zdrojem maturitních výsledků ani kvality výuky. |

Kohortní hypotéza pro čtyřleté obory může pracovat s přibližným vztahem „vstup kolem roku 2022 → maturita 2026“. Je to školní a oborová aproximace, nikoli sledování stejných lidí. Pro šestiletá a osmiletá gymnázia se tento vztah nesmí použít bez samostatné definice vstupního roku.

### 3.3 Identita školy, oboru a adresy

| Zdroj | Použití | Omezení |
|---|---|---|
| [Rejstřík škol a školských zařízení MŠMT](https://rejstriky.msmt.cz/rejskol/VREJVerejne/VerejneRozhrani.aspx) | Význam REDIZO, IZO, právnické osoby, školy a zařízení; kontrola názvů a adres | Adresa je rejstříkový údaj, ne automaticky místo výuky. Jedna právnická osoba může mít více škol/zařízení. |
| [MŠMT – číselníky a klasifikace](https://msmt.gov.cz/rej-sta/ciselniky-a-klasifikace) | KKOV a klasifikace oborů | Změna kódu není sama o sobě důkaz přejmenování nebo obsahové návaznosti. |
| [Oficiální web školy a zřizovatele] | Doložení sloučení, rozdělení, změny názvu, pracovišť a ŠVP | Aktuální stránka sama nedokládá stav v minulém roce; uložit datum, období a konkrétní dokument. |
| [Výzkumná matice změn škol a oborů](matice-zmen-skol-a-oboru-2025-2026.md) | Kandidátní návaznost mezi roky, změny IZO/REDIZO/adres/názvů | Je to analytická pomůcka; 1:1 párování neřeší všechna sloučení a rozdělení. |
| [Fronta dohledávání návaznosti](zadani-dohledavani-navaznosti-2025-2026.md) | Řešení nejasných organizačních vazeb a míst výuky | Rešerše je dosud nespouštěná; stav `not_started` není rozhodnutí. |

Pro dojezdovost je nutné mít zvlášť roli adresy: sídlo právnické osoby, korespondenční adresa, místo výuky, jiné nebo nezjištěné. Maturitní agregát proto nelze bez dalšího použít jako geografický bod školy.

### 3.4 Inspekční a školní kontext

| Zdroj | Použití | Omezení |
|---|---|---|
| [ČŠI Open Data – dataset 69](https://opendata.csicr.cz/DataSet/Detail/69) | Inspekční zprávy a jejich metadata | Datum extrakce není datum inspekce; historické zjištění není automaticky současný stav. |
| [ČŠI Open Data – dataset 70 / InspIS](https://opendata.csicr.cz/DataSet/Detail/70) | Praktické informace o škole, výuce, podpoře a vybavení | Mnoho polí nemá datum ověření; obecný text není potvrzením pro rok 2027. |
| [Portál ČŠI](https://portal.csicr.cz/) | Primární kontrola inspekční zprávy | Inspekce je další evidence o škole, ne součást maturitního skóre. |
| [NPI Infoabsolvent – nezaměstnanost podle skupin oborů](https://www.infoabsolvent.cz/Temata/ClanekAbsolventi/5-1-05/Nezamestnanost-absolventu-skupiny-oboru-vzdelani/12) | Kontext dalšího uplatnění podle oborové skupiny | Není to výsledek konkrétní školy ani prognóza dnešního uchazeče. |
| Web školy, kritéria přijímání, výroční zprávy | Vysvětlení podmínek, podpory, změn a organizační historie | Ruční zdroj musí mít URL, název dokumentu, datum vydání/ověření a použitelné období. |

Inspekční zpráva, školné, dojezd, podpora a uplatnění mají zůstat oddělenými oblastmi profilu. Nemají se převádět do jediné známky společně s maturitou.

### 3.5 Lokální soubory projektu

| Soubor | Skutečný obsah | Vztah k maturitě |
|---|---|---|
| `public/schools_data.json` | Historický katalog nabídek a JPZ 2024/2025 | Vstupní/historický kontext, ne maturitní data. |
| `public/applications_2026.json` | Přihlášky, kapacity a přijetí 2026 | Vstupní přijímací kontext, nikoli výstup maturity. |
| `public/cermat_results_2026.json` | Výsledky JPZ 2026 | Výsledky přijímání, ne maturitní výsledky. |
| `public/school_analysis.json` | Školní a oborové analytické údaje | Historický projektový export; nepřidávat do něj maturitu bez nového kontraktu. |
| `data/inspis_school_profiles.json` | Import InspIS/ČŠI | Kontext školy; část polí má starší nebo neurčenou platnost. |
| `public/csi_inspections.json` | Zpracované inspekční zprávy | Kontext školy; datum zprávy a datum importu jsou různé. |
| `data/csi_manifest.json` | Verze, platnost, URL a SHA-256 inspekčních snapshotů | Provenance ČŠI dat. |
| `docs/podklady/oponentura-2027-r1.json` | Auditní součty, vzorky a zdroje JPZ/MZ | Důkazní podklad auditu, ne runtime dataset. |
| `docs/navrh-rozvoje-2027.md` | Rozhodnutí a limity z předchozí oponentury | Autoritativní projektový kontext; viz zejména část o MZ. |

V aktuálním produkčním exportu není maturitní dataset implementován. Ověřené vzorky MZ sloužily k auditu a návrhu, nikoli jako veřejná funkce.

### 3.6 Kandidátní zdroje k dohledání

Údaje, které v datech CERMAT chybí a bez nichž zůstane obraz školy neúplný. Žádný z nich nebyl v této verzi ověřen; jde o zadání rešerše, nikoli o přijaté zdroje.

| Chybějící údaj | Kandidátní zdroj | Stav a omezení |
|---|---|---|
| Odpad mezi nástupem a maturitou (kolik přijatých dojde k maturitě jako prvomaturant) | Uchazečská data CERMAT s přijetím od 2024; první čistý pár vznikne s maturitou 2028 u čtyřletých oborů. Pro starší roky výkonové výkazy MŠMT (počty žáků v 1. ročníku podle školy), pokud jsou po školách veřejné. | Neověřeno. Nejcennější chybějící číslo: bez něj nelze odlišit vysokou úspěšnost od tvrdého výběru během studia. |
| Uplatnění absolventů podle školy | Infoabsolvent dříve zveřejňoval nezaměstnanost absolventů po jednotlivých školách, nikoli jen po skupinách oborů. | Neověřeno, zda řada pokračuje a v jakém rozsahu. |
| Přechod na VŠ podle střední školy | Veřejná řada po školách podle dostupných informací v ČR neexistuje. | Do plánu nepočítat; případný nález doložit. |
| Mapa `KKOV` → `SMO16` | List `vysvětlivky` CERMAT a číselníky MŠMT. | Bez ní obor na webu maturitu nezobrazí; musí vzniknout v datovém profilu. |

## 4. Navržený datový kontrakt

Před importem musí vzniknout samostatná datová vrstva, například `maturita_results`. Návrh polí:

```ts
type MaturityPeriod = 'jaro' | 'stav_po_podzimu';
type MaturityGrain = 'redizo' | 'redizo_smo16';
type MaturitySubject = 'spolecna_cast' | 'cj' | 'ma' | 'aj' | 'nj' | 'fj' | 'sj' | 'ru';

interface MaturityResult {
  id: string;
  schoolYear: number;
  period: MaturityPeriod;
  grain: MaturityGrain;
  redizo: string;
  smo16: number | null;
  subject: MaturitySubject;
  registered: number | null;
  took: number | null;
  passed: number | null;
  failed: number | null;
  absent: number | null;
  passRate: number | null;
  grossFailureRate: number | null;
  nonParticipationRate: number | null;
  averagePercentScore: number | null;
  standardDeviation: number | null;
  averagePercentile: number | null;
  subjectChoiceShare: number | null;
  populationNote: string;
  sourceUrl: string;
  sourceFileSha256: string;
  sourceValidAt: string | null;
  retrievedAt: string;
  quality: 'complete' | 'limited' | 'unavailable';
  qualityReasons: string[];
}
```

Názvy jsou návrh kontraktu, nikoli tvrzení, že přesně odpovídají názvům sloupců CERMAT. ETL musí u každého pole zachovat původní název a jednotku. Přepočet nebo zaokrouhlení se nesmí ztratit v loaderu.

Každý záznam musí znát:

- školní rok a období;
- školní či oborovou granularitu;
- populaci a jmenovatel;
- předmět a jednotku;
- velikost vzorku;
- zdrojový soubor, URL, platnost a kontrolní součet;
- důvod omezení nebo chybějící hodnoty;
- vazbu na aktuální REDIZO a stav identity školy.

Nula, chybějící údaj a nezveřejněná hodnota jsou tři různé stavy. U malých nebo zdrojem skrytých počtů se nesmí dopočítávat podíl z neznámého jmenovatele.

## 5. Metriky a jejich výklad

### Bezpečně publikovatelné

1. **Počet přihlášených, konajících, úspěšných, neúspěšných a nekonajících.** Zobrazit jmenovatel přímo vedle podílu.
2. **Úspěšnost a neúspěšnost.** Použít jmenovatele definovaného CERMATem; nepřejmenovávat hrubou a čistou neúspěšnost bez kontroly vysvětlivek.
3. **Průměrný procentní skór, směrodatná odchylka a průměrný percentil.** Vždy s předmětem, rokem, obdobím a velikostí vzorku.
4. **Volba předmětu.** Uvést, že jde o podíl volby mezi relevantními maturanty, nikoli o preferenci všech žáků školy.
5. **Trend jednotlivých roků.** Zobrazit hodnoty po rocích, nepřekrývat jarní výsledek se stavem po podzimu.

### 5.1 Katalog metrik vrstvy 1 (pozorovaný výsledek)

Pořadí odpovídá důvěře v metriku. U každé je uveden jmenovatel, co říká, co neříká a jak se zobrazuje.

| # | Metrika | Jmenovatel | Co říká | Co neříká | Zobrazení |
|---|---|---|---|---|---|
| 1 | Úspěšnost a čistá neúspěšnost společné části | podle vysvětlivek CERMAT (konající, resp. přihlášení) | Kolik prvomaturantů prošlo společnou částí. Pro rodiče nejsrozumitelnější číslo, u SOŠ nejvýznamnější. | Nic o odpadu před maturitou ani o profilové části. | Podíl s počtem a jmenovatelem vedle; neúspěšnost rozložit na češtinu a matematiku. |
| 2 | Průměrný percentil z českého jazyka | konající v ČJ | Hlavní srovnávací číslo. Percentil je relativní k populaci daného roku, drží přes roky i přes změny obtížnosti testu. Jediný předmět za celý ročník. | Kvalitu výuky; bez vstupu je to úroveň ročníku. | Číslo s rokem, obdobím, n; procentní skór jen jako doplněk. |
| 3 | Podíl volby matematiky spolu s jejím percentilem | volba: relevantní maturanti; percentil: konající v MA | Dvojice „matematiku volí X %, průměrný percentil Y“. Vysoký podíl volby s dobrým percentilem je nejsilnější pozitivní signál v datech. | Samostatný percentil z MA nic; škola, kde ji dělá 15 % nejlepších, vypadá skvěle. | Vždy jako dvojice, nikdy percentil sám. Totéž pro cizí jazyk. |
| 4 | Směrodatná odchylka | konající v předmětu | Rozptyl výsledků v ročníku: vyrovnaný ročník versus špičky a propadáky při stejném průměru. | Nic o příčině rozptylu. | Slovně vůči skupině („výsledky vyrovnané / rozptýlené“), ne jako číslo. |
| 5 | Neúčast (přihlášení, kteří nekonali) | přihlášení | Trvale vysoká neúčast je věc, na kterou se má rodič zeptat. | Důvod neúčasti (nemoc, neuzavřený ročník, odklad). | Podíl s počtem; bez interpretace. |

### 5.2 Kontextové srovnání (vrstva 2)

Srovnávat lze pouze stejný předmět, rok, období, typ agregace a `SMO16`. Doporučený výstup je „o X percentilových bodů vůči mediánu stejné skupiny oborů“, nikoli pořadí všech škol.

**Referenční hodnota je medián škol** ve stejné `SMO16`, roce, období a předmětu (každá škola jeden hlas). Odpovídá otázce rodiče „jak si škola stojí mezi podobnými“ a je odolný vůči velkým školám. Průměr vážený počtem žáků odpovídá jiné otázce („typický maturant“); uvádí se jen v metodice. Definice se nesmí měnit mezi obrazovkami.

**Rozdíl od reference se hodnotí proti nejistotě, nikoli proti pevnému prahu.** CERMAT uvádí průměr, směrodatnou odchylku i n, takže standardní chyba průměru je `SE = SD / sqrt(n)`. Interval `průměr ± 1,96 · SE` se porovná s mediánem skupiny:

- interval celý nad mediánem: „nad skupinou“;
- interval celý pod mediánem: „pod skupinou“;
- interval zahrnuje medián: „nerozlišitelné od skupiny“.

Malá škola s n = 18 a rozdílem +4 body tak skončí ve stavu „nerozlišitelné“, což je správně. Tři stavy jsou stále známka, ale známka, kterou data unesou; u malých škol skončí většina ve středním stavu. Prahy `n < 10` / `10–29` / `≥ 30` z §7 zůstávají jako pravidlo pro potlačení a upozornění, nikoli jako hranice kvalifikátoru.

**Stabilita v čase:** klouzavý tříletý průměr percentilu a počet let, kdy byla škola nad/pod skupinou. Jednoletý výkyv malé školy nic neznamená; pět let nad mediánem něco znamená. Trend musí označit zlomy (2020/2021, změna identity školy, změna složení `SMO16`).

Pro srovnání uvést alespoň:

- referenční populaci;
- počet škol a žáků v referenci;
- rozdíl v percentilových bodech a interval nejistoty;
- zda byl výsledek stabilní ve více letech;
- zda se změnila identita školy nebo složení skupiny oborů.

Poctivá poznámka: každá „poloha na rozdělení skupiny“ je skryté pořadí. Rozdíl proti žebříčku je v tom, že web nenabízí seznam škol seřazený od nejlepší po nejhorší a že polohu vždy doprovází interval nejistoty. Toto rozhodnutí je vědomé a je zapsané zde, aby se o něm dalo znovu rozhodnout.

### 5.3 Výzkumná odchylka od očekávání (vrstva 3)

Možný pilot:

1. pro stejnou školu a `SMO16` získat vstupní signál z odpovídajícího přijímacího období;
2. odhadnout očekávaný maturitní výsledek podle vstupu, oborové skupiny, typu školy a ročníku;
3. porovnat očekávanou a skutečnou hodnotu;
4. zkontrolovat výsledek na jiných ročnících a alternativních specifikacích modelu;
5. publikovat nanejvýš „odchylku od očekávaného výsledku“ s intervalem nejistoty.

Tento pilot má několik zásadních omezení: neznáme jednotlivé žáky v obou souborech, maturitní skupina nemusí být totožná s přijatými žáky, vstupní data jsou na jiné granularitě, do výsledku vstupují opakování a přestupy a organizační změna školy může přerušit řadu. Dokud nebude tato návaznost doložená a validovaná, výstup zůstane interní analytickou studií.

**Konkrétní specifikace pilotu.** Vstup pro školu se vezme ze školních agregátů JPZ o čtyři roky dříve (čtyřleté obory): páry 2017→2021 až 2022→2026 dávají šest ročníkových párů, což na validaci stačí. Model: percentil MZ z českého jazyka ≈ vstupní percentil JPZ + efekt `SMO16` + efekt kraje + velikost ročníku. Reziduum modelu je kandidát na „školní efekt“.

**Kritérium publikace je jediné a je zapsané předem:** rezidua téže školy musí být v čase korelovaná. Měří se korelace rezidua školy v roce t a t+1 přes všechny páry ročníků. Pokud je korelace slabá (orientačně pod 0,3) nebo se rezidua rok od roku přehazují, jde o šum a výstupem pilotu je rozhodnutí nepublikovat. Pokud je korelace zřetelná a přežije alternativní specifikace (bez covidových ročníků, bez malých škol, s efektem přeplněnosti), lze o publikaci „odchylky od očekávání“ s intervalem uvažovat. Kritérium se nesmí po výsledku měnit.

**Zkreslení vstupu je asymetrické.** Agregát JPZ za školu popisuje uchazeče, kteří na ní test konali, nikoli přijaté. U přeplněných škol jsou přijatí špičkou uchazečů, u podnaplněných jsou přijatí zhruba všichni. Model bez korekce bude přeplněným školám vstup podceňovat a jejich „efekt“ nadhodnocovat; vyšlo by, že výběrové školy „přidávají hodnotu“. Proměnná přeplněnosti (poměr přihlášek a kapacity, který projekt má od roku 2024, dřív jen částečně) proto musí být součástí alternativní specifikace, a pokud pro starší roky chybí, musí to být uvedeno jako omezení výsledku.

## 6. Jak to zobrazit na webu

### Profil školy

Oddíl nazvat **Maturitní výsledky – společná část**. Na začátku musí být vidět rok, období, skupina oborů a zdroj. Obsah:

```text
Maturitní výsledky školy
Jaro 2026 · společná část · skupina oborů: [SMO16]

Úspěšně vykonalo: [podíl] ([počet] z [jmenovatel])
Neúčast: [podíl] ([počet] z [jmenovatel])

Český jazyk   průměrný skór [x] % · percentil [y] · n [z]
Matematika    průměrný skór [x] % · percentil [y] · n [z]

Vývoj v čase: [graf jednotlivých roků]
Srovnání: [rozdíl vůči stejné skupině oborů]
```

Pokud má škola více `SMO16`, zobrazit přepínač nebo samostatné řádky. Na detailu konkrétního oboru uvést „Výsledek školy ve skupině oborů“, pokud přesný oborový výsledek není k dispozici.

Doplnění návrhu:

- **Tři čísla nahoře:** úspěšnost společné části; percentil z českého jazyka s rozdílem od skupiny a kvalifikátorem podle §5.2; dvojice „podíl volby a percentil“ u matematiky. Vše s rokem, obdobím a n.
- **Poloha na rozdělení skupiny jako grafika:** místo tabulky škol vykreslit rozdělení výsledků všech škol stejné `SMO16` (pásmo nebo bodový pruh) a zvýraznit bod dané školy s intervalem nejistoty. Uživatel vidí polohu, web nenabízí pořadí.
- **Slovní kvalifikátor odvozený z nejistoty**, nikoli z pevného prahu: „nad skupinou“, „nerozlišitelné od skupiny“, „pod skupinou“.
- **Vysvětlení hned vedle čísla**, ne až pod grafem. Hlavní sdělení „toto je úroveň ročníku, nikoli kvalita školy“ musí čtenář vidět dřív než číslo.

Vysvětlení pod grafem:

> Výsledky popisují společnou část maturity v uvedeném období. Ovlivňuje je složení a velikost ročníku, volba předmětů, neúčast a další okolnosti. Nejde o záruku výsledku konkrétního žáka ani o celkové hodnocení kvality školy.

### Můj výběr

V porovnání dvou až čtyř uložených oborů zobrazit maturitu jako jednu oblast vedle přijímací náročnosti, dojezdu, nákladů, podpory a inspekčních informací. Porovnávat jen srovnatelné skupiny: u oborů z různých `SMO16` zobrazit „nesrovnatelné skupiny“ a čísla vedle sebe nedávat. Nezobrazit automatického vítěze ani nesloučit hodnoty do skóre vhodnosti.

### Simulátor

Maturitní výsledky nemají měnit pořadí škol ani šanci na přijetí. Mohou být odkazem z výsledku simulátoru na profil školy, kde si uchazeč přečte, jaké další informace o škole existují.

## 7. Ochrany proti zavádějícímu výkladu

- **Malý vzorek:** Pro pilot navrhuji pouze počty při `n < 10`, upozornění při `10–29` a běžné zobrazení od `n ≥ 30`. Prahy musí projít kontrolou proti pravidlům zveřejňování a vysvětlivkám CERMATu.
- **Neúčast a opakování:** Nezaměňovat úspěšnost konajících za úspěšnost všech přihlášených. Při každém podílu ukázat jmenovatel.
- **Jaro versus po podzimu:** Období zobrazit v titulku i v datech grafu; hodnoty nesčítat bez popisu populace.
- **Škola versus obor:** `redizo` a `redizo_smo16` nepřepisovat na konkrétní KKOV. Chybějící mapu nepřekrývat marketingovým názvem oboru.
- **Organizační změny:** Změna REDIZO, IZO, adresy, názvu, sloučení nebo rozdělení se musí propsat do kvality časové řady. Starší hodnoty nepřipojovat k nástupci bez doložené návaznosti.
- **Adresa:** Sídlo není automaticky místo výuky. Dojezdovost vyžaduje ověřené pracoviště konkrétní nabídky.
- **Neznámý údaj:** Neznámá hodnota není nula ani záporný signál školy.
- **Výběr žáků:** Vysoké maturitní výsledky mohou být důsledkem toho, kdo do školy nastoupil. Bez vstupního kontextu je nelze číst jako přidanou hodnotu školy.
- **Změny testu a ročníku:** Trend musí označit změnu metodiky, mimořádný ročník nebo jiný zdrojový rozsah, pokud se objeví ve vysvětlivkách.
- **Soukromí:** U malých skupin nepřidávat vlastní dopočty, které by rekonstruovaly skryté údaje.

## 8. Přejímací podmínky datové vrstvy

Import maturitních dat je přijat až tehdy, když:

1. projdou všechny dostupné ročníky a období s uloženým seznamem zdrojů a SHA-256;
2. ETL zachová původní jednotky, populaci a vysvětlivky;
3. proběhne kontrola počtů řádků, duplicit, unikátních `REDIZO`, `SMO16`, chybějících hodnot a povolených kategorií;
4. každý výsledek má rok, období, granularitu, předmět, jmenovatel, vzorek a zdroj;
5. proběhne kontrola, že školní agregát není připojen jako výsledek každého `KKOV`;
6. oddělí se jarní a podzimní stav a nebude se vydávat součet bez definice populace;
7. testy pokryjí malý vzorek, více `SMO16`, chybějící data, sloučení školy, změnu REDIZO/IZO a více pracovišť;
8. profil, detail, Můj výběr a export používají stejný renderer a stejný datový kontrakt;
9. veřejné texty neobsahují „kvalitní škola“, „nejlepší škola“ ani skryté pořadí podle maturity;
10. skutečná produkční stránka bude po nasazení ověřena, nikoli jen lokální build.

## 9. Doporučené pořadí realizace

1. **Audit zdrojů a ETL:** stáhnout jarní soubory 2015–2026 a dostupné `jap` soubory, uložit manifest, kontrolní součty a vysvětlivky. Začít vzorky 2026j a 2025jap, které už byly ověřeny.
2. **Datový profil:** vytvořit souhrn pokrytí podle roku, období, `REDIZO`, `SMO16`, předmětu a velikosti vzorku. Zkontrolovat změny identity podle [matice návaznosti](matice-zmen-skol-a-oboru-2025-2026.md).
3. **Popisný profil školy:** nasadit oddíl s rokem, obdobím, populací, počty, předměty a trendem. Bez výzkumného skóre.
4. **Kontextové srovnání:** přidat referenci stejné `SMO16` a stejného období. Ověřit, že porovnání neskryje malý vzorek.
5. **Můj výběr:** přidat maturitu jako samostatný porovnávaný sloupec/sekci bez automatického vítěze.
6. **Kohortní pilot:** vytvořit interní notebook nebo reprodukovatelný skript, který ověří, zda vstupní signál a maturitní výsledek mají dostatečnou návaznost. Publikaci rozhodnout až po backtestu podle kritéria v §5.3.

### 9.1 Analytický prototyp

Kroky 1, 2, 4 a 6 pokrývá skript `scripts/maturita_prototype.py`. Je to interní analytický nástroj: nezapisuje do `public/`, nemění runtime ani veřejné rozhraní. Výstupem je JSON v `docs/podklady/` s manifestem zdrojů (URL, SHA-256, počty řádků), dlouhou tabulkou výsledků podle kontraktu z §4, kontextovým srovnáním podle §5.2 a backtestem podle §5.3.

```text
python3 scripts/maturita_prototype.py --self-test
python3 scripts/maturita_prototype.py --input-dir /cesta/k/xlsx --output docs/podklady/maturita-prototyp-2026.json
```

Samotest staví dva syntetické světy a ověřuje, že kritérium z §5.3 mezi nimi rozliší. Ve světě se stabilním školním efektem (směrodatná odchylka 4 percentilové body) vyšla korelace reziduí 0,55 a rozhodnutí „předložit metodické oponentuře“. Ve světě bez školního efektu vyšla korelace −0,03 a rozhodnutí „nepublikovat“. Kritérium tedy není samosplnitelné. Výstup je v [podkladech samotestu](podklady/maturita-prototyp-selftest.json).

Samotest zároveň odhalil past v souborech JPZ: sloupec `SMĚRODATNÁ ODCHYLKA (PERCENTIL. UMÍSTĚNÍ)` obsahuje slovo „percentil“, takže naivní hledání sloupce podle názvu uloží do vstupního percentilu odchylku. Chyba se v číslech neprojeví jako výpadek, ale jako falešně vysoká korelace reziduí, tedy přesně jako výsledek, který by vedl k publikaci. Loader proto percentilový sloupec hledá s vyloučením názvů obsahujících „směrodatná“ a „odchylka“; stejná kontrola musí proběhnout i u skutečných souborů MZ.

Stav k 12. 9. 2026: prototyp byl vyvinut a ověřen pouze na syntetických datech (`--self-test`), protože datový server CERMAT nebyl z vývojového prostředí dostupný (egress proxy odmítá `data.cermat.cz`) a repozitář vzorky MZ neobsahuje. Loader souborů MZ hledá sloupce podle názvů v obou hlavičkových řádcích a při nenalezení povinných polí skončí chybou s výpisem nalezené hlavičky. Před prvním během nad skutečnými soubory se musí:

1. stáhnout soubory `MZ{rok}j_SC_skolobory.xlsx` (2015–2026) a `JPZ{rok}_skoly-skolobory_vysledky.xlsx` (2017–2023) do jednoho adresáře;
2. spustit skript a porovnat vypsanou mapu sloupců s listem `vysvětlivky`;
3. opravit mapu sloupců ve skriptu, pokud se názvy liší od očekávání, a zapsat rozdíl do tohoto dokumentu;
4. potvrdit, že součty `redizo` a `redizo_smo16` odpovídají počtům z [podkladů R1](podklady/oponentura-2027-r1.json).

Výsledek backtestu z prototypu není důkaz; je to vstup pro metodickou oponenturu podle [návrhu rozvoje](navrh-rozvoje-2027.md), část V.

## 10. Co je hotové a co není

**Hotové:** existence a základní struktura zdroje MZ byla ověřena; byly identifikovány roky, období, granularita `redizo`/`redizo_smo16`, metriky a omezení; zdokumentována návaznost na JPZ, MŠMT, ČŠI/InspIS a Infoabsolvent; schválen zákaz jednoduchého žebříčku kvality; připraven tento datový a produktový návrh.

**Hotové ve verzi 1.1:** ověření, že kritérium publikace z §5.3 rozliší stabilní školní efekt od šumu (samotest prototypu); katalog metrik vrstvy 1 s jmenovateli a výkladem (§5.1); definice reference a kvalifikátoru odvozeného ze standardní chyby (§5.2); předem zapsané kritérium publikace výzkumné vrstvy a popis asymetrického zkreslení vstupu (§5.3); seznam kandidátních zdrojů k dohledání (§3.6); analytický prototyp se samotestem na syntetických datech (§9.1).

**Není hotové:** běh prototypu nad skutečnými soubory CERMAT a ověření mapy sloupců proti vysvětlivkám, úplný import MZ do runtime, datový kontrakt v kódu, aktualizace všech ročníků, veřejné profily, referenční srovnání na webu, rozhodnutí o kohortním pilotu, testy rendereru a produkční přejímka. Aktuální `public/cermat_results_2026.json` obsahuje JPZ, nikoli maturitní data.

## 11. Historie rozhodnutí

- Původní návrh správně odmítl univerzální žebříček škol podle výsledků.
- Oponentura R1 doplnila, že maturitní data existují na úrovni jednotlivých škol a skupin oborů a že je třeba je uvést v auditu zdrojů.
- Byla přijata možnost popisné prezentace a ověření rozdílu mezi očekávaným a skutečným výsledkem.
- Bylo odmítnuto tvrzení, že samotné propojení přes REDIZO dokládá stejnou kohortu nebo přidanou hodnotu školy.
- 12. 9. 2026 byl návrh zpřesněn: profil výsledků ano, známka kvality ne; veřejné srovnání až po kontrole granularity, populace a velikosti vzorku.
- 12. 9. 2026 (v1.1): přijat katalog metrik s češtinou jako hlavním srovnávacím předmětem a matematikou vždy ve dvojici s podílem volby; kvalifikátor srovnání odvozen ze standardní chyby průměru místo pevného prahu; reference je medián škol ve stejné `SMO16`; kritérium publikace výzkumné vrstvy (korelace reziduí v čase) zapsáno předem; přijat analytický prototyp bez zásahu do runtime.

## 12. Reprodukce a odkazy v projektu

Hlavní návazné dokumenty:

- [Návrh rozvoje 2027](navrh-rozvoje-2027.md), zejména část o MZ a důkazní podklady R1.
- [Audit dat karet 2027](audit-dat-karet-2027.md), kde je uvedeno, že MZ zatím není plně importována.
- [Oponentura rozvoje 2027](oponentura-navrhu-rozvoje-2027.md), body O-1 až O-3 a jejich vypořádání.
- [Matice změn škol a oborů](matice-zmen-skol-a-oboru-2025-2026.md), která určuje rizika časových řad při změně identity.
- [Zadání dohledávání návaznosti](zadani-dohledavani-navaznosti-2025-2026.md), pravidla pro sloučení, rozdělení a místa výuky.

Před každým refreshi se musí zapsat datum stažení, URL, SHA-256, počet řádků, počet školních a `SMO16` řádků, změny schématu a výsledek validačních testů. Není dovoleno pouze změnit rok v UI nebo převzít nový soubor bez porovnání s předchozí revizí.

Tento dokument sám nemění data ani veřejné rozhraní.
