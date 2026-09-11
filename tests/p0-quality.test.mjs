import test from 'node:test';
import assert from 'node:assert/strict';
import { canPublishAcceptedResult } from '../src/lib/result-quality.ts';
import { uniqueSchoolIndex, normalizeSchoolKey } from '../src/lib/school-key.ts';
const row = { prijati: 23, cj_ma_prijati: 68.7, cj_prijati: 36, ma_prijati: 32.7 };
const context = { accepted: 23, tested_accepted: 23, average_accepted: 68.74 };
test('paralelní import neobnoví zadržené nebo rozporné výsledky', () => {
  assert.equal(canPublishAcceptedResult(row, context), true);
  for (const value of [null, {...context, average_accepted: null}, {...context, tested_accepted: 24}, {...context, tested_accepted: 0}, {...context, accepted: 22}, {...context, average_accepted: 80}]) assert.equal(canPublishAcceptedResult(row, value), false);
  for (const value of [NaN, -1, 51]) assert.equal(canPublishAcceptedResult({...row, cj_prijati: value}, context), false);
  assert.equal(canPublishAcceptedResult({...row, cj_ma_prijati: 0, cj_prijati: 0, ma_prijati: 0}, {...context, average_accepted: 0}), true);
});
test('zaměření, délka a nejednoznačné klíče nemají náhradní shodu', () => {
  const rows = ['600_79-41-K/41_jazyky','600_79-41-K/41_technika','600_79-41-K/81','600_78-42-M/01____','600_78-42-M/01'].map(id=>({id}));
  const index = uniqueSchoolIndex(rows, x=>x.id);
  assert.equal(index.get(normalizeSchoolKey('600_79-41-K/41')), undefined);
  assert.equal(index.get(normalizeSchoolKey('600_79-41-K/61')), undefined);
  assert.equal(index.get(normalizeSchoolKey('600_78-42-M/01')), undefined);
  assert.equal(index.get(normalizeSchoolKey('600_79-41-K/41_JAZYKY')).id, rows[0].id);
});
