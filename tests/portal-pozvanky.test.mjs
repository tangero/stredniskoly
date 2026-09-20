import test from 'node:test';
import assert from 'node:assert/strict';
import { osloveni } from '../scripts/portal-posli-pozvanky.mjs';

// Oslovení se hádá z ředitelova jména. Špatně oslovená ředitelka je horší než
// neutrální „Dobrý den“, takže se rod odvozuje jen tam, kde je jistý.

test('příjmení na -ová je vždy paní ředitelka', () => {
  assert.equal(osloveni('Jana Nováková'), 'Vážená paní ředitelko');
  assert.equal(osloveni('Mgr. Eva Černá-Procházková'), 'Vážená paní ředitelko');
  assert.equal(osloveni('PhDr. Marie Svobodová, Ph.D.'), 'Vážená paní ředitelko');
});

test('typicky mužská koncovka je pan ředitel', () => {
  assert.equal(osloveni('Petr Novotný'), 'Vážený pane řediteli');
  assert.equal(osloveni('Mgr. Jan Němec'), 'Vážený pane řediteli');
  assert.equal(osloveni('Ing. Pavel Kučera'), 'Dobrý den'); // -a: rod není jistý
});

test('nejisté a chybějící jméno končí neutrálně', () => {
  assert.equal(osloveni(''), 'Dobrý den');
  assert.equal(osloveni(null), 'Dobrý den');
  assert.equal(osloveni('   '), 'Dobrý den');
  // Příjmení, kde se rod z koncovky poznat nedá.
  assert.equal(osloveni('Michal Krejčí'), 'Dobrý den');
  assert.equal(osloveni('Jiří Janů'), 'Dobrý den');
});

test('tituly se do odvození rodu nepočítají', () => {
  // Bez odfiltrování titulů by se rozhodovalo podle „Ph.D.“ místo příjmení.
  assert.equal(osloveni('Mgr. Jana Nováková, Ph.D.'), 'Vážená paní ředitelko');
  assert.equal(osloveni('doc. Ing. Petr Novotný, CSc.'), 'Vážený pane řediteli');
});
