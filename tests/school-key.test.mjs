import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSchoolKey, uniqueSchoolIndex } from '../src/lib/school-key.ts';

test('normalizuje diakritiku a oddělovače při zachování oboru', () => {
  assert.equal(normalizeSchoolKey('123_79-41-K/41_IT & Sítě'), '123_79-41-K/41_it_site');
  assert.notEqual(normalizeSchoolKey('123_79-41-K/41'), normalizeSchoolKey('123_79-41-K/41_jazykove'));
});

test('nepřiřadí první záznam při kolizi historických ID', () => {
  const index = uniqueSchoolIndex([{id: '123_X_ČJ'}, {id: '123_X_cj'}, {id: '456_X'}], r => r.id);
  assert.equal(index.size, 1);
  assert.equal(index.get('456_X').id, '456_X');
});
