/**
 * Kontroly přehledu škol v kraji (docs/navrh-stranky-kraje-2027.md).
 *
 * Každý test hlídá jednu závadu staré stránky, která porušovala metodiku a žádná
 * z nich neshodila build ani typy: loňský ročník místo zobrazeného (D1), nuly místo
 * chybějících údajů (D2), nedoložená kategorie oboru, semafor a zakázaná slova.
 *
 * Spuštění: npx tsx --test tests/kraj-prehled.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getKrajPrehled } from '../src/lib/krajData.ts';
import { zobrazeneObdobi } from '../src/lib/stav-datovych-sad.ts';
import { RegionSchoolsTable } from '../src/components/RegionSchoolsTable.tsx';
import { krajNames } from '../src/lib/kraje.mjs';

const souhrny = JSON.parse(readFileSync(new URL('../public/souhrny_kolo1.json', import.meta.url), 'utf-8'));

async function vsechnyKraje() {
  const out = [];
  for (const kod of Object.keys(krajNames)) out.push({ kod, p: await getKrajPrehled(kod) });
  return out;
}

test('ročník přehledu je zobrazené období z registru, ne napevno', async () => {
  const rok = Number(await zobrazeneObdobi('cermat-vysledky'));
  const p = await getKrajPrehled('CZ010');
  assert.equal(p.rok, rok);
});

test('přehled nevynechá ani nezdvojí žádnou nabídku ze souhrnů kraje', async () => {
  const rok = String(await zobrazeneObdobi('cermat-vysledky'));
  for (const { kod, p } of await vsechnyKraje()) {
    const ocekavane = Object.entries(souhrny.nabidky).filter(([, n]) => n.kraj === kod && n.roky[rok]).map(([k]) => k).sort();
    const zobrazene = p.skoly.flatMap(s => s.nabidky.map(n => n.klic)).sort();
    assert.deepEqual(zobrazene, ocekavane, `kraj ${kod}`);
  }
});

test('jedna škola je jedna karta', async () => {
  for (const { kod, p } of await vsechnyKraje()) {
    const redizo = p.skoly.map(s => s.redizo);
    assert.equal(new Set(redizo).size, redizo.length, `kraj ${kod}`);
  }
});

test('chybějící údaj není nula: žádná nabídka nemá kapacitu ani přihlášky na místo 0 jako náhradu', async () => {
  // Stará stránka dávala 57 pražským oborům novým v roce 2026 kapacitu 0 a „0,0× konkurence“ zeleně.
  const nabidky = (await vsechnyKraje()).flatMap(({ p }) => p.skoly.flatMap(s => s.nabidky));
  const nuly = nabidky.filter(n => n.kapacita === 0 || (n.prihlaskyNaMisto === 0 && (n.prihlasky ?? 0) > 0));
  assert.equal(nuly.length, 0, nuly.slice(0, 3).map(n => n.klic).join(', '));
});

test('nové nabídky jsou přiznané a nenesou předchozí ročník', async () => {
  const p = await getKrajPrehled('CZ010');
  const nove = p.skoly.flatMap(s => s.nabidky).filter(n => n.novaNabidka);
  assert.ok(nove.length > 0, 'v Praze jsou obory nové v zobrazeném ročníku');
  assert.ok(nove.every(n => n.zarazeniPredchozi === null && n.predchoziRok === null));
});

test('pořadí v kraji se počítá jen ve srovnatelné skupině s aspoň deseti nabídkami', async () => {
  for (const { p } of await vsechnyKraje()) {
    const podleSkupiny = new Map();
    for (const n of p.skoly.flatMap(s => s.nabidky)) {
      podleSkupiny.set(n.skupina, [...(podleSkupiny.get(n.skupina) ?? []), n]);
    }
    for (const [, nabidky] of podleSkupiny) {
      for (const n of nabidky) {
        if (n.poradiZajem) assert.ok(n.poradiZajem.poradi.z >= 10 && n.poradiZajem.poradi.z <= nabidky.length);
      }
    }
  }
});

function vykresli(p) {
  return renderToStaticMarkup(React.createElement(RegionSchoolsTable, { skoly: p.skoly, krajNazev: 'Hlavní město Praha', rok: p.rok, rokDruhehoKola: p.rokDruhehoKola }));
}

test('vykreslení: bez nedoložené kategorie, zakázaných slov a semaforu', async () => {
  const html = vykresli(await getKrajPrehled('CZ010'));
  for (const slovo of ['Vyvážená', 'Preferovaná', 'konkurence', 'Konkurence', 'Trend', 'trend', 'index poptávky', 'Hranice neověřena']) {
    assert.ok(!html.includes(slovo), `stránka nesmí obsahovat „${slovo}“`);
  }
  assert.ok(!/\b(bg|text)-(red|green)-\d{3}\b/.test(html), 'barvy semaforu nemají na přehledu co dělat');
});

test('vykreslení: odznaky obtížnosti a kohorty jsou na stránce', async () => {
  const html = vykresli(await getKrajPrehled('CZ010'));
  assert.ok(html.includes('velmi těžké'));
  assert.ok(html.includes('škola první volby'));
  assert.ok(html.includes('záložní volba'));
  assert.ok(html.includes('Neříká nic o kvalitě školy'));
});

test('vykreslení: bez zvoleného typu studia se pořadí v kraji nevypisuje', async () => {
  // Obory různých typů se neporovnávají (slovník ukazatelů, oddíl 4).
  const html = vykresli(await getKrajPrehled('CZ010'));
  assert.ok(!html.includes('v Praze podle zájmu'));
  assert.ok(!html.includes('v Praze podle výsledků přijatých'));
});

test('vykreslení: řádek o maturitě je u škol, které ji mají', async () => {
  const p = await getKrajPrehled('CZ010');
  if (!p.rokMaturity) return;
  const html = vykresli(p);
  assert.ok(html.includes('přihlášených'));
  assert.ok(html.includes('nad středem podobných škol'));
});
