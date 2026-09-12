# Návaznost škol a oborů mezi roky — souhrnné zadání

**Verze:** 1.1 · **Datum:** 12. 9. 2026 · **Stav:** rešerše dokončena pro všech 192 úkolů fronty; zápis návazností do katalogu, profily a nasazení zůstávají neprovedené.

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

## 3a. Výsledek rešerše

Všech 192 úkolů fronty má vlastní soubor výsledku a všech 436 otázek fronty je pokryto právě jednou. Souvisejících otázek se často týká jediný nález, proto je nálezů méně než otázek.

| Stav nálezu | Počet |
|---|---:|
| potvrzeno | 210 |
| pravděpodobné | 42 |
| rozpor zdrojů | 3 |
| nedohledáno | 1 |
| **nálezů celkem** | **256** |

| Typ vztahu | Počet | | Doporučená akce | Počet |
|---|---:|---|---|---:|
| nová nabídka | 77 | | schválit mapování | 82 |
| pokračování | 66 | | jen zaevidovat | 126 |
| ukončená nabídka | 60 | | ruční přezkum | 48 |
| přejmenování | 26 | | | |
| sloučení | 16 | | | |
| rozdělení | 7 | | | |
| nejasné | 4 | | | |

Doporučená akce není schválením. `approve_mapping` znamená návrh k přijetí do migrační mapy, `record_only` pouhou evidenci beze změny statistik, `manual_review` případ, který vyžaduje rozhodnutí člověka. Zvlášť je vedeno 169 nálezů s alespoň jednou zaznamenanou otevřenou otázkou.

Srovnatelnost historických výsledků je posouzena samostatně od návaznosti: 59 nálezů srovnatelných, 44 částečně, 147 nesrovnatelných a 6 neurčených. Rešerše navrhuje 20 vazeb mezi úkoly, například mezi školami skupiny FOSTRA nebo mezi sloučeným učilištěm a jeho nástupcem.

Nejčastější průřezová vysvětlení: celostátní pokusné ověřování oboru 78-42-M/08 Lyceum vyhlášené MŠMT v listopadu 2024, úpravy krajské sítě víceletých gymnázií z podzimu 2025 a obory otevírané ve víceletém cyklu, typicky jednou za dva roky u zdravotnických škol.

Poslední jmenovaný jev má vlastní rozbor: [obory vypisované jednou za dva roky](dvoulety-cyklus-nabidky-oboru.md). Data 1. kola z roku 2024 dávají třetí bod v čase a odlišují vynechaný ročník od zániku či vzniku oboru. Test opravil pět nálezů, které označovaly za nový obor nabídku, do níž se v roce 2024 hlásily desítky uchazečů.

### Kontrola kvality

Dvě kontroly jsou reprodukovatelné z kořene repozitáře:

```sh
python3 scripts/check-continuity-results.py   # pokrytí otázek, povinná pole, číselníky, konvence
python3 scripts/check-continuity-sources.py   # dostupnost každého citovaného odkazu
python3 scripts/classify-open-questions.py    # co zbývá otevřené a čím to lze uzavřít
```

