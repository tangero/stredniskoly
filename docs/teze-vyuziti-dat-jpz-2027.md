# Využití dat o uchazečích a podrobných dat JPZ

Verze 1.4 · 13. 9. 2026 · Teze 1 a 3 realizovány, teze 2, 4 a 5 odloženy.

Vypořádané oponentury jsou v oddílech na konci. První kolo změnilo výpočet ostrosti hranice, druhé opravilo nepravdivou větu ve vzorovém zobrazení, třetí odhalilo, že posun hranice mezi ročníky z větší části odráží obtížnost testu. Externí oponentura verze 1.2 vedla k připnutí dokladů do skriptu a při jejím vypořádání vyšlo najevo, že statistiky zkreslovaly obory bez povinné jednotné zkoušky.

**Doklady.** Čísla v tezích a v podmínkách realizace reprodukuje `python3 scripts/validate-pasma-prijeti.py` do [podkladu](podklady/overeni-pasem-prijeti-2024-2025.json). Čísla v oddílech oponentur verze 1.0 až 1.2 jsou historický záznam: počítala se nad populací včetně oborů bez povinné zkoušky a z percentilu přes záznamy uchazeč krát obor, takže se od podkladu liší.

Pět námětů, jak z dat CERMATu o jednotlivých uchazečích lépe odpovědět na otázky, jak těžké je se na školu dostat, jak náročné bude tam studovat a kam dítě směřovat. Vzniklo poté, co [dokumentace zdrojů](zdroje-dat.md) ukázala, že tyto soubory používáme jen zlomkem.

Podklady: [slovník ukazatelů](slovnik-ukazatelu.md), [zdroje dat](zdroje-dat.md), [maturitní výsledky](maturitni-vysledky-a-kvalita-skoly-2027.md).

## Stav tezí

| # | Teze | Zdroj | Stav |
|---|---|---|---|
| 1 | Vlastní výsledek v kontextu konkrétního oboru | data uchazečů | **realizováno** |
| 3 | Co o přijetí rozhodlo, test nebo kritéria školy | data uchazečů | **realizováno** |
| 2 | Profil dovedností, který obor vybírá | položková data | odloženo, hrubá podoba už existuje |
| 4 | Kontrola srovnatelnosti ročníků a termínů | položková data | odloženo |
| 5 | Vstupní úroveň jako kontext pro maturitu | položková data a maturitní data | odloženo, čeká na import maturit |

---

## Teze 1: vlastní výsledek v kontextu konkrétního oboru

> Stav po externí oponentuře verze 1.2. Všechna čísla v tomto oddílu a v tezi 3 reprodukuje `scripts/validate-pasma-prijeti.py` do [podkladu](podklady/overeni-pasem-prijeti-2024-2025.json). Populace je vždy uvedena v názvu klíče podkladu.

### Co se změní
Dnes na stránce stojí, že o obor soutěží 4,1 uchazeče na místo. To je vlastnost oboru, ne odpověď pro konkrétní dítě. Nově uvidí uchazeč, **jak dopadli loňští uchazeči s podobným výsledkem**.

Hlavní sdělení jsou tři věty, každá faktický údaj o 1. kole roku 2025. Dolní mez je nejnižší výsledek mezi přijatými, horní mez nejvyšší výsledek mezi těmi, kdo se nevešli kvůli kapacitě. **Každá mez má vlastní větu**; verze 1.1 tu měla nepravdivý příklad, viz námitku P1.

U osmiletého gymnázia J. S. Machara v Brandýse nad Labem jsou obě meze shodně 65 bodů:

- Pod 65 bodů se loni nedostal nikdo. Stejně nebo méně bodů mělo 81 ze 100 uchazečů v celé zemi.
- Nad 65 bodů se dostali všichni.
- Přesně s 65 body se někdo dostal a někdo ne.

U čtyřletého gymnázia na Palackého ulici v Novém Jičíně jsou meze různé:

- Pod 44 body se loni nedostal nikdo.
- Nad 53 body se dostali všichni.
- Mezi 44 a 53 body rozhodovala i další kritéria; z 16 uchazečů v tomto rozmezí se dostalo 11.

Počty v rozmezí jsou přesné, ne součet pětibodových pásem; verze 1.2 v komponentě sčítala celá pásma, a do „rozmezí“ tak započítávala i uchazeče mimo ně, viz námitku R9.

Rozdělení 1 440 oborů s hranicí: různé meze má 83,9 %, shodné 8,5 % a u 7,6 % zůstane mezi mezemi rozmezí, do kterého nespadl nikdo.

Čtvrtá věta je povinná a mluví o posunu hranice mezi ročníky; znění je v oddílu o ověření.

Podrobné rozdělení po pásmech zůstává jako detail na rozkliknutí, vždy s uvedenou šířkou pásma. Skutečný výstup pro osmileté gymnázium J. S. Machara:

| Výsledek | Přijato ze soutěžících |
|---|---|
| 40 až 45 bodů | 0 ze 7 |
| 45 až 50 bodů | 0 z 8 |
| 50 až 55 bodů | 0 ze 7 |
| 55 až 60 bodů | 0 z 11 |
| 60 až 70 bodů | 5 z 10 |
| 70 až 75 bodů | 9 z 9 |
| 75 až 85 bodů | 7 ze 7 |
| 85 až 95 bodů | 9 z 9 |

### Jednotka
Body jsou součet češtiny a matematiky, každý předmět nejvýš za 50 bodů, a to **lepší z obou pokusů**, jak ho uvádí sloupec `c_m_procentni_skor` v legendě souboru CERMATu. Zdroj nese procentní skór 0 až 200 %, který se dělí dvěma; u běžného testu se tím přesně rovná bodům. U upravených testů pro uchazeče s přiznaným uzpůsobením podmínek se procentní výsledek s body neshoduje. Viz námitku R5.

### Jak se to počítá
Pro každý obor se uchazeči rozdělí podle výsledku jednotné zkoušky do pásem po pěti bodech a spočítá se podíl přijatých. Počítá se **jen mezi soutěžícími**, tedy mezi přijatými a těmi, kdo se nevešli kvůli kapacitě.

**Jen obory s povinnou jednotnou zkouškou.** Povinnost se bere ze sloupce `POVINNOST JPZ` v přihláškách 2026, zálohou je kategorie oboru K, L nebo M. U ostatních oborů mají výsledek jen uchazeči, kteří zkoušku psali kvůli jiné přihlášce, takže pásma by popisovala nahodilou skupinu u oboru, který podle testu nepřijímá. Vyřazeno je tím 1 497 oborů, převážně učebních. Viz námitku R10.

