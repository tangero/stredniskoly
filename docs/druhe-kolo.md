# Druhé kolo přijímacího řízení

Verze 1.1 · 13. 9. 2026 · Návrh, realizace a ověření.

Otázka rodiče, na kterou web dosud neodpovídal: **když se dítě nedostane v 1. kole, má na tomhle oboru ještě šanci?** A obráceně: dá se se školou počítat jako s pojistkou pro 2. kolo?

Podklady: [zdroje dat, oddíl 2.1](zdroje-dat.md#21-cermat-agregovaná-data-za-obory), [slovník ukazatelů](slovnik-ukazatelu.md), registr `public/stav_datovych_sad.json`, sada `cermat-kolo2-agregaty`.

## 1. Co data říkají

Denní nezkrácené nabídky s povinnou jednotnou zkouškou včetně formy „den2“, stejný výběr jako na webu. Počítáno ze souborů výsledků 1. a 2. kola, nabídky spárovány podle školy, oboru, zaměření, formy, délky, zkráceného studia a jazyka; identifikátor nabídky se mezi koly liší.

| | 2025 | 2026 |
|---|---|---|
| Nabídek ve 2. kole | 1 072 | 1 060 |
| z toho spárováno s 1. kolem | 880 | 886 |
| Míst ve 2. kole | 12 248 | 12 034 |
| Přihlášek | 18 157 | 16 191 |
| Přijatých | 5 303 | 4 946 |
| Nabídek, kde se někdo nevešel kvůli kapacitě | 256 | 199 |
| Nabídek bez jediné přihlášky | 59 | 47 |

Tři zjištění, která určují návrh:

1. **Nenaplněný obor neznamená 2. kolo.** Z oborů, které po 1. kole 2026 neměly plno, vypsalo 2. kolo jen 53 %.
2. **Kapacitu 2. kola nelze dopočítat.** Rovná se rozdílu kapacity a přijatých z 1. kola jen u 47 % nabídek, protože se do ní promítají uchazeči, kteří se přijetí vzdali, a rozhodnutí školy. Zobrazuje se proto jen zveřejněná kapacita.
3. **Druhé kolo se u téhož oboru opakuje.** Obor, který měl 2. kolo v roce 2025, ho v roce 2026 vypsal znovu v 66 % případů; obor bez 2. kola 2025 jen v 15 %.

Nejnižší výsledek přijatých ve 2. kole je v souhrnu k dispozici, ale aspoň deset přijatých s výsledkem zkoušky má jen 133 nabídek roku 2026.

## 2. Zobrazení

Blok **Druhé kolo** na stránce oboru a na stránce školy s jediným oborem, pod blokem „Jak to dopadlo loni“. Období určuje registr u sady `cermat-kolo2-agregaty`; starší rok slouží jako srovnání.

| Situace nabídky v zobrazeném roce | Co blok řekne |
|---|---|
| Škola vypsala 2. kolo | Počet míst, přihlášek a přijatých. Když se někdo nevešel, kolik jich bylo. Když se na 2. kolo nikdo nepřihlásil, řekne to. Nejnižší přijatý výsledek jen při aspoň deseti přijatých s výsledkem zkoušky. |
| Obor se v 1. kole nenaplnil, 2. kolo škola nevypsala | Že přijala méně uchazečů, než měla míst, a přesto 2. kolo nevypsala, takže se na něj nedá spoléhat. |
| Obor se naplnil a 2. kolo nevypsal | Jedna věta, že 2. kolo nebylo. |
| Nabídka v datech 1. ani 2. kola není | Nic. |

Ke každé situaci se připojí věta o předchozím roce, pokud je k dispozici: zda škola 2. kolo vypsala i tehdy. Obecná věta o opakování 2. kola se nezobrazuje jako předpověď pro konkrétní školu; slouží jen k výkladu, proč má smysl ukazovat loňsko.

### Co blok neříká

- **Nepředpovídá, zda 2. kolo bude.** Opakování v 66 % případů není slib.
- **Nemíchá kola.** Čísla 2. kola se nesčítají s čísly 1. kola a netvoří žádný souhrnný ukazatel.
- **Nabídky jen ve 2. kole** se nezobrazují: 174 nabídek roku 2026 nemá v 1. kole protějšek a web pro ně nemá stránku.

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
- **Testy:** `tests/test_druhe_kolo.py`, šest testů: všechny stavy nabídky, kolize klíče, obor bez povinné zkoušky, nejnižší výsledek jen při deseti přijatých, zachování starších roků, zpracovatel v datové lince včetně pojistky proti prázdnému výsledku.
- **Web:** blok ověřen na běžícím serveru na ekonomickém lyceu OA Na Příkopech (2. kolo s nevešlými uchazeči a nejnižším přijatým), na osmiletém gymnáziu Jana Palacha (nenaplněno bez 2. kola, loni 2. kolo bylo), na technickém lyceu Gymnázia J. S. Machara (2. kolo v obou letech) a na jeho osmiletém gymnáziu (bez 2. kola). Zobrazený rok bere `src/lib/druhe-kolo.ts` z registru stavu datových sad; je to první místo webu, které se registrem řídí.

Pod blokem zůstává starší blok „Přijetí a kapacita“ s čísly z roku 2025 u oborů bez zaměření. Jde o vadu popsanou v [návrhu aktuálního ročníku dat](navrh-aktualniho-rocniku-dat.md), krok 1.

## Historie

| Verze | Změna |
|---|---|
| 1.1 | Výsledky ověření importu, testů a zobrazení. |
| 1.0 | Návrh a realizace. |
