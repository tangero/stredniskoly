# Využití dat o uchazečích a podrobných dat JPZ

Verze 1.2 · 13. 9. 2026 · Teze 1 a 3 schváleny k realizaci a po dvou kolech oponentury přepracovány, teze 2, 4 a 5 odloženy.

Vypořádané oponentury jsou v oddílech na konci. První kolo změnilo výpočet ostrosti hranice, druhé opravilo nepravdivou větu ve vzorovém zobrazení a snížilo očekávané pokrytí.

Pět námětů, jak z dat CERMATu o jednotlivých uchazečích lépe odpovědět na otázky, jak těžké je se na školu dostat, jak náročné bude tam studovat a kam dítě směřovat. Vzniklo poté, co [dokumentace zdrojů](zdroje-dat.md) ukázala, že tyto soubory používáme jen zlomkem.

Podklady: [slovník ukazatelů](slovnik-ukazatelu.md), [zdroje dat](zdroje-dat.md), [maturitní výsledky](maturitni-vysledky-a-kvalita-skoly-2027.md).

## Stav tezí

| # | Teze | Zdroj | Stav |
|---|---|---|---|
| 1 | Vlastní výsledek v kontextu konkrétního oboru | data uchazečů | **k realizaci** |
| 3 | Co o přijetí rozhodlo, test nebo kritéria školy | data uchazečů | **k realizaci** |
| 2 | Profil dovedností, který obor vybírá | položková data | odloženo, hrubá podoba už existuje |
| 4 | Kontrola srovnatelnosti ročníků a termínů | položková data | odloženo |
| 5 | Vstupní úroveň jako kontext pro maturitu | položková data a maturitní data | odloženo, čeká na import maturit |

---

## Teze 1: vlastní výsledek v kontextu konkrétního oboru

> Zobrazení přepracováno po oponentuře. Verze 1.0 stavěla na pásmech po pěti bodech; ta se u řídkých oborů slučují do neužitečné šíře, viz námitku O5.

### Co se změní
Dnes na stránce stojí, že o obor soutěží 4,1 uchazeče na místo. To je vlastnost oboru, ne odpověď pro konkrétní dítě. Nově uvidí uchazeč, **jak dopadli loňští uchazeči s podobným výsledkem**.

Hlavní sdělení jsou tři věty, každá faktický údaj o roce 2025. Dolní mez je nejnižší výsledek mezi přijatými, horní mez nejvyšší výsledek mezi těmi, kdo se nevešli. **Obě meze se musí do vět dosadit zvlášť**; verze 1.1 tu měla nepravdivý příklad, viz námitku P1.

U osmiletého gymnázia J. S. Machara jsou obě meze shodně 65 bodů, takže věty znějí:

- Pod 65 bodů se loni nedostal nikdo.
- Nad 65 bodů se dostali všichni.
- Přesně s 65 body se někdo dostal a někdo ne.

Když jsou meze různé, prostřední věta zní: „Mezi 58 a 67 body rozhodovala i další kritéria; z 24 uchazečů v tomto rozmezí se dostalo 9.“ Takových oborů je 85 %, shodné meze má 8 % a u 7 % je mezi mezemi mezera, do které nespadl nikdo.

Ke třem větám patří čtvrtá, o tom, že se hranice mezi ročníky posouvá; její znění je v oddílu o ověření.

Podrobné rozdělení po pásmech zůstává jako detail na rozkliknutí, vždy s uvedenou šířkou pásma. Skutečný výstup pro tento obor, nikoli ručně sloučený:

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

### Jak se to počítá
Pro každý obor se uchazeči rozdělí podle výsledku jednotné zkoušky do pásem po pěti bodech a spočítá se podíl přijatých. Počítá se **jen mezi soutěžícími**, tedy mezi přijatými a těmi, kdo se nevešli kvůli kapacitě.

Ze jmenovatele jsou vyřazeny dvě skupiny a obě mají být na stránce uvedeny:

- **Nastoupili jinam.** Dostali se, ale dali přednost oboru uvedenému na přihlášce výš. O místo nakonec nesoutěžili. Je to skupina se znatelně lepšími výsledky: jejich průměr je proti soutěžícím vyšší mediánově o 8,9 bodu a je vyšší u 97 % oborů. Zobrazené počty proto nejsou všichni uchazeči s daným výsledkem, viz námitku O4.
- **Nesplnili podmínky.** Neuspěli u jiného kritéria než u testu. U osmiletého gymnázia Machara je jich 107, tedy víc než přijatých; to je samo o sobě důležitý signál a patří vedle tabulky.

Pásmo s méně než pěti soutěžícími se slučuje se sousedem, jinak by „1 z 1“ vypadalo jako spolehlivých 100 %.

Generuje `scripts/build-pasma-prijeti.py` do `public/pasma_prijeti_2025.json`.

### Ověření mezi ročníky
Doplněno po prvním kole oponentury, viz námitku O2, rozšířeno po druhém, viz námitku P2.

Na 2 428 oborech s aspoň deseti přijatými v obou letech má nejnižší přijatý výsledek korelaci 0,867 a medián absolutní změny 6 bodů; u čtvrtiny oborů se posune o víc než 10 bodů, u 4 % o víc než 20.

Na užší skupině 1 185 oborů, které mají v obou letech i aspoň pět odmítnutých, vychází obojí takto:

| Veličina | Korelace | Medián absolutní změny |
|---|---|---|
| Dolní mez, nejnižší přijatý | 0,887 | 7 bodů |
| Horní mez, nejvyšší nepřijatý | 0,854 | 8 bodů |
| Šířka pásma nejistoty | 0,682 | 4 body |

Obě meze jsou tedy srovnatelně stabilní, ale **šířka pásma stabilní není**: proti mediánové šířce 8 bodů se mezi ročníky mění o 4 body. Prostřední věta o rozmezí, ve kterém rozhodovala další kritéria, proto popisuje loňsko a nesmí být formulována jako pravidlo školy.

Hranice je vodítko, ne cíl. Věta o posunu mezi ročníky je povinnou součástí zobrazení, ne poznámkou pod čarou. Její znění: „Mezi loňskem a předloňskem se tahle hranice posunula u poloviny oborů o víc než šest bodů.“

Párování vyžadovalo převod IZO na REDIZO, protože soubor za rok 2024 má jiné schéma a jako klíč používá IZO. Převodní tabulka pochází z katalogu 2026, takže zahrnuje jen školy, které v roce 2026 existovaly; 105 z 1 309 IZO, tedy 8 %, se převést nepodařilo. Ověření tím platí pro školy, které přežily do roku 2026, ne pro celý soubor.

### Pokrytí

Přepočítáno po druhém kole oponentury, viz námitky P3 a P4. Prahy pro tabulku pásem a pro větu o tom, co rozhodlo, jsou různé, takže se nabídky rozpadají do šesti stavů, ne do čtyř.

| Stav nabídky 2026 | Počet | Co se zobrazí |
|---|---|---|
| Tabulka pásem i věta o tom, co rozhodlo | 1 526 | obojí |
| Nikdo se nevešel kvůli kapacitě | 1 179 | jedna věta, tabulka nemá co rozlišovat |
| Jen tabulka pásem | 128 | tabulka bez verdiktu |
| Za rok 2025 data nemáme | 112 | věta, že obor je nový |
| Jen dílčí údaje | 90 | nic |
| Jen věta o tom, co rozhodlo | 56 | věta bez tabulky |

U 1 179 nabídek zní sdělení: **nikdo se loni nevešel kvůli kapacitě**. Neznamená to, že se dostali všichni; u 898 z 2 259 oborů v datech za rok 2025, kde nikdo nebyl odmítnut pro kapacitu, přitom někdo nesplnil podmínky školy. Tahle formulace byla ve verzi 1.0 nepřesná, viz námitku O3; pozor, 1 179 je počet nabídek roku 2026, kdežto 2 259 je počet oborů v datech roku 2025, viz námitku P4.

Stav „jen tabulka“ a „jen věta“ dohromady tvoří 184 nabídek. Stránka v nich zobrazí to, co má, a o druhé části mlčí; návrh je nedoplňovat je odhadem, viz zamítnutou námitku P6.

### Co to neříká
Rok 2025 nepředpovídá rok 2027. Kritéria školy se mění, kapacita se mění a složení uchazečů také. Formulace proto vždy mluví v minulém čase o loňsku, nikdy o šanci dítěte.

