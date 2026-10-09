import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mamHlasit, zprava, ctiStav, ZNACKA_TEPU, ZNACKA_KONTROLY } from '../scripts/provoz/tep-rutiny.mjs';

const H = 60 * 60 * 1000;
const TEP = '2026-10-08T00:02:00Z';
const po = (h) => new Date(Date.parse(TEP) + h * H).toISOString();
const t = (h) => Date.parse(po(h));

test('výpadek se hlásí po 12 h ticha i při řídkých bězích kontroly, pak jednou za 24 h', () => {
  assert.equal(mamHlasit({ tep: TEP, upozorneno: null }, t(11.9)), false);
  assert.equal(mamHlasit({ tep: TEP, upozorneno: null }, t(12)), true);
  // Kontrola běžela až po 17 h: pořád hlásí (dřívější okno jedné hodiny by to minulo).
  assert.equal(mamHlasit({ tep: TEP, upozorneno: null }, t(17)), true);
  // Po upozornění ve 12 h mlčí, další až za 24 h.
  assert.equal(mamHlasit({ tep: TEP, upozorneno: po(12) }, t(20)), false);
  assert.equal(mamHlasit({ tep: TEP, upozorneno: po(12) }, t(36)), true);
  // Upozornění starší než nový tep se nepočítá.
  assert.equal(mamHlasit({ tep: po(30), upozorneno: po(12) }, t(42)), true);
  assert.equal(mamHlasit({ tep: po(30), upozorneno: po(12) }, t(35)), false);
  assert.equal(mamHlasit({ tep: null, upozorneno: null }, t(100)), false);
});

test('stav z komentářů: tep jen od rutiny (úprava komentáře), upozornění jen od kontroly', () => {
  const s = ctiStav([
    { id: 1, autor: 'tangero', telo: `${ZNACKA_TEPU}\nPoslední běh`, vytvoreno: po(0), upraveno: po(9) },
    { id: 2, autor: 'github-actions[bot]', telo: `${ZNACKA_KONTROLY}\nupozorneno=${po(5)}` },
    { id: 3, autor: 'github-actions[bot]', telo: `${ZNACKA_TEPU} podvržený tep od bota` },
  ]);
  assert.equal(s.tep, po(9));
  assert.equal(s.upozorneno, po(5));
  assert.equal(s.kontrola, 2);
  assert.deepEqual(ctiStav([]), { tep: null, upozorneno: null, kontrola: null });
});

test('zpráva říká, jak dlouho je ticho a kde je tep', () => {
  const z = zprava(TEP, t(12.5), { repo: 'tangero/stredniskoly' });
  assert.match(z, /12 hodin neozvala/);
  assert.match(z, /2026-10-08 00:02 UTC/);
  assert.match(z, /issues\/462/);
});
