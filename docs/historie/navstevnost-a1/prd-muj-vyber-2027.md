# PRD: Můj výběr 2027, profily oborů a podklady pro rozhodování

- **Verze:** 0.4, pracovní návrh pro společnou diskusi.
- **Datum:** 11. 9. 2026.
- **Stav:** Uživatel schválil směr: návrh Mého výběru, úpravu datového základu a profilů, následnou realizaci pilotu. Schváleny D1 a základ D2: okamžité ukládání, volitelný průvodce „Pomoz mi s výběrem“, jednoduchý účet bez hesla a odkaz k náhledu. Zbývající volby jsou označené níže.
- **Rozsah této práce:** produktové zadání a interaktivní ukázka ovládání. Žádná nová produkční funkce ani rozesílka.
- **Návaznost:** `navrh-rozvoje-2027.md`, `aktualizace-kalendar-data-2027.md`, samostatné `prd-priprava-na-jpz.md`.

**Revize po oponentuře R1:** [návrh rozvoje v2.0](navrh-rozvoje-2027.md#vyporadani-r1) obsahuje odpovědi na O-1 až O-14 i přílohy. Tato verze zapracovává dopady do profilů a pořadí realizace. Původní [PRD v0.3](historie/rozvoj-2027-r0/prd-muj-vyber-2027.md) zůstává zachováno. Oponent zatím neověřil vypořádání R1.

## Aktuální stav realizace k 11. 9. 2026

Tento přehled odděluje dokončenou dodávku od návrhu následující etapy. Schválení produktové volby není dokladem její implementace.

| Oblast | Stav | Co je k dispozici / co zbývá |
|---|---|---|
| Kalendář přijímání 2027 | **Hotovo a nasazeno** | Veřejná stránka s 20 událostmi pro SŠ, konzervatoře a druhé kolo, export ICS, odkazy z navigace a hlavní stránky. |
| Obnova prvního kola 2026 | **Hotovo a nasazeno v uvedeném rozsahu** | Agregáty CERMAT platné k 17. 8. 2026; 3 091 nabídek s přihláškami a kapacitami, 3 076 nabídek s kladným zveřejněným průměrem. Srovnání používá současný zdroj 2025. Nejde o kompletní katalog všech škol a oborů. |
| Opravy propojení a výkladu dat | **Hotovo a nasazeno v dotčených cestách** | Normalizace zaměření, odmítání nejednoznačného párování, opravy označení skóre a městských komentářů; odstranění nepodložených osobních procent a předpovědí z přehledu konkurence. Nejde o audit všech starších kalkulaček. |
| Simulátor — O-13 | **Otevřený produkční blokátor** | Veřejný JS stále obsahuje predikční kategorie s prahem ±10. Samostatná oprava S0 před implementací Mého výběru; změna PRD není opravou kódu. |
| Mrtvé predikční výpočty — O-4 | **Otevřený technický dluh** | V Moje šance se nevykreslují, ale zůstávají v rozhraní `chances.ts`; odstranění v S0. |
| Historie JPZ a maturitní data | **Inventura ověřena, produkční import nehotov** | Rozebrány JPZ 2017–2023 a vzorky MZ 2026j/2025jap. Obsah profilů navržen níže, žádný ukazatel přidané hodnoty školy není validován. |
| Úplný katalog a nabídka 2027 | **Zbývá dokončit** | Doplnit obory mimo JPZ, nové a přejmenované nabídky a ověřená kritéria a kapacity 2027. Historické výsledky nejsou potvrzením otevření oboru v roce 2027. |
| Výsledky druhého kola 2026 | **Nezapojeno** | Kalendář druhé kolo pokrývá, jeho výsledky dosud nejsou součástí této obnovy. |
| Profily škol a oborů pro 2027 | **Existující profily, rozvoj navržen** | Profily jsou na webu; nová struktura s oddělenou historií, nabídkou 2027, původem údajů a ověřením školou zatím není dokončená. |
| Můj výběr 2027 | **PRD a interaktivní ukázka** | Ukázka v0.1 používá fiktivní data. Ukládání skutečných oborů, osobní poznámky, plán a návaznost na produkční data zatím nejsou implementované jako nový osobní prostor. |
| Okamžité ukládání a průvodce | **Produktově schváleno** | D1: okamžité ukládání a volitelná cesta „Pomoz mi s výběrem“. Realizace následuje. |
| Účet a sdílení | **Základ produktově schválen, neimplementováno** | D2: jednoduchý účet bez hesla a odkaz k náhledu bez dalších rodinných účtů. Better Auth je kandidát; přihlášení, záloha, synchronizace ani sdílení zatím nejsou zapojené. |
| Příprava na JPZ | **Samostatné pracovní PRD** | Produkční implementace nebyla v prověřených cestách doložena. Historický cílový termín 31. 8. 2026 není dokladem vydání. |
| Informování škol a ověřování profilů | **Návrh další etapy** | V rámci této práce neproběhla rozesílka ani zavedení potvrzování profilů školami. |

**Doklad nasazení:** [PR #71](https://github.com/tangero/stredniskoly/pull/71), commit `c9ae45214c6cedfedcc37977999914d9283915b1`, přítomný na lokální větvi `main`. Při této aktualizaci dokumentace znovu ověřena odpověď HTTP 200 veřejného kalendáře a bajtová shoda veřejných souborů `prijimacky-2027.ics`, `cermat_results_2026.json`, `cermat_results_meta.json`, `applications_2026.json` a `school_analysis.json` s checkoutem. Podrobný rozsah a postupy kontrol jsou v [záznamu dodávky](aktualizace-kalendar-data-2027.md). Původní testy a prohlížečové kontroly byly provedeny při dodávce; při této úpravě dokumentace se znovu nespouštěly.

**Co lze nyní testovat na veřejném webu:** [kalendář 2027](https://www.prijimackynaskolu.cz/prijimacky-2027), [export ICS](https://www.prijimackynaskolu.cz/prijimacky-2027.ics), [výsledky 2026](https://www.prijimackynaskolu.cz/vysledky/2026) a navazující zobrazení výsledků ve stávajících profilech a městských přehledech. Můj výběr lze zatím posuzovat na ukázce ovládání; nejde o dostupnou produkční funkci.

**Další práce:** následující implementační dodávka S0 opraví současný simulátor a odstraní nepodložené výpočty; není podmíněna jeho integrací. Souběžně uzavřít otevřené otázky ovládání a připravit identitu a stavy nabídky pro nové profily. Implementace pilotu Mého výběru následuje po ověřeném uzavření S0. D8 (živý náhled nebo snímek) a D4 (umístění pracovního pořadí) zůstávají otevřené; žádná varianta nebyla tímto přehledem nově schválena.

## 1. Účel a zamýšlený výsledek

Pomoci dítěti a rodině sestavit obhajitelný výběr konkrétních oborů: vědět, co se v nich učí, zda vyhovují prakticky, co ještě ověřit a jaké jsou termíny. Výsledkem je průběžně upravovaný seznam, vlastní poznámky, srovnání a pracovní pořadí přihlášek.

Produkt nemá vydávat obecnou popularitu nebo skóre přijatých za osobní vhodnost. Nemá odesílat přihlášky do DiPSy. Samotná návštěva webu, uložení oboru ani přesun v seznamu neznamenají podanou přihlášku.

Úspěšný první průchod: bez registrace najdu a uložím obor, pochopím jeho stav pro rok 2027 a napíšu si jednu otázku. Při druhé návštěvě pokračuji tam, kde jsem skončil.

## 2. Uživatelé a rozsah sezóny

Návrh: žák a jeho rodina mají jeden výběr pro jedno dítě a rok nástupu. Označení může být přezdívka; plné jméno, datum narození ani přesná adresa nejsou potřebné k ukládání oborů.

**Otevřeno D3:** první vydání pro deváťáky včetně učebních oborů, nebo současně i pro uchazeče o víceletá gymnázia a konzervatoře. Doporučení: společné ukládání a srovnání pro dostupné typy škol; plán přizpůsobit zvolenému typu přijímání. Neuvedený nebo neověřený režim se nesmí automaticky považovat za běžný obor s JPZ. Plná použitelnost každého režimu je samostatnou podmínkou vydání.

Omezení přípravného modulu na deváťáky není automaticky omezením výběru škol. Příprava zůstává samostatným produktem.

Více dětí v rodině nesmí sdílet jedno pořadí a poznámky. Architektura má umožnit více výběrů; otevřeno je, zda jejich přepínač zpřístupnit hned v prvním vydání.

## 3. Principy ovládání

1. **Ukládám konkrétní obor.** Identita zahrnuje školu, místo výuky, obor, zaměření, formu a sezónu. Stejná škola může mít více uložených položek.
2. **Začnu bez povinného dotazníku.** Z vyhledávání, výsledků i profilu vede stejné tlačítko „Uložit do výběru“. Průvodce je pomocná cesta, všechny jeho kroky lze přeskočit.
3. **Tři odlišné operace mají odlišné ovládání.** Uložit = ponechat mezi kandidáty. Zaškrtnout „Porovnat“ = dočasně postavit vedle sebe. „Zařadit do pořadí“ = výslovně zařadit do pracovního plánu přihlášek.
4. **Pořadí se nemění odhadem systému.** Změny filtrů, přidání kandidáta ani nové výsledky nepřerovnají preference rodiny.
5. **Průběžné ukládání musí být viditelné.** „Uloženo v tomto prohlížeči“, „Synchronizováno“, „Změny se nepodařilo uložit“. Selhání nesmí vypadat jako úspěch.
6. **Rozhodnutí lze vrátit.** Odebrání z hlavního seznamu znamená odložení, nabídne návrat. Trvalé smazání výběru je samostatná akce.
7. **Neznámý údaj není nevýhoda školy.** Rozhraní nabízí další krok k ověření; nevyplněné školné není nula, chybějící dojezd není nula minut.

## 4. Navigace a první použití

Trvalý vstup v hlavní navigaci: **Můj výběr · 2027**, s počtem aktivních uložených oborů. Doporučená cesta `/muj-vyber/2027` je návrh URL, nikoli existující stránka.

Uvnitř tři pohledy: **Výběr | Porovnání | Plán**. Dostupné i na mobilu, bez závislosti na gestu či rozbalovací nabídce. Společný kontext dítěte a sezóny zůstává viditelný.

Prázdný výběr má dvě cesty:

- „Hledat školy a obory“ otevře hledání s lokalitou a typem studia.
- „Pomoz mi s výběrem“ otevře volitelný průvodce: odkud a po jaké třídě hledám, co mě baví, maturita/řemeslo/ještě nevím, dojíždění, případně školné a internát. Body z JPZ nejsou vstupní podmínkou.

Výsledek průvodce je vysvětlitelný seznam kandidátů s možností měnit filtry. Není to psychologický test. Omezení „musí platit“ se oddělují od preferencí „bylo by příjemné“. Když výsledek neexistuje, systém navrhne, který filtr lze rozšířit, ale nezmění ho bez uživatele.

## 5. Pohled Výběr

### 5.1 Přidání a návrat

Uložení z jednoznačného profilu oboru proběhne jedním stiskem a změní tlačítko na „Uloženo“. Z profilu celé školy s více nabídkami se otevře volba konkrétního oboru, zaměření a pracoviště. Duplicitní uložení stejné nabídky nesmí vytvořit další řádek.

Po uložení stručné potvrzení s odkazem „Otevřít můj výběr“, bez vynuceného přesměrování. Při návratu z profilu zachovat místo v seznamu a filtry.

### 5.2 Podoba řádku nebo karty

Na první úrovni: název oboru, škola, zaměření a místo, délka a zakončení studia, stav nabídky 2027, stručná vlastní poznámka. Doplňkově známý dojezd a náklady včetně období a zdroje. Nikoli deset barevných ukazatelů a celková známka školy.

Akce: „Prohlédnout“, „Porovnat“, „Do užšího výběru“, „Odložit“. Užší výběr je volitelný příznak rodiny, ne systémový odhad. V zobrazení pouze uložených oborů nabízí filtr Vše / Užší výběr / Odložené. Dokončená návštěva je záznam v plánu, nikoli konkurenční stav oboru.

Doporučení: seznam jako výchozí zobrazení na počítači i telefonu. Karty lze porovnat v ukázce jako alternativu. Přetahovací nástěnku zatím nezavádět.

Na ukládání nepřenášet zákonný limit přihlášek. Dítě může mít desítky kandidátů. Případný technický limit musí být oddělený a nesmí tiše mazat položky.

### 5.3 Detail uloženého oboru

Na počítači detail vedle seznamu, na telefonu samostatné zobrazení se „Zpět do výběru“. Po zavření vrátit fokus na původní položku. Sekce:

- Co se budu učit a kam můžu pokračovat.
- Prakticky: pracoviště, dojíždění, školné, internát, dostupné informace o podpoře.
- Přijímání 2027: stav vyhlášení, kritéria, přílohy a zdroj.
- Historické výsledky: viditelný rok, kolo, rozsah a vysvětlení skóre.
- Moje poznámky: „Co se mi líbí“, „Co mi nesedí“, „Na co se zeptat“ a vlastní volný text.

Osobní poznámky se nesmějí zaměnit s redakčními informacemi či tvrzeními školy. Znění soukromých poznámek nevstupuje do analytických událostí.

## 6. Pohled Porovnání

Zaškrtávátko „Porovnat“ neodebírá obor z výběru. Společná lišta ukazuje počet a akci „Porovnat vybrané“. Doporučený rozsah je 2–4 obory; při limitu je nutné nabídnout výměnu položky, nikoli tiše odebrat předchozí.

Na počítači porovnávat po vlastnostech v tabulce. Na telefonu jsou současně dvě vybrané možnosti a přepínač druhé; ostatní označené obory zůstávají označené. Nepřenášet celou širokou tabulku do zmenšeného písma.

Pořadí vlastností: obsah a zakončení, dojíždění, náklady, prostředí a podpora, pravidla přijetí, historické výsledky, osobní poznámky. Nabídnout „Jen rozdíly“. Chybějící údaj se nikdy nezobrazí jako shoda s nulou.

Nezavádět automatického vítěze ani souhrnné skóre vhodnosti. Rodina může označit, které vlastnosti jsou pro ni důležité; systém připomene rozpory s jejími omezeními. V první dodávce stačí filtrovat a vysvětlovat dostupná fakta.

## 7. Pohled Plán

### 7.1 Návštěvy a úkoly

Osobní seznam nad společným kalendářem: otevřené dveře uložených škol, otázky k ověření, přílohy, kontrola kritérií, termíny přihlášek a zkoušek. Termíny zvolit podle typu přijímání; konkrétní pozvánku systém nezná, dokud ji uživatel nezapíše.

Úkol lze zaškrtnout, upravit či vrátit. U úkolu „Navštívit školu“ po splnění nabídnout krátkou poznámku o dojmu. Školní událost se sdílí napříč uloženými obory stejné školy jen tehdy, když skutečně platí pro všechny; deduplikace podle události a pracoviště.

První verze: termíny uvnitř produktu a export relevantních událostí do ICS. E-mailové a push připomínky jsou otevřenou volbou D5, nikoli automaticky slíbenou funkcí.

### 7.2 Pracovní pořadí přihlášek

Samostatný blok „Moje pracovní pořadí“. Zařazení je výslovná akce a nikdy nevzniká z pořadí uložení nebo řazení podle skóre. Změna pomocí Nahoru / Dolů; přetahování může být doplněk. Rozhraní sdělí, co se přesunulo, a umožní vrátit poslední změnu.

Před otevřením tohoto bloku musí být známý typ přijímání. Pravidla se vážou k sezóně a kolu. Běžné a talentové obory SŠ tvoří společné preference s příslušnými limity; konzervatoře mají samostatný režim a kalendář. Nepoužít jeden univerzální limit tří položek pro celý produkt. Podrobné výjimky musejí projít obsahovou kontrolou před vydáním daného režimu.

Vždy viditelně: „Pracovní návrh. Přihlášku podáváš v DiPSy nebo příslušným oficiálním způsobem.“ Po podání lze vytvořit uzamčený snímek pořadí označený uživatelem; pozdější změny v aplikaci nepředstírají změnu podané přihlášky. Druhé kolo má vlastní návrh, nepřepisuje první.

Pořadí má vyjadřovat skutečnou preferenci. Vysoká priorita nedává přednost před lepším hodnocením jiného uchazeče. Podklad: [MŠMT, metodika účinná od 1. 9. 2026](https://msmt.gov.cz/media/wp-content/uploads/2026/08/Metodika_prijimaci-rizeni_2026-2027.pdf), principy a vyhodnocení řízení. Toto PRD nereprodukuje úplné právní podmínky účasti.

## 8. Data a důvěryhodnost profilu

Nabídka má stabilní interní identitu nezávislou na upraveném názvu a zachovává zdrojové identifikátory. Historické spárování musí umět stav neověřeno, přejmenování, rozdělení a sloučení. Poznámky uživatele se nikdy nepřesouvají k jinému oboru bez doloženého vztahu a jasného vysvětlení.

U každého časově proměnlivého údaje evidovat: hodnotu, školní rok nebo období, zdroj, čas kontroly a povahu informace. Rozlišovat nejméně:

- Historický údaj 2026.
- Škola oznámila plán pro 2027.
- Vyhlášené přijímací řízení 2027 doložené kritérii.
- Pro 2027 zatím neověřeno.

Potvrzení školy není automaticky vyhlášením řízení. Rozpor s oficiálním zdrojem se dostane k moderátorovi a dočasně se označí; nepřepíše se tiše. U opravy zachovat historii. Aktualizace výsledků nemění rodinné poznámky ani preference.

Změna podstatného údaje u uloženého oboru vytvoří srozumitelné upozornění: co bylo předtím, co je nyní a odkud změna pochází. Při nedoloženém otevření oboru pro 2027 má uživatel možnost ponechat jej mezi kandidáty; pracovní pořadí jej označí jako neověřený návrh.

Před připojením dojezdovosti ověřit datum jízdních řádů a místo výuky. Opravit současný simulátor v samostatné dodávce S0 před implementací Mého výběru, i kdyby se do něj simulátor vůbec nepřipojoval. Převody skóre, odvozování dalších školních kritérií a všechny veřejné predikční kategorie vyžadují ověření; podmínky uzavření stanovuje návrh rozvoje v2.0 §3. Žádný neprověřený výpočet pravděpodobnosti se nesmí stát doporučením v Mém výběru.

### 8.1 Obsah datových oddílů profilu po oponentuře

| Oddíl profilu | Populace a granularita | Ovládání a omezení |
|---|---|---|
| Přijímání 2027 | Konkrétní nabídka, sezóna a kolo | Hlavní praktické údaje; neověřené kapacity a kritéria označit, neodvozovat z historie. |
| Výsledky přijímání 2024–2026 | Populace podle definice exportu, výsledky přijatých u nabídky | Výběr roku, vysvětlení ukazatele a zdroj. Není to předpověď osobní šance. |
| Historie JPZ 2017–2023 | Konající uchazeči za školu / oborovou skupinu, percentily | Samostatný rozbalovací oddíl „Dřívější výsledky uchazečů“. Nelze plynule spojit s bodovou řadou přijatých. |
| Maturita školy | Prvomaturanti, společná část, škola nebo SMO16 | Rok, jaro/stav po podzimu, předmět, počty a účast; přímo vedle hodnoty štítek „Za celou školu“ nebo „Za skupinu oborů“. Nenazývat výsledkem konkrétního zaměření ani celé maturity. |

Výchozí profil ukazuje přijetí 2027 a praktické informace; historické oddíly se otevírají na přání, aby nepřekryly rozhodování. Každý používá vlastní časovou osu a popisek populace. Při neověřeném mapování KKOV → SMO16 se smí nabídnout jen jasně označený školní agregát nebo odkaz na zdroj. Nikdy nerozkopírovat skupinový výsledek jako údaj jednotlivých oborů. Stejné pravidlo platí v porovnání.

Chybějící import není nula ani slabý výsledek; oddíl uvede „Tato data zatím nemáme zpracovaná“ a odkaz na zdroj. Nezveřejňovat neověřené náhledové hodnoty. Než se import vydá, musí projít kontrolou schématu, období, počtů, jednotek, populací, mapování a zobrazení malých/supresovaných skupin. Konkrétní prahové pravidlo pro malé skupiny určí datový protokol před zveřejněním; neimprovizovat limit při vykreslování.

Dostupnost zdrojů a reprodukce jsou doloženy v návrhu rozvoje v2.0 §2 a E1–E3. Toto je návrh místa a významu dat v rozhraní, nikoli implementovaný import. Výzkumná analýza vztahu JPZ a maturity má samostatný protokol (§4 návrhu); výběry ani profily nebudou automaticky řazeny podle neověřeného „přínosu školy“.

## 9. Uložení, účty a spolupráce — D2 schváleno v základu

### 9.1 Potvrzené produktové rozhodnutí

Uživatel nechce v první verzi zakládání oddělených rodičovských a dětských účtů. Použije se jednoduchý účet bez hesla a odkaz pro sdílení pouze k náhledu. Pracovní výklad uživatelova „magic password“ je jednorázový přihlašovací odkaz na e-mail (magic link), nikoli heslo ani sdílený odkaz s právem úprav. Příjemce náhledu nepotřebuje účet.

Okamžité ukládání z D1 zůstává bez přihlášení. Jedna e-mailová identita spravuje výběr; žádný druhý účet ani pozvánka dítěte nejsou podmínkou používání. Oprávnění k úpravě a oprávnění k náhledu jsou oddělená. Samostatné role a společné úpravy více účty nejsou součástí první verze.

### 9.2 Navržený průchod přihlášením

1. Uživatel začne ukládat obory. Stav říká „Uloženo v tomto prohlížeči“ a stručně vysvětluje omezení zálohy.
2. Při volbě „Zálohovat výběr“, „Otevřít na jiném zařízení“ nebo „Sdílet“ nabídneme jeden formulář: e-mail a tlačítko „Pokračovat e-mailem“. Samostatné obrazovky Registrace a Přihlášení nejsou potřebné.
3. Zobrazí se potvrzení odeslání, zadaná adresa a možnosti opravit adresu či poslat nový odkaz. Místní výběr zůstává zachovaný i při chybě odeslání.
4. Přihlašovací odkaz vrátí uživatele k původní akci. Po ověření identity připojíme výběr k účtu; pokud na účtu již existuje jiný výběr, nabídneme srozumitelné spojení či zachování zvlášť. Nikdy ho tiše nepřepíšeme.
5. Teprve po úspěšném uložení na server zobrazíme „Výběr je zálohovaný“. Samotné odeslání e-mailu ani přihlášení nejsou důkazem zálohy.

Ošetřit běžný případ: uživatel vybírá na počítači a e-mail otevře na telefonu. Místní data z počítače nelze předstírat jako dostupná na telefonu. Realizace musí buď bezpečně dokončit připojení původního rozpracovaného výběru, nebo jasně požádat o dokončení zálohy v původním prohlížeči; původní práce nesmí zmizet. Toto je přijímací scénář, konkrétní postup ověří technický návrh.

Neplatný, již použitý nebo prošlý odkaz nabídne nový přihlašovací e-mail bez ztráty výběru. Uživatel se při každé návštěvě znovu nepřihlašuje, pokud má platnou relaci.

### 9.3 Sdílení k náhledu

- Před vytvořením odkazu ukázat náhled toho, co příjemce uvidí. Soukromé poznámky ve výchozím stavu vynechat; jejich zahrnutí musí být výslovná volba.
- Odkaz je pouze ke čtení, nezakládá relaci vlastníka a neumožňuje upravovat seznam, poznámky ani pořadí. Neobsahuje přihlašovací magic link.
- Správce může sdílení vypnout a vytvořit nový odkaz. Vypnutý odkaz již neposkytne obsah. Rozhraní vysvětlí, že náhled může otevřít každý, kdo odkaz získá; neprezentuje jej jako pozvánku omezenou na jednoho adresáta.
- Sdílení obsahuje sezónu a stav školních údajů. Profilové kontaktní údaje vlastníka ani soukromé poznámky mimo zvolený rozsah se nesdílejí.
- **Otevřeno D8:** živý náhled průběžně aktualizovaného výběru, nebo snímek z okamžiku sdílení. Původní v0.1 navrhovala snímek, uživatel zatím potvrdil pouze náhled bez úprav. Nové doporučení k diskusi: živý náhled pro průběžnou práci rodiny, datovaný snímek až pro export a podané pořadí. U živého režimu musí být předem zřejmé, že se budou sdílet i budoucí změny zvoleného obsahu; zahrnutí poznámek se bez nové volby nerozšiřuje.

### 9.4 Technický kandidát

Preferovaným kandidátem je Better Auth s pluginem Magic Link; uživatel připouští i jiný systém. Dokumentace potvrzuje přihlášení odkazem bez hesla a možnost vytvoření účtu při prvním přihlášení. Konkrétní verze, databáze a poskytovatel e-mailů se vyberou při technickém návrhu. Odesílání přes Resend se v projektu používá pro hlášení chyb, což samo nepotvrzuje připravenost doručování přihlašovacích e-mailů.

Zdroj ověřený 11. 9. 2026: [Better Auth — Magic Link](https://better-auth.com/docs/plugins/magic-link). Autentizace řeší identitu a relaci; ukládání výběrů, oprávnění k nim a odkazy k náhledu musí řešit aplikace. Nejde o již implementovanou integraci.

## 10. Návaznost na současný web

| Existující část | Zjištěný stav | Návrh změny |
|---|---|---|
| Seznamy a profily | Několik cest k výsledkům a detailům | Všude jednotná akce uložení konkrétní nabídky |
| Je to pro mě? | Průvodce jednou školou, začíná body, stav v komponentě | Volitelná reflexe v profilu; společné preference nevynucovat opakovaně |
| Moje šance | Historické srovnání, sdílení ID v URL | Postupně připojit jako historickou sekci porovnání; zachovat funkční staré odkazy |
| SchoolNote | Redakční upozornění ze souboru | Zachovat odděleně od nových soukromých poznámek |
| Kalendář 2027 | Publikovaný, společný JSON a ICS | Použít stejné termíny, osobní plán filtruje relevanci |
| Příprava na JPZ | Samostatné PRD, neověřená produkční implementace | Předat vybrané cílové obory až po ověření dostupného modulu; tlačítko nesmí vést do neexistující funkce |

Konkrétní podklady: `src/components/school/guided/GuidedJourneyWizard.tsx`, `src/lib/school-notes.ts`, `src/app/moje-sance/MojeSanceClient.tsx`, `src/data/admissions-2027.json`, `src/lib/school-key.ts`.

## 11. Rozdělení dodávky

**S0 — oprava současného doporučování:** O-13 a O-4 podle návrhu rozvoje v2.0 §3. Podmínkou uzavření jsou změna kódu, příslušné kontroly, nasazení a ověření veřejného výsledku. Do té doby lze navrhovat A, ale implementaci pilotu B nezačínat.

**A — návrh a datové podmínky:** uzavřít D1–D4, otestovat prototyp s rodinami, sepsat stavy nabídky, identitu oboru a obsah profilu. Oddělit opravy historických výpočtů od nového osobního prostoru.

**B — první použitelný výběr:** ukládání a odkládání oborů, místní persistence, poznámky, porovnání, základ plánu a návrh pořadí pro ověřené režimy. Datové importy a profily musejí umožnit nezaměnitelné položky. Nenabízet nepokryté obory jako kompletní katalog.

**C — kontinuita a spolupráce:** bezheslový účet a sdílení k náhledu podle schváleného D2 jsou součástí první veřejné verze; místní pilot B může předcházet, ale nemá být vydáván za celé MVP. Upozornění na změny zdrojů a kontrola profilů školami mají samostatný rozsah. Společné úpravy více účty do první verze nepatří.

Další rozvoj: příprava podle vlastních výsledků, společné editace, připomínky, propojení s poradcem. Bez schválení nepřidávat automatické doporučování „šancí“ či obchodní zvýhodňování škol ve výběru.

## 12. Přijímací podmínky a pilot

Návrh testů s 5–8 rodinami: nejde o statistický důkaz, ale o odhalení nepochopeného ovládání. Přidat rodinu s více obory jedné školy a rodinu používající převážně telefon; další typy přijímání podle D3.

Účastník bez vedení zvládne:

1. Uložit dvě zaměření stejné školy jako dvě odlišné položky.
2. Vrátit se po obnovení stránky a najít vlastní poznámku.
3. Porovnat obory a vysvětlit rozdíl mezi neznámým údajem a nulou.
4. Přesunout preferenci pomocí tlačítek a vysvětlit, že nepodal přihlášku.
5. Najít neověřené kritérium 2027 a zdroj historického výsledku.
6. Odložit obor a vrátit ho bez ztráty poznámek.
7. Zálohovat výběr přes e-mailový odkaz, zkontrolovat obsah sdílení a vynechání poznámek.
8. Otevřít náhled bez účtu, ověřit nemožnost úprav a následně účinnost vypnutí odkazu.
9. Zachovat práci při prošlém přihlašovacím odkazu i při otevření e-mailu na jiném zařízení.
10. U maturitního údaje správně rozpoznat, zda popisuje školu nebo skupinu oborů, a neoznačit jej za výsledek konkrétního zaměření. Při zobrazené starší historii rozlišit konající uchazeče od přijatých. Tento scénář je podmínkou vydání příslušných datových oddílů.

Podmínky vydání: bez tiché ztráty dat, bez zaměněných identit, ověřené limity a kalendář podporovaných režimů, průchod klávesnicí a čtečkou, viditelné stavy chyb, mobilní ovládání bez přesného přetahování. Nulové či staré údaje nesmějí vést ke slibu přijetí.

Měřit dokončení úloh v pilotu, návrat k uloženému výběru, použití porovnání a práci se zdroji. Produkční metriky musí rozlišovat uživatele od zařízení a mít stanovenou dobu pozorování; neodesílat obsah poznámek, přesné bydliště ani volný text do analytiky. Konkrétní cíle stanovit až po pilotu.

## 13. Rozhodovací deník

| ID | Otázka | Doporučený výchozí návrh | Stav |
|---|---|---|---|
| D1 | Volný seznam, nebo povinný průvodce? | Okamžité ukládání + „Pomoz mi s výběrem“ | Schváleno uživatelem 11. 9. 2026 |
| D2 | Uložení a spolupráce rodiny? | Jednoduchý bezheslový účet, bez oddělených rodinných účtů, náhled odkazem | Základ schválen 11. 9. 2026; magic link je pracovní výklad, technický kandidát Better Auth |
| D3 | Které typy uchazečů zahrnout v prvním vydání? | Společné ukládání, ověřené plánování po jednotlivých režimech | Otevřeno, další kolo diskuse |
| D4 | Co znamená „Plán“ a kolik kroků má pořadí? | Návštěvy, úkoly i samostatný blok pracovního pořadí; bez integrace podání | K ověření na ukázce |
| D5 | Připomínky e-mailem/push v MVP? | Nejprve plán na webu a ICS | Otevřeno |
| D6 | Více dětí hned? | Model oddělených výběrů od začátku, ovládání podle rodinného režimu | Otevřeno |
| D7 | Forma rozhraní a porovnání na telefonu? | Seznam, detail, porovnání dvou možností; karty jako alternativa | K ověření na ukázce |
| D8 | Živý náhled, nebo snímek při sdílení? | Živý náhled, poznámky výchozím stavem skryté | Otevřeno; původní ukázka v0.1 předvádí snímek |

Ukázka používá výhradně fiktivní školy a modelové hodnoty. Není dokladem dostupnosti školních dat ani implementace účtů, synchronizace nebo podávání přihlášek. Rozhodnutí D1 a základ D2 jsou zapsané v této revizi. Ostatní označené varianty zůstávají návrhem. Interaktivní ukázka v0.1 se tímto textovým upřesněním sama nemění; zejména ještě neukazuje magic link a může zobrazovat původně navržený snímek sdílení.


## 14. Historie PRD

| Verze | Datum | Změna |
|---|---|---|
| 0.1 | 11. 9. 2026 | První návrh ovládání a samostatná interaktivní ukázka s fiktivními daty. |
| 0.2 | 11. 9. 2026 | Zapsané D1 a základ D2 podle uživatele. |
| 0.3 | 11. 9. 2026 | Přehled dokončené dodávky, návrhů a zbývající práce. Přesné znění uloženo v R0. |
| 0.4 / R1 | 11. 9. 2026 | O-13 jako nezávislá přednostní oprava S0, technický dluh O-4, historie JPZ a MZ v profilech, ověření porozumění granularitě. Vypořádání všech připomínek v návrhu rozvoje v2.0. |

Verze 0.1 a 0.2 jsou popsány podle průběhu této práce; samostatné úplné snímky těchto dvou verzí nebyly uloženy. Snímek 0.3 je neměnný. Revize 0.4 patří do commitu označeného `rozvoj-2027-r1`. Nové produktové volby D4 a D8 zůstávají otevřené.