Ze 461 externích odkazů odpovědělo 443 kódem 200. Zbývajících 18 rozebírá [kontrola zdrojů](podklady/kontrola-zdroju-navaznosti-2025-2026.md); vymyšlený zdroj mezi nimi není. Jeden odkaz je doložitelně neexistující a je určen k opravě.

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
| [Výsledky rešerše](podklady/vysledky-navaznosti-2025-2026/) | Jeden soubor na úkol: nálezy, důkazy, adresy, kontrola rejstříku |
| [Prohlížeč výsledků](prohlizec-vysledku-navaznosti.html) | Offline kontrola nálezů vedle nabídek obou ročníků |
| [Rejstřík k frontě](podklady/rejstrik-k-fronte-2025-2026.json) | Strojový přehled ze čtyř snímků rejstříku MŠMT ke každému úkolu |
| [Snímky rejstříku](../data/msmt_rejstrik/README.md) | Zdroj, rozsah a použití datovaných snímků MŠMT |
| [Kontrola zdrojů](podklady/kontrola-zdroju-navaznosti-2025-2026.md) | Výsledek ověření dostupnosti citovaných odkazů |
| [Přehled konfliktů](prehled-konfliktu-navaznosti.md) | Co konflikty vyřešilo a jaké kategorie zbývají otevřené |
| [Otevřené otázky](podklady/otevrene-otazky-navaznosti.json) | Všech 227 otázek roztříděných podle cesty k uzavření |
| [Dvouletý cyklus](dvoulety-cyklus-nabidky-oboru.md) | Obory vypisované obden, test proti datům 1. kola 2024 |
| [Podklad cyklu](podklady/dvoulety-cyklus-2024-2026.json) | Stopa každé nepřiřazené nabídky v roce 2024 |

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

**Hotovo:** adresní rozbor; matice a reprodukovatelné skripty; zúžená fronta; zadání rešerše a formát výsledku; pravidla pro historické poznámky; oprava nesprávného zařazení Tachova. Ověřeny součty, jedinečnost a úplnost rozdělení ročníků, zachování 1 076 původních otázek mezi rešerší, prostou evidencí a mezerami v datech. Nově: stažené datované snímky rejstříku MŠMT a jejich dávkové propojení s frontou; rešerše všech 192 úkolů s uloženými nálezy; prohlížeč výsledků; strojová kontrola nálezů i dostupnosti citovaných zdrojů.

**Nehotovo:** schválená migrační mapa (rešerše je podklad k přezkoumání, ne schválení), začlenění nové fronty do původního prohlížeče rozboru 1 004 případů, implementace poznámek na profilech, doplnění skutečných míst výuky pro dojezdovost, nasazení těchto změn. Otevřené zůstává 48 nálezů s doporučením ruční přezkum a 4 případy bez doloženého závěru (3 rozpory zdrojů, 1 nedohledáno). Tato dokumentace netvrdí, že data 2027 jsou úplná.

**Historie rozhodnutí:**

- Nejprve vytvořena matice možných rozdílů; interpretace jsou hypotézy, nikoli automatické verdikty.
- Původní široká rešeršní fronta měla 526 úkolů.
- Po upřesnění uživatele se samotné změny názvů a adres pouze evidují. Platná fronta má 192 úkolů; 624 pozorování a 16 datových mezer jsou oddělené.
- Tento souhrn ukládá kompletní zadání a propojuje již připravenou dokumentaci. Nové požadavky měnit verzovaně; zdrojové ročníky ani rozhodnutí nepřepisovat bez zachování historie.
- Webová aplikace rejstříku MŠMT agentům nevrací obsah, proto se jako důkaz používají datované čtvrtletní snímky otevřených dat. Dokládají stav ke konkrétnímu dni, ale zápis se do nich promítá s odstupem; samotný zápis oboru navíc nedokazuje vyhlášení přijímacího řízení.
- Číselník `relationship.type` zůstává uzavřený. Obnovená nabídka se vede jako pokračování, nahrazení oboru jiným jako ukončená nabídka s nástupcem popsaným slovně; kontrola této konvence je součástí ověřovacího skriptu.
- Rešerše opravila vlastní dřívější nález: nabídky „Meda“ pod REDIZO 600005950 nejsou novou nabídkou, ale pokračováním nabídek zaniklého REDIZO 691017344.
- Část nepřiřazených nabídek vzniká tím, že škola obor vypisuje jednou za dva roky. Ze dvou ročníků to nelze odlišit od zániku či vzniku; jako třetí bod v čase proto slouží data 1. kola 2024. Jsou na úrovni uchazečů, takže přítomnost oboru je silný důkaz, ale jeho nepřítomnost slabý.
