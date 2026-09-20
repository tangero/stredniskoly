import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { MIGRACE_UDALOSTI, TABULKY_UDALOSTI, TYPY_UDALOSTI } from '../src/lib/udalosti-schema.ts';

const SQL = readFileSync(new URL('../db/migrace/004-udalosti.sql', import.meta.url), 'utf8');

test('každý příkaz migrace je idempotentní', () => {
  for (const prikaz of MIGRACE_UDALOSTI) {
    assert.match(prikaz, /^create (table|index|unique index) if not exists/, `příkaz není idempotentní: ${prikaz.slice(0, 60)}`);
  }
});

test('migrace nic nemaže a nic nepřepisuje', () => {
  const zakazane = /^\s*(drop\b|truncate\b|delete\s+from\b|update\b|alter\s+table\b)/im;
  for (const prikaz of MIGRACE_UDALOSTI) {
    assert.ok(!zakazane.test(prikaz), `nebezpečný příkaz: ${prikaz.slice(0, 60)}`);
  }
});

test('modul a vygenerovaný .sql se nerozešly', () => {
  for (const prikaz of MIGRACE_UDALOSTI) {
    assert.ok(SQL.includes(prikaz), `v .sql chybí příkaz: ${prikaz.slice(0, 60)}`);
  }
  assert.equal((SQL.match(/^create /gm) ?? []).length, MIGRACE_UDALOSTI.length);
});

test('každá deklarovaná tabulka se v migraci opravdu zakládá', () => {
  const zalozene = MIGRACE_UDALOSTI.map((p) => p.match(/^create table if not exists (\w+)/)?.[1]).filter(Boolean);
  for (const t of TABULKY_UDALOSTI) assert.ok(zalozene.includes(t), `tabulka ${t} se nezakládá`);
  assert.equal(zalozene.length, TABULKY_UDALOSTI.length);
});

test('novinka z webu školy je plnohodnotný zdroj události (P4)', () => {
  // Jádro rozhodnutí: kdyby novinky měly vlastní potrubí, dostala by rodina
  // dva nesouvisející e-maily o jedné škole.
  assert.ok(TYPY_UDALOSTI.includes('novinka_skoly'));
  assert.deepEqual([...TYPY_UDALOSTI].sort(), ['inspekce_nova', 'novinka_skoly', 'portal_schvalen', 'sada_prepnuta']);
});

test('opakovaný běh rozdílového skriptu nevyrobí druhou událost', () => {
  const index = MIGRACE_UDALOSTI.find((p) => p.includes('udalost_klic'));
  assert.ok(index);
  assert.match(index, /unique index/);
  assert.match(index, /\(klic\)/);
});

test('dotčené školy jsou ve vlastní tabulce, ne polem v události', () => {
  // Souhrn se skládá dotazem „události pro školy tohoto odběratele“ a přepnutí
  // sady se týká stovek škol; pole v jsonb by z indexovaného spojení udělalo
  // průchod tabulkou.
  const vazba = MIGRACE_UDALOSTI.find((p) => p.startsWith('create table if not exists udalost_skola ('));
  assert.ok(vazba);
  assert.match(vazba, /references udalost on delete cascade/);
  assert.match(vazba, /primary key \(udalost_id, redizo\)/);
  assert.ok(MIGRACE_UDALOSTI.some((p) => p.includes('udalost_skola_skola') && p.includes('(redizo)')));
});

test('věta souhrnu se ukládá hotová', () => {
  // Odesílač ji nesmí skládat znovu z dat, která se mezitím přepnula.
  const tabulka = MIGRACE_UDALOSTI.find((p) => p.startsWith('create table if not exists udalost ('));
  assert.match(tabulka, /veta text not null/);
  assert.match(tabulka, /publikovano timestamptz not null/);
});
