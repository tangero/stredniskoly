#!/usr/bin/env python3
"""Vytvoří samostatný offline prohlížeč výsledků rešerše návazností; původní data nemění."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
queue_path = ROOT / 'docs/podklady/fronta-dohledavani-2025-2026.json'
results_dir = ROOT / 'docs/podklady/vysledky-navaznosti-2025-2026'

queue = json.loads(queue_path.read_text())
results = {}
for path in sorted(results_dir.glob('*.json')):
    result = json.loads(path.read_text())
    results[result['task_id']] = result

unknown = sorted(set(results) - {t['id'] for t in queue['tasks']})
if unknown:
    raise SystemExit(f'Výsledky odkazují na neznámé úkoly fronty: {unknown}')

payload = {
    'queue_version': queue['version'],
    'queue_summary': queue['summary'],
    'tasks': queue['tasks'],
    'results': results,
}
serialized = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
html = (Path(__file__).parent / 'template.html').read_text().replace('__DATA__', serialized)
output = ROOT / 'docs/prohlizec-vysledku-navaznosti.html'
output.write_text(html)
print(f'{output}: {len(queue["tasks"])} úkolů, {len(results)} zpracovaných, {output.stat().st_size} B')
