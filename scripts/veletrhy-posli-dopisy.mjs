#!/usr/bin/env node
/**
 * Rozeslání dopisu pořadatelům veletrhů (docs/podklady/dopis-poradatelum-veletrhu.md).
 *
 * Vzorem je scripts/portal-posli-pozvanky.mjs: nanečisto, zkouška na vlastní
 * adresu, ostrá rozesílka a zápis, komu už dopis odešel. Šablona je
 * v src/lib/veletrhy-dopis.ts; odchází z eda@prijimackynaskolu.cz,
 * podepisuje Patrick Zandl.
 *
 * Vstup (gitignorovaný, obsahuje jména a adresy):
 *   data/veletrhy/obesilani.json   seznam adresátů, tvar viz typ `Adresat`
 * Výstup:
 *   data/veletrhy/odeslano.json    { id: datum odeslání } — jen ostrá rozesílka
 *
 * Použití:
 *   set -a && . ./.env.local && set +a
 *   npx tsx scripts/veletrhy-posli-dopisy.mjs --nanecisto
 *   npx tsx scripts/veletrhy-posli-dopisy.mjs --jen khk-hk --na patrick@zandl.cz
 *   npx tsx scripts/veletrhy-posli-dopisy.mjs --opravdu
 *
 *   --nanecisto        nic neodešle, vypíše komu, s jakým oslovením a předmětem (výchozí)
 *   --opravdu          odešle a zapíše datum do odeslano.json
 *   --jen <id>         jen jeden adresát (lze opakovat)
 *   --na <adresa>      přesměruje všechny e-maily sem (zkouška, nikdy na pořadatele)
 *   --znovu            pošle i adresátovi, který už dopis dostal
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dopisPoradateli, posliDopis, ODESILATEL_DOPISU } from '../src/lib/veletrhy-dopis.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEZNAM = path.join(ROOT, 'data', 'veletrhy', 'obesilani.json');
const ODESLANO = path.join(ROOT, 'data', 'veletrhy', 'odeslano.json');

const argv = process.argv.slice(2);
const opravdu = argv.includes('--opravdu');
const znovu = argv.includes('--znovu');
const jen = argv.flatMap((a, i) => (a === '--jen' ? [argv[i + 1]] : []));
const na = argv.includes('--na') ? argv[argv.indexOf('--na') + 1] : null;

if (!fs.existsSync(SEZNAM)) {
  console.error(`❌ Chybí ${path.relative(ROOT, SEZNAM)} – seznam adresátů.`);
  process.exit(1);
}
const seznam = JSON.parse(fs.readFileSync(SEZNAM, 'utf-8'));
const odeslano = fs.existsSync(ODESLANO) ? JSON.parse(fs.readFileSync(ODESLANO, 'utf-8')) : {};

const neznama = jen.filter((id) => !seznam.some((a) => a.id === id));
if (neznama.length) {
  console.error(`❌ Neznámý adresát: ${neznama.join(', ')}`);
  process.exit(1);
}

const vyber = seznam.filter((a) => (jen.length === 0 || jen.includes(a.id)) && (znovu || !odeslano[a.id]));
const posilat = opravdu || na;

console.log(`Od: ${ODESILATEL_DOPISU}`);
console.log(`Režim: ${na ? `zkouška, vše na ${na}` : opravdu ? 'OSTRÁ ROZESÍLKA' : 'nanečisto'}`);
console.log(`Adresátů: ${vyber.length}${Object.keys(odeslano).length ? ` (už odesláno: ${Object.keys(odeslano).length})` : ''}\n`);

let chyby = 0;
for (const a of vyber) {
  // Šablonu sestavíme i nanečisto: neznámá akce nebo chybějící termín se
  // tak ukáže před rozesílkou, ne uprostřed ní.
  const { subject } = dopisPoradateli(a);
  const komu = na ?? a.email;
  if (!posilat) {
    console.log(`– ${a.id}: ${a.osloveni} <${[a.email].flat().join(', ')}> | ${subject}`);
    continue;
  }
  // Resend pustí dva požadavky za sekundu; bez pauzy by část dopisů
  // skončila na 429 a bez zápisu o odeslání.
  await new Promise((r) => setTimeout(r, 700));
  const ok = await posliDopis(a, na ?? undefined);
  console.log(`${ok ? '✅' : '❌'} ${a.id} → ${[komu].flat().join(', ')} | ${subject}`);
  if (!ok) chyby++;
  // Zkouška na vlastní adresu datum nezapisuje, jinak by se pořadatel
  // tvářil jako oslovený, aniž by co dostal.
  if (ok && opravdu && !na) {
    odeslano[a.id] = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(ODESLANO, JSON.stringify(odeslano, null, 2) + '\n');
  }
}

if (chyby) {
  console.error(`\n❌ Neodešlo ${chyby} z ${vyber.length}.`);
  process.exit(1);
}
