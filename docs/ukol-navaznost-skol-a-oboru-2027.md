# Návaznost škol a oborů mezi roky — souhrnné zadání

**Verze:** 1.0 · **Datum:** 12. 9. 2026 · **Stav:** analýza a podklady připravené, realizace návazností a rešerše nezahájené.

Tento dokument je vstupním bodem k celému úkolu. Platná rozhodnutí uživatele jsou uvedena níže a v zadání rešerše verze 1.1. Starší počty a návrhy v historii dokumentů nejsou aktuálním zadáním.

## 1. Cíl a výsledek pro uživatele webu

Propojit historické a aktuální nabídky škol tak, aby pokračující nabídka neztratila historii kvůli změně textu, aby nové nabídky nepřebíraly cizí výsledky a aby bylo možné zaznamenat sloučení či rozdělení škol. Na profilech zobrazovat srozumitelnou historii názvů a adresních údajů. Pro dojezdovost rozlišovat sídlo od skutečného místa výuky konkrétního oboru.

Úkol podporuje aktualizaci katalogu a simulátoru pro přijímací řízení 2027. Samotná tato analýza však obsahuje jen první kolo JPZ 2025 a 2026. Není důkazem úplné nabídky pro rok 2027 ani dokončené aktualizace celého webu.

## 2. Schválená pravidla

1. **Samotnou změnu názvu školy nebo oboru pouze konstatovat.** Příčinu přejmenování není potřeba zkoumat. Uchovat původní text a ročník zdroje.
2. **Samotnou změnu adresního údaje pouze konstatovat.** Neodvozovat z ní stěhování výuky. Úprava PSČ není sama o sobě změnou budovy.
3. **Rozlišovat změnu, chybějící údaj a doplnění.** Doplnění či vymazání zaměření není automaticky přejmenování oboru. Dvě chybějící ulice nedokazují žádnou změnu.
4. **Zkoumat nejasnou návaznost, sloučení a rozdělení.** Evidovat vztahy 1:1, 1:N i N:1. Prosté změny textu nejsou samostatným důvodem rešerše.
5. **REDIZO, IZO a adresa mají rozdílné role.** REDIZO označuje právnickou osobu, IZO školu/zařízení, adresa sama neidentifikuje organizační kontinuitu. Budovu může současně používat více škol.
6. **Místa výuky vést samostatně od sídla.** Organizační sloučení může zachovat původní pracoviště; změna identifikátorů nedokazuje jejich změnu. Uchovávat více míst i časovou platnost.
7. **Návaznost a srovnatelnost statistik jsou dvě rozhodnutí.** Pokračování školy samo neopravňuje přenést historické výsledky na jiný obor. Nejasnou návaznost nevynucovat.
8. **Data popisují pozorování, nikoli vždy událost.** Změnu mezi dvěma snímky lze datovat do intervalu, nikoli automaticky ke konkrétnímu dni. Absence nabídky v jednom výřezu neprokazuje zánik.

Příklad opraveného chybného závěru: REDIZO `600170535`, Střední průmyslová škola, Tachov. V obou letech stejné IZO, název, obec a PSČ, ulice v obou chybí. Zápis `?===` znamená neúplnou adresu; žádná změna sledovaných údajů doložena není. Případ byl odstraněn z tabulky konkrétních změn.

## 3. Rozsah a platné počty

| Položka | Počet |
|---|---:|
| Nabídky v původním XLSX 2025 po filtru | 3 059 |
| Nabídky v původním XLSX 2026 po filtru | 3 091 |
| Spárované nabídky 1:1 | 2 873 dvojic |
| Nepřiřazené nabídky 2025 / 2026 | 186 / 218 |
| Nepřiřazené roční záznamy celkem | 404 |
| REDIZO dotčená nepřiřazenými nabídkami | 191 |
| Rešeršní úkoly priority 1 | 190 |
| Další úkoly priority 2 | 2 |
| Rešeršní fronta celkem | 192 úkolů / 193 REDIZO |
| Prostá pozorování mimo rešerši | 624 |
| Neúplné adresní údaje mimo rešerši | 16 |

