# Adresa stránky oboru

**Verze:** 1.0
**Datum:** 19. 9. 2026
**Stav:** návrh ke schválení. Tři rozhodnutí zadavatele z 19. 9. 2026 jsou v oddílu 4.

Zadavatel nahlásil, že tentýž obor má na webu tři různé podoby, a odhadl, že správná je jen jedna z nich. Odhad byl správný a příčina leží hlouběji, než v podobě stránky.

Návazné dokumenty: [vrstvy stránky oboru](vrstvy-stranky-oboru-2027.md) určuje, jak má stránka oboru vypadat; [ADR 0002](adr/0002-katalog-nezavisly-na-historickem-parovani.md) zavedl `/nabidka/2026/…`; [zdroje dat](zdroje-dat.md) a [registr](../public/stav_datovych_sad.json) určují ročník.

## 1. Kořen: adresu oboru skládají tři různá místa

| Kde | Co dělá | Z jakého ročníku |
|---|---|---|
| `src/lib/data.ts`, `getSchoolPageType` | **rozpoznává** příchozí adresu | **2026** (zobrazený ročník) |
| `src/app/api/schools/search/route.ts`, vlastní `getSchoolSlug` a `buildSlugContext` (ř. 56 a 87) | **skládá** odkazy pro vyhledávání a simulátor | **2025** |
| `scripts/generate-sitemap.js`, vlastní `createSlug` (ř. 37) | **skládá** sitemapu | **2025** |

Jsou to tři implementace téhož pravidla, z toho dvě ukotvené v loňském katalogu. Odtud pramení všechno, co je vidět navenek: stránky se starými daty, adresy v sitemapě, které už na obor nevedou, i to, že vyhledávání posílá jinam než odkazy na webu.

## 2. Co to dělá, měřeno

Nad ročníkem 2026 a 5 189 adresami `/skola/` ze sitemapy:

| Jev | Rozsah |
|---|---:|
| Stránek oboru celkem | 3 667 |
| **Padá do starší podoby** (`getProfilOboru` vrátí `null`) | **945 (25,8 %)** |
| — z toho **základní adresa oboru bez zaměření**: router vyrobí syntetické `program.id` bez přípony (`data.ts:268-282`), klíč nikdy nesedí na souhrn | 838 |
| — z toho nabídka v souhrnech 2026 opravdu není (dobíhající, bez jednotné zkoušky) | 107 |
| **Adres ze sitemapy, které už nevedou na obor** a vykreslí přehled školy | 402 |
| Odkazů vyhledávání na `/nabidka/2026/…` místo na stránku oboru | 1 004 z 3 091 |

**Starší podoba navíc píše ročník napevno.** Na produkci ověřeno u dvou škol: v nadpisu stojí „Data z přijímacího řízení 2025“, zatímco registr zobrazuje 2026. Čtvrtina stránek oboru tedy vydává loňská čísla, aniž to řekne — to je porušení pravidla, že období určuje registr.

**Rozhodovací místo je jediné:** `page.tsx:284` zavolá `getProfilOboru()` a při `null` se propadne do staršího `return` na ř. 380. Funkce má jediný `return null` (`obor-profil-data.ts:130`), a ten nastane, když `getSouhrnNabidky` nenajde nabídku pro zobrazený ročník (`souhrny-kolo1.ts:128`).

**Doložený příklad.** Gymnázium prof. Jana Patočky: adresa `…-jindrisska-gymnazium` padá do starší podoby, adresa `/nabidka/2026/85b68d83…` je **týž obor** v třetí podobě, a **správná stránka existuje** na `…-gymnazium-4lete-vzdelani-cesta-ke-svobode` — jenže ta v sitemapě není.

## 3. Základní adresa oboru se rozpadá na dvě velmi nerovné skupiny

Klíče `REDIZO + KKOV` v ročníku 2026:

| Situace | Klíčů | Co s adresou bez zaměření |
|---|---:|---|
| jediná nabídka bez zaměření | 1 880 | funguje už dnes, adresa je zároveň adresou nabídky |
| **jediná nabídka se zaměřením** | **814** | jde ji **jednoznačně** navázat na tu jedinou nabídku |
| víc nabídek pod jedním kódem | 212 | adresa je opravdu souhrn (140 klíčů má dvě nabídky, 55 tři, 17 čtyři a víc) |

Ze 838 strukturálních případů jich tedy **814 (97 %) řeší jediné pravidlo** a jen 212 potřebuje rozhodnutí.

## 4. Rozhodnutí zadavatele z 19. 9. 2026

