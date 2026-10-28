#!/usr/bin/env node
// ============================================================================
// Rozdíl zobrazených hodnot po přepnutí datové sady a zápis události.
//
//   node --experimental-strip-types scripts/sledovani-rozdil.mjs \
//     --sada <id> --obdobi <období> --veta "<věta souhrnu>" \
//     --stare <snimek.json> --nove <snimek.json> [--zapis]
//
// Snímek je JSON { "<RED IZO>": <zobrazené hodnoty školy> }. Bez `--zapis` se
// jen vypíše počet dotčených škol a databáze se nepoužije. `--zapis` zapíše
// událost do tabulek `udalost` a `udalost_skola` (migrace 004) na databázi
// z DATABASE_URL; tatáž sada a období podruhé nic nevytvoří.
//
// Do repozitáře ani do výpisu se nedostane nic kromě počtů.
// ============================================================================

import { readFileSync } from 'fs';
import { Pool } from '@neondatabase/serverless';
import { udalostZPrepnuti } from '../src/lib/sledovani-rozdil.ts';
import { zapisUdalost } from '../src/lib/udalosti.ts';

function arg(nazev) {
  const i = process.argv.indexOf(`--${nazev}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const [sada, obdobi, veta, stare, nove] = ['sada', 'obdobi', 'veta', 'stare', 'nove'].map(arg);
  if (![sada, obdobi, veta, stare, nove].every(Boolean)) {
    console.error('Použití: --sada <id> --obdobi <období> --veta "<věta>" --stare <json> --nove <json> [--zapis]');
    process.exit(2);
  }
  const udalost = udalostZPrepnuti({
    sada, obdobi, veta,
    stare: JSON.parse(readFileSync(stare, 'utf8')),
    nove: JSON.parse(readFileSync(nove, 'utf8')),
  });
  if (!udalost) {
    console.log('Žádné škole se zobrazená hodnota nezměnila, událost nevzniká.');
    return;
  }
  console.log(`Dotčených škol: ${udalost.skoly.length}, klíč události: ${udalost.klic}`);
  if (!process.argv.includes('--zapis')) {
    console.log('Bez --zapis se nic nezapisuje.');
    return;
  }
  if (!process.env.DATABASE_URL) {
    console.error('Chybí DATABASE_URL.');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const klient = await pool.connect();
  try {
    await klient.query('begin');
    const nova = await zapisUdalost({ dotaz: async (sql, h = []) => klient.query(sql, h) }, udalost);
    await klient.query('commit');
    console.log(nova ? 'Událost zapsána.' : 'Událost s tímto klíčem už existuje, nic se nezměnilo.');
  } catch (e) {
    await klient.query('rollback').catch(() => {});
    throw e;
  } finally {
    klient.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Zápis události selhal:', e.message);
  process.exit(1);
});
