// ============================================================================
// Schéma fronty nahlášených veletrhů.
//
// 23. 9. 2026 se ukázalo, že tabulka veletrh_nahlaseni na produkci chyběla:
// db/migrace/005-veletrhy.sql vznikl ručně, nic ho nespouštělo a formulář tak
// nahlášení tiše ukládal jen do e-mailu. Teď se SQL generuje z modulu a spouští
// skriptem jako u událostí a účtů portálu; tyhle testy hlídají, že se modul,
// soubor a zápis formuláře nerozejdou.
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { MIGRACE_VELETRHU, TABULKY_VELETRHU, STAVY_NAHLASENI } from '../src/lib/veletrhy-schema.ts';

const SQL = readFileSync(new URL('../db/migrace/005-veletrhy.sql', import.meta.url), 'utf8');
const ROUTE = readFileSync(new URL('../src/app/api/veletrhy/nahlasit/route.ts', import.meta.url), 'utf8');

test('každý příkaz migrace je idempotentní', () => {
  for (const prikaz of MIGRACE_VELETRHU) {
    assert.match(prikaz, /^create (table|index|unique index) if not exists/, `příkaz není idempotentní: ${prikaz.slice(0, 60)}`);
  }
});

test('migrace nic nemaže a nic nepřepisuje', () => {
  const zakazane = /^\s*(drop\b|truncate\b|delete\s+from\b|update\b|alter\s+table\b)/im;
  for (const prikaz of MIGRACE_VELETRHU) {
    assert.ok(!zakazane.test(prikaz), `nebezpečný příkaz: ${prikaz.slice(0, 60)}`);
  }
});

test('modul a vygenerovaný .sql se nerozešly', () => {
  for (const prikaz of MIGRACE_VELETRHU) {
    assert.ok(SQL.includes(prikaz), `v .sql chybí příkaz: ${prikaz.slice(0, 60)}`);
  }
  assert.equal((SQL.match(/^create /gm) ?? []).length, MIGRACE_VELETRHU.length);
  assert.match(SQL, /GENEROVÁNO z src\/lib\/veletrhy-schema\.ts/, 'SQL musí být vygenerovaný, ne psaný ručně.');
});

test('každá deklarovaná tabulka se v migraci opravdu zakládá', () => {
  const zalozene = MIGRACE_VELETRHU.map((p) => p.match(/^create table if not exists (\w+)/)?.[1]).filter(Boolean);
  for (const t of TABULKY_VELETRHU) assert.ok(zalozene.includes(t), `tabulka ${t} se nezakládá`);
  assert.equal(zalozene.length, TABULKY_VELETRHU.length);
});

test('sloupce, do kterých formulář zapisuje, tabulka má', () => {
  const tabulka = MIGRACE_VELETRHU.find((p) => p.startsWith('create table if not exists veletrh_nahlaseni'));
  const sloupce = new Set(
    tabulka.split('\n').slice(1).map((r) => r.trim().split(/\s+/)[0]).filter((s) => /^[a-z_]+$/.test(s)),
  );
  const zapisy = [...ROUTE.matchAll(/insert into veletrh_nahlaseni\s*\(([^)]*)\)/gi), ...ROUTE.matchAll(/update veletrh_nahlaseni set (\w+)/gi)];
  assert.ok(zapisy.length >= 2, 'Formulář má do fronty zapisovat INSERT a UPDATE příznaku odeslání.');
  for (const z of zapisy) {
    for (const sloupec of z[1].split(',').map((s) => s.trim()).filter(Boolean)) {
      assert.ok(sloupce.has(sloupec), `Formulář zapisuje do sloupce ${sloupec}, který migrace nezakládá.`);
    }
  }
});

test('zamítnuté nahlášení zůstává ve frontě jako stav, ne smazáním', () => {
  assert.deepEqual([...STAVY_NAHLASENI], ['nove', 'overeno', 'zamitnuto', 'duplicita']);
  for (const s of STAVY_NAHLASENI) assert.ok(SQL.includes(`'${s}'`), `stav ${s} chybí v CHECK`);
});
