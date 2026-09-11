# Audit dat na kartách škol a oborů

Verze 1.1 · 11. 9. 2026 · vypořádání oponentury v1.0 · produkční nálezy ze stavu `37ebfbc`; žádné aplikační opravy touto revizí.

## Závěr

Aktualizace není dokončená napříč webem. Simulátor používá ověřené výsledky 2026, ale katalog, profily, rozšířený detail a exporty mají různé zdroje a pravidla. Některá data 2025 jsou správně označenou historií; jiná jsou stále podkladem současných doporučení. Část polí InspIS obsahuje termíny starší než 2025. Rok 2027 nesmí vzniknout přejmenováním historie.

## Rozsah a metoda

Kontrola aktivních datových cest: simulátor a Můj výběr, vyhledávač, školní přehled a karty oborů, profil oboru, `/detail`, `/pro-me`, regionální/městské tabulky, InspIS, inspekce, poznámky, JSON/Markdown a metadata. Soubory `*.v1_original.tsx` nejsou považovány za publikované stránky. Podmíněné bloky jsou rozlišeny od veřejně potvrzených nálezů.

Kompletní profilování lokálních datasetů a jejich klíčů; kontrola živého API katalogu a pěti reprezentativních veřejných HTML stránek (Macharův profil a detail, Bohosudovský profil, detail a přehled školy). Nejde o ruční ověření každé školy vůči jejímu webu. Konkrétní kontakty, aktuální školné a všechny termíny 2027 nebyly u škol ověřeny. Důkazy: `podklady/audit-dat-karet-2027/`; reprodukce `python3 docs/podklady/audit-dat-karet-2027/profil.py`.

## Inventář polí a rozhodnutí

