import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { MIGRACE_NOVINEK, TABULKY_NOVINEK } from '../src/lib/novinky-schema.ts';

const SQL = readFileSync(new URL('../db/migrace/001-novinky.sql', import.meta.url), 'utf8');

test('každý příkaz migrace je idempotentní', () => {
  for (const prikaz of MIGRACE_NOVINEK) {
    assert.match(
      prikaz,
      /^create (table|index|unique index) if not exists/,
      `příkaz není idempotentní: ${prikaz.slice(0, 60)}`,
    );
  }
});

test('migrace nic nemaže a nic nepřepisuje', () => {
  // Hledá se mazání jako **příkaz**, ne slovo `delete` v `on delete cascade`,
  // které je součástí definice cizího klíče a nic nemaže samo o sobě.
  const zakazane = /^\s*(drop\b|truncate\b|delete\s+from\b|update\b|alter\s+table\b)/im;
  for (const prikaz of MIGRACE_NOVINEK) {
    assert.ok(!zakazane.test(prikaz), `nebezpečný příkaz: ${prikaz.slice(0, 60)}`);
  }
});

test('modul a vygenerovaný .sql se nerozešly', () => {
  // Soubor se generuje příkazem `--zapis-sql`; test hlídá, že to někdo udělal.
  for (const prikaz of MIGRACE_NOVINEK) {
    assert.ok(SQL.includes(prikaz), `v .sql chybí příkaz: ${prikaz.slice(0, 60)}`);
  }
  const pocetVSql = (SQL.match(/^create /gm) ?? []).length;
  assert.equal(pocetVSql, MIGRACE_NOVINEK.length);
});

test('pořadí příkazů respektuje závislosti cizích klíčů', () => {
  const poradi = MIGRACE_NOVINEK.map((p) => p.match(/if not exists (\w+)/)?.[1]).filter(Boolean);
  const index = (t) => poradi.indexOf(t);
  // Na odberatele a zadost se odkazuje polozka_odeslani, na davku take.
  assert.ok(index('odberatel') < index('polozka_odeslani'));
  assert.ok(index('zadost_o_potvrzeni') < index('polozka_odeslani'));
  assert.ok(index('davka') < index('polozka_odeslani'));
  assert.ok(index('polozka_odeslani') < index('webhook_udalost'));
});

test('všechny potřebné tabulky migrace zakládá', () => {
  const zakladane = MIGRACE_NOVINEK.filter((p) => p.startsWith('create table')).map(
    (p) => p.match(/if not exists (\w+)/)?.[1],
  );
  for (const tabulka of TABULKY_NOVINEK) {
    assert.ok(zakladane.includes(tabulka), `migrace nezakládá ${tabulka}`);
  }
  assert.equal(zakladane.length, TABULKY_NOVINEK.length);
});
