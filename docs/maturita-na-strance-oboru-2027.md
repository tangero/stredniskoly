# Maturita na stránce oboru

**Verze:** 1.0
**Datum:** 19. 9. 2026
**Stav:** návrh, rozhodnutí zadavatele z 19. 9. 2026 jsou v oddílu 4.

Zadavatel 19. 9. 2026: „Máme data o maturitě, která jsou na stránce školy, ale nejsou na stránce oboru. Proč to tak je, neměli bychom mít zkráceně informace i k oboru?“

Navazuje na [maturitní výsledky a kvalitu školy](maturitni-vysledky-a-kvalita-skoly-2027.md), který určuje, co se smí tvrdit, na [vrstvy stránky oboru](vrstvy-stranky-oboru-2027.md), kde je dnešní rozhodnutí maturitu odložit, a na [stránku školy](stranka-skoly-2027.md), oddíl 8.2, odkud se přebírá způsob, jak se o maturitě mluví.

## 1. Proč tam dosud nebyla

[Vrstvy stránky oboru](vrstvy-stranky-oboru-2027.md), řádek 135, vedou maturitu jako **odloženou**: „neimportováno; až po importu podle návrhu maturit, vždy ‚škola ve skupině oborů‘“. Podmínka se splnila **14. 9. 2026**, kdy import začal, ale stránka oboru se od té doby nepřepisovala. Není to tedy zamítnutí, je to rozhodnutí, kterému zastaral důvod.

Druhé rozhodnutí platí dál a tenhle návrh ho neruší: [vrstvy](vrstvy-stranky-oboru-2027.md), řádek 136, zavrhují **prázdnou kartu „maturitu zatím nemáme“** — na tisících stránek zabírá obrazovku a nic neříká.

## 2. Mapa `KKOV` → `SMO16` nechybí. Je to sloupec, který jsme zahazovali

Maturitní návrh vede v §3.6 mezi kandidátními zdroji k dohledání **mapu `KKOV` → `SMO16`** s poznámkou „bez ní obor na webu maturitu nezobrazí; musí vzniknout v datovém profilu“. To je **nepravdivé** a tenhle návrh to opravuje.

Zdrojový soubor `PZ{rok}_kolo1_skolobory_vysledky.xlsx` nese u **každé nabídky** sloupec **`SKUPINA OBORŮ (16)`** s kódy `GY8, GY6, GY4, LYC, ST1, ST2, SEK, SHP, SHU, SZE, SZD, SUM, UTE, UOS, NTE, NOS` (plus `KON`, `UBV`, `UVL` mimo náš filtr). Je to týž kód, jakým jsou klíčovaná maturitní data — [soupis zdrojů](zdroje-dat.md), oddíl 2.11, to říká výslovně: „Kódy `SMO16` jsou tytéž, jaké nese sloupec `SKUPINA OBORŮ (16)` v agregátech JPZ.“

`scripts/build-souhrny-kolo1.py` ze stejného řádku čte `TYP ŠKOLY`, ale `SKUPINA OBORŮ (16)` ne. Proto měl katalog jen sedm hodnot (`GY4, GY6, GY8, LYC, SOS, SOU, NAS`) místo šestnácti a napojení vypadalo nemožně.

**Žádná mapa se tedy nestaví. Přestane se zahazovat sloupec.** Ověřeno: po doplnění pole `smo16` do souhrnů se nezměnila **ani jedna** z ostatních hodnot u 3 216 nabídek a každá dostala skupinu (15 různých v ročníku 2026).

## 3. Kolik oborů maturitu dostane

Napojení přes `smo16` proti `public/maturita_skoly.json`, ročník 2026:

| Stav | Nabídek |
|---|---:|
| **Skupina sedí, obor maturitu dostane** | **2 782** |
| Škola tu skupinu nemá (typicky obor bez maturantů) | 240 |
| Škola v maturitních datech není | 69 |

Čísla se shodují se zkouškou napojení z 13. 9. 2026 zapsanou v [soupisu zdrojů](zdroje-dat.md), oddíl 2.11 (2 782 / 240 / 69). Jde tedy o potvrzení, ne o nový výpočet.

**Dvě čísla, která určují, jak se o výsledku mluví:**

- Z 2 782 nabídek je **1 590 jediným oborem školy ve své skupině**. U nich je agregát `redizo_smo16` fakticky výsledkem toho oboru, jak předpokládá maturitní návrh v §2.
- Zbylých **1 192** skupinu sdílí s dalšími obory téže školy; tam je to výsledek školy ve skupině oborů a nic víc.

**Velikost vzorku je slabina, kterou musí stránka přiznat.** Z 2 782 nabídek má údaj z češtiny označený jako úplný jen **1 426**; **1 222** je malý vzorek (10 až 29 maturantů), **119** jen počty a **15** nezveřejněno. U poloviny tedy poběží upozornění na malý ročník podle §7 maturitního návrhu.

