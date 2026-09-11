# Oponentura návrhu rozvoje 2027

Verze 3.0 / R3. Zpracováno 11. 9. 2026. Předmět: `navrh-rozvoje-2027.md` v2.2 §13, `prd-muj-vyber-2027.md` v0.6, `analyza-navstevnosti-2026.md`.

Stav: oponentní posudek. **OVĚŘENO** = doloženo spuštěním kódu nebo stažením zdroje; **NÁZOR** = argumentace bez tvrdého důkazu.

## R3: stanovisko k vypořádání R2

Autor odpověděl na všech 19 ID. Ověřil jsem čtyři jeho protidůkazy. **Tři platí, jeden se mi podařilo rozřešit až na příčinu.** Jedno tvrzení R2 je mezitím fakticky překonané.

### O-19: přejímka splněna, bod uzavírám

**OVĚŘENO 11. 9. 2026 po nasazení.** R2 uvádí stav „produkce stále vrací 500“ s následnou kontrolou v 11:33 CEST. To bylo v tu chvíli správné. Mezitím byla oprava commitnuta (`c51b3c9`), sloučena do `main` a nasazena (`dpl_NKpQBR`).

R2 stanovilo přejímací podmínky. Prošel jsem je všechny:

| Podmínka R2 | Výsledek |
|---|---|
| GET všech tří adres vrací 200 | Splněno |
| Obrazový MIME typ, ne HTML | `image/png` u všech tří |
| Dekódovatelný obraz očekávaných rozměrů | PNG 1200×630 ověřeno rozborem hlavičky souboru |
| Skutečné `og:image` z metadat, včetně parametrů a přesměrování | Splněno pro `/`, `/regiony`, `/simulator` |
| `twitter:image` | Shodné s `og:image`, rovněž 200 |

Naměřené velikosti: 49,6 kB, 59,1 kB a 49,3 kB. Odkazy v metadatech míří na holou doménu s parametrem a přes přesměrování na `www` vracejí obraz, nikoli HTML.

**Stav: uzavírám jako opravené a ověřené.** Zbývá jediná věc, kterou R2 správně oddělilo: cache sociálních sítí. Facebook má u dříve sdílených odkazů starý prázdný náhled a je nutné jej protlačit nástrojem Sharing Debugger. To je úkon mimo kód a mimo mé možnosti.

Přijímám i výhradu R2, že počet návštěv ze sociálních sítí dokládá existenci kanálu, nikoli velikost ztráty prokliků. Moje formulace v R2 byla v tomto ohledu širší, než data unesou.

### O-15: příčinu rozdílu jsem dohledal, autor měl pravdu

**OVĚŘENO.** R2 odmítlo přepsat 12 137 na 12 208 s tím, že příčinu mého čísla nelze doložit. Dohledal jsem ji.

Rozdíl nezpůsobil jiný snímek ani chyba přepisu, ale **odlišné datum začátku rozsahu**:

| Dotaz | Others | Prefix `/skola/` |
|---|---:|---:|
| `date=2026-02-11,2026-09-11` (A1) | 12 139 | 14 464 |
| `date=2026-02-01,2026-09-11` (můj v R2) | **12 210** | 14 464 |

Používal jsem `2026-02-01` jako počátek, zatímco A1 správně `2026-02-11`. Hodnoty se posunuly o dva body oproti původnímu měření kvůli mezitím přibylému provozu, ale rozdíl mezi oběma rozsahy zůstává stejných 71 zobrazení.

**Parametr `language=en` na hodnotu vliv nemá**, ověřeno oběma variantami. To vyvrací mou domněnku, že šlo o jiné parametry dotazu.

**Doporučení R2 stahuji.** Číslo 12 137 v A1 je správné pro deklarovaný rozsah a nemá se přepisovat. Chyba byla na mé straně: uvedl jsem rozsah nepřesně a rozdíl jsem přičetl špatné příčině.

**Pozoruhodnost, kterou nechávám otevřenou.** Období 1. až 10. 2. 2026 vykazuje **nula návštěv a nula akcí**, přesto se součet zobrazení `/skola/ - Others` mezi oběma rozsahy liší o 71. Nula návštěv při nenulovém rozdílu v agregátu naznačuje, že archivace řádku Others závisí na hranicích archivovaného období, nikoli jen na obsažených datech. Podporuje to závěr R2, že rozdíly nelze vysvětlit jedinou příčinou, a je to argument pro zásadu pracovat s pevně deklarovaným rozsahem.

### O-16: přijímám upřesnění

**NÁZOR.** R2 správně namítá, že mé vysvětlení rozdílem +13 a +15 nevysvětluje původních 322 vstupů. Souhlasím; rozdíl 322 zůstává nevysvětlený a nemá se používat pro výpočet konverzního trychtýře. Můj příspěvek byl pozorování, ne vysvětlení, a R2 to formuluje přesněji.

### O-17: protidůkaz platí, mou příčinu beru zpět

**NÁZOR, opřený o doklad autora.** Tvrdil jsem, že čtení Web Analytics přes API zřejmě vyžaduje vyšší úroveň. R2-E3 doložilo oficiální dokumentaci, podle níž jsou metriky dostupné přes `vercel metrics` bez Observability Plus.

**Moje vysvětlení příčiny 404 tedy nemá oporu a beru je zpět.** Formulace R2 „programový přístup k tomuto účtu zatím neověřen“ je přesnější než moje. Souhlasím i s tím, že z chyby 404 se nemá vyvozovat potřeba kupovat vyšší tarif; to bych ze své formulace mohl nechtěně naznačit.

Trvám jen na popisu pozorování: dotaz na `prj_Yh3UG…` vracel 404, zatímco jiné dotazy na tentýž projekt fungovaly.

### O-18: rozlišení je správné, moje zobecnění bylo příliš široké

**OVĚŘENO částečně.** R2-E4 doložilo, že detail požadavku na Vercelu obsahuje Request User Agent. Moje formulace „runtime logy neobsahují user agent“ platí pro **výpis, který jsem měl k dispozici**, nikoli pro platformu obecně. To je podstatný rozdíl a R2 jej pojmenovalo správně.

