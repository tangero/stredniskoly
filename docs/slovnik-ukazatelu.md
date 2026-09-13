# Slovník ukazatelů

Verze 1.6 · 13. 9. 2026 · **Závazný soupis. Nový ukazatel se nezavádí bez zápisu sem.**

Každý ukazatel má jeden název, jednu definici a jeden způsob výpočtu. Když se veličina objeví na webu, v datech, v API nebo v dokumentaci, používá se jméno z tohoto soupisu. Když se způsob výpočtu změní, změní se tady a zároveň se přepíše verze.

Pravidlo pro celý projekt: **údaj bez doloženého výpočtu se nezobrazuje.** Když nevíme, jak vznikl, patří do oddílu 5, ne na stránku.

## 1. Poptávka po oboru a pozice na přihlášce

### Kapacita míst
Počet míst, které škola pro obor v daném kole vypsala. Zdroj: CERMAT, sloupec `KAPACITA`. Pole `kapacita`.

### Přihlášky celkem
Součet přihlášek ze všech priorit. Zdroj: CERMAT, `PŘIHLÁŠKY CELKEM`. Pole `prihlasky`.

Není to počet uchazečů. Jeden uchazeč podává až tři přihlášky, takže se v součtech napříč obory objevuje víckrát.

### Přihlášky podle priority
Rozpad přihlášek na priority 1 až 5. Zdroj: CERMAT, `PŘIHLÁŠKY - PRIORITA 1` až `5`. Pole `prihlasky_priority`, v souboru přihlášek zkráceně `pp`.

### První priority
Přihlášky s prioritou 1, tedy kolik uchazečů si obor zapsalo jako nejžádanější volbu. První položka pole `prihlasky_priority`.

### Podíl prvních voleb
`přihlášky s prioritou 1 ÷ přihlášky celkem`. Jednotka je procento.

Odpovídá na jinou otázku než tlak prvních voleb. Tlak měří **konkurenci** a dělí kapacitou. Podíl měří **pozici oboru na přihlášce** a dělí počtem přihlášek: kolik z těch, kdo se sem přihlásili, sem chtělo nejvíc. Malá škola s pěti místy a velká se sto padesáti mohou mít týž podíl.

Rozdělení ročníku 2026 ze 3 091 nabídek: dolní čtvrtina 0,24, medián 0,34, horní čtvrtina 0,46.

Hodnota silně závisí na typu studia, takže se **nikdy nesrovnává napříč typy**. Medián podílu prvních voleb je u nástaveb 57 %, u osmiletých gymnázií 52 %, u lyceí 26 %.

Je to stabilní vlastnost oboru, ne výkyv ročníku. Na 1 508 nabídkách spárovaných mezi roky 2025 a 2026 je korelace 0,834 a medián absolutní změny 5,2 procentního bodu.

Neříká nic o tom, jak je těžké se dostat. Obor, který si skoro všichni dávají první, může mít volná místa.

### Kohorta podle pozice na přihlášce
Zařazení nabídky do tří skupin podle **percentilu podílu prvních voleb ve srovnatelné skupině** (oddíl 4):

| Kohorta | Percentil ve skupině | Význam |
|---|---|---|
| Škola první volby | nad 67. | uchazeči ji píší na přihlášku jako nejžádanější častěji než dvě třetiny obdobných oborů |
| Smíšená pozice | 33. až 67. | obvyklý poměr první volby a pojistky |
| Záložní volba | pod 33. | většina uchazečů si ji píše jako druhou nebo třetí |

Absolutní prahy se nepoužívají, protože se mezi typy studia neslučují: hranice horní třetiny je u lyceí 32 %, u nástaveb 66 %.

Kohorta je stabilní: mezi roky 2025 a 2026 zůstalo ve stejné třetině 66 % nabídek proti 33 %, které by dala náhoda.

**Neříká nic o kvalitě školy.** Záložní volba znamená, že si ji uchazeči píší jako pojistku, nikoli že je horší. Typicky jde o obory, které lidé volí podle dostupnosti.

Název „škola první volby“ je zavedený pro **nabídku**, ne pro celou školu; škola může mít obor první volby i záložní obor zároveň. Na stránce školy se proto uvádí u každého oboru zvlášť.

### Souběžné přihlášky
Na jaké jiné obory se hlásili titíž uchazeči. Pole `soubeh` v `public/soubeh_prihlasek_2025.json`, generuje `scripts/build-soubeh-prihlasek.py`.

