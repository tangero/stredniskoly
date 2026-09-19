#!/usr/bin/env node
/**
 * Generátor přihlašovacích kódů pro Portál pro školy (pilot 2027).
 *
 * Použití:
 *   node scripts/portal-generate-codes.js 600171701 600007774
 *   node scripts/portal-generate-codes.js --soubor redizo.txt     # jedno REDIZO na řádek, # = komentář
 *   node scripts/portal-generate-codes.js --out data/portal/kody-plaintext.json 600171701
 *   node scripts/portal-generate-codes.js --force 600171701       # revokuje staré kódy školy a vydá nový
 *
 * Do repozitáře se ukládá POUZE HMAC-SHA256 kódu s pepřem z env PORTAL_KOD_PEPPER
 * (data/portal/kody.json). Pepř musí být stejný jako na Vercelu, jinak kódy neplatí.
 * Plaintext kódy se vypíšou na stdout, případně do souboru přes --out
 * (jen do data/portal/kody-plaintext.json nebo mimo repozitář — nikdy necommitovat!).
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const KODY_PATH = path.join(ROOT, 'data', 'portal', 'kody.json');
const SCHOOLS_PATH = path.join(ROOT, 'public', 'schools_data.json');
const DEFAULT_PLAINTEXT_OUT = path.join(ROOT, 'data', 'portal', 'kody-plaintext.json');

// Abeceda bez nečitelných znaků (0/O, 1/I/L)
const ABECEDA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generujKod() {
  const skupiny = [];
  for (let s = 0; s < 3; s++) {
    let skupina = '';
    for (let i = 0; i < 4; i++) {
      skupina += ABECEDA[crypto.randomInt(ABECEDA.length)];
    }
    skupiny.push(skupina);
  }
  return skupiny.join('-');
}

function normalizeKod(kod) {
  return String(kod).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const PEPPER = process.env.PORTAL_KOD_PEPPER;

function hashKod(kod) {
  return crypto.createHmac('sha256', PEPPER).update(normalizeKod(kod), 'utf8').digest('hex');
}

/** Plaintext smí jen do gitignorovaného souboru, nebo úplně mimo repozitář. */
function overCestuOut(out) {
  const cil = path.resolve(out);
  const vRepu = !path.relative(ROOT, cil).startsWith('..') && !path.isAbsolute(path.relative(ROOT, cil));
  if (vRepu && cil !== DEFAULT_PLAINTEXT_OUT) {
    console.error(`--out uvnitř repozitáře smí jen do ${path.relative(ROOT, DEFAULT_PLAINTEXT_OUT)} (gitignorováno).`);
    process.exit(1);
  }
  return cil;
}

function parseArgs(argv) {
  const rediza = [];
  let soubor = null;
  let out = null;
  let force = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--soubor') soubor = argv[++i];
    else if (arg === '--out') out = argv[++i];
    else if (arg === '--force') force = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 15).join('\n').replace(/^ \* ?/gm, ''));
      process.exit(0);
    } else if (/^\d{9,10}$/.test(arg)) rediza.push(arg);
    else {
      console.error(`Neznámý argument: ${arg}`);
      process.exit(1);
    }
  }
  if (soubor) {
    const radky = fs.readFileSync(soubor, 'utf8').split('\n');
    for (const radek of radky) {
      const cisty = radek.trim();
      if (!cisty || cisty.startsWith('#')) continue;
      if (!/^\d{9,10}$/.test(cisty)) {
        console.error(`Neplatné REDIZO v souboru: "${cisty}"`);
        process.exit(1);
      }
      rediza.push(cisty);
    }
  }
  return { rediza, out, force };
}

function nactiKody() {
  if (!fs.existsSync(KODY_PATH)) {
    return {
      verze: 1,
      poznamka: 'Portál pro školy – ukládají se pouze HMAC-SHA256 kódů s pepřem PORTAL_KOD_PEPPER. Plaintext kódy generuje scripts/portal-generate-codes.js a do gitu nepatří.',
      kody: [],
    };
  }
  return JSON.parse(fs.readFileSync(KODY_PATH, 'utf8'));
}

function main() {
  const { rediza, out: outArg, force } = parseArgs(process.argv.slice(2));
  const out = outArg ? overCestuOut(outArg) : null;
  if (!PEPPER) {
    console.error('Chybí PORTAL_KOD_PEPPER v prostředí (stejná hodnota jako na Vercelu).');
    process.exit(1);
  }
  if (rediza.length === 0) {
    console.error('Zadejte alespoň jedno REDIZO (argument nebo --soubor). Viz --help.');
    process.exit(1);
  }

  // Ověření REDIZO proti katalogu 2026
  const schoolsData = JSON.parse(fs.readFileSync(SCHOOLS_PATH, 'utf8'));
  const katalog2026 = new Set((schoolsData['2026'] || []).map((s) => String(s.redizo)));
  const nazvy = new Map();
  for (const s of schoolsData['2026'] || []) {
    if (!nazvy.has(String(s.redizo))) nazvy.set(String(s.redizo), s.nazev);
  }

  const data = nactiKody();
  const dnes = new Date().toISOString().slice(0, 10);
  const vysledky = [];
  let zmeneno = false;

  for (const redizo of rediza) {
    if (!katalog2026.has(redizo)) {
      console.error(`⚠️  REDIZO ${redizo} není v katalogu 2026 (public/schools_data.json) – přeskakuji.`);
      continue;
    }
    const aktivni = data.kody.filter((k) => k.redizo === redizo && !k.revokovano);
    if (aktivni.length > 0 && !force) {
      console.error(`⚠️  REDIZO ${redizo} (${nazvy.get(redizo)}) už má aktivní kód – přeskakuji (pro nový kód použijte --force).`);
      continue;
    }
    if (force) {
      for (const k of data.kody) {
        if (k.redizo === redizo && !k.revokovano) {
          k.revokovano = true;
          k.revokovano_dne = dnes;
        }
      }
    }
    const kod = generujKod();
    data.kody.push({
      hash: hashKod(kod),
      redizo,
      vytvoreno: dnes,
      revokovano: false,
    });
    vysledky.push({ redizo, nazev: nazvy.get(redizo), kod });
    zmeneno = true;
  }

  if (zmeneno) {
    fs.mkdirSync(path.dirname(KODY_PATH), { recursive: true });
    fs.writeFileSync(KODY_PATH, JSON.stringify(data, null, 2) + '\n');
  }

  if (vysledky.length === 0) {
    console.log('Žádné nové kódy se nevygenerovaly.');
    return;
  }

  const radky = vysledky.map((v) => `${v.redizo}\t${v.kod}\t${v.nazev}`);
  console.log('\nVygenerované kódy (PLAINTEXT – necommitovat, předat jen příslušné škole):\n');
  for (const r of radky) console.log(r);

  if (out) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify({ vytvoreno: dnes, kody: vysledky }, null, 2) + '\n');
    console.log(`\nPlaintext uložen do ${out}`);
    if (out === DEFAULT_PLAINTEXT_OUT) console.log('(soubor je v .gitignore)');
  } else {
    console.log(`\nTip: plaintext lze uložit přes --out ${path.relative(ROOT, DEFAULT_PLAINTEXT_OUT)} (gitignorováno).`);
  }
  console.log(`\nHashe zapsány do ${path.relative(ROOT, KODY_PATH)} – tento soubor patří do gitu.`);
}

main();