Ze jmenovatele jsou vyřazeny dvě skupiny a obě mají být na stránce uvedeny:

- **Přijati na vyšší prioritu.** Byli přijati na obor uvedený na přihlášce výš, a o toto místo proto už nesoutěžili. Zda by se sem dostali, data neříkají. Je to skupina s lepšími výsledky: na 2 304 oborech s aspoň deseti přijatými a deseti takovými uchazeči je jejich průměr mediánově o 8,7 bodu vyšší než průměr soutěžících a vyšší je u 97 % oborů. Zobrazené počty proto nejsou všichni uchazeči s daným výsledkem. Viz námitky O4 a R6.
- **Nesplnili podmínky.** Neuspěli u jiného kritéria než u testu. U osmiletého gymnázia J. S. Machara je jich 107, tedy víc než přijatých; to je samo o sobě důležitý signál a patří vedle tabulky.

Pásmo s méně než pěti soutěžícími se slučuje se sousedem, jinak by „1 z 1“ vypadalo jako spolehlivých 100 %. Obory, kde nikdo nebyl odmítnut kvůli kapacitě, pásma nemají vůbec, viz námitku P3.

Generuje `scripts/build-pasma-prijeti.py` do `public/pasma_prijeti_2025.json`: 2 853 oborů, z toho 1 502 s pásmy a 1 440 s hranicí.

### Ověření mezi ročníky
Rok 2024 se páruje přes převod IZO na REDIZO z exportu rejstříku škol `data/Rejstrik_skol/SkolyAMista.csv`. Z 1 179 IZO se nepodařilo převést 5. Verze 1.2 brala převod z katalogu 2026 a ztrácela tak 105 IZO škol, které v katalogu nejsou; tahle nepřesnost je odstraněna, viz námitku R8.

Na 2 320 oborech s aspoň deseti přijatými v obou letech:

| Veličina | Korelace | Medián absolutní změny | Změna nad 10 | Změna nad 20 |
|---|---|---|---|---|
| Nejnižší přijatý, body | 0,863 | 6 bodů | 25,5 % | 4,4 % |
| Nejnižší přijatý, percentil mezi uchazeči | 0,869 | 6,4 percentilového bodu | 34,2 % | 11,5 % |

Na užší skupině 1 149 oborů, které mají v obou letech i aspoň pět odmítnutých:

| Veličina | Korelace | Medián absolutní změny |
|---|---|---|
| Dolní mez, nejnižší přijatý | 0,878 | 7 bodů |
| Horní mez, nejvyšší nepřijatý | 0,858 | 8 bodů |
| Šířka pásma nejistoty | 0,666 | 4 body |

Obě meze jsou srovnatelně stabilní, ale **šířka pásma ne**: při mediánové šířce 7 bodů se mezi ročníky mění o 4 body. Prostřední věta o rozmezí proto popisuje loňsko a nesmí znít jako pravidlo školy.

**Posun hranice mezi ročníky není náhodný**, viz námitku Q1. Mezi roky 2024 a 2025 klesla hranice u 60,7 % oborů a stoupla u 34,9 %, mediánově o 3 body, zatímco medián výsledku všech uchazečů spadl z 54 na 46 bodů. Většina posunu tedy popisuje obtížnost zkoušky, ne změnu náročnosti školy.

Znění povinné věty: „Hranice se mezi ročníky posouvá o jednotky bodů; mění se totiž i obtížnost samotné zkoušky, ne jen zájem o školu. Čísla popisují jen 1. kolo roku 2025.“

Vedle hranice v bodech se uvádí i **percentil mezi uchazeči**, tedy kolik ze 100 uchazečů v celé zemi mělo stejný nebo horší výsledek. Počítá se přes jednotlivé uchazeče, každého jednou bez ohledu na počet přihlášek, viz námitku R9. Systematický posun odstraňuje: medián posunu je +1,7 percentilového bodu proti −3 bodům. Hranici ale **nezpřesňuje**, korelace je 0,869 proti 0,863. Viz námitku Q2.

### Pokrytí
Populace: 3 091 nabídek v `public/applications_2026.json`. Verze 1.2 populaci neuváděla, a oponent ji proto z katalogu nezreprodukoval; katalog `schools_data.json` má 3 239 řádků včetně loni vypsaných nabídek. Viz námitku R2.

| Stav nabídky 2026 | Počet | Co se zobrazí |
|---|---|---|
| Tabulka pásem i věta o tom, co rozhodlo | 1 526 | obojí |
| Nikdo se nevešel kvůli kapacitě | 1 179 | jedna věta |
| Jen tabulka pásem | 128 | tabulka bez verdiktu |
| Za rok 2025 data nemáme | 112 | věta, že obor je nový |
| Jen dílčí údaje | 90 | nic |
| Jen věta o tom, co rozhodlo | 56 | věta bez tabulky |

U 1 179 nabídek zní sdělení: **nikdo se loni nevešel kvůli kapacitě**. Neznamená to, že se dostali všichni: v datech roku 2025 je takových oborů s povinnou zkouškou 1 206 a u 706 z nich někdo nesplnil podmínky školy.

440 nabídek, tedy 14 %, sdílí záznam s jinou nabídkou téže školy; jde o 187 záznamů. U nich stojí nad tabulkou věta, že údaje platí za celý obor školy. 451 z 1 004 nabídek označených jako nové dostane údaje za obor z doby před vypsáním nového zaměření. Viz námitky Q3 a Q4.

### Co to neříká
Rok 2025 nepředpovídá rok 2027. Kritéria školy se mění, kapacita se mění a složení uchazečů také. Formulace proto mluví v minulém čase o loňsku, nikdy o šanci dítěte.

**Popisuje jen 1. kolo.** Kdo se nedostal v prvním kole, mohl se na obor dostat ve druhém; data druhého kola existují, ale nejsou zpracovaná. U nenaplněných oborů je druhé kolo často rozhodující. Viz námitku R4.

Data neznají zaměření, takže u oboru s více zaměřeními platí pásma za celý obor školy.

### Kde se to zobrazí
Na stránce oboru pod statistikami a na stránce školy s jediným oborem. Na stránce školy s více obory se nezobrazuje, protože ta vede na stránky jednotlivých oborů.

Prvek je statický, bez zadávání vlastního výsledku. Může na něj navázat kalkulačka v `src/app/moje-sance`, která dnes počítá z poměrů.

## Teze 3: co o přijetí rozhodlo, test nebo kritéria školy

