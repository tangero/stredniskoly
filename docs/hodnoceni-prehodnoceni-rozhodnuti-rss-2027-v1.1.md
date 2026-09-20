# Hodnocení přehodnocení RSS: dopad na autonomní získávání termínů DOD

**Verze hodnocení:** 1.1  
**Posuzovaný dokument:** [Přehodnocení rozhodnutí, verze 1.1](prehodnoceni-rozhodnuti-rss-2027.md)  
**Datum:** 20. 9. 2026  
**Priorita:** aktuální termíny DOD bez lidského schvalování provozních položek.

## 1. Vlastní stanovisko

**Strategický obrat podporuji, ale dokument jako celek není dostatečně podložený k převzetí beze změn.** Správně přesouvá pozornost od RSS jako technologie k potřebě rodiny zjistit aktuální DOD. Správné je časné ověření HTML zdrojů, využití existující infrastruktury a vyzkoušení Jevu. Není však doloženo, že kód už nebrzdí nasazení, že bude pokryto 90 % škol ani že porovnání modelu s pravidly změří úplnost.

Pro nový, výslovně zúžený cíl bych první dodávku zaměřil na **platný termín DOD, jeho zdroj, změnu či zrušení a čas poslední kontroly**. Obecné školní novinky mohou zůstat doplňkem. Ostatní přijímací třídy, obnova profilových polí InspIS a sjednocování všech školních událostí nemusí blokovat tuto dodávku.

## 2. Co je správně a co z toho plyne

| Závěr dokumentu | Hodnocení a praktický dopad |
| --- | --- |
| InspIS neposkytuje dostatečně čerstvé DOD | Sonda tomu silně nasvědčuje: 50/60 hodnot beze změny, rok 2026 pouze u jedné školy. Na obnovu InspIS proto nečekat. Nelze ale z jednoho průřezu dokázat, že všechny školy pole přestaly udržovat nebo že obnova nikdy nic nepřinese. |
| Rozšířit sběr mimo RSS dříve | Ano. 66/80 nalezených kandidátských odkazů ospravedlňuje rychlý pilot extrakce. Zvlášť hledat přímé stránky DOD/přijímání: termín nemusí být zveřejněn jako novinka. |
| Přidat adresu zdroje do portálu | Ano, jako nepovinný způsob objevení zdroje. Pro samotný cíl je ještě hodnotnější přímé strukturované hlášení DOD. Ani potvrzená URL nezaručuje trvalou dostupnost či úspěšnou extrakci. Aktivace má jít přes provozní registr v DB; git je audit, jak již stanoví hlavní návrh. |
| Zkusit Jev místo dalšího rozšiřování slovníků | Ano. Pro typování textového sdělení je to rozumný kandidát. Výsledek pilotu párování oborů je důvod pro experiment, nikoli důkaz správnosti dat, negací a oprav DOD. |
| Využít existující e-mailovou infrastrukturu | Ano. Odpadá výběr databáze a stavba základního odesílání. Neodpadají odběry škol, správa odběru, agregace a opravy podle skutečně doručeného stavu. |
| Jeden společný denní souhrn | Ano jako doručovací pravidlo. Dva vstupní formáty samy o sobě nevyžadují dva e-maily; mohou mít adaptéry do společné fronty. Kompletní sjednocení všech úložišť není podmínkou nasazení DOD. |

## 3. Kritické nálezy

### H1 — Přehled vynechal poslední oponenturu; kódové překážky stále existují

Úvod odkazuje na čtyři oponentury, nikoli na [pátou oponenturu v1.4](oponentura-skolske-novinky-rss-2027-v1.4.md). Její nálezy nebyly překonány novým rozhodnutím o modelu. Při této kontrole jsem opět spustil přímo `rozhodni_publikaci`:

| Vstup, publikace 1. 9. 2025 | Skutečný výstup |
| --- | --- |
| „Termín DOD pro uchazeče 9. 12. 2026 zatím není potvrzen“ | termínová karta 9. 12. 2026, `email: true` |
| „Zveme uchazeče na den otevřených dveří 9. 12. 2026.“ + „Soutěž začne 12. 12. 2026.“ | oba dny jako termíny DOD, `email: true` |
| „Zveme uchazeče na den otevřených dveří 9. 12. 2025“ | termínová karta již proběhlé akce, `email: true` |

Kód má stejný SHA-256 jako při páté oponentuře: `27f2097c4cb146657196e39d84b37686265b673f04b072b17027c833ddfe7f54`. Tvrzení „kód návrhu není brzda“ proto neplatí pro termínové karty. Správně je zachovat **princip** publikační kontroly v kódu, ale opravit její podmínky. Samotný průchod dosavadních 47 testů tyto chyby nevylučuje.

