import assert from 'node:assert/strict';
import test from 'node:test';
import { indexKlicuRocniku, klicZdrojeProStranku, normalizeSchoolKey, uniqueSchoolIndex } from '../src/lib/school-key.ts';

test('normalizuje diakritiku a oddělovače při zachování oboru', () => {
  assert.equal(normalizeSchoolKey('123_79-41-K/41_IT & Sítě'), '123_79-41-K/41_it_site');
  assert.notEqual(normalizeSchoolKey('123_79-41-K/41'), normalizeSchoolKey('123_79-41-K/41_jazykove'));
});

test('nepřiřadí první záznam při kolizi historických ID', () => {
  const index = uniqueSchoolIndex([{id: '123_X_ČJ'}, {id: '123_X_cj'}, {id: '456_X'}], r => r.id);
  assert.equal(index.size, 1);
  assert.equal(index.get('456_X').id, '456_X');
});

test('index klíčů ročníku vede ze stránky na letošní nabídku a kolizi vynechá', () => {
  const index = indexKlicuRocniku({
    '1_A_Kuchař': { katalog_id: '1_A_Gastronomie - kuchař' },
    '2_B_x': { katalog_id: '2_B_spolecny' },
    '2_B_y': { katalog_id: '2_B_spolecny' },
  });
  assert.equal(index.get(normalizeSchoolKey('1_A_Gastronomie___kuchař')), '1_A_kuchar');
  assert.equal(index.has('2_B_spolecny'), false);
  assert.equal(index.size, 1);
});

test('index klíčů ročníku přeskočí prázdný záznam mapy', () => {
  assert.equal(indexKlicuRocniku({ '1_A_x': null, '1_A_y': {} }).size, 0);
});

test('klíč souhrnu: přednost má letošní nabídka z mapy, pak vlastní klíč stránky', () => {
  // Zdroj nese letošní záznam pod klíčem CERMAT a loňský pod starým klíčem.
  const zdroj = { '1_A_kuchar': { 2026: {} }, '1_A_gastronomie_kuchar': { 2025: {} }, '2_B': { 2026: {} } };
  const indexZdroje = new Map(Object.keys(zdroj).map(k => [normalizeSchoolKey(k), k]));
  const indexRocniku = indexKlicuRocniku({ '1_A_Kuchař': { katalog_id: '1_A_Gastronomie - kuchař' } });
  const ma2026 = k => zdroj[k][2026] !== undefined;
  assert.equal(klicZdrojeProStranku('1_A_Gastronomie___kuchař', indexRocniku, indexZdroje, ma2026), '1_A_kuchar');
  // Bez mapy by stránka našla jen loňský záznam, a ten zobrazený ročník nemá.
  assert.equal(klicZdrojeProStranku('1_A_Gastronomie___kuchař', new Map(), indexZdroje, ma2026), undefined);
  // Stránka mimo mapu hledá vlastním klíčem jako dřív.
  assert.equal(klicZdrojeProStranku('2_B', indexRocniku, indexZdroje, ma2026), '2_B');
  // Mapa nepřebije vlastní klíč, když letošní záznam pod mapovaným klíčem ve zdroji chybí.
  const bezLetosniho = new Map([[normalizeSchoolKey('1_A_gastronomie_kuchar'), '1_A_gastronomie_kuchar']]);
  assert.equal(klicZdrojeProStranku('1_A_Gastronomie___kuchař', indexRocniku, bezLetosniho, k => zdroj[k][2025] !== undefined), '1_A_gastronomie_kuchar');
});
