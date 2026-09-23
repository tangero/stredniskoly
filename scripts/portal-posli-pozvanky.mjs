#!/usr/bin/env node
/**
 * Rozeslání pozvánek do pilotu účtů portálu (20 škol) z příkazové řádky.
 *
 * Náhled e-mailu a potvrzené odeslání má administrace (/admin/portal/pozvanky);
 * tenhle skript je pro rychlou kontrolu v terminálu a sdílí s ní logiku
 * (`src/lib/portal-pozvanky.ts`), aby obojí počítalo totéž.
 *
 * Text pozvánky je schválený v `docs/podklady/pozvanka-pilot-uctu-portalu.md`,
 * šablona v `src/lib/portal-email.ts` (`posliPozvankuDoPilotu`). Odchází
 * z `eda@prijimackynaskolu.cz`, podepisuje ji člověk.
 *
 * Skript **nic nedomýšlí**: školu pošle jen tehdy, když má její kód v plaintextu
 * i kontaktní adresu. Chybějící vstup je chyba, ne důvod školu přeskočit potichu.
 *
 * Vstupy (oba gitignorované, obsahují tajemství a osobní údaje):
 *   data/portal/kody-plaintext.json   ← scripts/portal-generate-codes.js --out …
 *   data/portal/pilot-kontakty.json   ← scripts/portal-vyber-pilotu.py --out …
 * Výstup: datum do `pozvanka_odeslana` v data/portal/pilot.json (patří do gitu).
 *
 * Použití:
 *   RESEND_API_KEY=… node --experimental-strip-types scripts/portal-posli-pozvanky.mjs --nanecisto
 *   RESEND_API_KEY=… node … scripts/portal-posli-pozvanky.mjs --jen 600171701 --na patrick@zandl.cz
 *   RESEND_API_KEY=… node … scripts/portal-posli-pozvanky.mjs --opravdu
 *
 *   --nanecisto        nic neodešle, jen vypíše, komu a s jakým oslovením (výchozí)
 *   --opravdu          odešle a zapíše datum do pilot.json
 *   --jen <REDIZO>     jen jedna škola (lze opakovat)
 *   --na <adresa>      přesměruje všechny e-maily sem (zkouška, nikdy na školy)
 *   --znovu            pošle i škole, která už má vyplněné pozvanka_odeslana
 *   --vlna <číslo>     omezí odeslání na vybranou vlnu (původní pilot = 1)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { posliPozvankuDoPilotu } from '../src/lib/portal-email.ts';
import { osloveni } from '../src/lib/portal-pozvanky.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PILOT = path.join(ROOT, 'data', 'portal', 'pilot.json');
const KODY = path.join(ROOT, 'data', 'portal', 'kody-plaintext.json');
const KONTAKTY = path.join(ROOT, 'data', 'portal', 'pilot-kontakty.json');

const argv = process.argv.slice(2);
const opravdu = argv.includes('--opravdu');
const znovu = argv.includes('--znovu');
const jen = argv.flatMap((a, i) => (a === '--jen' ? [argv[i + 1]] : []));
const na = argv.includes('--na') ? argv[argv.indexOf('--na') + 1] : null;
const vlna = argv.includes('--vlna') ? Number(argv[argv.indexOf('--vlna') + 1]) : null;
if (vlna !== null && (!Number.isInteger(vlna) || vlna < 1)) {
  console.error('❌ --vlna vyžaduje kladné celé číslo.');
  process.exit(1);
}

function nactiNebo(cesta, co) {
  if (!fs.existsSync(cesta)) {
    console.error(`❌ Chybí ${path.relative(ROOT, cesta)} – ${co}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(cesta, 'utf-8'));
}


async function main() {
  const pilot = nactiNebo(PILOT, 'seznam pilotu, spusťte scripts/portal-vyber-pilotu.py');
  const kody = nactiNebo(KODY, 'plaintext kódů, spusťte scripts/portal-generate-codes.js --out …');
  const kontakty = nactiNebo(KONTAKTY, 'kontakty, spusťte scripts/portal-vyber-pilotu.py --out …');

  const kodPodleRedizo = new Map((kody.kody ?? []).map((k) => [String(k.redizo), k.kod]));
  const kontaktPodleRedizo = new Map((kontakty.skoly ?? []).map((s) => [String(s.redizo), s]));

  const skoly = (pilot.skoly ?? []).filter((s) =>
    (!jen.length || jen.includes(s.redizo)) && (vlna === null || (s.vlna ?? 1) === vlna));
  if (skoly.length === 0) {
    console.error('❌ Žádná škola k odeslání (zkontrolujte --jen).');
    process.exit(1);
  }

  const chybi = skoly.filter((s) => !kodPodleRedizo.has(s.redizo) || !kontaktPodleRedizo.get(s.redizo)?.email_rejstrik);
  if (chybi.length > 0) {
    console.error('❌ Bez kódu nebo bez adresy, neodesílám nic:');
    for (const s of chybi) {
      const bez = [!kodPodleRedizo.has(s.redizo) && 'kód', !kontaktPodleRedizo.get(s.redizo)?.email_rejstrik && 'adresa']
        .filter(Boolean)
        .join(' a ');
      console.error(`   ${s.redizo}  ${s.nazev} – chybí ${bez}`);
    }
    process.exit(1);
  }

  const kOdeslani = skoly.filter((s) => znovu || !s.pozvanka_odeslana);
  const preskocene = skoly.length - kOdeslani.length;

  console.log(`${opravdu ? '📧 ODESÍLÁM' : '🔍 NANEČISTO'}: ${kOdeslani.length} škol` +
    (preskocene ? `, přeskočeno ${preskocene} s už odeslanou pozvánkou (--znovu je pošle znovu)` : ''));
  if (na) console.log(`⚠️  Všechny e-maily jdou na ${na}, ne školám.`);
  console.log();

  const dnes = new Date().toISOString().slice(0, 10);
  let odeslano = 0;
  const selhalo = [];

  for (const s of kOdeslani) {
    const kontakt = kontaktPodleRedizo.get(s.redizo);
    const adresa = na || kontakt.email_rejstrik;
    const oslov = osloveni(kontakt.reditel);
    console.log(`${s.redizo}  ${adresa.padEnd(32)} ${oslov.padEnd(24)} ${s.nazev}`);

    if (!opravdu) continue;

    const ok = await posliPozvankuDoPilotu({
      email: adresa,
      nazevSkoly: s.nazev,
      osloveni: oslov,
      kod: kodPodleRedizo.get(s.redizo),
      vlna: s.vlna,
      idempotencyKey: na ? undefined : `portal-pozvanka-v${s.vlna ?? 1}-${s.redizo}`,
    });
    if (ok) {
      odeslano += 1;
      // Datum se zapisuje jen při skutečném odeslání na školu; zkouška na vlastní
      // adresu by jinak školu označila za oslovenou, aniž by cokoli dostala.
      if (!na) {
        s.pozvanka_odeslana = dnes;
        // Průběžný zápis dovolí bezpečně navázat po přerušení dlouhé dávky.
        fs.writeFileSync(PILOT, JSON.stringify(pilot, null, 1) + '\n');
      }
    } else {
      selhalo.push(s.redizo);
    }
    await new Promise((r) => setTimeout(r, 600)); // Resend: 2 zprávy/s
  }

  if (opravdu && !na) {
    fs.writeFileSync(PILOT, JSON.stringify(pilot, null, 1) + '\n');
    console.log(`\n✅ Odesláno ${odeslano}, datum zapsáno do data/portal/pilot.json – commitněte ho.`);
  }
  if (selhalo.length > 0) {
    console.error(`\n❌ Neodesláno: ${selhalo.join(', ')} – podrobnosti v logu výše.`);
    process.exit(1);
  }
  if (!opravdu) console.log('\nNic se neodeslalo. Skutečné odeslání: --opravdu');
}

// Spouští se jen při přímém volání; testy si importují jen `osloveni`.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
