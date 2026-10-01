# Obory bez jednotné zkoušky a nedenní formy: průzkum zdrojů a návrh

Verze 1.0 · 1. 10. 2026 · Fáze 1 k issue #209 (pouze průzkum a návrh, web se nemění).
Fáze 2 (implementace) vznikne jako samostatné zadání po schválení návrhu.

## 1. Shrnutí a doporučení

**Hlavní zjištění: data o oborech bez jednotné zkoušky už máme.** Soubory CERMATu,
které projekt zpracovává, nesou vedle 3 237 nabídek s povinnou zkouškou i 3 131 nabídek
bez ní — a u nich kapacitu, přihlášky, přijaté, rozpad podle pořadí na přihlášce i důvody
nepřijetí. Import je dnes vyhazuje filtrem `is_valid_flat`
(`scripts/import_cermat_results.py`). Žádný nový zdroj shánět netřeba.

Doporučení:

1. **Fáze 2 přidá na web denní nezkrácené nabídky bez jednotné zkoušky: 2 902 nabídek**
   (H 1 777, E 524, umělecké M 216, C 200, konzervatoře P 146, umělecké L 31, J 8),
   s 52 685 místy a 112 667 přihláškami v 1. kole 2026.
2. **Nedenní formy se na web nepřidají.** Cílová skupina jsou uchazeči z 9. třídy;
   dálkové, kombinované, večerní a distanční studium (253 nabídek, 1,7 % přihlášek)
   míří převážně na dospělé: 72 nabídek jsou nástavby a zbytek zkrácená nebo dálková
   studia vedle zaměstnání. Stejně se nepřidá zkrácené studium (167 nabídek).
3. **Nástavby L/51 se neřeší: všech 323 má jednotnou zkoušku** a v katalogu už jsou.
4. U nabídek bez zkoušky se ukáže vše, co agregáty nesou (místa, přihlášky, přijatí,
   pořadí na přihlášce, důvody nepřijetí, odvozené podíly včetně obtížnosti slovy).
   **Body, percentily, pásma ani předpověď dalšího roku u nich nebudou** — výsledkové
   sloupce jsou u všech 3 131 nabídek prázdné.
5. Pokrytí karet DiPSy u nabídek bez zkoušky se z místních souborů změřit nedá
   (oddíl 6); změří se v přípravě fáze 2. Do té doby se neslibuje zobrazení kritérií
   ani bodování u těchto oborů.

Všechna čísla v dokumentu reprodukuje:

```sh
python3 scripts/mereni-obory-bez-jpz.py
```

Doklad: `docs/podklady/mereni-obory-bez-jpz-2026.json`. Skript čte pouze místní soubory,
na síť se nedotazuje.

## 2. Metoda

Prošly se `docs/zdroje-dat.md` celý včetně oddílu 3, `docs/slovnik-ukazatelu.md`,
`docs/slovnik-pojmu.md` a `docs/dvoulety-cyklus-nabidky-oboru.md`. Zvážené nepoužité
sloupce jsou v oddílu 12.

Zdroje měření (vše místní, období z registru `public/stav_datovych_sad.json`):

| Zdroj | Soubor | Období |
|---|---|---|
| CERMAT agregáty 1. kola | `data/PZ2026_kolo1_skolobory_vysledky.xlsx` | 2026 |
| CERMAT agregáty 2. kola | `data/PZ2026_kolo2_skolobory_vysledky.xlsx` | 2026 |
| CERMAT data uchazečů | `data/PZ2026_kolo1_uchazeci_prihlasky_vysledky.xlsx` | 2026 |
| Rejstřík MŠMT | `data/msmt_rejstrik/rssz-2026-06-30.jsonld` | 2026-06-30 |
| Katalog webu | `public/schools_data.json`, ročník 2026 | 2026 |
| Přepis kritérií | `public/kriteria_prijeti_2026.json` | 2026 |

## 3. CERMAT agregáty 1. kola 2026: nabídky bez zkoušky v souborech jsou

Soubor má 6 368 řádků. Sloupec `POVINNOST JPZ` nese 1 (koná se) u 3 237 z nich
a 2 (nekoná se) u 3 131 z nich.

### 3.1 Co import vyhazuje a proč

Filtr `is_valid_flat` pouští jen denní nezkrácené nabídky s povinnou zkouškou.
Projde jím 3 091 řádků (katalog 2026). Důvody vyřazení zbytku:

