import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesSearchLocation, splitByCommute } from '../src/lib/simulator-filter.ts';

test('dojezd zachová hranice, neznámá data i pořadí podle času', () => {
  const schools = [55, 56, 45, 46, 0, null, undefined].map((minutes, i) => ({ id: String(i), minutes }));
  const result = splitByCommute(schools, 45, s => s.minutes ?? undefined, s => s.minutes !== null);
  assert.deepEqual(result.within.map(s => s.minutes), [0, 45]);
  assert.deepEqual(result.near.map(s => s.minutes), [46, 55]);
  assert.deepEqual(result.unknown.map(s => s.minutes), [null]);
  // Známé místo bez nalezené cesty není falešný nulový dojezd ani near miss.
  assert.equal(result.within.some(s => s.minutes === undefined), false);
});
test('rozšíření limitu přesune nadlimitní obor, nikoli ostatní nevyhovující obory', () => {
  const relevant = [{ id: 'IT', minutes: 52 }];
  assert.equal(splitByCommute(relevant, 45, s => s.minutes, () => true).near.length, 1);
  assert.equal(splitByCommute(relevant, 52, s => s.minutes, () => true).within.length, 1);
});

test('aktivní dojezd neztratí školu za hranicí obce ani kraje; vypnutí obnoví územní filtr', () => {
 const school = { obec: 'Kladno', kraj: 'Středočeský kraj' };
 const scope = { city: 'Praha', region: 'Hlavní město Praha', commute: true };
 assert.equal(matchesSearchLocation(school, scope), true);
 assert.equal(matchesSearchLocation(school, {...scope, commute:false}), false);
 assert.equal(matchesSearchLocation(school, {city:'Kladno',region:'',commute:false}), true);
 assert.equal(matchesSearchLocation(school, {city:'',region:'',commute:false}), true);
});
