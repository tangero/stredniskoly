# Obory vypisované jednou za dva roky

Verze 1.0 · 12. 9. 2026. Doplněk k [rešerši návazností](ukol-navaznost-skol-a-oboru-2027.md).

Řada škol některé obory nevypisuje každý rok. Ze dvou ročníků to nelze odlišit od zániku nebo vzniku oboru: obor vynechaný v roce 2026 vypadá jako ukončený a obor vynechaný v roce 2025 jako nový. Tento dokument shrnuje, co k tomu jde doložit.

## Co o tom říká sama rešerše

Čtyři nálezy citují cyklus přímo ze stránek školy.

| Úkol | Škola | Co škola uvádí |
|---|---|---|
| R-600019578 | SZŠ a VOŠZ České Budějovice | „Obor se otevírá jednou za dva roky (střídá se s oborem Laboratorní asistent).“ |
| R-600019772 | VOŠZ a SZŠ Hradec Králové | „Obor otevíráme v lichém roce.“ |
| R-600020053 | SZŠ a VOŠZ E. Pöttinga Olomouc | „Ve školním roce 2026/2027 nebude otevřen (otevírá se jednou za dva roky)“, další běh 2027/2028 |
| R-600011747 | SUPŠ hudebních nástrojů a nábytku Hradec Králové | Nábytkářské obory se v sudých letech neotvírají |

Další nálezy popisují totéž bez použití slova cyklus, například plánem dalšího náboru až na rok 2027/28. Jde tedy o doložený jev, ne o dohad. Otázka je, kolika dalších případů se týká.

## Třetí bod v čase

Repozitář obsahuje `data/PZ2024_kolo1_uchazeci_prihlasky_vysledky.xlsx`, tedy data 1. kola z roku 2024. Dávají třetí pozorování, které dvouletý cyklus odliší:

- nabídka jen z roku 2025 je slučitelná s lichým cyklem, pokud v roce 2024 chybí;
- nabídka jen z roku 2026 je slučitelná se sudým cyklem, pokud v roce 2024 je.

```sh
python3 scripts/test-two-year-cycle.py
```

Skript zapisuje [podklad](podklady/dvoulety-cyklus-2024-2026.json) ke každé nepřiřazené nabídce.

### Co test neumí

- **Zdroj 2024 je na úrovni uchazečů, ne nabídek.** Obor, který byl vypsán, ale nedostal jedinou přihlášku, v datech chybí. Přítomnost v roce 2024 je proto silný důkaz, nepřítomnost slabý.
- **Data 2024 neobsahují zaměření.** Test má smysl jen tam, kde v druhém roce chybí celý kód oboru. Ze 410 nepřiřazených nabídek je 236 rozdílem pouze v textu zaměření; ty test vynechává.
- **Nepřítomnost v roce 2024 má více vysvětlení.** Škola nebo obor mohly v roce 2024 ještě neexistovat. Shoda se vzorcem není důkazem cyklu, jen slučitelností s ním.

## Výsledek

Testovatelných nabídek je 174.

| Nabídka jen v roce 2026 (v 2025 chybí) | Počet | Jak je klasifikovala rešerše |
|---|---:|---|
| v roce 2024 přihlášky byly | 20 | pokračování 15, nová nabídka 5 |
| v roce 2024 přihlášky nebyly | 81 | nová nabídka 67, ostatní 14 |

| Nabídka jen v roce 2025 (v 2026 chybí) | Počet | Jak je klasifikovala rešerše |
|---|---:|---|
| v roce 2024 přihlášky byly | 47 | ukončená nabídka 36, ostatní 11 |
| v roce 2024 přihlášky nebyly | 26 | ukončená nabídka 19, ostatní 7 |

Čtení je toto. U 81 nabídek roku 2026 bez stopy v roce 2024 rešerše mluvila o nové nabídce a data ji podpírají. U 47 nabídek roku 2025, které běžely i v roce 2024, jde o obor vypisovaný dva roky po sobě a pak vynechaný; dvouletý cyklus je nevysvětluje.

Dvouletý cyklus tedy vysvětluje omezenou, ne většinovou část fronty. Přesto dal pět konkrétních oprav.

## Pět opravených nálezů

Tyto nabídky rešerše označila za nový obor, přestože u téhož IZO v roce 2024 proběhlo přijímací řízení.

| Úkol | Obor | Přihlášek 2024 | Přijato 2024 |
|---|---|---:|---:|
| R-600007022 | 64-41-L/51 Podnikání | 59 | 30 |
| R-600015815 | 69-41-L/01 Kosmetické služby | 75 | 16 |
| R-600009106 | 65-41-L/51 Gastronomie | 43 | 26 |
| R-600017061 | 65-41-L/01 Gastronomie | 22 | 9 |
| R-600013383 | 65-41-L/51 Gastronomie | 2 | 0 |

U všech pěti je vztah přepsán na pokračování a doplněn doklad z dat 2024. U čtyř případů s přijatými uchazeči je jisté, že obor v roce 2024 běžel. U posledního byly jen dvě přihlášky a nikdo nebyl přijat; obor byl vypsán, ale nenaplnil se.

## Co z toho plyne pro web

Chybějící nabídka v jednom roce se nesmí uživateli zobrazit jako zrušený obor. Devatenáct nabídek roku 2025 vedených jako ukončené nemá v roce 2024 žádnou stopu, takže jsou slučitelné s lichým cyklem a mohou se v roce 2027 vrátit. Část z nich má ovšem jiné vysvětlení: školy skupiny FOSTRA se slučovaly, obor 78-42-M/08 Lyceum vznikl až v roce 2025 a některé školy v roce 2024 ještě nefungovaly. Před zveřejněním je proto potřeba u konkrétní školy rozhodnout, zda jde o cyklus, nebo o skutečný konec.

Doporučená formulace na profilu: uvést, ve kterých letech byl obor v nabídce, a nepsat, že byl zrušen, dokud to škola sama neuvádí.
