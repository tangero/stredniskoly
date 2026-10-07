import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rezim, posudOdpoved, zkontroluj, posunStav, novyStav, textAkce, souhrnTydne, kvantil,
  provedAkce, zaznamenejIssue, ADRESY, KOSE,
} from '../scripts/provoz/dostupnost.mjs';
import { sestavPrehled, kratkaDostupnost } from '../scripts/prehled/tydenni.mjs';

const T0 = Date.parse('2026-08-15T10:00:00Z');
const MIN = 60000;
const ok = (ms = 300, cesta = '/') => ({ cesta, ok: true, status: 200, ms, duvod: '' });
const chyba = (cesta = '/') => ({ cesta, ok: false, status: 503, ms: 100, duvod: 'stavový kód 503' });

// K5: zvýšený režim v zamrznutí a v sezóně, jinak běžný.
test('režim podle data: zamrznutí a sezóna zvýšený, léto běžný', () => {
  const zamrznuti = { od: '2027-01-28', do: '2027-02-02' };
  assert.equal(rezim(Date.parse('2027-01-30T10:00:00Z'), zamrznuti), 'zvyseny');
  assert.equal(rezim(Date.parse('2027-04-12T10:00:00Z'), zamrznuti), 'zvyseny');
  assert.equal(rezim(Date.parse('2026-08-15T10:00:00Z'), zamrznuti), 'bezny');
  assert.equal(rezim(Date.parse('2026-10-07T10:00:00Z')), 'bezny');
  assert.equal(rezim(Date.parse('2026-08-15T10:00:00Z'), { od: '2026-08-10', do: '2026-08-20' }), 'zvyseny');
});

test('posouzení odpovědi: kód, klíčový text, chyba spojení', () => {
  assert.equal(posudOdpoved({ status: 200, text: 'Přijímačky', ms: 5 }, 'Přijímačky').ok, true);
  assert.match(posudOdpoved({ status: 200, text: 'x', ms: 5 }, 'Přijímačky').duvod, /klíčový text/);
  assert.match(posudOdpoved({ status: 502, ms: 5 }, 'x').duvod, /502/);
  assert.equal(posudOdpoved({ chyba: 'timeout', ms: 5 }, 'x').status, 0);
});

// K2: selhání se ověří druhým dotazem po 30 s; jednorázové selhání nic neotevře.
test('selhání se v témže běhu ověří druhým dotazem po 30 s', async () => {
  const volani = [];
  const spanky = [];
  let n = 0;
  const nacti = async (url) => {
    volani.push(url);
    if (url.endsWith('/simulator') && ++n === 1) return { status: 503, text: '' };
    return { status: 200, text: ADRESY.map((a) => a.text).join(' ') };
  };
  const v = await zkontroluj(ADRESY, nacti, { spi: async (ms) => { spanky.push(ms); } });
  assert.equal(volani.length, ADRESY.length + 1, 'jen jeden opakovaný dotaz, nejvýš 10 na běh');
  assert.deepEqual(spanky, [30000]);
  assert.ok(v.every((x) => x.ok));
  // Jednorázové selhání v běžném režimu výpadek neotevře.
  const r = posunStav(novyStav(), [chyba(), ok(300, '/x')], { ted: T0, rezimBehu: 'bezny' });
  assert.deepEqual(r.akce, []);
  const dalsi = posunStav(r.stav, [ok(), ok(300, '/x')], { ted: T0 + 5 * MIN, rezimBehu: 'bezny' });
  assert.deepEqual(dalsi.akce, []);
  assert.equal(dalsi.stav.adresy['/'].selhani, 0);
});

