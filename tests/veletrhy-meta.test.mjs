// Sezónní titulek a popisek /veletrhy (#483): měsíce, kraje a počet z dat, bez akcí obecné znění.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metaVeletrhu, TITULEK_VELETRHU, POPISEK_VELETRHU } from '../src/lib/veletrhy-pocty.ts';

const akce = (start, end, krajKod) => ({ start, end, krajKod });

test('sezóna přes přelom roku: měsíce, ročník a počet krajů z dat', () => {
  const m = metaVeletrhu([
    akce('2026-10-05', '2026-10-06', 'CZ020'),
    akce('2026-11-12', '2026-11-12', 'CZ010'),
    akce('2027-01-20', '2027-01-20', 'CZ020'),
  ]);
  assert.equal(m.title, 'Veletrhy středních škol po krajích: říjen–leden 2026/27');
  assert.ok(m.title.length <= 60);
  assert.match(m.description, /3 akce ve 2 krajích \(říjen–leden\)/);
  assert.ok(m.description.length <= 160);
});

test('předložka „ve“ před počty čtenými dvě/tři/čtyři…, jinak „v“', () => {
  const kraje = (n) =>
    metaVeletrhu(Array.from({ length: n }, (_, i) => akce('2026-11-12', '2026-11-12', `K${i}`))).description;
  for (const n of [2, 3, 4, 12, 13, 14]) assert.match(kraje(n), new RegExp(`ve ${n} krajích`));
  for (const n of [5, 7, 11]) assert.match(kraje(n), new RegExp(`akcí v ${n} krajích`));
  assert.match(kraje(1), /akce v 1 kraji/);
});

test('jediný měsíc a jedna akce', () => {
  const m = metaVeletrhu([akce('2026-11-12', '2026-11-12', 'CZ010')]);
  assert.equal(m.title, 'Veletrhy středních škol po krajích: listopad 2026');
  assert.match(m.description, /^1 akce v 1 kraji \(listopad\)/);
});

test('bez nadcházejících akcí zůstane obecné znění bez měsíců', () => {
  const m = metaVeletrhu([]);
  assert.equal(m.title, TITULEK_VELETRHU);
  assert.equal(m.description, POPISEK_VELETRHU);
  assert.doesNotMatch(m.title + m.description, /20\d\d/);
});