Mezitím se ale otázka vyřešila jinou cestou. Rozbor strojového exportu NDJSON z BetterStacku ukázal **43 polí včetně `vercel.proxy.user_agent` a `vercel.proxy.referer`**. Doklad z exportu: záznam `/skola/…​.md` s user agentem prohlížeče a záznam `/opengraph-image` s `facebookexternalhit/1.1`.

R2 tento nález eviduje jako „nové hlášené pozorování, které zde nebylo nezávisle reprodukováno“, což je korektní. Věcně z něj plyne, že vlastní logovací modul potřeba není a stačí konfigurace dotazu nad drainem.

Přijímám dvě výhrady R2 bez námitek:

- **Nula pod `/api/skola/` v mém vzorku není důkaz nepoužívání formátů.** Vzorek byl jedna hodina mimo sezónu a navíc jsem nezohlednil, že veřejné cesty `/skola/*.md` chodí přes rewrite. To byla chyba v mé interpretaci.
- **Logování uvnitř cachovaného handleru nezachytí provoz CDN.** Drain naproti tomu zahrnuje i statické zásahy, takže je pro tento účel vhodnější než vlastní modul.

### Body, které R2 uzavřelo správně

O-1, O-2, O-3, O-5 a O-6 jsem stáhl už v R2 a R2 to správně eviduje jako uzavřené metodické a faktické spory. K O-4, O-7 až O-12 a O-14 nemám v tomto kole nové výhrady.

**O-13 zůstává otevřeným blokátorem.** R2-E5 znovu doložilo, že veřejný JS obsahuje kategorie s prahem ±10 a že `chances.ts` stále vrací predikční pole. Souhlasím s podmínkou uzavřít bod až commitem, testy a ověřením veřejného výsledku.

### Hodnocení vypořádání R2

Dvě věci stojí za pojmenování.

**Odmítnutí opravit číslo bylo správné.** Autor mohl mou připomínku k O-15 pohodlně přijmout a číslo přepsat. Místo toho trval na doložené hodnotě a vyžádal si úplné parametry. Ukázalo se, že chyba byla na mé straně. Kdyby připomínku přijal, dokument by dnes obsahoval číslo neodpovídající deklarovanému rozsahu.

**Rozlišení „co chybí v konkrétním výpisu“ od „co platforma neumí“** u O-18 je přesně ta opatrnost, kterou jsem v předchozím kole nedodržel.

Jediné, co bych R2 vytkl, je délka. Sekce 13 je místy tak obezřetná, že hlavní sdělení se hledá obtížně; u O-18 je podstatná informace až v posledním odstavci. Pro práci s dokumentem by pomohlo dát na začátek každého bodu jednu větu se stavem.

---

## R3: nová zjištění

### O-20. Analýza v1.1 neuvádí, že provoz před 11. 2. je nulový

**Stav:** otevřeno. **Priorita:** nízká. **OVĚŘENO.**

Analýza správně uvádí, že měření začalo 11. 2. 2026 a únor je tedy neúplný. Dotaz na období 1. až 10. 2. 2026 ale vrací **nula návštěv a nula akcí**, nikoli chybějící data.

To je užitečnější formulace, než jakou oba dokumenty používají. Neznamená to, že web v té době neměl návštěvníky; znamená to, že měření nic nezaznamenalo. Pro čtenáře je rozdíl mezi „nevíme“ a „nula v měření“ podstatný, zejména při úvahách o tom, jak vysoký byl skutečný únorový vrchol.

Doporučuji doplnit jednou větou do sekce o rozsahu a omezeních.

---

## Historie: kolo R2

**Historický text:** následující původní tvrzení a stavy nejsou aktuálním souhrnem. Kde byla v R2 stažena (zejména kohorta a plošné párování), platí rozhodnutí R2 výše a aktuální tabulka v návrhu §13. Ponecháváme je jako doklad původu připomínek.

Autor mezitím vydal PRD v0.3, doplnil hlavičku návrhu rozvoje a upravil záznam dodávky. Změny reaguji takto:

**Metodická výtka verze 1.0 je vyřešena.** Hlavní výhrada 1.0 zněla, že návrh rozvoje popisuje stav před commitem `c9ae452` a nelze jej použít jako zadání. Návrh nyní nese hlavičku, která to říká výslovně: „Níže uvedené počty, nedostatky a doporučení zachycují výchozí stav na commitu `c17d42e`; nejsou aktuálním seznamem nevyřešených chyb.“ Doporučení z verze 1.0 rozdělit dokument na archiv a živé zásady bylo naplněno jinou, ale funkční cestou.

**PRD v0.3 řeší to, co verze 1.0 požadovala.** Tabulka „Aktuální stav realizace“ odděluje hotové od navrženého, odlišuje produktové schválení od implementace („Schválení produktové volby není dokladem její implementace“) a uvádí doklad nasazení včetně commitu a ověření veřejných souborů. To je přesně ten typ rozlišení, který verze 1.0 oceňovala na původním návrhu.

**Co PRD neřeší.** Body O-1 až O-3 (historie JPZ 2017–2023, maturitní data po školách, kohortní analýza) nejsou v PRD v0.3 ani v záznamu dodávky nijak tematizovány. Ověřeno hledáním v obou dokumentech. Zůstávají otevřené beze změny.

**Nové zjištění při ověřování.** Kontrola kódu ukázala, že O-4 byl ve verzi 1.0 formulován nepřesně. Podrobnosti níže; vzniká z toho nový bod O-13.

---

## Část A: Zjištění, která mění závěry návrhu

### O-1. Data JPZ po školách existují od roku 2017, nikoli od 2024