### H2 — Pořadí zdrojů není totéž jako přednost aktuálního tvrzení

Pořadí portál → RSS → sitemap → čtení webu respektuji jako pořadí získávání informací. Nemůže ale znamenat, že dostupný vyšší zdroj navždy vypne kontrolu nižšího. Příklad: škola v portálu potvrdí DOD a později jej na webu zruší. Bez další kontroly budeme autonomně zobrazovat chybný termín právě kvůli preferenci portálu.

Rozhodovat je třeba nad konkrétní událostí, časem a doloženou opravou, nikoli jen nad typem zdroje. Nové jednoznačné zrušení na oficiálním webu musí ovlivnit starší pozvánku. Nevyřešený rozpor má automaticky potlačit odvozený termín a nabídnout původní odkazy, bez moderátora. Archivní InspIS se starým ročníkem nemá blokovat aktuální DOD; samotný explicitní rok ovšem ještě neprokazuje, že jde o stejnou akci a platné konání.

### H3 — Dosah 90 % je optimistický strop, nikoli výsledek sondy

Sonda zkouší odkaz pomocí výrazů typu `aktualit`, `kalendar`, `ze-zivota`. Cílovou stránku následně neověřuje jako fungující výpis ani jako zdroj DOD. Hodnota 66/80 je kandidátský odkaz, nikoli úspěšné získání termínu.

Číslo kolem 90 % odpovídá scénáři `(533 + 450) / 1093 = 89,9 %`: tedy úspěchu u všech 450 dostupných webů bez feedu. Prosté přenesení četnosti 66/80 dává asi 83 % škol s feedem nebo kandidátským odkazem, stále před extrakcí. Ani jedno není změřené pokrytí DOD.

Také 50,5 % přihlášek není 50,5 % rodin: rodina může podat více přihlášek a kombinovat školy z obou skupin. Chybějící `meta generator` neprokazuje nepřítomnost dominantního CMS ani jednoduchost univerzálního parseru. Sedm rozbitých deklarací zase není horní mez všech dosud neobjevených feedů. Další hledání lze odložit z důvodu priority, ne je prohlásit za vyvrácené měřením.

### H4 — Sitemap a stručná karta článku nestačí jako jediný vstup

