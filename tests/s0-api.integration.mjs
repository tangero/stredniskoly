// Spustit proti hotovému buildu nebo produkci: BASE_URL=... node --test tests/s0-api.integration.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeSchoolKey, uniqueSchoolIndex } from '../src/lib/school-key.ts';

const base = process.env.BASE_URL;
if (!base) throw new Error('Nastavte BASE_URL na testované nasazení.');
const catalog = JSON.parse(await readFile(new URL('../public/schools_data.json', import.meta.url), 'utf8'))['2025'];
const index = uniqueSchoolIndex(catalog, s => s.id);
const results = uniqueSchoolIndex(Object.entries(JSON.parse(await readFile(new URL('../public/cermat_results_2026.json', import.meta.url), 'utf8'))), ([id]) => id);
async function get(path) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200, path);
  return response.json();
}
const search = params => get(`/api/schools/search?${new URLSearchParams(params)}`);
function verifySchool(school) {
  assert.equal(school.jpz_min, undefined);
  assert.equal(school.min_body_2025, undefined);
  assert.deepEqual(school.comparison, { status: 'unavailable', minimum: null });
  const result = results.get(normalizeSchoolKey(school.id))?.[1];
  if (!result) assert.equal(school.history, null);
  else {
    assert.equal(school.history.year, 2026);
    assert.equal(school.history.round, 1);
    assert.equal(school.history.average, result.cj_ma_prijati);
    assert.equal(school.history.accepted, result.prijati);
    assert.equal(school.history.average_cj, result.cj_prijati);
  }
}

test('skóre nemění seznam, pořadí ani celkový počet; stránkování zpřístupní další obory', async () => {
  const low = await search({ minScore: '0', maxScore: '0', limit: '20' });
  const high = await search({ minScore: '100', maxScore: '100', limit: '20' });
  assert.deepEqual(low, high);
  assert.equal(low.total, index.size);
  assert.equal(low.schools.length, 20);
  low.schools.forEach(verifySchool);
  const next = await search({ offset: '20', limit: '20' });
  assert.equal(next.total, low.total);
  assert.ok(next.schools.every(s => !low.schools.some(first => first.id === s.id)));
  assert.equal((await search({ limit: '-1' })).schools.length, 1);
  assert.equal((await search({ limit: 'oops' })).schools.length, 50);
});

test('filtry fungují bez diakritiky a prázdný výsledek není chyba', async () => {
  const found = await search({ search: 'gymnazium', kraj: 'CZ010', delkaStudia: '8' });
  assert.ok(found.total > 0);
  assert.ok(found.schools.every(s => s.kraj_kod === 'CZ010' && s.delka_studia === 8));
  found.schools.forEach(verifySchool);
  const empty = await search({ search: 'NEEXISTUJICI_SKOLA_S0_XYZ' });
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.schools, []);
});

test('přímé načtení zachová pořadí, zaměření, čárky a neznámá ID', async () => {
  const rows = [...index.values()];
  const withComma = rows.find(s => s.id.includes(','));
  assert.ok(withComma, 'fixture s čárkou');
  const multiple = rows.find(s => rows.some(other => other.id !== s.id && other.id.split('_').slice(0, 2).join('_') === s.id.split('_').slice(0, 2).join('_')));
  const related = rows.filter(s => s.id.split('_').slice(0, 2).join('_') === multiple.id.split('_').slice(0, 2).join('_')).slice(0, 2);
  const noHistory = rows.find(s => !results.has(normalizeSchoolKey(s.id)));
  const ids = [...new Set([withComma.id, ...related.map(s => s.id), noHistory.id])];
  const response = await search({ ids: JSON.stringify([...ids, 'missing']) });
  assert.deepEqual(response.schools.map(s => s.id), ids);
  assert.deepEqual(response.missingIds, ['missing']);
  response.schools.forEach(verifySchool);
  assert.deepEqual((await search({ ids: '' })).schools, []);
  const legacy = await search({ ids: related.map(s => s.id).join(',') });
  assert.deepEqual(legacy.schools.map(s => s.id), related.map(s => s.id));
  const normalized = normalizeSchoolKey(multiple.id);
  const match = await search({ ids: normalized });
  assert.equal(match.schools.length, 1);
  verifySchool(match.schools[0]);
  // Nejednoznačné historické ID se nesmí vybrat podle pořadí řádků.
  const ambiguous = catalog.find(s => !index.has(normalizeSchoolKey(s.id)));
  assert.ok(ambiguous);
  assert.deepEqual((await search({ ids: JSON.stringify([ambiguous.id]) })).schools, []);
});

test('odkaz používá kanonický název profilu a rozlišuje délku studia', async () => {
  const data = await search({ ids: '600001431_79-41-K/41,600001431_79-41-K/81' });
  assert.deepEqual(data.schools.map(s => s.slug), [
    '600001431-biskupske-gymnazium-konevova-gymnazium-4lete',
    '600001431-biskupske-gymnazium-konevova-gymnazium-8lete',
  ]);
  for (const school of data.schools) {
    const response = await fetch(new URL(`/skola/${school.slug}`, base));
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(!html.includes('<title>Biskupské gymnázium, Koněvova - přehled oborů'));
  }
});

test('detail API nevrací falešné minimum, školní body ani žebříček ze součtu minim', async () => {
  const row = [...index.values()].find(s => !s.zamereni);
  const detail = await get(`/api/school-details/${encodeURIComponent(row.id)}`);
  for (const key of ['jpz_min', 'min_body', 'extra_body', 'hasExtraCriteria', 'difficulty_profile']) assert.equal(detail[key], null, key);
  assert.equal(detail.year, 2025);
  assert.equal(detail.cj_prumer, Math.round(row.cj_prumer * 5) / 10);
});

test('veřejně doručovaný JS simulátoru neobsahuje původní predikční větve', async () => {
  const response = await fetch(new URL('/simulator?cj=35&ma=35&srovnani=1', base));
  assert.equal(response.status, 200);
  const html = await response.text();
  const urls = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+\.js[^"<>]*)"/g)].map(match => match[1]))];
  assert.ok(urls.length > 0);
  let all = '';
  for (const url of urls) {
    const script = await fetch(new URL(url.replaceAll('&amp;', '&'), base));
    assert.equal(script.status, 200);
    all += await script.text();
  }
  for (const forbidden of ['Vysoká šance', 'Malá šance', 'Na hraně', 'estimatedChancePct', 'estimatedMinScore']) assert.ok(!all.includes(forbidden), forbidden);
  assert.ok(all.includes('Pro toto porovnání nemáme ověřený údaj'));
});
