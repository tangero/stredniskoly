import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sestavPrehled, expiraceTokenu } from '../scripts/prehled/tydenni.mjs';

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
  assert.match(dlouhy, /#301 přidal `schvaleno` účet tangero/);
  assert.match(dlouhy, /#300 Oprava věty \(2026-10-10, brána: Prošlo \(R\)\)/);
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
  assert.match(kratky, /schvaleno z jiného účtu: #301 \(eduarda-prijimacky\)/);
  assert.match(kratky, /červené CI na main: TypeScript/);
  assert.match(kratky, /Zastaveno \(stop\): #305/);
  assert.match(kratky, /CSI_PR_TOKEN: vyprší za 17 dní/);
  assert.match(kratky, /PROJECT_TOKEN: token neplatí/);
});

test('expirace tokenu z hlavičky odpovědi', async () => {
  const odp = (status, h) => async () => ({ status, headers: new Map(Object.entries(h)) });
  assert.equal(await expiraceTokenu('t', odp(200, { 'github-authentication-token-expiration': '2026-12-01 00:00:00 UTC' })), '2026-12-01 00:00:00 UTC');
  assert.equal(await expiraceTokenu('t', odp(200, {})), undefined);
  assert.equal(await expiraceTokenu('t', odp(401, {})), 'neplatny');
});
