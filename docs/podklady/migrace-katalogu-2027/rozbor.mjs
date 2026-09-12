import fs from 'node:fs';
import crypto from 'node:crypto';
import { normalizeSchoolKey, uniqueSchoolIndex } from '../../../src/lib/school-key.ts';
const base = 'docs/podklady/migrace-katalogu-2027';
const paths = ['public/schools_data.json', 'public/applications_2026.json'];
const old = JSON.parse(fs.readFileSync(paths[0]))['2025'];
const current = JSON.parse(fs.readFileSync(paths[1])).data;
const unique = uniqueSchoolIndex(old, r => r.id);
const baseKey = id => id.split('_').slice(0, 2).join('_');
const counts = {}, rows = [];
for (const row of current.filter(r => !unique.has(normalizeSchoolKey(r.id)))) {
  const school = old.filter(r => r.id.split('_')[0] === row.redizo);
  const candidates = school.filter(r => baseKey(r.id) === baseKey(row.id));
  const exact = candidates.filter(r => normalizeSchoolKey(r.id) === normalizeSchoolKey(row.id));
  const category = exact.length > 1 ? 'kolize_2025' : !school.length ? 'skola_chybi_v_katalogu_2025'
    : !candidates.length ? 'obor_chybi_v_katalogu_2025' : candidates.length === 1 ? 'jeden_kandidat' : 'vice_kandidatu';
  counts[category] = (counts[category] ?? 0) + 1;
  rows.push({ id: row.id, source_id: row.source_id, redizo: row.redizo, kkov: row.kkov,
    nazev: row.nazev, zamereni: row.zamereni, obec: row.obec, ulice_2026: row.ulice,
    category, candidates: candidates.map(r => ({ id: r.id, zamereni: r.zamereni,
      delka_studia: r.delka_studia, obec: r.obec, adresa: r.adresa, synthetic: !!r.is_new_2026 })),
    history_mapping: 'unverified', publication_2026: 'independent_source_record' });
}
const summary = { counts, total: rows.length, current_offers: current.length,
  distinct_schools_in_pending: new Set(rows.map(r => r.redizo)).size,
  new_school_records: new Set(rows.filter(r => r.category === 'skola_chybi_v_katalogu_2025').map(r => r.redizo)).size,
  hashes: Object.fromEntries(paths.map(p => [p, crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')])),
  note: 'Kategorie popisují rozdíl importů, nikoli vznik či zánik oboru. Žádné heuristické mapování historie není aktivováno.' };
fs.writeFileSync(`${base}/rozbor-1004.json`, JSON.stringify({ summary, rows }, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
