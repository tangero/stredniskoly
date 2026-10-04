import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

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
const { vyberOkruhu } = load('src/lib/okruhy-oboru.ts');
const { OkruhyVeMeste } = load('src/components/OkruhyVeMeste.tsx');

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

test('oddíl: nadpis, tři největší obory v názvu, nástavby zvlášť, přesun jen s příznakem', () => {
  const radek = (k, skola) => ({ klic: k, skola, obor: 'Gymnázium', obec: null, uchazecu: 100, zarazeni: null, bezJednoteZkousky: false });
  const okruhy = [{ id: 1, uchazecu: 400, presun: { od: 2025, do: 2026 }, radky: ['A', 'B', 'C', 'D'].map((s, i) => radek(`${i}_x`, `Škola ${s}`)) }];
  const nastavby = [{ id: 2, uchazecu: 90, presun: null, radky: [radek('7_n', 'Škola N'), radek('8_n', 'Škola M'), radek('9_n', 'Škola O')] }];
  const html = renderToStaticMarkup(React.createElement(OkruhyVeMeste, { okruhy, nastavby, rok: 2026 }));
  assert.match(html, /Které další obory v okolí uchazeči také volí/);
  assert.match(html, /Škola A, Škola B, Škola C a další/);
  assert.match(html, /Kam po výučním listu/);
  assert.equal((html.match(/mezi ročníky 2025 a 2026 přesouvá/g) ?? []).length, 1);
  assert.doesNotMatch(html, /oblíben|žádan|pojistk|shluk/i);
  assert.equal(renderToStaticMarkup(React.createElement(OkruhyVeMeste, { okruhy: [], nastavby: [], rok: 2026 })), '');
});
