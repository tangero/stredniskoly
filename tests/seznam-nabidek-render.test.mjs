import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Vykreslí skutečnou TSX komponentu bez Next serveru, stejně jako u detailu školy.
const require = createRequire(import.meta.url);
function load(relative) {
  const filename = path.resolve(relative);
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  }});
  const modul = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(specifier => {
    if (specifier === 'next/link') return { __esModule: true, default: ({ children }) => children };
    if (!specifier.startsWith('@/')) return require(specifier);
    const target = specifier.replace('@/', 'src/');
    return load(fs.existsSync(`${target}.tsx`) ? `${target}.tsx` : `${target}.ts`);
  }, modul, modul.exports);
  return modul.exports;
}
const { SeznamNabidek } = load('src/components/simulator/SeznamNabidek.tsx');
const { polohaVuciPasmu } = load('src/lib/poloha-vuci-pasmu.ts');

const radky = {
  a: { min_prijaty: 40, dolni_mez: 40, horni_mez: 50, soutezicich: 100, prijatych: 60, neveslo_se: 40, v_pasmu_soutezilo: 30, v_pasmu_prijato: 12, nikdo_neodmitnut: false, talentova: false, druh: 4, extra_body: true, obec: 'Brno' },
  b: { min_prijaty: 20, dolni_mez: null, horni_mez: null, soutezicich: 30, prijatych: 30, neveslo_se: 0, v_pasmu_soutezilo: null, v_pasmu_prijato: null, nikdo_neodmitnut: true, talentova: false, druh: 4, extra_body: null, obec: 'Brno' },
  c: { ...{ min_prijaty: 60, dolni_mez: 60, horni_mez: 70, soutezicich: 50, prijatych: 20, neveslo_se: 30, v_pasmu_soutezilo: 10, v_pasmu_prijato: 4 }, nikdo_neodmitnut: false, talentova: true, druh: 4, extra_body: false, obec: 'Brno' },
};
const nabidka = id => ({ id: `${id}_79-41-K/41`, slug: id, nazev: `Škola ${id}`, program: 'Gymnázium', obec: 'Brno' });
const render = (sPolohou, rok = 2031) => renderToStaticMarkup(React.createElement(SeznamNabidek, {
  nabidky: ['a', 'b', 'c'].map(nabidka),
  poloha: sPolohou ? n => polohaVuciPasmu(45, radky[n.slug], 4, 10) : null,
  radek: n => radky[n.slug], minuty: () => undefined, rok, rokKriterii: 2030, minPrijatych: 10,
  isSaved: () => false, onToggleSave: () => {},
}));

test('se zadaným testem skupiny s rokem z registru, bez procent', () => {
  const html = render(true);
  assert.match(html, /V pásmu \(1\)/);
  assert.match(html, /Obory, kde nikoho neodmítli \(1\)/);
  assert.match(html, /Bez srovnání \(1\)/);
  assert.match(html, /talentová zkouška/);
  assert.match(html, /1\. kole 2031/);
  assert.doesNotMatch(html, /2026|%|šanc/);
  assert.match(html, /O přijetí rozhodují i extra body/);
  assert.match(html, /podle kritérií 2030/);
});

test('bez testu jeden seznam bez skupin', () => {
  const html = render(false);
  assert.doesNotMatch(html, /Nad pásmem|V pásmu|Bez srovnání/);
  assert.equal((html.match(/Podrobně na stránce oboru/g) ?? []).length, 3);
});
