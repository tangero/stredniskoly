import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeKod,
  hashKod,
  validateKod,
  validatePortalPayload,
  buildPortalZaznam,
  zaznamMaObsah,
  formatDatumCz,
  PORTAL_POLE,
} from '../src/lib/portal-skol.ts';

// Pepř kódů (v produkci env PORTAL_KOD_PEPPER); hashKod ho čte při volání.
process.env.PORTAL_KOD_PEPPER ??= 'testovaci-pepr';

// Fixture kódů – stejný tvar jako data/portal/kody.json (jen hashe, plaintext nikdy)
const KODY = [
  { hash: hashKod('ABCD-EFGH-JKMN'), redizo: '600171701', vytvoreno: '2026-09-13', revokovano: false },
  { hash: hashKod('PQRS-TUVW-XYZ2'), redizo: '600007774', vytvoreno: '2026-09-13', revokovano: true },
];

test('normalizace kódu: velká písmena, pomlčky a mezery se ignorují', () => {
  assert.equal(normalizeKod('abcd-efgh-jkmn'), 'ABCDEFGHJKMN');
  assert.equal(normalizeKod(' ABCD EFGH JKMN '), 'ABCDEFGHJKMN');
  assert.equal(hashKod('abcd-efgh-jkmn'), hashKod('ABCD-EFGH-JKMN'));
});

test('validace kódu: správný kód vrátí REDIZO', async () => {
  assert.equal(await validateKod('ABCD-EFGH-JKMN', KODY), '600171701');
  // i s jiným formátováním
  assert.equal(await validateKod('abcd efgh jkmn', KODY), '600171701');
});

test('validace kódu: špatný a prázdný kód projdou jako null', async () => {
  assert.equal(await validateKod('XXXX-XXXX-XXXX', KODY), null);
  assert.equal(await validateKod('', KODY), null);
  assert.equal(await validateKod('ABCD-EFGH-JKM', KODY), null);
});

test('validace kódu: revokovaný kód se odmítne', async () => {
  assert.equal(await validateKod('PQRS-TUVW-XYZ2', KODY), null);
});

const VALID_BASE = {
  souhlas_cc_by: true,
  kontakt_email: 'reditel@skola.cz',
  udaje: { dny_otevrenych_dveri: '18. 11. 2026 a 13. 1. 2027' },
};

test('payload: validní podání projde a neznámá pole se zahodí', () => {
  const v = validatePortalPayload({ ...VALID_BASE, udaje: { ...VALID_BASE.udaje, neexistujici_pole: 'x' } });
  assert.equal(v.ok, true);
  assert.equal(v.udaje.dny_otevrenych_dveri, '18. 11. 2026 a 13. 1. 2027');
  assert.equal('neexistujici_pole' in v.udaje, false);
});

test('payload: bez souhlasu CC BY se odmítne', () => {
  assert.equal(validatePortalPayload({ ...VALID_BASE, souhlas_cc_by: false }).ok, false);
  const bez = { ...VALID_BASE };
  delete bez.souhlas_cc_by;
  assert.equal(validatePortalPayload(bez).ok, false);
});

test('payload: neplatný nebo chybějící kontaktní e-mail se odmítne', () => {
  assert.equal(validatePortalPayload({ ...VALID_BASE, kontakt_email: 'neni-email' }).ok, false);
  assert.equal(validatePortalPayload({ ...VALID_BASE, kontakt_email: '' }).ok, false);
});

test('payload: odkaz na kritéria musí být platná http(s) URL', () => {
  assert.equal(
    validatePortalPayload({ ...VALID_BASE, udaje: { odkaz_kriteria: 'www.skola.cz/kriteria' } }).ok,
    false,
  );
  assert.equal(
    validatePortalPayload({ ...VALID_BASE, udaje: { odkaz_kriteria: 'javascript:alert(1)' } }).ok,
    false,
  );
  assert.equal(
    validatePortalPayload({ ...VALID_BASE, udaje: { odkaz_kriteria: 'https://www.skola.cz/kriteria.pdf' } }).ok,
    true,
  );
});

test('payload: překročení délky pole se odmítne', () => {
  const dlouhe = 'a'.repeat(3001);
  assert.equal(validatePortalPayload({ ...VALID_BASE, udaje: { popis_skoly: dlouhe } }).ok, false);
  assert.equal(
    validatePortalPayload({ ...VALID_BASE, udaje: { popis_skoly: 'a'.repeat(3000) } }).ok,
    true,
  );
});

test('payload: ubytování akceptuje jen ano/ne/prázdno', () => {
  assert.equal(validatePortalPayload({ ...VALID_BASE, udaje: { ubytovani: 'mozna' } }).ok, false);
  assert.equal(validatePortalPayload({ ...VALID_BASE, udaje: { ubytovani: 'ano' } }).ok, true);
  assert.equal(validatePortalPayload({ ...VALID_BASE, udaje: { ubytovani: '' } }).ok, false); // samotné prázdné pole nestačí
});

test('payload: potvrzení „údaje sedí“ samo o sobě stačí k odeslání', () => {
  const v = validatePortalPayload({ souhlas_cc_by: true, kontakt_email: 'a@b.cz', udaje: {}, udaje_sedi: true });
  assert.equal(v.ok, true);
  assert.equal(v.udaje_sedi, true);
});

test('payload: úplně prázdné podání bez potvrzení se odmítne', () => {
  assert.equal(validatePortalPayload({ souhlas_cc_by: true, kontakt_email: 'a@b.cz', udaje: {} }).ok, false);
  // samotná nesrovnalost stačí
  assert.equal(
    validatePortalPayload({ souhlas_cc_by: true, kontakt_email: 'a@b.cz', udaje: {}, nesrovnalost: 'Kapacita je jiná.' }).ok,
    true,
  );
});

