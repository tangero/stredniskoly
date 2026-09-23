import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { MIGRACE_PORTALU } from '../src/lib/portal-schema.ts';
import { zapisUdaje, opravRedakce, vratPredchozi, udajeSkoly } from '../src/lib/portal-profil.ts';
import { PortalChyba } from '../src/lib/portal-ucty.ts';
import { validatePortalPayload } from '../src/lib/portal-skol.ts';

// Zápis profilu nad skutečným Postgresem (PGlite). Funkce běží uvnitř
// transakce, stejně jako v aplikaci přes `vTransakci`.

async function novaDb() {
  const db = new PGlite();
  for (const prikaz of MIGRACE_PORTALU) await db.exec(prikaz);
  const spojeni = (klient) => ({
    dotaz: async (sql, hodnoty = []) => {
      const r = await klient.query(sql, hodnoty);
      return { rows: r.rows, rowCount: r.affectedRows || r.rows.length };
    },
  });
  return { s: spojeni(db), tx: (prace) => db.transaction((t) => prace(spojeni(t))) };
}

const ZAKLAD = { redizo: '600171701', nazev: 'Gymnázium', verze_prijimani: '2027' };

test('zápis založí hodnoty a vrátí jen pole, která se opravdu změnila', async () => {
  const { s, tx } = await novaDb();
  const prvni = await tx((t) =>
    zapisUdaje(t, { ...ZAKLAD, udaje: { skolne: 'Zdarma', ubytovani: 'ne' }, zmenuProvedl: 'ucet' }),
  );
  assert.deepEqual(prvni.sort(), ['skolne', 'ubytovani']);

  // Stejné hodnoty podruhé: datum potvrzení se nemá posouvat u údaje,
  // kterého se škola ani nedotkla.
  const druhy = await tx((t) =>
    zapisUdaje(t, { ...ZAKLAD, udaje: { skolne: 'Zdarma', ubytovani: 'ne' }, zmenuProvedl: 'ucet' }),
  );
  assert.deepEqual(druhy, []);

  const r = await s.dotaz(`select count(*)::int as n from portal_profil`);
  assert.equal(r.rows[0].n, 2, 'druhé odeslání nesmí přidat řádky');
});

test('změněná hodnota nahradí starou a stará zůstane v historii', async () => {
  const { s, tx } = await novaDb();
  await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { skolne: 'Zdarma' }, zmenuProvedl: 'ucet' }));
  await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { skolne: '12 000 Kč ročně' }, zmenuProvedl: 'ucet' }));

  const zaznam = await udajeSkoly(s, ZAKLAD.redizo);
  assert.equal(zaznam.udaje.skolne.hodnota, '12 000 Kč ročně');

  const vse = await s.dotaz(`select hodnota, zneplatneno, nahrazuje_id from portal_profil order by platne_od`);
  assert.equal(vse.rows.length, 2);
  assert.ok(vse.rows[0].zneplatneno, 'stará hodnota má být zneplatněná');
  assert.ok(vse.rows[1].nahrazuje_id, 'nová hodnota má odkazovat na tu, kterou nahradila');
});

test('smazání je auditovatelná verze: kdo, proč, a dá se vrátit', async () => {
  const { s, tx } = await novaDb();
  await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { skolne: 'Zdarma' }, zmenuProvedl: 'ucet' }));
  const zmeny = await tx((t) =>
    opravRedakce(t, { ...ZAKLAD, pole: 'skolne', hodnota: '', kdo: 'patrick', duvod: 'škola už školné nevybírá' }),
  );

  assert.deepEqual(zmeny, ['skolne']);
  assert.equal(await udajeSkoly(s, ZAKLAD.redizo), null, 'pole na webu zmizelo');

  // Smazání založí vlastní řádek, jinak by se ztratilo, kdo pole smazal a proč.
  const r = await s.dotaz(
    `select hodnota, zdroj, duvod, zmenu_provedl, nahrazuje_id is not null as navazuje
       from portal_profil order by platne_od desc limit 1`,
  );
  assert.deepEqual(r.rows[0], {
    hodnota: '',
    zdroj: 'redakce',
    duvod: 'škola už školné nevybírá',
    zmenu_provedl: 'admin:patrick',
    navazuje: true,
  });

  // A smazané pole jde vrátit zpět, protože smazání je taky verze.
  const obnoveno = await tx((t) =>
    vratPredchozi(t, { ...ZAKLAD, pole: 'skolne', kdo: 'patrick', duvod: 'smazáno omylem' }),
  );
  assert.equal(obnoveno, 'Zdarma');
  assert.equal((await udajeSkoly(s, ZAKLAD.redizo)).udaje.skolne.hodnota, 'Zdarma');
});