**Odpověď R1, 11. 9. 2026:** odpověď autora k oponentnímu ověření. [Rozhodnutí a důkaz k O-1](navrh-rozvoje-2027.md#r1-o-1). Níže je původní stanovisko v1.1.

**Stav:** zdroje potvrzeny, závěr o kohortě v R2 stažen. **Priorita:** střední. **OVĚŘENO** stažením souborů.

> **Oprava (R2).** Existence souborů 2017–2023 platí. Závěr, že umožňují kohortní propojení vstupu a výstupu, **neplatí**: hlavička JPZ 2022 obsahuje jen PŘIHLÁŠENI, KONALI, NEKONALI a percentily, nikoli přijaté. Vstupní úroveň přijatých na konkrétní školu z těchto dat nezískáme. Viz přehled v úvodu R2.

Pracovní domněnka zněla, že data CERMATu nesahají před rok 2024, a proto nelze propojit vstupní a výstupní výsledky jedné kohorty. Tato domněnka je nesprávná.

CERMAT publikuje agregované výsledky JPZ po školách za roky 2017 až 2023 pod odlišným názvem souboru, než jaký používá pro ročníky od 2024:

```
https://data.cermat.cz/files/files/JPZ/agregovana_data_skoly/JPZ<ROK>_skoly-skolobory_vysledky.xlsx
```

Ověřeno stažením a rozborem obsahu:

| Rok | Řádků | Unikátních REDIZO | Názvy listů | Sloupců |
|---|---:|---:|---|---:|
| 2017 | 3 423 | 1 086 | `JPZ2017_red`, `ciselniky` | 22 |
| 2019 | 3 277 | 1 060 | `JPZ2019_red`, `ciselniky` | 20 |
| 2021 | 2 056 | 719 | `JPZ2021`, `ciselniky` | 18 |
| 2022 | 3 295 | 1 066 | `JPZ2022-radny a nahradni termin` | 24 |
| 2023 | 3 318 | 1 076 | `List1` | 24 |

Obsah za školu a oborovou skupinu: přihlášení, konali, nekonali, průměrné percentilové umístění a směrodatná odchylka, zvlášť pro český jazyk a matematiku.

Omezení, která je nutné respektovat:

- Starší soubory měří **percentilové umístění**, nikoli body ani procentní skór. Se současnými daty nejsou přímo srovnatelné bez explicitního převodu.
- Jde o výsledky **všech konajících** v dané škole, nikoli o výsledky přijatých. To je jiná populace, než se kterou projekt pracuje dnes.
- Rok 2021 je covidový ročník s výrazně nižším pokrytím (719 REDIZO). Je to věcné omezení dat, nikoli chyba importu.

Co skutečně nejde a co domněnka správně vystihla: **data po jednotlivých uchazečích** jsou až od roku 2024. CERMAT to uvádí výslovně na přehledové stránce: „Od roku 2024 jsou k dispozici data po uchazečích s údaji o všech jejich přihláškách na střední školy, s údajem o přijetí na SŠ a s výsledky didaktických testů JPZ.“ Zpětnou rekonstrukci chování jednotlivce tedy provést nelze, pouze školní agregáty.

**Důsledek.** Kohortní propojení vstupu a výstupu je proveditelné. Maturanti jara 2026 nastupovali do čtyřletých oborů v roce 2022, a pro ten rok data po školách existují. Vazba je v percentilech, nikoli v bodech.

Zdroj: [Agregovaná data JPZ](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/agregovana-data-jpz.html), [přehled dat JPZ](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska.html).

---

### O-2. Maturitní výsledky po školách chybí v auditu dostupných zdrojů

**Odpověď R1, 11. 9. 2026:** odpověď autora k oponentnímu ověření. [Rozhodnutí a důkaz k O-2](navrh-rozvoje-2027.md#r1-o-2). Níže je původní stanovisko v1.1.

**Stav:** otevřeno. **Priorita:** vysoká. **OVĚŘENO** stažením souboru.

Návrh v tabulce přehledů uvádí řádek „Co po absolvování oboru“ a odkazuje na nezaměstnanost absolventů podle oborových skupin. Neobsahuje žádnou zmínku o tom, že CERMAT publikuje maturitní výsledky **na úrovni jednotlivých škol**. To je v auditu dostupných dat vynechání, nikoli názorový rozdíl.

```
https://data.cermat.cz/files/files/MZ/agregovana_data_skoly/MZ<ROK><j|p>_SC_skolobory.xlsx
```

Dostupné roky 2015 až 2026, jarní i podzimní termín. Ověřen soubor `MZ2026j_SC_skolobory.xlsx`: 3 739 řádků, 98 sloupců, 2,2 MB.

Struktura je hierarchická, úroveň agregace rozlišuje sloupec `TŘÍDĚNÍ`:

| Úroveň | Řádků |
|---|---:|
| `total` (ČR celkem) | 1 |
| `typ_skoly` | 5 |
| `kraj`, `smo16`, kombinace | 322 |
| `redizo` | 1 112 |
| `redizo_smo16` | 2 297 |

Za každou školu: přihlášeni, konali, uspěli, neuspěli, nekonali, podíl úspěšných, čistá a hrubá neúspěšnost, neúčast. Celkem za společnou část i zvlášť pro sedm předmětů (ČJ, MA, AJ, NJ, RJ, FJ, ŠJ), u předmětů navíc průměrný procentní skór, směrodatná odchylka, průměrné percentilové umístění a podíl volby předmětu.

Párování na stávající data je přímé přes REDIZO. Rozdíl granularity: projekt pracuje s obory podle KKOV, maturitní data jsou po skupinách oborů (`smo16`).

Zdroj: [Agregovaná maturitní data](https://data.cermat.cz/maturitni-zkouska/agregovana-data.html).

---

### O-3. Odmítnutí maturitních dat je metodicky nekonzistentní

**Odpověď R1, 11. 9. 2026:** odpověď autora k oponentnímu ověření. [Rozhodnutí a důkaz k O-3](navrh-rozvoje-2027.md#r1-o-3). Níže je původní stanovisko v1.1.

**Stav:** v R2 přehodnoceno, požadavek na zadání studie přijat autorem. **NÁZOR.**

> **Oprava (R2).** Můj argument stál na předpokladu z O-1, že kohorta je dosažitelná. Ten padl. Autorovo řešení (popisná studie s vymezenými omezeními, bez slibu měření přidané hodnoty) je správnější než moje původní formulace.

Návrh uvádí: „Maturitní výsledky bez návazné kohorty a kontextu nedokazují přidanou hodnotu školy.“

Jako varování je to správné a souhlasím s ním. Jako důvod data nepoužít to neobstojí, protože **návazná kohorta je podle O-1 dosažitelná**: vstup z JPZ 2022, výstup z maturity 2026, klíčem REDIZO.

Nekonzistence: návrh v sekci 7 sám požaduje zpětné ověření odhadů na dosud nepoužitém ročníku (trénovat na 2024–2025, vyhodnotit na 2026). To je metodicky totéž myšlení. Není konzistentní požadovat backtesting u jednoho a odmítat kohortní analýzu u druhého.

Návrh na úpravu formulace: odmítnout **jednoduchý žebříček podle maturitních výsledků** (s tím souhlasím bez výhrad, viz O-11) a současně **zadat ověření** rozdílu mezi očekávaným a skutečným maturitním výsledkem vzhledem ke vstupní úrovni přijatých. Publikovat teprve po ověření, nikoli odmítnout předem.

---

## Část B: Technické výtky návrhu, které obstály

### O-4. Kalkulačka šancí ignoruje body dítěte

**Odpověď R1, 11. 9. 2026:** implementace otevřená. [Rozhodnutí a důkaz k O-4](navrh-rozvoje-2027.md#r1-o-4). Níže je původní stanovisko v1.1.

**Stav:** zúženo k 11. 9. 2026 (verze 1.1). **Priorita:** snížena z kritické na nízkou. **OVĚŘENO** v kódu.

> **Oprava proti verzi 1.0.** Verze 1.0 tvrdila, že modul „běží na produkci a zobrazuje procenta“. Kontrola vykreslování to nepotvrdila. V `src/app/moje-sance/MojeSanceClient.tsx` se z výsledku vykresluje pouze `acceptRate2025`, `acceptRate2024`, `trendLabel`, `demandColor` a počty uchazečů podle priority. Pole `chancePct`, `label` ani `estimatedMinScore` se uživateli nezobrazují. Odpovídá to tvrzení PRD v0.3, že z přehledu konkurence byla odstraněna „nepodložená osobní procenta a předpovědi“. Tvrzení verze 1.0 o produkčním riziku bylo v tomto místě nepřesné.

Zbývající, výrazně menší problém: mrtvý výpočet zůstává v kódu a je stále exportován přes `analyzeCombination`. Pokud jej někdo v budoucnu napojí na zobrazení, vada se vrátí bez varování. Doporučení: buď výpočet odstranit, nebo u něj ponechat komentář, proč se nesmí vykreslovat.

Vlastní popis vady zůstává v platnosti, protože kód se nezměnil. V `src/lib/chances.ts`:

- řádek 103: odhad vzniká jako poměr přijatých k přihláškám za 2025;
- řádek 107: dělí se změnou poptávky;
- řádek 110: ořezává se na rozsah 5 až 95 procent;
- řádky 122–125: výsledek se kategorizuje na „Vysoká šance“ až „Velmi nízká šance“.

Body uchazeče do výpočtu nevstupují na žádném místě funkce.

**Zpřesnění nad rámec návrhu.** Odhad minimálního skóre na řádcích 113 až 121 násobí loňské minimum koeficientem `0,3` při růstu poptávky a `0,2` při jejím poklesu. Tyto konstanty nemají v kódu ani v návrhu žádné zdůvodnění a nejsou nikde ověřené. Jde o samostatnou vadu vedle té, kterou návrh popisuje.

**Rozpor v návrhu je vyřešen praxí.** Sekce 3 návrhu říká kalkulačku zachovat „nanejvýš jako popis konkurence“, sekce 9 odložit „osobní procenta bez zpětného ověření“. Dodávka `c9ae452` zvolila právě první variantu: zobrazuje se historická úspěšnost a struktura priorit, nikoli osobní procento. Rozpor tedy netrvá.

---

### O-13. Riziko osobního odhadu se přesunulo do simulátoru

**Odpověď R1, 11. 9. 2026:** implementace otevřená. [Rozhodnutí a důkaz k O-13](navrh-rozvoje-2027.md#r1-o-13). Níže je původní stanovisko v1.1.

**Stav:** otevřeno. **Priorita:** vysoká. **OVĚŘENO** v kódu. **Nový bod verze 1.1.**

Při ověřování O-4 jsem našel stejný typ vady na jiném místě, které žádný z dokumentů nezmiňuje. Verze 1.0 jej přehlédla, protože se soustředila na modul, na který upozorňoval návrh.

V `src/app/simulator/SimulatorClient.tsx` na řádcích 357 až 362 vzniká kategorie takto:

```
const diff = totalScore - minBody;
if (diff >= 10)  return { status: 'accepted',   label: 'Vysoká šance' };
if (diff >= -10) return { status: 'borderline', label: 'Na hraně' };
return              { status: 'rejected',   label: 'Malá šance' };
```

Rozdíl proti O-4 je podstatný a v obou směrech:

- **Lepší:** body dítěte zde skutečně vstupují do výpočtu (`totalScore`). Není to prázdná statistika jako v `chances.ts`.
- **Horší:** narozdíl od O-4 se tento výsledek uživateli **skutečně zobrazuje**, a to na několika místech (řádky 884, 974, 1364), včetně souhrnu typu „Vysoká šance (N oborů)“.

Tři konkrétní výhrady:

1. **Prahová hodnota 10 bodů není nikde odvozena.** Symetrické pásmo ±10 bodů kolem loňské hranice je konstanta bez doložení, stejně jako koeficienty 0,3 a 0,2 v O-4. Návrh rozvoje přitom sám varuje, že „historické minimum není předpověď příští hranice“.
2. **Porovnává se proti `min_body_2025`.** Funkce `getAdmissionThreshold` na řádku 119 vrací loňské celkové minimum včetně školních kritérií. To je přesně ta záměna významů, kterou návrh popisuje v sekci 3 pod bodem „Prověřit bodové významy v simulátoru“. Výtka návrhu je tedy stále platná a nebyla dodávkou `c9ae452` řešena.
3. **PRD v0.3 tuto cestu nepokrývá.** Tabulka stavu uvádí u oprav výkladu dat, že jde o opravy „v dotčených cestách“ a výslovně dodává „Nejde o audit všech starších kalkulaček“. Simulátor je právě taková starší kalkulačka.

**Doporučení.** Zařadit simulátor do rozsahu oprav dřív než Můj výběr. PRD v sekci 8 správně požaduje „před připojením simulátoru prověřit převody skóre a odvozování dalších školních kritérií“, ale simulátor běží na produkci **už teď**, nezávisle na tom, zda se do Mého výběru někdy připojí. Podmínka formulovaná jako předpoklad budoucí integrace neřeší současný stav.

---

### O-5. Párování oborů je rozbité — DOPORUČENÍ STAŽENO

**Odpověď R1, 11. 9. 2026:** odpověď autora k oponentnímu ověření. [Rozhodnutí a důkaz k O-5](navrh-rozvoje-2027.md#r1-o-5).

**Stav:** doporučení staženo v R2, diagnóza platí. **OVĚŘENO** výpočtem i protipříkladem.

> **Stažení (R2).** Sloučení klíče na REDIZO+KKOV by přiřadilo cizí výsledek: ověřeno 185 kolidujících skupin a 407 dotčených historických ID. Tvrzení „97 % za práci v řádu hodin“ měřilo existenci klíče, nikoli jednoznačnost vazby, a **neplatí**. Řešení je práce na datovém modelu. Níže původní stanovisko v1.1.

Návrh uvádí, že pouze 1 445 z 2 837 ID za rok 2025 má přesný protějšek ve výsledcích 2026. Ověřeno, čísla odpovídají řádově (naměřeno 1 425 z 2 808 pro aktuální data).

Návrh ale zůstal u diagnózy a nabízí těžší řešení, než je nutné. Ověřil jsem párování pouze přes kombinaci REDIZO a KKOV, tedy bez koncovky se slugifikovaným zaměřením:

| Metoda párování | Spárováno | Podíl |
|---|---:|---:|
| Přesné ID včetně zaměření | 1 425 / 2 808 | 51 % |
| REDIZO + KKOV | 2 728 / 2 808 | 97 % |

Problém tedy není nestabilita identifikátorů obecně, ale konkrétně to, že klíč obsahuje zaměření odvozené z názvu, který se mezi ročníky mění.

Návrh doporučuje ukládat zdrojová `ID_SO` a `ID_SOF` a vést explicitní vztahy mezi obory. Dlouhodobě je to správné a nerozporuji to. Krátkodobě ale **97 procent získáte změnou párovacího klíče**, což je práce na hodiny, nikoli na dny. Doporučuji rozdělit na okamžitou opravu klíče a samostatný pozdější úkol pro plný datový model.

---

### O-6. Výtka k rozpoznávání formátu importu je správná, ale mířená na jiné místo

**Odpověď R1, 11. 9. 2026:** odpověď autora k oponentnímu ověření. [Rozhodnutí a důkaz k O-6](navrh-rozvoje-2027.md#r1-o-6). Níže je původní stanovisko v1.1.

**Stav:** otevřeno. **Priorita:** střední, roste na vysokou při realizaci O-1. **OVĚŘENO** v kódu a na souborech.

Návrh tvrdí, že importní skript rozlišuje předchozí ročník podle počtu listů. V současném `scripts/import_cermat_2026_real.py` taková heuristika není, skript bere první list (`wb[wb.sheetnames[0]]`).

Princip výtky však platí a je naléhavější, než návrh předpokládá. Historické soubory JPZ mají nejednotnou strukturu, jak dokládá tabulka v O-1: názvy listů `JPZ2017_red`, `JPZ2021`, `List1`, počet sloupců 18 až 24. Jakmile se sáhne po historii 2017 až 2023, je poznávání formátu podle hlaviček nutnost, nikoli hygiena.

---

## Část C: Výtky návrhu, které jsou již překonané

**Stav části k verzi 1.1: vyřešeno.**

Verze 1.0 zde upozorňovala, že návrh rozvoje je auditem commitu `c17d42e` z 21. 6. 2026, zatímco commit `c9ae452` z 11. 9. 2026 (PR #71) podstatnou část kritiky vyřešil. Riziko bylo v tom, že by někdo podle návrhu naplánoval již hotovou práci.

Autor to vyřešil hlavičkou v návrhu rozvoje, která rozlišení uvádí výslovně, a doplněním záznamu dodávky o commit a datum nasazení. Doporučení verze 1.0 („nepoužívat návrh v této podobě jako zadání“) tím pozbylo platnosti a **ruší se**. Návrh lze používat jako archivovaný audit výchozího stavu, což jeho hlavička nyní jednoznačně sděluje.

Následující tři body zůstávají zapsané jako doklad, co přesně bylo překonáno.

### O-7. Zastaralá metadata importu

**Odpověď R1, 11. 9. 2026:** dřívější uzavření potvrzeno. [Rozhodnutí a důkaz k O-7](navrh-rozvoje-2027.md#r1-o-7). Níže je původní stanovisko v1.1.

**Stav:** vyřešeno 11. 9. 2026 (commit `c9ae452`, doloženo v PRD v0.3). **OVĚŘENO.**

Návrh uvádí, že metadata odkazují na aktualizaci CERMAT z 8. 3. 2026. Skutečný stav:

| Soubor | Záznamů (návrh) | Záznamů (dnes) | Platnost dat |
|---|---:|---:|---|
| `applications_2026.json` | 3 087 | 3 091 | 17. 8. 2026 |
| `cermat_results_2026.json` | 3 080 | 3 076 | 17. 8. 2026 |

Všech 3 076 záznamů nese `source_valid_at` = `2026-08-17`. Metadata obsahují zdrojovou URL i SHA-256.

### O-8. Zastaralý obsah hlavní stránky

**Odpověď R1, 11. 9. 2026:** dřívější uzavření potvrzeno. [Rozhodnutí a důkaz k O-8](navrh-rozvoje-2027.md#r1-o-8). Níže je původní stanovisko v1.1.

**Stav:** vyřešeno 11. 9. 2026. **OVĚŘENO** stažením živé stránky.

Návrh tvrdí, že na veřejné hlavní stránce přetrvává květnový obsah 2026, že číslo 3 080 je chybně označeno jako počet škol a že titulek o bodech nerozlišuje průměr od hranice. Stažená stránka `https://www.prijimackynaskolu.cz/` obsahuje:

- kalendář 2027, přihlášky na SŠ 1.–22. 2. 2027, konzervatoře 1.–30. 11. 2026;
- „1 120 Škol v historickém přehledu“, tedy správné rozlišení škol od oborů;
- explicitní větu „Průměr není hranice přijetí“;
- upozornění, že přehled nepokrývá obory bez JPZ.

Text o sportovních školách, který měl být podle návrhu opraven, se na stránce nenachází.

### O-9. Odhad pracnosti balíku A

**Odpověď R1, 11. 9. 2026:** odpověď autora k oponentnímu ověření. [Rozhodnutí a důkaz k O-9](navrh-rozvoje-2027.md#r1-o-9). Níže je původní stanovisko v1.1.

**Stav:** otevřeno k přepočtu. **NÁZOR.**

Tabulka uvádí 26 až 39 člověkodnů pro balíky A až C. Nemám čím odhad ověřit a neberu to jako vadu; návrh sám jej označuje za pracovní předpoklad. Balík A je však podle O-7 a O-8 z velké části hotový, takže horní odhad je zastaralý ze stejného důvodu jako sekce 1.

### O-10. Nenalezená implementace přípravného modulu

**Odpověď R1, 11. 9. 2026:** dřívější uzavření potvrzeno. [Rozhodnutí a důkaz k O-10](navrh-rozvoje-2027.md#r1-o-10). Níže je původní stanovisko v1.1.

**Stav:** vyřešeno v PRD v0.3. **NÁZOR.**

Návrh uvádí, že implementaci modulu přípravy nenašel v prohlédnutých cestách. To je korektně formulované omezení auditu, nikoli tvrzení o neexistenci.

PRD v0.3 formulaci dále zpřesnilo: „Produkční implementace nebyla v prověřených cestách doložena. Historický cílový termín 31. 8. 2026 není dokladem vydání.“ Rozlišení mezi nedoloženo a neexistuje je tím vyřešeno.

---

## Část D: Body návrhu, které potvrzuji jako správné

### O-11. Odmítnutí univerzálního skóre kvality školy

**Odpověď R1, 11. 9. 2026:** zásada zachována, doplnění k ověření. [Rozhodnutí a důkaz k O-11](navrh-rozvoje-2027.md#r1-o-11). Níže je původní stanovisko v1.1.

**Stav:** potvrzeno. **NÁZOR, souhlasím bez výhrad.**

Návrh nezavádí jeden celkový žebříček kvality škol s odůvodněním, že vstupní výsledky přijatých měří také výběrovost a složení uchazečů. To je správné a platí to i pro maturitní data z O-2: škola s vysokým vstupním skóre přijatých bude mít vysoké maturitní výsledky téměř automaticky.

Užitečnější než absolutní čísla je rozdíl mezi očekávaným a skutečným výsledkem vzhledem ke vstupní úrovni. Obě strany jsou nyní k dispozici (O-1, O-2).

### O-12. Právní opatrnost u dvou bodů je oprávněná

**Odpověď R1, 11. 9. 2026:** zásada zachována, doplnění k ověření. [Rozhodnutí a důkaz k O-12](navrh-rozvoje-2027.md#r1-o-12). Níže je původní stanovisko v1.1.

**Stav:** potvrzeno a **doplněno o rozbor pravidel**. **OVĚŘENO** čtením pravidel CERMAT.

Návrh upozorňuje, že veřejná adresa sama neopravňuje k obchodním sdělením a že veřejná dostupnost testů CERMAT neznamená právo je převzít do vlastní aplikace. Obojí je věcně správné a obojí by se snadno přehlédlo. Rozbor druhého bodu viz příloha 1.

### O-14. PRD v0.3: potvrzené zásady a dvě výhrady

**Odpověď R1, 11. 9. 2026:** odpověď autora k oponentnímu ověření. [Rozhodnutí a důkaz k O-14](navrh-rozvoje-2027.md#r1-o-14). Níže je původní stanovisko v1.1.

**Stav:** otevřeno v bodech níže. **Nový bod verze 1.1.** **NÁZOR**, pokud není uvedeno jinak.

PRD v0.3 potvrzuji jako věcně kvalitní. Zejména tyto zásady doporučuji zachovat beze změny:

- **Oddělení tří operací** (uložit, porovnat, zařadit do pořadí). Brání záměně kandidáta za preferenci.
- **„Pořadí se nemění odhadem systému.“** Přímo brání tomu, aby vada typu O-13 přerovnala rodině preference.
- **„Neznámý údaj není nevýhoda školy.“** Konzistentní s pravidlem „chybějící hodnota není nula“ z návrhu rozvoje.
- **Viditelnost stavu ukládání**, včetně věty „Selhání nesmí vypadat jako úspěch“.
- **Rozlišení čtyř stavů nabídky** (historie 2026, plán školy, vyhlášeno pro 2027, neověřeno) a pravidlo, že potvrzení školy není vyhlášením řízení.
- **Zákaz přenášet zákonný limit přihlášek na ukládání**, s podmínkou, že technický limit nesmí tiše mazat položky.
- **Přijímací kritéria pilotu jsou formulovaná jako ověřitelné úlohy**, nikoli jako přání. Bod 3 („vysvětlit rozdíl mezi neznámým údajem a nulou“) přímo testuje metodickou zásadu.

**Výhrada 1: Better Auth je uveden s odkazem, který jsem neověřoval.** PRD označuje zdroj jako „ověřený 11. 9. 2026“. Tento odkaz jsem v rámci oponentury nekontroloval, takže k němu nezaujímám stanovisko. Upozorňuji jen, že u autentizace je rozdíl mezi dokumentací pluginu a připraveností doručování e-mailů; PRD to ostatně samo uvádí u poznámky o Resendu.

**Výhrada 2: chybí vazba na datová zjištění.** PRD v sekci 10 vyjmenovává návaznost na existující části webu, ale nikde nezmiňuje, jaká data budou k dispozici pro obsah profilů. Body O-1 a O-2 přitom mění, co lze v profilu oboru vůbec ukázat (historie JPZ od 2017, maturitní výsledky školy). Doporučuji tuto vazbu do PRD doplnit dřív, než se uzavře struktura profilu, protože zpětné doplnění datové osy do hotového rozhraní je dražší než její zahrnutí do návrhu.

### Další potvrzené zásady

Metodická varování návrhu jsou konzistentní a věcně správná. Zachovat beze změny:

- přihlášky dělené kapacitou nejsou osobní pravděpodobnost;
- vyšší priorita nedává přednost před uchazečem s lepším výsledkem školního hodnocení;
- historické minimum není předpověď příští hranice;
- chybějící hodnota není nula;
- rejstříkové oprávnění vyučovat obor není vyhlášením přijímacího řízení do tohoto oboru;
- u každé informace zachovat rok a zdroj.

Systematické oddělování ověřeného od neověřeného („přítomnost naplánovaných workflow není důkazem, že aktualizace prošly“, „v této práci nebyly e-maily rozesílány“) je u podobných materiálů vzácné a mělo by se zachovat i v dalších verzích.

---

## Příloha 1: Rozbor pravidel CERMAT k převzetí testů

**OVĚŘENO** čtením úplného textu [Pravidel pro využívání obsahu informačních webů CZVV](https://prijimacky.cermat.cz/files/files/CZVV_pravidla-vyuziti-webstrankyp.pdf).

Posuzovaný model: odkázat na testy CERMATu, uživatel test vyřeší a do aplikace předá pouze své výsledky.

**Model je v zásadě průchozí, ale vyžaduje jedno upřesnění.**

Co je jednoznačně povolené. Pravidla výslovně uvádějí: „Zveřejňování odkazů na webové stránky Centra jsou povolené bez souhlasu ředitele Centra.“ Odkazování je bez omezení.

Kde je hranice. Pravidla u kategorie 1 (zkušební dokumentace) zakazují „jakékoli jeho užití, jakož i užití jakékoli jeho **části** pro komerční účely, šíření či další zpřístupňování bez předchozího explicitního písemného souhlasu ředitele Centra“. Do kategorie 1 patří podle výčtu v pravidlech mimo jiné **klíč správných řešení didaktického testu**, testový sešit, záznamový arch a vzorové úlohy včetně klíčů.

Formulaci „převezmeme jen výsledky“ je proto nutné rozdělit:

| Co aplikace dělá | Posouzení |
|---|---|
| Odkaz na test u CERMATu | Povoleno výslovně |
| Žák sám zapíše dosažené body | Vlastní data uživatele, bez dotčení pravidel |
| Žák označí úlohy, se kterými měl potíž | Vlastní data uživatele |
| Aplikace u sebe drží klíč správných řešení | **Převzetí chráněné části, nelze bez souhlasu** |
| Aplikace automaticky vyhodnotí odpovědi proti klíči | **Totéž, nelze bez souhlasu** |

Výjimka volného užití se nepoužije. Pravidla ji uvádějí až u kategorie 2 a 3 (organizační materiály, obsah webu), nikoli u zkušební dokumentace. Volné užití je navíc definováno jako užití „jehož účelem není dosažení přímého nebo nepřímého hospodářského nebo obchodního prospěchu“, což u produktu s plánovanou platbou za rozšířený obsah neplatí.

Cesta k souhlasu je pro projekt uzavřená. Pravidla uvádějí, že ředitel Centra uděluje souhlas pouze tehdy, je-li žadatelem „vzdělávací zařízení zapsané v rejstříku školských zařízení MŠMT“. Projekt tuto podmínku nesplňuje.

**Doporučený postup.** Odkaz na test u CERMATu; žák jej vytiskne a vyřeší na papíře; kontrola proti klíči otevřenému u CERMATu, nikoli v aplikaci; do aplikace vstupují pouze body a označení problémových úloh. Tento model má vedlejší přínos, který návrh sám zmiňuje: řešení na papíře nacvičí rýsování a práci se záznamovým archem.

Automatické vyhodnocování je možné pouze nad vlastní sadou úloh s učitelskou kontrolou, tedy přesně tak, jak návrh popisuje balík D.

---

## Příloha 2: Agregovaná položková data jako náhrada za klíč

**OVĚŘENO** stažením souboru.

Mapu obtížnosti úloh lze postavit z agregovaných položkových výsledků, které jsou samostatný dataset **mimo** kategorii zkušební dokumentace.

```
https://data.cermat.cz/files/files/JPZ/agregovana_data_polozky/<ROK>/JPZ<ROK>_<M|C><4|6|8>_ulohy_agregovane_vysledky.xlsx
```

Ověřen soubor `JPZ2026_M4_ulohy_agregovane_vysledky.xlsx` (matematika, čtyřleté obory, jaro 2026): 93 358 konajících, průměrný skór testu 41,25 %. Ke každé podúloze průměrný procentní skór a podíl žáků, kteří ji vynechali; u uzavřených úloh četnost volby jednotlivých alternativ.

Praktický důsledek: pokud žák označí úlohu `01.3` jako problematickou, aplikace může uvést, že její průměrný skór v ročníku byl 36,8 %. To je silná zpětná vazba bez dotčení chráněné dokumentace.

Omezení, které návrh správně uvádí a které platí i zde: samotné vynechání úlohy nedokazuje časovou tíseň a národní obtížnost se automaticky nepřenáší na novou úlohu.

---

## Doporučený postup

Historické doporučení oponenta v1.1; aktuální odpověď k pořadí je v návrhu v2.0 §10. Doporučení verze 1.0 rozdělit návrh na archiv a živé zásady se **ruší**, protože je autor vyřešil hlavičkou dokumentu (viz část C).

**Tři kroky s nejlepším poměrem přínosu k práci:**

1. **Opravit prahové hodnoty v simulátoru (O-13).** Nahradilo původní první místo (O-4), protože simulátor zobrazuje kategorie „Vysoká šance“ a „Malá šance“ uživatelům dnes, opírá se o nedoloženou konstantu ±10 bodů a porovnává proti loňskému minimu včetně školních kritérií. PRD tuto cestu výslovně nepokrývá.
2. **Změnit párovací klíč na REDIZO a KKOV (O-5).** 97 procent spárovaných záznamů za práci v řádu hodin, oproti 51 procentům dnes.
3. **Stáhnout historii JPZ 2017–2023 a maturitní data 2015–2026 (O-1, O-2).** Mění to, jaké analýzy jsou vůbec možné. V PRD v0.3 zatím není tematizováno.

**Otázka k rozhodnutí, nikoli k realizaci.** Sekce 8 PRD správně požaduje prověřit simulátor *před připojením* do Mého výběru. Je vhodné zvážit, zda tuto podmínku nepřeformulovat na termín nezávislý na integraci, protože simulátor běží na produkci už nyní.

---

## Zdroje

- [Agregovaná data JPZ, roky 2017–2026](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/agregovana-data-jpz.html)
- [Přehled dat a analytických výstupů JPZ](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska.html) — zdroj tvrzení o datech po uchazečích od roku 2024
- [Agregovaná maturitní data po školách](https://data.cermat.cz/maturitni-zkouska/agregovana-data.html)
- [Agregované výsledky úloh JPZ](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/agregovana-data-jpz/agregovane-vysledky-uloh-jpz.html)
- [Pravidla pro využívání obsahu webů CZVV](https://prijimacky.cermat.cz/files/files/CZVV_pravidla-vyuziti-webstrankyp.pdf)
- [Testová zadání k procvičování](https://prijimacky.cermat.cz/menu/testova-zadani-k-procvicovani)


## Odpověď autora R1 — další kolo

Úplné [vypořádání v původním návrhu](navrh-rozvoje-2027.md#vyporadani-r1) obsahuje i obě přílohy, rozlišení souhlasu a protidůkazů a historii verzí. Pro další oponenturu ověřit především rozdílné populace JPZ/MZ (O-1/O-3/O-11), kolize při odstranění zaměření (O-5), zdroj původní heuristiky (O-6) a dostatečnost podmínek opravy S0 (O-13). O-13 nelze uzavřít jen tímto textem; veřejná vada zůstává doložená v R1. Rozhodnutí dalšího oponenta doplnit jako R2 bez mazání R1.


## Odpověď autora R2 — souhrn pro další kolo

| ID | Dispozice autora | Otevřená část |
|---|---|---|
| O-1–O-14 | Převzata jednotlivá stanoviska R2 v tabulce návrhu §13; nedeklarováno plošné uzavření všech bodů | O-13 produkční blokátor, O-4 technický dluh; plánované importy a produktové volby nejsou realizací. |
| O-15 | Navržená změna na 12 208 odmítnuta proti zmrazené odpovědi i novému dotazu s 12 137 | Oponentní kontrola konkrétního řádku a parametrů. |
| O-16 | Dokončené dny přijaty; rozdíl 322 přetrval i ve dvou takových dotazech | Příčina rozdílu není vysvětlená. |
| O-17 | Místní projekt opraven; přístup zůstává neověřený, tarifní příčina 404 nedoložená | Autorizace a reprodukce přesného API dotazu. |
| O-18 | Stručný MCP výpis nemá UA; dokumentace ho uvádí v detailu platformy | Dostupnost potřebných polí v účtu/exportu; hlášený drain je odlišný kanál. |
| O-19 | HTTP 500 a chyba edge wrapperu potvrzeny | Souběžná lokální oprava vyžaduje commit, nasazení a přejímku všech tří obrázků a skutečných metadat. |

Podrobnosti, důkazní přílohy a požadavky na doplnění oponentních důkazů jsou autoritativně v původním návrhu §13. Další kolo R3 doplní své rozhodnutí bez mazání této odpovědi. Opravy textů samy neuzavírají produkční vady.

### Historie verzí oponentury

| Verze | Datum | Autorství / změna |
|---|---|---|
| 1.1 | 11. 9. 2026 | Oponentní vstup R1, zachován ve snímku R0. |
| 1.2 | 11. 9. 2026 | Doplněna odpověď autora R1; commit `5a0f893`. |
| 2.0 / R2 | 11. 9. 2026 | Oponent ověřil protidůkazy R1 a přidal O-15–18; pracovní vstup uchován ve snímku R2. |
| 2.1 / R2 | 11. 9. 2026 | Oponent během auditu přidal O-19; zachován dodatečný snímek a manifest. |
| 2.2 / R2 | 11. 9. 2026 | Odpověď autora na aktuálních 19 ID, nové důkazy a odkazy na návrh v2.2, PRD v0.6 a analýzu v1.3. Nejde o oponentní schválení odpovědi. |
| 2.2.1 / R2 | 11. 9. 2026 | Opakovaná kontrola O-19 v 11:33 CEST: tři přímé adresy i tři skutečné odkazy metadat stále HTTP 500. Důkazy a stav v návrhu §13/O-19; oprava na produkci nepotvrzena. |
