import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vahyZPercentilu, vyhodnotTermin, vyhodnot, DOSAH } from '../scripts/vyhodnoceni-prevodu-testu.mjs';

// Rovnoměrné rozdělení 0–100: percentil se středním pořadím (s + 0,5) / 101.
const rovnomerne = Array.from({ length: 101 }, (_, s) => Math.round(((s + 0.5) / 101) * 1000) / 10);
const radek = (o) => ({
  min_prijaty: 50, dolni_mez: 50, horni_mez: 55, soutezicich: 100, prijatych: 60, neveslo_se: 40,
  v_pasmu_soutezilo: 20, v_pasmu_prijato: 10, nikdo_neodmitnut: false, talentova: false, druh: 4,
  extra_body: null, obec: null, ...o,
});

test('váhy z percentilů: nezáporné, součet 1, rovnoměrné rozdělení zůstane rovnoměrné', () => {
  const w = vahyZPercentilu(rovnomerne);
  assert.ok(w.every((x) => x >= 0));
  assert.ok(Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.ok(Math.abs(w[50] - 1 / 101) < 0.001);
});

test('K1: posun o 3 body dá průměrný rozdíl 3 a změny skupin jen u výsledků blízko mezí', () => {
  const tabulka = Array.from({ length: 101 }, (_, s) => Math.min(100, s + 3));
  const w = vahyZPercentilu(rovnomerne);
  const v = vyhodnotTermin(tabulka, w, [radek()], 4, 10);
  assert.ok(Math.abs(v.prumerny_rozdil - 3) < 0.1);
  assert.equal(v.podil_rozdil_aspon_5, 0);
  // Skupina se mění pro 47–49 (pod → v) a 53–55 (v → nad): 6 výsledků ze 101.
  assert.ok(Math.abs(v.zmena_skupiny_vsechny_obory - 6 / 101) < 0.01);
  // V dosahu (±10 od nejnižšího přijatého) je 21–24 výsledků, z nich 6 se mění.
  assert.ok(v.zmena_skupiny_obory_v_dosahu > 0.2 && v.zmena_skupiny_obory_v_dosahu < 0.3);
  assert.equal(DOSAH, 10);
});

test('K2: bez převodu (tabulka = identita) se nic nemění; obor jiného druhu se nepočítá', () => {
  const identita = Array.from({ length: 101 }, (_, s) => s);
  const w = vahyZPercentilu(rovnomerne);
  const v = vyhodnotTermin(identita, w, [radek(), radek({ druh: 8 })], 4, 10);
  assert.equal(v.zmena_skupiny_vsechny_obory, 0);
  assert.equal(v.prumerny_rozdil, 0);
});

test('vyhodnot: jen spolehlivé termíny, průměr termínů se stejnou vahou', () => {
  const tab = (posun) => ({ percentil: rovnomerne, body_cil: Array.from({ length: 101 }, (_, s) => Math.max(0, Math.min(100, s + posun))) });
  const prevod = { rok_testu: 2024, druhy: { 4: { terminy: [
    { klic: '1-radny', resitelu: 10, spolehlive: true, celkem: tab(2) },
    { klic: '2-radny', resitelu: 10, spolehlive: true, celkem: tab(-2) },
    { klic: '1-nahradni', resitelu: 1, spolehlive: false, celkem: tab(20) },
  ] } } };
  const index = { rok: 2026, min_prijatych_pro_hranici: 10, data: new Map([['a', radek()]]) };
  const v = vyhodnot(prevod, index);
  assert.equal(v.druhy[4].terminy.length, 2);
  assert.ok(Math.abs(v.druhy[4].prumerny_rozdil) < 0.1);
  assert.ok(v.druhy[4].prumerny_rozdil_abs > 1.8);
});
