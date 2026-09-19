import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { MIGRACE_PORTALU } from '../src/lib/portal-schema.ts';
import {
  PortalChyba,
  uplatniKod,
  zalozSpravceZRejstriku,
  zmenRoli,
  zrusRoli,
  predejSpravcovstvi,
  dosadSpravce,
  vytvorPozvanku,
  prijmiPozvanku,
  spotrebujOdkaz,
  spravceSkoly,
  platneRoleSkoly,
  historieSkoly,
  verejniSpravci,
  anonymizujOsobu,
  overUdajeOsoby,
  zrusPozvanku,
  zapisUdalost,
  otevrenePozvanky,
  vymazKontakt,
} from '../src/lib/portal-ucty.ts';

// Skutečný Postgres v procesu (PGlite): unikátní částečné indexy, `for update`
// a kódy chyb 23505 se chovají stejně jako v Neonu.

async function novaDb() {
  const db = new PGlite();
  for (const prikaz of MIGRACE_PORTALU) await db.exec(prikaz);
  const spojeni = (klient) => ({
    dotaz: async (sql, hodnoty = []) => {
      const r = await klient.query(sql, hodnoty);
      // pg (Neon) vrací u selectu rowCount = počet řádků, PGlite affectedRows = 0.
      return { rows: r.rows, rowCount: r.affectedRows || r.rows.length };
    },
  });
  return {
    db,
    s: spojeni(db),
    tx: (prace) => db.transaction((t) => prace(spojeni(t))),
  };
}

const JANA = { email: 'jana.novakova@gyms.cz', jmeno: 'Jana Nováková', funkce: 'zástupkyně ředitele', zverejnit_jmeno: true };
const PETR = { email: 'petr.svoboda@gyms.cz', jmeno: 'Petr Svoboda', funkce: 'učitel', zverejnit_jmeno: false };

test('overUdajeOsoby: vyžaduje jméno a příjmení a platný e-mail', () => {
  assert.equal(overUdajeOsoby({ email: 'x@y.cz', jmeno: 'Jana' }).ok, false);
  assert.equal(overUdajeOsoby({ email: 'nejde', jmeno: 'Jana Nová' }).ok, false);
  const ok = overUdajeOsoby({ email: ' X@Y.cz ', jmeno: ' Jana   Nová ', funkce: 'ředitelka', zverejnit_jmeno: true });
  assert.deepEqual(ok, { ok: true, udaje: { email: 'x@y.cz', jmeno: 'Jana Nová', funkce: 'ředitelka', zverejnit_jmeno: true } });
});

test('uplatnění kódu založí správce a kód spotřebuje', async () => {
  const { s, tx } = await novaDb();
  const role = await tx((t) => uplatniKod(t, 'hash1', '600000001', JANA));
  assert.equal(role.role, 'spravce');
  assert.equal(role.zmenu_provedl, 'kod');
  await assert.rejects(
    tx((t) => uplatniKod(t, 'hash1', '600000001', PETR)),
    (e) => e instanceof PortalChyba && e.kod === 'kod_uplatnen',
  );
  // Druhý kód téže školy správce nepřidá: jeden platný správce na školu.
  await assert.rejects(
    tx((t) => uplatniKod(t, 'hash2', '600000001', PETR)),
    (e) => e instanceof PortalChyba && e.kod === 'skola_ma_spravce',
  );
  assert.equal((await platneRoleSkoly(s, '600000001')).length, 1);
});

test('databáze sama odmítne druhého platného správce', async () => {
  const { db, tx } = await novaDb();
  await tx((t) => uplatniKod(t, 'hash1', '600000001', JANA));
  await assert.rejects(
    db.query(
      `insert into portal_role (id, redizo, osoba_id, role, email, jmeno, zmenu_provedl)
       values (gen_random_uuid(), '600000001', gen_random_uuid(), 'spravce', 'a@b.cz', 'A B', 'test')`,
    ),
    /portal_role_jeden_spravce|duplicate key/,
  );
});

test('rejstříkový odkaz založí správce jen škole bez správce', async () => {
  const { tx } = await novaDb();
  const role = await tx((t) => zalozSpravceZRejstriku(t, '600000002', JANA, 'INFO@gyms.cz'));
  assert.equal(role.zmenu_provedl, 'rejstrik-odkaz');
  assert.equal(role.duvod, 'odkaz na info@gyms.cz');
  await assert.rejects(
    tx((t) => zalozSpravceZRejstriku(t, '600000002', PETR, 'info@gyms.cz')),
    (e) => e.kod === 'skola_ma_spravce',
  );
});

