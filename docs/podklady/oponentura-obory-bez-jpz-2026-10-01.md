# Oponentura návrhu: obory bez jednotné zkoušky (#209)

1. 10. 2026 · k `docs/navrh-obory-bez-jpz-2027.md` verze 1.0 (PR #230)

## Závěr

Návrh má dobrou inventuru. Jako podklad pro fázi 2 je ale ve stávající podobě slabý:
učební obory bere jako „maturitní obory bez bodů“. Do přehledů tak přibude 2 902 řádků,
ale obraz středního školství z toho nevznikne. Doporučení: před schválením přepracovat
oddíly 10 a 11 návrhu.

## Co je v návrhu dobře

- **Data už máme.** Návrh to doložil a čísla jdou zopakovat skriptem: 3 131 nabídek bez
  jednotné zkoušky s kapacitou, přihláškami, přijatými a důvody nepřijetí.
- **Nástavby L/51.** Zjištění, že všech 323 má jednotnou zkoušku a v katalogu už jsou,
  odpovídá na otázku, kterou zadání pokládalo.
- **Rejstřík jako doplněk.** Že nabídky určuje CERMAT a rejstřík jen doplňuje, je na třech
  nahlášených školách přesvědčivě doložené.
- **Žádné bodové ukazatele u oborů bez zkoušky.** To je správné rozhodnutí.

## Hlavní námitky

### 1. Obory jsou popsané tím, co jim chybí

Učební obory návrh definuje jako „bez jednotné zkoušky“, nový pojem zní „body tu nejsou“
a stránka oboru má mít „místo bodů“ náhradní důkazy. Rodina, která vybírá Kadeřníka nebo
Automechanika, se ale ptá jinak: jestli bude místo, jestli o obor někdo stojí a co přijde
po výučním listu. Pojem „obor s výučním listem“ by měl být hlavní, „bez jednotné zkoušky“
jen vysvětlující.

### 2. U učebních oborů rozhoduje, kolik zbývá míst, a 2. kolo návrh odkládá

Obsazenost po 1. kole 2026 (přijatí ku kapacitě, denní nezkrácené nabídky):

| | obsazenost | nabídek s volnými místy |
|---|---:|---:|
| obory se zkouškou | 84 % | 1 646 z 3 091 |
| H | 69 % | 1 372 z 1 776 |
| E | 58 % | 413 z 519 |

U H tedy zbyla místa ve čtyřech nabídkách z pěti. Návrh 2. kolo odbývá větou „podrobné
měření není součástí fáze 1“, přitom právě pro tyto obory nese podstatnou informaci.

### 3. Obtížnost přijetí slovy u velké části nabídek nepůjde spočítat

Práh ukazatele je 10 soutěžících uchazečů. Pod ním je:

| kategorie | nabídek pod prahem |
|---|---:|
| H | 36 % |
| E | 73 % |
| P (konzervatoře) | 83 % |
| C (praktické školy) | 91 % |

Návrh přesto staví tento ukazatel jako hlavní náhradu bodů. Zároveň přehlíží opačný konec:
109 nabídek H je v pásmu „těžší“ nebo „velmi těžké“. Učební obory, kam se těžko dostat, jsou
přesně ten rozdíl, který by přehledu dodal hloubku.

### 4. Vyřadit učební obory ze simulátoru jde proti tomu, jak se děti hlásí

V datech uchazečů 2026 má 50 749 dětí na přihlášce obor H nebo E. Z nich 20 588 (40 %)
je kombinuje s maturitním oborem (M, K, L) a 18 627 má maturitní obor na prvním místě
a učební jako pojistku. Učební obor je tedy nejčastější pojistka. Simulátor, který radí
s pořadím přihlášek, bez něj radí neúplně. Že u učebního oboru nejde spočítat šance podle
bodů, neznamená, že do strategie přihlášek nepatří.

### 5. Řazení odsune učební obory na konec

V oddílu 11 zní věta „řazení podle bodů nové nabídky vynechává na konec“. Na stránce města
to znamená, že učební obory budou soustavně dole. Web tím přenese hierarchii „maturita
nahoře, učební obor dole“, kterou data nedokládají. Potřebujeme řazení, které na bodech
nestojí, nebo oddělené skupiny.

### 6. Skupiny pro kohortu podle pozice na přihlášce jsou nesrovnatelné

Návrh je dělí podle typu školy (SOU s výučním listem a podobně). Do jedné skupiny tak
spadnou Kadeřník, Zedník i Kuchař – číšník, které mají úplně jiný zájem. Smysluplnější je
skupina oborů podle prvních dvou číslic kódu (23 strojírenství, 65 gastronomie a tak dál),
případně spolu s krajem.

### 7. Cílová skupina se posuzuje nestejně a chybí cesty dál

Nedenní formy návrh zamítá s tím, že nejsou pro uchazeče z 9. třídy. Denní nástavby L/51
ale v katalogu zůstávají, a ty jsou pro absolventy učebních oborů, ne pro deváťáky. Cestu
„výuční list, nástavba, maturita“ návrh nikde nepropojuje, přestože obě strany už v datech
jsou. Pro rodinu, která váhá mezi H a M, je to přitom klíčová informace. Dálková nástavba
je jen další krok téže cesty. Proto nedenní formy nezamítat plošně, ale ukázat je jako
pokračování učebního oboru.

### 8. Návrh měří jen jeden ročník, i když jsou data za dva

Agregáty 1. kola 2025 (`data/PZ2025_kolo1_skolobory_vysledky.xlsx`) nesou 3 146 nabídek
bez zkoušky ve stejném formátu (91 sloupců). Vývoj zájmu o učební obory za dva roky
(roste, klesá, které obory se vyprazdňují) by šel ukázat hned. Návrh to nezmiňuje
a stabilitu klíče nabídky odkládá jako otevřenou otázku.

### 9. Kategorie C a E jsou citlivá skupina

Praktické školy a obory E navštěvují často žáci se zdravotním postižením nebo z praktických
škol. Veřejný odznak obtížnosti a filtr podle ní u nich nejsou na místě. Otevřená otázka 3
návrhu („ověřit, zda patří cílové skupině“) je ve skutečnosti rozhodnutí o tom, jak o těchto
oborech mluvit, a to musí padnout v návrhu, ne v implementaci.

### 10. Několik zdrojů návrh vůbec nezvažuje

- **Infoabsolvent (NPI), nezaměstnanost absolventů po oborech a krajích.** Návrh
  `docs/navrh-vyuziti-nepouzitych-dat-2027.md` ho zamítl pro *stránku školy*. Pro *stránku
  oboru* má ale přesně správné členění a u učebních oborů je to údaj, který rodiny zajímá
  nejvíc. Zamítnutí kvůli formátu (PDF, tabulky jako obrázky) je v pořádku, mlčení ne.
- **Domovy mládeže a internáty v rejstříku MŠMT.** Rejstřík vede i školská zařízení. Učni
  často dojíždějí přes kraj a ubytování je pro ně praktická otázka.
- **Odborný výcvik u firem a stipendia krajů pro učně.** Data o nich nemáme. Návrh by to
  měl říct otevřeně, jak to projekt dělá u absolventů.

### 11. Hlášení #167 zůstane bez odpovědi

Škola nahlásila chybějící kombinovanou formu a návrh nedenní formy zamítá. To je platný
závěr, ale škola by měla v issue dostat vysvětlení, ne jen zavřené hlášení.

### 12. 227 nových stránek škol bude skoro prázdných

Tyto školy nemají maturitu ani body, takže oddíl „jak si škola vede“ bude mít nanejvýš
inspekci. Návrh neříká, co na takové stránce bude.

## Jak k přehledu, který obraz opravdu dá

Místo „katalog plus 2 902 řádků“ postavit fázi 2 na otázkách rodiny, která zvažuje učební
obor:

1. **Je tam místo?** Volná místa po 1. kole a výsledek 2. kola.
2. **Stojí o obor někdo?** Podíl prvních voleb a vývoj za roky 2025 a 2026.
3. **Kam se hlásí ostatní?** Souběžné přihlášky mezi učebními a maturitními obory, včetně
   učebního oboru jako pojistky v simulátoru.
4. **Co přijde potom?** Nástavba, maturita a případně nezaměstnanost absolventů daného
   oboru v kraji.
5. **Jak se tam dostanu?** Dojezd a ubytování.

Na stránce města a kraje navíc souhrn, jak se dělí místa mezi gymnázia, maturitní obory,
učební obory a obory E. Teprve tak web ukáže střední školství jako celek, ne jen maturitní
obory doplněné o ty bez zkoušky.

## Metoda měření v oponentuře

Měření je přibližné, jen pro oponenturu; než se čísla dostanou do návrhu, patří do
`scripts/mereni-obory-bez-jpz.py`. Čte jen místní soubory:

- `data/PZ2026_kolo1_skolobory_vysledky.xlsx`: denní nezkrácené nabídky s číselnou
  kapacitou, přihláškami a přijatými. Obsazenost = součet `PŘIJATÍ` / součet `KAPACITA`.
  Volná místa = `PŘIJATÍ` < `KAPACITA`. Kategorie podle písmene v kódu KKOV, obory se
  zkouškou podle `POVINNOST JPZ` = 1.
- Soutěžící uchazeči = `PŘIJATÍ` + `NEPŘIJATI - NEDOSTATEČNÁ KAPACITA` (slovník ukazatelů,
  „Soutěžící o obor“). Pásma obtížnosti podle podílu přijatých ze soutěžících: nad 2/3,
  nad 1/2, nad 1/3, zbytek; „těžší“ a „velmi těžké“ jsou dvě nejnižší pásma.
- `data/PZ2026_kolo1_uchazeci_prihlasky_vysledky.xlsx`: kategorie z `ss1_kkov` až
  `ss5_kkov`; pojistka = první volba M, K nebo L a některá další volba H nebo E.
- `data/PZ2025_kolo1_skolobory_vysledky.xlsx`: počet řádků s `POVINNOST JPZ` = 2.
