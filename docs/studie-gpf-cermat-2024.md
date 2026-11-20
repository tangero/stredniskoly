# Ověřovací studie: test z matematiky podle dovedností GPF (JPZ 2024)

Stav: ověřovací studie z 19.–20. 11. 2026, nic z ní se na webu nezobrazuje. Vznikla na pokyn
vlastníka po rozboru repozitářů EDU-AI (github.com/edu-ai-00). Otázka zněla: dá se z položkových
dat CERMAT říct, ve kterých dovednostech uchazeči ztrácejí body, a navázat na to procvičování
EDU-AI, které dovednosti třídí podle rámce GPF? V repozitářích EDU-AI se rámec objevuje jen pod
zkratkou. Že jde o Global Proficiency Framework, jsem odvodil ze struktury oblastí, v jejich
podkladech to ověřené není.

## Krátce

- **Technicky to jde a data jsou čistá.** Body po úlohách sedí na celkový součet u všech 180 369
  uchazečů obou řádných termínů a kód vynechání nikdy nenese body.
- **Shodu v obou testech mají čtyři oblasti: zlomky, procenta, výrazy a geometrie.** Po očištění
  o rozdílnou obtížnost termínů (termín B byl o 8 procentních bodů snazší) se u nich podíl bodů
  mezi termíny liší nejvýš o 5 procentních bodů, a to při hlavním i vedlejším přiřazení úloh.
  Rovnice jsou na hraně (6, resp. 7 bodů). Výpočty rozměrů a slovní úlohy se liší o 13 až
  31 bodů, tam číslo popisuje konkrétní úlohu, ne dovednost. Dva testy jednoho ročníku ale
  nestačí na tvrzení, že to platí obecně.
- **GPF na přijímačky pasuje špatně.** Test pokryl 12 z 35 dílčích dovedností GPF. Rámec obsahuje
  i základy jako čas a mince, ale nemá vlastní kolonku pro konstrukce, Pythagorovu větu ani
  měřítko. Tyto úlohy dávají 13 z 50 bodů v termínu A a 10 z 50 v termínu B a skončily
  v obecné kolonce G1.1 nebo M1.2.
- **Výrazný nález je vynechávání.** Úlohy ponechané úplně prázdné tvoří nejméně čtvrtinu
  ztracených bodů v termínu A a pětinu v termínu B. Vynechávají se hlavně otevřené úlohy
  z geometrie a měření (22 až 43 % uchazečů), uzavřené jen výjimečně (1 až 6 %). Prázdná otevřená
  úloha ale nejspíš znamená „nevěděl jsem jak“, ne špatnou strategii. U uzavřené úlohy se dá
  hádat a náhodná volba z pěti možností dá v průměru 20 % bodů.
- **Doporučení:** stránku „v čem uchazeči ztrácejí body podle GPF“ zatím nestavět. Pro propojení
  s EDU-AI stačí hrubá témata (zlomky, procenta, výrazy, rovnice, geometrie a měření, konstrukce,
  slovní úlohy) a potvrzení na druhém ročníku (položková data 2025).

## Data a metoda

| | |
|---|---|
| Výsledky | `data/JPZ2024_MA4_polozkova_data.xlsx`, listy M4A (91 166 uchazečů) a M4B (89 203), sloupce `b*` (body za pozici), `k*` (odpověď, 9 = vynechání), `dt_body`, `ss1_smo16` |
| Zadání | testové sešity CERMAT MA_2024_9_Ax.pdf a MA_2024_9_Bx.pdf, jen ke čtení kvůli přiřazení úloh |
| GPF | `src/lib/gpf/gpf-matematika.json` z github.com/edu-ai-00/EDU-AI-asistent-EDIT, commit `b990286` |
| Přiřazení | [`podklady/gpf-cermat-2024/mapovani.json`](podklady/gpf-cermat-2024/mapovani.json): 23 bodovaných pozic na termín, hlavní a vedlejší dovednost, jistota přiřazení, formát úlohy |
| Výpočet | [`scripts/studie-gpf-cermat-2024.py`](../scripts/studie-gpf-cermat-2024.py) |
| Výsledky | [`podklady/gpf-cermat-2024/vysledky.json`](podklady/gpf-cermat-2024/vysledky.json), jen souhrny |

