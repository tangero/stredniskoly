import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

// Přihlášení k hlídání škol a jeho potvrzení (#523, E6) nad PGlite, bez sítě.
process.env.NOVINKY_SECRET = 'testovaci-tajemstvi-hlidani-prihlaseni';

const { MIGRACE_NOVINEK } = await import('../src/lib/novinky-schema.ts');
const { MIGRACE_UDALOSTI } = await import('../src/lib/udalosti-schema.ts');
const { MIGRACE_SLEDOVANI, MIGRACE_ZADOST_HLIDANI } = await import('../src/lib/sledovani-schema.ts');
const { nastavPoolProTesty } = await import('../src/lib/novinky-db.ts');
const { prihlas, prihlasHlidani, potvrd, najdiAktivniZadost, platneRedizo, ZPRAVA_POTVRZENI_HLIDANI, MAX_SKOL_NA_ZADOST } = await import('../src/lib/novinky-odber.ts');
const { najdiServisniPolozky } = await import('../src/lib/novinky-fronta.ts');
const { skolSlovy, potvrzovaciEmailHlidani } = await import('../src/lib/novinky-sablony.ts');
const { jeHlidaniZapnuto } = await import('../src/lib/novinky-hlidani-zapnuto.ts');

async function novaDb({ sMigraci012 = true } = {}) {
  const db = new PGlite();
  for (const p of [...MIGRACE_NOVINEK, ...MIGRACE_UDALOSTI, ...MIGRACE_SLEDOVANI, ...(sMigraci012 ? MIGRACE_ZADOST_HLIDANI : [])]) await db.exec(p);
  const query = async (sql, h = []) => {
    const r = await db.query(sql, h);
    return { rows: r.rows, rowCount: r.affectedRows || r.rows.length };
  };
  nastavPoolProTesty({ query, connect: async () => ({ query, release() {} }) });
  return db;
}

const ADRESA = 'rodina@example.test';
const pocet = async (db, sql, h = []) => (await db.query(sql, h)).rows.length;

test('migrace 012 odpovídá modulu a je idempotentní', async () => {
  const sql = readFileSync(new URL('../db/migrace/012-zadost-hlidani.sql', import.meta.url), 'utf8');
  for (const p of MIGRACE_ZADOST_HLIDANI) {
    assert.ok(sql.includes(p), `příkaz chybí v souboru: ${p}`);
    assert.match(p, /if not exists/);
    assert.doesNotMatch(p, /\b(drop|delete|truncate)\b/i);
  }
  const db = await novaDb();
  for (const p of MIGRACE_ZADOST_HLIDANI) await db.exec(p);
});

test('RED IZO: jen devět číslic, bez duplicit, nejvýš limit', () => {
  assert.deepEqual(platneRedizo(['600000001', '600000001', 'x', 600000002, '12345678', '600000003']), ['600000001', '600000003']);
  assert.deepEqual(platneRedizo('600000001'), []);
  const mnoho = Array.from({ length: 30 }, (_, i) => String(600000100 + i));
  assert.equal(platneRedizo(mnoho).length, MAX_SKOL_NA_ZADOST);
});

