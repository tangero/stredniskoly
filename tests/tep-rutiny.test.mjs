import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mamHlasit, zprava } from '../scripts/provoz/tep-rutiny.mjs';

const H = 60 * 60 * 1000;
const TEP = '2026-10-08T00:02:00Z';
const po = (h) => Date.parse(TEP) + h * H;

test('výpadek se hlásí v první hodině po 12 h ticha a pak jednou denně', () => {
  assert.equal(mamHlasit(TEP, po(3)), false);
  assert.equal(mamHlasit(TEP, po(11.9)), false);
  assert.equal(mamHlasit(TEP, po(12)), true);
  assert.equal(mamHlasit(TEP, po(12.5)), true);
  assert.equal(mamHlasit(TEP, po(13)), false);
  assert.equal(mamHlasit(TEP, po(20)), false);
  assert.equal(mamHlasit(TEP, po(36.2)), true);
  assert.equal(mamHlasit(TEP, po(37.5)), false);
});

test('bez jediného tepu se nehlásí (rutina ho ještě neposílá)', () => {
  assert.equal(mamHlasit(null, po(100)), false);
});

test('zpráva říká, jak dlouho je ticho a kde hledat', () => {
  const z = zprava(TEP, po(12.5), { repo: 'tangero/stredniskoly' });
  assert.match(z, /12 hodin neozvala/);
  assert.match(z, /2026-10-08 00:02 UTC/);
  assert.match(z, /actions\/workflows\/tep-rutiny\.yml/);
});
