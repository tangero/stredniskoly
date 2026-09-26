#!/usr/bin/env node
/**
 * Export akcí veletrhů z databáze do snímku src/data/veletrhy-2027.json
 * (docs/veletrhy-api-2027.md, oddíl 7).
 *
 * Zdrojem pravdy je tabulka veletrh_akce. Snímek je záloha pro build bez
 * databáze a výpadek Neonu, historie v gitu a podklad testů dat a počtů
 * v registru. Web na exportu nezávisí.
 *
 * Použití:
 *   DATABASE_URL=… node --experimental-strip-types scripts/veletrhy-export.mjs
 *   DATABASE_URL=… node --experimental-strip-types scripts/veletrhy-export.mjs --kontrola
 *
 * Kořenová pole (checkedAt, sezona, zdroj, poznamka, katalogy) zůstávají ze
 * stávajícího souboru. Akce se řadí podle startu, pak id; pole v každé akci
 * v pořadí rozhraní Veletrh, protože jsonb pořadí klíčů nezachovává.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dotaz, jeDbNastavena } from '../src/lib/novinky-db.ts';
import { akceSezony } from '../src/lib/veletrhy-sklad.ts';
import { POLE_AKCE } from '../src/lib/veletrhy-validace.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CIL = path.join(ROOT, 'src', 'data', 'veletrhy-2027.json');

if (!jeDbNastavena()) {
  console.error('❌ DATABASE_URL není nastavena, není z čeho exportovat.');
  process.exit(1);
}

const kontrola = process.argv.includes('--kontrola');
const stary = fs.readFileSync(CIL, 'utf-8');
const soubor = JSON.parse(stary);

const akce = (await akceSezony({ dotaz }, soubor.sezona))
  .map((a) => Object.fromEntries(POLE_AKCE.filter((k) => k in a).map((k) => [k, a[k]])))
  .sort((a, b) => (a.start ?? '9999').localeCompare(b.start ?? '9999') || a.id.localeCompare(b.id));

if (akce.length === 0) {
  console.error('❌ V databázi nejsou žádné akce sezóny, snímek by se vyprázdnil. Proběhl seed?');
  process.exit(1);
}

const obsah = JSON.stringify({ ...soubor, akce }, null, 2) + '\n';

if (obsah === stary) {
  console.log(`✅ Beze změny: ${akce.length} akcí.`);
  process.exit(0);
}
if (kontrola) {
  console.log(`⚠️  Snímek není aktuální (${akce.length} akcí v databázi). Spusťte export.`);
  process.exit(1);
}
fs.writeFileSync(CIL, obsah);
console.log(`✅ Zapsáno ${akce.length} akcí. Zkontrolujte počty v registru a docs/zdroje-dat.md a commitněte.`);
