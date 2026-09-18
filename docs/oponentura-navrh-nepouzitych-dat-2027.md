# Oponentura k návrhu „Co udělat s daty, která máme a nepoužíváme"

Verze 2.0 · 17. 9. 2026 · Kolo 2 se vztahuje k [návrhu v1.1](navrh-vyuziti-nepouzitych-dat-2027.md). Kolo 1 (oponentura v1.0) je archivováno dole.

# Kolo 2: oponentura návrhu v1.1

## 0. Metoda

Návrh v1.1 vypořádal sedm bodů kola 1 a u dvou z nich tvrdí, že je měření vyvrátilo. Ověřil jsem proto především jeho proti-důkazy: přepočet eta² z `public/souhrny_kolo1.json`, kontrolu použití `GuidedJourneyWizard` a škál polí `min_body` / `jpz_min_actual`, spuštění nového dokladu `scripts/dobihajici-obory.py` a porovnání verzí dokumentu sledování škol napříč větvemi.

## 1. Proti-důkazy v1.1, které přepočet potvrzuje — přijímám

- **S1: typ studia není dominantní složka rozptylu.** Přepočet na 2 630 nabídkách: eta² = **0,0834** (návrh uvádí 0,083), celková směrodatná odchylka 0,179, vnitroskupinové 0,122–0,193. Moje premisa „typ je dominantní" se nepotvrdila; pravidlo „vždy pojmenovat typ, srovnání nezakazovat" přijímám jako lepší než zákaz i než můj návrh vyřazení z karet.
- **S4, faktum (a): `min_body` není `jpz_min_actual`.** Potvrzeno: `min_body` v katalogu 2026 má rozsah 10–168, `jpz_min_actual` 5–84, a `min_body` nepočítá žádný skript v repozitáři (`match_obory_2025_2026.py` ho jen kopíruje). Oprava `enrich_schools_data.py` se ho skutečně netýká.
- **S4, faktum (b): průvodce je mrtvý kód.** Potvrzeno: `GuidedJourneyWizard` ani `PersonalizedResults` nemají import mimo vlastní adresář a žádná route v `src/app` na `guided` neodkazuje. Moje formulace „zobrazovaná chyba dnešního webu" byla **chybná** a tímto ji stahuji.
- **S6: doklad je doložený a reprodukovatelný.** Spustil jsem `python3 scripts/dobihajici-obory.py` a výstup je bajtově shodný s `docs/podklady/dobihajici-obory.json`. Spor 723/754 je vyřešený definicí (E00 = vyšší odborné školy) a přesný join vychází na nulu při všech třech definicích včetně varianty bez filtru. Rozdíl 654/680 unikátních dvojic je týž definiční rozdíl. Přijímám celé.
- **S5: rozsah letopočtů.** 13 přístupů `data['20…']` v `src/lib/data.ts` potvrzeno přesně; odhad 101 textů ve 36 souborech je konzistentní s hrubým grepovým měřením (40 souborů s jakýmkoli výskytem).
- **Dvojí implementace obtížnosti:** `scripts/rozbor-podminek-a-poradi.py` skutečně čte `zarazeni_obtiznosti` z JSON (kolem řádku 78), takže moje doporučení pole odstranit by doklad rozbilo. Třetí varianta v1.1 — definice jen v Pythonu, práh zobrazení jen v TypeScriptu — je lepší; přijímám ji s podmínkou v drobnostech níže.

## 2. Zbývající sporné body k vypořádání

### N1 — „Vyvrácení" čtvrtého dokumentu v S7 je postavené na špatné verzi sledování škol

Oddíl 9 v1.1 tvrdí: „dokument má sedm oddílů a čtyři otevřené otázky, slova ‚dobíhající', ‚zavírá' ani ‚zaniká' v něm nejsou ani jednou a opravovat se tam nemá co." To platí o **verzi 1.0 na aktuální větvi** (`feat/maturita-srozumitelne`). Živá verze návrhu sledování je ale **v2.1 na větvi `docs/sledovani-skol-a-oboru`** — na ni odkazuje i [návrh novinek](novinky-k-prijimackam-2027.md) — a ta dobíhající obor obsahuje na třech místech:

1. **§3.1:** „Před termínem přihlášek jsou užitečné jen `udaje_od_skoly` … a do budoucna **dobíhající obor z rejstříku** (oddíl 9)."
2. **§9, řádek tabulky:** „Rejstřík, `dobihajiciObor` — **použít, až bude na stránce oboru** — ‚Škola tenhle obor dobíhá' je pro sledující oboru **nejcennější zpráva a přichází před termínem přihlášek**, na rozdíl od dat CERMATu."
3. **Otevřená otázka 5:** „zařadit převod `dobihajiciObor` na stránku oboru před F3, aby sledování oboru mělo zprávu i před termínem přihlášek?"

Měření v1.1 (0 z 3 091 nabídek; příznak je jednosměrný a 722 z 723 dobíhajících se nenabíralo v žádné formě) vyvrací přesně mechanismus, na kterém tyto tři pasáže stojí: událost „obor dobíhá" by pro sledovaný, aktuálně nabízený obor prakticky nikdy nenastala. Pro sledování zbývá — stejně jako pro stránku — jen role rozlišení „doběhl × nevypsaný ročník". D4a se tedy má dotknout **čtyř** dokumentů, jak kolo 1 žádalo; čtvrtý je `sledovani-skol-2027.md` **ve verzi 2.1** (konkrétně §3.1, §9 a otázku 5).

**Vypořádání:** doplnit čtvrtý dokument do tabulky D4a s uvedením verze a větve. A procesně: vypořádání oponentury má uvádět, na které větvi a verzi se ověřovalo — záměna v1.0/v2.1 je přesně typ chyby, kterou projekt jinde řeší registrem období.

### N2 — D1 krok 3 zastavil u mrtvého průvodce, ale `min_body` se zobrazuje jinde: rozpor s tabulkou 1 nemizí, přesunul se

v1.1 správně zjistila, že průvodce je mrtvý, a uzavřela: „rozpor s tabulkou 1 tím mizí: D1 se týká `jpz_min_actual`, ne bodového minima v průvodci." To je předčasné. `min_body` a jeho odvozeniny se renderují uživatelům dnes:

- **`/moje-sance`** (`MojeSanceClient.tsx:355, 425, 435`) zobrazuje `min_body_2025` i `min_body_2024` — výrazně, červeně, s popiskem „Minimum 2025, škála JPZ 0–100". Stránka není z webu odkazovaná, ale jako route je veřejně nasazená.
- **`SchoolDetailClient.tsx:387-395`** počítá vážený průměr `min_body` podobných škol.
- **`src/lib/data.ts:36`** hodnotu ještě transformuje (`min_body / 2`) pro další konzumenty; `src/lib/cityData.ts:195-199` ji nese do dat měst.

Údaj škály 10–168 s popiskem „škála JPZ 0–100" je navíc zjevně špatně popsaný. A hlavně: `min_body` je podle všeho přesně ten typ údaje, který tabulka 1 zamítá — nejnižší bodový výsledek přijatých, určený jediným uchazečem, mezi ročníky nesrovnatelný (medián posunu +5,0). v1.1 ho chce zapsat „mezi ukazatele bez doloženého výpočtu", což je nutné, ale **nestačí, dokud se hodnota renderuje na veřejné URL** — pravidlo projektu říká, že nedoložený údaj se nezobrazuje, ne že se zapíše a dál zobrazuje.

