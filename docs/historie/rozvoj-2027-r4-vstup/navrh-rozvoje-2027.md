# Návrh rozvoje Přijímaček na školu pro přijímací řízení 2027

**Verze 2.3.1 — dodatek k R3, 11. 9. 2026.** O-21 je po [opravě a veřejné přejímce náhledů](oprava-og-nahledu-2027.md) uzavřené. Stav: revidované zadání k další oponentuře. Nejde o potvrzení opravy produkčního simulátoru ani o schválení dosud otevřených produktových voleb.

Sekce 1 a úvod sekce 2 zachycují audit před dodávkou `c9ae452`; aktuální návrh v sekcích 3–9 je upraven podle zjištění R1 a R2. Úplné [původní znění](historie/rozvoj-2027-r0/navrh-rozvoje-2027.md) je zachováno. Každá připomínka O-1 až O-14 a obě přílohy mají [vypořádání níže](#vyporadani-r1), včetně nesouhlasu a důkazů. Historie a pravidla dalšího kola jsou na konci.

Kalendář a obnova prvního kola 2026 jsou nasazené; podrobnosti uvádí [záznam dodávky](aktualizace-kalendar-data-2027.md). [PRD Můj výběr v0.7.1](prd-muj-vyber-2027.md) rozlišuje hotové a navržené části. **O-13 zůstává otevřeným produkčním blokátorem:** odstranění zavádějících výstupů simulátoru je první opravná dodávka nezávislá na budoucí integraci Mého výběru. O-4 je navazující technický dluh. [Vypořádání R3](#vyporadani-r3) zachycuje stav při uzavření dokumentačního kola; následný dodatek §15 uzavírá O-21 po opravě aplikace a nasazení. O-19 zůstává uzavřené.

Doporučení: po opravné dodávce pokračovat ověřenými profily a Mým výběrem. Do návrhu profilů přidat historii JPZ 2017–2023 a maturitní výsledky školy jako oddělené datové oddíly. Výzkum návaznosti vstupu a výstupu ověřit samostatně; propojení agregátů přes školu samo nedokládá kohortu ani přidanou hodnotu.

## 1. Výchozí stav před obnovou — historický audit

Prověřen lokální checkout na commitu `c17d42e` z 21. 6. 2026, důležité importy, datové soubory, veřejná hlavní stránka a červencové PRD přípravy. Nejde o úplný audit všech cest aplikace ani o kontrolu provozních analytik.

- Next.js 16, React 19, TypeScript a Tailwind. Velká část obsahu vychází ze souborů JSON.
- Vyhledávání a profily škol, srovnání oborů, simulátor podle bodů, kalkulačka „Moje šance“, regiony a města, průvodce výběrem, dojezdovost a informace ČŠI/InspIS.
- `schools_data.json`: 2 721 záznamů pro rok 2024 a 2 837 pro rok 2025. Nejde o počty samostatných škol.
- `applications_2026.json`: 3 087 záznamů, metadata odkazují na aktualizaci CERMAT z 8. 3. 2026. Jde o reálný import; přítomnost starého skriptu pro generování odhadů nedokazuje, že se dnes používají odhadovaná data.
- `cermat_results_2026.json`: 3 080 záznamů, 1 104 různých REDIZO. Export obsahuje zejména průměry přijatých, nevyužívá všechny dostupné ukazatele zdroje.
- Existují naplánované GitHub workflow pro ČŠI a InspIS. Jejich přítomnost není důkazem, že aktualizace pravidelně prošly a dostaly se do veřejného webu.
- `docs/prd-priprava-na-jpz.md` z 10. 7. 2026 už popisuje diagnostiku, plán, vlastní úlohy, AI tutora a rodičovský přehled. Termín MVP 31. 8. 2026 již uplynul. Implementaci tohoto modulu jsem v prohlédnutých cestách checkoutu nenašel; případné samostatné nasazení nebylo ověřeno.
- Databázi kontaktů uvedenou v zadání beru jako existující vstup mimo nalezené projektové soubory. Její rozsah, role adresátů a oprávnění k rozesílce nebyly ověřeny.

Na [veřejné hlavní stránce](https://www.prijimackynaskolu.cz/) přetrvává květnový obsah 2026. Číslo 3 080 je označeno jako počet škol, přestože lokální export počítá obory/zaměření. Titulek o tom, kolik bodů stačilo, odkazuje na průměr přijatých. Tyto dva významy je potřeba rozlišit. Text o sportovních školách také potřebuje opravu: gymnázium se sportovní přípravou má JPZ i talentovou zkoušku podle [sdělení MŠMT](https://msmt.gov.cz/media/wp-content/uploads/2026/08/Sdeleni-o-terminech_2026-2027.pdf).

## 2. Dostupná data a poslední dění

### Výsledky 2026 — původní podklad obnovy, již realizováno v rozsahu dodávky

CERMAT označuje agregované výsledky obou kol 2026 platností k 17. 8. 2026. K dispozici jsou také přihlášky a kapacity obou kol. [Katalog agregovaných dat](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/agregovana-data-jpz.html)

Stažený soubor prvního kola má 6 368 datových řádků a 1 337 různých REDIZO. Obsahuje i učební obory a konzervatoře. Soubor druhého kola má 2 707 datových řádků. Rozdíl proti webu zčásti plyne z jeho záměrného filtru na denní nezkrácené studium s JPZ.

Srovnání současného exportu s novým souborem při použití současné importní funkce:

| Kontrola | Výsledek |
|---|---:|
| Společné klíče | 3 073 |
| Změněný počet přijatých | 676 |
| Změněný průměr ČJ+MA přijatých | 1 254 |
| Nové klíče po současném filtru | 3 |
| Původní klíče bez protějšku po současném filtru | 7 |

To dokládá potřebu obnovy. Nejde o změnu skutečného počtu škol: současný import zahazuje i řádky bez kladného průměru a spojuje je klíčem odvozeným z názvu zaměření. Zdroj: [výsledky prvního kola 2026](https://data.cermat.cz/files/files/JPZ/agregovana_data_skoly/PZ2026_kolo1_skolobory_vysledky.xlsx). Postup a kontrolní součty jsou v `docs/podklady/rozvoj-2027-audit.json`.

CERMAT po dvou kolech uvádí přijetí přibližně 98 % deváťáků. U všech uchazečů do čtyřletých a kratších oborů je to 94,1 %, v Praze 88,8 %. Jde o různé populace. Z toho vyvozuji, že produkt má řešit zejména vhodnost dostupné školy a regionální rozdíly, současně zachovat podporu rodin, které přijetí stále řeší. [Souhrn CERMAT po druhém kole](https://data.cermat.cz/aktuality/vysledky-2-kola-prijimacich-zkousek-2026.html)

### Doplnění inventury R1: historie JPZ a maturitní výsledky

Ověřeno stažením všech sedmi školních agregátů JPZ 2017–2023. Obsahují percentilové výsledky konajících; údaj o přijetí na konkrétní školu v nich chybí. Uchazečské soubory s přihláškami a přijetím jsou dostupné od 2024. Staré a nové řady nelze spojit do jedné osy bodů přijatých. [CERMAT — agregáty JPZ](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/agregovana-data-jpz.html), [popis uchazečských dat](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska.html).

Inventura MZ byla neúplná: existují výsledky společné části po škole a skupině SMO16. Katalog nyní nabízí jaro 2015–2026 a stav po podzimním období 2015–2025. Podzimní soubor má označení `jap`, nikoli `p`, a není samostatným podzimním termínem. Staženy a rozebrány vzorky 2026j a 2025jap; úplný historický import MZ neproběhl. [CERMAT — MZ](https://data.cermat.cz/maturitni-zkouska/agregovana-data.html).

Rozbor `MZ2026j` potvrdil 3 739 fyzických řádků včetně dvou hlaviček, 98 sloupců, 1 112 řádků `redizo` a 2 297 `redizo_smo16`. Vysvětlivky určují populaci prvomaturantů. MZ společná část není výsledkem celé maturity včetně profilové části. Identita školy nenahrazuje identitu oboru; stejný školní agregát nesmí být prezentován jako vlastní výsledek každého KKOV. Kontrolní součty, počty a vzorky jsou v [podkladech R1](podklady/oponentura-2027-r1.json).

### Pro rok 2027 už existují závazné termíny

| Událost | Termín |
|---|---|
| Kritéria konzervatoří | 15.–31. 10. 2026 |
| Přihlášky na konzervatoře | 1.–30. 11. 2026 |
| Kritéria středních škol | 15.–31. 1. 2027 |
| Přihlášky na střední školy | 1.–22. 2. 2027; konec lhůty se posouvá z víkendu |
| JPZ, čtyřleté obory včetně nástaveb | 12. a 13. 4. 2027 |
| JPZ, šestiletá a osmiletá gymnázia | 14. a 15. 4. 2027 |
| Náhradní JPZ | 29. a 30. 4. 2027 |
| Výsledky prvního kola SŠ | 14. 5. 2027 |
| Přihlášky druhého kola | 19.–24. 5. 2027 |
| Výsledky druhého kola | 22. 6. 2027 |

Zdroje: [sdělení o JPZ](https://msmt.gov.cz/media/wp-content/uploads/2026/08/Sdeleni-o-terminech_2026-2027.pdf) a [harmonogram MŠMT, tabulky na stranách 1–3](https://msmt.gov.cz/media/wp-content/uploads/2026/08/Casovy-harmonogram_2026-2027.pdf). Uvedené lhůty je před sezónní publikací potřeba znovu ověřit proti případným opravám ministerstva.

Od 1. 9. 2026 se mění zejména režim konzervatoří a digitalizace doporučení poradenských zařízení, včetně kategorie VJ. Výpis jako způsob podání byl zrušen již pro předchozí sezónu. Ve druhém kole mohou do oboru s povinnou JPZ i uchazeči bez vykonané JPZ, dostávají za ni nulu. Průvodce musí rozlišit novou změnu od pokračujícího pravidla. [Metodika MŠMT z 18. 8. 2026, strany 1 a 14](https://msmt.gov.cz/media/wp-content/uploads/2026/08/Metodika_prijimaci-rizeni_2026-2027.pdf)

Nabídku a kapacity 2027 nelze vydávat za kompletní jen na základě historie 2026. Rejstříkové oprávnění vyučovat obor není vyhlášením přijímacího řízení do tohoto oboru.

### Návštěvnost A1: ověřený dopad na priority

[Analýza v1.1](analyza-navstevnosti-2026.md) reprodukuje Matomo pro 11. 2.–11. 9. 2026: 25 762 návštěv a 44 527 zobrazení stránek. Dvě adresy simulátoru mají 4 062 zobrazení a 2 652 vstupů; školní profily a podstránky pod `/skola/` mají v úplném exportu 14 462 zobrazení. Telefony/phablety tvoří 65,4 % návštěv. Populace jsou relace měření, nikoli děti či rodiny.

To potvrzuje opravu S0 a podporuje uložení konkrétního oboru přímo z profilu, hledání a opraveného simulátoru. Mobilní průchod je blokující podmínkou vydání. Předpokládaný zájem o nový obsah profilů, přípravu nebo sdílení se musí ověřit úkony, nikoli jen nynějšími návštěvami.

Původní analýza obsahovala záměny návštěv/akcí/zobrazení a několik nedoložených interpretací; jejich kompletní vypořádání je v analýze v1.1 §9. Přímé vstupy nedokazují znalost značky, 8,4 % návštěv připsaných AI asistentům nedokládá účinek `llms.txt` a dostupná data neprokazují listopadový růst. Zachovat SEO a ověřovat distribuční pilot značenými odkazy. Doporučený nejzazší termín S0 **31. 10. 2026** vychází z kalendáře přihlášek na konzervatoře; opravu připravit nyní, nečekat na tento termín.

## 3. Co bych opravil před rozšiřováním

**Opravná dodávka S0 — simulátor (O-13), před implementací Mého výběru.** Aktuální `src/app/simulator/SimulatorClient.tsx` kategorizuje rozdíl proti `min_body_2025` pomocí ±10 bodů jako vysokou/malou šanci. Vada je doložena i ve veřejně doručovaném JS. Zrušit tyto predikční kategorie, souhrny, filtrování a doporučování odvozené z nedoložené hranice. Nenahrazovat je jinou konstantou ani pouhým upozorněním. Zachovat hledání a ověřená historická fakta; u osobního porovnání bez srovnatelného údaje zobrazit „Pro toto porovnání nemáme ověřený údaj“.

Prověřit API `src/app/api/schools/search/route.ts` a jeho zpracování v simulátoru i souběžné odvozování v `src/lib/data.ts`: význam `min_body`, převody škál, minima jednotlivých předmětů, vazbu na konkrétní zaměření a odvozování `extra_body`. Rozdíl minim neurčuje další školní kritéria a `Math.max` dvou metodicky různých hodnot není validací. Školní body se mohou zobrazit až ze skutečných kritérií školy pro daný rok; bez nich zůstávají neznámé.

**OG obrázky po R3:** O-19 (HTTP 500) i O-21 (obsah a vzhled) jsou opravené a veřejně ověřené. O-21 dodal PR #72; podrobnosti v §15. Neplánovat znovu změnu runtime ani opravu překrytí a fontů. Obnovení konkrétního náhledu v cache sociální sítě je samostatná neověřená distribuční kontrola.

**Podmínky uzavření S0:** zkontrolované API a všechny větve rozhraní včetně vybraných oborů, doporučení a sdílených URL; ověření chybějících hodnot a více zaměření jedné školy; vhodné regresní testy, build a kontrola mobilu/desktopu; po nasazení kontrola veřejného výsledku. Samotná změna textu návrhu O-13 neuzavírá.

**Technický dluh O-4:** odstranění nepodložených `estimatedChancePct`, `estimatedMinScore`, kategorií a rizika kombinace z výpočtového rozhraní `chances.ts`. Zobrazené historické podíly a poptávka zůstávají popisné. Podmínkou uzavření je kontrola všech konzumentů a test, že veřejné rozhraní nevrací osobní predikci. Nyní se predikce v Moje šance nevykreslují, ale výpočet není odstraněn.

**M0 — ověřit měření před hodnocením nových funkcí.** V kódu je jen úvodní `trackPageView`; v Matomo je report vlastních událostí prázdný. Nevyvozovat z toho nezájem o funkce. Ověřit klientské přechody Next.js včetně zpět/vpřed a zabránit dvojímu měření. Definovat úspěšné uložení, porovnání, zálohu a sdílení s jasným jmenovatelem a povolenými vlastnostmi bez soukromého obsahu či tokenů. M0 neodkládá odstranění vad v S0; blokuje vyhodnocení míry použití nového rozhraní, dokud nejsou události ověřené. Přijímací postup a limity jsou v analýze v1.3 §7, §10 a §11. M0 zahrne oba přítomné trackery (Matomo i Vercel), zejména navigaci a odstranění tajných částí URL. Číselný rozdíl mezi výpisy není bez důkazu chybou klienta ani vysvětlený jen dnešním provozem. Rutinní čtení Matomo už je implementované podle [návodu](matomo-pristup.md); měření aplikace v této revizi opravené není.

**Zachovat rok u každé informace.** Výsledky 2026, kapacita potvrzená pro 2027 a historické školné nesmějí působit jako údaje ze stejného období. Chybějící hodnota není nula. Historické minimum není předpověď příští hranice a samo o sobě nereprodukuje školní pořadí.

**Párování: zachovat zaměření a kontrolu jednoznačnosti (O-5).** Normalizace zápisu zaměření a odmítnutí kolizí již jsou v `school-key.ts` a v městských přehledech. Přímé porovnání ID už nepopisuje tuto produkční cestu. Na 2 808 jedinečných historických ID je 1 425 přesných shod, ale 2 728 existujících základních klíčů není 2 728 správných vazeb. U 407 historických ID má základní klíč více výsledkových kandidátů. Protipříklady uvádí vypořádání O-5.

Krátkodobě ponechat jednoznačnou normalizovanou shodu; chybějící vazby nabídnout správci dat jako kandidáty. Dvojici REDIZO + KKOV lze použít k vyhledání kandidátů, nikoli k automatickému sloučení. Ani jediný kandidát v obou ročnících sám nepotvrzuje totožnost zaměření, místa nebo formy. Automatickou novou vazbu podmínit ověřenými atributy či doloženým přejmenováním; nejednoznačné nechat nespárované. Samostatně navrhnout identitu nabídky se zdrojovými ID a historií změn. Metrikou je správnost na doložených případech, nikoli jen procento nalezených klíčů.

**Historické importy (O-6).** Původní heuristika byla v `scripts/import_cermat_results.py` na commitu `c17d42e`, ne v `import_cermat_2026_real.py`. V dodávce `c9ae452` byla nahrazena kontrolou hlavičky; produkční obnovu řídí `refresh_cermat_data.py`. Nové adaptéry pro JPZ 2017–2023 a MZ musí poznat datový list podle povinných hlaviček, rozlišit víceřádkové předmětové hlavičky a souhrny, ověřit rok, populaci a jednotky. Neznámý formát odmítnout před zápisem. Stávající importéry nelze bez ověření použít na nové datové rodiny.

## 4. Jak má vypadat produkt pro dítě

Navrhuji jednu navazující cestu: zájmy a omezení → širší výběr → návštěvy a porovnání → pořadí přihlášek → příprava → kontrola termínů a výsledků.

### „Můj výběr 2027“

Podle schváleného D1 žák začne okamžitým uložením oboru. Volitelná cesta „Pomoz mi s výběrem“ se ptá na zájmy, druh studia, dojíždění, internát a školné. Návrh 6–10 kandidátů je možný výstup průvodce, nikoli povinný počet uložených oborů. Skóre v testu nesmí předčasně uzavřít cestu k oboru, který ho zajímá.

Ke každému kandidátovi uvést:

- proč odpovídá zadaným preferencím;
- co se tam učí a jaké možnosti pokračování má absolvent;
- skutečné místo výuky, dopravu ráno i zpět a přestupy;
- náklady, ubytování, podporu při studiu a dostupná fakta o prostředí;
- pravidla přijetí pro 2027 a jejich zdroj;
- datum otevřených dveří, vlastní poznámky a nezodpovězené otázky.

Použít dosavadní profily ČŠI/InspIS a dojezdovost. Před rozšířením dopravy ověřit platnost jízdních řádů, školní dny a pokrytí regionu. Pokud přesný spoj není ověřen, uvést odkaz pro kontrolu, nikoli falešně přesný čas.

Srovnání 3–5 oborů má být společné pro dítě a rodiče, s možností exportovat stručný přehled pro výchovného poradce. Ukládání začíná bez účtu v prohlížeči. D2 zahrnuje v první veřejné verzi volitelný jednoduchý účet bez hesla a odkaz k náhledu bez dalších rodinných účtů; technická implementace zatím neproběhla. Počet kandidátů ke srovnání se nemusí rovnat počtu povolených přihlášek.

Pořadí přihlášek má odpovídat skutečné preferenci. Vyšší priorita nedává přednost před uchazečem s lepším výsledkem školního hodnocení. Produkt má pomoci rozšířit přijatelný výběr, nikoli přesouvat nechtěnou „jistotu“ na první místo. [Metodika přiřazování, strana 12](https://msmt.gov.cz/media/wp-content/uploads/2026/08/Metodika_prijimaci-rizeni_2026-2027.pdf)

### Přehledy, které nová data umožňují

| Otázka rodiny | Navržený přehled | Podmínka správné interpretace |
|---|---|---|
| Kde byla skutečná konkurence? | Přijatí, nepřijatí pro kapacitu, nesplněné podmínky a přijatí na vyšší preferenci | Samotné přihlášky dělené kapacitou nejsou osobní pravděpodobnost |
| Jak se obor mění? | Kapacity, zájem a výsledky 2024–2026; samostatně historie JPZ 2017–2023 | Historie konajících v percentilech a novější výsledky přijatých mají různé populace a škály |
| Jak si škola vede u maturity? | Výsledky společné části MZ za školu / SMO16, po letech a předmětech | Uvést populaci prvomaturantů, období, velikost skupiny a účast; nepřipsat agregát konkrétnímu zaměření |
| Jaké další školy stojí za návštěvu? | Obory často zvažované společně, omezené dojížděním a zájmy dítěte | Popularita není důkaz vhodnosti; agregovat dostatečně velké skupiny |
| Co s výsledkem cvičného testu? | Historické rozdělení skóre a předmětový profil přijatých | Rozlišit typ a rok testu, vzorek i školní hodnocení |
| Kde bývalo druhé kolo? | Historická nabídka a naplnění druhého kola | Historie není aktuální volné místo |
| Co po absolvování oboru? | Návazné studium a uplatnění podle skupiny oborů | Nepřisuzovat oborový údaj konkrétní škole |

Pro společné volby a rozdělení výsledků jsou dostupná anonymizovaná data po uchazečích za 2026. Jejich popis upozorňuje, že zachycují stav při oznámení výsledků, bez pozdějších vzdání se přijetí. Nekombinovat je bez označení s pozdějšími agregáty. [Datové soubory CERMAT](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/datove-soubory.html)

Pro uplatnění už existují údaje o nezaměstnanosti absolventů v dubnu 2026. Jde o kontext oborových skupin, nikoli prognózu kariéry dnešního deváťáka. [NPI – Infoabsolvent](https://www.infoabsolvent.cz/Temata/ClanekAbsolventi/5-1-05/Nezamestnanost-absolventu-skupiny-oboru-vzdelani/12)

Nezavádět jedno celkové skóre kvality školy (O-11). Maturitní data využít pro popis školy s kontextem, nikoli automaticky pro pořadí škol.

**Ověřovací studie vstupu a výstupu (O-1/O-3):** připravit analytický pilot školních agregátů JPZ 2022 a MZ 2026, nejprve jen s ověřenými čtyřletými režimy a mapováním oborových skupin. Není to zatím sledování stejné kohorty: JPZ obsahuje konající uchazeče, ne doložené nastoupivší žáky. REDIZO může spojit instituci, nikoli odchody, přestupy, opakování, změny školy ani skutečnou vstupní úroveň maturantů. Obecný posun o čtyři roky neplatí pro šestiletá/osmiletá gymnázia a nástavby.

Pilot má doložit pokrytí, definice populací, srovnatelnost jednotek, výběrovost volby matematiky/jazyka, změny institucí a citlivost na vyloučení covidových ročníků či malých skupin. Nesčítat školní a oborové agregáty. Analytik před modelováním určí validační protokol a oddělená data pro ověření; posouzení metodikem je podmínkou publikace modelového výstupu. Případný rozdíl proti očekávání označit nejvýše jako popisnou asociaci, dokud není doložena návazná populace a identifikační předpoklady. Prostý rozdíl percentilů není přírůstkem znalostí. Výstup pilotu může být i rozhodnutí model nepublikovat. Popisné profily lze připravovat souběžně.

## 5. Příprava na JPZ: začít rozborem chyb

CERMAT již nabízí bezplatné historické testy, tematické procvičování a TAU. Naše přidaná hodnota má být ve výběru dalšího úkolu, vysvětlení chyby a propojení s osobním cílem. [Přijímačky bez obav](https://prijimacky.cermat.cz/menu/jednotna-prijimaci-zkouska/prijimacky-bez-obav.html)

### První použitelná verze

1. Žák vyřeší vybraný oficiální test dostupný přes odkaz na CERMAT nebo vlastní schválenou sadu.
2. Zapíše body a označí problematické úlohy. U každé zvolí například neznalost, nepochopení zadání, chybný postup nebo nedostatek času. Klasifikaci podle odpovědi potvrzuje žák; systém ji nevydává za jistou diagnózu.
3. Dostane tři priority na příští týden a krátké aktivity podle svého času.
4. Po týdnu ověří přenos dovednosti na jiné úloze stejného typu.
5. Pravidelně absolvuje celou simulaci na dosud neviděném testu. Pokrok sledujeme odděleně od nacvičených otázek.

Příklad návrhu výstupu: „V práci se zlomky máš opakované chyby. Tento týden procvič třikrát po 15 minutách převod a porovnávání; příště ověříme i slovní úlohu.“ Konkrétní doporučení musí vycházet z odpovědí dítěte, ne z národní četnosti chyb.

Agregované položkové výsledky 2026 obsahují úspěšnost, volby chybných odpovědí a vynechání úloh. Ověřeny byly sešity češtiny a matematiky pro čtyřleté obory. To umožňuje sestavit mapu obtížnosti a zásobník typických omylů. Samotné vynechání však nedokazuje časovou tíseň a národní obtížnost se automaticky nepřenáší na novou AI úlohu. [Rozbory úloh CERMAT](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/agregovana-data-jpz/agregovane-vysledky-uloh-jpz.html)

Položkové statistiky evidovat podle roku, předmětu, délky studia, varianty/termínu a ID podúlohy. Ověřená hodnota 36,8 % pro `01.3` je z listu `m4a` (první řádný termín), stejně jako 93 358 konajících a průměr 41,25 %; není to souhrn všech variant roku 2026. Tyto údaje popisují výsledek skupiny, neopravují odpověď dítěte. Před zveřejněním odvozeného obsahu evidovat podmínky využití konkrétního datasetu; označení „agregovaná data“ samo o sobě není právním titulem k libovolnému převzetí.

### Jak upravit existující PRD

- Zachovat první cílovou skupinu: deváťáci a čtyřleté maturitní obory. Výběr škol může být širší než rozsah přípravného modulu.
- Přeplánovat prošlý termín a rozdělit vydání na rozbor/plán a následně vlastní úlohy s tutorem.
- Zachovat dvoustupňovou diagnostiku. Po krátkém screeningu ukazovat předběžný profil; označení „kalibrovaný“ použít až po ověření přesnosti na skutečných výsledcích.
- Zachovat bezplatný pilot a případnou pozdější jednorázovou platbu za rozšířený obsah. Ceny zatím nemají oporu v ověřené poptávce.
- Digitální produkt doplnit doporučením řešit celé oficiální testy na papíře přes původní odkazy. Rýsování a práci se záznamovým archem samotné klikání nenacvičí. Je to návrh rozšíření proti původně čistě digitálnímu PRD.
- Podporu SVP a uchazečů s odlišným jazykem zahrnout alespoň do informačního průvodce a dostupnosti rozhraní. Specifické testové režimy vyžadují vlastní odborné ověření a nemusí být v prvním pilotu.
- Rodiči poskytovat přiměřený souhrn pokroku. Registraci, vazbu na dítě a uchovávání dat navrhnout před zavedením účtů; dítěti srozumitelně ukázat, kdo co uvidí.

AI tutor má pracovat se schválenou úlohou a řešením, nabídnout nápovědu a reagovat na konkrétní chybu. Body přiděluje definované hodnocení. U nejednoznačných otevřených odpovědí se systém zdrží rozhodnutí. Každá nová úloha potřebuje učitelskou kontrolu, pilotní odpovědi a možnost rychlého stažení.

Převzetí testů a klíčů CERMAT do vlastní aplikace nelze automaticky odvozovat z jejich veřejné dostupnosti. Podmínky povolují odkazování; pro další zpřístupnění testové dokumentace stanovují omezení. První verze pracuje s odkazy a vlastním obsahem: žák kontroluje test proti klíči na webu CERMAT a sám zadá body či problematické úlohy. Aplikace nepřebírá klíč, zadání ani automaticky neopravuje odpovědi na oficiální test. Případné jiné užití vyžaduje samostatně doložené oprávnění; veřejná dostupnost není licence. [Pravidla CERMAT](https://prijimacky.cermat.cz/files/files/CZVV_pravidla-vyuziti-webstrankyp.pdf)

## 6. Kontakty na školy využít pro ověřování i distribuci

Navrhuji pilot 50–100 SŠ různého typu a regionu. Škole nabídnout předvyplněný profil a stručný přehled jejího přijímacího řízení. Požádat o kontrolu konkrétních údajů pro 2027: vypsané obory, plánovaná/potvrzená kapacita, místo výuky, školné, otevřené dveře, přípravné akce, ubytování a odkaz na kritéria.

Opravy přijímat formulářem přes ověřený kontakt. Změny projdou moderací, u každého údaje zůstane zdroj a datum. Školní prezentace nesmí přepisovat oficiální výsledky ani inspekční závěry. Označení „potvrzeno školou dne…“ vyjadřuje původ údaje, ne hodnocení kvality.

Pracovní návrh sdělení pro oprávněné adresáty:

> Předmět: Kontrola údajů vaší školy pro přijímání 2027
>
> Připravujeme přehled oborů a přijímacího řízení pro rodiny vybírající střední školu. Na vašem profilu jsme předvyplnili dostupné informace. Prosíme o kontrolu nabídky pro rok 2027, termínů otevřených dveří a odkazu na kritéria. Změny můžete navrhnout přímo ve formuláři u profilu. K dispozici budete mít i odkaz na souhrn zveřejněných dat vaší školy.

Pro pravidelné novinky rozdělit publikum: SŠ opravují profily a publikují akce, základní školy a poradci distribuují rodinám průvodce a přípravu. Databáze SŠ automaticky nezajišťuje distribuční síť mezi deváťáky. Doplnit tedy partnerství se ZŠ a poradci.

Před marketingovou rozesílkou rozlišit souhlasy, existující vztahy a pouze veřejné kontakty. Veřejná adresa sama neopravňuje k obchodním sdělením, včetně sdělení právnickým osobám; posoudit konkrétní účel a obsah pilotu. Evidence odhlášení má být společná všem kampaním. [ÚOOÚ – obchodní sdělení](https://uoou.gov.cz/index.php/profesional/qa-otazky-a-odpovedi/obchodni-sdeleni)

Měřit dokončené kontroly profilů, opravené údaje, stáří informací a návštěvy z materiálů škol. Otevření e-mailu samo nepotvrzuje užitek. V této práci nebyly e-maily rozesílány.

## 7. Datový základ pro opakovatelnou aktualizaci

Návrh modelu odděluje školu a místo výuky, oborovou nabídku, sezónu a kolo přijímání, kritéria a statistický snímek. Je to návrh k ověření, nikoli přijaté architektonické rozhodnutí.

U každého importu ukládat zdrojovou URL, kontrolní součet, datum stažení, datum platnosti, rok, kolo, význam ukazatele, jednotku a populaci. Ve veřejném rozhraní ukazovat čitelné datum a zdroj. U nabídky 2027 rozlišit „historie 2026“, „plán školy“ a „vyhlášeno pro 2027“.

Neprovádět globální nahrazení 2026 za 2027. Výsledkové stránky zachovat jako archiv. Ze sezónní konfigurace řídit kalendář a nabídku. Výsledky roku 2027 budou dostupné teprve po příslušných událostech.

Doporučené kontroly před publikací:

- jednoznačnost klíčů, ztracené a nové obory, pokrytí typů studia;
- zdrojové součty a oddělení uchazečů od přihlášek;
- jednotky, chybějící hodnoty a oddělené populace pro předměty;
- párování přejmenovaných nebo rozdělených nabídek;
- vzorek profilů napříč typy škol, cizojazyčnými a upravenými testy;
- ověření veřejného výsledku po aktualizaci, včetně městských souhrnů a titulků.

Pro osobní odhad nejprve připravit zpětné ověření na dosud nepoužitém ročníku: pravidla navrhnout na 2024–2025, vyhodnotit na 2026, bez použití výsledků 2026 při trénování. Rozlišit „přijat jinam dle preference“ od zamítnutí pro kapacitu. Dokud nezískáme a neověříme školní kritéria a kalibraci, publikovat historická pásma a scénáře místo osobního procenta. U malých vzorků zobrazit nedostatek dat. Percentily pomohou kontextu ročníku, samy nezaručují srovnatelnou obtížnost ani příští přijetí.

## 8. Pořadí realizace a odhad kapacit

Původních 26–39 člověkodnů A–C je historický odhad před dodávkou, nikoli zbývající práce ani naměřená spotřeba. Je zachován v neměnném snímku R0. Nový odhad zbytku R1 níže je pracovní předpoklad pro jednoho vývojáře, součinnost správce dat a kontrolu změněných cest. Zpřesnit po návrhu datového modelu a ověření účtů; čekání na školy není zahrnuto.

| Pořadí / balík | Zbývající obsah | Pracovní odhad |
|---|---|---:|
| S0 — současná zavádějící doporučení | O-13 celý tok simulátoru + odstranění mrtvých predikcí O-4; kontrola a nasazení | 2–4 člověkodny |
| O-19 — dostupnost OG obrázků | Opraveno a ověřeno v R3 | Hotovo, znovu nepočítat |
| O-21 — obsah a vzhled OG obrázků | Opraveno a veřejně ověřeno po R3, viz §15 | Hotovo, nezapočítávat do zbývající práce |
| M0 — měření | Ověření a základ opravy navigačního měření; definice událostí nových funkcí, jejich realizace patří do C | 1–2 člověkodny navíc |
| B — data a profily | Identita nabídky, nepokryté obory, stavy 2027, ověřování školou a moderace; bez zopakování obnovy prvního kola a kalendáře | 8–13 člověkodnů |
| C — Můj výběr | Ukládání, porovnání, plán, účet bez hesla, záloha a náhled; dle uzavřeného PRD | 10–16 člověkodnů |
| H — historie a maturita | Produkční adaptéry a popisné oddíly profilů po ověření vzorků R1 | 3–6 člověkodnů navíc |
| V — studie vstupu/výstupu | Protokol, párování skupin, citlivost a rozhodnutí o publikaci; bez slibu kalibrované přidané hodnoty | 3–5 analytických dnů + metodická oponentura |
| D — příprava | Rozbor, plán, původní úlohy, tutor; rozsah dosud neimplementován | Původní pracovní odhad 20–35 člověkodnů + 40–80 hodin učitele, nutno zpřesnit |

S0+B+C: **20–33 zbývajících člověkodnů** podle rozsahu R1; s novým M0 **21–35**, **bez nového O-21**. O-19 a nyní i O-21 jsou hotové a do zbývající práce se znovu nepočítají. Odhad zbytku se dokončením O-21 nemění, protože jeho rozsah dosud nebyl do součtu zahrnut. Dny M0 nejsou naměřená spotřeba, případná změna archivace Matomo není součástí odhadu. H a V jsou oddělené volitelné rozšíření; neblokují základní ukládání, jejich datové místo v profilu se navrhne už nyní. Čísla nejsou příslibem termínu a jejich přesnost nebyla měřena. Návrh nemá oporu pro tvrzení, že všechno párování opravíme za několik hodin.

S0 připravit jako následující opravnou dodávku, nezávisle na integraci simulátoru do Mého výběru. Po jejím uzavření implementovat pilot podle PRD; návrh ovládání a inventura dat mohou běžet souběžně. V lednu ověřovat vyhlášená kritéria 2027, další sezónní priority řídit kalendářem. Kalendář již byl publikován a znovu se nepočítá jako budoucí úkol.

Kalendářní termíny škol nejsou termíny vydání našeho softwaru. Kritické listopadové informace o konzervatořích se musí objevit i tehdy, pokud plný katalog nebude dokončen.

První průchod podle PRD ověřit s 5–8 rodinami, širší pilot hodnotit na 10–15 rodinách pro výběr škol a přibližně 30–50 žácích pro použitelnost přípravy. Tak malý vzorek neposkytne důkaz populační účinnosti nebo kalibrace predikce. Sledovat, zda rodina rozumí údajům, našla vhodnou alternativu, dokončila porovnání a zda se žák zlepšuje na jiných úlohách. Účinnost přípravy později ověřit s kontrolou výchozí úrovně, docházky a odpadávání uživatelů.

Rozpočet určit z člověkodnů a skutečné sazby týmu. U tutora průběžně měřit náklad na aktivního žáka, počet dotazů, latenci a chyby. Provozní cenu nemá smysl odhadovat bez zvoleného modelu a reálné spotřeby. Odborná validace obsahu je samostatná položka.

## 9. Co zatím odložit

- Jedno univerzální skóre kvality školy.
- Osobní procenta přijetí bez zpětného ověření a známých kritérií.
- Velkou knihovnu automaticky publikovaných AI úloh.
- Veřejné žebříčky dětí a automatickou psychologickou typologii.
- Rozesílku všech kontaktů bez rozlišení jejich původu a účelu.
- Úplný přepis aplikace před ověřením užitečnosti nových funkcí.

Další konkrétní dodávka je S0. Následují profily s oddělenou historií a novou nabídkou a pilot Mého výběru; kalendář a obnovené agregáty prvního kola se znovu neplánují.

<a id="vyporadani-r1"></a>
## 10. Vypořádání oponentury — kolo R1

Historický stav odpovědi R1 zůstává níže beze změny; aktuální stanovisko po oponentově ověření a nové body jsou v [R2](#vyporadani-r2).

Vstup: [oponentura v1.1, neměnný snímek](historie/rozvoj-2027-r0/oponentura-navrhu-rozvoje-2027.md), proti návrhu před R1 a PRD v0.3. Autor odpovědi: Codex, 11. 9. 2026. **„Zapracováno“ znamená úpravu zadání; oponent ještě nepotvrdil uzavření.** Provedení navržené opravy se eviduje samostatně. Odpověď pokrývá všech 14 ID, podbody O-14, obě přílohy a závěrečné doporučení.

### Důkazní podklady R1

- **E1 — XLSX a párování:** [strojový záznam](podklady/oponentura-2027-r1.json), vstupní URL, SHA-256, rozlišení fyzických a školních řádků, populace MZ a konkrétní kolize zaměření. Reprodukce: `python3 scripts/audit-review-2027.py --cache /tmp/gymnazium-oponentura-r1 --output /tmp/oponentura-2027-overeni.json`. Cache lze vyprázdnit pro nové stažení; případnou novější revizi odlišit kontrolním součtem. Nemění produkční exporty.
- **E2 — význam JPZ 2017–2023:** [primární popis](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/agregovana-data-jpz.html), oddíl „Agregované výsledky škol jednotné přijímací zkoušky 2017–2023“. CERMAT zde výslovně vylučuje dostupnost údaje o přijetí na konkrétní školu. Rozsah individuálních přijímacích dat vymezuje [přehled](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska.html).
- **E3 — MZ:** [katalog](https://data.cermat.cz/maturitni-zkouska/agregovana-data.html), jarní [sešit 2026](https://data.cermat.cz/files/files/MZ/agregovana_data_skoly/MZ2026j_SC_skolobory.xlsx), list `vysvetlivky`, zejména popis populace v B2; ověřen také [stav po podzimu 2025](https://data.cermat.cz/files/files/MZ/agregovana_data_skoly/MZ2025jap_SC_skolobory.xlsx).
- **E4 — kód:** commit `c9ae452`, [normalizace](../src/lib/school-key.ts), [městské propojení](../src/lib/cityData.ts), [predikční výpočty](../src/lib/chances.ts), [jejich klient](../src/app/moje-sance/MojeSanceClient.tsx), [simulátor](../src/app/simulator/SimulatorClient.tsx), [vyhledávací API](../src/app/api/schools/search/route.ts), [datová knihovna](../src/lib/data.ts). Ověřena volání i vykreslení, nikoli pouze výskyt názvu.
- **E5 — produkce:** [záznam veřejných znaků a ukázek JS](podklady/oponentura-2027-r1-produkce.json), staženo 11. 9. 2026 z `/` a `/simulator`. Veřejný JS obsahuje ±10 i vykreslení kategorií. Toto není nový test interakcí v prohlížeči. Reprodukce: načíst HTML `/simulator`, následovat jeho `script[src]` a vyhledat `Vysoká šance` / `Malá šance`; URL sestavených souborů se při dalším nasazení změní.
- **E6 — historie importu:** `git show c17d42e:scripts/import_cermat_results.py`, řádky 199–205, obsahuje `len(sheets) == 1`; `git show c9ae452:scripts/import_cermat_results.py` již testuje hlavičku `FORMA VZDĚLÁVÁNÍ`. Jde o jiný soubor než `import_cermat_2026_real.py`.
- **E7 — obsah a e-maily:** [pravidla CERMAT, strany 1–2](https://prijimacky.cermat.cz/files/files/CZVV_pravidla-vyuziti-webstrankyp.pdf), [ÚOOÚ, veřejné kontakty a obchodní sdělení](https://uoou.gov.cz/index.php/profesional/qa-otazky-a-odpovedi/obchodni-sdeleni), [Magic Link](https://better-auth.com/docs/plugins/magic-link). Ověřeno z primárních textů; dokumentace přihlášení není důkazem implementace ani doručitelnosti.

### Rozhodnutí ke každé připomínce

<a id="r1-o-1"></a>
**O-1 — přijato doplnění zdrojů, rozporován závěr o kohortě.** E1 potvrzuje všech sedm historických sešitů a uvedené počty REDIZO; čísla řádků oponentury zahrnují hlavičky a souhrny. E2 ale přímo vyvrací předpoklad, že známe vstupní výsledky přijatých na danou školu. Původní návrh neobsahoval výslovné tvrzení „data neexistují před 2024“; inventura přesto byla neúplná a je rozšířena v §2. V §4 je zadán analytický pilot s omezeními. Stav návrhu: zapracováno s protidůkazem, k oponentnímu ověření; produkční import historie nehotov.

<a id="r1-o-2"></a>
**O-2 — přijato s opravou rozsahu a granularity.** E1/E3 potvrzují maturitní data i uvedené počty školních agregátů. Celkem jde o 3 737 datových řádků plus dvě hlavičky. V katalogu je v den kontroly pro 2026 jen jaro; podzimní označení je `jap` a znamená stav po podzimním období. Formule `<j|p>` a tvrzení o obou obdobích až do 2026 jsou proto nepřesné. REDIZO dovoluje přiřazení školy; nezajišťuje mapu KKOV → SMO16 ani totožnost kohorty. Doplněny §2, tabulka přehledů a PRD §8. Stav: zapracováno s opravami, k oponentnímu ověření.

<a id="r1-o-3"></a>
**O-3 — částečně přijato.** Přijímám požadavek zadat ověření místo přehlížení možnosti analýzy. Odmítám tvrzení „návazná kohorta je dosažitelná klíčem REDIZO“ na základě dodaných dat: E2 neobsahuje přijaté/nastoupivší a E3 neobsahuje jejich individuální propojení se vstupem. Backtesting predikce přijetí a odhad přínosu školy mají různé cíle i předpoklady; podobnost obecného požadavku na validaci chybějící populaci nenahradí. §4 nově zadává popisnou studii a podmínky případné publikace. Stav: zapracováno s protidůkazem, metodický souhlas oponenta otevřen.

<a id="r1-o-4"></a>
**O-4 — přijato v opraveném rozsahu v1.1.** E4 potvrzuje, že `estimatedChancePct` a `estimatedMinScore` zůstávají součástí návratové struktury, ale klient zobrazuje historické podíly a konkurenci. Výpočet bez bodů dítěte a koeficienty 0,3/0,2 nemají doloženou validaci. V §3 je zadáno odstranění predikčního rozhraní v S0; pouhá změna komentáře není preferované uzavření. Stav: zadání zapracováno, **implementační dluh otevřen**; nejde o současné zobrazování osobních procent v Moje šance.

<a id="r1-o-5"></a>
**O-5 — potvrzena aritmetika, zamítnuta plošná změna klíče.** E1 reprodukuje přesně 1 425/2 808 a 2 728/2 808 při počítání jedinečných ID. Druhé číslo měří existenci základního klíče, nikoli jednoznačnou vazbu. 407 z těchto historických ID má více cílových zaměření; ve výsledcích 2026 je 185 kolidujících základních skupin. Na úrovni všech 2 837 řádků jsou odpovídající počty 1 443, 2 756 a 414 — denominátory nelze zaměňovat.

Protipříklad: `600004775_63-41-M/02` má „OA-cestovní ruch“ s průměrem 54,41 a 59 přijatými a „OA-ekonomika a podnikání v Evropské unii“ s 61,42 a 60 přijatými. Výběr jednoho řádku při odstranění zaměření musí alespoň jednomu starému oboru přiřadit nesprávný výsledek. To není hypotetické riziko. Současná oboustranně jednoznačná normalizace má 2 075 shod a produkční městská cesta ji již používá (E4). Ani 2 255 základních dvojic jedinečných v obou surových ročnících nepovažujeme bez dalších atributů za ověřené totožné nabídky. §3 přijímá levné generování kandidátů a kontrolu vazeb; odmítá tvrzení, že změna klíče sama opraví 97 %. Stav: doporučení rozporováno důkazem, k oponentnímu ověření; plošná změna neprovedena.

<a id="r1-o-6"></a>
**O-6 — přijata potřeba adaptérů, rozporováno umístění původní vady.** Oponent správně čte `import_cermat_2026_real.py`, ale tím nevyvrací heuristiku v jiném importéru. E6 dokládá původní vadu i její opravu v PR #71. Původní text byl nepřesný tím, že soubor nejmenoval; §3 ho nyní určuje. E1 potvrzuje různá schémata historie; nové adaptéry zůstávají samostatnou prací s podmínkami odmítnutí neznámého formátu. Stav: zapracováno s protidůkazem, k oponentnímu ověření.

<a id="r1-o-7"></a>
**O-7 — potvrzeno dřívější uzavření.** Metadata a veřejné soubory obnoveny v `c9ae452`, doloženo záznamem dodávky a kontrolou veřejných souborů při PRD v0.3. Nevracet do zbývajícího rozsahu. Stav: vyřešeno před R1; historická čísla ponechána pouze v označeném výchozím auditu.

<a id="r1-o-8"></a>
**O-8 — potvrzeno dřívější uzavření.** E5 znovu potvrzuje kalendář, rozlišení historického přehledu škol a větu „Průměr není hranice přijetí“. Původní popis hlavní stránky je historický. Stav: vyřešeno před R1, bez další implementační práce v tomto kole.

<a id="r1-o-9"></a>
**O-9 — přijato.** Historický odhad A–C nelze vydávat za zbytek. §8 nyní odděluje hotovou dodávku, S0, B, C, historická data H, analytickou studii V a přípravu D. Zbývající základ S0+B+C je pracovně 20–33 člověkodnů; jde o nově vymezený odhad, nikoli o naměřenou produktivitu nebo odečtení údajné spotřeby A. Stav: zapracováno; zpřesnění při technickém návrhu zůstává podmínkou plánování.

<a id="r1-o-10"></a>
**O-10 — potvrzeno dřívější uzavření.** Nadále rozlišujeme nedoloženou implementaci od tvrzení, že nic neexistuje. Samostatný dřívější termín přípravy nepovažujeme za doklad nasazení. Stav: vyřešeno v PRD v0.3, zachováno v0.4.

<a id="r1-o-11"></a>
**O-11 — zásada zachována, doplněno omezení argumentu.** Souhlas s odmítnutím univerzálního skóre. Nesouhlas s dovětkem, že „obě strany“ pro měření přidané hodnoty již máme: E2/E3 dokazují rozdílné populace, jak je vypořádáno v O-3. Výzkumný pilot zůstává povolen, automatické skóre přínosu školy se nezavádí. Stav: zásada potvrzena; doplnění k oponentnímu ověření.

<a id="r1-o-12"></a>
**O-12 — zásady přijaty, právní závěry přílohy zpřesněny.** E7 podporuje model odkazů a vlastních uživatelských údajů i omezení obchodních sdělení. V §5 je výslovně vyloučeno převzetí testů/klíčů a automatická oprava oficiálního testu jako součást první verze. Detailní vypořádání příloh je níže. Stav: zapracováno; nejde o právní posudek všech budoucích obchodních modelů.

<a id="r1-o-13"></a>
**O-13 — přijato, produkční blokátor zůstává otevřen.** E4 a E5 potvrzují ±10 bodů i veřejné vykreslení kategorií a souhrnů. Původní §3 sice simulátor zmiňoval, ale podmínka v PRD vázaná až na budoucí integraci byla nedostatečná. §3 a §8 nyní vymezují následující opravnou dodávku S0 a její přijímací podmínky. Komentář v kódu o „celkových bodech“ není sám důkazem skutečného původu pole `min_body`; jeho význam musí S0 dohledat až ke zdroji. To nemění doloženou vadu predikčních kategorií. Stav: **v řešení — dokumentace upravena, kód a produkce neopravena**. Uzavřít až commitem opravy, testy a veřejným ověřením; nezačínat implementaci Mého výběru s tvrzením, že toto riziko již zmizelo.

<a id="r1-o-14"></a>
**O-14 — přijato doplnění profilů, potvrzeny zásady ovládání.** Podbod 1 není protidůkaz k Better Auth: oponent odkaz nekontroloval. E7 jej ověřuje; integrační a doručovací připravenost zůstává nedoložená a PRD ji neslibuje. Podbod 2 je zapracován do PRD §8: samostatný obsah historie konajících, výsledků přijatých a maturity školy, vždy s granularitou, rokem, populací a pramenem. Test pilotu nově ověřuje, že rodina nepovažuje školní maturitní agregát za výsledek konkrétního zaměření. Ostatní potvrzené zásady a otevřené D4/D8 zůstávají zachované. Stav: zapracováno, k oponentnímu ověření.

### Přílohy a závěrečné doporučení oponentury

**Příloha 1 — testy a klíče.** Přijímám navržený produktový tok: test a kontrola u CERMAT, u nás vlastní body a označení obtíží. Absolutní tvrzení „cesta k souhlasu je uzavřená“ zužuji na nedoložené oprávnění pro nynější aplikaci. Pravidla na straně 2 obsahují také zvláštní podmínky použití vytištěných materiálů v placených přípravných kurzech, které příloha vynechala. Nevyvozujeme z nich licenci k webové aplikaci. Ani nepřítomnost zákonné výjimky v jedné kategorii webových pravidel sama nedokazuje, že zákonná výjimka neexistuje. Návrh se o takovou výjimku neopírá; automatické hodnocení oficiálních testů není v rozsahu. E7 dokládá konkrétní text, nikoli univerzální nemožnost dohodnout jiné oprávnění.

**Příloha 2 — položková data.** E1 potvrzuje příklad 01.3 = 36,8 %, 93 358 konajících a 41,25 % za test. Zpřesnění: jde o list `m4a`, první řádný termín čtyřletých oborů; identifikátor podúlohy bez varianty nestačí. Agregát není klíčem k individuálnímu hodnocení. Tvrzení, že celý dataset je automaticky „mimo kategorii zkušební dokumentace“ a libovolně využitelný, nedokládá uvedené obecné PDF jednoznačně: agregované datové soubory v něm nejsou výslovně licencovány jako samostatná kategorie. §5 požaduje evidenci oprávnění konkrétního využití; nezastavuje odkazy ani ukládání vlastních údajů žáka.

**Doporučené pořadí:** přijato S0 jako následující oprava. Zamítnuta neomezená změna párovacího klíče podle O-5. Přijata inventura historie a maturity, provedeny kontrolní downloady; úplný produkční import oddělen do H. Přijata změna podmínky opravy simulátoru na nezávislou na integraci. Návrh rodinného ovládání může pokračovat, implementace následuje po S0.

### Souhrn a podmínky dalšího kola

- **14/14 ID má odpověď** a určený vztah ke změně, důkazu a zbývající práci. Obě přílohy jsou vypořádané samostatně.
- **O-7, O-8 a O-10:** oponentem již uzavřené, v tomto kole neznovuotevřené.
- **O-4 a O-13:** zadání opravy upraveno, implementace otevřená; O-13 blokuje následující implementační etapu Mého výběru. Tato revize není dokladem bezpečného současného doporučování.
- **O-1, O-2, O-3, O-5, O-6, O-9, O-11, O-12, O-14:** odpověď autora připravena k ověření oponentem. Částečný či úplný nesouhlas se vždy opírá o výše uvedený protidůkaz. Nejsou jednostranně označeny za oponentem uzavřené.

Další kolo přidá odpověď R2 se stejnými ID, nové body dostanou další ID. U každého se zapíše stanovisko oponenta, nová evidence a případná změna původní odpovědi. Uzavřené body se nemažou. Technické body vyžadují commit a příslušné ověření; dokumentační body odkaz na verzi a změněnou sekci. Souhrn počítá jedinečná ID O-1 až O-14; obecné zásady a přílohy se nepřičítají jako další očíslované body.

## 11. Historie verzí

| Verze / kolo | Datum | Autor | Změna a doklad |
|---|---|---|---|
| Výchozí audit (tehdy bez čísla verze) | 11. 9. 2026 | Codex | Audit commitu `c17d42e`; zahrnut v dodávce `c9ae452`. |
| Aktualizace stavu před R1 (tehdy bez čísla verze) | 11. 9. 2026 | Codex | Označení historických zjištění a nasazené dodávky. Přesné znění uchováno ve snímku R0 se SHA-256. |
| 2.0 / R1 | 11. 9. 2026 | Codex | Reakce na oponenturu v1.1: historie JPZ a MZ, limity kohorty, vyvrácení plošného párování, S0 před Mým výběrem, zbývající odhady a odpovědi na všechna ID/přílohy. Související PRD v0.4. |

Identifikátor revize R1: `rozvoj-2027-r1`. Commit této odpovědi lze dohledat přes `git log --all --grep='rozvoj-2027-r1'`; hash se nezapisuje do vlastního commitovaného obsahu, aby nevznikla kruhová reference. Přesné vstupní dokumenty a jejich kontrolní součty jsou v [manifestu R0](historie/rozvoj-2027-r0/manifest.json). Nové kolo doplní konkrétní hash předchozího kola do své historie.


## 12. Aktualizace A1 — návštěvnost a rutinní Matomo

| Verze / doplnění | Datum | Změna a doklad |
|---|---|---|
| 2.1 / A1 | 11. 9. 2026 | Zapracování analýzy návštěvnosti v1.1, priorita uložení v profilech, mobil jako podmínka, M0 a interní cílový termín S0. Ověřený čtecí klient Matomo a reprodukovatelné agregáty. |

Předchozí revize 2.0 / R1 je commit `5a0f893`, její přesný snímek i PRD v0.4 jsou v `historie/navstevnost-a1/`. A1 je doplnění nových dat, nikoli druhé oponentní kolo a nikoli souhlas oponenta s R1. Historie O-1 až O-14 zůstává beze změny; O-13 stále není opraveno v produkci. Tento zápis nevybírá varianty D4/D8 a neslibuje termín veřejného Mého výběru. Revizi lze dohledat pomocí `git log --all --grep='matomo-navstevnost-a1'`.


<a id="vyporadani-r2"></a>
## 13. Vypořádání oponentury — kolo R2

Historický stav R2; aktuální krátké dispozice a následná uzavření jsou v [R3](#vyporadani-r3). Pozdější důkazy nepřepisují tehdy zaznamenané výsledky.

Předmět: oponentura v2.0/R2, doplněná během práce na v2.1/R2 o O-19 k návrhu v2.1, PRD v0.5 a analýze v1.1. Mezitím vznikla analýza v1.2 s doplněním Vercelu; její čísla A1 se nezměnila. [Přesné vstupy R2 a SHA-256](historie/rozvoj-2027-r2-vstup/manifest.json) zachovávají i uživatelovu oponenturu před touto odpovědí. Toto je odpověď autora, nikoli nové schválení oponentem.

### Důkazy R2

- **R2-E1:** [zmrazený A1 a opakované dotazy Matomo](podklady/oponentura-2027-r2-matomo.json). Původní snímek má SHA-256 `9816b0c290bec2c92078b34a3caaabd63f83fd1d3c5ff2832512bd3ea981eae8`, shodné s evidencí A1. Obsahuje skutečný řádek Others, parametry, časy a kontrolní součty původních odpovědí; nikoli jen přepis čísla z dokumentu. Nové dotazy s `flat=1`, `filter_limit=-1`, `idSite=7`, jazykem `en`, bez segmentu a `period=range` byly provedeny pro 11. 2.–10. 9., 11. 2.–11. 9. a znovu 11. 2.–10. 9. 2026. Reprodukce: `python3 scripts/audit-review-2027-r2.py --source ~/.local/share/stredniskoly/matomo/overeni-2026-09-11.json --output /tmp/oponentura-r2-matomo.json`. Nová reprodukce musí mít vlastní čas; nemění se tím historický snímek.
- **R2-E2:** [Vercel projekt, omezený vzorek výpisu logů a oprava místní konfigurace](podklady/oponentura-2027-r2-vercel.json). Projekt ověřen čtecím konektorem včetně veřejné domény. Tři nové záznamy z explicitně zaznamenaného hodinového okna obsahují i statické HIT; stručný výstup neobsahuje UA/referer. Není to zopakování neurčené původní hodiny oponenta ani úplný export.
- **R2-E3:** [veřejné Web Analytics API](https://vercel.com/docs/analytics/web-analytics-api) a [čtení metrik CLI](https://vercel.com/docs/analytics/accessing-metrics-with-vercel-cli), ověřeno 11. 9. 2026. Dokumentace výslovně uvádí dostupnost Web Analytics přes `vercel metrics` bez Observability Plus. Neprokazuje oprávnění našeho konkrétního účtu ani příčinu oponentovy 404.
- **R2-E4:** [Runtime Logs — Log details](https://vercel.com/docs/logs/runtime#log-details), ověřeno 11. 9. 2026: detail požadavku obsahuje položku „Request User Agent“, systém také umožňuje filtr podle prohlížeče. To vyvrací obecné tvrzení, že Vercel tuto informaci nemá; neprokazuje, že ji poskytuje zvolený MCP výpis, že jde o celý surový UA řetězec ani že je dostupný referer.
- **R2-E5:** [nové veřejné ověření O-13](podklady/oponentura-2027-r2-produkce.json). HTML simulátoru stále odkazuje na JS s kategoriemi a prahem ±10. Souhlasí i místní `SimulatorClient.tsx`; `chances.ts` stále vrací predikční pole O-4. Neproběhla nová interakční přejímka ani oprava.

### Převzetí rozhodnutí R2 k původním 14 ID

| ID | Co R2 skutečně rozhodlo | Stav po odpovědi autora R2 |
|---|---|---|
| O-1 | Potvrzuje historické zdroje, stahuje závěr o kohortě | Metodický rozpor uzavřen souhlasem oponenta; import H dosud nehotov. |
| O-2 | Přijímá opravu `jap` a dostupnosti roku 2026 | Spor o označení/období uzavřen; inventura doplněna v R1, produkční import a mapování nejsou hotové. |
| O-3 | Stahuje možnost získat kohortu samotným REDIZO | Metodický rozpor uzavřen; popisná studie V zůstává volitelná a nesmí tvrdit přidanou hodnotu školy. |
| O-4 | Nepřináší novou výhradu; R1 rozlišilo mrtvý výpočet a zobrazení | Technický dluh stále otevřený v S0. R2 jej výslovně neuzavírá. |
| O-5 | Stahuje doporučení sloučit klíč bez zaměření | Nebezpečné doporučení uzavřeno jeho stažením; budoucí kontrola identity nabídek zůstává úkolem. |
| O-6 | Potvrzuje historický zdroj heuristiky | Faktický rozpor uzavřen; budoucí historické adaptéry stále vyžadují přejímku formátu. |
| O-7 | Neznovuotevírá | Dřívější uzavření zachováno, obnova dat znovu neplánována. |
| O-8 | Neznovuotevírá | Dřívější uzavření zachováno; není to nový audit celého webu. |
| O-9 | Bez nového samostatného rozhodnutí | Přepočet R1/A1 platí jako pracovní odhad, nikoli jako oponentem ověřená pracnost. |
| O-10 | Neznovuotevírá | Dřívější uzavření výkladu „nedoloženo“ zachováno; příprava se tím nestává vydanou. |
| O-11 | Bez nového samostatného rozhodnutí | Zákaz univerzálního skóre zachován; kohortní argument řídí přijaté vypořádání O-3. |
| O-12 | Bez nového samostatného rozhodnutí | Pravidla z R1 a odpovědi k oběma přílohám zachovány; nevzniklo oprávnění přebírat chráněné testy. |
| O-13 | Dokumentaci přijímá, opravu podmiňuje commitem a produkcí | **Otevřený produkční blokátor S0**, znovu doložen R2-E5. |
| O-14 | Výslovně přijímá podbod 2, vazbu na data v PRD §8 | Dokumentační výhrada k obsahu profilu uzavřena. Better Auth zůstává kandidát; poznámka o doručování není důkaz hotové autentizace. |

Pozdější O-19 navíc dokládá druhou produkční vadu. R2 není úplný audit všech produkčních rizik. Jeho formulaci „jediné otevřené produkční riziko“ čteme jako jediný takto doložený blokátor v této oponentuře, nikoli jako záruku, že jiné vady neexistují. Obě přílohy R1 zůstávají vypořádané v §10; R2 k nim nedodalo nový důkaz.

<a id="r2-o-15"></a>
### O-15 — rozporována navržená změna čísla, doplněna auditní stopa

**Důkaz oponenta:** tentýž dotaz podle jeho popisu vrací Others 12 208 a prefix 14 462. **Protidůkaz R2-E1:** odpověď z 08:57:05 UTC v původním snímku uvádí pro `/skola/ - Others` `nb_hits=12137`, `nb_visits=10709`, `entry_nb_visits=6292`. Stejných 12 137 a prefix 14 462 vrací i nový dotaz zahrnující dnešek. Zápis A1 tedy odpovídá uloženému API výsledku a není chyba přepisu.

Číslo **12 137 nepřepisujeme na 12 208**. Přijímáme logický rozdíl mezi agregátem Others a součtem celého prefixu, ten již analýza vysvětluje. Nebereme jako doložené, že původních 12 208 bylo právě hodnotou tohoto agregátu: oponent nedodal úplnou odpověď, čas a její hash. Mohl mít jiný snímek či parametry, příčinu neznáme. Do analýzy §3/§11 přidáváme konkrétní evidence a odlišujeme „nereprodukováno jako součet všech profilů“ od tvrzení, že hodnota nemohla v žádném jiném reportu nastat. Pro další ověření dodat konkrétní řádek, úplné netajné parametry, čas a SHA, nikoli token.

**Stav:** vypořádáno autorem s protidůkazem, k oponentnímu ověření; nízká priorita, bez produktového blokátoru.

<a id="r2-o-16"></a>
### O-16 — přijata zásada dokončených dní, příčina rozdílů není uzavřená

**Důkaz oponenta:** 25 775 proti 25 762 návštěv a 44 542 proti 44 527 zobrazení z různých reportů; vysvětluje průběžným dnem/archivací. R2-E1 skutečně nově vrací 25 775 návštěv, ale v témže kole Actions i řádky shodně 44 527 zobrazení. Požadavky nejsou atomický snímek, takže takové kolísání je možné. Ani `period=month` není obecně totožný interval jako oříznutý `range`.

**Protidůkaz proti úplnému vysvětlení zbytků:** oba dotazy pouze do 10. 9. vracejí 25 740 návštěv, 44 484 zobrazení a **25 418 vstupů**, tedy stále rozdíl **322 (1,25 %)**. Rozdíl noví+vracející se je v těchto dvou dotazech nula, v původním průběžném snímku osm a v novém devět. To podporuje vliv časového snímku na malý rozdíl, ale nedokazuje konkrétní mechanismus archivace. Čísla +13 a +15 pod 0,1 % nevysvětlují automaticky původních 322.

Číselný základ A1 zůstává zmrazený; nové hodnoty ho nepřepisují po částech. Analýza doplňuje kontrolu dokončených dní a ponechává 322 jako **nevysvětlený rozdíl**, který se nesmí použít k přesnému výpočtu konverzního trychtýře. Případná diagnostika archivace patří do M0, bez přepočtu serverových archivů v tomto kole.

**Stav:** informativní bod vypořádán s upřesněním; příčina 322 zůstává otevřená, neblokuje návrh ani opravu S0.

<a id="r2-o-17"></a>
### O-17 — přístup otevřený, tarifní příčina nedoložená, místní propojení opraveno

**Důkaz oponenta:** 404 na správném projektu a funkční dashboard/jiné dotazy. Přijímáme jako hlášené pozorování; chybí přesný endpoint, verze API, parametry, čas a odpověď bez tajemství. Proto ho nelze nezávisle reprodukovat ani vyloučit chybu dotazu či oprávnění. **R2-E3 rozporuje předpoklad nutnosti Observability Plus:** oficiální dokumentace výslovně umožňuje programové Web Analytics metriky bez něj. To neznamená, že libovolný endpoint, tarif nebo účet musí fungovat, ani že máme přístup už zprovozněný.

Matomo zůstává ověřený rutinní zdroj. Ruční CSV je použitelná dočasná cesta; tvrzení „čísla je nutné vždy předávat ručně“ nahrazujeme stavem „programový přístup k tomuto účtu zatím neověřen“. Z 404 nevyvozovat potřebu kupovat vyšší tarif. Diagnostický postup je v [návodu Vercel](vercel-analytics-pristup.md).

Neshodu `.vercel/project.json` potvrzuje snímek před změnou. Po novém ověření identity přes konektor (R2-E2) byl **místní soubor opraven** na `stredniskoly`, `prj_Yh3UGtfELluIwvXazLyVxF5JIPsD`, stejný tým. Kontrolní součet výsledku je v R2-E2. Soubor je záměrně ignorovaný Gitem; do historie patří předchozí netajná konfigurace a doklad, nikoli odstranění ignorování celé `.vercel`. Neměnilo se vzdálené nastavení, proměnné ani nasazení; případné lokálně stažené prostředí se nesmí automaticky považovat za prostředí opraveného projektu.

**Stav:** místní nesoulad opraven a ověřen čtením; statistický přístup organizačně otevřen, tarifní vysvětlení rozporováno, bez blokace S0.

<a id="r2-o-18"></a>
### O-18 — potvrzen limit výpisu konektoru, rozporováno zobecnění na všechny logy

**Důkaz oponenta:** stručný záznam neobsahuje UA/referer. R2-E2 toto potvrzuje v novém vzorku. **Protidůkaz R2-E4:** oficiální popis detailu požadavku na Vercelu uvádí Request User Agent. Ze stručného výpisu tedy nelze rozhodnout, že Vercel UA vůbec neuchovává a vlastní modul je nutný. O dostupnosti surové hlavičky, refereru či jejich exportu v tomto účtu zatím důkaz nemáme.

Před implementací ověřit detail jednoho známého požadavku v dashboardu, možnosti exportu/drainu, dostupné pole, pokrytí HIT/MISS, retenční okno a cenu pro daný účet. Nový vzorek konektoru obsahuje i statické HIT; nelze tedy zaměnit všechny logy platformy za výpis jen provedených handlerů. Naopak vlastní logování uvnitř cachovaného handleru kompletní provoz CDN nezachytí. Cache kvůli tomu nevypínat.

Oponentových 771 různých cest, 159 hledání a nulu pod `/api/skola/` vedeme jako jeho časově blíže neurčený vzorek, ne jako znovu ověřenou statistiku. Při interpretaci kontrolovat i veřejné rewrite cesty `/skola/*.md` a `/skola/*.json`, limity a úplnost výpisu. Nula v neúplném pozorování **není důkaz ani spolehlivý náznak nepoužívání formátů**. UA je tvrzení klienta, ne důkaz, že konkrétní model obsah použil k tréninku nebo že se člověk právě ptá na školu.

Během práce autor návrhu logování doplnil živé ověření drainu BetterStack: jeho vzorek hlavičky také neobsahuje. Přijímáme jako nové hlášené pozorování, které zde nebylo nezávisle reprodukováno. Nevyvrací R2-E4 o detailu platformy. Tento souběžně měněný dokument nepřepisujeme; před jeho realizací platí upřesnění této odpovědi. Samotná retence v drainu ještě neřeší UA, pokrytí cache ani metodiku závěrů. Experiment strojových přístupů je samostatný, až po S0, a nenahrazuje M0. Bez ověření dostupného exportu nevytvářet úložiště ani zavazovat se k novému sběru.

**Stav:** vypořádáno s protidůkazem a změnou zadání; prověření dostupnosti detailu/exportu zůstává otevřené, není blokátorem Mého výběru.

<a id="r2-o-19"></a>
### O-19 — přijato, produkční vada potvrzena; oprava rozpracována souběžně

Bod přibyl během práce ve vstupní oponentuře v2.1; [doplňkový snímek](historie/rozvoj-2027-r2-vstup/oponentura-v2.1-doplneni-o19.md) a [manifest](historie/rozvoj-2027-r2-vstup/manifest-doplneni.json) jej zachovávají. **R2-E6:** [HTTP kontrola, log a stav souběžného kódu](podklady/oponentura-2027-r2-og.json) potvrzuje HTTP 500 u všech tří adres. Nový čtecí dotaz do runtime logů našel u všech tří chybu chybějícího `NEXT_DEPLOYMENT_ID` v edge wrapperu. Jde o doložené selhání generování obrázků; statistiku 23 chyb za hodinu jsme nezávisle nepřepočítávali.

Odstranění `runtime = 'edge'` je přiměřený kandidát opravy, který už souběžná práce provedla v lokálních třech generátorech. Tato odpověď tyto soubory neupravovala. Log prokazuje bezprostřední místo selhání, ne celou příčinu konfigurace Vercelu ani účinnost opravy. [Dokumentace ImageResponse](https://nextjs.org/docs/app/api-reference/functions/image-response) nevyžaduje pro základní použití výslovné zapnutí edge. Nezavádět ručně falešnou hodnotu deployment ID jen pro potlačení výjimky.

Přijímáme zařazení do opravné vlny S0 s oddělenou přejímkou: doložit commit příslušné opravy, build, úspěšné nasazení a následně **GET všech tří adres musí vracet 200, obrazový MIME typ a dekódovatelný obraz očekávaných rozměrů**, nikoli jen HTML s 200. Z hlaviček hlavní stránky, regionů a simulátoru ověřit skutečné `og:image`/twitter odkazy včetně parametrů a přesměrování na správnou doménu; zkontrolovat vizuální obsah a náhled v dostupném validátoru sociální sítě. Stav cache sociální sítě uvést odděleně od správně vráceného obrázku. Nenahrazovat tyto kroky samotným lintem či lokálním odstraněním řádku.

Počet návštěv ze sociálních sítí potvrzuje existující distribuční kanál, nikoli velikost ztráty prokliků. Bez experimentu netvrdíme, že všech 2 626 návštěv vidělo chybný náhled nebo jak moc náhled ovlivnil CTR; některé služby mohou mít starší obrázek v cache. Do rozpočtu nepřebíráme odhad „drobná změna“ jako ověřenou celkovou pracnost.

**Stav k času R2-E6:** dokumentačně zapracováno, kód rozpracován v souběžné práci, **produkce stále vrací 500**. Bod zůstává otevřenou produkční vadou do přejímky. O-13 nadále zůstává hlavním blokátorem doporučování; jeho uzavření a uzavření O-19 se evidují samostatně.

**Následná kontrola na pokyn uživatele, 11. 9. 2026 v 11:33 CEST (09:33 UTC):** všechny tři přímé adresy stále vracejí HTTP 500. Stejný výsledek mají i skutečné odkazy `og:image` a `twitter:image` vyčtené z metadat hlavní stránky, regionů a simulátoru, včetně query parametrů a přesměrování z holé domény na `www`. Vracejí HTML chyby místo obrázku, `x-vercel-cache=MISS`. [Úplný HTTP podklad](podklady/oponentura-2027-o19-http-recheck.json). [Konektor Vercelu](podklady/oponentura-2027-o19-deployment-recheck.json) stále hlásí stejný produkční deployment `dpl_2yPr8A6U8xPpkF5oWcsfnEi1xU9o`. Místní změny tří generátorů zůstávají necommitované. Oprava tedy není na ověřované veřejné doméně doložena; O-19 zůstává otevřené. Tento krok nic nenasazoval.

### Historie a podmínky R3

| Revize | Vstup | Výstup a změna |
|---|---|---|
| R1 | Oponentura v1.1 | Návrh v2.0 / PRD v0.4, commit `5a0f893`. |
| A1 | Analýza v1.0 | Návrh v2.1 / PRD v0.5 / analýza v1.1, commit `ed0fd98`. |
| A1-V | Doplnění dashboardu | Analýza v1.2 a návod Vercel, commit `c8a56aa`. |
| R2, 11. 9. 2026 | Oponentura v2.0 a doplnění v2.1 v pracovním stromu; přesný vstup v manifestu | Návrh v2.2 / PRD v0.6 / analýza v1.3 / oponentura v2.2 s odpovědí autora. Převzetí stanovisek k O-1–14, reakce na O-15–19, nové důkazy a lokální oprava propojení Vercelu. Identifikátor commitu `rozvoj-2027-r2`. |

**19/19 ID má aktuální dispozici**, což neznamená 18 opravených či oponentem uzavřených vad. R3 má ověřit R2-E1 k O-15/O-16 a rozsah protidůkazů dokumentace Vercelu k O-17/O-18. R3 musí zvlášť doložit případné dokončení souběžné opravy O-19. Neuzavřené důkazní rozpory mají uvedeny požadované podklady, nebrání diskusi nad PRD. **O-13/S0 zůstává blokátorem implementace pilotu Mého výběru**; O-4 se řeší v téže opravné dodávce. O-19 je další otevřená produkční vada se souběžnou opravou a vlastní přejímkou. K uzavření S0 je stále nutný commit aplikace, příslušné kontroly a ověření veřejného výsledku. Toto dokumentační kolo je nenahrazuje. D1/D2 se nemění, D3–D8 se nepovažují za nově schválené.

Doplnění historie **2.2.1 / R2**: opakované ověření veřejných OG adres a skutečných metadat po zprávě uživatele o opravě. Předchozí odpověď v2.2 je commit `b65d230`; stav O-19 se nemění, nové důkazy zachovávají čas kontroly.


<a id="vyporadani-r3"></a>
## 14. Vypořádání oponentury — kolo R3

**Stav: připomínky R3 zapracovány; O-13 zůstává blokátorem, HTTP výpadek O-19 je uzavřen.** Aktuální návrh v2.3 navazuje na oponenturu v3.0. [Vstupní dokumenty se SHA-256](historie/rozvoj-2027-r3-vstup/manifest.json) zachovávají celý posudek i předchozí návrh v2.2.1. Následující tabulka zachycuje stav R3; §10 a §13 jsou starší historie. Pozdější opravu O-21 a její přejímku doplňuje §15.

| ID | Aktuální stav po R3 |
|---|---|
| O-1 | Metodický spor uzavřen oponentem; historický import H zůstává plánovaný. |
| O-2 | Označení a období MZ vyřešeno; import a mapování nejsou hotové. |
| O-3 | Kohortní závěr stažen; případná studie je popisná. |
| O-4 | Otevřený technický dluh v S0; predikční pole stále v kódu. |
| O-5 | Plošné sloučení klíče staženo; neprovádět. |
| O-6 | Spor o původ heuristiky uzavřen; podmínky budoucích adaptérů platí. |
| O-7 | Dříve uzavřeno, R3 bez nových výhrad. |
| O-8 | Dříve uzavřeno, R3 bez nových výhrad. |
| O-9 | Přepočet zbytku zapracován; odhad není naměřená pracnost. |
| O-10 | Rozlišení nedoložené a vydané implementace vyřešeno. |
| O-11 | Zásada bez univerzálního skóre zachována. |
| O-12 | Zásady a vypořádání příloh R1 zachovány, bez nových výhrad. |
| O-13 | **Otevřený produkční blokátor.** Nový deployment stále doručuje stejný vadný JS. |
| O-14 | Datová vazba PRD přijata; autentizace stále není implementovaná. |
| O-15 | **Spor uzavřen.** Příčinou rozdílného dotazu byl začátek 1. vs. 11. února; A1 nepřepisovat. |
| O-16 | Metodické upřesnění přijato; příčina 322 vstupů zůstává otevřená. |
| O-17 | Tarifní vysvětlení 404 staženo; přístup k Web Analytics účtu stále neověřen. |
| O-18 | **Přítomnost UA/refereru nezávisle potvrzena v NDJSON.** Vlastní logovací modul neplánovat; zbývá dotaz a kontrola pokrytí. |
| O-19 | **HTTP 500 uzavřeno jako opravené.** Nové vizuální vady evidovány samostatně jako O-21. |
| O-20 | **Přijato a ověřeno:** 1.–10. 2. je nula v reportu, nikoli důkaz nulové návštěvnosti webu. |
| O-21 | **Nový nález autora R3:** chybějící glyfy, zastaralý obsah a překrytí OG obrázků; zatím neopraveno. |

### Důkazy a krátké odpovědi k měněným bodům

<a id="r3-o-15"></a>
**O-15 — uzavřeno, přijímáme opravu parametrů oponenta.** [R3-E1](podklady/oponentura-2027-r3-overeni.json) reprodukuje při stejném konci 11. 9. Others **12 139 vs. 12 210**, prefix v obou případech **14 464**. Při konci 10. 9. je rozdíl **12 136 vs. 12 206**, prefix **14 458** v obou dotazech. Datum začátku mění složení Others i bez návštěv navíc; příčinu interní archivace tím netvrdíme jako prokázanou. Všechny dotazy zde používají `language=en`; jazykový experiment oponenta nebyl opakován a není pro přijetí závěru nutný. Původních 12 137 patří ke zmrazenému A1, nepřepisuje se novým průběžným dnem.

<a id="r3-o-16"></a>
**O-16 — upřesnění přijato oběma stranami.** Rozdíl 322 není vysvětlen změnami +13/+15. Původní i opakované kontrolní součty zůstávají v R2-E1; přesný konverzní trychtýř na nich nestavět. V R3 jej znovu neoznačujeme za opravený.

<a id="r3-o-17"></a>
**O-17 — spor o příčinu uzavřen stažením domněnky o tarifu.** Neověřený přístup k Web Analytics je samostatná otevřená provozní otázka; nový důkaz funkčního API R3 nedodalo. Místní identita projektu je již opravena z R2.

<a id="r3-o-18"></a>
**O-18 — doloženo, vlastní modul odpadá.** [R3-E2](podklady/oponentura-2027-r3-betterstack.json) ověřuje původní export: 14 logových řádků, 43 polí, UA vyplněn ve 14 a referer v devíti. Je v něm veřejná cesta `/skola/[slug].md` s 200 i `facebookexternalhit` u dřívějšího 500. To je doklad potřebných polí, ne objemu provozu. Vzorek má 12 různých request ID a všechny řádky mají MISS — **tento export sám úplné pokrytí HIT nepotvrzuje**. Před reportováním ověřit deduplikaci, veřejné rewrite cesty, retenci a úplnost exportu. Soukromý originál zůstává mimo Git; podklad obsahuje jen schéma, součty a anonymizované příklady. [Návrh logování v1.3](navrh-logovani-api-endpointu.md) už předepisuje dotaz nad existujícím drainem místo vývoje modulu/databáze. Uložený dotaz v BetterStacku v tomto kole nevznikl.

<a id="r3-o-19"></a>
**O-19 — uzavřena technická vada HTTP 500; celá vizuální přejímka tím potvrzena není.** [R3-E3](podklady/oponentura-2027-r3-deployment.json) dokládá READY produkci `dpl_NKpQBRZaberGrkd7jZuia9K77sxo` na commitu `0e37ec6`, jehož předkem je oprava `c51b3c9`. [R3-E1](podklady/oponentura-2027-r3-overeni.json) potvrzuje všech šest GET (tři přímé a tři z metadat), 200, `image/png`, plné dekódování PNG knihovnou Pillow a 1200×630. Velikosti 49 631 / 59 147 / 49 266 B souhlasí s R3. Oponentova kontrola samotné hlavičky byla doplněna dekódováním i vizuální kontrolou; ta našla O-21. Proto přijímáme uzavření dostupnosti, nikoli tvrzení, že celý vzhled je bez vady. Konkrétní stav cache Facebooku ani výsledek Sharing Debuggeru zde nebyl ověřen; nelze tvrdit, že všechny starší náhledy jsou prázdné. Obnova externí cache zůstává oddělený úkon, v této práci neprovedený.

<a id="r3-o-20"></a>
**O-20 — přijato a zapracováno do analýzy v1.4 §2.** R3-E1 pro `2026-02-01,2026-02-10` vrací nulu návštěv, akcí i zobrazení. To je výsledek měření, ne důkaz, že web neměl návštěvníky nebo že měření bylo před založením webu úplné. Únorový vrchol nedopočítáváme.

<a id="r3-o-21"></a>
**O-21 — nový otevřený nález, priorita střední; neodkládá O-13.** Veřejné obrazy uložené s hashem dokládají: [hlavní obrázek](podklady/oponentura-2027-r3-og-home.png) nahrazuje některé české znaky obdélníky a stále označuje 2025 za aktuální data; [simulátor](podklady/oponentura-2027-r3-og-simulator.png) překrývá spodní titulek s patičkou. [Regiony](podklady/oponentura-2027-r3-og-regiony.png) toto poškození nevykazují. Nejde o chybu PNG dekodéru ani chybovou HTML odpověď. Zadání opravy: ověřený font se všemi českými glyfy, rozestupy bez překrytí a pravdivé označení datového roku/rozsahu; u simulátoru sladit text i význam bodů s opravou O-13. Přejímka: nové veřejné PNG všech tří cest prohlédnout v plné velikosti i zmenšeném náhledu, znovu ověřit metadata a HTTP. O-21 není opravou implementovanou tímto dokumentem.

**Připomínka ke čtivosti — přijato.** Aktuální stav je nahoře v tabulce a na začátku každého měněného bodu; staré dlouhé odpovědi zůstávají pouze jako označená historie.

### Historie R3 a další krok

Vstup: oponentura v3.0 a předchozí dokumenty na `0e37ec6`, zachované v manifestu. Výstup: návrh **v2.3**, PRD **v0.7**, analýza **v1.4**, oponentura **v3.1** s odpovědí autora a návrh logování **v1.3**. Identifikátor revize pro Git: `rozvoj-2027-r3`. 20 původních ID má aktuální dispozici; nová vizuální kontrola přidává O-21. Oponentní potvrzení nové odpovědi a O-21 zůstává pro R4.

**Následuje oprava S0/O-13 a odstranění dluhu O-4; diskuse o ovládání může pokračovat.** O-21 je oddělená oprava ve stejné vlně, nikoli důvod odkládat O-13. D1/D2 platí, dosud otevřené produktové volby se tím neschvalují. Žádné úplné uzavření produkčních blokátorů zatím nenastalo.


## 15. Dodatek v2.3.1 — O-21 opraveno a nasazeno

**O-21 uzavřeno po veřejné přejímce.** [Dodávka a důkazy](oprava-og-nahledu-2027.md) zachycují PR #72, commit `9146ef0` a deployment `dpl_E9D6rFkMvGzAQJHexJeYEZFFe5TM`. Všechny tři nové PNG mají českou diakritiku, oddělenou patičku a ilustraci vytvořenou obrazovým modelem. Hlavní náhled odlišuje přijímání 2027 od výsledků 2026; simulátor neobsahuje slib osobní šance ani nejasný součet skóre.

Přejímka ověřila tři stránky a devět GET: přímé adresy, skutečné `og:image` a `twitter:image`, parametry a přesměrování. Veřejné PNG jsou po bajtech shodné s dekódovanými a vizuálně prohlédnutými podklady. Původní vady a stanoviska R3 zůstávají výše jako historie; nové shrnutí nepřepisuje oponentův text.

**Zbývající blokátor: O-13, související dluh O-4.** Oprava obrázků a metadat neopravuje výpočty simulátoru. D1/D2 a otevřené produktové otázky se nemění. Historie dodávky: kód `79e29fc`, lokální přejímky `aa85c9e`, sloučení a nasazení `9146ef0`; PRD aktualizováno na v0.7.1.