Zdroj jsou údaje o jednotlivých uchazečích za rok 2025 (`PZ2025_kolo1_uchazeci_prihlasky_vysledky.xlsx`), kde je na jednom řádku až pět škol z jedné přihlášky. Podíl je `uchazečů se společnou přihláškou ÷ uchazečů o obor`.

Tři meze, které se musí uvést vždy:

1. **Rok 2025, ne 2026.** Za rok 2026 zveřejnil CERMAT jen souhrny za obory, ne řádky uchazečů, takže souběh za aktuální ročník spočítat nelze.
2. **Bez zaměření.** Soubor nese jen REDIZO a KKOV, takže souběh platí za obor školy jako celek, ne za jednotlivé zaměření.
3. **Nezveřejňuje se pod 10 uchazeči** o obor, aby nešlo dopočítat jednotlivce.

Do souboru se zapisuje šest nejčastějších souběhů. Názvy oborů bez jednotné zkoušky, tedy hlavně učebních, doplňuje rejstřík škol MŠMT.

Neříká, kam uchazeči nakonec nastoupili. Popisuje, co si psali na přihlášku.

### Přihlášky na místo
`přihlášky celkem ÷ kapacita míst`. Pole `index_poptavky`.

**Počítá se výhradně za jednu nabídku, nikdy za školu.** Součet přihlášek za školu sčítá konkurzy pro různé ročníky základní školy a tentýž uchazeč se v něm počítá vícekrát. U Gymnázia Nad Štolou vychází za školu 9,4×, zatímco jednotlivé obory mají 2,5×, 8,9× a 24,0×. Školní číslo neodpovídá ničemu, k čemu se lze přihlásit.

Samotná hodnota nic neříká, dokud se neporovná se srovnatelnou skupinou; viz oddíl 4.

Přihlášky na místo navíc přeceňují skutečnou konkurenci. U 54 % nabídek roku 2026 by první volby nenaplnily ani kapacitu, přestože medián poptávky je 2,62 přihlášky na místo. Zbytek jsou pojistky uchazečů, kteří nastoupí jinam.

### Tlak prvních voleb
`přihlášky s prioritou 1 ÷ kapacita míst`.

Hodnota 1,0 znamená, že obor chtělo jako první volbu přesně tolik uchazečů, kolik má míst. Pod 1,0 se obor z prvních voleb nenaplní a bere i uchazeče, pro které byl druhou nebo třetí volbou.

**Toto je nejspolehlivější ukazatel toho, jak těžké je se na obor dostat**, a je ověřený. Spočítán z roku 2025 předpovídá, zda v roce 2026 zůstal někdo nepřijatý kvůli nedostatku míst, s AUC 0,870 na 1 580 spárovaných nabídkách. Celková poptávka dosáhne 0,801, průměr bodů 0,756. Ověření reprodukuje `python3 scripts/validate-indicators.py`, výstup je v [podkladu](podklady/overeni-ukazatelu-2025-2026.json).

Rozdělení ročníku 2026: dolní čtvrtina 0,50, medián 0,92, horní čtvrtina 1,40.

Neříká, jestli se dostane konkrétní uchazeč. Popisuje, jak silná byla poptávka těch, kdo obor chtěli nejvíc.

### Naplněnost
`přijatí ÷ kapacita míst`. Medián 2026 je 0,97, dolní čtvrtina 0,67.

### Přetlak
`nepřijatí kvůli kapacitě ÷ kapacita míst`. Kolik dalších míst by bylo potřeba, aby se vešli všichni, kdo splnili podmínky. Medián 2026 je 0,13.

## 2. Výsledek přijímacího řízení

### Přijatí
Počet přijatých uchazečů. Zdroj: CERMAT. Pole `prijati`, v kontextu přijetí `accepted`.

### Nepřijatí kvůli kapacitě
Uchazeči, kteří splnili podmínky, ale nevešli se. Pole `capacity_rejected`.

### Nepřijatí pro nesplnění podmínek
Pole `conditions_not_met`. Odlišné od předchozího: tady nerozhodovala kapacita.

### Nastoupili jinam
Uchazeči přijatí, kteří dali přednost oboru s vyšší prioritou. Pole `higher_priority`.

### Průměr JPZ přijatých
Průměrný výsledek přijatých uchazečů v jednotné přijímací zkoušce. Zdroj: CERMAT 2026, pole `cj_ma_prijati` (ČJ+MA), `cj_prijati` a `ma_prijati` (jednotlivé předměty).

