# Návrh rozvoje Přijímaček na školu pro přijímací řízení 2027

**Verze 2.1 — doplnění ověřené návštěvnosti A1 po vypořádání R1, 11. 9. 2026.** Stav: revidované zadání k další oponentuře. Nejde o potvrzení opravy produkčního simulátoru ani o schválení dosud otevřených produktových voleb.

Sekce 1 a úvod sekce 2 zachycují audit před dodávkou `c9ae452`; aktuální návrh v sekcích 3–9 je upraven podle zjištění R1. Úplné [původní znění](historie/rozvoj-2027-r0/navrh-rozvoje-2027.md) je zachováno. Každá připomínka O-1 až O-14 a obě přílohy mají [vypořádání níže](#vyporadani-r1), včetně nesouhlasu a důkazů. Historie a pravidla dalšího kola jsou na konci.

Kalendář a obnova prvního kola 2026 jsou nasazené; podrobnosti uvádí [záznam dodávky](aktualizace-kalendar-data-2027.md). [PRD Můj výběr v0.5](prd-muj-vyber-2027.md) rozlišuje hotové a navržené části. **O-13 zůstává otevřeným produkčním blokátorem:** odstranění zavádějících výstupů simulátoru je první opravná dodávka nezávislá na budoucí integraci Mého výběru. O-4 je navazující technický dluh. V tomto kole se mění zadání a podklady, nikoli aplikace.

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

**Podmínky uzavření S0:** zkontrolované API a všechny větve rozhraní včetně vybraných oborů, doporučení a sdílených URL; ověření chybějících hodnot a více zaměření jedné školy; vhodné regresní testy, build a kontrola mobilu/desktopu; po nasazení kontrola veřejného výsledku. Samotná změna textu návrhu O-13 neuzavírá.

**Technický dluh O-4:** odstranění nepodložených `estimatedChancePct`, `estimatedMinScore`, kategorií a rizika kombinace z výpočtového rozhraní `chances.ts`. Zobrazené historické podíly a poptávka zůstávají popisné. Podmínkou uzavření je kontrola všech konzumentů a test, že veřejné rozhraní nevrací osobní predikci. Nyní se predikce v Moje šance nevykreslují, ale výpočet není odstraněn.

**M0 — ověřit měření před hodnocením nových funkcí.** V kódu je jen úvodní `trackPageView`; v Matomo je report vlastních událostí prázdný. Nevyvozovat z toho nezájem o funkce. Ověřit klientské přechody Next.js včetně zpět/vpřed a zabránit dvojímu měření. Definovat úspěšné uložení, porovnání, zálohu a sdílení s jasným jmenovatelem a povolenými vlastnostmi bez soukromého obsahu či tokenů. M0 neodkládá odstranění vad v S0; blokuje vyhodnocení míry použití nového rozhraní, dokud nejsou události ověřené. Přijímací postup a limity jsou v analýze A1 §7. Rutinní čtení Matomo už je implementované podle [návodu](matomo-pristup.md); měření aplikace v této revizi opravené není.

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
| M0 — měření | Ověření a základ opravy navigačního měření; definice událostí nových funkcí, jejich realizace patří do C | 1–2 člověkodny navíc |
| B — data a profily | Identita nabídky, nepokryté obory, stavy 2027, ověřování školou a moderace; bez zopakování obnovy prvního kola a kalendáře | 8–13 člověkodnů |
| C — Můj výběr | Ukládání, porovnání, plán, účet bez hesla, záloha a náhled; dle uzavřeného PRD | 10–16 člověkodnů |
| H — historie a maturita | Produkční adaptéry a popisné oddíly profilů po ověření vzorků R1 | 3–6 člověkodnů navíc |
| V — studie vstupu/výstupu | Protokol, párování skupin, citlivost a rozhodnutí o publikaci; bez slibu kalibrované přidané hodnoty | 3–5 analytických dnů + metodická oponentura |
| D — příprava | Rozbor, plán, původní úlohy, tutor; rozsah dosud neimplementován | Původní pracovní odhad 20–35 člověkodnů + 40–80 hodin učitele, nutno zpřesnit |

S0+B+C: **20–33 zbývajících člověkodnů** podle rozsahu R1; s novým M0 **21–35**. Dny M0 nejsou naměřená spotřeba, případná změna archivace Matomo není součástí odhadu. H a V jsou oddělené volitelné rozšíření; neblokují základní ukládání, jejich datové místo v profilu se navrhne už nyní. Čísla nejsou příslibem termínu a jejich přesnost nebyla měřena. Návrh nemá oporu pro tvrzení, že všechno párování opravíme za několik hodin.

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
