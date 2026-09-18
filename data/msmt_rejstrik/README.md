# Lokální snímky rejstříku MŠMT

Strojově čitelné snímky Rejstříku škol a školských zařízení pro rešerši
návazností 2025–2026 (`docs/ukol-navaznost-skol-a-oboru-2027.md`).

Webová aplikace rejstříku (rejstriky.msmt.cz) je JavaScriptová a agentům
nevrací obsah. MŠMT ale publikuje tentýž rejstřík jako otevřená data ve
formátu JSON-LD, a to ve **datovaných čtvrtletních snímcích** — pro účely
rešerše jde o kvalitnější důkaz než živý web, protože dokládá stav
ke konkrétnímu dni.

## Zdroj

- Datová sada: [Rejstřík škol a školských zařízení – celá ČR](https://data.gov.cz/datov%C3%A9-sady?dotaz=rejst%C5%99%C3%ADk%20%C5%A1kol) (poskytovatel MŠMT, IČ 00022985)
- Soubory: `https://lkod-ftp.msmt.gov.cz/00022985/…/rssz-cela-cr-YYYY-MM-DD.jsonld`
- Seznam distribucí lze získat dotazem na SPARQL endpoint data.gov.cz.

## Stažené snímky

| Soubor | Stav rejstříku k datu | URL |
|---|---|---|
| `rssz-2025-03-31.jsonld` | 31. 3. 2025 (období 1. kola JPZ 2025) | https://lkod-ftp.msmt.gov.cz/00022985/e9c07729-877e-4af0-be4a-9d36e45806ae/rssz-cela-cr-2025-03-31.jsonld |
| `rssz-2025-12-31.jsonld` | 31. 12. 2025 | https://lkod-ftp.msmt.gov.cz/00022985/e9c07729-877e-4af0-be4a-9d36e45806ae/rssz-cela-cr-2025-12-31.jsonld |
| `rssz-2026-03-31.jsonld` | 31. 3. 2026 (období 1. kola JPZ 2026) | https://lkod-ftp.msmt.gov.cz/00022985/250d6b3f-71a2-4441-b8a0-4df141071f13/rssz-cela-cr-2026-03-31.jsonld |
| `rssz-2026-06-30.jsonld` | 30. 6. 2026 | https://lkod-ftp.msmt.gov.cz/00022985/250d6b3f-71a2-4441-b8a0-4df141071f13/rssz-cela-cr-2026-06-30.jsonld |

Struktura: `list` obsahuje subjekty podle `redIzo`; každý má sídlo
(s kódem RÚIAN), ředitele, zřizovatele a `skolyAZarizeni` s IZO včetně
**míst výuky** (`mistaVyuky`) — hodí se i pro úkol dojezdovosti.

Pozor: zánik subjektu se v rejstříku může projevit s odstupem. Např.
Hotelová škola a Gymnázium Radlická (600005631) se sloučila k 1. 1. 2026,
ale ve snímku k 30. 6. 2026 ještě je vedena — datum snímku proto vždy
uvádějte jako součást důkazu.

## Použití

```sh
python3 scripts/lookup_msmt_registry.py 600005542      # podle REDIZO
python3 scripts/lookup_msmt_registry.py izo:061386855  # podle IZO
```

## Do evidence nálezů

Jako URL zdroje uvádějte odkaz na konkrétní snímek (viz tabulka výše)
plus datum snímku v poli `applicable_period`, např. „stav rejstříku
k 31. 12. 2025".

## Dávkové použití ve frontě rešerše

```sh
python3 scripts/enrich-continuity-registry.py   # rejstřík ke všem 192 úkolům
python3 scripts/task-brief.py R-600012026       # podklad k jednomu úkolu
```

První skript zapisuje `docs/podklady/rejstrik-k-fronte-2025-2026.json`; druhý z něj
a z fronty sestaví čitelný podklad pro rešerši jednoho úkolu. Strojová klasifikace
nabídek je vodítko, ne nález: zápis oboru v rejstříku nedokazuje vyhlášení
přijímacího řízení a rejstřík se aktualizuje s odstupem.

## Index názvů v gitu

Snímky se do gitu neukládají, datová linka v CI je proto nemá. Generátory souběžných
přihlášek a kontextu přihlášek potřebují jen názvy škol a oborů, a ty čtou z indexu
`nazvy-oboru.json`, který v gitu je. Vzniká ze snímku, který určuje registr:

```sh
python3 scripts/build-nazvy-oboru-rejstrik.py
```

Po každém přepnutí snímku v registru (`msmt-rejstrik-snimky`), i po převzetí revize
téhož čtvrtletí, index přegenerujte; generátory index, jehož záznam `zobrazeno`
neodpovídá registru, odmítnou.
