# Co udělat s daty, která máme a nepoužíváme

Verze 1.2 · 17. 9. 2026 · **Návrh k rozhodnutí.** Vypořádána [oponentura](oponentura-navrh-nepouzitych-dat-2027.md) v kolech 1 a 2, viz oddíl 9.

Zadání znělo: projít tři sady dat, které leží nepoužité, a navrhnout, jak s nimi pracovat, aby web rodině vysvětlil, **kterou školu si vybrat, jak je dobrá, jak kvalitně přistupuje ke vzdělávání a jak si vedou její absolventi**.

Návrh prošel [soupis zdrojů](zdroje-dat.md) celý včetně oddílu 3, jak žádá CLAUDE.md. Zvážené a zamítnuté sloupce jsou v oddílu 1. Názvy a výpočty drží [slovník ukazatelů](slovnik-ukazatelu.md), slova na stránce [slovník pojmů](slovnik-pojmu.md), období [registr stavu datových sad](../public/stav_datovych_sad.json).

## 0. Co návrh tvrdí

Čtyři zjištění, tři z nich opravují to, co dosud platilo za pravdu:

1. **Data uchazečů 2026 nejsou nepřevzatá.** Jsou stažená, zkontrolovaná, zpracovaná a sloučená; všechny tři odvozené soubory za rok 2026 leží v `public/`. Chybí jediný krok, `prepni` v registru. Brzdí ho tři konkrétní věci, které jdou odstranit (oddíl 2.1).
2. **Dobíhající obor se nedá použít tak, jak to dva schválené dokumenty předpokládají.** Varování „škola tenhle obor zavírá“ by se netýkalo **ani jedné** z 3 091 nabídek, které web zobrazuje. Použitelná role příznaku je přesně opačná (oddíl 2.2).
3. **Přijatí podle priority jsou v datech úplní a dva schválené dokumenty si o nich odporují.** Navíc se ukázalo, že web jednu tabulku priorit už ukazuje, ale ze starší revize katalogu, která se u 315 nabídek rozchází s oficiálními souhrny. Rozpor jde vyřešit přesunutím údaje od otázky „jak těžké je se dostat“ k otázce „s kým se tam dítě potká“ (oddíl 2.3). Údaj není převyprávěná obtížnost přijetí: s ní koreluje −0,224, s tlakem prvních voleb 0,418.
4. **Žádné z těch tří dat neříká nic o tom, jak škola učí ani jak si vedou její absolventi.** Všechna tři popisují přijímací řízení. Na dvě ze čtyř otázek zadání tedy neodpovídají — a u absolventů jsem ověřil, že na ni nelze odpovědět ani ze zdrojů mimo projekt, protože jmenovatel označuje za nevěrohodný sám MŠMT (oddíl 3.1).

## 1. Povinná inventura: co jsem zvážil a nepoužiju

Oddíl 3 soupisu zdrojů, řádek po řádku. Zamítnutí je platný závěr, mlčení není.

| Nepoužitý sloupec | Závěr pro tento návrh | Proč |
|---|---|---|
| **Přijatí podle priority**, souhrny 40–44 | **použít**, dávka D3 | úplné za oba ročníky (3 091 z 3 091 v roce 2026), stabilní mezi roky (r = 0,716); viz 2.3 |
| **Dobíhající obor**, rejstřík | **použít jinak, než dokumenty říkají**, dávka D4 | jako varování se netýká ani jedné nabídky; jako rozlišení „obor doběhl“ od dvouletého cyklu ano; viz 2.2 |
| **Výsledek testu u všech uchazečů**, data uchazečů | **použít**, součást D1 | je to týž soubor, který se přepíná; nese pásma, souběh i kontext přihlášek |
| Výsledky zkoušky **všech uchazečů** v souhrnu, sloupce 45–65 | **použít jen `prumerne_umisteni_uchazecu`**, D3 | leží v `souhrny_kolo1.json` nezobrazené; vedle umístění přijatých odpovídá na to, zda si obor z uchazečů vybírá. Minimum a maximum zamítnuto: určuje je jediný uchazeč |
| **Oficiální nejnižší a nejvyšší výsledek přijatých**, sloupce 72–86 | **zamítnuto pro tento návrh** | `min_prijaty_percentil_souhrn` už v datech je a má nejřidší pokrytí ze všech polí (2 622 z 3 091); body se mezi ročníky nesrovnávají, medián posunu nejnižšího přijatého 2025→2026 je +5,0 bodu, což je obtížnost testu, ne změna nároků |
| **Celé maturitní výsledky** | **mimo rozsah**, hotovo od 14. 9. 2026 | zpracované a na stránce školy; jediná odpověď na „jak je škola dobrá“, kterou máme |
| Vstupní úroveň školy 2017–2023, `JPZ{rok}_skoly-skolobory` | **zamítnuto pro tento návrh**, zůstává jako P8 v [grafech](grafy-skoly-a-oboru-2027.md) | soubory nejsou stažené a linka historické ročníky nezakládá; je to samostatná dávka, ne součást těchto tří dat |
| **Profil dovedností** uchazečů, položková data `b1`–`b16.x` | **zamítnuto** | 390 MB nezpracovaných dat; odpovídá na „v čem byli silní ti, kdo se sem hlásili“, což je opět vstup, ne kvalita výuky. Poměr práce k užitku je nejhorší ze všech položek soupisu |
| Výsledky po termínech zvlášť, listy A–D | **zamítnuto** | kontrola srovnatelnosti termínů je metodická otázka CERMATu, ne údaj pro rodinu |
| **Agregáty 2. kola** | **mimo rozsah**, zapracováno od 13. 9. 2026 | |
| **Data uchazečů 2. kola** | **zamítnuto**, potvrzuji dřívější závěr | jen 133 oborů má ve 2. kole aspoň deset přijatých s výsledkem; registr hlásí dostupný rok 2026, ale početní základ se tím nemění |
| **Web a kontakt školy** | **mimo rozsah**, `WWW` používáno od 13. 9. 2026 | telefon a e-mail na web nepatří |
| `jpz_prumer_actual`, `jpz_median` v katalogu 2025 | **zamítnuto** | pocházejí z rozbitého `enrich_schools_data.py` (viz 2.1); než je zobrazovat, je třeba opravit generátor, a pak je stejně nahradí souhrny |
| `hard_facts.support_services` | **zamítnuto pro tento návrh** | patří do „Jaká škola je“ na stránce školy, kde už rozhodnutí padlo; s těmito třemi daty nesouvisí |
| `hard_facts.absence` | **zamítnuto pro tento návrh** | totéž |
| Důvod nepřijetí u jednotlivce, `ss*_duvod_neprijeti` | **zamítnuto**, duplicitní se souhrnem | potvrzuji; agregát je přesnější, protože zná zaměření |
| Platnost oboru v číselníku AKKO, `platnostDo` | **zamítnuto**, potvrzuji | celostátní rušení oboru se u stávajících nabídek neprojevuje; rejstříkový `dobihajiciObor` je konkrétnější a stejně vychází na nulu |
| Ředitel a délka funkce | **zamítnuto**, potvrzuji | osobní údaj bez doložené vypovídací hodnoty |
| `ss*_zrizovatel` u voleb uchazeče | **zamítnuto**, potvrzuji | |
| Rejstřík `kapacita` oborů | **zamítnuto**, potvrzuji, a nově s dokladem | u dobíhajících oborů rejstřík kapacitu ponechává: z 723 dobíhajících záznamů SŠ má kapacitu 0 jen 5. Kapacita v rejstříku tedy není signál o tom, že se obor nenabírá |

**Zdroje mimo soupis.** Protože zadání jmenuje absolventy a k těm soupis zdrojů nemá nic, prošel návrh i pět veřejných zdrojů, které v něm zapsané nejsou: Infoabsolvent NPI, pololetní statistiky absolventů MPSV, otevřená data MPSV, matriku SIMS a ČSÚ, plus dotaz nad Národním katalogem otevřených dat. Výsledek a důvody zamítnutí jsou v oddílu 3.1. Do soupisu zdrojů se zapisují, jen pokud se některý z nich začne používat.

**Duplicita ke srovnání.** `school_analysis.json` nese `priority_pcts` ze staršího zpracování. Jako zdroj pravdy platí `prijati_priority` a `prihlasky_priority` ze souhrnů; `StatsTab` dnes kreslí priority z `extendedStats`, tedy ze staré cesty, a D3 to musí převést.

## 2. Stav tří dat

### 2.1 Data uchazečů 2026: chybí jeden příkaz, brzdí tři věci

**Premisa zadání neplatí.** Úloha datové linky `3GQMK` (`cermat-uchazeci-kolo1`, období 2026, druh `nove_obdobi`) je ve stavu `predano`. Soubor byl stažen 13. 9. 2026, sha256 `6e9ca63a…`, 156 210 řádků, zpracován a sloučen commitem `0e0e66c` přes PR #85. V `public/` leží:

| Soubor | Obsah | Rozsah |
|---|---|---|
| `pasma_prijeti_2026.json` | pásma přijetí, nejnižší přijatý, rozhodl test, pásmo nejistoty | 2 879 oborů, 1 485 s pásmy, 1 416 s hranicí |
| `soubeh_prihlasek_2026.json` | souběžné přihlášky | |
| `kontext_prihlasek_2026.json` | výsledek uchazečů, obory výš a níž, odvozená hranice úspěšnosti | 5 077 oborů |

Web je nečte jen proto, že registr u sady `cermat-uchazeci-kolo1` drží `zobrazeno.obdobi` na hodnotě `2025`. Čtečky (`src/lib/pasma-prijeti.ts`, `src/lib/kontext-prihlasek.ts`, `src/lib/skola-profil-data.ts`) skládají název souboru z období v registru, takže **u nich je přepnutí jeden příkaz a překlopí se samy**.

**Zbytek webu ale letopočty napevno má a verze 1.0 to zamlčela.** Oponentura na to upozornila a přepočet ukázal větší rozsah, než uváděla: `src/lib/data.ts` má 13 přístupů tvaru `data['RRRR']` (mimo jiné řádky 897, 950, 1045, 1129, 1304) a dalších 11 řádků je jinde v `src/`; uživatelských textů s letopočtem napevno je zhruba **101 ve 36 souborech**. Část z nich je napevno správně — datum exportu InspIS, platnost dat CERMATu, harmonogram MŠMT na rok 2027 — takže skutečný dluh je menší podmnožina, kterou je nutné projít ručně. Sweep ročníků v textech je tedy samostatná práce, ne nula; zařazuje se do D3.

**Co je dnes na roce 2025.** Ze třinácti sad s použitím `web` drží rok 2025 **jediná** — `cermat-uchazeci-kolo1`. Kapacity, přihlášky, výsledky, obtížnost přijetí, pořadí v kraji, maturita i 2. kolo jsou 2026. Přijímací řízení 2026 tedy web ukazuje; přepnutí se týká **tří bloků odvozených z dat o jednotlivých uchazečích**:

| Blok | Změna po přepnutí |
|---|---|
| Pásma přijetí, nejnižší přijatý, pásmo nejistoty, *rozhodl test*, hustota u hranice | 2 846 → 2 879 oborů, z toho 118 nových; věta o tom, co rozhodlo, změní kategorii u **305 z 1 173** oborů |
| Výsledek uchazečů o obor, obory výš a níž, odvozená hranice úspěšnosti | 5 043 → 5 077 oborů; hranice u **1 108 → 1 156** oborů; obory výš a níž u 2 622 → 2 658 |
| Souběžné přihlášky | 5 043 → 5 077 oborů |

**Nejnižší přijatý výsledek se posune**: medián +1 bod, dolní čtvrtina −3, horní +6. Není to změna nároků škol, ale jiná obtížnost testu — percentil téhož uchazeče se posunul o −0,1 bodu. Je to doklad pravidla, že body se mezi ročníky nesrovnávají.

**Co přepnutí přinese rodině.** Stránka oboru dnes míchá dva ročníky: slovní verdikt obtížnosti a pořadí v kraji počítá ze souhrnů roku **2026**, zatímco pásma přijetí, „kam se dostali uchazeči“ a obory výš a níž na přihlášce jsou z roku **2025** (`src/lib/obor-profil-data.ts`, `souhrn.rok` vedle `kontextVysledek.rok`). Každý blok svůj rok uvádí, takže pravidlo registru porušené není, ale rodina čte jeden příběh ze dvou ročníků. Přepnutí tenhle rozpor odstraní.

Změní se i obsah. Podíl uchazečů, kteří se v 1. kole nedostali nikam, klesl mezi roky: medián ze 7 % na 5 %, a oborů s aspoň čtvrtinou takových uchazečů je 483 místo 588. Věta „pomůže mít na přihlášce i obor, kde v 1. kole místo bylo“ se podle [vrstev stránky oboru](vrstvy-stranky-oboru-2027.md) spouští právě na prahu čtvrtiny, takže se po přepnutí objeví u 105 oborů méně. Pokrytí pásem se nemění (1 485 proti 1 497; 195 oborů pásma získá, 205 ztratí).

**Tři překážky.**

1. **Ročník 2026 je předběžný, 2025 finální.** Registr to vede: 2026 jsou „platné přihlášky ke dni 13. 5. 2026“, 2025 je „finální, včetně údajů o vzdání se přijetí“. Přepnutí tedy vymění starší úplná data za novější neúplná. **Doklad, že to vadí málo:** u roku 2025 se předběžná a finální verze lišily o 24 řádků ze 159 196. A předběžný soubor 2026 dává počty přijatých, které u 2 830 společných oborů souhlasí s oficiálními agregáty 2026 přesně v 66,9 % případů, s mediánem rozdílu 0 a průměrem +0,40. To je slučitelné s tím, že agregáty znají zaměření a data uchazečů ne. Doporučuji přepnout a v patičce uvést verzi zdroje.
2. **Chybí doklad stability 2025→2026.** `scripts/validate-pasma-prijeti.py` má ročníky 2024–2025 zapsané napevno, a to záměrně. Pro přepnutí je potřeba obdobný doklad pro dvojici 2025–2026, jinak nebude čím podložit čísla ve slovníku ukazatelů (stabilita míry *rozhodl test*, šířka pásma nejistoty, percentil nejnižšího přijatého).
3. **`scripts/enrich_schools_data.py` je rozbitý.** Čte sloupce podle pozice a pozice neodpovídají ani starému, ani novému rozložení: bere `row[37..39]` jako skóre, kde jsou ve skutečnosti `ss3..ss5_duvod_neprijeti`, a porovnává příznak přijetí s číslem `1`, zatímco hodnota je text `'1'`. Navíc očekává soubor, který v repozitáři není. Skript počítá `jpz_min_actual` do katalogu; datová linka ho nespouští. Dokud se neopraví, zůstane nejnižší přijatý výsledek v katalogu z předběžné verze roku 2025, zatímco pásma budou z roku 2026 — tedy nový nesoulad ročníků místo odstraněného.

**Čtvrtá, provozní.** Zdrojový `PZ2026_kolo1_uchazeci_prihlasky_vysledky.xlsx` leží jen v `data/linka/prace/3GQMK/`, což je adresář mimo git. Kdyby se smazal, nejde přepočítat.

### 2.2 Dobíhající obor: příznak neříká to, co od něj dokumenty čekají

Soupis zdrojů (oddíl 3) i [stránka školy](stranka-skoly-2027.md) (S5) počítají s tím, že `dobihajiciObor` poslouží jako **varování před podáním přihlášky**: „Škola tenhle obor zavírá.“

**Změřeno na snímku rejstříku k 30. 6. 2026 proti 3 091 nabídkám 1. kola 2026.** Výpočet reprodukuje `python3 scripts/dobihajici-obory.py`, doklad je v [`docs/podklady/dobihajici-obory.json`](podklady/dobihajici-obory.json).

| Výsledek joinu na REDIZO + KKOV + forma + délka | Nabídek |
|---|---:|
| spárováno, není dobíhající | 3 040 |
| **spárováno, dobíhající** | **0** |
| nespárováno (rejstřík obor u školy nevede) | 51 |

**Ani jedna nabídka, na kterou se dnes dá přes web podat přihláška, není v rejstříku vedená jako dobíhající.**

**Závěr nezávisí na tom, jak se počítá.** Oponentura namítla, že bez definice jednotky se nula nedá přepočítat, a sama naměřila 754 dobíhajících záznamů proti 723 v tomto návrhu. Rozdíl je vysvětlený: 754 je součet druhů C00, D00 a **E00**, tedy včetně vyšších odborných škol, které se do 1. kola středních škol hlásit nemohou. Doklad proto počítá pod třemi definicemi zároveň:

| Definice druhu školy | Dobíhajících záznamů | Hrubý join | **Přesný join** |
|---|---:|---:|---:|
| C00 + D00 (střední školy a konzervatoře) | 723 | 29 | **0** |
| C00 + D00 + E00 (oponentura) | 754 | 29 | **0** |
| bez filtru druhu (i základní školy a jídelny) | 1 194 | 29 | **0** |

Spor o jednotku tedy závěr nemění ani v krajním případě, kdy se filtr druhu vypustí úplně. Jednotky, ve kterých se čísla uvádějí: 723 je **záznamů** (jedna škola může mít týž obor zapsaný víckrát v různých formách), 654 je **unikátních dvojic REDIZO a KKOV**, a hrubý join zasahuje **29 klíčů nabídek**, což je **23 unikátních dvojic**.

Kolo 2 oponentury u posledního čísla přepočtem dostalo 20. Doklad ho nově uvádí sám, včetně rozpisu, které dvojici patří které nabídky: 23 dvojic dává 29 klíčů proto, že **pět dvojic má víc nabídek** s různým zaměřením (například `600015572_63-41-M/01` tři). Číslo 23 se tím dá z dokladu ověřit, aniž by ho někdo musel dopočítávat.