| Publikovaná data | Skutečný zdroj / ročník | Rozhodnutí a priorita |
|---|---|---|
| Název školy, REDIZO, obec, adresa, kraj, zřizovatel | Základ profilů `school_analysis.json`; hledání také `schools_data.json` 2025 | P1: aktualizovat proti současnému rejstříku a místům výuky; uchovat stabilní ID a přesměrování. Rok dat není datum ověření adresy. |
| Seznam oborů, KKOV, zaměření, délka studia, další obory školy | Základ katalogu 2025, jen částečné obohacení 2026 | Zahájit souběžně s P0: sestavit katalog z nejnovějšího registru + importu 2026, zvlášť stav nabídky 2027. Neztotožnit chybějící shodu s ukončením oboru. |
| Přihlášky, kapacita, přihlášky na místo, první priority v simulátoru | `applications_2026.json`, 1. kolo, zdroj platný 17. 8. 2026 | Ponechat jako historii 2026. Kapacita 2027 je nové samostatné pole, až bude potvrzena. |
| Průměr ČJ+MA všech konajících a přijatých, jejich počty, výsledkové důvody | Nový `admission_context`, stejný zdroj 2026 | Ponechat; P1 přenést jednotná pravidla a zobrazení na profily. Neúplný rozpad není nula. |
| Průměry ČJ, MA přijatých, pořadí, změna vůči 2025 | `cermat_results_2026.json`, 3 076 nabídek; průměry /2 | Převážně aktuální historie. P0 sjednotit ochranu před známým rozporem počtu konajících s novým kontextem. P1 kontrolovat meziroční párování a populaci jednotlivých předmětů. |
| Kapacita, přihlášky, přijatí, poptávka v historických sekcích a záložkách oborů | `school_analysis.json` a `schools_data.json` 2025 | Ponechat v odděleném archivu; P1 hlavní statistiky napojit na 2026. Bez fallbacku vydávaného za aktuální data. |
| Min. body, minimum pro přijetí, rozsah minim, trend minima | Původní import 2025, místy trend 2024→2025 | P0: nedoložený význam/populace, nestačí aktualizovat rok. Skrýt jako přijímací hranici ve všech konzumentech; obnovit až po ověřeném importu a definici. |
| Obtížnost přijetí, snadné/těžké, popularita/prioritní skóre | Legacy `obtiznost` a odvozené výpočty | P0: dokončit odstranění nedoložené interpretace mimo simulátor a opravený profil; datum aktualizace vzorec nevaliduje. |
| Priority přihlášek a přijatých, „šance podle priority“ | Rozšířené statistiky 2025 | P1 aktualizovat popisné počty z 2026 (všech pět priorit). P0 přejmenovat a odstranit osobní interpretaci historického poměru. |
| Kam se uchazeči hlásili, alternativy, strategie | 2 515 souborů `school_details`, návaznost na původní import; v souborech chybí ročník/provenience | Označit historicky, doložit zdroj 2025. P1 obnovit z individuálních anonymizovaných dat 2026 po ověření schématu. Školoborové agregáty samotné toto neumožňují. Odstranit doporučení podle neověřených minim. |
| Trend zájmu / oscilace | 2024→2025; StatsGrid zaměňuje přijaté 2025 za kapacitu | P0 opravit jmenovatele a prediktivní text; P1 přepočítat trend 2025→2026 nad stejnými nabídkami. |
| Kohorty a profil obtížnosti | S0 vrací `null`, některé komponenty zůstávají v kódu | Neobnovovat staré grafy jen kvůli doplnění ročníku. Samotná přítomnost komponenty není důkaz, že se graf publikuje. |
| Školné, počty studentů, jazyky, CLIL, vybavení, bezbariérovost, stravování/ubytování, podpora, aktivity a spolupráce | InspIS, export 11. 2. 2026; obsah nemá datum ověření jednotlivých polí | P1 školné/ubytování ověřit pro 2027/28; P2 ostatní obnovit a uvádět zdroj i datum ověření. Export v roce 2026 neznamená obsah platný pro 2026. |
| Dny otevřených dveří, termíny zkoušek, přípravné kurzy | InspIS s historickými texty, přípravné kurzy 0 z 1 180 škol vyplněno | P0 staré termíny nesmějí vypadat jako budoucí akce. P1 samostatné události s datem/ročníkem/zdrojem, ověřit na webech škol. Neznámé kurzy neznamenají, že škola kurzy nemá. |
| Přijímací kritéria, předměty, forma řízení | Obecné texty InspIS bez potvrzení pro 2027 | P1 získat školou zveřejněná kritéria, váhy JPZ a dalších složek, minima podmínek a termíny, s platností pro daný obor/ročník. Do té doby „neověřeno pro 2027“. |
| Inspekce, silné stránky, rizika, AI shrnutí | ČŠI index: snapshot 11. 2. 2026; 9 564 institucí všech typů. Extractions: 849 REDIZO | Historickou zprávu zachovat s jejím datem; P2 obnovit seznam a doplnit novější zprávy. Datum extrakce není datum inspekce. Neprezentovat starší zjištění jako aktuálně trvající fakt. |
| Poznámky a upozornění | 6 poznámek, metadata 19. 2. 2026, jedna s expirací 1. 9. 2026 | P1 projít obsah a expirace; expirovaná poznámka v datasetu sama není publikační chyba, loader expiraci kontroluje. |
| Odhad dojezdu, zastávka, chůze, přestupy | Lokace 8. 2. 2026; GTFS ranní pondělní profil bez platnosti v metadatech | P1 obnovit místa výuky, GTFS a doložit období platnosti. Nejde o jízdní řád pro konkrétní den 2027. |
| JSON / Markdown profilu, SEO popisy, navigace | Exporty explicitně CERMAT 2025, součty a minima ze starých loaderů | P1 sjednotit datovou vrstvu; exportovat rok/kolo/zdroj/platnost na úrovni ukazatele. P0 odstranit nedoložená minima stejně jako v UI. |

## Nálezy s důkazy

### A-01 — Katalog není kompletní vůči vlastnímu importu 2026 (zahájit souběžně s P0, vysoká jistota)

`schools_data.json[2025]` má 2 837 řádků, po vyloučení nejednoznačných normalizovaných ID 2 777 nabídek v simulátoru. Přesná shoda s přihláškami 2026 existuje pro 2 087, s výsledkovým souborem pro 2 075. Z 3 091 nabídek importu 2026 nemá 1 004 přesný protějšek v tomto katalogu (32,5 %); 690 katalogových nabídek nemá přesný protějšek v přihláškách 2026. Živé API potvrdilo 2 777 / 2 087. Množina všech normalizovaných katalogových klíčů má 2 807 položek; proti ní chybí 978 nabídek. Rozklad 1 004 = 978 bez jakéhokoli klíče + 26 s pouze nejednoznačným protějškem. Jde o počty nabídek 2026, nikoli duplicitních řádků katalogu. Přepočet 2 075 shod s výsledky opravuje chybu auditního skriptu v1.0 (prázdný suffix), nikoli změnu zdrojových dat.

