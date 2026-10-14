import test from 'node:test';
import assert from 'node:assert/strict';
import { souhrnVln, filtrZAdresy, filtrujOslovene } from '../src/lib/portal-oslovene.ts';

// Oslovené školy portálu v administraci (#488, K2 a K3). Smyšlená data.

const skola = (redizo, nazev, vlna) => ({ redizo, nazev, mesto: 'Město', typ: 'gymnázium', pozvanka_odeslana: '2026-09-22', vlna });
const stav = (o) => ({ redizo: '', spravce: null, spravce_email: null, spravce_od: null, editori: 0, posledni_prihlaseni: null, navrhy: 0, posledni_navrh: null, posledni_udalost: null, ...o });

const SKOLY = [
  { skola: skola('1', 'Bětina škola', 1), stav: stav({ spravce: 'Správce A', navrhy: 2, posledni_prihlaseni: '2026-10-01T10:00:00Z' }) },
  { skola: skola('2', 'Adamova škola', 1), stav: null },
  { skola: skola('3', 'Cyrilova škola', 2), stav: stav({ spravce: 'Správce B', posledni_prihlaseni: '2026-10-10T10:00:00Z' }) },
  { skola: skola('4', 'Čeňkova škola', 3), stav: stav({ navrhy: 0 }) },
  { skola: { ...skola('5', 'Davidova škola'), vlna: undefined }, stav: null },
];

test('souhrn po vlnách: počty, škola bez čísla vlny patří do pilotu', () => {
  const { vlny, celkem } = souhrnVln(SKOLY);
  assert.deepEqual(vlny, [
    { vlna: 1, osloveno: 3, seSpravcem: 1, sNavrhem: 1 },
    { vlna: 2, osloveno: 1, seSpravcem: 1, sNavrhem: 0 },
    { vlna: 3, osloveno: 1, seSpravcem: 0, sNavrhem: 0 },
  ]);
  assert.deepEqual(celkem, { vlna: 0, osloveno: 5, seSpravcem: 2, sNavrhem: 1 });
});

test('filtr z adresy: neplatné hodnoty se ignorují', () => {
  assert.deepEqual(filtrZAdresy({}), { jenSeSpravcem: false, vlna: null });
  assert.deepEqual(filtrZAdresy({ spravce: '1', vlna: '2' }), { jenSeSpravcem: true, vlna: 2 });
  assert.deepEqual(filtrZAdresy({ spravce: 'ano', vlna: 'x' }), { jenSeSpravcem: false, vlna: null });
  assert.deepEqual(filtrZAdresy({ vlna: '0' }), { jenSeSpravcem: false, vlna: null });
});

test('filtr a řazení: správci a nedávné přihlášení nahoře, zbytek podle abecedy', () => {
  const vse = filtrujOslovene(SKOLY, { jenSeSpravcem: false, vlna: null }).map((p) => p.skola.redizo);
  assert.deepEqual(vse, ['3', '1', '2', '4', '5']);
  assert.deepEqual(filtrujOslovene(SKOLY, { jenSeSpravcem: true, vlna: null }).map((p) => p.skola.redizo), ['3', '1']);
  assert.deepEqual(filtrujOslovene(SKOLY, { jenSeSpravcem: false, vlna: 1 }).map((p) => p.skola.redizo), ['1', '2', '5']);
  assert.deepEqual(filtrujOslovene(SKOLY, { jenSeSpravcem: true, vlna: 3 }), []);
});
