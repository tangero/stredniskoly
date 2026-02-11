# CSI Refresh Automation

## Cíl

- Týdenně kontrolovat nové inspekční zprávy.
- Posílat e-mailové avízo, když se data změnila a byla zpracována.
- Udržovat historii verzí dat s platností (`valid_from` / `valid_to`).
- Evidovat diff změn na úrovni škol.

## Workflow

Soubor: `.github/workflows/csi-weekly-refresh.yml`

- Trigger:
  - `schedule`: každý pondělí 05:15 UTC
  - `workflow_dispatch`: ruční spuštění
- Kroky:
  1. Spustí `node scripts/process-csi-data.js`.
  2. Pokud jsou změny, vytvoří PR s aktualizovanými daty.
  3. Odešle e-mail při změně.
  4. Odešle e-mail při chybě.

Související InspIS workflow:

- `.github/workflows/inspis-weekly-refresh.yml`
- stejný notifikační model (email při změně nebo chybě)

## Dynamické URL resolvování

Skript nehardcoduje trvale `Transformation/Download/*`.
Nejprve čte:

- `https://opendata.csicr.cz/DataSet/Detail/69`

Z něj vezme aktuální `Transformation/Download/*` URL.  
Když resolvování selže, použije fallback (`CSI_DOWNLOAD_FALLBACK_URL`).

## Historie a validita dat

Aktuální dataset:

- `public/csi_inspections.json`

Historie:

- `data/csi_manifest.json`
- `data/csi_snapshots/csi_inspections_<timestamp>.json`

Diff poslední změny:

- `data/csi_diff_latest.json`

`data/csi_manifest.json` drží seznam verzí:

- `valid_from`: od kdy verze platí
- `valid_to`: do kdy platí (u aktuální verze `null`)
- `sha256`: hash verze
- `source_download_url`: použitý zdroj

## E-mail notifikace

Workflow používá `dawidd6/action-send-mail@v3`.

Nastavte GitHub Secrets:

- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `NOTIFICATION_EMAIL`

Poznámka: pro Gmail použijte App Password.

## Lokální test

```bash
# standard
node scripts/process-csi-data.js

# test z lokálního souboru
CSI_SOURCE_PATH=/path/to/source.json node scripts/process-csi-data.js
```