| Důvod vyřazení | Řádků |
|---|---:|
| bez jednotné zkoušky (denní, nezkrácené) | 2 902 |
| zkrácené studium bez zkoušky | 122 |
| nedenní forma (se zkouškou) | 146 |
| nedenní forma + zkrácené + bez zkoušky | 45 |
| nedenní forma + bez zkoušky | 62 |

### 3.2 Rozpad podle kategorie oboru

| Kategorie | S JPZ | Bez JPZ |
|---|---:|---:|
| C (praktická škola) | 0 | 202 |
| E (nižší střední odborné) | 0 | 525 |
| H (výuční list) | 0 | 1 946 |
| J (střední bez maturity i výučního listu) | 0 | 9 |
| K (gymnázia) | 790 | 0 |
| L | 681 | 32 |
| M | 1 766 | 239 |
| P (konzervatoře) | 0 | 178 |

L bez zkoušky je 31 uměleckých nástaveb 82-51-L/01 až /06 (talentová zkouška) a jedna
zkrácená Kosmetická služba 69-41-L/01 bez čísel. M bez zkoušky je 216 uměleckých oborů
82-41-M a 82-42-M (talentová zkouška) a 23 dálkových, kombinovaných nebo zkrácených
nabídek běžných M oborů (z toho 16× Předškolní a mimoškolní pedagogika 75-31-M/01).

**Nástavby L/51 (kódy `-L/5x`) mají jednotnou zkoušku všechny: 323 nabídek.**
Samostatný problém „L5“ z titulku zadání tedy neexistuje; nástavby denní i dálkové
s povinnou zkouškou katalog už vede. Bez zkoušky jsou jen umělecké L s talentovkou.

### 3.3 Populace „chybějícího katalogu“: denní, nezkrácené, bez zkoušky

| Kategorie | Nabídek | Místa | Přihlášky | Přijatí |
|---|---:|---:|---:|---:|
| H | 1 777 | 40 110 | 92 398 | 27 583 |
| E | 524 | 6 385 | 9 354 | 3 680 |
| M (umělecké) | 216 | 3 470 | 7 366 | 2 718 |
| C | 200 | 1 442 | 1 272 | 802 |
| P (konzervatoře) | 146 | 810 | 1 698 | 611 |
| L (umělecké) | 31 | 362 | 422 | 194 |
| J | 8 | 106 | 157 | 70 |
| **Celkem** | **2 902** | **52 685** | **112 667** | **35 658** |

Součet 112 667 přihlášek se shoduje s měřením z 18. 9. 2026 (projektové poznámky).
Všechny nabídky kromě pěti konzervatorních z 5. třídy přijímají z 9. ročníku,
takže patří cílové skupině webu.

Z 2 902 nabídek jich 53 (1,8 %) nenese ani počty přihlášek (26 konzervatorních,
19 C, 5 E, 3 ostatní). U nich se ukáže jen název, kapacita a značka bez údajů.

### 3.4 Které sloupce jsou u nabídek bez zkoušky vyplněné

U všech 3 131 nabídek bez zkoušky je vyplněná identifikace (škola, adresa, kraj,
zřizovatel, obor, zaměření u 1 303), `KAPACITA`, `FORMA VZDĚLÁVÁNÍ`, `DÉLKA STUDIA`,
`TYP ŠKOLY` a `SKUPINA OBORŮ (16)`. U 3 039 z nich (97 %) jsou dále přihlášky
celkem, rozpad přihlášek i přijatých podle pořadí na přihlášce a všechny čtyři
důvody nepřijetí.

**Výsledkové sloupce 45 až 86 (konající, procentní skóry, percentily) jsou u všech
3 131 nabídek prázdné.** Z agregátů proto u těchto nabídek nelze spočítat nic,
co stojí na bodech: ani průměr, ani minimum, ani pásma.

Typ školy u nabídek bez zkoušky: SOU s výučním listem 2 471, SOU bez výučního listu
211, SOŠ 239 (umělecké M), konzervatoře 178, SOU 32. Skupiny `SKUPINA OBORŮ (16)`:
UVL 2 471, UBV 211, KON 178, UOS 32 a umělecké skupiny ST2/SUM/SHU/ST1/SZD. Skupiny
UVL, UBV a KON nemají protějšek v maturitních datech (oddíl 10); umělecké skupiny ano.