// K3 a K4: výpadek otevře jedno issue, během trvání jen připomínka po 6 h, obnovení jednou.
test('výpadek: otevření po 2 bězích, ticho, připomínka po 6 h, obnovení', () => {
  let stav = novyStav();
  const akce = [];
  let t = T0;
  for (let i = 0; i < 6; i++, t += 5 * MIN) {
    const r = posunStav(stav, [chyba()], { ted: t, rezimBehu: 'bezny' });
    stav = r.stav;
    for (const a of r.akce) { akce.push(a); if (a.akce === 'otevri') zaznamenejIssue(stav, a.cesta, a.druh, 77); }
  }
  assert.deepEqual(akce.map((a) => a.akce), ['otevri'], 'v 6 bězích jedno otevření a nic víc');
  const po6h = posunStav(stav, [chyba()], { ted: T0 + 5 * MIN + 6 * 3600000, rezimBehu: 'bezny' });
  assert.deepEqual(po6h.akce.map((a) => a.akce), ['pripomen']);
  assert.equal(po6h.akce[0].issue, 77);
  const obnoveno = posunStav(po6h.stav, [ok()], { ted: T0 + 7 * 3600000, rezimBehu: 'bezny' });
  assert.deepEqual(obnoveno.akce.map((a) => a.akce), ['obnoveno']);
  assert.equal(obnoveno.akce[0].issue, 77);
  assert.equal(obnoveno.stav.adresy['/'].vypadek, null);
  assert.deepEqual(posunStav(obnoveno.stav, [ok()], { ted: T0 + 8 * 3600000, rezimBehu: 'bezny' }).akce, []);
});

test('zvýšený režim otevře výpadek hned a připomíná po 30 min', () => {
  const r = posunStav(novyStav(), [chyba()], { ted: T0, rezimBehu: 'zvyseny' });
  assert.deepEqual(r.akce.map((a) => a.akce), ['otevri']);
  const ticho = posunStav(r.stav, [chyba()], { ted: T0 + 10 * MIN, rezimBehu: 'zvyseny' });
  assert.deepEqual(ticho.akce, []);
  const pripominka = posunStav(ticho.stav, [chyba()], { ted: T0 + 31 * MIN, rezimBehu: 'zvyseny' });
  assert.deepEqual(pripominka.akce.map((a) => a.akce), ['pripomen']);
});

// K6: pomalý web zvlášť od výpadku, po třech bězích s mediánem nad prahem.
test('pomalá odezva ve 3 bězích se ohlásí jako pomalý web, ne jako výpadek', () => {
  let stav = novyStav();
  const druhy = [];
  for (let i = 0; i < 4; i++) {
    const r = posunStav(stav, [ok(4000)], { ted: T0 + i * 5 * MIN, rezimBehu: 'bezny' });
    stav = r.stav;
    druhy.push(...r.akce.map((a) => `${a.druh}:${a.akce}`));
  }
  assert.deepEqual(druhy, ['pomaly:otevri']);
  const zpet = posunStav(stav, [ok(200)], { ted: T0 + 30 * MIN, rezimBehu: 'bezny' });
  assert.deepEqual(zpet.akce, [], 'jedna rychlá odezva medián ještě nesníží');
  const zpet2 = posunStav(zpet.stav, [ok(200)], { ted: T0 + 35 * MIN, rezimBehu: 'bezny' });
  assert.deepEqual(zpet2.akce.map((a) => `${a.druh}:${a.akce}`), ['pomaly:obnoveno']);
  // Ve zvýšeném režimu je práh nižší (2 s).
  let s2 = novyStav();
  const akce2 = [];
  for (let i = 0; i < 3; i++) { const r = posunStav(s2, [ok(2500)], { ted: T0 + i * 5 * MIN, rezimBehu: 'zvyseny' }); s2 = r.stav; akce2.push(...r.akce); }
  assert.equal(akce2.length, 1);
});

