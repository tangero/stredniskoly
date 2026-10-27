import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { MIGRACE_KRITERII, MIGRACE_PORTALU } from '../src/lib/portal-schema.ts';
import { MIGRACE_NOVINEK } from '../src/lib/novinky-schema.ts';
import { MIGRACE_UDALOSTI } from '../src/lib/udalosti-schema.ts';
import { MIGRACE_SLEDOVANI, TABULKY_SLEDOVANI } from '../src/lib/sledovani-schema.ts';
import { zapisUdaje } from '../src/lib/portal-profil.ts';
import { zapisKriteria } from '../src/lib/portal-kriteria.ts';
import { zapisUdalost, zapisUdalostNekriticky } from '../src/lib/udalosti.ts';
import { popisyZmen, stejnyObsah } from '../src/lib/portal-udalosti.ts';
import { skolySeZmenou, udalostZPrepnuti } from '../src/lib/sledovani-rozdil.ts';

const REDIZO = '600171701';
const ZAKLAD = { redizo: REDIZO, nazev: 'Gymnázium', verze_prijimani: '2027' };
const SQL = readFileSync(new URL('../db/migrace/009-sledovani-skol.sql', import.meta.url), 'utf8');

const obal = (klient) => ({
  dotaz: async (sql, h = []) => {
    const r = await klient.query(sql, h);
    return { rows: r.rows, rowCount: r.affectedRows || r.rows.length };
  },
});

async function novaDb({ sUdalostmi = true } = {}) {
  const db = new PGlite();
  const prikazy = [...MIGRACE_PORTALU, ...MIGRACE_KRITERII, ...MIGRACE_NOVINEK, ...(sUdalostmi ? MIGRACE_UDALOSTI : []), ...MIGRACE_SLEDOVANI];
  for (const p of prikazy) await db.exec(p);
  const roleId = randomUUID();
  await db.query(`insert into portal_role (id, redizo, osoba_id, role, email, jmeno, zmenu_provedl)
    values ($1,$2,$3,'spravce','skola@example.test','Správce','test')`, [roleId, REDIZO, randomUUID()]);
  return { db, roleId, s: obal(db), tx: (fn) => db.transaction((k) => fn(obal(k))) };
}

const udalosti = async (db) => (await db.query(`select u.typ, u.veta, u.redizo, s.redizo as skola from udalost u join udalost_skola s on s.udalost_id = u.id order by u.vytvoreno`)).rows;

test('migrace 009 je idempotentní, nic nemaže a odpovídá modulu', () => {
  for (const p of MIGRACE_SLEDOVANI) {
    assert.match(p, /^(create (table|index) if not exists|alter table \w+ add column if not exists)/);
    assert.ok(!/^\s*(drop\b|truncate\b|delete\s+from\b|update\b)/im.test(p));
    assert.ok(SQL.includes(p), `v .sql chybí: ${p.slice(0, 50)}`);
  }
  assert.ok(TABULKY_SLEDOVANI.every((t) => SQL.includes(`create table if not exists ${t}`)));
});

test('migrace 009 jde pustit dvakrát a vazba se maže s odběratelem', async () => {
  const { db } = await novaDb();
  for (const p of MIGRACE_SLEDOVANI) await db.exec(p);
  const id = randomUUID();
  await db.query(`insert into odberatel (id, email) values ($1, 'rodic@example.test')`, [id]);
  await db.query(`insert into odber_skoly (odberatel_id, redizo, zdroj) values ($1, $2, 'test')`, [id, REDIZO]);
  await db.query(`delete from odberatel where id = $1`, [id]);
  assert.equal((await db.query(`select count(*)::int as n from odber_skoly`)).rows[0].n, 0);
  await db.query(`insert into doklad_souhlasu (id, email_otisk, souhlas_verze, zdroj) values ($1, 'x', 'v1', 'test')`, [randomUUID()]);
  assert.equal((await db.query(`select ucel from doklad_souhlasu`)).rows[0].ucel, 'novinky');
});

test('uložení dnů otevřených dveří zapíše právě jednu událost, opakované uložení žádnou', async () => {
  const { db, tx } = await novaDb();
  const udaje = { dny_otevrenych_dveri: '18. 11. 2026', skolne: 'Zdarma' };
  await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje, zmenuProvedl: 'ucet' }));
  await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje, zmenuProvedl: 'ucet' }));
  const u = await udalosti(db);
  assert.equal(u.length, 1);
  assert.equal(u[0].typ, 'portal_schvalen');
  assert.equal(u[0].skola, REDIZO);
  assert.match(u[0].veta, /dny otevřených dveří/);
});

test('kritéria a dny v jednom uložení dají jednu událost se dvěma tématy', async () => {
  const { db, tx } = await novaDb();
  await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { odkaz_kriteria: 'https://skola.example.test/kriteria', kriteria_vlastnimi_slovy: 'Test a prospěch', dny_otevrenych_dveri: 'Leden' }, zmenuProvedl: 'ucet' }));
  const u = await udalosti(db);
  assert.equal(u.length, 1);
  assert.match(u[0].veta, /kritéria přijetí, dny otevřených dveří/);
});

