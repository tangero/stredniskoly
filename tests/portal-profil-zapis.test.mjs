import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { MIGRACE_PORTALU } from '../src/lib/portal-schema.ts';
import { zapisUdaje, opravRedakce, udajeSkoly } from '../src/lib/portal-profil.ts';
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

test('prázdná hodnota pole smaže, ale nezaloží prázdný řádek', async () => {
  const { s, tx } = await novaDb();
  await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { skolne: 'Zdarma' }, zmenuProvedl: 'ucet' }));
  const zmeny = await tx((t) => zapisUdaje(t, { ...ZAKLAD, udaje: { skolne: '' }, zmenuProvedl: 'ucet' }));

  assert.deepEqual(zmeny, ['skolne']);
  assert.equal(await udajeSkoly(s, ZAKLAD.redizo), null);
  const r = await s.dotaz(`select count(*)::int as n from portal_profil`);
  assert.equal(r.rows[0].n, 1, 'mazání nepřidává řádek, jen zneplatní');
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