> Verze 1.0 měřila ostrost hranice rozdílem krajních hodnot; ta míra neobstála, viz námitku O1.

### Co se změní
Poměr uchazečů na místo neříká, jestli o přijetí rozhodl výsledek testu, nebo něco jiného. Nový ukazatel to říká přímo.

| Hodnota | Věta na stránce | Podíl oborů |
|---|---|---|
| 0,97 a výš | O přijetí rozhodoval hlavně výsledek testu | 52,3 % |
| 0,85 až 0,97 | Rozhodoval hlavně test, ale kritéria školy s pořadím znatelně hýbala | 41,2 % |
| pod 0,85 | O přijetí rozhodlo z velké části něco jiného než test | 6,4 % |

Podíly jsou z 1 428 oborů s hranicí bez talentové zkoušky.

### Jak se to počítá
**Rozhodl test** je pravděpodobnost, že náhodně vybraný přijatý měl lepší výsledek než náhodně vybraný uchazeč, který se nevešel. Je to plocha pod ROC křivkou, táž míra, jakou projekt použil při [ověření ukazatelů](podklady/overeni-ukazatelu-2025-2026.json). Hodnota 1,0 znamená, že o přijetí rozhodl výhradně test, 0,5 že nerozhodoval vůbec.

Pole `rozhodl_test`, zaokrouhlené na tři desetinná místa. Počítá se u oborů s aspoň deseti přijatými a pěti odmítnutými kvůli kapacitě, tedy u 1 440.

Vedle toho se ukládá **pásmo nejistoty** s přesnými počty soutěžících a přijatých uvnitř. Je to popis loňska, ne míra: šířku určuje jediný uchazeč na každém konci, a proto se nepoužívá k porovnávání oborů. Medián podílu soutěžících v pásmu je 26,8 %.

### Rozdělení hodnot
1 440 oborů, medián 0,972.

| Hodnota | Podíl oborů |
|---|---|
| 1,000 po zaokrouhlení | 10,0 % |
| 0,95 a výš | 65,4 % |
| 0,85 a výš | 93,1 % |
| pod 0,70 | 0,6 % |

Verze 1.2 uváděla u hodnoty 1,00 podíl 7 %, spočítaný z nezaokrouhlených hodnot a nad všemi obory; v datech zaokrouhlených na tři místa to bylo 9,3 %. Viz námitku R1.

**Ověření mezi ročníky je slabší, než uváděly předchozí verze.** Na 1 149 oborech spárovaných mezi roky 2024 a 2025 je korelace 0,673 a medián absolutní změny 0,01. Verze 1.1 a 1.2 uváděly korelaci 0,783, ale populace zahrnovala obory bez povinné zkoušky, které mají v obou letech trvale nízkou hodnotu a korelaci uměle zvedají. Nízký medián změny spolu s mírnou korelací znamená, že hodnoty se drží blízko sebe, ale pořadí oborů uvnitř úzkého pásma kolem 0,97 se mezi roky mění. Proto se zobrazují jen tři hrubé kategorie, ne pořadí oborů. Viz námitku R10.

### Dvě zkreslení, která se musí vyloučit
- **Talentová zkouška.** Příznak `talentova_zkouska` nesou umělecké obory skupiny 82 a gymnázia se sportovní přípravou 79-42. U sportovních gymnázií je medián 0,78 proti 0,976 u ostatních. Umělecké obory skupiny 82 do dat po zúžení na povinnou zkoušku převážně nevstupují. U oborů s příznakem se věta nezobrazuje. Viz námitky O9 a R3.
- **Více zaměření pod jedním klíčem.** Medián je tam 0,925. Pole `vice_zamereni`. Věta se zobrazuje s poznámkou.

### Co to neříká
Neměří kvalitu ani spravedlnost přijímacího řízení. Nízká hodnota znamená, že škola vážila i něco jiného než test, což může být legitimní.

**Název je zkratka, ne důkaz příčiny.** Míra popisuje shodu pořadí podle testu s výsledkem přijímání. Škola, která řadí podle prospěchu, dosáhne vysoké hodnoty také, protože prospěch s testem souvisí. Viz námitku P5.

### Kde se to zobrazí
Jednou větou pod třemi větami z teze 1. Samotné číslo se nezobrazuje, viz zamítnutou námitku O11.

## Podmínky realizace

Doporučeno externí oponenturou verze 1.2. Každá podmínka má stav a místo, kde je splněna.

| Podmínka | Stav | Kde |
|---|---|---|
| Každá mez pásma nejistoty má vlastní větu, včetně větve pro shodné meze | splněno | `PasmaPrijetiCard.tsx` |
| Jednotka „body“ je vysvětlena: součet obou předmětů, lepší z pokusů, výjimka upravených testů | splněno | podtitul prvku |
| Věta, že data popisují jen 1. kolo | splněno | povinná věta pod prvkem |
| Talentový příznak pokrývá i sportovní gymnázia | splněno | `TALENTOVE_SKUPINY` v generátoru |
| Doklady jsou reprodukovatelné skriptem nad commitnutými daty | splněno | `scripts/validate-pasma-prijeti.py` |
| Obory bez povinné jednotné zkoušky se nezpracovávají | splněno | `povinna_jpz()` v generátoru |
| Počty v rozmezí jsou přesné, ne součet pásem | splněno | `pasmo_nejistoty_soutezilo` |
| Druhé kolo | nesplněno, odloženo | data existují, nejsou zpracovaná |

## Odložené teze

### Teze 2: profil dovedností, který obor vybírá
Body po jednotlivých úlohách u uchazečů o daný obor ukážou, v čem byli silní. Škola s týmž průměrem může mít třídu silnou v porozumění textu, nebo v geometrii. Odpovídá na otázku, s jakými spolužáky se dítě potká, a zároveň na to, co má trénovat.

Zdrojem jsou položková data JPZ, sloupce `b1` až `b16.x`, dvanáct souborů o 390 MB, dosud nezpracovaných. Je to jediný zdroj, který tuhle otázku umí zodpovědět.

Vazba na přijetí v nich ale chybí: položková data nenesou příznak přijetí. Profil dovedností proto půjde sestavit jen za **uchazeče o obor**, ne za přijaté, pokud se nepodaří spojit oba soubory. Společný identifikátor žáka mezi nimi není.

