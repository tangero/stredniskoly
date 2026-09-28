# Soutěžící v pásmech proti souhrnům 1. kola

28. 9. 2026. Reprodukuje `python3 scripts/shoda-soutezicich-se-souhrny.py 2026` (a `2025`), vstupem jsou data uchazečů `data/PZ{rok}_kolo1_uchazeci_prihlasky_vysledky.xlsx`, `public/pasma_prijeti_{rok}.json` a `public/souhrny_kolo1.json`.

Porovnává `soutezicich` v pásmech (osoby, denní nezkrácené studium) se součtem přijatých a nepřijatých kvůli kapacitě ze souhrnů CERMAT za všechny nabídky oboru (REDIZO_KKOV).

| | 2026 | 2025 |
|---|---|---|
| Oborů v pásmech | 2 830 | 2 789 |
| Shoda | 1 677 | 1 454 |
| Součet absolutních rozdílů (osob) | 2 762 | 4 153 |
| B: přihlášky uchazečů bez výsledku jednotné zkoušky | 1 243 osob, 725 oborů | 3 133 osob, 1 280 oborů |
| A: vzdal se, v datech uchazečů jako přijatý | 1 004 osob, 631 oborů | — |
| C: víc přihlášek téhož uchazeče na obor | 898 osob, 100 oborů | 929 osob, 113 oborů |
| D: nevysvětlený zbytek | 147 osob, 73 oborů | 91 osob, 48 oborů |

Příčiny se u jednoho oboru mohou sčítat i rušit, řádky proto nedávají součet rozdílů; složky se počítají i u oborů s celkovou shodou.

**Závěr.** A až C jsou rozdíly definic a zdroje, ne chyba výpočtu: pásma potřebují výsledek zkoušky, počítají osoby a data uchazečů 2026 vzdání se přijetí nerozlišují. D je nesoulad mezi dvěma soubory CERMAT (příklad 600015629_78-42-M/08: data uchazečů 14 přijatých, souhrn 15).

**Otevřené rozhodnutí.** V roce 2025 se vzdání se přijetí do pásem nepočítá (verze slovníku 1.38), v roce 2026 ho data nerozliší a uchazeč je v přijatých. Sjednotit lze jen v roce 2025 (počítat vzdání se jako přijetí); mění to pásma 2025, která slouží jako historie. Nezměněno, čeká na rozhodnutí zadavatele.
