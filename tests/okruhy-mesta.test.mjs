import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

// Okruhy na stránce města (#277, etapa 2c): výběr okruhů z podkladu a vykreslení oddílu.
const require = createRequire(import.meta.url);
function load(relative) {
  const filename = path.resolve(relative);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  }});
  const modul = { exports: {} };
  new Function('require', 'module', 'exports', outputText)((s) => (s.startsWith('@/') ? {} : require(s)), modul, modul.exports);
  return modul.exports;
}
const { vyberOkruhu, popisOboruOkruhu, uliceZAdresy } = load('src/lib/okruhy-oboru.ts');

const obor = (klic, uchazecu) => ({ klic, obec: 'Brno', uchazecu, ukotven: true });
const okruh = (id, uchazecu, obory, presun) => ({ id, uchazecu, obory, presun_zajmu_v_okruhu: presun });

test('město pod prahem (zobrazit false) nebo bez záznamu okruhy nemá', () => {
  assert.equal(vyberOkruhu(2026, undefined), null);
  assert.equal(vyberOkruhu(2026, { zobrazit: false, okruhy: [okruh(1, 100, [obor('1_a', 50), obor('2_b', 50)])] }), null);
});

test('okruh jedné školy se nezobrazí, ostatní se řadí podle uchazečů', () => {
  const v = vyberOkruhu(2026, { zobrazit: true, okruhy: [
    okruh(1, 100, [obor('1_a', 40), obor('1_b', 60)]),
    okruh(2, 200, [obor('1_a', 40), obor('2_b', 60), obor('3_c', 90)]),
    okruh(3, 300, [obor('4_a', 100), obor('5_b', 200)]),
  ] });
  assert.deepEqual(v.okruhy.map((o) => o.id), [3, 2]);
  assert.deepEqual(v.okruhy[1].obory.map((o) => o.klic), ['3_c', '2_b', '1_a']);
});

test('neukotvený obor z jiné obce se nezobrazí a okruh pak může odpadnout', () => {
  const cizi = { klic: '9_z', obec: 'Brandýs', uchazecu: 500, ukotven: false };
  const v = vyberOkruhu(2026, { zobrazit: true, okruhy: [
    okruh(1, 100, [obor('1_a', 40), cizi]),
    okruh(2, 200, [obor('1_a', 40), obor('2_b', 60), cizi]),
  ] });
  assert.deepEqual(v.okruhy.map((o) => o.id), [2]);
  assert.deepEqual(v.okruhy[0].obory.map((o) => o.klic), ['2_b', '1_a']);
});

test('věta o přesunu jen nad šumem', () => {
  const o = (nad) => vyberOkruhu(2026, { zobrazit: true, okruhy: [
    okruh(1, 100, [obor('1_a', 40), obor('2_b', 60)], { roky: [2025, 2026], nad_sumem: nad }),
  ] }).okruhy[0];
  assert.equal(o(true).presunNadSumem, true);
  assert.deepEqual(o(true).rokPresunu, [2025, 2026]);
  assert.equal(o(false).presunNadSumem, false);
});

test('řádek okruhu: název školy s ulicí z katalogu, ne holé „Gymnázium“ z rejstříku', () => {
  const z = (nazevDisplay, zamereni, delka = 4) => ({ nazevDisplay, obor: 'Gymnázium', zamereni, delka });
  const katalog = new Map([
    ['1_79-41-K/41', [z('Gymnázium, Křenová', '')]],
    ['2_79-41-K/41', [z('Gymnázium, Slovanské náměstí', 'všeobecné'), z('Gymnázium, Slovanské náměstí', 'rozšířená výuka angličtiny')]],
    ['3_79-41-K/41', [z('Gymnázium, Elgartova', 'všeobecné')]],
  ]);
  const skoly = new Map([['1', 'Gymnázium, Křenová'], ['2', 'Gymnázium, Slovanské náměstí'], ['3', 'Gymnázium, Elgartova'], ['4', 'SŠ, Olomoucká']]);
  const rej = { skola: 'Gymnázium', adresa: 'Křenová 304/36, 602 00 Brno', obor: 'Gymnázium' };
  assert.deepEqual(popisOboruOkruhu('1_79-41-K/41', katalog, skoly, rej), { skola: 'Gymnázium, Křenová', obor: 'Gymnázium', doplnek: '4leté' });
  assert.deepEqual(popisOboruOkruhu('2_79-41-K/41', katalog, skoly, rej), { skola: 'Gymnázium, Slovanské náměstí', obor: 'Gymnázium', doplnek: '4leté, 2 zaměření' });
  assert.deepEqual(popisOboruOkruhu('3_79-41-K/41', katalog, skoly, rej), { skola: 'Gymnázium, Elgartova', obor: 'Gymnázium', doplnek: '4leté, všeobecné' });
  // Učební obor mimo katalog: název školy z jiného oboru téže školy v katalogu, obor z rejstříku.
  assert.deepEqual(popisOboruOkruhu('4_26-52-H/01', katalog, skoly, { skola: 'SŠ', obor: 'Elektromechanik' }), { skola: 'SŠ, Olomoucká', obor: 'Elektromechanik', doplnek: null });
  // Škola mimo katalog: zkrácený název z rejstříku a ulice z adresy sídla.
  assert.deepEqual(popisOboruOkruhu('9_79-41-K/41', katalog, skoly, rej), { skola: 'Gymnázium, Křenová', obor: 'Gymnázium', doplnek: null });
  assert.equal(popisOboruOkruhu('9_x', katalog, skoly, {}), null);
});

test('ulice z adresy rejstříku', () => {
  assert.equal(uliceZAdresy('Koněvova 100, 417 42 Krupka – Bohosudov'), 'Koněvova');
  assert.equal(uliceZAdresy('třída Kpt. Jaroše 1829/14, 658 70 Brno'), 'třída Kpt. Jaroše');
  assert.equal(uliceZAdresy('17. listopadu 1126/43, 708 00 Ostrava'), '17. listopadu');
  assert.equal(uliceZAdresy('č. p. 12, 549 01 Nové Město'), null);
  assert.equal(uliceZAdresy('128, 549 01 Nové Město'), null);
  assert.equal(uliceZAdresy(undefined), null);
});

