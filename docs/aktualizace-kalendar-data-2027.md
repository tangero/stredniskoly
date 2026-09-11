# Kalendář 2027 a obnova prvního kola 2026

Připraveno 11. 9. 2026. První dodávka podle schváleného pořadí: kalendář a opravy dat; profily škol a Můj výběr následují.

## Veřejné změny

- `/prijimacky-2027`: 20 událostí, oddělené SŠ, konzervatoře a druhé kolo. Přihlášky na SŠ končí 22. 2. 2027; konzervatoře mají přihlášky již v listopadu 2026. Jednotlivé dny JPZ jsou samostatné události.
- `/prijimacky-2027.ics`: export ze stejného JSON jako web; celodenní události, koncový den ICS je vyloučený. Obsahuje všechny tři skupiny, nikoli individuální pozvánky; stažená kopie se neaktualizuje.
- Vstup z hlavní stránky, navigace, patičky a sitemap.
- Obnova výsledků, přihlášek a kapacit 1. kola 2026. Srovnání skóre používá současný oficiální export 2025. Historické `schools_data.json` s údaji 2024/2025 zůstává beze změny.
- Odstraněna záměna změny ČJ+MA za změnu matematiky a nepodložené predikce. Průměr přijatých není označován za minimum. Z přehledu konkurence jsou odstraněny procentní osobní šance, předpověď minima a neověřené doporučení bezpečnosti kombinace.
- Normalizace identifikátoru zaměření a odmítnutí nejednoznačných historických ID. Městské součty nesmějí znovu použít jeden výsledek pro více starých nabídek. Nové či přejmenované obory se nespárují odhadem.
- Městské komentáře vznikají deterministicky ze zobrazených dat. Starší AI cache se nepoužívá: obsahovala neplatné součty a odhad počtu nepřijatých osob z přihlášek.

## Ověřené zdroje

- [Harmonogram MŠMT, strany 1–3](https://msmt.gov.cz/media/wp-content/uploads/2026/08/Casovy-harmonogram_2026-2027.pdf), ověřeno 11. 9. 2026. Zkoušková období uvádíme jako pracovní dny podle tabulek MŠMT.
- [Termíny JPZ](https://msmt.gov.cz/media/wp-content/uploads/2026/08/Sdeleni-o-terminech_2026-2027.pdf).
- [Katalog CERMAT](https://data.cermat.cz/data-a-analyticke-vystupy-jednotna-prijimaci-zkouska/agregovana-data-jpz.html): výsledky 2026 platné k 17. 8. 2026; srovnávací výsledky 2025 platné k 23. 1. 2026.
- Přímé URL, SHA-256 vstupních souborů, datum platnosti a ověření jsou součástí `public/cermat_results_meta.json` a metadat přihlášek.

## Rozsah dat a kontrolní součty

Zdroj 2026 má 6 368 řádků, zdroj 2025 má 6 351. Publikovaný výběr obsahuje denní nezkrácené obory s povinnou JPZ: 3 091 nabídek, 302 220 přihlášek a 103 190 míst. Výsledkový přehled obsahuje 3 076 nabídek s kladným zveřejněným průměrem od 1 104 REDIZO; 15 nabídek bez takového skóru je v přihláškách, nikoli v pořadí podle skóre. S předchozím rokem je spárováno 2 287 výsledků. Přepočet `% skór / 2` dává standardní škálu 0–100 či 0–50, nikoli nutně původní body upravených testů.

Oproti původnímu exportu: 3 073 společných výsledkových klíčů, 3 přidané, 7 odebraných; 676 změn počtu přijatých a 1 254 změn průměru ČJ+MA. Změna klíčů sama neznamená vznik/zánik školy.

Ve staré historii 2025 je 30 nejednoznačných normalizovaných klíčů. Historii zde nemažeme; nové propojení je odmítne místo výběru prvního řádku. Městské přehledy nadále vycházejí z nabídky 2025 a nejsou kompletním katalogem 2026/2027. Kompletní nabídka 2027, obory bez JPZ a samostatné výsledky druhého kola patří do navazující etapy. Kalendář druhé kolo již pokrývá.

## Opakování obnovy

Do lokálního, necommitovaného adresáře stáhnout z odkazů v metadatech:

- `PZ2026_kolo1_skolobory_vysledky.xlsx`
- `PZ2025_kolo1_skolobory_vysledky.xlsx`

Python potřebuje `openpyxl`; testy také `pytest`.

```sh
python3 scripts/refresh_cermat_data.py --input-dir /cesta/k/xlsx
python3 scripts/generate-admissions-calendar.py
python3 -m pytest tests/test_import_cermat_results.py tests/test_admissions_calendar.py -q
node --experimental-strip-types --test tests/school-key.test.mjs
pnpm run build
```

Při novější revizi vstupu aktualizovat `SOURCE_DATES` podle katalogu CERMAT, porovnat počty a rozdíly před publikací. Import kontroluje rok/kolo, hlavičky, kolize, rozsah skóre a součet priorit; všechny exporty připraví a serializuje před prvním zápisem. Druhý import má dát stejný výstup. Test čte také publikovaný ICS a odhalí rozdíl proti zdrojovému JSON.

Starý skript `import_cermat_2026_real.py` je určen původnímu přihláškovému formátu s pozičními sloupci. Pro tuto obnovu jej nepoužívat. `import_cermat_results.py --year` zůstává pomocným importem; úplnou konzistentní obnovu veřejných dat zajišťuje `refresh_cermat_data.py`.

## Ověření před publikací

- Testy importu: přeuspořádané sloupce, datový list s vysvětlivkami, vadné hlavičky, duplicity, chybějící skór, priority, nejednoznačná historie, rozsahy a pořadí.
- Kalendář: oficiální koncové termíny, jednotlivé JPZ, 20 jedinečných událostí, exkluzivní konce ICS, UTF-8 délka řádků a shoda s publikovaným exportem.
- Párování: normalizace, odlišná zaměření a kolize.
- TypeScript a produkční build; lint změněných TypeScript souborů.
- Prohlížeč: hlavní stránka, výsledky a kalendář na šířkách 390/1440 px, bez vodorovného přetékání či chyb JavaScriptu; stažení ICS a vyhledání školy.

Nasazení probíhá Git integrací projektu Vercel `stredniskoly`. Lokální `.vercel/project.json` odkazuje na starší projekt `gymnazium`; nepoužívat jej k publikaci tohoto webu. Veřejný výsledek je potřeba ověřit po nasazení, nikoli odvozovat pouze z lokálního buildu.
