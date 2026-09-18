# Předání práce, 18. 9. 2026

Stav po dni, ve kterém se na produkci dostala data o uchazečích za rok 2026, medián přijatých a úklid mrtvého kódu. Dokument je psaný tak, aby se podle něj dalo pokračovat bez čtení celé konverzace.

## 1. Kde to stojí

| Věc | Stav |
|---|---|
| `main` a `origin/main` | `cc59375`, nasazeno na www.prijimackynaskolu.cz |
| `feat/maturita-srozumitelne` | totéž, sloučeno do `main` rychlým posunutím |
| `feat/titulka-nabidka-oboru` | sloučeno (commit `200d66a`) |
| `docs/sledovani-skol-a-oboru` | **nesloučeno**, 2 commity před `main`, dokument v2.2, stabilní |
| `docs/novinky-k-prijimackam` | **nesloučeno**, 10 commitů před `main`, dokument v1.13 |
| `feat/novinky-odber` | **nesloučeno**, 5 commitů před `main`, implementace odběru novinek; drží ji vypnutý přepínač `NOVINKY_ZAPNUTO` |
| Slovník ukazatelů | 1.23 · Slovník pojmů 1.5 · Zdroje dat 1.9 |
| Registr sad | 19 sad, 0 chyb, 5 varování (všechna očekávaná) |
| Testy | `npm test` 79 OK; `npm run kontroly` prochází |

**Pozor na pracovní strom.** V `/Users/imac/Github/stredniskoly` pracuje víc session zároveň. Při psaní tohoto dokumentu tam ležely necommitnuté cizí změny v `docs/novinky-k-prijimackam-2027.md` a `docs/oponentura-novinky-k-prijimackam-2027.md`. **Nepřepínej větve** (`git checkout` sáhne do cizích souborů); rychlé posunutí jde udělat bez přepnutí: `git fetch . HEAD:main`.

## 2. Co se dnes dostalo na web

1. **Data o uchazečích přepnuta na rok 2026.** Byla to poslední ze třinácti webových sad, která držela starý ročník. Týká se pásem přijetí, výsledku uchazečů o obor a souběžných přihlášek. Ročník je **předběžný** (platné přihlášky k 13. 5. 2026), finální revize vyjde v květnu 2027; stránka to u obou bloků uvádí.
2. **Medián JPZ přijatých** jako nový ukazatel v `pasma_prijeti_{rok}.json`, zobrazený vedle průměru na stránce oboru.
3. **Průměrné percentilové umístění uchazečů** vedle umístění přijatých — odpovídá na to, zda si obor z uchazečů vybírá.
4. **Obtížnost přijetí má jednu definici**: počítá ji generátor, práh deseti soutěžících uplatňuje až zobrazení.
5. **Úklid**: −4 700 řádků nedosažitelného kódu; `SchoolDetailClient` (862 řádků, deset komponent) se zmenšil na `ProgramTabs.tsx` (116 řádků).
6. **Obecné CI** (`.github/workflows/testy.yml`) a hlídač letopočtů.

## 3. Co je otevřené

### 3.1 Tři padající P0 testy — nejvyšší priorita

`tests/p0-pages.integration.mjs`, 3 ze 14 testů padají proti běžícímu webu:

| Test | Očekává | Skutečnost |
|---|---|---|
| `/skola/…technicke-lyceum` | text „36,1 / 50 bodů" | na stránce není |
| `/api/skola/…/json` | `min_body: null` u všech oborů | vrací číslo |
| přehled školy | „Pro rok 2027 neověřeno" | u testované školy chybí |

**Jsou starší než práce z 17. a 18. 9.** Doloženo dvakrát: po vrácení registru na rok 2025 padaly stejně a po vrácení `src/` na stav před úklidem (`git checkout 3855b77 -- src/`) také. Nejsou tedy regresí z přepnutí dat ani z mazání.