Nejde o důkaz 1 004 nových nebo zrušených oborů. Rozdíl může být přejmenování, změna zaměření, nejednoznačnost i skutečná změna nabídky. Nutná migrační mapa s důkazy; pro nejasné případy žádné automatické spojení historie. Viz `profil.json` a `src/app/api/schools/search/route.ts`.

### A-02 — Pokračování O-13: minima a osobní interpretace mimo simulátor (P0, veřejně potvrzeno)

Macharovo technické lyceum: veřejný profil uvádí „Min. skóre pro přijetí (2025): 50“, přestože jiný blok hlásí historické minimum jako nedostupné. `/detail` ukazuje „Minimální body 50“, „Šance přijetí podle priority“ a 100 % pro 7/7. `src/lib/historical-scores.ts` přitom výslovně uvádí, že původní minimum nemá ověřenou populaci a nesmí sloužit jako hranice přijetí.

Předchozí S0 a PR #78 opravily konkrétní konzumenty, nikoli všechny výstupy. Audit jejich rozsah zpřesňuje: uzavření S0 bylo příliš široce interpretováno. O-13 je pro web jako celek nadále otevřený blokátor; úspěšná přejímka opraveného simulátoru zůstává platná jen pro tento rozsah. A-02 eviduje pokračování téže vady, A-03 související chybu jednotek a stejnou mezeru přejímky. Nejde o novou regresi po doložené plošné opravě, protože plošná přejímka doložena nebyla. Důkaz: `600007774-profil.txt`, `600007774-detail.txt`; `getProgramsByRedizo`, `ProgramCard`, spodní Bodové statistiky, `StatsTab.tsx`.

### A-03 — Navazující mezera přejímky O-13: chybná škála a význam (P0, veřejně potvrzeno)

Veřejný `/detail` Macharova lycea: ČJ průměr 36/100, MA 30/100, oboje „těžší“. `getExtendedSchoolStats` už hodnoty přepočítal na 0–50, ale `StatsTab.tsx:188,202` je označuje /100 a aplikuje hranice 65/50. Výkon skupiny uchazečů navíc není obtížnost testu. Ve stejném detailu „Počet přihlášek N/A“: komponenta čte `program.prihlasen`, loader dodává `prihlasky`. Nutná oprava schématu i významu, ne pouhá aktualizace dat.

### A-04 — Zastaralé události v InspIS (P0 pro zobrazení, vysoká jistota)

Z 1 180 profilů má 998 text dne otevřených dveří. U 776 obsahuje pouze explicitní roky nejvýše 2025, u 165 neobsahuje explicitní rok; nejde o součet výskytů jednotlivých let. Z 707 textů termínů přijímaček je 451 pouze s roky nejvýše 2025, 225 bez explicitního roku. Bez roku nelze automaticky vyhodnotit datum. 57 textů DOD obsahuje 2026, což samo neznamená budoucí akci.

Veřejný přehled Biskupského gymnázia Bohosudov publikuje „12. 11. 2024, 23. 1. 2025“ v sekci O škole bez označení za minulou akci. To je potvrzený příklad, nikoli tvrzení, že všech 776 profilů je veřejně routovatelných. `SchoolInfoSection.tsx` nemá datum platnosti pole. Export z února 2026 tedy neřeší stáří obsahu.

### A-05 — Nejednoznačné párování a závěr o ukončení oboru (P0, potvrzeno v kódu)

`match2026ToProgram` v profilu používá při selhání přesné shody základ REDIZO+KKOV, slovní podobnost a nakonec `candidates[0]`. Výsledkový blok připouští prázdné zaměření jako shodu s konkrétním zaměřením. Seznam oborů označuje nabídku chybějící v importu textem „v roce 2026 … neotevírají“. Tyto inference nejsou podložené. Opravit na úplný jednoznačný klíč a stav „nenalezeno v tomto importu“; kvantifikace všech chybných přiřazení vyžaduje další routovací kontrolu.

### A-06 — Ochrana kvality je pouze v novém kontextu (P0, potvrzeno v datech a kódu)

65 rozpadů 2026 není úplných; simulátor zadržuje jejich automatický závěr. Source ID `e74e9ded-e788-4221-83a5-0df887ce8eb6` má 23 přijatých a 24 konajících přijatých; nový kontext zadržuje průměr. `SchoolResults2026` dál čte starší výsledkový JSON bez tohoto příznaku. Sjednotit validaci všech konzumentů, včetně pořadí a předmětů. Příčinu neshody zdroje neznáme.

### A-07 — Historické trendy a pojmy nejsou sjednocené (P1/P0, potvrzeno v kódu)