Sitemap pomáhá najít URL a plánovat kontrolu, ale `lastmod` je nepovinný. Nesmí být jediným spouštěčem kontroly stránky. Sonda navíc zkouší pouze `/sitemap.xml`, což není úplný průzkum všech sitemap. [Specifikace sitemap](https://www.sitemaps.org/protocol.html)

Stejně tak model nemůže zjistit datum či zrušení, které není v titulku a popisu. Jev lze krmit krátkým relevantním výřezem konkrétní stránky DOD včetně okolí data; zákaz číst článek by uměle omezil úplnost. Kandidáty dat má vybírat kód, model hodnotit vazbu na konkrétní akci. Jediný globální stav článku nestačí, pokud jeden termín ruší a druhý potvrzuje.

Exa nebo jiná služba je volitelný způsob získávání obsahu, nikoli další autorita o termínu. Bez ověření čerstvosti a úspěšnosti na našich stránkách ji nelze považovat za vyřešený zdroj. Přímý čtenář a externí služba se mají porovnat podle skutečně získaných aktuálních DOD.

### H5 — Jev je vhodný kandidát, ale navržená přejímka obsahuje slepé místo

Oficiální dokumentace potvrzuje typované odpovědi a pravděpodobnosti; zároveň výslovně upozorňuje, že kalibrace nezaručuje správnost jednotlivé odpovědi. [TypeSafe System One](https://docs.typesafe.ai/concepts/system-one)

Cena 0,042 USD za milion vstupních tokenů skutečně podporuje levný experiment. Náklad z jiného pilotu ale nelze přímo přenést na jiný počet otázek a délku textů; 624 položek je vzorek, nikoli celý budoucí archiv. [OpenRouter Jev 1.13](https://openrouter.ai/typesafe/jev-1.13)

Podstatnější problém: **označit pouze neshody modelu s pravidly nezměří úplnost.** Obě metody mohou stejnou pozvánku přehlédnout. Pro úplnost vůči webům je navíc třeba zachytit i zprávy, které vůbec nejsou v našem vstupním archivu. Model může označování pomoci, nesmí tvořit neověřenou referenci svým souhlasem s pravidly. Pro první přejímku doporučuji malý, předem vybraný vzorek školních stránek s úplnou referencí DOD, včetně negativních případů; oddělit jej od ladění prahů na 109 párech.

Zachovat verzování modelu, offline odpovědi a neutrální odkazy při nejistotě. Klíč cache musí zahrnovat také otázky/prompt, parametry a verzi předzpracování, nejen otisk karty. Kontrola typu odpovědi ani datum nalezené v textu samy nechrání před chybným sémantickým rozhodnutím modelu. Kód má ověřovat pozitivní vazbu událost–datum–konání a aktuální platnost; tuto vazbu je stále nutné měřit na konečném výstupu.

### H6 — Pracnost a časový tlak jsou nadsazené argumenty

Hlavní RSS návrh už v oddílu 4 výslovně přebírá existující servisní infrastrukturu. Odhad 2–3 dny v oddílu 6 se týká schématu, formuláře, fronty a kouřové zkoušky. Nelze tedy tvrdit, že vznikl pro stav bez databáze. Starý dokument sledování škol opravit ano; zkrácení odhadu znovu posoudit podle zbývající práce.

Také nesplnění 1. října automaticky neznamená ztrátu celé sezóny říjen–leden a odklad o rok. Pro sběr sezónního benchmarku není nutné mít hotové veřejné karty ani e-maily. Je rozumné spustit ukládání zdrojů co nejdříve a přejímku zobrazení dokončit souběžně.

Dokument má navíc rozpory v pořadí kroků: oddíl 5 nazývá obecnou čtečku „krokem 1“, zatímco aktuální tabulka P2 má na prvním místě portál; jednou P1 označuje za rozhodnuté, jinde za neuzavřené. Před realizací sjednotit stav rozhodnutí a číslování.

## 4. Co konkrétně změnit v návrhu a pořadí prací

1. **První produktový výstup: aktuální DOD.** Evidovat školu, konkrétní událost/termín, stav, zdrojové URL, čas získání a ověření, verzi interpretace. Ukazovat původ a rozlišovat „termín jsme nenašli“ od „škola DOD nepořádá“.
2. **Spustit sběr a ukládání hned.** RSS a portál doplnit časným pilotem přímých stránek DOD/aktualit; sitemap použít pro objevování a prioritizaci. Pravidelně kontrolovat také změny již známých pozvánek. Nevázat sběr benchmarku na spuštění UI.
3. **Jev vyhodnotit souběžně s pilotem zdrojů.** Zbytečně neodkládat schválenou modelovou variantu až za další rozsáhlé ladění slovníků. Měřit správně zobrazené termíny a záchyt vůči zdrojovým stránkám; pravidla ponechat pro kandidáty a neutrální odkazy.
4. **Před termínovými kartami opravit H1 a vztahy mezi zdroji.** Uplatnit pozitivní konání, časovou platnost, opravy a zrušení. Zpřesnit a ověřit cache kontrakt podle páté oponentury. Model tyto podmínky neruší.
5. **E-maily jako další rozšíření.** Využít společný odesílač, doplnit školní odběry a přejímku DOD. Při zúženém rozsahu nemusí DOD čekat na benchmark talentových zkoušek; ty prostě nebudou povoleným e-mailovým typem. Zachovat opravy podle skutečně doručené informace.
6. **InspIS profilový scraper oddělit od kritické cesty.** Je přínosný pro jiná pole, ale nový výslovný cíl sám o sobě neospravedlňuje jeho prioritu před DOD.

Měřítkem úspěchu má být podíl škol s nalezeným správným aktuálním DOD, úplnost oproti referenčním stránkám a prodleva od zveřejnění či opravy ke změně na našem webu. Počet nalezených feedů nebo klasifikovaných článků jsou pouze pomocné metriky. Šedesátisekundová cache neříká nic o hodinách čekání na další sklizeň; cílovou aktuálnost je nutné posuzovat přes celý řetězec.

**Provoz zůstává autonomní:** systém sám získá obsah, vyhodnotí konkrétní termín a jeho platnost, zveřejní jej nebo automaticky zůstane u zdrojového odkazu. Jednorázová reference ve vývoji není schvalování novinek. Dokument tedy mění hlavně rozsah a priority sběru; neruší nutnost dokončit ověření odvozených tvrzení.

## 5. Rozsah této kontroly

Čten aktuální přehled v1.1, související části návrhu RSS, pátá oponentura, skript sondy cest k novinkám, uložené souhrny obou nových sond, publikační funkce a lokální zápis pilotu Jev v `patrick-knowledgebase/tools/typesafe-jev.md`. Zopakované tři koncové reprodukce jsou uvedeny v H1. Ověřena veřejná dokumentace TypeSafe, stránka modelu OpenRouter a specifikace sitemap.

Nebylo provedeno nové plošné stahování škol, placený pilot modelu ani produkční zkouška cache. Čísla nových sond zde potvrzuji jako obsah uložených podkladů, nikoli jako nezávisle zopakované živé měření. Původní návrh ani aplikační kód jsem neměnil.