Náhradní termíny (536 a 880 uchazečů) jsou vynechané. Proč 2024 a ne 2025: lokálně máme položková
data jen za 2024. `docs/zdroje-dat.md` sice uvádí i 2025, ale v `data/` ty soubory nejsou.

**Ukazatel.** Podíl získaných bodů je součet získaných bodů dělený součtem maximálních bodů
pozic přiřazených k dovednosti, tedy vážený body. Neříká, „kolik procent uchazečů úlohu vyřešilo“.
Vedle něj stojí podíl vynechání. Ukazatel není ve slovníku ukazatelů. Kdyby se měl zobrazit,
musí se tam nejdřív zapsat.

**Vynechání** kóduje CERMAT kódem 9 za celou úlohu: podúlohy téže úlohy mají 9 vždy spolu
(jediná výjimka ze 180 tisíc řádků). Kdo vyplnil jen jednu podúlohu, má u druhé 0 bodů, ne 9.
Čísla o vynechání jsou proto dolní mez.

**Úlohy 15 a 16** mají v datech jen celkové body (`b15`, `b16`). Rozdělit je na podúlohy by šlo
jen s klíčem správných řešení, který podle pravidel CERMAT nepřebíráme. Zůstávají celé.

**Přiřazení se střední jistotou** (24 bodů v termínu A, 16 v B) se počítá ve dvou variantách:
s hlavní dovedností a s vedlejší.

**Kritérium stanovené předem.** Termíny se srovnávají po očištění o obtížnost: od podílu bodů
dovednosti se odečte podíl bodů celého testu (A 0,403, B 0,485). Dovednost považuji za stabilní,
když se očištěná hodnota mezi termíny liší nejvýš o 0,07, a to v obou variantách přiřazení.

## Výsledky

### Dovednosti v obou termínech (všichni uchazeči)

Podíl získaných bodů, v závorce maximum bodů v testu. Očištěný rozdíl = (B − průměr B) − (A − průměr A).

| GPF | Dovednost | Termín A | Termín B | Očištěný rozdíl, hlavní | Očištěný rozdíl, vedlejší | Úsudek |
|---|---|---|---|---|---|---|
| N2.2 | operace se zlomky | 0,62 (2) | 0,65 (4) | −0,05 | −0,05 | stabilní, nad průměrem testu |
| N6.1 | operace napříč obory, procenta | 0,62 (8) | 0,66 (10) | −0,05 | +0,03 | stabilní, nad průměrem testu |
| A2.1 | výrazy | 0,35 (4) | 0,39 (6) | −0,04 | −0,04 | stabilní, mírně pod průměrem |
| G1.1 | vlastnosti útvarů (konstrukce, úhly) | 0,38 (8) | 0,42 (8) | −0,04 | −0,02 | stabilní, mírně pod průměrem |
| A3.3 | rovnice | 0,37 (6) | 0,51 (6) | +0,06 | +0,07 | na hraně |
| M1.2 | úlohy s rozměry (obsah, obvod, objem) | 0,24 (12) | 0,46 (6) | +0,13 | +0,22 | závisí na úloze |
| N1.4 | slovní úlohy s přirozenými čísly | 0,56 (4) | 0,33 (2) | −0,31 | jen A | závisí na úloze |
| A3.1 | závislosti (úměrnost, měřítko) | 0,30 (4) | — | | | jen v A |
| G2.1 | skládání útvarů | 0,43 (2) | — | | | jen v A |
| A1.1 | pravidelnosti | — | 0,29 (4) | | | jen v B |
| S1.1 | čtení dat z grafu | — | 0,40 (3) | | | jen v B |
| M1.1 | jednotky | — | 0,50 (1) | | | jen v B |

Uvnitř dovednosti se úlohy liší hodně. V termínu A získali uchazeči u umocnění dvojčlenu 9 % bodů
a u rozkladu podle vzorce 70 %, obojí je A2.1 „výrazy“. V G1.1 mají uzavřené úlohy na úhly 66 až
67 %, otevřené konstrukce 26 až 37 %: rozdíl jde zčásti na vrub formátu (u uzavřené úlohy se dá
hádat). Směrodatná odchylka podílu bodů mezi položkami je v termínu A uvnitř dovedností 0,094
a mezi dovednostmi 0,135, v termínu B 0,117 a 0,110. Na úrovni jednotlivé dovednosti GPF tedy
dovednost obtížnost úlohy nevysvětluje.

### Kde se ztrácejí body

