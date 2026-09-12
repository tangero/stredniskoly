# Lokální prohlížeč rozboru 1 004 nabídek

Otevřít `docs/prohlizec-rozboru-1004.html` v prohlížeči. Soubor obsahuje veškeré podklady, nepotřebuje server ani internet. Internet se používá pouze po otevření externího odkazu.

## Práce s případem

1. Vyhledat školu, obec, kód nebo zaměření; případně filtrovat důvod neshody a stav revize.
2. Porovnat nabídku 2026 s rokem 2025 nebo 2024. Volba „I jiné kódy oborů této školy“ rozšíří kandidáty. Historické řádky se nezahazují ani při shodném ID.
3. Zaškrtnout relevantní historické řádky. Výběr se zachová při přepnutí roku; lze vybrat více řádků. Rozlišují se pomocí `rok:index`, kde index je nulový index v původním poli `schools_data.json[rok]`.
4. Vybrat návaznost, uvést posuzovatele a důkaz. Neznámé přiřazení lze posoudit jako „Návaznost nelze určit“. ID mimo nabídnuté řádky lze uvést ručně s rokem; nejsou automaticky validována.
5. „Potvrdit a další“ uloží snímek rozhodnutí do historie. Změna potvrzeného rozhodnutí jej vrátí do rozpracovaného stavu a zachová předchozí potvrzení.
6. Pravidelně exportovat JSON jako zálohu. Export předat k zapracování mapování; sám produkci nemění.

## Ukládání a import

Automatické ukládání používá localStorage podle otisku všech tří podkladů. Je vázané na daný prohlížeč a jeho chování pro `file://`; přesun souboru, jiný prohlížeč nebo vymazání úložiště jej nemusí zachovat. Přenos mezi prohlížeči proto provádět exportem a importem. Selhání úložiště se zobrazuje ve stavovém pruhu; rozhodnutí lze stále stáhnout.

Import ověřuje verzi, otisk podkladů, ID případů a reference řádků. Přidá dosud neexistující místní rozhodnutí. Konfliktní místní rozhodnutí nepřepisuje a uvede jejich počet. Import pro jiné podklady je odmítnut; migraci rozhodnutí mezi verzemi je potřeba provést odděleně. Ručně zadaná ID a pravdivost důkazů ověřuje člověk.

Export: `schema_version`, `fingerprint`, `source_hashes`, `decisions` podle ID nabídky 2026, `audit`. Rozhodnutí obsahuje `status`, `type`, `targets`, `manual_targets`, `source`, `note`, `reviewer`, `updated_at`. Typ `split` znamená rozdělení předchozí nabídky do více současných; `merged` sloučení předchůdců do současné nabídky. Kompletní vztah více současných nabídek je nutné popsat v poznámce a potvrdit u jednotlivých případů.

## Obnovení prohlížeče

`python3 tools/rozbor-prohlizec/build.py`

Vstupy: `docs/podklady/migrace-katalogu-2027/rozbor-1004.json`, `public/schools_data.json`, `public/applications_2026.json`. Výstup je samostatné HTML. Změna podkladů mění otisk; aplikace pak nepřevezme stará rozhodnutí automaticky. Šablona je `tools/rozbor-prohlizec/template.html`. Načítá se pouze JSON; vstupní texty jsou escapované před vložením do HTML.

## Ověření 12. 9. 2026

Skutečný prohlížeč nad `file://`: 1 004 případů, 3 015 historických řádků; filtr kolizí 26; duplicita stejného ID má odlišné reference `2025:27` a `2025:28`. Potvrzení a přechod na další případ, zachování výběru při přepnutí roku, uložení přes reload, export/import se zachovanou historií, odmítnutí cizího otisku a zachování místního rozhodnutí při konfliktu. Mobilní šířka dokumentu 390 px při viewportu 390 px. Testovací rozhodnutí byla odstraněna; výchozí nástroj je bez rozhodnutí.