test('zastaralý formulář nepřepíše novější opravu', async () => {
  const { s, tx } = await novaDb();
  await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { skolne: '100 Kč', stravovani: 'jídelna' }, zmenuProvedl: 'ucet' }));

  // Mezitím redakce školné opraví.
  await tx((t) =>
    opravRedakce(t, { ...ZAKLAD, pole: 'skolne', hodnota: '200 Kč', kdo: 'patrick', duvod: 'překlep' }),
  );

  // Editor má pořád otevřený starý formulář (vidí 100 Kč) a mění jen stravování.
  const puvodni = { skolne: '100 Kč', stravovani: 'jídelna' };
  const zmeny = await tx((t) =>
    zapisUdaje(t, {
      ...ZAKLAD,
      udaje: { skolne: '100 Kč', stravovani: 'jídelna a bufet' },
      ocekavane: puvodni,
      zmenuProvedl: 'ucet',
    }),
  );

  assert.deepEqual(zmeny, ['stravovani'], 'projde jen pole, kterého se editor dotkl');
  const zaznam = await udajeSkoly(s, ZAKLAD.redizo);
  assert.equal(zaznam.udaje.skolne.hodnota, '200 Kč', 'oprava redakce zůstala');
  assert.equal(zaznam.udaje.skolne.zdroj, 'redakce', 'a nepřeznačila se na školu');
  assert.equal(zaznam.udaje.stravovani.hodnota, 'jídelna a bufet');
});

test('změna pole, které mezitím změnil někdo jiný, skončí chybou', async () => {
  const { tx } = await novaDb();
  await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { skolne: '100 Kč' }, zmenuProvedl: 'ucet' }));
  await tx((t) =>
    opravRedakce(t, { ...ZAKLAD, pole: 'skolne', hodnota: '200 Kč', kdo: 'patrick', duvod: 'překlep' }),
  );

  await assert.rejects(
    () =>
      tx((t) =>
        zapisUdaje(t, {
          ...ZAKLAD,
          udaje: { skolne: '150 Kč' },
          ocekavane: { skolne: '100 Kč' },
          zmenuProvedl: 'ucet',
        }),
      ),
    (e) => e instanceof PortalChyba && e.kod === 'profil_zmenen',
  );
});

test('mazání pole, které škola nikdy nevyplnila, není změna', async () => {
  const { tx } = await novaDb();
  const zmeny = await tx((t) =>
    zapisUdaje(t, { ...ZAKLAD, udaje: { skolne: '', ubytovani: '   ' }, zmenuProvedl: 'ucet' }),
  );
  assert.deepEqual(zmeny, []);
});

test('obnova nepřeskočí verzi, která vznikla mezi čtením a zápisem', async () => {
  const { s, tx } = await novaDb();
  await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { skolne: '100 Kč' }, zmenuProvedl: 'ucet' }));
  await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { skolne: '200 Kč' }, zmenuProvedl: 'ucet' }));

  // Proložení z review: obnova si přečte předchůdce (100 Kč), ale než stihne
  // zapsat, vznikne verze 300 Kč. Kdyby obnova pokračovala, výsledek 100 Kč by
  // přeskočil 200 Kč i 300 Kč a neodpovídal by žádnému sériovému pořadí.
  const posledni = await s.dotaz(
    `select id from portal_profil where redizo = $1 and pole = 'skolne' order by platne_od desc limit 1`,
    [ZAKLAD.redizo],
  );
  await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { skolne: '300 Kč' }, zmenuProvedl: 'ucet' }));

  await assert.rejects(
    () =>
      tx((t) =>
        zapisUdaje(t, {
          ...ZAKLAD,
          udaje: { skolne: '100 Kč' },
          ocekavanePosledni: { skolne: posledni.rows[0].id },
          zdroj: 'redakce',
          zmenuProvedl: 'admin:patrick',
          duvod: 'vrácení',
        }),
      ),
    (e) => e instanceof PortalChyba && e.kod === 'profil_zmenen',
  );

  assert.equal((await udajeSkoly(s, ZAKLAD.redizo)).udaje.skolne.hodnota, '300 Kč');
});

test('pořadí verzí neurčuje čas začátku transakce', async () => {
  const { s, tx } = await novaDb();

  // Pořadí z review: transakce A začala dřív (starší now()), ale zapsala až po
  // transakci B. Kdyby se poslední verze určovala podle času, dostal by řádek A
  // starší razítko než zneplatněný řádek B a další zápis by vybral B, vyhodnotil
  // pole jako prázdné a zůstal navždy viset na unikátním indexu.
  await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { skolne: '200 Kč' }, zmenuProvedl: 'ucet' }));
  const b = await s.dotaz(`select id from portal_profil where pole = 'skolne'`);
  await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { skolne: '300 Kč' }, zmenuProvedl: 'ucet' }));
  // Ručně dosadíme čas, který by vznikl z now() transakce zahájené dřív.
  await s.dotaz(
    `update portal_profil set platne_od = (select platne_od - interval '1 minute' from portal_profil where id = $1)
      where pole = 'skolne' and id <> $1`,
    [b.rows[0].id],
  );

  // Veřejné čtení i další běžný zápis musí fungovat dál.
  assert.equal((await udajeSkoly(s, ZAKLAD.redizo)).udaje.skolne.hodnota, '300 Kč');
  const zmeny = await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { skolne: '400 Kč' }, zmenuProvedl: 'ucet' }));
  assert.deepEqual(zmeny, ['skolne']);
  assert.equal((await udajeSkoly(s, ZAKLAD.redizo)).udaje.skolne.hodnota, '400 Kč');
});

