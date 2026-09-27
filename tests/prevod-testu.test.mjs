// Převedený výsledek testu (slovník ukazatelů): tabulky a výpočet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prevedBody, median } from '../src/lib/prevod-testu-vypocet.ts';

const DATA = JSON.parse(readFileSync(new URL('../public/prevod_testu_2024.json', import.meta.url), 'utf8'));

test('tabulky jsou úplné a neklesají', () => {
  for (const t of DATA.terminy) {
    assert.equal(t.celkem.body_cil.length, 101, t.nazev);
    assert.equal(t.cj.body_cil.length, 51);
    for (let i = 1; i < 101; i++) assert.ok(t.celkem.body_cil[i] >= t.celkem.body_cil[i - 1], `${t.nazev} ${i}`);
  }
});

test('náhradní termíny jsou označené jako méně spolehlivé, řádné ne', () => {
  for (const t of DATA.terminy) assert.equal(t.spolehlive, t.radny, t.nazev);
});

test('převod interpoluje mezi celými body a drží se v rozsahu', () => {
  const tab = [0, 10, 20];
  assert.equal(prevedBody(tab, 1), 10);
  assert.equal(prevedBody(tab, 1.5), 15);
  assert.equal(prevedBody(tab, 5), 20);
  assert.equal(prevedBody(tab, -1), 0);
});

test('prostřední hodnota více testů', () => {
  assert.equal(median([]), null);
  assert.equal(median([74, 72]), 73);
  assert.equal(median([70, 90, 72]), 72);
});