**Hrubá podoba profilu už v projektu existuje**, viz námitky P7 a R7. Katalog nese pole `cohorts` u 2 808 jedinečných identifikátorů ročníku 2025, tedy rozdělení přijatých do devíti skupin podle úrovně a podle toho, zda táhli spíš matematiku, nebo češtinu. Rozlišuje dobře: u 2 026 oborů s aspoň dvaceti přijatými má podíl matematických profilů medián 26,7 % a rozsah od 0 do 96,2 %. U osmiletého gymnázia J. S. Machara je rozdělení 17 výborných matematiků, 9 výborných vyvážených a 4 výborní humanitní, tedy celá třída v nejvyšším pásmu.

Položková data k tomu nepřidají rozdělení na matematiku a češtinu, to už máme, ale rozlišení **uvnitř předmětu**: které typy úloh dělaly uchazečům o daný obor potíže. Teze se tím zužuje a její přínos klesá.

Odloženo, protože vyžaduje zpracovat velké soubory a navrhnout, jak seskupit úlohy do dovedností, aby výsledek nebyl jen seznam čísel úloh.

### Teze 4: kontrola srovnatelnosti ročníků a termínů
Než se začnou srovnávat ročníky, musí se ověřit, že stejný počet bodů je stejně těžký. V matematice pro šestiletá gymnázia měl v roce 2025 první řádný termín průměr 17,5 bodu a druhý 17,1, medián se lišil o celý bod.

Data uchazečů nesou už jen lepší z obou výsledků, takže rozdíl mezi termíny jde ověřit pouze z položkových dat, kde má každý termín vlastní list.

Doklad zpřesněn po oponentuře, viz námitku O7, a připnut do dokladového skriptu. Jde o srovnání týchž lidí: 95,8 % uchazečů psalo oba řádné termíny. Párově na 6 597 uchazečích vychází druhý termín o 0,62 bodu hůř, medián rozdílu je jeden bod, lepší výsledek mělo v prvním termínu 51,0 % uchazečů a ve druhém 42,1 %.

Odloženo. Je to podmínka pro jakýkoli víceletý trend, ne samostatná funkce pro uživatele. Vyřešit dřív, než se na web dostane první srovnání ročníků v bodech.

Teze 1 už jedno takové srovnání používá, totiž posun hranice mezi roky 2024 a 2025. Je to srovnání bodových hodnot mezi ročníky, tedy přesně to, co teze 4 zpochybňuje. Věta o posunu hranice proto mluví o pozorovaném posunu, ne o tom, že se změnila náročnost školy.

### Teze 5: vstupní úroveň jako kontext pro maturitu
Maturitní výsledek sám o sobě neříká nic o kvalitě výuky, protože z velké části odráží to, koho škola přijala. Podrobná data dávají vstupní úroveň a profil dovedností přijatých po školách a skupinách oborů, tedy proměnnou, kterou [návrh maturitního zpracování](maturitni-vysledky-a-kvalita-skoly-2027.md) označuje za podmínku, aby se vůbec směla počítat odchylka od očekávaného výsledku.

Zpřesněno po oponentuře, viz námitku O8. Samotnou vstupní úroveň položková data nepotřebují: průměr a medián výsledků přijatých už máme spočítané v katalogu jako `jpz_prumer_actual` a `jpz_median`. Položková data k tomu přidávají **profil dovedností**, tedy v čem byli přijatí silní, což samotný průměr nerozliší.

Odloženo, protože import maturitních výsledků zatím nezačal. Bez něj není co kontextualizovat.

## Oponentura verze 1.0

Vypořádáno 13. 9. 2026. Každá námitka je buď doložena čísly z dat, nebo zamítnuta s argumentem. Doklady reprodukují skripty `scripts/build-pasma-prijeti.py` a soubory dat uchazečů za roky 2024 a 2025.

### O1 · Ostrost hranice určoval jediný uchazeč — **přijato, změněn výpočet**

Verze 1.0 měřila ostrost jako rozdíl nejvyššího nepřijatého a nejnižšího přijatého. Obě hodnoty jsou krajní, takže celý ukazatel visel na dvou lidech.

**Doklad.** Nahradíme-li krajní hodnoty devadesátým a desátým percentilem, posune se medián z 8,0 na −0,8 bodu a **u 633 z 1 545 oborů, tedy u 41 %, se obrátí verdikt o čistém řezu**. Ukazatel, který se převrátí u dvou pětin případů podle volby mezi maximem a devadesátým percentilem, nic neměří.

**Vypořádání.** Míra nahrazena plochou pod ROC křivkou pod názvem *rozhodl test*. Krajní hodnoty zůstávají uložené jako pásmo nejistoty, tedy faktický popis loňska, ale k porovnávání oborů se nepoužívají.

### O2 · Chybělo ověření mezi ročníky — **přijato, doplněno**

Projekt u tlaku prvních voleb i u kohorty podle pozice na přihlášce trvá na ověření na nezávislém ročníku. U tezí 1 a 3 chybělo.

**Doklad.** Doplněno. Nejnižší přijatý výsledek má mezi roky 2024 a 2025 na 2 428 oborech korelaci 0,867 a medián absolutní změny 6 bodů; u čtvrtiny oborů se posune o víc než 10 bodů. Nová míra *rozhodl test* má na 1 185 oborech korelaci 0,783 a medián změny 0,015.

**Vypořádání.** Obojí doplněno do tezí. Věta o posunu hranice mezi ročníky je nově povinnou součástí zobrazení, protože při šířce pásma 5 bodů znamená typický posun o 6 bodů přeskočení celého pásma.

### O3 · Věta „dostali se všichni, kdo soutěžili“ je tautologie — **přijato, přeformulováno**

Soutěžící jsou definováni jako přijatí plus odmítnutí kvůli kapacitě. Není-li nikdo odmítnut kvůli kapacitě, jsou všichni soutěžící přijatí z definice. Věta neříkala nic.

**Doklad.** U 898 z 2 259 takových oborů, tedy u 40 %, přitom někdo nesplnil podmínky školy. Tvrzení „dostali se všichni“ by u nich bylo nepravdivé.

**Vypořádání.** Pole `vsichni_soutezici_prijati` přejmenováno na `nikdo_neodmitnut_pro_kapacitu` a formulace na stránce změněna na „nikdo se loni nevešel kvůli kapacitě“.

### O4 · Vyloučení těch, kdo nastoupili jinam, zkresluje — **přijato jako poznámka, výpočet beze změny**

Skupina vyřazená ze jmenovatele není náhodná.

**Doklad.** Průměrný výsledek skupiny „nastoupili jinam“ je proti soutěžícím vyšší mediánově o 8,9 bodu a je vyšší u 97 % z 2 537 porovnatelných oborů. Jsou to tedy nadprůměrní uchazeči, kteří se dostali na obor uvedený výš.

