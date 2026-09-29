import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  hodnotaHranice, klicPasma, nactiIndexPasem, polohaVuciPasmu, rozdelDoSkupin, seradNabidky, vetaPolohy, PORADI_SKUPIN,
} from '../src/lib/poloha-vuci-pasmu.ts';

// Návrh simulátoru, oddíl 10: čistá funkce skupiny na všech krajních případech.
const MIN = 10;
const radek = (over = {}) => ({
  min_prijaty: 40, dolni_mez: 40, horni_mez: 50, soutezicich: 100, prijatych: 60, neveslo_se: 40,
  v_pasmu_soutezilo: 30, v_pasmu_prijato: 12, nikdo_neodmitnut: false, talentova: false, druh: 4,
  extra_body: false, obec: 'Brno', ...over,
});
const p = (body, over, druh = 4) => polohaVuciPasmu(body, over === undefined ? undefined : radek(over), druh, MIN);

test('nad, v, pod u běžného pásma; meze patří do pásma', () => {
  assert.equal(p(51, {}).skupina, 'nad');
  assert.equal(p(50, {}).skupina, 'v');
  assert.equal(p(45, {}).skupina, 'v');
  assert.equal(p(40, {}).skupina, 'v');
  assert.equal(p(39.5, {}).skupina, 'pod');
  assert.equal(p(45, {}).tvar, 'bezne');
});

test('shodné meze: přesně na mezi v pásmu, jinak nad a pod', () => {
  const o = { dolni_mez: 44, horni_mez: 44, min_prijaty: 44, v_pasmu_soutezilo: 3, v_pasmu_prijato: 1 };
  assert.deepEqual([p(44, o).skupina, p(44, o).tvar], ['v', 'shodne_meze']);
  assert.equal(p(45, o).skupina, 'nad');
  assert.equal(p(43, o).skupina, 'pod');
  assert.match(vetaPolohy(p(44, o), 2026, MIN), /Přesně s tímto výsledkem \(44 bodů\)/);
});

test('horní mez pod dolní: od dolní nad, do horní pod, mezi nimi hranice', () => {
  const o = { dolni_mez: 46, horni_mez: 42, min_prijaty: 46, v_pasmu_soutezilo: 0, v_pasmu_prijato: 0 };
  assert.equal(p(46, o).skupina, 'nad');
  assert.equal(p(42, o).skupina, 'pod');
  const mezi = p(44, o);
  assert.deepEqual([mezi.skupina, mezi.tvar], ['v', 'mezera']);
  assert.match(vetaPolohy(mezi, 2026, MIN), /ležela právě tady/);
});

test('nikdo neodmítnut: vlastní skupina bez ohledu na body i při málo přijatých', () => {
  const o = { nikdo_neodmitnut: true, neveslo_se: 0, soutezicich: 60, dolni_mez: null, horni_mez: null, v_pasmu_soutezilo: null, v_pasmu_prijato: null };
  assert.equal(p(90, o).skupina, 'nikdo_neodmitnut');
  assert.equal(p(5, o).skupina, 'nikdo_neodmitnut');
  assert.equal(p(5, { ...o, prijatych: 4, soutezicich: 4 }).skupina, 'nikdo_neodmitnut');
  assert.doesNotMatch(vetaPolohy(p(5, { ...o, prijatych: 4, soutezicich: 4 }), 2026, MIN), /Nejnižší/);
  assert.match(vetaPolohy(p(5, o), 2026, MIN), /nikoho neodmítli kvůli počtu míst/);
});

test('méně než deset přijatých je bez srovnání, nikdy pod pásmem', () => {
  const r = p(0, { prijatych: 9, neveslo_se: 91, dolni_mez: null, horni_mez: null });
  assert.deepEqual([r.skupina, r.duvod], ['bez_srovnani', 'malo_prijatych']);
});

test('chybějící data: obor mimo index i chybějící počty', () => {
  assert.deepEqual([p(50, undefined).skupina, p(50, undefined).duvod], ['bez_srovnani', 'chybi_data']);
  assert.equal(p(50, { soutezicich: null }).duvod, 'chybi_data');
  assert.equal(p(50, { min_prijaty: null }).duvod, 'malo_prijatych');
});

