# Obory bez jednotné zkoušky a nedenní formy: průzkum zdrojů a návrh

Verze 1.6 · 6. 10. 2026 · Fáze 1 k issue #209 (pouze průzkum a návrh, web se nemění).
Fáze 2 (implementace) vznikne jako samostatné zadání po schválení návrhu.
Verze 1.1 vypořádává oponenturu (`docs/podklady/oponentura-obory-bez-jpz-2026-10-01.md`);
vypořádání je v oddílu 17, oddíly 10 a 11 jsou přepsané. Verze 1.1 byla schválena
1. 10. 2026. Verze 1.2 doplňuje odpovědi z etapy 0 fáze 2 (issue #244, oddíl 16.1)
a z nich plynoucí pojem pro kategorii J a skupiny souhrnu míst (oddíly 13 a 14).

## 1. Shrnutí a doporučení

**Hlavní zjištění: data o oborech bez jednotné zkoušky už máme.** Soubory CERMATu,
které projekt zpracovává, nesou vedle 3 237 nabídek s povinnou zkouškou i 3 131 nabídek
bez ní — a u nich kapacitu, přihlášky, přijaté, rozpad podle pořadí na přihlášce i důvody
nepřijetí. Import je dnes vyhazuje filtrem `is_valid_flat`
(`scripts/import_cermat_results.py`). Žádný nový zdroj shánět netřeba.

Doporučení:

1. **Fáze 2 přidá na web denní nezkrácené nabídky bez jednotné zkoušky: 2 902 nabídek**
   (H 1 777, E 524, umělecké M 216, C 200, konzervatoře P 146, umělecké L 31, J 8),
   s 52 685 místy a 112 667 přihláškami v 1. kole 2026. Mluví se o nich jako
   o **učebních oborech**, „bez jednotné zkoušky“ je jen vysvětlení (oddíl 13).
2. **Nedenní formy se plošně nepřidají, výjimkou jsou nedenní nástavby L/51.**
   Dálkové, kombinované, večerní a distanční studium (253 nabídek, 1,7 % přihlášek)
   míří převážně na dospělé; zkrácené studium (167 nabídek) také. Výjimka: 72
   nedenních nástaveb se ukáže jako pokračování učebního oboru („kam dál“),
   ne jako nabídka pro deváťáky (oddíl 10.6).
3. **Nástavby L/51: všech 323 má jednotnou zkoušku; v katalogu je 251 denních.**
   Zbývajících 72 nedenních filtr formy vyhazuje (oprava chyby verze 1.0, oddíl 3.2).
   Denní nástavby se z katalogu nevyřazují (existující stránky a adresy).
4. U nabídek bez zkoušky se ukáže vše, co agregáty nesou, v čele se **zbylými místy
   po 1. kole, výsledkem 2. kola, tlakem prvních voleb a vývojem 2025–2026**.
   Obtížnost slovy jen tam, kde je aspoň 10 soutěžících (u E, P a C většinou není).
   **Body, percentily, pásma ani předpověď dalšího roku u nich nebudou** — výsledkové
   sloupce jsou u všech 3 131 nabídek prázdné. U C, E, J a P se nezobrazuje odznak
   obtížnosti ani filtr podle ní (oddíl 10.1; J a P doplněny ve verzi 1.2).
5. Pokrytí karet DiPSy u nabídek bez zkoušky změřila etapa 0 fáze 2 (oddíl 16.1):
   kartu s PDF podmínek přijetí má každá nabídka. Stránka učebního oboru proto
   dostane odkaz na PDF v DiPSy. Přepis kritérií, body ani minima se nezobrazují,
   přepis je samostatné zadání.

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
| CERMAT agregáty 1. kola | `data/PZ2025_kolo1_skolobory_vysledky.xlsx` | 2025 |
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
Rozpad: 251 denních nezkrácených, 55 dálkových, 12 kombinovaných, 5 distančních.
Samostatný problém „L5“ z titulku zadání tedy neexistuje. **Oprava proti verzi 1.0:**
katalog vede jen 251 denních nástaveb; 72 nedenních vyhazuje filtr formy
(`is_valid_flat` vyžaduje „den“ ve formě), přestože zkoušku mají. Bez zkoušky
jsou jen umělecké L s talentovkou.

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

### 3.5 Obsazenost po 1. kole 2026

Jen denní nezkrácené nabídky s číselnou kapacitou, přihláškami a přijatými.
Obsazenost = součet `PŘIJATÍ` / součet `KAPACITA`; volná místa = `PŘIJATÍ` < `KAPACITA`.

| | Obsazenost | Nabídek s volnými místy |
|---|---:|---:|
| Obory se zkouškou | 84 % | 1 646 z 3 091 |
| H | 69 % | 1 372 z 1 776 |
| E | 58 % | 413 z 519 |
| M (umělecké) | 78 % | 115 z 215 |
| C | 60 % | 124 z 181 |
| P (konzervatoře) | 81 % | 59 ze 120 |
| L (umělecké) | 56 % | 25 ze 30 |
| J | 66 % | 5 z 8 |

U H tedy zbyla místa ve čtyřech nabídkách z pěti. Zbylá místa po 1. kole jsou
proto první údaj stránky učebního oboru (oddíl 11).

### 3.6 Práh 10 soutěžících a pásma obtížnosti u H

Soutěžící = `PŘIJATÍ` + `NEPŘIJATI - NEDOSTATEČNÁ KAPACITA`. Pod prahem
10 soutěžících, pod kterým se zařazení obtížnosti nezobrazuje:

| Kategorie | Nabídek | Pod prahem | Podíl |
|---|---:|---:|---:|
| H | 1 776 | 641 | 36 % |
| E | 519 | 379 | 73 % |
| M (umělecké) | 215 | 70 | 33 % |
| C | 181 | 164 | 91 % |
| P (konzervatoře) | 120 | 99 | 83 % |
| L (umělecké) | 30 | 24 | 80 % |
| J | 8 | 6 | 75 % |

Rozdělení 1 135 nabídek H nad prahem do stupňů obtížnosti: kapacita nerozhodovala
574, dostala se většina 302, středně těžké 164, **těžké 78, velmi těžké 17**.
Učebních oborů, kam je těžké se dostat, je tedy 95 (všechny nad prahem).
Oponentura uváděla 109; číslo se nepodařilo zopakovat (ani se započtením všech
forem, kde vychází 108) a návrh používá 95 — viz vypořádání O3 v oddílu 17.

### 3.7 Srovnávací ročník 2025

Soubor `data/PZ2025_kolo1_skolobory_vysledky.xlsx` má stejných 91 sloupců se
stejnými názvy (ověřeno: 0 rozdílů v hlavičkách) a 6 351 řádků, z toho **3 146
bez jednotné zkoušky** a 2 916 denních nezkrácených bez zkoušky. Vývoj zájmu
(2025 → 2026) se proto u nabídek bez zkoušky ukáže stejným mechanismem jako
u oborů se zkouškou; párování nabídek mezi roky zůstává práci fáze 2 (oddíl 16).

## 4. CERMAT agregáty 2. kola 2026

Soubor 2. kola má 2 707 řádků, z toho **1 556 bez jednotné zkoušky**:

| Kategorie | Nabídek ve 2. kole |
|---|---:|
| H | 1 024 |
| E | 304 |
| M | 98 |
| C | 70 |
| L | 23 |
| P | 32 |
| J | 5 |

I pro 2. kolo tedy existují stejná data jako pro 1. kolo a fáze 2 je zobrazí
stejným mechanismem jako u oborů se zkouškou (`docs/druhe-kolo.md`). Pro učební
obory je 2. kolo podstatné: po 1. kole zbyla místa v 1 372 z 1 776 nabídek H
a ve 413 z 519 nabídek E (oddíl 3.5). Párování nabídek 2. kola s 1. kolem zůstává
práci fáze 2 (stejný klíč jako u oborů se zkouškou).

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

### 5.1 Učební obor jako pojistka

V datech uchazečů 2026 má **50 749 dětí** na přihlášce obor H nebo E. Z nich
**20 588 (41 %)** je kombinuje s maturitním oborem (M, K, L) a **18 627** má
maturitní obor na prvním místě a učební jako pojistku (první neprázdná volba;
při doslovném čtení sloupce `ss1_kkov` 18 611 — rozdíl 16 dětí se zpětvzatou
první prioritou). Učební obor je tedy nejčastější pojistka a simulátor ho musí
umět zapojit do strategie (oddíl 11).

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

> **Stav k verzi 1.2:** změřeno v etapě 0 fáze 2 (oddíl 16.1, bod 1). Kartu s PDF
> podmínek přijetí má všech 2 902 denních nezkrácených nabídek. Platí doporučení
> z oddílu 16.1: odkaz na PDF ano, přepis kritérií ne. Text níže je stav fáze 1.

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

## 10. Co se u učebního oboru ukáže a co ne

Oddíl je postavený na otázkách rodiny, která zvažuje učební obor: je tam místo,
stojí o obor někdo, kam se hlásí ostatní, co přijde potom a jak se tam dostat.
Mluví se o **učebních oborech**, „bez jednotné zkoušky“ je jen vysvětlení,
proč u nich nejsou body (oddíl 13).

### 10.1 Ukazatele, které fungují beze změny výpočtu

Všechny stojí na sloupcích, které jsou u nabídek bez zkoušky vyplněné (oddíl 3.4).
Název, vzorec ani jednotka se nemění; ve slovníku ukazatelů se u nich jen rozšíří
rozsah platnosti na nabídky bez zkoušky (oddíl 14):

Kapacita míst, Přihlášky celkem, Přihlášky podle priority, První priority, Podíl
prvních voleb, Přihlášky na místo, Tlak prvních voleb, Naplněnost, Přetlak, Přijatí,
Nepřijatí kvůli kapacitě, Nepřijatí pro nesplnění podmínek, Přijati na vyšší
prioritu, Přijatí podle priority, Vzdali se přijetí, Soutěžící o obor, Podíl
přijatých ze soutěžících, Obtížnost přijetí slovy.

Poznámky k jednotlivým:

- **Zbylá místa po 1. kole** (`KAPACITA` − `PŘIJATÍ`) jsou první údaj stránky
  učebního oboru: po 1. kole 2026 zbyla místa v 1 372 z 1 776 nabídek H (oddíl 3.5).
  Nový ukazatel, návrh v oddílu 14.
- **Obtížnost přijetí slovy** se počítá stejně (prahy třetina, polovina, dvě
  třetiny; práh 10 soutěžících), ale **není hlavní náhradou bodů**: pod prahem
  je 36 % nabídek H, 73 % E, 83 % P a 91 % C (oddíl 3.6). Zobrazuje se jen tam,
  kde práh platí; rozdělení H do stupňů (574/302/164/78/17) se zapíše do slovníku.
  **U kategorií C, E, J a P se odznak obtížnosti ani filtr podle ní nezobrazují vůbec**
  (C a E jako citlivá skupina, oddíl 17, O9; J a P rozhodnutím z etapy 0, oddíl 16.1);
  čísla (místa, přihlášky, přijatí, tlak) ano.
- **Kohorta podle pozice na přihlášce** vyžaduje srovnatelnou skupinu. Skupinou
  je kategorie × první dvojčíslí KKOV (23 strojírenství, 65 gastronomie a tak dál),
  ne typ školy — Kadeřník se nesrovnává se Zedníkem. U H tak vzniká 18 skupin,
  práh 30 nabídek splňuje 11 z nich; pod prahem se kohorta nezobrazuje stejně
  jako u oborů se zkouškou. Umělecké M/L se řadí ke svým skupinám ST/SH/SUM.
- **Pořadí v kraji** se počítá jen podle zájmu, ne podle výsledků přijatých
  (ty nejsou). Podle obtížnosti se neřadí nikde (stejné pravidlo jako u JPZ).
- **Odvozená hranice úspěšnosti** se nepočítá: zkouší součet bodů a slabší test,
  obojí chybí.
- U **nepřijatých pro nesplnění podmínek** se nepíše věta o minimech bodů; odkaz
  na kritéria školy zůstává.
- **Vývoj 2025 → 2026** (přihlášky, přijatí, podíl prvních voleb) se ukazuje
  stejným mechanismem jako u oborů se zkouškou; data 2025 existují (oddíl 3.7).

### 10.2 Ukazatele, které u učebních oborů nebudou

Vše postavené na bodech jednotné zkoušky: Průměr JPZ přijatých, Historický průměr
JPZ, Nejnižší výsledek JPZ mezi přijatými, Medián JPZ přijatých, Průměrná
percentilová umístění, Podíl přijatých podle bodového pásma, Rozhodl test, Pásmo
nejistoty, Poloha vůči pásmu, Percentil nejnižšího přijatého, Převedený výsledek
testu, Pořadí mezi soutěžícími, Nejslabší přijatý v předmětu, Podlaha slabšího
předmětu, Nevyrovnaní přijatí, Hustota u hranice, Podíl přijímaček na bodování
(bez přepisu kritérií z DiPSy, který je samostatné zadání; oddíl 16.1).

### 10.3 Ukazatele z dat uchazečů: data existují, generátory je musí vydat

Souběžné přihlášky, Výsledek uchazečů o obor a Obory výš a níž stojí na
`ss*_redizo`, `ss*_kkov`, `ss*_prijat` a `ss*_duvod_neprijeti`, které volby
H oborů nesou stejně jako volby se zkouškou. Generátory dnes berou jen denní
přihlášky (což H volby splňují), ale klíče H oborů nevydávají. Fáze 2 je vydá;
mez 10 uchazečů platí stejně. Souběh H ↔ M je pro rodinu klíčový: 20 588 dětí
kombinuje H/E s maturitním oborem a 18 627 má maturitní obor první a učební jako
pojistku (oddíl 5.1).

### 10.4 Maturita

Napojení přes `SKUPINA OBORŮ (16)` funguje jen tam, kde má skupina protějšek
v maturitních datech: umělecké M/L (ST1, ST2, SHU, SUM, SZD, UOS). Skupiny UVL,
UBV a KON (H, E, C, J, P) protějšek nemají — učební obory a konzervatoře maturitu
ve společné části nekonají. Stránka oboru H/E/C/J/P proto oddíl maturity nemá;
u uměleckých M/L je stejný jako u oborů se zkouškou.

### 10.5 Druhé kolo

Data 2. kola pro nabídky bez zkoušky existují (1 556 nabídek, oddíl 4); zobrazí
se stejným mechanismem jako u oborů se zkouškou. U učebních oborů je 2. kolo
první odpovědí na otázku „je tam místo“ spolu se zbylými místy po 1. kole.

### 10.6 Kam dál: nástavba po výučním listu

Cesta „výuční list → nástavba → maturita“ se na stránce učebního oboru propojí:
nástavby L/51 se stejnou školou (případně stejným oborovým dvojčíslím v kraji),
denní i nedenní. Denních nástaveb je 251 a v katalogu už jsou; 72 nedenních
(55 dálkových, 12 kombinovaných, 5 distančních) filtr formy vyhazuje, a proto
se přidají jako pokračování, ne jako nabídka pro deváťáky (oddíl 1, bod 2).
Denní nástavby se z katalogu nevyřazují, přestože nejsou pro uchazeče z 9. třídy:
mají existující stránky a adresy a rušení by byla jiná dávka.

## 11. Dopad na stránky

- **Stránka školy.** Přibudou učební obory s plnými čísly (oddíl 10.1) a bez
  bodových bloků. Vznikne 227 nových stránek škol, které dnes na webu nejsou;
  jejich obsah: obory s čísly, seznam inspekcí (226 z 227; extrakci inspekční
  zprávy dnes nemá žádná z nich, doklad `nove_skoly`), „jaká škola je“ (INSPIS,
  167 z 227), kde je a dojezd, veletrhy, novinky, údaje z portálu a domov mládeže
  (kde je). Oddíl „jak si škola vede“ bez maturity stojí na seznamu inspekcí
  a říká to otevřeně. Podnadpis pod názvem školy se skládá ze všech
  oborů včetně nových.
- **Stránka učebního oboru.** Staví se na pěti otázkách rodiny: je tam místo
  (zbylá místa po 1. kole, výsledek 2. kola), stojí o obor někdo (podíl prvních
  voleb, tlak, vývoj 2025–2026), kam se hlásí ostatní (souběh H ↔ M, obory výš
  a níž), co přijde potom (nástavba, oddíl 10.6) a jak se tam dostat (dojezd,
  domov mládeže). Obtížnost slovy jen nad prahem 10 soutěžících; proč tu nejsou
  body, vysvětlí věta z oddílu 13, nikdy prázdný blok.
- **Stránka města a přehled kraje.** Nové nabídky vstupují do karet a filtrů;
  filtr podle obtížnosti funguje tam, kde obtížnost je (mimo C, E, J a P).
  **Řazení se nemění a hierarchii nevytváří:** městský návrh řazení podle bodů
  ani podle obtížnosti nezná — výchozí je název školy, dále místa a přihlášky
  na místo (`docs/navrh-stranky-mesta-2027.md`, oddíl 3.5). Učební obory se řadí
  stejně jako ostatní. Navíc souhrn, jak se ve městě a kraji dělí místa do šesti
  skupin: gymnázia, maturitní obory, konzervatoře, učební obory, obory E a ostatní
  obory bez maturity i výučního listu (návrh ukazatele v oddílu 14).
- **Vyhledávání.** Učební obory se vyhledávají stejně; značka „bez jednotné
  zkoušky“ zůstává jako filtr i vysvětlení.
- **Simulátor přijímaček.** Učební obor do bodových skupin nepatří (není s čím
  srovnávat), ale do strategie ano: zvažovaný učební obor se započítá jako
  **pojistka**, když v 1. kole nikoho neodmítli kvůli počtu míst
  (`kapacita_nerozhodovala`, 574 nabídek H). Mechanismus vyžaduje doplněk návrhu
  simulátoru ve fázi 2 (dnes je pojistka definovaná body). Výjimka pro umělecké
  obory s talentovkou se nedělá: cvičný test TAU s ní nesouvisí.
- **Značky „bez jednotné zkoušky“ a „mimo přehled“.** První zůstává a nově vede
  na vlastní stránku oboru; význam „přehled je zatím nezahrnuje“ se přepíše
  (oddíl 13). Druhá zůstává pro nedenní formy (mimo nástavby) a ostatní
  nezahrnuté obory.

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
| Rejstřík domovy mládeže a internáty (druh H22, H21) | **použít** | 382 domovů a 68 internátů s adresou a kapacitou lůžek; 391 z 1 362 středních škol je má pod svým REDIZO; blok „Ubytování“ na stránce školy |
| AKKO `platnostOd`, `platnostDo` | nepoužít | celostátní platnost kódu, ne informace o škole |
| Agregáty 1. kola 2025 | **použít** | stejných 91 sloupců, 3 146 nabídek bez zkoušky; vývoj 2025 → 2026 (oddíl 3.7) |
| Infoabsolvent (NPI): nezaměstnanost absolventů obor × kraj | nepoužít | členění by sedělo na stránku oboru, ale sada není v otevřených datech a tabulky jsou obrázky v PDF (doloženo v `docs/zdroje-dat.md`, oddíl 3) |
| MPSV: absolventi v evidenci ÚP (IZO × obor) | nepoužít | chybí jmenovatel a MŠMT samo označuje počty absolventů škol za nevěrohodné (doloženo tamtéž); proto ani agregace na obor |
| Odborný výcvik u firem, krajská stipendia pro učně | zdroj neexistuje | rešerše v etapě 0 (oddíl 16.1, bod 7) strojově čitelný zdroj nenašla, web o nich mlčí (stejně jako u absolventů) |
| DiPSy `podminkyProPrijeti` (PDF kritérií) | použít jen jako odkaz | pokrytí 2 902 z 2 902 (oddíl 16.1); přepis bodování je samostatné zadání, protože část PDF je společná pro celou školu a část jsou skeny |
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

- **učební obor** (nový pojem, hlavní): „učební obor, tedy obor s výučním
  listem (kategorie H, případně E)“. Nepoužívat: „učňák“, „učňovský obor“.
- **obor bez jednotné zkoušky** (úprava, vysvětlující): „obor, u kterého se
  jednotná přijímací zkouška nekoná“. Věta pod tabulkou se přepíše, protože obory
  už mají vlastní stránku: „Učební obory mají vlastní stránku; body u nich nejsou,
  protože se jednotná zkouška nekoná.“
- **výuční list** (nový pojem): „výuční list, tedy doklad o vyučení v oboru“.
  Nepoužívat: „učňák“, „výučák“.
- **zbylá místa po 1. kole** (nový pojem): „po 1. kole zbylo X míst z Y“.
  Nepoužívat: „volná místa“ bez kola (to slovo patří 2. kolu).
- **kam dál po výučním listu** (nový pojem): „nástavba, po které se skládá
  maturita“. Nepoužívat: „pokračování“, „navazující studium“ (obecné).
- **obor bez maturity i výučního listu** (nový pojem, kategorie J; doplněno
  ve verzi 1.2): „dvouletý obor zakončený závěrečnou zkouškou a vysvědčením,
  bez maturity i výučního listu“. Obor J se nenazývá „učební obor“, protože
  výuční list nedává.

## 14. Návrh ukazatelů (podklad pro slovník ukazatelů)

Existující ukazatele z oddílu 10.1 se nemění; ve fázi 2 se u každého doplní
rozsah platnosti („platí i pro nabídky bez jednotné zkoušky“), u Obtížnosti
přijetí slovy a Podílu prvních voleb nové rozdělení ročníku a u Kohorty podle
pozice na přihlášce nové srovnatelné skupiny (kategorie × dvojčíslí KKOV).
Dva nové ukazatele (návrh znění pro slovník):

- **Zbylá místa po 1. kole**: `kapacita míst − přijatí` za nabídku a ročník.
  Zdroj: CERMAT, sloupce `KAPACITA` a `PŘIJATÍ`. Jednotka: místa. Platí jen
  tam, kde jsou oba sloupce vyplněné (u 53 nabídek bez čísel se neukazuje).
  Neříká, zda škola vypíše 2. kolo — to říká až oddíl 2. kola.
- **Místa podle druhu studia**: rozdělení součtu `KAPACITA` za město a kraj
  do šesti skupin podle kategorie KKOV (verze 1.2, oddíl 16.1): gymnázia (K),
  maturitní obory (M a L včetně uměleckých), konzervatoře (P), učební obory (H),
  obory E a ostatní obory bez maturity i výučního listu (C, J). Zdroj: CERMAT 1. kolo.
  Jednotka: místa a podíly. Součet míst za území se smí, na rozdíl od přihlášek;
  jeden uchazeč se v něm nepočítá víckrát, protože místa nejsou přihlášky.

Zápis vznikne v dávce s implementací, ne dřív — údaj bez hotového výpočtu
se nezavádí.

## 15. Návrh zápisu do registru datových sad

Nová sada není potřeba žádná: nabídky bez zkoušky nesou tytéž soubory CERMATu
jako nabídky se zkouškou (`cermat-kapacity`, `cermat-prihlasky`, `cermat-vysledky`,
`cermat-uchazeci-kolo1`, `cermat-kolo2-agregaty`), rok 2025 se převezme stejným
mechanismem jako u oborů se zkouškou. Ve fázi 2 se u těchto sad doplní výstupy
o rozšířené soubory a dva nové ukazatele z oddílu 14; u sady
`msmt-rejstrik-snimky` přibude výstup s domovy mládeže. Registr se ve fázi 1
nemění (omezení zadání); přepnutí období se řídí stávajícími sadami.

## 16. Otevřené otázky pro fázi 2

1. Pokrytí karet DiPSy u nabídek bez zkoušky (oddíl 7): přinesou se i kritéria,
   nebo jen čísla z CERMATu?
2. Konzervatoře (P): 43 ze 178 nabídek nenese ani počty přihlášek a přijímají
   i z 5. třídy; talentové řízení běží mimo jednotný harmonogram. Ukázat s výhradou,
   nebo až s kritérii z DiPSy?
3. Kategorie J (8 nabídek): střední vzdělání bez maturity i výučního listu;
   v přípravě fáze 2 rozhodnout, zda zahrnout, nebo vynechat. (C a E rozhodnuty
   v oddílu 10.1: stránky s čísly, bez odznaku obtížnosti a filtru.)
4. Stabilita klíče nabídky mezi roky u H oborů pro párování ročníků a dvouletý
   cyklus (`docs/dvoulety-cyklus-nabidky-oboru.md`). Data 2025 existují (oddíl 3.7).
5. Generátory souběhu a kontextu: vydat klíče H/E oborů; ověřit nulový rozdíl
   popisů jako u oborů se zkouškou.
6. Doplněk návrhu simulátoru: pojistka bez bodů (`kapacita_nerozhodovala`, oddíl 11).
7. Rešerše zdrojů o odborném výcviku u firem a krajských stipendiích v přípravě
   fáze 2 (oddíl 12: zdroj zatím neexistuje).

### 16.1 Odpovědi z etapy 0 (issue #244, 2. 10. 2026)

Čísla jsou v dokladu `docs/podklady/mereni-obory-bez-jpz-2026.json`, klíče
`parovani_roku`, `parovani_kol` a `konzervatore_a_j`. Spočítal je skript
`scripts/mereni-obory-bez-jpz.py`, který k tomu volá párovací kód importu
(`scripts/match_obory_2025_2026.py`, `scripts/build-druhe-kolo.py`), ne jeho kopii.

1. **DiPSy: karta s PDF podmínek přijetí existuje u všech nabídek; na stránce
   bude odkaz na PDF, ne přepis kritérií.** Měřeno 2. 10. 2026 způsobem
   schváleným v issue #244. Proběhlo 2 902 dotazů na karty bez jediné chyby
   (`scripts/mereni-dipsy-bez-jpz.py`, souhrn `docs/podklady/mereni-dipsy-bez-jpz-2026.json`).
   - Kartu s PDF podmínek přijetí (`podminkyProPrijeti.fileId`) má 2 890 nabídek,
     u nichž souhlasí ID karty, rok, kolo, REDIZO i kód oboru.
   - Zbylých 12 (10 E a 2 C) patří jedné škole, kterou DiPSy vede pod jiným
     REDIZO než CERMAT (600027295 proti 600027287). Karta i PDF existují.
     Etapa 1 musí odkaz u této školy párovat přes `ID_SOF`, ne přes REDIZO.
   - **Vzorek 30 PDF** (H 10, E 6, M 5, P 5, C 4; náhodně, semínko 244;
     přečteny ručně, žádný model ani služba třetí strany, PDF se necommitují):
     - 3 z 30 jsou skeny bez textové vrstvy (OCR by bylo nutné);
     - u oborů H a E školy většinou bodují průměrný prospěch ze ZŠ, často
       s minimem bodů a pomocnými kritérii při rovnosti;
     - u uměleckých M a konzervatoří P rozhoduje talentová zkouška;
     - u praktické školy (C) pohovor a doporučení školského poradenského
       zařízení;
     - téměř všude se požaduje lékařský posudek o zdravotní způsobilosti;
     - nejméně 4 z 27 čitelných PDF jsou společné pro celou školu a bodují
       v jednom dokumentu i obory s jednotnou zkouškou. Stejné riziko, jaké
       popisuje `docs/predani-kriteria-prijeti-2026-09-25.md`: přepis by mohl
       přiřadit bodování jiného oboru.
   - **Důsledek pro fázi 2:** stránka učebního oboru dostane odkaz „Podmínky přijetí
     (PDF v DiPSy)“ u všech nabídek. Přepis kritérií, body ani minima se
     nezobrazují. Přepis by potřeboval stejný postup s kontrolou jako u oborů
     se zkouškou (issue #181), a to je samostatné zadání.
2. **Konzervatoře (P): ukázat hned, s výhradou** (rozhodnutí vlastníka 2. 10. 2026).
   Denních nezkrácených nabídek je 146 v 18 školách. Kapacitu mají všechny, počty
   přihlášek a přijatých chybí u 26 nabídek z 5 škol. Údaj „43 ze 178“ v otázce
   zahrnoval i 32 kombinovaných nabídek. Pět nabídek je osmiletých pro žáky
   5. třídy, ostatní šestileté pro žáky 9. třídy. Kde počty chybí, stránka to
   řekne větou, ne prázdným blokem. Výhrada zní, že se přijímá talentovou
   zkouškou mimo jednotný harmonogram. Odznak ani filtr obtížnosti konzervatoře
   nemají, protože se nesoutěží o pořadí podle jednotné zkoušky.
3. **Kategorie J: zahrnout** (rozhodnutí vlastníka 2. 10. 2026). Jde o 8 dvouletých
   nabídek v 8 školách (obory 63-51-J/01, 75-41-J/01 a 53-41-J/01). Všechny mají
   úplná čísla: 106 míst, 157 přihlášek a 70 přijatých. Zobrazí se jako C a E,
   s čísly, bez odznaku a filtru obtížnosti, pod novým pojmem z oddílu 13.
4. **Stabilita klíče:** `ID_SOF` ani `ID_SO` mezi roky stabilní nejsou (shoda 0
   z 2 902). Stávající párování webu (klíč `REDIZO_KKOV` a podobnost zaměření) ale
   u nabídek bez JPZ funguje. Protějšek z roku 2025 najde u 2 800 z 2 902 nabídek
   roku 2026 (96 %): s vysokou jistotou u 2 701, se střední u 96 a s nízkou u 3.
   Nových nabídek je 74 a 28 jde k ruční revizi. U oborů H je spárováno 1 744
   z 1 777 (vysoká jistota 1 724), 25 je nových a 8 k revizi. Pro srovnání,
   u oborů se zkouškou spároval týž skript 2 696 z 3 087 nabídek a 391 označil
   jako nové (`data/obory_matching.json`, březen 2026). Nejvíc podobnost zaměření
   potřebují konzervatoře, kde má jen střední jistotu 51 ze 142 spárovaných,
   protože školy text zaměření mezi roky přepisují. Etapa 1 proto páruje rok 2025
   stejným mechanismem a ruční výjimky (`data/obory_manual_overrides.csv`)
   doplní jen u 28 případů k revizi.

   **Párování 1. ↔ 2. kolo:** klíč z `scripts/build-druhe-kolo.py` (škola, obor,
   zaměření, forma, délka, zkrácené studium, jazyk) najde 2. kolo u 1 261 nabídek
   1. kola. Ze 1 458 nabídek 2. kola zůstane nespárovaných 197; podíl spárovaných
   (86 %) odpovídá oborům se zkouškou (886 z 1 060, 84 %). `ID_SO` je na rozdíl
   od `ID_SOF` v obou kolech stejné a jednoznačně by spárovalo 145 ze 197
   nespárovaných. Jako doplněk klíče ho ale etapa 1 nezavádí, protože by změnil
   i párování oborů se zkouškou. Patří do samostatného zadání.
5. **Generátory souběhu a kontextu:** řeší etapa 2.
6. Vyřešeno: doplněk návrhu simulátoru je sloučený (PR #246).
7. **Rešerše o odborném výcviku a stipendiích (2. 10. 2026, způsob schválený
   v issue #244): strojově čitelný zdroj neexistuje, web o obou dál mlčí.**
   Rešerše proběhla přes 8 vyhledávání a 3 stránky. U jedné vrátil server 403
   a znovu jsem ji nezkoušel.
   - *Krajská stipendia.* Programy mají jednotlivé kraje (Liberecký kraj
     27 oborů na 14 školách s motivačním a prospěchovým stipendiem, dále
     Karlovarský a Jihočeský kraj, Moravskoslezský kraj má návrh). Kraje je
     zveřejňují tiskovými zprávami a usneseními rady v PDF a schvalují je
     na pololetí. Jednotný ani strojově čitelný přehled škol a oborů
     neexistuje. Zobrazení by vyžadovalo ručně vedený registr po krajích,
     obnovovaný každé pololetí. To je samostatné zadání, ne součást fáze 2.
   - *Odborný výcvik u firem.* Novela školského zákona (zákon č. 267/2025 Sb.,
     § 65a–65f) zavádí duální praktické vyučování u certifikovaných
     poskytovatelů. MŠMT má zveřejňovat seznam standardů kvality a seznam
     platných certifikátů poskytovatele (metodická informace MŠMT z ledna 2026).
     Takový seznam rešerše nenašla, certifikace teprve začíná. Seznam navíc
     ponese poskytovatele, ne vazbu na školu a obor, takže sám neřekne,
     kde konkrétní škola výcvik zajišťuje. Kandidát na sledování datovou
     linkou, až MŠMT seznam zveřejní.
8. Vyřešeno v zadání: každá etapa má vlastní PR.
9. **Místa podle druhu studia: šest skupin** (rozhodnutí vlastníka 2. 10. 2026):
   gymnázia (K), maturitní obory (M a L včetně uměleckých), konzervatoře (P),
   učební obory (H), obory E a ostatní obory bez maturity i výučního listu (C, J).
   Oddíl 14 je upravený.

## 17. Vypořádání oponentury

Oponentura: `docs/podklady/oponentura-obory-bez-jpz-2026-10-01.md` (1. 10. 2026).
Její čísla jsou od verze 1.1 součástí `scripts/mereni-obory-bez-jpz.py`
(klíče dokladu `obsazenost`, `soutezici_prahy`, `pojistky`, `agregaty_2025`,
`nastavby`, `druhe_kolo`, `skupiny_oboru`, `domovy`, `nove_skoly`), takže jdou
zopakovat jedním příkazem. Níže verdikt ke každé námitce s důkazem:

- **O1 (obory popsané tím, co jim chybí) — přijato.** Oddíly 10 a 11 přepsané:
  mluví se o učebních oborech a pěti otázkách rodiny, „bez jednotné zkoušky“ je
  jen vysvětlení; pojmy v oddílu 13 upravené (hlavní pojem „učební obor“).
- **O2 (2. kolo odloženo) — přijato.** Čísla oponentury zopakována přesně
  (H 69 %, 1 372 z 1 776; E 58 %, 413 z 519; se zkouškou 84 %, 1 646 z 3 091;
  doklad `obsazenost`). Oddíl 4 doplněn o úrovně 2. kola (1 556 nabídek);
  zbylá místa a 2. kolo jsou první údaj stránky (oddíly 10.1, 10.5, 11).
  Párování 1. ↔ 2. kolo zůstává fázi 2.
- **O3 (práh obtížnosti) — přijato s opravou čísla.** Podíly pod prahem
  zopakovány přesně (H 36 %, E 73 %, P 83 %, C 91 %; doklad `soutezici_prahy`).
  Těžkých H ale vychází **95** (78 + 17, všechny nad prahem), ne 109; ani při
  započtení všech forem (108) se 109 zopakovat nepodařilo — rozdíl nejspíš
  okrajový případ ve skriptu oponentury. Návrh používá 95 (oddíl 3.6) a obtížnost
  už nestaví jako hlavní náhradu bodů (oddíl 10.1).
- **O4 (simulátor bez učebních oborů) — přijato s mechanismem.** Čísla zopakována
  (50 749; 20 588; 18 627 při definici „první neprázdná volba“, 18 611 při
  doslovném `ss1_kkov` — rozdíl 16 dětí se zpětvzatou první prioritou; doklad
  `pojistky`). Mechanismus: zvažovaný učební obor je pojistkou, když v 1. kole
  nikoho neodmítli kvůli počtu míst (574 nabídek H); bodové skupiny se nemění.
  Vyžaduje doplněk návrhu simulátoru (oddíl 11, otevřená otázka 6).
- **O5 (řazení odsune učební obory) — přijato opravou věty.** Věta verze 1.0
  o „řazení podle bodů“ byla chybná: městský návrh řazení podle bodů ani podle
  obtížnosti nezná (výchozí název školy; `docs/navrh-stranky-mesta-2027.md`,
  oddíl 3.5). Učební obory se řadí stejně jako ostatní; hierarchie nevzniká.
  Oddíl 11 opraven, přidán souhrn míst podle druhu studia.
- **O6 (skupiny kohorty) — přijato.** Skupinou je kategorie × první dvojčíslí
  KKOV. U H vzniká 18 skupin, práh 30 splňuje 11 z nich (doklad `skupiny_oboru`);
  pod prahem se kohorta nezobrazuje. Oddíl 10.1 přepsán.
- **O7 (nástavby a nedenní formy) — přijato částečně.** (a) Chyba verze 1.0
  opravena: v katalogu je 251 denních nástaveb, 72 nedenních filtr formy vyhazuje
  (doklad `nastavby`; `is_valid_flat` vyžaduje „den“). (b) Cesta „výuční list →
  nástavba → maturita“ se propojí (oddíl 10.6); 72 nedenních nástaveb se přidá
  jako pokračování. (c) Ostatní nedenní formy (181 nabídek) a zkrácené studium
  zůstávají mimo web — míří na dospělé a oponentura pro ně jiný mechanismus
  nenavrhuje. Denní nástavby se z katalogu nevyřazují (existující stránky).
- **O8 (jen jeden ročník) — přijato.** Soubor 2025 má stejných 91 sloupců
  (0 rozdílů v hlavičkách), 3 146 nabídek bez zkoušky, 2 916 denních nezkrácených
  (doklad `agregaty_2025`). Vývoj 2025 → 2026 se ukáže stejným mechanismem jako
  u JPZ (oddíl 3.7); párování nabídek mezi roky zůstává fázi 2 (oddíl 16).
- **O9 (citlivá skupina C/E) — přijato rozhodnutím v návrhu.** U C a E se
  nezobrazuje odznak obtížnosti ani filtr podle ní; čísla ano (oddíl 10.1).
  Odznak by se ostatně zobrazil málokdy (pod prahem 91 % C a 73 % E).
- **O10 (nezvážené zdroje) — přijato.** Infoabsolvent a MPSV doplněny do oddílu 12
  s doloženými důvody zamítnutí (`docs/zdroje-dat.md`, oddíl 3). Domovy mládeže
  a internáty ověřeny (382 + 68 záznamů s adresou a lůžky; 391 z 1 362 středních
  škol; doklad `domovy`) a navrženy jako blok „Ubytování“ (oddíly 11, 12).
  Výcvik u firem a stipendia zapsány jako neexistující zdroj s úkolem rešerše
  (oddíl 12, otevřená otázka 7).
- **O11 (hlášení #167) — přijato s návrhem textu.** Kombinovaná forma v datech
  je (kapacita 90, 46 přihlášek, 36 přijatých), ale na web nepatří (nedenní
  forma pro dospělé); dálkovou škola v roce 2026 nevypsala (oddíl 8.1). Návrh
  odpovědi do issue (píše Patrick, veřejné issue):
  > Kombinovanou Předškolní pedagogiku v datech CERMATu za 1. kolo 2026 vidíme
  > (kapacita 90, 46 přihlášek, 36 přijatých), dálkovou jste v roce 2026
  > nevypsali. Na web dáváme jen denní studium, protože míří na uchazeče
  > z 9. tříd — proto kombinovaná forma na stránce školy není. Až rozšíříme
  > přehled o další formy (návrh #209), dáme vědět.
- **O12 (prázdné stránky 227 škol) — přijato.** Obsah stránek vypsán v oddílu 11
  (obory, inspekce, INSPIS, poloha, veletrhy, novinky, portál, domov mládeže);
  „jak si škola vede“ stojí na inspekci a říká to. Pokrytí daty změřeno
  (doklad `nove_skoly`).

## 18. Historie

| Verze | Změna |
|---|---|
| 1.6 | Etapa 3c-1, stránka města (oddíl 16.6). |
| 1.5 | Skupiny oborů na stránce školy v pevném pořadí (oddíl 16.5, rozhodnutí vlastníka, #393). |
| 1.4 | Etapa 3b (oddíl 16.4): 221 škol mimo katalog z rejstříku, ubytování, seznam inspekcí bez shrnutí, zaměření bez kódu oboru. |
| 1.3 | Etapa 3a (oddíl 16.3): stránka učebního oboru a obory na stránce školy u škol, které web vede; rozdělení etapy 3 na 3a, 3b a 3c. |
| 1.2 | Odpovědi z etapy 0 fáze 2 (#244, oddíl 16.1): párování 2025 ↔ 2026 (96 %) a 1. ↔ 2. kola, konzervatoře s výhradou, kategorie J zahrnuta, šest skupin souhrnu míst; pojem pro kategorii J. Otázky 1 a 7 změřeny po schválení dotazů na cizí servery (DiPSy, rešerše). |
| 1.1 | Vypořádání oponentury (oddíl 17): přepsané oddíly 10 a 11, nová měření 3.5–3.7 a 5.1, oprava chyby o nástavbách, rozhodnutí o C/E, dva nové ukazatele, domovy mládeže. |
| 1.0 | První návrh (fáze 1, issue #209). |


...[truncated 16692 chars]
### 16.2 Etapa 1 (data): výstup `src/data/obory-bez-jpz-2026.json`

Skript `scripts/build-obory-bez-jpz.py` (test `tests/test_obory_bez_jpz.py`) čte jen místní zdroje a zapíše
jediný nový soubor, který web zatím nečte; stávající výstupy webu a filtr `is_valid_flat` se nemění.
Obsahuje 2 902 denních nezkrácených nabídek bez JPZ (po kategoriích C 200, E 524, H 1 777, J 8, L 31,
M 216, P 146), 72 nedenních nástaveb L/5x (L/51 a čtyři L/52) s příznakem `pokracovani`, protějšek z roku 2025 (2 800 spárovaných,
102 nových), 2. kolo (1 261 spárovaných) a domovy mládeže a internáty podle REDIZO (438 škol; jen název, druh,
kapacita a obec). `ID_SOF` je v každé nabídce, odkaz na PDF v DiPSy se tedy páruje přes něj, ne přes REDIZO
(oddíl 16.1, bod 1). Chybějící počet zůstává `null`; `zbyla_mista` se počítá jen tam, kde je kapacita i přijatí. `id` nástavby nese na konci formu (dist, dal, komb), protože jedna škola má stejný KKOV ve více formách.
Zobrazení, slovníky a registr jsou etapy 3 a 4.

### 16.3 Etapa 3a: stránka učebního oboru a obory na stránce školy (5. 10. 2026)

Rozhodnutí vlastníka 5. 10. 2026 (komentář v #244): nabídky bez JPZ se zapojí do stejného seznamu nabídek školy
jako ostatní (varianta A), etapa 3 se dělí na 3a (stránka učebního oboru u škol, které web vede), 3b (nové školy,
ubytování, sitemap nových škol) a 3c (město, kraj, vyhledávání, značky); slovníky a registr jdou s každou z nich.

Etapa 3a zapojuje 2 105 nabídek bez JPZ u 433 škol, které katalog vede. Seznam je jeden (`getProgramyBezJpz`
v `src/lib/data.ts`), ale čtou ho zatím jen stránka školy, stránka oboru a sitemapa; stránka města, kraje a vyhledávání
nabídky bez JPZ dostanou až v 3c, aby se tam neobjevily bez filtrů a souhrnu míst. Adresy nabídek bez JPZ vznikají
vlastní mapou (`adresyBezJpzMapa`), takže **žádná dnešní adresa oboru se zkouškou se nezměnila** (hlídá test).
Stránka učebního oboru odpovídá na pět otázek z oddílu 11 v pořadí místo, zájem, ostatní, potom, cesta; otázka
„Co přijde potom“ je jen u H a E. Obtížnost slovy se ukazuje nad prahem 10 soutěžících včetně stupně „místo pro
všechny“ (574/302/164/78/17 u H, jak uvádí oddíl 3.6), u C, E, J a P vůbec.

Zatím mimo: odkaz na PDF podmínek přijetí konkrétní nabídky v DiPSy (veřejná stálá adresa karty nabídky není
ověřená; stránka odkazuje na web školy a na DiPSy obecně), kohorta podle pozice na přihlášce a pořadí v kraji
(potřebují skupiny kategorie × dvojčíslí KKOV), maturita u uměleckých M a L (oddíl 10.4) a simulátor (etapa 5).

### 16.4 Etapa 3b: školy, které katalog nevede, a ubytování (6. 10. 2026)

221 škol nabízí jen obory bez jednotné zkoušky, a katalog je proto nevede (návrh odhadoval 227; rozdíl dělají školy,
které mezitím katalog dostal, a nástavby). Jejich identitu přidal `scripts/build-obory-bez-jpz.py` do pole `skoly`
souboru `src/data/obory-bez-jpz-2026.json` z rejstříku škol MŠMT: zkrácený a úplný název, adresa, městská část,
okres, kraj a druh zřizovatele. Název školy se skládá jako v katalogu („zkrácený název, ulice“), okres a druh
zřizovatele se převádějí z kódů rejstříku podle škol, které katalog i rejstřík vedou (okres většinou hlasů, bez
prázdných; typ zřizovatele 5 soukromá, 6 církevní, ostatní veřejná). Jméno ředitele, e-maily ani zřizovatele jako
osobu skript nečte.

Nové školy mají přehled (obory, maturita tam, kde ji CERMAT vede, seznam inspekcí ČŠI, profil InspIS, portál,
veletrhy, souběžné přihlášky) a stránky všech nabídek. Polohu (souřadnice) rejstřík nemá, proto u nich chybí
nejbližší zastávka a školy v okolí; adresa vede na Mapy.cz a na nástroj Dojezd do škol. Seznam inspekcí se nově
ukazuje u každé školy, ke které nemáme shrnutí inspekční zprávy, nejen u nových. Blok ubytování (domovy mládeže
a internáty z rejstříku, druh H21 a H22) je v oddílu „Kde je“ u všech 438 škol, které je pod svým REDIZO vedou.

CERMAT u konzervatoří a části učebních oborů píše do zaměření kód oboru („Hudba – 82-44-M/01 Dirigování“,
„Housle (82-44-M/01)“); název i adresa ho vynechávají (`zamereniBezKodu`), takže se změnilo 15 adres učebních oborů
ze 3a, které už jsou nasazené. Staré adresy se přesměrují na adresu téže nabídky (`getSchoolPageType`,
`staraAdresaBezJpz`), takže žádný odkaz nepřestane fungovat.

### 16.5 Skupiny oborů na stránce školy (6. 10. 2026, #393)

Rozhodnutí vlastníka 6. 10. 2026: obory na stránce školy se dělí do skupin podle toho, čím studium končí (S maturitou,
S výučním listem, Po vyučení, Ostatní), s přepínačem nad seznamem. **Pořadí skupin je vždy stejné**, aby rodinu
nemátlo, že se mění podle školy. Tím se pro stránku školy mění pravidlo z oddílu 11 („nevytvářet hierarchii maturita
nahoře, učební obor dole“): skupina S maturitou stojí první vždy. Pravidlo dál platí pro řazení na stránce města
a kraje, kde se učební obory řadí s ostatními (etapa 3c). Volba skupiny se pamatuje v prohlížeči a platí i na další
škole; škola s jedinou skupinou přepínač nemá.

### 16.6 Etapa 3c-1: stránka města (6. 10. 2026)

Etapa 3c se dělí na 3c-1 (stránka města), 3c-2 (kraj a /regiony) a 3c-3 (vyhledávání a API). Na stránce města
mají nabídky bez JPZ, i u škol, které katalog nevede, vlastní řádek s místy a odkazem na stránku oboru; místo
obtížnosti přijetí řádek bez ní ukáže zbylá místa po 1. kole. Obtížnost platí podle oddílu 10.1 (práh 10
soutěžících, nic u C, E, J, P). Z „dalších oborů“ z přihlášek se tyto nabídky vynechají, zůstanou jen obory mimo
přehled. Filtr Vzdělání používá skupiny z oddílu 16.5 v pevném pořadí a sdílí uloženou volbu se stránkou školy.
Záhlaví města počítá obory po skupinách. Okruhy oborů na stránce města i oboru odkazují učební obory na jejich
stránku a nesou jejich obtížnost. Velikost města (která určuje, které filtry se ukážou) počítá všechny obory
s čísly, ne jen obory se zkouškou.

Otevřené u vlastníka (komentář v #244 z 6. 10. 2026): zda „katalog“ znamená datovou vrstvu, ne soubory, a zda souhrn
*Místa podle druhu studia* přejde na čtyři skupiny přepínače. Souhrn proto v 3c-1 není.
