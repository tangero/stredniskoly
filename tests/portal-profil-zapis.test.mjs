import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { MIGRACE_PORTALU } from '../src/lib/portal-schema.ts';
import { zapisUdaje, opravRedakce, vratPredchozi, udajeSkoly } from '../src/lib/portal-profil.ts';
import { PortalChyba } from '../src/lib/portal-ucty.ts';

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
