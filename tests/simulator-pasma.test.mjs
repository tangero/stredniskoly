// Kompaktní index pásem pro Simulátor přijímaček (docs/navrh-simulator-prijimacek-2027.md, oddíl 8):
// shoda s pásmy přijetí, se štítkem extra body ze stránky oboru a velikost.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extraBody } from '../src/lib/extra-body.ts';
import { druhTestu } from '../src/lib/prevod-testu-vypocet.ts';

const nacti = (s) => JSON.parse(readFileSync(new URL(`../public/${s}`, import.meta.url), 'utf8'));
const registr = nacti('stav_datovych_sad.json');
const rok = registr.sady['cermat-uchazeci-kolo1'].zobrazeno.obdobi;
const rokKriterii = registr.sady['dipsy-kriteria'].zobrazeno.obdobi;
const index = nacti(`simulator_pasma_${rok}.json`);
const pasma = nacti(`pasma_prijeti_${rok}.json`);
const kriteria = nacti(`kriteria_prijeti_${rokKriterii}.json`);
const sl = Object.fromEntries(index.sloupce.map((n, i) => [n, i]));

test('index je z roku pásem podle registru a má každý obor pásem', () => {
  assert.equal(String(index.rok), String(rok));
  assert.deepEqual(Object.keys(index.data).sort(), Object.keys(pasma.data).sort());
});

test('počty a meze sedí s pásmy přijetí', () => {
  for (const [k, r] of Object.entries(index.data)) {
    const p = pasma.data[k];
    assert.equal(r[sl.min_prijaty], p.min_prijaty, k);
    assert.equal(r[sl.soutezicich], p.soutezicich, k);
    assert.equal(r[sl.prijatych], p.prijatych, k);
    assert.equal(r[sl.neveslo_se], p.neveslo_se, k);
    assert.equal(r[sl.dolni_mez], p.pasmo_nejistoty?.[0] ?? null, k);
    assert.equal(r[sl.horni_mez], p.pasmo_nejistoty?.[1] ?? null, k);
    assert.equal(r[sl.v_pasmu_soutezilo], p.pasmo_nejistoty ? p.pasmo_nejistoty_soutezilo : null, k);
    assert.equal(r[sl.nikdo_neodmitnut], p.nikdo_neodmitnut_pro_kapacitu ? 1 : 0, k);
    assert.equal(r[sl.talentova], p.talentova_zkouska ? 1 : 0, k);
    assert.equal(String(r[sl.druh]), druhTestu(k.split('_')[1]), k);
  }
});

test('obory, kde nikoho neodmítli, nemají horní mez', () => {
  for (const r of Object.values(index.data)) if (r[sl.nikdo_neodmitnut]) assert.equal(r[sl.horni_mez], null);
});

test('štítek extra body je stejný jako na stránce oboru; bez přepisu chybí, není nula', () => {
  for (const [k, r] of Object.entries(index.data)) {
    const prepisy = kriteria.data[k]?.prepisy ?? [];
    const cekam = prepisy.length === 0 ? null : (prepisy.some(extraBody) ? 1 : 0);
    assert.equal(r[sl.extra_body], cekam, k);
  }
});

test('obec je platný odkaz do seznamu obcí', () => {
  for (const r of Object.values(index.data)) {
    const o = r[sl.obec];
    if (o !== null) assert.ok(Number.isInteger(o) && o >= 0 && o < index.obce.length);
  }
});

test('index je pod 200 kB (oddíl 10 návrhu)', () => {
  const b = readFileSync(new URL(`../public/simulator_pasma_${rok}.json`, import.meta.url)).length;
  assert.ok(b < 200_000, `${b} B`);
});
