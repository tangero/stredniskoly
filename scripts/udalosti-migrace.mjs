#!/usr/bin/env node
// ============================================================================
// Spustí migraci událostí sledování škol na databázi z DATABASE_URL.
//
//   node --experimental-strip-types scripts/udalosti-migrace.mjs
//   node --experimental-strip-types scripts/udalosti-migrace.mjs --zapis-sql
//   node --experimental-strip-types scripts/udalosti-migrace.mjs --kontrola
//
// Migrace je psaná jako `create table if not exists`, takže se dá pustit
// opakovaně. Skript nic nemaže a nic nepřepisuje.
//
// DATABASE_URL se bere z prostředí, jinak z .env.local (git-ignorováno).
// Řetězec se nikam nevypisuje, ani do logu.
// ============================================================================

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from '@neondatabase/serverless';
import { MIGRACE_UDALOSTI, TABULKY_UDALOSTI } from '../src/lib/udalosti-schema.ts';

const KOREN = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRACE = join(KOREN, 'db', 'migrace', '004-udalosti.sql');

function zapisSql() {
  const hlavicka = [
    '-- ============================================================================',
    '-- GENEROVÁNO z src/lib/udalosti-schema.ts',
    '--   node --experimental-strip-types scripts/udalosti-migrace.mjs --zapis-sql',
    '-- Neupravovat ručně; zdrojem pravdy je modul.',
    '-- ============================================================================',
    '',
  ].join('\n');
  writeFileSync(MIGRACE, `${hlavicka}${MIGRACE_UDALOSTI.join(';\n\n')};\n`, 'utf8');
  console.log(`Zapsáno ${MIGRACE_UDALOSTI.length} příkazů do ${MIGRACE}`);
}

function url() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = readFileSync(join(KOREN, '.env.local'), 'utf8');
    const radek = env.split('\n').find((r) => r.startsWith('DATABASE_URL='));
    if (radek) return radek.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
  } catch {
    /* .env.local nemusí existovat */
  }
  return null;
}

async function main() {
  if (process.argv.includes('--zapis-sql')) return zapisSql();
  const pripojeni = url();
  if (!pripojeni) {
    console.error('Chybí DATABASE_URL (prostředí nebo .env.local).');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: pripojeni });
  try {
    if (process.argv.includes('--kontrola')) {
      const { rows } = await pool.query(
        `select table_name from information_schema.tables
          where table_schema = 'public' and table_name = any($1::text[]) order by table_name`,
        [[...TABULKY_UDALOSTI]],
      );
      const existuji = rows.map((r) => r.table_name);
      console.log(`Existuje ${existuji.length} z ${TABULKY_UDALOSTI.length}: ${existuji.join(', ') || '–'}`);
      return;
    }
    for (const prikaz of MIGRACE_UDALOSTI) await pool.query(prikaz);
    console.log(`Migrace hotova: ${MIGRACE_UDALOSTI.length} příkazů.`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Migrace selhala:', e.message);
  process.exit(1);
});
