# Code review PR #112 – Maturita na stránce oboru

- **PR:** [#112 Maturita na stránce oboru](https://github.com/tangero/stredniskoly/pull/112)
- **Větev:** `feat/maturita-na-oboru` (HEAD `91bde8e`), základ `main` (`7a97402`)
- **Rozsah:** 14 souborů, +397 / −9
- **Datum review:** 2026-09-19
- **Metoda:** dva paralelní průchody (datová pipeline, logika+UI+testy), nezávislé přepočty všech číselných tvrzení nad reálnými daty, ověřovací běhy.

## Verdikt

**Schválit po opravě jednoho vysokého nálezu** (falešné „Obor zatím nemá maturanty" u 31 nabídek, v přímém rozporu se stránkou školy) a ideálně tří středních (hranice vyjmenování, prázdná karta u `unavailable`, zdvojený popisek). Datová strana je v pořádku – všechna čísla z PR se podařilo nezávisle reprodukovat do posledního čísla.

## Ověření tvrzení z PR

| Tvrzení | Výsledek |
| --- | --- |
| Nezměnila se ani jedna z ostatních hodnot u 3 216 nabídek | potvrzeno programovým porovnáním – diff je čistě přidání klíče `smo16`, 0 rozdílů včetně `roky`/`meta` |
| Každá nabídka dostala skupinu, 15 různých | potvrzeno – 0 null, 15 platných SMO16 kódů (16. kód SUM má ve zdroji 0 řádků po filtru) |
| Napojení 2 782 / 240 / 69 | potvrzeno přepočtem proti `public/maturita_skoly.json` (včetně rozpadu zbytku: 69 = 63 škol mimo data + 6 bez ročníku 2026) |
| Rozpad 1 590 obor sám / 1 192 sdílená skupina | potvrzeno přesně |
| Kvalita češtiny: 1 426 úplný / 1 222 malý vzorek | potvrzeno přesně (+119 counts_only, 15 unavailable) |
| Klíčování názvů bez zaměření (fix Arabská) | potvrzeno v kódu (`school-key.ts:69-72`, popisek přidává zaměření v `obor-profil-data.ts:205-206`); v datech je 187 kombinací (redizo, kkov, smo16) s více zaměřeními, takže bez fixu by chyba skutečně vznikala |
| Testy 185 JS, `npm run kontroly` bez chyb | potvrzeno – 185/185 pass; kontroly 0 chyb (11 pre-existing varování, PR se netýkají); tsc čistý; eslint na změněných souborech čistý |

Velikost `souhrny_kolo1.json`: +45 kB (+1,14 %), čte se jen serverově s cache, do client bundle se nedostává.

## Nálezy

### Vysoká závažnost

1. **Falešné „Obor zatím nemá maturanty", když chybí záznam jen za zobrazený rok** – `src/lib/obor-maturita.ts:74-88`. `zaznam = skola.roky[obdobi]?.[smo16]`; když škola nemá ročník 2026 (nebo ve skupině v 2026 nematuroval nikdo), ale maturanty ve skupině měla dřív, karta tvrdí „obor zatím nemá maturanty". Ověřeno v datech na **31 nabídkách** – 6 u škol bez ročníku 2026 vůbec (např. `600005259` má jen 2023) a 25 u skupin chybějících jen v 2026 (např. `600005542_78-42-M/08`, LYC se záznamy 2023–2025). Stránka školy u téhož ukáže „poslední maturita 2025" s výsledky – přímý rozpor mezi dvěma stránkami jednoho webu.
   - *Náprava:* brát poslední rok **se záznamem** (stejně jako `shrnutiMaturity` přes `posledni` ve `skola-vyklad.ts:141`) a větu „nemá maturanty" vypustit jen když skupina nemá záznam v žádném roce; případně odlišit „v roce 2026 nematuroval".

### Střední závažnost

2. **Hranice vyjmenování nesedí s vlastní dokumentací** – `src/lib/skola-vyklad.ts:211-215`. Kód jmenuje jen 1–2 ostatní obory, od 3 už uvede počet; docstring o pět řádků výš i text PR říkají „do tří se vyjmenují, nad tři počet". Týká se **136 nabídek** s právě 3 dalšími obory. Test (`tests/obor-maturita.test.mjs:16-17`) sporné chování zamyká.
   - *Náprava:* přidat větev pro 3, nebo opravit komentář, doc a PR text.

3. **Prázdná karta přes záznam `unavailable`** – `src/components/obor/ProfilOboru.tsx:251-276` + `obor-maturita.ts:95-100`. **15 nabídek** má záznam, kde všechny tři předměty mají jen `{quality: "unavailable"}` bez jediného čísla → vykreslí se karta s prázdným `<dl>` (jen nadpis, obecná věta a odkaz). Design prázdnou kartu výslovně zavrhuje.
   - *Náprava:* detekovat stav „všechny předměty unavailable" → vrátit null nebo `bezMaturantu`.

4. **Zdvojený popisek „Obchodní akademie · Obchodní akademie"** – `src/lib/obor-profil-data.ts:204-207`. Když se zaměření shoduje s názvem oboru (**124 nabídek**, např. „Gymnázium · Gymnázium", „Veterinářství · Veterinářství"), věta o sdílené skupině vypadá jako chyba.
   - *Náprava:* `n.zamereni && n.zamereni.toLowerCase() !== nazev.toLowerCase() ? \`${nazev} · ${n.zamereni}\` : nazev`.

5. **Chybějící sloupec `SKUPINA OBORŮ (16)` = tichý null** – `scripts/build-souhrny-kolo1.py`. Sloupec se čte přes `r.get(...)` a není v `required` kontrole hlaviček (`scripts/import_cermat_results.py:56`), na rozdíl od `TYP ŠKOLY`. Přejmenování sloupce v budoucím ročníku → všechny nabídky tiše s null a maturitní karta zmizí bez chyby; TS strana null také tiše akceptuje.
   - *Náprava:* doplnit sloupec do required kontroly nebo assert „žádná nabídka nemá smo16 null" do generátoru.

### Nízká závažnost

6. **Malý vzorek se pozná jen z češtiny** – `ProfilOboru.tsx:248` (`cj?.quality === 'small_sample'`). **571 záznamů** má cj `complete`, ale ma `small_sample` – výsledek matematiky se ukáže bez upozornění, přitom je ze stejně malého ročníku. Zohlednit i `ma?.quality`.
7. **Rok z registru maturity, ne zobrazovaných souhrnů** – `obor-maturita.ts:77`: `oboryVeSkupineMaturity(redizo, smo16, rok)` dostává rok maturity. Až se ročníky rozjedou (souhrny 2027 vs. maturita 2026), členství ve skupině se počítá proti jinému ročníku; aktuální obor může z výběru vypadnout a `klice.length <= 1` chybně tvrdit „samotný". Předat `souhrn.rok`.
8. **`counts_only` se tiše skryje** – u <10 konajících řádek „Čeština" zmizí bez vysvětlení; stránka školy u téhož píše explicitně „výsledek nezveřejňujeme, maturantů bylo méně než 10" (`ProfilSkoly.tsx:398`). Karta může ukázat jediné číslo bez kontextu, kam zbylé zmizely.

### Nity

- „střed podobných škol 78,1" bez „%", stránka školy uvádí „: 78,1 %" – UI nekonzistence (odpovídá návrhu, ale stojí za sjednocení).
- **Testy jsou slabé vůči jádru PR:** `tests/obor-maturita.test.mjs` pokrývá jen čistou funkci `kohoSeTykaMaturita` (5 asercí). Netestuje se `getMaturitaOboru` (výběr roku, `bezMaturantu`, chybějící `smo16`), rendering malého vzorku ani mapování zaměření – tedy přesně vrstvy, kde jsou nálezy 1, 3 a 4.
- Dokumentace `docs/maturita-na-strance-oboru-2027.md` §2 v výčtu kódů mimo filtr (KON, UBV, UVL) nejmenuje **SUM** (216 řádků ve zdroji, 0 po filtru) – čtenář čeká 16 hodnot, katalog má 15.
- Komentář v `src/lib/skola-vyklad.ts:206` a test tvrdí „u 96 nabídek jich je ve skupině pět a víc" – nereprodukováno (u napojených 80, u všech 2026 je 93). Funkce netýká, číslo nesedí.
- `smo16` se bere jen z nejnovějšího ročníku nabídky – historická změna skupiny se nezachytí (zdokumentovaný záměr, pro účel OK).

## Co je udělané dobře

- Napojení přes `smo16` přímo ze zdroje místo budování mapy KKOV→SMO16 je čisté, dobře zdokumentované, včetně poctivé opravy mylné položky v maturitním návrhu (1.5).
- Všechna číselná tvrzení PR reprodukovatelná do posledního čísla; diff JSONu je čistě aditivní.
- Zpětná kompatibilita načítání (`smo16?`, fallback `?? null`), `smo16` se neopakuje v `roky`.
- Aktuální obor se v popisku skupiny neduplikuje; simulace popisků nad daty nenašla žádné dvě shodné; „sdílí s 1 dalším" bez vyjmenování nastat nemůže.
- Bezpečnost/a11y čisté: žádné `dangerouslySetInnerHTML`, sémantické `dl/dt/dd`, kotva `#vede` na stránce školy existuje, klientovi se neposílá nic navíc.
- Práh malého vzorku je konzistentní se stránkou školy (obojí čte `quality` z `build-maturita-skoly.py`).
- Česká copy bez zjevných chyb včetně „z/ze" před číslovkou.

## Doporučený postup

1. Opravit nález 1 (blokuje merge – 31 nabídek ukazuje nepravdu v rozporu se stránkou školy).
2. Ideálně ve stejném PR: nálezy 2–5 (každý je pár řádků; dohromady se týkají ~300 nabídek).
3. Rozšířit testy o `getMaturitaOboru` vrstvu (výběr roku, unavailable, zdvojený popisek).
4. Nízké/nity jako follow-up.

---

# Re-review po opravách (2026-09-19, opravný commit `da08d26`)

## Verdikt: LZE MERGOVAT

Všechny nálezy ověřeny jako opravené přímo v diffu `91bde8e..da08d26` (7 souborů, +119/−32) a na reálných datech. Znovuověření: `tsc --noEmit` čistý, **187/187 testů prochází** (+2 nové testy jádra). GitHub hlásí `MERGEABLE` – větev je na původním základu `7a97402`, ale konflikty s aktuálním mainem nejsou; jediný červený check je Vercel preview (známý problém infrastruktury z PR #111, ne kódu).

## Ověření jednotlivých oprav

| Nález | Stav | Důkaz |
| --- | --- | --- |
| 1. Falešné „nemá maturanty" | POTVRZENO | nová čistá funkce `rokMaturityOboru` (`skola-vyklad.ts:224-243`) bere poslední rok se záznamem, filtruje budoucí ročníky; flag `starsiNezObdobi` přidá do nadpisu „poslední ročník s maturanty". Ověřeno na reálných datech: `600005542`/LYC má záznamy jen 2023+2024 → karta ukáže „jaro 2024 · poslední ročník s maturanty, 34 ze 34, čeština 83,4 %" – přesně dle tvrzení autora (dřívější zmínka „záznamy 2023–2025" v prvním review byla nepřesná, 2025 záznam nemá) |
| 2. Hranice vyjmenování | POTVRZENO | `kohoSeTykaMaturita` teď vyjmenuje do 3 včetně, počet od 4; docstring opraven (96 → 80); testy zamykají obě větve |
| 3. Prázdná karta u unavailable | POTVRZENO | `rokMaturityOboru` vrací `nezverejneno`, karta pak místo prázdného `<dl>` řekne „Výsledky maturity {rok} tu nezveřejňujeme, protože maturantů bylo méně než deset." – srozumitelnější než zamlčet |
| 4. Zdvojený popisek | POTVRZENO | `obor-profil-data.ts:206` porovnává zaměření s názvem case-insensitively |
| 5. Pojistka sloupce | POTVRZENO | `build-souhrny-kolo1.py:299-306` raise ValueError při jakékoli nabídce bez `smo16`; autor ověřil, že při přejmenování sloupce spadne („3 059 nabídek nemá skupinu oborů") |
| 6. Malý vzorek jen z češtiny | POTVRZENO | `ProfilOboru.tsx:254` – `cj \|\| ma` |
| 7. Rok členství ve skupině | POTVRZENO | `getMaturitaOboru` dostává nový parametr `rokSouhrnu` a členství počítá proti němu |
| 8. counts_only beze slov | ČÁSTEČNĚ | plně nezveřejnitelný záznam teď větu má (nález 3); dílčí případ (počty jsou, řádek Čeština zmizí beze slov) zůstává – nízká |
| Nity (SUM, %, 96→80) | POTVRZENO | dokumentace i UI opraveny |

Testy jádra: `rokMaturityOboru` má vlastní testy včetně případu z vysokého nálezu a budoucího ročníku. Tím je pokrytá vrstva, kde nálezy vznikly.

## Rezidua (neblokují)

- `nezverejneno` se posuzuje podle nejnovějšího záznamu – když je 2026 nezveřejnitelný, ale 2025 měl čísla, karta řekne „nezveřejňujeme" místo starších čísel. Obhajitelné (informuje o posledním stavu), jen je to volba.
- Dílčí `counts_only` (některá čísla jsou, jiná chybí) zůstává bez vysvětlení na kartě; stránka školy ho vysvětluje.

## Stav zbylých caveatů autora

- **Základ větve 7a97402:** GitHub hlásí MERGEABLE, konflikty nejsou. Rebase není nutný; merge commit je bezpečný. (CI běží na head větve, ne na výsledku merge – při obousměrně zelených checkách a absenci konfliktů je riziko nízké; kdo chce jistotu, může před mergem větev sloučit s mainem.)
- **pglite v lokálním node_modules:** potvrzeno jako čistě lokální záležitost – v `package.json` i lockfile pglite je; po `npm install` v hlavním stromu `tests/portal-ucty.test.mjs` prochází. CI (běží z lockfile) ohroženo nebylo.
