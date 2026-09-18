# Slovník ukazatelů

Verze 1.23 · 17. 9. 2026 · **Závazný soupis. Nový ukazatel se nezavádí bez zápisu sem.**

Každý ukazatel má jeden název, jednu definici a jeden způsob výpočtu. Když se veličina objeví na webu, v datech, v API nebo v dokumentaci, používá se jméno z tohoto soupisu. Když se způsob výpočtu změní, změní se tady a zároveň se přepíše verze.

Jakými slovy se o ukazatelích píše v textu stránky, určuje [slovník pojmů](slovnik-pojmu.md). Název ukazatele z tohoto soupisu platí v datech, kódu a API; na stránce se použije pojem odtamtud.

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

1. **Rok 2025, finální revize.** Soubor je spočítaný z finální revize roku 2025, kterou CERMAT zveřejnil 20. 5. 2026 (PR #84); do té doby z předběžné verze s přihláškami k 13. 5. 2025. Předběžná data za rok 2026 vyšla současně a web je zatím nepřevzal; stav vede registr `public/stav_datovych_sad.json` u sady `cermat-uchazeci-kolo1`. Do 13. 9. 2026 tu stálo, že data za rok 2026 neexistují, což nebyla pravda. Souběh zatím web nezobrazuje.
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
`přihlášky s prioritou 1 ÷ kapacita míst`. Pole `tlak_prvnich_voleb` v `public/souhrny_kolo1.json`.

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

**Co to znamená.** Podle [metodiky MŠMT k přijímacímu řízení 2026/2027](https://msmt.gov.cz/media/wp-content/uploads/2026/08/Metodika_prijimaci-rizeni_2026-2027.pdf) (oddíl o kritériích přijímání a oddíl Vyhodnocení výsledků prvního kola) smějí kritéria uchazeče vyloučit jen tam, kde to umožňuje předpis: nesplněná **hranice úspěšnosti** (v jednotné zkoušce, ve školní nebo talentové zkoušce, nebo v celkovém hodnocení), zdravotní způsobilost, doklady k pobytu, nedokončené předchozí vzdělávání. Takový uchazeč jde do seznamu bez pořadí s příznakem „nesplnil kritéria“. Kdo na jednotnou zkoušku nepřišel, dostane 0 bodů a mezi nesplněné podmínky se **nepočítá**. Nejde tedy o chybu v přihlášce; nedoložený doklad se podle metodiky projeví jen v hodnocení.

Na stránce se neříká „nesplnili podmínky“, ale „nedosáhli požadavku školy“, a kde to jde, jakého (odvozená hranice úspěšnosti). V roce 2026 šlo o 41 763 ze 424 353 přihlášek, 9,8 %; u 10 859 z nich uchazeč výsledek jednotné zkoušky nemá (`docs/podklady/rozbor-podminek-a-poradi-2026.json`).

### Odvozená hranice úspěšnosti
Nejnižší výsledek jednotné zkoušky, pod kterým v datech uchazečů leží všichni, kdo nesplnili podmínky, a nad kterým všichni soutěžící. Zkouší se součet bodů a slabší z obou testů. Pole `odvozena_hranice` s typem `soucet`, `slabsi_test`, nebo `nevysvetleno_vysledkem_jpz`. Počítá `scripts/rozbor-podminek-a-poradi.py`.

Počítá se jen u oborů s aspoň pěti nesplněnými s výsledkem a pěti soutěžícími. V roce 2026 z 1 156 takových oborů odpovídá hranici ve slabším testu 286, v součtu 187 a výsledkem zkoušky se nevysvětlí 683 (rozhodovala školní zkouška, prospěch nebo jiné kritérium).

Ověřeno proti kritériím školy: osmileté gymnázium J. S. Machara stanovilo pro rok 2026 minimum 20 bodů v každém testu; data dávají nejvýše 19 bodů u nesplněných a nejméně 20 u soutěžících.

**Je to odhad z jednoho ročníku, ne vyhlášené kritérium.** Na stránce se uvádí slovy „podle výsledků to odpovídá minimu X bodů ve slabším testu“ a vždy s odkazem na kritéria školy. Hranice se může mezi roky změnit; nová kritéria vyhlašuje škola.

### Výsledek uchazečů o obor
Kam se v 1. kole dostali všichni, kdo měli obor na přihlášce: sem, na obor výš na přihlášce, na obor níž, nebo nikam. Zdroj: data o uchazečích. Pole `vysledek_uchazecu`.

Osmileté gymnázium J. S. Machara 2026: z 233 uchazečů 30 sem, 37 výš, 25 níž, **141 nikam**. Čtyřleté gymnázium téže školy: z 94 uchazečů nikam 4.

**Neříká, jak dopadne konkrétní uchazeč** a nesmí se číst jako rada k pořadí; priorita šanci na přijetí nemění. Popisuje, jak často se uchazečům o tento obor nepodařilo najít místo v 1. kole vůbec, což je užitečný údaj pro sestavení celé přihlášky.

### Obory výš a níž na přihlášce
Souběžné přihlášky rozdělené podle toho, zda uchazeč měl druhý obor na přihlášce před tímto oborem, nebo za ním, s obtížností přijetí slovy u každého z nich. Pole `obory_vys`, `obory_niz`; stejné meze jako souběžné přihlášky, nezveřejňuje se pod 10 uchazeči.

Pořadí na přihlášce vyjadřuje, kam uchazeč chce víc, ne jak těžký obor je; u Machara se tatáž gymnázia objevují výš i níž. Srovnání obtížnosti je popis jednoho ročníku, ne žebříček.

### Přijati na vyšší prioritu
Uchazeči, kteří na tento obor přijati nebyli, protože byli přijati na obor uvedený na přihlášce výš. Zdroj: CERMAT, `NEPŘIJATI - PŘIJAT NA VYŠŠÍ PRIORITU`. Pole `higher_priority`, v datech uchazečů `prijato_na_vyssi_prioritu`.

**Neříká, že by se sem dostali.** Na tento obor se u nich přijetí nevyhodnocovalo. Do 13. 9. 2026 tu stálo, že jde o přijaté, kteří dali přednost jinému oboru; to bylo nesprávné.

### Přijatí podle priority
Rozpad přijatých podle toho, kolikátou volbou pro ně obor byl. Zdroj: CERMAT, souhrny 1. kola, `PŘIJATÍ – PRIORITA 1` až `5`. Pole `prijati_priority` v `public/souhrny_kolo1.json`.

Odpovídá na otázku, zda obor bere hlavně ty, kdo ho chtěli nejvíc. Obor s vysokým tlakem prvních voleb přijímá skoro jen první volby: osmileté gymnázium J. S. Machara v roce 2026 přijalo 28 z 30 uchazečů na první volbu.

**Neříká, kdo by se dostal.** Uchazeč přijatý na vyšší prioritu se na nižší už nevyhodnocuje, takže nízký počet přijatých na druhou volbu neznamená, že druhá volba nemá šanci. Součet se rovná přijatým.

### Vzdali se přijetí
Uchazeči, kteří byli přijati a přijetí se vzdali. Zdroj: CERMAT, `NEPŘIJATI – VZDAL SE PŘIJETÍ`. Pole `withdrawn`.

Spolu s přijatými, nepřijatými kvůli kapacitě, pro nesplnění podmínek a přijatými na vyšší prioritu dává součet všech přihlášek. Bývá malý; ukazuje se jen jako součást rozpadu přihlášek, ne samostatně.

### Průměrné percentilové umístění přijatých
Průměr celostátních percentilů výsledku ČJ+MA u přijatých uchazečů. Zdroj: CERMAT, souhrny 1. kola, `ČJ+MA – PERCENTIL – PRŮMĚR (PŘIJATI)`. Pole `prumerne_umisteni_prijatych`, rozsah 0 až 100.

**Slouží ke srovnání vstupní úrovně mezi ročníky místo bodů.** U 2 823 nabídek spárovaných mezi roky 2025 a 2026 se mění mediánově o −0,1 bodu, mezikvartilově od −5,0 do +4,9, zatímco průměr přijatých v bodech se posunul mediánově o +2,6 bodu, převážně kvůli jiné obtížnosti testu. Doklad: `docs/podklady/overeni-srovnani-rocniku.json`.

Není to percentil průměru přijatých, ale průměr percentilů; u šikmého rozdělení se ty dvě hodnoty liší. Popisuje, s jakými výsledky přicházejí spolužáci, ne náročnost studia ani kvalitu školy. Uvádí se jen u nabídek, kde přijatí zkoušku konali.

### Průměrné percentilové umístění uchazečů
Průměr celostátních percentilů výsledku ČJ+MA u všech, kdo se na obor hlásili a zkoušku konali. Zdroj: `ČJ+MA – PERCENTIL – PRŮMĚR`. Pole `prumerne_umisteni_uchazecu`.

Vedle umístění přijatých ukazuje, zda obor vybírá z uchazečů ty lepší. Hlásí se i uchazeči, pro které byl obor pojistkou, takže hodnota **nepopisuje konkurenci o místo**.

### Průměr JPZ přijatých
Průměrný výsledek přijatých uchazečů v jednotné přijímací zkoušce. Zdroj: CERMAT 2026, pole `cj_ma_prijati` (ČJ+MA), `cj_prijati` a `ma_prijati` (jednotlivé předměty).

Škála: procentní skór CERMAT dělený dvěma. ČJ+MA má rozsah 0–100, jednotlivý předmět 0–50. U upravených testů nejde o původní body.

**Není to hranice přijetí.** Neříká, kolik bodů měl poslední přijatý.

### Historický průměr JPZ 2025
Pole `cj_prumer` a `ma_prumer` v ročníku 2025, převedené na škálu předmětu funkcí `historicalSubjectAverage` v `src/lib/admission-metric.ts`: procentní hodnota krát 5, děleno 10, zaokrouhleno na desetinu.

**Nesmí se nazývat průměrem přijatých.** Zdroj nedokládá, které skupiny se průměr týká ani z kolika osob vznikl; kontrakt to nese v poli `population: 'not_documented'`. Průměr roku 2026 naproti tomu prokazatelně patří přijatým. Proto se obě čísla nedávají do jedné srovnávací tabulky.

**Ověření 13. 9. 2026:** hodnota v katalogu 2025 se od oficiálního průměru přijatých ze souhrnu 1. kola 2025 liší nejvýš o 0,5 bodu u 2 590 z 2 809 nabídek, medián rozdílu je 0,02 bodu (`docs/podklady/overeni-srovnani-rocniku.json`). Jde tedy téměř jistě o průměr přijatých ze starší revize. Pro srovnání ročníků se ale nepoužívá: rok 2025 se bere přímo ze souhrnu, pole `cj_ma_prijati` v `public/souhrny_kolo1.json`, a meziročně se srovnává průměrné percentilové umístění přijatých.

### Nejnižší výsledek JPZ mezi přijatými
Nejnižší součet bodů z češtiny a matematiky mezi uchazeči, kteří byli na obor **přijati a zařazeni**. Rozsah 0 až 100. Pole `jpz_min_actual`, doplňkově `cj_at_jpz_min` a `ma_at_jpz_min`, tedy body téhož uchazeče po předmětech.

Zdroj jsou data uchazečů CERMATu za 1. kolo 2025, kde je u každé volby příznak přijetí i výsledek testu. Počítá `scripts/enrich_schools_data.py`, mezivýsledek je v `data/jpz_stats_2025.json`. Filtr je `ss{n}_prijat == 1`; hodnota 2 znamená, že se uchazeč dostal jinam, a do minima nepatří. Procentní skór 0 až 200 se dělí dvěma.

**Není to hranice přijetí.** Je to nejnižší výsledek, se kterým se někdo dostal, tedy dolní mez toho, co stačilo. Skutečná hranice může být níž i výš, protože školy přidávají vlastní kritéria, například známky nebo talentovou zkoušku, a podle nich mohou přijmout uchazeče se slabším testem.

Čtyři omezení, která se musí uvést spolu s číslem:

1. **Rok 2025.** Počítá se z předběžné verze dat uchazečů za rok 2025. Novější data existují, viz sada `cermat-uchazeci-kolo1` v registru stavu datových sad; do jejich převzetí je hodnota v katalogu 2026 převzatá a označená polem `historicka_data_rok`.
2. **Bez zaměření.** Zdroj nese jen REDIZO a KKOV. U 213 z 2 558 kombinací sdílí několik zaměření jednu hodnotu.
3. **Malé počty.** 1 586 ze 4 350 oborů má méně než deset přijatých. Minimum je tam jednotlivý uchazeč, ne stabilní vlastnost oboru, a nezobrazuje se.
4. **Nepředpovídá příští rok.** Popisuje jeden ročník, nikoli požadavek školy.

### Medián JPZ přijatých
Prostřední výsledek jednotné zkoušky mezi přijatými: polovina přijatých měla stejně nebo míň, polovina stejně nebo víc. Rozsah 0 až 100 bodů. Pole `median_prijatych` v `public/pasma_prijeti_{rok}.json`, generuje `scripts/build-pasma-prijeti.py`.

**Proč vedle průměru.** Rozdělení výsledků přijatých je šikmé doprava: pár výborných výsledků táhne průměr nahoru, takže průměr přeceňuje typického přijatého. Na 2 517 nabídkách roku 2026 s aspoň deseti přijatými leží medián **systematicky pod průměrem**, mediánově o 1,1 bodu (dolní čtvrtina −2,3, horní −0,1); rozdíl aspoň 2 body má 35 % oborů, aspoň 5 bodů 2,4 %. Jednotný záporný směr je ta šikmost.

**Tři meze, které platí spolu s číslem:**

1. **Aspoň deset přijatých.** Pod tím se nezobrazuje, stejně jako nejnižší výsledek mezi přijatými; je to pak údaj o jednotlivcích. Splňuje 2 517 z 2 879 oborů roku 2026.
2. **Bez zaměření.** Zdroj nese jen REDIZO a KKOV, takže u 440 z 3 091 nabídek (14,2 %) sdílí několik zaměření jednu hodnotu. Táž mez jako u nejnižšího výsledku mezi přijatými.
3. **Mezi ročníky se nesrovnává.** Body odrážejí obtížnost testu; k srovnání ročníků slouží průměrné percentilové umístění přijatých.

**Neříká nic o náročnosti studia ani o kvalitě výuky.** Popisuje, s jakými výsledky přicházejí spolužáci.

Nezaměňovat s **průměrem JPZ přijatých** z oddílu výše. Ten pochází z agregátů CERMATu a platí za nabídku **včetně zaměření**; tenhle za celý obor školy. Zobrazují se vedle sebe právě proto, že se liší, a rozdíl se nedopočítává.

**Nahrazuje pole `jpz_median` a `jpz_prumer_actual`** ze staršího katalogu (17. 9. 2026). Ta vznikala v `scripts/enrich_schools_data.py`, který čte sloupce podle pozice a od revize zdroje počítá chybně, a pocházela z předběžné verze dat za rok 2025. Na webu se nikdy nepoužila. Mezivýsledek `data/jpz_stats_2025.json` tím pozbyl roli; jeho pole `cj_at_jpz_min`, `ma_at_jpz_min`, `cj_min_independent` a `ma_min_independent` se **nepřebírají**, protože každé určuje jediný uchazeč a poslední dvě mohou pocházet od dvou různých lidí, takže vedle sebe popisují uchazeče, který nemusí existovat.

### Soutěžící o obor
Přijatí a ti, kdo se nevešli kvůli kapacitě, dohromady. Je to jmenovatel všech ukazatelů o hranici přijetí.

Na stránce se píše **„soutěžící uchazeči“** a při prvním výskytu v bloku se vysvětlí: „tedy ti, kdo splnili požadavky školy a nedostali se na obor, který měli na přihlášce výš“ ([slovník pojmů](slovnik-pojmu.md)). Samotné „soutěžící“ ani „uchazeči“ místo tohoto pojmu nestačí: uchazeči jsou všichni přihlášení.

Dvě skupiny do něj **nepatří** a při zobrazení se uvádějí zvlášť:

- **Přijati na vyšší prioritu**: byli přijati na obor uvedený na přihlášce výš, a o toto místo proto už nesoutěžili. Mají lepší výsledky než soutěžící, mediánově o 8,7 bodu u 97 % oborů, takže počty soutěžících nejsou všichni uchazeči s daným výsledkem.
- **Nesplnili podmínky**: vypadli na jiném kritériu než na výsledku testu.

U osmiletého gymnázia J. S. Machara bylo v roce 2025 soutěžících 67, ale nesplnilo podmínky 107 dalších uchazečů. Podíl přijatých ze soutěžících by bez této poznámky byl zavádějící.

### Podíl přijatých ze soutěžících
`přijatí ÷ (přijatí + nepřijatí kvůli kapacitě)` za nabídku a ročník. Zdroj: CERMAT, souhrny 1. kola. Pole `podil_prijatych_ze_soutezicich` v `public/souhrny_kolo1.json`.

Odpovídá přímo na otázku „jak těžké je se sem dostat“ ve tvaru, kterému rozumí každý: z uchazečů, kteří splnili podmínky školy a o místo tu opravdu soutěžili, se dostal každý kolikátý. U osmiletého gymnázia J. S. Machara v roce 2026 30 ze 112, zhruba každý čtvrtý; v roce 2025 29 ze 67.

Do jmenovatele **nepatří** uchazeči, kteří nesplnili podmínky, a ti, kdo byli přijati na obor výš na přihlášce; oba počty se uvádějí vedle, protože bez nich by podíl vypadal příznivěji, než jaký byl celý průběh (viz soutěžící o obor). Když nikdo nebyl odmítnut kvůli kapacitě, podíl je 1 a o přijetí rozhodovaly jen podmínky školy.

Rozdělení 2026 u 1 736 nabídek s aspoň jedním odmítnutým: dolní čtvrtina 0,46, medián 0,61, horní čtvrtina 0,78. Mezi roky 2025 a 2026 u 1 868 nabídek s aspoň 20 soutěžícími v obou letech korelace 0,723 a medián změny 9,4 procentního bodu (`docs/podklady/overeni-srovnani-rocniku.json`). S tlakem prvních voleb souhlasí pořadím (Spearman −0,76), tlak ale zůstává ověřeným ukazatelem pro předpověď dalšího roku.

**Neříká, jakou šanci má konkrétní uchazeč**, ani jak se to změní příští rok. Soutěžící nejsou náhodný vzorek: kdo se dostal výš, sem nesoutěžil, a ti mívají lepší výsledky.

### Obtížnost přijetí slovy
Slovní zařazení nabídky podle podílu přijatých ze soutěžících v jednom ročníku. Pole `zarazeni_obtiznosti`.

| Hodnota | Podmínka | Věta na stránce | Nabídek 2026 |
|---|---|---|---:|
| `kapacita_nerozhodovala` | nikdo nebyl odmítnut kvůli kapacitě | Místo bylo pro všechny, kdo splnili podmínky školy | 1 355 |
| `vetsina_uspela` | podíl aspoň 2/3 | Dostala se většina soutěžících | 739 |
| `stredne_tezke` | 1/2 až 2/3 | Dostat se sem je středně těžké | 476 |
| `tezke` | 1/3 až 1/2 | Dostat se sem je těžké | 353 |
| `velmi_tezke` | méně než 1/3 | Dostat se sem je velmi těžké | 168 |

Prahy jsou zlomky, které se dají říct slovy (třetina, polovina, dvě třetiny), ne kvantily; vycházejí z otázky rodiče, ne z rozdělení. Mezi roky 2025 a 2026 zůstalo zařazení stejné u 48,6 % a posunulo se nejvýš o stupeň u 90,2 % nabídek s aspoň 20 soutěžícími, **proto se věta vždy doplňuje podílem a předchozím ročníkem**, například „zhruba každý čtvrtý; rok předtím skoro každý druhý“.

Zařazení se nezobrazuje pod 10 soutěžícími (jeden uchazeč by přehodil stupeň) a u oborů s talentovou zkouškou se doplňuje větou, že rozhodovala i ona.

**Práh je pravidlo zobrazení, ne součást definice.** Datové pole `zarazeni_obtiznosti` v `public/souhrny_kolo1.json` proto nese hodnotu **i pro obory pod prahem** a kdokoli ho čte přímo, musí práh uplatnit sám. Od 17. 9. 2026 platí dělba: veličinu počítá `scripts/build-souhrny-kolo1.py`, práh uplatňuje `zarazeniObtiznosti` v `src/lib/obor-profil.ts`. Do té doby si zařazení počítaly obě strany zvlášť a lišily se právě o tenhle práh; ověřeno, že sjednocení nezměnilo ani jeden z 6 150 zobrazovaných záznamů.

**Není to hodnocení školy** a nesmí se používat k řazení škol. Nahrazuje zamítnutý index obtížnosti (oddíl 6) popisem jednoho ročníku, který jde ověřit ze zdroje. Podmínky školy mohou být hlavní překážkou i tam, kde kapacita nerozhodovala; proto se počet nesplněných podmínek uvádí vedle, kdykoli dosáhne počtu přijatých nebo 20 % přihlášek.

### Podíl přijatých podle bodového pásma
Pro každý obor rozdělení soutěžících do pásem po pěti bodech a podíl přijatých v každém pásmu. Pole `pasma` v `public/pasma_prijeti_2025.json`, generuje `scripts/build-pasma-prijeti.py`.

Zdroj jsou data uchazečů CERMATu za 1. kolo 2025 ve finální revizi ze 20. 5. 2026, **jen obory s povinnou jednotnou zkouškou**. Nejnižší výsledek JPZ mezi přijatými v katalogu (`jpz_min_actual`) se zatím počítá z předběžné verze, takže se od dolní meze pásma může lišit. U ostatních oborů mají výsledek jen uchazeči, kteří test psali kvůli jiné přihlášce.

Jednotka jsou body: součet češtiny a matematiky, každý předmět nejvýš 50 bodů, lepší z obou pokusů. Zdroj nese procentní skór 0 až 200 %, který se dělí dvěma a u běžného testu se tím rovná bodům. U upravených testů se procentní výsledek s body neshoduje.

Pásmo s méně než pěti soutěžícími se slučuje se sousedním, aby „1 z 1“ nevypadalo jako spolehlivých 100 %. Pásma se počítají jen u oborů s aspoň 30 soutěžícími, z nichž aspoň jeden byl odmítnut kvůli kapacitě; těch je 1 497.

Obory, kde nikdo odmítnut nebyl, pásma nemají: každé by vyšlo na 100 % a tabulka by vypadala jako záruka přijetí. Místo ní platí pole `nikdo_neodmitnut_pro_kapacitu`.

**Není to šance konkrétního uchazeče.** Popisuje, jak dopadli loňští uchazeči s podobným výsledkem. Kritéria, kapacita i složení uchazečů se mezi roky mění, takže formulace musí být v minulém čase o roce 2025.

Platí za celý obor školy bez rozlišení zaměření, viz omezení u nejnižšího výsledku JPZ mezi přijatými. Popisuje jen 1. kolo; druhé kolo zpracované není.

Doklady k tomuto a následujícím ukazatelům reprodukuje `scripts/validate-pasma-prijeti.py` do `docs/podklady/overeni-pasem-prijeti-2024-2025.json`.

### Rozhodl test
Pravděpodobnost, že náhodně vybraný přijatý měl lepší výsledek jednotné zkoušky než náhodně vybraný uchazeč, který se nevešel kvůli kapacitě. Plocha pod ROC křivkou. Pole `rozhodl_test`.

Hodnota 1,0 znamená, že o přijetí rozhodl výhradně výsledek testu. Hodnota 0,5 znamená, že výsledek nerozhodoval vůbec.

Ukládá se zaokrouhlené na tři desetinná místa. Počítá se u oborů s aspoň deseti přijatými a pěti odmítnutými kvůli kapacitě, tedy u 1 439. Medián je 0,972, hodnotu 1,000 má 10,1 % oborů, aspoň 0,85 má 93,1 %.

Na stránce se zobrazuje jedna ze tří vět podle hodnoty: 0,97 a výš, 0,85 až 0,97, pod 0,85. U 1 427 oborů bez talentové zkoušky připadá na první 52,4 %, na druhou 41,1 % a na třetí 6,4 %.

**Mezi ročníky je stabilní jen hrubě.** Na 1 173 oborech spárovaných mezi roky 2025 a 2026 je korelace **0,672** a medián absolutní změny 0,01. Hodnoty se drží blízko sebe, ale pořadí oborů v úzkém pásmu kolem 0,97 se mění. Proto se neřadí a nezobrazuje jako číslo, jen jako tři kategorie.

Na dvojici 2024–2025 vycházela korelace 0,725 na 1 158 oborech, takže **novější dvojice ročníků vyšla hůř**. Zařazení do tří kategorií se přitom mezi roky 2025 a 2026 mění u 305 z 1 173 oborů, tedy u 26 %. Je to důvod tuto míru dál nezobrazovat jako číslo a nepoužívat k řazení, ne důvod ji zrušit: medián změny zůstává 0,01 a věta o tom, co rozhodlo, popisuje jeden ročník. Starší hodnoty: do verze 1.6 tu stála korelace 0,783, spočítaná včetně oborů bez povinné zkoušky, které ji uměle zvyšovaly; do verze 1.11 korelace 0,673 na 1 149 oborech z předběžné verze dat 2025. Doklad: `docs/podklady/overeni-pasem-prijeti-2025-2026.json`.

**Neměří kvalitu ani spravedlnost.** Nízká hodnota znamená, že škola vážila i něco jiného než test, například prospěch nebo vlastní zkoušku, což je legitimní.

**Název je zkratka, ne důkaz příčiny.** Míra popisuje shodu pořadí podle testu s výsledkem přijímání. Škola, která řadí podle prospěchu, dosáhne vysoké hodnoty také, protože prospěch s výsledkem testu souvisí. Vysoká hodnota tedy neznamená, že jiné kritérium použito nebylo, jen že s testem nešlo do rozporu.

**Číslo se nezobrazuje**, zobrazuje se věta o tom, co znamená. Projekt si na této míře už jednou vylámal zuby: AUC 0,870 bylo v dřívějším textu nesprávně popsáno jako „správně odhadlo 87 % oborů“.

Nezobrazuje se u oborů s talentovou zkouškou (`talentova_zkouska`): uměleckých oborů skupiny 82 a gymnázií se sportovní přípravou 79-42. Místo ní stojí věta, že o přijetí rozhoduje i talentová zkouška, o které údaje nemáme. U sportovních gymnázií je medián 0,78 proti 0,976 u ostatních.

U záznamů sdílených víc zaměřeními nebo nabídkami (`vice_zamereni`) je medián 0,925 a nad čísly stojí upozornění. Příznak se počítá z vyššího z počtů zaměření v katalogu 2025 a nabídek téže kombinace školy a oboru v roce 2026.

### Pásmo nejistoty
Rozsah od nejnižšího výsledku mezi přijatými k nejvyššímu mezi nepřijatými kvůli kapacitě. Pole `pasmo_nejistoty`, obsazenost `v_pasmu_nejistoty`, přesné počty uvnitř `pasmo_nejistoty_soutezilo` a `pasmo_nejistoty_prijato`. Věta „z N uchazečů v tomto rozmezí se dostalo M“ smí použít jen přesné počty, nikdy součet pětibodových pásem. Dolní mez se na webu neukazuje u oborů s méně než deseti přijatými, stejně jako nejnižší výsledek mezi přijatými; konstanta `MIN_PRIJATYCH_PRO_HRANICI`.

Uvnitř tohoto rozsahu rozhodovala o přijetí i jiná kritéria než test. Pod ním se loni nedostal nikdo, nad ním se dostali všichni.

Medián podílu soutěžících v pásmu je 26,7 %.

Meze se dosazují do vět **každá zvlášť**: pod dolní mezí se nedostal nikdo, nad horní se dostali všichni. U 8,1 % z 1 439 oborů jsou obě meze shodné a platí třetí věta, že přesně s tímto výsledkem se někdo dostal a někdo ne. U 7,8 % je horní mez nižší než dolní a mezi nimi nespadl nikdo.

**Je to popis loňska, ne míra.** Oba konce určuje jediný uchazeč, takže se **nepoužívá k porovnávání oborů ani k řazení**. Šířka pásma je navíc mezi ročníky nestabilní: na 1 173 oborech spárovaných mezi roky 2025 a 2026 korelace 0,719 a medián změny 3 body proti mediánové šířce 6 bodů (na dvojici 2024–2025 to bylo 0,692, 4 body a šířka 7 bodů). Ve verzi 1.4 tu stál ukazatel „překryv u hranice přijetí“, který z těchto dvou hodnot dělal měřítko; při záměně krajních hodnot za devadesátý a desátý percentil se u 41 % oborů obracel verdikt, a proto byl nahrazen mírou *rozhodl test*.

### Percentil nejnižšího přijatého
Kolik ze 100 uchazečů v celé zemi mělo stejný nebo horší výsledek než nejnižší přijatý na obor. Pole `min_prijaty_percentil`.

Počítá se z řádků souboru uchazečů, kde je každý uchazeč jednou bez ohledu na počet přihlášek. Do 13. 9. 2026 se počítal přes záznamy uchazeč krát obor, takže uchazeč s třemi přihláškami vážil trojnásobně.

Odstraňuje vliv obtížnosti testu. Mezi roky 2025 a 2026 stoupl medián výsledku uchazečů ze 46 na 49 bodů a nejnižší přijatý v bodech se posunul mediánově o +1 bod, kdežto jeho percentil o −0,11 bodu. Týž jev opačným směrem byl mezi roky 2024 a 2025: medián klesl z 54 na 46 bodů, hranice v bodech o 3 body dolů, percentil o +1,7 bodu nahoru. **Nezpřesňuje ale predikci**: korelace mezi roky 2025 a 2026 je 0,883 u percentilu proti 0,879 u bodů (2024–2025: 0,867 proti 0,859).

Souhrny CERMATu nesou oficiální variantu po nabídkách, `ČJ+MA – PERCENTIL – MIN (PŘIJATI)`, pole `min_prijaty_percentil_souhrn`, vyplněné jen při aspoň deseti přijatých s výsledkem. U oborů s jedinou nabídkou se s hodnotou z dat uchazečů shoduje do 2 bodů u 2 039 z 2 278 v roce 2025 a u 2 182 z 2 286 v roce 2026; percentilovou základnu legenda souhrnu neuvádí. Na stránce se používá jedna z nich a vždy se jménem tohoto ukazatele.

### Hustota u hranice
Podíl soutěžících, jejichž výsledek leží do pěti bodů od nejnižšího přijatého. Pole `hustota_u_hranice`.

Medián je 28,0 %, takže u poloviny oborů se kolem hranice tísní víc než čtvrtina uchazečů a rozhoduje jediný bod. Nízká hodnota znamená, že hranice leží v řídkém místě a jeden bod nic nemění.

### Hranice přijetí
**Nemáme a mít nebudeme.** CERMAT nezveřejňuje, kolik bodů měl poslední přijatý podle kritérií školy, a z průměru se to spočítat nedá. Nejbližší doložený údaj je nejnižší výsledek JPZ mezi přijatými výše, který je dolní mezí, ne hranicí.

Do 13. 9. 2026 tu stálo, že nemáme ani to minimum. Bylo to nesprávné: pole `jpz_min_actual` existuje v katalogu od začátku a počítá ho `scripts/enrich_schools_data.py`.

### Kapacita 2. kola
Počet míst, která škola vypsala ve 2. kole přijímacího řízení. Zdroj: CERMAT, `PZ{rok}_kolo2_skolobory_vysledky.xlsx`, sloupec `KAPACITA`. Pole `kapacita` v ročníku souboru `public/druhe_kolo.json`, generuje `scripts/build-druhe-kolo.py`.

**Nedá se dopočítat z 1. kola.** Rozdílu kapacity a přijatých z 1. kola se rovná jen u 47 % nabídek roku 2026, protože se do ní promítají uchazeči, kteří se přijetí vzdali, a rozhodnutí školy. Zobrazuje se jen zveřejněná hodnota.

Popisuje nabídku v jednom roce. Neříká, zda škola 2. kolo vypíše příště.

### Přihlášky ve 2. kole
Počet přihlášek podaných na nabídku ve 2. kole. Sloupec `PŘIHLÁŠKY CELKEM`, pole `prihlasky`.

Nesčítá se s přihláškami 1. kola; jde o jiné řízení s jinými uchazeči.

### Přijatí ve 2. kole
Počet přijatých ve 2. kole. Sloupec `PŘIJATÍ`, pole `prijati`. V roce 2026 obsadilo 2. kolo 4 946 z 12 034 vypsaných míst.

### Nepřijatí kvůli kapacitě ve 2. kole
Uchazeči, kteří ve 2. kole splnili podmínky, ale nevešli se. Sloupec `NEPŘIJATI - NEDOSTATEČNÁ KAPACITA`, pole `neveslo_se`. V roce 2026 se to stalo u 199 z 1 060 nabídek.

Ukazuje, že ani 2. kolo nemusí být jistota.

### Nejnižší výsledek přijatých ve 2. kole
Oficiální nejnižší součet bodů z češtiny a matematiky mezi přijatými ve 2. kole. Sloupec `ČJ+MA - % SKÓR - MIN (PŘIJATI)` dělený dvěma, škála 0 až 100 bodů. Pole `min_prijaty`, počet přijatých s výsledkem zkoušky `prijatych_s_vysledkem`.

**Zobrazuje se jen při aspoň deseti přijatých s výsledkem zkoušky**, stejně jako nejnižší výsledek JPZ mezi přijatými v 1. kole. V roce 2026 to splní 133 nabídek.

Není to hranice přijetí; škola mohla vážit i jiná kritéria.

### Nevypsané 2. kolo u nenaplněného oboru
Nabídka, která v 1. kole přijala méně uchazečů, než měla míst, a přesto ve 2. kole nebyla. Kombinuje souhrn výsledků 1. kola se souhrnem 2. kola téhož roku. Pole `stav` s hodnotou `nenaplneno_bez_2_kola`.

V roce 2026 platí pro 47 % oborů, které se v 1. kole nenaplnily. Věta na webu proto varuje, že volná místa po 1. kole neznamenají 2. kolo.

## 3. Kohorty přijatých

Devět skupin přijatých podle úrovně a vyváženosti výsledku, například „Výborný matematik“ nebo „Slabší humanitní“. Definice hranic je v `public/cohort_meta.json`.

Normalizace ročníku 2025: čeština průměr 27,87 a směrodatná odchylka 10,11, matematika průměr 19,71 a odchylka 9,97. Úroveň je průměr obou z-skóre, vyváženost jejich rozdíl.

Popisují složení přijatých, ne šanci konkrétního uchazeče.

## 4. Zařazení do srovnatelné skupiny

Aby číslo něco znamenalo, porovnává se s rozdělením téhož ukazatele v ročníku.

**Srovnatelná skupina** je dvojice typ školy a délka studia, například čtyřleté gymnázium nebo dvouletá nástavba. Napříč typy se neporovnává; medián přihlášek na místo je u osmiletých gymnázií 3,31, u učebních oborů 2,04, a rozdíl nevypovídá o náročnosti, ale o tom, že jde o jiné vzdělávání.

**Percentil ve skupině** je podíl nabídek ve skupině s hodnotou menší nebo rovnou dané hodnotě. Vyjadřuje se slovy: „vyšší poptávka než u čtyř pětin čtyřletých gymnázií“.

Rozdělení se počítá z aktuálního ročníku, nikdy se nezadává ručně, a přepočítává se s každým importem.

### Percentil ve srovnatelné skupině
Podíl nabídek téže srovnatelné skupiny a téhož ročníku s hodnotou ukazatele menší nebo rovnou hodnotě nabídky, v procentech. Rozdělení tlaku prvních voleb nese `public/souhrny_kolo1.json` v `skupiny.{rok}.{typ_délka}`; skupiny se počítají ze souhrnu každého ročníku zvlášť.

Formulace na stránce: „vyšší nebo stejný jako u 94 ze 100 osmiletých gymnázií“. Ve skupině s méně než 30 nabídkami se percentil nezobrazuje, jen poloha na tečkovém grafu.

**Neříká nic o kvalitě.** Popisuje polohu v rozdělení jednoho ukazatele v jednom roce.

### Pořadí v kraji
Pořadí nabídky mezi nabídkami téže srovnatelné skupiny (typ školy a délka studia) ve stejném kraji a ročníku. Praha je samostatný kraj. Počítá se ze souhrnů 1. kola ve `src/lib/souhrny-kolo1.ts` podle dvou ukazatelů a nikdy z jejich kombinace:

| Pořadí | Ukazatel | Směr | Stabilita 2025→2026 |
|---|---|---|---|
| **podle zájmu** | tlak prvních voleb | vyšší hodnota = vyšší pořadí | ve stejné třetině pořadí 66,4 %, medián posunu 5 míst |
| **podle výsledků přijatých** | průměrné percentilové umístění přijatých | vyšší hodnota = vyšší pořadí | ve stejné třetině pořadí 68,1 %, medián posunu 5 míst |

Stabilita měřena na 2 757 a 2 723 spárovaných nabídkách ve skupinách s aspoň 10 nabídkami v obou letech. Shodná hodnota dává shodné pořadí („2.–3.“).

**Nezobrazuje se ve skupině s méně než 10 nabídkami** (19 z 96 skupin kraj × typ v roce 2026, například osmiletá gymnázia v Karlovarském kraji: 7). **Podle obtížnosti přijetí se neřadí**: pořadí podle podílu přijatých ze soutěžících uchazečů se mezi roky přehazuje, u osmiletého gymnázia J. S. Machara ze 7. na 17. místo z 32.

Na stránce vždy s ukazatelem, skupinou, krajem, rokem a předchozím rokem: „2. z 32 osmiletých gymnázií ve Středočeském kraji podle výsledků přijatých (2026; v roce 2025 také 2.)“. **Neříká, která škola je lepší.** Pořadí podle výsledků přijatých popisuje, s jakými výsledky sem uchazeči přicházejí, ne kvalitu výuky. Hranice kraje neodpovídá tomu, kam se uchazeči skutečně hlásí (u Machara je zhruba polovina oborů výš a níž na přihlášce v Praze), proto pořadí doplňuje, ale nenahrazuje obory výš a níž na přihlášce.

### Změna mezi ročníky
Rozdíl hodnoty ukazatele v zobrazeném ročníku a v předchozím ročníku téže nabídky. Počítá se jen u nabídek spárovaných podle `docs/grafy-skoly-a-oboru-2027.md`, pravidlo 7: shodný klíč nabídky, nebo jediná nabídka téže školy a oboru v obou ročnících. Způsob párování nese pole `parovani`. Mezi roky 2025 a 2026 je spárováno 2 858 z 3 091 nabídek, z toho 543 jako jediná nabídka téže školy a oboru.

Srovnávat mezi ročníky se smí kapacita, přihlášky na místo, tlak a podíl prvních voleb a průměrné percentilové umístění přijatých. **Body JPZ se mezi ročníky nesrovnávají**, posun odráží obtížnost testu.

Typická změna mezi 2025 a 2026, dolní čtvrtina / medián / horní čtvrtina: přihlášky na místo −0,48 / −0,04 / +0,40, tlak prvních voleb −0,23 / −0,03 / +0,20, podíl prvních voleb −5,9 / −0,2 / +5,1 procentního bodu, kapacita beze změny u většiny nabídek.

**Neříká, proč se zájem změnil**, ani zda změna vydrží. Ze dvou ročníků nejde mluvit o trendu; slovo „trend“ se nepoužívá, dokud řada nemá aspoň tři doložené ročníky.

## 5. Maturitní výsledky

Analytický návrh je schválený v [maturitní výsledky a kvalita školy](maturitni-vysledky-a-kvalita-skoly-2027.md). Od 14. 9. 2026 vzniká soubor `public/maturita_skoly.json` skriptem `scripts/build-maturita-skoly.py` přes datovou linku (sada `cermat-maturita`); pole mají názvy z kontraktu níže. Od 14. 9. 2026 je sada přepnutá na jaro 2026 a **web soubor čte na stránce školy** (`src/lib/skola-profil-data.ts`).

### Granularita, která rozhoduje o všem
CERMAT zveřejňuje maturitu za právnickou osobu (`redizo`) a za školu ve skupině oborů (`redizo_smo16`). Skupina `SMO16` **není** kód oboru `KKOV`.

Z toho plyne tvrdé pravidlo: školní agregát se nikdy nezobrazí jako výsledek konkrétního oboru. Když přesný oborový výsledek nemáme, nadpis zní „výsledek školy ve skupině oborů“.

### Úspěšnost maturity
Podíl úspěšných **z přihlášených** ke společné části, jak ho počítá CERMAT ve sloupci `PODÍL ÚSPĚŠNÝCH (%)`. Pole `passRate`. Vždy se jmenovatelem vedle podílu, a to se **stejným** jmenovatelem, ze kterého je podíl spočítaný: „maturitu udělalo 45 ze 47 přihlášených“.

Doprovodná pole ze stejného bloku: `registered` přihlášení, `took` konající, `passed` úspěšní, `failed` neúspěšní, `absent` nekonající, `nonParticipationRate` neúčast z přihlášených, `grossFailureRate` hrubá neúspěšnost z přihlášených.

**Změna výpočtu 17. 9. 2026 (dřív podíl z konajících).** Do té doby tenhle soupis tvrdil, že `passRate` je podíl z konajících, a stránka školy vedle procenta vypisovala počet konajících. Vznikl z toho nesoulad: „98,2 %“ vedle „55 z 55“. Zjištěno při revizi maturitního oddílu po zpětné vazbě na Gymnáziu Nad Štolou 14. 9. 2026. Doklad z `public/maturita_skoly.json`: škola s `registered` 47, `took` 46, `passed` 45 má `passRate` 95,74, což je 45/47; z konajících by vyšlo 97,83. Souhlasí i se soupisem zdrojů, oddíl 2.11, kde je `PODÍL ÚSPĚŠNÝCH (%)` definovaný jako úspěšní z přihlášených. **Hodnoty v datech se nemění**, mění se jejich výklad a jmenovatel uváděný na stránce.

**Neříká**, kolik žáků školu dokončí: kdo k maturitě vůbec nešel, je v `absent`, a škola může úspěšnost zvýšit tím, že slabé žáky ke zkoušce nepustí. Proto se vedle podílu uvádí i počet nekonajících.

### Maturita za celou školu
Společná část za právnickou osobu bez rozdělení na skupiny oborů: `skoly[redizo].roky[rok].CELKEM`, v souboru CERMATu třídění `redizo`. Stejná pole jako u skupiny oborů.

**Na stránce** slouží jen souhrnné větě za školu („maturitu v roce 2026 udělalo 146 ze 148 přihlášených maturantů“). Podle pravidla o granularitě se **nikdy** nezobrazí jako výsledek oboru ani skupiny oborů.

### Střed podobných škol
**Medián průměrných procentních skórů z češtiny** přes všechny školy téže skupiny oborů `SMO16`, téhož roku a jarního období, které mají aspoň 10 konajících; každá škola jeden hlas. Jde o **tutéž veličinu, proti které se počítá zařazení**: pole `cj.groupComparison.medianPercentScore` u roku školy, souhrnně `skupiny[rok][SMO16].medianPercentScore`.

**Na stránce** stojí vedle průměrného procentního skóru školy: v kartě oboru, v tabulce po letech a jako osa grafu, kde každá tečka je jedna podobná škola. Pojem v textu je „střed podobných škol“ podle [slovníku pojmů](slovnik-pojmu.md).

**Sjednoceno 17. 9. 2026.** Do té doby se zobrazoval `medianPercentile`, tedy medián průměrných percentilů, zatímco zařazení se počítalo proti mediánu skórů. Čtenář tak viděl dvě čísla z různých veličin a vedle nich nálepku odvozenou z třetí. Kontrola nad `public/maturita_skoly.json` ukázala, že zařazení si s percentilem v žádném z 8 145 srovnání neodporovalo ve směru (0 případů „nad středem“ pod mediánem percentilů a naopak), ale u 4 470 srovnání bylo „nerozlišitelné“, přestože čísla vedle sebe rozdíl ukazovala. Od té doby se vše, co porovnává školu s podobnými školami, počítá i zobrazuje v průměrném procentním skóru.

`medianPercentile` a `percentiles` v souboru zůstávají, web je nepoužívá.

### Umístění maturantů v celé zemi
Průměrný percentil maturantů školy v předmětu, pole `averagePercentile`. Na stránce „v celé zemi lépe než 84 ze 100 maturantů“.

**Je to jiné srovnání než střed podobných škol**: porovnává maturanty školy se všemi maturanty v zemi, ne školu se školami téhož typu. Proto se nikdy neuvádí jako důvod zařazení a v textu se od srovnání s podobnými školami odděluje slovy „v celé zemi“.

### Frekvence let nad středem podobných škol
Slovní souhrn toho, jak často měla škola v češtině zařazení `above`, spočítaný **přes všechny skupiny oborů školy dohromady**: podíl = součet let se zařazením `above` děleno součtem let se zařazením. Prahy: 1 „každý rok“, od 0,75 „téměř každý rok“, nad 0,5 „ve většině let“, právě 0,5 „zhruba v polovině let“, nad 0 „jen v některých letech“, 0 „v žádném ze sledovaných let“. Počítá se při zobrazení z `public/maturita_skoly.json` (`src/lib/skola-vyklad.ts`, `jakCastoNadStredem`).

Roky bez zařazení se do jmenovatele nepočítají, stejně jako u ukazatele Počet let nad skupinou oborů, který zůstává výchozím tvarem pro jednu skupinu oborů.

**Neříká** nic o vývoji v čase: je to podíl, ne trend. U školy s více skupinami oborů míchá roky různých skupin, proto se v textu uvádí s předmětem a s tím, že jde o všechny obory („v češtině byli maturanti všech oborů téměř každý rok nad středem podobných škol“).

### Průměrný procentní skór maturity
Průměrný výsledek v didaktickém testu daného předmětu. Pole `averagePercentScore`, rozptyl `standardDeviation`, percentil `averagePercentile`.

Vždy s uvedením předmětu, roku, období a velikosti vzorku.

### Období
`jaro` nebo `stav_po_podzimu`. Soubor `jap` je stav po podzimním období, ne samostatný podzimní termín. **Obě období se nesčítají a nepřekrývají v grafu.**

### Odchylka od očekávaného výsledku
Výzkumný ukazatel, který by zohlednil vstupní úroveň žáků. **Zatím neexistuje a bez validace se nepublikuje.** Nesmí se nazývat kvalitou školy ani přidanou hodnotou.

Vysoký maturitní výsledek může být důsledkem toho, kdo do školy nastoupil. Bez vstupního kontextu se nečte jako zásluha školy.

### Zařazení proti skupině oborů
Pole `cj.groupComparison` u školy ve skupině oborů: `state` (`above`, `indistinguishable`, `below`), `interval`, `medianPercentScore`, `schools`.

**Výpočet.** Referencí je medián průměrných skórů z češtiny všech škol téže skupiny oborů `SMO16`, téhož roku a jarního období, které mají aspoň 10 konajících; každá škola jeden hlas. U školy s aspoň 10 konajícími se spočítá směrodatná chyba `SE = standardDeviation / √took` a interval `averagePercentScore ± 1,96 · SE`. Interval celý nad mediánem je `above`, celý pod ním `below`, jinak `indistinguishable`. Zdroj: CERMAT, `MZ{rok}j_SC_skolobory.xlsx`. Návrh §5.2.

**Na stránce:** „nad středem podobných škol“, „nerozlišitelné od středu“, „pod středem podobných škol“ (slovník pojmů 1.4). Jen u češtiny, protože jen ji píše celý ročník.

**Jedna veličina pro celé srovnání.** Zobrazený střed podobných škol, hodnota školy i osa grafu jsou od 17. 9. 2026 v průměrném procentním skóru, tedy v téže veličině, ze které se počítá zařazení (`medianPercentScore`). Zůstává jediný rozdíl, který musí text vysvětlit: zařazení navíc bere v úvahu velikost ročníku, takže u malé školy vyjde `indistinguishable`, i když se obě čísla vedle sebe liší. Percentil se u srovnání s podobnými školami nepoužívá, patří ukazateli Umístění maturantů v celé zemi.

**Neříká**, jak dobře škola učí: výsledek ovlivňuje hlavně to, koho škola přijala. U malé školy skončí většina výsledků jako nerozlišitelné, což je správně. **Stabilita:** mezi jary 2025 a 2026 stejné zařazení u 63,1 % škol s aspoň 30 maturanty, přeskok mezi krajními stavy u 9 z 928 ([stránka školy](stranka-skoly-2027.md), oddíl 4.2). Proto se na stránce neukazuje jeden rok, ale počet let nad skupinou.

### Počet let nad skupinou oborů
Počet jarních období z posledních čtyř zveřejněných, kdy měla škola ve skupině oborů zařazení `above`. Počítá se při zobrazení z `public/maturita_skoly.json`; roky bez zařazení (méně než 10 konajících, škola ve skupině nebyla) se uvádějí zvlášť, ne jako „ne nad skupinou“.

**Neříká**, že se škola zlepšuje nebo zhoršuje; ze čtyř bodů jde nanejvýš říct „v posledních dvou letech nad skupinou, předtím pod ní“.

Souhrn za celou školu, tedy přes všechny její skupiny oborů, vede ukazatel Frekvence let nad středem podobných škol.

### Podíl volby předmětu u maturity
Pole `ma.subjectChoiceShare`: podíl maturantů, kteří si ve společné části zvolili matematiku místo cizího jazyka, jak ho zveřejňuje CERMAT. Zveřejňuje se i u méně než 10 konajících matematiku, protože se počítá z celého ročníku.

**Na stránce vždy ve dvojici** s průměrným percentilem z matematiky: „matematiku volilo 48 % maturantů, jejich percentil 64“. Samotný percentil z matematiky **neříká** nic o ročníku, když ji volí jen nejlepší žáci (návrh §5.1).

### Meze zveřejnění
Při počtu maturantů pod 10 se zveřejňují jen počty, mezi 10 a 29 s upozorněním, od 30 běžně. U malých skupin se nedopočítávají podíly, které by rekonstruovaly skryté údaje. V `public/maturita_skoly.json` pole `quality`: `complete` (aspoň 30 konajících), `small_sample` (10 až 29), `counts_only` (pod 10, jen počty a podíl volby předmětu), `unavailable`.

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
4. Přiřadit ho v registru `public/stav_datovych_sad.json` datové sadě, ze které vzniká, nebo do `ukazatele_z_vice_sad`, když vzniká z více sad. Registr určuje, z jakého období se ukazatel zobrazí; `python3 scripts/stav-datovych-sad.py kontrola` selže, když ukazatel žádné sadě nepatří.
5. Teprve potom jej zobrazit na webu, vždy s větou, co znamená, a s rokem, ze kterého pochází.

## 8. Historie

| Verze | Změna |
|---|---|
| 1.23 | **Obtížnost přijetí má jednu definici** (17. 9. 2026): počítá ji generátor souhrnů, práh deseti soutěžících uplatňuje až zobrazení. Dosud existovaly dvě implementace, které se o práh lišily; sjednocení nezměnilo ani jeden z 6 150 zobrazovaných záznamů. Zapsáno, že datové pole nese hodnoty i pod prahem. |
| 1.22 | **Medián JPZ přijatých zaveden jako ukazatel** (17. 9. 2026) a přesunut do `public/pasma_prijeti_{rok}.json`, kde vzniká ze stejného zdroje jako nejnižší přijatý a přepíná se s registrem. Nahrazuje pole `jpz_median` a `jpz_prumer_actual` ze starého katalogu, která pocházela z předběžné verze roku 2025 a z rozbitého `enrich_schools_data.py`, a na webu se nikdy nepoužila. Doloženo, že medián leží systematicky pod průměrem (mediánově o 1,1 bodu na 2 517 nabídkách roku 2026), takže průměr přeceňuje typického přijatého. Pole `cj_at_jpz_min`, `ma_at_jpz_min`, `cj_min_independent` a `ma_min_independent` zamítnuta: každé určuje jediný uchazeč a poslední dvě mohou pocházet od dvou různých lidí. |
| 1.21 | **Doklady stability přepočítány na dvojici ročníků 2025 a 2026** (17. 9. 2026) před přepnutím sady `cermat-uchazeci-kolo1` na rok 2026. Výpočty se nemění, mění se doložená čísla. Míra *rozhodl test* vychází hůř než dřív (korelace 0,672 proti 0,725 na dvojici 2024–2025) a zařazení do tří kategorií se mění u 26 % oborů, což potvrzuje dosavadní rozhodnutí nezobrazovat ji jako číslo. Šířka pásma nejistoty 0,719 a mediánová šířka 6 bodů. Percentil nejnižšího přijatého 0,883 proti 0,879 u bodů; medián výsledku uchazečů stoupl ze 46 na 49 bodů, takže nejnižší přijatý v bodech stoupl o 1 bod, zatímco jeho percentil se nehnul. Doklad `docs/podklady/overeni-pasem-prijeti-2025-2026.json` počítá `scripts/validate-pasma-prijeti.py --rocniky 2025-2026`. |
| 1.20 | **Srovnání s podobnými školami sjednoceno na jednu veličinu** (17. 9. 2026): střed, hodnota školy i osa grafu jsou v průměrném procentním skóru, tedy v tom, proti čemu se počítá zařazení; dřív se zobrazoval medián percentilů. Percentil dostal vlastní ukazatel Umístění maturantů v celé zemi, protože odpovídá na jinou otázku. |
| 1.19 | **Úspěšnost maturity opravena na podíl z přihlášených** (17. 9. 2026), protože pole `passRate` pochází ze sloupce `PODÍL ÚSPĚŠNÝCH (%)`, který CERMAT počítá z přihlášených; dosavadní definice „z konajících“ byla nepravdivá a na stránce z ní vznikl nesoulad procenta a počtu. Hodnoty v datech se nemění. Doplněny ukazatele maturita za celou školu, střed podobných škol a frekvence let nad středem podobných škol, které zavedla revize maturitního oddílu ze 14. 9. 2026. U zařazení proti skupině oborů zapsáno, že jeho referencí je medián skórů, kdežto zobrazený střed je medián percentilů. |
| 1.18 | Maturita: zařazení proti skupině oborů, počet let nad skupinou, podíl volby předmětu; kódy kvality v `public/maturita_skoly.json`; soubor vzniká přes datovou linku. |
| 1.17 | Doplněno pořadí v kraji podle zájmu a podle výsledků přijatých, s prahem 10 nabídek a doklady stability. |
| 1.16 | Odkaz na slovník pojmů; pojem „soutěžící uchazeči“ pro texty stránek. |
| 1.15 | Vysvětleno nesplnění podmínek podle metodiky MŠMT; doplněna odvozená hranice úspěšnosti, výsledek uchazečů o obor a obory výš a níž na přihlášce. |
| 1.14 | Doplněn podíl přijatých ze soutěžících a obtížnost přijetí slovy, s rozdělením a stabilitou mezi ročníky. |
| 1.13 | Doplněny přijatí podle priority, vzdali se přijetí, průměrné percentilové umístění přijatých a uchazečů, percentil ve srovnatelné skupině a změna mezi ročníky ze souhrnů 1. kola (`public/souhrny_kolo1.json`). Ověřeno, že historický průměr 2025 odpovídá průměru přijatých, a doplněna oficiální varianta percentilu nejnižšího přijatého. |
| 1.12 | Čísla pásem přijetí, míry *rozhodl test*, pásma nejistoty, hustoty u hranice a percentilu nejnižšího přijatého přepočítána z finální revize dat uchazečů 2025 (PR #84). Výpočet se nemění. Stabilita míry *rozhodl test* mezi roky 2024 a 2025 vychází 0,725 místo 0,673, šířky pásma 0,692 místo 0,666. Souběžné přihlášky vedeny jako finální revize. |
| 1.11 | Doplněny ukazatele 2. kola: kapacita, přihlášky, přijatí, nepřijatí kvůli kapacitě, nejnižší výsledek přijatých a nevypsané 2. kolo u nenaplněného oboru. |
| 1.10 | Opraveno tvrzení, že data o uchazečích za rok 2026 nejsou zveřejněná; vyšla 20. 5. 2026. |
| 1.9 | Každý ukazatel je přiřazen datové sadě v registru stavu datových sad, který určuje zobrazené období. |
| 1.8 | Pole přejmenováno na `prijato_na_vyssi_prioritu`. Talentové obory dostávají místo verdiktu větu o talentové zkoušce. Příznak sdíleného záznamu počítán i z nabídky 2026. Dolní mez pásma nejistoty podléhá prahu deseti přijatých. |
| 1.7 | Čísla ukazatelů o hranici přijetí přepočítána jen nad obory s povinnou jednotnou zkouškou; stabilita míry *rozhodl test* opravena z 0,783 na 0,673. Heslo „Nastoupili jinam“ přejmenováno a opraveno, protože tvrdilo přijetí, které se nevyhodnocovalo. Doplněn percentil nejnižšího přijatého a jednotka bodů. Talentový příznak rozšířen o sportovní gymnázia. |
| 1.6 | Doplněno, že míra *rozhodl test* popisuje shodu pořadí, ne příčinu. Pásma se nepočítají u oborů bez odmítnutých. Doplněna pravidla pro dosazení mezí pásma nejistoty. |
| 1.5 | Překryv u hranice přijetí zrušen jako nerobustní a nahrazen mírou *rozhodl test*; krajní hodnoty zůstávají jako pásmo nejistoty bez srovnávací funkce. |
| 1.4 | Doplněni soutěžící o obor, podíl přijatých podle bodového pásma, překryv u hranice přijetí a hustota u hranice. |
| 1.3 | Opraveno tvrzení, že nemáme nejnižší výsledek přijatých. Doplněn nejnižší výsledek JPZ mezi přijatými, medián a průměr JPZ přijatých 2025. |
| 1.2 | Doplněn podíl prvních voleb, kohorta podle pozice na přihlášce a souběžné přihlášky. |
| 1.1 | Doplněn tlak prvních voleb, naplněnost a přetlak. Zaznamenán neúspěšný pokus o zpětné odvození indexu obtížnosti a zjištění, že složený index nepřidává rozlišovací schopnost. |
| 1.0 | První soupis. Podkladem je audit obtížnosti, audit dat karet, [návrh prezentace dat](navrh-prezentace-dat-skoly-2027.md) a [maturitní výsledky](maturitni-vysledky-a-kvalita-skoly-2027.md). |
