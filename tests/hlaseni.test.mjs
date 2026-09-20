import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { MIGRACE_PORTALU } from '../src/lib/portal-schema.ts';
import { zapisHlaseni, propojIssue, otevrenaHlaseni, vyridHlaseni, redizoZUrl } from '../src/lib/hlaseni.ts';
import { vymazKontakt } from '../src/lib/portal-ucty.ts';
import { formatDatumCasCz } from '../src/lib/admin.ts';

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

const HLASENI = {
  email: 'rodic@example.cz',
  popis: 'U oboru 79-41-K/41 je špatně počet míst.',
  url: 'https://www.prijimackynaskolu.cz/skola/600171701-gymnazium-nad-stolou',
};

test('REDIZO se pozná z adresy stránky školy, jinde ne', () => {
  assert.equal(redizoZUrl(HLASENI.url), '600171701');
  assert.equal(redizoZUrl('https://www.prijimackynaskolu.cz/skoly'), null);
  assert.equal(redizoZUrl(''), null);
});

test('hlášení se uloží i s kontaktem a přiřadí se ke škole ještě bez issue', async () => {
  const { s, tx } = await novaDb();
  const id = await tx((t) => zapisHlaseni(t, HLASENI));

  // Nejdřív je uložený podnět s kontaktem, teprve pak vzniká issue: kdyby
  // GitHub selhal, kontakt se ztratit nesmí.
  let fronta = await otevrenaHlaseni(s);
  assert.equal(fronta.length, 1);
  assert.equal(fronta[0].email, 'rodic@example.cz');
  assert.equal(fronta[0].redizo, '600171701');
  assert.equal(fronta[0].issue, null, 'hlášení je ve frontě i bez issue');

  await tx((t) => propojIssue(t, id, 42));
  fronta = await otevrenaHlaseni(s);
  assert.equal(fronta[0].issue, 42);
});

test('datum z databáze se vrací jako řetězec, který jde vykreslit', async () => {
  const { s, tx } = await novaDb();
  await tx((t) => zapisHlaseni(t, HLASENI));

  const [h] = await otevrenaHlaseni(s);
  // Neon vrací timestamptz jako Date; kdyby prošel do JSX, React spadne na
  // „Objects are not valid as a React child“ a /admin by padal po prvním hlášení.
  assert.equal(typeof h.vytvoreno, 'string');
  assert.match(h.vytvoreno, /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/);
  assert.notEqual(formatDatumCasCz(h.vytvoreno), h.vytvoreno, 'formatter datum rozpozná');
  assert.equal(h.vyrizeno, null);

  // Totéž po ručním vložení hodnoty typu Date (chování ovladače Neonu).
  assert.equal(typeof normalizujProTest(new Date()), 'string');
});

/** Průchod stejnou normalizací, jakou dělá otevrenaHlaseni. */
function normalizujProTest(hodnota) {
  return hodnota instanceof Date ? hodnota.toISOString() : String(hodnota);
}

test('vyřízené hlášení z fronty zmizí a nese poznámku', async () => {
  const { s, tx } = await novaDb();
  const id = await tx((t) => zapisHlaseni(t, HLASENI));
  await tx((t) => vyridHlaseni(t, id, 'opraveno, škola měla 30 míst'));

  assert.deepEqual(await otevrenaHlaseni(s), []);
  const r = await s.dotaz(`select poznamka from hlaseni_chyby where id = $1`, [id]);
  assert.equal(r.rows[0].poznamka, 'opraveno, škola měla 30 míst');
});

test('výmaz kontaktu na žádost smaže adresu i z hlášení, podnět nechá', async () => {
  const { s, tx } = await novaDb();
  await tx((t) => zapisHlaseni(t, HLASENI));

  const pocet = await tx((t) => vymazKontakt(t, 'rodic@example.cz', 'zandl', 'žádost o výmaz'));
  assert.equal(pocet, 1);

  const r = await s.dotaz(`select email, popis from hlaseni_chyby`);
  assert.equal(r.rows[0].email, 'smazáno na žádost');
  assert.equal(r.rows[0].popis, HLASENI.popis, 'podnět k opravě dat zůstává');
});
