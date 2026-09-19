import test from 'node:test';
import assert from 'node:assert/strict';
import { kohoSeTykaMaturita as koho, rokMaturityOboru } from '../src/lib/skola-vyklad.ts';

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
  // Do tří se vyjmenují, jak říká dokumentace; teprve od čtyř se uvede počet.
  assert.equal(koho({ ...zaklad, samotny: false, dalsiObory: ['A', 'B', 'C'] }),
    'Maturanti tohoto oboru a oborů A, B a C');
  assert.equal(koho({ ...zaklad, samotny: false, dalsiObory: ['A', 'B', 'C', 'D'] }),
    'Maturanti tohoto a dalších 4 oborů školy');
});

test('obor bez ostatních v seznamu mluví sám za sebe', () => {
  // Pojistka proti tvrzení „a oborů“ s prázdným výčtem, kdyby se popisky nepodařilo složit.
  assert.equal(koho({ ...zaklad, samotny: false, dalsiObory: [] }), 'Maturanti tohoto oboru');
});

const uplny = { spolecna_cast: { registered: 20, passed: 19 }, cj: { averagePercentScore: 70 }, ma: { subjectChoiceShare: 40 } };

test('rok maturity se bere z posledního ročníku se záznamem', () => {
  const roky = { 2023: { LYC: uplny }, 2024: { LYC: uplny }, 2025: { LYC: uplny }, 2026: { GY4: uplny } };
  // Ve skupině letos nikdo nematuroval; stránka oboru nesmí tvrdit, že obor maturanty nemá,
  // když stránka školy u téhož ukazuje poslední maturitu 2025.
  assert.deepEqual(rokMaturityOboru(roky, 'LYC', 2026), { rok: 2025, nezverejneno: false });
  assert.deepEqual(rokMaturityOboru(roky, 'GY4', 2026), { rok: 2026, nezverejneno: false });
  // Skupina bez záznamu v kterémkoli roce: obor opravdu maturanty nemá.
  assert.deepEqual(rokMaturityOboru(roky, 'ST1', 2026), { rok: null, nezverejneno: false });
  // Novější ročník, než web zobrazuje, se nebere.
  assert.deepEqual(rokMaturityOboru({ 2027: { LYC: uplny } }, 'LYC', 2026), { rok: null, nezverejneno: false });
});

test('záznam bez jediného zveřejnitelného čísla nevyrobí prázdnou kartu', () => {
  const nic = { spolecna_cast: { quality: 'unavailable' }, cj: { quality: 'unavailable' }, ma: { quality: 'unavailable' } };
  assert.deepEqual(rokMaturityOboru({ 2026: { LYC: nic } }, 'LYC', 2026), { rok: 2026, nezverejneno: true });
  // Stačí jediné číslo a karta se vykreslí.
  const jenPocty = { spolecna_cast: { registered: 8, passed: 7 }, cj: { quality: 'counts_only' }, ma: {} };
  assert.deepEqual(rokMaturityOboru({ 2026: { LYC: jenPocty } }, 'LYC', 2026), { rok: 2026, nezverejneno: false });
});
