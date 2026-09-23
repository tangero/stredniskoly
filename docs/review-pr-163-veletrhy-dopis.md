# Code review PR #163

Code review PR #163 „Veletrhy: dopis pořadatelům, zadání pro Eduardu a oprava fronty nahlášení“ — commit `21deafc` (větev `feat/veletrhy-dopis-poradatelum` → `main`, 10 souborů, +689/−38). Reviewer: Claude (session 23. 9. 2026), review ve worktree nad tímto commitem; opravy commitnuty přímo na větev PR, jak zadavatel požádal.

**Po vypořádání souhlasím s merge.** Před ním jsem nesouhlasil kvůli jedinému blokujícímu nálezu: dokumentace v PR nesla e‑mailové adresy a jméno konkrétních lidí (P0). Kód dopisu, migrace i skripty jsou v pořádku; šablona dopisu neměla žádný test, ten jsem doplnil.

## Nezávislé ověření (commit `21deafc`, před opravami)

- `test:mesto` pod Node 22.23.2 + tsx 4.23.15: **64/64**. `test:js` pod Node 24: **392/392** (včetně nového `tests/veletrhy-schema.test.mjs`, 6 testů, a pozvánek portálu — změna `odesliEmail` je pro ně neutrální: `to: string` zůstává, `text` se dopočítá jako dřív).
- `npx tsc --noEmit`, `eslint` na změněné soubory, `python3 scripts/kontrola-letopoctu.py`, `python3 scripts/stav-datovych-sad.py kontrola` (0 chyb), `git diff --check` — čisté.
- **Migrace:** `src/lib/veletrhy-schema.ts` má oba příkazy jako `create … if not exists`, nic nemaže; `db/migrace/005-veletrhy.sql` je z modulu vygenerovaný (hlavička, test rovnosti). Sloupce v INSERT a UPDATE route sedí s tabulkou. Test schématu ověřen čtyřmi mutacemi (index bez `if not exists`, rozchod `.sql` s modulem, sloupec navíc v INSERT, stav navíc mimo CHECK) — každá shodí test. Falešný pool v `tests/veletrhy-nahlasit.test.mjs` čte nový formát `.sql` správně (dvoumezerové odsazení zůstalo).
- **Skript rozesílky** čten celý, nespouštěn: bez `--opravdu` a `--na` nic neodešle; `--na` přesměruje vše na zadanou adresu a datum nezapisuje; `--jen` s neznámým id skončí chybou před rozesílkou; šablona se sestaví i nanečisto, takže neznámá akce nebo chybějící termín spadnou před rozesílkou. Pauza 700 ms mezi dopisy kvůli limitu Resend.
- **Vstupy rozesílky** `data/veletrhy/obesilani.json` a `odeslano.json` jsou gitignorované pravidlem `/data/*` (`git check-ignore -v`), v gitu nejsou. Commit zprávy ani tělo PR osobní údaje nenesou.
- **Číslo v dopise** („přes 25 000 návštěv od února 2026“) je doložené v `docs/analyza-navstevnosti-2026.md` (25 762 návštěv 11. 2.–11. 9. 2026, Matomo); podklad dopisu správně odmítl původní „20 000 uchazečů loni“ a říká proč.
- **Zadání pro Eduardu** neslibuje nic, co web nedělá: zmínka v odběru, značka partnera, statistiky prokliků a počty lidí jsou výslovně v „slíbit nesmíš“; nahlášení není zveřejnění; seznam vystavovatelů se nikde nezobrazí, dokud není zapsaný ve zdrojích dat. Pojmy odpovídají slovníku pojmů 1.21 (*online mediální partner*, *nahlásit akci*).

## Nálezy

### P0 (blokující, opraveno) — e‑maily a jméno konkrétních lidí ve veřejném repozitáři

