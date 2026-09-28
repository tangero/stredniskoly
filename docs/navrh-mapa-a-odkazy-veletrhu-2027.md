# Mapa krajů a odkazy na města na přehledu veletrhů

Verze 0.3, 28. 9. 2026. Schváleno zadavatelem 28. 9. 2026 (§ 6) a implementováno. Navazuje na [veletrhy](veletrhy-skol-2027.md) § 5, kde byla mapa jako **hlavní ovládání** zamítnuta („na mobilu 14 krajů neklikatelně malých“) a jako **doplněk nad čipy** odložena na později. Tenhle návrh je to „později“.

## 1. Co řešíme

Rodič na `/veletrhy` hledá odpověď na otázku **„koná se něco blízko nás?“**. Dnes ji dostane přes 14 čipů seřazených abecedně. Funguje to, ale abeceda neodpovídá tomu, jak lidé o místě přemýšlejí: kdo bydlí na pomezí Pardubického a Královéhradeckého kraje, chce vidět oba vedle sebe, ne na dvou místech seznamu. Mapa tuhle otázku zodpoví jedním pohledem.

Druhá věc: karta akce jmenuje město, ale nikam nevede. Rodič, který našel veletrh v Pardubicích, se logicky ptá dál: **„a jaké školy tam jsou?“** Odpověď na webu existuje (`/mesto/pardubice`, `/regiony/pardubicky`), jen k ní z přehledu veletrhů nevede cesta.

## 2. Mapa krajů

### 2.1 Rozhodnutí

| Varianta | Rozhodnutí | Proč |
|---|---|---|
| Mapa jako doplněk, čipy zůstávají | **použít** | Mapa je rychlejší pro myš a prst, čipy zůstávají pro klávesnici, čtečku a všechny, kdo mapu číst nechtějí. Odpovídá odložené variantě z návrhu veletrhů. |
| Mapa místo čipů | zavrhnout | Důvod z verze návrhu veletrhů platí: Praha má 0,6 % plochy republiky, na mobilu by byla menší než prst. |
| Vlastní SVG bez knihovny a bez dlaždic | **použít** | Stejné pravidlo jako u schématu okolí na stránce školy: žádná knihovna, žádný cizí server, žádné sledování třetí stranou. Čtrnáct obrysů je statický obrázek. |
| Mapová knihovna s dlaždicemi (Leaflet, MapLibre) | zavrhnout | Desítky kB kódu a dlaždice z cizího serveru kvůli čtrnácti plochám; rozhodnutí o stránce školy (`stranka-skoly-2027.md`, tabulka rozhodnutí) platí i tady. |
| Barva kraje podle počtu akcí (kartogram) | **zavrhnout** | Ukazatel *počet akcí v kraji* říká, o kolika akcích **víme**, ne kolik se jich koná (slovník ukazatelů 6a). Sytá barva by vydávala mezeru v rešerši za skutečnost a Karlovarský kraj se třemi akcemi by vypadal jako kraj, kde se nic neděje. Všechny kraje proto mají stejnou výplň a počet je napsaný číslem. |
| Tečky měst s akcí | **odložit do fáze 2** | Odpověděly by na „blízko nás“ uvnitř kraje, ale potřebují souřadnice obcí. Viz § 2.6. |

### 2.2 Rozvržení

**Počítač (≥ 1024 px):** mapa vlevo, zhruba 60 % šířky bloku; vpravo seznam krajů s počty ve dvou sloupcích (v jednom sloupci bylo 15 čipů dvakrát vyšších než mapa). Seznam jsou dnešní čipy přeskládané do sloupce a zároveň legenda mapy: najetí na kraj v mapě zvýrazní jeho řádek a naopak.

