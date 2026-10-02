# Simulátor přijímaček: výsledek cvičného testu proti školám, zvažované obory a strategie řazení

Verze 0.2 · 29. 9. 2026 · **schváleno zadavatelem 29. 9. 2026** (oddíl 12)

Učební obory jako pojistku bez bodů řeší [doplněk](navrh-simulator-doplnek-ucebni-obory.md) (návrh, #244).

Fáze 2 návrhu [Kde stojím](navrh-kde-stojim-2027.md). Fáze 1 (stránka oboru, komponenta `src/components/obor/KdeStojim.tsx`) je nasazená. Rozhodnutí zadavatele z 29. 9. 2026:

1. „Kde stojím“ se přejmenovává na **Simulátor přijímaček**. Rozšiřuje se stávající `/simulator` ([dodávka UX](dodavka-simulator-ux-2027.md)); nová stránka nevzniká.
2. Postup ve třech krocích: **udělej si správný cvičný test**, **podívej se, kam by ses s ním dostal**, **přečti si výhrady**.
3. Výsledky ve **třech skupinách podle pásma 1. kola**, filtrovatelné **dojezdem MHD** (stávající) a **městem**.
4. **Zvažované obory** = stávající uložený výběr v prohlížeči. Nad ním **strategie řazení přihlášek: vaše preference + pojistka**, s vysvětlením, jak fungují priority.
5. Kdo test TAU nemá, smí zadat body z jiného testu nebo odhad **bez převodu a s výraznou výhradou**.
6. Počet přihlášek a pravidla priorit se berou **z dat webu (harmonogram a pravidla MŠMT)**, ne napevno v kódu.

## 1. Co rodina dostane

Dnes simulátor odpovídá na „které školy mi vyhovují“ (obor, dojezd, uložený výběr) a u uložených škol porovnává zadané body s **průměrem přijatých** (`src/lib/admission-gap.ts`, tabulka `OfferComparisonTable`). Průměr nezná rozptyl: dva obory se stejným průměrem mají pásmo nejistoty 2 a 44 bodů.

Nově:

| Krok | Co uchazeč udělá | Co mu ukážeme |
|---|---|---|
| 1. Cvičný test | napíše test TAU pro svůj ročník, celý, na čas, bez oprav; zadá body z češtiny a matematiky (i víc testů) | proč právě tento test: jen u něj umíme převést výsledek na body roku {rok pásem}; návod krok za krokem (stejný jako na stránce oboru) |
| 2. Kam by ses dostal | nastaví obor, dojezd, město; ukládá mezi zvažované | nabídky ve třech skupinách podle polohy vůči pásmu 1. kola {rok}; u každé počty, štítek „extra body“, odkaz na stránku oboru |
| 2b. Strategie řazení | seřadí zvažované obory podle toho, kam chce nejvíc | kontrola pojistky, vysvětlení priorit, počet přihlášek z pravidel MŠMT |
| 3. Výhrady | — | stres na ostrém testu, TAU spíš nadhodnocuje, jeden ročník není předpověď, kritéria jsou přepis z PDF, nová kritéria se vyhlásí {termín} |

## 2. Krok 1: cvičný test

- Znovupoužít návod z `KdeStojim.tsx` (okno „Který test udělat“: `tau.cermat.cz/predmet_prijimacky.php` → ročník → předmět → celý test → rok testů převodu → 1. řádný termín). Rok testů z `prevod_testu_{rok}.json`, sada `cermat-prevod-testu`.
- **Druh testu** (4, 6, 8 let) volí uchazeč jednou nahoře („Hlásím se po 9. / 7. / 5. třídě“); stávající přepínač ročníků v simulátoru to už má. Kdo se hlásí na čtyřletý obor i na víceleté gymnázium, zadá dva výsledky (každý jiný test); převod se vybere podle druhu nabídky.
- **Víc testů**: zobrazí se každý převedený výsledek a jejich průměr, jako na stránce oboru; poloha ve výsledcích se počítá z průměru, rozpětí se ukáže u nabídky, kde každý test padá do jiné skupiny.
- **Bez TAU**: volba „Znám body z jiného testu nebo odhaduji“. Číslo se nepřevádí, porovnává se přímo s body roku pásem a u všech výsledků visí výhrada „platí jen, pokud byl test stejně těžký jako ostrý test {rok}“ (ukazatel *Převedený výsledek testu*, „co neříká“, poslední odrážka).
- **Uložení**: stejný klíč localStorage jako fáze 1 (výsledky testů, druh, ročník testu v klíči), takže co zadal na stránce oboru, simulátor převezme a naopak. Tlačítko „Smazat uložené výsledky“.

## 3. Krok 2: tři skupiny

Poloha převedeného výsledku *B* vůči oboru se určí z ukazatelů **Nejnižší výsledek JPZ mezi přijatými** a **Pásmo nejistoty** (meze každá zvlášť, jak ukládá slovník):

| Skupina | Podmínka | Věta (vzor, rok z registru) |
|---|---|---|
| **Nad pásmem** | *B* nad horní mezí pásma nejistoty | „V 1. kole {rok} se sem dostali všichni soutěžící uchazeči s takovým výsledkem (N přijatých z M).“ |
| **V pásmu** | *B* mezi mezemi | „Rozhodovalo i něco jiného než test: z N soutěžících uchazečů v tomto rozmezí se dostalo M.“ |
| **Pod pásmem** | *B* pod nejnižším výsledkem přijatých | „V 1. kole {rok} se sem s takovým výsledkem nedostal nikdo.“ |

Zvláštní případy (rozhodnutí v otevřených otázkách, oddíl 10):

- **Obory, kde nikoho neodmítli** (kvůli počtu míst) (1 207 z 2 830 oborů s pásmy 2026): horní mez neexistuje. Kdo splnil požadavky školy, dostal se. Návrh: nad nejnižším přijatým → „Nad pásmem“ s větou „v 1. kole {rok} se dostal každý, kdo splnil požadavky školy“; pod ním → „Pod nejnižším přijatým“ se slabší větou (níž nikdo nesoutěžil, ne „nikdo se nedostal“).
- **Málo dat** (méně než 10 přijatých, `MIN_PRIJATYCH_PRO_HRANICI`) nebo obor bez jednotné zkoušky: čtvrtá, sbalená skupina „Bez srovnání“ s důvodem. Nikdy se nepočítá jako „pod pásmem“ (past „chybějící údaj není nula“).
- **Rozpor počtů** pásem a pozic: nabídka jde do „Bez srovnání“, stejně jako ve fázi 1 proužek zmizí.
- **Zaměření**: data uchazečů zaměření neznají; skupina platí za celý obor školy (REDIZO_KKOV) a u nabídky se zaměřením se to napíše.

Uvnitř skupiny se řadí **podle dojezdu**, pak abecedně, **ne podle vzdálenosti od hranice**: pásmo nejistoty se podle slovníku nepoužívá k řazení oborů.

U každé nabídky: název, obec, dojezd, věta skupiny, štítek **„O přijetí rozhodují i extra body“** podle kritérií {rok} (stejná funkce `extraBody` jako na stránce oboru), tlačítko „Uložit mezi zvažované“, odkaz „Podrobně na stránce oboru“ (tam proužek a pořadí mezi soutěžícími).

**Filtr městem**: nová roleta obcí z katalogu (stejný seznam jako [stránka města](navrh-stranky-mesta-2027.md)), kombinovatelná s dojezdem. Bez zvolené zastávky i obce se výsledky neukazují po celé zemi, ale výzva „zvol město nebo zastávku“ (2 800 nabídek by nikomu nepomohlo).

## 4. Zvažované obory a strategie řazení

- **Zvažované obory** jsou dnešní uložený výběr (`localStorage` + sdílitelná URL, `SavedSelectionBar`). ~~Přejmenovat v textu na „oblíbené školy“~~ (překonáno oddílem 12, bod 11: pojem zůstává „zvažované obory“) (pojem do slovníku pojmů). Nový je jen **pořadí** v oblíbených (šipky nahoru a dolů, na mobilu tlačítka, ne tažení).
- **Strategie „vaše preference + pojistka“**:
  1. Na první místa dejte obory, kam chcete nejvíc, **i když jste u nich v pásmu nebo pod ním**. Vysvětlení: škola vás řadí podle bodů, ne podle toho, na kolikátém místě ji máte; priorita rozhoduje až tehdy, když vás přijme víc škol, a pak nastoupíte na tu výš. Vyšší ambice vám tedy u školy níž neublíží.
  2. **Pojistka**: aspoň jedna nabídka ze skupiny „Nad pásmem“. Když žádná není, simulátor na to upozorní a nabídne nejbližší (podle dojezdu) nabídky nad pásmem se stejným nebo příbuzným oborem.
  3. **Kontrola seznamu**: počet běžných a talentových přihlášek podle pravidel MŠMT; víc zvažovaných oborů než přihlášek je v pořádku (pracovní seznam), upozornění „do přihlášky se vejde prvních N běžných a M talentových“.
- **Počet přihlášek z dat, ne z kódu**: přidat do `src/data/admissions-2027.json` blok `pravidla` (`prihlasek_bezne`, `prihlasek_talentove`, `zdroj`, `checkedAt`), opsaný z metodiky MŠMT stejně jako termíny (sada `msmt-harmonogram`). Dnešní stav podle pravidel 2026: 3 běžné + 2 talentové. Do ověření pro rok 2027 text říká „podle pravidel {rok pravidel}“.
- **Co strategie nedělá**: nepočítá pravděpodobnost přijetí a nesimuluje přiřazení. Data jsou agregáty za obor a limit přihlášek chování rodin formuje, takže simulace pořadí nad daty z omezeného režimu by měřila něco jiného (viz projektová paměť o limitu přihlášek).

## 5. Krok 3: výhrady

Stálý blok pod výsledky a zkrácená verze nad nimi („Výsledek z domova není výsledek zkoušky“):

1. Na ostrém testu působí stres a čas; doma, bez tlaku a s možností opravy v TAU vychází výsledek spíš lepší.
2. Převod předpokládá celý test, na čas, bez oprav, poprvé.
3. Skupiny popisují 1. kolo {rok}, ne předpověď. Hranice se mezi ročníky posouvá (medián změny pásma 3 body).
4. Kritéria {rok} jsou strojový přepis PDF, zhruba každý desátý podstatně chybný; kritéria pro nové řízení se vyhlásí {termín `ss-kriteria`}.
5. U jiného testu než TAU platí srovnání jen pro stejně těžký test.
6. Data uchazečů neznají zaměření.

## 6. Povinná inventura zdrojů

Prošel jsem [zdroje dat](zdroje-dat.md) celé včetně oddílu 3. Návrh **nepřidává nový zdroj dat uchazečů**; stojí na datech uchazečů (2.2), položkových datech JPZ 2024 (2.3), přepisu kritérií z DiPSy (2.16), katalogu a dopravních datech (2.9, 2.10) a harmonogramu (2.13, nový blok `pravidla`, zapsat do 2.13 ve stejné dávce).

| Nepoužitý sloupec (oddíl 3 a další) | Rozhodnutí |
|---|---|
| **Oficiální nejnižší a nejvyšší výsledek přijatých a percentily** (souhrny, sl. 72–86) | **Nepoužít.** Jsou po zaměřeních, ale nenesou horní mez pásma (nejvyšší nepřijatý kvůli kapacitě); skupina „Nad pásmem“ ji potřebuje. Dvě definice nejnižšího přijatého v jednom seznamu by si odporovaly. |
| **Přijatí podle priority** (souhrny, sl. 40–44) | **Zvážit pro strategii, zatím ne.** Věta „tři čtvrtiny přijatých měly obor jako 1. volbu“ by vysvětlila, že obor plní hlavně první volby; ale váže se na chování jiných, ne na uchazečovo pořadí, a svádí k taktizování („dám ho na první místo, ať mě vezmou“), což je mylné. Otevřená otázka 6. |
| **Výsledky zkoušky všech uchazečů o obor** (souhrny, sl. 45–65) | **Nepoužít.** Průměr konkurence nahrazuje pásmo a pořadí mezi soutěžícími; minimum a maximum určuje jediný uchazeč. |
| **Souběžné přihlášky / obory výš a níž** (data uchazečů, `ss1–5_redizo/kkov`) | **Nepoužít v seznamu, odkázat.** Kam se hlásí stejní uchazeči je na stránce oboru; v simulátoru by to byla čtvrtá informace u každé nabídky. |
| **Profil dovedností** (položková data `b1`–`b16.x`) | **Nepoužít.** Nezpracované, mimo otázku „kam se dostanu“. |
| **Výsledky po termínech zvlášť** | **Použito** jen v převodu (volba termínu testu). |
| **Školní část zkoušky, přílohy** (DiPSy `skolniCast`, `typyPriloh`) | **Nepoužít.** Štítek extra body stojí na přepisu PDF; samotný příznak bodování nedokládá. |
| **Živá nabídka 3. a dalších kol** (DiPSy) | **Nepoužít.** Simulátor je o 1. kole. |
| **Vstupní úroveň školy 2017–2023** | **Nepoužít.** Nestažené, odpovídá na dlouhodobou žádanost. |
| `jpz_prumer_actual`, `jpz_median` (katalog 2025) | **Nepoužít; průměr přijatých z tabulky porovnání odstranit** (oddíl 7). |
| `ss*_zrizovatel` | **Nepoužít.** Filtr veřejné/soukromé zadavatel nežádal; případně později jako filtr. |
| Dobíhající obor | **Použít nepřímo**: nevypsané nabídky se do výsledků nedostanou (katalog `nevypsano_{rok}`). |

## 7. Ukazatele, pojmy, registr

**Ukazatele** (slovník ukazatelů, verze +1 v dávce implementace):

- Použité beze změny výpočtu: *Převedený výsledek testu*, *Pásmo nejistoty*, *Nejnižší výsledek JPZ mezi přijatými*, *Soutěžící o obor*, *Podíl přijímaček na bodování* (štítek extra body); u každého doplnit „Kde se zobrazuje: simulátor“.
- **Nový: *Poloha vůči pásmu*** (nad / v / pod / nikoho neodmítli / bez srovnání): definice podle tabulky v oddílu 3, zdroj pásma přijetí, jednotka kategorie, **co neříká**: není pravděpodobnost přijetí, nepoužívá se k řazení oborů, popisuje jeden ročník a obor bez zaměření.
- **Odchází ze simulátoru: *Průměr JPZ přijatých*** jako porovnávací měřítko (`admission-gap.ts`). Ukazatel ve slovníku zůstává (používá se jinde), v simulátoru se nahradí polohou vůči pásmu. `admission-gap.ts` a jeho test se smažou, pokud je nic dalšího nepoužívá (dnes jen `OfferComparisonTable`).

**Pojmy** (slovník pojmů, ve stejné dávce): **Simulátor přijímaček** (název nástroje), **zvažované obory** (uložený výběr, pojem už ve slovníku; „oblíbené“ ani „košík“ nepoužívat), **pojistka** („obor, kam se v 1. kole {rok} s vaším výsledkem dostali všichni“; nepoužívat „jistota“), **nad pásmem / v pásmu / pod pásmem** (s vysvětlením při prvním výskytu v bloku), **priorita** jako synonymum „pořadí na přihlášce“ jen v textu strategie, s vysvětlením.

**Registr**: žádná nová datová sada. Nový index (oddíl 8) patří k sadě `cermat-uchazeci-kolo1` (odvozený soubor, rok v názvu). Blok `pravidla` k sadě `msmt-harmonogram`. Po změně `python3 scripts/stav-datovych-sad.py kontrola`.

## 8. Výkon

Klientovi se **nenačítají celé soubory** (pásma 2026 přes 1 MB, pozice 586 kB, kritéria 1,7 MB).

- **Kompaktní index** `public/simulator_pasma_{rok}.json` ze skriptu `scripts/build-simulator-pasma.py`: na obor `[nejnižší přijatý, dolní mez, horní mez, soutěžících, přijatých, nevešlo se, extra body]`. Změřeno 29. 9. 2026: **2 830 oborů, 184 kB, 36 kB po gzip (přeměřeno po E1; index přibral sloupce pro skupiny)**. Načte se jednou a skupiny se počítají v prohlížeči (převod je tabulka 26 kB, druh jen jeden).
- Alternativa: rozšířit `/api/schools/search?simulatorCatalog=1` o pole skupiny počítané na serveru. Nevýhoda: body uchazeče by šly na server; index v prohlížeči drží body jen u uživatele. **Doporučeno: index.**
- Pořadí mezi soutěžícími se v seznamu neukazuje (586 kB); je na stránce oboru.

## 9. Etapy a odhad

| Etapa | Obsah | Odhad |
|---|---|---|
| E1 Data | skript indexu + test shody s pásmy, blok `pravidla` v harmonogramu, registr, zdroje-dat 2.13 | 1 den |
| E2 Krok 1 | vytáhnout zadání testů a návod z `KdeStojim` do sdílené komponenty, volba „jiný test“, sdílené uložení, přejmenování stránky a metadat na Simulátor přijímaček | 1,5 dne |
| E3 Krok 2 | výpočet skupin (čistá funkce + testy krajních případů), seznam ve skupinách, filtr městem, štítek extra body, nahrazení `admission-gap` v porovnání | 2–3 dny |
| E4 Strategie | pořadí zvažovaných oborů, kontrola pojistky, texty priorit, počet přihlášek z dat | 1,5 dne |
| E5 Výhrady a texty | blok výhrad, slovník pojmů a ukazatelů, test srozumitelnosti textů (klíčové věty) | 1 den |
| E6 Ověření | Node testy, mobil, Codex review, přejímka na produkci | 1 den |
| **Celkem** | | **8–9 dní** |

Etapy E1–E3 lze nasadit samostatně (simulátor ukáže skupiny), E4 a E5 navazují.

## 10. Testy

- Čistá funkce skupiny: nad, v, pod, shodné meze, horní mez pod dolní (7,8 % oborů), nikoho neodmítli, méně než 10 přijatých, chybějící data, rozpor počtů.
- Převod podle druhu testu a volba „jiný test“ bez převodu.
- Index: součty sedí s `pasma_prijeti_{rok}.json` a pozicemi; velikost pod 200 kB.
- Strategie: bez pojistky upozornění, víc zvažovaných oborů než přihlášek, talentové zvlášť.
- Render: rok z registru v každé větě, žádné procento šance, výhrady vždy viditelné.
- Stávající testy simulátoru (dojezd, uložení, staré odkazy) zůstanou zelené.

## 11. Otevřené otázky pro zadavatele

1. **Obory, kde se nikdo nevešel** (1 207): zařadit nad nejnižším přijatým do „Nad pásmem“ s vlastní větou, nebo samostatná skupina „Místo pro každého, kdo splnil požadavky“?
2. **Pojistka**: stačí jedna nabídka nad pásmem, nebo doporučit dvě (jedna může mít extra body, ve kterých uchazeč neuspěje)?
3. **Nabídky s extra body v pásmu**: nechat ve skupině „V pásmu“ jen se štítkem, nebo je upozadit (převedený výsledek u nich říká méně)?
4. **Víc testů**: počítat skupinu z průměru, nebo z nejhoršího výsledku (opatrnější)?
5. **Zobrazení bez polohy**: má jít seznam procházet i bez zadaného testu (jen obory a dojezd jako dnes), nebo je test povinný krok 1?
6. **Přijatí podle priority** ve strategii: ukázat „většina přijatých tu měla obor jako 1. volbu“, nebo vynechat kvůli riziku taktizování?
7. **Talentové obory**: řadit do skupin stejně (u nich rozhoduje talentová zkouška, test jen částečně), nebo je dát do „Bez srovnání“ s vysvětlením?
8. **Název v menu a URL**: ponechat `/simulator` a v menu „Simulátor přijímaček“?

## 12. Rozhodnutí zadavatele (29. 9. 2026)

Platí doporučení ke všem otázkám z oddílu 11:

1. Obory, kde v 1. kole nikoho neodmítli kvůli počtu míst, tvoří **samostatnou skupinu „Obory, kde nikoho neodmítli“** (název zadavatele; „nikdo se nevešel“ sváděl ke čtení „nikoho nepřijali“). Věta pod názvem upřesní „kvůli počtu míst; kdo splnil podmínky, dostal se“ s větou, že se přijímalo podle podmínek (minima, kritéria), ne podle pořadí.
2. Pojistka: aspoň jedna nabídka nad pásmem, a pokud to jde, i jedna ze skupiny „Obory, kde nikoho neodmítli“.
3. Nabídky s extra body v pásmu dostanou jen štítek, neupozaďují se.
4. Při více testech se skupina počítá z **nejhoršího** výsledku.
5. Seznam jde procházet i bez testu, bez rozdělení do skupin a s výzvou k testu.
6. Přijatí podle priority se ve strategii zatím neukazují.
7. Talentové obory patří do „Bez srovnání“.
8. Adresa zůstává `/simulator`, v menu „Simulátor přijímaček“.

**Doplnění 29. 9. 2026 (zadavatel):** uživatelé chtějí buď co nejtěžší školu, kam se dostanou, nebo mají vybraný obor.

9. Přibude volba řazení **„od nejvyšší hranice přijetí“** podle doloženého ukazatele (nejnižší výsledek přijatého, případně dolní mez pásma {rok}; název a výpočet podle slovníku ukazatelů, nový způsob použití zapsat). Věta u řazení: těžší přijetí neznamená lepší školu, kvalitu ukazuje maturita a inspekce na stránce školy. Výchozí řazení zůstává podle dojezdu. Tím se upravuje zákaz řazení v oddílu 3: neřadí se podle vzdálenosti uchazeče od hranice, ale podle hranice samotné.
10. Uživatel s vybraným oborem si vystačí s dnešním filtrem „Co tě zajímá“, rozcestník se nepřidává.
11. **Pojem pro uložený výběr zůstává „zvažované obory“** podle slovníku pojmů; slovo „oblíbené“ se na stránce, v kódu ani v dokumentaci nepoužívá (rozhodnutí 29. 9. 2026).
12. **Počet přihlášek 3 běžné + 2 talentové** zůstává podle rozhodnutí zadavatele 29. 9. 2026 (očekává platnost i pro řízení 2027). V `src/data/admissions-2027.json` je zdroj „rozhodnutí zadavatele 29. 9. 2026, podle pravidel 2026“, `overeno_pro_rizeni` zůstává `false` (v metodice MŠMT pro 2027 neověřeno). Text stránky nezní jako pochybnost, říká jen „podle pravidel 2026“.

## 13. Poznámky k provedení E4

- Pojmy: text stránky drží slovník pojmů, ne pracovní slova návrhu. Místo „oblíbené školy“ **zvažované obory** (slovník 1.13, ukládá se nabídka), místo „priority“ **pořadí na přihlášce** se standardní větou, že pořadí šanci na přijetí nemění. Nový pojem **pojistka** je ve slovníku pojmů 1.30.
- Pořadí zvažovaných oborů mění šipky nahoru a dolů (`posunVPoradi`), ukládá se do stejného úložiště jako dosud.
- Kontrola (`src/lib/strategie-prihlasek.ts`) počítá běžné a talentové obory zvlášť podle bloku `pravidla` v `admissions-2027.json`. Pojistka se hledá jen mezi obory, které se do přihlášky vejdou; pojistka za posledním místem dostane výzvu „posuň ho výš“. Talentový obor pojistkou není (je „Bez srovnání“).
- Návrh pojistky bere nejbližší obory nad pásmem jen z hledání omezeného místem (zastávka s limitem, obec nebo kraj), přednostně se stejným oborem jako některý zvažovaný.
- Přijatí podle priority se neukazují (rozhodnutí 6), přiřazení ani šance se nepočítá.

## 14. Stav implementace (E1–E5, 29. 9. 2026)

| Etapa | Stav | Commit |
|---|---|---|
| E1 Data | hotovo (index pásem, blok `pravidla`, registr) | větev `feat/simulator-prijimacek` |
| E2 Krok 1 | hotovo (sdílené zadání testů, název Simulátor přijímaček) | `3b529ec` |
| E3 Krok 2 | hotovo (skupiny, řazení od nejvyšší hranice přijetí, `admission-gap` odstraněn) | `4001160` |
| E4 Strategie | hotovo (pořadí zvažovaných oborů, pojistka, počet přihlášek z dat) | `b1336e7` |
| E5 Výhrady a texty | hotovo (krok 3, slovníky, changelog) | tato dávka |
| E6 Ověření | čeká (Codex review, prohlížeč, přejímka na produkci) | |

Poznámky k E5:

- Výhrady jsou komponenta `VyhradySimulatoru` v kroku 3 pod výsledky a pod zvažovanými obory, zkrácená verze nad seznamem odkazuje na `#vyhrady`. Blok se ukazuje vždy, i bez zadaného testu a bez zvoleného místa.
- **Oprava čísla z oddílu 5, bod 3:** „medián změny pásma 3 body“ je změna **šířky** pásma. Posun samotné hranice (nejnižší výsledek přijatých, 2 315 oborů) má medián 5 bodů a u 16,4 % oborů přes 10 bodů; text stránky používá tato čísla, zapsaná ve slovníku ukazatelů 1.46.
- Rok kritérií bere stránka ze sady `dipsy-kriteria`, termín nových kritérií z události `ss-kriteria` v `admissions-2027.json`; bez přepisu se bod o kritériích vynechá.
- Bod o jiném testu platí vždy; když uchazeč takový výsledek zadal, věta to řekne.
- Pojmy **ostrý test** a **výhrady** ve slovníku pojmů 1.31; ostrý test se vysvětluje při prvním výskytu v bloku.
- Test srozumitelnosti klíčových vět s rodiči (etapa E5 v oddílu 9) neproběhl; patří do E6 nebo před nasazení.
- Revize mobilu a klávesnice (kódem, ne v prohlížeči): blok je jeden sloupec s `max-w-3xl`, bez pevných šířek, takže na 320–390 px nepřetéká; odkaz na výhrady a šipky pořadí jsou nativní `a` a `button` s viditelným `focus-visible` obrysem, šipky mají 44 px. Nadpisy kroků 1–3 jsou `h2` s `aria-labelledby`.
- Zbývá z E4: popisky „uložený obor“, „Sdílet výběr“ v `SavedSelectionBar` a „Uložit do výběru“ u hvězdičky; nabídka jiného druhu testu u volby „Všechny typy“. Stávající lint chyba `react-hooks/set-state-in-effect` v `SimulatorClient.tsx` (načtení úložiště) je starší než E5.
