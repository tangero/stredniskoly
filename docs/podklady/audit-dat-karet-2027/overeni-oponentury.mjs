// Spouštět z kořene repozitáře; používá přímo produkční normalizátor.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { normalizeSchoolKey, uniqueSchoolIndex } from '../../../src/lib/school-key.ts';
const read = name => JSON.parse(fs.readFileSync(name, 'utf8'));
const files = ['public/schools_data.json', 'public/applications_2026.json', 'public/cermat_results_2026.json', 'data/inspis_school_profiles.json'];
const old = read(files[0])['2025'];
const apps = read(files[1]).data;
const results = Object.entries(read(files[2]));
const all = new Set(old.map(x => normalizeSchoolKey(x.id)));
const unique = uniqueSchoolIndex(old, x => x.id);
const resultIndex = uniqueSchoolIndex(results, x => x[0]);
const profile = read('docs/podklady/audit-dat-karet-2027/profil.json');
assert.equal([...unique.keys()].filter(k => resultIndex.has(k)).length, profile.catalog_with_results_2026);
for (const [id, normalized] of [...old.map(x => [x.id, normalizeSchoolKey(x.id)]), ...results.map(([id]) => [id, normalizeSchoolKey(id)])]) {
  if (id.endsWith('____')) assert.ok(!normalized.endsWith('_'));
}
const days = Object.entries(read(files[3]).schools).map(([redizo, row]) => ({ redizo, value: row.dny_otevrenych_dveri })).filter(x => x.value);
// JS \b a Python \b zde poskytují stejné kategorie nad tímto datasetem.
const years = (s, bounded) => [...s.matchAll(bounded ? /\b20\d{2}\b/g : /20\d{2}/g)].map(x => Number(x[0]));
const out = {
  hashes: Object.fromEntries(files.map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')])),
  catalog_all_keys: all.size,
  catalog_unambiguous: unique.size,
  result_matches: [...unique.keys()].filter(k => resultIndex.has(k)).length,
  missing_against_all: apps.filter(x => !all.has(normalizeSchoolKey(x.id))).length,
  missing_against_unambiguous: apps.filter(x => !unique.has(normalizeSchoolKey(x.id))).length,
  date_classification_difference: days.filter(x => {
    const a = years(x.value, true), b = years(x.value, false);
    return (a.length === 0) !== (b.length === 0);
  }),
};
assert.equal(out.missing_against_all, 978);
assert.equal(out.missing_against_unambiguous, 1004);
assert.equal(out.result_matches, 2075);
console.log(JSON.stringify(out, null, 2));