Jsou to ale **pojistky proti zobrazení neověřené hranice přijetí**, tedy to nejcitlivější, co projekt hlídá, a druhý z nich věcně souvisí s `min_body` (oddíl 3.2). Do CI záměrně zapojené nejsou, aby nebylo trvale červené; zapojení je jednořádková změna v `.github/workflows/testy.yml`, jakmile projdou.

Spouští se proti běžícímu serveru: `npx next dev -p 3227`, pak `node --test tests/p0-pages.integration.mjs`.

### 3.2 `min_body` — rozhodnuto, ale ne dokončeno

Pole nemá doložený výpočet, jinou škálu než `jpz_min_actual` (10–168 proti 0–100), nepočítá ho žádný skript v repozitáři a pochází ze `school_analysis.json`, který registr vede s použitím `nezobrazovat`. Mrtvé konzumenty jsem smazal, ale **pole samo v datech zůstává** a katalog ho dál přenáší konstantou `HISTORICKE` v `scripts/build-catalogue-2026.py`.

Zbývá: zapsat ho do slovníku ukazatelů mezi ukazatele bez doloženého výpočtu, nebo doložit jeho výpočet. Souvisí s druhým padajícím P0 testem.

### 3.3 Dávka D3 — čeká na test s lidmi

Ukazatel *podíl přijatých na první volbu* je změřený a připravený (rozdělení po skupinách, stabilita 0,716, korelace s obtížností −0,224), ale **zavedení je podmíněné testem srozumitelnosti**, který musí udělat člověk. Podrobnosti v [návrhu](navrh-vyuziti-nepouzitych-dat-2027.md), dávka D3.