test('texty akcí: bez osobních údajů, jen adresa, kód a čas', () => {
  const t = textAkce({ druh: 'vypadek', cesta: '/simulator', akce: 'otevri', od: T0, duvod: 'stavový kód 503', status: 503 }, T0);
  assert.equal(t.titulek, 'Výpadek: /simulator');
  assert.match(t.telo, /dostupnost:vypadek=\/simulator/);
  assert.match(t.telegram, /https:\/\/www\.prijimackynaskolu\.cz\/simulator/);
  assert.doesNotMatch(JSON.stringify(t), /@|\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
});

test('provedAkce: otevře issue, zapíše číslo, pošle Telegram; obnovení zavře issue', async () => {
  const volani = [];
  const api = async (cesta, o = {}) => { volani.push(`${o.method || 'GET'} ${cesta}`); return { number: 12 }; };
  const zpravy = [];
  const stav = posunStav(novyStav(), [chyba()], { ted: T0, rezimBehu: 'zvyseny' }).stav;
  await provedAkce([{ druh: 'vypadek', cesta: '/', akce: 'otevri', od: T0, duvod: 'x', status: 503 }], stav, { api, telegram: async (t) => zpravy.push(t), ted: T0 });
  assert.equal(stav.adresy['/'].vypadek.issue, 12);
  assert.equal(zpravy.length, 1);
  await provedAkce([{ druh: 'vypadek', cesta: '/', akce: 'obnoveno', od: T0, issue: 12 }], stav, { api, telegram: async (t) => zpravy.push(t), ted: T0 + 20 * MIN });
  assert.ok(volani.includes('PATCH repos/tangero/stredniskoly/issues/12'));
  assert.equal(zpravy.length, 2);
  // Chyba GitHubu nezastaví zbylé akce.
  const selhani = async () => { throw new Error('API 500'); };
  await provedAkce([{ druh: 'vypadek', cesta: '/', akce: 'otevri', od: T0, duvod: 'x', status: 0 }], stav, { api: selhani, telegram: async () => {}, ted: T0 });
});

// K7: týdenní souhrn a oddíl přehledu.
test('týdenní souhrn dostupnosti a oddíl Dostupnost v přehledu', () => {
  let stav = novyStav();
  for (let i = 0; i < 20; i++) stav = posunStav(stav, [i === 5 ? chyba() : ok(i < 19 ? 400 : 4000)], { ted: T0 + i * 5 * MIN, rezimBehu: 'bezny' }).stav;
  const [s] = souhrnTydne(stav, T0 + 2 * 3600000);
  assert.equal(s.kontrol, 20);
  assert.equal(s.dostupnost, 95);
  assert.equal(s.podil5xx, 5);
  assert.equal(s.p50, 500);
  assert.equal(kvantil([0, 0, 0], 0.5), null);
  assert.ok(KOSE.includes(s.p95));
  const zaklad = {
    od: T0 - 7 * 86400000, ted: T0, slouceno: [], rozhodnuti: [], navrhy: [], zastavene: [], cekajiNaSouhlas: [], cervenaMain: [], expirace: {},
    dostupnost: { adresy: [s], vypadky: [{ cislo: 410, titulek: 'Výpadek: /', od: '2026-08-12T10:00:00Z', do: '2026-08-12T11:00:00Z' }] },
  };
  const { kratky, dlouhy } = sestavPrehled(zaklad);
  assert.match(dlouhy, /## Dostupnost\n[\s\S]*\| \/ \| 20 \| 95 % \| 500 ms \|/);
  assert.match(dlouhy, /\[#410\].*Výpadek: \/ \(od 2026-08-12, skončil 2026-08-12\)/);
  assert.match(kratky, /Dostupnost webu: nejnižší 95 %, výpadků a pomalých úseků 1/);
  assert.equal(kratkaDostupnost(null), '');
  assert.match(sestavPrehled({ ...zaklad, dostupnost: { chyba: 'API 500' } }).dlouhy, /nepodařilo se načíst: API 500/);
});

test('statistiky starší než 8 dní se zahodí', () => {
  let stav = novyStav();
  stav = posunStav(stav, [ok()], { ted: T0, rezimBehu: 'bezny' }).stav;
  stav = posunStav(stav, [ok()], { ted: T0 + 9 * 86400000, rezimBehu: 'bezny' }).stav;
  assert.deepEqual(Object.keys(stav.statistiky), ['2026-08-24']);
});