test('změna údajů přidá nový záznam a starý zneplatní, osoba zůstává', async () => {
  const { s, tx } = await novaDb();
  const puvodni = await tx((t) => uplatniKod(t, 'h', '600000003', JANA));
  const nova = await tx((t) => zmenRoli(t, puvodni.id, { email: 'jana@gyms.cz', funkce: 'ředitelka' }, 'sam'));
  assert.equal(nova.osoba_id, puvodni.osoba_id);
  assert.equal(nova.nahrazuje_id, puvodni.id);
  assert.equal(nova.email, 'jana@gyms.cz');
  assert.equal(nova.jmeno, JANA.jmeno);
  const historie = await historieSkoly(s, '600000003');
  assert.equal(historie.length, 2);
  assert.ok(historie[0].zneplatneno, 'starý záznam je zneplatněný');
  assert.equal(historie[1].zneplatneno, null);
  // Starý záznam už změnit nejde: někdo jiný ho mezitím nahradil.
  await assert.rejects(tx((t) => zmenRoli(t, puvodni.id, { jmeno: 'X Y' }, 'sam')), (e) => e.kod === 'role_neplatna');
});

test('změna v administraci bez důvodu neprojde a nic nezapíše', async () => {
  const { s, tx } = await novaDb();
  const r = await tx((t) => uplatniKod(t, 'h', '600000004', JANA));
  await assert.rejects(tx((t) => zmenRoli(t, r.id, { jmeno: 'Jiná Osoba' }, 'admin:patrick', '')), (e) => e.kod === 'neplatne_udaje');
  assert.equal((await historieSkoly(s, '600000004')).length, 1);
});

test('pozvánka: editor vznikne jen jednou a jen z platné pozvánky', async () => {
  const { s, tx } = await novaDb();
  const spravce = await tx((t) => uplatniKod(t, 'h', '600000005', JANA));
  const pozvanka = await tx((t) => vytvorPozvanku(t, spravce, PETR.email));
  const editor = await tx((t) => prijmiPozvanku(t, pozvanka.id, PETR.jmeno, PETR.funkce));
  assert.equal(editor.role, 'editor');
  assert.equal(editor.email, PETR.email);
  assert.equal(editor.zverejnit_jmeno, false, 'jméno editora se nezveřejňuje');
  await assert.rejects(tx((t) => prijmiPozvanku(t, pozvanka.id, PETR.jmeno, '')), (e) => e.kod === 'pozvanka_neplatna');
  await assert.rejects(tx((t) => vytvorPozvanku(t, spravce, PETR.email)), (e) => e.kod === 'uz_ma_roli');
  await assert.rejects(tx((t) => vytvorPozvanku(t, editor, 'dalsi@gyms.cz')), (e) => e.kod === 'neplatne_udaje');
  assert.equal((await platneRoleSkoly(s, '600000005')).length, 2);
});

test('předání správcovství: starý správce zůstane editorem, souhlas se nepřebírá', async () => {
  const { s, tx } = await novaDb();
  const spravce = await tx((t) => uplatniKod(t, 'h', '600000006', JANA));
  const pozvanka = await tx((t) => vytvorPozvanku(t, spravce, PETR.email));
  const editor = await tx((t) => prijmiPozvanku(t, pozvanka.id, PETR.jmeno, PETR.funkce));
  const novy = await tx((t) => predejSpravcovstvi(t, spravce.id, editor.id, 'sam'));
  assert.equal(novy.osoba_id, editor.osoba_id);
  assert.equal(novy.zverejnit_jmeno, false);
  const platne = await platneRoleSkoly(s, '600000006');
  assert.deepEqual(platne.map((r) => [r.jmeno, r.role]), [[PETR.jmeno, 'spravce'], [JANA.jmeno, 'editor']]);
});

