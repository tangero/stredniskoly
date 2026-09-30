# Sekce pro novináře a balíčky dat

Verze 1.2 · 30. 9. 2026 · **Realizováno; rozhodnutí vlastníka z oddílu 5 přijata 30. 9. 2026.**

## 1. Proč

Web zpracovává data, která novináři jinde v jednom celku nedostanou: výsledky 1. a 2. kola po oborech, kam se uchazeči dostali, přehled veletrhů a přepis kritérií přijetí. Cílem je, aby je citovali **i se zdrojem**. Novinář zdroj uvede, když ho má v souboru, který stáhl, a když ví, co číslo neříká. Proto:

- jedna stálá adresa `/pro-novinare`, ne přílohy v e-mailu,
- každý soubor nese citaci a výhrady v listu „O datech“,
- stránka ukazuje klíčová čísla ve tvaru, ve kterém se dají převzít, vždy s rokem a množinou.

Vedlejší cíl je stejný jako u [veletrhů](veletrhy-skol-2027.md) § 1.1: zpětné odkazy z médií.

## 2. Balíčky

Generuje `scripts/build-pro-novinare.py` do `public/pro-novinare/`. Každý balíček je XLSX (list „O datech“ a tabulky) a CSV za každou tabulku (UTF-8 s BOM, čárka, desetinná tečka). Vše najednou v `prijimacky-na-skolu-data.zip`. Stránka čte `souhrn.json`.

| Balíček | Obsah | Zdroj | Sada v registru |
|---|---|---|---|
| Veletrhy | akce s potvrzeným termínem, počty po krajích | snímek `src/data/veletrhy-2027.json` (export z databáze před generováním) | `veletrhy-skol` |
| Konzervatoře | 18 konzervatoří s obory, termíny řízení, výsledky 1. kola po oborech | index názvů rejstříku, harmonogram MŠMT, souhrn 1. kola CERMAT | `msmt-rejstrik-snimky`, `msmt-harmonogram`, `cermat-vysledky` |
| Obory 1. kola | 3 091 nabídek s jednotnou zkouškou: poptávka, výsledek, 2. kolo | `applications_2026.json`, `souhrny_kolo1.json`, `druhe_kolo.json`, souhrn 1. kola | `cermat-vysledky`, `cermat-kolo2-agregaty` |
| Uchazeči 1. a 2. kola | kam se uchazeči dostali v 1. a 2. kole, po krajích a ročnících; kdo zůstal bez místa ani po 2. kole; volná místa po 2. kole | data uchazečů 1. a 2. kola, souhrn 2. kola | `cermat-uchazeci-kolo1`, `cermat-uchazeci-kolo2`, `cermat-kolo2-agregaty` |
| 2. kolo | všechny nabídky 2. kola s jednotnou zkouškou i bez ní, souhrny po krajích a typech | souhrn 2. kola CERMAT | `cermat-kolo2-agregaty` |
| Kritéria | co vedle jednotné zkoušky bodovalo, souhrn a obory s výhradou v každém řádku | `kriteria_prijeti_{rok}.json` | `dipsy-kriteria` |

Zdrojové XLSX CERMAT nejsou v gitu. Generátor je dostane adresářem `--vstupy` a ověří otisk sha256 proti registru (2. kolo) nebo metadatům výsledků (1. kolo); data uchazečů otisk v registru nemají, ověřuje se počet řádků z poznámky registru (156 210). **Nestahuje se nic, co by web nepřevzal**: soubory 1. a 2. kola jsou tytéž, ze kterých vznikly `applications_2026.json` a `druhe_kolo.json`.

### Proč konzervatoře a ne „obory s přihláškou ještě letos“

Zadání znělo „konzervatoře a další, které chtějí přihlášky ještě letos“. Harmonogram MŠMT 2026/2027 (ověřeno v PDF 29. 9. 2026) má podzimní termín **jen pro konzervatoře**: kritéria 15.–31. 10., přihlášky 1.–30. 11. 2026. Talentové obory středních škol (umělecké obory, gymnázia se sportovní přípravou) podávají přihlášky s ostatními v únoru, talentové zkoušky jsou 15. 3.–23. 4. Balíček proto nese jen konzervatoře a list „O datech“ to říká.

