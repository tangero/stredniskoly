import { test } from 'node:test';
import assert from 'node:assert/strict';
import { konecTerminu, konecObdobi, sadyPoTerminu, oznamCerstvost, nactiRegistr, textCerstvost } from '../scripts/provoz/cerstvost.mjs';
import { sestavPrehled } from '../scripts/prehled/tydenni.mjs';

const sada = (zobrazeno, ocekavano, kdy, pouziti = 'web') => ({
  nazev: 'CERMAT, kapacity oborů, 1. kolo', pouziti, zobrazeno: { obdobi: zobrazeno }, ocekavano: { obdobi: ocekavano, kdy },
});
const registr = {
  sady: {
    'cermat-kapacity': sada('2026', '2027', '2027-03'),
    'msmt-rejstrik-snimky': sada('2026-06-30', '2026-09-30', '2026-10-15'),
    'uz-prepnuto': sada('2027', '2027', '2027-03'),
    analyza: sada('2025', '2027', '2027-03', 'analyza'),
    'bez-obdobi': sada('2026', null, '2027-05'),
    'bez-terminu': sada('2026', '2027', null),
  },
};

test('konec termínu: měsíc po celém měsíci, den po celém dni', () => {
  assert.equal(konecTerminu('2027-03'), Date.parse('2027-04-01T00:00:00Z'));
  assert.equal(konecTerminu('2026-12'), Date.parse('2027-01-01T00:00:00Z'));
  assert.equal(konecTerminu('2026-10-15'), Date.parse('2026-10-16T00:00:00Z'));
  assert.equal(konecTerminu(null), null);
  assert.equal(konecTerminu('jaro 2027'), null);
});

// K16: sada s `ocekavano.kdy` 2027-03 je 2027-04-05 po termínu, 2027-03-15 ne.
test('sady po termínu podle pevného data a registru', () => {
  assert.deepEqual(sadyPoTerminu(registr, Date.parse('2027-03-15T12:00:00Z')).map((s) => s.sada), ['msmt-rejstrik-snimky']);
  const duben = sadyPoTerminu(registr, Date.parse('2027-04-05T12:00:00Z'));
  assert.deepEqual(duben.map((s) => s.sada), ['cermat-kapacity', 'msmt-rejstrik-snimky']);
  assert.deepEqual(duben[0], { sada: 'cermat-kapacity', nazev: 'CERMAT, kapacity oborů, 1. kolo', zobrazeno: '2026', ocekavano: '2027', kdy: '2027-03' });
  // Den termínu ještě neplatí jako po termínu.
  assert.deepEqual(sadyPoTerminu(registr, Date.parse('2026-10-15T20:00:00Z')).map((s) => s.sada), []);
  assert.deepEqual(sadyPoTerminu({}, Date.now()), []);
});

test('skutečný registr se dá přečíst a posoudit', () => {
  const sady = sadyPoTerminu(nactiRegistr(), Date.parse('2030-01-01T00:00:00Z'));
  assert.ok(Array.isArray(sady));
  for (const s of sady) assert.ok(s.ocekavano === null || konecObdobi(s.zobrazeno) < konecObdobi(s.ocekavano), s.sada);
});

