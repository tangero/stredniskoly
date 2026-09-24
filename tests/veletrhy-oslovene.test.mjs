// ============================================================================
// Evidence oslovených adres (src/lib/veletrhy-oslovene.ts).
//
// Pořadatel, kterého jsme už oslovili, se znovu neoslovuje. Rozesílka dřív
// hlídala jen id adresáta, takže stejná adresa pod novým id by dopis dostala
// podruhé. Testy hlídají, že se hlídá adresa.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { osloveneZOdeslanych, rozdelAdresy } from '../src/lib/veletrhy-oslovene.ts';

const OSLOVENE = { 'info@jhk.cz': { datum: '2026-09-23', adresat: 'jhk' } };

test('adresa oslovená pod jiným adresátem se vyřadí', () => {
  const { nove, uzOslovene } = rozdelAdresy(['info@jhk.cz', 'novak@jhk.cz'], OSLOVENE);
  assert.deepEqual(nove, ['novak@jhk.cz']);
  assert.deepEqual(uzOslovene, ['info@jhk.cz']);
});

test('shoda nezávisí na velikosti písmen a mezerách', () => {
  const { nove } = rozdelAdresy(' Info@JHK.cz ', OSLOVENE);
  assert.deepEqual(nove, [], 'Stejná adresa jinak zapsaná by prošla a dopis by odešel podruhé.');
});

test('adresát bez jediné nové adresy nemá komu psát', () => {
  const { nove } = rozdelAdresy(['info@jhk.cz'], OSLOVENE);
  assert.equal(nove.length, 0);
});

test('rozesílka před zavedením evidence se dosévá z odeslano.json', () => {
  const seznam = [
    { id: 'jhk', email: ['Info@jhk.cz', 'sladkova@jhk.cz'] },
    { id: 'novy', email: 'novy@example.cz' },
  ];
  const ev = osloveneZOdeslanych(seznam, { jhk: '2026-09-23' });
  assert.deepEqual(Object.keys(ev).sort(), ['info@jhk.cz', 'sladkova@jhk.cz']);
  assert.equal(ev['info@jhk.cz'].adresat, 'jhk');
  assert.equal(ev['novy@example.cz'], undefined, 'Neodeslaný adresát nesmí vypadat jako oslovený.');
});