```
Kde se veletrh koná
┌──────────────────────────────────────────┐  ┌──────────────────────┐
│                  ╭──╮                    │  │ ● Všechny kraje   78 │
│        ╭───╮  ╭──╯ 3╰─╮ ╭────╮           │  │   Jihočeský       11 │
│  ╭──╮ ╭╯ 6 ╰──╯       ╰─╯  5 ╰─╮         │  │   Jihomoravský     8 │
│  │3 ╰─╯   ╭──╮  9            3 ╰──╮      │  │   Karlovarský      3 │
│  ╰╮  3    │P1│          ╭──╮    10 ╰─╮   │  │   …                  │
│   ╰╮      ╰──╯      5   │  │  ╭────╮ 6│   │  │   Zlínský          5 │
│    ╰─╮    11     ╭─────╯  8 ╰──╯  5 ╭─╯   │  └──────────────────────┘
│      ╰───────────╯                  │     │
└──────────────────────────────────────────┘
```

**Tablet (640–1023 px):** mapa na celou šířku bloku, pod ní čipy v řádcích jako dnes.

**Mobil (< 640 px):** mapa na celou šířku, výška kolem 210 px (při šířce 343 px a poměru stran 1000 × 618), pod ní čipy. Mapa na mobilu zůstává, protože i tam je z ní poloha kraje poznat nejrychleji, a všechny kraje kromě Prahy jsou dost velké na prst (Karlovarský, nejmenší z nich, vychází při šířce mapy 343 px na zhruba 55 × 40 px; republika měří asi 490 km, tedy 0,7 px na kilometr). Praha má vlastní zásahovou plochu, viz § 2.4.

Blok nesmí na mobilu odsunout první akci pod ohyb o víc, než dnes zabírají čipy plus mapa. Pokud by to měření ukázalo jako problém, mapa na mobilu dostane výšku 150 px, nezmizí.

### 2.3 Stavy kraje

| Stav | Vzhled | Chování |
|---|---|---|
| výchozí | světle šedomodrá výplň (`#e8eef6`), bílé hranice 1,5 px, štítek s počtem | – |
| najetí / dotyk | výplň `#dbeafe`, tmavší obrys; bublina „Olomoucký kraj: 10 akcí s potvrzeným termínem“ | zvýrazní i řádek v seznamu |
| vybraný | plná modrá `#1d4ed8` (stejná jako aktivní čip), bílý štítek | seznam pod mapou ukáže jen tento kraj; opakovaný klik výběr zruší, stejně jako u čipu |
| bez akcí | nejsvětlejší výplň `#f5f7fa`, bez štítku; bublina „teď o žádné akci nevíme“ | **nejde vybrat**, protože kraj bez akcí nemá čip a klávesnice ani čtečka by ho vybrat nemohly (oponentura Codex, kolo 1). Výjimkou je právě vybraný kraj, kterému akce po půlnoci došly: ten čip drží a v mapě jde výběr zrušit |

Štítek s počtem stojí v „nejvzdálenějším bodě od hranice“ kraje (polylabel), spočteném předem při sestavení dat, aby u protáhlých krajů (Středočeský kolem Prahy, Vysočina) nepadl mimo plochu nebo na sousední kraj.

Bublina používá pojmy ze slovníku: počet nese svou množinu („s potvrzeným termínem“, slovník pojmů 1.23), jinak by mapa tvrdila, že se v kraji koná právě tolik akcí.

### 2.4 Praha

Praha je uvnitř Středočeského kraje a na mobilu by měřila asi 17 × 14 px, tedy méně než polovinu doporučené dotykové plochy. Proto:

- obrys Prahy se kreslí, aby mapa nelhala o geografii;
- nad ním leží **kruhová zásahová plocha o poloměru 65 jednotek**, tedy na mobilu přes 44 px průměru (doporučené minimum pro dotyk), přesahující do Středočeského kraje. Středočeský je tak velký, že mu to nevadí;
- štítek s počtem stojí přímo v Praze. Odkazová čárka z verze 0.1 nebyla potřeba: bod štítku Středočeského kraje leží mimo Prahu (asi 120 jednotek daleko) a štítky se nepřekrývají.

### 2.5 Přístupnost

Mapa a čipy jsou **tentýž ovládací prvek ve dvou podobách**. Kdyby obě byly v pořadí tabulátoru, klávesnice by prošla 30 zastávek, aby se dostala k první akci. Proto:

- SVG mapa má `aria-hidden="true"` a její kraje nejsou v pořadí tabulátoru; klikat na ně jde myší a dotykem;
- čipy (na počítači sloupec, jinde řádky) zůstávají `<button aria-pressed>` jako dnes a jsou jediný ovladač pro klávesnici a čtečku;
- výběr z mapy i z čipu mění tentýž stav (`kraj`) a tutéž kotvu v adrese (`#olomoucky`), takže se obě podoby nemohou rozejít.

Tohle rozhodnutí je potřeba výslovně vyzkoušet čtečkou: mapa nesmí nést informaci, kterou čipy nemají. Nenese, protože čipy mají název kraje i počet.

### 2.6 Fáze 2: tečky měst (odloženo)

Tečka za každé město s akcí by odpověděla na „blízko nás“ i uvnitř kraje. Souřadnice by šlo odvodit z `data/school_locations.json` jako medián poloh škol v obci; všech 71 měst s akcí má školu v katalogu, protože vazba akce na město je právě přes obec školy. Odloženo ze dvou důvodů:

1. `data/school_locations.json` **není zapsaný v soupisu zdrojů** (`docs/zdroje-dat.md`). Podle pravidel projektu se musí nejdřív zapsat sloupec po sloupci, včetně toho, odkud souřadnice pocházejí.
2. Tečka vypadá přesněji, než je: medián škol v obci není místo konání. Bublina by musela říkat „město“, ne „místo konání“.

O fázi 2 rozhodnout až po nasazení fáze 1.

## 3. Odkazy z karty akce na město a kraj

### 3.1 Město

Dnes karta nese nahoře drobným písmem město („PARDUBICE“). Návrh: **jméno města se stane odkazem na `/mesto/{slug}`**, ale jen tam, kde stránka města existuje.

| Situace | Počet (k 28. 9. 2026) | Co karta ukáže |
|---|---|---|
| město má stránku (je v seznamu `MESTA`) | 58 ze 71 měst s akcí | odkaz na `/mesto/{slug}` |
| město stránku nemá (méně než tři školy) | 13 měst: Vimperk, Prachatice, Český Krumlov, Kaplice, Ostrov, Čelákovice, Holešov, Stod, Přibyslav, Vyškov, Rychnov nad Kněžnou, Tachov, Blatná | prostý text bez odkazu |
| online akce (bez města) | 1 (online veletrh MSK) | beze změny |

Zvážené a zamítnuté náhrady pro 13 měst bez stránky:

- **odkaz na stránku kraje místo města**: čtenář klikne na „Vimperk“ a přistane na Jihočeském kraji, tedy jinde, než slibuje text odkazu;
- **rozšířit `MESTA` o města s veletrhem**: stránka města s jednou nebo dvěma školami by byla tenká, a práh tří škol byl v návrhu stránky města zvolen právě proto.

Vzhled: odkaz si zachová styl řádku (drobné šedé verzálky), jen s tečkovaným podtržením, které při najetí zmodrá. Plně modrý odkaz by přebil název akce, který je hlavní odkaz karty. Přístupný název odkazu doplní skrytý text: „Pardubice, střední školy ve městě“. Samotné „Pardubice“ by čtečka mohla vyložit jako odkaz na akci nebo na mapu.

### 3.2 Kraj

Kraj na kartě není, karty jsou seskupené do oddílů podle kraje. Odkaz na kraj proto patří do **nadpisu oddílu**:

```
Pardubický kraj  3 akce                         ← nadpis je odkaz na /regiony/pardubicky
Pardubice · Chrudim · Svitavy                   ← každé město je odkaz na /mesto/…, pokud stránku má
┌───┐ PARDUBICE ┄┄┄┄                             ← město na kartě: tečkovaný odkaz
│16.│ Schola Bohemia Pardubice
│ŘÍJ│ 16.–17. října 2026, 9:00–17:00 — ČEZ Arena
└───┘ Pořádá … · Stránka akce
```

