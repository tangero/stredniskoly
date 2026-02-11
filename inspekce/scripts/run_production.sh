#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${ROOT_DIR}/.." && pwd)"

WORKERS="${1:-4}"
MANIFEST="config/production_reports.json"
MODELS="config/production_models.json"

if [[ -f "${REPO_ROOT}/.env.local" ]]; then
  set -a
  source "${REPO_ROOT}/.env.local"
  set +a
fi

if [[ -z "${OPENROUTER_API_KEY:-}" ]]; then
  echo "Chybí OPENROUTER_API_KEY (export nebo .env.local)."
  exit 1
fi

cd "${ROOT_DIR}"

echo "=== 1/5 Generuji manifest ==="
python3 scripts/generate_manifest.py

echo ""
echo "=== 2/5 Stahuji PDF ==="
python3 scripts/download_reports.py --manifest "${MANIFEST}"

echo ""
echo "=== 3/5 Extrahuji texty z PDF ==="
python3 scripts/extract_texts.py --manifest "${MANIFEST}"

echo ""
echo "=== 4/5 Spouštím LLM extrakci (workers=${WORKERS}) ==="
python3 scripts/run_extraction.py \
  --manifest "${MANIFEST}" \
  --models "${MODELS}" \
  --workers "${WORKERS}"

echo ""
echo "=== 5/5 Exportuji výsledky ==="
python3 scripts/export_extractions.py --manifest "${MANIFEST}"

echo ""
echo "Produkční pipeline dokončen."
