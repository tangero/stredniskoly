import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { MIGRACE_SKOLNICH_NOVINEK, TABULKY_SKOLNICH_NOVINEK } from '../src/lib/skolni-novinky-schema.ts';

const SQL = readFileSync(new URL('../db/migrace/003-skolni-novinky.sql', import.meta.url), 'utf8');

test('každý příkaz migrace je idempotentní', () => {
  for (const prikaz of MIGRACE_SKOLNICH_NOVINEK) {
    assert.match(
      prikaz,
      /^create (table|index|unique index) if not exists/,
      `příkaz není idempotentní: ${prikaz.slice(0, 60)}`,
    );
  }
});

test('migrace nic nemaže a nic nepřepisuje', () => {
  const zakazane = /^\s*(drop\b|truncate\b|delete\s+from\b|update\b|alter\s+table\b)/im;
  for (const prikaz of MIGRACE_SKOLNICH_NOVINEK) {
    assert.ok(!zakazane.test(prikaz), `nebezpečný příkaz: ${prikaz.slice(0, 60)}`);
  }
});

test('modul a vygenerovaný .sql se nerozešly', () => {
  for (const prikaz of MIGRACE_SKOLNICH_NOVINEK) {
    assert.ok(SQL.includes(prikaz), `v .sql chybí příkaz: ${prikaz.slice(0, 60)}`);
  }
  assert.equal((SQL.match(/^create /gm) ?? []).length, MIGRACE_SKOLNICH_NOVINEK.length);
});

test('každá deklarovaná tabulka se v migraci opravdu zakládá', () => {
  const zalozene = MIGRACE_SKOLNICH_NOVINEK.map(
    (p) => p.match(/^create table if not exists (\w+)/)?.[1],
  ).filter(Boolean);
  for (const t of TABULKY_SKOLNICH_NOVINEK) {
    assert.ok(zalozene.includes(t), `tabulka ${t} se nezakládá`);
  }
  assert.equal(zalozene.length, TABULKY_SKOLNICH_NOVINEK.length);
});

test('verze položky odkazuje na položku, ne naopak', () => {
  const poradi = MIGRACE_SKOLNICH_NOVINEK.map(
    (p) => p.match(/^create table if not exists (\w+)/)?.[1],
  ).filter(Boolean);
  assert.ok(poradi.indexOf('skola_novinka') < poradi.indexOf('skola_novinka_verze'));
});

test('jedna položka na zdroj a identitu hlídá unikátní index', () => {
  // Bez něj by opakovaná sklizeň téhož článku vyrobila duplicitní kartu.
  const index = MIGRACE_SKOLNICH_NOVINEK.find((p) => p.includes('skola_novinka_identita'));
  assert.ok(index);
  assert.match(index, /unique index/);
  assert.match(index, /\(redizo, identita\)/);
});

test('položka nese verzi pravidel, kterou byla rozhodnuta', () => {
  // Jinak nejde rekonstruovat, co bylo čtenářům sděleno, ani přepočítat po změně pravidel.
  const tabulka = MIGRACE_SKOLNICH_NOVINEK.find((p) =>
    p.startsWith('create table if not exists skola_novinka ('),
  );
  assert.match(tabulka, /verze_pravidel text not null/);
  assert.match(tabulka, /zobrazeni text not null/);
});
