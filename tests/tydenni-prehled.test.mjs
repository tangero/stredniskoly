import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sestavPrehled, expiraceTokenu, MAX_POLOZEK } from '../scripts/prehled/tydenni.mjs';

const TED = Date.parse('2026-10-12T06:00:00Z');
const zaklad = {
  od: TED - 7 * 86400000, ted: TED,
  slouceno: [{ cislo: 300, titulek: 'Oprava věty', kdy: '2026-10-10T10:00:00Z', brana: 'Prošlo (R)' }],
  rozhodnuti: [{ cislo: 301, titulek: 'Zadání', akce: 'labeled', stitek: 'schvaleno', kdo: 'tangero', kdy: '2026-10-09T08:00:00Z' }],
  navrhy: [], zastavene: [], cekajiNaSouhlas: [], cervenaMain: [],
  expirace: { CSI_PR_TOKEN: null },
};

test('přehled vypíše rozhodnutí s účtem a sloučené PR', () => {
  const { kratky, dlouhy } = sestavPrehled(zaklad);
  assert.match(kratky, /Sloučeno PR: 1/);
  assert.match(dlouhy, /\[#301\]\(https:\/\/github\.com\/tangero\/stredniskoly\/issues\/301\) přidal `schvaleno` účet tangero/);
  assert.match(dlouhy, /\[#300\]\(https:\/\/github\.com\/tangero\/stredniskoly\/pull\/300\) Oprava věty \(2026-10-10, brána: Prošlo \(R\)\)/);
  assert.match(dlouhy, /token CSI_PR_TOKEN: bez expirace/);
  assert.doesNotMatch(kratky, /POZOR/);
});

test('upozorní na schvaleno z jiného účtu, červené CI, stop a token před vypršením', () => {
  const { kratky } = sestavPrehled({
    ...zaklad,
    rozhodnuti: [{ ...zaklad.rozhodnuti[0], kdo: 'eduarda-prijimacky' }],
    cervenaMain: ['TypeScript'],
    zastavene: [{ cislo: 305, titulek: 'X' }],
    expirace: { CSI_PR_TOKEN: '2026-10-30 00:00:00 UTC', PROJECT_TOKEN: 'neplatny' },
  });
  assert.match(kratky, /schvaleno z jiného účtu:\n#301 \(eduarda-prijimacky\)\nhttps:\/\/github\.com\/tangero\/stredniskoly\/issues\/301/);
  assert.match(kratky, /červené CI na main: TypeScript/);
  assert.match(kratky, /Zastaveno \(stop\):\n#305 X\nhttps:\/\/github\.com\/tangero\/stredniskoly\/issues\/305/);
  assert.match(kratky, /CSI_PR_TOKEN: vyprší za 17 dní/);
  assert.match(kratky, /PROJECT_TOKEN: token neplatí/);
});

test('expirace tokenu z hlavičky odpovědi', async () => {
  const odp = (status, h) => async () => ({ status, headers: new Map(Object.entries(h)) });
  assert.equal(await expiraceTokenu('t', odp(200, { 'github-authentication-token-expiration': '2026-12-01 00:00:00 UTC' })), '2026-12-01 00:00:00 UTC');
  assert.equal(await expiraceTokenu('t', odp(200, {})), undefined);
  assert.equal(await expiraceTokenu('t', odp(401, {})), 'neplatny');
});

test('krátká verze má přímý odkaz na každý návrh a každé PR čekající na souhlas', () => {
  const { kratky, dlouhy } = sestavPrehled({
    ...zaklad,
    navrhy: [{ cislo: 310, titulek: 'Návrh A', od: '2026-10-05T00:00:00Z' }],
    cekajiNaSouhlas: [{ cislo: 311, titulek: 'PR B' }],
  });
  assert.match(kratky, /Návrh: #310 Návrh A\nhttps:\/\/github\.com\/tangero\/stredniskoly\/issues\/310/);
  assert.match(kratky, /PR čeká na schvaleno: #311 PR B\nhttps:\/\/github\.com\/tangero\/stredniskoly\/pull\/311/);
  assert.match(dlouhy, /návrh \[#310\]\(https:\/\/github\.com\/tangero\/stredniskoly\/issues\/310\)/);
  assert.match(dlouhy, /PR \[#311\]\(https:\/\/github\.com\/tangero\/stredniskoly\/pull\/311\)/);
});

test('nad 15 položek se vypíše prvních 15 a zbytek shrne; zpráva se vejde do limitu Telegramu', () => {
  const navrhy = Array.from({ length: 40 }, (_, i) => ({ cislo: 400 + i, titulek: 'Dlouhý titulek '.repeat(20), od: '2026-10-05T00:00:00Z' }));
  const { kratky } = sestavPrehled({ ...zaklad, navrhy });
  assert.equal(kratky.match(/^Návrh:/gm).length, MAX_POLOZEK);
  assert.match(kratky, /… a dalších 25 v celém přehledu/);
  assert.ok(kratky.length < 4096 - 200, `délka ${kratky.length}`);
});

test('titulek se znaky <, > a & zůstane v prostém textu beze změny', () => {
  const { kratky } = sestavPrehled({ ...zaklad, navrhy: [{ cislo: 320, titulek: 'a <b> & c', od: '2026-10-05T00:00:00Z' }] });
  assert.ok(kratky.includes('Návrh: #320 a <b> & c'));
});

test('dlouhé seznamy čekajících a zastavených položek neodříznou provozní varování ani adresy', () => {
  const titulek = 'Dlouhý titulek '.repeat(10);
  const { kratky } = sestavPrehled({
    ...zaklad,
    rozhodnuti: [{ ...zaklad.rozhodnuti[0], kdo: 'eduarda-prijimacky' }],
    navrhy: Array.from({ length: 15 }, (_, i) => ({ cislo: 500 + i, titulek, od: '2026-10-05T00:00:00Z' })),
    zastavene: Array.from({ length: 12 }, (_, i) => ({ cislo: 600 + i, titulek })),
    cervenaMain: ['TypeScript'],
    expirace: { CSI_PR_TOKEN: 'neplatny' },
  });
  assert.ok(kratky.length <= 3800, `délka ${kratky.length}`);
  assert.match(kratky, /červené CI na main: TypeScript/);
  assert.match(kratky, /CSI_PR_TOKEN: token neplatí/);
  assert.match(kratky, /schvaleno z jiného účtu:\n#301 \(eduarda-prijimacky\)/);
  assert.match(kratky, /Zastaveno \(stop\):/);
  // každý řádek s adresou je úplný a těsně navazuje na svou položku
  const radky = kratky.split('\n');
  radky.forEach((r, i) => {
    if (/^(Návrh:|PR čeká|#\d+ )/.test(r) && !/\(eduarda/.test(r)) assert.match(radky[i + 1], /^https:\/\/github\.com\/tangero\/stredniskoly\/(issues|pull)\/\d+$/);
  });
  // co se nevešlo, je shrnuto výslovným počtem
  assert.match(kratky, /… a dalších \d+ v celém přehledu/);
});