const PAYLOAD = {
  redizo: '600171701',
  nazev: 'Gymnázium Test',
  verze_prijimani: '2027',
  udaje: {
    dny_otevrenych_dveri: '18. 11. 2026',
    odkaz_kriteria: 'https://www.skola.cz/kriteria.pdf',
    ubytovani: 'ano',
    ubytovani_poznamka: 'kolej, 80 míst',
    skolne: 'Zdarma',
    popis_skoly: 'Malé gymnázium s rodinnou atmosférou.',
  },
  udaje_sedi: true,
  nesrovnalost: '',
  souhlas_cc_by: true,
  kontakt_email: 'reditel@skola.cz',
};

test('mapování do portal_skol.json: hodnoty nesou datum a zdroj „skola“', () => {
  const z = buildPortalZaznam(null, PAYLOAD, '2026-09-13');
  assert.equal(z.redizo, '600171701');
  assert.equal(z.verze_prijimani, '2027');
  assert.equal(z.aktualizovano, '2026-09-13');
  assert.deepEqual(z.udaje.dny_otevrenych_dveri, {
    hodnota: '18. 11. 2026',
    potvrzeno_dne: '2026-09-13',
    zdroj: 'skola',
  });
  assert.equal(z.udaje.ubytovani.hodnota, 'ano');
  // interní kontakt se do publikovaného záznamu nedostane
  assert.equal(JSON.stringify(z).includes('reditel@skola.cz'), false);
  assert.equal(zaznamMaObsah(z), true);
});

test('mapování: klíče chybějící v payloadu se zachovají, prázdná hodnota maže', () => {
  const prvni = buildPortalZaznam(null, PAYLOAD, '2026-09-13');
  const druhy = buildPortalZaznam(
    prvni,
    { ...PAYLOAD, udaje: { skolne: '' } }, // škola školné vymazala, ostatní neposlala
    '2026-10-01',
  );
  assert.equal(druhy.udaje.dny_otevrenych_dveri.hodnota, '18. 11. 2026'); // zůstalo
  assert.equal(druhy.udaje.skolne, undefined); // smazáno
  assert.equal(druhy.aktualizovano, '2026-10-01');
});

test('prázdný záznam nemá obsah a na webu se nezobrazí', () => {
  assert.equal(zaznamMaObsah(null), false);
  assert.equal(zaznamMaObsah(buildPortalZaznam(null, { ...PAYLOAD, udaje: {} }, '2026-09-13')), false);
});

test('české formátování data', () => {
  assert.equal(formatDatumCz('2026-09-13'), '13. 9. 2026');
  assert.equal(formatDatumCz('2026-12-01'), '1. 12. 2026');
});

test('definice polí portálu mají unikátní klíče a limity', () => {
  const keys = PORTAL_POLE.map((p) => p.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const p of PORTAL_POLE) {
    assert.ok(p.label.length > 0 && p.maxLength > 0);
  }
});

test('nová nepovinná pole stravování a kontakt na výchovného poradce', () => {
  const keys = PORTAL_POLE.map((p) => p.key);
  assert.ok(keys.includes('stravovani') && keys.includes('kontakt_vychovny_poradce'));
  const v = validatePortalPayload({ ...PAYLOAD, udaje: { stravovani: 'vlastní jídelna', kontakt_vychovny_poradce: 'poradce@skola.cz' } });
  assert.equal(v.ok, true);
  assert.equal(v.udaje.stravovani, 'vlastní jídelna');
  const prazdne = validatePortalPayload({ ...PAYLOAD, udaje: { stravovani: '' }, udaje_sedi: true });
  assert.equal(prazdne.ok, true);
  const dlouhe = validatePortalPayload({ ...PAYLOAD, udaje: { kontakt_vychovny_poradce: 'x'.repeat(301) } });
  assert.equal(dlouhe.ok, false);
});

test('hash kódu: HMAC s pepřem, bez pepře kód neověří', async () => {
  assert.notEqual(hashKod('ABCD-EFGH-JKMN', 'jiny-pepr'), hashKod('ABCD-EFGH-JKMN'));
  assert.throws(() => hashKod('ABCD-EFGH-JKMN', ''), /PORTAL_KOD_PEPPER/);
  const puvodni = process.env.PORTAL_KOD_PEPPER;
  delete process.env.PORTAL_KOD_PEPPER;
  const chyby = console.error;
  console.error = () => {};
  try {
    assert.equal(await validateKod('ABCD-EFGH-JKMN', KODY), null);
  } finally {
    console.error = chyby;
    process.env.PORTAL_KOD_PEPPER = puvodni;
  }
});

test('přihlášený editor kontakt nezadává, host z rejstříku ano', () => {
  const bezKontaktu = { ...VALID_BASE };
  delete bezKontaktu.kontakt_email;

  // Host bez účtu: kontakt je jediná cesta, jak se mu ozvat.
  assert.equal(validatePortalPayload(bezKontaktu).ok, false);
  // Přihlášený editor: e-mail má u účtu, server ho doplní z role.
  assert.equal(validatePortalPayload(bezKontaktu, { kontaktPovinny: false }).ok, true);
  // Nesmysl místo adresy se neschová ani tam, kde kontakt povinný není.
  assert.equal(
    validatePortalPayload({ ...bezKontaktu, kontakt_email: 'neni-email' }, { kontaktPovinny: false }).ok,
    false,
  );
});