Škála: procentní skór CERMAT dělený dvěma. ČJ+MA má rozsah 0–100, jednotlivý předmět 0–50. U upravených testů nejde o původní body.

**Není to hranice přijetí.** Neříká, kolik bodů měl poslední přijatý.

### Historický průměr JPZ 2025
Pole `cj_prumer` a `ma_prumer` v ročníku 2025, převedené na škálu předmětu funkcí `historicalSubjectAverage` v `src/lib/admission-metric.ts`: procentní hodnota krát 5, děleno 10, zaokrouhleno na desetinu.

**Nesmí se nazývat průměrem přijatých.** Zdroj nedokládá, které skupiny se průměr týká ani z kolika osob vznikl; kontrakt to nese v poli `population: 'not_documented'`. Průměr roku 2026 naproti tomu prokazatelně patří přijatým. Proto se obě čísla nedávají do jedné srovnávací tabulky.

### Nejnižší výsledek JPZ mezi přijatými
Nejnižší součet bodů z češtiny a matematiky mezi uchazeči, kteří byli na obor **přijati a zařazeni**. Rozsah 0 až 100. Pole `jpz_min_actual`, doplňkově `cj_at_jpz_min` a `ma_at_jpz_min`, tedy body téhož uchazeče po předmětech.

Zdroj jsou data uchazečů CERMATu za 1. kolo 2025, kde je u každé volby příznak přijetí i výsledek testu. Počítá `scripts/enrich_schools_data.py`, mezivýsledek je v `data/jpz_stats_2025.json`. Filtr je `ss{n}_prijat == 1`; hodnota 2 znamená, že se uchazeč dostal jinam, a do minima nepatří. Procentní skór 0 až 200 se dělí dvěma.

**Není to hranice přijetí.** Je to nejnižší výsledek, se kterým se někdo dostal, tedy dolní mez toho, co stačilo. Skutečná hranice může být níž i výš, protože školy přidávají vlastní kritéria, například známky nebo talentovou zkoušku, a podle nich mohou přijmout uchazeče se slabším testem.

Čtyři omezení, která se musí uvést spolu s číslem:

1. **Rok 2025.** Za rok 2026 data uchazečů zveřejněná nejsou. V katalogu 2026 je hodnota převzatá a označená polem `historicka_data_rok`.
2. **Bez zaměření.** Zdroj nese jen REDIZO a KKOV. U 213 z 2 558 kombinací sdílí několik zaměření jednu hodnotu.
3. **Malé počty.** 1 586 ze 4 350 oborů má méně než deset přijatých. Minimum je tam jednotlivý uchazeč, ne stabilní vlastnost oboru, a nezobrazuje se.
4. **Nepředpovídá příští rok.** Popisuje jeden ročník, nikoli požadavek školy.

### Medián a průměr JPZ přijatých 2025
Pole `jpz_median` a `jpz_prumer_actual`, počítaná týmž skriptem ze stejné množiny přijatých, ve stejném rozsahu 0 až 100.

Medián je u šikmého rozdělení vypovídavější než průměr a měl by mít při zobrazení přednost. Obě čísla jsou v katalogu, ale na webu se zatím nikde nepoužívají.

Nezaměňovat s **průměrem JPZ přijatých** z oddílu výše, který pochází z agregátů CERMATu za rok 2026. Ten platí za nabídku včetně zaměření, tenhle za celý KKOV školy, a jsou to jiné ročníky.

### Soutěžící o obor
Přijatí a ti, kdo se nevešli kvůli kapacitě, dohromady. Je to jmenovatel všech ukazatelů o hranici přijetí.

Dvě skupiny do něj **nepatří** a při zobrazení se uvádějí zvlášť:

- **Nastoupili jinam**: dostali se, ale dali přednost oboru s vyšší prioritou, takže o místo nakonec nesoutěžili.
- **Nesplnili podmínky**: vypadli na jiném kritériu než na výsledku testu.

U osmiletého gymnázia J. S. Machara bylo v roce 2025 soutěžících 68, ale nesplnilo podmínky 107 dalších uchazečů. Podíl přijatých ze soutěžících by bez této poznámky byl zavádějící.

### Podíl přijatých podle bodového pásma
Pro každý obor rozdělení soutěžících do pásem po pěti bodech a podíl přijatých v každém pásmu. Pole `pasma` v `public/pasma_prijeti_2025.json`, generuje `scripts/build-pasma-prijeti.py`.

