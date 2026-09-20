import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { MIGRACE_PORTALU } from '../src/lib/portal-schema.ts';

// Skutečný Postgres v procesu (PGlite): částečné unikátní indexy a kód chyby
// 23505 se chovají stejně jako v Neonu. Testuje se samotná tabulka, ne knihovna
// nad ní – ta přijde v dalším kroku.

async function novaDb() {
  const db = new PGlite();
  for (const prikaz of MIGRACE_PORTALU) await db.exec(prikaz);
  return db;
}

/** Vloží hodnotu pole. Vrací id řádku, aby na něj šlo navázat opravu. */
async function vloz(db, { redizo = '600171701', pole, hodnota, zdroj = 'skola', nahrazuje = null }) {
  const id = randomUUID();
  await db.query(
    `insert into portal_profil (id, redizo, pole, hodnota, nazev, verze_prijimani, zdroj, nahrazuje_id, zmenu_provedl)
     values ($1, $2, $3, $4, 'Gymnázium', '2027', $5, $6, 'test')`,
    [id, redizo, pole, hodnota, zdroj, nahrazuje],
  );
  return id;
}

async function zneplatni(db, id) {
  await db.query(`update portal_profil set zneplatneno = now() where id = $1`, [id]);
}

async function platneHodnoty(db, redizo = '600171701') {
  const r = await db.query(
    `select pole, hodnota from portal_profil where redizo = $1 and zneplatneno is null order by pole`,
    [redizo],
  );
  return r.rows;
}

test('dvě platné hodnoty téhož pole databáze nepustí', async () => {
  const db = await novaDb();
  await vloz(db, { pole: 'skolne', hodnota: 'Zdarma' });
  await assert.rejects(
    () => vloz(db, { pole: 'skolne', hodnota: '12 000 Kč ročně' }),
    (e) => e.code === '23505',
  );
});

test('oprava hodnoty je zneplatnění staré a vložení nové s odkazem na ni', async () => {
  const db = await novaDb();
  const stare = await vloz(db, { pole: 'dny_otevrenych_dveri', hodnota: '24. 11. 2022' });
  await zneplatni(db, stare);
  const nove = await vloz(db, {
    pole: 'dny_otevrenych_dveri',
    hodnota: '12. 11. 2026',
    zdroj: 'redakce',
    nahrazuje: stare,
  });

  assert.deepEqual(await platneHodnoty(db), [{ pole: 'dny_otevrenych_dveri', hodnota: '12. 11. 2026' }]);

  // Historie zůstala celá a řetěz drží: z nového řádku se dá dojít na starý.
  const r = await db.query(
    `select p.hodnota as nova, s.hodnota as stara, p.zdroj
       from portal_profil p join portal_profil s on s.id = p.nahrazuje_id
      where p.id = $1`,
    [nove],
  );
  assert.deepEqual(r.rows, [{ nova: '12. 11. 2026', stara: '24. 11. 2022', zdroj: 'redakce' }]);
});

test('smazané pole je zneplatnění bez následníka a uvolní místo nové hodnotě', async () => {
  const db = await novaDb();
  const id = await vloz(db, { pole: 'ubytovani', hodnota: 'ne' });
  await zneplatni(db, id);
  assert.deepEqual(await platneHodnoty(db), []);

  await vloz(db, { pole: 'ubytovani', hodnota: 'ano' });
  assert.deepEqual(await platneHodnoty(db), [{ pole: 'ubytovani', hodnota: 'ano' }]);
});

test('index neblokuje jiné pole ani jinou školu', async () => {
  const db = await novaDb();
  await vloz(db, { pole: 'skolne', hodnota: 'Zdarma' });
  await vloz(db, { pole: 'ubytovani', hodnota: 'ne' });
  await vloz(db, { redizo: '600005631', pole: 'skolne', hodnota: '12 000 Kč ročně' });

  assert.equal((await platneHodnoty(db)).length, 2);
  assert.deepEqual(await platneHodnoty(db, '600005631'), [{ pole: 'skolne', hodnota: '12 000 Kč ročně' }]);
});

test('zdroj hodnoty je jen škola nebo redakce', async () => {
  const db = await novaDb();
  await assert.rejects(
    () => vloz(db, { pole: 'skolne', hodnota: 'Zdarma', zdroj: 'inspis' }),
    (e) => e.code === '23514',
  );
});
