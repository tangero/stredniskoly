import test from 'node:test';
import assert from 'node:assert/strict';
import { POVOLENE_ZDROJE, urciZdroj } from '../src/lib/novinky-zdroje.ts';

test('zdroj ze seznamu se uloží beze změny', () => {
  for (const z of ['titulka-karta', 'simulator-vysledek', 'simulator-zvazovane', 'pruvodce-jak-vybrat', 'kalendar-pripominky', 'skola-hlidat']) {
    assert.equal(urciZdroj(z), z);
  }
});

test('zdroj mimo seznam nebo jiného typu je neznamy', () => {
  for (const z of ['jine-misto', '', undefined, null, 5, { a: 1 }, 'Skola']) {
    assert.equal(urciZdroj(z), 'neznamy');
  }
});

test('seznam zdrojů nemá duplicity ani neznamy', () => {
  assert.equal(new Set(POVOLENE_ZDROJE).size, POVOLENE_ZDROJE.length);
  assert.ok(!POVOLENE_ZDROJE.includes('neznamy'));
});