Data neznají zaměření, takže u oboru s více zaměřeními platí pásma za celý obor školy.

### Kde se to zobrazí
Do bloku „Dostanu se sem?“, pod ukazatele poptávky. Protože stránka školy zobrazuje data oborů v záložkách, objeví se prvek na obou stránkách; liší se jen tím, že na stránce školy je uvnitř záložky oboru.

Prvek je statický, bez zadávání vlastního výsledku. Až bude hotový, může na něj navázat kalkulačka v `src/app/moje-sance`, která dnes počítá z poměrů.

## Teze 3: co o přijetí rozhodlo, test nebo kritéria školy

> Přepracováno po oponentuře. Verze 1.0 měřila ostrost hranice rozdílem krajních hodnot; ta míra neobstála, viz námitku O1.

### Co se změní
Poměr uchazečů na místo neříká, jestli o přijetí rozhodl výsledek testu, nebo něco jiného. Nový ukazatel to říká přímo.

| Situace | Co to znamená | Rada rodiči |
|---|---|---|
| Rozhodl test, hodnota nad 0,97 | Pořadí podle testu odpovídalo výsledku přijímání | Známý cíl, dá se na něj trénovat |
| Hodnota 0,85 až 0,97 | Test rozhodoval, ale kritéria školy s ním hýbou | Vyplatí se zjistit, co dalšího škola hodnotí |
| Hodnota pod 0,85 | O přijetí rozhodlo z velké části něco jiného | Bez přečtení kritérií školy se nedá odhadnout nic |

### Jak se to počítá
**Rozhodl test** je pravděpodobnost, že náhodně vybraný přijatý měl lepší výsledek než náhodně vybraný uchazeč, který se nevešel. Je to plocha pod ROC křivkou, tedy táž míra, jakou projekt použil při [ověření ukazatelů](podklady/overeni-ukazatelu-2025-2026.json). Hodnota 1,0 znamená, že o přijetí rozhodl výhradně test, hodnota 0,5 že výsledek nerozhodoval vůbec.

Pole `rozhodl_test`. Počítá se u oborů s aspoň deseti přijatými a pěti odmítnutými kvůli kapacitě, tedy u 1 545.

Vedle toho se ukládá **pásmo nejistoty**, tedy rozsah od nejnižšího přijatého k nejvyššímu nepřijatému, a podíl soutěžících, kteří do něj spadají. Pásmo je faktický údaj o loňsku, ne míra; jeho šířku určuje jediný uchazeč na každém konci, a proto se nepoužívá k porovnávání oborů.

### Rozdělení hodnot
1 545 oborů, medián 0,97.

| Hodnota | Podíl oborů |
|---|---|
| Přesně 1,00, tedy dokonalé pořadí podle testu | 7 % |
| 0,95 a výš | 61 % |
| 0,85 a výš | 87 % |
| pod 0,70 | 4 % |

Ověřeno mezi ročníky: na 1 185 oborech spárovaných mezi roky 2024 a 2025 je korelace 0,783 a medián absolutní změny 0,015.

Podíl soutěžících spadajících do pásma nejistoty má medián 29 % a horní čtvrtinu 51 %.

### Dvě zkreslení, která se musí vyloučit
Obojí je v datech označené.

- **Talentová zkouška.** U uměleckých oborů skupiny 82 je medián 0,66 proti 0,97 u ostatních, protože o přijetí rozhoduje z velké části talentová zkouška, o níž data nemáme. Pole `talentova_zkouska`. Ukazatel se u nich nezobrazuje vůbec, viz námitku O9.
- **Více zaměření pod jedním klíčem.** Data uchazečů neznají zaměření, takže se sčítají obory s různými hranicemi. Medián je tam 0,92 proti 0,97. Pole `vice_zamereni`. Ukazatel se zobrazuje s poznámkou.

### Co to neříká
Neměří kvalitu ani spravedlnost přijímacího řízení. Nízká hodnota znamená, že škola vážila i něco jiného než test, což může být zcela legitimní, například prospěch nebo vlastní zkouška.