Hrubý klíč REDIZO + KKOV dá 23 zásahů, ale **všech 23 je falešných**, chybovost 100 %. Vzorec je pokaždé stejný: dobíhá jiná forma nebo délka téhož oboru, ne ta nabízená. SŠ gastronomická a hotelová zavírá dálkové Hotelnictví a učí denní; Karlínské gymnázium zavírá pětiletou dálkovou formu; šest škol zavírá tříletou dálkovou nástavbu Podnikání a nabízí dvouletou denní. Z toho plyne tvrdé pravidlo: **jakékoli použití pole musí párovat i formu a délku studia.**

Příznak je navíc pomalý a jednosměrný. Mezi snímky 2025-03-31 a 2026-06-30 ho 25 oborů získalo, 81 ztratilo, a z těch 81 jich 80 z rejstříku úplně zmizelo. Obnovení oboru je za 15 měsíců jediné.

**Použitelná role je opačná.** Z 723 dobíhajících záznamů středních škol a konzervatoří se jich **722 v 1. kole 2026 nenabíralo v žádné formě**. Příznak tedy neříká „pozor, hlásíš se na obor, který končí“, ale „tenhle obor už se nenabírá a nevrátí se“. A to je přesně ta informace, která chybí [dvouletému cyklu nabídky oboru](dvoulety-cyklus-nabidky-oboru.md): ten dokládá, že obor chybějící v jednom roce se nesmí zobrazit jako zrušený, protože ho řada škol vypisuje ob rok. Rejstříkový příznak je jediný úřední rozlišovací znak mezi těmito dvěma případy:

| Nabídka v ročníku | `dobihajiciObor` | Co smí stránka říct |
|---|---|---|
| chybí | true | obor se už nenabírá |
| chybí | false nebo záznam není | obor v tomto roce vypsaný nebyl; mohl by se vrátit |
| je | (vychází vždy false) | nic, příznak je bez obsahu |

### 2.3 Přijatí podle priority: data jsou úplná, dokumenty si odporují

**Stav dat.** Pole `prijati_priority` v `public/souhrny_kolo1.json` je vyplněné u 3 091 z 3 091 nabídek roku 2026 a 3 058 z 3 059 v roce 2025. Součet se rovná počtu přijatých. Celostátně bylo v roce 2026 přijato na 1. volbu 66 850 uchazečů ze 86 345, tedy 77,4 % (2025: 77,0 %).

**Není to ale tak, že by web přijaté podle priority nezobrazoval.** `StatsTab` renderuje tabulku „Přihlášky a přijatí podle priority · 2025“ — jenže z jiného zdroje: přes `extendedStats` ze `schools_data.json`, ročník 2025, tedy ze starší revize katalogu, kterou [dokument grafů](grafy-skoly-a-oboru-2027.md) označuje za nepoužitelnou pro trendy (chybí 222 nabídek, liší se kapacita u 23 a přihlášky u 39). Vedle ní stojí tabulka „Přihlášky podle priority · 2026“ z jiné cesty a pod ní věta, že přijaté podle priority za rok 2026 nezobrazujeme, přestože je CERMAT zveřejňuje.

Změřeno proti oficiálním souhrnům roku 2025: z 3 059 nabídek katalog priority **vůbec nemá u 1 582**, u 1 162 se shodují a **u 315 se liší**. Ročník je navíc v `src/lib/data.ts` zapsaný napevno jako `data['2025']`, ne brán z registru, což je v rozporu s třetím kritickým pravidlem CLAUDE.md.

D3 tedy není přidání nové funkce, ale **náhrada nespolehlivého zobrazení oficiálním** — a zároveň oprava letopočtu v kódu.

**Rozpor.** [Grafy stránky školy a oboru](grafy-skoly-a-oboru-2027.md) (verze 1.0, schváleno) zavádějí graf „Kdo se dostal podle priority“ a v oddílu 7 uvádějí u sloupců 40–44 závěr **použít**. [Vrstvy stránky oboru](vrstvy-stranky-oboru-2027.md) (verze 1.4, revize téhož dne) naopak **zavrhují** jak graf priorit, tak větu „28 z 30 přijatých si obor dalo jako první volbu“, obojí se stejným argumentem: čtenář to přečte jako „první volba pomáhá se dostat“.

**Argument vrstev je platný a doložený.** U osmiletého gymnázia J. S. Machara mělo v roce 2026 obor jako 1. volbu 123 uchazečů a přijato z nich bylo 28. Věta „28 z 30 přijatých mělo obor jako 1. volbu“ je pravdivá a zároveň by u čtenáře vytvořila dojem, který data vyvracejí. Míru přijetí podle priority navíc spočítat **nelze**: kdo je přijat na vyšší prioritu, na nižší se už nevyhodnocuje.

**Řešení: údaj neodpovídá na otázku 1, ale na otázku 3.** Není to míra obtížnosti, je to **složení přijaté třídy** — kolik budoucích spolužáků si obor psalo jako nejžádanější volbu. Tam patří, a tam žádné čtení „první volba pomáhá“ nevzniká, protože blok nemluví o přijetí, ale o tom, s kým se dítě potká.

**Že jde o samostatnou informaci, je změřené:**

| Vlastnost | Hodnota | Srovnání |
|---|---|---|
| Korelace s tlakem prvních voleb (2026, n = 2 630) | **0,418** | nese vlastní informaci, není to přebarvený tlak |
| Stabilita 2025→2026 (n = 2 368) | r = **0,716**, medián změny 7,4 p. b. | podíl přijatých ze soutěžících, který slovník přijal, má 0,723 a 9,4 p. b. |
| Rozdělení 2026 | Q1 0,65 · medián 0,79 · Q3 0,90, rozsah 0,10–1,00 | rozlišuje |
| Pokrytí při prahu 10 přijatých | 2 630 z 3 091 nabídek (85,1 %) | |

Jako u všech ukazatelů závisí na typu studia, takže se napříč typy nesrovnává: medián je u osmiletých gymnázií 0,89, u lyceí, středních odborných a učebních oborů 0,75.

**Doklad, že to rodině něco řekne, uvnitř jedné školy.** Gymnázium J. S. Machara, rok 2026. **Tabulka je ilustrace pro čtenáře tohoto návrhu, ne vzor zobrazení**: staví vedle sebe tři typy studia a sloupec obtížnosti, což pravidla D3 na stránce zakazují.

| Obor | Přijatí | Z toho 1. volba | Podíl | ~~Obtížnost přijetí~~ |
|---|---:|---:|---:|---|
| osmileté gymnázium | 30 | 28 | 93 % | ~~velmi těžké~~ |
| čtyřleté gymnázium | 30 | 27 | 90 % | ~~dostala se většina~~ |
| technické lyceum | 23 | 15 | 65 % | ~~místo pro všechny~~ |

Tři obory jedné školy, tři různá složení třídy. U lycea se třetina přijatých dostala na obor, který si nedali jako první — to je věta, kterou dnes stránka neumí říct a která odpovídá na skutečnou otázku „chodí sem lidi, kteří sem chtěli?“.

**Jak moc na tom srovnání vadí typ studia.** Oponentura z těchto tří čísel vyvodila, že rozdíly mezi typy jsou dominantní složkou rozptylu, a navrhla ukazatel ze stránky školy vyřadit. Přepočet to nepotvrzuje: typ studia vysvětluje **8,3 % rozptylu** (eta² = 0,083, n = 2 630) a rozptyl uvnitř skupin (směrodatná odchylka 0,12 až 0,19) je téměř stejný jako celkový (0,179). Srovnání dvou oborů jedné školy tedy měří převážně obor, ne typ. Vyřazení ze stránky školy proto není nutné; nutné je typ u hodnoty pojmenovat, jak to projekt dělá u všech ukazatelů vztažených ke srovnatelné skupině.

## 3. Na co tato data odpovídají a na co ne

Zadání jmenovalo čtyři otázky. Poctivé přiřazení:

| Otázka rodiny | Data uchazečů 2026 | Dobíhající obor | Přijatí podle priority |
|---|---|---|---|
| Kterou školu si vybrat | **ano** — kam se uchazeči dostali, obory výš a níž na přihlášce, souběžné přihlášky | **ano, nepřímo** — odliší ukončený obor od vynechaného ročníku | **částečně** — složení přijaté třídy |
| Jak je škola dobrá | ne | ne | ne |
| Jak kvalitně přistupuje ke vzdělávání | ne | ne | ne |
| Jak si vedou její absolventi | ne | ne | ne |

**Všechna tři data popisují přijímací řízení, tedy vstup do školy.** O tom, co se uvnitř děje a co je po ní, neříkají nic a žádnou jejich kombinací to z nich nedostaneme.

Na „jak je škola dobrá“ dnes odpovídají dva zdroje, oba už na webu: **maturita** (společná část proti podobným školám, od 14. 9. 2026) a **inspekce ČŠI**. Maturita popisuje úroveň maturitního ročníku, ne kvalitu výuky, a stránka to vedle ní musí říkat — u Machara přicházejí na osmileté gymnázium uchazeči s průměrným umístěním 92,4. percentilu proti mediánu skupiny 68,2, takže dobrý maturitní výsledek je z velké části dán výběrem.

