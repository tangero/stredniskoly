import test from 'node:test';
import assert from 'node:assert/strict';
import { DRUHY_VZDELANI, druhVzdelani } from '../src/lib/smery-studia.ts';

// Skupiny oborů na stránce školy podle toho, čím studium končí (issue #393).

test('zařazení do skupin podle kategorie v kódu oboru', () => {
  assert.equal(druhVzdelani('79-41-K/41'), 'maturita');
  assert.equal(druhVzdelani('63-41-M/02'), 'maturita');
  assert.equal(druhVzdelani('78-42-M/01'), 'maturita');
  assert.equal(druhVzdelani('82-41-L/01'), 'maturita');
  assert.equal(druhVzdelani('64-41-L/51'), 'po_vyuceni');
  assert.equal(druhVzdelani('26-41-L/52'), 'po_vyuceni');
  assert.equal(druhVzdelani('69-51-H/01'), 'vyucni');
  assert.equal(druhVzdelani('29-51-E/01'), 'vyucni');
  assert.equal(druhVzdelani('78-62-C/02'), 'ostatni');
  assert.equal(druhVzdelani('63-51-J/01'), 'ostatni');
  assert.equal(druhVzdelani('82-44-P/01'), 'ostatni');
  assert.equal(druhVzdelani('nesmysl'), 'ostatni');
});

test('pořadí skupin je pevné', () => {
  assert.deepEqual(DRUHY_VZDELANI.map(d => d.nazev), ['S maturitou', 'S výučním listem', 'Po vyučení', 'Ostatní']);
});
