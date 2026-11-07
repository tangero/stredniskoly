import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

process.env.NOVINKY_SECRET = 'testovaci-tajemstvi-hlidani';

const { MIGRACE_NOVINEK } = await import('../src/lib/novinky-schema.ts');
const { MIGRACE_UDALOSTI } = await import('../src/lib/udalosti-schema.ts');
const { MIGRACE_SLEDOVANI } = await import('../src/lib/sledovani-schema.ts');
const { pripravDavku } = await import('../src/lib/novinky-fronta.ts');
const { slozSouhrn, odkazDoEmailu, predmetSouhrnu } = await import('../src/lib/hlidani-souhrn.ts');
const { naplnFrontuHlidani, sestavSouhrny, teloHlidani, zpravaHlidani } = await import('../src/lib/novinky-hlidani.ts');
const { zrusTerminyTx, zrusHlidaniTx, zrusVseTx } = await import('../src/lib/novinky-odber.ts');

const obal = (klient) => ({
  dotaz: async (sql, h = []) => {
    const r = await klient.query(sql, h);
    return { rows: r.rows, rowCount: r.affectedRows || r.rows.length };
  },
});

async function novaDb() {
  const db = new PGlite();
  for (const p of [...MIGRACE_NOVINEK, ...MIGRACE_UDALOSTI, ...MIGRACE_SLEDOVANI]) await db.exec(p);
  return { db, s: obal(db) };
}

async function odberatel(db, email, { terminy = false, skoly = [], potvrzeno = '2026-11-01T00:00:00Z' } = {}) {
  const id = randomUUID();
  await db.query(`insert into odberatel (id, email) values ($1, $2)`, [id, email]);
  if (terminy) await db.query(`insert into odber_novinek (odberatel_id, zdroj) values ($1, 'test')`, [id]);
  for (const redizo of skoly) {
    await db.query(`insert into odber_skoly (odberatel_id, redizo, zdroj, potvrzeno) values ($1, $2, 'test', $3)`, [id, redizo, potvrzeno]);
  }
  return id;
}

async function udalost(db, { klic, typ = 'portal_schvalen', veta, skoly, kdy, odkaz = null }) {
  const id = randomUUID();
  await db.query(`insert into udalost (id, klic, typ, veta, odkaz, publikovano) values ($1, $2, $3, $4, $5, $6)`, [id, klic, typ, veta, odkaz, kdy]);
  for (const r of skoly) await db.query(`insert into udalost_skola (udalost_id, redizo) values ($1, $2)`, [id, r]);
  return id;
}

const polozky = async (db, zprava) => (await db.query(`select * from polozka_odeslani where zprava = $1`, [zprava])).rows;
const NAZEV = async (redizo) => ({ '600000001': 'Gymnázium Příklad', '600000002': 'Střední škola Vzor' })[redizo] ?? null;

test('souhrn: jedna věta na typ, školy pod ní, nejdřív nabídka a potom inspekce', () => {
  const radky = [
    { udalostId: '1', typ: 'inspekce_nova', veta: 'Vyšla nová inspekční zpráva.', odkaz: null, redizo: '600000001' },
    { udalostId: '2', typ: 'sada_prepnuta', veta: 'Zveřejnili jsme nabídku oborů pro přijímací řízení.', odkaz: null, redizo: '600000001' },
    { udalostId: '2', typ: 'sada_prepnuta', veta: 'Zveřejnili jsme nabídku oborů pro přijímací řízení.', odkaz: null, redizo: '600000002' },
  ];
  const s = slozSouhrn(radky, [
    { redizo: '600000001', nazev: 'Gymnázium Příklad' },
    { redizo: '600000002', nazev: 'Střední škola Vzor' },
  ]);
  assert.equal(s.predmet, 'Novinky na 2 školách, které hlídáte');
  assert.equal(s.skol, 2);
  assert.ok(s.text.indexOf('nabídku oborů') < s.text.indexOf('inspekční'));
  assert.equal((s.text.match(/Gymnázium Příklad/g) ?? []).length, 2, 'škola s víc událostmi je v e-mailu víckrát');
  assert.ok(!/\d{1,2}\. ?\d{1,2}\. ?20\d\d/.test(s.text), 'souhrn sám nevymýšlí data');
});

