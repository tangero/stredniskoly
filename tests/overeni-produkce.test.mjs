import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adresaZKriteria, vyberZadani, vytvorNacitac, overKriterium, splneno, posledniStav, rozhodniZapis, textKomentare, PRODLEVA,
} from '../scripts/brana/overeni-produkce.mjs';

const DEN = 86400000;
const TED = Date.parse('2026-10-12T06:00:00Z');
const konfig = { rezimy: { vlastnik: 'tangero', asistent: 'eduarda-prijimacky' } };
const WEB = 'https://www.prijimackynaskolu.cz';

test('K4: adresa a očekávaný text z kritéria, bez adresy se automaticky neověřuje', () => {
  assert.deepEqual(adresaZKriteria('K1: Karta školy - ověření: /skola/x „Obory“'), { adresa: '/skola/x', ocekavany: 'Obory' });
  assert.deepEqual(adresaZKriteria('K2: Filtr - ověření: náhled /mesto/praha, 390 a 1280 px'), { adresa: '/mesto/praha', ocekavany: null });
  assert.deepEqual(adresaZKriteria('K3: x - ověření: /simulator "Seřadit"'), { adresa: '/simulator', ocekavany: 'Seřadit' });
  assert.equal(adresaZKriteria('P1: adresy beze změny - ověření: npm run build'), null);
  assert.equal(adresaZKriteria('K4: test - ověření: test v tests/brana.test.mjs'), null);
  assert.equal(adresaZKriteria('K5: bez ověření'), null);
  assert.equal(adresaZKriteria('K6: x - ověření: diff v souboru /scripts/brana/brana.mjs'), null);
  assert.equal(adresaZKriteria('K7: x - ověření: /.github/workflows/testy.yml'), null);
});

test('výběr zadání: sloučené do main za 14 dní, jen zadání vlastníka nebo asistenta s aspoň jedním webovým kritériem', () => {
  const pr = (cislo, telo, dny, o = {}) => ({ cislo, titulek: `PR ${cislo}`, telo, slouceno: new Date(TED - dny * DEN).toISOString(), zakladna: 'main', stitky: ['oblast:detail'], ...o });
  const telo = '- [ ] K1: Karta - ověření: /skola/x „Obory“\n- P1: build - ověření: npm run build';
  const issues = { 10: { autor: 'tangero', telo }, 11: { autor: 'nekdo', telo }, 12: { autor: 'tangero', telo: 'bez kritérií' }, 13: { autor: 'tangero', telo }, 14: { autor: 'tangero', telo: '- [ ] K1: test - ověření: npm test' } };
  const z = vyberZadani([
    pr(1, 'Closes #10', 3), pr(2, 'Closes #11', 3), pr(3, 'Closes #12', 3), pr(4, 'Closes #13', 20), pr(5, 'Souvisí s #10', 2), pr(6, 'Closes #10', 1, { slouceno: null }), pr(7, 'Closes #14', 1),
  ], issues, { ted: TED, konfig });
  assert.deepEqual(z.map((x) => x.pr), [1]);
  assert.deepEqual(z[0].kriteria.map((k) => [k.oznaceni, k.web?.adresa ?? null]), [['K1', '/skola/x'], ['P1', null]]);
  assert.deepEqual(z[0].oblasti, ['oblast:detail']);
});

test('K2: kritérium s adresou a textem se ověří na 390 i 1280 px (mock, bez sítě)', async () => {
  const volani = [];
  const nacti = async (url, sirka) => { volani.push([url, sirka]); return { status: 200, text: 'Obory školy' }; };
  const k = { oznaceni: 'K1', web: { adresa: '/skola/x', ocekavany: 'Obory' } };
  const v = await overKriterium(k, nacti, WEB);
  assert.deepEqual(volani, [[`${WEB}/skola/x`, 390], [`${WEB}/skola/x`, 1280]]);
  assert.deepEqual(v.vysledky, { 390: 'splněno', 1280: 'splněno' });
  const chybi = await overKriterium(k, async () => ({ status: 200, text: 'Jiný text' }), WEB);
  assert.equal(splneno(chybi), false);
  assert.match(chybi.vysledky[390], /chybí očekávaný text/);
  const nenalezeno = await overKriterium(k, async () => ({ status: 404, text: '' }), WEB);
  assert.match(nenalezeno.vysledky[1280], /HTTP 404/);
  const bez = await overKriterium({ oznaceni: 'P1', web: null }, nacti, WEB);
  assert.equal(bez.vysledky, null);
  assert.equal(splneno(bez), true);
});