`docs/veletrhy-skol-2027.md` § 8.6 nesl tři e‑mailové adresy konkrétních osob (dvě ze SŠP Olomouc, jednu z VIM) a jméno ředitele VIM; `docs/podklady/prompt-eduarda-veletrhy.md` (Otevřené věci) adresu ředitele SŠP Olomouc. Repozitář je veřejný a PR sám na jiných místech správně říká, že kontakty na osoby patří jen do gitignorovaného `data/veletrhy/`. Oprava: oba odstavce přepsány na role („ředitel školy“, „adresa ze sešitu“) s odkazem na `obesilani.json`; sdělení (jeden dopis se odrazil, kterému adresátovi Resend neřekne, znovu neposílat) zůstává.

**Co zůstává na zadavateli:** adresy jsou v historii větve (commity `36178e4`, `21deafc`) a od pushe byly veřejně dostupné. Historii jsem nepřepisoval — force‑push jsem neměl povolený. Doporučuji PR sloučit přes **squash merge** (do `main` se dostane jen výsledný stav) a větev po sloučení smazat; GitHub commity odstraní z dosahu při úklidu, případně lze požádat podporu. Jde o služební adresy, riziko je nízké, ale pravidlo je jednoznačné.

### P2 (opraveno) — šablona dopisu neměla test, tvrzení „drží text slovo od slova“ nemělo doklad

Přidán `tests/veletrhy-dopis.test.mjs` (6 testů, pod `test:mesto`, protože šablona importuje data přes `@/`): dopis vygenerovaný ze skutečných dat se porovnává s `docs/podklady/dopis-poradatelum-veletrhu.md` odstavec po odstavci (12+ odstavců), tři varianty věty o termínu se berou z citací v podkladu, cizí zdroj termínu nesmí tvrdit „odkazujeme na vaši stránku“, série má výčet a množné tvary, neznámá akce a akce bez termínu dopis zastaví, textová verze má adresu jednou a bez značek. Ověřeno devíti mutacemi šablony i podkladu — každá shodí test.

### P3 (opraveno) — zadání pro Eduardu opisovalo podobu stránky, která se právě mění

Řádek „Filtr podle kraje a města … věta ‚Pořadatelem je …, ne tento web‘“ popisuje stav před PR #162 (kraj jako osa, bez filtru měst, „Pořádá …“). Přepsáno na stabilní popis s pokynem podobu stránky neopisovat z paměti.

### P3 (neblokující, neopraveno) — věta o přibližném termínu je ušitá na jednu akci

`vetaOTerminu('pribligny')` říká „harmonogram videohovorů podle okresů“, což platí jen pro online veletrh MSK. Jako obecná varianta je to past pro příští sezónu; dnes má jediného adresáta a dopisy už odešly, takže to nechávám s poznámkou. Totéž platí o větě „podle krajů a měst“ v představení přehledu — po sloučení PR #162 už města filtr nejsou; před příští rozesílkou podklad i šablonu přečíst znovu (test je na to teď připravený: změna podkladu bez změny šablony spadne).

### P3 (neblokující) — dokument veletrhů: hlavička a changelog

Hlavička `docs/veletrhy-skol-2027.md` dál říká „Verze 0.5“, zatímco changelog má 0.10; PR #162 hlavičku posouvá na 1.0 a vkládá řádek changelogu na totéž místo jako tento PR (0.10) — při sloučení druhého z nich vznikne triviální konflikt v tabulce historie. Neřeším tady, aby konflikt nebyl větší; kdo slučuje druhý, srovná číslování (0.10 → 1.1 nebo obráceně).

## Ověření po opravách

`test:mesto` pod Node 22.23.2: **70/70** (64 + 6 testů dopisu); `test:js` pod Node 24: **392/392**; `tsc`, `eslint` (včetně nového testu), `git diff --check` čisté. `package.json`: nový test přidán do `test:mesto` a vyloučen z `test:js` (alias `@/` plain Node nezná). Mutační ověření: 9 mutací šablony a podkladu, 4 mutace schématu — každá shodí aspoň jeden test.

## Postup

1. Opravy jsou na větvi PR v commitu za `21deafc`; verdikt platí pro tuto hlavu.
2. Zadavatel rozhodne o způsobu sloučení (doporučeno squash) a o tom, zda žádat GitHub o odstranění dosažitelných commitů.
3. Merge jsem neprovedl; skript rozesílky jsem nespouštěl; produkční databázi jsem nečetl ani neměnil.