test('souhrn: bez události nic, předmět v jednotném čísle, cizí odkaz se zahodí, HTML se escapuje', () => {
  assert.equal(slozSouhrn([], []), null);
  assert.equal(predmetSouhrnu(1), 'Novinky na 1 škole, kterou hlídáte');
  assert.equal(odkazDoEmailu('https://zlo.example.org/x', '600000001'), 'https://www.prijimackynaskolu.cz/skola/600000001');
  assert.equal(odkazDoEmailu('//zlo.example.org/x', '600000001'), 'https://www.prijimackynaskolu.cz/skola/600000001');
  assert.equal(odkazDoEmailu('/skola/600000001-x#kriteria', '600000001'), 'https://www.prijimackynaskolu.cz/skola/600000001-x#kriteria');
  const s = slozSouhrn(
    [{ udalostId: '1', typ: 'portal_schvalen', veta: 'Škola <b>doplnila</b> údaje.', odkaz: null, redizo: '1' }],
    [{ redizo: '1', nazev: 'A & B' }],
  );
  assert.ok(s.html.includes('&lt;b&gt;doplnila') && s.html.includes('A &amp; B'));
});

test('K9: rodina hlídající víc škol dostane jednu položku, v den bez události žádnou', async () => {
  const { db, s } = await novaDb();
  const rodina = await odberatel(db, 'rodina@example.test', { skoly: ['600000001', '600000002'] });
  const jinde = await odberatel(db, 'jina@example.test', { skoly: ['600000009'] });
  await udalost(db, { klic: 'a', veta: 'Škola doplnila údaje.', skoly: ['600000001'], kdy: '2026-11-02T03:00:00Z' });
  await udalost(db, { klic: 'b', typ: 'inspekce_nova', veta: 'Nová inspekční zpráva.', skoly: ['600000002'], kdy: '2026-11-02T04:00:00Z' });

  const kdy = new Date('2026-11-03T05:00:00Z');
  const zprava = zpravaHlidani('2026-11-03');
  assert.equal(await naplnFrontuHlidani(s, zprava, kdy), 1);
  assert.equal(await naplnFrontuHlidani(s, zprava, kdy), 0, 'opakovaný běh nic nezdvojí');
  const p = await polozky(db, zprava);
  assert.equal(p.length, 1);
  assert.equal(p[0].odberatel_id, rodina);
  assert.notEqual(p[0].odberatel_id, jinde);

  const souhrny = await sestavSouhrny(s, zprava, kdy, NAZEV);
  const s1 = souhrny.get(rodina);
  assert.equal(s1.hlidanych, 2);
  assert.equal(s1.souhrn.skol, 2);

  // Po odeslání souhrnu a ve dni bez nové události u jejích škol nevznikne nic.
  await db.query(`update polozka_odeslani set stav = 'odeslana', odeslano = now() where zprava = $1`, [zprava]);
  const prazdny = zpravaHlidani('2026-11-04');
  assert.equal(await naplnFrontuHlidani(s, prazdny, new Date('2026-11-04T05:00:00Z')), 0);
});

test('okno: událost před potvrzením hlídání a událost už odeslaná se neopakují', async () => {
  const { db, s } = await novaDb();
  const o = await odberatel(db, 'rodina@example.test', { skoly: ['600000001'], potvrzeno: '2026-11-02T12:00:00Z' });
  await udalost(db, { klic: 'stara', veta: 'Stará událost.', skoly: ['600000001'], kdy: '2026-11-02T08:00:00Z' });
  assert.equal(await naplnFrontuHlidani(s, zpravaHlidani('2026-11-03'), new Date('2026-11-03T05:00:00Z')), 0, 'před potvrzením');

  await udalost(db, { klic: 'prvni', veta: 'První událost.', skoly: ['600000001'], kdy: '2026-11-03T01:00:00Z' });
  const den1 = zpravaHlidani('2026-11-04');
  assert.equal(await naplnFrontuHlidani(s, den1, new Date('2026-11-04T05:00:00Z')), 1);
  await db.query(`update polozka_odeslani set stav = 'odeslana', odeslano = now() where zprava = $1`, [den1]);

  // Další den bez nové události: nic. S novou událostí: jen ta nová.
  assert.equal(await naplnFrontuHlidani(s, zpravaHlidani('2026-11-05'), new Date('2026-11-05T05:00:00Z')), 0);
  await udalost(db, { klic: 'druha', veta: 'Druhá událost.', skoly: ['600000001'], kdy: '2026-11-05T09:00:00Z' });
  const den3 = zpravaHlidani('2026-11-06');
  const kdy3 = new Date('2026-11-06T05:00:00Z');
  assert.equal(await naplnFrontuHlidani(s, den3, kdy3), 1);
  const text = (await sestavSouhrny(s, den3, kdy3, NAZEV)).get(o).souhrn.text;
  assert.ok(text.includes('Druhá událost.') && !text.includes('První událost.'));
});

