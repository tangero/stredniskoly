import test from 'node:test';
import assert from 'node:assert/strict';
import { novejsiInspekce } from '../src/lib/inspekce-aktualnost.ts';

const insp = (dateFrom, reportUrl = `https://example.cz/${dateFrom}`) => ({ dateFrom: `${dateFrom}T00:00:00.0000000`, dateTo: '', reportUrl, portalUrl: '' });
const seznam = (...inspections) => ({ redizo: '600000001', jmeno: 'Škola', inspections, inspectionCount: inspections.length, lastInspectionDate: null });

test('novější inspekce než shrnutá se ohlásí s datem a odkazem na zprávu (#259)', () => {
  // Pořadí v seznamu nerozhoduje; shrnutí je z inspekce 2021, ČŠI eviduje i lednovou 2026.
  assert.deepEqual(novejsiInspekce(seznam(insp('2021-11-23'), insp('2026-01-19')), '2021-11-23'),
    { datum: '2026-01-19', reportUrl: 'https://example.cz/2026-01-19' });
});

test('shrnutí nejnovější inspekce: žádné upozornění', () => {
  assert.equal(novejsiInspekce(seznam(insp('2026-01-19'), insp('2021-11-23')), '2026-01-19'), null);
});

test('bez seznamu, bez shrnutí nebo bez inspekcí: žádné upozornění', () => {
  assert.equal(novejsiInspekce(null, '2021-11-23'), null);
  assert.equal(novejsiInspekce(seznam(insp('2026-01-19')), null), null);
  assert.equal(novejsiInspekce(seznam(), '2021-11-23'), null);
});

test('zpráva bez odkazu: datum ano, odkaz null', () => {
  assert.deepEqual(novejsiInspekce(seznam(insp('2026-01-19', '')), '2021-11-23'), { datum: '2026-01-19', reportUrl: null });
});

test('okrajové vstupy: prázdné dateFrom, shrnutí novější než seznam, týž den s jiným časem', () => {
  const prazdne = { dateFrom: '', dateTo: '', reportUrl: 'x', portalUrl: '' };
  assert.equal(novejsiInspekce(seznam(prazdne), '2021-11-23'), null);
  assert.deepEqual(novejsiInspekce(seznam(prazdne, insp('2026-01-19')), '2021-11-23')?.datum, '2026-01-19');
  assert.equal(novejsiInspekce(seznam(insp('2021-11-23')), '2026-01-19'), null);
  const tyzDen = { ...insp('2026-01-19'), dateFrom: '2026-01-19T23:59:59.9966667' };
  assert.equal(novejsiInspekce(seznam(tyzDen), '2026-01-19T00:00:00'), null);
});
