# Nedenní formy studia: inventura zdrojů a návrh rozsahu

Verze 1.0 · 26. 11. 2026 · Etapa E0 projektu #593 (jen inventura a návrh, web se nemění).
Rozsah zobrazení jde ke schválení vlastníkovi; do schválení se nic neimplementuje (tělo #593, oddíl Rozsah).

Navazuje na [obory bez jednotné zkoušky a nedenní formy](navrh-obory-bez-jpz-2027.md) (#209, #244), který
v říjnu 2026 rozhodl nedenní formy plošně nepřidávat a ukázat jen nedenní nástavby. Tento dokument
čísla nepřepočítává od nuly: ověřuje je proti aktuálním souborům a doplňuje to, co pro rozhodnutí chybí.

## 1. Shrnutí

- **Data máme, nový zdroj shánět netřeba.** Forma studia je ve třech zdrojích, které projekt už zpracovává:
  souhrny CERMATu po nabídkách (`FORMA VZDĚLÁVÁNÍ`, 1. i 2. kolo), data uchazečů (`ss1_forma` až `ss5_forma`)
  a rejstřík škol (`formaVzdelavani`). Web je od září 2026 všude záměrně filtruje na denní studium.
- **Je to malá populace.** V 1. kole 2026 nabízelo nedenní studium **141 škol v 253 nabídkách** (dálková 153,
  kombinovaná 72, distanční 25, večerní 3), s 7 167 místy, 7 225 přihláškami (1,7 % všech přihlášek)
  a 3 577 přijatými. Ve 2. kole 128 nabídek v 82 školách.
- **Hlavní překážka je identita, ne data.** 184 z 253 nedenních nabídek má stejnou školu a stejný obor
  i v denní formě. Klíč katalogu a adresa stránky oboru (`REDIZO_KKOV`) formu nenesou, takže nedenní nabídku
  nejde přidat jako další stránku oboru bez nového klíče a nových adres.
- **Část už na webu je.** 72 nedenních nástaveb (L/51, L/52) se od #425 ukazuje jako „kam dál“ na stránce
  učebního oboru a v oddílu „Studium pro absolventy s výučním listem“ na stránce školy.
- **Doporučení: varianta A** (oddíl 6): na stránce školy ukázat všechny nedenní nabídky v jednom samostatném
  oddílu, se základními počty z CERMATu, bez stránek oborů, filtrů a pásem. Stihne se před podáváním
  přihlášek, nemění adresy a vyřeší hlášení #167.

## 2. Metoda

Prošel se `docs/zdroje-dat.md` celý, včetně oddílu 3 a pastí v oddílu 4, a návrh k #244 (oddíly 3, 5, 6, 8 a 10.6).
Počty v oddílu 3 jsou z veřejných souhrnů CERMATu stažených 26. 11. 2026 (ohlášeno v #593):

| Soubor | sha256 | Shoda s registrem |
|---|---|---|
| `PZ2026_kolo1_skolobory_vysledky.xlsx` | `a003441f…` | ano, `public/cermat_results_meta.json` |
| `PZ2026_kolo2_skolobory_vysledky.xlsx` | `c69aca68…` | ano, sada `cermat-kolo2-agregaty` |

Soubory se do repozitáře necommitují (oddíl 1 soupisu zdrojů, „Co v repozitáři není“). Data uchazečů 2026
se znovu nestahovala; jejich čísla jsou z návrhu k #244, oddíl 5. Pokrytí školy katalogem je měřené proti
`public/schools_data.json` (RED IZO).

## 3. Co zdroje o nedenních formách říkají

### 3.1 Souhrny CERMATu po nabídkách, 1. kolo 2026

| Údaj | Počet |
|---|---:|
| nabídek celkem / z toho nedenních | 6 368 / 253 |
| škol s nedenní nabídkou | 141 |
| z nich škol, které katalog webu vede (mají stránku školy) | 133 |
| škol, které mají jen nedenní nabídky | 9 |
| nedenních nabídek se stejným oborem téže školy i v denní formě | 184 |

| Rozpad nedenních nabídek | |
|---|---|
| forma | dálková 153, kombinovaná 72, distanční 25, večerní 3 |
| jednotná zkouška | povinná 146, bez ní 107 (forma × zkouška: dálková 93/60, kombinovaná 27/45, distanční 25/0, večerní 1/2) |
| kategorie oboru | M 87, L 72 (všechny nástavby L/5x, nezkrácené), H 52, P 32, K 9, J 1 |
| zkrácené studium | 45 ano, 208 ne |
| maturitní | 200 maturitních, 53 nematuritních |
| délka | 2 roky 18, 3 roky 104, 4 roky 65, 5 let 34, 6 let 32 |
| zřizovatel | soukromé 131, veřejné 118, církevní 4 |
| kraj | nejvíc Praha 47, Ústecký 43, Moravskoslezský 33; každý kraj aspoň 5 |
| nejčastější obory | Podnikání 64-41-L/51 (51), Hudba 82-44-P/01 (27), Předškolní a mimoškolní pedagogika 75-31-M/01 (20), Obchodní akademie 63-41-M/02 (13), Ekonomika a podnikání 63-41-M/01 (12), Gymnázium 79-41-K/41 (9) |

| Velikost | Počet nabídek |
|---|---:|
| aspoň 10 přijatých | 112 |
| méně než 10 přijatých | 141 |
| méně než 10 přihlášek | 82 |
| aspoň 10 přijatých s výsledkem jednotné zkoušky | 56 |
| aspoň jeden nepřijatý kvůli nedostatečné kapacitě | 34 |

Místa 7 167, přihlášky 7 225 (z toho na prvním místě přihlášky 4 725), přijatí 3 577. Všech 253 nabídek má
v `ROČNÍK` hodnotu 9, tedy CERMAT je vede jako přijímání po základní škole; o skutečném věku uchazečů to nic neříká.

### 3.2 Souhrny CERMATu, 2. kolo 2026

128 nedenních nabídek ve 82 školách (dálková 88, kombinovaná 30, distanční 9, večerní 1), 2 711 míst,
1 858 přihlášek, 997 přijatých; aspoň 10 přijatých má 32 nabídek. Nedenní forma se ve 2. kole hlásí poměrně víc
než denní: 6 % přihlášek 2. kola proti 1,7 % v 1. kole.

### 3.3 Data uchazečů 2026 (z návrhu k #244, oddíl 5)

Z 424 353 voleb je 4 983 dálkových, 1 747 kombinovaných, 416 distančních a 86 večerních. Aspoň jednu nedenní
volbu má 5 503 uchazečů (3,5 %). Sloupec `ss*_forma` volby rozliší, takže pásma, souběh a kontext přihlášek by šlo
pro nedenní nabídky spočítat stejným kódem; populace je ale malá (oddíl 3.1: 56 nabídek s aspoň 10 přijatými
s výsledkem zkoušky).

### 3.4 Rejstřík škol MŠMT

Snímek k 30. 6. 2026 vede u středních škol 566 dálkových, 79 večerních, 43 kombinovaných a 116 distančních
záznamů oborů (návrh k #244, oddíl 6). Rejstřík říká, co škola smí učit, ne co v daném roce vypsala, a forma
v něm se s CERMATem nemusí shodovat (škola z #167 vede v rejstříku dálkovou a distanční předškolní pedagogiku,
CERMAT 2026 nese kombinovanou). Zdrojem nabídky proto zůstává CERMAT.

### 3.5 Co web s nedenními formami dělá dnes

| Místo | Chování |
|---|---|
| katalog, souhrny 1. kola, 2. kolo, pásma, souběh, kontext, balíčky pro novináře | jen denní nezkrácené (`is_valid_flat` v `scripts/import_cermat_results.py`, `scripts/import_cermat_2026_real.py`, `scripts/build-druhe-kolo.py`, `scripts/slouceni_prihlasek.py`, `scripts/build-pro-novinare.py`) |
| stránka učebního oboru a stránka školy | 72 nedenních nástaveb jako „kam dál“ a oddíl „Studium pro absolventy s výučním listem“ (název, forma, délka, místa; bez odkazů a ukazatelů přijetí, #425) |
| balíček konzervatoří pro novináře | všechny formy, forma ve sloupci |
| starší ročníky katalogu 2024 a 2025 | nedenní záznamy se stejným id jako denní (soupis zdrojů, past 8); 22 nevypsaných nedenních nabídek 2026 má stránku (známý dluh) |

Zbývá tedy ukázat **181 nedenních nabídek** (253 bez 72 nástaveb): 87 M, 52 H, 32 konzervatoří P, 9 K a 1 J.

## 4. Zvážené nepoužité sloupce

| Sloupec | Závěr |
|---|---|
| `FORMA VZDĚLÁVÁNÍ` (souhrny) | **použít** jako zdroj nedenní nabídky; bez něj nejde nic |
| `DÉLKA STUDIA`, `ZKRÁCENÉ STUDIUM` | **použít** u nedenní nabídky vždy (délka se u nedenních forem liší od denní) |
| `POVINNOST JPZ`, výsledkové sloupce 45–86 | u varianty A ne: body a percentily by nabídly srovnání s denní formou, které neplatí (jiná populace) |
| `ss*_forma` (data uchazečů) | u varianty A ne; pásma a souběh pro nedenní formy až ve variantě C, a jen u nabídek s aspoň 10 přijatými |
| `formaVzdelavani` (rejstřík) | ne jako zdroj nabídky (oddíl 3.4); nanejvýš k větě „škola smí obor učit i v jiné formě“, ale ta bez nabídky rodině nepomůže |
| `dobihajiciObor` (rejstřík) | ne; u nedenních forem neodpovídá na žádnou otázku, kterou varianta A klade |
| `ZŘIZOVATEL` | už se zobrazuje u školy; u nedenních nabídek převažují soukromé školy (131 z 253), což se ukáže samo |
| DiPSy, karta nabídky | ne; forma je v kartě nabídky obsažena (cesta `skol-oboro-forma`), ale CERMAT ji nese úplně a karty 2027 zatím nejsou |

## 5. Rizika a co je potřeba rozhodnout

1. **Pro koho to je.** Cílová skupina webu jsou uchazeči z 9. třídy a rodiny; nedenní formy míří hlavně na
   dospělé a na ty, kdo chtějí studovat při práci (tělo #593). Míchat je do přehledů pro deváťáky by zkreslilo
   obtížnost i nabídku města. Proto návrh drží nedenní nabídky v samostatném oddílu.
2. **Identita a adresy.** 184 nedenních nabídek sdílí klíč `REDIZO_KKOV` s denní formou. Vlastní stránka oboru
   by potřebovala klíč s formou a nové adresy; to je větší zásah do katalogu, sitemap a odkazů (varianta B).
3. **Malé počty.** 141 z 253 nabídek má méně než 10 přijatých. Pravidlo soukromí (skupiny pod 10 uchazečů
   neukazujeme) se týká čísel o uchazečích; počty míst, přihlášek a přijatých za nabídku jsou souhrny
   CERMATu, které web ukazuje i u malých denních oborů. Ukazatele typu podíl nebo pásmo se u nich nezobrazí.
4. **Pojmy.** Slovník pojmů dnes formy studia nezná (jen „mimo přehled“). Varianta A potřebuje zapsat
   „dálková“, „kombinovaná“, „distanční“ a „večerní forma“ a jednu vysvětlující větu do `docs/slovnik-pojmu.md`.
5. **Ukazatele a registr.** Varianta A nezavádí nový ukazatel: místa, přihlášky a přijatí už ve slovníku
   ukazatelů jsou, jen pro jinou množinu nabídek. Zapsat se musí rozšíření rozsahu platnosti u těchto
   ukazatelů. Nová sada v registru nevzniká; mění se jen výstupy sad `cermat-vysledky` a `cermat-kolo2-agregaty`.
6. **Termín.** Cíl ke 2027-02-01 a zamrznutí od 2027-01-28 (Směr vývoje) nechávají na implementaci asi
   dva měsíce; varianta B a C se do té doby nevejdou bez rizika pro stránky, které rodiny v lednu čtou nejvíc.

## 6. Návrh rozsahu ke schválení

| | Varianta A (doporučená) | Varianta B | Varianta C |
|---|---|---|---|
| co návštěvník uvidí | na stránce školy oddíl „Studium při práci a pro dospělé“: obor, forma, délka, místa, přihlášky a přijatí v 1. kole, místa ve 2. kole | A + vlastní stránka nedenní nabídky a filtr formy v hledání škol | B + pásma přijetí a souběžné přihlášky u nabídek s aspoň 10 přijatými |
| nabídek | 181 (+72 nástaveb, které už jsou) | 253 | 253, pásma u nejvýš 56 |
| změna adres a katalogu | ne, samostatný výstup z generátoru oborů bez zkoušky (`build-obory-bez-jpz.py`) | nový klíč s formou, nové adresy, sitemap | jako B, navíc generátory z dat uchazečů |
| přehledy pro deváťáky (město, obtížnost, simulátor) | beze změny | beze změny | beze změny |
| odhad | 1 až 2 PR v limitu etapy | 4 až 6 PR | 6 a víc PR |
| stihne se do 2027-02-01 | ano | riskantní | ne |

Varianta A nesahá na přehledy pro deváťáky a obory na stránce školy zůstávají, jak jsou. Nástavby z #425 by se
přesunuly do nového oddílu, aby škola neměla dva oddíly s nedenním studiem.

Navrhované etapy varianty A:

- **E1:** generátor vydá nedenní nabídky 1. a 2. kola (forma, délka, místa, přihlášky, přijatí), test na počty
  z tohoto dokumentu; zápis do soupisu zdrojů, slovníku ukazatelů (rozsah platnosti) a slovníku pojmů.
- **E2:** oddíl na stránce školy, sloučení s oddílem nástaveb z #425, odkaz ze stránky denního oboru
  na nedenní formu téhož oboru u téže školy („obor nabízí škola i v dálkové formě“).

## 7. Otázky pro vlastníka

1. Schvaluješ variantu A s etapami E1 a E2, nebo chceš rovnou B?
2. Název oddílu: „Studium při práci a pro dospělé“, nebo jiný?
3. Má se u denního oboru ukázat odkaz na nedenní formu téhož oboru u téže školy (E2), nebo jen na stránce školy?

## 8. Historie

| Verze | Změna |
|---|---|
| 1.0 | Inventura zdrojů a návrh rozsahu (E0, #593). |