**Rozdíl „maturita minus přijímačky“ jako přidanou hodnotu nepočítat.** Percentil jednotné zkoušky je umístění mezi uchazeči o SŠ, percentil maturity mezi maturanty; jsou to dvě různé populace. Zákaz je ve slovníku pod heslem *Odchylka od očekávaného výsledku* a tenhle návrh ho nemění.

### 3.1 Na „jak si vedou absolventi“ data neexistují, a to ani mimo projekt

Jediná zmínka o absolventech v projektu je volný text v inspekčních zprávách („vysoká úspěšnost absolventů při přechodu na vysoké školy“), který se mezi školami nedá srovnat, protože ho inspektor napsal jen u některých. Rešerše veřejných zdrojů z 17. 9. 2026 hledala, čím to nahradit:

| Zdroj | Nejjemnější úroveň | Formát | Závěr |
|---|---|---|---|
| **Infoabsolvent.cz** (NPI ČR), nezaměstnanost a přechod na VŠ | obor KKOV × kraj, **ne škola** | webová aplikace a PDF, tabulky jako obrázky; není v katalogu otevřených dat | pro stránku školy nepoužitelné |
| **MPSV, pololetní statistiky absolventů**, list „Absolventi podle škol a oborů“ | **IZO školy × obor** | XLSX v ZIP na běžném webu, mimo katalog otevřených dat | jediný nález s IZO, ale nepoužitelný, viz níže |
| MPSV, otevřená data „Kvalifikační struktura absolventů“ | okres × kategorie vzdělání × skupina oborů | otevřená data | školy v ní nejsou |
| **MŠMT, matrika SIMS, přechod na VŠ** | agregát podle kategorie vzdělání a přijímající VŠ | webové výstupy | na úrovni školy neexistuje |
| Národní katalog otevřených dat | — | dotaz SPARQL nad katalogem | sada „uplatnění absolventů“, „nezaměstnanost absolventů“ ani „přechod na vysokou školu“ **neexistuje** |
| ČSÚ | ČR a kraje podle kategorie vzdělání | publikace | školy nejsou předmětem |

**Soubor MPSV nese IZO, a přesto se z něj ukazatel udělat nedá.** Čtyři důvody, všechny ověřené v datech k 30. 9. 2024:

1. **Chybí jmenovatel.** Soubor uvádí jen počet absolventů v evidenci úřadu práce. Počet absolventů školy v něm není, takže to není míra, ale absolutní číslo rostoucí s velikostí školy.
2. **Okres je okres evidence uchazeče, ne sídlo školy.** Jedna škola je rozdělená do řádků podle bydliště absolventů.
3. **Počty jsou mikroskopické.** 6 354 z 8 881 řádků má hodnotu 1, medián na jedno IZO je 6 osob. To je šum, ne signál, a platí pro něj táž výhrada jako pro obory s méně než deseti přijatými.
4. **Řada se přestala doplňovat.** Nejnovější soubor je k 30. 9. 2024, přestože NPI své publikace počítá z novějších dat MPSV.

**Rozhodující je ale pátý důvod, a ten je principiální.** Jmenovatel, tedy počet absolventů jednotlivé střední školy, označuje za nevěrohodný sám jeho správce. MŠMT na svých metodických stránkách píše, že školy do matriky nedoplňují složenou maturitu „ne pouze v jednotlivých případech, ale u celých ročníků jednotlivých středních škol“, že u 11 % gymnázií se do vysokoškolského studia zapsalo víc absolventů, než jich ten rok maturovalo, a že výstupy o přechodu na VŠ jsou proto „nevypovídající a nevěrohodné“.

**Postavit na tom ukazatel by znamenalo tvrdit víc, než tvrdí ministerstvo, které data sbírá.** To je v přímém rozporu s pravidlem projektu, že údaj bez doloženého výpočtu se nezobrazuje.

**Závěr: na otázku „jak si vedou absolventi této školy“ web odpovědět nemůže a v dohledné době nebude moci.** Doporučuji to na stránce říct otevřeně, místo aby otázka mlčky chyběla. Dvě varianty, obě zamítnuté, a jedna přijatelná, jsou v dávce D5.

## 4. Návrh: pět dávek

Pořadí je dané závislostmi a rizikem, ne důležitostí. D1 odemyká nejvíc za nejméně práce; **D4a a D2 jdou před D3**, protože opravují doložené chyby, kdežto D3 zavádí nový ukazatel a musí nejdřív projít testem srozumitelnosti.

| Dávka | Co dělá | Závisí na |
|---|---|---|
| **D4a** | opraví tvrzení o dobíhajícím oboru ve čtyřech dokumentech | na ničem, hotovo hned |
| **D1** | přepne data uchazečů na rok 2026 | na opravách skriptů a dokladu |
| **D2** | zobrazí už spočítané ukazatele, srovná dvojí implementaci obtížnosti | na ničem |
| **D3** | zavede podíl přijatých na první volbu, nahradí tabulku ze staré cesty | na testu srozumitelnosti |
| **D4b** | použije dobíhající obor v mřížce nabídky v čase | na mřížce, která neexistuje |
| **D5** | doplní větu, že o absolventech data nemáme | na ničem |

### D1 — Přepnout data uchazečů na rok 2026 — **hotovo 17. 9. 2026**

Provedeno v tomto pořadí: zdrojový soubor přesunut do `data/`; srovnání ročníků vytaženo do funkce `stabilita_rocniku` v `scripts/validate-pasma-prijeti.py` a zpřístupněno přes `--rocniky 2025-2026` (výchozí doklad 2024–2025 zůstal bajt v bajt shodný); vznikl `docs/podklady/overeni-pasem-prijeti-2025-2026.json`; slovník ukazatelů přepočítán na verzi 1.21; registr přepnut a zkontrolován; stránka oboru u obou bloků uvádí, že ročník je předběžný.

**Doplněno 17. 9. 2026: medián JPZ přijatých.** Při rozboru zaniklého `data/jpz_stats_2025.json` vyšlo najevo, že z jeho devíti polí má pět náhradu jinde (a průměr dokonce lepší, oficiální a se zaměřením), ale **medián přijatých nikde**. Slovník přitom od verze 1.3 tvrdil, že medián „měl by mít při zobrazení přednost“, a nikdy se nezobrazil. Doloženo, že na tom záleží: medián leží **systematicky pod průměrem**, mediánově o 1,1 bodu na 2 517 nabídkách roku 2026, u 35 % oborů aspoň o 2 body. Je to ta šikmost, před kterou slovník varuje — pár výborných výsledků táhne průměr nahoru.

Medián proto nepřibyl oživením rozbitého skriptu, ale do `scripts/build-pasma-prijeti.py`, tedy do souboru, který vzniká z téhož zdroje, už se přepíná s registrem a už nese nejnižší přijatý. Oba ročníky přegenerovány; kontrola proti předchozí verzi ukázala **nula změn mimo nové pole**. Zamítnuta zůstala pole `cj_at_jpz_min`, `ma_at_jpz_min`, `cj_min_independent` a `ma_min_independent`: každé určuje jediný uchazeč a poslední dvě mohou pocházet od dvou různých lidí, takže vedle sebe popisují uchazeče, který nemusí existovat.

Dvě věci se přitom opravily nad rámec zadání. **Registr nesl letopočet napevno** v `kontrola_obdobi.soubor` a ve `vystupy` (`pasma_prijeti_2025.json`), takže přepnutí na první pokus selhalo; nově se píše zástupné `{obdobi}`, které `scripts/stav-datovych-sad.py` dosazuje ze zobrazeného období. **Z `vystupy` vypadl `data/jpz_stats_2025.json`**, protože pro rok 2026 neexistuje: počítá ho rozbitý `enrich_schools_data.py`, který linka nespouští a jehož výstup se na webu nezobrazuje.

Odstraní míchání ročníků na stránce oboru a zaktualizuje pásma, souběh i kontext přihlášek. Práce je v překážkách, ne v přepnutí.

1. Přesunout zdrojový xlsx z `data/linka/prace/3GQMK/` do `data/`, aby šel přepočítat. (Do gitu nepatří, jen na disk vedle ročníků 2024 a 2025.)
2. Opravit `scripts/enrich_schools_data.py` na čtení podle hlavičky a na textový příznak přijetí; přepočítat `jpz_min_actual` a katalog z roku 2026. Bez toho by katalog zůstal na předběžném roce 2025, zatímco pásma půjdou na 2026. **Oprava sama katalog neodemkne:** `scripts/build-catalogue-2026.py` má konstantu `HISTORICKE` s jedenácti poli (mezi nimi `jpz_min_actual`, `min_body`, `cohorts`, `prijati_priority`), která se do ročníku 2026 kopírují z roku 2025 a záznam dostane `historicka_data_rok = 2025`; nese to 2 664 z 3 239 záznamů. Součástí kroku je tedy i rozhodnutí, která pole z `HISTORICKE` vypadnou.
**Krok 2 není podmínkou přepnutí (zjištěno 17. 9. 2026).** Katalogové minimum se totiž **nikde nezobrazuje**: `unavailableAdmissionScores()` v `src/lib/historical-scores.ts` nuluje `jpz_min`, `min_body`, `cj_at_jpz_min`, `ma_at_jpz_min` i `cohorts`, a `jpz_min_actual` je v `src/` pouhý typ v hledacím API. Obávaný nový nesoulad — pásma z roku 2026 vedle katalogového minima z roku 2025 — tedy nevznikne, protože katalogové minimum nemá čtenáře. Nejnižší přijatý výsledek, který stránka oboru ukazuje, pochází z `pasma_prijeti_{rok}.json`, a ten se přepíná spolu se sadou. **Oprava enrichu se tím odpojuje od přepnutí** a zůstává samostatným úklidem.

