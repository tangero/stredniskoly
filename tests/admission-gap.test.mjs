import test from 'node:test';
import assert from 'node:assert/strict';
import { admissionGap, formatGap, subjectImbalance, BAND_BY_SCALE } from '../src/lib/admission-gap.ts';

test('odstup nese znaménko: rezerva i chybějící body', () => {
  assert.equal(admissionGap(80, 72, 'total_0_100').difference, 8);
  assert.equal(admissionGap(65, 72, 'total_0_100').difference, -7);
  assert.equal(formatGap(admissionGap(80, 72, 'total_0_100')), '+8');
  assert.equal(formatGap(admissionGap(65, 72, 'total_0_100')), '-7');
});

test('chybějící nebo neplatný průměr není nula ani nulový odstup', () => {
  for (const missing of [null, undefined, NaN, 'x', -1, 101]) {
    const gap = admissionGap(72, missing, 'total_0_100');
    assert.equal(gap.difference, null);
    assert.equal(gap.standing, 'unknown');
    assert.equal(formatGap(gap), '—');
  }
  // Neznámý vlastní výsledek se chová stejně; nepředstírá se nula.
  assert.equal(admissionGap(null, 72, 'total_0_100').standing, 'unknown');
});

test('předmět má poloviční pásmo, aby se nehodnotil přísněji než souhrn', () => {
  assert.equal(BAND_BY_SCALE.subject_0_50 * 2, BAND_BY_SCALE.total_0_100);
  // Stejný relativní odstup dá u předmětu i souhrnu stejný stav.
  assert.equal(admissionGap(38, 35, 'subject_0_50').standing, 'above');
  assert.equal(admissionGap(76, 70, 'total_0_100').standing, 'above');
  assert.equal(admissionGap(36, 35, 'subject_0_50').standing, 'around');
  assert.equal(admissionGap(72, 70, 'total_0_100').standing, 'around');
});

test('hranice pásma patří do okolí průměru, nikoli nad ně', () => {
  assert.equal(admissionGap(77, 72, 'total_0_100').standing, 'above');
  assert.equal(admissionGap(76.9, 72, 'total_0_100').standing, 'around');
  assert.equal(admissionGap(67, 72, 'total_0_100').standing, 'around');
  assert.equal(admissionGap(66.9, 72, 'total_0_100').standing, 'below');
});

test('škála 0–50 odmítne hodnotu platnou jen pro souhrn', () => {
  assert.equal(admissionGap(72, 35, 'subject_0_50').standing, 'unknown');
  assert.equal(admissionGap(38, 35, 'subject_0_50').standing, 'above');
});

test('nerovnováha předmětů se hlásí až od rozdílu pěti bodů', () => {
  const czech = own => admissionGap(own, 40, 'subject_0_50');
  const maths = own => admissionGap(own, 35, 'subject_0_50');
  // V ČJ +4, v MA -2: rozdíl 6 bodů ve prospěch češtiny.
  assert.equal(subjectImbalance(czech(44), maths(33)), 'Proti této škole jsi slabší v matematice');
  assert.equal(subjectImbalance(czech(36), maths(40)), 'Proti této škole jsi slabší v češtině');
  // Vyrovnaný uchazeč nedostane upozornění.
  assert.equal(subjectImbalance(czech(42), maths(37)), null);
  // Neúplná data nevytvoří tvrzení o nerovnováze.
  assert.equal(subjectImbalance(czech(42), admissionGap(37, null, 'subject_0_50')), null);
});

test('rozdíl se zaokrouhluje na desetinu, aby nevznikl zdánlivě přesný údaj', () => {
  assert.equal(admissionGap(72.78, 41.17, 'total_0_100').difference, 31.6);
  assert.equal(admissionGap(41.17, 38.67, 'subject_0_50').difference, 2.5);
  // Výstup je v českém formátu s desetinnou čárkou.
  assert.equal(formatGap(admissionGap(41.17, 38.67, 'subject_0_50')), '+2,5');
});
