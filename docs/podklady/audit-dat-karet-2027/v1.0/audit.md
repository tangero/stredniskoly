# Audit dat na kartách škol a oborů

Verze 1.0 · 11. 9. 2026 · stav kódu `37ebfbc` · audit, nikoli provedená oprava.

## Závěr

Aktualizace není dokončená napříč webem. Simulátor používá ověřené výsledky 2026, ale katalog, profily, rozšířený detail a exporty mají různé zdroje a pravidla. Některá data 2025 jsou správně označenou historií; jiná jsou stále podkladem současných doporučení. Část polí InspIS obsahuje termíny starší než 2025. Rok 2027 nesmí vzniknout přejmenováním historie.

## Rozsah a metoda

Kontrola aktivních datových cest: simulátor a Můj výběr, vyhledávač, školní přehled a karty oborů, profil oboru, `/detail`, `/pro-me`, regionální/městské tabulky, InspIS, inspekce, poznámky, JSON/Markdown a metadata. Soubory `*.v1_original.tsx` nejsou považovány za publikované stránky. Podmíněné bloky jsou rozlišeny od veřejně potvrzených nálezů.

Kompletní profilování lokálních datasetů a jejich klíčů; kontrola živého API katalogu a pěti reprezentativních veřejných HTML stránek (Macharův profil a detail, Bohosudovský profil, detail a přehled školy). Nejde o ruční ověření každé školy vůči jejímu webu. Konkrétní kontakty, aktuální školné a všechny termíny 2027 nebyly u škol ověřeny. Důkazy: `podklady/audit-dat-karet-2027/`; reprodukce `python3 docs/podklady/audit-dat-karet-2027/profil.py`.

## Inventář polí a rozhodnutí

| Publikovaná data | Skutečný zdroj / ročník | Rozhodnutí a priorita |
|---|---|---|
| Název školy, REDIZO, obec, adresa, kraj, zřizovatel | Základ profilů `school_analysis.json`; hledání také `schools_data.json` 2025 | P1: aktualizovat proti současnému rejstříku a místům výuky; uchovat stabilní ID a přesměrování. Rok dat není datum ověření adresy. |
| Seznam oborů, KKOV, zaměření, délka studia, další obory školy | Základ katalogu 2025, jen částečné obohacení 2026 | P1: sestavit katalog z nejnovějšího registru + importu 2026, zvlášť stav nabídky 2027. Neztotožnit chybějící shodu s ukončením oboru. |
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

### A-01 — Katalog není kompletní vůči vlastnímu importu 2026 (P1, vysoká jistota)

`schools_data.json[2025]` má 2 837 řádků, po vyloučení nejednoznačných normalizovaných ID 2 777 nabídek v simulátoru. Přesná shoda s přihláškami 2026 existuje pro 2 087, s výsledkovým souborem pro 2 073. Z 3 091 nabídek importu 2026 nemá 1 004 přesný protějšek v tomto katalogu (32,5 %); 690 katalogových nabídek nemá přesný protějšek v přihláškách 2026. Živé API potvrdilo 2 777 / 2 087.

Nejde o důkaz 1 004 nových nebo zrušených oborů. Rozdíl může být přejmenování, změna zaměření, nejednoznačnost i skutečná změna nabídky. Nutná migrační mapa s důkazy; pro nejasné případy žádné automatické spojení historie. Viz `profil.json` a `src/app/api/schools/search/route.ts`.

### A-02 — Minima a osobní interpretace přetrvávají mimo simulátor (P0, veřejně potvrzeno)

Macharovo technické lyceum: veřejný profil uvádí „Min. skóre pro přijetí (2025): 50“, přestože jiný blok hlásí historické minimum jako nedostupné. `/detail` ukazuje „Minimální body 50“, „Šance přijetí podle priority“ a 100 % pro 7/7. `src/lib/historical-scores.ts` přitom výslovně uvádí, že původní minimum nemá ověřenou populaci a nesmí sloužit jako hranice přijetí.

Předchozí S0 a PR #78 opravily konkrétní konzumenty, nikoli všechny výstupy. Tento audit jejich rozsah zpřesňuje; neprohlašuje celý profil za již očištěný. Důkaz: `600007774-profil.txt`, `600007774-detail.txt`; `getProgramsByRedizo`, `ProgramCard`, spodní Bodové statistiky, `StatsTab.tsx`.

### A-03 — Rozšířený detail má chybnou škálu a význam (P0, veřejně potvrzeno)

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

1. **Datová bezpečnost profilů (P0):** odstranit zbylá nedoložená minima a osobní šance; opravit škálu /50 a datová pole `/detail`; zastavit náhodné párování a závěry o neotevření; staré události archivovat; sdílet validační příznaky 2026.
2. **Sjednocení 2026 (P1):** jeden zdroj statistik pro kartu, profil, přehled i export. Hlavní přijímací data 2026; 2025 a 2024 pouze v archivu. Přenést konající a výsledkové důvody na profily, zpřístupnit přijaté podle všech priorit. Přepočítat srovnatelné trendy.
3. **Katalog a nabídka 2027 (P1):** aktualizovat identitu, adresy a obory, vypořádat 1 004 nespárovaných nabídek. Od škol evidovat potvrzené otevření 2027/28, kapacitu, kritéria a odkazy. Neověřené údaje označit. Školám lze připravit přehled k potvrzení; v tomto auditu nebyl odeslán žádný email.
4. **Praktické informace (P1/P2):** DOD, kurzy, školné, ubytování a kontaktní odkazy ověřovat pro konkrétní ročník; obnovit InspIS, ČŠI a dopravu. U stabilnějšího vybavení postačí uvedené datum posledního ověření.

Přejímací podmínka: každé přijímací číslo musí mít rok, kolo, populaci, jednotku a zdroj; nabídka 2027 potvrzení; nejednoznačná shoda musí zůstat neznámá. V testech porovnat stejný obor mezi simulátorem, profilem, `/detail` a exportem, včetně více zaměření a oboru bez 2026 shody.

## Co nyní nepřepisovat

Správně označené výsledky 2025/2024 a datované inspekční zprávy mají historickou hodnotu. Výsledky 2026 jsou poslední uzavřený ročník, nikoli stará data k odstranění. Kapacity 2026 nelze vydávat za 2027. V katalogu CERMAT je dostupné i 2. kolo 2026, náš hlavní import zahrnuje 1. kolo; rozšíření vést samostatně, ne součtem bez pravidel. Výsledky JPZ 2027 k datu auditu neexistují.

Zdroj ročníků: [CERMAT — agregovaná data](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/agregovana-data-jpz.html), ověřeno 11. 9. 2026. Kontrola nebyla plošným ověřením obsahu všech webů škol; data nebyla změněna a nic nebylo nasazeno.

## Historie

- 1.0 — úplný inventář typů údajů, datasetové pokrytí, reprezentativní veřejná kontrola a prioritizace aktualizací.
