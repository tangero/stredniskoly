import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'crypto';
import {
  noveJti,
  vytvorToken,
  overToken,
  potvrzovaciOdkaz,
  odhlasovaciOdkaz,
  otisk,
  normalizujEmail,
  jeEmailPlatny,
  ZADOST_PLATNOST_MS,
  VYZVA_PLATNOST_MS,
} from '../src/lib/novinky-token.ts';

const SECRET = 'test-secret-pro-novinky';

/** Ručně vyrobí token se zadaným payloadem (pro testy expirace a manipulace). */
function rucniToken(payload, secret = SECRET) {
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const podpis = createHmac('sha256', secret).update(b64).digest().toString('base64url');
  return `${b64}.${podpis}`;
}

test('token prosel ověřením a vrátí jti', () => {
  const jti = noveJti();
  const token = vytvorToken(jti, ZADOST_PLATNOST_MS, SECRET);
  assert.equal(overToken(token, SECRET), jti);
});

test('token s cizím tajemstvím neprojde', () => {
  const token = vytvorToken(noveJti(), ZADOST_PLATNOST_MS, SECRET);
  assert.equal(overToken(token, 'jine-tajemstvi'), null);
});

test('prošlý token neprojde', () => {
  const token = rucniToken({ jti: noveJti(), exp: Date.now() - 1 });
  assert.equal(overToken(token, SECRET), null);
});

test('změněný payload neprojde, protože podpis nesedí', () => {
  const token = vytvorToken(noveJti(), ZADOST_PLATNOST_MS, SECRET);
  const [, podpis] = token.split('.');
  const cizi = Buffer.from(JSON.stringify({ jti: 'cizi', exp: Date.now() + 1000 })).toString('base64url');
  assert.equal(overToken(`${cizi}.${podpis}`, SECRET), null);
});

test('token bez podpisu nebo v nesmyslném tvaru neprojde', () => {
  assert.equal(overToken('', SECRET), null);
  assert.equal(overToken('jedna-cast', SECRET), null);
  assert.equal(overToken('a.b.c', SECRET), null);
  assert.equal(overToken('.....', SECRET), null);
});

test('platnost výzvy je 30 dnů, žádosti 72 hodin', () => {
  assert.equal(ZADOST_PLATNOST_MS, 72 * 60 * 60 * 1000);
  assert.equal(VYZVA_PLATNOST_MS, 30 * 24 * 60 * 60 * 1000);
  const dlouhy = rucniToken({ jti: 'x', exp: Date.now() + VYZVA_PLATNOST_MS });
  assert.equal(overToken(dlouhy, SECRET), 'x');
});

test('odkazy míří na obslužné cesty a token je v nich zakódovaný', () => {
  const token = vytvorToken(noveJti(), ZADOST_PLATNOST_MS, SECRET);
  assert.match(potvrzovaciOdkaz(token), /^https:\/\/www\.prijimackynaskolu\.cz\/api\/novinky\/potvrdit\?t=/);
  assert.match(odhlasovaciOdkaz(token), /^https:\/\/www\.prijimackynaskolu\.cz\/api\/novinky\/odhlasit\?t=/);
  const vlozeny = potvrzovaciOdkaz('a+b/c=', 'https://x.cz');
  assert.equal(vlozeny, 'https://x.cz/api/novinky/potvrdit?t=a%2Bb%2Fc%3D');
});

test('otisk je stabilní, závisí na tajemství a není prostý sha256', () => {
  const a = otisk('rodina@example.com', SECRET);
  assert.equal(a, otisk('rodina@example.com', SECRET));
  assert.notEqual(a, otisk('rodina@example.com', 'jine'));
  assert.notEqual(a, otisk('jina@example.com', SECRET));
  assert.match(a, /^[0-9a-f]{64}$/);
});

test('normalizace adresy sjednotí velikost písmen a mezery', () => {
  assert.equal(normalizujEmail('  Rodina@Example.COM '), 'rodina@example.com');
});

test('kontrola podoby adresy odmítne zjevné nesmysly', () => {
  assert.ok(jeEmailPlatny('rodina@example.com'));
  assert.ok(!jeEmailPlatny(''));
  assert.ok(!jeEmailPlatny('rodina'));
  assert.ok(!jeEmailPlatny('rodina@example'));
  assert.ok(!jeEmailPlatny('rodina @example.com'));
  assert.ok(!jeEmailPlatny(`${'a'.repeat(315)}@example.com`));
});

test('bez tajemství se token nevyrobí a ověření selže tiše', () => {
  const puvodni = process.env.NOVINKY_SECRET;
  delete process.env.NOVINKY_SECRET;
  try {
    assert.throws(() => vytvorToken(noveJti()), /NOVINKY_SECRET/);
    assert.equal(overToken('a.b'), null);
  } finally {
    if (puvodni !== undefined) process.env.NOVINKY_SECRET = puvodni;
  }
});
