"""Diagnostická reprodukce R2. Nejde o návrh produkčního percentilu."""
import hashlib
import json
import math
import statistics
from pathlib import Path

path = Path('public/schools_data.json')
rows = json.loads(path.read_text())['2025']
target = next(r for r in rows if r['id'] == '600007774_78-42-M/01')
output = {'source_sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
          'population': 'Všechny řádky datasetu 2025; bez deduplikace a rozdělení podle typu/délky studia; stejná váha každému řádku.',
          'percentile_definition': '100 * počet hodnot <= hodnota oboru / počet platných hodnot',
          'subjects': {}}
for field in ['cj_prumer', 'ma_prumer']:
    values = [r[field] for r in rows if isinstance(r.get(field), (int, float)) and math.isfinite(r[field]) and 0 <= r[field] <= 100]
    v = target[field]
    output['subjects'][field] = {'source_percent': v, 'converted_0_50': math.floor(v * 5 + 0.5) / 10,
                                'rows': len(values), 'unweighted_mean_percent': statistics.mean(values),
                                'rank_percent_le': 100 * sum(x <= v for x in values) / len(values),
                                'rank_percent_lt': 100 * sum(x < v for x in values) / len(values)}
assert output['subjects']['cj_prumer']['converted_0_50'] == 36.1
assert output['subjects']['ma_prumer']['converted_0_50'] == 30.1
print(json.dumps(output, ensure_ascii=False, indent=2))
