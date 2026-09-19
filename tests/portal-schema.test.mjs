import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { MIGRACE_PORTALU } from '../src/lib/portal-schema.ts';

const SQL = readFileSync(new URL('../db/migrace/002-portal.sql', import.meta.url), 'utf8');

test('každý příkaz migrace je idempotentní', () => {
  for (const prikaz of MIGRACE_PORTALU) {
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
  for (const prikaz of MIGRACE_PORTALU) {
    assert.ok(!zakazane.test(prikaz), `nebezpečný příkaz: ${prikaz.slice(0, 60)}`);
  }
});

test('modul a vygenerovaný .sql se nerozešly', () => {
  // Soubor se generuje příkazem `--zapis-sql`; test hlídá, že to někdo udělal.
  for (const prikaz of MIGRACE_PORTALU) {
    assert.ok(SQL.includes(prikaz), `v .sql chybí příkaz: ${prikaz.slice(0, 60)}`);
  }
  const pocetVSql = (SQL.match(/^create /gm) ?? []).length;
  assert.equal(pocetVSql, MIGRACE_PORTALU.length);
});

test('pořadí respektuje cizí klíče na portal_role', () => {
  const poradi = MIGRACE_PORTALU.map((p) => p.match(/^create table if not exists (\w+)/)?.[1]).filter(Boolean);
  for (const t of ['portal_kod_uplatneni', 'portal_pozvanka', 'portal_udalost', 'portal_profil']) {
    assert.ok(poradi.indexOf('portal_role') < poradi.indexOf(t), t);
  }
});

test('jedna platná hodnota na pole a školu hlídá unikátní index', () => {
  const index = MIGRACE_PORTALU.find((p) => p.includes('portal_profil_platna_hodnota'));
  assert.ok(index);
  assert.match(index, /unique index/);
  assert.match(index, /on portal_profil \(redizo, pole\) where zneplatneno is null/);
});

test('jeden platný správce na školu hlídá unikátní index', () => {
  const index = MIGRACE_PORTALU.find((p) => p.includes('portal_role_jeden_spravce'));
  assert.ok(index);
  assert.match(index, /unique index/);
  assert.match(index, /where role = 'spravce' and zneplatneno is null/);
});