**Vypořádání.** Vyloučení zůstává, protože o místo skutečně nesoutěžili a jejich zahrnutí by podíl přijatých uměle snížilo. Doplněna povinná poznámka, že zobrazené počty nejsou všichni uchazeči s daným výsledkem.

### O5 · Slučování pásem ničí rozlišení — **přijato částečně, změněno zobrazení**

**Doklad.** Po sloučení je 18 % pásem širších než 10 bodů. Nejširší pásmo v oboru má medián 20 bodů a maximum 45 bodů. U řídce obsazených oborů pásma splynou do jednoho bloku, ze kterého hranici nepoznáte.

**Vypořádání.** Pásma přestala být hlavním zobrazením. Hlavní jsou tři věty o tom, pod čím se nedostal nikdo, nad čím se dostali všichni a co se dělo mezi tím. Tabulka pásem zůstává jako detail na rozkliknutí, vždy s uvedenou šířkou pásma. Prahy slučování se nemění, protože pásmo se dvěma uchazeči je horší než široké pásmo.

### O6 · Tvrzení, že je to jediný způsob kontextu — **zamítnuto jako formulace, opraveno**

Formulace „jediný způsob, jak dát dítěti vlastní číslo do kontextu“ neplatí. Celostátní percentil výsledku je jiný způsob a CERMAT ho zveřejňuje.

**Vypořádání.** Formulace odstraněna. Správné tvrzení je užší: je to jediný způsob, jak dát výsledek do kontextu **konkrétního oboru**, protože celostátní percentil o hranicích jednotlivé školy nic neříká.

### O7 · Doklad u teze 4 srovnával nespárované skupiny — **přijato, doklad zpřesněn**

Verze 1.0 srovnávala průměry termínů A a B jako dvě nezávislé skupiny. Rozdíl mohl pocházet z toho, že každý termín psal někdo jiný.

**Doklad.** Nepochází. 96 % uchazečů psalo oba řádné termíny, takže jde o srovnání týchž lidí. Párově je druhý termín o 0,62 bodu těžší, medián rozdílu je jeden bod.

**Vypořádání.** Doklad v tezi 4 nahrazen párovým. Závěr se nemění, ale nyní obstojí.

### O8 · Teze 5 tvrdila, že vstupní úroveň dávají položková data — **přijato, zpřesněno**

Vstupní úroveň už máme: `jpz_prumer_actual` a `jpz_median` jsou v katalogu spočítané z dat uchazečů. Položková data k ní přidávají profil dovedností, nikoli úroveň samotnou.

**Vypořádání.** Teze 5 přeformulována. Zároveň to snižuje její náročnost: hrubý kontext pro maturitní výsledky bude možný hned po jejich importu, bez zpracování 390 MB souborů.

### O9 · Návrh zobrazit ukazatel i u oborů s talentovou zkouškou — **zamítnuto**

Námitka zněla, že vyloučení uměleckých oborů zbytečně ubírá pokrytí a stačilo by upozornění.

**Doklad.** U 34 uměleckých oborů skupiny 82 je medián míry *rozhodl test* 0,66 proti 0,97 u ostatních. Hodnota kolem 0,66 znamená, že výsledek jednotné zkoušky pořadí vysvětluje jen zčásti; zbytek určila talentová zkouška, o které data nemáme vůbec.

**Zamítnuto,** protože zobrazený ukazatel by popisoval jinou veličinu než u ostatních oborů a upozornění pod ním by tenhle rozdíl neodstranilo. Rodič by četl číslo, které u těchto oborů znamená něco jiného.

### O10 · Návrh počítat pásma z let 2024 i 2025 dohromady — **zamítnuto**

Námitka zněla, že spojení dvou ročníků zvětší vzorek a umožní užší pásma u malých oborů.

**Doklad.** Hranice se mezi roky posouvá, medián absolutní změny je 6 bodů a u čtvrtiny oborů přes 10 bodů. Sloučení dvou ročníků by tedy nesmazalo šum, ale rozmazalo samotnou hranici, kterou má ukazatel ukázat. Navíc soubor za rok 2024 používá jiné schéma a jako klíč IZO místo REDIZO; 105 IZO se nepodařilo převést.

**Zamítnuto.** Starší ročník má cenu jako nezávislé ověření, ne jako doplněk vzorku.

### O11 · Návrh zobrazovat i samotné číslo míry *rozhodl test* — **zamítnuto**

**Argument.** Hodnota 0,97 je plocha pod ROC křivkou. Projekt už jednou na téhle míře pochybil: v [deníku prototypu](prototyp-stranky-skoly-2027.md) je zaznamenáno, že AUC 0,870 bylo nesprávně popsáno jako „správně odhadlo 87 % oborů“. Číslo, u kterého se spletl autor, nemá na stránce pro rodiče co dělat.

**Zamítnuto.** Zobrazuje se věta, ne hodnota. Hodnota zůstává v datech a ve slovníku.

## Oponentura verze 1.1

Vypořádáno 13. 9. 2026, druhé kolo. Osm námitek, šest přijato, dvě zamítnuty.

### P1 · Vzorový příklad obsahoval nepravdivou větu — **přijato, opraveno**

Verze 1.1 uváděla u osmiletého gymnázia J. S. Machara dvě věty: „Pod 65 bodů se loni nedostal nikdo“ a „Od 65 bodů výš se dostali všichni“. Druhá je nepravdivá.

**Doklad.** Dolní mez pásma nejistoty je 65 a horní mez také 65, tedy s 65 body se někdo dostal a někdo ne. Věta „od 65 výš se dostali všichni“ tvrdí opak. Chyba vznikla tím, že jsem obě věty odvodil z jedné hodnoty, ačkoli každá patří k jiné mezi.

**Rozsah.** Shodné meze má 123 z 1 545 oborů, tedy 8 %. U 85 % je horní mez vyšší než dolní, u 7 % naopak nižší, takže mezi nimi zůstane rozmezí, do kterého nikdo nespadl.

**Vypořádání.** Šablona vět rozepsána tak, aby každá mez měla vlastní větu, a doplněna třetí věta pro případ shodných mezí. Příklad v dokumentu opraven a tabulka pásem nahrazena skutečným výstupem skriptu; verze 1.1 zobrazovala ručně sloučené řádky.

### P2 · Ověřena byla jen jedna mez — **přijato, doplněno**

Ověření mezi ročníky se týkalo nejnižšího přijatého. Zobrazená sdělení ale stojí i na horní mezi a na šířce pásma mezi nimi, a ty ověřené nebyly.

