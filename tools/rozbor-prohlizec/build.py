#!/usr/bin/env python3
"""Vytvoří samostatný offline prohlížeč; původní data nemění."""
import hashlib
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
report_path = ROOT / 'docs/podklady/migrace-katalogu-2027/rozbor-1004.json'
report = json.loads(report_path.read_text())
legacy = json.loads((ROOT / 'public/schools_data.json').read_text())
current = json.loads((ROOT / 'public/applications_2026.json').read_text())
ids = {r['id'] for r in report['rows']}
schools = {r['redizo'] for r in report['rows']}
fields = ['id', 'nazev', 'obor', 'zamereni', 'kkov', 'obec', 'adresa', 'delka_studia', 'typ', 'kapacita', 'prihlasky', 'prijati', 'is_new_2026']
history = []
for year in ['2025', '2024']:
    for index, row in enumerate(legacy[year]):
        if row['id'].split('_')[0] in schools:
            history.append({**{k: row.get(k) for k in fields}, 'year': year, 'ref': f'{year}:{index}', 'redizo': row['id'].split('_')[0]})
payload = {**report, 'fingerprint': hashlib.sha256(report_path.read_bytes() + (ROOT / 'public/schools_data.json').read_bytes() + (ROOT / 'public/applications_2026.json').read_bytes()).hexdigest(),
           'history': history, 'current': [r for r in current['data'] if r['id'] in ids]}
serialized = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
html = (Path(__file__).parent / 'template.html').read_text().replace('__DATA__', serialized)
output = ROOT / 'docs/prohlizec-rozboru-1004.html'
output.write_text(html)
print(f'{output}: {len(report["rows"])} případů, {len(history)} historických řádků, {output.stat().st_size} B')
