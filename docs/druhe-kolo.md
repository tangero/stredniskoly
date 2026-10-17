# Druhé kolo přijímacího řízení

Verze 1.2 · 14. 9. 2026 · Návrh, realizace a ověření.

Otázka rodiče, na kterou web dosud neodpovídal: **když se dítě nedostane v 1. kole, má na tomhle oboru ještě šanci?** A obráceně: dá se se školou počítat jako s pojistkou pro 2. kolo?

Podklady: [zdroje dat, oddíl 2.1](zdroje-dat.md#21-cermat-agregovaná-data-za-obory), [slovník ukazatelů](slovnik-ukazatelu.md), registr `public/stav_datovych_sad.json`, sada `cermat-kolo2-agregaty`.

## 1. Co data říkají

Denní nezkrácené nabídky s povinnou jednotnou zkouškou včetně formy „den2“, stejný výběr jako na webu. Počítáno ze souborů výsledků 1. a 2. kola, nabídky spárovány podle školy, oboru, zaměření, formy, délky, zkráceného studia a jazyka; identifikátor nabídky se mezi koly liší. Nabídky, které tak zůstanou bez protějšku, se v druhém průchodu párují bez zaměření, ale jen jednoznačně (oddíl 7).

| | 2025 | 2026 |
|---|---|---|
| Nabídek ve 2. kole | 1 072 | 1 060 |
| z toho spárováno s 1. kolem | 1 042 (880 se shodným zaměřením, 162 bez něj) | 1 039 (886 + 153) |
| Míst ve 2. kole | 12 248 | 12 034 |
| Přihlášek | 18 157 | 16 191 |
| Přijatých | 5 303 | 4 946 |
| Nabídek, kde se někdo nevešel kvůli kapacitě | 256 | 199 |
| Nabídek bez jediné přihlášky | 59 | 47 |

Tři zjištění, která určují návrh:

1. **Nenaplněný obor neznamená 2. kolo.** Z oborů, které po 1. kole 2026 neměly plno, vypsalo 2. kolo jen 63 % (do 17. 10. 2026 uváděno 53 %, než se párovaly i nabídky se zaměřením změněným mezi koly).
2. **Kapacitu 2. kola nelze dopočítat.** Rovná se rozdílu kapacity a přijatých z 1. kola jen u 46 % nabídek, protože se do ní promítají uchazeči, kteří se přijetí vzdali, a rozhodnutí školy. Zobrazuje se proto jen zveřejněná kapacita.
3. **Druhé kolo se u téhož oboru opakuje.** Obor, který měl 2. kolo v roce 2025, ho v roce 2026 vypsal znovu v 71 % případů; obor bez 2. kola 2025 jen v 14 % (přepočteno 17. 10. 2026 po rozšíření párování; dříve 66 a 15 %).

Nejnižší výsledek přijatých ve 2. kole je v souhrnu k dispozici, ale aspoň deset přijatých s výsledkem zkoušky má jen 133 nabídek roku 2026.

## 2. Zobrazení

Od 14. 9. 2026 (verze 1.2) se 2. kolo ukazuje na nových stránkách takto; věty skládá jedna funkce `src/lib/druhe-kolo-vyklad.ts`, aby všude zněly stejně:

| Místo | Co ukazuje |
|---|---|
| Stránka oboru, otázka „Co vám pomůže“ | jedna věta situace; u vypsaného 2. kola i počet nevešlých. Obor naplněný v 1. kole bez 2. kola jen tam, kde se někdo nevešel: rodina se dozví, že druhá šance nebyla |
| Stránka oboru, důkaz „2. kolo“ | celý blok podle tabulky níže, předchozí rok a zdroj |
| Stránka školy, řádek oboru | krátký řádek, například „2. kolo 2026: 7 míst, přijato 2“ nebo „2. kolo 2026 škola nevypsala; ve výsledcích 1. kola přijato 28 na 30 míst“ |
| Otevřená data školy (`.json`, `.md`) | u oboru pole `druhe_kolo` se zveřejněnými počty, stavem, předchozím rokem a popisem |

Nová proti verzi 1.1 je věta o tom, proč škola ve 2. kole nepřijala všechny, když se nikdo nevešel kvůli kapacitě: kolik uchazečů se dostalo na obor výš na přihlášce a kolik nedosáhlo požadavku školy (sloupce 87 a 89).

Původní blok **Druhé kolo** zůstává ve starší podobě stránky oboru (obory bez souhrnu 1. kola), pod blokem „Jak to dopadlo loni“. Období určuje registr u sady `cermat-kolo2-agregaty`; starší rok slouží jako srovnání.

| Situace nabídky v zobrazeném roce | Co blok řekne |
|---|---|
| Škola vypsala 2. kolo | Počet míst, přihlášek a přijatých. Když se někdo nevešel, kolik jich bylo. Když se na 2. kolo nikdo nepřihlásil, řekne to. Nejnižší přijatý výsledek jen při aspoň deseti přijatých s výsledkem zkoušky. |
| Obor se v 1. kole nenaplnil, 2. kolo škola nevypsala | Kolik uchazečů škola podle výsledků 1. kola přijala na kolik míst a že 2. kolo nevypsala. Výsledky 1. kola nezachycují, jak škola místa obsadila potom, proto věta netvrdí, že místa zbyla; méně přijatých než míst neznamená, že 2. kolo bude (#258). |
| Obor se naplnil a 2. kolo nevypsal | Jedna věta, že 2. kolo nebylo. |
| Nabídka v datech 1. ani 2. kola není | Nic. |

Ke každé situaci se připojí věta o předchozím roce, pokud je k dispozici: zda škola 2. kolo vypsala i tehdy. Obecná věta o opakování 2. kola se nezobrazuje jako předpověď pro konkrétní školu; slouží jen k výkladu, proč má smysl ukazovat loňsko.

### Co blok neříká

- **Nepředpovídá, zda 2. kolo bude.** Opakování v 71 % případů není slib.
- **Nemíchá kola.** Čísla 2. kola se nesčítají s čísly 1. kola a netvoří žádný souhrnný ukazatel.
- **Nabídky jen ve 2. kole** se nezobrazují: 21 nabídek roku 2026 (2025: 30) nemá v 1. kole protějšek ani po druhém průchodu párování a web pro ně nemá stránku. Do 17. 10. 2026 jich bylo 174 (2025: 192).

## 3. Zvážené nepoužité sloupce

Povinný krok podle `docs/zdroje-dat.md`, oddíl 3.

| Sloupec | Rozhodnutí |
|---|---|
| Přihlášky a přijatí podle priority ve 2. kole | Zamítnuto pro tento krok: počty ve 2. kole jsou malé a pořadí na přihlášce tam pro rodiče neznamená totéž co v 1. kole. |
| Výsledky zkoušky všech uchazečů ve 2. kole | Zamítnuto: popisuje konkurenci, ale při malých počtech kolísá; lze doplnit později. |
| Percentily přijatých ve 2. kole | Zamítnuto: body stačí a percentil by u malých počtů svedl k přesnosti, kterou nemá. |
| Data uchazečů 2. kola | Zamítnuto: pásma přijetí by šla spočítat jen u 133 nabídek. |
| Oficiální minimum přijatých v **1. kole** | Mimo tento krok, ale zásadní nález: shoduje se s naším výpočtem u 97 % oborů a je po zaměřeních i za rok 2026. Doporučeno nahradit jím vlastní výpočet v bloku „Jak to dopadlo loni“. |

## 4. Realizace

| Část | Kde |
|---|---|
| Import | `scripts/build-druhe-kolo.py`, výstup `public/druhe_kolo.json` s ročníky jako klíči, bez roku v názvu souboru |
| Registr | sada `cermat-kolo2-agregaty`, použití `web`, kontrola období proti `meta.nejnovejsi_rok` |
| Datová linka | zpracovatel sady v `scripts/linka/zpracovani.py`, stáhne k souboru 2. kola i výsledky 1. kola téhož roku |
| Datová vrstva | `src/lib/druhe-kolo.ts`, zobrazený rok bere z registru |
| Zobrazení | `src/components/school/detail/DruheKoloCard.tsx` |

## 5. Ověření 13. 9. 2026

- **Import:** `public/druhe_kolo.json` s ročníky 2025 a 2026. V roce 2026 má 2. kolo 886 nabídek, 768 nenaplněných oborů ho nevypsalo a 1 437 se naplnilo v 1. kole. Na data se napojí všech 3 091 vypsaných nabídek katalogu. První verze importu vynechala čtyři nabídky ve formě „den2“, protože filtr přijímal jen „den“; opraveno.
- **Testy:** `tests/test_druhe_kolo.py`, šest testů (od 17. 10. 2026 osm, přibyl druhý průchod párování včetně nejednoznačných kandidátů): všechny stavy nabídky, kolize klíče, obor bez povinné zkoušky, nejnižší výsledek jen při deseti přijatých, zachování starších roků, zpracovatel v datové lince včetně pojistky proti prázdnému výsledku.
- **Web:** blok ověřen na běžícím serveru na ekonomickém lyceu OA Na Příkopech (2. kolo s nevešlými uchazeči a nejnižším přijatým), na osmiletém gymnáziu Jana Palacha (nenaplněno bez 2. kola, loni 2. kolo bylo), na technickém lyceu Gymnázia J. S. Machara (2. kolo v obou letech) a na jeho osmiletém gymnáziu (bez 2. kola). Zobrazený rok bere `src/lib/druhe-kolo.ts` z registru stavu datových sad; je to první místo webu, které se registrem řídí.

Pod blokem zůstává starší blok „Přijetí a kapacita“ s čísly z roku 2025 u oborů bez zaměření. Jde o vadu popsanou v [návrhu aktuálního ročníku dat](navrh-aktualniho-rocniku-dat.md), krok 1.

## 6. Ověření 14. 9. 2026

- **Zdroj beze změny:** `PZ2026_kolo2_skolobory_vysledky.xlsx` staženo znovu, sha256 `c69aca68…` shodný s importem.
- **Nezávislý přepočet** z tabulky CERMAT u osmi nabídek 2026 (technické lyceum Gymnázia J. S. Machara, 600170748 obchodní akademie, 600016234 osmileté gymnázium, 600008550, 600010309, 600012760 s nejnižším přijatým, podnikání a mechanizace SŠ gastronomie 600014614) a u lycea Machara 2025: kapacita, přihlášky, přijatí, nevešlí, nedosáhli požadavku, přijati výš i nejnižší přijatý (součet procent češtiny a matematiky vydělený dvěma) sedí.
- **Prázdná buňka přihlášek** znamená žádnou přihlášku: v souboru 2026 je 234 prázdných a žádná nula, prázdná je vždy i u přijatých, zatímco přijatí 0 při nenulových přihláškách jsou zapsáni nulou (311 řádků).
- **Web:** všechny situace ověřeny na lokálním serveru na stránce oboru, stránce školy i v otevřených datech; testy `tests/druhe-kolo-vyklad.test.mjs`.
- **Nalezená chyba mimo 2. kolo:** obory bez zaměření, které přibyly až v ročníku 2026, neměly detail oboru; odkaz padal na přehled školy (například podnikání a mechanizace na SŠ gastronomie, náměstí Svobody). Opraveno v `getSchoolPageType`.

## 7. Párování bez zaměření (17. 10. 2026, #282)

Škola může zaměření mezi koly zapsat jinak: doplnit ho až ve 2. kole (Lyceum Hotelové školy Komenského, 600007561, 78-42-M/08: v 1. kole bez zaměření, ve 2. kole „Moderní ekonomika a udržitelný rozvoj“, 64 přihlášek a 17 přijatých), vynechat ho, změnit velikost písmen nebo opravit překlep. Přesné párování takové nabídky ztratilo a web u nich 2. kolo neukazoval.

**Pravidlo** (`sparuj` v `scripts/build-druhe-kolo.py`): po přesném párování se nabídky, které zůstaly bez protějšku na obou stranách, párují podle školy, oboru, formy, délky, zkráceného studia, jazyka a povinnosti jednotné zkoušky, tedy bez zaměření. Spáruje se jen tam, kde se stejným klíčem zbývá **právě jedna** nabídka v 1. kole a **právě jedna** ve 2. kole; víc kandidátů se nehádá. Stejné párování používá `scripts/build-obory-bez-jpz.py` pro pole `kolo_2` u oborů bez zkoušky.

| | 2025 | 2026 |
|---|---|---|
| Nabídek jen ve 2. kole před změnou | 192 | 174 |
| z toho nově spárováno bez zaměření | 162 | 153 |
| zaměření jen ve 2. kole | 22 | 31 |
| zaměření jen v 1. kole | 80 | 60 |
| zaměření v obou kolech, jiný text | 60 | 62 |
| Zůstává jen ve 2. kole | 30 | 21 |

Obory bez zkoušky (2026): 151 nabídek nově s 2. kolem, celkem 1 412 místo 1 261.

**Co pravidlo neříká.** Shodu školy, oboru, formy, délky a jazyka bere jako tutéž nabídku. U většiny párů jde o tentýž text v jiné podobě (velikost písmen, překlep, „ŠVP:“ na začátku), menšina má zaměření pojmenované jinak, například elektrotechnický obor 600005259 („Mechanik elektrotechnik“ v 1. kole, „Elektromechanik pro zařízení a přístroje“ ve 2. kole). Protože jiná nabídka téhož oboru na škole nezbývá, jde o tentýž obor školy; čísla 2. kola se u něj ukazují pod názvem z 1. kola.

**Nezávislá kontrola:** identifikátor `ID_SO` (na rozdíl od `ID_SOF` je v obou kolech stejný) se shoduje u všech 153 nových párů roku 2026 i všech 162 roku 2025. Ze zbylých nabídek jen ve 2. kole by `ID_SO` dál spároval 19 (2026) a 27 (2025), u nich ale na některé straně zbývá víc kandidátů; jeho zavedení jako klíče je samostatné rozhodnutí ([návrh oborů bez zkoušky](navrh-obory-bez-jpz-2027.md), oddíl o párování).

Ručně ověřeno proti `PZ2026_kolo2_skolobory_vysledky.xlsx`: Lyceum 600007561 (64 přihlášek, 17 přijatých, kapacita 17), logistika 600013782 („Logsitika“ → „Logistika“, kapacita 39, 110 přihlášek, 40 přijatých) a elektrotechnický obor 600005259 (kapacita 26, 135 přihlášek, 26 přijatých).

## Historie

| Verze | Změna |
|---|---|
| 1.3 | Druhý průchod párování bez zaměření, jen jednoznačné páry (#282); přepočtené podíly v oddílu 1. |
| 1.2 | 2. kolo na nové stránce oboru, stránce školy a v otevřených datech ze společné funkce vět; věta o důvodech nepřijetí ve 2. kole; ověření proti zdroji; oprava detailu nových oborů bez zaměření. |
| 1.1 | Výsledky ověření importu, testů a zobrazení. |
| 1.0 | Návrh a realizace. |