**Doklad.** Doplněno na 1 185 oborech. Dolní mez má korelaci 0,887 a medián změny 7 bodů, horní mez 0,854 a 8 bodů. **Šířka pásma nejistoty má korelaci jen 0,682 a medián změny 4 body**, což je proti mediánové šířce 8 bodů polovina.

**Vypořádání.** Tabulka doplněna do teze 1. Prostřední věta o rozmezí, kde rozhodovala další kritéria, je nově výslovně popisem loňska, ne pravidlem školy.

### P3 · Tabulka pásem se zobrazovala i tam, kde nic nerozlišuje — **přijato, změněn výpočet**

U oborů, kde nikdo nebyl odmítnut kvůli kapacitě, vychází každé pásmo na 100 %. Tabulka pak vypadá jako záruka přijetí.

**Doklad.** Takových oborů s pásmy bylo 159 z 1 705, tedy 9 %. U 105 z nich přitom někdo nesplnil podmínky školy, takže „100 % v každém pásmu“ bylo navíc zavádějící.

**Vypořádání.** Skript u nich pásma negeneruje; zobrazuje se jen věta, že se nikdo nevešel kvůli kapacitě. Počet oborů s pásmy klesl z 1 705 na 1 546.

### P4 · Tabulka pokrytí mísila dvě populace a zakrývala nesoulad prahů — **přijato, přepočítáno**

Věta o nenaplněných oborech srovnávala 1 003 nabídek roku 2026 s 2 259 obory z dat roku 2025, aniž to rozlišila. Tabulka pokrytí navíc slučovala stavy, ve kterých se na stránce zobrazí různé věci, protože práh pro tabulku pásem je 30 soutěžících, kdežto pro větu o tom, co rozhodlo, je deset přijatých a pět odmítnutých.

**Doklad.** Po přepočtu má tabulku i větu 1 526 nabídek, jen tabulku 128 a jen větu 56. Dohromady 184 nabídek zobrazí jen polovinu prvku.

**Vypořádání.** Tabulka pokrytí rozepsána do šesti stavů se sloupcem, co se v každém zobrazí. Obě populace v textu pojmenovány.

### P5 · Název „rozhodl test“ tvrdí příčinu, kterou míra nedokazuje — **přijato, doplněno omezení**

Míra popisuje shodu pořadí, ne příčinu. Škola, která řadí uchazeče podle prospěchu, dosáhne vysoké hodnoty také, protože prospěch s výsledkem testu souvisí.

**Vypořádání.** Název ponechán, protože je srozumitelný a zobrazuje se stejně jen věta, ne hodnota. Doplněna povinná poznámka, že vysoká hodnota neznamená, že škola žádné jiné kritérium nepoužila, jen že s testem nešlo do rozporu. Doplněno i do slovníku.

### P6 · Návrh dopočítat chybějící část prvku odhadem — **zamítnuto**

Námitka zněla, že u 184 nabídek, které mají jen tabulku nebo jen větu, by se chybějící část dala doplnit odhadem ze srovnatelné skupiny.

**Argument.** Obě části popisují konkrétní obor a konkrétní loňské uchazeče. Hodnota odvozená ze srovnatelné skupiny by popisovala jiné obory, ale na stránce by stála na místě, kde čtenář očekává údaj o této škole. Projekt má přitom zapsané pravidlo, že údaj bez doloženého výpočtu se nezobrazuje, a odhad cizí hodnoty je jeho porušením.

**Zamítnuto.** Stránka zobrazí to, co má, a o zbytku mlčí.

### P7 · Teze 2 slibuje něco, co už částečně máme — **přijato, teze zúžena**

Teze 2 tvrdila, že položková data jsou jediný zdroj, který odpoví na otázku, v čem jsou uchazeči o daný obor silní.

**Doklad.** Není. Katalog nese u 2 808 oborů pole `cohorts`, rozdělení přijatých do devíti skupin podle úrovně a podle sklonu k matematice nebo k češtině. Rozlišuje dobře: podíl matematických profilů má medián 27 % a rozsah 0 až 96 %.

**Vypořádání.** Teze 2 zúžena. Položková data nepřidají rozdělení na matematiku a češtinu, ale rozlišení uvnitř předmětu, tedy které typy úloh dělaly potíže. Přínos teze tím klesá a její pořadí v odložených tezích se nemění jen proto, že žádná jiná odložená teze na tom není lépe.

### P8 · Návrh zvýšit práh třiceti soutěžících — **zamítnuto**

Námitka zněla, že třicet soutěžících je málo a pásma jsou proto nespolehlivá.

**Doklad.** Měřeno po vyřazení oborů bez odmítnutých, viz námitku P3: zvýšení prahu na padesát by snížilo pokrytí z 1 654 na 1 088 nabídek roku 2026, tedy o 34 %, ale **medián nejširšího pásma v oboru by zůstal na dvaceti bodech**. Cena je vysoká a nekupuje nic.

**Zamítnuto.** Spolehlivost jednotlivých pásem řeší slučování na pět soutěžících v pásmu, ne celkový práh. Po vyřazení oborů bez odmítnutých, viz námitku P3, navíc odpadl hlavní zdroj nespolehlivých tabulek.

## Oponentura verze 1.2

Vypořádáno 13. 9. 2026, třetí kolo. Pět námitek, čtyři přijaty, jedna zamítnuta.

### Q1 · Posun hranice mezi ročníky se vydával za náhodný, ale je systematický — **přijato, doplněno**

Verze 1.2 uváděla medián absolutní změny hranice 6 bodů a četla ho jako kolísání poptávky. Znaménko jsem nezkoumal.

**Doklad.** Na 2 428 oborech se hranice mezi roky 2024 a 2025 posunula **dolů u 60 % oborů a nahoru u 35 %**, s průměrem −2,9 bodu. Ve stejné době klesl celostátní medián výsledku soutěžících z 53 na 46 bodů. Většina posunu tedy nepopisuje změnu náročnosti školy, ale to, že zkouška byla jiná.

**Vypořádání.** Věta o posunu přeformulována: mluví o tom, že se mezi ročníky mění i obtížnost samotné zkoušky, ne jen zájem o školu. Doplněn převod hranice na celostátní percentil, který tenhle vliv odstraňuje.

### Q2 · Chyběla jednotka nezávislá na obtížnosti testu — **přijato, doplněno**

Dítě v roce 2027 dostane výsledek z jiného testu než uchazeči v roce 2025. Body proto nejsou přímo srovnatelné.

