# Matice změn škol a oborů 2025–2026

Verze 1.1 · 12. 9. 2026 · analytický podklad, nikoli schválená migrační mapa.

## Rozsah a metoda

Porovnáno 3 059 nabídek roku 2025 a 3 091 nabídek roku 2026 z původních XLSX CERMAT. Jde o první kolo, denní nezkrácené studium s povinnou JPZ. Nejde o celý rejstřík škol, mateřské školy ani nabídku 2027. Rok 2024 zde neporovnáváme. Používáme oficiální XLSX 2025, nikoli neúplný historický katalog aplikace s 2 837 řádky.

[Zdroj CERMAT](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/agregovana-data-jpz.html). Kontrolní součty vstupů jsou v doprovodném JSON.

REDIZO identifikuje právnickou osobu, IZO školu nebo zařízení; ani jedno není identifikátor budovy. [Definice MŠMT](https://rejstriky.msmt.cz/rejskol/VREJVerejne/VerejneRozhrani.aspx). Nové IZO proto samo nedokazuje vznik nové školy a z tohoto výřezu nelze zjistit přidání MŠ.

Jednotka školní matice je jedinečná kombinace REDIZO, IZO, adresy a názvu v daném roce: 1 107 jednotek v každém roce. Není to počet budov ani právnických osob. Adresa se porovnává jako ulice s číslem + obec + PSČ; chybějící číslo znamená neznámou adresu. Normalizace ignoruje diakritiku, velikost písmen, interpunkci a nadbytečné mezery; nesjednocuje pouliční zkratky, č.p./č.o. ani adresní místa RÚIAN. „Stejné“ tedy znamená stejné po této normalizaci.

Párování je 1:1. Postupně se hledá jediná dosud volná položka na obou stranách podle (1) všech čtyř vlastností, (2) IZO a adresy, (3) IZO, (4) REDIZO a adresy, (5) REDIZO, (6) adresy. Poslední tři pravidla dávají pouze návrhy. Počet ve sloupci je počet takto nalezených dvojic, nikoli všech možných křížových kombinací. Výsledek závisí na uvedené metodě: nula neprokazuje, že daný jev neexistuje. Rozdělení a sloučení 1:N/N:1 zůstávají mimo automatické párování.

## Školy: všech 16 kombinací a neznámá adresa

Pořadí znaků: **adresa / REDIZO / IZO / název**. `=` stejné, `≠` jiné, `?` nelze určit.

| Kombinace | Dvojic | Možný význam a omezení |
|---|---:|---|
| `====` | 1011 | Beze změny sledovaných vlastností; neprokazuje stejnou nabídku ani podmínky přijetí. |
| `===≠` | 25 | Změna názvu při zachované identitě; přejmenování, úprava zápisu nebo i důsledek sloučení. |
| `==≠=` | 0 | Jiné zařízení pod stejnou právnickou osobou; ověřit rejstřík a souběh obou IZO. |
| `==≠≠` | 0 | Jiné zařízení a název pod stejnou právnickou osobou; vznik, náhrada či reorganizace. |
| `=≠==` | 0 | Zachované IZO, jiná právnická osoba; kandidát převodu činnosti, ověřit registr. |
| `=≠=≠` | 0 | Zachované IZO, změna právnické osoby i názvu; kandidát reorganizace. |
| `=≠≠=` | 0 | Shoda adresy a názvu nestačí k doložení právního nástupnictví. |
| `=≠≠≠` | 1 | Pouze shodná adresa; kandidát nástupnictví nebo nesouvisející výměna uživatele budovy. |
| `≠===` | 35 | Změna adresního údaje; stěhování, jiné pracoviště, korespondenční adresa nebo oprava zápisu. |
| `≠==≠` | 5 | Změna adresy i názvu při stejných identifikátorech; ověřit obě změny odděleně. |
| `≠=≠=` | 0 | Jiné zařízení i místo ve stejné právnické osobě; nelze ztotožnit školy podle názvu. |
| `≠=≠≠` | 0 | Stejná právnická osoba, ostatní jiné; možná nová či nahrazená součást. |
| `≠≠==` | 0 | Stejné IZO, jiná adresa i právnická osoba; kandidát převodu činnosti a změny místa. |
| `≠≠=≠` | 0 | Pouze stejné IZO; ověřit změnu provozovatele, adresy i názvu. |
| `≠≠≠=` | 0 | Pouze stejný název není dostatečná kotva; tato metoda takto nepáruje. |
| `≠≠≠≠` | 0 | Bez identity i adresní kotvy nelze návaznost touto metodou zjistit. |
| `?===` | 16 | Stejné identifikátory a název; úplnou adresu nemáme alespoň na jedné straně. |

Součet: 1 092 dvojic se stejným IZO + 1 adresní návrh (PORG Brno → PORG). Bez dvojice zbývá 14 jednotek roku 2025 a 14 roku 2026. Nejde automaticky o zaniklé a nové školy.

### Proč kombinace není verdikt

- Ze 40 změn adresy při stejném IZO a REDIZO je jedna pouze změnou PSČ: Bezpečnostně právní akademie Plzeň, Tylova 988, 30100 → 31800. To není důkaz změny budovy.
- U zbývajících 39 se mění ulice nebo číslo; ani zde bez historie míst výuky nelze potvrdit stěhování.
- Mezi 25 změnami názvu při stejné adrese a identifikátorech je Masarykova akademie v Rakovníku. [Škola potvrzuje sloučení s SZeŠ od 1. 9. 2025](https://mozarako.cz/7-historie-skoly). Taková kombinace tedy nevylučuje širší organizační změnu.
- Předchozí adresní rozbor nalezl 67 křížových dvojic různých REDIZO na 35 adresách. U 54 dvojic oba subjekty na adrese působily v obou letech; dalších 13 dvojic na 10 adresách má změnu přítomnosti. Nejsou to další položky této matice, ale překrývající se kandidátní vztahy. Například převzetí další školy existujícím subjektem nelze vměstnat do párování 1:1.

## Obory

Porovnáváme pouze nabídky uvnitř školních dvojic se stejným IZO. V tomto souboru mají tyto dvojice zároveň stejné REDIZO. Adresa se může změnit; změnu školy proto evidujeme odděleně od změny nabídky. Párování opět vyžaduje jediný zbylý protějšek na každé straně. Postupně: všech šest vlastností; kód + zaměření + délka + forma + jazyk; kód + délka + forma + jazyk; kód + zaměření; kód; název + délka + forma + jazyk. Jakákoli rozdílnost znamená návrh návaznosti k posouzení, nikoli převod historie bez kontroly.

| Pozorování | Dvojic | Význam |
|---|---:|---|
| Všech šest vlastností shodných | 2 311 | Shoda popisu nabídky; neznamená stejné výsledky nebo přijímací podmínky. |
| Změnilo se pouze zaměření | 559 | Může jít o změnu zápisu, ŠVP nebo obsahu nabídky. |
| Změnil se pouze jazyk | 2 | Ověřit deklarovaný režim výuky. |
| Změnila se forma i jazyk | 1 | SPŠ, KKOV 23-41-M/01: den → den2, Polský → Český; ověřit význam zdrojového kódu den2. |

Z 559 změn zaměření: **206 vyplněné → prázdné, 182 prázdné → vyplněné, 171 změna vyplněného textu**. Údaj proto nelze používat jako jedinou stabilní identitu oboru. Například prázdné zaměření → „všeobecné“ samo o sobě není důkaz otevření nového gymnaziálního oboru.

Celkem 2 873 dvojic. Zbývá 186 nabídek 2025 a 218 nabídek 2026:

| Zbývající nabídky podle výskytu v druhém roce | 2025 | 2026 |
|---|---:|---:|
| IZO není v druhém roce vůbec | 22 | 16 |
| IZO existuje, stejný KKOV pod ním nikoli | 53 | 86 |
| Existuje IZO i KKOV, ale párování zůstalo nevyřešené | 111 | 116 |

Tyto tři skupiny jsou disjunktní. U 86 nabídek 2026 může jít o přidání oboru, změnu kódu, návrat nabídky nebo odlišné pokrytí; absence v jednom roce nedokazuje novost. U 116 je potřeba kontrolovat zejména více zaměření, rozdělení/sloučení nabídek a duplicity. Ve spárovaných dvojicích se nenašla změna KKOV ani délky; není to důkaz jejich neexistence mezi nespárovanými nabídkami.

### Úplná matice oborů (64 kombinací)

Pořadí: **KKOV / název oboru / zaměření / délka / forma / jazyk**. Interpretace označuje změněná pole; změna kódu potřebuje doloženou návaznost, změna délky či formy zvláštní posouzení srovnatelnosti statistik. Změny mimo denní studium jsou z rozsahu vyloučeny.

| Kombinace | Dvojic | Změněná pole |
|---|---:|---|
| `======` | 2311 | žádná |
| `=====≠` | 2 | JAZYK STUDIA |
| `====≠=` | 0 | FORMA VZDĚLÁVÁNÍ |
| `====≠≠` | 1 | FORMA VZDĚLÁVÁNÍ, JAZYK STUDIA |
| `===≠==` | 0 | DÉLKA STUDIA |
| `===≠=≠` | 0 | DÉLKA STUDIA, JAZYK STUDIA |
| `===≠≠=` | 0 | DÉLKA STUDIA, FORMA VZDĚLÁVÁNÍ |
| `===≠≠≠` | 0 | DÉLKA STUDIA, FORMA VZDĚLÁVÁNÍ, JAZYK STUDIA |
| `==≠===` | 559 | ZAMĚŘENÍ OBORU |
| `==≠==≠` | 0 | ZAMĚŘENÍ OBORU, JAZYK STUDIA |
| `==≠=≠=` | 0 | ZAMĚŘENÍ OBORU, FORMA VZDĚLÁVÁNÍ |
| `==≠=≠≠` | 0 | ZAMĚŘENÍ OBORU, FORMA VZDĚLÁVÁNÍ, JAZYK STUDIA |
| `==≠≠==` | 0 | ZAMĚŘENÍ OBORU, DÉLKA STUDIA |
| `==≠≠=≠` | 0 | ZAMĚŘENÍ OBORU, DÉLKA STUDIA, JAZYK STUDIA |
| `==≠≠≠=` | 0 | ZAMĚŘENÍ OBORU, DÉLKA STUDIA, FORMA VZDĚLÁVÁNÍ |
| `==≠≠≠≠` | 0 | ZAMĚŘENÍ OBORU, DÉLKA STUDIA, FORMA VZDĚLÁVÁNÍ, JAZYK STUDIA |
| `=≠====` | 0 | OBOR - NÁZEV |
| `=≠===≠` | 0 | OBOR - NÁZEV, JAZYK STUDIA |
| `=≠==≠=` | 0 | OBOR - NÁZEV, FORMA VZDĚLÁVÁNÍ |
| `=≠==≠≠` | 0 | OBOR - NÁZEV, FORMA VZDĚLÁVÁNÍ, JAZYK STUDIA |
| `=≠=≠==` | 0 | OBOR - NÁZEV, DÉLKA STUDIA |
| `=≠=≠=≠` | 0 | OBOR - NÁZEV, DÉLKA STUDIA, JAZYK STUDIA |
| `=≠=≠≠=` | 0 | OBOR - NÁZEV, DÉLKA STUDIA, FORMA VZDĚLÁVÁNÍ |
| `=≠=≠≠≠` | 0 | OBOR - NÁZEV, DÉLKA STUDIA, FORMA VZDĚLÁVÁNÍ, JAZYK STUDIA |
| `=≠≠===` | 0 | OBOR - NÁZEV, ZAMĚŘENÍ OBORU |
| `=≠≠==≠` | 0 | OBOR - NÁZEV, ZAMĚŘENÍ OBORU, JAZYK STUDIA |
| `=≠≠=≠=` | 0 | OBOR - NÁZEV, ZAMĚŘENÍ OBORU, FORMA VZDĚLÁVÁNÍ |
| `=≠≠=≠≠` | 0 | OBOR - NÁZEV, ZAMĚŘENÍ OBORU, FORMA VZDĚLÁVÁNÍ, JAZYK STUDIA |
| `=≠≠≠==` | 0 | OBOR - NÁZEV, ZAMĚŘENÍ OBORU, DÉLKA STUDIA |
| `=≠≠≠=≠` | 0 | OBOR - NÁZEV, ZAMĚŘENÍ OBORU, DÉLKA STUDIA, JAZYK STUDIA |
| `=≠≠≠≠=` | 0 | OBOR - NÁZEV, ZAMĚŘENÍ OBORU, DÉLKA STUDIA, FORMA VZDĚLÁVÁNÍ |
| `=≠≠≠≠≠` | 0 | OBOR - NÁZEV, ZAMĚŘENÍ OBORU, DÉLKA STUDIA, FORMA VZDĚLÁVÁNÍ, JAZYK STUDIA |
| `≠=====` | 0 | KKOV |
| `≠====≠` | 0 | KKOV, JAZYK STUDIA |
| `≠===≠=` | 0 | KKOV, FORMA VZDĚLÁVÁNÍ |
| `≠===≠≠` | 0 | KKOV, FORMA VZDĚLÁVÁNÍ, JAZYK STUDIA |
| `≠==≠==` | 0 | KKOV, DÉLKA STUDIA |
| `≠==≠=≠` | 0 | KKOV, DÉLKA STUDIA, JAZYK STUDIA |
| `≠==≠≠=` | 0 | KKOV, DÉLKA STUDIA, FORMA VZDĚLÁVÁNÍ |
| `≠==≠≠≠` | 0 | KKOV, DÉLKA STUDIA, FORMA VZDĚLÁVÁNÍ, JAZYK STUDIA |
| `≠=≠===` | 0 | KKOV, ZAMĚŘENÍ OBORU |
| `≠=≠==≠` | 0 | KKOV, ZAMĚŘENÍ OBORU, JAZYK STUDIA |
| `≠=≠=≠=` | 0 | KKOV, ZAMĚŘENÍ OBORU, FORMA VZDĚLÁVÁNÍ |
| `≠=≠=≠≠` | 0 | KKOV, ZAMĚŘENÍ OBORU, FORMA VZDĚLÁVÁNÍ, JAZYK STUDIA |
| `≠=≠≠==` | 0 | KKOV, ZAMĚŘENÍ OBORU, DÉLKA STUDIA |
| `≠=≠≠=≠` | 0 | KKOV, ZAMĚŘENÍ OBORU, DÉLKA STUDIA, JAZYK STUDIA |
| `≠=≠≠≠=` | 0 | KKOV, ZAMĚŘENÍ OBORU, DÉLKA STUDIA, FORMA VZDĚLÁVÁNÍ |
| `≠=≠≠≠≠` | 0 | KKOV, ZAMĚŘENÍ OBORU, DÉLKA STUDIA, FORMA VZDĚLÁVÁNÍ, JAZYK STUDIA |
| `≠≠====` | 0 | KKOV, OBOR - NÁZEV |
| `≠≠===≠` | 0 | KKOV, OBOR - NÁZEV, JAZYK STUDIA |
| `≠≠==≠=` | 0 | KKOV, OBOR - NÁZEV, FORMA VZDĚLÁVÁNÍ |
| `≠≠==≠≠` | 0 | KKOV, OBOR - NÁZEV, FORMA VZDĚLÁVÁNÍ, JAZYK STUDIA |
| `≠≠=≠==` | 0 | KKOV, OBOR - NÁZEV, DÉLKA STUDIA |
| `≠≠=≠=≠` | 0 | KKOV, OBOR - NÁZEV, DÉLKA STUDIA, JAZYK STUDIA |
| `≠≠=≠≠=` | 0 | KKOV, OBOR - NÁZEV, DÉLKA STUDIA, FORMA VZDĚLÁVÁNÍ |
| `≠≠=≠≠≠` | 0 | KKOV, OBOR - NÁZEV, DÉLKA STUDIA, FORMA VZDĚLÁVÁNÍ, JAZYK STUDIA |
| `≠≠≠===` | 0 | KKOV, OBOR - NÁZEV, ZAMĚŘENÍ OBORU |
| `≠≠≠==≠` | 0 | KKOV, OBOR - NÁZEV, ZAMĚŘENÍ OBORU, JAZYK STUDIA |
| `≠≠≠=≠=` | 0 | KKOV, OBOR - NÁZEV, ZAMĚŘENÍ OBORU, FORMA VZDĚLÁVÁNÍ |
| `≠≠≠=≠≠` | 0 | KKOV, OBOR - NÁZEV, ZAMĚŘENÍ OBORU, FORMA VZDĚLÁVÁNÍ, JAZYK STUDIA |
| `≠≠≠≠==` | 0 | KKOV, OBOR - NÁZEV, ZAMĚŘENÍ OBORU, DÉLKA STUDIA |
| `≠≠≠≠=≠` | 0 | KKOV, OBOR - NÁZEV, ZAMĚŘENÍ OBORU, DÉLKA STUDIA, JAZYK STUDIA |
| `≠≠≠≠≠=` | 0 | KKOV, OBOR - NÁZEV, ZAMĚŘENÍ OBORU, DÉLKA STUDIA, FORMA VZDĚLÁVÁNÍ |
| `≠≠≠≠≠≠` | 0 | KKOV, OBOR - NÁZEV, ZAMĚŘENÍ OBORU, DÉLKA STUDIA, FORMA VZDĚLÁVÁNÍ, JAZYK STUDIA |

## Doporučení pro prohlížeč a migrační mapu

U každého případu uchovat zvlášť: pozorované rozdíly, kandidátní vazbu 1:1/1:N/N:1, vysvětlení, důkaz a schválený dopad na historii. Nezaměňovat změnu názvu školy za změnu oboru. Adresu dále rozdělit na změnu PSČ, ulice/čísla a neznámou adresu; identitu budovy doplnit přes RÚIAN a rozlišit sídlo od místa výuky. Sloučení a změny IZO/REDIZO ověřovat v rejstříku a u školy. Ani potvrzená kontinuita školy automaticky neznamená srovnatelnost historických statistik oboru.

Tato dodávka nemění katalog, produkci ani uložená rozhodnutí v prohlížeči 1 004 případů.

## Reprodukce a evidence

```sh
python3 scripts/analyze-year-change-matrix.py --input-dir /tmp/gymnazium-rozvoj-2027
```

Strojová data: [matice-zmen-2025-2026.json](podklady/matice-zmen-2025-2026.json). Obsahují všechny dvojice, pravidla, nezpárované položky a zdrojové atributy. Indexy old/new jsou od nuly v odpovídajících polích schools nebo offers. Kontroly ověřují jedinečné použití položek a úplné rozdělení obou ročníků.

Navazuje na [adresní rozbor](adresni-parovani-skol-2025-2026.md).

### Konkrétní pozorované změny škol

Verze 1.1 opravuje zařazení 16 dvojic `?===`: neúplná adresa není pozorovaná změna. Tyto dvojice zůstávají v úplné matici, ale nejsou v následujícím seznamu změn. U REDIZO 600170535 (Tachov) jsou v obou letech shodné identifikátory, název, obec i PSČ a ulice chybí. Žádná změna sledovaných údajů zde doložena není.

Samotné změny názvu či adresního údaje jen evidujeme, bez rešerše příčiny. U oborů evidujeme změnu názvu/zaměření jen při jednoznačné návaznosti; doplnění nebo vymazání textu není přejmenování. Organizační vazby 1:N/N:1 a nejasné identity zůstávají k posouzení. Pravidla a fronta: [zadání dohledávání](zadani-dohledavani-navaznosti-2025-2026.md).

| REDIZO 2025 → 2026 | Název 2025 → 2026 | Adresa 2025 → 2026 | Kombinace |
|---|---|---|---|
| 600007987 → 600007987 | Masarykova obchodní akademie → Masarykova obch. a zeměděl. akademie Rakovník, SOŠ | Pražská 1222, Rakovník, 26901 → Pražská 1222, Rakovník, 26901 | `===≠` |
| 600008274 → 600008274 | SOŠ a SOU → SOŠ a SOU, Jindřichův Hradec, Jáchymova 478 | Jáchymova 478, Jindřichův Hradec, 37701 → Jáchymova 478, Jindřichův Hradec, 37701 | `===≠` |
| 600010309 → 600010309 | SPŠ a OA Kadaň → SPŠ stavební a OA Kadaň | Komenského 562, Kadaň, 43201 → Komenského 562, Kadaň, 43201 | `===≠` |
| 600013090 → 600013090 | Střední odborné učiliště opravárenské → Střední škola technická a sociální Králíky | Předměstí 427, Králíky, 56169 → Předměstí 427, Králíky, 56169 | `===≠` |
| 600013782 → 600013782 | SŠ inform., poštovnictví a finančnictví → SŠ a VOŠ informatiky a financí Brno | Čichnova 982, Brno, 62400 → Čichnova 982, Brno, 62400 | `===≠` |
| 600013898 → 600006018 | PORG Brno - gymnázium, ZŠ a MŠ, o.p.s. → PORG - gymnázium, ZŠ a MŠ, o.p.s. | Mendlovo náměstí 1, Brno, 60300 → Mendlovo náměstí 1, Brno, 60300 | `=≠≠≠` |
| 600026612 → 600026612 | SŠ, ZŠ a MŠ prof. V. Vejdovského → SŠ, ZŠ a MŠ prof. V. Vejdovského | Tomkova 411, Olomouc, 77900 → Gorazdovo nám. 64, Olomouc, 77900 | `≠===` |
| 600004856 → 600004856 | VOŠek.st.,G,SPŠpotr.t. a SOŠpřír.a vet. → SPŠ, SOŠ a G, Praha 2, Podskalská 10 | Podskalská 365, Praha, 12800 → Podskalská 365, Praha, 12800 | `===≠` |
| 600012824 → 600012824 | Střední odborné učiliště Svitavy → Střední škola technická Svitavy | Nádražní 1083, Svitavy, 56802 → Nádražní 1083, Svitavy, 56802 | `===≠` |
| 600011941 → 600011941 | SOŠ a SOU technické → SOŠ a SOU technické, Třemošnice, Sportovní 322 | Sportovní 322, Třemošnice, 53843 → Sportovní 322, Třemošnice, 53843 | `===≠` |
| 600006026 → 600006026 | Královská střední škola, s.r.o. → Královská střední škola, s.r.o. | Svídnická 599, Praha, 18100 → Svídnická 506, Praha, 18100 | `≠===` |
| 600077594 → 600077594 | Městské gymnázium a Základní škola → Městské gymnázium a Základní škola | Krušnohorská 1675, Jirkov, 43111 → Mostecká 309, Jirkov, 43111 | `≠===` |
| 600170110 → 600170110 | Střední odborné učiliště → Střední odborná škola a Střední odborné učiliště | Hlaváčkovo náměstí 673, Slaný, 27401 → Hlaváčkovo náměstí 673, Slaný, 27401 | `===≠` |
| 600012468 → 600012468 | SŠ cest. ruchu a graf. designu, s.r.o. → SŠ cestovního ruchu a grafického designu, s.r.o. | U Josefa 118, Pardubice, 53009 → U Josefa 118, Pardubice, 53009 | `===≠` |
| 600007278 → 600007278 | Střední zemědělská škola → Střední zemědělská škola a Střední odbor. učiliště | Sadová 1234, Čáslav, 28601 → Sadová 1234, Čáslav, 28601 | `===≠` |
| 600020339 → 600020339 | VOŠ a Střední zemědělská škola → VOŠ a Střední zemědělská škola, Tábor | nám. T. G. Masaryka 788, Tábor, 39002 → nám. T. G. Masaryka 788, Tábor, 39002 | `===≠` |
| 600020321 → 600020321 | Obchodní akademie → Obchodní akademie, Tábor, Jiráskova 1615 | Jiráskova 1615, Tábor, 39002 → Jiráskova 1615, Tábor, 39002 | `===≠` |
| 600008118 → 600008118 | SŠ informatiky a právních studií, z.ú. → SŠ informatiky a právních studií, z.ú. | Rudolfovská tř. 31, České Budějovice, 37001 → Žižkova tř. 250, České Budějovice, 37001 | `≠===` |
| 600012891 → 600012891 | Krkonošské gymnázium a SOŠ → Krkonošské gymnázium a Střední odborná škola | Komenského 586, Vrchlabí, 54301 → Komenského 586, Vrchlabí, 54301 | `===≠` |
| 600005542 → 600005542 | Smíchovská SPŠ a gymnázium → Smíchovská SPŠ, gymnázium a hotelová škola | Preslova 72, Praha, 15000 → Preslova 72, Praha, 15000 | `===≠` |
| 600008037 → 600008037 | Gymnázium → Gymnázium, Trhové Sviny, Školní 995 | Školní 995, Trhové Sviny, 37401 → Školní 995, Trhové Sviny, 37401 | `===≠` |
| 600009564 → 600009564 | Bezp.práv.akad.Plzeň,s.r.o,střední škola → Bezp.práv.akad.Plzeň,s.r.o,střední škola | Tylova 988, Plzeň, 30100 → Tylova 988, Plzeň, 31800 | `≠===` |
| 600012247 → 600012247 | SŠ zdr. Náchod - Evangelická akademie → Evangelická VOŠ sociální a SZŠ | Kladská 335, Náchod, 54701 → Kladská 335, Náchod, 54701 | `===≠` |
| 600170373 → 600170373 | Střední škola → Střední škola, České Velenice, Revoluční 220 | Revoluční 220, České Velenice, 37810 → Vitorazská 88, České Velenice, 37810 | `≠==≠` |
| 600014452 → 600014452 | Střední škola Baltaci s.r.o. → Střední škola Baltaci s.r.o. | Zarámí 4422, Zlín, 76001 → Dřevnická 1788, Zlín, 76001 | `≠===` |
| 600013774 → 600013774 | TRIVIS - Střední škola veterinární → TRIVIS - Střední veterinární škola Brno, s.r.o. | Dukelská třída 467, Brno, 61400 → Elgartova 683, Brno, 61400 | `≠==≠` |
| 600007481 → 600007481 | SŠ tradičních řemesel HERMÉS MB s.r.o. → SŠ tradičních řemesel HERMÉS MB s.r.o. | tř. Václava Klementa 1223, Mladá Boleslav, 29301 → Laurinova 1049, Mladá Boleslav, 29301 | `≠===` |
| 600007570 → 600007570 | EKO Gymnázium a SOŠ Multimediál. studií → EKO Gymnázium a SOŠ Multimediál. studií | Na Hrázi 742, Poděbrady, 29001 → Jiřího náměstí 1, Poděbrady, 29001 | `≠===` |
| 600005275 → 600005275 | SŠ managementu a služeb a ZŠ s.r.o. → SŠ managementu a služeb a ZŠ s.r.o. | Ve Lhotce 814, Praha, 14200 → Ekonomická 957, Praha, 14800 | `≠===` |
| 600019896 → 600019896 | Střední zdravotnická škola → Střední zdravotnická škola | Jaselská 190, Brno, 60200 → Jaselská 192, Brno, 60200 | `≠===` |
| 600019624 → 600019624 | Střední zdravotnická škola → Střední zdravotnická škola, Tábor, Mostecká 1912 | Mostecká 1912, Tábor, 39002 → Mostecká 1912, Tábor, 39002 | `===≠` |
| 600017591 → 600017591 | PRIGO, gymnázium 6leté a 4leté, s.r.o. → PRIGO, gymnázium 6leté a 4leté, s.r.o. | Českobratrská 1393, Ostrava, 70200 → Mojmírovců 1002, Ostrava, 70900 | `≠===` |
| 600017290 → 600017290 | Soukromá obchodní akademie Opava s.r.o. → Soukromá obchodní akademie Opava s.r.o. | Slavíkova 1747, Ostrava, 70800 → Rooseveltova 886, Opava, 74601 | `≠===` |
| 600013600 → 600013600 | TRIVIS Střední škola veřejnoprávní → TRIVIS - Střední škola veřejnoprávní Brno, s.r.o. | Dukelská třída 467, Brno, 61400 → Veveří 331, Brno, 60200 | `≠==≠` |
| 600013740 → 600013740 | Cyrilomet.gymnázium a SOŠ pedagog. Brno → Cyrilometodějské gymnázium, SPedŠ a MŠ Brno | Lerchova 343, Brno, 60200 → Lerchova 343, Brno, 60200 | `===≠` |
| 600007499 → 600007499 | SŠ podnikatelská HERMÉS MB s.r.o. → SŠ podnikatelská HERMÉS MB s.r.o. | tř. Václava Klementa 1223, Mladá Boleslav, 29301 → Laurinova 1049, Mladá Boleslav, 29301 | `≠===` |
| 600011046 → 600011046 | SOŠ pro ochr. a obn. ŽP-Schola Humanitas → SOŠ pro ochr. a obn. ŽP-Schola Humanitas | Ukrajinská 379, Litvínov, 43601 → Ukrajinská 320, Litvínov, 43601 | `≠===` |
| 600015882 → 600015882 | SŠ gastronomická Adolpha Kolpinga → SŠ Adolpha Kolpinga | U Klafárku 1685, Žďár nad Sázavou, 59101 → U Klafárku 1685, Žďár nad Sázavou, 59101 | `===≠` |
| 600063861 → 600063861 | Základní škola a Gymnázium Vodňany → Základní škola a Gymnázium Vodňany | Alešova 50, Vodňany, 38901 → Bavorovská 1046, Vodňany, 38901 | `≠===` |
| 600019756 → 600019756 | Střední zdravot.škola a VOŠ zdravotnická → SZŠ a VOŠZ Havlíčkův Brod | Masarykova 2033, Havlíčkův Brod, 58001 → Masarykova 2033, Havlíčkův Brod, 58001 | `===≠` |
| 610250451 → 610250451 | Bráfova akademie, SŠ a JazŠ → Bráfova akademie, SŠ a JazŠ | Bráfova tř. 180, Třebíč, 67401 → Sirotčí 63, Třebíč, 67401 | `≠===` |
| 600171272 → 600171272 | Střední škola společného stravování → Hotelová škola, Ostrava, příspěvková organizace | Krakovská 1095, Ostrava, 70030 → Krakovská 1095, Ostrava, 70030 | `===≠` |
| 650003969 → 650003969 | TRIVIS - SŠ veřejnoprávní K.Vary, s.r.o. → TRIVIS - SŠ veřejnoprávní K.Vary, s.r.o. | T. G. Masaryka 559, Karlovy Vary, 36001 → nábřeží Jana Palacha 932, Karlovy Vary, 36001 | `≠===` |
| 651015995 → 651015995 | SOŠ multimediál. a propag. tvorby s.r.o. → EDUSO | Novomeského 2139, Praha, 14900 → Novomeského 2139, Praha, 14900 | `===≠` |
| 600099296 → 600099296 | Waldorfská ZSŠ Semily, p.o. → Waldorfská ZSŠ Semily, p.o. | Tyršova 485, Semily, 51301 → Jana Žižky 375, Semily, 51301 | `≠===` |
| 651028922 → 651028922 | 1. Slovanské gymnázium a jazyková škola → 1. Slovanské gymnázium a jazyková škola | Masná 700, Praha, 11000 → Na příkopě 850, Praha, 11000 | `≠===` |
| 691000522 → 691000522 | SŠ diplomacie a veřejné správy s.r.o. → SŠ diplomacie a veřejné správy s.r.o. | Josefa Ševčíka 911, Most, 43401 → Aloise Jiráska 1887, Most, 43401 | `≠===` |
| 691004048 → 691004048 | SŠ Sion High School → SŠ Sion High School | Na Kotli 1201, Hradec Králové, 50009 → Hradecká 1151, Hradec Králové, 50003 | `≠===` |
| 691006989 → 691006989 | Střední zahradnická škola a SOU s.r.o. → Střední zahradnická škola a SOU s.r.o. | Veleslavínská 282, Praha, 16200 → Hloubětínská 78, Praha, 19800 | `≠===` |
| 651040621 → 651040621 | Waldorfská škola ČB – MŠ, ZŠ a SŠ o.p.s. → Waldorfská škola ČB – MŠ, ZŠ a SŠ o.p.s. | M. Chlajna 1347, České Budějovice, 37005 → Senovážné nám. 231, České Budějovice, 37001 | `≠===` |
| 691013560 → 691013560 | Naše lyceum - střední škola s.r.o. → Naše lyceum - střední škola s.r.o. | Záběhlická 1658, Praha, 10600 → Rostovská 1481, Praha, 10100 | `≠===` |
| 691006474 → 691006474 | ZŠ a SŠ JEDNA RADOST → ZŠ a SŠ JEDNA RADOST | Školní 73, Pňov-Předhradí, 28941 → Na Hrázi 742, Poděbrady, 29001 | `≠===` |
| 691014612 → 691014612 | SPŠ Strojírna Litvínov spol. s r.o. → SPŠ Strojírna Litvínov spol. s r.o. | Na Pavlu 2155, Litvínov, 43601 → Ukrajinská 453, Litvínov, 43601 | `≠===` |
| 671100769 → 671100769 | Montessori MŠ a ZŠ Perlička a SŠ, s.r.o. → Montessori MŠ a ZŠ Perlička a SŠ, s.r.o. | Příkrá 2890, Brno, 61600 → Musilova 407, Brno, 61400 | `≠===` |
| 691009627 → 691009627 | LABYRINTH - gymnázium a ZŠ, s.r.o. → LABYRINTH - gymnázium a ZŠ, s.r.o. | Lidická 1869, Brno, 60200 → Technická 2998, Brno, 61600 | `≠===` |
| 600001661 → 600001661 | Academic School, MŠ, ZŠ a SŠ, s.r.o. → Academic School, Gymnázium, SOŠ, ZŠ a MŠ, s.r.o. | Studentské náměstí 1531, Uherské Hradiště, 68601 → Města Mayen 1536, Uherské Hradiště, 68601 | `≠==≠` |
| 691012164 → 691012164 | Škola příběhem - církevní ZŠ a gymnázium → Evangelické gymnázium a ZŠ Brno | Filipínského 300, Brno, 61500 → Filipínského 300, Brno, 61500 | `===≠` |
| 691015856 → 691015856 | Meridian česko-britská ZŠ a gymnázium → Perrott Hill MŠ, ZŠ a gymnázium s.r.o. | Třeboradická 1110, Praha, 18200 → Třeboradická 1110, Praha, 18200 | `===≠` |
| 691007039 → 691007039 | ZŠ a gymnázium Livingston s.r.o. → ZŠ a gymnázium Livingston s.r.o. | Vážská 998, Praha, 19600 → Schoellerova 1097, Praha, 19600 | `≠===` |
| 691017271 → 691017271 | Gymnázium VICTORIA HIGH SCHOOL, s.r.o. → Gymnázium VICTORIA HIGH SCHOOL, s.r.o. | Oplanská 2339, Praha, 19016 → Hartigova 2747, Praha, 13000 | `≠===` |
| 691017832 → 691017832 | School for Future – gymnázium s.r.o. → School for Future – gymnázium s.r.o. | Újezd 452, Praha, 11800 → Spálená 76, Praha, 11000 | `≠===` |
| 691017981 → 691017981 | GAELY - střední škola, s.r.o. → GAELY | Bělehradská 7, Praha, 14000 → U vinných sklepů 1062, Praha, 19000 | `≠==≠` |
| 691018146 → 691018146 | Základní škola a gymnázium Minehava,z.s. → Základní škola a gymnázium Minehava,z.s. | Korunní 1251, Praha, 12000 → Havlíčkovo náměstí 300, Praha, 13000 | `≠===` |
| 691014566 → 691014566 | MŠ, ZŠ a gymnázium VIA BEROUN → MŠ, ZŠ a gymnázium VIA BEROUN | Hrnčířská 642, Beroun, 26601 → K Tibě 2144, Beroun, 26601 | `≠===` |
| 691009724 → 691009724 | Základní škola a Střední škola Otevřeno, z. ú. → Základní škola a Střední škola Otevřeno, z. ú. | U Školy 225, Benátky nad Jizerou, 29471 → Pražská 760, Benátky nad Jizerou, 29471 | `≠===` |
| 691005265 → 691005265 | MŠ Montessori Beroun, ZŠ a SŠ s.r.o. → MŠ Montessori Beroun, ZŠ a SŠ s.r.o. | V Zahradách 1874, Beroun, 26601 → Plzeňská 75, Králův Dvůr, 26701 | `≠===` |
