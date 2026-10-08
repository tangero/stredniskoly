# Pravidla pro data a texty stránek

Načítá je `CLAUDE.md` a platí pro každé zadání. Dělba rolí: `docs/zdroje-dat.md` říká, **co existuje**,
`docs/slovnik-ukazatelu.md`, **jak se to jmenuje a počítá**, `public/stav_datovych_sad.json`, **které období se
zobrazuje**, a `docs/slovnik-pojmu.md`, **jakými slovy se o tom píše**. Nový dokument nezapisuj sem, ale do
rozcestníku `docs/rozcestnik.md`: tento soubor obsahuje pravidla a jeho změnu brána pouští jen se souhlasem vlastníka.

## Zdroje dat

**`docs/zdroje-dat.md` je soupis všech zdrojových souborů sloupec po sloupci.** U každého sloupce je uvedeno, na jakou otázku rodiče by šel použít a zda ho používáme. Oddíl 3 je seznam sloupců, které nevyužíváme.

**Než navrhneš stránku, sekci, ukazatel nebo funkci, projdi `docs/zdroje-dat.md` celý, včetně oddílu 3, a do návrhu napiš, které nepoužité sloupce jsi zvážil a proč je nepoužiješ.** Důvod: návrh stránky školy z 12. 9. 2026 vznikl z toho, co web už zobrazoval, a minul tři použitelné údaje ze zdrojů, které projekt už zpracovával; jeden byl dokonce spočítaný v katalogu, zatímco slovník ukazatelů tvrdil, že ho nemáme.

1. **Nikdy neinventarizuj data podle toho, co web zobrazuje.** Vždy podle sloupců ve zdroji.
2. **Nový zdroj nebo sloupec zapiš do `docs/zdroje-dat.md`** ve stejné dávce, ve které ho začneš používat, včetně sloupců, které nepoužiješ.
3. **Zamítnutí je platný závěr, mlčení není.** Když se sloupec nehodí, napiš proč.

## Stav datových sad

**`public/stav_datovych_sad.json` je jediné místo, které určuje, jaké období každé datové sady web zobrazuje.** U každé sady vede zobrazené období a jeho zdroj, očekávané období a termín, roli starých dat po přepnutí a ukazatele ze slovníku, které na sadě stojí. Postup je v `docs/zdroje-dat.md`, oddíl 5.

1. **Nikdy nepiš letopočet dat napevno** do kódu ani do textu stránky. Období se bere z registru.
2. **Staré období se zobrazuje, dokud nové neprošlo přepnutím.** Po přepnutí slouží staré jen jako historie a kontext vývoje.
3. **Ukazatel z více sad** se zobrazí z nejstaršího ze zobrazených období těchto sad.
4. **Registr neupravuj ručně.** Přepínej `python3 scripts/stav-datovych-sad.py prepni` s dokladem, vracej `vrat`.
5. **Nová sada nebo nový ukazatel** se zapisuje do registru ve stejné dávce. Po každé změně dat spusť `python3 scripts/stav-datovych-sad.py kontrola`.

Nová data zjišťuje a připravuje **datová linka** (`scripts/datova-linka.py`, `docs/datova-linka.md`). Nová data se přebírají přes její úlohy a schválení, ne ručním stahováním mimo ni. Po změně linky spusť `python3 -m unittest tests/test_datova_linka.py`.

## Slovník ukazatelů

**`docs/slovnik-ukazatelu.md` je závazný soupis názvů a veličin.** Obsahuje definici, vzorec, zdroj a jednotku každého ukazatele a hlavně to, co ukazatel **neříká**.

1. **Před zobrazením jakéhokoli čísla** na webu si ověř jeho zápis ve slovníku. Údaj bez doloženého výpočtu se nezobrazuje.
2. **Nový ukazatel nezaváděj** bez zápisu do slovníku: název, definice, vzorec, zdroj, jednotka, rozsah platnosti a co neříká.
3. **Nepoužívej vlastní název** pro veličinu, která už jméno má. Jméno ze slovníku platí v datech, v kódu, v API i v textech.
4. **Změní-li se výpočet**, oprav slovník a zvyš jeho verzi ve stejné dávce.

Ve slovníku je i oddíl ukazatelů bez doloženého výpočtu (například `obtiznost`). Ty se nesmí používat k řazení, průměrování ani zobrazení, dokud jejich definice nevznikne.

## Slovník pojmů

**`docs/slovnik-pojmu.md` určuje, jakými slovy se na webu mluví k rodičům a uchazečům**, aby tatáž věc nezněla na každé stránce jinak. Slovník ukazatelů říká, jak se veličina jmenuje v datech a jak se počítá; slovník pojmů, jak se o ní píše v textu stránky.

1. **Než napíšeš text stránky**, použij pojmy ze slovníku pojmů a vyhni se slovům ze sloupce „Nepoužívat“.
2. **Při prvním výskytu v každém bloku** (oddíl, karta, graf) pojem vysvětli standardní větou ze slovníku, například „soutěžící uchazeči, tedy ti, kdo splnili požadavky školy a nedostali se na obor, který měli na přihlášce výš“.
3. **Pojem musí odpovídat množině, ze které se číslo počítá**: „uchazeči“ jsou všichni přihlášení, „soutěžící uchazeči“ jen jejich část.
4. **Nový pojem zapiš do slovníku pojmů** ve stejné dávce, ve které se poprvé objeví na stránce.

Návazné dokumenty: [prezentace dat na stránce školy](../docs/navrh-prezentace-dat-skoly-2027.md), [maturitní výsledky](../docs/maturitni-vysledky-a-kvalita-skoly-2027.md).