**Doklad.** Vyjádříme-li hranici jako celostátní percentil místo bodů, systematický posun mezi ročníky klesne z −2,5 bodu na +1,4 percentilového bodu. Náhodná složka se přitom nezmění: korelace je 0,873 proti 0,867 a medián absolutní změny 6,1 percentilového bodu proti 6,0 bodu.

**Vypořádání.** Percentil se ukládá vedle bodů a zobrazuje se jako doplněk, protože dítě drží v ruce body. Zároveň to znamená, že **percentil hranici nezpřesňuje**, jen odstraňuje zkreslení z obtížnosti testu; slib přesnější predikce z něj vyvodit nelze.

### Q3 · Stejná tabulka se objeví na dvou různých stránkách oborů — **přijato, doplněno upozornění**

Data neznají zaměření, takže nabídky lišící se jen zaměřením sdílejí jeden klíč.

**Doklad.** 440 z 3 091 nabídek roku 2026, tedy 14 %, sdílí klíč s jinou nabídkou; jde o 187 klíčů. Čtenář uvidí na dvou stránkách tutéž tabulku, aniž by pochopil proč.

**Vypořádání.** U těchto nabídek se nad tabulku přidává věta, že údaje platí za celý obor školy, protože zdroj zaměření nerozlišuje. Pole `vice_zamereni` už v datech je.

### Q4 · Nová zaměření dostávala historii, kterou nemají — **přijato, doplněno upozornění**

**Doklad.** 451 z 1 004 nabídek označených jako nové by dostalo pásma z roku 2025, protože jejich kombinace REDIZO a KKOV v datech existuje.

**Vypořádání.** Není to chyba: obor na škole existoval, nové je zaměření. Tabulka se zobrazí, ale s větou, že jde o údaje za obor jako celek z doby před vypsáním tohoto zaměření.

### Q5 · Návrh přepočítat pásma přímo na percentily — **zamítnuto**

Námitka zněla, že když je percentil lepší jednotka, mají v něm být i pásma.

**Argument.** Dítě drží v ruce body, ne percentil; CERMAT sice percentil zveřejňuje, ale rodič porovnává výsledek s hranicí školy v bodech. Tabulka v percentilech by vyžadovala převod v hlavě u každého řádku. Q2 navíc ukázala, že percentil **nezpřesňuje**, jen odstraňuje systematické zkreslení; to stačí ošetřit jedním doplňkovým údajem u hranice.

**Zamítnuto.** Pásma zůstávají v bodech, percentil se uvádí u hranice jako doplněk.

## Externí oponentura verze 1.2

Vypořádáno 13. 9. 2026 ve verzi 1.4. Oponent ověřil doklady druhého kola a označil je za reprodukovatelné; blokující námitku neshledal. Doporučil zapsat podmínky realizace, což je nový oddíl výše. Osm námitek oponenta, sedm přijato, jedna přijata částečně. Při vypořádání přibyly dvě vlastní námitky R9 a R10.

### R1 · Podíl hodnot 1,00 nesedí s daty — **přijato, opraveno**

**Námitka.** Dokument uváděl 7 %, v JSON je 9,3 %.

**Příčina.** Podíl jsem počítal z nezaokrouhlených hodnot mimo generátor, zatímco JSON ukládá tři desetinná místa, takže 0,9995 a výš se v něm zobrazí jako 1,000.

**Vypořádání.** Podíl se nově počítá z uložených hodnot, protože s nimi pracuje web. Po zúžení populace podle R10 vychází 10,0 %.

### R2 · Doklady O4 a tabulka pokrytí nejdou zreprodukovat — **přijato, doklady připnuty**

**Námitka.** Oponent pro O4 dostal 4 261 až 2 775 oborů místo 2 537 a pro pokrytí nenašel v katalogu populaci 3 091 položek. Dokument přitom tvrdil, že doklady reprodukuje generátor, ačkoli párování ročníků v něm nebylo.

**Příčina.** Obojí jsem počítal jednorázovými skripty mimo repozitář a populaci jsem nepojmenoval. Pokrytí se počítá nad 3 091 nabídkami v `public/applications_2026.json`, ne nad katalogem `schools_data.json`, který má 3 239 řádků včetně loni vypsaných nabídek.

**Vypořádání.** Vznikl `scripts/validate-pasma-prijeti.py`, který počítá každé číslo z tezí nad commitnutými daty a zapisuje ho do [podkladu](podklady/overeni-pasem-prijeti-2024-2025.json). Populace je součástí názvu každého klíče. Tvrzení, že doklady reprodukuje generátor, bylo nepravdivé a je odstraněno.

### R3 · Sportovní obory bez talentového příznaku — **přijato, rozšířen příznak**

**Doklad.** Gymnázia se sportovní přípravou 79-42 mají medián míry *rozhodl test* 0,78 na 12 oborech, nejníže ze všech skupin s aspoň pěti obory. Ostatní obory mají 0,976.

**Vypořádání.** Příznak `talentova_zkouska` nově pokrývá skupiny 82 a 79-42, konstanta `TALENTOVE_SKUPINY` v generátoru. Věta o tom, co rozhodlo, se u nich nezobrazuje. Oponent závažnost hodnotil jako nízkou, protože věta by u nich byla pravdivá; souhlasím, ale pravdivá věta o sportovní přípravě by rodiče neinformovala o tom podstatném, tedy o talentové zkoušce.

### R4 · Mlčení o tom, že jde jen o 1. kolo — **přijato, doplněno; data kola 2 odložena**

**Vypořádání.** Věta doplněna do oddílu „Co to neříká“ v tezi 1 a do povinné věty pod prvkem na webu. Zpracování druhého kola je v podmínkách realizace vedeno jako nesplněné.

### R5 · „Body“ místo procentního skóru — **přijato částečně**

**Námitka.** Oponent uvádí, že škála je percentil, a doporučuje nepoužívat slovo „body“.

**Zamítnutá část.** Škála není percentil. Legenda souboru CERMATu popisuje sloupec `c_m_procentni_skor` jako „český jazyk + matematika, lepší výsledek, % skór (0–200 %)“ a slovník ukazatelů jako procentní skór dělený dvěma. Percentil je jiná veličina, kterou CERMAT uvádí zvlášť. Protože oba testy mají nejvýš 50 bodů, procentní skór dělený dvěma se u běžného testu přesně rovná bodům. Slovo „body“ je proto správné a pro rodiče srozumitelnější, protože právě body dostane dítě na výsledkovém listu.

**Přijatá část.** Jednotka musí být vysvětlena. Podtitul prvku nově říká, že jde o součet obou předmětů po nejvýš 50 bodech, o lepší z obou pokusů, a že u upravených testů se procentní výsledek s body neshoduje. V tezi 1 přibyl oddíl „Jednotka“.

