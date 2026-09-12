# Slovník ukazatelů

Verze 1.0 · 12. 9. 2026 · **Závazný soupis. Nový ukazatel se nezavádí bez zápisu sem.**

Každý ukazatel má jeden název, jednu definici a jeden způsob výpočtu. Když se veličina objeví na webu, v datech, v API nebo v dokumentaci, používá se jméno z tohoto soupisu. Když se způsob výpočtu změní, změní se tady a zároveň se přepíše verze.

Pravidlo pro celý projekt: **údaj bez doloženého výpočtu se nezobrazuje.** Když nevíme, jak vznikl, patří do oddílu 5, ne na stránku.

## 1. Poptávka po oboru

### Kapacita míst
Počet míst, které škola pro obor v daném kole vypsala. Zdroj: CERMAT, sloupec `KAPACITA`. Pole `kapacita`.

### Přihlášky celkem
Součet přihlášek ze všech priorit. Zdroj: CERMAT, `PŘIHLÁŠKY CELKEM`. Pole `prihlasky`.

Není to počet uchazečů. Jeden uchazeč podává až tři přihlášky, takže se v součtech napříč obory objevuje víckrát.

### Přihlášky podle priority
Rozpad přihlášek na priority 1 až 5. Zdroj: CERMAT, `PŘIHLÁŠKY - PRIORITA 1` až `5`. Pole `prihlasky_priority`, v souboru přihlášek zkráceně `pp`.

### První priority
Přihlášky s prioritou 1, tedy kolik uchazečů si obor zapsalo jako nejžádanější volbu. První položka pole `prihlasky_priority`.

### Přihlášky na místo
`přihlášky celkem ÷ kapacita míst`. Pole `index_poptavky`.

**Počítá se výhradně za jednu nabídku, nikdy za školu.** Součet přihlášek za školu sčítá konkurzy pro různé ročníky základní školy a tentýž uchazeč se v něm počítá vícekrát. U Gymnázia Nad Štolou vychází za školu 9,4×, zatímco jednotlivé obory mají 2,5×, 8,9× a 24,0×. Školní číslo neodpovídá ničemu, k čemu se lze přihlásit.

Samotná hodnota nic neříká, dokud se neporovná se srovnatelnou skupinou; viz oddíl 4.

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

### Hranice přijetí
**Nemáme.** CERMAT ji nezveřejňuje a nelze ji odvodit z průměru. Na stránce se uvádí, že ověřené minimum nemáme.

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

Z profilu oboru byla odstraněna. **Nadále ji ale používají tři místa:**

| Kde | Jak |
|---|---|
| `src/app/skoly/page.tsx` | Předává se do žebříčku škol |
| `src/app/api/dostupnost/route.ts` | Sčítá se a průměruje za REDIZO |
| `src/lib/priorities/calculations.ts` | Pracuje se s ní jako s percentilem |

Dokud nemá doložený výpočet, nemá se používat k řazení ani k průměrování. Buď se dohledá nebo znovu odvodí a zapíše sem definice, nebo se z těchto tří míst odstraní. Hodnota v datech může zůstat kvůli dohledatelnosti.

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
| 1.0 | První soupis. Podkladem je audit obtížnosti, audit dat karet, [návrh prezentace dat](navrh-prezentace-dat-skoly-2027.md) a [maturitní výsledky](maturitni-vysledky-a-kvalita-skoly-2027.md). |
