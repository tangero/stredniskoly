#!/usr/bin/env node
// ============================================================================
// Spustí migraci školních novinek z RSS na databázi z DATABASE_URL.
//
//   node --experimental-strip-types scripts/skolni-novinky-migrace.mjs
//   node scripts/skolni-novinky-migrace.mjs --kontrola     (jen vypíše stav tabulek)
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
import { MIGRACE_SKOLNICH_NOVINEK, TABULKY_SKOLNICH_NOVINEK } from '../src/lib/skolni-novinky-schema.ts';

const KOREN = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRACE = join(KOREN, 'db', 'migrace', '003-skolni-novinky.sql');

const TABULKY = [...TABULKY_SKOLNICH_NOVINEK];

/** Vygeneruje .sql soubor z modulu, aby se nemohly rozejít. */
function zapisSql() {
  const hlavicka = [
    '-- ============================================================================',
    '-- GENEROVÁNO z src/lib/skolni-novinky-schema.ts',
    '--   node --experimental-strip-types scripts/skolni-novinky-migrace.mjs --zapis-sql',
    '-- Neupravovat ručně; zdrojem pravdy je modul, protože migraci je potřeba umět',
    '-- spustit i z nasazené aplikace (/api/skoly/novinky/migrace).',
    '-- ============================================================================',
    '',
  ].join('\n');
  writeFileSync(MIGRACE, `${hlavicka}${MIGRACE_SKOLNICH_NOVINEK.join(';\n\n')};\n`, 'utf8');
  console.log(`Zapsáno ${MIGRACE_SKOLNICH_NOVINEK.length} příkazů do ${MIGRACE}`);
}

function pripojeni() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = readFileSync(join(KOREN, '.env.local'), 'utf8');
    const radek = env.split('\n').find((r) => r.startsWith('DATABASE_URL='));
    if (radek) return radek.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
  } catch {
    // .env.local nemusí existovat.
  }
  throw new Error('DATABASE_URL není nastavený (prostředí ani .env.local)');
}

async function main() {
  if (process.argv.includes('--zapis-sql')) {
    zapisSql();
    return;
  }
  const jenKontrola = process.argv.includes('--kontrola');
  const pool = new Pool({ connectionString: pripojeni() });
  const klient = await pool.connect();
  try {
    if (!jenKontrola) {
      for (const prikaz of MIGRACE_SKOLNICH_NOVINEK) {
        await klient.query(prikaz);
      }
      console.log(`Migrace proběhla, ${MIGRACE_SKOLNICH_NOVINEK.length} příkazů.`);
    }

    const stav = await klient.query(
      `select table_name from information_schema.tables
        where table_schema = 'public' and table_name = any($1::text[])
        order by table_name`,
      [TABULKY],
    );
    const nalezene = stav.rows.map((r) => r.table_name);
    const chybejici = TABULKY.filter((t) => !nalezene.includes(t));

    console.log(`Tabulky školních novinek: ${nalezene.length} z ${TABULKY.length}`);
    for (const t of TABULKY) {
      console.log(`  ${nalezene.includes(t) ? '✓' : '✗'} ${t}`);
    }

    // Kolik dalších tabulek v databázi je: projekt Neonu sdílí i jiná aplikace,
    // takže stojí za to vědět, co v public schématu leží.
    const ostatni = await klient.query(
      `select count(*)::int as pocet from information_schema.tables
        where table_schema = 'public' and table_name <> all($1::text[])`,
      [TABULKY],
    );
    console.log(`Další tabulky v public: ${ostatni.rows[0].pocet}`);

    if (chybejici.length > 0) {
      console.error(`Chybí: ${chybejici.join(', ')}`);
      process.exitCode = 1;
    }
  } finally {
    klient.release();
    await pool.end();
  }
}

main().catch((chyba) => {
  // Chybu vypisujeme bez připojovacího řetězce.
  console.error('Migrace selhala:', chyba instanceof Error ? chyba.message : chyba);
  process.exitCode = 1;
});