Zdroj jsou data uchazečů CERMATu za 1. kolo 2025. Škála je 0 až 100 bodů, tedy procentní skór dělený dvěma.

Pásmo s méně než pěti soutěžícími se slučuje se sousedním, aby „1 z 1“ nevypadalo jako spolehlivých 100 %. Pásma se počítají jen u oborů s aspoň 30 soutěžícími, z nichž aspoň jeden byl odmítnut kvůli kapacitě; těch je 1 546.

Obory, kde nikdo odmítnut nebyl, pásma nemají: každé by vyšlo na 100 % a tabulka by vypadala jako záruka přijetí. Místo ní platí pole `nikdo_neodmitnut_pro_kapacitu`.

**Není to šance konkrétního uchazeče.** Popisuje, jak dopadli loňští uchazeči s podobným výsledkem. Kritéria, kapacita i složení uchazečů se mezi roky mění, takže formulace musí být v minulém čase o roce 2025.

Platí za celý obor školy bez rozlišení zaměření, viz omezení u nejnižšího výsledku JPZ mezi přijatými.

### Rozhodl test
Pravděpodobnost, že náhodně vybraný přijatý měl lepší výsledek jednotné zkoušky než náhodně vybraný uchazeč, který se nevešel kvůli kapacitě. Plocha pod ROC křivkou. Pole `rozhodl_test`.

Hodnota 1,0 znamená, že o přijetí rozhodl výhradně výsledek testu. Hodnota 0,5 znamená, že výsledek nerozhodoval vůbec.

Počítá se u oborů s aspoň deseti přijatými a pěti odmítnutými kvůli kapacitě, tedy u 1 545. Medián je 0,97, hodnotu 1,00 má 7 % oborů, aspoň 0,85 má 87 %.

Ověřeno mezi ročníky: na 1 185 oborech spárovaných mezi roky 2024 a 2025 je korelace 0,783 a medián absolutní změny 0,015.

**Neměří kvalitu ani spravedlnost.** Nízká hodnota znamená, že škola vážila i něco jiného než test, například prospěch nebo vlastní zkoušku, což je legitimní.

**Název je zkratka, ne důkaz příčiny.** Míra popisuje shodu pořadí podle testu s výsledkem přijímání. Škola, která řadí podle prospěchu, dosáhne vysoké hodnoty také, protože prospěch s výsledkem testu souvisí. Vysoká hodnota tedy neznamená, že jiné kritérium použito nebylo, jen že s testem nešlo do rozporu.

**Číslo se nezobrazuje**, zobrazuje se věta o tom, co znamená. Projekt si na této míře už jednou vylámal zuby: AUC 0,870 bylo v dřívějším textu nesprávně popsáno jako „správně odhadlo 87 % oborů“.

Nezobrazuje se vůbec u uměleckých oborů skupiny 82 (`talentova_zkouska`), kde je medián 0,66, protože o přijetí rozhoduje z velké části talentová zkouška, o které data nemáme. U oborů s více zaměřeními pod jedním klíčem (`vice_zamereni`) je medián 0,92 a zobrazuje se s poznámkou.

### Pásmo nejistoty
Rozsah od nejnižšího výsledku mezi přijatými k nejvyššímu mezi nepřijatými kvůli kapacitě. Pole `pasmo_nejistoty`, obsazenost `v_pasmu_nejistoty`.

Uvnitř tohoto rozsahu rozhodovala o přijetí i jiná kritéria než test. Pod ním se loni nedostal nikdo, nad ním se dostali všichni.

Medián podílu soutěžících v pásmu je 29 %, horní čtvrtina 51 %.

Meze se dosazují do vět **každá zvlášť**: pod dolní mezí se nedostal nikdo, nad horní se dostali všichni. U 8 % oborů jsou obě meze shodné a platí třetí věta, že přesně s tímto výsledkem se někdo dostal a někdo ne.

**Je to popis loňska, ne míra.** Oba konce určuje jediný uchazeč, takže se **nepoužívá k porovnávání oborů ani k řazení**. Šířka pásma je navíc mezi ročníky nestabilní: korelace 0,682 a medián změny 4 body proti mediánové šířce 8 bodů. Ve verzi 1.4 tu stál ukazatel „překryv u hranice přijetí“, který z těchto dvou hodnot dělal měřítko; při záměně krajních hodnot za devadesátý a desátý percentil se u 41 % oborů obracel verdikt, a proto byl nahrazen mírou *rozhodl test*.

