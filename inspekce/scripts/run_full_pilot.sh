#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${ROOT_DIR}/.." && pwd)"

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
python3 scripts/download_reports.py
python3 scripts/extract_texts.py
python3 scripts/run_extraction.py
python3 scripts/run_judge.py
python3 scripts/aggregate_scores.py

echo "Pilot dokončen."