| | Termín A | Termín B |
|---|---|---|
| průměr bodů z 50 | 20,2 | 24,3 |
| ztracené body v úplně vynechaných úlohách | 7,3 z 29,9 (25 %) | 5,2 z 25,8 (20 %) |
| totéž, dolní třetina uchazečů | 28 % | 23 % |
| totéž, horní třetina | 15 % | 10 % |
| geometrie a měření, podíl ztracených bodů | 51 % (váha v testu 44 %) | 32 % (váha 30 %) |

Podíl ztracených bodů v dovednosti kopíruje hlavně to, kolik bodů jí test dal, a sám o slabině
mnoho neříká.

Nejčastěji úplně vynechané úlohy jsou otevřené úlohy z geometrie a měření. V termínu A: konstrukce
obdélníku 43 %, obsah a obvod obrazce s oblouky 40 %, objem tělesa 33 %, lichoběžník 31 %,
konstrukce trojúhelníku 22 %. V termínu B: konstrukce kosočtverce 29 %, lichoběžník 24 %,
posloupnost obrazců 23 %, konstrukce trojúhelníku 21 %.

### Skupiny

Pořadí dovedností se mezi třetinami uchazečů (podle celkových bodů) ani mezi uchazeči s gymnáziem
na prvním místě (18,5 tisíce v každém termínu) a ostatními skoro nemění. Rozdíl mezi horní
a dolní třetinou je ale u různých dovedností různě velký: od 0,32 (závislosti v termínu A) do
0,79 (rozměry v termínu B). Data nenabízejí zajímavé „uchazeči o gymnázia ztrácejí jinde než
ostatní“. Podrobnosti jsou ve `vysledky.json` pod `pasma` a `skupiny`.

## Co to znamená pro propojení s EDU-AI

1. **Úroveň GPF je pro přijímačky příliš jemná i příliš úzká zároveň.** Jemná, protože s jednou
   nebo dvěma úlohami na dovednost a termín nejde odlišit dovednost od úlohy. Úzká, protože
   konstrukce, Pythagorova věta a měřítko (13, resp. 10 z 50 bodů) nemají v GPF vlastní kolonku.
   Pro EDU-AI to může být užitečný podklad: rámec by pro přípravu na přijímačky potřeboval doplnit.
2. **Shodu v obou testech roku 2024 mají čtyři oblasti:** zlomky a procenta, kde uchazeči
   získávají nadprůměrný podíl bodů, a výrazy a geometrie, kde je podíl mírně podprůměrný. Jestli
   to platí i v jiných ročnících, ukážou až další testy.
3. **Vynechávání je nejvýraznější vzorec, ale nejde vyložit jako strategii.** Kdo nechá prázdnou
   konstrukci nebo výpočet obsahu, s největší pravděpodobností nevěděl, jak začít. Pro procvičování
   je to signál, že slabé místo jsou otevřené úlohy z geometrie a měření, ne že by stačilo „nic
   nevynechávat“.
4. **Další krok, pokud se pokračuje:** stejné přiřazení na testech 2025 (položková data je třeba
   stáhnout z data.cermat.cz) a test stability na hrubých tématech. Teprve pak má smysl uvažovat
   o stránce a o zápisu ukazatele do slovníku.

## Nalezené vady v podkladech EDU-AI

- V `gpf-matematika.json` mají N3.3 a N3.4 stejný popis („řeší operace s desetinnými čísly“).
  Nechal jsem to beze změny, patří to jim.

## Komunikace s cizími servery (pravidlo 7)

Studie nemá issue, proto je záznam zde.

- **prijimacky.cermat.gov.cz**: asi 10 dotazů po jednom (první šel na starou adresu
  prijimacky.cermat.cz, která přesměrovává): úvodní stránka, `robots.txt` (vrací 404), dvě stránky
  s přehledem testů a 3 PDF (testové sešity M4-A a M4-B 2024 a záznamový arch). Uloženo jen do
  dočasné složky session, necommituje se. Zadání se do repozitáře nepřebírá, v přiřazení je jen
  téma úlohy.
- **github.com/edu-ai-00**: 6 veřejných repozitářů naklonovaných (`--depth 1`) do dočasné složky
  session. Do repozitáře se z nich nic nekopíruje, GPF je odkázané přes commit.
- Osobní údaje se nestahují ani neukládají. Položková data jsou anonymní a výstup obsahuje jen
  souhrny.