Jeden úkol soustřeďuje otázky a kontext jedné organizace; u PORG spojuje dvě REDIZO. Skupiny školních a oborových otázek se překrývají, proto jejich počty nelze sčítat jako počet škol nebo událostí. Priority, rozklady a význam jednotek popisuje [zadání rešerše](zadani-dohledavani-navaznosti-2025-2026.md).

Původních **1 004** případů vzniklo srovnáním nabídky 2026 s historickým katalogem aplikace, který má jiné pokrytí než původní XLSX 2025. **404 není nové vyčíslení téže množiny**, ale součet nespárovaných řádků obou ročníků v nové metodě. Původní prohlížeč a jeho uživatelská rozhodnutí zůstávají samostatným podkladem.

## 4. Mapa kompletní dokumentace

| Soubor | Obsah |
|---|---|
| [Matice změn](matice-zmen-skol-a-oboru-2025-2026.md) | Metoda párování, 16 školních a 64 oborových kombinací, počty, interpretace a příklady |
| [Datová matice](podklady/matice-zmen-2025-2026.json) | Zdrojové atributy obou let, všechny dvojice, pravidla a nespárované položky |
| [Zadání rešerše](zadani-dohledavani-navaznosti-2025-2026.md) | Pravidla výzkumu, důkazy, formát výsledku, adresy, zobrazování a historie změn |
| [Fronta rešerše](podklady/fronta-dohledavani-2025-2026.json) | 192 úkolů; zvlášť `record_only` a `data_gaps` |
| [Adresní rozbor](adresni-parovani-skol-2025-2026.md) | Adresní kandidáti napříč REDIZO, souběh škol a vazba na původních 1 004 případů |
| [Adresní podklady](podklady/adresni-parovani/rozbor.json) | Konkrétní adresní vazby a zdrojové kontrolní součty |
| [Původní rozbor 1 004](podklady/migrace-katalogu-2027/rozbor-1004.json) | Historický výchozí soubor sporných nabídek |
| [Prohlížeč původního rozboru](prohlizec-rozboru-1004.html) | Ruční posouzení původní množiny; nová fronta do něj zatím není začleněna |
| [Návod prohlížeče](../tools/rozbor-prohlizec/README.md) | Generování, import a export rozhodnutí |
| [Generátor matice](../scripts/analyze-year-change-matrix.py) | Reprodukovatelné porovnání XLSX a generování dokumentu |
| [Generátor fronty](../scripts/prepare-continuity-research.py) | Seskupení otázek a oddělení prostých pozorování |
| [Manifest zdrojů](podklady/navaznost-zdroje-2025-2026.json) | URL a SHA-256 přesných vstupních XLSX |

## 5. Reprodukce

Z kořene repozitáře, Python 3.10 nebo novější. Generátory používají standardní knihovnu a místní parser `scripts/import_cermat_results.py`.

1. Stáhnout dva XLSX uvedené v manifestu do zvoleného adresáře a ověřit SHA-256. Během analýzy byly v `/tmp/gymnazium-rozvoj-2027`; tento dočasný adresář není trvalou součástí repozitáře. Data potřebná pro prohlížení analýzy jsou uchována v datové matici.
2. Spustit generování matice a následně fronty:

```sh
python3 scripts/analyze-year-change-matrix.py --input-dir /cesta/k/xlsx
python3 scripts/prepare-continuity-research.py
```

Generátor matice záměrně odmítne jinou verzi XLSX, protože slovní interpretace obsahuje příklady a počty konkrétního snímku. Pokud CERMAT soubor na stejné URL nahradí, není dovoleno kontrolu jen vypnout: aktualizovat analýzu, interpretaci a verzi společně. Dřívější binární vstupy nejsou součástí tohoto dokumentačního balíčku; pokud jejich přesná verze už nebude dostupná, úplné opakování importu vyžaduje získání těchto souborů.

