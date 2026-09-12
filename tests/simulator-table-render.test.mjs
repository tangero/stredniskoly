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
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(specifier => {
    if (specifier === 'next/link') return { __esModule: true, default: ({ children }) => children };
    if (!specifier.startsWith('@/')) return require(specifier);
    const target = specifier.replace('@/', 'src/');
    return load(fs.existsSync(`${target}.tsx`) ? `${target}.tsx` : `${target}.ts`);
  }, module, module.exports);
  return module.exports;
}
const { OfferComparisonTable } = load('src/components/simulator/OfferComparisonTable.tsx');

const offer = (over = {}) => ({
  id: '600001431_79-41-K/41', slug: 'gymnazium', name: 'Gymnázium Opatov', program: 'Gymnázium',
  place: 'Konstantinova 1500, Praha 4',
  acceptedTotal: 80.8, acceptedCzech: 41.8, acceptedMaths: 39.1,
  applications: 171, capacity: 30, commuteMinutes: 37, ...over,
});
const render = (offers, own, saved = new Set()) => renderToStaticMarkup(React.createElement(OfferComparisonTable, {
  offers, own, savedIds: saved, onToggleSave: () => {},
}));

test('tabulka ukáže průměr i odstup zvlášť za každý předmět', () => {
  const html = render([offer()], { czech: 38, maths: 34 });
  assert.match(html, /Čeština z 50/);
  assert.match(html, /Matematika z 50/);
  // Průměry přijatých za oba předměty.
  assert.match(html, /41,8/);
  assert.match(html, /39,1/);
  // Odstupy: v ČJ -3,8, v MA -5,1, celkem -8,8.
  assert.match(html, /-3,8/);
  assert.match(html, /-5,1/);
  assert.match(html, /-8,8/);
});

test('kladný odstup nese znaménko plus, aby šel odlišit od chybějících bodů', () => {
  const html = render([offer()], { czech: 46, maths: 44 });
  assert.match(html, /\+4,2/);
  assert.match(html, /\+4,9/);
  assert.match(html, /Nad průměrem přijatých/);
});

test('chybějící rozpad předmětů se zobrazí pomlčkou a vysvětlí, ne jako nula', () => {
  const html = render([offer({ acceptedCzech: null, acceptedMaths: null })], { czech: 38, maths: 34 });
  assert.match(html, /—/);
  assert.match(html, /nepodařilo jednoznačně přiřadit/);
  // Chybějící údaj nesmí vyrobit nulový odstup ani tvrzení o poloze.
  assert.doesNotMatch(html, /\+0,0|-0,0/);
});

test('bez zadaných bodů tabulka neuvádí odstup ani stav', () => {
  const html = render([offer()], { czech: null, maths: null });
  assert.match(html, /Zadej své body/);
  assert.doesNotMatch(html, /Průměr není ověřen|nepodařilo jednoznačně přiřadit/);
  assert.match(html, /80,8/);
  assert.doesNotMatch(html, /Nad průměrem přijatých|Pod průměrem přijatých/);
});

test('nerovnováha mezi předměty se pojmenuje jen při výrazném rozdílu', () => {
  // Silný v češtině, slabý v matematice: v ČJ +4,2, v MA -9,1.
  const html = render([offer()], { czech: 46, maths: 30 });
  assert.match(html, /slabší v matematice/);
  // Vyrovnaný uchazeč upozornění nedostane.
  assert.doesNotMatch(render([offer()], { czech: 42, maths: 40 }), /slabší v matematice|slabší v češtině/);
});

test('uložený obor je označen a tlačítko nabízí odebrání', () => {
  const saved = new Set(['600001431_79-41-K/41']);
  const html = render([offer()], { czech: 38, maths: 34 }, saved);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /Odebrat z výběru/);
  assert.doesNotMatch(render([offer()], { czech: 38, maths: 34 }), /Odebrat z výběru/);
});

test('tabulka nikde neslibuje přijetí ani pravděpodobnost', () => {
  const html = render([offer()], { czech: 46, maths: 44 });
  assert.doesNotMatch(html, /šance na přijetí \d|pravděpodobnost|budeš přijat|minimální body|bodová hranice/i);
  assert.match(html, /nikoli že jsi přijat/);
});

test('prázdný výsledek poradí, co změnit, místo prázdné tabulky', () => {
  const html = render([], { czech: 38, maths: 34 });
  assert.match(html, /není žádný obor/);
});

test('chybějící historický průměr se odlišuje od nezadaných vlastních bodů', () => {
  const html = render([offer({ acceptedTotal: null })], { czech: 38, maths: 34 });
  assert.match(html, /Průměr není ověřen/);
  assert.doesNotMatch(html, /Zadej své body/);
  assert.match(html, /Srovnání s přijatými/);
  assert.doesNotMatch(html, />Šance</);
});

test('karty i tabulka nabízejí ostatní obory školy včetně přesného odkazu a uložení', () => {
  const other = offer({ id: 'other', program: 'Technické lyceum', href: '/nabidka/2026/overeny-identifikator' });
  const html = render([offer({ otherOffers: [other] })], { czech: 35, maths: 40 });
  assert.match(html, /Další obory této školy \(1\)/);
  assert.match(html, /Uložit do výběru: Technické lyceum/);
  assert.match(html, /I mimo tvoje filtry/);
});