test('K6: načítání postupně s prodlevou 2 s mezi stránkami, žádný souběh', async () => {
  const deje = [];
  let probiha = 0, maxSoubeh = 0;
  const nacti = async (url) => { probiha++; maxSoubeh = Math.max(maxSoubeh, probiha); deje.push(`načti ${url}`); await new Promise((r) => setTimeout(r, 5)); probiha--; return { status: 200, text: '' }; };
  const spi = async (ms) => { deje.push(`spi ${ms}`); };
  const nacitac = vytvorNacitac(nacti, { spi });
  await Promise.all([nacitac('a', 390), nacitac('b', 390), nacitac('c', 1280)]);
  assert.equal(maxSoubeh, 1);
  assert.deepEqual(deje, ['načti a', `spi ${PRODLEVA}`, 'načti b', `spi ${PRODLEVA}`, 'načti c']);
  assert.equal(PRODLEVA, 2000);
});

test('K3: zápis jen poprvé, při regresi a po opravě; upozornění a issue při nesplnění', () => {
  assert.deepEqual(rozhodniZapis(null, true), { komentar: true, upozornit: false, druh: 'prvni' });
  assert.deepEqual(rozhodniZapis(null, false), { komentar: true, upozornit: true, druh: 'chyba' });
  assert.deepEqual(rozhodniZapis('ok', false), { komentar: true, upozornit: true, druh: 'regrese' });
  assert.deepEqual(rozhodniZapis('chyba', true), { komentar: true, upozornit: false, druh: 'oprava' });
  assert.equal(rozhodniZapis('ok', true).komentar, false);
  assert.equal(rozhodniZapis('chyba', false).upozornit, false);
});

test('K1: komentář „Ověřeno v produkci“ s commitem produkce a značkou stavu, kterou čte další běh', () => {
  const vysledky = [
    { oznaceni: 'K1', adresa: '/skola/x', vysledky: { 390: 'splněno', 1280: 'nesplněno (HTTP 500)' } },
    { oznaceni: 'P1', adresa: null, vysledky: null },
  ];
  const telo = textKomentare({ sha: 'abcdef1234567', zakladni: WEB, vysledky, druh: 'regrese' });
  assert.match(telo, /^## Ověřeno v produkci: regrese\n\nCommit produkce: abcdef1\n/);
  assert.match(telo, /\| K1 \| \/skola\/x \| splněno \| nesplněno \(HTTP 500\) \|/);
  assert.match(telo, /\| P1 \| – \| nejde ověřit automaticky \| nejde ověřit automaticky \|/);
  // Komentář v PR nesmí vypadat jako protokol z preview, aby ho brána nepočítala.
  assert.doesNotMatch(telo, /Protokol z preview/);
  assert.equal(posledniStav([{ autor: 'github-actions[bot]', telo }]), 'chyba');
  assert.equal(posledniStav([{ autor: 'nekdo', telo }]), null);
  const ok = textKomentare({ sha: 'abcdef1234567', zakladni: WEB, vysledky: [vysledky[1]], druh: 'prvni' });
  assert.equal(posledniStav([{ autor: 'github-actions[bot]', telo }, { autor: 'github-actions[bot]', telo: ok }]), 'ok');
});

test('chyba spojení se zkusí jednou znovu, opakovaná chyba je nesplnění', async () => {
  const k = { oznaceni: 'K1', web: { adresa: '/', ocekavany: null } };
  let pokusy = 0;
  const jednou = async () => { pokusy++; if (pokusy % 2) throw new Error('net::ERR_CONNECTION_RESET'); return { status: 200, text: '' }; };
  assert.equal(splneno(await overKriterium(k, jednou, WEB)), true);
  const vzdy = async () => { throw new Error('net::ERR_CONNECTION_RESET'); };
  const v = await overKriterium(k, vzdy, WEB);
  assert.match(v.vysledky[390], /^nesplněno \(net::ERR_CONNECTION_RESET\)$/);
});

test('strop načtení platí i pro opakování po chybě spojení', async () => {
  const nacitac = vytvorNacitac(async () => ({ status: 200, text: '' }), { spi: async () => {}, strop: 2 });
  await nacitac('a', 390);
  await nacitac('b', 390);
  await assert.rejects(nacitac('c', 390), /strop 2/);
});

test('vyčerpaný strop není nesplnění', async () => {
  const nacitac = vytvorNacitac(async () => ({ status: 200, text: '' }), { spi: async () => {}, strop: 1 });
  const v = await overKriterium({ oznaceni: 'K1', web: { adresa: '/', ocekavany: null } }, nacitac, WEB);
  assert.equal(v.vysledky[390], 'splněno');
  assert.equal(v.vysledky[1280], 'neověřeno (strop načtení)');
  assert.equal(splneno(v), true);
});