Generátory přepisují své výstupy. Ruční výsledky rešerší ukládat odděleně do `docs/podklady/vysledky-navaznosti-2025-2026/<task-id>.json` (adresář vznikne s prvním nálezem). Ke každému výsledku připojit ID úkolu, verzi fronty a identifikaci vstupů. Indexy `old/new` v matici jsou od nuly a mají význam pouze vůči příslušnému vstupnímu souboru. Fronta nyní zachovává ID otázek předchozí verze, jejich stabilita při výměně ročníků není zaručená.

## 6. Navazující realizace

1. Zpracovat prioritní nejasné návaznosti podle zadání agenta; využít přiložená data a primární zdroje. Rešerše neznamená automatické schválení mapování.
2. Zapsat a přezkoumat návaznosti škol a oborů včetně vazeb 1:N/N:1. Evidovat zdroj, období a stav potvrzení. Organizační události neduplikovat jako nezávislé události pro každý obor.
3. Začlenit nová pozorování a výsledky do prohlížeče. Před změnou jeho datového otisku navrhnout migraci uložených rozhodnutí a ověřit export/import. Stávající ruční rozhodnutí zachovat.
4. Implementovat na profilech historické názvy a adresní údaje podle schválených formulací. Chybějící údaj nevykreslovat jako `None` ani jako změnu.
5. Doložit místa výuky pro dojezdovost; jde o širší datový úkol i mimo spornou frontu. Záznam bez ověřeného místa výuky neprezentovat jako přesný dojezd do školy.
6. Aktualizovat schválené návaznosti a veřejné stránky. Ověřit skutečné produkční stránky a navazující odkazy; lokální test či sestavení neprokazuje nasazení.

Tato dokumentační dodávka sama neprovádí žádný z těchto kroků v produkci.

## 7. Přejímací podmínky

- Každý z 192 úkolů má dohledatelný výsledek, nebo explicitně zaznamenané nezodpovězené otázky; nedohledaný případ se nemění na potvrzený odhadem.
- Potvrzené organizační vazby mají důkaz pro konkrétní subjekty a období. Zachycují i více předchůdců a nástupců.
- Prosté změny názvů/adres se evidují bez rešerše příčiny; prázdné údaje nezakládají falešné události.
- Historie názvů a adres neuvádí přesné datum, které zdroje neposkytují.
- Sídlo, místo výuky a organizační identita jsou oddělené. Více současných pracovišť se nesloučí do jedné adresy.
- Přiřazení historických výsledků má posouzenou srovnatelnost oboru; samotná shoda školy nestačí.
- Existující ruční rozhodnutí prohlížeče nejsou ztracena ani tiše přepsána.
- Po implementaci projdou konkrétní příklady: přejmenování, změna PSČ, neúplná adresa Tachov, více škol ve stejné budově, sloučení a rozdělení, více zaměření téhož KKOV.
- Nasazení je doložené ověřením veřejných profilů a simulátoru; zůstávající omezení pokrytí 2027 jsou uvedena.

## 8. Aktuální stav a historie

**Hotovo:** adresní rozbor; matice a reprodukovatelné skripty; zúžená fronta; zadání rešerše a formát výsledku; pravidla pro historické poznámky; oprava nesprávného zařazení Tachova. Ověřeny součty, jedinečnost a úplnost rozdělení ročníků, zachování 1 076 původních otázek mezi rešerší, prostou evidencí a mezerami v datech.

**Nehotovo:** vlastní rešerše (všechny úkoly `not_started`), schválená migrační mapa, začlenění nové fronty do prohlížeče, implementace poznámek na profilech, doplnění skutečných míst výuky, nasazení těchto změn. Tato dokumentace netvrdí, že data 2027 jsou úplná.

**Historie rozhodnutí:**

- Nejprve vytvořena matice možných rozdílů; interpretace jsou hypotézy, nikoli automatické verdikty.
- Původní široká rešeršní fronta měla 526 úkolů.
- Po upřesnění uživatele se samotné změny názvů a adres pouze evidují. Platná fronta má 192 úkolů; 624 pozorování a 16 datových mezer jsou oddělené.
- Tento souhrn ukládá kompletní zadání a propojuje již připravenou dokumentaci. Nové požadavky měnit verzovaně; zdrojové ročníky ani rozhodnutí nepřepisovat bez zachování historie.