Historické oddělovače se zobrazují jen při nalezeném `program2026`. Bez něj některé bloky nedostanou stejné ročníkové vysvětlení. `StatsGrid` pro trend používá přijaté 2024, ale kapacitu jako odhad přijatých 2025. Banner 2026 porovnává součty různých rozsahů nabídek; „nový obor“ odvozuje z nenalezené historie. Opravit jmenovatele a srovnatelnost, zachovat přesné roky místo „loni“.

## Co aktualizovat a v jakém pořadí

Pořadí níže není sériová fronta. Od prvního pracovního dne běží dvě pracovní větve: P0 publikační opravy a A-01 inventura/migrační mapa. Závislosti se týkají až vydání společné datové vrstvy, nikoli zahájení inventury.

1. **Datová bezpečnost profilů (P0):** odstranit zbylá nedoložená minima a osobní šance; opravit škálu /50 a datová pole `/detail`; zastavit náhodné párování a závěry o neotevření; staré události archivovat; sdílet validační příznaky 2026.
2. **Sjednocení 2026 (P1):** jeden zdroj statistik pro kartu, profil, přehled i export. Hlavní přijímací data 2026; 2025 a 2024 pouze v archivu. Přenést konající a výsledkové důvody na profily, zpřístupnit přijaté podle všech priorit. Přepočítat srovnatelné trendy.
3. **Katalog a nabídka 2027 (zahájit současně s P0):** aktualizovat identitu, adresy a obory, vypořádat 1 004 nespárovaných nabídek. Od škol evidovat potvrzené otevření 2027/28, kapacitu, kritéria a odkazy. Neověřené údaje označit. Školám lze připravit přehled k potvrzení; v tomto auditu nebyl odeslán žádný email.
4. **Praktické informace (P1/P2):** DOD, kurzy, školné, ubytování a kontaktní odkazy ověřovat pro konkrétní ročník; obnovit InspIS, ČŠI a dopravu. U stabilnějšího vybavení postačí uvedené datum posledního ověření.

Přejímací podmínka: každé přijímací číslo musí mít rok, kolo, populaci, jednotku a zdroj; nabídka 2027 potvrzení; nejednoznačná shoda musí zůstat neznámá. V testech porovnat stejný obor mezi simulátorem, profilem, `/detail` a exportem, včetně více zaměření a oboru bez 2026 shody.

## Co nyní nepřepisovat

Správně označené výsledky 2025/2024 a datované inspekční zprávy mají historickou hodnotu. Výsledky 2026 jsou poslední uzavřený ročník, nikoli stará data k odstranění. Kapacity 2026 nelze vydávat za 2027. V katalogu CERMAT je dostupné i 2. kolo 2026, náš hlavní import zahrnuje 1. kolo; rozšíření vést samostatně, ne součtem bez pravidel. Výsledky JPZ 2027 k datu auditu neexistují.

Zdroj ročníků: [CERMAT — agregovaná data](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/agregovana-data-jpz.html), ověřeno 11. 9. 2026. Kontrola nebyla plošným ověřením obsahu všech webů škol; data nebyla změněna a nic nebylo nasazeno.

## Vypořádání oponentury v1.0

Oponentura: `oponentura-auditu-dat-karet-2027.md`. Původní audit a výpočetní přílohy zachovány v `podklady/audit-dat-karet-2027/v1.0/`. „Vypořádáno“ zde znamená rozhodnutí a změnu plánu/dokumentu, nikoli opravenou produkci.