### Hustota u hranice
Podíl soutěžících, jejichž výsledek leží do pěti bodů od nejnižšího přijatého. Pole `hustota_u_hranice`.

Medián je 28 %, takže u poloviny oborů se kolem hranice tísní víc než čtvrtina uchazečů a rozhoduje jediný bod. Nízká hodnota znamená, že hranice leží v řídkém místě a jeden bod nic nemění.

### Hranice přijetí
**Nemáme a mít nebudeme.** CERMAT nezveřejňuje, kolik bodů měl poslední přijatý podle kritérií školy, a z průměru se to spočítat nedá. Nejbližší doložený údaj je nejnižší výsledek JPZ mezi přijatými výše, který je dolní mezí, ne hranicí.

Do 13. 9. 2026 tu stálo, že nemáme ani to minimum. Bylo to nesprávné: pole `jpz_min_actual` existuje v katalogu od začátku a počítá ho `scripts/enrich_schools_data.py`.

## 3. Kohorty přijatých

Devět skupin přijatých podle úrovně a vyváženosti výsledku, například „Výborný matematik“ nebo „Slabší humanitní“. Definice hranic je v `public/cohort_meta.json`.

Normalizace ročníku 2025: čeština průměr 27,87 a směrodatná odchylka 10,11, matematika průměr 19,71 a odchylka 9,97. Úroveň je průměr obou z-skóre, vyváženost jejich rozdíl.

Popisují složení přijatých, ne šanci konkrétního uchazeče.

## 4. Zařazení do srovnatelné skupiny

Aby číslo něco znamenalo, porovnává se s rozdělením téhož ukazatele v ročníku.

**Srovnatelná skupina** je dvojice typ školy a délka studia, například čtyřleté gymnázium nebo dvouletá nástavba. Napříč typy se neporovnává; medián přihlášek na místo je u osmiletých gymnázií 3,31, u učebních oborů 2,04, a rozdíl nevypovídá o náročnosti, ale o tom, že jde o jiné vzdělávání.

**Percentil ve skupině** je podíl nabídek ve skupině s hodnotou menší nebo rovnou dané hodnotě. Vyjadřuje se slovy: „vyšší poptávka než u čtyř pětin čtyřletých gymnázií“.

Rozdělení se počítá z aktuálního ročníku, nikdy se nezadává ručně, a přepočítává se s každým importem.

## 5. Maturitní výsledky

Analytický návrh je schválený v [maturitní výsledky a kvalita školy](maturitni-vysledky-a-kvalita-skoly-2027.md). **Do runtime zatím nic z toho importováno není**, takže názvy níže jsou zatím kontrakt, ne existující pole.

### Granularita, která rozhoduje o všem
CERMAT zveřejňuje maturitu za právnickou osobu (`redizo`) a za školu ve skupině oborů (`redizo_smo16`). Skupina `SMO16` **není** kód oboru `KKOV`.

Z toho plyne tvrdé pravidlo: školní agregát se nikdy nezobrazí jako výsledek konkrétního oboru. Když přesný oborový výsledek nemáme, nadpis zní „výsledek školy ve skupině oborů“.

### Úspěšnost maturity
Podíl úspěšných z konajících. Pole `passRate`. Vždy se jmenovatelem vedle podílu.

Úspěšnost konajících není úspěšnost všech přihlášených; neúčast se vede zvlášť jako `nonParticipationRate`.

### Průměrný procentní skór maturity
Průměrný výsledek v didaktickém testu daného předmětu. Pole `averagePercentScore`, rozptyl `standardDeviation`, percentil `averagePercentile`.

Vždy s uvedením předmětu, roku, období a velikosti vzorku.

### Období
`jaro` nebo `stav_po_podzimu`. Soubor `jap` je stav po podzimním období, ne samostatný podzimní termín. **Obě období se nesčítají a nepřekrývají v grafu.**

### Odchylka od očekávaného výsledku
Výzkumný ukazatel, který by zohlednil vstupní úroveň žáků. **Zatím neexistuje a bez validace se nepublikuje.** Nesmí se nazývat kvalitou školy ani přidanou hodnotou.

Vysoký maturitní výsledek může být důsledkem toho, kdo do školy nastoupil. Bez vstupního kontextu se nečte jako zásluha školy.

### Meze zveřejnění
Při počtu maturantů pod 10 se zveřejňují jen počty, mezi 10 a 29 s upozorněním, od 30 běžně. U malých skupin se nedopočítávají podíly, které by rekonstruovaly skryté údaje.