## 4. CERMAT agregáty 2. kola 2026

Soubor 2. kola má 2 707 řádků, z toho **1 556 bez jednotné zkoušky**
(H 1 024, E 304, M 98, C 70, L 23, P 32, J 5). I pro 2. kolo tedy existují stejná
data jako pro 1. kolo a fáze 2 je zobrazí stejným mechanismem jako u oborů se zkouškou
(`docs/druhe-kolo.md`). Podrobné měření 2. kola není součástí fáze 1.

## 5. CERMAT data uchazečů 2026: obory H na přihláškách jsou

Soubor má 156 210 uchazečů a 424 353 voleb. Forma voleb: denní 416 537, dálková
4 983, kombinovaná 1 747, den2 584, distanční 416, večerní 86.

- **47 707 uchazečů (30,5 %) má na přihlášce aspoň jeden obor H.** Data o souběhu
  a výsledku uchazečů o obor tedy pro H obory existují; generátory je dnes jen
  nevydávají pod klíčem H oboru (oddíl 10).
- 5 503 uchazečů (3,5 %) má aspoň jednu nedenní volbu.
- 37 004 uchazečů (23,7 %) nemá výsledek jednotné zkoušky — to jsou převážně
  uchazeči o obory bez zkoušky a o konzervatoře.

Sloupec `ss*_zrizovatel` na otázku, kam se děti hlásí, neodpovídá, a proto se
nepoužije (stejný závěr jako u oborů se zkouškou).

## 6. Rejstřík MŠMT: říká, co škola smí učit, ne co vypsala

Snímek k 30. 6. 2026 vede u středních škol a konzervatoří (druhy C00, D00)
7 828 záznamů oborů na 1 362 školách, z toho 723 dobíhajících. Formy: denní 7 024,
dálková 566, večerní 79, kombinovaná 43, distanční 116. Největší skupiny: H denní
2 109, M denní 2 016, L denní 810, K denní 744, E denní 661.

Rejstřík je pro fázi 2 **doplňkový zdroj**, ne zdroj nabídek:

- Neříká, co škola v daném roce vypsala. Ve vzorku 30 škol (oddíl 8) je 37 záznamů
  rejstříku bez řádku CERMATu — typicky obory, které škola v roce 2026 nevypsala
  (včetně dálkových forem a Cestovního ruchu u školy 600014231), a staré trojmístné
  kódy, které se nesmí normalizovat (`docs/zdroje-dat.md`, oddíl 3).
- Forma v rejstříku a forma v CERMATu se nemusí shodovat: škola 600006832 vede
  Předškolní pedagogiku v denní, dálkové a distanční formě, ale CERMAT 2026 nese
  denní a **kombinovanou** — kombinovanou rejstřík u školy vůbec nevede (oddíl 8.1).
  Párovat se proto musí nabídka CERMATu, ne záznam rejstříku.
- Povolená kapacita oboru v rejstříku se nepoužije: ukazuje se vypsaná kapacita
  z CERMATu (stejný závěr jako u oborů se zkouškou).
- Příznak `dobihajiciObor` se použije stejně jako u oborů se zkouškou: jen
  k rozlišení „obor se už nenabírá“ u nevypsané nabídky, párovat vždy včetně formy
  a délky. U školy 600014231 je dobíhající 23-55-H/01 správně mimo nabídku 2026.

## 7. DiPSy: pokrytí u nabídek bez zkoušky se z místních souborů nedá změřit

Přepis kritérií `public/kriteria_prijeti_2026.json` pokrývá **0 ze 3 131 nabídek
bez zkoušky** — vznikal jen nad katalogem. Místní sběr karet (`data/dipsy-kriteria-2026/`)
v tomto checkoutu není a dotaz na `api.dipsy.gov.cz` je mimo povolený rozsah fáze 1
(zadání, omezení).

Co o DiPSy víme z `docs/zdroje-dat.md`, oddíl 2.16, a platí i pro nabídky bez zkoušky:

- Karta nabídky nese `id` (páruje se s `ID_SOF` v CERMATu, který mají i nabídky
  bez zkoušky všechny), `kapacita`, `konaJPZ`, `talentovy`, `kategorieVzdelani`
  a odkaz na PDF kritérií. Identita pro párování tedy existuje.
