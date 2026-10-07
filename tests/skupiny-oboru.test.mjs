import test from 'node:test';
import assert from 'node:assert/strict';
import { DRUHY_VZDELANI, druhVzdelani, mistaPodleDruhu } from '../src/lib/smery-studia.ts';

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

// Místa podle druhu studia (slovník ukazatelů, issue #244): součet míst ve skupinách přepínače.
test('místa podle druhu studia: pevné pořadí, prázdné skupiny vynechá, chybějící místa nejsou nula', () => {
  const v = mistaPodleDruhu([
    { vzdelani: 'vyucni', mista: 24 },
    { vzdelani: 'maturita', mista: 30 },
    { vzdelani: 'maturita', mista: 60 },
    { vzdelani: 'ostatni', mista: null },
    { vzdelani: 'vyucni', mista: 0 },
  ]);
  assert.deepEqual(v.skupiny.map(s => [s.id, s.mista, s.oboru]), [['maturita', 90, 2], ['vyucni', 24, 2]]);
  assert.equal(v.celkem, 114);
  assert.equal(v.bezUdaje, 1);
  assert.deepEqual(mistaPodleDruhu([]), { skupiny: [], celkem: 0, bezUdaje: 0 });
});
