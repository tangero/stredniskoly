import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mesicniObdobi,
  denniObdobi,
  konecMesice,
  konecDne,
  smiSePredat,
  obdobiKRezervaci,
  mesicniStrop,
  zbyvaKvota,
  otiskTela,
  otiskClenu,
  klicIdempotence,
  identifikatorZpravy,
  REZERVA_PORTALU,
  DAVKA_MAX,
  OKNO_PRED_KONCEM_MS,
} from '../src/lib/novinky-rozpocet.ts';

test('období se skládají z UTC data', () => {
  const kdy = new Date('2027-01-12T08:30:00Z');
  assert.equal(mesicniObdobi(kdy), 'mesic:2027-01');
  assert.equal(denniObdobi(kdy), 'den:2027-01-12');
});

test('konec měsíce a dne padne na začátek následujícího', () => {
  assert.equal(konecMesice(new Date('2027-01-12T08:30:00Z')).toISOString(), '2027-02-01T00:00:00.000Z');
  assert.equal(konecMesice(new Date('2026-12-31T23:59:00Z')).toISOString(), '2027-01-01T00:00:00.000Z');
  assert.equal(konecDne(new Date('2027-01-12T08:30:00Z')).toISOString(), '2027-01-13T00:00:00.000Z');
});

test('v posledních deseti minutách období se dávka nepředává', () => {
  assert.ok(smiSePredat(new Date('2027-01-12T08:30:00Z'), 'celkem'));
  assert.ok(!smiSePredat(new Date('2027-01-31T23:55:00Z'), 'celkem'));
  assert.ok(smiSePredat(new Date('2027-01-31T23:49:00Z'), 'celkem'));
  assert.ok(!smiSePredat(new Date('2027-01-12T23:52:00Z'), 'potvrzeni'));
  assert.ok(smiSePredat(new Date('2027-01-12T23:52:00Z'), 'celkem'));
  assert.equal(OKNO_PRED_KONCEM_MS, 10 * 60 * 1000);
});

test('obsahová zpráva rezervuje jen měsíční strop', () => {
  const seznam = obdobiKRezervaci(new Date('2027-01-12T08:00:00Z'), 'obsah');
  assert.deepEqual(seznam, [{ obdobi: 'mesic:2027-01', ucel: 'celkem' }]);
});

test('potvrzení rezervuje měsíční strop i denní limit', () => {
  const seznam = obdobiKRezervaci(new Date('2027-01-12T08:00:00Z'), 'potvrzeni');
  assert.deepEqual(seznam, [
    { obdobi: 'mesic:2027-01', ucel: 'celkem' },
    { obdobi: 'den:2027-01-12', ucel: 'potvrzeni' },
  ]);
});

test('na konci období se rezervuje už do následujícího období', () => {
  // Poslední minuty měsíce: strop i denní limit patří novému období.
  const seznam = obdobiKRezervaci(new Date('2027-01-31T23:55:00Z'), 'potvrzeni');
  assert.deepEqual(seznam, [
    { obdobi: 'mesic:2027-02', ucel: 'celkem' },
    { obdobi: 'den:2027-02-01', ucel: 'potvrzeni' },
  ]);
});

test('na konci dne uprostřed měsíce se mění jen denní období', () => {
  const seznam = obdobiKRezervaci(new Date('2027-01-12T23:55:00Z'), 'potvrzeni');
  assert.deepEqual(seznam, [
    { obdobi: 'mesic:2027-01', ucel: 'celkem' },
    { obdobi: 'den:2027-01-13', ucel: 'potvrzeni' },
  ]);
});

test('strop novinek je kvóta bez rezervy portálu', () => {
  assert.equal(REZERVA_PORTALU, 5000);
  assert.equal(mesicniStrop(50000), 45000);
  assert.equal(mesicniStrop(4000), 0);
});

test('zbývající kvóta se počítá ze spotřebované, ne ze zbývající', () => {
  assert.equal(zbyvaKvota(50000, 44900), 100);
  assert.equal(zbyvaKvota(50000, 45000), 0);
  assert.equal(zbyvaKvota(50000, 49000), 0);
});

test('otisk těla se počítá nad textem a je stabilní', () => {
  const telo = '{"from":"a","to":["b"]}';
  assert.equal(otiskTela(telo), otiskTela(telo));
  assert.notEqual(otiskTela(telo), otiskTela(`${telo} `));
  assert.match(otiskTela(telo), /^[0-9a-f]{64}$/);
});

test('otisk složení dávky nezávisí na pořadí položek', () => {
  assert.equal(otiskClenu(['b', 'a']), otiskClenu(['a', 'b']));
  assert.notEqual(otiskClenu(['a']), otiskClenu(['a', 'b']));
});

test('klíč idempotence obsahuje otisk těla, takže jiné tělo dá jiný klíč', () => {
  const zprava = identifikatorZpravy('2027', 'kriteria');
  assert.equal(zprava, 'novinky/2027/kriteria');
  const k1 = klicIdempotence(zprava, otiskTela('telo A'));
  const k2 = klicIdempotence(zprava, otiskTela('telo B'));
  assert.notEqual(k1, k2);
  assert.ok(k1.startsWith('novinky/2027/kriteria/'));
  assert.equal(k1, klicIdempotence(zprava, otiskTela('telo A')));
});

test('identifikátor zprávy nese ročník, takže se mezi roky nesrazí', () => {
  assert.notEqual(identifikatorZpravy('2027', 'kriteria'), identifikatorZpravy('2028', 'kriteria'));
});

test('dávka Resendu má sto adres', () => {
  assert.equal(DAVKA_MAX, 100);
});
