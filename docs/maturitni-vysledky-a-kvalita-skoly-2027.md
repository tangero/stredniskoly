# Maturitní výsledky a kvalita školy

**Verze:** 1.0
**Datum:** 12. 9. 2026
**Stav:** schválený analytický návrh; import maturitních dat a veřejná implementace ještě nezačaly.

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
| [JPZ školní agregáty 2017–2023](https://data.cermat.cz/files/files/JPZ/agregovana_data_skoly/JPZ{ROK}_skoly-skolobory_vysledky.xlsx) | Přímá reprodukce historické řady | Název souboru je pro roky před 2024 jiný než u novějších dat; schéma se musí adaptovat a ověřit. |
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

### Kontextové srovnání

Srovnávat lze pouze stejný předmět, rok, období, typ agregace a `SMO16`. Doporučený výstup je například „o X procentních bodů vůči mediánu stejné skupiny oborů“, nikoli pořadí všech škol. U agregovaného průměru použít stejnou definici vážení a uvést ji v metodice.

Pro srovnání uvést alespoň:

- referenční populaci;
- počet škol a žáků v referenci;
- rozdíl v procentních bodech nebo percentilech;
- zda byl výsledek stabilní ve více letech;
- zda se změnila identita školy nebo složení skupiny oborů.

### Výzkumná odchylka od očekávání

Možný pilot:

1. pro stejnou školu a `SMO16` získat vstupní signál z odpovídajícího přijímacího období;
2. odhadnout očekávaný maturitní výsledek podle vstupu, oborové skupiny, typu školy a ročníku;
3. porovnat očekávanou a skutečnou hodnotu;
4. zkontrolovat výsledek na jiných ročnících a alternativních specifikacích modelu;
5. publikovat nanejvýš „odchylku od očekávaného výsledku“ s intervalem nejistoty.

Tento pilot má několik zásadních omezení: neznáme jednotlivé žáky v obou souborech, maturitní skupina nemusí být totožná s přijatými žáky, vstupní data jsou na jiné granularitě, do výsledku vstupují opakování a přestupy a organizační změna školy může přerušit řadu. Dokud nebude tato návaznost doložená a validovaná, výstup zůstane interní analytickou studií.

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

Vysvětlení pod grafem:

> Výsledky popisují společnou část maturity v uvedeném období. Ovlivňuje je složení a velikost ročníku, volba předmětů, neúčast a další okolnosti. Nejde o záruku výsledku konkrétního žáka ani o celkové hodnocení kvality školy.

### Můj výběr

V porovnání dvou až čtyř uložených oborů zobrazit maturitu jako jednu oblast vedle přijímací náročnosti, dojezdu, nákladů, podpory a inspekčních informací. Porovnávat jen srovnatelné skupiny. Nezobrazit automatického vítěze ani nesloučit hodnoty do skóre vhodnosti.

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
6. **Kohortní pilot:** vytvořit interní notebook nebo reprodukovatelný skript, který ověří, zda vstupní signál a maturitní výsledek mají dostatečnou návaznost. Publikaci rozhodnout až po backtestu.

## 10. Co je hotové a co není

**Hotové:** existence a základní struktura zdroje MZ byla ověřena; byly identifikovány roky, období, granularita `redizo`/`redizo_smo16`, metriky a omezení; zdokumentována návaznost na JPZ, MŠMT, ČŠI/InspIS a Infoabsolvent; schválen zákaz jednoduchého žebříčku kvality; připraven tento datový a produktový návrh.

**Není hotové:** úplný import MZ do runtime, datový kontrakt v kódu, aktualizace všech ročníků, veřejné profily, referenční srovnání, kohortní pilot, testy rendereru a produkční přejímka. Aktuální `public/cermat_results_2026.json` obsahuje JPZ, nikoli maturitní data.

## 11. Historie rozhodnutí

- Původní návrh správně odmítl univerzální žebříček škol podle výsledků.
- Oponentura R1 doplnila, že maturitní data existují na úrovni jednotlivých škol a skupin oborů a že je třeba je uvést v auditu zdrojů.
- Byla přijata možnost popisné prezentace a ověření rozdílu mezi očekávaným a skutečným výsledkem.
- Bylo odmítnuto tvrzení, že samotné propojení přes REDIZO dokládá stejnou kohortu nebo přidanou hodnotu školy.
- 12. 9. 2026 byl návrh zpřesněn: profil výsledků ano, známka kvality ne; veřejné srovnání až po kontrole granularity, populace a velikosti vzorku.

## 12. Reprodukce a odkazy v projektu

Hlavní návazné dokumenty:

- [Návrh rozvoje 2027](navrh-rozvoje-2027.md), zejména část o MZ a důkazní podklady R1.
- [Audit dat karet 2027](audit-dat-karet-2027.md), kde je uvedeno, že MZ zatím není plně importována.
- [Oponentura rozvoje 2027](oponentura-navrhu-rozvoje-2027.md), body O-1 až O-3 a jejich vypořádání.
- [Matice změn škol a oborů](matice-zmen-skol-a-oboru-2025-2026.md), která určuje rizika časových řad při změně identity.
- [Zadání dohledávání návaznosti](zadani-dohledavani-navaznosti-2025-2026.md), pravidla pro sloučení, rozdělení a místa výuky.

Před každým refreshi se musí zapsat datum stažení, URL, SHA-256, počet řádků, počet školních a `SMO16` řádků, změny schématu a výsledek validačních testů. Není dovoleno pouze změnit rok v UI nebo převzít nový soubor bez porovnání s předchozí revizí.

Tento dokument sám nemění data ani veřejné rozhraní.
