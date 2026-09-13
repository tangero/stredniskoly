#!/usr/bin/env node
/**
 * Sestaví mapu REDIZO → e-maily z rejstříku škol MŠMT pro magic-link přihlášení
 * do Portálu pro školy (§2.2 návrhu docs/portal-pro-skoly-2027.md).
 *
 * Zdroj: data/Rejstrik_skol/Adresar.csv (veřejný rejstřík, encoding utf-8-sig,
 * delimiter ";", sloupce RED_IZO, Email 1, Email 2).
 * Výstup: data/portal/emaily.json — { "600001431": ["skola@example.cz", ...] }
 * E-maily se ukládají lowercase; soubor je veřejný rejstříkový údaj, patří do gitu.
 *
 * Použití: node scripts/portal-build-emaily.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSV_PATH = path.join(ROOT, 'data', 'Rejstrik_skol', 'Adresar.csv');
const OUT_PATH = path.join(ROOT, 'data', 'portal', 'emaily.json');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Jednoduchý CSV parser pro řádek s ";" a uvozovkami (rejstřík nepoužívá vložené středníky v uvozovkách). */
function parseRadek(radek) {
  const bunky = [];
  let aktualni = '';
  let vUvozovkach = false;
  for (const znak of radek) {
    if (znak === '"') {
      vUvozovkach = !vUvozovkach;
    } else if (znak === ';' && !vUvozovkach) {
      bunky.push(aktualni);
      aktualni = '';
    } else {
      aktualni += znak;
    }
  }
  bunky.push(aktualni);
  return bunky;
}

function main() {
  const obsah = fs.readFileSync(CSV_PATH, 'utf-8').replace(/^﻿/, '');
  const radky = obsah.split('\n').filter((r) => r.trim() !== '');
  const hlavicka = parseRadek(radky[0]);
  const idxRedizo = hlavicka.indexOf('RED_IZO');
  const idxEmail1 = hlavicka.indexOf('Email 1');
  const idxEmail2 = hlavicka.indexOf('Email 2');
  if (idxRedizo === -1 || idxEmail1 === -1 || idxEmail2 === -1) {
    console.error('V CSV chybí očekávané sloupce RED_IZO / Email 1 / Email 2.');
    process.exit(1);
  }

  const mapa = {};
  let radku = 0;
  let sEmailem = 0;
  for (const radek of radky.slice(1)) {
    radku++;
    const bunky = parseRadek(radek);
    const redizo = (bunky[idxRedizo] || '').trim();
    if (!/^\d{9,10}$/.test(redizo)) continue;
    const emaily = [bunky[idxEmail1], bunky[idxEmail2]]
      .map((e) => (e || '').trim().toLowerCase())
      .filter((e) => EMAIL_RE.test(e));
    if (emaily.length === 0) continue;
    // deduplikace v rámci školy
    mapa[redizo] = [...new Set(emaily)];
    sEmailem++;
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(mapa, null, 0) + '\n');
  console.log(`Zpracováno ${radku} řádků rejstříku, ${sEmailem} škol s e-mailem.`);
  console.log(`Zapsáno: ${path.relative(ROOT, OUT_PATH)}`);
}

main();