Test má dvě místa a **obě musí projít**: stránka oboru izolovaně (věta nesmí vyvolat otázku na pořadí přihlášky) a stránka školy s obory různých typů (čtení nesmí sklouznout ke srovnání „lyceum je horší než gymnázium").

### 3.4 Dávka D4b — čeká na mřížku

Dobíhající obor se má použít v mřížce „Nabídka oborů v čase", která není implementovaná. Do té doby není co dělat; opravy textů (D4a) hotové jsou.

### 3.5 Letopočty napevno

90 výskytů ve 33 souborech, zmrazených v `scripts/letopocty-zaklad.json`. Hlídač selže jen na novém výskytu. Základ slouží jako seznam k postupnému úklidu; část výskytů je tam správně (datum exportu InspIS, harmonogram MŠMT).

### 3.6 Tři nesloučené větve

`docs/sledovani-skol-a-oboru` (v2.2) je stabilní a dá se sloučit kdykoli.

`docs/novinky-k-prijimackam` (v1.13) a implementační `feat/novinky-odber` patří k odběru novinek. Všechny tři blokátory spuštění zadavatel odblokoval 17. a 18. 9.: právní kontrola zásad je schválená a stránka `/ochrana-osobnich-udaju` hotová, limity služeb neblokují (v N0 zbývá jen ověřit přes API, že měření otevření a kliknutí je na doméně vypnuté) a `feat/titulka-nabidka-oboru` je sloučená, takže registr zná sadu `msmt-harmonogram`.

**Jedna věc, která se týká i zbytku webu:** plošné e-maily novinek půjdou z hlavní domény `novinky@prijimackynaskolu.cz`, ne z odesílací subdomény. Sdílejí tedy reputaci i měsíční kvótu Resendu s odkazy portálu pro školy a s hlášením chyb. Návrh na to má pojistky; hlavní je umět plošné zprávy pozastavit snížením rozpočtu na nulu, aby přihlašovací e-maily škol běžely dál.

## 4. Pasti, na které jsem dnes narazil

Zapsané proto, aby se nemusely objevovat znovu.

1. **Soubor téhož jména má na různých větvích jiný obsah.** Prohlásil jsem námitku oponentury za nedoloženou, protože jsem četl `docs/sledovani-skol-2027.md` ve verzi 1.0 na aktuální větvi, zatímco živá byla v2.1 na `docs/sledovani-skol-a-oboru`. **Při ověřování tvrzení o dokumentu uveď větev, verzi a commit**, a nejdřív `git log --oneline --all -- <soubor>`.
2. **Registr sám nesl letopočet napevno.** `kontrola_obdobi.soubor` a `vystupy` měly `pasma_prijeti_2025.json`, takže `prepni` na první pokus selhal. Nově se píše zástupné `{obdobi}`, které dosazuje `dosad_obdobi()`.
3. **Test může selhat kvůli ostrým datům.** `zpracuj_maturitu` četl `public/maturita_skoly.json` napevno a pojistka porovnávala 15 syntetických škol s 1 112 reálnými. Pojistku navíc nekryl žádný test.
4. **Test psaný v pytestu se nespouštěl vůbec**, protože CI instaluje jen `openpyxl`. Zbytek projektu je unittest.
5. **Hrubý join na REDIZO + KKOV je u rejstříku nepoužitelný.** U dobíhajících oborů je chybovost 100 %; párovat se musí i forma a délka studia.
6. **Řetězec z registru se nesmí dosadit do české vazby, která žádá jiný pád.** Vzniklo z toho „Údaje jsou z předběžná…", živé na produkci deset minut. Typová kontrola ani testy to nezachytí; zachytilo to až přečtení nasazené stránky.
7. **Při sjednocování duplicitní logiky dolož, že se výsledek nezměnil.** U obtížnosti přijetí porovnání staré a nové cesty nad 6 150 záznamy dalo 0 neshod.
8. **Při přidání pole do generovaného souboru porovnej starý a nový obsah po klíčích** a ověř „nula změn mimo nové pole".

## 5. Doporučené pořadí

1. **Tři P0 testy** (3.1) — jediné, co na produkci svítí červeně, a týká se to nejcitlivějšího údaje na webu.
2. **`min_body` do slovníku** (3.2) — souvisí s druhým z nich.
3. **Sloučit `docs/sledovani-skol-a-oboru`** (3.6) — hotové, jen leží.
4. **Test srozumitelnosti pro D3** (3.3) — vyžaduje člověka, dá se naplánovat souběžně.
5. Úklid letopočtů podle základu (3.5), po částech.

Mimo tento seznam zůstávají dvě větší věci z návrhu: **dlouhá řada vstupní úrovně** ze školních agregátů JPZ 2017–2023 (jediný zdroj, ze kterého jde říct „škola je dlouhodobě žádaná") a **grafy** (P7 v [dokumentu grafů](grafy-skoly-a-oboru-2027.md), předpoklady P1–P6 jsou hotové).

## 6. Co se rozhodlo nedělat

Aby to nikdo nehledal podruhé:

- **Data o absolventech se nezobrazují.** Použitelný zdroj na úrovni školy neexistuje; jediný soubor s IZO (MPSV) nemá jmenovatel a MŠMT sám označuje počty absolventů jednotlivých škol za nevěrohodné. Podrobně v [návrhu](navrh-vyuziti-nepouzitych-dat-2027.md), oddíl 3.1.
- **Krajová míra nezaměstnanosti za skupinu oborů** zamítnuta: odpovídá na otázku o trhu práce v kraji, ne o škole.
- **Dobíhající obor jako varování před přihláškou** zamítnut měřením: týká se nuly z 3 091 nabídek.
- **Položková data JPZ** (390 MB) mají nejhorší poměr práce k užitku ze soupisu zdrojů.
- **Oficiální minimum a maximum přijatých** a per-předmětová minima z `jpz_stats`: každé určuje jediný uchazeč.

## Historie

| Verze | Změna |
|---|---|
| 1.0 | Předání po nasazení dat uchazečů 2026, mediánu přijatých a úklidu mrtvého kódu na produkci (`cc59375`). |