test('souhrn, který se neodeslal, události nespotřebuje', async () => {
  const { db, s } = await novaDb();
  const o = await odberatel(db, 'rodina@example.test', { skoly: ['600000001'] });
  await udalost(db, { klic: 'a', veta: 'Událost A.', skoly: ['600000001'], kdy: '2026-11-02T03:00:00Z' });
  await naplnFrontuHlidani(s, zpravaHlidani('2026-11-03'), new Date('2026-11-03T05:00:00Z'));
  await db.query(`update polozka_odeslani set stav = 'zahozena' where zprava = $1`, [zpravaHlidani('2026-11-03')]);
  const kdy = new Date('2026-11-04T05:00:00Z');
  assert.equal(await naplnFrontuHlidani(s, zpravaHlidani('2026-11-04'), kdy), 1);
  assert.ok((await sestavSouhrny(s, zpravaHlidani('2026-11-04'), kdy, NAZEV)).get(o).souhrn.text.includes('Událost A.'));
});

test('K10: dávka hlídání nese vlastní souhrn, odkaz na správu a odhlášení jedním kliknutím', async () => {
  const { db, s } = await novaDb();
  await odberatel(db, 'rodina@example.test', { skoly: ['600000001'] });
  await udalost(db, { klic: 'a', veta: 'Škola doplnila údaje.', skoly: ['600000001'], kdy: '2026-11-02T03:00:00Z' });
  const kdy = new Date('2026-11-03T05:00:00Z');
  const zprava = zpravaHlidani('2026-11-03');
  await naplnFrontuHlidani(s, zprava, kdy);
  await db.query(`insert into zprava_verze (zprava, otisk_obsahu, otisk_kalendare, splatnost, konec_uzitecnosti) values ($1, 'x', 'y', '2026-11-03', '2026-11-03')`, [zprava]);
  const souhrny = await sestavSouhrny(s, zprava, kdy, NAZEV);
  const priprava = await pripravDavku(s, { zprava, ucel: 'obsah', otiskObsahu: 'x', kdy, telo: (p) => teloHlidani(p, souhrny) });
  assert.ok(priprava, 'dávka vznikla');
  const [mail] = JSON.parse(priprava.davka.telo);
  assert.equal(mail.subject, 'Novinky na 1 škole, kterou hlídáte');
  assert.match(mail.headers['List-Unsubscribe'], /\/api\/novinky\/odhlasit\?t=/);
  assert.equal(mail.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  assert.match(mail.html, /Upravit hlídané školy/);
  assert.match(mail.text, /api\/novinky\/sprava\?t=/);
});

test('P4: odběr termínů bez hlídání školy se k hlídání nedostane a zpráva hlídání mu nejde', async () => {
  const { db, s } = await novaDb();
  const jenTerminy = await odberatel(db, 'terminy@example.test', { terminy: true });
  await udalost(db, { klic: 'a', veta: 'Událost.', skoly: ['600000001'], kdy: '2026-11-02T03:00:00Z' });
  assert.equal(await naplnFrontuHlidani(s, zpravaHlidani('2026-11-03'), new Date('2026-11-03T05:00:00Z')), 0);

  // Položka hlídání vložená natvrdo odběrateli bez hlídané školy se z dávky vyřadí.
  const zprava = zpravaHlidani('2026-11-03');
  await db.query(`insert into polozka_odeslani (id, zprava, ucel, odberatel_id, adresat_otisk, stav) values ($1, $2, 'obsah', $3, 'o', 'ceka')`, [randomUUID(), zprava, jenTerminy]);
  const priprava = await pripravDavku(s, { zprava, ucel: 'obsah', otiskObsahu: 'x', telo: () => '[]' });
  assert.equal(priprava, null);
  assert.equal((await polozky(db, zprava))[0].stav, 'zahozena');
});

test('P4 a P7: zrušení termínů nechá hlídání a naopak, zrušení všeho nic nezařadí do fronty', async () => {
  const { db, s } = await novaDb();
  const a = await odberatel(db, 'a@example.test', { terminy: true, skoly: ['600000001', '600000002'] });
  const pocetPolozek = async () => (await db.query(`select count(*)::int as n from polozka_odeslani`)).rows[0].n;
  const pred = await pocetPolozek();

  await zrusTerminyTx(s, a);
  assert.equal((await db.query(`select count(*)::int as n from odber_novinek`)).rows[0].n, 0);
  assert.equal((await db.query(`select count(*)::int as n from odber_skoly`)).rows[0].n, 2, 'hlídání zůstává');
  assert.equal((await db.query(`select count(*)::int as n from odberatel`)).rows[0].n, 1, 'identita zůstává, pořád něco odebírá');

  await zrusHlidaniTx(s, a, '600000001');
  assert.equal((await db.query(`select count(*)::int as n from odber_skoly`)).rows[0].n, 1);

  const b = await odberatel(db, 'b@example.test', { terminy: true, skoly: ['600000001'] });
  await zrusHlidaniTx(s, b);
  assert.equal((await db.query(`select count(*)::int as n from odber_novinek where odberatel_id = $1`, [b])).rows[0].n, 1, 'odběr termínů zůstává');

  await zrusVseTx(s, a);
  await zrusTerminyTx(s, b);
  assert.equal((await db.query(`select count(*)::int as n from odberatel`)).rows[0].n, 0, 'osiřelé identity zmizely');
  assert.equal(await pocetPolozek(), pred, 'zrušení nic nezařadilo do fronty');
});

test('K14: zrušení všeho zahodí čekající položky obou druhů', async () => {
  const { db, s } = await novaDb();
  const a = await odberatel(db, 'a@example.test', { terminy: true, skoly: ['600000001'] });
  for (const zprava of ['hlidani-2026-11-03', 'kriteria-2027']) {
    await db.query(`insert into polozka_odeslani (id, zprava, ucel, odberatel_id, adresat_otisk, stav) values ($1, $2, 'obsah', $3, 'o', 'ceka')`, [randomUUID(), zprava, a]);
  }
  await zrusHlidaniTx(s, a);
  const po1 = (await db.query(`select zprava, stav from polozka_odeslani order by zprava`)).rows;
  assert.deepEqual(po1.map((r) => `${r.zprava}:${r.stav}`), ['hlidani-2026-11-03:zahozena', 'kriteria-2027:ceka'], 'hlídání nezahodí zprávu termínů');
  await zrusVseTx(s, a);
  assert.ok((await db.query(`select stav from polozka_odeslani`)).rows.every((r) => r.stav === 'zahozena'));
});

test('N2: událost commitnutá po sestavení souhrnu se objeví v následujícím souhrnu', async () => {
  const { db, s } = await novaDb();
  const o = await odberatel(db, 'rodina@example.test', { skoly: ['600000001'] });
  await udalost(db, { klic: 'a', veta: 'Událost A.', skoly: ['600000001'], kdy: '2026-11-02T03:00:00Z' });
  const den1 = zpravaHlidani('2026-11-03');
  const kdy1 = new Date('2026-11-03T06:00:00Z');
  await naplnFrontuHlidani(s, den1, kdy1);
  // Transakce začala 05:59:59, commit přišel až po sestavení souhrnu.
  await udalost(db, { klic: 'pozdni', veta: 'Pozdní událost.', skoly: ['600000001'], kdy: '2026-11-03T05:59:59Z' });
  const text1 = (await sestavSouhrny(s, den1, kdy1, NAZEV)).get(o).souhrn.text;
  assert.ok(text1.includes('Událost A.') && !text1.includes('Pozdní událost.'));
  await db.query(`update polozka_odeslani set stav = 'odeslana', odeslano = now() where zprava = $1`, [den1]);

  const den2 = zpravaHlidani('2026-11-04');
  const kdy2 = new Date('2026-11-04T06:00:00Z');
  assert.equal(await naplnFrontuHlidani(s, den2, kdy2), 1);
  const text2 = (await sestavSouhrny(s, den2, kdy2, NAZEV)).get(o).souhrn.text;
  assert.ok(text2.includes('Pozdní událost.') && !text2.includes('Událost A.'));
});

test('N3: společné zrušení uzavře doklad hlídání a smaže osiřelou identitu', async () => {
  const { db, s } = await novaDb();
  const o = await odberatel(db, 'rodina@example.test', { skoly: ['600000001'] });
  await db.query(
    `insert into doklad_souhlasu (id, odberatel_id, email_otisk, souhlas_verze, zdroj, ucel) values ($1, $2, 'x', 'v1', 'test', 'hlidani_skol')`,
    [randomUUID(), o],
  );
  await zrusVseTx(s, o);
  assert.equal((await db.query(`select 1 from odberatel where id = $1`, [o])).rows.length, 0);
  const d = (await db.query(`select zaniklo, smazat_po from doklad_souhlasu where email_otisk = 'x'`)).rows[0];
  assert.ok(d.zaniklo && d.smazat_po);
});
