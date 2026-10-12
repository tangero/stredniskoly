import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { MIGRACE_PORTALU } from '../src/lib/portal-schema.ts';
import { zapisHlaseni, propojIssue } from '../src/lib/hlaseni.ts';
import { uzavreneIssue, vetaOOprave, obsahEmailu, oznamIssue, uklid, ZASTUPNY_TEXT } from '../scripts/brana/oznameni-opravy.mjs';

async function novaDb() {
  const db = new PGlite();
  for (const prikaz of MIGRACE_PORTALU) await db.exec(prikaz);
  await db.exec(readFileSync(new URL('../db/migrace/007-hlaseni-oznameni.sql', import.meta.url), 'utf8'));
  return { db, s: { dotaz: async (sql, h = []) => { const r = await db.query(sql, h); return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length }; } } };
}
const HL = (email) => ({ email, popis: 'U oboru je špatně počet míst.', url: 'https://www.prijimackynaskolu.cz/skola/600171701-x' });

test('PR uzavírá issue slovy Closes/Fixes/Resolves', () => {
  assert.deepEqual(uzavreneIssue('Closes #12\nfixes #13, Closes #12'), [12, 13]);
  assert.deepEqual(uzavreneIssue('Souvisí s #5'), []);
});

test('věta o opravě je z oddílu Pro oznamovatele celá, i s daty; Pro vlastníka se nepoužije', () => {
  const telo = '## Pro vlastníka\nNa stránce školy uvidíš správný počet míst.\n\n'
    + '## Pro oznamovatele\nTermín přijímacích zkoušek 1. kola je opravený na 30. 8. 2026 a 9. třída už vidí správné datum.\n\n## Kontroly\n';
  assert.equal(vetaOOprave(telo), 'Termín přijímacích zkoušek 1. kola je opravený na 30. 8. 2026 a 9. třída už vidí správné datum.');
  assert.equal(vetaOOprave('Closes #1\n\n## Pro vlastníka\nNa stránce uvidíš správný počet míst.'), '');
  assert.equal(vetaOOprave('## Pro oznamovatele\nPočet míst je opravený. https://www.prijimackynaskolu.cz/skola/1-x'), 'Počet míst je opravený.');
});

test('bez věty e-mail nezdvojuje obecnou větu', () => {
  const o = obsahEmailu({ veta: '', adresa: '' });
  assert.equal((o.text.match(/nahlásili/g) || []).length, 1);
  assert.doesNotMatch(o.text, /na webu\. \n/);
});

test('e-mail má větu o opravě a adresu, HTML je uvozené', () => {
  const o = obsahEmailu({ veta: 'Správně <b>místa</b>.', adresa: 'https://www.prijimackynaskolu.cz/skola/1-x' });
  assert.match(o.text, /opravená/);
  assert.match(o.text, /skola\/1-x/);
  assert.doesNotMatch(o.html, /<b>/);
});

test('K1 a K2: jeden e-mail, adresa po odeslání zmizí z databáze, druhý běh nic neposílá', async () => {
  const { s } = await novaDb();
  const id = await zapisHlaseni(s, HL('rodic@example.cz'));
  await propojIssue(s, id, 77);
  const odeslane = [];
  const posli = async (p) => { odeslane.push(p); return true; };
  assert.deepEqual(await oznamIssue(s, 77, { veta: 'Opraveno.', adresa: 'https://x.cz/a', posli }), { odeslano: 1, selhalo: 0 });
  assert.equal(odeslane.length, 1);
  assert.equal(odeslane[0].to, 'rodic@example.cz');
  assert.equal(odeslane[0].klic, `hlaseni-oprava-${id}`);
  const radek = (await s.dotaz('select email, oznameno from hlaseni_chyby')).rows[0];
  assert.equal(radek.email, ZASTUPNY_TEXT);
  assert.ok(radek.oznameno);
  assert.deepEqual(await oznamIssue(s, 77, { veta: 'Opraveno.', adresa: '', posli }), { odeslano: 0, selhalo: 0 });
  assert.equal(odeslane.length, 1);
});

test('K3: jiné issue nebo anonymizovaná adresa nic nespustí; selhání odeslání adresu zachová', async () => {
  const { s } = await novaDb();
  const a = await zapisHlaseni(s, HL('rodic@example.cz'));
  await propojIssue(s, a, 10);
  const b = await zapisHlaseni(s, HL(ZASTUPNY_TEXT));
  await propojIssue(s, b, 11);
  let volano = 0;
  const posli = async () => { volano += 1; return false; };
  assert.deepEqual(await oznamIssue(s, 11, { veta: 'x', adresa: '', posli }), { odeslano: 0, selhalo: 0 });
  assert.deepEqual(await oznamIssue(s, 99, { veta: 'x', adresa: '', posli }), { odeslano: 0, selhalo: 0 });
  assert.equal(volano, 0);
  assert.deepEqual(await oznamIssue(s, 10, { veta: 'x', adresa: '', posli }), { odeslano: 0, selhalo: 1 });
  assert.equal((await s.dotaz('select email from hlaseni_chyby where id = $1', [a])).rows[0].email, 'rodic@example.cz');
});

test('po 90 dnech se neoznámená adresa anonymizuje, čerstvá zůstane', async () => {
  const { s } = await novaDb();
  const stara = await zapisHlaseni(s, HL('stara@example.cz'));
  await zapisHlaseni(s, HL('nova@example.cz'));
  await s.dotaz(`update hlaseni_chyby set vytvoreno = now() - interval '91 days' where id = $1`, [stara]);
  assert.equal(await uklid(s), 1);
  const e = (await s.dotaz('select email from hlaseni_chyby order by vytvoreno')).rows.map((r) => r.email);
  assert.deepEqual(e, [ZASTUPNY_TEXT, 'nova@example.cz']);
});
