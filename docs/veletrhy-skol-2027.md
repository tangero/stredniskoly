# Veletrhy a přehlídky středních škol

Verze 1.0 · 23. 9. 2026 · **Návrh a stav rozpracované implementace.**

**Stav implementace (k verzi 1.0):** v kódu jsou data, přehled po krajích s čipy (od 1.0), metodický blok a formulář s předáním hlášení přes Resend. Počty akcí a pokrytí jsou v [aktuálním soupisu zdrojů](zdroje-dat.md#215-veletrhy-a-přehlídky-středních-škol); číselné odhady níže zachycují původní návrh. Stránka má hodinovou revalidaci a klientskou aktualizaci dne každou minutu. Kalendářový export (§ 5.8) dosud implementovaný není. Zamítnuto ve verzi 1.0: našeptávání měst a časové skupiny seznamu — osou stránky je kraj a filtr měst neexistuje (§ 5.2).

**Známá omezení fronty hlášení** (z oponentury, čtvrté kolo): čekání na databázi má strop tří sekund, ale `Promise.race` samotný dotaz nezruší — spojení zůstane obsazené, dokud neskončí. Je to vědomý kompromis: lepší nechat viset spojení než ztratit hlášení. Při opakovaném výpadku databáze to může vyčerpat pool. Odesílání pošty strop má (osm sekund, `AbortSignal`), ten požadavek skutečně přeruší. Příznak `odeslano_mailem = false` proto neznamená „e-mail neodešel“, ale „nevíme o tom, že odešel“. Databázová záloha hlášení (§ 6.3) doplněna ve třetím kole: migrace `db/migrace/005-veletrhy.sql`, záznam vzniká dřív než e-mail. **Na produkci ale tabulka až do 23. 9. 2026 chyběla**: SQL vzniklo ručně a nic ho nespouštělo, takže každý zápis tiše selhal a nahlášení drželo jen e-mail (žádné do té doby nepřišlo, nic se neztratilo). Od té doby se SQL generuje z `src/lib/veletrhy-schema.ts`, spouští se `scripts/veletrhy-migrace.mjs` jako u událostí a portálu a `tests/veletrhy-schema.test.mjs` hlídá, že sloupce, do kterých formulář zapisuje, migrace zakládá. Migrace proběhla 23. 9. 2026 a zápis formuláře byl ověřen v transakci s rollbackem. Při nedostupnosti pošty i databáze produkční endpoint vrací 503; potvrzení API od Resendu není důkaz doručení do schránky, proto záznam v databázi platí nezávisle na ní. Produkční nasazení toto review neověřuje.

Rodina, která vybírá střední školu, se s nabídkou seznámí ze dvou stran. Buď přijde do školy — to je den otevřených dveří, který pořádá škola sama a o kterém web píše z jejích novinek. Nebo přijde na jedno místo, kde se sejde padesát škol z kraje najednou. Tomu druhému se říká veletrh nebo přehlídka středních škol, pořádá ho kraj, hospodářská komora nebo výstaviště, a web o něm dosud nepsal vůbec.

Tenhle dokument navrhuje, jak to napravit: přehled akcí s vyhledáváním podle kraje a města, **formulář, kterým nám pořadatelé nahlásí akce, o kterých nevíme**, oslovení pořadatelů se žádostí o vzájemný odkaz, a později upozornění na stránkách škol v tomtéž okrese.

Formulář je v tom výčtu zdánlivě nejmenší položka a přitom na něm stojí, jestli přehled za rok ještě bude platit. Ruční rešerše dala zhruba polovinu akcí, které existují, a příští sezónu by se musela dělat znovu celá. Nahlášení od pořadatele je jediný způsob, jak seznam roste sám.

## 1. Proč to na web patří

Pořadí důvodů je tu jiné, než by se čekalo, a stojí za to ho přiznat nahlas.

### 1.1 Hlavní důvod je odkazová autorita

[SEO audit z 20. 9. 2026](seo-audit-2026-09-20.md) změřil, že web nemá prakticky žádné nezávislé zpětné odkazy. Z 1 161 externích odkazů v Search Console je **1 095 (94,3 %) z vlastní preview domény `vercel.app`**. Skutečně cizích zdrojů je hrstka: GitHub (25), t.co (11), blogspot (3), jihoskop.cz (3). Reálných doporučujících webů je řádově deset.

Pořadatelé veletrhů jsou krajské úřady, hospodářské komory, magistrát hlavního města a výstaviště. To jsou tematicky přesně sedící domény s vysokou důvěryhodností. **Čtrnáct odkazů odtud by byl největší přírůstek odkazové autority v historii tohoto webu.**

Audit v oddílu 7 zároveň říká, co takové stránky musí splňovat: *„citovatelné metodické a datové stránky“*, a nedoporučuje nákup odkazů. To je hranice, kterou návrh respektuje — viz § 1.3.

### 1.2 Užitek pro rodinu je podmínka, ne ozdoba

Zadavatel řekl otevřeně, že užitek pro rodinu je tu druhotný. Návrh to přijímá s jednou výhradou, která není morální, ale provozní:

**Pořadatel dá odkaz jen na stránku, která jeho návštěvníkům k něčemu je.** Tiskový mluvčí kraje musí odkaz obhájit před vedením. Tenký seznam čtyřiceti řádků bez přidané hodnoty je přesně to, na co odkaz nedá — a pokud dá, vyhledávače mohou takovou vzájemnou výměnu číst jako málo významnou.

Užitek pro rodinu je tedy **provozní podmínka bodu 2**, ne konkurenční cíl. Proto stránka není holý seznam (§ 5).

### 1.3 Co rodina skutečně potřebuje, je jiná otázka, než jsem čekal

Zadavatel upozornil na věc, kterou původní verze návrhu minula: **na veletrhy vodí školy deviťáky hromadně, dělají na to výpravy.** Když to platí, rodič se o akci nedozvídá z webu — dozvídá se ji od třídní učitelky.

To mění, na co stránka odpovídá. Ne „kde je nějaká akce“, ale spíš:

- kdy se tam dostanu i já jako rodič, když dítě jede se školou ve všední den,
- co si tam mám zjistit, abych z toho něco měl,
- koho tam vlastně potkám.

**Kolik škol výpravy dělá, doloženo nemáme.** Je to domněnka zadavatele, ne měření, a návrh ji tak označuje. Kdyby se ukázalo, že výpravy jsou spíš výjimkou, hodnota stránky pro rodinu roste, ne klesá — takže rozhodnutí o tvaru stránky na tom nestojí.

### 1.4 Termíny jsou jinde nedohledatelné

Neexistuje jeden celostátní kalendář veletrhů SŠ. Jsou tři soukromé agregátory různé úplnosti, krajské weby a facebookové události. Rešerše k tomuto návrhu trvala hodiny a stejnou práci dnes musí odvést každý rodič zvlášť.

## 2. Zdroj

`docs/prijimacky-veletrhy-poradatele-2026.xlsx`, vlastní rešerše, list `Poradatele`, 25 řádků × 15 sloupců. Druhý list `Top8_tyden` je pracovní pořadník pro obesílání, ne datový zdroj.

Sloupec po sloupci je zapsán v [zdrojích dat](zdroje-dat.md), oddíl 2.15 — ten zápis vzniká ve stejné dávce jako tento návrh. Zde jen to, co určuje tvar řešení.

### 2.1 Zdroj je seznam pořadatelů, ne kalendář akcí

Toto je nejdůležitější vlastnost zdroje a určuje všechno ostatní. Jeden řádek je **organizace**, ne akce. Krajská hospodářská komora Střední Čechy je jeden řádek, ale v buňce `terminy_2026` stojí:

> 15. 10. Čelákovice; 22. 10. Nymburk; 4. 11. Rakovník; 12. 11. Mělník

To jsou čtyři akce ve čtyřech městech. Podobně VIM pro Jihomoravský kraj nese sedm akcí, Jihočeská hospodářská komora pět a Scholaris pro Olomoucký kraj pět. Stránka, která má umět „ukaž mi, co je u nás“, potřebuje zrnitost **jedna akce = jedno město + jeden termín**. Rozpad textových buněk je ruční práce a je součástí návrhu, ne jeho odkladem.

Po rozpadu vychází z 25 řádků zhruba **35 až 45 jednotlivých akcí**. Přesné číslo dá až rozpis.

### 2.2 Ověřenost pořadatele a ověřenost termínu jsou dvě různé věci

Sloupec `overeno` má `ano` u 14 řádků a `ne` u 11. Jenže znamená „ověřili jsme, že tuhle akci tato organizace pořádá“, ne „tohle datum platí“. Královéhradecká komora má `overeno = ano` a zároveň:

> 2026 TBD (2025: Trutnov 10.–11. 10.; Jičín 17.–18. 10.; …)

Termín pro rok 2026 tedy neznáme, známe loňský. Stejně je na tom zlínská komora u dvou ze tří měst své série. Data musí nést **dva oddělené příznaky**: ověřený pořadatel a potvrzený termín. Zobrazuje se jen akce, která má obojí.

To je přímý důsledek pravidla projektu, že údaj bez doloženého výpočtu se nezobrazuje. Loňský termín vydávaný za letošní je přesně ta chyba, kvůli které web přestal používat pole `dny_otevrenych_dveri` z InspIS (§ 4.1).

### 2.3 Čtyři řádky nejsou akce, ale katalogy

AtlasŠkolství.cz, stredniskoly.cz, Smartee a ASPŠ nejsou pořadatelé, ale weby, které veletrhy vypisují. Smartee jich vede kolem devadesáti. **Na veřejnou stránku nepůjdou** — jsou to konkurenční katalogy a odkazovat na ně znamená posílat rodinu jinam. V datech zůstávají jako zdroj pro dohledání dalších akcí a jako kontakt pro obesílání, s příznakem, který je ze zobrazení vyřazuje.

Vedlejší zjištění stojí za zaznamenání: Smartee vede ~90 akcí, náš seznam po rozpadu ~40. **Pokrytí tedy není úplné a nemá se tvrdit, že je.** Stránka o tom musí mluvit pravdivě — viz § 5.4.

### 2.4 Co ve zdroji chybí

Ani jeden řádek neuvádí, **které školy na akci vystavují**. To je zásadní pro bod 3 zadání (upozornění na stránce školy) a zdroj to neobsahuje. Rozbor v § 7.

Dále chybí u části řádků kontaktní osoba (10 z 25), e-mail (12) a telefon (12) — to se týká jen obesílání, ne stránky.

## 3. Vypořádání nepoužitých sloupců

Pravidlo projektu žádá projít [zdroje dat](zdroje-dat.md) celé včetně oddílu 3 a napsat, které nepoužité sloupce jsem zvážil a proč je nepoužiju. Oddíl 3 má 18 položek. Prošel jsem všechny; níže ty, u kterých úvaha nebyla triviální. Zbylých jedenáct (maturitní výsledky, vstupní úroveň 2017–2023, profil dovedností, výsledky po termínech, oficiální min/max přijatých, přijatí podle priority, výsledky všech uchazečů, agregáty a data 2. kola, `jpz_prumer_actual`, `support_services`, `absence`, důvod nepřijetí, platnost oboru) se týká výsledků přijímacího řízení a jednotlivých oborů; veletrh je akce v kalendáři a žádný z nich s ním nesouvisí ani vzdáleně.

| Nepoužitý sloupec | Kde | Zvážil jsem | Rozhodnutí |
|---|---|---|---|
| `dny_otevrenych_dveri` | InspIS, § 2.8 | Zda veletrhy nespojit s DOD do jednoho přehledu akcí | **Ne.** 71 % hodnot nese rok 2024 a starší, pole je volný text a web ho od 19. 9. 2026 nepoužívá ani k předvyplnění formuláře. Spojit ověřený seznam s polem této kvality by shodilo důvěryhodnost obojího. Podrobně § 4.1. |
| `Email 1`, `Telefon` | rejstřík MŠMT CSV, položka 12 | Zda smí být kontakt na webu, když je u pořadatele veletrhu potřeba | **Rozlišit entitu.** Zamítnutí v oddílu 3 se týká kontaktu na **školu** — rodina má psát škole přes její web, ne přes údaj z rejstříku. Pořadatel veletrhu je jiná entita: je to organizátor veřejné akce a jeho kontakt je běžně na jeho vlastním webu. Přesto **na stránku dáme jen odkaz na web pořadatele**, ne e-mail a telefon. E-maily z xlsx slouží obesílání (bod 2 zadání), ne zobrazení. |
| `reditel` | rejstřík, položka 18 | Zda u pořadatele uvádět jméno kontaktní osoby | **Ne**, ze stejného důvodu, pro který je zamítnut u školy: sporná vypovídací hodnota a zbytečný osobní údaj na veřejné stránce. Jména z xlsx zůstávají v neveřejných datech pro obesílání. |
| `for_parents.questions_for_open_day[]` | extrakce inspekčních zpráv, § 2.7 | Použít otázky „na co se zeptat na dni otevřených dveří“ i u veletrhu | **Zvažuji, ale ne v první dávce.** Otázky jsou vázané na konkrétní školu a její inspekční zprávu; veletrh je akce s padesáti školami. Dávalo by smysl až v bodu 3 zadání, kde se veletrh objeví na stránce konkrétní školy. Zapsáno jako otevřená otázka, ne jako zamítnutí. |
| `dobihajiciObor` | rejstřík, položka 11 | Zda vyřazovat školy s dobíhajícím oborem z upozornění | **Nepoužitelné zde.** Týká se nabídky oborů, ne akcí. Navíc 0 z 3 091 nabídek 2026 je dobíhající. |

Dvě pasti z oddílu 4 platí i tady:

**Chybějící údaj není nula** (past 4). Kraj, u kterého v seznamu není žádná akce, není kraj bez veletrhů — je to kraj, kde jsme žádný nedohledali. Stránka to musí říct těmito slovy, ne mlčet.

**Malé počty** (past 6, analogie). Karlovarský kraj má v seznamu jednu položku a ta je nepotvrzená. Kraj s jedinou akcí se nemá prezentovat jako přehled kraje.

## 4. Vymezení proti tomu, co už web umí

### 4.1 Proti poli `dny_otevrenych_dveri` z InspIS

Web toto pole má a nepoužívá ho jako termín. Měření z 20. 9. 2026: vyplněno u 998 z 1 180 škol, ale **704 z nich (71 %) nese ročník 2024 a starší nebo žádný letopočet**. Od 19. 9. 2026 se jím nepředvyplňuje ani formulář portálu.

Seznam veletrhů je kvalitativně jiný: vznikl ruční rešerší, u každé akce je doložený zdroj a datum ověření. **U veletrhu datum tvrdíme.** Proto smí být na stránce jako termín — ale právě proto musí být příznak potvrzenosti tvrdý (§ 2.2) a nepotvrzené akce se nezobrazují.

### 4.2 Proti termínům z článků škol

Web od 21. 9. 2026 píše na kartě novinky termíny akcí přečtené z článku školy. Slovník ukazatelů to vede jako **termín akce ze zprávy školy** a klíčová věta u něj zní: *„Neříká, že termín ověřil někdo jiný než škola.“* Karta nese průvodní větu „Termíny jsme přečetli z článku školy… Pořadatelem je škola, ne tento web.“

Rozdíl proti veletrhu je v tom, kdo za údaj ručí:

| | Termín akce ze zprávy školy | Termín veletrhu |
|---|---|---|
| Kdo pořádá | škola | třetí strana (kraj, komora, výstaviště) |
| Odkud údaj je | vyluštěn modelem z článku | ručně dohledán z webu pořadatele |
| Co tvrdíme | že to tak napsala škola | že se akce koná v tento den |
| Pokrytí | 48 % pozvánek uvede termín | 100 % zobrazených (ostatní se nezobrazí) |

Jsou to dva různé ukazatele a **nesmějí se slévat do jednoho seznamu**. Na stránce školy (bod 3 zadání) budou stát vedle sebe jako dva bloky s jinou značkou původu.

### 4.3 Proti taxonomii tříd zprávy

Klasifikace novinek zná dvanáct tříd (`dod`, `prijimacky_nanecisto`, `setkani_uchazecu`, `pripravny_kurz`, `talentove_zkousky`, `nahradni_termin` a dalších šest). **Veletrh ani přehlídka mezi nimi nejsou.**

Návrh **novou třídu nezavádí**. Důvod: klasifikace čte weby škol a škola o veletrhu píše jako účastník („přijďte za námi na Scholu Pragensis“), ne jako pořadatel. Zpráva tohoto typu patří nejblíž k `setkani_uchazecu`. Zavést třídu `veletrh` by znamenalo, že model bude rozhodovat o akci, jejíž termín už máme ověřený z lepšího zdroje. Kdyby se později ukázalo, že školy o veletrzích píšou často a nesou přitom údaj, který jinde nemáme, rozhodnutí se přehodnotí — novým měřením, ne dojmem.

## 5. Stránka

### 5.1 Adresa a tvar

`/veletrhy` — jedna stránka, statická, generovaná při buildu. Bez podstránek pro kraj a město v první dávce; filtrování je klientské nad úplným seznamem. Důvod: ~40 akcí je málo na to, aby se dělily do 14 krajských URL, a sezóna trvá tři měsíce, takže by SEO hodnota podstránek stejně nestihla vzniknout.

### 5.2 Co na stránce je

**Nahoře jedna věta o tom, co veletrh je**, protože pojem se musí vysvětlit při prvním výskytu v bloku.

**Osou stránky je kraj, ne datum** (od 23. 9. 2026, verze 1.0). Rodina se ptá „co je blízko nás“ a až potom „kdy“. Data to podpírají: 41 akcí ve 14 krajích, v kraji 1–7 akcí, **38 z 39 měst má jedinou akci** (Pardubice dvě, jedna akce je online). Chronologický seznam se čtyřiceti kartami, kde je město až na druhém řádku, nutil číst všech čtyřicet; rozbalovací seznam měst se 40 položkami vedl vždy na jednu kartu.

**Čipy krajů s počty nahoře** („Jihočeský 6“, „Praha 1“) místo rozbalovacích seznamů: pokrytí je vidět bez kliknutí. Čip je zároveň filtr a výběr se propisuje do adresy (`#jihocesky`), takže ho reload i sdílený odkaz zachovají; kotva při načtení kraj předvybere a po překreslení posune na oddíl. Změna adresy za běhu se sleduje přes `hashchange` i `navigation.currententrychange` (Next při odkazu na tutéž stránku jen s jinou kotvou volá `pushState` bez `hashchange`); vlastní zápis čipem se pozná a stránkou nehýbe — klik na čip nesmí odsunout čipy z obrazovky; opakovaný `replaceState` s nezměněnou adresou (Next ho volá po každé změně stavu routeru) se ignoruje. Známé omezení: v prohlížeči bez Navigation API (starší Firefox) odkaz Next na `/veletrhy` bez kotvy z vyfiltrované stránky výběr nezruší, dokud čtenář stránku neobnoví. Kotva na kraj, kterému akce už proběhly, ukáže „teď o žádné akci nevíme“ s odkazem na stránku kraje — proto seznam dostává všech čtrnáct krajů, ne jen ty s akcí. Odkaz sem ze stránky kraje zatím nikde nevede; kotva je připravená, odkaz je samostatná změna stránky kraje. Filtr měst neexistuje.

**Oddíl na kraj** s nadpisem a počtem („Jihočeský kraj“ a vedle šedě „6 akcí“), pod ním řádek měst v pořadí konání (jen kde je víc než jedna akce), pak karty. Kraje abecedně podle krátkého názvu — pokrytí vyprávějí čísla v čipech, ne pořadí; Praha by při řazení podle počtu skončila poslední. Čip nese krátký název („Praha“, „Vysočina“), nadpis oddílu plný („Hlavní město Praha“, „Kraj Vysočina“); pořadí čipů a oddílů je totéž, takže Kraj Vysočina stojí pod V, ne pod K. Série bez rozepsaných měst nese v řádku měst i na kartě výčet z pole `misto`; bez něj „místo upřesní pořadatel“.

**Karta:** datum jako dlaždice vlevo (den a měsíc, `~` u přibližného termínu), **město verzálkami jako první řádka**, název akce, plné datum s časem a místem konání, výstrahy k termínu, „Pořádá *organizace*“ a odkaz na stránku akce. Dovětek „ne tento web“ z každé karty zmizel rozhodnutím zadavatele 23. 9. 2026 — jméno pořadatele říká totéž.

**Řazení uvnitř kraje podle data vzestupně.** Akce, která už proběhla, ze seznamu mizí — stejné pravidlo, jaké platí pro novinky škol: platnost se počítá při čtení stránky, ne při sestavení dat. Kraj, kterému po půlnoci nezbyla žádná akce, z čipů zmizí; už zvolený zůstane viditelný jako „(bez aktuálních akcí)“.

**Výhrada neúplnosti u každého kraje** („Víme jen o těchto 6 akcích s potvrzeným termínem. Chybí vám nějaká? Nahlaste nám ji — před zveřejněním ji ověříme na stránce pořadatele.“; věta doslova ze slovníku pojmů u pojmu *nahlásit akci*, protože každý oddíl je blok; „s potvrzeným termínem“ říká množinu, ze které se číslo počítá), ne jen jednou dole: rodič, který právě zjistil, že jeho město chybí, je ten, kdo akci nahlásí.

Zamítnuto: přepínač „podle kraje / podle data“ (dvě zobrazení, dvojí testování, rozhodnutí přesunuté na čtenáře) a mapa jako hlavní ovládání (na mobilu 14 krajů neklikatelně malých; jako doplněk nad čipy možná později).

**Dole poctivá věta o pokrytí** (§ 5.4).

### 5.3 Co na stránce není

Není tam **počet vystavujících škol** — nemáme ho (§ 2.4).

Nejsou tam **kontaktní osoby, e-maily a telefony pořadatelů** (§ 3).

Není tam **odkaz na konkurenční katalogy** (§ 2.3).

Není tam **žádné hodnocení nebo řazení akcí podle důležitosti**. Sloupec `priorita` v xlsx je pracovní pořadník pro obesílání — vyjadřuje, koho oslovit dřív, ne která akce je pro rodinu lepší. Na web nepatří a nesmí se splést s řazením.

### 5.4 Věta o pokrytí

Stránka nesmí tvrdit, že je přehled úplný, protože není (§ 2.3: Smartee vede ~90 akcí, my ~40). Navrhovaná formulace:

> Přehled vznikl vlastní rešerší a úplný není. Když akci ve svém okolí nevidíte, neznamená to, že se nekoná — znamená to, že jsme ji nedohledali. **Víte o akci, která tu chybí? Nahlaste nám ji.**

Druhá věta je přímé použití pasti „chybějící údaj není nula“. Třetí věta vede na formulář a je to sběrný kanál, který seznam doplní zadarmo — viz § 5.5.

### 5.5 Formulář pro nahlášení akce

**Tohle je klíčová část stránky, ne její doplněk.** Ruční rešerše dala ~40 akcí z odhadovaných ~90. Rozdíl nedožene další rešerše — dožene ho ten, kdo o akci ví. Formulář je zároveň jediná část návrhu, která seznam udržuje živý i v příští sezóně bez naší práce.

**Hlásit může kdokoli.** Pořadatel, výchovná poradkyně, rodič, který akci viděl na plakátě. Nahlášení nevyžaduje účet ani prokázání totožnosti — jediné, co se ověřuje, je akce sama, ne ten, kdo ji nahlásil. Důvod: pořadatelů je čtrnáct a obešleme je sami, ale lidí, kteří o nějaké akci vědí, jsou tisíce.

**Umístění.** Na stránce `/veletrhy` dvakrát: odkaz ve větě o pokrytí (§ 5.4) a samostatný blok na konci seznamu. Samostatná adresa `/veletrhy/nahlasit`, aby se dala poslat v e-mailu pořadatelům (§ 8) a aby na ni šlo odkázat z dopisu.

**Pole.** Podle zadání, s odůvodněním u každého:

| Pole | Povinné | Proč |
|---|---|---|
| Název akce | ano | bez něj nejde akci pojmenovat v seznamu |
| Termín — od, do | ano | `end` jen u vícedenních; bez data se akce nezobrazí (§ 2.2) |
| Adresa konání | ano | místo v textu („Kongresové centrum Zlín, náměstí…“); z něj se odvodí město |
| Město | ano | první řádka karty a řádek měst pod nadpisem kraje (§ 5.2; filtr měst od 1.0 neexistuje); **volný zápis povolen** (§ 6.2 — obce pod prahem) |
| Kraj | ano | rozbalovací seznam čtrnácti, žádný volný zápis |
| Popis akce | ne | pár vět pro čtenáře; **na stránce se nezobrazí doslova** — viz níže |
| URL stránky akce | ano | bez odkazu nelze údaj ověřit a rodina nemá kam jít pro podrobnosti |
| Pořadatel — název organizace | ano | kdo za akci ručí (§ 10) |
| Kontaktní e-mail | ano | pro zpětný dotaz a pro nabídku partnerství; **nezveřejňuje se** (§ 3) |
| Skryté pole `website` | — | honeypot proti robotům, vzor `/api/bug-report` |

**Nahlášení není zveřejnění.** Tohle je nejdůležitější pravidlo celého formuláře a platí i pro hlášení od samotného pořadatele. Cokoli přijde, jde do fronty ke kontrole; na web se dostane teprve poté, co **Eda** ověří, že akce existuje a termín sedí — tedy získá `terminPotvrzen: true` a `zdrojOvereni`. Důvod je v § 4.1: web nepoužívá pole `dny_otevrenych_dveri` z InspIS právě proto, že je to nekontrolovaný volný text. Přijímat nekontrolovaný volný text vlastním formulářem a rovnou ho publikovat by byla tatáž chyba, jen spáchaná vlastní rukou.

Proto se ani **popis akce nezobrazuje doslova**. Slouží tomu, kdo nahlášení zpracovává. Na stránce stojí jednotný tvar záznamu (§ 6.2), ne cizí marketingový text — jinak by se z přehledu stala nástěnka a řádky by přestaly být porovnatelné.

**Technicky.** `POST /api/veletrhy/nahlasit`, vzorem je `/api/bug-report`: honeypot, rate limit 3 požadavky za 15 minut na IP i e-mail, detekce spamu podle klíčových slov, zápis do databáze. Odpověď je neutrální a vždy stejná, jako u přihlášení k odběru — formulář nesmí prozradit, jestli akci už v seznamu máme.

Doručení ke zpracování: **e-mail Edovi plus záznam v databázi.** Adresa je v proměnné `VELETRHY_PRIJEMCE`; od 23. 9. 2026 je nastavená na eda@prijimackynaskolu.cz a ověřená zkušebním nahlášením na produkci (výchozí hodnota v kódu, redakce@, se tím nepoužívá). E-mail nese všechna vyplněná pole, aby šlo ověřit rovnou z pošty; záznam v databázi je pojistka, aby nahlášení nezapadlo, když se mail ztratí. Administrace se nestaví (§ 8.4).

Zpracovat je potřeba rychle: sezóna trvá tři měsíce a akce nahlášená týden před konáním má cenu jen tehdy, když se zveřejní do dvou dnů.

**Potvrzení odesílateli.** Jedna věta o tom, že nahlášení přišlo a že akci před zveřejněním ověříme. Nesmí znít jako příslib zveřejnění.

### 5.6 Odkaz do katalogu škol v kraji

U každé akce odkaz „střední školy v tomto kraji“ do našeho katalogu. Využívá to, co web už má, a dělá ze stránky rozcestník místo seznamu.

Pro bod 2 je to podstatné ze dvou stran. Pořadatel vidí, že odkaz nevede do prázdna, ale k něčemu, co jeho návštěvníkům pomůže dál. A [SEO audit](seo-audit-2026-09-20.md) v P2 si stěžuje, že mezi nejsilnějšími cíli interních odkazů jsou `/issues` a `/changelog`, zatímco města v nejvyšším výpisu nejsou — tohle míří přesně tam, kam audit chce.

### 5.7 Co si na veletrhu zjistit

Krátký metodický blok. Audit v oddílu 7 výslovně píše, že smysl mají *„citovatelné metodické a datové stránky“* — tohle je přesně ten typ obsahu, kvůli kterému někdo odkaz dá.

**Obsah bloku je obecný návod**, ne otázky ke konkrétní škole. Důvod: web má z inspekčních zpráv otázky na den otevřených dveří u **922 škol** (`for_parents.questions_for_open_day`), ale každá sada platí jen pro tu jednu školu, jejíž zpráva ji vyvolala. Otázka „jak škola podporuje nadané žáky“ vznikla z konkrétního zjištění konkrétní inspekce. Na stránku veletrhu, kde je padesát škol, se přenést nedá.

Blok proto obsahuje obecný návod (co se ptát každé školy, jak si odpovědi zapsat, jak je potom porovnat) a končí větou, která vede do katalogu:

> V katalogu škol najdete také otázky vycházející ze zpracovaných inspekčních zpráv.

Tím se metodický blok opírá o data, která máme, a zároveň posílá čtenáře do katalogu (§ 5.6), aniž by cokoli tvrdil nepravdivě.

**Není to nový ukazatel.** Obecný návod je text, ne měřená veličina, a do slovníku ukazatelů nepatří. Kdyby se později generovala nejčastější témata otázek po krajích, to už by ukazatel byl a chtělo by to zápis, doložený výpočet a ověření, že agregace nelže.

### 5.8 Kalendářový export

Odběr akcí do Google nebo Apple kalendáře, soubor `.ics`. Projekt to už umí u harmonogramu přijímaček (`scripts/generate-admissions-calendar.py` → `public/prijimacky-2027.ics`), takže se použije tentýž vzor: celodenní události, `end` v datech včetně dne, UID odvozené od `id` akce.

Dvě podoby: celý přehled a filtr podle kraje. Pro rodiče, jehož dítě jede se školou, je to přesně ta odpověď na otázku „kdy tam mám jít i já“ z § 1.3.

## 6. Data

### 6.1 Kde

`src/data/veletrhy-2027.json`, statický import ve stránce. Vzorem je `src/data/admissions-2027.json` (harmonogram MŠMT): ruční, malý, termínový, jednou ročně. Při ~40 položkách nedává smysl JSON v `public/` a lib modul s cache.

Sezóna se v názvu souboru značí `2027`, protože akce sezóny podzim 2026 slouží uchazečům, kteří se hlásí v roce 2027. Stejná konvence jako u harmonogramu.

### 6.2 Tvar

```jsonc
{
  "checkedAt": "2026-09-22",
  "sezona": "2027",
  "akce": [
    {
      "id": "prehlidka-vysocina-jihlava",
      "nazev": "Přehlídka středních škol Vysočina",
      "poradatel": "DKO Jihlava s.r.o.",
      "typPoradatele": "jine",
      "mesto": "Jihlava",
      "krajKod": "CZ063",
      "misto": "DKO Jihlava, Tolstého 2",
      "start": "2026-11-13",
      "end": "2026-11-13",
      "datum": "13. listopadu 2026",
      "terminPotvrzen": true,
      "url": "https://www.dko.cz/program/679-prehlidka-strednich-skol",
      "zdrojOvereni": "dko.cz",
      "overeno": "2026-09-22"
    }
  ],
  "katalogy": [ /* nezobrazuje se, jen pro dohledávání dalších akcí */ ]
}
```

Poznámky k polím:

- `krajKod` je NUTS (`CZ063`), ne název. Projekt má dva tvary názvu kraje — krátký v `src/lib/kraje.mjs` (`Vysočina`) a dlouhý v `src/lib/mesta.mjs` (`Kraj Vysočina`). Kód je jediný, který se neplete.
- `mesto` je prostý název, **nesmí být vázané na seznam `MESTA`**. Ten má práh tří škol a veletrh se koná i v obcích pod prahem (Kaplice, Boskovice). Vazba by akce tiše zahodila.
- `datum` je český text pro čtenáře, `start`/`end` strojové ISO pro řazení a filtrování. `end` inkluzivní. Stejná dvojice jako v harmonogramu.
- `terminPotvrzen: false` znamená, že akci známe, ale datum 2026 ne. **Taková se nezobrazuje** (§ 2.2), zůstává v datech jako úkol k doplnění.
- Online akce (Moravskoslezský pakt) má `mesto: null` a příznak `online: true`.

### 6.3 Fronta nahlášených akcí

Nahlášení z formuláře (§ 5.5) nejdou do `src/data/veletrhy-2027.json` — ten je ruční a ověřený. Jdou do databáze, tabulka `veletrh_nahlaseni`, se stavem `nove | overeno | zamitnuto | duplicita`. Vzorem je zpracování hlášení chyb.

Po ověření se záznam **přepíše ručně** do JSON se `zdrojOvereni` a datem ověření. Automatický přepis z fronty do zobrazovaných dat není v návrhu záměrně: mezi nahlášením a zveřejněním musí stát člověk, který ověřil termín (§ 5.5). Tím člověkem je Eda (§ 8.4).

Zamítnutá nahlášení se nemažou. Když tentýž pořadatel nahlásí akci podruhé, je potřeba vidět, že se to už jednou řešilo.

**Doba držení a kdo ji hlídá.** [Stránka ochrany osobních údajů](../src/app/ochrana-osobnich-udaju/page.tsx) slibuje smazání adresy oznamovatele 12 měsíců od konce sezóny. Zatím to nikdo neprovádí automaticky — je to **úkol pro Edu jednou ročně po skončení sezóny**, spolu s přípravou nového ročníku dat (§ 6.4, `obnovit_nejpozdeji` 15. 9.). Dokud běží pilotní provoz s jednotkami nahlášení, stačí ruční `update veletrh_nahlaseni set email = null where vytvoreno < now() - interval '12 months'`. Až jich bude víc, patří to do pravidelné úlohy; slib na stránce platí od začátku, takže odklad se týká způsobu, ne lhůty.

### 6.4 Registr stavu datových sad

Nová sada `veletrhy-skol` do `public/stav_datovych_sad.json` s deseti povinnými poli, vzorem je `msmt-harmonogram`: `cyklus: "rocni"`, `pouziti: "web"`, `automatizace: "rucni"`, `ocekavano.jistota: "odhad"` se zdůvodněním, `obnovit_nejpozdeji` na srpen 2027 (sezóna začíná koncem září, seznam musí stát dřív).

`ukazatele: ["Počet akcí v kraji"]` — do verze 0.9 stránka nezobrazovala žádné počítané číslo, jen opisovala termíny. Od 1.0 nese čipy krajů a nadpisy oddílů s počty; to je ukazatel a má zápis ve [slovníku ukazatelů](slovnik-ukazatelu.md) (oddíl Veletrhy), včetně toho, co neříká.

**Rok se nikde nepíše napevno.** Stránka porovná sezónu souboru s obdobím v registru (`overSezonuProtiRegistru`); když se rozejdou, seznam se nezobrazí vůbec. Loňské akce vydávané za letošní jsou horší než prázdná stránka.

Import souboru je pevný záměrně: soubor je jediný a nese rok v názvu, takže nový ročník znamená novou dávku, ne přepnutí za běhu. Registr tedy neurčuje, **který** soubor se čte, ale **jestli** je ten načtený ještě platný.

## 7. Bod 3 zadání: upozornění na stránkách škol

Zadání počítá s tím, že se veletrh později objeví na stránce školy a oboru v témže městě či okrese. Návrh to **odkládá do druhé dávky** a tady zapisuje, proč a co k tomu chybí.

Problém je v tom, co znamená „veletrh v tomto regionu“. Nabízejí se tři výklady a každý lže trochu jinak:

**Podle okresu školy.** Snadné, data jsou. Ale krajská přehlídka v Jihlavě se týká i školy z Havlíčkova Brodu, která na ni jede vystavovat — a ta by upozornění nedostala.

**Podle kraje pořadatele.** Zachytí krajské přehlídky správně, ale u Prahy a Brna by školám vnutilo akci na druhém konci kraje.

**Podle toho, kdo na akci vystavuje.** Jediný výklad, který neháže — a **data k němu nemáme** (§ 2.4). Seznamy vystavovatelů pořadatelé zveřejňují nestejně, část až týden před akcí, část vůbec.

Rozhodnutí: nejprve postavit stránku a obeslat pořadatele. **Seznam vystavovatelů je věc, kterou lze od pořadatele získat jako součást mediálního partnerství** — a pak upozornění stojí na doloženém „tato škola tam bude“, ne na odhadu podle vzdálenosti. Tím se bod 2 a bod 3 spojují: obesílání není jen o odkazech, je to i cesta k datům, která jinak nejsou.

Do té doby by upozornění muselo znít „ve vašem kraji se koná“, ne „vaše škola se účastní“ — a to je slabší tvrzení, než jaké stojí za vyrušení čtenáře.

## 8. Bod 2 zadání: oslovení pořadatelů

Tohle je hlavní důvod celého záměru (§ 1.1). Znění dopisu není součástí návrhu, rámec ano.

### 8.1 Co nabízíme a co chceme

**Nabídka je výměna odkazů.** Pořadatel dá na svůj web odkaz na náš přehled, web ho vede jako online mediálního partnera akce. Ani jedna strana neplatí. **Větší plnění se zatím nenabízí** — rozhodnutí zadavatele; dohoda má být tak jednoduchá, aby ji druhá strana mohla přijmout bez porady s právníkem.

~~Ke straně plnění patří **zmínka v pravidelném souhrnu novinek**.~~ **Neplatí pro sezónu 2026 (zjištěno 23. 9. 2026):** odběr nerozesílá pravidelný souhrn, zprávy jsou vázané na termíny přijímacího řízení a nejbližší odejde 7. 12. 2026, tedy po skončení skoro všech veletrhů. V dopise se proto neslibuje; pro příští sezónu by to chtělo zprávu načasovanou na září. Původní úvaha: Ne samostatná rozesílka: odběratelé se přihlásili k termínům přijímaček, ne k pozvánkám na akce třetích stran. Odstavec „akce ve vašem kraji“ v řádném vydání je obsah, který k tomu, k čemu se přihlásili, patří. Samostatný e-mail před každou akcí by byl jiný obsah, než na jaký lidé kývli, a návrh ho nedoporučuje.

**Co chceme zpátky nad rámec odkazu**, a co stojí za to v dopise zmínit jako prosbu, ne podmínku:

- **seznam vystavujících škol** — bez něj nejde bod 3 zadání (§ 7),
- **potvrzení termínu** u akcí, kde ho nemáme (§ 2.2, jedenáct řádků),
- **odkaz na formulář** pro nahlášení dalších akcí, které pořadatel pořádá (§ 5.5).

### 8.2 Výměna je nerovná a dopis to musí unést

Slepé místo, které si zaslouží pojmenovat: **my dáme odkaz na akci, která se koná jeden den v roce; oni dají odkaz na web, který jim odvádí návštěvníky pryč.** Z jejich pohledu je to horší obchod než z našeho.

Dopis proto nemá mluvit o „výměně odkazů“ jako o samozřejmosti. Má nabídnout to, co pořadatel skutečně potřebuje a co my máme:

- **návštěvníky v době, kdy se rozhodují.** Přehled otevírá rodina, která zrovna vybírá školu. Krajská akce má problém s dosahem mimo vlastní kanály.
- **kontext.** Akce stojí v přehledu vedle ostatních v kraji, s odkazem na katalog škol (§ 5.6). Pro rodinu, která o akci nevěděla, je to první kontakt.
- **měřitelnost.** Web může pořadateli říct, kolik lidí z přehledu odešlo na jeho stránku — pokud se rozhodne prokliky měřit (§ 11).

### 8.3 Tvar odkazu necháváme na pořadateli

Nabídnou se obě možnosti a pořadatel si vybere, co se mu hodí do stránky: odkaz na přehled `/veletrhy`, nebo na přehled škol v jeho kraji.

Z hlediska odkazové autority je druhá varianta lepší — odkazy se rozloží do víc adres místo do jedné, což vypadá přirozeněji než čtrnáct odkazů mířících na tutéž URL. Vnucovat ji ale nemá smysl: pořadatel, který na své stránce o akci chce odkázat „kde najdete další informace o přijímačkách“, si vybere sám a dohoda je rychlejší.

### 8.4 Provoz

**Dopis podepisuje Patrick Zandl a odchází z adresy eda@prijimackynaskolu.cz**; odpovědi vyřizuje Eduarda, což dopis přiznává, a co má řešit člověk, jde na patrick@zandl.cz (rozhodnutí 23. 9. 2026, vzor pozvánky do pilotu portálu). **Nahlášení z formuláře kontroluje Eda průběžně, po celý rok** — přijdou mu do schránky, ověří termín na webu pořadatele a ověřená data se zapíšou do souboru.

Z toho plyne rozhodnutí pro implementaci: **administrace fronty se nestaví.** Stačí doručení e-mailem plus záznam v databázi, aby nic nezapadlo. Kdyby nahlášení přibývalo tolik, že se v poště ztrácejí, je čas administraci postavit — ne dřív.

### 8.5 Kontakty na pořadatele

Dohledány 22. 9. 2026 do `data/veletrhy/poradatele-kontakty.json`: **9 organizací, 15 osob**, u devíti z nich je označeno, koho oslovit. IČO ověřena proti ARESu.

**Soubor je v `.gitignore` a na web se nedostane.** Jsou v něm jména, služební e-maily a mobily konkrétních lidí; [zdroje dat](zdroje-dat.md) je vedou mezi údaji, které na web nepatří. Stránka veletrhu ukazuje jen název pořadatele a odkaz na jeho web.

Dvě poznámky k obesílání, které z rešerše plynou:

- **U Plzně je správná osoba jiná, než by se čekalo.** Odkaz na web umístí Barbora Kreislová (správa webu festivalu), zatímco o partnerství rozhoduje Radana Šedivá (produkce). Stojí za to psát oběma.
- **Dvě organizace se oslovují i kvůli termínu.** Služba škole Pardubice a KHK Pardubického kraje mají akce zveřejněné jen se značkou „neověřeno u pořadatele" (§ 2.2); potvrzení termínu je první, oč je požádat.

U OHK Most a KHK Pardubického kraje se konkrétní osobu odpovědnou za akci nepodařilo doložit; obesílá se obecný kontakt.

### 8.6 Rozesláno 23. 9. 2026

**22 dopisů na 51 adres, 21 pořadatelů**, skriptem `scripts/veletrhy-posli-dopisy.mjs` z eda@prijimackynaskolu.cz, podepsáno Patrickem Zandlem (text v [podkladech](podklady/dopis-poradatelum-veletrhu.md)). Každá organizace dostala jeden dopis adresovaný všem relevantním kontaktům; seznam a evidence odeslání jsou v gitignorovaném `data/veletrhy/`.

Doručeno 21 z 22. Dopis SŠP Olomouc se odrazil: adresa převzatá ze zdrojového sešitu neexistuje (550 5.1.1). Adresa ředitele školy, dohledaná na stránce vedení školy, byla v témže dopise; Resend neuvádí, kterému adresátovi se dopis nedoručil. Adresa ředitele VIM se dohledala na webu VIM (článek o kampani Těžká hlava). Konkrétní adresy a jména jsou jen v gitignorovaném `data/veletrhy/obesilani.json` — repozitář je veřejný a kontakty na osoby do něj nepatří (oddíl 3 zdrojů dat).

### 8.7 Pořadí obesílání

Je v listu `Top8_tyden` ve zdrojovém xlsx. Nejbližší akce je **Příbram 30. 9. 2026**, tedy za osm dní. U té už má odkaz smysl jen krátce, ale vztah s MAS Podbrdsko vydrží do příští sezóny.

Dopis podepisuje Patrick Zandl a odchází z adresy eda@prijimackynaskolu.cz; text je v [podkladech](podklady/dopis-poradatelum-veletrhu.md). Původní záměr poslat ho jménem Eduardy by šel proti pravidlu projektu, že nabídku ven podepisuje člověk.

## 9. Co je potřeba udělat

Pořadí odpovídá tomu, jak na sebe věci navazují.

**Dávka 1 — data a stránka**

1. Rozepsat xlsx na jednotlivé akce do `src/data/veletrhy-2027.json`, s příznakem `terminPotvrzen` u každé.
2. Zapsat zdroj do [zdrojů dat](zdroje-dat.md): řádek do oddílu 1, nový oddíl 2.15 se všemi sloupci včetně nepoužitých, nepoužité s hodnotou do oddílu 3, řádek do historie.
3. Zapsat sadu `veletrhy-skol` do registru, spustit `kontrola` a `tabulka`.
4. Zapsat nové pojmy do [slovníku pojmů](slovnik-pojmu.md), oddíl 4 (§ 10).
5. Postavit `/veletrhy` s filtrem podle kraje a města, s odkazem do katalogu škol v kraji (§ 5.6) a metodickým blokem (§ 5.7).
6. **Postavit formulář `/veletrhy/nahlasit` a `POST /api/veletrhy/nahlasit`**, doručení e-mailem plus záznam v databázi (§ 5.5, § 6.3, § 8.4).
7. Kalendářový export `.ics` podle vzoru harmonogramu (§ 5.8).
8. Přidat obě cesty do sitemapy a regenerovat `public/sitemap.xml`.
9. Test: akce s nepotvrzeným termínem se nezobrazí; proběhlá akce se nezobrazí; **nahlášená akce se sama nezveřejní**. (Test na obec mimo seznam `MESTA` odešel s filtrem měst ve verzi 1.0; `mesto` zůstává prostý název bez vazby na `MESTA`.)

Body 5 a 6 jdou ruku v ruce. Stránka bez formuláře je jednorázový seznam, který za rok zastará; formulář bez stránky nemá kam odkázat.

**Dávka 2 — obesílání**

10. Rozpracovat znění dopisu podle § 8.2, **s odkazem na formulář** — pořadatel jím doplní vlastní akce bez naší práce.
11. Doplnit chybějící kontakty u jedenácti řádků.
12. Obeslat podle pořadníku, začít Příbramí.
13. Doplnit odstavec „akce ve vašem kraji“ do pravidelného souhrnu novinek (§ 8.1).

**Dávka 3 — školy a obory**

14. Až budou seznamy vystavovatelů, upozornění na stránce školy.

## 10. Nové pojmy k zápisu do slovníku

Zapíšou se ve stejné dávce, ve které se poprvé objeví na stránce. Sloupec „Nepoužívat“ je povinný.

| Pojem | Význam | Vysvětlení při prvním výskytu | Nepoužívat |
|---|---|---|---|
| **veletrh středních škol** | akce, na které se na jednom místě představí víc středních škol najednou | „veletrh středních škol, tedy akce, kde se na jednom místě představí školy z kraje najednou“ | burza škol, výstava škol, akce pro veřejnost, veletrh práce, Schola / Gaudeamus jako obecné označení |
| **pořadatel veletrhu** | organizace, která akci pořádá — kraj, hospodářská komora, výstaviště nebo město; není to škola ani tento web | „Pořádá *organizace*“ (od 23. 9. 2026; dovětek „ne tento web“ vypuštěn, jméno pořadatele říká totéž) | organizátor (kolísá s pořadatelem), partner akce |
| **online mediální partner** | role tohoto webu u akce, ke které máme dohodu o vzájemném odkazu | „web je online mediálním partnerem akce, tedy má s pořadatelem dohodu o vzájemném odkazu“ | partner (samotné), spolupořadatel, sponzor |
| **nahlásit akci** | poslat nám formulářem údaje o akci, která v přehledu chybí; nahlášení není zveřejnění | „akci před zveřejněním ověříme na stránce pořadatele“ | přidat akci, zveřejnit akci, vložit akci (všechno tvrdí, že to zveřejníme) |

Vysvětlení u pojmu **pořadatel veletrhu** řeší napětí, které slovník zatím nemá ošetřené: u dne otevřených dveří platí „pořadatelem je škola, ne tento web“, protože jiná možnost nebyla. U veletrhu jsou strany tři a věta musí říct, která z nich ručí — a stačí k tomu jméno pořadatele. Dovětek „ne tento web“ na každé z 41 karet byl šum; rozhodnutí zadavatele 23. 9. 2026, slovník pojmů 1.22.

Zakázané slovní spojení **„škola pořádá“** (oddíl 5 slovníku) se veletrhu netýká — škola veletrh nepořádá, jen na něj jede. O účasti školy se ale bez seznamu vystavovatelů nepíše vůbec (§ 7).

## 11. Otevřené otázky

1. **Zda měřit prokliky na weby pořadatelů.** Pro dopis je to argument (§ 8.2), ale je to měření odchodu z webu a chce samostatné rozhodnutí.
2. **Jak často školy dělají výpravy na veletrhy** (§ 1.3). Domněnka zadavatele, ne měření. Kdyby se ukázalo, že jsou výjimkou, hodnota stránky pro rodinu roste.
3. **Otázky z inspekčních zpráv po krajích** (§ 5.7) — odloženo jako možný ukazatel, ne zamítnuto.
4. **Zda po sezóně akce archivovat**, nebo soubor přepsat. Historie dává smysl jen tehdy, pokud z ní jde odvodit příští termín („vždy druhý čtvrtek v listopadu“).

## 12. Historie

| Verze | Změna |
|---|---|
| 0.10 | Tabulka fronty nahlášení chyběla na produkci; SQL se nově generuje ze schématu, spouští skriptem a hlídá testem. Migrace provedena 23. 9. 2026. |
| 0.9 | Druhé kolo pátého review: doplněn test, který hlídá rozchod dat s registrem — mutace strážní podmínky dřív prošla všemi testy. Při rozchodu stránka místo věty o nedohledaných akcích říká, že přehled připravujeme. K době držení dopsán postup: mazání adres je roční úkol po skončení sezóny, ne automatická úloha. |
| 1.0 | Přehled dostal kraj jako osu (23. 9. 2026, § 5.2): čipy krajů s počty místo dvou rozbalovacích seznamů, oddíl na kraj s řádkem měst, datum jako dlaždice a město jako první řádka karty, výhrada neúplnosti u každého kraje, kotva `#kraj` pro odkaz ze stránky kraje. Filtr měst zrušen — 38 z 39 měst mělo jedinou akci. Z karty vypuštěn dovětek „ne tento web“ (§ 10 sladěn). Počet akcí v kraji zapsán jako ukazatel do slovníku (§ 6.4) a do registru. Po třech kolech review: nadpis kraje přes `nadpisKraje` v `src/lib/kraje.mjs` („Kraj Vysočina“; stránka kraje a hlavička mají zatím vlastní starší podobu „Vysočina“ — sjednocení je samostatná změna, protože mění titulky indexovaných stránek), dlaždice u vícedenní akce nese rozsah dnů a má pevnou šířku, výběr čipem se propisuje do adresy, kotva po předvýběru posune na oddíl až po překreslení, kotva na kraj bez akcí ukáže prázdný stav, čip kraje bez akcí jde odkliknout. Seskupení a tvar počtu v listovém modulu `src/lib/veletrhy-pocty.ts`, protože klientská komponenta nesmí importovat data ani registr (`next build` padal na `fs`). Testy vykreslení přes sdílený zavaděč, ověřeny mutacemi; validace `krajKod` a tvaru dat. |
| 0.8 | Páté review nad celým PR #155: stránka ochrany osobních údajů doplněna o formulář nahlášení včetně doby držení; odkaz na `/veletrhy` z patičky a z kalendáře přijímaček, dosud byla sekce dostupná jen ze sitemapy; období se ověřuje proti registru datových sad, dřív ho návrh sliboval a kód nečetl. |
| 0.7 | Čtvrté review: odesílání pošty dostalo strop osmi sekund (`AbortSignal`, požadavek se opravdu přeruší) včetně čtení chybového těla; pozdní chyby po vypršení limitu se logují, místo aby spadly jako neošetřené odmítnutí. Testovací pool nově ověřuje, že sloupce v INSERT odpovídají migraci — mutační test ukázal, že dřív prošlo i přejmenování sloupce. Zapsána známá omezení fronty: `Promise.race` dotaz nezruší a příznak odeslání může zůstat `false`, i když e-mail odešel. |
| 0.6 | Třetí review: doplněna databázová fronta hlášení (`db/migrace/005-veletrhy.sql`). Záznam se ukládá dřív, než odejde e-mail, takže hlášení nezmizí, když pošta selže; přijetí se potvrzuje, když je hlášení aspoň na jednom z obou míst. |
| 0.5 | Druhé review: opraven zbylý starý počet v soupisu zdrojů a filtrování měst po půlnoci; aktivní výběr bez zbývajících akcí zůstává viditelný v ovladači. Doplněny testy POST (produkce bez klíče, chyby pošty, neplatná těla, rate limit a obnova po uplynutí okna) a simulace aktualizace klientského dne nad skutečnou komponentou. Oddělen aktuální stav implementace od návrhu, databázová záloha zůstává otevřená. |
| 0.4 | Postaveno a oponováno Codexem. Čtyři nálezy vypořádány: hlášení, které pošta odmítne, se už nepotvrzuje jako přijaté; stránka se obnovuje po hodině a proběhlé akce filtruje i klient; den se počítá v pásmu Europe/Prague, ne v UTC; přibližný termín se nevydává za přesný. Zavedeny tři stupně doloženosti termínu místo dvou. Dohledáním na webech pořadatelů přibylo 8 akcí, pokrytí stouplo z devíti na **všech čtrnáct krajů**. |
| 0.3 | Hlášení kontroluje Eda průběžně po celý rok. Upřesněno, že hlásit může kdokoli, ne jen pořadatel, a že hlášení kontroluje Eda. Potvrzeno, že se akce zveřejní až po ověření, a doručení e-mailem se záznamem v databázi. |
| 0.2 | Přiznán skutečný záměr: hlavní je odkazová autorita (§ 1.1), doložená SEO auditem — 94,3 % zpětných odkazů je z vlastní preview domény. Užitek pro rodinu přeřazen z cíle na provozní podmínku (§ 1.2), protože pořadatel odkáže jen na stránku, která jeho návštěvníkům k něčemu je. Zaznamenáno, že školy vodí deviťáky hromadně (§ 1.3), což mění otázku, na kterou stránka odpovídá, a označeno jako nedoložená domněnka. Tři přídavky stránky: odkaz do katalogu kraje, metodický blok a kalendářový export (§ 5.6–5.8). Newsletter omezen na zmínku v pravidelném souhrnu, samostatná rozesílka zamítnuta (§ 8.1). Pojmenována nerovnost výměny odkazů (§ 8.2). Provoz e-mailem, administrace fronty se nestaví (§ 8.4). |
| 0.1 | Založení. Návrh k posouzení, nic není postavené. |
