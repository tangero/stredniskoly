# Oponentura návrhu rozvoje 2027

Verze 2.1 / R2. Zpracováno 11. 9. 2026, doplněno o O-19 po ověření Log Drainu. Předmět: `navrh-rozvoje-2027.md` v2.1, `prd-muj-vyber-2027.md` v0.5, `analyza-navstevnosti-2026.md` v1.1/A1.

Stav: oponentní posudek k rozhodnutí, nikoli schválená změna zadání. Body označené **OVĚŘENO** jsem doložil spuštěním kódu nebo stažením zdroje; **NÁZOR** je argumentace bez tvrdého důkazu.

## R2: stanovisko k vypořádání R1

Autor odpověděl na všech 14 bodů, u pěti z nich s protidůkazem. **Čtyři protidůkazy jsem nezávisle ověřil a všechny platí.** Dva z nich vyvracejí doporučení, která jsem v R1 formuloval jako jistá.

### Body, kde beru zpět vlastní tvrzení

| Bod | Co jsem tvrdil v R1 | Co ukázalo ověření | Nový stav |
|---|---|---|---|
| **O-5** | Změna klíče na REDIZO+KKOV opraví 97 % párování „za hodiny“ | Protipříklad platí doslova. Ověřeno: 185 kolidujících základních skupin, 407 historických ID míří do skupiny s více zaměřeními. Sloučení klíče by jim přiřadilo cizí výsledek. | **Doporučení stahuji** |
| **O-1/O-3** | Kohortní propojení JPZ 2022 → MZ 2026 je dosažitelné klíčem REDIZO | Hlavička JPZ 2022 obsahuje pouze PŘIHLÁŠENI, KONALI, NEKONALI a percentily. **Pole o přijetí tam není.** Vstupní úroveň přijatých na konkrétní školu z těchto dat nezískáme. | **Závěr o kohortě stahuji** |
| **O-2** | Soubory mají tvar `MZ<rok><j\|p>`, obě období do 2026 | `MZ2026p` vrací 404; podzimní stav se jmenuje `jap` (`MZ2025jap` existuje, 2,1 MB). Pro 2026 je v katalogu jen jaro. | **Formule opravena autorem správně** |
| **O-6** | Heuristika podle počtu listů v aktuálním kódu není | Autor doložil `len(sheets) == 1` v `import_cermat_results.py` na commitu `c17d42e`, tedy v jiném souboru, než jsem prohlížel. | **Autor má pravdu** |

Ověření protipříkladu O-5 na produkčních datech:

```
600004775_63-41-M/02_oa_cestovni_ruch                      průměr 54,41  přijatých 59
600004775_63-41-M/02_oa_ekonomika_a_podnikani_v_evropske_unii  průměr 61,42  přijatých 60
```

Dvě různá zaměření pod jedním základním klíčem, rozdíl 7 bodů v průměru. Při sloučení by jedno z nich dostalo cizí číslo. Moje formulace „97 procent za práci v řádu hodin“ měřila existenci klíče, nikoli jednoznačnost vazby. To byl metodický omyl na mé straně, nikoli nedorozumění.

### Body, kde na svém stanovisku trvám

**O-13 zůstává jediným otevřeným produkčním rizikem.** Autor jej správně vede jako blokátor a zadal dodávku S0 s přijímacími podmínkami. Dokumentace je tím vyřešená, **kód nikoli**. Trvám na tom, že bod nelze uzavřít ničím jiným než commitem opravy a ověřením na produkci. Formulace autora („dokumentace upravena, kód a produkce neopravena“) je s tímto v souladu.

**O-14, podbod 2** autor zapracoval do PRD §8. Přijímám.

### Hodnocení kvality vypořádání

Vypořádání R1 je nadprůměrné ve dvou ohledech, které stojí za pojmenování:

- **Nesouhlas je podložen, nikoli deklarován.** U každého rozporu je uveden konkrétní protidůkaz s reprodukovatelným postupem (E1 až E7). To je vzácné; obvyklá reakce na oponenturu je buď přijetí všeho, nebo obecné odmítnutí.
- **Důsledně se rozlišuje „zapracováno do zadání“ od „opraveno v kódu“.** Věta „Samotná změna textu návrhu O-13 neuzavírá“ je přesně ta hranice, kterou dokumenty tohoto typu obvykle stírají.

---

## R2: nová zjištění

### O-19. Náhledové obrázky pro sdílení jsou rozbité (HTTP 500)

**Stav:** otevřeno. **Priorita:** vysoká, produkční vada. **OVĚŘENO** na produkci i v runtime logách. **Nalezeno mimochodem** při ověřování Log Drainu.

Všechny tři generátory náhledových obrázků vracejí chybu:

| Adresa | Stav |
|---|---|
| `/opengraph-image` | HTTP 500 |
| `/regiony/opengraph-image` | HTTP 500 |
| `/simulator/opengraph-image` | HTTP 500 |

Chyba z runtime logu, opakuje se soustavně (23 chyb 500 za hodinu proti 3 854 úspěšným):

```
GET /opengraph-image 500 [error/edge-function]
Error: process.env.NEXT_DEPLOYMENT_ID is missing but runtimeServerDeploymentId is enabled
    at next/dist/esm/server/web/edge-route-module-wrapper.js:58:48
```

**Příčina.** Soubor `src/app/opengraph-image.tsx` má `export const runtime = 'edge'`. V kombinaci s Next.js 16.1.4 a zapnutým `runtimeServerDeploymentId` na straně Vercelu edge wrapper selže na chybějící proměnné. `NEXT_DEPLOYMENT_ID` není nikde v repozitáři, jde o nastavení platformy.

**Dopad.** Hlavní stránka v hlavičce deklaruje `og:image` s odkazem na tuto adresu:

```
<meta property="og:image" content="https://prijimackynaskolu.cz/opengraph-image?63db45ffb17c61c1"/>
```

Odkaz na web sdílený na Facebooku, Twitteru nebo v chatu tedy **nemá náhledový obrázek**. Podle analýzy návštěvnosti přichází ze sociálních sítí 2 626 návštěv, z toho 1 750 z Facebooku, kde náhled zásadně ovlivňuje prokliknutelnost.

**Potvrzení dopadu z logů.** Export z BetterStacku ukazuje, že chybu 500 dostával přímo `facebookexternalhit/1.1`, tedy robot Facebooku stahující náhled. Nejde o teoretický dopad.

**OPRAVENO 11. 9. 2026.** Odstraněn `runtime = 'edge'` ze všech tří souborů (`src/app/opengraph-image.tsx`, `regiony/`, `simulator/`). Ověřeno sestavením a lokálním během:

| Adresa | Před | Po |
|---|---|---|
| `/opengraph-image` | 500 | 200, PNG 1200×630, 49,9 kB |
| `/regiony/opengraph-image` | 500 | 200, PNG 1200×630, 59,1 kB |
| `/simulator/opengraph-image` | 500 | 200, PNG 1200×630, 49,3 kB |

Vedlejší přínos: v build výstupu se všechny tři změnily z dynamické funkce na **staticky předgenerovaný obsah** (`○`). Odpadá tím volání funkce při každém stažení náhledu.

**Zbývá:** nasadit a ověřit na produkci, ideálně přes validátor náhledu Facebooku, který si vynutí nové stažení. Stav: opraveno lokálně, **nenasazeno**.

---

### O-15. Nesrovnalost v analýze v1.1: hodnota Others

**Stav:** otevřeno. **Priorita:** nízká, jde o přesnost údaje. **OVĚŘENO.**

Analýza v1.1 v sekci 3 uvádí: „V `/skola/ - Others` je 12 137 zobrazení.“ Při nezávislém ověření stejným dotazem (`Actions.getPageUrls`, `flat=1`, `filter_limit=-1`, stejné období) dostávám pro řádek `/skola/ - Others` hodnotu **12 208**, tedy přesně to číslo, které v1.1 označuje za nereprodukovatelné z v1.0.

Souvisejícím zjištěním je, že v1.0 uváděných 12 208 „zobrazení všech profilů“ nebylo chybnou reprodukcí, ale správnou hodnotou **agregátu Others**, jen nesprávně popsanou jako součet všech profilů. Skutečný součet prefixu `/skola/` je 14 462, což v1.1 uvádí správně.

Doporučení: opravit číslo 12 137 na 12 208 a v tabulce vypořádání upravit řádek „Profily souhrnně 12 208 zobrazení“ tak, aby uváděl, že šlo o záměnu agregátu Others za celkový součet, nikoli o nereprodukovatelný údaj. Ostatní součty v1.1 jsem ověřil a souhlasí: 44 527 zobrazení řádků, 25 440 vstupů, rozdíl 322.

### O-16. Drobná neshoda v součtech Matomo

**Stav:** k informaci, neblokuje. **OVĚŘENO.**

Analýza v1.1 poctivě eviduje neuzavřený rozdíl 322 vstupů a 8 návštěv. Dodávám pozorování, které jej vysvětluje: dotazy `period=range` a `period=month` vracejí mírně odlišné hodnoty (25 775 proti 25 762 návštěv; `Actions.get` uvádí 44 542 zobrazení proti 44 527 ze součtu řádků). Rozdíl je pod 0,1 % a odpovídá průběžnému dni a archivaci na straně Matomo.

Nejde o chybu analýzy. Potvrzuje to ale zásadu z v1.1 pracovat s dokončenými dny; doporučuji ji dodržet i u příštích reportů, aby se rozdíl nevykládal jako nález.

### O-17. Vercel Web Analytics je přes API nedostupné

**Stav:** otevřeno, organizační. **OVĚŘENO.**

Web Analytics na projektu běží a v rozhraní ukazuje data. Dotaz přes API na správný projekt (`prj_Yh3UG…`, projekt `stredniskoly`) přesto vrací `404 — Web Analytics not found`, zatímco jiné dotazy na tentýž projekt fungují. Nejde o chybu nastavení; čtení přes API zřejmě vyžaduje vyšší úroveň.

Praktický důsledek: čísla z Vercelu je nutné předávat ručně. Pro rozbory zůstává hlavním zdrojem Matomo.

Související zjištění: lokální `.vercel/project.json` ukazuje na projekt `gymnazium` (`prj_45cAL…`), zatímco produkce běží pod `stredniskoly`. Tuto neshodu doporučuji narovnat, protože vede k chybným závěrům; sám jsem na ni v předchozím kole naletěl.

### O-18. Runtime logy Vercelu neobsahují user agent

**Stav:** otevřeno, vstup pro rozhodnutí o měření. **OVĚŘENO.**

Runtime logy na správném projektu fungují a za hodinu ukazují 771 různých cest. Záznam má tvar `GET /api/schools/search 200 [info/serverless] dep=… cache=MISS` a **neobsahuje user agent ani referer**. Klasifikaci agenta z nich tedy získat nelze, což je jádro měření navrženého v `navrh-logovani-api-endpointu.md`.

Za sledovanou hodinu nepřišel na `/api/skola/` ani jeden požadavek, zatímco vyhledávání mělo 159. Jeden vzorek mimo sezónu, závěr z toho dělat nelze; je to ale první náznak, že strojové formáty nemusí nikdo používat.

---

## Historie: co se změnilo ve verzi 1.1

Autor mezitím vydal PRD v0.3, doplnil hlavičku návrhu rozvoje a upravil záznam dodávky. Změny reaguji takto:

**Metodická výtka verze 1.0 je vyřešena.** Hlavní výhrada 1.0 zněla, že návrh rozvoje popisuje stav před commitem `c9ae452` a nelze jej použít jako zadání. Návrh nyní nese hlavičku, která to říká výslovně: „Níže uvedené počty, nedostatky a doporučení zachycují výchozí stav na commitu `c17d42e`; nejsou aktuálním seznamem nevyřešených chyb.“ Doporučení z verze 1.0 rozdělit dokument na archiv a živé zásady bylo naplněno jinou, ale funkční cestou.

**PRD v0.3 řeší to, co verze 1.0 požadovala.** Tabulka „Aktuální stav realizace“ odděluje hotové od navrženého, odlišuje produktové schválení od implementace („Schválení produktové volby není dokladem její implementace“) a uvádí doklad nasazení včetně commitu a ověření veřejných souborů. To je přesně ten typ rozlišení, který verze 1.0 oceňovala na původním návrhu.

**Co PRD neřeší.** Body O-1 až O-3 (historie JPZ 2017–2023, maturitní data po školách, kohortní analýza) nejsou v PRD v0.3 ani v záznamu dodávky nijak tematizovány. Ověřeno hledáním v obou dokumentech. Zůstávají otevřené beze změny.

**Nové zjištění při ověřování.** Kontrola kódu ukázala, že O-4 byl ve verzi 1.0 formulován nepřesně. Podrobnosti níže; vzniká z toho nový bod O-13.

---

## Část A: Zjištění, která mění závěry návrhu

### O-1. Data JPZ po školách existují od roku 2017, nikoli od 2024