test('správce nejde zrušit, editora ano', async () => {
  const { s, tx } = await novaDb();
  const spravce = await tx((t) => uplatniKod(t, 'h', '600000007', JANA));
  await assert.rejects(tx((t) => zrusRoli(t, spravce.id, 'admin:patrick', 'test')), (e) => e.kod === 'posledni_spravce');
  const pozvanka = await tx((t) => vytvorPozvanku(t, spravce, PETR.email));
  const editor = await tx((t) => prijmiPozvanku(t, pozvanka.id, PETR.jmeno, ''));
  await tx((t) => zrusRoli(t, editor.id, 'sam'));
  assert.equal((await platneRoleSkoly(s, '600000007')).length, 1);
});

test('dosazení správce adminem: původní se zneplatní nebo zůstane editorem', async () => {
  const { s, tx } = await novaDb();
  const spatny = await tx((t) => uplatniKod(t, 'h', '600000008', { ...PETR, email: 'sekretariat@gyms.cz' }));
  const novy = await tx((t) => dosadSpravce(t, '600000008', JANA, 'patrick', 'kód uplatnil sekretariát', false));
  assert.equal(novy.zmenu_provedl, 'admin:patrick');
  assert.equal(novy.duvod, 'kód uplatnil sekretariát');
  assert.equal((await spravceSkoly(s, '600000008')).id, novy.id);
  assert.equal((await platneRoleSkoly(s, '600000008')).length, 1);
  // Znovu dosazená osoba (stejný e-mail) zůstane stejnou osobou.
  const zpet = await tx((t) => dosadSpravce(t, '600000008', { ...PETR, email: 'sekretariat@gyms.cz' }, 'patrick', 'omyl', true));
  assert.equal(zpet.osoba_id, spatny.osoba_id);
  const platne = await platneRoleSkoly(s, '600000008');
  assert.deepEqual(platne.map((r) => r.role), ['spravce', 'editor']);
});

test('dosazení editora téže školy za správce nahradí jeho editorský záznam', async () => {
  const { s, tx } = await novaDb();
  const spravce = await tx((t) => uplatniKod(t, 'h', '600000009', JANA));
  const pozvanka = await tx((t) => vytvorPozvanku(t, spravce, PETR.email));
  const editor = await tx((t) => prijmiPozvanku(t, pozvanka.id, PETR.jmeno, ''));
  const novy = await tx((t) => dosadSpravce(t, '600000009', PETR, 'patrick', 'odchod správkyně', false));
  assert.equal(novy.osoba_id, editor.osoba_id);
  assert.equal(novy.nahrazuje_id, editor.id);
  assert.deepEqual((await platneRoleSkoly(s, '600000009')).map((r) => r.jmeno), [PETR.jmeno]);
});

test('jednorázový odkaz jde spotřebovat jen jednou', async () => {
  const { s } = await novaDb();
  assert.equal(await spotrebujOdkaz(s, 'n1', 'prihlaseni'), true);
  assert.equal(await spotrebujOdkaz(s, 'n1', 'prihlaseni'), false);
});

test('veřejní správci: jméno jen se souhlasem', async () => {
  const { s, tx } = await novaDb();
  await tx((t) => uplatniKod(t, 'a', '600000010', JANA));
  await tx((t) => uplatniKod(t, 'b', '600000011', { ...PETR, email: 'p@jina.cz' }));
  const verejni = Object.fromEntries((await verejniSpravci(s)).map((v) => [v.redizo, v]));
  assert.equal(verejni['600000010'].jmeno, JANA.jmeno);
  assert.equal(verejni['600000010'].funkce, JANA.funkce);
  assert.equal(verejni['600000011'].jmeno, null);
});

test('odvolání souhlasu je nový záznam a jméno z webu zmizí', async () => {
  const { s, tx } = await novaDb();
  const r = await tx((t) => uplatniKod(t, 'a', '600000012', JANA));
  await tx((t) => zmenRoli(t, r.id, { zverejnit_jmeno: false }, 'sam'));
  const [v] = await verejniSpravci(s);
  assert.equal(v.jmeno, null);
  assert.equal((await historieSkoly(s, '600000012')).length, 2);
});