### R6 · „Dostali se, ale dali přednost…“ — **přijato, opraveno v dokumentu, komponentě i slovníku**

**Příčina.** Formulace tvrdila, že by se uchazeči na tento obor dostali. Data to neříkají: sloupec CERMATu zní „NEPŘIJATI – PŘIJAT NA VYŠŠÍ PRIORITU“, tedy nepřijati sem, protože byli přijati na obor uvedený výš. Zda by uspěli i tady, se nevyhodnocovalo.

**Vypořádání.** Skupina přejmenována na „přijati na vyšší prioritu“ a text změněn na „byli přijati na obor uvedený na přihlášce výš, a o toto místo proto už nesoutěžili“. Stejná chyba byla ve slovníku v hesle „Nastoupili jinam“ a v komponentě na webu; opravena na obou místech.

### R7 · Počty u kohort přijatých nesedí — **přijato, populace pojmenována**

**Námitka.** Oponent dostal 2 812 nebo 2 558 oborů místo 2 808 a medián 25,9 až 26,3 % místo 27 %.

**Vypořádání.** Rozdíl je v populaci: 2 808 je počet jedinečných identifikátorů s kohortami v ročníku 2025 katalogu, 2 812 počet řádků ročníku 2026 a 2 558 počet kombinací REDIZO a KKOV. Medián se počítá jen u 2 026 oborů s aspoň dvaceti přijatými a vychází 26,7 %. Obojí je nyní v podkladu a v tezi 2.

### R8 · Převod IZO přes katalog ztrácí zaniklé školy — **přijato, převod změněn**

**Doklad.** Převod přes export rejstříku `data/Rejstrik_skol/SkolyAMista.csv` nepřevede 5 z 1 179 IZO. Převod přes katalog 2026 nepřevedl 105, protože katalog obsahuje jen školy s nabídkou roku 2026 s jednotnou zkouškou; mezi chybějícími jsou tedy zaniklé školy i školy bez takové nabídky. Oponentovo vysvětlení zaniklými školami je proto jen část příčiny.

**Vypořádání.** Dokladový skript používá rejstřík. Výhrada, že ověření platí jen pro školy obsažené v katalogu 2026, tím odpadá.

### R9 · Tři nepřesnosti v realizaci — **vlastní námitka, přijato, opraveno**

Zjištěno při vypořádání R2.

1. **Vymyšlený příklad.** Věta „Mezi 58 a 67 body rozhodovala i další kritéria; z 24 uchazečů se dostalo 9“ nepocházela z dat. Nahrazena skutečným čtyřletým gymnáziem v Novém Jičíně: meze 44 a 53, z 16 uchazečů se dostalo 11.
2. **Nepřesné počty v rozmezí.** Komponenta sčítala celá pětibodová pásma, která se s rozmezím překrývala, takže do „tohoto rozmezí“ započítala i uchazeče mimo ně. Generátor nově ukládá přesné počty `pasmo_nejistoty_soutezilo` a `pasmo_nejistoty_prijato`.
3. **Percentil přes záznamy místo lidí.** Percentil hranice se počítal z rozdělení záznamů uchazeč krát obor, takže kdo soutěžil o tři obory, započítal se třikrát. Věta na webu přitom mluví o uchazečích. Nově se počítá z řádků souboru, kde je každý uchazeč jednou. U osmiletého gymnázia J. S. Machara se percentil změnil z 84 na 81.

### R10 · Statistiky zkreslovaly obory bez povinné jednotné zkoušky — **vlastní námitka, přijato, změněna populace**

Zjištěno při vypořádání R3. Mezi skupinami s nejnižší mírou *rozhodl test* nebyly jen talentové obory, ale i učební obory kategorie H: elektrikář 26-51 s mediánem 0,63, kadeřník 69-51 s 0,65, automechanik 23-68 s 0,71.

**Příčina.** U oborů kategorií C, E, H, J a P a u části oborů M a L se jednotná zkouška nekoná, jak dokládá sloupec `POVINNOST JPZ` v přihláškách 2026. Výsledek z testu mají jen uchazeči, kteří ho psali kvůli jiné přihlášce. Na web se tyto obory nedostávaly, protože nabídka roku 2026 obsahuje jen obory kategorií K, L a M, ale vstupovaly do všech statistik v dokumentu.

**Dopad.** Nejvýraznější je u stability míry *rozhodl test*: korelace mezi roky klesla z 0,783 na **0,673**, protože obory bez zkoušky mají trvale nízkou hodnotu a korelaci uměle zvyšovaly. Ostatní čísla se posunula jen málo.

**Vypořádání.** Generátor obory bez povinné zkoušky nezpracovává, vynechá jich 1 497. Dokladový skript používá stejnou populaci. V tezi 3 je slabší stabilita výslovně uvedena a zdůvodňuje, proč se zobrazují jen tři hrubé kategorie.

## Historie

| Verze | Změna |
|---|---|
| 1.4 | Vypořádána externí oponentura verze 1.2, deset námitek včetně dvou vlastních. Doklady připnuty do `scripts/validate-pasma-prijeti.py`. Vyřazeny obory bez povinné jednotné zkoušky, rozšířen talentový příznak o sportovní gymnázia, percentil přepočítán přes jednotlivé uchazeče, opraven vymyšlený příklad a nepřesné počty v rozmezí. Doplněny podmínky realizace. |
| 1.3 | Vypořádána oponentura verze 1.2, pět námitek. Posun hranice mezi ročníky rozpoznán jako z větší části vliv obtížnosti testu, doplněn celostátní percentil hranice. Teze 1 a 3 realizovány v aplikaci. |
| 1.2 | Vypořádána oponentura verze 1.1, osm námitek, šest přijato a dvě zamítnuty. Opravena nepravdivá věta ve vzorovém zobrazení, ověřeny obě meze pásma nejistoty, potlačeny tabulky pásem u oborů bez odmítnutých, přepočítáno pokrytí, zúžena teze 2. |
| 1.1 | Vypořádána oponentura, jedenáct námitek. Ostrost hranice nahrazena mírou *rozhodl test*, doplněno ověření mezi ročníky 2024 a 2025, opravena tautologie u nenaplněných oborů, změněno hlavní zobrazení teze 1. Tři námitky zamítnuty. |
| 1.0 | Pět tezí. Teze 1 a 3 schváleny k realizaci a rozpracovány do návrhu, zbylé tři odloženy se zdůvodněním. |