## 6. Ukazatele bez doloženého výpočtu

### Index obtížnosti (`obtiznost`)
Hodnota 0–100 v `public/school_analysis.json` u 2 901 oborů.

**Definice ani vzorec nejsou dohledané.** [Audit z 11. 9. 2026](audit-obtiznost-prijeti-2027.md) prohledal zdroje, dokumentaci i historii repozitáře a generátor nenašel. Hodnota se nezměnila ani po přidání dat 2026, takže nepopisuje aktuální ročník. Komentář v `src/lib/priorities/calculations.ts` ji označuje za percentil, což doložené není.

**Pokus o zpětné odvození z dat (12. 9. 2026) vzorec neobnovil.** Hodnota roste s průměrem bodů (korelace 0,83), s minimem bodů (0,80) a s poptávkou (0,68). Nejlepší nalezené proložení kombinuje percentil poptávky s průměrem bodů a vysvětluje 90 % rozptylu, ale přesně sedí jen u 23 z 2 515 hodnot. Aproximaci nelze zapsat jako definici.

Vyšlo přitom najevo, že **všech 386 nulových hodnot vzniklo z chybějících dat**: u každé z nich chybí jak minimum, tak průměr bodů. Chybějící údaj se tedy tvářil jako nejsnazší obor.

Z profilu oboru byla odstraněna. **Nadále ji ale používají tři místa:**

| Kde | Jak |
|---|---|
| `src/app/skoly/page.tsx` | Předává se do žebříčku škol |
| `src/app/api/dostupnost/route.ts` | Sčítá se a průměruje za REDIZO |
| `src/lib/priorities/calculations.ts` | Pracuje se s ní jako s percentilem |

Dokud nemá doložený výpočet, nemá se používat k řazení ani k průměrování. Doporučení je **nahradit ji tlakem prvních voleb** z oddílu 1: má definici, je ověřený na nepoužitém ročníku a rozlišuje lépe. Hodnota `obtiznost` může v datech zůstat kvůli dohledatelnosti.

**Složený index se nevyplatí.** Kombinace tlaku prvních voleb s průměrem bodů dosáhne AUC 0,872 proti 0,870 samotného tlaku, přidání celkové poptávky ji dokonce zhorší na 0,865. Vážený součet by tedy jen zhoršil srozumitelnost, aniž by něco přidal.

### Kategorie oboru (`category_code`, `category_name`)
Například „Vyvážený obor“. Způsob zařazení není dohledaný. Platí totéž co výše.

## 7. Jak zavést nový ukazatel

1. Zapsat jej sem: název, definice jednou větou, vzorec, zdroj, jednotka, rozsah platnosti.
2. Uvést, co ukazatel **neříká**. U většiny čísel je to důležitější než definice.
3. Ověřit, že jméno se neplete s jiným. Pokud podobný ukazatel existuje, buď se použije, nebo se v obou zápisech vysvětlí rozdíl.
4. Teprve potom jej zobrazit na webu, vždy s větou, co znamená.

## 8. Historie

| Verze | Změna |
|---|---|
| 1.6 | Doplněno, že míra *rozhodl test* popisuje shodu pořadí, ne příčinu. Pásma se nepočítají u oborů bez odmítnutých. Doplněna pravidla pro dosazení mezí pásma nejistoty. |
| 1.5 | Překryv u hranice přijetí zrušen jako nerobustní a nahrazen mírou *rozhodl test*; krajní hodnoty zůstávají jako pásmo nejistoty bez srovnávací funkce. |
| 1.4 | Doplněni soutěžící o obor, podíl přijatých podle bodového pásma, překryv u hranice přijetí a hustota u hranice. |
| 1.3 | Opraveno tvrzení, že nemáme nejnižší výsledek přijatých. Doplněn nejnižší výsledek JPZ mezi přijatými, medián a průměr JPZ přijatých 2025. |
| 1.2 | Doplněn podíl prvních voleb, kohorta podle pozice na přihlášce a souběžné přihlášky. |
| 1.1 | Doplněn tlak prvních voleb, naplněnost a přetlak. Zaznamenán neúspěšný pokus o zpětné odvození indexu obtížnosti a zjištění, že složený index nepřidává rozlišovací schopnost. |
| 1.0 | První soupis. Podkladem je audit obtížnosti, audit dat karet, [návrh prezentace dat](navrh-prezentace-dat-skoly-2027.md) a [maturitní výsledky](maturitni-vysledky-a-kvalita-skoly-2027.md). |
