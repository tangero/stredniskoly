#!/usr/bin/env bash
# Jeden běh sklizně školních novinek: stav zdrojů z databáze → stažení feedů →
# zápis dávky. Totéž, co dělaly tři kroky workflow, jen v jednom kontejneru.
#
# Fail-closed: bez DATABASE_URL se běh nespouští. Chybějící konfigurace je jiný
# stav než výpadek, ale ani jeden se nesmí tvářit jako úspěšná sklizeň s nulou
# položek. Návrh: docs/skolske-novinky-rss-2027.md, oddíly 3.1–3.3.
set -euo pipefail

# Celkový limit běhu. `requests.get(timeout=…)` hlídá jen mezeru mezi pakety, ne
# celkovou dobu stahování: server, který odpovídá po malých kouscích, udrží
# worker libovolně dlouho a `as_completed()` pak čeká na všechny zdroje, takže
# nedojde ani k zápisu dávky. Railway zaseknutý cron sám neukončí a další
# termíny přeskakuje, dokud běh trvá – proto si limit hlídá skript sám.
# Actions měly `timeout-minutes: 30`; měřený běh trvá 26 minut, 45 je rezerva.
LIMIT_BEHU="${SKLIZEC_LIMIT:-45m}"
if [ -z "${SKLIZEC_HLIDAC:-}" ]; then
  export SKLIZEC_HLIDAC=1
  # Bez `--foreground` pouští `timeout` příkaz ve vlastní procesní skupině,
  # takže TERM i následný KILL dostanou i potomci (python3, node), ne jen tenhle
  # skript. Při vypršení vrací 124, tedy běh skončí jako chyba, ne jako sklizeň
  # s nulou položek.
  #
  # `timeout` je z GNU coreutils: je v obrazu (node:22-slim, Debian) i na
  # runnerech Actions. macOS ho bez coreutils nemá, proto se hledá i `gtimeout`
  # a bez obojího běh pokračuje bez hlídače — jinak by se skript na vývojářském
  # stroji rozbil návratovým kódem 127 dřív, než cokoli udělá.
  HLIDAC="$(command -v timeout || command -v gtimeout || true)"
  if [ -n "$HLIDAC" ]; then
    exec "$HLIDAC" --kill-after=60s "$LIMIT_BEHU" "$0" "$@"
  fi
  echo "Varování: timeout ani gtimeout nejsou k dispozici, běh nemá celkový limit." >&2
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL není nastavený – sklizeň se nespouští." >&2
  exit 1
fi

STAV=/tmp/stav.json
DAVKA=/tmp/davka.json

node --experimental-strip-types scripts/skolni-novinky-zapis.mjs --export-stav "$STAV"

# JEN omezí počet škol pro zkušební běh; v naplánovaném běhu je prázdné.
python3 scripts/sklizec-novinek.py --stav "$STAV" --vystup "$DAVKA" ${JEN:+--jen "$JEN"}

node --experimental-strip-types scripts/skolni-novinky-zapis.mjs --davka "$DAVKA"
