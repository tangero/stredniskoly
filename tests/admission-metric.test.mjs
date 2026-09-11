import test from 'node:test';
import assert from 'node:assert/strict';
import { historicalSubjectAverage, formatAdmissionScore } from '../src/lib/admission-metric.ts';

const make = value => historicalSubjectAverage({ value, unit: 'percent_0_100', field: 'cj_prumer', offerId: '600007774_78-42-M/01' });

test('kontrakt zachová zdroj a renderer odvodí jednotku z kontraktu', () => {
  for (const [source, expected, label] of [[72.2, 36.1, '36,1 / 50 bodů'], [60.2, 30.1, '30,1 / 50 bodů'], [100, 50, '50 / 50 bodů'], [0, 0, '0 / 50 bodů']]) {
    const score = make(source);
    assert.equal(score.value, expected);
    assert.equal(score.sourceValue, source);
    assert.equal(score.year, 2025);
    assert.equal(score.population, 'not_documented');
    assert.equal(score.sampleSize, null);
    assert.equal(formatAdmissionScore(score), label);
  }
});

test('neznámé a neplatné skóre není nula, jiná jednotka není znovu převedena', () => {
  for (const source of [undefined, null, '', '72.2', NaN, Infinity, -1, 101, make(72.2)]) {
    assert.equal(make(source).value, null);
    assert.equal(make(source).quality, 'unavailable');
    assert.equal(formatAdmissionScore(make(source)), 'Údaj není k dispozici');
  }
  assert.throws(() => historicalSubjectAverage({ ...make(72.2), field: 'cj_prumer' }), /procentní škála/);
  assert.throws(() => formatAdmissionScore({ ...make(72.2), unit: 'jpz_total_0_100' }), /jednotka/);
});