- Odpověď na otázku „podle čeho škola u učebního oboru řadí“ (prospěch, pohovor,
  školní zkouška) vyžaduje čtení konkrétního PDF, stejně jako u oborů se zkouškou;
  příznaky `konaJPZ` ani `skolniCast` ji samy nedají.
- Úspěšná odpověď API nedokazuje existenci ročníku; při sběru se musí ověřit rok
  každého záznamu.

**Doporučení:** v přípravě fáze 2 se nejdřív ověří dostupnost karet 2026 pro vzorek
nabídek bez zkoušky (skript `scripts/dipsy-kriteria-scan.py --rok 2026` nad jejich
`ID_SOF`), a teprve podle výsledku se rozhodne, zda fáze 2 přinese i kritéria,
nebo jen čísla z CERMATu. Návrh tímto kritéria u oborů bez zkoušky **neslibuje**.

## 8. Srovnání tří nahlášených škol

### 8.1 Škola 600006832 (#167)

Rejstřík 6 záznamů, CERMAT 6 řádků (1 bez zkoušky), katalog 6 nabídek. Chybějící
kombinovaná Předškolní pedagogika existuje v CERMATu: kapacita 90, 46 přihlášek,
36 přijatých. Dálkovou formu škola v roce 2026 nevypsala (v CERMATu není) a
kombinovanou rejstřík nevede — nabídka CERMATu je tu přesnější než rejstřík.
Distanční formu z rejstříku CERMAT nezná vůbec.

### 8.2 Škola 600014231 (#170)

Rejstřík 19 záznamů, CERMAT 16 řádků (7 bez zkoušky: 6× H včetně dvou zaměření
Elektrikáře), katalog 9 nabídek. V katalogu chybí právě nahlášených šest oborů H
s plnými čísly (např. Kadeřník: kapacita 30, 100 přihlášek, 27 přijatých).
V CERMATu proti rejstříku chybí dobíhající 23-55-H/01 (správně, obor se nenabírá),
nevypsaný Cestovní ruch 65-42-M/02 a obě dálkové formy — škola je v roce 2026
nevypsala. Nástavba Podnikání 64-41-L/51 denní má jednotnou zkoušku a v katalogu je.

### 8.3 Škola 600170233 (#174)

