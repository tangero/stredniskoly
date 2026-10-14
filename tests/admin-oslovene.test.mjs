import test from 'node:test';
import assert from 'node:assert/strict';
import { souhrnPoVlnach, filtrZAdresy, filtrujOslovene } from '../src/lib/portal-oslovene.ts';

// #488 K3: souhrn po vlnách a filtr oslovených škol.
const radky = [
  { id: 1, vlna: 1, spravce: 'Správce', navrhy: 2 },
  { id: 2, vlna: 2, spravce: null, navrhy: 0 },
  { id: 3, vlna: 2, spravce: 'Správce', navrhy: 0 },
  { id: 4, vlna: 3, spravce: null, navrhy: 1 },
];

test('souhrn po vlnách počítá oslovené, správce a návrhy', () => {
  assert.deepEqual(souhrnPoVlnach(radky), [
    { vlna: 1, osloveno: 1, seSpravcem: 1, poslaloNavrh: 1 },
    { vlna: 2, osloveno: 2, seSpravcem: 1, poslaloNavrh: 0 },
    { vlna: 3, osloveno: 1, seSpravcem: 0, poslaloNavrh: 1 },
  ]);
});

test('filtr jen se správcem a podle vlny zúží tabulku', () => {
  assert.deepEqual(filtrujOslovene(radky, { typ: 'spravce' }).map((r) => r.id), [1, 3]);
  assert.deepEqual(filtrujOslovene(radky, { typ: 'vlna', vlna: 2 }).map((r) => r.id), [2, 3]);
  assert.equal(filtrujOslovene(radky, { typ: 'vse' }).length, 4);
});

test('filtr z adresy: neplatná hodnota znamená všechny školy', () => {
  assert.deepEqual(filtrZAdresy({ filtr: 'spravce' }), { typ: 'spravce' });
  assert.deepEqual(filtrZAdresy({ vlna: '3' }), { typ: 'vlna', vlna: 3 });
  assert.deepEqual(filtrZAdresy({ vlna: 'x', filtr: 'jiny' }), { typ: 'vse' });
});