test('anonymizace: nejdřív jiný správce, pak zmizí jméno i e-mail z historie', async () => {
  const { s, tx } = await novaDb();
  const r = await tx((t) => uplatniKod(t, 'a', '600000013', JANA));
  await assert.rejects(tx((t) => anonymizujOsobu(t, r.osoba_id, 'patrick', 'žádost')), (e) => e.kod === 'posledni_spravce');
  await tx((t) => dosadSpravce(t, '600000013', PETR, 'patrick', 'odchod', true));
  await tx((t) => anonymizujOsobu(t, r.osoba_id, 'patrick', 'žádost GDPR'));
  const historie = await historieSkoly(s, '600000013');
  assert.ok(historie.every((h) => h.jmeno !== JANA.jmeno && h.email !== JANA.email));
  assert.deepEqual((await platneRoleSkoly(s, '600000013')).map((h) => h.jmeno), [PETR.jmeno]);
});

test('anonymizace: čistí i pozvánky a události, napříč školami', async () => {
  const { db, s, tx } = await novaDb();
  const a = await tx((t) => uplatniKod(t, 'a', '600000020', JANA));
  const b = await tx((t) => zalozSpravceZRejstriku(t, '600000021', JANA, 'info@skola.cz'));
  const petr = await tx((t) => uplatniKod(t, 'c', '600000022', PETR));
  const pozvanka = await tx((t) => vytvorPozvanku(t, petr, JANA.email));
  await zapisUdalost(s, '600000022', null, 'navrh_odeslan', { issue: 1, kanal: 'magic', kontakt: JANA.email });
  await tx((t) => zmenRoli(t, a.id, { jmeno: 'Jana Nováková-Malá' }, 'sam'));
  await tx((t) => dosadSpravce(t, '600000020', { ...PETR, email: 'x@gyms.cz' }, 'patrick', 'odchod', false));
  await tx((t) => dosadSpravce(t, '600000021', { ...PETR, email: 'y@gyms.cz' }, 'patrick', 'odchod', false));
  await tx((t) => anonymizujOsobu(t, b.osoba_id, 'patrick', 'žádost GDPR'));

  const vse = async (sql) => JSON.stringify((await db.query(sql)).rows);
  for (const tabulka of ['portal_role', 'portal_pozvanka', 'portal_udalost']) {
    const obsah = await vse(`select * from ${tabulka}`);
    assert.ok(!obsah.includes(JANA.email), `${tabulka} drží e-mail`);
    assert.ok(!obsah.includes('Nováková'), `${tabulka} drží jméno`);
  }
  // Nevyřízená pozvánka na její adresu se zrušila.
  assert.equal((await otevrenePozvanky(s, '600000022')).some((p) => p.id === pozvanka.id), false);
});

test('události nekopírují jméno ani e-mail, jen odkaz na záznam', async () => {
  const { db, tx } = await novaDb();
  const r = await tx((t) => uplatniKod(t, 'a', '600000023', JANA));
  await tx((t) => zmenRoli(t, r.id, { jmeno: 'Jana Malá', email: 'jana.mala@gyms.cz' }, 'sam'));
  const detaily = JSON.stringify((await db.query(`select detail from portal_udalost`)).rows);
  assert.ok(!detaily.includes('Jana'));
  assert.ok(!detaily.includes('@'));
  assert.ok(detaily.includes('"pole":["email","jmeno"]'));
});

test('dosazení správce: souběh s jiným dosazením skončí srozumitelnou chybou', async () => {
  const { s } = await novaDb();
  await uplatniKod(s, 'a', '600000024', JANA);
  // Simulace souběhu: první čtení správce ještě nic nevidí.
  let prvni = true;
  const zastarale = {
    dotaz: async (sql, hodnoty) => {
      if (prvni && sql.includes("role = 'spravce'")) {
        prvni = false;
        return { rows: [], rowCount: 0 };
      }
      return s.dotaz(sql, hodnoty);
    },
  };
  await assert.rejects(
    dosadSpravce(zastarale, '600000024', PETR, 'patrick', 'omyl', false),
    (e) => e instanceof PortalChyba && e.kod === 'skola_ma_spravce',
  );
});

