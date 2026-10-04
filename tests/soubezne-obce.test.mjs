import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Vykreslí skutečnou TSX komponentu bez Next serveru (stejně jako detail-stats-render.test.mjs).
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
const { SoubezneObceObsah } = load('src/components/obor/SoubezneObce.tsx');
const { souhrnObci } = load('src/lib/okruhy-oboru.ts');
const vykresli = (data) => renderToStaticMarkup(React.createElement(SoubezneObceObsah, { data }));

test('souhrn po obcích: řazení od největšího podílu, prázdný záznam nic', () => {
  const s = souhrnObci(2026, { uchazecu: 94, obce: [{ obec: 'Čelákovice', podil: 0.32 }, { obec: 'Praha', podil: 0.56 }] });
  assert.deepEqual(s, { rok: 2026, obce: [{ obec: 'Praha', podil: 0.56 }, { obec: 'Čelákovice', podil: 0.32 }], potlaceno: 0 });
  assert.equal(souhrnObci(2026, undefined), null);
  assert.equal(souhrnObci(2026, { uchazecu: 12, obce: [], potlacene_obce: 2 }), null);
  assert.equal(souhrnObci(2026, { obce: [{ obec: 'Praha', podil: 0 }] }), null);
});

test('blok: rok, procenta, vysvětlení „v okolí“ a výhrada o potlačených obcích', () => {
  const html = vykresli({ rok: 2026, obce: [{ obec: 'Praha', podil: 0.56 }, { obec: 'Čelákovice', podil: 0.32 }], potlaceno: 1 });
  assert.match(html, /bez ohledu na to, ve které obci leží/);
  assert.match(html, /„V okolí“ znamená podle přihlášek uchazečů, ne podle vzdálenosti/);
  assert.match(html, /v 1\. kole 2026/);
  assert.match(html, /Praha<\/td><td[^>]*>56(&nbsp;| )%/);
  assert.match(html, /Čelákovice<\/td><td[^>]*>32(&nbsp;| )%/);
  assert.match(html, /proto se podíly nesčítají/);
  assert.match(html, /některé další obce neuvádíme/);
  assert.doesNotMatch(vykresli({ rok: 2026, obce: [{ obec: 'Praha', podil: 0.56 }], potlaceno: 0 }), /neuvádíme/);
});

test('blok nepoužívá zakázaná slova ze slovníku pojmů', () => {
  const html = vykresli({ rok: 2026, obce: [{ obec: 'Praha', podil: 0.56 }], potlaceno: 1 });
  for (const slovo of ['podobné obory', 'shluk', 'oblíben', 'konkurenc', 'blízk', 'loni', 'letos']) {
    assert.doesNotMatch(html.toLowerCase(), new RegExp(slovo), slovo);
  }
});

test('data: každý obor v souboru zobrazeného roku má obce nad mezí a podíl do 1', () => {
  const rok = JSON.parse(fs.readFileSync('public/stav_datovych_sad.json', 'utf8')).sady['cermat-uchazeci-kolo1'].zobrazeno.obdobi;
  const soubor = `public/okruhy_oboru_${rok}.json`;
  assert.ok(fs.existsSync(soubor), soubor);
  const { obory, meze } = JSON.parse(fs.readFileSync(soubor, 'utf8'));
  for (const [klic, z] of Object.entries(obory)) {
    assert.ok(z.uchazecu >= meze.min_uchazecu, klic);
    for (const o of z.obce) assert.ok(o.podil > 0 && o.podil <= 1, `${klic} ${o.obec}`);
  }
});