- Nadpis „Pardubický kraj“ se stane odkazem na `/regiony/pardubicky`. **Dnešní samostatný odkaz „Střední školy v kraji“ vpravo odpadne**, protože by vedl na totéž místo o pár pixelů dál. Jeho skrytý text pro čtečky se přesune do nadpisu, aby čtrnáct odkazů zůstalo rozlišitelných: „Pardubický kraj, střední školy v kraji“.
- Řádek měst pod nadpisem („Pardubice · Chrudim · Svitavy“) se stane rejstříkem odkazů na stránky měst podle stejného pravidla jako karta. Je to přirozené místo, kde rodič odkazy na města čeká, a karta je nemusí nést jako jediná.

### 3.3 Cesta zpět

Odkaz z veletrhu na město by byl jednosměrný: stránka města ani kraje o veletrzích nemluvila. Zadavatel 28. 9. 2026 rozhodl zařadit cestu zpět do téže změny:

- **stránka města** ukazuje pod úvodem veletrh v obci, **nejvýš dvě nejbližší akce** podle data. Karta je `VeletrhUpoutavka` v nové variantě `mesto`: varianta `skola` by mluvila o „této škole“, kterou stránka města nemá, proto zní „Které školy na akci vystavují, doložené nemáme.“ Pravidla jsou stejná jako na stránce školy (jen potvrzený termín, bez termínů z agregátoru a přibližných, skrytí po skončení akce);
- **stránka kraje** nese v úvodu odkaz „Veletrhy středních škol v kraji“ na `/veletrhy#{slug}`. **Bez počtu akcí**, jinak než ve verzi 0.1: stránka kraje je statická a počet by po skončení akce lhal až do dalšího sestavení. Přehled veletrhů si počet počítá sám, i v prohlížeči po půlnoci. Test hlídá, že kotva stránky kraje sedí na oddíl přehledu u všech 14 krajů.

## 4. Data

### 4.1 Nový zdroj: hranice krajů

Hranice 14 krajů z **RÚIAN (ČÚZK)**, otevřená data, generalizované na úroveň vhodnou pro obrázek šířky 720 px (mapshaper, zjednodušení asi na 1–2 % bodů). Výsledek jako `src/data/mapa-kraju.json`: pro každý kraj kód NUTS (`CZ063`), cestu SVG a bod štítku. Odhad velikosti 15–30 kB, po kompresi méně. Sestavuje ho skript `scripts/build-mapa-kraju.mjs`, a výsledek se commituje, takže build ani web na zdroji nezávisí.

Licenci a povinnou atribuci ČÚZK ověřit při implementaci a uvést pod mapou, pokud ji podmínky vyžadují.

Před implementací zapsat do `docs/zdroje-dat.md` jako nový zdroj sloupec po sloupci (povinný krok). Předběžně:

| Sloupec vrstvy krajů | Použít | Proč |
|---|---|---|
| kód NUTS 3 | ano | klíč na `krajKod` veletrhů (`CZ0xx`), žádný převodník |
| název kraje | **ne** | názvy bere web z `src/lib/kraje.mjs` (`nadpisKraje`, `cipKraje`); druhý zdroj názvů by se rozešel |
| geometrie | ano | obrys kraje |
| kód kraje RÚIAN, VÚSC | ne | web s ním nepracuje |
| rozloha, případně počet obyvatel (jiné vrstvy) | **ne** | „akcí na 100 tisíc obyvatel“ by z počtu, který říká jen „o kolika víme“, udělalo míru; stejná chyba jako kartogram |

### 4.2 Nepoužité sloupce, které jsem zvážil

Podle pravidla o soupisu zdrojů (oddíl 3 a 2.15):