Seznam konzervatoří je z rejstříku (obory 82-44-P až 82-47-P) a shoduje se s konzervatořemi v souhrnu 1. kola 2026 (18 = 18, generátor to kontroluje). Rejstřík říká, co škola smí učit, ne co pro rok 2027 otevře.

## 3. Zvážené nepoužité sloupce

Povinný krok podle [zdrojů dat](zdroje-dat.md), oddíl 3. Balíčky jsou jiné použití dat než stránka školy: čtenář je novinář, který chce celek a srovnání, ne rodina u jednoho oboru. Proto se některá rozhodnutí oddílu 3 posouvají.

| Nepoužitý sloupec | Rozhodnutí pro balíčky |
|---|---|
| Oficiální nejnižší výsledek přijatých (souhrn, sloupec 72) | **Použit** v balíčku oborů. Balíček potřebuje hodnotu po nabídkách; minimum z pásem je za obor bez zaměření a u nabídky s víc zaměřeními stálo vedle cizího počtu přijatých (v prvním běhu 5 nabídek s méně než deseti přijatými). Heslo *Oficiální nejnižší výsledek přijatých*. |
| Přijatí podle priority (sloupce 40–44) | Nepoužito po oborech. Otázku „dostávají se sem ti, kdo chtěli nejvíc“ balíček uchazečů zodpoví celostátně jako *Výsledek uchazeče v 1. kole* (na kolikátou volbu), což je pro novináře srozumitelnější. |
| Výsledky zkoušky všech uchazečů (sloupce 45–65) | Nepoužito: minimum a maximum určuje jediný uchazeč; průměrné umístění uchazečů by vedle průměru přijatých svádělo ke srovnání, které slovník nedefinuje. |
| Data uchazečů 2. kola | **Použito od verze 1.2** (30. 9. 2026): sada `cermat-uchazeci-kolo2` přepnuta na „web“ a období 2026 příkazem `prepni` s otiskem souboru. Balíček uchazečů a stránka ukazují uchazeče 2. kola, přijaté a nepřijaté a složení těch, kdo se nedostali ani ve 2. kole. Soubory kol nemají společný identifikátor uchazeče, proto se porovnávají jen počty. |
| DiPSy `/app/public-stats` | Nepoužito: celostátní počty uchazečů by se musely sladit s definicemi CERMAT. |
| `skolniCast`, `typyPriloh` z DiPSy | Nepoužito: kritéria balíček bere z přepisu PDF, příznak školní části bodování nevysvětlí (Dopplerovo gymnázium, zdroje § 2.16). |
| Profil dovedností (položková data) | Nepoužito: soubory nezpracované, mimo rozsah. |
| Maturitní výsledky | Nepoužito v této dávce. Byly by dobrý sedmý balíček (škola proti podobným školám), ale zadání mířilo na přijímací řízení; zapsáno jako námět. |
| Kontakty pořadatelů veletrhů | Nepoužito a nesmí: v balíčku jen veřejná pole akce (název, termín, místo, pořadatel, odkaz). |
| Kdo na veletrhu vystavuje | Neexistuje v žádném zdroji; balíček to říká. |
| Nepotvrzené termíny veletrhů | Nepoužito: jen jejich počet v „O datech“. |

## 4. Co čísla neříkají a jak to balíčky hlídají

- **Rok u každého čísla**, rok z registru. Stránka nepíše „loni“ ani „letos“.
- **Ročníky se nesčítají.** Uchazeči 5. a 7. třídy, kteří se nedostali, zůstávají na základní škole. Rok 2026: nepřijato nikam 8 % deváťáků, ale 53 % uchazečů o osmiletá a 64 % o šestiletá gymnázia. Sečíst to do jednoho čísla by byl nejhorší možný titulek.
- **Deváťáci jsou jen žáci základní školy.** Kdo se hlásí jen na dálkové či zkrácené studium nebo jen na nástavbu, do balíčku uchazečů nepatří (2026: 13 514 lidí). První verze je počítala mezi deváťáky a podíl nepřijatých nadsadila z 8,2 na 10,2 % (nález review Codexu, kolo 1).
- **Slovo „šance“ se nepoužívá** ani pro 2. kolo (slovník pojmů, oddíl 5). Balíček uvádí přijaté na přihlášku a vysvětluje, proč to není podíl úspěšných uchazečů.
- **Kritéria jen souhrnně na stránce.** Jmenovitý seznam je v balíčku s výhradou v každém řádku, protože novinář převezme řádek, ne list „O datech“.
- **Kraj uchazeče je kraj školy první volby**, ne bydliště.
- **Veletrhy: „víme o“, ne „koná se“.**