test('jiné pole, smazání pole a oprava redakcí událost nevyrobí', async () => {
  const { db, tx } = await novaDb();
  await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { skolne: 'Zdarma' }, zmenuProvedl: 'ucet' }));
  await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { dny_otevrenych_dveri: 'Leden' }, zmenuProvedl: 'ucet' }));
  await db.query('delete from udalost');
  await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { dny_otevrenych_dveri: '' }, zmenuProvedl: 'ucet' }));
  await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { dny_otevrenych_dveri: 'Únor' }, zdroj: 'redakce', zmenuProvedl: 'admin:test', duvod: 'oprava' }));
  assert.equal((await udalosti(db)).length, 0);
});

test('chybějící tabulka událostí uložení profilu nezastaví', async () => {
  const { s, tx } = await novaDb({ sUdalostmi: false });
  const zmenena = await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { dny_otevrenych_dveri: 'Leden' }, zmenuProvedl: 'ucet' }));
  assert.deepEqual(zmenena, ['dny_otevrenych_dveri']);
  assert.equal((await s.dotaz(`select count(*)::int as n from portal_profil`)).rows[0].n, 1);
});

const STRUKTURA = { jpz: { cjl_max: 50, mat_max: 50 }, dalsi: [] };
function zadani(roleId, extra = {}) {
  return { redizo: REDIZO, oborKlic: `${REDIZO}_79-41-K/41`, rok: 2027, kolo: null, rezim: 'jine', popis: 'Matematika × 1,5', odkaz: '',
    podkladRok: 2026, struktura: STRUKTURA,
    oborIdentita: { redizo: REDIZO, izo: 'izo_1', kkov: '79-41-K/41', zamereni: '', forma: 'den', delkaStudia: 4, zdrojId: 'n', podkladRok: 2026 },
    roleId, ocekavaneId: null, ...extra };
}

test('zápis kritérií zapíše událost jen při změně obsahu', async () => {
  const { db, roleId, tx } = await novaDb();
  const prvni = await tx((t) => zapisKriteria(t, zadani(roleId)));
  assert.equal((await udalosti(db)).length, 1);
  const stejne = await tx((t) => zapisKriteria(t, zadani(roleId, { ocekavaneId: prvni.id, struktura: { dalsi: [], jpz: { mat_max: 50, cjl_max: 50 } } })));
  assert.equal((await udalosti(db)).length, 1, 'stejný obsah v jiném pořadí klíčů není změna');
  await tx((t) => zapisKriteria(t, zadani(roleId, { ocekavaneId: stejne.id, popis: 'Matematika × 2' })));
  const u = await udalosti(db);
  assert.equal(u.length, 2);
  assert.match(u[1].veta, /kritéria přijetí/);
});

test('zapisUdalost: stejný klíč podruhé nic nevytvoří, bez škol událost nevzniká', async () => {
  const { db, s } = await novaDb();
  const u = { klic: 'k1', typ: 'sada_prepnuta', veta: 'Věta.', skoly: ['1', '2', '2'] };
  assert.equal(await zapisUdalost(s, u), true);
  assert.equal(await zapisUdalost(s, u), false);
  assert.equal(await zapisUdalost(s, { ...u, klic: 'k2', skoly: [] }), false);
  assert.equal((await db.query(`select count(*)::int as n from udalost_skola`)).rows[0].n, 2);
  assert.equal(await zapisUdalostNekriticky(s, u), false, 'mimo transakci selže potichu');
});

test('rozdíl sady: dotčené jsou jen školy se změněnou zobrazenou hodnotou', () => {
  const stare = { A: { obory: ['x'] }, B: { obory: ['y'] }, C: { obory: ['z'] } };
  const nove = { A: { obory: ['x'] }, B: { obory: ['y', 'w'] }, D: { obory: ['n'] }, E: { obory: [] } };
  assert.deepEqual(skolySeZmenou(stare, nove), ['B', 'D']);
  const u = udalostZPrepnuti({ sada: 'nabidka', obdobi: '2027', veta: 'Zveřejnili jsme nabídku oborů.', stare, nove });
  assert.equal(u.klic, 'sada_prepnuta:nabidka:2027');
  assert.equal(udalostZPrepnuti({ sada: 'nabidka', obdobi: '2027', veta: 'v', stare, nove: stare }), null);
});

test('pomocné funkce: pořadí témat a porovnání obsahu', () => {
  assert.deepEqual(popisyZmen(['dny_otevrenych_dveri', 'odkaz_kriteria', 'kriteria_vlastnimi_slovy', 'skolne']), ['kritéria přijetí', 'dny otevřených dveří']);
  assert.ok(stejnyObsah({ a: 1, b: [1, { c: 2, d: 3 }] }, { b: [1, { d: 3, c: 2 }], a: 1 }));
  assert.ok(!stejnyObsah({ a: 1 }, { a: 2 }));
});
