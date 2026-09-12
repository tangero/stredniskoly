import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSchool, analyzeCombination } from '../src/lib/chances.ts';
import { subjectScore, unavailableAdmissionScores } from '../src/lib/historical-scores.ts';
import { MAX_SELECTION, readScore, readSelection, readSchoolIds, sharedSimulatorParams } from '../src/lib/simulator-state.ts';

const school = {
  id: '600001431_79-41-K/41', kapacita_2026: 30, prihlasky_2026: 150,
  prihlasky_priority_2026: [60, 50, 40], index_poptavky_2026: 5,
  kapacita_2025: 30, prihlasky_2025: 100, prijati_2025: 30,
  index_poptavky_2025: 3.33, min_body_2025: 80,
  prihlasky_2024: 100, prijati_2024: 0,
};

test('veřejná analýza vrací historii bez odhadu přijetí či rizika kombinace', () => {
  for (const applications of [0, 1, 30, 100, 1000]) {
    const result = analyzeSchool({ ...school, prihlasky_2026: applications });
    assert.deepEqual(Object.keys(result).sort(), ['school', 'demandLevel', 'demandLabel', 'demandColor',
      'trendDirection', 'trendPct', 'trendLabel', 'acceptRate2025', 'acceptRate2024', 'p1Applicants2026', 'p1Ratio'].sort());
    assert.equal(result.acceptRate2025, 30);
    assert.equal(result.acceptRate2024, 0);
  }
  for (const count of [0, 1, 3]) {
    const result = analyzeCombination(Array(count).fill(school));
    assert.deepEqual(Object.keys(result), ['results']);
    assert.equal(result.results.length, count);
  }
});

test('chybějící jmenovatel není nulová historická úspěšnost', () => {
  assert.equal(analyzeSchool({ ...school, prihlasky_2025: 0 }).acceptRate2025, null);
  assert.equal(analyzeSchool({ ...school, prijati_2025: NaN }).acceptRate2025, null);
  assert.equal(analyzeSchool({ ...school, prijati_2025: 101 }).acceptRate2025, null);
  assert.equal(analyzeSchool({ ...school, prijati_2025: 0 }).acceptRate2025, 0);
});

test('převod známé škály nezaměňuje nulu, chybějící hodnotu a jinou škálu', () => {
  assert.equal(subjectScore(0), 0);
  assert.equal(subjectScore(63.2), 31.6);
  assert.equal(subjectScore(100), 50);
  for (const input of [undefined, null, '', '50', -1, 101, Infinity, NaN]) assert.equal(subjectScore(input), null);
  for (const result of Object.values(unavailableAdmissionScores())) assert.equal(result, null);
});

test('platné cvičné skóre 0–50, neplatná URL nevytváří falešné body', () => {
  for (const input of [null, '', 'NaN', 'Infinity', '-1', '51', '35x']) assert.equal(readScore(input), null);
  assert.equal(readScore('0'), 0);
  assert.equal(readScore('50'), 50);
  assert.equal(readScore('25.5'), 25.5);
});

test('staré odkazy a nový formát zachovají pořadí i čárku uvnitř identity', () => {
  assert.deepEqual(readSelection('a,b,a'), ['a', 'b']);
  const ids = ['600000000_79-41-K/41_jazyky, vědy', '600000000_79-41-K/41_hudební'];
  const params = new URLSearchParams({ skoly: JSON.stringify(ids), cj: '0', ma: '50', srovnani: '1', token: 'never-share', search: 'private-query' });
  const shared = sharedSimulatorParams(params);
  assert.deepEqual(readSelection(new URLSearchParams(shared.toString()).get('skoly')), ids);
  assert.deepEqual([...shared.keys()], ['cj', 'ma', 'skoly', 'srovnani']);
  assert.equal(shared.get('cj'), '0');
  assert.equal(sharedSimulatorParams(new URLSearchParams('cj=invalid&ma=55')).size, 0);
  assert.deepEqual(readSchoolIds('[broken'), []);
  assert.deepEqual(readSchoolIds('[1,null,"a","a"]'), ['a']);
  // Uložený výběr unese desítky kandidátů; ořezání je pojistka proti poškozenému vstupu.
  assert.equal(readSelection(JSON.stringify(Array.from({ length: 50 }, (_, i) => String(i)))).length, 50);
  assert.equal(readSelection(JSON.stringify(Array.from({ length: MAX_SELECTION + 10 }, (_, i) => String(i)))).length, MAX_SELECTION);
  assert.deepEqual(readSelection(null), []);
});
