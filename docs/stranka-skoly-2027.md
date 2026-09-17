# Stránka školy: struktura podle otázek rodiny

Verze 1.5 · 17. 9. 2026 · Návrh k rozhodnutí. Deník pěti kol, revize dat a rozložení v oddílu 7, výsledná struktura v oddílu 8, předpoklady realizace v oddílu 9. Pojmy v textech stránky podle [slovníku pojmů](slovnik-pojmu.md).

Navazuje na [vrstvy stránky oboru](vrstvy-stranky-oboru-2027.md), podle kterých vznikla stránka oboru ve třech otázkách, a na schválené [grafy stránky školy a oboru](grafy-skoly-a-oboru-2027.md). Maturitní část se řídí [maturitními výsledky a kvalitou školy](maturitni-vysledky-a-kvalita-skoly-2027.md). Názvy ukazatelů drží [slovník](slovnik-ukazatelu.md), období [registr](../public/stav_datovych_sad.json), zdroje [soupis zdrojů](zdroje-dat.md).

Vizuální podoba struktury s daty Machara: [prototyp](prototypy/stranka-skoly-2027.html), publikovaná kopie [v artefaktu](https://claude.ai/code/artifact/823d39be-d943-4790-9f10-d781b5bbb7d0).

Stránka školy odpovídá na pět otázek:

1. **Co lze na škole studovat?**
2. **Jaká škola je?**
3. **Kde je?**
4. **Jaké jsou jiné školy v okolí?**
5. **Jak dobrá škola je?**

Zkušební škola je Gymnázium J. S. Machara v Brandýse nad Labem, stejně jako u stránky oboru. Má tři obory ve třech různých stavech přijímání, maturitu ve dvou skupinách oborů, inspekci z roku 2025 a okolí na hraně Prahy.

## 1. Z čeho kola vycházejí

### 1.1 Stránka školy není součet stránek oborů

Stránka oboru řeší přijetí na jednu nabídku. Stránka školy řeší **výběr instituce**: rodina porovnává školy, ne řádky v tabulce CERMATu. Z toho plynou dvě pravidla převzatá ze [schválených grafů](grafy-skoly-a-oboru-2027.md):

- **Jednotkou přijímání zůstává nabídka.** Přihlášky, přijatí a obtížnost přijetí se ukazují u každého oboru zvlášť, nikdy jako součet za školu. Za školu se sčítá jen počet oborů a míst.
- **Škola jako celek** má vlastní údaje: maturitu, inspekci, profil, polohu a okolí. Ty na stránce oboru jsou jen ve zkratce.

### 1.2 Tři lidé, na kterých se každé kolo zkouší

| Kdo | Situace | Co potřebuje ze stránky školy |
|---|---|---|
| **Petra**, matka deváťáka, telefon | přišla z vyhledávání na jméno školy | jestli škola má obor, který dítě chce, a jestli se tam dá dostat |
| **Martin**, otec páťáka, počítač | zvažuje osmileté gymnázium | jestli škola za ten přetlak stojí a jaké jsou alternativy |
| **Jakub**, deváťák | porovnává školy v dojezdu | co je v okolí a jak daleko |

Mobil tvoří 65,4 % měřených návštěv ([analýza návštěvnosti](analyza-navstevnosti-2026.md)); každé kolo se hodnotí nejdřív na šířce telefonu.

### 1.3 Pokrytí dat ke školám

Ze 1 104 škol, které mají v 1. kole 2026 aspoň jednu nabídku s jednotnou zkouškou:

| Údaj | Škol | Otázka | Poznámka |
|---|---:|---|---|
| Souhrn 1. kola 2026 po nabídkách | 1 104 | 1 | 250 škol má jedinou nabídku, 684 nabídky ve více skupinách oborů |
| Maturitní výsledky, jaro 2026, `redizo_smo16` | 1 054 | 5 | **nestaženo v repozitáři**; ověřeno stažením 14. 9. 2026, soubor `MZ2026j_SC_skolobory.xlsx` se shoduje s otiskem `6a814e0a…` z auditu |
| Seznam inspekcí ČŠI | 1 083 | 5 | poslední inspekce mediánově před 2,5 roku, starší pěti let u 128 škol |
| Extrakce inspekční zprávy | 840 | 2, 5 | u 81 škol extrakce není z poslední inspekce |
| Profil InspIS | 954 | 2, 3 | zamrazený snímek 11. 2. 2026, zdroj zanikl; termíny dnů otevřených dveří zastaralé |
| Poloha a nejbližší zastávka | 1 070 | 3, 4 | geokódováno z adresy, `data/school_locations.json` |
| Souběžné přihlášky 2026 | nabídky s aspoň 10 uchazeči | 4 | na úrovni REDIZO a KKOV bez zaměření |
| Web školy z rejstříku | 1 085 | 2, 3 | |
| Zřizovatel | 1 070 | 2 | veřejné 776, soukromé 260, církevní 34 |
| Portál pro školy | 0 | 2, 3 | první údaje teprve přicházejí |

### 1.4 Zdroje prošlé podle soupisu

Podle povinného kroku v [soupisu zdrojů](zdroje-dat.md) jsem prošel oddíl 2 i oddíl 3. Zvážené a zatím nepoužité sloupce s rozhodnutím jsou v oddílu 10.

## 2. Kolo 1: pět otázek jako pět oddílů

**Návrh.** Pět oddílů v pořadí otázek, každý s odpovědí nahoře a důkazy pod ní, stejně jako na stránce oboru.

**Rozbor.**

- **„Kde je“ je krátká otázka.** Odpověď tvoří adresa, místo výuky, nejbližší zastávka a odkaz na mapu a dojezd. Vlastní oddíl by byl tři řádky na celou šířku. Adresa navíc patří do hlavičky, protože podle ní rodina školu pozná.
- **„Kde je“ a „jiné školy v okolí“ sdílejí mapu.** Obě odpovědi stojí na poloze školy. Jedno schéma okolí odpoví na obě a ušetří obrazovku.
- **„Co lze studovat“ je vstup do stránek oborů.** Tady se rodina rozhoduje, na který obor klikne. Každý obor proto potřebuje obtížnost přijetí slovy, jinak se musí proklikat všemi.

**Rozhodnutí.**

| Prvek | Rozhodnutí | Proč |
|---|---|---|
| Pět otázek jako rozcestník s krátkou odpovědí | **použít** | rodina vidí všech pět odpovědí na první obrazovce a skočí, kam potřebuje |
| Pět samostatných oddílů | **zavrhnout** | „Kde je“ je příliš krátká na oddíl |
| Oddíl „Kde je a co je v okolí“ | **použít** | společná poloha a jedno schéma; v rozcestníku zůstávají dvě odpovědi |
| Adresa a zřizovatel v hlavičce | **použít** | identita školy |
| Odpověď nahoře, důkazy pod ní | **použít** | stejná gramatika jako stránka oboru |

## 3. Kolo 2: pořadí oddílů a obory jako karta

**Návrh.** Oddíly v pořadí otázek zadání: obory, jaká škola je, kde je a okolí, jak dobrá škola je.

**Rozbor na Martinovi.** Martin přichází s otázkou, jestli škola za přetlak stojí. V pořadí zadání najde odpověď až na konci, pod popisem vybavení a mapou. Přitom právě „jak dobrá škola je“ je otázka, kvůli které stránku školy otevírá místo stránky oboru. Petra naopak potřebuje nejdřív obory.

**Rozbor obsahu oborů.** Dnešní přehled oborů ukazuje karty s počtem přihlášek. Stránka oboru mezitím získala obtížnost přijetí slovy, která je srovnatelná mezi obory. U Machara je rozdíl mezi obory školy větší než mezi školami:

| Obor | Místa 2026 | Obtížnost přijetí 2026 | 2025 |
|---|---:|---|---|
| Gymnázium, osmileté | 30 | velmi těžké, 30 ze 112 soutěžících uchazečů | těžké |
| Gymnázium, čtyřleté | 30 | dostala se většina, 30 ze 44 | středně těžké |
| Technické lyceum | 30 | místo pro všechny, přijato 23 | místo pro všechny |

Jediné slovo „velmi těžké“ za celou školu by lhalo dvěma oborům ze tří.

**Rozhodnutí.**

| Prvek | Rozhodnutí | Proč |
|---|---|---|
| Pořadí: obory → jak si škola vede → jaká škola je → kde je a okolí | **použít** | obory jsou vstup pro Petru, kvalita hned za nimi pro Martina, profil a okolí jako rozšíření |
| Pořadí přesně podle zadání | **zavrhnout** | otázka „jak dobrá“ by skončila pod mapou; rozcestník v hlavičce stejně ukazuje odpovědi na všech pět otázek, takže pořadí oddílů nikoho neodřízne |
| Obory jako řádky s obtížností přijetí slovy, podílem a předchozím rokem | **použít** | srovnání oborů jedné školy na jeden pohled |
| Pro koho obor je: „z 5. třídy“, „z 9. třídy“ | **použít** | osmileté a čtyřleté gymnázium mají stejný název, liší se ročníkem |
| Tlak prvních voleb u oboru | **použít jako druhý údaj** | říká, jak moc obor chtějí jako 1. volbu; obtížnost říká, jak to dopadlo |
| Obtížnost přijetí za celou školu | **zavrhnout** | nabídka je jednotka přijímání |
| Součet přihlášek a přihlášky na místo za školu | **zavrhnout** | sčítá různé konkurzy, P3 v grafech |
| Tlačítko „Uložit mezi zvažované“ u každého oboru | **použít** | ukládá se nabídka, ne škola (grafy, oddíl 4.3) |
| Nabídka oborů po letech (obor × rok) | **použít jako důkaz** | Technické lyceum je v datech přijímaček od roku 2025; souhrny 1. kola jsou za 2025 a 2026, katalog od 2024 |
| Upozornění na dobíhající obor z rejstříku | **použít, když nastane** | „škola tento obor dobíhá“ je varování před podáním přihlášky; u Machara žádný |

## 4. Kolo 3: „Jak dobrá škola je“ bez známky

Tohle je nejtěžší otázka stránky. Data neměří kvalitu výuky přímo a [maturitní návrh](maturitni-vysledky-a-kvalita-skoly-2027.md) zakazuje známku i žebříček. Zároveň platí zkušenost z revize stránky oboru: **rodina potřebuje jasné vyhodnocení**, ne sadu čísel bez závěru.

### 4.1 Co máme k dispozici

| Zdroj | Co říká o škole | Co neříká |
|---|---|---|
| Maturita, společná část | úroveň maturitního ročníku v češtině, matematice a cizím jazyce, proti školám stejné skupiny oborů | kvalitu výuky; do výsledku vstupuje, koho škola přijala |
| Inspekce ČŠI | jak škola učí podle inspektorů: přednosti, výtky, změna od minula | srovnání se školami; stáří zprávy |
| Umístění přijatých u přijímaček | s jakými výsledky sem přicházejí spolužáci | nic o studiu |
| Zájem uchazečů | jak moc školu chtějí | nic o kvalitě |

### 4.2 Maturita se musí číst přes víc let

Podle [maturitního návrhu, §5.2](maturitni-vysledky-a-kvalita-skoly-2027.md) se výsledek školy porovnává s mediánem škol stejné skupiny oborů a hodnotí proti nejistotě: interval průměrného skóru z češtiny ±1,96 směrodatné chyby celý nad mediánem skupiny znamená „nad skupinou“, celý pod ní „pod skupinou“, jinak „nerozlišitelné od skupiny“.

Ověřil jsem, jak je tohle zařazení stabilní mezi jarem 2025 a jarem 2026 (soubory `MZ2025j` a `MZ2026j`, 14. 9. 2026):

| Velikost maturitního ročníku | Škol ve skupině oborů | Stejné zařazení v obou letech | Přeskok z „nad“ na „pod“ nebo zpět |
|---|---:|---:|---:|
| 30 a víc | 928 | 63,1 % | 9 |
| 10 až 29 | 1 083 | 61,2 % | 20 |

Jednoletý stav se tedy u třetiny škol mění, ale téměř nikdy mezi krajními stavy. Ve čtyřech letech 2023 až 2026 má stejné zařazení aspoň třikrát 1 357 z 1 783 škol ve skupině oborů, které mají zařazení ve všech čtyřech letech. Čísla jsou spočítaná nad výstupem `scripts/build-maturita-skoly.py`, tedy s referencí ze škol s aspoň 10 konajícími.

**Závěr:** zařazení jednoho roku samo o sobě neobstojí. Odpověď se opírá o **počet let ze čtyř**, například „v češtině nad skupinou osmiletých gymnázií ve 3 ze 4 let“.

Machar podle výstupu `scripts/build-maturita-skoly.py` nad staženými soubory:

| Skupina oborů | Rok | Maturanti | Úspěšně | Čeština, percentil | Medián skupiny | Zařazení | Matematiku volilo | Matematika, percentil |
|---|---|---:|---:|---:|---:|---|---:|---:|
| osmileté gymnázium | 2023 | 27 | 100 % | 84,7 | 75,6 | nad | 52 % | 62,7 |
|  | 2024 | 30 | 100 % | 79,0 | 76,0 | nerozlišitelné | 37 % | 54,3 |
|  | 2025 | 30 | 96,8 % | 86,3 | 77,2 | nad | 42 % | 66,1 |
|  | 2026 | 31 | 100 % | 83,9 | 77,3 | nad | 48 % | 64,2 |
| čtyřleté gymnázium | 2023 | 31 | 93,8 % | 55,9 | 67,6 | pod | 25 % | nezveřejněno, 8 konajících |
|  | 2024 | 28 | 86,2 % | 62,0 | 68,3 | nerozlišitelné | 17 % | nezveřejněno, 5 konajících |
|  | 2025 | 30 | 100 % | 80,2 | 68,4 | nad | 40 % | 53,9 |
|  | 2026 | 29 | 100 % | 78,3 | 67,4 | nad | 52 % | 54,0 |

Technické lyceum v maturitních datech není: podle inspekční zprávy ho škola vyučuje od školního roku 2024/2025, v datech přijímaček je od roku 2025, a maturanty zatím nemá.

Dva jevy, které by jediné číslo schovalo: čtyřleté gymnázium se ze stavu „pod skupinou“ dostalo do „nad skupinou“, a u matematiky se mění podíl volby, takže samotný percentil z matematiky bez podílu volby nic neříká (návrh, §5.1).

### 4.3 Vstup vedle výstupu, ale ne jako rozdíl

Machar přijímá na osmileté gymnázium uchazeče s průměrným umístěním 92,4. percentilu, zatímco medián osmiletých gymnázií je 68,2. Vysoký maturitní výsledek je tedy z velké části dán tím, koho škola přijímá. Stránka to musí říct **vedle** maturity. Rozdíl „maturita minus přijímačky“ ale počítat nesmí: percentil jednotné zkoušky je umístění mezi uchazeči o střední školu, percentil maturity umístění mezi maturanty. Jsou to dvě různé populace. Odchylka od očekávání je výzkumná vrstva, která zatím neprošla kritériem publikace (návrh, §5.3).

### 4.4 Inspekce jako druhá polovina odpovědi

Inspekce je jediný zdroj o tom, **jak se učí**. U Machara z ledna 2025 chválí výsledky, zázemí a estetickou výuku, vytýká malou aktivizaci žáků, slabou diferenciaci a absenci v 7. ročníku. Změna od minulé inspekce z roku 2019 je v extrakci popsaná. Výtky jsou pro rodinu stejně důležité jako přednosti a patří na stránku se stejnou vahou.

### 4.5 Rozhodnutí

| Prvek | Rozhodnutí | Proč |
|---|---|---|
| Nadpis oddílu „Jak si škola vede“ | **použít** | otázka „jak dobrá škola je“ zůstává v rozcestníku; nadpis neslibuje známku, kterou data neunesou |
| Odpověď ve dvou větách: maturita a inspekce | **použít** | dva nezávislé zdroje, oba s rokem |
| Maturitní zařazení proti skupině oborů jako počet let ze čtyř | **použít** | jeden rok je nestabilní (63,1 %); u Machara by jediný rok 2026 schoval, že čtyřleté gymnázium bylo v roce 2023 pod skupinou |
| Percentil z češtiny, úspěšnost s počtem maturantů | **použít** | čeština je jediný test celého ročníku |
| Matematika jako dvojice „volilo X %, percentil Y“ | **použít** | percentil sám zkresluje |
| Pás skupiny: všechny školy skupiny jako tečky, škola zvýrazněná | **použít jako důkaz** | poloha bez seznamu škol (návrh, §6) |
| Pořadí školy ve skupině podle maturity („46. z 295“) | **zavrhnout** | skryté pořadí podle kvality; zakázáno |
| Známka nebo barevný semafor školy | **zavrhnout** | návrh, §1 |
| Rozdíl maturity a přijímaček | **zavrhnout** | různé populace, výzkumná vrstva |
| Umístění přijatých proti skupině vedle maturity | **použít s větou o výběru** | bez něj by maturita vypadala jako zásluha výuky |
| Přednosti a výtky z inspekce se stejnou vahou | **použít** | výtky jsou pro rodinu signál |
| Stáří inspekce a označení „shrnutí vytvořené automaticky ze zprávy“ | **použít** | 128 škol má inspekci starší pěti let; extrakce je strojová |
| Pod 10 maturanty jen počty, 10 až 29 s upozorněním | **použít** | návrh, §7 |
| Maturita za skupinu oborů u oboru, který v ní nemá absolventy | **zavrhnout** | lyceum nesmí převzít výsledek gymnázia |

## 5. Kolo 4: okolí podle uchazečů, ne podle kružítka

**Návrh.** „Jiné školy v okolí“ jako nejbližší školy podle vzdálenosti.

**Rozbor.** Vzdálenost je snadná, ale na otázku rodiny odpovídá špatně ze dvou důvodů.

**Hustota se liší o dva řády.** Pražská škola má mediánově 149 škol s jednotnou zkouškou do 10 km, škola mimo Prahu šest. Pevný poloměr dá v Praze nekonečný seznam a na venkově prázdný.

**Nejbližší škola není alternativa.** Pro každou školu jsem vzal tři školy, na které se uchazeči jejích oborů v 1. kole 2026 nejčastěji hlásili zároveň (souběžné přihlášky), a zjistil, kolikátá nejbližší škola to je:

| Ukazatel | Hodnota |
|---|---:|
| Dvojic škola a škola se souběhem | 3 120 |
| Mediánová vzdálenost vzdušnou čarou | 7,3 km |
| Podíl mezi deseti nejbližšími školami | 51,3 % |
| Mediánové pořadí podle vzdálenosti | 10. |

Polovinu skutečných alternativ by seznam nejbližších škol vůbec neukázal. U Machara:

| Škola, kam se hlásí zároveň | Souběžní uchazeči | Vzdušnou čarou | Kolikátá nejbližší |
|---|---:|---:|---:|
| Gymnázium J. A. Komenského, Čelákovice | 168 | 6,2 km | 3. |
| Gymnázium Františka Palackého, Neratovice | 72 | 13,7 km | 23. |
| Gymnázium, Chodovická, Praha | 52 | 9,0 km | 5. |
| Gymnázium, Českolipská, Praha | 42 | 13,7 km | 24. |
| Gymnázium, Litoměřická, Praha | 31 | 14,9 km | 28. |
| Gymnázium Bohumila Hrabala, Nymburk | 28 | 26,5 km | 186. |

Nejbližší škola, zemědělská škola 300 m daleko, sdílí s Macharem deset uchazečů čtyřletého gymnázia a jinak nic.

Počty souběžných uchazečů se u školy s více obory **nesčítají**: jeden uchazeč mohl mít na přihlášce čtyřleté gymnázium i lyceum. Stránka je proto uvádí po oborech této školy.

**Rozhodnutí.**

| Prvek | Rozhodnutí | Proč |
|---|---|---|
| „Kam se hlásí stejní uchazeči“ jako hlavní odpověď | **použít** | ukazuje skutečné alternativy; u Machara šest gymnázií, z nichž čtyři nejsou mezi 20 nejbližšími |
| Souběžní uchazeči po oborech této školy, s obtížností přijetí na alternativu a vzdáleností | **použít** | u osmiletého gymnázia je rodina porovnává s obtížností vlastního oboru |
| Nejbližší školy s podobnými obory (stejná skupina oborů) | **použít jako druhý seznam** | pro rodinu, která hledá v dojezdu, ne podle ostatních |
| Seznam škol v pevném poloměru | **zavrhnout** | 149 škol v Praze, šest mimo |
| Schéma okolí: škola uprostřed, okolní školy podle směru a vzdálenosti, souběžné zvýrazněné | **použít** | jeden obraz odpoví na „kde je“ i „co je v okolí“ bez mapových podkladů a sledování třetí stranou |
| Vložená mapa s dlaždicemi | **zavrhnout** | knihovna a dlaždice cizího serveru; odkaz na Mapy.cz stačí |
| Vzdálenost vzdušnou čarou s výslovným označením | **použít** | dojezdová doba se počítá v nástroji dojezdu, na stránce by byla drahá; odkaz „spočítat dojezd“ |
| Nejbližší zastávka a její vzdálenost | **použít v „Kde je“** | 1 070 škol; rodina řeší dojíždění |
| Pořadí okolních škol podle obtížnosti nebo maturity | **zavrhnout** | žebříček |

## 6. Kolo 5: jaká škola je, a co když data chybí

### 6.1 Jaká škola je

Profil InspIS a extrakce inspekce nabízejí desítky polí. Rodina z nich potřebuje odpovědět, **jestli se sem dítě hodí**. Třídím podle toho, co mění rozhodnutí:

| Údaj | Rozhodnutí | Proč |
|---|---|---|
| Komu škola sedne, kdo má být opatrný (extrakce inspekce) | **použít jako odpověď** | přímá odpověď; vždy s označením „podle inspekční zprávy z …, shrnutí vytvořené automaticky“ |
| Zřizovatel a školné | **použít** | soukromých škol je 260; chybějící školné není nula (soupis, 2.8) |
| Počet žáků a nejvyšší povolený počet | **použít** | velikost školy mění atmosféru; 901 škol |
| Podpora: specialisté (psycholog, výchovný poradce) a podpora z inspekční zprávy | **použít** | 908 škol; rodiny dětí s podpůrnými opatřeními to řeší první |
| Bezbariérový přístup | **použít** | u Machara „ne“; pro část rodin vylučující |
| Jazyky, odborné učebny, sport | **použít jako důkaz** | popis výuky |
| Akce, zájmové činnosti, mezinárodní spolupráce | **použít jako důkaz, sbalené** | dlouhé seznamy, rozhodují jen výjimečně |
| Absence po ročnících z inspekce | **použít u výtek, když ji inspekce uvádí** | u Machara 267 hodin v 7. ročníku |
| Údaje potvrzené školou (portál pro školy) | **použít s předností** | škola je zdroj pravdy o sobě; dnes nula škol |
| Dny otevřených dveří z InspIS | **zavrhnout** | u Machara 8. 12. 2021; zastaralé (soupis, 2.8) |
| Ředitel z rejstříku | **zavrhnout** | osobní údaj bez vypovídací hodnoty (soupis, 2.4) |

### 6.2 Jedna kostra, různé školy

| Situace | Škol | Co stránka udělá |
|---|---:|---|
| Jediný obor | 250 | oddíl oborů s jedním řádkem a odkazem na obor; dnes pro ně existuje zvláštní podoba „V2“, nová kostra ji nahradí |
| Obory ve více skupinách oborů | 684 | maturita po skupinách oborů, každá zvlášť |
| Bez maturity (například jen učební obory) | 50 | oddíl „Jak si škola vede“ jen s inspekcí a větou, že škola maturitní data nemá |
| Obor bez absolventů (nový obor) | u Machara lyceum | věta „obor zatím nemá maturanty“ místo výsledku |
| Bez extrakce inspekce | 264 | datum inspekce a odkaz na zprávu ČŠI, bez shrnutí |
| Bez polohy | 34 | adresa a odkaz na mapu; schéma okolí a nejbližší školy se nezobrazí, souběh ano |
| Pražská škola | | schéma okolí do 5 km, seznam souběhu beze změny |
| Bez souběhu (méně než 10 uchazečů u všech oborů) | | jen nejbližší podobné školy |

## 7. Revize po zpětné vazbě: data podle původu, potom rozložení

Zpětná vazba k verzi 1.0:

- Stránka musí obsahovat **data z portálu pro školy** (`/pro-skoly`) a musí být **jasně vidět, že je vyplnila škola**.
- Na stránce má být odkaz **„Editujte: pro vedení školy“** na `/pro-skoly`.
- **Banner Vibecoding** je povinná součást všech stránek a patří nahoru, protože propaguje služby, které platí provoz webu.
- Doplnit údaje, které stará stránka měla a verze 1.0 vynechala.

Postup revize: nejdřív definice dat, potom rozložení.

### 7.1 Každý údaj má původ a původ je vidět

Stránka kombinuje pět druhů údajů. Liší se tím, **kdo za údaj ručí**, a čtenář to musí poznat bez čtení patičky.

| Původ | Kdo ručí | Příklady | Značka na stránce |
|---|---|---|---|
| **Oficiální data** | CERMAT, MŠMT, ČŠI | obory, místa, přijatí, maturita, adresa, zřizovatel, seznam inspekcí | bez značky; zdrojový řádek s rokem u bloku |
| **Potvrdila škola** | škola v portálu, po moderaci | kritéria přijetí 2027, dny otevřených dveří, přípravné kurzy, školné, ubytování, podpora SVP, přestupy | „Potvrdila škola · 3. 11. 2026“ u každého údaje |
| **Text školy** | škola jako autor, neověřujeme | popis školy vlastními slovy | samostatný blok „Škola o sobě“ se značkou „text školy“ |
| **Strojové shrnutí** | náš model nad zprávou ČŠI | co inspekce chválí a vytýká, komu škola sedne | „shrnutí vytvořené automaticky ze zprávy ČŠI z …“ |
| **Starší údaj z InspIS** | škola kdysi, dnes nikdo | jazyky, učebny, specialisté, doprava, okolí školy | „starší údaj z InspIS, export 11. 2. 2026“ |

Rozlišení „potvrdila škola“ a „text školy“ přebírá [návrh portálu, §3.3](portal-pro-skoly-2027.md): fakta od školy se nemíchají s její prezentací, jinak čtenář nepozná, co je marketing.

### 7.2 Pravidla přednosti

Když stejnou věc říká víc zdrojů, rozhoduje pořadí. Pravidla patří do datové vrstvy, aby je stránka oboru, stránka školy i otevřená data použily stejně.

| Údaj | Pořadí zdrojů | Když chybí všechny |
|---|---|---|
| Kritéria přijetí 2027 | potvrdila škola (text a odkaz) → web školy z rejstříku jako místo, kde je hledat | „kritéria vyhlašuje škola na svém webu“ |
| Dny otevřených dveří | **jen** potvrdila škola | nic; InspIS se nezobrazí nikdy (u Machara 8. 12. 2021) |
| Přípravné kurzy | **jen** potvrdila škola | nic |
| Školné | potvrdila škola → starší údaj z InspIS se značkou → u veřejné školy „školné se neplatí“ | u soukromé a církevní školy „školné neuvedeno“, nikdy nula |
| Podpora žáků | potvrdila škola (podpora SVP) **a vedle** specialisté a podpora ze zprávy ČŠI | „údaje o podpoře nemáme“ |
| Ubytování | **jen** potvrdila škola | nic |
| Přestupy | **jen** potvrdila škola | nic |
| Popis školy | **jen** text školy | blok se nezobrazí |
| Obory, místa, přijatí, maturita, adresa | **jen** oficiální data; škola je v portálu potvrzuje nebo rozporuje, nepřepisuje (návrh portálu, §3.1) | stavy z oddílu 6.2 |

### 7.3 Údaje od školy patří k otázce, ne na konec

Verze 1.0 převzala dnešní blok „Údaje potvrzené školou“ jako jeden oddíl. Tím by skončily kritéria přijetí a dny otevřených dveří pod mapou okolí, přestože odpovídají na první otázku. Údaje od školy se proto rozdělí k otázkám:

| Pole portálu | Oddíl | Proč |
|---|---|---|
| `kriteria_vlastnimi_slovy`, `odkaz_kriteria` | Co tu lze studovat | kritéria rozhodují o přijetí na obory školy |
| `dny_otevrenych_dveri` | Co tu lze studovat a v rozcestníku | nejbližší krok, který rodina může udělat |
| `pripravne_kurzy` | Co tu lze studovat | příprava na přijímačky |
| `popis_skoly` | Jaká škola je, první blok | škola odpovídá sama za sebe |
| `skolne` | Jaká škola je | náklady |
| `podpora_svp`, `kontakt_vychovny_poradce`, `prestupy` | Jaká škola je | podpora a pravidla studia; kontakt na poradce u podpory žáků |
| `stravovani` | Kde je, vedle ubytování | provoz pro dojíždějící |
| `ubytovani`, `ubytovani_poznamka` | Kde je | dojíždění, nebo bydlení |

### 7.4 Jak je vidět, že údaje vyplnila škola

| Prvek | Rozhodnutí | Proč |
|---|---|---|
| Stav vyplnění v hlavičce: „Údaje od školy potvrzeny 3. 11. 2026“, nebo „Škola zatím nic nedoplnila“ | **použít** | rodina hned ví, zda čte jen data, nebo i školu; stav „nevyplnila“ je čestný (návrh portálu, §3.4) |
| Značka „Potvrdila škola · datum“ u každého údaje | **použít** | datum patří k údaji, protože škola potvrzuje po polích |
| Blok s údaji od školy ve vlastní barvě (tyrkysová) | **použít** | odlišení od modré značky webu a od šedých strojových a archivních údajů; zelená by vypadala jako hodnocení |
| „Škola o sobě“ jako citace s názvem školy a značkou „text školy“ | **použít** | prezentace je vidět jako řeč školy, ne jako fakt webu |
| Prázdné pole portálu jako přeškrtnutý nebo čárkovaný řádek u každého údaje | **zavrhnout** | dnes nevyplnila žádná škola; stránka by byla plná prázdných míst |
| Jedna prázdná karta za skupinu („Přijímací řízení 2027 od školy“) s vysvětlením a odkazem na editaci | **použít** | jedno místo, kde rodina pochopí, co chybí, a škola, co může doplnit |
| Údaj z InspIS vydávaný za údaj školy | **zavrhnout** | InspIS vyplňovala škola kdysi, nikdo ho neudržuje |

### 7.5 Odkaz „Editujte: pro vedení školy“

| Místo | Rozhodnutí | Proč |
|---|---|---|
| Hlavička, vedle stavu vyplnění | **použít** | vedení školy stránku najde podle názvu a první, co hledá, je „jak to opravit“ |
| Prázdné karty údajů od školy | **použít** | výzva přesně tam, kde údaj chybí |
| Patička s větou, co škola může doplnit a že je to zdarma | **použít** | shodné s obsahem `/pro-skoly` |
| Tlačítko stejné váhy jako „Web školy“ | **zavrhnout** | stránka slouží hlavně rodinám; editace je sekundární akce |

### 7.6 Banner Vibecoding

Komponenta `VibecordingPromo` si akci načítá sama a bez aktivní akce se nevykreslí. Umístění:

| Varianta | Rozhodnutí | Proč |
|---|---|---|
| Pod hlavičkou, mezi identitou školy a rozcestníkem | **použít** | na telefonu zůstane na první obrazovce; oddělený rámeček nerozbije rozcestník |
| Pod rozcestníkem | **zavrhnout** | na telefonu až na druhé obrazovce |
| Nad názvem školy | **zavrhnout** | rodina by nejdřív viděla reklamu a pak teprve, na jaké je stránce |
| Na stránce oboru | **doplněno** 14. 9. 2026 pod hlavičku; nová stránka oboru ho vynechala |

### 7.7 Údaje ze staré stránky

| Údaj | Rozhodnutí |
|---|---|
| Přihlášky a přijatí u oboru za 2026 | **doplnit** do řádku oboru |
| Průměrné body přijatých z češtiny a matematiky | **doplnit** do řádku oboru jako drobný údaj |
| Obory z roku 2025 bez jednoznačné shody s 2026 | **doplnit** pod seznam oborů, když existují |
| Štítky nového a přejmenovaného oboru | **doplnit** do řádku oboru |
| Shrnutí inspekce jedním odstavcem, otázky na den otevřených dveří, seznam inspekcí s odkazy, podstránka inspekce | **doplnit** do „Jak si škola vede“ |
| Profil InspIS: zaměření, CLIL, formy podpory, komunikace s rodiči, školní informační systém, evropské projekty, spolupráce s firmami | **doplnit** do „Jaká škola je“ se značkou „starší údaj z InspIS“ |
| Profil InspIS: umístění v obci, linka MHD, v blízkosti školy, místa pro volný čas | **doplnit** do „Kde je“ se stejnou značkou |
| Okres, kraj, drobečková navigace se „Školy“, otevřená data, datum stavu dat CERMAT | **doplnit** |
| Pořadí „#18 z 273“, meziroční změna bodů, „poptávka“ s emoji, archivní údaje InspIS o přijímačkách, pole, která zdroj nikdy nevyplnil | **vynechat**, důvody v oddílu 10 |
| Odkazy na podstránky „Zobrazit detail“ a „Je to pro mě?“ | **neřešeno**; podstránky nejdřív ověřit |

## 8. Výsledná struktura

```text
HLAVIČKA
  Domů / Školy / kraj / škola
  Název školy · typ podle oborů
  adresa · zřizovatel · okres a kraj
  Web školy · Porovnat v simulátoru · Sledovat školu (zvonek, rozbalí panel s e-mailem)
  ┌ stav údajů od školy ─────────────────────────────────────────────┐
  │ ✓ Údaje od školy potvrzeny 3. 11. 2026    Editujte: pro vedení školy│
  │   nebo: Škola zatím nic nedoplnila         Editujte: pro vedení školy│
  └──────────────────────────────────────────────────────────────────┘

BANNER VIBECODING (vlastní rámeček, jen při aktivní akci)

ROZCESTNÍK — pět otázek, jedna věta odpovědi
  Co tu lze studovat    3 obory …; den otevřených dveří 18. 11. 2026 [potvrdila škola]
  Jak dobrá škola je    …
  Jaká škola je         …
  Kde je                …
  Jiné školy v okolí    …

1  CO TU LZE STUDOVAT
   řádky oborů: obtížnost celou frází („Velmi těžké se dostat“), podíl, předchozí rok,
                přihlášky, přijatí, body přijatých, tlak, štítky nový/přejmenovaný, Uložit
   ┌ PŘIJÍMACÍ ŘÍZENÍ 2027 OD ŠKOLY (tyrkysový blok) ─────────────────┐
   │ kritéria vlastními slovy · odkaz na kritéria · dny otevřených dveří│
   │ · přípravné kurzy — každé „Potvrdila škola · datum“                │
   │ prázdné: vysvětlení + web školy + Editujte: pro vedení školy       │
   └────────────────────────────────────────────────────────────────────┘
   obory z roku 2025 bez shody (když jsou)
   důkaz: nabídka oborů po letech

2  JAK SI ŠKOLA VEDE
   odpověď · maturita po skupinách oborů · inspekce: shrnutí, chválí, pozor,
   změna od minula, otázky na den otevřených dveří, seznam inspekcí s odkazy

3  JAKÁ ŠKOLA JE
   ŠKOLA O SOBĚ (citace, text školy) — jen když je vyplněno
   komu škola sedne / kdo má být opatrný [shrnutí ze zprávy ČŠI]
   fakta: velikost · zřizovatel a školné [přednost: škola] · podpora [škola + ČŠI]
          · bezbariérovost · přestupy [škola]
   důkaz: výuka · mimo výuku · komunikace s rodiči [starší údaj z InspIS]

4  KDE JE A CO JE V OKOLÍ
   kde je: adresa, zastávka, doprava, umístění v obci, v blízkosti školy,
           ubytování [potvrdila škola]
   schéma okolí · kam se hlásí stejní uchazeči · nejbližší gymnázia a lycea

PATIČKA
  značky původu vysvětlené na jednom místě · otevřená data
  „Jste z vedení školy? Doplňte kritéria, dny otevřených dveří a popis školy, zdarma.“
  Editujte: pro vedení školy
```

### 8.1 Vizuální principy

- **Stejná identita jako stránka oboru:** písmo Cabin, modrá `#0074e4` pro akce a data webu, tmavě modrá `#16325c` pro nadpisy, podklad `#f4f7fb`.
- **Barva nese původ, ne hodnocení.** Tyrkysová `#0b7a65` na `#e6f5f1` patří jen údajům od školy; šedé značky strojovým a archivním údajům; data CERMATu a ČŠI jsou bez podbarvení.
- **Jeden výrazný prvek:** schéma okolí. Ostatní bloky jsou klidné karty s odpovědí nahoře.
- **Značka původu je vždy text**, ne jen barva: „Potvrdila škola“, „text školy“, „starší údaj z InspIS“.

### 8.2 Revize maturity po nasazení (14. 9. 2026)

Zpětná vazba na Gymnáziu Nad Štolou: oddíl nebyl jasný. Tři téměř stejné věty „maturanti byli v češtině nad školami stejné skupiny oborů …“, pojmy „percentil“ a „skupina oborů“, tři věty o přijímačkách a hlavně žádná odpověď na otázku, jak tu maturita dopadá.

Při rozboru se našla i věcná chyba: úspěšnost je podíl úspěšných z **přihlášených**, ale vedle ní stálo „55 z 55“ z **konajících**; nahoře „98,2 %“ a vedle „55 z 55“.

| Prvek | Rozhodnutí | Proč |
|---|---|---|
| Jedna souhrnná věta za školu: „Maturitu v roce 2026 udělalo 146 ze 148 přihlášených maturantů. V češtině byli maturanti všech oborů téměř každý rok nad středem podobných škol.“ | **použít** | odpověď místo výčtu; souhrn frekvence (každý rok, téměř každý rok, ve většině let, zhruba v polovině let, jen v některých letech, v žádném) přes všechny skupiny oborů |
| Tabulka po oborech: maturitu udělalo, čeština, nad středem po letech, matematika | **použít** | srovnání oborů školy na jeden pohled; na telefonu karta s popisky |
| „v celé zemi lépe než 91 ze 100 maturantů“ místo „91. percentil“ | **použít** | stejný význam bez odborného slova; od 17. 9. 2026 vždy se slovy „v celé zemi“, aby se nepletlo se srovnáním s podobnými školami |
| Srovnání s podobnými školami v jedné veličině, v % bodů z testu (karta, tabulka i graf) | **použít od 17. 9. 2026** | do té doby se ukazoval medián percentilů, ale zařazení se počítalo z mediánu skórů; ve směru si to neodporovalo ani v jednom z 8 145 srovnání, u 4 470 však stálo „nerozlišitelné“ vedle dvou viditelně různých čísel |
| „podobné školy“ a „střed“ s jednou vysvětlující větou místo „školy stejné skupiny oborů“ a „medián“ | **použít** | slovník pojmů 1.4 |
| Úspěšnost jako „X z Y přihlášených“ a počet těch, kdo ke zkoušce nešli | **použít** | jmenovatel podle CERMATu; opravuje nesoulad procent a počtů |
| Vliv přijímaček jednou větou s rozsahem za obory | **použít** | „92–96 ze 100 uchazečů, na podobných školách obvykle 68–78“ |
| Pás podobných škol a tabulka let | **přesunout do „Podrobně po letech“** | pro zájemce, ne pro první čtení |



| # | Předpoklad | Stav |
|---|---|---|
| S1 | **Maturitní výsledky přes datovou linku**: sada v registru, stažení jarních souborů aspoň 2023–2026, skript do `public/maturita_skoly.json` na úrovni `redizo_smo16` s mediánem skupiny a zařazením, přejímací podmínky maturitního návrhu §8 | **ověřena dostupnost** 14. 9. 2026: `MZ2023j` až `MZ2026j` vrací HTTP 200, soubor 2026 sedí na otisk z auditu; linka zatím maturitu nesleduje |
| S2 | Slovník ukazatelů: úspěšnost společné části, percentil z češtiny u maturity, podíl volby matematiky, zařazení proti skupině oborů, počet let nad skupinou | nezapsáno |
| S3 | Slovník pojmů: maturanti, společná část maturity, skupina oborů, souběžní uchazeči, vzdušnou čarou; zákaz „kvalitní škola“ | nezapsáno |
| S4 | Okolí: souběh po oborech a nejbližší školy stejné skupiny oborů | **hotovo 14. 9. 2026** výpočtem při vykreslení v `src/lib/skola-profil-data.ts` z `data/school_locations.json` a `public/soubeh_prihlasek_{rok}.json`; samostatný soubor nebyl potřeba, výpočet je pod milisekundu |
| S5 | Dobíhající obory z rejstříku do katalogu | **zastaveno na výkladu** (14. 9. 2026): snímek rejstříku 30. 6. 2026 má 1 120 dobíhajících oborů z 15 494, ale 23 z nich škola v 1. kole 2026 vypsala a přijímala (například 600171850, 39-41-L/01). Příznak tedy neznamená „obor už nepřijímá“, nebo platí jen pro jedno místo výuky či IZO. Dokud se význam neověří u MŠMT nebo u škol, upozornění se nezobrazuje (slovník ukazatelů: údaj bez doloženého výkladu se nezobrazuje). |
| S6 | Nahradit zvláštní podobu přehledu „V2“ pro školy s jedním oborem | **hotovo**: obě starší podoby přehledu odstraněny |
| S7 | Zobrazení profilu InspIS s datem snímku a bez dnů otevřených dveří | **hotovo** |
| S8 | Údaje z portálu pro školy rozdělené do oddílů podle otázek, se značkou původu a prázdným stavem | **hotovo** na stránce školy (`src/components/skola/ProfilSkoly.tsx`); přednost školného a podpory je v komponentě, přesun do datové vrstvy zůstává |
| S9 | Odkaz „Editujte: pro vedení školy“ na `/pro-skoly` v hlavičce, v prázdných stavech a v patičce | **hotovo** |
| S10 | Banner Vibecoding nahoře na stránce školy; na nové stránce oboru doplněn 14. 9. 2026 (`59a79b1`), předtím chyběl | **hotovo** na obou stránkách |
| S11 | Slovník pojmů: „potvrdila škola“, „text školy“, „starší údaj z InspIS“, „shrnutí vytvořené automaticky“ jako závazné značky původu | nezapsáno |

Bez S1 až S3 může stránka vzniknout s oddílem „Jak si škola vede“ jen z inspekce. Maturita je ale jediný srovnatelný údaj o výsledku studia, takže doporučuji S1 udělat před nasazením.

## 10. Zvážené nepoužité sloupce

| Sloupec | Rozhodnutí |
|---|---|
| Maturita: `PRŮMĚRNÉ PERCENTILOVÉ UMÍSTĚNÍ` z češtiny, `PODÍL ÚSPĚŠNÝCH (%)`, `KONALI`, `PODÍL VOLBY PŘEDMĚTU (%)` a percentil z matematiky | **použít**, S1 |
| Maturita: `ČISTÁ` a `HRUBÁ NEÚSPĚŠNOST`, `NEÚČAST` | **použít jen jako důkaz** v tabulce let; hlavní číslo je úspěšnost s jmenovatelem |
| Maturita: `SMĚRODATNÁ ODCHYLKA % SKÓRU` | **použít jen k výpočtu zařazení**, na stránce ne (návrh, §5.1: slovně, ne číslem) |
| Maturita: cizí jazyky zvlášť | **zavrhnout pro první verzi**; malé skupiny, samovýběr |
| Maturita před rokem 2021 | **zavrhnout**; zlom metodiky 2020/2021 (návrh, §2.1) |
| Školní agregáty JPZ 2017–2023 | **zavrhnout pro první verzi**; nestaženo, P8 v grafech |
| Rejstřík `dobihajiciObor` | **použít**, S5 |
| Rejstřík `mistaVyuky` | **použít**, když se liší od sídla; sídlo není místo výuky (maturitní návrh, §7) |
| Rejstřík `kapacita` oborů | **zavrhnout**; povolená kapacita není vypsaná místa, rodinu by mátla vedle kapacity z CERMATu |
| Rejstřík `reditel`, `emaily`, CSV `Telefon` | **zavrhnout** (soupis, 2.4) |
| Rejstřík `platnostNaDobuNeurcitou` | **zavrhnout**; neověřeno, co by rodině řeklo |
| Extrakce `hard_facts.support_services` | **použít** v „Jaká škola je“ |
| Extrakce `hard_facts.absence` | **použít u výtek**, když ji inspekce uvádí |
| Extrakce `hard_facts.maturita` | **zavrhnout**, jakmile je S1; text ze zprávy se nedá srovnat |
| Extrakce `school_profile.school_change_summary` | **použít** u inspekce |
| AKKO `platnostDo` | **zavrhnout**; celostátní rušení oboru se u stávajících nabídek neprojevuje |
| InspIS `dny_otevrenych_dveri`, `termin_prijimacich_zkousek`, `zkousky_z_predmetu`, `forma_prijimaciho_rizeni` | **zavrhnout**, zastaralé (u Machara z let 2021 a 2022); aktuální údaj dodá jen škola přes portál |
| InspIS `zamereni`, `clil_metoda`, `clil_jazyky`, `podpory_zaku`, `evropske_projekty`, `spoluprace_s_firmami`, `certifikaty`, `nabidka_dalsiho_vzdelavani`, `zpusob_informovani_rodicu`, `funkce_sis` | **použít jako důkaz** v „Jaká škola je“, se značkou „starší údaj z InspIS“; na staré stránce byly |
| InspIS `umisteni_v_obci`, `linka_mhd`, `v_blizkosti_skoly`, `mista_volny_cas`, `dopravni_dostupnost` | **použít** v „Kde je“, se značkou „starší údaj z InspIS“ |
| InspIS `pristup_k_pc`, `vyuziti_internetu_ve_vyuce`, `stipendium`, `pripravne_kurzy` | **zavrhnout**; zdroj je nikdy nevyplnil (soupis, 2.8) |
| Katalog `cj_prumer`, `ma_prumer`, `prumer_body` přijatých | **použít** v řádku oboru; na staré stránce byly |
| Výsledky 2026 `rank_in_type`, `delta_cj_ma` | **zavrhnout**; pořadí nahrazeno pořadím v kraji, body se mezi roky nesrovnávají |
| Položková data JPZ | **zavrhnout**; patří ke stránce oboru, ne školy |
| Data uchazečů `ss*_zrizovatel` | **zavrhnout**; kombinace veřejných a soukromých škol rodině neřekne nic o této škole |

## 11. Rozhodnutí a otevřené otázky

Rozhodnuto 14. 9. 2026 k verzi 1.1:

1. **Maturita před nasazením:** ano, S1 až S3 se udělají před novou stránkou školy.
2. **Banner Vibecoding** zůstává mezi identitou školy a rozcestníkem.
3. **Portál pro školy** má nová nepovinná pole „Stravování“ a „Kontakt na výchovného poradce“.
4. **Sledovat školu:** tlačítko v řadě akcí hlavičky; rozesílání souhrnů po událostech navrhuje [sledování škol](sledovani-skol-2027.md). Na web přijde až s odesílačem.

Rozhodnuto 14. 9. 2026 bez výhrad k verzi 1.0: pořadí oddílů s „Jak si škola vede“ na druhém místě, nadpis „Jak si škola vede“, schéma okolí bez mapového podkladu. Obtížnost přijetí jako nadpis celou frází „Velmi těžké se dostat“.

## Historie

| Verze | Změna |
|---|---|
| 1.5 | Srovnání s podobnými školami sjednoceno na % bodů z testu; percentil zůstává jen jako „v celé zemi“. |
| 1.4 | Revize maturity (oddíl 8.2): souhrnná věta, tabulka po oborech, „podobné školy“ a „lépe než X ze 100“, oprava jmenovatele úspěšnosti. |
| 1.3 | Realizace na webu (14. 9. 2026): stránka školy v pěti otázkách, okolí a souběh počítané při vykreslení, maturita se zobrazí po přepnutí sady `cermat-maturita`; tlačítko „Sledovat školu“ zatím není, přijde s odesílačem. Souběh přihlášek bere rok z registru (sada `cermat-uchazeci-kolo1`, dnes 2025), prototyp ukazoval 2026. |
| 1.2 | Rozhodnutí k verzi 1.1: maturita před nasazením, banner na místě, nová pole portálu (stravování, kontakt na výchovného poradce), tlačítko „Sledovat školu“ v hlavičce s odkazem na návrh sledování. |
| 1.1 | Revize po zpětné vazbě: data definovaná podle původu (oficiální data, potvrdila škola, text školy, strojové shrnutí, starší údaj z InspIS) s pravidly přednosti, údaje z portálu pro školy rozdělené k otázkám, stav vyplnění v hlavičce, odkaz „Editujte: pro vedení školy“, banner Vibecoding nahoře, doplněné údaje ze staré stránky. Nová výsledná struktura, předpoklady S8–S11. |
| 1.0 | Pět kol: rozcestník a oddíly, pořadí a obory s obtížností přijetí, maturita přes čtyři roky se stabilitou zařazení, okolí podle souběžných přihlášek místo vzdálenosti, profil školy a stavy dat. Předpoklady S1–S7, zvážené sloupce, otevřené otázky. |
