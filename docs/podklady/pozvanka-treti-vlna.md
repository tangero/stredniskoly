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

Mimo třetí vlnu zůstává 335 škol katalogu 2026: 283 soukromých a 36
církevních (kritéria je vylučují), dále školy se sdíleným nebo chybějícím
e-mailem a školy, které v rejstříku nejsou.

Text pozvánky je stejný jako u druhé vlny. Šablona dřív rozlišovala jen
`vlna === 2`, takže třetí vlna by dostala pilotní text „mezi dvacet škol“;
pilotní text má nyní jen vlna 1.

## Odeslání

Hashe 665 nových kódů v `data/portal/kody.json` musí být na produkci
**před** odesláním, tedy po merge a nasazení PR. Z kořene repozitáře, po
načtení `.env.local`:

```sh
node --experimental-strip-types scripts/portal-posli-pozvanky.mjs --vlna 3 --nanecisto
node --experimental-strip-types scripts/portal-posli-pozvanky.mjs --vlna 3 --jen <REDIZO> --na <vlastni@adresa> --opravdu
node --experimental-strip-types scripts/portal-posli-pozvanky.mjs --vlna 3 --opravdu
```

Skript posílá zhruba 1,7 zprávy za sekundu, 665 škol trvá asi 7 minut. Úspěšná
odeslání zapisuje průběžně do `pilot.json`; po přerušení stačí spustit stejný
příkaz znovu. Hromadné odeslání z administrace (`/admin/portal/pozvanky`) na
takovou dávku nepoužívejte, běží jako jedna serverová funkce.
