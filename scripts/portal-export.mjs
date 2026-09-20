#!/usr/bin/env node
/**
 * Export potvrzených údajů škol z databáze do public/portal_skol.json.
 *
 * Soubor má dvě role a obě jsou důvodem, proč nezmizel, když se obsah profilů
 * přestěhoval do tabulky portal_profil:
 *   1. otevřená data pod CC BY 4.0 (docs/portal-pro-skoly-2027.md, oddíl 5),
 *   2. záloha pro čtení bez databáze – lokální vývoj, build, výpadek Neonu
 *      (src/lib/portal-profil-verejne.ts).
 *
 * Použití:
 *   DATABASE_URL=… node --experimental-strip-types scripts/portal-export.mjs
 *   DATABASE_URL=… node --experimental-strip-types scripts/portal-export.mjs --kontrola
 *
 * `--kontrola` nic nezapíše, jen vypíše, jestli by se soubor změnil (pro CI).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dotaz, jeDbNastavena } from '../src/lib/novinky-db.ts';
import { potvrzeneUdaje } from '../src/lib/portal-profil.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CIL = path.join(ROOT, 'public', 'portal_skol.json');

if (!jeDbNastavena()) {
  console.error('❌ DATABASE_URL není nastavena, není z čeho exportovat.');
  process.exit(1);
}

const kontrola = process.argv.includes('--kontrola');

const data = await potvrzeneUdaje({ dotaz });
// Klíče seřazené, ať diff v gitu ukazuje jen skutečné změny, ne pořadí z SQL.
const serazene = Object.fromEntries(Object.keys(data).sort().map((k) => [k, data[k]]));
const obsah = JSON.stringify(serazene, null, 2) + '\n';

const stary = fs.existsSync(CIL) ? fs.readFileSync(CIL, 'utf-8') : '';
const pocet = Object.keys(serazene).length;

if (obsah === stary) {
  console.log(`✅ Beze změny: ${pocet} škol.`);
  process.exit(0);
}

if (kontrola) {
  console.log(`⚠️  public/portal_skol.json není aktuální (${pocet} škol v databázi). Spusťte export.`);
  process.exit(1);
}

fs.writeFileSync(CIL, obsah);
console.log(`✅ Zapsáno ${pocet} škol do public/portal_skol.json. Nezapomeňte commitnout.`);
