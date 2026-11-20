---
name: neon-migrace-produkce
description: Use when running a Neon production DB migration.
category: database
---

# Migrace do produkční Neon databáze

Migraci proti produkci nespouštěj sám. Podle `CLAUDE.md` (pravidlo 5) ji spouští vlastník; AI jen přidá soubor `db/migrace/NNN-nazev.sql` do PR a popíše ji. I když uživatel žádost napíše přímo, nejdřív oznam, že tohle pravidlo platí, a počkej na jeho výslovné potvrzení v dané zprávě.

Před jakoukoli odpovědí na žádost o spuštění ověř:

1. Soubor je na `origin/main`. Pokud je jen ve větvi nebo v PR, nespouštěj ho a napiš, v jakém je stavu.
2. Číslo migrace nekoliduje s jinou migrací v otevřených PR a větvích (`git ls-tree -r --name-only <větev> db/migrace/`). Kolize musí vyřešit vlastník.
3. `.env.local` obsahuje `DATABASE_URL` ukazující na produkci (`neondb`). Každý skript s `node --env-file=.env.local` tedy zapisuje do produkce. Čtení přes `SELECT` je v pořádku, zápis ne.

Pokud vlastník potvrdí, spusť jen soubor z `main`, ověř výsledek a zopakuj běh, který musí být bez efektu (idempotence). Soubor a výsledek uveď v komentáři k PR nebo do issue.
