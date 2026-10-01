// ============================================================================
// Porovnání katalogu s kartami DiPSy (scripts/dipsy-shoda-kliku.mjs, #208).
// Klíče jsou hashe, proto výsledek musí vypsat složky nespárovaných nabídek:
// jinak u měření 2027 proti 2026 nejde poznat, co se změnilo.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

// Import skriptu nesmí sahat na síť (hlavní běh se spouští jen přímo).
let dotazu = 0;
globalThis.fetch = () => { dotazu++; throw new Error('test nesmí volat DiPSy'); };
const { porovnejSkolu, rozborOdpovedi, poctyShody } = await import('../scripts/dipsy-shoda-kliku.mjs');

const REDIZO = '600000001';
test('import skriptu nespustí měření', () => {
  assert.equal(dotazu, 0);
});

const nabidka = (kkov, zamereni = '') => ({ id: `${REDIZO}_${kkov}`, redizo: REDIZO, izo: 'izo_100000001', kkov, zamereni, forma: 'den', delka_studia: 4 });
const karta = (kkov, zamereni, delka = 4) => ({ zamereni, skola: { izo: '100000001' }, skolniObor: { kod: kkov, formaStudia: 'formaStudia/den', delkaStudia: delka } });

test('spárované nabídky se nevypisují, nespárované se složkami klíče ano', () => {
  const v = porovnejSkolu(REDIZO,
    [nabidka('79-41-K/41'), nabidka('78-42-M/02', 'Ekonomika')],
    [karta('79-41-K/41', ''), karta('78-42-M/02', 'Cestovní ruch'), karta('65-51-H/01', '', 3)]);
  assert.equal(v.shoda, 1);
  assert.equal(v.jenKatalog, 1);
  assert.equal(v.jenDipsy, 2);
  assert.deepEqual(v.nesparovaneKatalog, [
    { id: `${REDIZO}_78-42-M/02`, izo: 'izo_100000001', kkov: '78-42-M/02', zamereni: 'Ekonomika', forma: 'den', delka: 4 },
  ]);
  assert.deepEqual(v.nesparovaneDipsy, [
    { izo: '100000001', kkov: '78-42-M/02', zamereni: 'Cestovní ruch', forma: 'formaStudia/den', delka: 4 },
    { izo: '100000001', kkov: '65-51-H/01', zamereni: '', forma: 'formaStudia/den', delka: 3 },
  ]);
  // Bez zaměření se změněné zaměření téhož kódu spáruje: rozdíl je právě v zaměření.
  assert.equal(v.shodaBezZamereni, 2);
});

test('plná shoda nechá seznamy nespárovaných prázdné', () => {
  const v = porovnejSkolu(REDIZO, [nabidka('79-41-K/41')], [karta('79-41-K/41', '')]);
  assert.deepEqual([v.shoda, v.nesparovaneKatalog, v.nesparovaneDipsy], [1, [], []]);
});

test('neúplná karta měření neshodí, vypíše se zvlášť a ruší plnou shodu školy', () => {
  const neupln = { id: 'k1', zamereni: '', skola: { izo: '100000001' }, skolniObor: { kod: '65-51-H/01' } };
  const v = porovnejSkolu(REDIZO, [nabidka('79-41-K/41')], [karta('79-41-K/41', ''), neupln]);
  assert.deepEqual([v.shoda, v.shodaBezZamereni, v.jenDipsy], [1, 1, 0]);
  assert.deepEqual(v.neuplneKarty, [{ id: 'k1', izo: '100000001', kkov: '65-51-H/01', forma: null, delka: null }]);

  const cista = porovnejSkolu(REDIZO, [nabidka('79-41-K/41')], [karta('79-41-K/41', '')]);
  const bezShody = porovnejSkolu(REDIZO, [nabidka('79-41-K/41')], [karta('79-41-K/41', 'Jiné zaměření')]);
  const chyba = { redizo: REDIZO, nabidek: 1, karet: null, shoda: null, chyba: 'neúplná odpověď DiPSy' };
  // Jen neúplné karty: shoda 0, ale změřit ji nešlo, takže to není „bez shody“.
  const jenNeuplne = porovnejSkolu(REDIZO, [nabidka('79-41-K/41'), nabidka('78-42-M/02')], [neupln]);
  const castecna = porovnejSkolu(REDIZO, [nabidka('79-41-K/41'), nabidka('78-42-M/02')], [karta('79-41-K/41', ''), neupln]);
  assert.deepEqual(poctyShody([v, cista, bezShody, chyba, jenNeuplne, castecna]),
    { skolSeShodouVsechNabidek: 1, skolSCastiShodou: 0, skolBezShody: 1, skolSNeuplnymiKartami: 3 });
});

test('odpověď bez pole data je chyba API, ne škola bez karet', () => {
  for (const body of [{ meta: { totalCount: 0 } }, { data: null, meta: { totalCount: 0 } }, { data: {}, meta: { totalCount: 0 } }, null]) {
    assert.equal(rozborOdpovedi(body).chyba, 'odpověď bez pole data', JSON.stringify(body));
  }
  assert.deepEqual(rozborOdpovedi({ data: [], meta: { totalCount: 0 } }), { karty: [], totalCount: 0 });
});

test('karta s polem jiného typu měření neshodí a skončí mezi neúplnými', () => {
  const zla = [
    { ...karta('65-51-H/01', ''), skola: { izo: 100000001 } },
    { ...karta('65-51-H/01', ''), skolniObor: { kod: 6551, formaStudia: 'formaStudia/den', delkaStudia: 3 } },
    { ...karta('65-51-H/01', ''), zamereni: { nazev: 'x' } },
    null,
  ];
  const v = porovnejSkolu(REDIZO, [nabidka('79-41-K/41')], [karta('79-41-K/41', ''), ...zla]);
  assert.deepEqual([v.shoda, v.jenDipsy, v.neuplneKarty.length], [1, 0, 4]);
});
