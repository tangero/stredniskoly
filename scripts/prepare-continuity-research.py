"""Připraví frontu dohledávání; neurčuje nástupnictví ani nenasazuje mapování."""
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'docs/podklady/matice-zmen-2025-2026.json'
r = json.loads(source.read_text())
issues: list[dict] = []


def add(kind: str, priority: int, refs: list[tuple[str, int, int]]) -> None:
    records = [{'type': typ, 'year': year, 'index': i, 'data': r[f'{typ}_{year}'][i]} for typ, year, i in refs]
    ids = sorted({str((x['data']['source'] if x['type'] == 'schools' else x['data'])['REDIZO']) for x in records})
    issues.append({'id': f'Q{len(issues)+1:04}', 'kind': kind, 'priority': priority, 'redizo': ids, 'records': records})


for year in [2025, 2026]:
    for i in r[f'program_unpaired_{year}']:
        add('nepřiřazená nabídka', 1, [('offers', year, i)])
    for i in r[f'school_unpaired_{year}']:
        add('nepřiřazená školní jednotka', 1, [('schools', year, i)])
for p in r['school_pairs']:
    s = p['signature']
    if s == '====':
        continue
    kind = ('návrh návaznosti různých identifikátorů' if p['provisional'] else
            'neúplný adresní údaj' if s[0] == '?' else
            'změna adresního údaje' if s[0] == '≠' else 'změna názvu školy')
    add(kind, 1 if p['provisional'] else 2, [('schools', 2025, p['old']), ('schools', 2026, p['new'])])
for p in r['program_pairs']:
    if p['signature'] == '======':
        continue
    add('změna zaměření' if p['signature'] == '==≠===' else 'změna formy nebo jazyka', 2,
        [('offers', 2025, p['old']), ('offers', 2026, p['new'])])
# Keep existing issue identifiers. Simple metadata differences are observations, not research.
record_only_kinds = {'změna názvu školy', 'změna adresního údaje', 'změna zaměření'}
observations = [q for q in issues if q['kind'] in record_only_kinds]
data_gaps = [q for q in issues if q['kind'] == 'neúplný adresní údaj']
issues = [q for q in issues if q['kind'] not in record_only_kinds | {'neúplný adresní údaj'}]
# Join organizations mentioned by the same issue, without asserting their identity.
parent: dict[str, str] = {rid: rid for q in issues for rid in q['redizo']}


def find(key: str) -> str:
    if parent[key] != key:
        parent[key] = find(parent[key])
    return parent[key]


for q in issues:
    for rid in q['redizo'][1:]:
        parent[find(rid)] = find(q['redizo'][0])
groups: dict[str, list] = defaultdict(list)
for q in issues:
    groups[find(q['redizo'][0])].append(q)
tasks = []
for _, qs in sorted(groups.items()):
    ids = sorted({rid for q in qs for rid in q['redizo']})
    tasks.append({'id': 'R-' + '-'.join(ids), 'priority': min(q['priority'] for q in qs), 'redizo': ids,
                  'issues': qs,
                  'context_offers': {str(y): [row for row in r[f'offers_{y}'] if str(row['REDIZO']) in ids] for y in [2025, 2026]},
                  'status': 'not_started', 'findings': []})
summary = {'tasks': len(tasks), 'priority_1_tasks': sum(t['priority'] == 1 for t in tasks),
           'priority_2_only_tasks': sum(t['priority'] == 2 for t in tasks),
           'record_only_count': len(observations), 'data_gap_count': len(data_gaps),
           'issues': dict(Counter(q['kind'] for q in issues)),
           'core_unpaired_offer_redizo': len({rid for q in issues if q['kind'] == 'nepřiřazená nabídka' for rid in q['redizo']})}
out = {'version': 2, 'source': str(source.relative_to(ROOT)), 'source_hashes': r['source_hashes'],
       'summary': summary, 'tasks': tasks, 'record_only': observations, 'data_gaps': data_gaps}
assert sum(len(t['issues']) for t in tasks) == len(issues)
assert len({rid for t in tasks for rid in t['redizo']}) == sum(len(t['redizo']) for t in tasks)
(ROOT / 'docs/podklady/fronta-dohledavani-2025-2026.json').write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(summary, ensure_ascii=False, indent=2))