test('obnova po nerušeném průběhu vrátí přesně předchozí verzi', async () => {
  const { s, tx } = await novaDb();
  await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { skolne: '100 Kč' }, zmenuProvedl: 'ucet' }));
  await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { skolne: '200 Kč' }, zmenuProvedl: 'ucet' }));

  const obnoveno = await tx((t) =>
    vratPredchozi(t, { ...ZAKLAD, pole: 'skolne', kdo: 'patrick', duvod: 'chybná oprava' }),
  );
  assert.equal(obnoveno, '100 Kč');
  assert.equal((await udajeSkoly(s, ZAKLAD.redizo)).udaje.skolne.hodnota, '100 Kč');
});

test('oprava redakcí nese zdroj i důvod, bez důvodu neprojde', async () => {
  const { s, tx } = await novaDb();
  await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { dny_otevrenych_dveri: '24. 11. 2022' }, zmenuProvedl: 'ucet' }));

  await assert.rejects(
    () =>
      tx((t) =>
        zapisUdaje(t, {
          ...ZAKLAD,
          udaje: { dny_otevrenych_dveri: '12. 11. 2026' },
          zmenuProvedl: 'admin:patrick',
        }),
      ),
    (e) => e instanceof PortalChyba && e.kod === 'neplatne_udaje',
  );

  await tx((t) =>
    opravRedakce(t, {
      ...ZAKLAD,
      pole: 'dny_otevrenych_dveri',
      hodnota: '12. 11. 2026',
      kdo: 'patrick',
      duvod: 'termín byl čtyři roky starý',
    }),
  );

  const zaznam = await udajeSkoly(s, ZAKLAD.redizo);
  assert.equal(zaznam.udaje.dny_otevrenych_dveri.zdroj, 'redakce');
  const r = await s.dotaz(`select duvod, zmenu_provedl from portal_profil where zneplatneno is null`);
  assert.deepEqual(r.rows[0], { duvod: 'termín byl čtyři roky starý', zmenu_provedl: 'admin:patrick' });
});


// ---------------------------------------------------------------------------
// Kritéria od školy musí dojít až do databáze. Validace neznámé klíče tiše
// zahazuje (`if (!def) continue;`), takže překlep v názvu pole nebo pole
// vypadlé z PORTAL_POLE by školu nechaly psát do prázdna — bez chyby, bez
// stopy. Tenhle test prožene pole celou cestou: validace → zápis → čtení.
// ---------------------------------------------------------------------------

test('kritéria vlastními slovy projdou validací, zápisem i čtením beze ztráty', async () => {
  const text = 'Součet testů CERMAT; matematika se počítá 1,5×. K tomu až 10 bodů za prospěch.';
  const overeno = validatePortalPayload({
    souhlas_cc_by: true,
    kontakt_email: 'reditelka@skola.cz',
    udaje_sedi: true,
    udaje: { kriteria_vlastnimi_slovy: text, odkaz_kriteria: 'https://skola.cz/prijimacky.pdf' },
  });
  assert.equal(overeno.ok, true, `validace odmítla: ${overeno.ok ? '' : overeno.error}`);
  assert.equal(overeno.udaje.kriteria_vlastnimi_slovy, text, 'validace pole zahodila nebo změnila');
  assert.equal(overeno.udaje.odkaz_kriteria, 'https://skola.cz/prijimacky.pdf');

  const { s, tx } = await novaDb();
  const zmeny = await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: overeno.udaje, zmenuProvedl: 'ucet' }));
  assert.ok(zmeny.includes('kriteria_vlastnimi_slovy'), 'zápis pole nezaznamenal jako změnu');

  const zaznam = await udajeSkoly(s, ZAKLAD.redizo);
  assert.equal(zaznam?.udaje?.kriteria_vlastnimi_slovy?.hodnota, text, 'z databáze se vrátilo něco jiného');
  assert.equal(zaznam?.udaje?.odkaz_kriteria?.hodnota, 'https://skola.cz/prijimacky.pdf');
});

test('pole nad 2 000 znaků validace odmítne nahlas, ne tichým oříznutím', () => {
  const overeno = validatePortalPayload({
    souhlas_cc_by: true,
    kontakt_email: 'reditelka@skola.cz',
    udaje_sedi: true,
    udaje: { kriteria_vlastnimi_slovy: 'x'.repeat(2001) },
  });
  assert.equal(overeno.ok, false);
  assert.match(overeno.error, /nejvýše 2000 znaků/);
});