### Co se za ukazatel nepovažuje

Velikost souboru a počet řádků u odkazů ke stažení jsou technické údaje o souboru, ne čísla o přijímacím řízení; heslo ve slovníku ukazatelů nemají (review Codexu, kolo 3, nález odmítnut). Texty ve sloupcích `*_text_prepisu` balíčku kritérií jsou slova školy z přepisu, proto v nich mohou stát i výrazy, které slovník pojmů pro naše texty zakazuje (citace výjimku mají).

## 5. Rozhodnutí vlastníka

Nastavení je na jednom místě, `src/data/pro-novinare.json`. **30. 9. 2026 vlastník přijal všechny tři navržené hodnoty** pokynem ke sloučení PR #198; změna se dělá úpravou souboru a přegenerováním balíčků. Stránka i generátor ho čtou, takže změna se projeví v obou po přegenerování.

1. **Pod jakou značkou citovat.** Návrh: „Přijímačky na školu (prijimackynaskolu.cz)“, v plné citaci „projekt Hlídače státu“. `llms.txt` vede Hlídač státu jako provozovatele.
2. **Licence balíčků.** Návrh: CC BY 4.0, tedy volné použití s uvedením zdroje. Podmínka „uveďte zdroj“ je jádrem cíle z oddílu 1. Zdrojová data CERMAT jsou otevřená data; ověřit, že jejich podmínky odvozené dílo pod CC BY nevylučují.
3. **Kontakt pro média.** Dnes `eda@prijimackynaskolu.cz` z patičky. Jestli mají média dostat jiný kontakt (a jméno člověka, který mluví do médií), rozhodne vlastník.

## 6. Obnova

Balíčky jsou statické soubory v `public/`, obnovují se ručně spuštěním generátoru:

```
npm run veletrhy:export              # čerstvé veletrhy z databáze (DATABASE_URL z .env.local)
python3 scripts/build-pro-novinare.py --vstupy ADRESAR_SE_ZDROJI --dnes $(date +%F)
```

Kdy: po exportu veletrhů (týdně v sezóně), po přepnutí kterékoli sady v registru, po nových kritériích (únor). Automatizace v GitHub Action je možná, ale zdrojová XLSX by se musela stahovat v CI; zatím ne.

## 7. Další kroky

1. ~~Převzít data uchazečů 2. kola~~ hotovo ve verzi 1.2. Kolik z nepřijatých v 1. kole se dostalo ve 2. kole, zjistit nejde: soubory nemají společný identifikátor uchazeče. Dotaz na CERMAT, zda by identifikátor (i pseudonymní) mohl přidat, by to umožnil.
2. Maturitní balíček (škola proti podobným školám).
3. Obnova balíčků v CI po exportu veletrhů.

## Historie

| Verze | Změna |
|---|---|
| 1.2 | Data uchazečů 2. kola na webu: sada `cermat-uchazeci-kolo2` přepnuta na „web“, 2026; balíček uchazečů přejmenován na `uchazeci-{rok}.xlsx` (dřív `uchazeci-1-kolo-{rok}.xlsx`), CSV 1. kola beze změny názvu; volná místa po 2. kole. |
| 1.1 | Vypořádání čtyř kol review Codexu (populace uchazečů, okres po nabídkách, hesla slovníku); rozhodnutí vlastníka o značce, licenci a kontaktu. |
| 1.0 | Návrh, generátor, balíčky a stránka `/pro-novinare`. |
