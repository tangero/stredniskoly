import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'crypto';
import {
  vytvorMagicToken,
  overMagicToken,
  magicOdkaz,
  najdiRedizoPodleEmailu,
  normalizeEmail,
  resolvePortalAuth,
  MAGIC_NEUTRALNI_ODPOVED,
} from '../src/lib/portal-magic.ts';
import { hashKod } from '../src/lib/portal-skol.ts';

// Pepř kódů (v produkci env PORTAL_KOD_PEPPER); hashKod ho čte při volání.
process.env.PORTAL_KOD_PEPPER ??= 'testovaci-pepr';

const SECRET = 'test-secret-pro-magic-token';
const KODY = [
  { hash: hashKod('ABCD-EFGH-JKMN'), redizo: '600171701', vytvoreno: '2026-09-13', revokovano: false },
];

/** Ručně vyrobí token se zadaným payloadem (pro testy expirace/manipulace). */
function rucniToken(payload, secret = SECRET) {
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const podpis = createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${podpis}`;
}

test('magic token: vytvoření a ověření vrátí REDIZO', () => {
  const token = vytvorMagicToken('600171701', SECRET);
  assert.equal(overMagicToken(token, SECRET), '600171701');
});

test('magic token: expirovaný token se odmítne', () => {
  const token = rucniToken({ redizo: '600171701', exp: Date.now() - 1000, nonce: 'x' });
  assert.equal(overMagicToken(token, SECRET), null);
});

test('magic token: manipulace s payloadem se pozná', () => {
  const token = vytvorMagicToken('600171701', SECRET);
  const [, podpis] = token.split('.');
  const falsovanyPayload = Buffer.from(
    JSON.stringify({ redizo: '600007774', exp: Date.now() + 10000, nonce: 'x' }),
  ).toString('base64url');
  assert.equal(overMagicToken(`${falsovanyPayload}.${podpis}`, SECRET), null);
});

test('magic token: manipulace s podpisem a špatný secret se odmítnou', () => {
  const token = vytvorMagicToken('600171701', SECRET);
  const [payload] = token.split('.');
  assert.equal(overMagicToken(`${payload}.AAAA`, SECRET), null);
  assert.equal(overMagicToken(token, 'jiny-secret'), null);
  assert.equal(overMagicToken('neni-token', SECRET), null);
  assert.equal(overMagicToken('', SECRET), null);
});

test('magic token: bez secretu vytvoření hodí a ověření vrátí null', () => {
  const puvodni = process.env.PORTAL_MAGIC_SECRET;
  delete process.env.PORTAL_MAGIC_SECRET;
  try {
    assert.throws(() => vytvorMagicToken('600171701'));
    assert.equal(overMagicToken(rucniToken({ redizo: '600171701', exp: Date.now() + 10000, nonce: 'x' })), null);
  } finally {
    if (puvodni) process.env.PORTAL_MAGIC_SECRET = puvodni;
  }
});

test('magic odkaz vede na /pro-skoly/link/<token>', () => {
  process.env.PORTAL_MAGIC_SECRET = SECRET;
  const odkaz = magicOdkaz('600171701');
  assert.ok(odkaz.startsWith('https://www.prijimackynaskolu.cz/pro-skoly/link/'));
  const token = odkaz.split('/pro-skoly/link/')[1];
  assert.equal(overMagicToken(token, SECRET), '600171701');
});

test('lookup e-mailu: normalizace, case-insensitive, neznámý → null', async () => {
  const mapa = {
    '600171701': ['renata.schejbalova@gymstola.cz', 'dana.tvrska@gymstola.cz'],
    '600007774': ['info@gbl.cz'],
  };
  assert.equal(await najdiRedizoPodleEmailu('  Renata.Schejbalova@GYMSTOLA.cz ', mapa), '600171701');
  assert.equal(await najdiRedizoPodleEmailu('info@gbl.cz', mapa), '600007774');
  assert.equal(await najdiRedizoPodleEmailu('nekdo@jinak.cz', mapa), null);
  assert.equal(await najdiRedizoPodleEmailu('', mapa), null);
  assert.equal(normalizeEmail('  A@B.CZ '), 'a@b.cz');
});

test('anti-enumerace: odpověď magic endpointu je konstantní a neprozradí, zda e-mail známe', () => {
  assert.deepEqual(MAGIC_NEUTRALNI_ODPOVED, {
    success: true,
    zprava: 'Pokud adresu známe, poslali jsme na ni odkaz pro úpravu profilu školy.',
  });
});

test('resolvePortalAuth: kód i magic token se rozresolvují na REDIZO a kanál', async () => {
  process.env.PORTAL_MAGIC_SECRET = SECRET;
  assert.deepEqual(await resolvePortalAuth({ kod: 'ABCD-EFGH-JKMN' }, KODY), {
    redizo: '600171701',
    kanal: 'kod',
  });
  const magic = vytvorMagicToken('600007774', SECRET);
  assert.deepEqual(await resolvePortalAuth({ magic }, KODY), {
    redizo: '600007774',
    kanal: 'magic-link',
  });
});

test('resolvePortalAuth: neplatné obojí → null; kód má přednost před magic', async () => {
  process.env.PORTAL_MAGIC_SECRET = SECRET;
  assert.equal(await resolvePortalAuth({ kod: 'XXXX-XXXX-XXXX' }, KODY), null);
  assert.equal(await resolvePortalAuth({ magic: 'spatny' }, KODY), null);
  assert.equal(await resolvePortalAuth({}, KODY), null);
  // když přijde obojí, kód vyhraje (a platný kód zde není → null, magic se nezkouší)
  const magic = vytvorMagicToken('600007774', SECRET);
  assert.equal(await resolvePortalAuth({ kod: 'XXXX-XXXX-XXXX', magic }, KODY), null);
});

test('potvrzovací e-mail je best-effort: bez RESEND_API_KEY vrátí false a nehodí výjimku', async () => {
  const { posliPotvrzovaciEmail } = await import('../src/lib/portal-email.ts');
  const puvodni = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    const vysledek = await posliPotvrzovaciEmail({
      email: 'reditel@skola.cz',
      nazevSkoly: 'Gymnázium Test',
      skolaUrl: 'https://www.prijimackynaskolu.cz/skola/600171701-gymnazium',
    });
    assert.equal(vysledek, false);
  } finally {
    if (puvodni) process.env.RESEND_API_KEY = puvodni;
  }
});