Rejstřík 8 záznamů, CERMAT 8 řádků (3 bez zkoušky), katalog 5 nabídek. Shoda
rejstříku s CERMATem je úplná. Čísla nahlášených oborů sedí přesně:
Kuchař – číšník 30/74, Cukrář 15/71, Aranžér 15/41 (místa/přihlášky).
U Předškolní pedagogiky vede CERMAT 76 přihlášek proti 77 udávaným školou —
ručně se neupravuje (komentář v #174).

## 9. Srovnání vzorku 30 škol

Náhodný vzorek 30 škol z průniku CERMATu a rejstříku (seed 209, REDIZO v dokladu):

| | Počet |
|---|---:|
| Záznamů oborů v rejstříku | 215 |
| z toho bez řádku CERMATu 2026 (nevypsáno, jiná forma, starý kód) | 37 |
| Řádků CERMATu 2026 | 179 |
| z toho bez jednotné zkoušky | 82 |
| Řádků CERMATu bez záznamu v rejstříku | 0 |
| Nabídek v katalogu 2026 | 93 |

Katalog tedy ve vzorku pokrývá 93 ze 179 vypsaných nabídek (52 %). Každý řádek
CERMATu má protějšek v rejstříku na úrovni kódu; opačně to neplatí, protože
rejstřík vede i nevypsané obory a formy. To potvrzuje volbu CERMATu jako zdroje
nabídek a rejstříku jako doplňku.

Rozšíření katalogu o denní nezkrácené nabídky bez zkoušky přidá obory na
**654 školách**. Z 1 337 škol v agregátech jich má 660 jen nabídky se zkouškou,
**227 jen nabídky bez zkoušky** (ty dnes na webu nejsou vůbec) a 450 obojí.

## 10. Co se u oboru bez zkoušky ukáže a co ne

### 10.1 Ukazatele, které fungují beze změny výpočtu

Všechny stojí na sloupcích, které jsou u nabídek bez zkoušky vyplněné (oddíl 3.4).
Název, vzorec ani jednotka se nemění; ve slovníku ukazatelů se u nich jen rozšíří
rozsah platnosti na nabídky bez zkoušky (oddíl 13):

Kapacita míst, Přihlášky celkem, Přihlášky podle priority, První priority, Podíl
prvních voleb, Přihlášky na místo, Tlak prvních voleb, Naplněnost, Přetlak, Přijatí,
Nepřijatí kvůli kapacitě, Nepřijatí pro nesplnění podmínek, Přijati na vyšší
prioritu, Přijatí podle priority, Vzdali se přijetí, Soutěžící o obor, Podíl
přijatých ze soutěžících, Obtížnost přijetí slovy.

Poznámky k jednotlivým:

- **Obtížnost přijetí slovy** se počítá z podílu přijatých ze soutěžících, který
  body nepotřebuje. Prahy (třetina, polovina, dvě třetiny) i práh 10 soutěžících
  platí stejně; rozdělení do stupňů se po přepočtu zapíše do slovníku.
- **Kohorta podle pozice na přihlášce** vyžaduje srovnatelnou skupinu. Nabídky bez
  zkoušky tvoří vlastní skupiny podle `TYP ŠKOLY` (SOU s výučním listem, SOU bez
  výučního listu, konzervatoře) a umělecké M/L se řadí ke svým skupinám ST/SH/SUM;
  práh 30 nabídek ve skupině platí stejně.
- **Pořadí v kraji** se počítá jen podle zájmu, ne podle výsledků přijatých
  (ty nejsou).
- **Odvozená hranice úspěšnosti** se nepočítá: zkouší součet bodů a slabší test,
  obojí chybí.
- U **nepřijatých pro nesplnění podmínek** se nepíše věta o minimech bodů; odkaz
  na kritéria školy zůstává.

### 10.2 Ukazatele, které u oborů bez zkoušky nebudou

Vše postavené na bodech jednotné zkoušky: Průměr JPZ přijatých, Historický průměr
JPZ, Nejnižší výsledek JPZ mezi přijatými, Medián JPZ přijatých, Průměrná
percentilová umístění, Podíl přijatých podle bodového pásma, Rozhodl test, Pásmo
nejistoty, Poloha vůči pásmu, Percentil nejnižšího přijatého, Převedený výsledek
testu, Pořadí mezi soutěžícími, Nejslabší přijatý v předmětu, Podlaha slabšího
předmětu, Nevyrovnaní přijatí, Hustota u hranice, Podíl přijímaček na bodování
(dokud nebudou kritéria z DiPSy).

### 10.3 Ukazatele z dat uchazečů: data existují, generátory je musí vydat

Souběžné přihlášky, Výsledek uchazečů o obor a Obory výš a níž stojí na
`ss*_redizo`, `ss*_kkov`, `ss*_prijat` a `ss*_duvod_neprijeti`, které volby
H oborů nesou stejně jako volby se zkouškou. Generátory dnes berou jen denní
přihlášky (což H volby splňují), ale klíče H oborů nevydávají. Fáze 2 je vydá;
mez 10 uchazečů platí stejně.

### 10.4 Maturita

Napojení přes `SKUPINA OBORŮ (16)` funguje jen tam, kde má skupina protějšek
v maturitních datech: umělecké M/L (ST1, ST2, SHU, SUM, SZD, UOS). Skupiny UVL,
UBV a KON (H, E, C, J, P) protějšek nemají — učební obory a konzervatoře maturitu
ve společné části nekonají. Stránka oboru H/E/C/J/P proto oddíl maturity nemá;
u uměleckých M/L je stejný jako u oborů se zkouškou.

### 10.5 Druhé kolo

Data 2. kola pro nabídky bez zkoušky existují (oddíl 4); zobrazí se stejným
mechanismem jako u oborů se zkouškou.

## 11. Dopad na stránky

- **Stránka školy.** Přibudou obory bez zkoušky s plnými čísly (oddíl 10.1) a bez
  bodových bloků. Vznikne 227 nových stránek škol, které dnes na webu nejsou.
  Podnadpis pod názvem školy se skládá ze všech oborů včetně nových.
- **Stránka oboru.** Tři otázky zůstávají, důkazy se liší: místo bodů a pásem
  nastoupí tlak prvních voleb, obtížnost slovy a rozpad výsledku (přijatí,
  nevešli se, nedosáhli požadavku školy). Chybějící body se vysvětlí větou
  z oddílu 13, nikdy prázdným blokem.
- **Stránka města a přehled kraje.** Nové nabídky vstupují do karet a filtrů;
  filtr podle obtížnosti funguje (obtížnost slovy existuje), řazení podle bodů
  nové nabídky vynechává na konec, stejně jako dnes obory bez hodnoty.
- **Vyhledávání.** Nabídky bez zkoušky se vyhledávají stejně; značka „bez jednotné
  zkoušky“ zůstává jako filtr i vysvětlení.
- **Simulátor přijímaček.** Nabídky bez zkoušky do skupin podle výsledku
  nepatří (není s čím srovnávat) a do simulátoru se nepřidají. Výjimka se
  nedělá ani pro umělecké obory s talentovkou: cvičný test TAU s ní nesouvisí.
- **Značky „bez jednotné zkoušky“ a „mimo přehled“.** První zůstává a nově vede
  na vlastní stránku oboru; význam „přehled je zatím nezahrnuje“ se přepíše
  (oddíl 13). Druhá zůstává pro nedenní formy a ostatní nezahrnuté obory.

## 12. Zvážené nepoužité sloupce

Povinný krok podle `docs/zdroje-dat.md` a `.claude/claude.md`. U každého sloupce
nebo pole, které by mohlo nabídky bez zkoušky živit, je verdikt a důvod:

| Sloupec (zdroj) | Verdikt | Důvod |
|---|---|---|
| Výsledkové sloupce 45–86 agregátů (konající, skóry, percentily) | nepoužít | u všech 3 131 nabídek bez zkoušky prázdné (změřeno, oddíl 3.4) |
| `PŘIHLÁŠKY CELKEM`, priority, `PŘIJATÍ`, důvody nepřijetí 87–90 | **použít** | vyplněné u 97 % nabídek; základ všech ukazatelů v oddílu 10.1 |
| `KAPACITA` | **použít** | vyplněná u všech 3 131 nabídek |
| `SKUPINA OBORŮ (16)` | **použít** | vyplněná u všech; srovnatelné skupiny a maturitní napojení uměleckých oborů |
| `ss*_redizo`, `ss*_kkov`, `ss*_prijat`, `ss*_duvod_neprijeti` (data uchazečů) | **použít** | souběh a výsledek uchazečů pro H obory (oddíl 10.3) |
| `c_m_procentni_skor` a předmětové skóry | nepoužít | u uchazečů o obory bez zkoušky nevyplněné (37 004 uchazečů bez výsledku) |
| `ss*_zrizovatel` | nepoužít | neodpovídá na otázku, kam se děti hlásí (stejný závěr jako u JPZ) |
| Rejstřík `obory[].kod`, `.nazev` | **použít** | názvy oborů jako dnes (záloha pro `mimo_prehled` a souběh) |
| Rejstřík `obory[].kapacita` | nepoužít | povolená kapacita, ne vypsaná místa; ukazuje se CERMAT |
| Rejstřík `dobihajiciObor` | **použít** | „obor se už nenabírá“ i u H/E, stejná pravidla (forma + délka, jen u nevypsané nabídky) |
| Rejstřík `formaVzdelavani`, `delkaVzdelavani` | **použít** | jen k párování dobíhajícího příznaku; nabídky určuje CERMAT |
| Rejstřík `reditel`, `emaily`, CSV telefon/e-mail | nepoužít | osobní údaje bez vypovídací hodnoty (zákaz zadání) |
| AKKO `platnostOd`, `platnostDo` | nepoužít | celostátní platnost kódu, ne informace o škole |
| DiPSy `podminkyProPrijeti` (PDF kritérií) | zatím nepoužít | jediný možný zdroj bodování u H; pokrytí nezměřeno, změří příprava fáze 2 (oddíl 7) |
| DiPSy `skolniCast`, `typyPriloh` | nepoužít bez PDF | samy neříkají, jak škola řadí (stejný závěr jako u JPZ) |
| DiPSy `kapacita`, `konaJPZ`, `kategorieVzdelani` | nepoužít | duplicitní s CERMATem; aktuální hodnota DiPSy se nepřebírá |
| DiPSy `vysledkyPrijeti`, `/app/public-stats` | nepoužít | přijaté máme z CERMATu; PDF výsledků mohou nést údaje o jednotlivcích |
| Maturitní bloky společné části, češtiny, matematiky | nepoužít u H/E/C/J/P | skupiny UVL/UBV/KON v datech nejsou; u uměleckých M/L použít stejně jako u JPZ |
| Maturitní cizí jazyky | nepoužít | malé skupiny a samovýběr (stejný závěr jako u JPZ) |
| Položková data JPZ | nepoužít | uchazeči o obory bez zkoušky testy nepsali |
| Agregáty 2. kola | **použít** | 1 556 nabídek bez zkoušky (oddíl 4) |
| Data uchazečů 2. kola (pásma) | nepoužít | pásma zamítnuta už u JPZ (málo přijatých s výsledkem) |
| Školní agregáty JPZ 2017–2023 | nepoužít | jen obory se zkouškou; soubory nejsou stažené |
| INSPIS, inspekce, doprava, veletrhy, RSS, harmonogram | beze změny | s nabídkami bez zkoušky nesouvisejí; stránky nových škol je dostanou automaticky |

## 13. Návrh pojmů (podklad pro slovník pojmů)

Nové ani měněné pojmy se ve fázi 1 do slovníku nezapisují; fáze 2 je zapíše
v dávce, ve které se poprvé objeví na stránce. Návrh znění:

- **obor bez jednotné zkoušky** (úprava): „obor, u kterého se jednotná přijímací
  zkouška nekoná: kategorie C, E, H, J a P, například učební obory s výučním
  listem“. Věta pod tabulkou se přepíše, protože obory už mají vlastní stránku:
  „Obory bez jednotné zkoušky, například učební obory s výučním listem, mají
  vlastní stránku; body u nich nejsou, protože se jednotná zkouška nekoná.“
- **body tu nejsou** (nový pojem pro stránku oboru bez zkoušky): „body tu nejsou,
  protože se jednotná zkouška nekoná; škola řadí podle svých kritérií“.
  Nepoužívat: „bez bodů“, „nehodnoceno“.
- **výuční list** (nový pojem): „výuční list, tedy doklad o vyučení v oboru“.
  Nepoužívat: „učňák“, „výučák“.

## 14. Návrh ukazatelů (podklad pro slovník ukazatelů)

Nový ukazatel není potřeba žádný: vše, co se u nabídek bez zkoušky ukáže,
počítají existující ukazatele z oddílu 10.1. Ve fázi 2 se u každého z nich
doplní rozsah platnosti („platí i pro nabídky bez jednotné zkoušky“),
u Obtížnosti přijetí slovy a Podílu prvních voleb nové rozdělení ročníku
a u Kohorty podle pozice na přihlášce nové srovnatelné skupiny. Zápis vznikne
v dávce s implementací, ne dřív — údaj bez hotového výpočtu se nezavádí.

## 15. Návrh zápisu do registru datových sad

Nová sada není potřeba žádná: nabídky bez zkoušky nesou tytéž soubory CERMATu
jako nabídky se zkouškou (`cermat-kapacity`, `cermat-prihlasky`, `cermat-vysledky`,
`cermat-uchazeci-kolo1`, `cermat-kolo2-agregaty`). Ve fázi 2 se u těchto sad
doplní výstupy o rozšířené soubory a ukazatele zůstanou tytéž. Registr se ve
fázi 1 nemění (omezení zadání); přepnutí období se řídí stávajícími sadami.

## 16. Otevřené otázky pro fázi 2

1. Pokrytí karet DiPSy u nabídek bez zkoušky (oddíl 7): přinesou se i kritéria,
   nebo jen čísla z CERMATu?
2. Konzervatoře (P): 43 ze 178 nabídek nenese ani počty přihlášek a přijímají
   i z 5. třídy; talentové řízení běží mimo jednotný harmonogram. Ukázat s výhradou,
   nebo až s kritérii z DiPSy?
3. Kategorie C a J (208 nabídek): praktické školy a střední vzdělání bez maturity
   i výučního listu; ověřit v přípravě fáze 2, zda patří stejné cílové skupině.
4. Stabilita klíče nabídky mezi roky u H oborů pro párování ročníků a dvouletý
   cyklus (`docs/dvoulety-cyklus-nabidky-oboru.md`).
5. Generátory souběhu a kontextu: vydat klíče H/E oborů; ověřit nulový rozdíl
   popisů jako u oborů se zkouškou.

## 17. Historie

| Verze | Změna |
|---|---|
| 1.0 | První návrh (fáze 1, issue #209). |


...[truncated 16692 chars]