test('hlídání: žádost se školami, po potvrzení vazba a doklad, bez odběru termínů a bez uvítání (P4)', async () => {
  const db = await novaDb();
  const v = await prihlasHlidani({ email: ADRESA, zdroj: 'skola-hlidat', ip: '192.0.2.1', skoly: ['600000001'] });
  assert.equal(v.poslat, true);
  const zadost = await najdiAktivniZadost(v.jti);
  assert.equal(zadost.ucel, 'hlidani_skol');
  assert.deepEqual(zadost.skoly, ['600000001']);
  // Do potvrzení žádná vazba ani odběratel.
  assert.equal(await pocet(db, 'select 1 from odber_skoly'), 0);
  assert.equal(await pocet(db, 'select 1 from odberatel'), 0);

  // Potvrzovací e-mail hlídání: vlastní zpráva a text o hlídání.
  const [polozka] = await db.query('select zprava, ucel from polozka_odeslani').then((r) => r.rows);
  assert.deepEqual(polozka, { zprava: ZPRAVA_POTVRZENI_HLIDANI, ucel: 'potvrzeni' });
  await db.query('begin');
  const servisni = await najdiServisniPolozky({ dotaz: async (sql, h) => db.query(sql, h) });
  await db.query('rollback');
  assert.equal(servisni[0].skol, 1);
  const e = potvrzovaciEmailHlidani({ token: v.token, skol: 1 });
  assert.equal(e.predmet, 'Potvrď hlídání škol na prijimackynaskolu.cz');
  assert.match(e.text, /hlídat vybranou školu/);
  assert.match(e.text, /v den bez změny nepřijde nic/);

  const p = await potvrd(v.jti);
  assert.equal(p.ok, true);
  assert.equal(p.hlidani, true);
  assert.equal(p.skol, 1);
  assert.equal(p.uvitaniPolozkaId, undefined);
  assert.deepEqual((await db.query('select redizo, zdroj from odber_skoly')).rows, [{ redizo: '600000001', zdroj: 'skola-hlidat' }]);
  assert.equal(await pocet(db, 'select 1 from odber_novinek'), 0, 'hlídání nezakládá odběr termínů');
  assert.deepEqual((await db.query('select ucel from doklad_souhlasu')).rows, [{ ucel: 'hlidani_skol' }]);
  assert.equal(await pocet(db, `select 1 from polozka_odeslani where ucel = 'uvitani'`), 0);
  // Odkaz platí jednou.
  assert.equal((await potvrd(v.jti)).ok, false);
});

test('odběratel termínů hlídání bez nového potvrzení nemá a potvrzení termínů hlídání nezaloží (P4)', async () => {
  const db = await novaDb();
  const t = await prihlas({ email: ADRESA, zdroj: 'skola-kontext', ip: '192.0.2.2' });
  const pt = await potvrd(t.jti);
  assert.equal(pt.ok, true);
  assert.equal(pt.hlidani, undefined);
  assert.ok(pt.uvitaniPolozkaId, 'termíny dál posílají uvítání');
  assert.equal(await pocet(db, 'select 1 from odber_skoly'), 0);
  assert.deepEqual((await db.query('select ucel from doklad_souhlasu')).rows, [{ ucel: 'novinky' }]);

  // Hlídání pak přibude vedle termínů, termíny zůstanou.
  const h = await prihlasHlidani({ email: ADRESA, zdroj: 'skola-hlidat', ip: '192.0.2.2', skoly: ['600000002'] });
  await potvrd(h.jti);
  assert.equal(await pocet(db, 'select 1 from odber_novinek'), 1);
  assert.equal(await pocet(db, 'select 1 from odber_skoly'), 1);
  assert.equal(await pocet(db, 'select 1 from odberatel'), 1);
});

test('bez migrace 012 potvrzení termínů funguje dál', async () => {
  await novaDb({ sMigraci012: false });
  const t = await prihlas({ email: ADRESA, zdroj: 'novinky', ip: '192.0.2.3' });
  const z = await najdiAktivniZadost(t.jti);
  assert.equal(z.ucel, 'novinky');
  assert.deepEqual(z.skoly, []);
  assert.equal((await potvrd(t.jti)).ok, true);
});

test('hlídání bez platné školy žádost nezaloží', async () => {
  const db = await novaDb();
  const v = await prihlasHlidani({ email: ADRESA, zdroj: 'skola-hlidat', ip: '192.0.2.4', skoly: ['abc'] });
  assert.equal(v.poslat, false);
  assert.equal(await pocet(db, 'select 1 from zadost_o_potvrzeni'), 0);
});

test('hlídání je zapnuté jen s NOVINKY_ZAPNUTO i HLIDANI_ZAPNUTO', () => {
  assert.equal(jeHlidaniZapnuto({ NOVINKY_ZAPNUTO: '1', HLIDANI_ZAPNUTO: '1' }), true);
  assert.equal(jeHlidaniZapnuto({ NOVINKY_ZAPNUTO: '1' }), false);
  assert.equal(jeHlidaniZapnuto({ HLIDANI_ZAPNUTO: '1' }), false);
});

test('počet škol slovy', () => {
  assert.equal(skolSlovy(1), 'vybranou školu');
  assert.equal(skolSlovy(3), '3 vybrané školy');
  assert.equal(skolSlovy(5), '5 vybraných škol');
});

test.after(() => nastavPoolProTesty(null));
