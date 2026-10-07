import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { zkontrolujStrategii, navrhniPojistku, talentovaZPasem } from '../src/lib/strategie-prihlasek.ts';
import { nactiIndexPasem } from '../src/lib/poloha-vuci-pasmu.ts';

// Učební obor jako pojistka bez bodů (docs/navrh-simulator-doplnek-ucebni-obory.md, #244 etapa 5).

const require = createRequire(import.meta.url);
function load(relative) {
  const source = fs.readFileSync(path.resolve(relative), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
  const modul = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(specifier => {
    if (specifier === 'next/link') return { __esModule: true, default: ({ children }) => children };
    if (!specifier.startsWith('@/') && !specifier.startsWith('./')) return require(specifier);
    const target = specifier.startsWith('./') ? path.join(path.dirname(relative), specifier) : specifier.replace('@/', 'src/');
    return load(fs.existsSync(`${target}.tsx`) ? `${target}.tsx` : `${target}.ts`);
  }, modul, modul.exports);
  return modul.exports;
}
const U = load('src/lib/ucebni-pojistka.ts');
const { StrategiePrihlasek } = load('src/components/simulator/StrategiePrihlasek.tsx');
const { SeznamUcebnichOboru } = load('src/components/simulator/SeznamNabidek.tsx');
const pravidla = JSON.parse(fs.readFileSync('src/data/admissions-2027.json', 'utf8')).pravidla;
const DATA = JSON.parse(fs.readFileSync('src/data/obory-bez-jpz-2026.json', 'utf8'));
const DOKLAD = JSON.parse(fs.readFileSync('docs/podklady/mereni-obory-bez-jpz-2026.json', 'utf8'));

const udaje = (o = {}) => ({ kategorie: 'H', prijati: 20, nepr_kapacita: 0, nepr_podminky: 0, prihlasky: 25, ...o });

test('počet učebních pojistek H a E sedí s dokladem měření (574 H, E zapsané v dokladu)', () => {
  const pocet = k => DATA.nabidky.filter(n => n.kategorie === k && U.jeUcebniPojistka(n)).length;
  assert.equal(pocet('H'), DOKLAD.soutezici_prahy.pasma_H_nad_prahem.kapacita_nerozhodovala);
  assert.equal(pocet('H'), 574);
  assert.equal(pocet('E'), DOKLAD.soutezici_prahy.pasma_E_nad_prahem.kapacita_nerozhodovala);
});

test('stavy učebního oboru: pojistka, odmítli, pod prahem 10 soutěžících, chybějící počty nejsou nula', () => {
  assert.equal(U.vyhodnotUcebniObor(udaje()).stav, 'pojistka');
  assert.equal(U.vyhodnotUcebniObor(udaje({ nepr_kapacita: 1 })).stav, 'odmitli');
  assert.equal(U.vyhodnotUcebniObor(udaje({ prijati: 9 })).stav, 'pod_prahem');
  assert.equal(U.vyhodnotUcebniObor(udaje({ prijati: 10 })).stav, 'pojistka');
  assert.equal(U.vyhodnotUcebniObor(udaje({ prijati: null })).stav, 'chybi');
  assert.equal(U.vyhodnotUcebniObor(udaje({ nepr_kapacita: null })).stav, 'chybi');
  // Pojistkou bez bodů je jen učební obor (H, E); talentové, C a J ne, i se stejnými počty.
  for (const k of ['M', 'L', 'P', 'C', 'J']) assert.equal(U.jeUcebniPojistka(udaje({ kategorie: k })), false, k);
  assert.equal(U.jeUcebniPojistka(udaje({ kategorie: 'E' })), true);
  assert.equal(U.jeUcebniPojistka(null), false);
});

test('věty u učebního oboru: rok, pojmy ze slovníku, bez bodů a bez „místo pro všechny“', () => {
  const v = s => U.vetaUcebnihoOboru(U.vyhodnotUcebniObor(s), 2026);
  assert.equal(v(udaje()), 'V 1. kole 2026 tu nikoho neodmítli kvůli počtu míst: přijali všechny soutěžící uchazeče (přijato 20).');
  assert.match(v(udaje({ nepr_podminky: 30 })), /Požadavku školy, například minima z kritérií, ale nedosáhlo 30 uchazečů\. Přečti si kritéria/);
  assert.match(v(udaje({ nepr_kapacita: 2 })), /kvůli počtu míst někoho odmítli, proto ho jako pojistku nepočítáme/);
  assert.match(v(udaje({ prijati: 4 })), /soutěžilo jen 4 uchazeči; z tak malého počtu pojistku neurčujeme/);
  assert.equal(v(udaje({ prijati: null })), 'Pro tento obor nemáme počty z 1. kola 2026.');
  for (const s of [udaje(), udaje({ nepr_podminky: 30 }), udaje({ nepr_kapacita: 2 }), udaje({ prijati: 4 })]) {
    assert.doesNotMatch(v(s), /místo pro všechny|podmínk|bod/i);
  }
  assert.match(U.popisBlokuUcebnichOboru(2026), /soutěžící uchazeče, tedy ty, kdo splnili požadavky školy/);
});

test('filtr třídy: po 9. třídě dvou- i tříleté učební obory, po 5. a 7. třídě ne', () => {
  assert.equal(U.projdeFiltremTridy(2, 'E', '9'), true);
  assert.equal(U.projdeFiltremTridy(3, 'H', '9'), true);
  assert.equal(U.projdeFiltremTridy(3, 'M', '9'), false);
  assert.equal(U.projdeFiltremTridy(4, undefined, '9'), true);
  for (const t of ['5', '7']) assert.equal(U.projdeFiltremTridy(3, 'H', t), false, t);
  assert.equal(U.projdeFiltremTridy(8, undefined, '5'), true);
  assert.equal(U.projdeFiltremTridy(3, 'H', 'all'), true);
});

test('strategie: učební pojistka platí i bez testu, mezi běžnými přihláškami, za posledním místem „posuň výš“', () => {
  const p = (id, o = {}) => ({ id, label: id, skupina: null, talentova: false, ...o });
  const k = zkontrolujStrategii([p('a'), p('u', { ucebniPojistka: true, obor: 'Truhlář' })], pravidla);
  assert.equal(k.znameSkupiny, true);
  assert.equal(k.maPojistku, true);
  assert.equal(k.pojistkaNad, false);
  assert.deepEqual(k.ucebniPojistky, ['u']);
  assert.ok(k.vejdeSeBezne.includes('u'));
  const html = renderToStaticMarkup(React.createElement(StrategiePrihlasek, {
    polozky: [p('a'), p('u', { ucebniPojistka: true, obor: 'Truhlář' })], pravidla, rok: 2026, onMove() {}, navrhyPojistky: [], onAdd() {},
  }));
  assert.match(html, /Pojistku máš: Truhlář, učební obor, kde v 1\. kole 2026 nikoho neodmítli kvůli počtu míst\. Platí to jen, když splníš požadavky školy\./);
  // Bez testu skupiny neznáme, proto ani doporučení skupiny „Obory, kde nikoho neodmítli“.
  assert.doesNotMatch(html, /Obory, kde nikoho neodmítli“ v přihlášce nemáš/);
  // Za posledním místem přihlášky pojistka nestačí.
  const plno = Array.from({ length: pravidla.prihlasek_bezne }, (_, i) => p(`b${i}`, { skupina: 'pod' }));
  const mimo = zkontrolujStrategii([...plno, p('u', { ucebniPojistka: true })], pravidla);
  assert.equal(mimo.maPojistku, false);
  assert.equal(mimo.pojistkaMimoPrihlasku, true);
  // Talentový obor bez JPZ se počítá mezi talentové přihlášky, kontrola se nepozastaví.
  const t = zkontrolujStrategii([p('t', { talentova: true }), p('u', { ucebniPojistka: true })], pravidla);
  assert.equal(t.pozastaveno, false);
  assert.deepEqual(t.vejdeSeTalentove, ['t']);
});

test('index pásem bez druhu zkoušky: talentova null a kontrola se pozastaví', () => {
  const index = nactiIndexPasem({ rok: 2026, min_prijatych_pro_hranici: 10, sloupce: ['min_prijaty'], obce: [], data: { '1_79-41-K/41': [50] } });
  const radek = index.data.get('1_79-41-K/41');
  assert.equal(radek.talentova, null);
  assert.equal(talentovaZPasem(index, radek), null);
  assert.equal(zkontrolujStrategii([{ id: 'x', label: 'x', skupina: 'nad', talentova: talentovaZPasem(index, radek) }], pravidla).pozastaveno, true);
  const s = nactiIndexPasem({ rok: 2026, min_prijatych_pro_hranici: 10, sloupce: ['talentova'], obce: [], data: { a: [0], b: [1] } });
  assert.equal(s.data.get('a').talentova, false);
  assert.equal(s.data.get('b').talentova, true);
});

test('návrh učební pojistky: jen se stejným kódem oboru jako zvažovaný učební obor; navrhniPojistku ji nenabízí', () => {
  const kand = [
    { id: '1_33-56-H/01_', obor: 'Truhlář', nazev: 'A', b: udaje() },
    { id: '2_33-56-H/01_', obor: 'Truhlář', nazev: 'B', b: udaje({ nepr_kapacita: 3 }) },
    { id: '3_65-51-H/01_', obor: 'Kuchař', nazev: 'C', b: udaje() },
  ];
  const o = { udaje: k => k.b, minuty: () => undefined, nazev: k => k.nazev };
  assert.deepEqual(U.navrhniUcebniPojistku(kand, () => false, new Set(['33-56-H/01']), o).map(k => k.id), ['1_33-56-H/01_']);
  assert.deepEqual(U.navrhniUcebniPojistku(kand, () => false, new Set(), o), []);
  assert.deepEqual(navrhniPojistku(kand, () => false, new Set(['Truhlář']), { skupina: () => null, minuty: () => undefined, nazev: k => k.nazev }), []);
});

test('patička rozsahu výsledků jmenuje jen kategorie ve výsledcích', () => {
  assert.equal(U.rozsahVysledku([]), 'denních nezkrácených oborů s jednotnou zkouškou');
  assert.equal(U.rozsahVysledku(['H', 'E']), 'denních nezkrácených oborů s jednotnou zkouškou a učebních oborů');
  assert.equal(U.rozsahVysledku(['H', 'P', 'C', 'J']),
    'denních nezkrácených oborů s jednotnou zkouškou, učebních oborů, oborů s talentovou zkouškou bez jednotné zkoušky, praktických škol a oborů bez maturity i výučního listu');
});

test('blok učebních oborů: věta, bez bodů, pásma a odznaku obtížnosti, bez poznámky o zaměření', () => {
  const n = { id: '1_33-56-H/01_nabytek', slug: 's', nazev: 'SOU', program: 'Truhlář', obec: 'Brno', zamereni: 'Nábytek' };
  const html = renderToStaticMarkup(React.createElement(SeznamUcebnichOboru, {
    nabidky: [n], radek: () => undefined, minuty: () => undefined, rok: 2026, rokKriterii: 2026, minPrijatych: 10,
    isSaved: () => false, onToggleSave() {}, popis: U.popisBlokuUcebnichOboru(2026),
    veta: () => U.vetaUcebnihoOboru(U.vyhodnotUcebniObor(udaje()), 2026),
  }));
  assert.match(html, /Učební obory \(1\)/);
  assert.match(html, /nikoho neodmítli kvůli počtu míst/);
  assert.doesNotMatch(html, /bod|pásm|extra body|neznají zaměření|obtížnost/i);
  assert.equal(renderToStaticMarkup(React.createElement(SeznamUcebnichOboru, {
    nabidky: [], radek: () => undefined, minuty: () => undefined, rok: 2026, rokKriterii: null, minPrijatych: 10,
    isSaved: () => false, onToggleSave() {}, popis: '', veta: () => '',
  })), '');
});