3. **Rozhodnout, co s `min_body`.** Oponentura upozornila, že se pod krokem 2 skrývá rozhodnutí o poli, které se porovnává s body uchazeče. Ověření ho posunulo dvakrát:
   - `min_body` **není** `jpz_min_actual` a `enrich_schools_data.py` ho nepočítá. Je to jiné pole na jiné škále (rozsah 10 až 168 proti 0 až 100), v katalogu od prvního importu, **nepočítá ho žádný skript v repozitáři** a jeho výklad není doložen. Oprava enrichu na něj tedy nesáhne vůbec.
   - Porovnání „máte výrazně více bodů než minimum“ je v `PersonalizedResults.tsx` a `BodySimulator.tsx` skutečně napsané, ale **průvodce není nikde v aplikaci použitý**: `GuidedJourneyWizard` nemá mimo vlastní adresář jediný import a citované věty nejsou ani v buildu. **Není to tedy zobrazovaná chyba dnešního webu**, jak oponentura tvrdí, ale mrtvý kód.

   Přesto zůstává pravda, že `historicka_data_rok` nikdo nezobrazuje: v `src/` se pole jen prochází `data.ts` a žádná komponenta ho nerenderuje.

   **Kolo 2 oponentury namítlo, že se tu verze 1.1 zastavila příliš brzy, a mělo pravdu** — ne však z uvedeného důvodu. Inventura všech konzumentů `min_body` v `src/` dala tento obrázek:

   | Místo | Co dělá | Vidí to uživatel |
   |---|---|---|
   | `MojeSanceClient.tsx:355, 425, 435` | vypíše hodnotu s popiskem „Minimum 2025 · škála JPZ 0–100“ | **ne** — `/moje-sance` je od commitu `5911793` jen 307 přesměrování na `/simulator`, komponenta není nikde importovaná ani v buildu |
   | `SchoolDetailClient.tsx:387–395` | vážený průměr podobných škol | **ne** — funkce nemá volajícího, jediný možný konzument vrací `null` |
   | `guided/BodySimulator.tsx`, `guided/PersonalizedResults.tsx` | „Máte výrazně více bodů než minimum“ | **ne** — mrtvý adresář |
   | `cityData.ts:195–199` | nese do dat měst | **ne** — nikdo to nečte |
   | `page.v1_original.tsx` | výpis | **ne** — není route |
   | `/api/chances`, `/api/school-details` | vracejí `min_body: null` | — |

   **Nikde na veřejné adrese se `min_body` dnes nezobrazuje**, takže formulace „renderuje se na `/moje-sance`“ neplatí; obě API ho navíc nulují, takže by kód na `null.toFixed()` spadl dřív, než by něco vypsal. Riziko je ale skutečné a je horší, než kdyby šlo o prostý údaj: **kdyby někdo zrušil přesměrování, stránka začne zobrazovat loňská zkopírovaná čísla** (2 808 z 2 812 hodnot 2026 je identických s rokem 2025) **s rozsahem až 168 pod popiskem „škála JPZ 0–100“ a bez dělení dvěma**, které zbytek kódu dělá. Navíc `min_body` pochází ze `school_analysis.json`, tedy ze sady `school-analysis-legacy`, kterou registr vede s použitím **`nezobrazovat`**.

   **Rozhodnutí:** `min_body` jako ukazatel nezavádět (nemá doložený výpočet) a **odstranit mrtvé konzumenty**, ne je jen popsat ve slovníku. Zápis do slovníku mezi ukazatele bez doloženého výpočtu sám nestačí — pravidlo projektu říká, že nedoložený údaj se nezobrazuje, a kód, který ho zobrazit umí, je jen jedním smazaným řádkem od toho, aby to udělal.
4. Rozšířit `scripts/validate-pasma-prijeti.py` o dvojici ročníků jako parametr a vyrobit doklad `docs/podklady/overeni-pasem-prijeti-2025-2026.json`.
5. Přepočítat čísla ve slovníku ukazatelů, která z dat uchazečů pocházejí (stabilita míry *rozhodl test*, šířka pásma nejistoty, percentil nejnižšího přijatého, hustota u hranice), a zvýšit jeho verzi.
6. `python3 scripts/stav-datovych-sad.py prepni cermat-uchazeci-kolo1 2026 --kdy 2027-05 --zduvodneni … --doklad …`, pak `kontrola`.
7. Do patičky dat doplnit, že ročník 2026 je předběžná verze k 13. 5. 2026.

**Rozhodnout před začátkem:** přepnout na předběžná data, nebo počkat na finální revizi v květnu 2027? Doporučuji přepnout — rozdíl předběžné a finální verze byl u roku 2025 dvacet čtyři řádků ze 159 196 a míchání ročníků na jedné stránce je horší vada než neúplnost, kterou lze pojmenovat v patičce.

### D2 — Napojit na web to, co už v souhrnech leží — **hotovo 17. 9. 2026**

Provedeno: **obtížnost přijetí má jednu definici** (počítá generátor, práh uplatňuje zobrazení; ověřeno, že se nezměnil ani jeden z 6 150 záznamů), **mrtvý export `percentilTlakuVeSkupine` odstraněn** a na stránku oboru přibylo **průměrné percentilové umístění uchazečů** vedle umístění přijatých. Dvojice čísel odpovídá na otázku, zda si obor z uchazečů vybírá: u 3 076 nabídek s oběma údaji se věta dělí zhruba půl na půl, takže rozlišuje. Slovník 1.23.

**Pořadí změněno oponenturou: D2 jde před D3.** Argument je přijat — D2 odstraňuje dvě doložené chyby a povrchuje už schválené ukazatele, kdežto D3 zavádí nový ukazatel s nevyřízeným rizikem mylného čtení. Závislost mezi nimi žádná není.

Bez nových dat, jen zobrazit spočítané. `souhrny_kolo1.json` web čte, ale nerenderuje `podil_prijatych_ze_soutezicich`, `zarazeni_obtiznosti` (UI si je přepočítává vlastní funkcí), `prumerne_umisteni_uchazecu`, `konali` ani `min_prijaty_percentil_souhrn`. Export `percentilTlakuVeSkupine` nemá volajícího, takže oddíl `skupiny` je zatím mrtvý.

Nejvíc přinese **průměrné percentilové umístění uchazečů** vedle už zobrazeného umístění přijatých: dvojice čísel říká, zda si obor z uchazečů vybírá, nebo bere skoro všechny. Obojí je ve slovníku.

**Past nalezená při rozboru: obtížnost přijetí má dvě implementace, které si odporují.** `scripts/build-souhrny-kolo1.py` (funkce `zarazeni_obtiznosti`) zapisuje pole `zarazeni_obtiznosti` do JSON **bez prahu minimálního počtu soutěžících**, zatímco `src/lib/obor-profil.ts` (funkce `zarazeniObtiznosti`) si zařazení počítá znovu z hrubých polí a práh `MIN_SOUTEZICICH_PRO_ZARAZENI` uplatňuje. Slovník ukazatelů přitom žádá, aby se zařazení pod 10 soutěžícími nezobrazovalo, protože jediný uchazeč přehodí stupeň. Dnes to nevadí, protože web čte tu správnou implementaci a pole z JSON ignoruje — ale kdokoli, kdo by pole začal zobrazovat, dostane u malých oborů zařazení, které tam být nemá.

**Jak to srovnat.** Oponentura doporučila pole z JSON odstranit, aby zůstala jediná implementace v `obor-profil.ts`. To ale naráží na dvě věci: pole čte `scripts/rozbor-podminek-a-poradi.py:78`, takže by se ten doklad musel přepsat, a hlavně **práh deseti soutěžících je podle slovníku pravidlo zobrazení, ne součást definice** („zařazení se nezobrazuje pod 10 soutěžícími“). Ani jedna implementace tedy není chybná; chybné je, že existují dvě.

Navrhuji proto třetí možnost: **ponechat výpočet jen v generátoru, nechat TypeScript pole z JSON číst a uplatňovat nad ním už jen práh zobrazení.** Zmizí duplicitní definice, doklad dál funguje a dělba rolí odpovídá slovníku — Python počítá veličinu, TypeScript rozhoduje, kdy se ukáže. Mrtvý export `percentilTlakuVeSkupine` se odstraní bez náhrady.

