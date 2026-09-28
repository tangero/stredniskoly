// Převedený výsledek testu (slovník ukazatelů): tabulky a výpočet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prevedBody, median, druhTestu } from '../src/lib/prevod-testu-vypocet.ts';

const DATA = JSON.parse(readFileSync(new URL('../public/prevod_testu_2024.json', import.meta.url), 'utf8'));

const TERMINY = Object.values(DATA.druhy).flatMap((d) => d.terminy);

test('převod má všechny tři druhy testů (čtyřleté, šestiletá a osmiletá gymnázia)', () => {
  assert.deepEqual(Object.keys(DATA.druhy).sort(), ['4', '6', '8']);
});

test('tabulky jsou úplné a neklesají', () => {
  for (const t of TERMINY) {
    assert.equal(t.celkem.body_cil.length, 101, t.nazev);
    assert.equal(t.cj.body_cil.length, 51);
    for (let i = 1; i < 101; i++) assert.ok(t.celkem.body_cil[i] >= t.celkem.body_cil[i - 1], `${t.nazev} ${i}`);
  }
});

test('náhradní termíny jsou označené jako méně spolehlivé, řádné ne', () => {
  for (const t of TERMINY) assert.equal(t.spolehlive, t.radny, t.nazev);
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

import { poradiMeziSoutezicimi } from '../src/lib/prevod-testu-vypocet.ts';

test('pořadí mezi soutěžícími počítá vyšší a stejné výsledky', () => {
  const p = poradiMeziSoutezicimi({ '60': 2, '72.5': 3, '80': 1 }, 72.5);
  assert.deepEqual(p, { celkem: 6, vyssi: 1, stejny: 3 });
});

test('rozdělení soutěžících sedí na počty v pásmech (uchazeč s více zaměřeními jednou)', () => {
  const rok = JSON.parse(readFileSync(new URL('../public/stav_datovych_sad.json', import.meta.url), 'utf8')).sady['cermat-uchazeci-kolo1'].zobrazeno.obdobi;
  const poz = JSON.parse(readFileSync(new URL(`../public/pozice_soutezicich_${rok}.json`, import.meta.url), 'utf8')).data;
  const pas = JSON.parse(readFileSync(new URL(`../public/pasma_prijeti_${rok}.json`, import.meta.url), 'utf8')).data;
  for (const [k, v] of Object.entries(poz)) {
    if (pas[k]) assert.equal(Object.values(v).reduce((a, b) => a + b, 0), pas[k].soutezicich, k);
  }
});

test('kritéria: podíl přijímaček je 100 jen u režimu „jen přijímačky“ a nikdy nepřesáhne 100', () => {
  const k = JSON.parse(readFileSync(new URL('../public/kriteria_prijeti_2026.json', import.meta.url), 'utf8')).data;
  for (const o of Object.values(k)) for (const p of o.prepisy) {
    if (p.rezim === 'pouze_jpz') assert.equal(p.podil_jpz_pct, 100);
    if (p.podil_jpz_pct !== null) assert.ok(p.podil_jpz_pct > 0 && p.podil_jpz_pct <= 100, p.source_id);
  }
});

test('druh testu podle kódu oboru', () => {
  assert.equal(druhTestu('79-41-K/81'), '8');
  assert.equal(druhTestu('79-41-K/61'), '6');
  assert.equal(druhTestu('79-41-K/41'), '4');
  assert.equal(druhTestu('64-41-L/51'), '4');
});
