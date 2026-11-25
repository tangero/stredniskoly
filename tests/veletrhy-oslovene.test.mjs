// ============================================================================
// Evidence oslovených adres (src/lib/veletrhy-oslovene.ts).
//
// Pořadatel, kterého jsme už oslovili, se znovu neoslovuje. Rozesílka dřív
// hlídala jen id adresáta, takže stejná adresa pod novým id by dopis dostala
// podruhé. Testy hlídají, že se hlídá adresa.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nactiOslovene, osloveneZOdeslanych, rozdelAdresy, vyberAdresaty } from '../src/lib/veletrhy-oslovene.ts';

const OSLOVENE = { 'info@jhk.test': { datum: '2026-09-23', adresat: 'jhk' } };

test('adresa oslovená pod jiným adresátem se vyřadí', () => {
  const { nove, uzOslovene } = rozdelAdresy(['info@jhk.test', 'akce@jhk.test'], OSLOVENE);
  assert.deepEqual(nove, ['akce@jhk.test']);
  assert.deepEqual(uzOslovene, ['info@jhk.test']);
});

test('shoda nezávisí na velikosti písmen a mezerách', () => {
  const { nove } = rozdelAdresy(' Info@JHK.test ', OSLOVENE);
  assert.deepEqual(nove, [], 'Stejná adresa jinak zapsaná by prošla a dopis by odešel podruhé.');
});

test('adresát bez jediné nové adresy nemá komu psát', () => {
  const { nove } = rozdelAdresy(['info@jhk.test'], OSLOVENE);
  assert.equal(nove.length, 0);
});

test('rozesílka před zavedením evidence se dosévá z odeslano.json', () => {
  const seznam = [
    { id: 'jhk', email: ['Info@jhk.test', 'sekretariat@jhk.test'] },
    { id: 'novy', email: 'novy@example.cz' },
  ];
  const ev = osloveneZOdeslanych(seznam, { jhk: '2026-09-23' });
  assert.deepEqual(Object.keys(ev).sort(), ['info@jhk.test', 'sekretariat@jhk.test']);
  assert.equal(ev['info@jhk.test'].adresat, 'jhk');
  assert.equal(ev['novy@example.cz'], undefined, 'Neodeslaný adresát nesmí vypadat jako oslovený.');
});

test('stejná adresa u dvou nových adresátů dostane v jednom běhu jen jeden dopis', () => {
  const seznam = [
    { id: 'jhk-tabor', email: 'info@jhk.test' },
    { id: 'jhk-pisek', email: ['Info@jhk.test', 'pisek@jhk.test'] },
    { id: 'jhk-strakonice', email: 'info@jhk.test' },
  ];
  const { vyber, preskoceni } = vyberAdresaty(seznam, {}, {});
  assert.deepEqual(vyber.map((a) => [a.id, a.email]), [['jhk-tabor', 'info@jhk.test'], ['jhk-pisek', 'pisek@jhk.test']]);
  assert.ok(preskoceni.some((p) => p.startsWith('jhk-strakonice')), 'přeskočení je vidět už nanečisto');
});

test('ani --znovu nepošle jedné adrese v jednom běhu dva dopisy', () => {
  const seznam = [{ id: 'a', email: 'x@example.cz' }, { id: 'b', email: 'x@example.cz' }];
  const { vyber } = vyberAdresaty(seznam, { a: '2026-09-23', b: '2026-09-23' }, OSLOVENE, { znovu: true });
  assert.deepEqual(vyber.map((a) => a.id), ['a']);
});

test('uložená evidence má přednost, seznam ji zpětně nepřepisuje', () => {
  // Adresa doplněná k odeslanému adresátovi po rozesílce dopis nedostala.
  const seznam = [{ id: 'jhk', email: ['info@jhk.test', 'reditel@jhk.test'] }];
  const ev = nactiOslovene(OSLOVENE, seznam, { jhk: '2026-09-23' });
  assert.equal(ev['reditel@jhk.test'], undefined);
  assert.ok(nactiOslovene(null, seznam, { jhk: '2026-09-23' })['reditel@jhk.test'], 'bez evidence se jednorázově odvodí');
});