**Odpověď R1, 11. 9. 2026:** odpověď autora k oponentnímu ověření. [Rozhodnutí a důkaz k O-1](navrh-rozvoje-2027.md#r1-o-1). Níže je původní stanovisko v1.1.

**Stav:** zdroje potvrzeny, závěr o kohortě v R2 stažen. **Priorita:** střední. **OVĚŘENO** stažením souborů.

> **Oprava (R2).** Existence souborů 2017–2023 platí. Závěr, že umožňují kohortní propojení vstupu a výstupu, **neplatí**: hlavička JPZ 2022 obsahuje jen PŘIHLÁŠENI, KONALI, NEKONALI a percentily, nikoli přijaté. Vstupní úroveň přijatých na konkrétní školu z těchto dat nezískáme. Viz přehled v úvodu R2.

Pracovní domněnka zněla, že data CERMATu nesahají před rok 2024, a proto nelze propojit vstupní a výstupní výsledky jedné kohorty. Tato domněnka je nesprávná.

CERMAT publikuje agregované výsledky JPZ po školách za roky 2017 až 2023 pod odlišným názvem souboru, než jaký používá pro ročníky od 2024:

```
https://data.cermat.cz/files/files/JPZ/agregovana_data_skoly/JPZ<ROK>_skoly-skolobory_vysledky.xlsx
```

Ověřeno stažením a rozborem obsahu:

| Rok | Řádků | Unikátních REDIZO | Názvy listů | Sloupců |
|---|---:|---:|---|---:|
| 2017 | 3 423 | 1 086 | `JPZ2017_red`, `ciselniky` | 22 |
| 2019 | 3 277 | 1 060 | `JPZ2019_red`, `ciselniky` | 20 |
| 2021 | 2 056 | 719 | `JPZ2021`, `ciselniky` | 18 |
| 2022 | 3 295 | 1 066 | `JPZ2022-radny a nahradni termin` | 24 |
| 2023 | 3 318 | 1 076 | `List1` | 24 |

Obsah za školu a oborovou skupinu: přihlášení, konali, nekonali, průměrné percentilové umístění a směrodatná odchylka, zvlášť pro český jazyk a matematiku.

Omezení, která je nutné respektovat:

- Starší soubory měří **percentilové umístění**, nikoli body ani procentní skór. Se současnými daty nejsou přímo srovnatelné bez explicitního převodu.
- Jde o výsledky **všech konajících** v dané škole, nikoli o výsledky přijatých. To je jiná populace, než se kterou projekt pracuje dnes.
- Rok 2021 je covidový ročník s výrazně nižším pokrytím (719 REDIZO). Je to věcné omezení dat, nikoli chyba importu.

Co skutečně nejde a co domněnka správně vystihla: **data po jednotlivých uchazečích** jsou až od roku 2024. CERMAT to uvádí výslovně na přehledové stránce: „Od roku 2024 jsou k dispozici data po uchazečích s údaji o všech jejich přihláškách na střední školy, s údajem o přijetí na SŠ a s výsledky didaktických testů JPZ.“ Zpětnou rekonstrukci chování jednotlivce tedy provést nelze, pouze školní agregáty.

**Důsledek.** Kohortní propojení vstupu a výstupu je proveditelné. Maturanti jara 2026 nastupovali do čtyřletých oborů v roce 2022, a pro ten rok data po školách existují. Vazba je v percentilech, nikoli v bodech.

Zdroj: [Agregovaná data JPZ](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/agregovana-data-jpz.html), [přehled dat JPZ](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska.html).

---

### O-2. Maturitní výsledky po školách chybí v auditu dostupných zdrojů

**Odpověď R1, 11. 9. 2026:** odpověď autora k oponentnímu ověření. [Rozhodnutí a důkaz k O-2](navrh-rozvoje-2027.md#r1-o-2). Níže je původní stanovisko v1.1.

**Stav:** otevřeno. **Priorita:** vysoká. **OVĚŘENO** stažením souboru.

Návrh v tabulce přehledů uvádí řádek „Co po absolvování oboru“ a odkazuje na nezaměstnanost absolventů podle oborových skupin. Neobsahuje žádnou zmínku o tom, že CERMAT publikuje maturitní výsledky **na úrovni jednotlivých škol**. To je v auditu dostupných dat vynechání, nikoli názorový rozdíl.

```
https://data.cermat.cz/files/files/MZ/agregovana_data_skoly/MZ<ROK><j|p>_SC_skolobory.xlsx
```

Dostupné roky 2015 až 2026, jarní i podzimní termín. Ověřen soubor `MZ2026j_SC_skolobory.xlsx`: 3 739 řádků, 98 sloupců, 2,2 MB.

Struktura je hierarchická, úroveň agregace rozlišuje sloupec `TŘÍDĚNÍ`:

| Úroveň | Řádků |
|---|---:|
| `total` (ČR celkem) | 1 |
| `typ_skoly` | 5 |
| `kraj`, `smo16`, kombinace | 322 |
| `redizo` | 1 112 |
| `redizo_smo16` | 2 297 |

Za každou školu: přihlášeni, konali, uspěli, neuspěli, nekonali, podíl úspěšných, čistá a hrubá neúspěšnost, neúčast. Celkem za společnou část i zvlášť pro sedm předmětů (ČJ, MA, AJ, NJ, RJ, FJ, ŠJ), u předmětů navíc průměrný procentní skór, směrodatná odchylka, průměrné percentilové umístění a podíl volby předmětu.

Párování na stávající data je přímé přes REDIZO. Rozdíl granularity: projekt pracuje s obory podle KKOV, maturitní data jsou po skupinách oborů (`smo16`).

Zdroj: [Agregovaná maturitní data](https://data.cermat.cz/maturitni-zkouska/agregovana-data.html).

---

### O-3. Odmítnutí maturitních dat je metodicky nekonzistentní

**Odpověď R1, 11. 9. 2026:** odpověď autora k oponentnímu ověření. [Rozhodnutí a důkaz k O-3](navrh-rozvoje-2027.md#r1-o-3). Níže je původní stanovisko v1.1.

**Stav:** v R2 přehodnoceno, požadavek na zadání studie přijat autorem. **NÁZOR.**

> **Oprava (R2).** Můj argument stál na předpokladu z O-1, že kohorta je dosažitelná. Ten padl. Autorovo řešení (popisná studie s vymezenými omezeními, bez slibu měření přidané hodnoty) je správnější než moje původní formulace.

Návrh uvádí: „Maturitní výsledky bez návazné kohorty a kontextu nedokazují přidanou hodnotu školy.“

Jako varování je to správné a souhlasím s ním. Jako důvod data nepoužít to neobstojí, protože **návazná kohorta je podle O-1 dosažitelná**: vstup z JPZ 2022, výstup z maturity 2026, klíčem REDIZO.

Nekonzistence: návrh v sekci 7 sám požaduje zpětné ověření odhadů na dosud nepoužitém ročníku (trénovat na 2024–2025, vyhodnotit na 2026). To je metodicky totéž myšlení. Není konzistentní požadovat backtesting u jednoho a odmítat kohortní analýzu u druhého.

Návrh na úpravu formulace: odmítnout **jednoduchý žebříček podle maturitních výsledků** (s tím souhlasím bez výhrad, viz O-11) a současně **zadat ověření** rozdílu mezi očekávaným a skutečným maturitním výsledkem vzhledem ke vstupní úrovni přijatých. Publikovat teprve po ověření, nikoli odmítnout předem.

---

## Část B: Technické výtky návrhu, které obstály

### O-4. Kalkulačka šancí ignoruje body dítěte

**Odpověď R1, 11. 9. 2026:** implementace otevřená. [Rozhodnutí a důkaz k O-4](navrh-rozvoje-2027.md#r1-o-4). Níže je původní stanovisko v1.1.

**Stav:** zúženo k 11. 9. 2026 (verze 1.1). **Priorita:** snížena z kritické na nízkou. **OVĚŘENO** v kódu.

> **Oprava proti verzi 1.0.** Verze 1.0 tvrdila, že modul „běží na produkci a zobrazuje procenta“. Kontrola vykreslování to nepotvrdila. V `src/app/moje-sance/MojeSanceClient.tsx` se z výsledku vykresluje pouze `acceptRate2025`, `acceptRate2024`, `trendLabel`, `demandColor` a počty uchazečů podle priority. Pole `chancePct`, `label` ani `estimatedMinScore` se uživateli nezobrazují. Odpovídá to tvrzení PRD v0.3, že z přehledu konkurence byla odstraněna „nepodložená osobní procenta a předpovědi“. Tvrzení verze 1.0 o produkčním riziku bylo v tomto místě nepřesné.

Zbývající, výrazně menší problém: mrtvý výpočet zůstává v kódu a je stále exportován přes `analyzeCombination`. Pokud jej někdo v budoucnu napojí na zobrazení, vada se vrátí bez varování. Doporučení: buď výpočet odstranit, nebo u něj ponechat komentář, proč se nesmí vykreslovat.

Vlastní popis vady zůstává v platnosti, protože kód se nezměnil. V `src/lib/chances.ts`:

- řádek 103: odhad vzniká jako poměr přijatých k přihláškám za 2025;
- řádek 107: dělí se změnou poptávky;
- řádek 110: ořezává se na rozsah 5 až 95 procent;
- řádky 122–125: výsledek se kategorizuje na „Vysoká šance“ až „Velmi nízká šance“.

Body uchazeče do výpočtu nevstupují na žádném místě funkce.

**Zpřesnění nad rámec návrhu.** Odhad minimálního skóre na řádcích 113 až 121 násobí loňské minimum koeficientem `0,3` při růstu poptávky a `0,2` při jejím poklesu. Tyto konstanty nemají v kódu ani v návrhu žádné zdůvodnění a nejsou nikde ověřené. Jde o samostatnou vadu vedle té, kterou návrh popisuje.

**Rozpor v návrhu je vyřešen praxí.** Sekce 3 návrhu říká kalkulačku zachovat „nanejvýš jako popis konkurence“, sekce 9 odložit „osobní procenta bez zpětného ověření“. Dodávka `c9ae452` zvolila právě první variantu: zobrazuje se historická úspěšnost a struktura priorit, nikoli osobní procento. Rozpor tedy netrvá.

---

### O-13. Riziko osobního odhadu se přesunulo do simulátoru

**Odpověď R1, 11. 9. 2026:** implementace otevřená. [Rozhodnutí a důkaz k O-13](navrh-rozvoje-2027.md#r1-o-13). Níže je původní stanovisko v1.1.

**Stav:** otevřeno. **Priorita:** vysoká. **OVĚŘENO** v kódu. **Nový bod verze 1.1.**

Při ověřování O-4 jsem našel stejný typ vady na jiném místě, které žádný z dokumentů nezmiňuje. Verze 1.0 jej přehlédla, protože se soustředila na modul, na který upozorňoval návrh.

V `src/app/simulator/SimulatorClient.tsx` na řádcích 357 až 362 vzniká kategorie takto:

```
const diff = totalScore - minBody;
if (diff >= 10)  return { status: 'accepted',   label: 'Vysoká šance' };
if (diff >= -10) return { status: 'borderline', label: 'Na hraně' };
return              { status: 'rejected',   label: 'Malá šance' };
```

Rozdíl proti O-4 je podstatný a v obou směrech:

- **Lepší:** body dítěte zde skutečně vstupují do výpočtu (`totalScore`). Není to prázdná statistika jako v `chances.ts`.
- **Horší:** narozdíl od O-4 se tento výsledek uživateli **skutečně zobrazuje**, a to na několika místech (řádky 884, 974, 1364), včetně souhrnu typu „Vysoká šance (N oborů)“.

Tři konkrétní výhrady:

1. **Prahová hodnota 10 bodů není nikde odvozena.** Symetrické pásmo ±10 bodů kolem loňské hranice je konstanta bez doložení, stejně jako koeficienty 0,3 a 0,2 v O-4. Návrh rozvoje přitom sám varuje, že „historické minimum není předpověď příští hranice“.
2. **Porovnává se proti `min_body_2025`.** Funkce `getAdmissionThreshold` na řádku 119 vrací loňské celkové minimum včetně školních kritérií. To je přesně ta záměna významů, kterou návrh popisuje v sekci 3 pod bodem „Prověřit bodové významy v simulátoru“. Výtka návrhu je tedy stále platná a nebyla dodávkou `c9ae452` řešena.
3. **PRD v0.3 tuto cestu nepokrývá.** Tabulka stavu uvádí u oprav výkladu dat, že jde o opravy „v dotčených cestách“ a výslovně dodává „Nejde o audit všech starších kalkulaček“. Simulátor je právě taková starší kalkulačka.

**Doporučení.** Zařadit simulátor do rozsahu oprav dřív než Můj výběr. PRD v sekci 8 správně požaduje „před připojením simulátoru prověřit převody skóre a odvozování dalších školních kritérií“, ale simulátor běží na produkci **už teď**, nezávisle na tom, zda se do Mého výběru někdy připojí. Podmínka formulovaná jako předpoklad budoucí integrace neřeší současný stav.

---

### O-5. Párování oborů je rozbité, ale řešení je výrazně levnější, než návrh předpokládá

**Odpověď R1, 11. 9. 2026:** odpověď autora k oponentnímu ověření. [Rozhodnutí a důkaz k O-5](navrh-rozvoje-2027.md#r1-o-5). Níže je původní stanovisko v1.1.

**Stav:** otevřeno. **Priorita:** vysoká, poměr přínosu k práci je nejlepší z celého seznamu. **OVĚŘENO** výpočtem.

Návrh uvádí, že pouze 1 445 z 2 837 ID za rok 2025 má přesný protějšek ve výsledcích 2026. Ověřeno, čísla odpovídají řádově (naměřeno 1 425 z 2 808 pro aktuální data).

Návrh ale zůstal u diagnózy a nabízí těžší řešení, než je nutné. Ověřil jsem párování pouze přes kombinaci REDIZO a KKOV, tedy bez koncovky se slugifikovaným zaměřením:

| Metoda párování | Spárováno | Podíl |
|---|---:|---:|
| Přesné ID včetně zaměření | 1 425 / 2 808 | 51 % |
| REDIZO + KKOV | 2 728 / 2 808 | 97 % |

Problém tedy není nestabilita identifikátorů obecně, ale konkrétně to, že klíč obsahuje zaměření odvozené z názvu, který se mezi ročníky mění.

Návrh doporučuje ukládat zdrojová `ID_SO` a `ID_SOF` a vést explicitní vztahy mezi obory. Dlouhodobě je to správné a nerozporuji to. Krátkodobě ale **97 procent získáte změnou párovacího klíče**, což je práce na hodiny, nikoli na dny. Doporučuji rozdělit na okamžitou opravu klíče a samostatný pozdější úkol pro plný datový model.

---

### O-6. Výtka k rozpoznávání formátu importu je správná, ale mířená na jiné místo

**Odpověď R1, 11. 9. 2026:** odpověď autora k oponentnímu ověření. [Rozhodnutí a důkaz k O-6](navrh-rozvoje-2027.md#r1-o-6). Níže je původní stanovisko v1.1.

**Stav:** otevřeno. **Priorita:** střední, roste na vysokou při realizaci O-1. **OVĚŘENO** v kódu a na souborech.

Návrh tvrdí, že importní skript rozlišuje předchozí ročník podle počtu listů. V současném `scripts/import_cermat_2026_real.py` taková heuristika není, skript bere první list (`wb[wb.sheetnames[0]]`).

Princip výtky však platí a je naléhavější, než návrh předpokládá. Historické soubory JPZ mají nejednotnou strukturu, jak dokládá tabulka v O-1: názvy listů `JPZ2017_red`, `JPZ2021`, `List1`, počet sloupců 18 až 24. Jakmile se sáhne po historii 2017 až 2023, je poznávání formátu podle hlaviček nutnost, nikoli hygiena.

---

## Část C: Výtky návrhu, které jsou již překonané

**Stav části k verzi 1.1: vyřešeno.**

Verze 1.0 zde upozorňovala, že návrh rozvoje je auditem commitu `c17d42e` z 21. 6. 2026, zatímco commit `c9ae452` z 11. 9. 2026 (PR #71) podstatnou část kritiky vyřešil. Riziko bylo v tom, že by někdo podle návrhu naplánoval již hotovou práci.

Autor to vyřešil hlavičkou v návrhu rozvoje, která rozlišení uvádí výslovně, a doplněním záznamu dodávky o commit a datum nasazení. Doporučení verze 1.0 („nepoužívat návrh v této podobě jako zadání“) tím pozbylo platnosti a **ruší se**. Návrh lze používat jako archivovaný audit výchozího stavu, což jeho hlavička nyní jednoznačně sděluje.

Následující tři body zůstávají zapsané jako doklad, co přesně bylo překonáno.

### O-7. Zastaralá metadata importu

**Odpověď R1, 11. 9. 2026:** dřívější uzavření potvrzeno. [Rozhodnutí a důkaz k O-7](navrh-rozvoje-2027.md#r1-o-7). Níže je původní stanovisko v1.1.

**Stav:** vyřešeno 11. 9. 2026 (commit `c9ae452`, doloženo v PRD v0.3). **OVĚŘENO.**

Návrh uvádí, že metadata odkazují na aktualizaci CERMAT z 8. 3. 2026. Skutečný stav:

| Soubor | Záznamů (návrh) | Záznamů (dnes) | Platnost dat |
|---|---:|---:|---|
| `applications_2026.json` | 3 087 | 3 091 | 17. 8. 2026 |
| `cermat_results_2026.json` | 3 080 | 3 076 | 17. 8. 2026 |

Všech 3 076 záznamů nese `source_valid_at` = `2026-08-17`. Metadata obsahují zdrojovou URL i SHA-256.

### O-8. Zastaralý obsah hlavní stránky

**Odpověď R1, 11. 9. 2026:** dřívější uzavření potvrzeno. [Rozhodnutí a důkaz k O-8](navrh-rozvoje-2027.md#r1-o-8). Níže je původní stanovisko v1.1.

**Stav:** vyřešeno 11. 9. 2026. **OVĚŘENO** stažením živé stránky.

Návrh tvrdí, že na veřejné hlavní stránce přetrvává květnový obsah 2026, že číslo 3 080 je chybně označeno jako počet škol a že titulek o bodech nerozlišuje průměr od hranice. Stažená stránka `https://www.prijimackynaskolu.cz/` obsahuje:

- kalendář 2027, přihlášky na SŠ 1.–22. 2. 2027, konzervatoře 1.–30. 11. 2026;
- „1 120 Škol v historickém přehledu“, tedy správné rozlišení škol od oborů;
- explicitní větu „Průměr není hranice přijetí“;
- upozornění, že přehled nepokrývá obory bez JPZ.

Text o sportovních školách, který měl být podle návrhu opraven, se na stránce nenachází.

### O-9. Odhad pracnosti balíku A

**Odpověď R1, 11. 9. 2026:** odpověď autora k oponentnímu ověření. [Rozhodnutí a důkaz k O-9](navrh-rozvoje-2027.md#r1-o-9). Níže je původní stanovisko v1.1.

**Stav:** otevřeno k přepočtu. **NÁZOR.**

Tabulka uvádí 26 až 39 člověkodnů pro balíky A až C. Nemám čím odhad ověřit a neberu to jako vadu; návrh sám jej označuje za pracovní předpoklad. Balík A je však podle O-7 a O-8 z velké části hotový, takže horní odhad je zastaralý ze stejného důvodu jako sekce 1.

### O-10. Nenalezená implementace přípravného modulu

**Odpověď R1, 11. 9. 2026:** dřívější uzavření potvrzeno. [Rozhodnutí a důkaz k O-10](navrh-rozvoje-2027.md#r1-o-10). Níže je původní stanovisko v1.1.

**Stav:** vyřešeno v PRD v0.3. **NÁZOR.**

Návrh uvádí, že implementaci modulu přípravy nenašel v prohlédnutých cestách. To je korektně formulované omezení auditu, nikoli tvrzení o neexistenci.

PRD v0.3 formulaci dále zpřesnilo: „Produkční implementace nebyla v prověřených cestách doložena. Historický cílový termín 31. 8. 2026 není dokladem vydání.“ Rozlišení mezi nedoloženo a neexistuje je tím vyřešeno.

---

## Část D: Body návrhu, které potvrzuji jako správné

### O-11. Odmítnutí univerzálního skóre kvality školy

**Odpověď R1, 11. 9. 2026:** zásada zachována, doplnění k ověření. [Rozhodnutí a důkaz k O-11](navrh-rozvoje-2027.md#r1-o-11). Níže je původní stanovisko v1.1.

**Stav:** potvrzeno. **NÁZOR, souhlasím bez výhrad.**

Návrh nezavádí jeden celkový žebříček kvality škol s odůvodněním, že vstupní výsledky přijatých měří také výběrovost a složení uchazečů. To je správné a platí to i pro maturitní data z O-2: škola s vysokým vstupním skóre přijatých bude mít vysoké maturitní výsledky téměř automaticky.

Užitečnější než absolutní čísla je rozdíl mezi očekávaným a skutečným výsledkem vzhledem ke vstupní úrovni. Obě strany jsou nyní k dispozici (O-1, O-2).

### O-12. Právní opatrnost u dvou bodů je oprávněná

**Odpověď R1, 11. 9. 2026:** zásada zachována, doplnění k ověření. [Rozhodnutí a důkaz k O-12](navrh-rozvoje-2027.md#r1-o-12). Níže je původní stanovisko v1.1.

**Stav:** potvrzeno a **doplněno o rozbor pravidel**. **OVĚŘENO** čtením pravidel CERMAT.

Návrh upozorňuje, že veřejná adresa sama neopravňuje k obchodním sdělením a že veřejná dostupnost testů CERMAT neznamená právo je převzít do vlastní aplikace. Obojí je věcně správné a obojí by se snadno přehlédlo. Rozbor druhého bodu viz příloha 1.

### O-14. PRD v0.3: potvrzené zásady a dvě výhrady

**Odpověď R1, 11. 9. 2026:** odpověď autora k oponentnímu ověření. [Rozhodnutí a důkaz k O-14](navrh-rozvoje-2027.md#r1-o-14). Níže je původní stanovisko v1.1.

**Stav:** otevřeno v bodech níže. **Nový bod verze 1.1.** **NÁZOR**, pokud není uvedeno jinak.

PRD v0.3 potvrzuji jako věcně kvalitní. Zejména tyto zásady doporučuji zachovat beze změny:

- **Oddělení tří operací** (uložit, porovnat, zařadit do pořadí). Brání záměně kandidáta za preferenci.
- **„Pořadí se nemění odhadem systému.“** Přímo brání tomu, aby vada typu O-13 přerovnala rodině preference.
- **„Neznámý údaj není nevýhoda školy.“** Konzistentní s pravidlem „chybějící hodnota není nula“ z návrhu rozvoje.
- **Viditelnost stavu ukládání**, včetně věty „Selhání nesmí vypadat jako úspěch“.
- **Rozlišení čtyř stavů nabídky** (historie 2026, plán školy, vyhlášeno pro 2027, neověřeno) a pravidlo, že potvrzení školy není vyhlášením řízení.
- **Zákaz přenášet zákonný limit přihlášek na ukládání**, s podmínkou, že technický limit nesmí tiše mazat položky.
- **Přijímací kritéria pilotu jsou formulovaná jako ověřitelné úlohy**, nikoli jako přání. Bod 3 („vysvětlit rozdíl mezi neznámým údajem a nulou“) přímo testuje metodickou zásadu.

**Výhrada 1: Better Auth je uveden s odkazem, který jsem neověřoval.** PRD označuje zdroj jako „ověřený 11. 9. 2026“. Tento odkaz jsem v rámci oponentury nekontroloval, takže k němu nezaujímám stanovisko. Upozorňuji jen, že u autentizace je rozdíl mezi dokumentací pluginu a připraveností doručování e-mailů; PRD to ostatně samo uvádí u poznámky o Resendu.

**Výhrada 2: chybí vazba na datová zjištění.** PRD v sekci 10 vyjmenovává návaznost na existující části webu, ale nikde nezmiňuje, jaká data budou k dispozici pro obsah profilů. Body O-1 a O-2 přitom mění, co lze v profilu oboru vůbec ukázat (historie JPZ od 2017, maturitní výsledky školy). Doporučuji tuto vazbu do PRD doplnit dřív, než se uzavře struktura profilu, protože zpětné doplnění datové osy do hotového rozhraní je dražší než její zahrnutí do návrhu.

### Další potvrzené zásady

Metodická varování návrhu jsou konzistentní a věcně správná. Zachovat beze změny:

- přihlášky dělené kapacitou nejsou osobní pravděpodobnost;
- vyšší priorita nedává přednost před uchazečem s lepším výsledkem školního hodnocení;
- historické minimum není předpověď příští hranice;
- chybějící hodnota není nula;
- rejstříkové oprávnění vyučovat obor není vyhlášením přijímacího řízení do tohoto oboru;
- u každé informace zachovat rok a zdroj.

Systematické oddělování ověřeného od neověřeného („přítomnost naplánovaných workflow není důkazem, že aktualizace prošly“, „v této práci nebyly e-maily rozesílány“) je u podobných materiálů vzácné a mělo by se zachovat i v dalších verzích.

---

## Příloha 1: Rozbor pravidel CERMAT k převzetí testů

**OVĚŘENO** čtením úplného textu [Pravidel pro využívání obsahu informačních webů CZVV](https://prijimacky.cermat.cz/files/files/CZVV_pravidla-vyuziti-webstrankyp.pdf).

Posuzovaný model: odkázat na testy CERMATu, uživatel test vyřeší a do aplikace předá pouze své výsledky.

**Model je v zásadě průchozí, ale vyžaduje jedno upřesnění.**

Co je jednoznačně povolené. Pravidla výslovně uvádějí: „Zveřejňování odkazů na webové stránky Centra jsou povolené bez souhlasu ředitele Centra.“ Odkazování je bez omezení.

Kde je hranice. Pravidla u kategorie 1 (zkušební dokumentace) zakazují „jakékoli jeho užití, jakož i užití jakékoli jeho **části** pro komerční účely, šíření či další zpřístupňování bez předchozího explicitního písemného souhlasu ředitele Centra“. Do kategorie 1 patří podle výčtu v pravidlech mimo jiné **klíč správných řešení didaktického testu**, testový sešit, záznamový arch a vzorové úlohy včetně klíčů.

Formulaci „převezmeme jen výsledky“ je proto nutné rozdělit:

| Co aplikace dělá | Posouzení |
|---|---|
| Odkaz na test u CERMATu | Povoleno výslovně |
| Žák sám zapíše dosažené body | Vlastní data uživatele, bez dotčení pravidel |
| Žák označí úlohy, se kterými měl potíž | Vlastní data uživatele |
| Aplikace u sebe drží klíč správných řešení | **Převzetí chráněné části, nelze bez souhlasu** |
| Aplikace automaticky vyhodnotí odpovědi proti klíči | **Totéž, nelze bez souhlasu** |

Výjimka volného užití se nepoužije. Pravidla ji uvádějí až u kategorie 2 a 3 (organizační materiály, obsah webu), nikoli u zkušební dokumentace. Volné užití je navíc definováno jako užití „jehož účelem není dosažení přímého nebo nepřímého hospodářského nebo obchodního prospěchu“, což u produktu s plánovanou platbou za rozšířený obsah neplatí.

Cesta k souhlasu je pro projekt uzavřená. Pravidla uvádějí, že ředitel Centra uděluje souhlas pouze tehdy, je-li žadatelem „vzdělávací zařízení zapsané v rejstříku školských zařízení MŠMT“. Projekt tuto podmínku nesplňuje.

**Doporučený postup.** Odkaz na test u CERMATu; žák jej vytiskne a vyřeší na papíře; kontrola proti klíči otevřenému u CERMATu, nikoli v aplikaci; do aplikace vstupují pouze body a označení problémových úloh. Tento model má vedlejší přínos, který návrh sám zmiňuje: řešení na papíře nacvičí rýsování a práci se záznamovým archem.

Automatické vyhodnocování je možné pouze nad vlastní sadou úloh s učitelskou kontrolou, tedy přesně tak, jak návrh popisuje balík D.

---

## Příloha 2: Agregovaná položková data jako náhrada za klíč

**OVĚŘENO** stažením souboru.

Mapu obtížnosti úloh lze postavit z agregovaných položkových výsledků, které jsou samostatný dataset **mimo** kategorii zkušební dokumentace.

```
https://data.cermat.cz/files/files/JPZ/agregovana_data_polozky/<ROK>/JPZ<ROK>_<M|C><4|6|8>_ulohy_agregovane_vysledky.xlsx
```

Ověřen soubor `JPZ2026_M4_ulohy_agregovane_vysledky.xlsx` (matematika, čtyřleté obory, jaro 2026): 93 358 konajících, průměrný skór testu 41,25 %. Ke každé podúloze průměrný procentní skór a podíl žáků, kteří ji vynechali; u uzavřených úloh četnost volby jednotlivých alternativ.

Praktický důsledek: pokud žák označí úlohu `01.3` jako problematickou, aplikace může uvést, že její průměrný skór v ročníku byl 36,8 %. To je silná zpětná vazba bez dotčení chráněné dokumentace.

Omezení, které návrh správně uvádí a které platí i zde: samotné vynechání úlohy nedokazuje časovou tíseň a národní obtížnost se automaticky nepřenáší na novou úlohu.

---

## Doporučený postup

Historické doporučení oponenta v1.1; aktuální odpověď k pořadí je v návrhu v2.0 §10. Doporučení verze 1.0 rozdělit návrh na archiv a živé zásady se **ruší**, protože je autor vyřešil hlavičkou dokumentu (viz část C).

**Tři kroky s nejlepším poměrem přínosu k práci:**

1. **Opravit prahové hodnoty v simulátoru (O-13).** Nahradilo původní první místo (O-4), protože simulátor zobrazuje kategorie „Vysoká šance“ a „Malá šance“ uživatelům dnes, opírá se o nedoloženou konstantu ±10 bodů a porovnává proti loňskému minimu včetně školních kritérií. PRD tuto cestu výslovně nepokrývá.
2. **Změnit párovací klíč na REDIZO a KKOV (O-5).** 97 procent spárovaných záznamů za práci v řádu hodin, oproti 51 procentům dnes.
3. **Stáhnout historii JPZ 2017–2023 a maturitní data 2015–2026 (O-1, O-2).** Mění to, jaké analýzy jsou vůbec možné. V PRD v0.3 zatím není tematizováno.

**Otázka k rozhodnutí, nikoli k realizaci.** Sekce 8 PRD správně požaduje prověřit simulátor *před připojením* do Mého výběru. Je vhodné zvážit, zda tuto podmínku nepřeformulovat na termín nezávislý na integraci, protože simulátor běží na produkci už nyní.

---

## Zdroje

- [Agregovaná data JPZ, roky 2017–2026](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/agregovana-data-jpz.html)
- [Přehled dat a analytických výstupů JPZ](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska.html) — zdroj tvrzení o datech po uchazečích od roku 2024
- [Agregovaná maturitní data po školách](https://data.cermat.cz/maturitni-zkouska/agregovana-data.html)
- [Agregované výsledky úloh JPZ](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/agregovana-data-jpz/agregovane-vysledky-uloh-jpz.html)
- [Pravidla pro využívání obsahu webů CZVV](https://prijimacky.cermat.cz/files/files/CZVV_pravidla-vyuziti-webstrankyp.pdf)
- [Testová zadání k procvičování](https://prijimacky.cermat.cz/menu/testova-zadani-k-procvicovani)


## Odpověď autora R1 — další kolo

Úplné [vypořádání v původním návrhu](navrh-rozvoje-2027.md#vyporadani-r1) obsahuje i obě přílohy, rozlišení souhlasu a protidůkazů a historii verzí. Pro další oponenturu ověřit především rozdílné populace JPZ/MZ (O-1/O-3/O-11), kolize při odstranění zaměření (O-5), zdroj původní heuristiky (O-6) a dostatečnost podmínek opravy S0 (O-13). O-13 nelze uzavřít jen tímto textem; veřejná vada zůstává doložená v R1. Rozhodnutí dalšího oponenta doplnit jako R2 bez mazání R1.
