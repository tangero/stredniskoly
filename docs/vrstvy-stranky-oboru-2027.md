# Stránka oboru: vrstvy podle otázek uchazeče

Verze 1.3 · 13. 9. 2026 · Návrh k rozhodnutí. Deník pěti kol, tři revize po zpětné vazbě v oddílu 7, výsledná podoba v oddílu 8. Pojmy v textech stránky podle [slovníku pojmů](slovnik-pojmu.md).

Navazuje na schválený dokument [Grafy na stránce školy a oboru](grafy-skoly-a-oboru-2027.md), který určuje, **jaké grafy máme a jak se kreslí**. Tento dokument určuje, **v jakém pořadí a v jaké podobě je stránka nabídne**, aby odpověděla na tři otázky:

1. **Jak těžké bude se sem dostat?**
2. **Co mi s tím pomůže?**
3. **Jak se tu bude studovat?**

Názvy ukazatelů drží [slovník](slovnik-ukazatelu.md), období [registr](../public/stav_datovych_sad.json), zdroje [soupis zdrojů](zdroje-dat.md). Vizuální podoba výsledku: [prototyp](prototypy/vrstvy-stranky-oboru-2027.html), publikovaná kopie [v artefaktu](https://claude.ai/code/artifact/d93a94c4-b7a3-45c2-af17-30f7cbd45f68). Přepínačem oborů jde porovnat stav „nevešli se“ (osmileté gymnázium) a „nenaplněno“ (technické lyceum).

## 1. Z čeho kola vycházejí

### 1.1 Tři lidé, na kterých se každé kolo zkouší

| Kdo | Situace | Co potřebuje z první obrazovky |
|---|---|---|
| **Petra**, matka deváťáka, telefon | vybírá mezi gymnáziem a lyceem v okrese, čte večer | jestli má smysl obor dávat na první místo, nebo je to loterie |
| **Jakub**, deváťák s cvičnými testy kolem 60 bodů | porovnává tři obory | jestli se s tím v posledním kole někdo dostal a co ještě kromě testu rozhoduje |
| **Martin**, otec páťáka, počítač | zvažuje osmileté gymnázium | jak moc je to přetlačované a jestli ta škola za to stojí |

Mobilní telefon tvoří 65,4 % měřených návštěv ([analýza návštěvnosti](analyza-navstevnosti-2026.md)), takže každé kolo se hodnotí nejdřív na šířce telefonu.

### 1.2 Co se v 1. kole 2026 u nabídek skutečně stalo

Tohle je nejdůležitější vstup celého návrhu. Ze 3 091 nabídek s povinnou jednotnou zkouškou (`public/souhrny_kolo1.json`):

| Stav nabídky | Nabídek | Podíl | Co to znamená pro otázku 1 |
|---|---:|---:|---|
| **Nevešli se kvůli kapacitě** (`capacity_rejected` > 0) | 1 736 | 56 % | o přijetí rozhodovalo pořadí; dává smysl mluvit o bodech a konkurenci |
| **Nenaplněno** (přijatých méně než míst, nikdo neodmítnut pro kapacitu) | 1 283 | 42 % | kapacita nerozhodovala; rozhodují podmínky školy a to, zda obor otevře |
| **Naplněno bez odmítnutých** | 72 | 2 % | na hraně |

Dnešní stránka přitom u všech tří stavů začíná poměrem přihlášek na místo, tedy číslem, které konkurenci nadsazuje (slovník) a u 42 % nabídek nic nerozhodovalo.

Další vstupy: podmínky školy nesplnilo aspoň 20 % přihlášených u 551 nabídek, z toho u 293 bez jediného odmítnutí kvůli kapacitě. Přijatí jsou z 80 % a víc první volby u 1 506 z 3 076 nabídek.

### 1.3 Pokrytí dat k otázkám

| Údaj | Pokrytí nabídek nebo škol 2026 | Otázka |
|---|---|---|
| Souhrn 1. kola 2026, všechny počty a priority | 3 091 nabídek | 1, 2 |
| Spárovaný předchozí ročník | 2 858 nabídek | 1 |
| Průměrné percentilové umístění přijatých | 3 076 nabídek | 1, 3 |
| Pásma přijetí (data uchazečů 2025, registr) | 1 470 nabídek; u 1 108 nikdo neodmítnut pro kapacitu | 1, 2 |
| Rozhodl test | 1 412 nabídek | 2 |
| Talentová zkouška | 27 nabídek | 2 |
| Souběžné přihlášky 2025 | 2 685 nabídek | 2 |
| 2. kolo 2026 | vypsáno 886, nenaplněno bez 2. kola 768 | 2 |
| Web školy z rejstříku | 1 085 z 1 104 škol | 2 |
| Portál pro školy, potvrzená kritéria a termíny | 0 škol | 2 |
| Extrakce inspekční zprávy | 840 z 1 104 škol; podpora žáků u 826 | 3 |
| InspIS profil | 954 škol; školné vyplněno u 170, termíny dnů otevřených dveří zastaralé (Machar: 8. 12. 2021) | 2, 3 |
| Maturitní výsledky | 0, import nezačal (spárovatelné 2 782 z 3 091) | 3 |

## 2. Kolo 1: tři otázky jako tři patra

**Návrh.** Stránka převezme pořadí prototypu a doplní grafy ze schváleného dokumentu:

```
[hlavička oboru]
DOSTANU SE SEM?   dlaždice · zájem po letech · tečkový graf skupiny · jak dopadly přihlášky · pásma
CO MI POMŮŽE      kdo se dostal podle priority · souběžné přihlášky · 2. kolo
JAK SE TU STUDUJE úroveň spolužáků · inspekce
```

**Procházka.**
- Petra na telefonu vidí první tři obrazovky jen dlaždice a sloupcový graf. Odpověď na svou otázku („dát na první místo?“) najde až v osmé obrazovce u přijatých podle priority.
- Jakub hledá „s 60 body“. Pásma jsou až pátý graf a jsou z roku 2025, zatímco všechno nad nimi je z roku 2026. Nepozná, proč se roky liší.
- Martin u technického lycea Machara vidí tečkový graf a sloupce zájmu, ale obor se nenaplnil (23 přijatých na 30 míst). Tři grafy o konkurenci tu odpovídají na otázku, kterou nikdo nepoložil.

**Rozhodnutí.**

| Prvek | Rozhodnutí | Argument |
|---|---|---|
| Pořadí tří otázek | **ponechat** | odpovídá pořadí, v jakém se rodina rozhoduje; potvrzuje návrh prezentace i prototyp |
| Všechny grafy stejně vysoko | **zavrhnout** | na telefonu 9 grafů = 12 obrazovek; odpověď je až uprostřed |
| Stejná stránka pro všechny nabídky | **zavrhnout** | 42 % nabídek se nenaplnilo, grafy konkurence u nich mlží |
| Dlaždice s poměrem přihlášek na místo nahoře | **zavrhnout jako první údaj** | slovník: nadsazuje konkurenci; u 54 % nabídek by první volby nenaplnily ani kapacitu |

## 3. Kolo 2: odpověď nahoře, důkazy pod ní

**Návrh.** Nad grafy přibude **odpověď ve třech větách**, každá stojí na jednom ukazateli ze slovníku a má rok. Grafy se stanou důkazem pod odpovědí, podrobnosti se rozbalují.

```
┌ Jak těžké bude se dostat ────────────────────────────┐
│ V 1. kole 2026 se nevešlo 82 uchazečů, kteří splnili │
│ podmínky. Obor chtělo jako první volbu 4,1× víc lidí │
│ než míst, víc než u 94 ze 100 osmiletých gymnázií.   │
└──────────────────────────────────────────────────────┘
  ▸ Jak se to vyvíjí    ▸ Kde je obor proti ostatním
```

**Procházka.**
- Petra dostane odpověď na první obrazovce, ale na „dát na první místo?“ pořád ne.
- Jakub chce vložit svých 60 bodů. Simulátor predikce odstranil (O-13) a osobní šance se nezobrazují; zbývají pásma v minulém čase: „s 60–70 body se v roce 2025 dostali 4 z 9“.
- Martin se ptá, jestli je „4,1×“ hodně. Tečkový graf skupiny to ukáže bez hodnocení.

**Rozhodnutí.**

| Prvek | Rozhodnutí | Argument |
|---|---|---|
| Odpověď ve třech větách nahoře | **použít** | odpověď na první obrazovce; věty jsou šablony nad ukazateli se zápisem ve slovníku, žádný nový index |
| Slovní verdikt „velmi těžké“ | **zavrhnout** | vypadá jako známka školy; slovník povoluje percentil ve skupině slovy („víc než u 94 ze 100“), ne škálu obtížnosti. Souhrnný index obtížnosti je zamítnutý (slovník, oddíl 6) |
| Zadání vlastních bodů s osobní šancí | **zavrhnout** | O-13 odstranilo predikce; pásma nejsou šance konkrétního uchazeče (slovník) |
| Zadání vlastních bodů jako **zvýraznění pásma** („v roce 2025 v tomto pásmu 4 z 9“) | **odložit do kola 4** | popisné, v minulém čase, ale jen u 1 470 nabídek s pásmy; ověřit, že nevyvolá dojem slibu |
| „Snazší obory v okolí“ | **zavrhnout** | nabádá k výběru podle obtížnosti místo zájmu; sestavuje skrytý žebříček; potřebuje dojezd, který web zná jen po zadání zastávky |
| Souběžné přihlášky místo „snazších oborů“ | **použít** | ukazuje skutečnou konkurenci bez hodnocení; 2 685 nabídek |
| Přijatí podle priority jako rada k pořadí | **použít** (v kole 5 opraveno na zavrhnout, viz tam) | u 1 506 nabídek je 80 % a víc přijatých z první volby; vypadalo to jako přímá odpověď Petře |

## 4. Kolo 3: „Co mi pomůže“ nesmí být prázdné a „studium“ nesmí lhát

**Návrh.** Otázka 2 dostane konkrétní kroky, ne jen grafy. Otázka 3 se opře o data, která skutečně máme.

**Procházka.**
- Petra hledá kritéria. Portál je vyplněný u 0 škol. InspIS má u Machara den otevřených dveří z roku 2021. Jediný spolehlivý krok je **odkaz na web školy** z rejstříku (1 085 z 1 104 škol).
- Jakub u lycea Machara zjistí, že podmínky nesplnilo 10 z 65 přihlášených a 2. kolo bylo vypsané. To jsou dvě věci, které mu reálně pomůžou: číst kritéria a vědět o 2. kole.
- Martin u otázky 3 vidí „průměrné percentilové umístění přijatých 92“ a čte to jako „náročná škola“. Slovník to zakazuje: popisuje spolužáky, ne náročnost studia. Maturita, která by náročnost popsala, zatím není naimportovaná.

**Rozhodnutí.**

| Prvek | Rozhodnutí | Argument |
|---|---|---|
| Odkaz „Kritéria přijetí na webu školy“ | **použít** | 98 % škol; jediná cesta k závaznému textu; sloupec `WWW` z rejstříku je v soupisu zdrojů mezi nepoužitými s nejvyšší hodnotou |
| Potvrzená kritéria a termíny z portálu | **použít, když existují** | 0 škol dnes; blok se nezobrazí prázdný, jen výzva „Škola údaje zatím nepotvrdila“ v patičce oddílu |
| Termín dne otevřených dveří z InspIS | **zavrhnout** | data zastaralá (soupis zdrojů, oddíl 2.8; Machar 2021) |
| Podíl nesplněných podmínek | **použít při ≥ 20 % přihlášek** | 551 nabídek; signál, že rozhoduje něco jiného než test; pod prahem šum |
| Věta o talentové zkoušce | **použít** | 27 nabídek, ale bez ní by pásma klamala (slovník, rozhodl test) |
| 2. kolo | **použít** | 886 vypsaných v roce 2026; pro nenaplněné obory je to nejpraktičtější informace |
| Úroveň spolužáků v percentilech | **použít pod otázkou 3 s výkladem** | 3 076 nabídek; nadpis „S jakými výsledky přicházejí spolužáci“, nikdy „náročnost“ |
| Inspekce: silné stránky, rizika, komu škola sedne, na co se zeptat | **použít** | 840 škol; jediný zdroj o výuce; už je na podstránce inspekce, na stránce oboru jen souhrn a odkaz |
| Podpora žáků z inspekce (`hard_facts.support_services`) | **použít** | 826 škol; soupis zdrojů ji vede jako nepoužitou; odpovídá „pomůžou dítěti, když bude potřeba“ |
| Absence z inspekce | **zavrhnout** | text ze zprávy, nesrovnatelný mezi školami, snadno vytržený z kontextu (Machar: 7. ročník) |
| Maturitní výsledky | **odložit** | neimportováno; až po importu podle návrhu maturit, vždy „škola ve skupině oborů“ |
| Prázdná karta „maturitu zatím nemáme“ | **zavrhnout** | prázdná karta na 3 091 stránkách zabírá obrazovku a nic neříká; poznámka patří do metodiky |
| Kohorty přijatých (profil matematik / humanitní) | **odložit** | jsou z roku 2025 ze starší revize katalogu, ročník 2024 je jejich kopií; přepočítat z dat uchazečů 2026 přes linku |

## 5. Kolo 4: jedna kostra, tři stavy

**Návrh.** Kostra stránky je stejná pro všechny obory, mění se obsah odpovědi a výběr důkazů podle stavu z oddílu 1.2.

| Oddíl | Stav A: nevešli se (56 %) | Stav C: nenaplněno (42 %) |
|---|---|---|
| Odpověď 1 | „V 1. kole {rok} se nevešlo N uchazečů. Tlak prvních voleb X×, víc než u P ze 100 …“ | „V 1. kole {rok} se obor nenaplnil: přijato N z K míst a nikdo nebyl odmítnut kvůli kapacitě.“ + podmínky, pokud ≥ 20 % |
| Důkazy 1 | zájem po letech, tečkový graf skupiny, pásma | zájem po letech, jak dopadly přihlášky |
| Odpověď 2 | kritéria školy; co kromě testu rozhodovalo | kritéria školy; 2. kolo; zda obor škola znovu vypíše |
| Důkazy 2 | rozhodl test, souběh | 2. kolo po letech, souběh |
| Otázka 3 | stejné pro oba stavy | stejné pro oba stavy |

Stav B (72 nabídek) má odpověď „V 1. kole {rok} se naplnil, nikdo nebyl odmítnut kvůli kapacitě“ a důkazy jako stav A bez pásem.

**Procházka na skutečných nabídkách.**
- *Machar, osmileté gymnázium* (stav A): 82 nevešlých, tlak 4,1× (2025: 3,9×), 28 z 30 přijatých z první volby.
- *Machar, technické lyceum* (stav C): přijato 23 z 30, tlak 0,57×, 2. kolo vypsané v obou letech. Jakub se dozví, že rozhodovaly podmínky a že je tu 2. kolo, místo tří grafů konkurence.
- *VOŠ a SPŠ dopravní v Praze, elektrotechnika se zaměřením inteligentní dopravní systémy* (stav C s podmínkami): 84 přihlášek, přijato 17 z 30, podmínky nesplnilo 17. Odpověď musí vést ke kritériím školy, ne k bodům.

**Zadání vlastních bodů (odloženo v kole 2).** Zkouška: u Machara Jakub se 60 body uvidí „v pásmu 60–70 bodů se v roce 2025 dostali 4 z 9 soutěžících“. Věta je pravdivá, ale čte se jako „mám 44 %“. **Rozhodnutí: zavrhnout na stránce oboru**, tabulka pásem zůstane rozbalovací bez vstupu. Vstup s vlastními body patří do simulátoru, kde je kontext více oborů.

**Rozhodnutí.**

| Prvek | Rozhodnutí | Argument |
|---|---|---|
| Stejná kostra, obsah podle stavu | **použít** | rodič se na druhé stránce neztratí; přitom žádná stránka neukazuje grafy k otázce, kterou nikdo nepoložil |
| Pásma u stavu C | **skrýt** | u 1 108 nabídek bez odmítnutých by každé pásmo vyšlo 100 % (slovník, pásma) |
| Tečkový graf skupiny u stavu C | **skrýt** | tlak pod 1× u nenaplněného oboru nepopisuje obtížnost přijetí |
| Změna mezi ročníky | **použít jen u spárované nabídky** | 2 858 z 3 091; u ostatních věta „předchozí ročník nelze jednoznačně přiřadit“ |
| Slovo „loni“ | **zavrhnout** | 1. kolo 2026 proběhlo letos; pro uchazeče o rok 2027 je „loni“ nejednoznačné a kalendářně nesprávné. Vždy rok z registru. Týká se i dnešní karty pásem „Jak to dopadlo loni“ |
| Rok u každého bloku | **použít jako štítek** | pásma a souběh jsou z roku 2025 (registr), souhrn z 2026; štítek „1. kolo 2025“ u bloku odstraní zmatek z kola 1 |
| Vlastní body na stránce oboru | **zavrhnout** | viz zkouška výše |

## 6. Kolo 5: vzhled, hierarchie a ovládání

**Návrh vzhledu.** Stránka je pracovní nástroj rodiny, ne reklama školy. Identita webu (Cabin, modrá `#0074e4`, navy) zůstává.

- **Tři otázky jako kotvy.** Na telefonu pod hlavičkou lepivý přepínač „Přijetí · Pomoc · Studium“, na počítači levý sloupec s odpověďmi a pravý s důkazy. Kotvy dávají smysl, protože stránka je dlouhá a čte se opakovaně.
- **Odpověď je text, ne číslo.** Věta velkým písmem, klíčová čísla tučně uvnitř věty. Dlaždice s velkými čísly jen v důkazech.
- **Barvy nehodnotí.** Žádná červená a zelená pro „těžké“ a „snadné“. Modrá nese tento obor, šedá ostatní, oranžová jen „nevešli se“ v rozpadu přihlášek. Stav oboru nese text a ikona, ne barva.
- **Důkazy se rozbalují po jednom.** Každý graf má nadpis-otázku, jednu větu výkladu, rok a zdroj, tabulku pod rozbalením.
- **Akce u hlavičky:** „Uložit mezi zvažované“ (oddíl 4.3 dokumentu grafů) a „Porovnat v simulátoru“. Uložení je nejčastější další krok rodiny, která stránku čte.
- **Metodika dole**, jednou za stránku: odkud čísla jsou, co neříkají, co chybí (maturita).

**Procházka.**
- Petra na telefonu: hlavička, uložit, odpověď 1 a odpověď 2 na první a druhé obrazovce. Na svou otázku o prvním místě dostane odpověď „pořadí šanci nemění“ a odkaz na výklad algoritmu.
- Jakub: kotva „Pomoc“, kritéria na webu školy, věta o podmínkách, tabulka pásem rozbalená.
- Martin na počítači: odpovědi vlevo, grafy vpravo, pod tím inspekce a podpora žáků.

**Nález při kontrole: rada k pořadí přihlášek byla chybná.** Kolo 2 použilo přijaté podle priority jako radu „dejte obor na první místo, 28 z 30 přijatých ho mělo jako první volbu“. V jednotném přijímacím řízení ale škola řadí uchazeče jen podle svých kritérií a priorita určuje pouze, kam uchazeč nastoupí, když ho přijme víc škol; web to sám vysvětluje na stránce [Jak to funguje?](https://www.prijimackynaskolu.cz/jak-funguje-prijimani). Vysoký podíl přijatých z první volby vzniká tím, že kdo se dostal výš, na nižší prioritu už nenastupuje (slovník, přijati na vyšší prioritu). Rada by vedla rodinu k taktizování, které nic nepřinese.

Oprava: odpověď 2 říká opak a je to užitečná informace, protože o prioritě koluje hodně mýtů: **„Pořadí na přihlášce šanci na přijetí nemění. Seřaďte obory podle toho, kam chcete chodit nejvíc.“** Přijatí podle priority se přesouvají k otázce 3 jako údaj o spolužácích: „28 z 30 přijatých si obor dalo jako první volbu“, tedy kolik budoucích spolužáků sem chtělo nejvíc.

**Poslední kontrola proti pravidlům.**

| Pravidlo | Splněno |
|---|---|
| Každé číslo má zápis ve slovníku a rok z registru | ano; nové věty skládají jen ukazatele ze slovníku 1.13 |
| Nic za školu místo za obor | ano; odpovědi i grafy jsou za nabídku, škola má vlastní stránku |
| Body mezi ročníky nesrovnávat | ano; změna jen v počtech, tlaku a percentilech |
| Malé počty | pod 10 přijatými se minimum ani pásma neukazují a věta řekne proč |
| Neznámý údaj není nevýhoda | chybějící kritéria vedou na web školy, ne na „nemáme“ |

**Rozhodnutí.**

| Prvek | Rozhodnutí | Argument |
|---|---|---|
| Lepivé kotvy tří otázek | **použít** | dlouhá stránka, opakované čtení, telefon |
| Dvousloupcové odpověď / důkaz na počítači | **použít** | odpověď zůstane na očích při čtení grafu |
| Semafory a hodnoticí barvy | **zavrhnout** | vytvářejí známku, kterou slovník nedovoluje |
| Uložit mezi zvažované u hlavičky | **použít** | návaznost na PRD Můj výběr, D1 |
| Metodika jednou dole | **použít** | nahrazuje opakované upozornění u každého čísla, které dnes stránku prodlužuje |
| Rada „dejte obor na první místo“ | **zavrhnout, oprava kola 2** | priorita šanci nemění; podíl přijatých z první volby je důsledek rozřazení, ne výhoda |
| Věta „Pořadí na přihlášce šanci nemění“ v odpovědi 2 | **použít** | opravuje rozšířený mýtus, platí pro všechny nabídky, odkazuje na výklad algoritmu |
| Přijatí podle priority u otázky 3 („kolik spolužáků sem chtělo nejvíc“) | **použít** | 3 076 nabídek; popisuje složení přijatých bez rady k taktice |

## 7. Revize po zpětné vazbě

### 7.1 První revize: odpověď nebyla srozumitelná

**Zpětná vazba zadavatele** k odpovědi z kola 5 u osmiletého gymnázia Machara: z věty „nevešlo se 82 uchazečů … na jedno místo připadlo 4,1 uchazeče … víc nebo stejně jako u 94 ze 100 … podmínky nesplnilo 85 z 233“ **nejde poznat, jestli je těžké se sem dostat**. Graf „Zájem po letech“ navíc svedl ke čtení „všichni, kdo si školu dali na první a druhé místo, se dostali“.

**Rozbor chyby.**
1. Věta skládala tři různá čísla se třemi jmenovateli (uchazeči, místa, obory ve skupině) a nechala úsudek na čtenáři. Kolo 2 zavrhlo slovní verdikt ze obavy ze „známky školy“ a tím odpověď vyprázdnilo.
2. Graf „Zájem po letech“ ukazoval přihlášky podle priority s čárkou kapacity. Čtenář barvy přirozeně čte jako „kdo se dostal“. Skutečnost u Machara 2026: 123 lidí mělo obor jako první volbu, přijato z nich bylo 28; celkem se dostalo 30 ze 233 přihlášek. Priorita přitom šanci nemění (kolo 5).

**Nové měření** (`docs/podklady/overeni-srovnani-rocniku.json`, `podil_prijatych_ze_soutezicich`): podíl přijatých ze soutěžících, tedy z těch, kdo splnili podmínky a nešli jinam výš, je srozumitelný („dostal se každý čtvrtý“), mezi roky 2025 a 2026 má korelaci 0,723 a s ověřeným tlakem prvních voleb souhlasí pořadím (Spearman −0,76). U osmiletého gymnázia Machara ale kolísá: 29 ze 67 v roce 2025, 30 ze 112 v roce 2026.

**Rozhodnutí.**

| Prvek | Rozhodnutí | Argument |
|---|---|---|
| Slovní verdikt obtížnosti | **použít, oprava kola 2** | bez něj odpověď neodpovídá; verdikt stojí na podílu přijatých ze soutěžících s prahy třetina, polovina, dvě třetiny, zapsaný ve slovníku 1.14 jako *obtížnost přijetí slovy*; není to známka školy ani žebříček |
| Verdikt bez podílu a předchozího roku | **zavrhnout** | zařazení se mezi roky nezměnilo jen u 48,6 % nabídek, o nejvýš stupeň u 90,2 %; věta proto vždy nese „zhruba každý čtvrtý; v roce 2025 zhruba každý druhý“ |
| Tlak prvních voleb a percentil ve skupině v odpovědi | **přesunout do důkazů** | tři jmenovatele v jedné větě byly příčinou nesrozumitelnosti |
| Graf přihlášek podle priority s kapacitou („Zájem po letech“) | **zavrhnout na stránce oboru** | prokazatelně svedl ke čtení „kdo se dostal“; nahrazuje ho graf „Kolik soutěžících se dostalo“ po letech |
| Graf „Kolik soutěžících se dostalo“ | **použít jako první důkaz** | přijatí a nevešlí po letech na jedné ose; ukazuje i trend zájmu (67 → 112 soutěžících) |
| Srovnání se skupinou v podílu přijatých ze soutěžících | **použít místo tlaku** | stejná veličina jako verdikt, jeden jmenovatel na stránce |
| „28 z 30 přijatých si obor dalo jako první volbu“ u otázky 3 | **zavrhnout** | stejné riziko jako graf priorit: čte se jako výhoda první volby |
| Počet nesplněných podmínek vedle verdiktu | **použít**, když dosáhne počtu přijatých nebo 20 % přihlášek | u Machara 85 z 233; bez něj by verdikt počítaný jen ze soutěžících vypadal příznivěji |

**Nové znění odpovědi 1** (šablony podle stavu):
- stav A, osmileté gymnázium: „**Dostat se sem je velmi těžké.** V 1. kole 2026 se ze 112 uchazečů, kteří splnili podmínky školy a o místo tu soutěžili, dostalo 30, tedy zhruba každý čtvrtý. V roce 2025: zhruba každý druhý, 29 z 67. Kromě toho 85 z 233 přihlášených nesplnilo podmínky školy.“
- stav A, čtyřleté gymnázium: „**Dostala se většina uchazečů, kteří o místo soutěžili, ale ne všichni.** V 1. kole 2026 se z 44 … dostalo 30, tedy zhruba dva ze tří.“
- stav C, technické lyceum: „**Místo bylo pro všechny, kdo splnili podmínky školy.** V 1. kole 2026 škola přijala 23 uchazečů na 30 míst a nikoho neodmítla kvůli kapacitě. Volná místa nabídla ve 2. kole (7).“

### 7.2 Druhá revize: „nesplnili podmínky“ a obory výš a níž na přihlášce

**Zpětná vazba zadavatele.**
1. Výraz „nesplnili podmínky školy“ je nesrozumitelný a těch lidí je každý rok hodně. Udělali chybu v přihlášce?
2. Stránka by měla ukázat obory, které uchazeči měli na přihlášce výš a níž, a porovnat obtížnost přijetí na ně.

**Co říká metodika a data** (`docs/podklady/rozbor-podminek-a-poradi-2026.json`, `scripts/rozbor-podminek-a-poradi.py`):
- Metodika MŠMT 2026/2027 dovoluje vylučující kritéria jen tam, kde to umožňuje předpis, typicky **hranici úspěšnosti** v jednotné, školní nebo talentové zkoušce nebo v celkovém hodnocení. Nesplnění kritérií není chyba v přihlášce; kdo na jednotnou zkoušku nepřišel, mezi nesplněné se nepočítá.
- V roce 2026 nesplnilo podmínky 41 763 ze 424 353 přihlášek (9,8 %).
- U 1 156 oborů s aspoň pěti nesplněnými a pěti soutěžícími data vysvětlí nesplnění hranicí ve slabším testu u 286 a v součtu u 187; u 683 rozhodovalo jiné kritérium.
- **Ověřeno na kritériích školy:** osmileté gymnázium J. S. Machara vyhlásilo pro rok 2026, že uchazeč s méně než 20 body v kterémkoli testu nemůže být přijat. Data dávají nejvýš 19 bodů u nesplněných a nejméně 20 u soutěžících. Web školy navíc uvádí, že poslední přijatý v roce 2025 měl 65 bodů, stejně jako pásma přijetí.
- **Kam se dostali uchazeči o osmileté gymnázium Machara 2026:** z 233 sem 30, výš 37, níž 25, **nikam 141**. Obory výš i níž byly až na jeden také „velmi těžké“. U čtyřletého gymnázia se nikam nedostali 4 z 94.

**Rozhodnutí.**

| Prvek | Rozhodnutí | Argument |
|---|---|---|
| Výraz „nesplnili podmínky školy“ | **nahradit** „nedosáhli požadavku školy“ | slovo „podmínky“ čte laik jako formální náležitosti přihlášky; metodika jde o kritéria, typicky hranici bodů |
| Odvozená hranice úspěšnosti („podle výsledků to odpovídá minimu 20 bodů v každém testu“) | **použít**, jen kde ji data jednoznačně oddělí | 473 z 1 156 oborů; ověřeno proti kritériím Machara; vždy „podle výsledků to odpovídá“ a odkaz na kritéria, protože jde o odhad z jednoho ročníku |
| Obecná věta u oborů, kde hranici data nevysvětlí | **použít** „například minima bodů, výsledku školní zkoušky nebo jiné podmínky z kritérií“ | 683 oborů; odkazuje čtenáře ke kritériím místo ticha |
| Jak dopadli všichni, kdo se sem hlásili (sem / výš / níž / nikam) | **použít** jako první důkaz otázky 2 | odpovídá na skutečnou obavu rodiny, že nebude mít kam nastoupit; u Machara 141 z 233 nikam |
| Obory výš a níž na přihlášce s obtížností přijetí | **použít** místo souběžných přihlášek bez směru | zadavatel; ukazuje, že alternativy uchazečů Machara byly stejně těžké; stejná veličina obtížnosti jako odpověď 1 |
| Věta „pomůže mít na přihlášce i obor, kde v 1. kole místo bylo“ | **použít**, jen když se nikam nedostala aspoň čtvrtina uchazečů | je to jediná rada, kterou data podloží bez tvrzení o prioritě; pod čtvrtinou by strašila zbytečně |
| Barevné štítky obtížnosti v tabulce | **zavrhnout**, štítky neutrální | kolo 5: barvy nehodnotí; text štítku nese význam |
| Výběr „bezpečnějších“ škol do tabulky podle obtížnosti | **zavrhnout** | tabulka ukazuje skutečné volby uchazečů, ne doporučení; jinak by vznikl žebříček |

**Rok dat.** Rozbor je z dat uchazečů 2026, která registr zatím nezobrazuje (sada `cermat-uchazeci-kolo1` ukazuje 2025). Prototyp je proto označuje rokem 2026; web je převezme až po přepnutí registru, do té doby z roku 2025.

### 7.3 Třetí revize: pojmy

**Zpětná vazba zadavatele:** místo „soutěžících“ psát „uchazeči“, a pokud se pojmy liší, „soutěžící uchazeči“; termín vysvětlit při prvním výskytu v každém bloku a mít jeden slovník pojmů, aby se na stránkách nepsalo různě.

**Rozhodnutí.**

| Prvek | Rozhodnutí | Argument |
|---|---|---|
| „soutěžící“ | **nahradit** „soutěžící uchazeči“ | u osmiletého gymnázia Machara je uchazečů 233 a soutěžících uchazečů 112; prosté „uchazeči“ by dosadilo čtenáři špatný jmenovatel („každý čtvrtý“ ze 233 by byl nepravdivý) |
| Vysvětlení při prvním výskytu v každém bloku | **použít** | bloky se čtou samostatně (rozbalený graf, odpověď); standardní věta ze slovníku pojmů |
| „nesplnili podmínky“, „podmínky školy“ | **nahradit** „nedosáhli požadavku školy“, „kritéria školy“ | viz revize 7.2; sjednoceno ve slovníku pojmů |
| Slovník pojmů | **založit** `docs/slovnik-pojmu.md`, povinný podle CLAUDE.md | jeden zdroj pojmů pro všechny stránky; odlišný od slovníku ukazatelů, který drží názvy v datech |

## 8. Výsledná podoba

```
┌───────────────────────────────────────────────┐
│ Gymnázium J. S. Machara · osmileté gymnázium  │
│ Brandýs nad Labem · z 5. třídy · 30 míst      │
│ [Uložit mezi zvažované] [Porovnat]            │
├───────────────────────────────────────────────┤
│  Přijetí · Pomoc · Studium        (lepivé)    │
├───────────────────────────────────────────────┤
│ 1 JAK TĚŽKÉ BUDE SE DOSTAT      1. kolo 2026  │
│ Dostat se sem je velmi těžké. V 1. kole 2026  │
│ se ze 112 uchazečů, kteří splnili podmínky,   │
│ dostalo 30, zhruba každý čtvrtý (2025: každý  │
│ druhý). 85 z 233 nesplnilo podmínky školy.    │
│  ▸ Kolik soutěžících se dostalo ▸ Proti podob.│
│  ▸ Jak dopadly přihlášky  ▸ Body v roce 2025  │
├───────────────────────────────────────────────┤
│ 2 CO VÁM POMŮŽE                               │
│ • Pořadí na přihlášce šanci nemění, seřaďte   │
│   obory podle toho, kam chcete chodit.        │
│ • O přijetí rozhodl hlavně test (2025).       │
│ • Kritéria přijetí na webu školy →            │
│ • Titíž uchazeči se hlásili také na …         │
│  ▸ Kam se hlásili titíž uchazeči              │
├───────────────────────────────────────────────┤
│ 3 JAK SE TU STUDUJE                           │
│ Spolužáci přicházejí s výsledky kolem 92.     │
│ percentilu celé země.                         │
│ Inspekce 2025: silné stránky / na co pozor    │
│ Podpora žáků: psycholog, poradenství, IVP     │
│ Na co se zeptat na dni otevřených dveří       │
├───────────────────────────────────────────────┤
│ Odkud čísla jsou a co neříkají                │
└───────────────────────────────────────────────┘
```

## 9. Souhrn rozhodnutí

| Použít | Skrýt podle stavu | Odložit | Zavrhnout |
|---|---|---|---|
| odpověď ve třech větách; kotvy tří otázek; slovní verdikt s podílem a předchozím rokem; kolik soutěžících se dostalo; co se stalo se všemi přihláškami; tečkový graf skupiny v podílu přijatých; pásma (rozbalit); věta „pořadí na přihlášce šanci nemění“; souběh; 2. kolo; odkaz na kritéria na webu školy; podíl nesplněných podmínek ≥ 20 %; věta o talentové zkoušce; úroveň spolužáků v percentilech; inspekce souhrn; podpora žáků; změna mezi ročníky u spárovaných; uložit mezi zvažované; metodika dole | pásma a tečkový graf u nenaplněných oborů; změna u nespárovaných | maturitní výsledky; kohorty přijatých; potvrzená kritéria z portálu (až budou) | verdikt bez podílu a roku; graf přihlášek podle priority; „28 z 30 si dalo jako první volbu“; rada „dejte obor na první místo“; poměr přihlášek na místo jako první údaj; osobní šance; vlastní body na stránce oboru; snazší obory v okolí; termín DOD z InspIS; absence z inspekce; prázdná karta maturity; hodnoticí barvy |

## 10. Zvážené nepoužité sloupce

Prošel jsem oddíl 3 soupisu zdrojů; rozhodnutí pro tuto stránku:

| Sloupec | Rozhodnutí |
|---|---|
| Web a kontakt školy (rejstřík CSV, `WWW`) | **použít**: odkaz na kritéria; do datové vrstvy ho přivést (dnes v ní není) |
| Dobíhající obor (rejstřík, `dobihajiciObor`) | **použít**, jakmile se dostane do datové vrstvy: varování „škola obor dobíhá“ patří do odpovědi 2 |
| Přijatí podle priority | **zavrhnout na stránce oboru** (revize, oddíl 7): čte se jako výhoda první volby; data zůstávají v souhrnech |
| Výsledky všech uchazečů | **použít** průměrné umístění uchazečů jako srovnání u úrovně spolužáků |
| `hard_facts.support_services` | **použít**, otázka 3 |
| Maturitní výsledky | **odložit**, import |
| Vstupní úroveň 2017–2023 | **odložit**, P8 |
| Profil dovedností z položkových dat | **zavrhnout pro tuto verzi**: nezpracováno, výklad pro rodiče nejistý |
| Oficiální minimum a maximum přijatých | **zavrhnout jako údaj**: určuje je jeden uchazeč; minimum zůstává v pásmech |
| `jpz_prumer_actual`, `jpz_median` | **zavrhnout**: katalog 2025, souhrny nesou průměr i umístění |
| `hard_facts.absence` | **zavrhnout**, kolo 3 |
| Data uchazečů 2. kola | **zavrhnout**: jen 133 oborů s aspoň deseti přijatými |
| Důvod nepřijetí jednotlivce, AKKO platnost, ředitel | **zavrhnout**: duplicitní, bez vypovídací hodnoty pro rodiče, osobní údaj |

## 11. Otevřené otázky k rozhodnutí

1. Mají věty odpovědi generovat pevné šablony (navrhuji), nebo je psát redakce pro nejnavštěvovanější obory?
2. Přivést web školy a dobíhající obor do datové vrstvy v téže dávce jako grafy (P7)?
3. Stránka přehledu školy dostane stejnou kostru tří otázek, nebo zůstane rozcestníkem na obory s grafem změny zájmu (dokument grafů, oddíl 4.2)?

## Historie

| Verze | Změna |
|---|---|
| 1.3 | Třetí revize: „soutěžící uchazeči“ s vysvětlením při prvním výskytu v bloku, slovník pojmů. |
| 1.2 | Druhá revize: „nesplnili podmínky“ vysvětleno podle metodiky MŠMT a nahrazeno „nedosáhli požadavku školy“ s odvozenou hranicí úspěšnosti; přidán výsledek uchazečů (sem, výš, níž, nikam) a obory výš a níž na přihlášce s obtížností přijetí. |
| 1.1 | Revize po zpětné vazbě: slovní verdikt obtížnosti z podílu přijatých ze soutěžících, graf „Kolik soutěžících se dostalo“ místo grafu priorit, srovnání skupiny ve stejné veličině. |
| 1.0 | Pět kol návrhu vrstev stránky oboru: tři otázky, odpověď nad důkazy, stavy nabídky podle výsledku 1. kola, vzhled a ovládání; souhrn rozhodnutí a zvážené nepoužité sloupce. |