**Past se tím ale přesouvá, ne ruší** — na to oponentura upozornila správně. Pole v JSON dál ponese zařazení i pro obory pod prahem a `rozbor-podminek-a-poradi.py` je tak čte už dnes. Součástí D2 je proto **zápis do slovníku u ukazatele *Obtížnost přijetí slovy***: datové pole `zarazeni_obtiznosti` nese hodnoty i pod prahem deseti soutěžících a **práh je pravidlo zobrazení, ne součást definice**. Bez té věty příští konzument JSON chybu zopakuje.

### D3 — Přijatí podle priority jako složení třídy

**Pořadí kroků obráceno oponenturou (S3).** Verze 1.0 zaváděla ukazatel rovnou a test srozumitelnosti nechávala jako dodatečnou pojistku v rizicích. To je špatně: jediný důvod existence tohoto ukazatele je nové čtení („složení třídy“), a právě srozumitelnost ho odlišuje od varianty, kterou vrstvy 1.4 zavrhly. Test, jehož negativní výsledek by stál proti už odvedené práci, není test. Proto:

1. **Test věty** ve finální podobě bloku na třech lidech podle oddílu 1.2 [stránky školy](stranka-skoly-2027.md). Testuje se **na dvou místech a obě musí projít**:
   - *stránka oboru izolovaně* — věta nesmí vyvolat otázku na pořadí přihlášky;
   - *stránka školy s obory různých typů* (dokladový příklad Machara: osmileté gymnázium, čtyřleté gymnázium, technické lyceum) — čtení nesmí sklouznout ke srovnání „lyceum je horší než gymnázium“.

   Druhé místo doplnila oponentura a má pravdu: celoplošných 8,3 % rozptylu nechrání konkrétní školu. U Machara je mezera mediánů mezi gymnáziem a lyceem 0,14, tedy srovnatelná s vnitroskupinovou odchylkou 0,17 až 0,19, takže právě u smíšené školy může typ vysvětlovat podstatnou část rozdílu mezi dvěma kartami. Pravidlo „pojmenovat typ“ to řeší jen textově a test musí ověřit, že to stačí.
2. **Zápis do slovníku** (oddíl 5) — jen když test projde.
3. **Implementace**: převést `StatsTab` ze staré cesty `extendedStats` na souhrny, vzít ročník z registru místo napevno zapsaného `data['2025']`, zobrazit v bloku „Jak se tu studuje“. Tím zmizí i tabulka priorit ze starší revize katalogu, která se u 315 nabídek rozchází s oficiálními čísly, a mrtvá věta ve `StatsTab.tsx:136`, která říká, že přijaté podle priority nezobrazujeme.
4. **Sweep letopočtů** v textech dotčených komponent (oddíl 2.1). Protože jde o zhruba 101 textů ve 36 souborech, dostane sweep **vlastní kontrolní seznam a grepový test**, který v CI hlásí nový letopočet v uživatelském textu. Bez něj se u takového rozsahu spolehlivě něco přehlédne. Test musí umět povolit legitimní výjimky — datum exportu InspIS, platnost dat CERMATu, harmonogram MŠMT — nejlépe seznamem povolených míst, ne vypnutím kontroly.

**Pravidla, bez kterých se to nesmí zobrazit:**
- nikdy v bloku o obtížnosti přijetí a nikdy vedle počtu přijatých jako poměr;
- vždy jako složení („z 30 přijatých si obor 28 psalo jako 1. volbu“), nikdy jako míru úspěšnosti podle priority;
- vždy s větou, že pořadí na přihlášce šanci na přijetí nemění;
- práh 10 přijatých;
- **vždy s pojmenovaným typem studia** a nikdy jako řazení oborů školy mezi sebou.

Poslední pravidlo nahrazuje formulaci „bez srovnání napříč typy studia“ z verze 1.0, která byla zároveň nesplnitelná a přísnější, než je potřeba: typ vysvětluje 8,3 % rozptylu (oddíl 2.3), takže zákaz srovnání nedává smysl, ale pojmenování typu ano. Oponentura navrhovala ukazatel z karet oborů na stránce školy vyřadit úplně; to se měřením nepotvrdilo jako nutné.

Tím se vyřeší rozpor mezi grafy 1.0 a vrstvami 1.4: graf „Kdo se dostal podle priority“ z dokumentu grafů **se ruší v podobě, kterou vrstvy zavrhly**, a nahrazuje ho jeden údaj o složení v jiném bloku.

### D4 — Dobíhající obor jako rozlišení ukončeného oboru

Ne jako varování. **Dávka se podle oponentury dělí na dvě části**, protože mřížka „Nabídka oborů v čase“, do které měl příznak jít, není implementovaná — zobrazení by tedy bylo v nepostavené funkci.

**D4a, oprava textů — hotovo 17. 9. 2026.** Dokumenty dnes tvrdí mechanismus, který měření vyvrací:

| Dokument | Co tvrdí | Oprava |
|---|---|---|
| [soupis zdrojů](zdroje-dat.md), oddíl 3 | „Škola tenhle obor zavírá.“ Varování před podáním přihlášky | role je opačná: rozlišení doběhlého oboru od nevypsaného ročníku |
| [stránka školy](stranka-skoly-2027.md), oddíl 10, řádek S5 | „použít, S5“ bez určení role | totéž, s odkazem na doklad |
| [grafy](grafy-skoly-a-oboru-2027.md), oddíl 7 | „zamítnuto pro graf, patří do textu oboru a do portálu pro školy“ | zpřesnit: do textu patří jen u chybějící nabídky |
| **[sledování škol a oborů](sledovani-skol-2027.md) v2.1**, větev `docs/sledovani-skol-a-oboru`, commit `19dbcf7` | §3.1 „před termínem přihlášek jsou užitečné jen `udaje_od_skoly` … a do budoucna dobíhající obor z rejstříku“; §9 „**nejcennější zpráva a přichází před termínem přihlášek**“; otevřená otázka 5 | mechanismus se měřením nepotvrdil: událost „obor dobíhá“ by u sledovaného, aktuálně nabízeného oboru prakticky nikdy nenastala. Zbývá role rozlišení „doběhl × nevypsaný ročník“ |

**Dokumenty jsou čtyři, ne tři. Verze 1.1 to popřela a mýlila se.** Tvrdil jsem, že dokument sledování o dobíhajícím oboru nemluví, protože má sedm oddílů a čtyři otevřené otázky. To platí o **verzi 1.0 na větvi `feat/maturita-srozumitelne`**, kde jsem ho četl. Živá verze je ale **2.1 z 15. 9. 2026 na větvi `docs/sledovani-skol-a-oboru`** (12 oddílů, 5 otevřených otázek) a všechny tři pasáže v ní jsou doslova. Kanonická je ta novější — odkazuje se na ni i [návrh novinek](novinky-k-prijimackam-2027.md) včetně čísel oddílů. Oponentura měla v kole 1 pravdu a kolo 2 to doložilo.

**Procesní poučení, které z toho plyne.** Ověřuje-li se tvrzení o dokumentu, uvádí se **větev, verze a commit**, ne jen název souboru. Záměna v1.0 a v2.1 je přesně ten druh chyby, který projekt jinde řeší registrem období: soubor téhož jména může nést různá data podle toho, odkud se čte. Doklady v tomto návrhu proto nově uvádějí commit.

**D4b, zobrazení, svázané s mřížkou.** Až mřížka vznikne:

- Párovat **REDIZO + KKOV + forma + délka**, nikdy jen REDIZO + KKOV.
- Použít jen u oborů, které v zobrazeném ročníku **chybí**.
- U chybějícího oboru bez příznaku psát opatrně („v nabídce byl v letech …“), jak žádá dvouletý cyklus.
- Při každém novém čtvrtletním snímku přepočítat `python3 scripts/dobihajici-obory.py`; nula platí k snímku, ne navždy.

### D5 — Říct otevřeně, že o absolventech data nemáme

Rešerše je hotová (oddíl 3.1) a její výsledek je záporný: použitelný zdroj neexistuje. Dávka proto **nezavádí ukazatel**, ale řeší, co s prázdným místem.

| Varianta | Rozhodnutí | Proč |
|---|---|---|
| Absolutní počet absolventů v evidenci úřadu práce z MPSV | **zamítnout** | čitatel bez jmenovatele, medián 6 osob na školu, okres podle bydliště; svádí k chybnému čtení víc, než kolik říká |
| Vlastní jmenovatel z maturitních dat CERMATu | **zamítnout** | kombinoval by čitatele za všechny obory a podle bydliště se jmenovatelem jen za maturitní obory; metodicky nesedí a do slovníku by se bez oponentury dostat neměl |
| Krajová míra nezaměstnanosti **za skupinu oborů**, výslovně označená jako údaj o oboru, ne o této škole | **zamítnout** (změna proti verzi 1.0, kde stálo „zvážit“) | oponentura má pravdu: regionální statistika za skupinu oborů odpovídá na otázku o trhu práce v kraji, ne o této škole, a na stránce školy svádí k přisuzování kraje škole — tedy k téže chybě čtení, proti které D3 staví pravidla. Navíc by šlo o převzetí zdroje, jehož řada se přestala doplňovat |
| Věta, že o absolventech dat nemáme, a proč | **použít** | stránka školy už má oddíl „Odkud čísla jsou a co neříkají“; mlčení čtenář přečte jako by se otázka neptala |

