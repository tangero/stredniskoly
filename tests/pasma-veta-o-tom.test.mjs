import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { zavadec } from './_zavadec.mjs';

// Ukazatel rozhodl_test měří shodu pořadí podle SOUČTU obou testů s výsledkem.
// Kritérium, které jeden předmět jen převažuje, pořadí skoro nezmění a ukazatel
// ho nevidí — Gymnázium Christiana Dopplera má 0,994 a váží matematiku 1,5×.
// Věta na kartě proto nesmí tvrdit, že „rozhodl test“.

const { PasmaPrijetiCard } = zavadec()('src/components/school/detail/PasmaPrijetiCard.tsx');
const DATA = {
  soutezicich: 78, prijatych: 30, neveslo_se: 45, prijato_na_vyssi_prioritu: 0, nesplnilo_podminky: 3,
  min_prijaty: 85, min_prijaty_percentil: 98, max_neprijaty: 87, pasmo_nejistoty: [85, 87],
  pasmo_nejistoty_soutezilo: 12, pasmo_nejistoty_prijato: 7, median_prijatych: 91,
  vice_zamereni: false, talentova_zkouska: false,
  pasma: [{ od: 80, do: 90, prijato: 10, soutezilo: 30 }, { od: 90, do: 100, prijato: 20, soutezilo: 22 }],
};
const vykresli = (rozhodl_test) =>
  renderToStaticMarkup(React.createElement(PasmaPrijetiCard, { data: { ...DATA, rozhodl_test }, rok: 2026, vypsana: true }));

test('vysoká shoda pořadí netvrdí, že rozhodl test', () => {
  const html = vykresli(0.994);
  assert.doesNotMatch(html, /O přijetí rozhodoval hlavně výsledek testu/, 'věta tvrdí víc, než ukazatel umí');
  assert.match(html, /Pořadí podle součtu obou testů odpovídalo/);
});

test('slepé místo je pojmenované přímo na kartě', () => {
  // Doppler: matematika 1,5×, rozhodl_test 0,994. Bez téhle věty čte rodič
  // těsné pásmo jako důkaz, že nic jiného nerozhoduje.
  const html = vykresli(0.994);
  assert.match(html, /převažují/, 'chybí zmínka o vážení předmětů');
  assert.match(html, /ověřte je u školy/, 'chybí odkaz na kritéria školy');
});

test('střední a nízká shoda zůstávají beze změny', () => {
  assert.match(vykresli(0.9), /kritéria školy s pořadím znatelně hýbala/);
  assert.match(vykresli(0.6), /z velké části něco jiného než test/);
});
