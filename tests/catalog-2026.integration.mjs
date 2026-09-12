import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeSchoolKey } from '../src/lib/school-key.ts';
const base = process.env.BASE_URL ?? 'http://localhost:3228';
const source = JSON.parse(fs.readFileSync('public/applications_2026.json'));
let response;
const catalog = async () => response ??= await fetch(`${base}/api/schools/search?simulatorCatalog=1`).then(r => r.json());
test('katalog zpřístupní každý záznam importu 2026 právě jednou', async () => {
  const data = await catalog();
  assert.equal(data.catalogYear, 2026);
  assert.equal(data.schools.length, source.data.length);
  assert.deepEqual(new Set(data.schools.map(s => normalizeSchoolKey(s.id))), new Set(source.data.map(s => normalizeSchoolKey(s.id))));
  assert.equal(new Set(data.schools.map(s => s.href)).size, source.data.length);
  for (const s of data.schools) {
    assert.equal(s.catalog_year, 2026);
    assert.equal(s.offer_2027_status, 'unverified');
    assert.match(s.href, /^\/(nabidka\/2026\/[a-f0-9-]{36}|skola\/.+)$/);
    for (const key of ['average_cj', 'average_ma']) assert.ok(s.history?.[key] == null || (s.history[key] >= 0 && s.history[key] <= 50));
  }
});
test('chybějící historická shoda nezabrání detailu ani přesnému načtení do výběru', async () => {
  const data = await catalog();
  const ids = ['600001873_79-41-K/81', '600005798_65-41-L/01', '600004759_63-41-M/02'];
  for (const id of ids) {
    const offer = data.schools.find(s => s.id === id);
    assert.ok(offer, id);
    const r = await fetch(base + offer.href);
    assert.equal(r.status, 200);
    const html = await r.text();
    assert.ok(html.includes(offer.nazev));
    assert.match(html, /2027 zatím nejsou potvrzené/);
    const lookup = await fetch(`${base}/api/schools/search?${new URLSearchParams({ ids: JSON.stringify([id]) })}`).then(r => r.json());
    assert.equal(lookup.schools[0].id, id);
  }
});
test('neexistující detail vrací 404 a zadržený průměr MESIT zůstává null', async () => {
  assert.equal((await fetch(`${base}/nabidka/2026/neexistuje`)).status, 404);
  const offer = (await catalog()).schools.find(s => s.id === '600015611_64-41-L/51');
  assert.equal(offer.admission_context.average_accepted, null);
  assert.equal(offer.history, null);
});