**Název je zkratka, ne důkaz příčiny.** Míra popisuje, nakolik pořadí podle testu odpovídá výsledku přijímání. Škola, která řadí podle prospěchu, dosáhne vysoké hodnoty také, protože prospěch s výsledkem testu souvisí. Vysoká hodnota tedy neznamená, že škola žádné jiné kritérium nepoužila, jen že s testem nešlo do rozporu. Viz námitku P5.

### Kde se to zobrazí
Jednou větou pod tabulkou z teze 1, na stránce oboru i v záložce oboru na stránce školy. Samotné číslo se nezobrazuje, protože „0,97“ nikomu nic neřekne; zobrazuje se věta ze sloupce „Co to znamená“.

## Odložené teze

### Teze 2: profil dovedností, který obor vybírá
Body po jednotlivých úlohách u uchazečů o daný obor ukážou, v čem byli silní. Škola s týmž průměrem může mít třídu silnou v porozumění textu, nebo v geometrii. Odpovídá na otázku, s jakými spolužáky se dítě potká, a zároveň na to, co má trénovat.

Zdrojem jsou položková data JPZ, sloupce `b1` až `b16.x`, dvanáct souborů o 390 MB, dosud nezpracovaných. Je to jediný zdroj, který tuhle otázku umí zodpovědět.

Vazba na přijetí v nich ale chybí: položková data nenesou příznak přijetí. Profil dovedností proto půjde sestavit jen za **uchazeče o obor**, ne za přijaté, pokud se nepodaří spojit oba soubory. Společný identifikátor žáka mezi nimi není.

**Hrubá podoba profilu už v projektu existuje**, viz námitku P7. Katalog nese u 2 808 oborů pole `cohorts`, tedy rozdělení přijatých do devíti skupin podle úrovně a podle toho, zda táhli spíš matematiku, nebo češtinu. Rozlišuje dobře: podíl matematických profilů mezi přijatými má medián 27 % a rozsah od 0 do 96 %. U osmiletého gymnázia J. S. Machara je rozdělení 17 výborných matematiků, 9 výborných vyvážených a 4 výborní humanitní, tedy celá třída v nejvyšším pásmu.

Položková data k tomu nepřidají rozdělení na matematiku a češtinu, to už máme, ale rozlišení **uvnitř předmětu**: které typy úloh dělaly uchazečům o daný obor potíže. Teze se tím zužuje a její přínos klesá.

Odloženo, protože vyžaduje zpracovat velké soubory a navrhnout, jak seskupit úlohy do dovedností, aby výsledek nebyl jen seznam čísel úloh.

### Teze 4: kontrola srovnatelnosti ročníků a termínů
Než se začnou srovnávat ročníky, musí se ověřit, že stejný počet bodů je stejně těžký. V matematice pro šestiletá gymnázia měl v roce 2025 první řádný termín průměr 17,5 bodu a druhý 17,1, medián se lišil o celý bod.

Data uchazečů nesou už jen lepší z obou výsledků, takže rozdíl mezi termíny jde ověřit pouze z položkových dat, kde má každý termín vlastní list.

Doklad zpřesněn po oponentuře, viz námitku O7. Jde o srovnání týchž lidí: 96 % uchazečů psalo oba řádné termíny. Párově vychází druhý termín o 0,62 bodu hůř, medián rozdílu je jeden bod, lepší výsledek mělo v prvním termínu 51 % uchazečů a ve druhém 42 %.

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

## Historie

| Verze | Změna |
|---|---|
| 1.2 | Vypořádána oponentura verze 1.1, osm námitek, šest přijato a dvě zamítnuty. Opravena nepravdivá věta ve vzorovém zobrazení, ověřeny obě meze pásma nejistoty, potlačeny tabulky pásem u oborů bez odmítnutých, přepočítáno pokrytí, zúžena teze 2. |
| 1.1 | Vypořádána oponentura, jedenáct námitek. Ostrost hranice nahrazena mírou *rozhodl test*, doplněno ověření mezi ročníky 2024 a 2025, opravena tautologie u nenaplněných oborů, změněno hlavní zobrazení teze 1. Tři námitky zamítnuty. |
| 1.0 | Pět tezí. Teze 1 a 3 schváleny k realizaci a rozpracovány do návrhu, zbylé tři odloženy se zdůvodněním. |
