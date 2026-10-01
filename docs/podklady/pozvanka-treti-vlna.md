# Třetí vlna pozvánek do Portálu pro školy

Zadavatel 1. 10. 2026 rozhodl oslovit všechny zbývající způsobilé školy. Právní
posouzení pro plošné oslovení má zadavatel vyřešené. Pozvánka je jednorázová
žádost o spolupráci, ne pravidelné sdělení, a proto nemá odkaz na odhlášení.
Škola, která nemá zájem, kód nepoužije nebo odpoví na adresu odesílatele.

## Stav před třetí vlnou (1. 10. 2026, produkční databáze, jen čtení)

| vlna | osloveno | správce založen | podíl |
|---|---|---|---|
| 1 (pilot, 22. 9.) | 20 | 3 | 15 % |
| 2 (23. 9.) | 100 | 13 | 13 % |
| celkem | 120 | 16 | 13 % |

Z 13 registrací druhé vlny přišlo 11 do dvou dnů od odeslání. Profil
vyplnilo 15 ze 16 škol se správcem, kritéria přijetí zatím žádná, editora
nepozvala žádná škola.

## Výběr

`scripts/portal-vyber-vlny.py --vlna 3 --pocet vse` vybral všech 665 škol, které
splňují kritéria druhé vlny (veřejný zřizovatel, úplné výsledky PŘ 2026,
rejstříkový e-mail, ředitel, web a datová schránka, e-mail jedinečný
v rejstříku, bez předchozí pozvánky a aktivního kódu): 214 gymnázií a 451
odborných škol ze všech 14 krajů. Školy jsou v `data/portal/pilot.json`
s `vlna: 3`, kontakty v gitignorovaném `data/portal/pilot-kontakty.json`.

Mimo všechny tři vlny zůstává 335 škol katalogu 2026, každá je započtená jednou:

| důvod | škol |
|---|---|
| soukromý zřizovatel (kritéria vylučují) | 283 |
| církevní zřizovatel (kritéria vylučují) | 36 |
| škola není v rejstříkovém adresáři | 10 |
| v rejstříku chybí ředitel, web nebo datová schránka | 4 |
| e-mail sdílí jiná škola | 1 |
| zkušební škola s aktivním kódem | 1 |

Školy první vlny mají v `pilot.json` výslovně `vlna: 1`; metadata výběru
druhé a třetí vlny jsou pod klíčem `vlny`.

Text pozvánky je stejný jako u druhé vlny. Šablona dřív rozlišovala jen
`vlna === 2`, takže třetí vlna by dostala pilotní text „mezi dvacet škol“.
Pilotní text má nyní jen výslovná `vlna: 1`; bez čísla vlny jde obecný text.

## Odeslání

Hashe 665 nových kódů v `data/portal/kody.json` musí být na produkci
**před** odesláním, tedy po merge a nasazení PR. Z kořene repozitáře, po
načtení `.env.local`:

```sh
node --experimental-strip-types scripts/portal-posli-pozvanky.mjs --vlna 3 --nanecisto
node --experimental-strip-types scripts/portal-posli-pozvanky.mjs --vlna 3 --jen <REDIZO> --na <vlastni@adresa> --opravdu
node --experimental-strip-types scripts/portal-posli-pozvanky.mjs --vlna 3 --opravdu
```

Před odesláním skript ověří každý kód funkcí `validateKod`, kterou používá
přihlášení, proti `data/portal/kody.json`; když některý nesedí, neodešle nic.
Potřebuje k tomu `PORTAL_KOD_PEPPER` z `.env.local`. Jestli jsou hashe už na
produkci, nepozná: před ostrým odesláním ověřte zkušebním kódem na
`/pro-skoly`, že ho web přijme (zadání kódu ho nespotřebuje).

Skript posílá zhruba 1,7 zprávy za sekundu, 665 škol trvá asi 7 minut. Úspěšná
odeslání zapisuje průběžně do `pilot.json`; po přerušení stačí spustit stejný
příkaz znovu. Administrace (`/admin/portal/pozvanky`) odešle jedním
potvrzením nejvýš 20 škol; skript a administraci nespouštějte současně,
oba přepisují `pilot.json`.
