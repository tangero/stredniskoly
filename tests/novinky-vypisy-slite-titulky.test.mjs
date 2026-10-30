import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

// #556: migrace zneplatní jen staré zprávy s identitou s otiskem titulku a slitým titulkem čtyř škol.
const nacti = (soubor) => readFileSync(new URL(`../db/migrace/${soubor}`, import.meta.url), 'utf8');
const SLITY = 'Exkurze do elektrárny. '.repeat(6);

async function novaDb() {
  const db = new PGlite();
  await db.exec(nacti('003-skolni-novinky.sql'));
  const vloz = (id, redizo, identita, titulek) => db.query(
    `insert into skola_novinka (id, redizo, identita, otisk_obsahu, titulek, url, zobrazeni, verze_pravidel)
     values ($1, $2, $3, 'o', $4, 'https://skola.example.cz/aktuality/', 'karta', 'v1')`,
    [id, redizo, identita, titulek],
  );
  await vloz('00000000-0000-0000-0000-000000000001', '600015700', 'https://skola.example.cz/aktuality#0123456789abcdef', SLITY);
  await vloz('00000000-0000-0000-0000-000000000002', '600015700', 'https://skola.example.cz/aktuality#fedcba9876543210', 'Krátký titulek');
  await vloz('00000000-0000-0000-0000-000000000003', '600015700', 'https://skola.example.cz/aktuality/clanek', SLITY);
  await vloz('00000000-0000-0000-0000-000000000004', '600000001', 'https://jina.example.cz/aktuality#0123456789abcdef', SLITY);
  const feed = (redizo) => db.query(
    `insert into skola_feed (redizo, feed_url, etag, modified_since)
     values ($1, 'https://skola.example.cz/aktuality/', 'W/"abc"', 'Wed, 01 Jan 2026 00:00:00 GMT')`,
    [redizo],
  );
  // 110 znaků: čtečka titulek nezkracuje (MAX_TITULEK 120), identita se nemění, nesmí se zneplatnit
  await vloz('00000000-0000-0000-0000-000000000005', '600015700', 'https://skola.example.cz/aktuality#aaaaaaaaaaaaaaaa', 'A'.repeat(110));
  await feed('600015700');
  await feed('600018083');
  await feed('600000001');
  return db;
}

const zneplatnene = async (db) => (await db.query(
  `select id from skola_novinka where zneplatneno is not null order by id`)).rows.map((r) => r.id.slice(-1));

test('migrace zneplatní jen slitý titulek bez vlastního článku u čtyř škol', async () => {
  const db = await novaDb();
  await db.exec(nacti('010-vypisy-slite-titulky.sql'));
  assert.deepEqual(await zneplatnene(db), ['1']);
});

test('migrace vynuluje validátory zdroje jen u čtyř škol', async () => {
  const db = await novaDb();
  await db.exec(nacti('010-vypisy-slite-titulky.sql'));
  const rows = (await db.query(`select redizo, etag, modified_since from skola_feed`)).rows;
  const podle = Object.fromEntries(rows.map((r) => [r.redizo, r]));
  for (const r of ['600015700', '600018083']) {
    assert.equal(podle[r].etag, null);
    assert.equal(podle[r].modified_since, null);
  }
  assert.equal(podle['600000001'].etag, 'W/"abc"');
  assert.equal(podle['600000001'].modified_since, 'Wed, 01 Jan 2026 00:00:00 GMT');
});

test('migrace je idempotentní',async () => {
  const db = await novaDb();
  await db.exec(nacti('010-vypisy-slite-titulky.sql'));
  const prvni = (await db.query(`select zneplatneno from skola_novinka where id::text like '%1'`)).rows[0].zneplatneno;
  await db.exec(nacti('010-vypisy-slite-titulky.sql'));
  const druhy = (await db.query(`select zneplatneno from skola_novinka where id::text like '%1'`)).rows[0].zneplatneno;
  assert.equal(+prvni, +druhy);
});
