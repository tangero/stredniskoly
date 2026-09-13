# Využití dat o uchazečích a podrobných dat JPZ

Verze 1.1 · 13. 9. 2026 · Teze 1 a 3 schváleny k realizaci a po oponentuře přepracovány, teze 2, 4 a 5 odloženy.

Oponentura verze 1.0 je vypořádána v oddílu na konci. Dvě námitky vedly ke změně výpočtu, jedna k přeformulování tvrzení, tři byly zamítnuty s doložením.

Pět námětů, jak z dat CERMATu o jednotlivých uchazečích lépe odpovědět na otázky, jak těžké je se na školu dostat, jak náročné bude tam studovat a kam dítě směřovat. Vzniklo poté, co [dokumentace zdrojů](zdroje-dat.md) ukázala, že tyto soubory používáme jen zlomkem.

Podklady: [slovník ukazatelů](slovnik-ukazatelu.md), [zdroje dat](zdroje-dat.md), [maturitní výsledky](maturitni-vysledky-a-kvalita-skoly-2027.md).

## Stav tezí

| # | Teze | Zdroj | Stav |
|---|---|---|---|
| 1 | Vlastní výsledek v kontextu konkrétního oboru | data uchazečů | **k realizaci** |
| 3 | Ostrost hranice místo poměru uchazečů | data uchazečů | **k realizaci** |
| 2 | Profil dovedností, který obor vybírá | položková data | odloženo |
| 4 | Kontrola srovnatelnosti ročníků a termínů | položková data | odloženo |
| 5 | Vstupní úroveň jako kontext pro maturitu | položková data a maturitní data | odloženo, čeká na import maturit |

---

## Teze 1: vlastní výsledek v kontextu konkrétního oboru

> Zobrazení přepracováno po oponentuře. Verze 1.0 stavěla na pásmech po pěti bodech; ta se u řídkých oborů slučují do neužitečné šíře, viz námitku O5.

### Co se změní
Dnes na stránce stojí, že o obor soutěží 4,1 uchazeče na místo. To je vlastnost oboru, ne odpověď pro konkrétní dítě. Nově uvidí uchazeč, **jak dopadli loňští uchazeči s podobným výsledkem**.

Hlavní sdělení jsou tři věty, každá faktický údaj o roce 2025. U osmiletého gymnázia J. S. Machara:

- Pod 65 bodů se loni nedostal nikdo.
- Od 65 bodů výš se dostali všichni.
- Hranice se mezi ročníky posouvá, u poloviny oborů zhruba o šest bodů.

Kde je pásmo nejistoty širší, zní prostřední věta jinak: „Mezi 58 a 67 body rozhodovala i další kritéria; z 24 uchazečů v tomto rozmezí se dostalo 9.“

Podrobné rozdělení po pásmech zůstává jako detail na rozkliknutí, vždy s uvedenou šířkou pásma:

| Výsledek | Přijato ze soutěžících |
|---|---|
| 40 až 60 bodů | 0 ze 33 |
| 60 až 70 bodů | 5 z 10 |
| 70 až 75 bodů | 9 z 9 |
| nad 75 bodů | 16 z 16 |

### Jak se to počítá
Pro každý obor se uchazeči rozdělí podle výsledku jednotné zkoušky do pásem po pěti bodech a spočítá se podíl přijatých. Počítá se **jen mezi soutěžícími**, tedy mezi přijatými a těmi, kdo se nevešli kvůli kapacitě.

Ze jmenovatele jsou vyřazeny dvě skupiny a obě mají být na stránce uvedeny:

- **Nastoupili jinam.** Dostali se, ale dali přednost oboru uvedenému na přihlášce výš. O místo nakonec nesoutěžili. Je to skupina se znatelně lepšími výsledky: jejich průměr je proti soutěžícím vyšší mediánově o 8,9 bodu a je vyšší u 97 % oborů. Zobrazené počty proto nejsou všichni uchazeči s daným výsledkem, viz námitku O4.
- **Nesplnili podmínky.** Neuspěli u jiného kritéria než u testu. U osmiletého gymnázia Machara je jich 107, tedy víc než přijatých; to je samo o sobě důležitý signál a patří vedle tabulky.

Pásmo s méně než pěti soutěžícími se slučuje se sousedem, jinak by „1 z 1“ vypadalo jako spolehlivých 100 %.

Generuje `scripts/build-pasma-prijeti.py` do `public/pasma_prijeti_2025.json`.

