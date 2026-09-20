#!/usr/bin/env bash
# Jeden běh sklizně školních novinek: stav zdrojů z databáze → stažení feedů →
# zápis dávky. Totéž, co dělaly tři kroky workflow, jen v jednom kontejneru.
#
# Fail-closed: bez DATABASE_URL se běh nespouští. Chybějící konfigurace je jiný
# stav než výpadek, ale ani jeden se nesmí tvářit jako úspěšná sklizeň s nulou
# položek. Návrh: docs/skolske-novinky-rss-2027.md, oddíly 3.1–3.3.
set -euo pipefail

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
