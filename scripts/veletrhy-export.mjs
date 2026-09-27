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
 * Kořenová pole (sezona, zdroj, poznamka, katalogy) zůstávají ze stávajícího
 * souboru, `checkedAt` se posune na nejnovější `overeno` mezi akcemi.
 *
 * Export zároveň dorovná počty záznamů, které uvádí registr
 * (public/stav_datovych_sad.json, poznámka sady veletrhy-skol) a
 * docs/zdroje-dat.md. Hlídá je tests/veletrhy.test.mjs; bez dorovnání by
 * každý export s novou akcí shodil CI. Mění se jen čísla ve známých větách,
 * nic jiného v registru. Akce se řadí podle startu, pak id; pole v každé akci
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
const REGISTR = path.join(ROOT, 'public', 'stav_datovych_sad.json');
const ZDROJE = path.join(ROOT, 'docs', 'zdroje-dat.md');

/**
 * Den, ke kterému tests/veletrhy.test.mjs počítá kraje se zobrazitelnou
 * akcí (`PRED_SEZONOU`). Musí se shodovat, jinak se počet krajů rozejde.
 */
const DEN_POCTU_KRAJU = '2026-09-22';

/** Nahradí jediný výskyt; když věta chybí, skončí chybou místo tichého neúspěchu. */
function nahrad(text, vzor, nahrada, kde) {
  if (!vzor.test(text)) {
    console.error(`❌ V ${kde} chybí věta s počty (${vzor}). Dorovnejte ji ručně.`);
    process.exit(1);
  }
  return text.replace(vzor, nahrada);
}

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

const overeno = akce.map((a) => a.overeno).filter(Boolean).sort().at(-1) ?? soubor.checkedAt;
const obsah = JSON.stringify({ ...soubor, checkedAt: overeno > soubor.checkedAt ? overeno : soubor.checkedAt, akce }, null, 2) + '\n';

const celkem = akce.length;
const cekajici = akce.filter((a) => !a.terminPotvrzen).length;
const kraje = new Set(
  akce.filter((a) => a.terminPotvrzen && a.start && (a.end ?? a.start) >= DEN_POCTU_KRAJU).map((a) => a.krajKod),
).size;

const staryRegistr = fs.readFileSync(REGISTR, 'utf-8');
const registr = JSON.parse(staryRegistr);
const sada = registr.sady['veletrhy-skol'];
sada.zobrazeno.poznamka = nahrad(sada.zobrazeno.poznamka, /\d+ z \d+ záznamů čeká/, `${cekajici} z ${celkem} záznamů čeká`, 'registru');
// Registr má odsazení o jednu mezeru (zapisuje ho scripts/stav-datovych-sad.py).
const novyRegistr = JSON.stringify(registr, null, 1) + '\n';

const stareZdroje = fs.readFileSync(ZDROJE, 'utf-8');
let noveZdroje = nahrad(stareZdroje, /Z \d+ záznamů jich je \d+; zbylých \d+/, `Z ${celkem} záznamů jich je ${celkem - cekajici}; zbylých ${cekajici}`, 'docs/zdroje-dat.md');
noveZdroje = nahrad(noveZdroje, /(\| Nepotvrzené termíny veletrhů \| veletrhy, )\d+ z \d+( záznamů \|[^\n]*všech )\d+( krajů)/, `$1${cekajici} z ${celkem}$2${kraje}$3`, 'docs/zdroje-dat.md');

const zmeny = [
  [CIL, stary, obsah],
  [REGISTR, staryRegistr, novyRegistr],
  [ZDROJE, stareZdroje, noveZdroje],
].filter(([, pred, po]) => pred !== po);

if (zmeny.length === 0) {
  console.log(`✅ Beze změny: ${celkem} akcí.`);
  process.exit(0);
}
if (kontrola) {
  console.log(`⚠️  Snímek není aktuální (${celkem} akcí v databázi). Spusťte export.`);
  process.exit(1);
}
for (const [soubor, , po] of zmeny) fs.writeFileSync(soubor, po);
console.log(`✅ Zapsáno ${celkem} akcí (${cekajici} čeká), změněno: ${zmeny.map(([f]) => path.relative(ROOT, f)).join(', ')}.`);