| Připomínka / důkaz | Rozhodnutí a vypořádání |
|---|---|
| A-01: 2 073 versus 2 075 | Přijato a opraveno na 2 075. ID `600008045_63-41-M/02____` a `600008045_78-42-M/02____` původní Python normalizoval s koncovým `_`, produkční helper bez něj. Nešlo o jinou verzi datasetu. Nový výpočet porovnán přímo s `normalizeSchoolKey` a `uniqueSchoolIndex`. |
| A-01: 1 004 versus 978 | Obě hodnoty správné s různým základem. Doplněn rozklad 978 + 26 i velikost obou množin. |
| A-04: 776/165 versus 777/164 | Původní počty ponechány s přesnou metodou `\b20\d{2}\b`. Rozdíl způsobuje REDIZO `600032001`, text `14. 12. 20236`. Volný regex zachytí podřetězec 2023; ohraničený žádný platný čtyřciferný rok. Záznam je chybný/neověřený, není důkazem platného roku 2023. Volný regex mění ještě tři množiny nalezených let, ale jejich celkovou kategorii ne. |
| Potvrzení A-02, A-03, A-05, A-07 na produkci/v kódu | Přijato. Důkazy se nemění a nálezy zůstávají otevřené. U A-06 zachován vlastní datový důkaz; oponentura jej ověřila jen částečně. |
| V-1: návaznost A-02/A-03 na O-13 | Přijato s rozlišením: A-02 je pokračování původní vady, A-03 chyba jednotek ve stejné nekontrolované cestě. O-13 pro celý web znovu veden jako otevřený; přejímka musí pokrýt matici všech konzumentů. |
| V-2: katalog začíná pozdě | Přijato. Inventura a migrační mapa začínají současně s P0; nemají čekat na dokončení oprav UI. Odstranění tvrzení o neotevírání zůstává P0. |
| V-3: chybí pracnost | Přijato. Doplněn intervalový odhad s předpoklady, ruční složkou a přepočtem po vzorku; nejde o závazný termín. |
| Sdílený kontrakt mezi vrstvami | Přijato jako směr. Úzký kontrakt pro přijímací statistiky navržen do aktuální opravy, plošná migrace jako následná práce. Samotný typ nezakáže libovolný text `/100` v JSX; potřeba sdílený renderer, runtime validace a testy kontraktu. |
| „7/7 nemá vypovídací hodnotu ani jako popis minulosti“ | Nepřijato v této absolutní podobě. 7/7 přesně popisuje pozorovanou skupinu. Malý vzorek omezuje zobecnění a predikci; nesmí se prezentovat jako osobní šance. Doporučeno zobrazit především počty a rok, např. „Přijato 7 ze 7 uchazečů s první prioritou v roce 2025“. |
| „36 z 50 je nadprůměr“ | Upřesněno: 36/50 = 72 % maxima, tedy nad polovinou škály. Bez referenčního průměru nelze tvrdit nadprůměr proti populaci. Chybné /100 a klasifikace „těžší“ jsou potvrzené nezávisle na tomto tvrzení. |
| „Kontrakt se do sezóny nestihne“ | Nejde o doložený odhad. Celoplošnou migraci nelze slíbit; omezený kontrakt a společná komponenta jsou součást navrženého rozsahu níže. |

### Termín a rozsah sezóny