| Otázka | Rozhodnutí | Poznámka |
|---|---|---|
| Souhrnná adresa oboru (212 klíčů) | **trvale přesměrovat na přehled školy** na kotvu s obory; **nedržet ji jako samostatnou stránku** | „Rozhodně není důvod duplikovat stránku.“ |
| Vyhledávání a `/nabidka/2026/…` | **posílat rovnou na stránku oboru** | „Není důvod, aby to tak nebylo.“ |
| `/skola/[slug]/detail` | **zrušit** | osiřelá: neodkazuje na ni nic ve zdrojích ani v sitemapě, drží ji jen dva testy |

**Upřesnění k prvnímu bodu.** „Nedržet adresu“ neznamená ji nechat vrátit 404: adresy jsou v sitemapě a vyhledávače je mají. Znamená to **přestat je vyrábět** (sitemapa, odkazy) a příchozí požadavek **trvale přesměrovat**. Stejný postup jako u sloučení průvodců.

## 5. Plán

| Krok | Co | Dopad |
|---|---|---|
| A | **Základní adresa se zaměřením** (814): router ji vyřeší na jedinou nabídku ročníku a **přesměruje** na její úplnou adresu, aby měl obor jednu kanonickou adresu | 814 stránek dostane správnou podobu |
| B | **Souhrnná adresa** (212): trvalé přesměrování na `/skola/<přehled>#obory` | konec duplicitní stránky |
| C | **Sitemapa z registru**, ne z roku 2025, a přes tutéž funkci, kterou adresy rozpoznává `data.ts` | zmizí 402 mrtvých adres, přibudou chybějící kanonické |
| D | **Vyhledávání** skládá odkaz toutéž funkcí; `/nabidka/2026/…` zůstane jen jako trvalé přesměrování na stránku oboru | 1 004 odkazů míří na plnou stránku |
| E | **Zrušit `/skola/[slug]/detail`** včetně dvou testů, které na ni míří | −1 mrtvá route |
| F | **Starší podoba**: u 107 nabídek bez souhrnu 2026 nesmí stát ročník napevno; buď se uvede, ze kterého roku čísla jsou, nebo se blok nezobrazí | konec tvrzení, které odporuje registru |

**Pořadí není libovolné.** A a B musí předcházet C a D, jinak by sitemapa a vyhledávání mířily na adresy, které se teprve začnou přesměrovávat.

**Společný základ.** Kroky C a D znamenají, že se adresa oboru bude skládat **na jednom místě**. Dokud existují tři implementace, každá oprava vydrží do příštího ročníku.

## 6. Inventura zdrojů

Povinný krok podle [soupisu zdrojů](zdroje-dat.md). Návrh **nezavádí žádný nový ukazatel ani nový sloupec**: pracuje jen s `REDIZO`, `KKOV`, `ZAMĚŘENÍ OBORU` a `DÉLKA STUDIA`, které soupis v oddílu 2.1 vede jako používané, a s obdobím z registru.

Zvážené a nepoužité: **`ID_SOF`** jako veřejná adresa (dnes ji nese `/nabidka/2026/<source_id>`) — zamítnuto, protože se **mezi koly i ročníky mění** (soupis, 2.1), takže by adresa oboru každý rok zanikla; adresa má stát na `REDIZO + KKOV + zaměření`, které přežije. **`dobihajiciObor`** z rejstříku — zamítnuto, platí jen u nabídky, která v ročníku chybí, a o adrese nic neříká. **Mapa nabídek** `offer_mapping_2026.json` se dál použije k dohledání souhrnu u přejmenovaných zaměření, ale **ne k sestavení adresy**: adresa musí vzniknout z letošního katalogu, jinak se vrací dnešní závislost na loňsku.

## 7. Co se tím nemění

- Podoba stránky oboru podle [vrstev](vrstvy-stranky-oboru-2027.md) zůstává; návrh řeší jen to, které adresy se k ní dostanou.
- Historické adresy nikdy nezmizí bez přesměrování.
- ADR 0002 platí dál v tom, co tvrdí: katalog 2026 nestojí na shodě s historií. Návrh z něj jen odebírá důsledek, že se kvůli tomu vyrábí druhá podoba stránky.

## 8. Historie

| Verze | Změna |
|---|---|
| 1.0 | Nález tří implementací adresy oboru, měření dopadu (945 stránek ve starší podobě, 402 mrtvých adres v sitemapě, 1 004 odkazů vyhledávání mimo stránku oboru) a tři rozhodnutí zadavatele: souhrnnou adresu přesměrovat a nedržet, vyhledávání posílat na stránku oboru, `/skola/[slug]/detail` zrušit. |
