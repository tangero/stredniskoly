import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { zavadec, text } from './_zavadec.mjs';

// Zadání cvičného testu sdílí stránka oboru a Simulátor přijímaček
// (docs/navrh-simulator-prijimacek-2027.md, oddíl 2).

test('klíč úložiště zůstává stejný jako ve fázi 1', () => {
  // Změna klíče by rodinám tiše zahodila výsledky uložené na stránce oboru.
  const { klicUlozeni } = zavadec()('src/components/obor/ZadaniTestu.tsx');
  assert.equal(klicUlozeni('4', 2025), 'kde-stojim:testy:v1:4:2025');
  assert.equal(klicUlozeni('8', undefined), 'kde-stojim:testy:v1:8:bez-prevodu');
});

test('stránka oboru i simulátor berou zadání ze sdílené komponenty', () => {
  for (const soubor of ['src/components/obor/KdeStojim.tsx', 'src/app/simulator/SimulatorClient.tsx']) {
    const zdroj = fs.readFileSync(soubor, 'utf8');
    assert.match(zdroj, /useZadaneTesty/, soubor);
    assert.doesNotMatch(zdroj, /kde-stojim:testy/, `${soubor} si klíč skládá sám`);
  }
});

function vykresli(testy, prevod = null) {
  let poradi = 0;
  const react = {
    ...React,
    useState: (init) => {
      poradi += 1;
      if (poradi === 1) return [testy, () => {}];
      return [typeof init === 'function' ? init() : init, () => {}];
    },
  };
  const { ZadaniTestu, useZadaneTesty } = zavadec(react)('src/components/obor/ZadaniTestu.tsx');
  function Obal() {
    const stav = useZadaneTesty({ druh: '4', prevod, rok: 2026, pamatovat: true });
    return React.createElement(ZadaniTestu, { stav, druh: '4', rok: 2026, prevodVstup: prevod, pamatovat: true });
  }
  return text(renderToStaticMarkup(React.createElement(Obal)));
}

const PREVOD = {
  rok_testu: 2025, rok_cile: 2026,
  terminy: [{ klic: '1-radny', nazev: '1. řádný termín', radny: true, resitelu: 1000, spolehlive: true,
    body_cil: Array.from({ length: 101 }, (_, i) => Math.min(100, i + 5)) }],
};

test('jiný test nebo odhad nese výraznou výhradu bez převodu', () => {
  const html = vykresli([{ test: 'jiny', cj: '30', ma: '25' }], PREVOD);
  assert.match(html, /Jiný test nebo odhad \(bez převodu\)/);
  assert.match(html, /Tvůj výsledek je bez převodu/);
  assert.match(html, /stejně těžký jako jednotná přijímací zkouška v roce 2026/);
});

test('převedený test výhradu bez převodu nemá, smíšené zadání ano', () => {
  const tau = vykresli([{ test: '1-radny', cj: '30', ma: '25' }], PREVOD);
  assert.match(tau, /55 bodů → 60 bodů roku 2026/);
  assert.doesNotMatch(tau, /bez převodu\./);
  const smes = vykresli([{ test: '1-radny', cj: '30', ma: '25' }, { test: 'jiny', cj: '20', ma: '20' }], PREVOD);
  assert.match(smes, /Část tvých výsledků je bez převodu/);
  assert.match(smes, /průměr obou výsledků/);
});