MŠMT potvrzuje podávání přihlášek do konzervatoří 1.–30. listopadu 2026 ([Edu.cz, informace k řízení 2026/27](https://edu.gov.cz/prijimaci-rizeni-do-ss-2026-2027-co-se-meni-pro-skoly-a-uchazece/)). Od 11. září do 1. listopadu zbývá 51 kalendářních dnů; argument naléhavosti je platný. Konzervatoře ovšem nejsou pokryté naším importem omezeným na obory s povinnou JPZ. Oprava těchto 1 004 shod sama listopadovou nabídku nevyřeší. Do inventury proto patří samostatně konzervatoře/obory bez JPZ a jejich zdroje; jejich kompletní naplnění není skryté v odhadu migrace JPZ.

## Odhad pracnosti a plán vydání

Pracovní odhad podle zjištěných cest v kódu, nikoli historicky naměřená rychlost. Jeden člověkoden (ČD) = 8 hodin soustředěné práce. Zahrnuje implementaci a průběžné testy; čekání na odpovědi škol se počítá zvlášť. Předpoklad: jeden vývojář, dostupný věcný reviewer, bez nových účtů nebo kompletního přepisu profilů. Souběžné větve znamenají souběžný postup analýzy a oprav, nikoli příslib dvou současně pracujících vývojářů.

| Balík | Odhad | Závislosti / výstup |
|---|---:|---|
| P0 opravy všech dosud zjištěných konzumentů | 3–5 ČD | Minima, osobní procenta, /50, N/A, jmenovatele, neotevírání, archivace neplatných akcí; nezahrnuje níže uvedený kontrakt. |
| Úzký přijímací kontrakt a společné formátování | 2–3 ČD | Hodnota, jednotka, rok/kolo/populace, validita; odstranění `any` na dotčených hranicích. Může vznikat s P0. |
| A-01 inventura, rozklad shod a vzorek 100 případů | 2–3 ČD | Zahájit v prvním pracovním dni; seznam automaticky doložitelných a ručních případů, samostatný soupis zdrojů pro obory bez JPZ. |
| Migrační nástroj, katalogové ID a odkazy | 4–7 ČD | Po inventuře; explicitní mapa, kolize, aliasy/redirecty, bez heuristického slučování historie. |
| Ruční ověření výjimek | 3–18 ČD | Model: ručně 10–30 % z 1 004 případů, 10–25 min/případ, plus kontrola. Neověřené případy zůstávají oddělené. Interval přepočítat po vzorku. |
| Sjednocení statistik 2026 napříč profily/exporty | 3–5 ČD | Na úzkém kontraktu; prioritní počty, výsledkové důvody, ročníkové bloky. |
| Praktické údaje: expirace, zdroj, ověřovací workflow | 2–4 ČD | Infrastruktura a prioritní vzorek. Nezahrnuje ruční potvrzení všech škol ani kompletní import konzervatoří. |
| Závěrečná přejímka napříč cestami a produkce | 2–3 ČD | Matice níže, regresní a veřejné kontroly, žádné automatické uzavření podle buildu. |
| **Celkem uvedený rozsah** | **21–48 ČD** | Bez externího čekání a zatím neodhadnutého plošného sběru praktických údajů/konzervatoří. |

Rozptyl je převážně v ruční migraci. Pro jednoho vývojáře nelze celý horní rozsah slíbit v sedmi týdnech. Samotné dlouhé čekání na školy může přesáhnout tento rámec. Předsezónní minimum: opravené P0, úzký kontrakt, doložené katalogové shody a viditelné neověřené nabídky; žádná vymyšlená kapacita 2027. Hromadné schvalování zbývajících shod není přejímací podmínkou bezpečného částečného vydání, ale úplnost musí být přiznaná.

### První pracovní týden a rozhodovací body

- Den 1: otevřít dvě větve práce (P0 a migrační inventura), zafixovat zdrojové revize a matici výstupů. Není tím zadáno spuštění paralelních agentů.
- Během prvních 2–3 ČD inventury: vzorek 100 případů rozvrstvit podle chybějícího základu, změny zaměření, kolize a místa výuky. Změřit čas a podíl řešitelných shod; aktualizovat odhad, termín i rozsah konzervatoří.
- První opravené P0 vydávat průběžně po ověření; nečekat na ruční migraci. Katalog přidávat po doložených dávkách.
- Týdně reportovat otevřené publikační blokátory, ověřené/ruční/nevyřešené nabídky a počet časově neověřených akcí. O-13 uzavřít až po splnění celé sjednané matice, nikoli po jedné ukázkové škole.

## Návrh sdíleného kontraktu a přejímky

Navržený kontrakt pro novou přijímací vrstvu: `value`, `unit` (`jpz_subject_0_50`, `jpz_total_0_100`, `count`, `ratio`), `year`, `round`, `population`, `sourceId`, `validAt`, `quality` a důvod nedostupnosti. Pro průměr navíc `sampleSize`; vazba na úplné ID nabídky. Nejde ještě o schválený plošný přepis všech datových struktur.

Číslo vzniká jen přes validační konstruktor; sdílená komponenta odvozuje jednotku a ročník z objektu, nikoli z ručně psaného suffixu. Diskriminované/brandované typy brání záměně hodnot při předání mezi typovanými funkcemi. Nezabrání samy chybnému JSX, obejití přes `any` ani nedoloženému významu zdrojových dat. Proto součástí dodávky musí být testy rozsahů, počtů, zadržených dat a skutečně vykreslených popisků. Obdobně pro slugs používat jedinou implementaci a test stejného názvu při různých délkách studia.

Přejímací matice O-13: simulátor, Můj výběr, školní přehled, karty oborů, hlavní profil, `/detail`, `/pro-me`, regionální a městský výpis, JSON/Markdown a metadata. Vzorky: více zaměření, 4/6/8leté studium, nulový počet, chybějící údaj, zadržený průměr, neúplný rozpad, bez shody 2026, více míst výuky. Statická kontrola nedoložených polí + datové testy + vykreslené výstupy + veřejná kontrola relevantních cest. Veřejná přejímka všech jednotlivých škol není nahrazena slibem; garantuje se pokrytí kombinací datových větví a explicitně se evidují výjimky.

## Historie

- 1.1 — vypořádání oponentury v1.0; oprava 2 075 a normalizace auditu; rozklad 1 004/978; vysvětlení chybného roku 20236; návaznost O-13, souběžný start katalogu, odhady a úzký kontrakt. Opravy aplikace zůstávají otevřené.

- 1.0 — úplný inventář typů údajů, datasetové pokrytí, reprezentativní veřejná kontrola a prioritizace aktualizací.
