import test from 'node:test';
import assert from 'node:assert/strict';
import { druhZrizovatele, matchesSearchLocation, matchesZrizovatel, splitByCommute, zrizovatelPodleRedizo } from '../src/lib/simulator-filter.ts';

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

test('aktivní dojezd neztratí školu za hranicí kraje; město se s dojezdem kombinuje; vypnutí obnoví územní filtr', () => {
 const school = { obec: 'Kladno', kraj: 'Středočeský kraj' };
 const scope = { city: '', region: 'Hlavní město Praha', commute: true };
 assert.equal(matchesSearchLocation(school, scope), true);
 assert.equal(matchesSearchLocation(school, {...scope, city:'Praha'}), false);
 assert.equal(matchesSearchLocation(school, {...scope, city:'Kladno'}), true);
 assert.equal(matchesSearchLocation(school, {...scope, city:'Praha', commute:false}), false);
 assert.equal(matchesSearchLocation(school, {city:'Kladno',region:'',commute:false}), true);
 assert.equal(matchesSearchLocation(school, {city:'',region:'',commute:false}), true);
});

test('zřizovatel: bez výběru projde vše, výběry se kombinují, neznámý zřizovatel neprojde', () => {
  const verejna = { zrizovatel: 'veřejné / státní' };
  const soukroma = { zrizovatel: 'soukromé' };
  const cirkevni = { zrizovatel: 'církevní' };
  const neznama = { zrizovatel: null };
  assert.equal(druhZrizovatele(verejna.zrizovatel), 'verejna');
  assert.equal(druhZrizovatele(soukroma.zrizovatel), 'soukroma');
  assert.equal(druhZrizovatele(cirkevni.zrizovatel), 'cirkevni');
  assert.equal(druhZrizovatele(undefined), null);
  assert.equal(druhZrizovatele(''), null);

  for (const s of [verejna, soukroma, cirkevni, neznama]) assert.equal(matchesZrizovatel(s, []), true);
  assert.deepEqual([verejna, soukroma, cirkevni, neznama].map(s => matchesZrizovatel(s, ['verejna'])), [true, false, false, false]);
  assert.deepEqual([verejna, soukroma, cirkevni, neznama].map(s => matchesZrizovatel(s, ['soukroma', 'cirkevni'])), [false, true, true, false]);
  assert.equal(matchesZrizovatel({}, ['verejna', 'soukroma', 'cirkevni']), false);
});

test('zřizovatel: všechny hodnoty katalogu mají druh, kromě chybějících', async () => {
  const { readFile } = await import('node:fs/promises');
  const katalog = JSON.parse(await readFile(new URL('../public/schools_data.json', import.meta.url), 'utf8'));
  const nerozpoznane = new Set();
  for (const rok of Object.keys(katalog)) for (const s of katalog[rok]) {
    if (s.zrizovatel && druhZrizovatele(s.zrizovatel) === null) nerozpoznane.add(s.zrizovatel);
  }
  assert.deepEqual([...nerozpoznane], []);
});

test('zřizovatel podle RED IZO: nejnovější ročník vyhrává, ostatní klíče se ignorují', () => {
  const mapa = zrizovatelPodleRedizo({
    _meta: [{ redizo: '1', zrizovatel: 'soukromé' }],
    2024: [{ redizo: '1', zrizovatel: 'veřejné / státní' }, { id: '2_79-41-K/41', zrizovatel: 'církevní' }],
    2025: [{ redizo: '1', zrizovatel: 'soukromé' }, { redizo: '3', zrizovatel: null }],
  });
  assert.equal(mapa.get('1'), 'soukromé');
  assert.equal(mapa.get('2'), 'církevní');
  assert.equal(mapa.has('3'), false);
});
