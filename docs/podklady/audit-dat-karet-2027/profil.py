"""Reprodukovatelný lokální profil; spouštět z kořene repozitáře."""
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

def read(name):
    return json.loads(Path(name).read_text())

def norm(value):
    # Stejný postup jako src/lib/school-key.ts: odstranit diakritiku,
    # normalizovat oddělovače a až potom rozhodnout o prázdném zaměření.
    parts = value.split('_')
    focus = re.sub(r'[\u0300-\u036f]', '', unicodedata.normalize('NFKD', '_'.join(parts[2:])))
    focus = re.sub('[^a-zA-Z0-9]+', '_', focus).strip('_').lower()
    return '_'.join(parts[:2]) + ('_' + focus if focus else '')

old = read('public/schools_data.json')['2025']
apps = read('public/applications_2026.json')['data']
results = read('public/cermat_results_2026.json')
counts = Counter(norm(r['id']) for r in old)
a = {norm(r['id']):r for r in apps}
r = {norm(k):v for k,v in results.items()}
catalog = {norm(x['id']):x for x in old if counts[norm(x['id'])] == 1}
inspis = read('data/inspis_school_profiles.json')
fields = ['dny_otevrenych_dveri','termin_prijimacich_zkousek','rocni_skolne','aktualni_pocet_zaku','pripravne_kurzy']
profile = {
 'catalog_2025_rows':len(old), 'catalog_unique_unambiguous':len(catalog),
 'applications_2026':len(apps), 'result_offers_2026':len(results),
 'catalog_with_applications_2026':len(catalog.keys() & a.keys()),
 'catalog_with_results_2026':len(catalog.keys() & r.keys()),
 'catalog_all_normalized_keys':len(counts),
 'applications_2026_outside_all_keys':len(a.keys()-counts.keys()),
 'applications_2026_ambiguous_counterpart':len((a.keys() & counts.keys())-catalog.keys()),
 'applications_2026_outside_catalog':len(a.keys()-catalog.keys()),
 'catalog_without_matching_applications_2026':len(catalog.keys()-a.keys()),
 'incomplete_outcomes':sum(not x['admission_context']['outcomes_complete'] for x in apps),
 'inspis_generated_at':inspis['generated_at'], 'inspis_schools':len(inspis['schools']),
 'inspis_fields':{}, 'old_event_examples':[],
}
for f in fields:
 values=[x[f] for x in inspis['schools'].values() if x.get(f) is not None]
 years=Counter(y for v in values for y in set(re.findall(r'\b20\d{2}\b',str(v)))) if f in fields[:2] else Counter()
 profile['inspis_fields'][f]={'non_null':len(values),'explicit_years':dict(sorted(years.items()))}
 if f in fields[:2]:
  sets=[set(map(int,re.findall(r'\b20\d{2}\b',str(v)))) for v in values]
  profile['inspis_fields'][f]['only_years_through_2025']=sum(bool(y) and max(y)<=2025 for y in sets)
  profile['inspis_fields'][f]['without_explicit_year']=sum(not y for y in sets)
for key,x in inspis['schools'].items():
 if re.search('202[0-5]',str(x.get('dny_otevrenych_dveri',''))) and len(profile['old_event_examples'])<3:
  profile['old_event_examples'].append({'redizo':key,'dny':x['dny_otevrenych_dveri']})
profile['sample_catalog_gaps']=[{'id':a[k]['id'],'school':a[k]['nazev'],'obor':a[k]['obor']} for k in sorted(a.keys()-catalog.keys())[:5]]
print(json.dumps(profile,ensure_ascii=False,indent=2))

# Kontrolní SQL pro reprodukovatelný graf pokrytí.
import sqlite3
conn = sqlite3.connect(':memory:')
conn.execute('CREATE TABLE applications_2026 (offer_id TEXT PRIMARY KEY)')
conn.execute('CREATE TABLE catalog_2025 (offer_id TEXT PRIMARY KEY)')
conn.executemany('INSERT INTO applications_2026 VALUES (?)', [(k,) for k in a])
conn.executemany('INSERT INTO catalog_2025 VALUES (?)', [(k,) for k in catalog])
coverage_sql = "SELECT CASE WHEN c.offer_id IS NULL THEN 'Bez přesné shody' ELSE 'Přesná shoda' END AS stav, COUNT(*) AS pocet FROM applications_2026 a LEFT JOIN catalog_2025 c ON a.offer_id = c.offer_id GROUP BY 1 ORDER BY pocet DESC"
coverage = [dict(zip(('stav', 'pocet'), row)) for row in conn.execute(coverage_sql)]
assert [r['pocet'] for r in coverage] == [2087, 1004]
conn.close()
