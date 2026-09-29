import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { posunVPoradi, zkontrolujStrategii, navrhniPojistku } from '../src/lib/strategie-prihlasek.ts';

const require = createRequire(import.meta.url);
function load(relative) {
  const source = fs.readFileSync(path.resolve(relative), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
  const modul = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(specifier => {
    if (specifier === 'next/link') return { __esModule: true, default: ({ children }) => children };
    if (!specifier.startsWith('@/')) return require(specifier);
    const target = specifier.replace('@/', 'src/');
    return load(fs.existsSync(`${target}.tsx`) ? `${target}.tsx` : `${target}.ts`);
  }, modul, modul.exports);
  return modul.exports;
}
const { StrategiePrihlasek } = load('src/components/simulator/StrategiePrihlasek.tsx');
const kalendar = JSON.parse(fs.readFileSync('src/data/admissions-2027.json', 'utf8'));
const pravidla = kalendar.pravidla;
const p = (id, skupina, talentova = false) => ({ id, label: id, skupina, talentova });

test('posun v pořadí mění sousedy a na okraji nic nedělá', () => {
  assert.deepEqual(posunVPoradi(['a', 'b', 'c'], 'b', -1), ['b', 'a', 'c']);
  assert.deepEqual(posunVPoradi(['a', 'b', 'c'], 'c', 1), ['a', 'b', 'c']);
  assert.deepEqual(posunVPoradi(['a', 'b'], 'x', 1), ['a', 'b']);
});

test('počet přihlášek se bere z bloku pravidla, ne z kódu', () => {
  const k = zkontrolujStrategii([p('a', 'pod'), p('b', 'pod')], { ...pravidla, prihlasek_bezne: 1 });
  assert.deepEqual(k.vejdeSeBezne, ['a']);
  assert.equal(k.navicBezne, 1);
});

test('bez pojistky upozornění; pojistka za posledním místem se nepočítá', () => {
  const polozky = [p('a', 'pod'), p('b', 'v'), p('c', 'pod'), p('d', 'nad')];
  const k = zkontrolujStrategii(polozky, { ...pravidla, prihlasek_bezne: 3 });
  assert.equal(k.maPojistku, false);
  assert.equal(k.pojistkaMimoPrihlasku, true);
  const html = renderToStaticMarkup(React.createElement(StrategiePrihlasek, { polozky, pravidla: { ...pravidla, prihlasek_bezne: 3 }, rok: 2026, onMove() {}, navrhyPojistky: [], onAdd() {} }));
  assert.match(html, /V přihlášce chybí pojistka/);
  assert.match(html, /Posuň ho výš/);
});

test('pojistka nad pásmem a doporučení oboru, kde nikoho neodmítli', () => {
  const k = zkontrolujStrategii([p('a', 'v'), p('b', 'nad')], pravidla);
  assert.equal(k.maPojistku, true);
  assert.equal(k.maNikdoNeodmitnut, false);
  assert.equal(zkontrolujStrategii([p('a', 'nad'), p('b', 'nikdo_neodmitnut')], pravidla).maNikdoNeodmitnut, true);
});

test('talentové obory se počítají zvlášť a pojistkou nejsou', () => {
  const polozky = [p('t1', 'bez_srovnani', true), p('t2', 'bez_srovnani', true), p('t3', 'bez_srovnani', true), p('a', 'nad')];
  const k = zkontrolujStrategii(polozky, pravidla);
  assert.deepEqual(k.vejdeSeBezne, ['a']);
  assert.equal(k.vejdeSeTalentove.length, pravidla.prihlasek_talentove);
  assert.equal(k.navicTalentove, 3 - pravidla.prihlasek_talentove);
  assert.equal(k.navicBezne, 0);
});

test('víc zvažovaných než přihlášek je v pořádku, text uvádí rok pravidel a žádné procento', () => {
  const polozky = ['a', 'b', 'c', 'd', 'e'].map(id => p(id, 'nad'));
  const html = renderToStaticMarkup(React.createElement(StrategiePrihlasek, { polozky, pravidla, rok: 2026, onMove() {}, navrhyPojistky: [], onAdd() {} }));
  assert.match(html, new RegExp(`podle pravidel ${pravidla.rok_pravidel}`));
  assert.match(html, /To je v pořádku/);
  assert.match(html, /Pojistku máš/);
  assert.doesNotMatch(html, /%|priorit|oblíben/i);
});

test('bez testu se pojistka nehodnotí', () => {
  const html = renderToStaticMarkup(React.createElement(StrategiePrihlasek, { polozky: [p('a', null)], pravidla, rok: 2026, onMove() {}, navrhyPojistky: [], onAdd() {} }));
  assert.match(html, /Zadej výsledek cvičného testu/);
  assert.doesNotMatch(html, /chybí pojistka/);
});

test('návrh pojistky: nejbližší nad pásmem se stejným oborem, bez už zvažovaných', () => {
  const k = [
    { id: '1', obor: 'Gymnázium', s: 'nad', m: 30 }, { id: '2', obor: 'Gymnázium', s: 'nad', m: 10 },
    { id: '3', obor: 'Obchodní akademie', s: 'nad', m: 5 }, { id: '4', obor: 'Gymnázium', s: 'v', m: 1 },
    { id: '5', obor: 'Gymnázium', s: 'nad', m: 2 },
  ];
  const out = navrhniPojistku(k, id => id === '5', new Set(['Gymnázium']), { skupina: x => x.s, minuty: x => x.m, nazev: x => x.id });
  assert.deepEqual(out.map(x => x.id), ['2', '1']);
  const jine = navrhniPojistku(k, () => false, new Set(['Zdravotnický asistent']), { skupina: x => x.s, minuty: x => x.m, nazev: x => x.id });
  assert.deepEqual(jine.map(x => x.id), ['5', '3', '2']);
});

test('pořadí na přihlášce čísluje talentové i běžné obory společně', () => {
  const vykresli = polozky => renderToStaticMarkup(React.createElement(StrategiePrihlasek, {
    polozky, pravidla, rok: 2026, onMove: () => {}, navrhyPojistky: [], onAdd: () => {},
  }));
  const popisky = html => [...html.matchAll(/<p class="text-xs text-slate-600">([^<]*)<\/p>/g)].map(m => m[1]);
  const talentovyNahore = popisky(vykresli([p('sport', null, true), p('gym', null)]));
  assert.match(talentovyNahore[0], /^1\. na přihlášce · s talentovou zkouškou/);
  assert.match(talentovyNahore[1], /^2\. na přihlášce/);
  const beznyNahore = popisky(vykresli([p('gym', null), p('sport', null, true)]));
  assert.match(beznyNahore[0], /^1\. na přihlášce/);
  assert.match(beznyNahore[1], /^2\. na přihlášce · s talentovou zkouškou/);
});

// Regrese Codex review kolo 3, nález 1: nedohledaný obor nesmí vypadnout z pořadí.
test('nedohledaný uložený obor drží místo a pojistka se nepotvrdí', () => {
  const polozky = [
    { id: '600005836_63-41-M/02', label: 'Uložený obor se dohledává', skupina: null, talentova: null },
    p('b', 'pod'), p('c', 'pod'), p('d', 'nad'),
  ];
  const k = zkontrolujStrategii(polozky, { ...pravidla, prihlasek_bezne: 3 });
  assert.equal(k.pozastaveno, true);
  assert.equal(k.maPojistku, false);
  const html = renderToStaticMarkup(React.createElement(StrategiePrihlasek, { polozky, pravidla: { ...pravidla, prihlasek_bezne: 3 }, rok: 2026, onMove() {}, navrhyPojistky: [], onAdd() {} }));
  assert.doesNotMatch(html, /Pojistku máš/);
  assert.doesNotMatch(html, /\d\. na přihlášce/);
  assert.doesNotMatch(html, /Do přihlášky se nevejde/);
  assert.match(html, /4\. v tvém pořadí/);
  assert.match(html, /Uložený obor se dohledává/);
});

// Regrese Codex review kolo 3, nález 2: bez indexu pásem neznáme druh zkoušky.
test('bez načtených pásem se limit přihlášek nekontroluje', () => {
  const polozky = ['sport', 'a', 'b', 'c'].map(id => ({ id, label: id, skupina: null, talentova: null }));
  const k = zkontrolujStrategii(polozky, { ...pravidla, prihlasek_bezne: 3 });
  assert.equal(k.pozastaveno, true);
  assert.equal(k.navicBezne, 0);
  const html = renderToStaticMarkup(React.createElement(StrategiePrihlasek, { polozky, pravidla: { ...pravidla, prihlasek_bezne: 3 }, rok: 2026, onMove() {}, navrhyPojistky: [], onAdd() {} }));
  assert.doesNotMatch(html, /Do přihlášky se nevejde/);
  assert.doesNotMatch(html, /Zvažuješ víc oborů/);
  assert.match(html, /nevíme, jestli má talentovou zkoušku/);
});