test('týdenní přehled: oddíl Čerstvost dat a řádek do Telegramu jen při sadě po termínu', () => {
  const zaklad = {
    od: 0, ted: Date.parse('2027-04-05T06:00:00Z'), slouceno: [], rozhodnuti: [], navrhy: [], zastavene: [],
    cekajiNaSouhlas: [], cervenaMain: [], expirace: {},
  };
  const po = sestavPrehled({ ...zaklad, cerstvost: { sady: sadyPoTerminu(registr, zaklad.ted) } });
  assert.match(po.dlouhy, /## Čerstvost dat/);
  assert.match(po.dlouhy, /CERMAT, kapacity oborů, 1\. kolo \(`cermat-kapacity`\): web ukazuje 2026, období 2027 se čekalo do 2027-03/);
  assert.match(po.kratky, /POZOR, data po termínu \(2\): cermat-kapacity, msmt-rejstrik-snimky/);
  const nic = sestavPrehled({ ...zaklad, cerstvost: { sady: [] } });
  assert.match(nic.dlouhy, /- žádná sada po termínu/);
  assert.doesNotMatch(nic.kratky, /data po termínu/);
  assert.match(sestavPrehled({ ...zaklad, cerstvost: { chyba: 'ENOENT' } }).dlouhy, /nepodařilo se přečíst registr: ENOENT/);
  assert.doesNotMatch(sestavPrehled(zaklad).dlouhy, /Čerstvost dat/);
});

// K17: ve zvýšeném režimu jde sada po termínu do Telegramu jednou za sadu a období.
test('zvýšený režim pošle sadu po termínu jednou za sadu a období', async () => {
  const ted = Date.parse('2027-04-05T06:00:00Z');
  const zpravy = [];
  const telegram = async (t) => { zpravy.push(t); };
  const stav = { verze: 1, adresy: {}, statistiky: {} };
  const sady = sadyPoTerminu(registr, ted);

  assert.equal(await oznamCerstvost(stav, sady, { rezimBehu: 'bezny', telegram, ted }), 0);
  assert.equal(zpravy.length, 0);
  assert.equal(stav.cerstvost, undefined, 'běžný režim stav nemění');

  assert.equal(await oznamCerstvost(stav, sady, { rezimBehu: 'zvyseny', telegram, ted }), 2);
  assert.match(zpravy[0], /^Data po termínu: CERMAT, kapacity oborů, 1\. kolo \(cermat-kapacity\)\. Web ukazuje 2026, období 2027 se čekalo do 2027-03\./);
  assert.match(zpravy[0], /https:\/\/github\.com\/tangero\/stredniskoly\/blob\/main\/public\/stav_datovych_sad\.json/);
  assert.deepEqual(Object.keys(stav.cerstvost), ['cermat-kapacity@2027', 'msmt-rejstrik-snimky@2026-09-30']);

  // Další běhy (i po uložení a načtení stavu z komentáře) nic nepošlou.
  const znovu = JSON.parse(JSON.stringify(stav));
  for (let i = 1; i <= 5; i++) await oznamCerstvost(znovu, sady, { rezimBehu: 'zvyseny', telegram, ted: ted + i * 300000 });
  assert.equal(zpravy.length, 2);

  // Přepnutá sada ze stavu vypadne; jiné očekávané období je nové upozornění.
  await oznamCerstvost(znovu, sady.slice(1), { rezimBehu: 'zvyseny', telegram, ted });
  assert.deepEqual(Object.keys(znovu.cerstvost), ['msmt-rejstrik-snimky@2026-09-30']);
  await oznamCerstvost(znovu, [{ ...sady[1], ocekavano: '2026-12-31' }], { rezimBehu: 'zvyseny', telegram, ted });
  assert.equal(zpravy.length, 3);
});

test('nepovedené odeslání se nezapíše a zkusí se v dalším běhu', async () => {
  const ted = Date.parse('2027-04-05T06:00:00Z');
  const sady = sadyPoTerminu(registr, ted).slice(0, 1);
  const stav = {};
  await oznamCerstvost(stav, sady, { rezimBehu: 'zvyseny', telegram: async () => { throw new Error('Telegram: 502'); }, ted });
  assert.deepEqual(stav.cerstvost, {});
  const zpravy = [];
  await oznamCerstvost(stav, sady, { rezimBehu: 'zvyseny', telegram: async (t) => { zpravy.push(t); }, ted });
  assert.equal(zpravy.length, 1);
});

// #507 K1: sada s `ocekavano.kdy` 2026-10 a bez očekávaného období je 2026-11-02 po termínu, 2026-10-20 ne.
test('sada bez očekávaného období je po termínu, když termín minul', () => {
  const r = { sady: { 'csi-inspekce': { nazev: 'ČŠI, inspekční zprávy', pouziti: 'web', zobrazeno: { obdobi: '2026-10-05' }, ocekavano: { obdobi: null, kdy: '2026-10' } } } };
  assert.deepEqual(sadyPoTerminu(r, Date.parse('2026-10-20T12:00:00Z')), []);
  assert.deepEqual(sadyPoTerminu(r, Date.parse('2026-11-02T12:00:00Z')), [
    { sada: 'csi-inspekce', nazev: 'ČŠI, inspekční zprávy', zobrazeno: '2026-10-05', ocekavano: null, kdy: '2026-10' },
  ]);
  // Bez termínu se sada bez očekávaného období dál neposuzuje.
  assert.deepEqual(sadyPoTerminu(registr, Date.parse('2030-01-01T00:00:00Z')).filter((s) => s.sada === 'bez-terminu'), []);
});

test('konec období: rok, měsíc a den; jiný tvar null', () => {
  assert.equal(konecObdobi('2026'), Date.parse('2027-01-01T00:00:00Z'));
  assert.equal(konecObdobi('2026-09'), Date.parse('2026-10-01T00:00:00Z'));
  assert.equal(konecObdobi('2026-09-30'), Date.parse('2026-10-01T00:00:00Z'));
  assert.equal(konecObdobi('prubezne'), null);
  assert.equal(konecObdobi(null), null);
});

// #507 K2: období se porovnávají podle konce, ne jako text; nerozpoznatelný tvar se nehlásí, jen varuje.
test('porovnání období podle data', () => {
  const ted = Date.parse('2027-01-15T12:00:00Z');
  const r = { sady: {
    'rok-proti-dni': sada('2026', '2026-09-30', '2026-10'),
    'den-proti-dni': sada('2026-06-30', '2026-09-30', '2026-10'),
    'rok-proti-roku': sada('2025', '2026', '2026-10'),
    nerozpoznatelne: sada('jaro 2026', '2026', '2026-10'),
  } };
  const varovani = [];
  const vysledek = sadyPoTerminu(r, ted, { varuj: (t) => varovani.push(t) });
  assert.deepEqual(vysledek.map((s) => s.sada), ['den-proti-dni', 'rok-proti-roku']);
  assert.equal(varovani.length, 1);
  assert.match(varovani[0], /nerozpoznatelne.*jaro 2026/);
});

// #507 K3: přehled i zpráva do Telegramu popíšou sadu bez očekávaného období bez textu „null“.
test('sada bez očekávaného období v přehledu a v Telegramu', async () => {
  const ted = Date.parse('2027-06-05T06:00:00Z');
  const sady = sadyPoTerminu(registr, ted).filter((s) => s.sada === 'bez-obdobi');
  assert.equal(sady.length, 1);
  const zaklad = { od: 0, ted, slouceno: [], rozhodnuti: [], navrhy: [], zastavene: [], cekajiNaSouhlas: [], cervenaMain: [], expirace: {} };
  const prehled = sestavPrehled({ ...zaklad, cerstvost: { sady } });
  assert.match(prehled.dlouhy, /\(`bez-obdobi`\): web ukazuje 2026, termín 2027-05 minul, nové období nezjištěno/);
  assert.doesNotMatch(prehled.dlouhy + prehled.kratky, /null/);
  assert.equal(textCerstvost(sady[0]).split('\n')[0], 'Data po termínu: CERMAT, kapacity oborů, 1. kolo (bez-obdobi). Web ukazuje 2026, termín 2027-05 minul, nové období nezjištěno.');

  // Deduplikace podle termínu; běžný režim nic neposílá (P2).
  const zpravy = [];
  const telegram = async (t) => { zpravy.push(t); };
  const stav = {};
  assert.equal(await oznamCerstvost(stav, sady, { rezimBehu: 'bezny', telegram, ted }), 0);
  assert.equal(zpravy.length, 0);
  assert.equal(await oznamCerstvost(stav, sady, { rezimBehu: 'zvyseny', telegram, ted }), 1);
  assert.equal(await oznamCerstvost(stav, sady, { rezimBehu: 'zvyseny', telegram, ted: ted + 300000 }), 0);
  assert.deepEqual(Object.keys(stav.cerstvost), ['bez-obdobi@termin-2027-05']);
  assert.doesNotMatch(zpravy.join('\n'), /null/);
});