Dávka se tím zmenšuje na **jedinou větu na stránce a nepřebírá žádný nový zdroj**. To je správný výsledek: zamítnutí je platný závěr. Záporný nález se přesto zapisuje do [soupisu zdrojů](zdroje-dat.md), aby ho nikdo nehledal podruhé.

## 5. Zápisy do slovníku ukazatelů

Nový ukazatel se podle CLAUDE.md zapisuje dřív, než se zobrazí. Návrh zápisu pro D3:

> ### Podíl přijatých na první volbu
> `přijatí s prioritou 1 ÷ přijatí` za nabídku a ročník. Zdroj: CERMAT, souhrny 1. kola, `PŘIJATÍ – PRIORITA 1`. Pole odvozené z `prijati_priority` v `public/souhrny_kolo1.json`. Jednotka procento.
>
> Popisuje **složení přijaté třídy**: kolik z přijatých si obor psalo jako nejžádanější volbu. Mezi roky 2025 a 2026 korelace 0,716, medián absolutní změny 7,4 procentního bodu na 2 368 nabídkách.
>
> **Rozdělení se uvádí po srovnatelných skupinách, ne společné.** Společné rozdělení by svádělo k chybnému výkladu: hodnota 0,80 je nad mediánem střední odborné školy a pod mediánem gymnázia.
>
> | Skupina | Nabídek | Dolní čtvrtina | Medián | Horní čtvrtina |
> |---|---:|---:|---:|---:|
> | nástavba | 225 | 0,80 | **0,90** | 0,97 |
> | osmileté gymnázium | 270 | 0,73 | **0,89** | 0,97 |
> | šestileté gymnázium | 71 | 0,70 | **0,87** | 0,97 |
> | čtyřleté gymnázium | 355 | 0,71 | **0,86** | 0,95 |
> | střední odborná škola | 1 224 | 0,61 | **0,75** | 0,86 |
> | lyceum | 238 | 0,61 | **0,75** | 0,84 |
> | učební obor | 247 | 0,62 | **0,75** | 0,87 |
>
> Nejvyšší medián mají **nástavby**, ne gymnázia. Je to tím, že na nástavbu se hlásí vyučení s jasným záměrem, ne jako na pojistku. Ukazatel tedy neměří prestiž.
>
> Typ studia ale vysvětluje jen **8,3 % rozptylu** (eta² = 0,083, n = 2 630) a rozptyl uvnitř skupin je téměř stejný jako celkový, takže rozdíl mezi dvěma obory je převážně rozdíl oborů, ne typů. Hodnota se proto uvádí vždy s pojmenovaným typem, ale srovnání dvou oborů se nezakazuje.
>
> Nese vlastní informaci. S tlakem prvních voleb koreluje jen 0,418 a s podílem přijatých ze soutěžících **−0,224**, takže to není převyprávěná obtížnost přijetí.
>
> **Neříká, že první volba pomáhá se dostat.** Pořadí na přihlášce šanci nemění. Míru přijetí podle priority z těchto dat spočítat nelze: kdo byl přijat na vyšší prioritu, na nižší se už nevyhodnocoval. U osmiletého gymnázia J. S. Machara si obor jako 1. volbu psalo 123 uchazečů a přijato z nich bylo 28.
>
> **Nezobrazuje se pod 10 přijatými** a nikdy v bloku o obtížnosti přijetí.

Dále D1 vyžaduje přepočítat doložená čísla u ukazatelů *Rozhodl test*, *Pásmo nejistoty*, *Percentil nejnižšího přijatého*, *Hustota u hranice*, *Podíl přijatých podle bodového pásma*, *Souběžné přihlášky*, *Výsledek uchazečů o obor* a *Obory výš a níž na přihlášce*, protože všechny stojí na přepínané sadě.

D4 nový ukazatel nezavádí; `dobihajiciObor` je příznak, ne veličina. Patří do soupisu zdrojů s opravenou formulací.

## 6. Zápisy do slovníku pojmů

| Pojem na stránce | Význam | Vysvětlení při prvním výskytu v bloku | Nepoužívat |
|---|---|---|---|
| **psali si obor jako 1. volbu** | přijatí, pro které byl obor prioritou 1 | „z přijatých si obor takto psalo X z Y; pořadí na přihlášce šanci na přijetí nemění“ | dostali se na první volbu, měli štěstí na první volbu, prioritní uchazeči |
| **obor se už nenabírá** | obor vedený v rejstříku jako dobíhající a v daném ročníku nevypsaný | „škola tenhle obor dokončuje se stávajícími žáky a nové nepřijímá“ | zrušený obor, zaniklý obor (dokud to neuvádí škola) |

## 7. Rizika a co návrh vyvrátí

| Riziko | Co by ho potvrdilo |
|---|---|
| Podíl přijatých na první volbu se přesto přečte jako „první volba pomáhá“ | **test předchází zavedení** (D3, krok 1), ne naopak; když věta vyvolá otázku na pořadí přihlášky, ukazatel se nezavede a slovník se nezapisuje |
| Předběžná data 2026 se od finální revize v květnu 2027 liší víc než rok 2025 | porovnání po zveřejnění; registr má `vrat` pro návrat |
| Oprava `enrich_schools_data.py` změní `jpz_min_actual` u mnoha oborů | **velká změna se očekává**, protože skript dnes čte špatné sloupce a špatný typ příznaku; rozdíl se proto nemá jen změřit před sloučením, ale rozhodnout předem podle D1 kroku 3 — které z jedenácti polí `HISTORICKE` se odemknou |
| `dobihajiciObor` bude v příštím snímku u některé vypsané nabídky | join se pouští při každém snímku; dnešní nula platí k 30. 6. 2026 |
| Náhrada staré tabulky priorit změní čísla, která návštěvník zná | u 315 z 3 059 nabídek roku 2025 se katalog a souhrn liší; rozdíl se vypíše před sloučením a platí oficiální souhrn |
| Vznikne tlak zobrazit něco o absolventech i bez dat | oddíl 3.1 drží zamítnutí i s důvodem; rozhodnutí se mění jen novým zdrojem zapsaným do soupisu |

## 8. Otevřené otázky k rozhodnutí

Po oponentuře zůstávají otevřené **dvě**; ostatní čtyři se shodou návrhu a oponentury uzavřely a jsou vypsané v oddílu 9.

1. **Přepnout data uchazečů na předběžný ročník 2026, nebo čekat na finální revizi v květnu 2027?** Návrh i oponentura doporučují přepnout. Zbývá potvrdit zadavatelem, protože je to jediné rozhodnutí, které mění čísla na webu.
2. **Co s `min_body` a jeho mrtvými konzumenty?** Smazat komponenty, které ho umí zobrazit (`MojeSanceClient`, adresář `guided/`, `page.v1_original.tsx`, mrtvé funkce v `SchoolDetailClient`), nebo je před oživením převést na pásma přijetí? Otázka je přejmenovaná podle kola 2 oponentury: průvodce je jen jeden z šesti konzumentů a ne největší (oddíl 4, D1 krok 3).

**Uzavřeno bez dalšího rozhodování:** graf priorit se ruší ve prospěch údaje o složení třídy; opravy textů o dobíhajícím oboru se dělají hned jako D4a; D2 jde před D3; krajová míra nezaměstnanosti se zamítá; zjištění se do soupisu zdrojů zapisují hned.

## 9. Vypořádání oponentury

### Kolo 1 (oponentura v1.0)

Oponentura přepočítala zdrojová čísla návrhu a vznesla sedm sporných bodů. **Šest se přijímá, jeden se měřením nepotvrdil.** (Verze 1.1 uváděla „pět přijato, dva nepotvrzeny“; S7 se v kole 2 ukázal jako platný, viz N1.) Oponentura zároveň doměřila jednu věc, kterou návrh opomněl, a vyšla v jeho prospěch: korelace ukazatele D3 s podílem přijatých ze soutěžících je −0,224, takže to není převyprávěná obtížnost přijetí.

