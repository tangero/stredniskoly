import test from 'node:test';
import assert from 'node:assert/strict';
import { kohoSeTykaMaturita as koho } from '../src/lib/skola-vyklad.ts';

const zaklad = {};

test('věta říká, koho se maturitní výsledek týká', () => {
  // Obor sám ve skupině: agregát je fakticky jeho výsledek, smí se o něm mluvit přímo.
  assert.equal(koho({ ...zaklad, samotny: true, dalsiObory: [] }), 'Maturanti tohoto oboru');
  // Sdílená skupina: musí být vidět, s kým se výsledek sdílí.
  assert.equal(koho({ ...zaklad, samotny: false, dalsiObory: ['Gymnázium · Programování'] }),
    'Maturanti tohoto oboru a oboru Gymnázium · Programování');
  assert.equal(koho({ ...zaklad, samotny: false, dalsiObory: ['A', 'B'] }),
    'Maturanti tohoto oboru a oborů A a B');
  // Nad tři obory by výčet větu utopil; u 96 nabídek jich je ve skupině pět a víc.
  assert.equal(koho({ ...zaklad, samotny: false, dalsiObory: ['A', 'B', 'C'] }),
    'Maturanti tohoto a dalších 3 oborů školy');
});

test('obor bez ostatních v seznamu mluví sám za sebe', () => {
  // Pojistka proti tvrzení „a oborů“ s prázdným výčtem, kdyby se popisky nepodařilo složit.
  assert.equal(koho({ ...zaklad, samotny: false, dalsiObory: [] }), 'Maturanti tohoto oboru');
});
