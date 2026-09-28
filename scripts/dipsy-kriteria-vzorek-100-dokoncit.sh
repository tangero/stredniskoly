#!/usr/bin/env bash
# Naváže na již odeslané dávky; při chybě skončí bez dalších placených volání.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 scripts/dipsy-kriteria-vzorek-100-batch.py --model deepseek --wait
python3 scripts/dipsy-kriteria-vzorek-100-batch.py --model luna --wait
python3 scripts/dipsy-kriteria-vzorek-100-srovnani.py
python3 scripts/dipsy-kriteria-vzorek-100-batch.py --model opus --opus-queue --wait
python3 scripts/dipsy-kriteria-vzorek-100-srovnani.py
python3 scripts/dipsy-kriteria-vzorek-100-zprava.py