| # | Námitka | Vypořádání | Kde |
|---|---|---|---|
| **S1** | D3 zakazuje srovnání napříč typy, ale samo ho předvádí; typ je dominantní složka rozptylu | **částečně přijato.** Výtka k dokladové tabulce platí — stavěla tři typy vedle sloupce obtížnosti, což vlastní pravidla zakazují; tabulka je nově označená jako ilustrace. **Premisa o dominanci se ale nepotvrdila:** typ vysvětluje 8,3 % rozptylu (eta² = 0,083) a rozptyl uvnitř skupin je téměř stejný jako celkový. Vyřazení z karet oborů proto **nepřijímám**; místo zákazu srovnání platí povinnost pojmenovat typ | 2.3, D3 |
| **S2** | Rozdělení ve slovníku je počítané přes typy, které se nesmí srovnávat; chybí nástavba | **přijato celé.** Slovník má nově rozdělení po sedmi skupinách. Nástavba doplněna a ukázalo se, že má nejvyšší medián (0,90), tedy vyšší než gymnázia — je to silný argument, že ukazatel neměří prestiž | 5 |
| **S3** | Test srozumitelnosti má předcházet zápisu do slovníku, ne po něm následovat | **přijato celé.** D3 má nově čtyři kroky v pořadí test → slovník → implementace → sweep. Argument, že test proti už odvedené práci není test, je správný | D3, 7 |
| **S4** | D1 krok 2 skrývá rozhodnutí o `min_body` v průvodci a odporuje si se zamítnutím sloupců 72–86 | **přijato v jádru, opraveno ve dvou faktech.** Skryté rozhodnutí tam skutečně bylo a D1 má nově samostatný krok 3. Ověření ale ukázalo, že (a) `min_body` **není** `jpz_min_actual`, je to jiné pole na jiné škále, které nepočítá žádný skript, takže oprava enrichu se ho netýká, a (b) průvodce **není nikde v aplikaci použitý** a citované věty nejsou ani v buildu, takže to není „zobrazovaná chyba dnešního webu“, ale mrtvý kód. Rozpor s tabulkou 1 tím mizí: D1 se týká `jpz_min_actual`, ne bodového minima v průvodci | D1 kroky 2–3 |
| **S5** | Tvrzení „rok nikde v kódu napevno není“ je přehnané | **přijato, a rozsah je větší, než oponentura uvedla.** 13 přístupů `data['RRRR']` v `data.ts`, 11 dalších řádků jinde a zhruba 101 uživatelských textů s letopočtem ve 36 souborech. Věta v 2.1 zúžena na jmenované čtečky a sweep zařazen do D3 | 2.1, D3 |
| **S6** | Čísla o dobíhajícím oboru nejsou doložená skriptem; oponentura měří 754 místo 723 | **přijato v požadavku, rozpor rozhodnut.** Doklad vzniká `scripts/dobihajici-obory.py` → `docs/podklady/dobihajici-obory.json`. Rozdíl 723/754 je definiční: oponentura zahrnula druh E00, tedy vyšší odborné školy. **Přesný join vychází na nulu při všech třech definicích včetně varianty bez filtru druhu**, takže spor o jednotku závěr nemění | 2.2 |
| **S7** | D4 stojí na neimplementované mřížce; opravy se mají dotknout čtyř dokumentů | **přijato celé.** Dávka rozdělena na D4a (opravy textů, hned) a D4b (zobrazení, až s mřížkou). Verze 1.1 čtvrtý dokument odmítla a **mýlila se**: četla sledování škol ve verzi 1.0 na aktuální větvi, kdežto živá je v2.1 na větvi `docs/sledovani-skol-a-oboru`, kde jsou všechny tři citované pasáže doslova. Opraveno v kole 2, viz N1 | D4a |

### Kolo 2 oponentury (v2.0)

Kolo 2 přepočítalo proti-důkazy verze 1.1 a **všechny je potvrdilo** — eta² 0,0834, `min_body` ≠ `jpz_min_actual`, mrtvý průvodce, reprodukovatelnost dokladu, 13 přístupů letopočtů — a stáhlo vlastní formulaci „zobrazovaná chyba dnešního webu“. Vzneslo tři nové body:

| # | Námitka | Vypořádání | Kde |
|---|---|---|---|
| **N1** | „Vyvrácení“ čtvrtého dokumentu četlo starou verzi sledování škol | **přijato celé; verze 1.1 se mýlila.** Živá verze je v2.1 z 15. 9. 2026 na větvi `docs/sledovani-skol-a-oboru` (commit `19dbcf7`, 12 oddílů, 5 otevřených otázek) a všechny tři citované pasáže jsou v ní doslova. Četl jsem v1.0 na aktuální větvi. D4a má nově **čtyři dokumenty** a návrh přijímá procesní pravidlo uvádět u ověření větev, verzi a commit | D4a |
| **N2** | Rozhodnutí o `min_body` je poddimenzované, údaj se renderuje na `/moje-sance` a jinde | **přijato v jádru, opraveno v dopadu.** Inventura šesti konzumentů potvrzuje, že se verze 1.1 zastavila brzy. Ale **na žádné veřejné adrese se `min_body` nezobrazuje**: `/moje-sance` je 307 přesměrování na `/simulator`, komponenta není v buildu a obě API vracejí `null`. Riziko je přesto reálné, protože kód by po zrušení přesměrování vypsal zkopírovaná loňská čísla pod chybným popiskem. Rozhodnutí proto zesíleno z „zapsat do slovníku“ na **„zapsat a odstranit mrtvé konzumenty“**; otevřená otázka 2 přejmenována | D1 krok 3 |
| **N3** | Test D3 má obsahovat školu se smíšenými typy studia | **přijato celé.** Argument, že celoplošných 8,3 % nechrání konkrétní školu, je správný: u Machara je mezera mediánů mezi gymnáziem a lyceem 0,14, tedy na úrovni vnitroskupinové odchylky. Test má nově dvě místa a obě musí projít | D3 krok 1 |

**Drobnosti kola 2** přijaty všechny tři: slovník u *Obtížnosti přijetí slovy* dostane větu, že datové pole nese hodnoty i pod prahem a práh je pravidlo zobrazení; doklad nově sám uvádí počet unikátních dvojic s rozpisem (**23**, ne 20 — 29 klíčů vzniká tím, že pět dvojic má víc nabídek); sweep letopočtů dostane kontrolní seznam a grepový test v CI se seznamem povolených výjimek.

### Stanoviska k otevřeným otázkám (kolo 1)

Přijímají se všechna: přepnout na rok 2026 (s podmínkou S4), zrušit graf priorit a zavedení podmínit testem, opravit texty hned, **D2 před D3**, absolventy uzavřít větou a krajovou míru **zamítnout**, zjištění zapsat do soupisu zdrojů hned. U dvou z nich návrh postup upřesňuje:

- **Dvojí implementace obtížnosti** (stanovisko 4): oponentura doporučuje odstranit pole z JSON. To ale rozbije `scripts/rozbor-podminek-a-poradi.py`, který ho čte, a hlavně práh deseti soutěžících je podle slovníku **pravidlo zobrazení, ne součást definice**. Navrhuji proto ponechat výpočet v generátoru a nechat TypeScript pole číst a uplatňovat nad ním jen práh; zůstane jedna definice a jedno místo, kde se rozhoduje o zobrazení.
- **Drobnost o kapacitě** (oddíl 4 oponentury): tvrzení „z 723 dobíhajících záznamů má kapacitu 0 jen 5“ je po sjednocení metodiky potvrzené — platí pro definici C00 + D00, kterou doklad uvádí výslovně.

## Historie

| Verze | Změna |
|---|---|
| 1.2 | Vypořádáno kolo 2 oponentury. **N1 přijat a verze 1.1 opravena:** tvrzení, že dokument sledování škol o dobíhajícím oboru nemluví, četlo verzi 1.0 na aktuální větvi, kdežto živá je v2.1 na větvi `docs/sledovani-skol-a-oboru`; D4a má čtyři dokumenty a návrh přijímá pravidlo uvádět u ověření větev, verzi a commit. **N2 přijat v jádru, opraven v dopadu:** inventura šesti konzumentů `min_body` potvrdila, že se v1.1 zastavila brzy, ale na veřejné adrese se údaj nezobrazuje (`/moje-sance` je přesměrování, API vracejí `null`); rozhodnutí zesíleno na odstranění mrtvých konzumentů. **N3 přijat:** test D3 probíhá i na škole se smíšenými typy. Drobnosti: slovník dostane větu o prahu jako pravidle zobrazení, doklad uvádí unikátní dvojice (23, ne 20), sweep letopočtů dostane test v CI. |
| 1.1 | Vypořádána oponentura v1.0: přijato S2, S3, S5, S6 a S7 v jádru, S1 a S4 částečně. Doložen skript `scripts/dobihajici-obory.py` a s ním rozhodnut spor 723/754 (definiční rozdíl o druh E00; nula platí při všech definicích). Změřeno, že typ studia vysvětluje jen 8,3 % rozptylu, takže zákaz srovnání napříč typy se nahrazuje povinností typ pojmenovat. D3 přeřazeno za D2 a test srozumitelnosti předřazen zápisu do slovníku. Rozdělení ve slovníku rozepsáno po skupinách včetně nástavby. Zjištěno, že `min_body` není `jpz_min_actual` a že průvodce, o který se opírá S4, je mrtvý kód. Krajová míra nezaměstnanosti zamítnuta. Vyvráceno, že o dobíhajícím oboru mluví dokument sledování škol. |
| 1.0 | První návrh. Zjištěno, že data uchazečů 2026 jsou převzatá a chybí jen přepnutí registru; že dobíhající obor se netýká ani jedné z 3 091 nabídek a jeho dokumentovaná role je nepravdivá; že přijatí podle priority nesou vlastní informaci, web je už ukazuje ze starší revize katalogu s rozdílem u 315 nabídek, a rozpor dvou schválených dokumentů se řeší přesunem do jiného bloku; že obtížnost přijetí má dvě neshodné implementace; a že na otázku o absolventech nelze odpovědět ani ze zdrojů mimo projekt, protože jmenovatel odmítá jako nevěrohodný sám MŠMT. |