test('rozpor počtů jde do bez srovnání', () => {
  assert.equal(p(50, { soutezicich: 99 }).duvod, 'rozpor');
  assert.equal(p(50, { v_pasmu_prijato: 31 }).duvod, 'rozpor');
  assert.equal(p(50, { v_pasmu_soutezilo: null }).duvod, 'rozpor');
  assert.equal(p(50, { nikdo_neodmitnut: true }).duvod, 'rozpor');
});

test('talentové obory a jiný druh testu jsou bez srovnání', () => {
  assert.equal(p(90, { talentova: true }).duvod, 'talentova');
  assert.equal(p(90, { druh: 8 }, 4).duvod, 'jiny_test');
  assert.equal(p(90, { druh: 8 }, 8).skupina, 'nad');
});

test('bez pásma (málo nevešlých): pod nejnižším přijatým pod, jinak bez srovnání', () => {
  const o = { neveslo_se: 3, soutezicich: 63, dolni_mez: null, horni_mez: null, v_pasmu_soutezilo: null, v_pasmu_prijato: null };
  assert.equal(p(39, o).skupina, 'pod');
  assert.equal(p(41, o).duvod, 'malo_odmitnutych');
});

test('věty nesou rok a přesné počty, žádné procento', () => {
  const v = vetaPolohy(p(45, {}), 2031, MIN);
  assert.match(v, /2031/);
  assert.match(v, /z 30 soutěžících uchazečů v rozmezí 40–50 bodů se v 1\. kole 2031 dostalo 12/);
  for (const body of [30, 45, 60]) assert.doesNotMatch(vetaPolohy(p(body, {}), 2031, MIN), /%|šanc/);
});

test('řazení: dojezd, pak název; hranice od nejvyšší, málo přijatých na konec', () => {
  const n = [
    { id: 'a', m: 20, h: 40 }, { id: 'b', m: 10, h: null }, { id: 'c', m: undefined, h: 70 }, { id: 'd', m: 10, h: 55 },
  ];
  const o = { minuty: x => x.m, nazev: x => x.id, hranice: x => x.h };
  assert.deepEqual(seradNabidky(n, 'dojezd', o).map(x => x.id), ['b', 'd', 'a', 'c']);
  assert.deepEqual(seradNabidky(n, 'hranice', o).map(x => x.id), ['c', 'd', 'a', 'b']);
  assert.equal(hodnotaHranice(radek({ prijatych: 9 }), MIN), null);
  assert.equal(hodnotaHranice(radek(), MIN), 40);
  assert.equal(hodnotaHranice(undefined, MIN), null);
});

test('klíč pásma zahodí zaměření', () => {
  assert.equal(klicPasma('600001661_79-41-K/41_Gymnazium'), '600001661_79-41-K/41');
  assert.equal(klicPasma('600001431_79-41-K/41'), '600001431_79-41-K/41');
});

test('skutečný index: každý obor dostane skupinu a nikdo neodmítnut sedí s indexem', () => {
  const reg = JSON.parse(fs.readFileSync('public/stav_datovych_sad.json', 'utf8'));
  const rok = reg.sady['cermat-uchazeci-kolo1'].zobrazeno.obdobi;
  const index = nactiIndexPasem(JSON.parse(fs.readFileSync(`public/simulator_pasma_${rok}.json`, 'utf8')));
  assert.equal(index.rok, Number(rok));
  const nabidky = [...index.data.keys()].map(id => ({ id }));
  for (const druh of [4, 6, 8]) {
    const skupiny = rozdelDoSkupin(nabidky, n => polohaVuciPasmu(60, index.data.get(n.id), druh, index.min_prijatych_pro_hranici));
    assert.equal(PORADI_SKUPIN.reduce((s, k) => s + skupiny.get(k).length, 0), nabidky.length);
    const nikdo = [...index.data.values()].filter(r => r.nikdo_neodmitnut && !r.talentova && r.druh === druh).length;
    assert.equal(skupiny.get('nikdo_neodmitnut').length, nikdo);
  }
});
