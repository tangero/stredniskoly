# Soutěžící v pásmech proti souhrnům 1. kola

28. 9. 2026. Reprodukuje `python3 scripts/shoda-soutezicich-se-souhrny.py 2026` (a `2025`), vstupem jsou data uchazečů `data/PZ{rok}_kolo1_uchazeci_prihlasky_vysledky.xlsx`, `public/pasma_prijeti_{rok}.json` a `public/souhrny_kolo1.json`.

Porovnává `soutezicich` v pásmech (osoby, denní nezkrácené studium) se součtem přijatých a nepřijatých kvůli kapacitě ze souhrnů CERMAT za všechny nabídky oboru (REDIZO_KKOV).

| | 2026 | 2025 |
|---|---|---|
| Oborů v pásmech | 2 830 | 2 797 |
| Shoda | 1 677 | 1 287 |
| Součet absolutních rozdílů (osob) | 2 762 | 4 263 |
| B: přihlášky uchazečů bez výsledku jednotné zkoušky | 1 243 osob, 725 oborů | 3 168 osob, 1 295 oborů |
| A: vzdal se, v pásmech jako přijatý | 1 004 osob, 631 oborů | 948 osob, 599 oborů |
| C: víc přihlášek téhož uchazeče na obor | 898 osob, 100 oborů | 929 osob, 113 oborů |
| D: nevysvětlený zbytek | 147 osob, 73 oborů | 98 osob, 54 oborů |

Příčiny se u jednoho oboru mohou sčítat i rušit, řádky proto nedávají součet rozdílů; složky se počítají i u oborů s celkovou shodou.

**Závěr.** A až C jsou rozdíly definic a zdroje, ne chyba výpočtu: pásma potřebují výsledek zkoušky, počítají osoby a vzdání se přijetí počítají v obou ročnících jako přijetí (data 2026 ho nerozlišují, 2025 se sjednotilo). D je nesoulad mezi dvěma soubory CERMAT (příklad 600015629_78-42-M/08: data uchazečů 14 přijatých, souhrn 15).

**Rozhodnuto 28. 9. 2026.** Zadavatel schválil sjednocení: vzdání se přijetí se v datech 2025 počítá jako přijetí, stejně jako v datech 2026 (slovník ukazatelů 1.42). Sloupec 2025 je přepočítaný po této změně; shoda 2025 klesla z 1 454 na 1 287 oborů, protože souhrn 2025 vede 948 vzdání se zvlášť (řádek A).