**Vypořádání:** D1 krok 3 rozšířit o inventuru konzumentů `min_body` (moje-sance, SchoolDetailClient, data.ts, cityData) a rozhodnutí pro každý: doložit původ a výpočet (a pak čelit rozporu s tabulkou 1 výslovně), nebo zobrazení odstranit či stránku vypnout. Otevřenou otázku 2 („co s mrtvým průvodcem") přejmenovat na „co s `min_body`" — průvodce je jeho nejmenší konzument.

### N3 — Test D3 má obsahovat školu se smíšenými typy studia

eta² = 0,083 platí celoplošně, ale praktické riziko karet oborů je konkrétní: škola kombinující gymnázium a lyceum (dokladový příklad Machara) má mediánovou mezeru mezi typy 0,14, tedy srovnatelnou s vnitroskupinovou odchylkou (0,17–0,19). U dvou konkrétních oborů jedné takové školy může typ vysvětlovat podstatnou část rozdílu, i když celoplošně jen 8,3 %. Pravidlo „pojmenovat typ" to řeší textově; test věty (D3 krok 1) by měl proto zahrnout i čtení u karet oborů školy se smíšenými typy, ne jen izolované stránky oboru.

**Vypořádání:** do kritéria testu v D3 doplnit jednu větu: test probíhá i na stránce školy s obory různých typů a nesmí vyvolat srovnání „lyceum je horší než gymnázium".

## 3. Drobnosti

- Přijatá „třetí cesta" pro dvojí implementaci obtížnosti přesouvá past, ne likviduje ji: pole v JSON bude dál nést zařazení pod prahem zobrazení a `rozbor-podminek-a-poradi.py` je čte bez prahu už dnes. Do slovníku u ukazatele výslovně zapsat, že datové pole nese hodnoty pod prahem a práh je pravidlo zobrazení — jinak příští konzument JSON chybu zopakuje.
- Doklad `dobihajici-obory.json` uvádí „29 klíčů = 23 unikátních dvojic"; můj nezávislý přepočet deduplikací dal 20. Na závěru nic nemění (hrubý join je 100% falešný v obou), ale skript má unikátní dvojice počítat a uvádět, ne jen klíče — jinak se číslo nedá z dokladu ověřit.
- v1.1 správně přesunula sweep letopočtů do D3; protože ale sweep zasahuje ~36 souborů napříč webem, má mít vlastní kontrolní seznam nebo grepový test v CI, jinak se u 101 textů snadno něco přehlédne.

## 4. Shrnutí postoje k v1.1

Kolo 2 potvrzuje, že vypořádání je většinou poctivé a u tří bodů (eta², mrtvý průvodce, definiční spor o dobíhající) lepší než kolo 1 — jejich proti-důkazy přepočet drží a já je přijímám. Zbývají tři body: „vyvrácení" čtvrtého dokumentu je omyl způsobený čtením staré verze sledování (N1, k doplnění do D4a), rozhodnutí o `min_body` je poddimenzované, protože se údaj renderuje na `/moje-sance` a v dalších konzumentech (N2, k rozšíření D1 kroku 3) a test ukazatele D3 má pokrýt smíšenou školu (N3). Po jejich vypořádání nemám proti schválení dávek D4a, D1, D2, D5 námitky; D3 zůstává podmíněno testem a D4b existencí mřížky.

---

# Kolo 1: oponentura v1.0 k návrhu v1.0 (archiv, 17. 9. 2026)

## 0. Metoda

Než bylo možné cokoli rozporovat, přepočítal jsem zdrojová čísla návrhu z `public/souhrny_kolo1.json`, `public/stav_datovych_sad.json`, `data/msmt_rejstrik/rssz-2026-06-30.jsonld` a ověřil tvrzení o kódu v `src/lib`, `src/components` a `scripts/`. Kde se přepočet s návrhem liší, uvádím obě čísla.

## 1. Co oponentura potvrzuje

- **Stav dat uchazečů 2026.** Registr drží `cermat-uchazeci-kolo1` na období 2025 (finální), čtečky skládají název souboru z období v registru (`src/lib/pasma-prijeti.ts:69`). Přepnutí je skutečně jeden příkaz registru — práce je v překážkách, jak návrh říká.
- **Dvojí implementace obtížnosti (past v D2).** `scripts/build-souhrny-kolo1.py:192` počítá `zarazeni_obtiznosti` bez prahu minimálního počtu soutěžících; `src/lib/obor-profil.ts:26,48` práh `MIN_SOUTEZICICH_PRO_ZARAZENI = 10` má. Web čte výhradně tu druhou cestu (`obor-profil-data.ts:157`, `skola-profil-data.ts:268`), pole z JSON nikdo nerenderuje; `percentilTlakuVeSkupine` (`souhrny-kolo1.ts:153`) nemá volajícího. Past je reálná.
- **Tabulka priorit ze staré cesty.** `StatsTab.tsx:55-64` kreslí priority z `extendedStats` (ročník 2025) a vedle ní stojí věta, že přijaté podle priority za 2026 web nezobrazuje — přesně jak popisuje oddíl 2.3.
- **Rozbitý `enrich_schools_data.py`.** Čte `row[37..39]` jako skóre a porovnává příznak přijetí s číslem `1` (`scripts/enrich_schools_data.py:126-152`). Shoduje se s návrhem.
- **Pokrytí a rozdělení přijatých podle priority.** Přepočet: `prijati_priority` je vyplněné u 3 091 z 3 091 nabídek 2026; při prahu 10 přijatých n = 2 630, Q1 0,651 / medián 0,793 / Q3 0,900; korelace s tlakem prvních voleb 0,418. Vše přesně podle návrhu.
- **Nezávislost údaje D3 jsem testoval i proti správnému srovnání.** Návrh dokládá nezávislost jen vůči „tlaku prvních voleb". Silnější podezření je, že podíl přijatých na 1. volbu je jen převyprávěná obtížnost přijetí (obor, co bere všechny, bere i nižší priority). Přepočet proti `podil_prijatych_ze_soutezicich`: korelace **−0,224** (n = 2 630). Údaj tedy není přebarvená obtížnost — tvrzení „nese vlastní informaci" oponentura **potvrzuje i proti baseline, který návrh nezměřil**.
- **Závislost na typu studia.** Mediány: GY8 0,89, GY4 0,86, LYC/SOŠ/SOU 0,75, nástavba 0,90.

## 2. Sporné body k vypořádání

### S1 — D3 si odporuje: zakazuje srovnání napříč typy, které samo demonstruje a plánuje zobrazit

Pravidla D3 zakazují „srovnání napříč typy studia". Ale dokladová tabulka v oddílu 2.3 staví vedle sebe 93 % (osmileté gymnázium) a 65 % (technické lyceum) — tedy přesně zakázané srovnání, a ještě vedle sloupce „Obtížnost přijetí", čímž porušuje i první pravidlo (nikdy vedle obtížnosti). Totéž hrozí plánovaným umístěním „u karty oboru na stránce školy": karty oborů jedné školy leží vedle sebe a škola typicky kombinuje typy (gymnázium + lyceum + obchodní akademie). Rozdíly mezi typy jsou přitom dominantní složkou variance (0,89 vs 0,75), takže srovnání na jedné stránce školy měří hlavně typ studia, ne školu.

**Vypořádání:** ukazatel zobrazovat jen na stránce oboru, izolovaně, bez sousedních oborů jiného typu; u karet oborů na stránce školy ho neuvádět. Dokladovou tabulku v oddílu 2.3 označit jako ilustraci mimo pravidla, ne jako vzor zobrazení.

### S2 — Rozdělení ve slovníku je počítané přes typy, které se nesmí srovnávat

Návrh zápisu do slovníku (oddíl 5) uvádí rozdělení 0,65 / 0,79 / 0,90 ze všech 2 630 nabídek. Slovník ukazatelů doložená čísla používá k výkladu hodnot („je to hodně, nebo málo?"). Pooled rozdělení přes typy je pro ten účel zavádějící: hodnota 0,80 je nad mediánem pro SOŠ (0,75) a pod mediánem pro gymnázium (0,86–0,89).

**Vypořádání:** do slovníku zapsat rozdělení po skupinách (typ studia), ne jedno společné; zároveň doplnit nástavbu (0,90), kterou návrh v popisu vynechal, přestože je vyšší než gymnázia — je to silný argument pro zákaz srovnání napříč typy a čtenáře slovníku překvapí.

### S3 — Test srozumitelnosti má předcházet zápis do slovníku, ne následovat po něm

Oddíl 7 říká: „test na třech lidech … když věta vyvolá otázku na pořadí přihlášky, ukazatel se nezobrazí". Dávka D3 ale ukazatel zavádí rovnou a test je jen dodatečná pojistka. Tím se riziko obrací: test se udělá, až když je hotovo, a jeho negativní výsledek bude stát proti investované práci. U ukazatele, jehož jediný důvod existence je nové čtení („složení třídy"), je srozumitelnost to jediné, co ho odlišuje od zamítnuté varianty ve vrstvách 1.4.

**Vypořádání:** pořadí v D3 obrátit: nejdřív test věty ve finální podobě bloku, pak zápis do slovníku, pak implementace. Návrh rozhodnutí v otevřené otázce 2 má znít „graf se ruší a ukazatel se zavede, pokud test potvrdí čtení ‚složení třídy'".

### S4 — Krok D1.2 není mechanická oprava — mění sémantiku `min_body` v průvodci a je v rozporu s vlastním zamítnutím bodových minim

Návrh rámce D1 krok 2 jako technickou opravu `enrich_schools_data.py`. Ve skutečnosti jde o tři provázané věci, které návrh nejmenuje:

1. **Katalog `min_body` záměrně mrazí.** `scripts/build-catalogue-2026.py:43-47` přenáší `min_body` do ročníku 2026 jako loňskou hodnotu a označuje ji `historicka_data_rok`. 2 664 z 3 239 záznamů 2026 ji nese. Opravený enrich tedy sám o sobě katalog neaktualizuje — D1 musí změnit i logiku `HISTORICKE`, jinak oprava nemá efekt.
2. **Průvodce rok minima neukazuje.** `PersonalizedResults.tsx:68-72` a `BodySimulator.tsx` porovnávají body dítěte s `min_body` a `historicka_data_rok` nikde v průvodci nikdo nečte (grep v `src/components/school/guided` prázdný). ~~Rodina se dnes dozví „máte výrazně více bodů než minimum" proti minimu z roku 2025 bez jediného slova o ročníku.~~ *(Staženo v kole 2: průvodce je mrtvý kód, věty nejsou v buildu.)*
3. **Rozpor s tabulkou 1.** Návrh zamítá oficiální nejnižší výsledek přijatých (sloupce 72–86) mimo jiné proto, že „body se mezi ročníky nesrovnávají, medián posunu +5,0 bodu je obtížnost testu". Krok D1.2 přitom obnovuje týž druh údaje (bodové minimum přijatého, jen počítané z dat uchazečů) do uživatelského porovnání v průvodci.

**Vypořádání:** D1 doplnit o rozhodnutí o `min_body` jako samostatný bod; zdůvodnit, proč bodové minimum z dat uchazečů ano a ze souhrnů ne; teprve pak opravit enrich a odemknout `HISTORICKE`.

### S5 — Tvrzení „rok nikde v kódu napevno není" je přehnané

Oddíl 2.1 tvrdí, že se přepnutím frontend překlopí sám, protože „rok nikde v kódu napevno není". Pro tři jmenované čtečky to platí, ale: `StatsTab.tsx:136` má v textu pro uživatele napevno „CERMAT za rok 2026 zveřejňuje", `StatsTab.tsx:54` výchozí `rokUdaju = 2025` a `src/lib/data.ts` drží starou cestu na několika místech přes `data['2025']` (řádky 897, 950, 1045, 1129, 1304). Část z toho D3 řeší, ale věta v 2.1 zakrývá, že sweep ročníků v textech UI je součást práce, ne nula.

**Vypořádání:** do D1/D3 přidat krok „projít texty UI s rokem napevno", nebo větu v 2.1 zúžit na jmenované čtečky.

### S6 — Čísla o dobíhajícím oboru k sjednocení; jádro věrohodné, ale nedoložené skriptem

Přepočet proti snímku 2026-06-30: dobíhajících záznamů SŠ měřím **754** (unikátních párů REDIZO+kód **680**), návrh uvádí **723**. Hrubý join REDIZO+KKOV proti 3 091 nabídkám mi dává **29** nabídek (20 unikátních párů), návrh **23**. Jádro tvrzení oponentura potvrzuje: názvy zásahů odpovídají popsanému vzorci (dobíhá jiná forma nebo délka téhož oboru — nástavba Podnikání, dálkové Hotelnictví apod.), takže nula po zjemnění o formu a délku je věrohodná. Ale bez doloženého joinu (skript + definice jednotky: záznam? unikátní pár? které kódy druhu školy?) se klíčová nula nedá při dalším čtvrtletním snímku přepočítat a rozpor 723/754/680 a 23/29/20 se nerozhodne.

**Vypořádání:** doložit join skriptem do `scripts/` a výstupem do `docs/podklady/`, s definicí jednotky a filtru; čísla v návrhu sjednotit s výstupem. Do té doby formulovat „změřeno na jednom snímku, metodika v příloze".

### S7 — D4 stojí na funkci, která neexistuje; oprava textů se má dotknout i dalších dokumentů

D4 navrhuje použití příznaku „v mřížce ‚Nabídka oborů v čase' na stránce školy, kterou navrhuje dokument grafů". Ta mřížka není implementovaná — D4 je tedy zobrazení v nepostavené funkci a jeho skutečný obsah je dnes jen oprava textů. Seznam oprav je přitom neúplný: na varování „škola obor zavírá" staví i sledování škol a oborů (oddíl 9 a otevřená otázka 5), které z dobíhajícího oboru dělá hlavní e-mailovou událost před termínem přihlášek. Měření „0 z 3 091 nabídek" tuto roli pro sledované obory vyvrací; pro e-mail zbývá slabší role „rozlišit doběhlý obor od nevypsaného ročníku". (Oponent přiznává, že tím padá i argument z oponentury k návrhu sledování, která dobíhající obor doporučovala povýšit na hlavní událost — měření má přednost před oběma dokumenty.)

**Vypořádání:** otevřená otázka 3: opravit **hned**, a to ve čtyřech dokumentech — soupis zdrojů, S5 stránky školy, sledování škol a oborů, případná mřížka v grafech. Implementační část D4 svázat s mřížkou a z dávky vyjmout.

## 3. Stanoviska k otevřeným otázkám návrhu (kolo 1)

1. **Přepnout na předběžný rok 2026?** Souhlas s návrhem: přepnout. Doklad 24 řádků ze 159 196 u roku 2025 je dostatečný a patička s verzí zdroje neúplnost pojmenuje. Podmínka: rok minima v průvodci se vyřeší ve stejné dávce.
2. **Rušit graf priorit?** Souhlas s rušením; zavedení náhradního ukazatele podmínit testem (S3) a umístěním mimo karty oborů (S1).
3. **Kdy opravit tvrzení o dobíhajícím oboru?** Hned, a ve čtyřech dokumentech (S7). Dokumenty dnes tvrdí změřený nepravdivý mechanismus.
4. **Pořadí D2 a D3?** **D2 před D3.** D2 odstraňuje dvě reálné chyby a povrchuje už schválené ukazatele; D3 přidává nový ukazatel s nevyřízeným rizikem mylného čtení a rozhodovací hodnotou doloženou jedním příkladem. U pasti z D2 doporučuji variantu **odstranit pole z JSON** — pozn.: v kole 2 nahrazeno přijetím třetí varianty návrhu v1.1.
5. **Absolventi:** uzavřít větou v „Odkud čísla jsou a co neříkají" a **krajovou míru za skupinu oborů zamítnout**, ne jen zvážit. Regionální statistika odpovídá na otázku o regionálním trhu práce, ne o škole; řada MPSV se nedoplňuje. Zamítnutí vlastního jmenovatele potvrzuji.
6. **Zápis do soupisu zdrojů:** hned, spolu s opravami z S7.

## 4. Drobnosti (kolo 1)

- Nástavba má medián podílu přijatých na 1. volbu 0,90 — vyšší než gymnázia. Do oddílu 2.3 a slovníku patří.
- Věta v `StatsTab.tsx:136` je po D3 mrtvá; smazat v téže dávce.
- Tabulka 1 tvrdí u rejstříkové kapacity „z 723 dobíhajících záznamů má kapacitu 0 jen 5" — počet k sjednocení s metodikou ze S6. *(V kole 2 potvrzeno pro definici C00+D00.)*
- Riziko „oprava enrich změní jpz_min_actual u mnoha oborů" je poddimenzované: velká změna je očekávaná.

## 5. Shrnutí postoje (kolo 1)

Návrh je ve zjištěních přesný — všechna jeho klíčová čísla, která jsem přepočítal, souhlasí, a jedno (nezávislost údaje D3) vychází po doměření správného srovnání líp, než návrh sám tvrdí. Spory nejsou o fakta, ale o rozhodnutí: umístění a test ukazatele D3 (S1–S3), skryté rozhodnutí o `min_body` v D1 (S4), doložení nuly u dobíhajícího oboru (S6) a zařazení oprav textů mimo dávky (S7). Přijmout D1 a D2 s úpravami výše; D3 podmínit testem a přesunout za D2; D4 redukovat na opravu dokumentů; D5 uzavřít větou bez nového zdroje.

## Historie

| Verze | Změna |
|---|---|
| 2.0 | Kolo 2 k návrhu v1.1: přepočtem potvrzeny jeho proti-důkazy (eta² = 0,0834; `min_body` ≠ `jpz_min_actual`, průvodce mrtvý; doklad dobíhajících reprodukovatelný; 13 přístupů letopočtů) a přijaty, včetně stažení formulace „zobrazovaná chyba webu". Tři zbývající body: „vyvrácení" čtvrtého dokumentu četlo sledování v1.0 místo živé v2.1 (N1), rozhodnutí o `min_body` přehlíží zobrazení na `/moje-sance` a dalších konzumentů (N2), test D3 má pokrýt smíšenou školu (N3). |
| 1.0 | První oponentura. Sedm sporných bodů S1–S7 k vypořádání, stanoviska k otevřeným otázkám 1–6, přepočty z `souhrny_kolo1.json` a rejstříku. |