| Sloupec | Závěr |
|---|---|
| `misto` (adresa konání) jako přesný bod na mapě | **ne.** Chtělo by to geokódování cizí službou a adresy typu „regionální kulturní dům“ jsou nejednoznačné. Bod by tvrdil přesnost, kterou nemáme. |
| nepotvrzené termíny (`terminPotvrzen: false`, `cekaNa`, oddíl 3) jako „brzy“ tečky nebo šrafa kraje | **ne**, ze stejného důvodu jako v seznamu: u části jde o loňský termín. Mapa nesmí ukázat víc než seznam. |
| `online` | online akce se počítá do kraje pořadatele, stejně jako v čipech (slovník ukazatelů 6a). Na mapě nemá bod, jen se započte do štítku. |
| `poradatel` jako filtr mapy | ne, rodič nehledá podle pořadatele. |
| kdo na veletrhu vystavuje (oddíl 3) | v žádném zdroji není; mapa ani karta nesmí naznačit účast škol. |
| kontakty na pořadatele (oddíl 3) | na web nepatří. |
| `data/school_locations.json`, `lat`/`lon` | až ve fázi 2 (§ 2.6), po zápisu do soupisu zdrojů. `stop_name` a `distance_km` k otázce nepatří. |
| ostatní položky oddílu 3 (maturita, kritéria, agregáty 2. kola…) | k přehledu veletrhů se nevztahují. |

### 4.3 Ukazatele a pojmy

- **Žádný nový ukazatel.** Štítek na mapě je *počet akcí v kraji* (slovník ukazatelů 6a), počítaný stejnou funkcí jako čipy (`seskupPodleKraje`). Do 6a se jen připíše mapa jako další místo, kde se zobrazuje.
- **Žádný nový pojem.** Bublina používá „akce s potvrzeným termínem“ (slovník pojmů 1.23).

## 5. Implementace (odhad)

1. Skript `scripts/build-mapa-kraju.mjs`: stáhnout vrstvu krajů, generalizovat, spočítat body štítků, zapsat `src/data/mapa-kraju.json`. Zápis zdroje do `docs/zdroje-dat.md`.
2. Komponenta `src/app/veletrhy/MapaKraju.tsx` uvnitř `VeletrhySeznam` (sdílí stav `kraj`), SVG `aria-hidden`, zásahová plocha Prahy.
3. Přeskládání čipů do sloupce od 1024 px.
4. Karta: odkaz města podle `MESTA`; nadpis oddílu jako odkaz na kraj, řádek měst jako odkazy; odstranit samostatný odkaz „Střední školy v kraji“.
5. Testy:
   - mapa má právě 14 krajů a jejich kódy odpovídají `krajNames`;
   - štítky v mapě se shodují s počty na čipech;
   - mapa je `aria-hidden` a čipy zůstávají `button[aria-pressed]`;
   - zásahová plocha Prahy má průměr aspoň 44 px;
   - odkaz na město je jen u měst z `MESTA`, u 13 dalších měst a u online akce odkaz není;
   - nadpis oddílu vede na správný `/regiony/…` a samostatný odkaz na kraj zmizel.
6. Kontrola na mobilu (375 px) a čtečkou (VoiceOver).

## 6. Rozhodnutí zadavatele (28. 9. 2026)

1. **Mapa na mobilu** zůstává v plné výšce.
2. **Odkaz „Střední školy v kraji“** vedle nadpisu odpadá, odkazem je nadpis. V prázdném stavu vybraného kraje bez akcí zůstává, protože tam nadpis kraje není.
3. **Cesta zpět** se dělá hned: stránka města ukazuje nejvýš dvě nejbližší akce, stránka kraje odkaz na výpis akcí v kraji (§ 3.3).

## 7. Historie

| Verze | Změna |
|---|---|
| 0.3 | Oponentura Codex (28. 9. 2026): kraj bez akcí nejde v mapě vybrat, když ho nejde vybrat čipem; stránka města se revaliduje po hodině, jinak by proběhlá akce visela až do nasazení. |
| 0.2 | Schváleno a implementováno (28. 9. 2026): čipy od 1024 px ve dvou sloupcích, štítek Prahy bez odkazové čárky, poloměr zásahu Prahy 65 jednotek, cesta zpět ve stejné změně, odkaz ze stránky kraje bez počtu. |
| 0.1 | První návrh (28. 9. 2026): mapa krajů jako doplněk čipů, odkazy z karty na stránku města a z nadpisu oddílu na kraj. |