### Ověření mezi ročníky
Doplněno po oponentuře, viz námitku O2. Na 2 428 oborech spárovaných mezi roky 2024 a 2025 je korelace nejnižšího přijatého výsledku 0,867 a medián absolutní změny 6 bodů. U čtvrtiny oborů se hranice posune o víc než 10 bodů, u 4 % o víc než 20.

Hranice je tedy vodítko, ne cíl. Věta o posunu mezi ročníky je proto povinnou součástí zobrazení, ne poznámkou pod čarou.

Párování vyžadovalo převod IZO na REDIZO, protože soubor za rok 2024 má jiné schéma. 105 IZO se převést nepodařilo a do ověření nevstoupilo.

### Pokrytí

| Stav nabídky 2026 | Počet |
|---|---|
| Má pásma, tedy aspoň 30 soutěžících | 1 830 |
| Nikdo se nevešel kvůli kapacitě | 1 003 |
| Jen dílčí údaje, málo soutěžících | 146 |
| Za rok 2025 data nemáme | 112 |

U 1 003 nabídek zní sdělení: **nikdo se loni nevešel kvůli kapacitě**. Neznamená to, že se dostali všichni; u 898 z 2 259 takových oborů někdo nesplnil podmínky školy. Tahle formulace byla ve verzi 1.0 nepřesná, viz námitku O3.

U 112 nabídek bez dat se nezobrazuje nic a místo tabulky stojí věta, že obor je v naší evidenci nový a srovnání s loňskem nemáme.

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

### Kde se to zobrazí
Jednou větou pod tabulkou z teze 1, na stránce oboru i v záložce oboru na stránce školy. Samotné číslo se nezobrazuje, protože „0,97“ nikomu nic neřekne; zobrazuje se věta ze sloupce „Co to znamená“.

## Odložené teze

### Teze 2: profil dovedností, který obor vybírá
Body po jednotlivých úlohách u uchazečů o daný obor ukážou, v čem byli silní. Škola s týmž průměrem může mít třídu silnou v porozumění textu, nebo v geometrii. Odpovídá na otázku, s jakými spolužáky se dítě potká, a zároveň na to, co má trénovat.

Zdrojem jsou položková data JPZ, sloupce `b1` až `b16.x`, dvanáct souborů o 390 MB, dosud nezpracovaných. Je to jediný zdroj, který tuhle otázku umí zodpovědět.

Vazba na přijetí v nich ale chybí: položková data nenesou příznak přijetí. Profil dovedností proto půjde sestavit jen za **uchazeče o obor**, ne za přijaté, pokud se nepodaří spojit oba soubory. Společný identifikátor žáka mezi nimi není.

Odloženo, protože vyžaduje zpracovat velké soubory a navrhnout, jak seskupit úlohy do dovedností, aby výsledek nebyl jen seznam čísel úloh.

### Teze 4: kontrola srovnatelnosti ročníků a termínů
Než se začnou srovnávat ročníky, musí se ověřit, že stejný počet bodů je stejně těžký. V matematice pro šestiletá gymnázia měl v roce 2025 první řádný termín průměr 17,5 bodu a druhý 17,1, medián se lišil o celý bod.

Data uchazečů nesou už jen lepší z obou výsledků, takže rozdíl mezi termíny jde ověřit pouze z položkových dat, kde má každý termín vlastní list.

Doklad zpřesněn po oponentuře, viz námitku O7. Jde o srovnání týchž lidí: 96 % uchazečů psalo oba řádné termíny. Párově vychází druhý termín o 0,62 bodu hůř, medián rozdílu je jeden bod, lepší výsledek mělo v prvním termínu 51 % uchazečů a ve druhém 42 %.

Odloženo. Je to podmínka pro jakýkoli víceletý trend, ne samostatná funkce pro uživatele. Vyřešit dřív, než se na web dostane první srovnání ročníků v bodech.

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

## Historie

| Verze | Změna |
|---|---|
| 1.1 | Vypořádána oponentura, jedenáct námitek. Ostrost hranice nahrazena mírou *rozhodl test*, doplněno ověření mezi ročníky 2024 a 2025, opravena tautologie u nenaplněných oborů, změněno hlavní zobrazení teze 1. Tři námitky zamítnuty. |
| 1.0 | Pět tezí. Teze 1 a 3 schváleny k realizaci a rozpracovány do návrhu, zbylé tři odloženy se zdůvodněním. |