## 4. Rozhodnutí zadavatele z 19. 9. 2026

| Otázka | Rozhodnutí |
|---|---|
| Rozsah na stránce oboru | **Karta se třemi čísly**: úspěšnost s jmenovatelem, čeština proti středu podobných škol, dvojice „podíl volby matematiky a výsledek“. Bez grafu a bez rozpadu po letech, s odkazem na oddíl „Jak si škola vede“ |
| Pojmenování | **Rozlišit oba případy.** U 1 590 nabídek, kde je obor jediným oborem školy ve skupině, mluvit o oboru. U 1 192 sdílených vždy „výsledek školy ve skupině oborů“ s uvedením, kterých oborů se to týká |
| Obory bez maturantů (240) | **Věta „obor zatím nemá maturanty“** s odkazem na výsledky školy |

Zavrženo při rozhodování: **plný blok jako na stránce školy** (stránka oboru už má tři velké oddíly, maturita by byla čtvrtý), **jedna souhrnná věta** (málo pro rozhodování rodiny) a **výsledek celé školy u oboru bez maturantů** — ten zavrhuje [stránka školy](stranka-skoly-2027.md), řádek 180: lyceum nesmí převzít výsledek gymnázia.

## 5. Co karta ukáže

```text
MATURITA · jaro 2026

Udělalo ji      55 z 56 přihlášených
Čeština         84,2 % bodů · střed podobných škol 78,1
Matematiku      volilo 41 %, 79,4 % bodů
→ Jak si škola vede
```

Pravidla, která platí i tady:

1. **Čísla popisují úroveň maturitního ročníku, ne kvalitu výuky.** Věta o tom stojí u karty, ne pod ní (maturitní návrh, §6).
2. **Percentil se nepoužívá k porovnání s podobnými školami**, to je průměrný podíl bodů; percentil patří ukazateli *Umístění maturantů v celé zemi* (slovník 1.27).
3. **Matematika jen ve dvojici** s podílem volby, nikdy percentil sám (§5.1, metrika 3).
4. **Úspěšnost z přihlášených**, se stejným jmenovatelem, ze kterého je spočítaná.
5. **Malý ročník se označí**; pod deseti konajícími se podíly nezveřejňují vůbec.
6. **Období z registru**, sada `cermat-maturita`; letopočet se nikam nepíše napevno.

## 6. Inventura zdrojů

Povinný krok podle [soupisu zdrojů](zdroje-dat.md). Prošel jsem oddíl 2 i oddíl 3.

**Nově se používá:** `SKUPINA OBORŮ (16)` ze souhrnů 1. kola (oddíl 2.1 ho vede jako používaný, ale web ho zahazoval). Soupis se tím upravuje ve stejné dávce.

Zvážené a nepoužité:

| Sloupec nebo zdroj | Co by dal | Proč ne |
|---|---|---|
| Cizí jazyky u maturity (5 bloků) | „jak se tu učí angličtina“ | zavrženo pro první verzi: malé skupiny a samovýběr (stránka školy, oddíl 10) |
| `ČISTÁ NEÚSPĚŠNOST (%)` | kolik jich u zkoušky propadlo | zamítnuto 19. 9. 2026 měřením: určená úspěšností a neúčastí, které na stránce jsou |
| `SMĚRODATNÁ ODCHYLKA % SKÓRU` | „táhne škola všechny, nebo jen špičku“ | jen k výpočtu zařazení, na stránce ne (návrh §5.1) |
| `NEÚČAST (%)` | kdo ke zkoušce nešel | na stránce **školy** v tabulce po letech; na kartě oboru by to byl čtvrtý údaj |
| Stav po podzimu (`jap`) | úplnější obraz ročníku | jiná populace, nesčítá se s jarem |
| Maturita před rokem 2021 | delší řada | zlom metodiky 2020/2021 |
| Školní agregát `redizo` (CELKEM) | číslo i pro obory bez maturantů | **zavrženo**, viz oddíl 4 |
| Odchylka od očekávaného výsledku | „kolik škola přidala“ | výzkumná vrstva, neprošla kritériem publikace (§5.3) |
| Uplatnění absolventů | co dělají po maturitě | zdroj na úrovni školy neexistuje (soupis, oddíl 3) |
| `hard_facts.maturita` z inspekce | text zprávy o maturitě | nesrovnatelný mezi školami; nahrazen daty |

## 7. Historie

| Verze | Změna |
|---|---|
| 1.0 | Nález, že mapa `KKOV` → `SMO16` nechybí — je to sloupec `SKUPINA OBORŮ (16)`, který generátor souhrnů zahazoval; §3.6 maturitního návrhu se tím opravuje. Změřeno pokrytí (2 782 z 3 091) i to, u kolika nabídek je skupina fakticky oborem (1 590). Tři rozhodnutí zadavatele: karta se třemi čísly, rozlišit obor od sdílené skupiny, u oboru bez maturantů to říct větou. |