test('pozvánky: zrušení adminem chce důvod a uloží ho, nová pozvánka nahradí starou, prošlá neplatí', async () => {
  const { db, s, tx } = await novaDb();
  const spravce = await tx((t) => uplatniKod(t, 'a', '600000025', JANA));
  const prvni = await tx((t) => vytvorPozvanku(t, spravce, PETR.email));
  const druha = await tx((t) => vytvorPozvanku(t, spravce, PETR.email));
  assert.deepEqual((await otevrenePozvanky(s, '600000025')).map((p) => p.id), [druha.id]);
  await assert.rejects(prijmiPozvanku(s, prvni.id, PETR.jmeno, ''), (e) => e.kod === 'pozvanka_neplatna');

  await assert.rejects(zrusPozvanku(s, druha.id, '600000025', 'admin:patrick'), (e) => e.kod === 'neplatne_udaje');
  assert.equal(await zrusPozvanku(s, druha.id, '600000025', 'admin:patrick', 'překlep v adrese'), true);
  assert.equal(await zrusPozvanku(s, druha.id, '600000025', 'admin:patrick', 'podruhé'), false);
  const u = await db.query(`select detail from portal_udalost where typ = 'pozvanka_zrusena'`);
  assert.equal(u.rows.length, 1);
  assert.equal(u.rows[0].detail.duvod, 'překlep v adrese');

  const prosla = await tx((t) => vytvorPozvanku(t, spravce, 'dalsi@gyms.cz'));
  await db.query(`update portal_pozvanka set plati_do = now() - interval '1 day' where id = $1`, [prosla.id]);
  await assert.rejects(prijmiPozvanku(s, prosla.id, 'Karel Dvořák', ''), (e) => e.kod === 'pozvanka_neplatna');
});

test('předání správcovství jen editorovi téže školy', async () => {
  const { tx } = await novaDb();
  const a = await tx((t) => uplatniKod(t, 'a', '600000026', JANA));
  const b = await tx((t) => uplatniKod(t, 'b', '600000027', PETR));
  const poz = await tx((t) => vytvorPozvanku(t, b, 'karel@gyms.cz'));
  const editorB = await tx((t) => prijmiPozvanku(t, poz.id, 'Karel Dvořák', ''));
  await assert.rejects(tx((t) => predejSpravcovstvi(t, a.id, editorB.id, 'sam')), (e) => e.kod === 'neplatne_udaje');
  await assert.rejects(tx((t) => predejSpravcovstvi(t, a.id, b.id, 'sam')), (e) => e.kod === 'neplatne_udaje');
});

test('změna e-mailu na adresu jiné osoby neprojde', async () => {
  const { tx } = await novaDb();
  const jana = await tx((t) => uplatniKod(t, 'a', '600000028', JANA));
  await tx((t) => uplatniKod(t, 'b', '600000029', PETR));
  await assert.rejects(tx((t) => zmenRoli(t, jana.id, { email: PETR.email }, 'sam')), (e) => e.kod === 'email_obsazen');
  // Vlastní adresa jen jinak napsaná projde.
  await tx((t) => zmenRoli(t, jana.id, { email: JANA.email.toUpperCase() }, 'sam'));
});

test('odkaz spotřebovaný v transakci, která selhala, jde použít znovu', async () => {
  const { s, tx } = await novaDb();
  await assert.rejects(
    tx(async (t) => {
      assert.equal(await spotrebujOdkaz(t, 'nonce-x', 'prihlaseni'), true);
      throw new Error('zápis selhal');
    }),
    /zápis selhal/,
  );
  assert.equal(await spotrebujOdkaz(s, 'nonce-x', 'prihlaseni'), true);
  assert.equal(await spotrebujOdkaz(s, 'nonce-x', 'prihlaseni'), false);
});

test('výmaz kontaktu bez účtu: zmizí z událostí, osobu s účtem odmítne', async () => {
  const { db, s, tx } = await novaDb();
  await tx((t) => uplatniKod(t, 'a', '600000030', JANA));
  await zapisUdalost(s, '600000030', null, 'host_z_rejstriku', { issue: 7, kontakt: 'Host@Skola.cz' });
  await assert.rejects(vymazKontakt(s, 'host@skola.cz', 'patrick', ''), (e) => e.kod === 'neplatne_udaje');
  await assert.rejects(vymazKontakt(s, JANA.email, 'patrick', 'žádost'), (e) => e.kod === 'neplatne_udaje');
  assert.equal(await tx((t) => vymazKontakt(t, 'host@skola.cz', 'patrick', 'žádost')), 1);
  const obsah = JSON.stringify((await db.query(`select detail from portal_udalost`)).rows);
  assert.ok(!obsah.toLowerCase().includes('host@skola.cz'));
  assert.ok(obsah.includes('"issue":7'));
});
