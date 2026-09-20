#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'node:url';
import { SITE_URL } from '../src/lib/site.mjs';
import { MESTA } from '../src/lib/mesta.mjs';
import { krajNames } from '../src/lib/kraje.mjs';
import { hasInspectionSummary } from '../src/lib/inspection-availability.mjs';
import { adresySkoly, adresaPrehledu, nabidkySeStrankou } from '../src/lib/adresa-oboru.mjs';

const BASE_URL = SITE_URL;
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const SCHOOL_ANALYSIS_PATH = path.join(PUBLIC_DIR, 'school_analysis.json');
const SCHOOLS_DATA_PATH = path.join(PUBLIC_DIR, 'schools_data.json');
const OUTPUT_PATH = path.join(PUBLIC_DIR, 'sitemap.xml');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function slugify(text, maxLength) {
  let slug = (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (maxLength && slug.length > maxLength) {
    slug = slug.substring(0, maxLength);
    const lastDash = slug.lastIndexOf('-');
    if (lastDash > Math.floor(maxLength * 0.6)) {
      slug = slug.substring(0, lastDash);
    }
  }
  return slug;
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Adresy škol a oborů pro sitemapu. Skládá je sdílený modul `src/lib/adresa-oboru.mjs`,
 * tentýž, kterým je rozpoznává `src/lib/data.ts` — sitemapa tak nemůže ukazovat na adresu,
 * která se přesměrovává. Ročník se bere z registru stavu datových sad, ne napevno.
 */
function buildSchoolSlugs(analysisData, schoolsData, rocnik) {
  const schools = Object.values(analysisData || {});
  const nabidkyRocniku = (schoolsData || {})[rocnik] || [];
  if (!nabidkyRocniku.length) {
    throw new Error(`schools_data.json nemá ročník ${rocnik}; registr zobrazuje období, pro které nejsou data`);
  }

  const nazvy = new Map();
  const zakladniKlice = new Set();
  for (const school of schools) {
    const redizo = (school.id || '').split('_')[0];
    if (redizo && !nazvy.has(redizo)) nazvy.set(redizo, school.nazev);
    zakladniKlice.add(school.id);
  }

  const podleRedizo = new Map();
  for (const row of nabidkyRocniku) {
    if (!row.redizo) continue;
    if (!podleRedizo.has(row.redizo)) podleRedizo.set(row.redizo, []);
    podleRedizo.get(row.redizo).push(row);
  }

  const slugs = new Set();
  for (const [redizo, nabidky] of podleRedizo) {
    // Název školy bere `data.ts` ze school_analysis.json; sitemapa musí brát týž,
    // jinak by adresa vyšla jinak, než jakou aplikace rozpozná.
    const nazev = nazvy.get(redizo);
    if (!nazev) continue;
    // Jen nabídky, pro které stránka oboru vznikne; ostatní by se jen přesměrovaly.
    const sestrankou = nabidkySeStrankou(nabidky, k => zakladniKlice.has(k));
    for (const adresa of adresySkoly(redizo, nazev, sestrankou)) slugs.add(adresa);
  }

  return Array.from(slugs).sort((a, b) => a.localeCompare(b, 'cs'));
}

function buildKrajSlugs(analysisData) {
  const schools = Object.values(analysisData || {});
  const krajKods = new Set();
  for (const school of schools) {
    if (!school?.kraj_kod) continue;
    krajKods.add(school.kraj_kod);
  }
  return Object.entries(krajNames)
    .filter(([kod]) => krajKods.has(kod))
    .map(([, nazev]) => slugify(nazev))
    .sort((a, b) => a.localeCompare(b, 'cs'));
}

/**
 * Jen kanonické cesty. Lastmod záměrně vynecháváme: mtime dat při buildu
 * neříká, kdy se významně změnila konkrétní stránka.
 */
export function buildSitemapPaths(analysisData, schoolsData, rocnik, inspections, resultYears) {
  const schoolSlugs = buildSchoolSlugs(analysisData, schoolsData, rocnik);
  const schoolSet = new Set(schoolSlugs);
  const paths = new Set([
    '/', '/prijimacky-2027', '/simulator', '/skoly', '/regiony', '/mesto',
    '/dostupnost', '/jak-vybrat-skolu', '/changelog', '/novinky',
    '/pro-skoly', '/ochrana-osobnich-udaju',
  ]);
  for (const year of resultYears) paths.add(`/vysledky/${year}`);
  for (const kraj of buildKrajSlugs(analysisData)) paths.add(`/regiony/${kraj}`);
  for (const mesto of MESTA) paths.add(`/mesto/${mesto.slug}`);
  for (const slug of schoolSlugs) paths.add(`/skola/${slug}`);

  // Stejný název a podmínka publikace jako v data.ts. Jedna inspekce za školu,
  // nikoli kopie pro každý obor; bez shrnutí stránka vrací 404.
  const seen = new Set();
  for (const school of Object.values(analysisData)) {
    const redizo = school.id.split('_')[0];
    if (seen.has(redizo)) continue;
    seen.add(redizo);
    const overview = adresaPrehledu(redizo, school.nazev);
    if (schoolSet.has(overview) && (inspections.schools?.[redizo] ?? []).some(hasInspectionSummary)) {
      paths.add(`/skola/${overview}/inspekce`);
    }
  }
  return [...paths];
}

export function renderSitemap(paths) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.map(route => `  <url><loc>${xmlEscape(`${BASE_URL}${route}`)}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
}

function main() {
  const analysisData = readJson(SCHOOL_ANALYSIS_PATH);
  const schoolsData = readJson(SCHOOLS_DATA_PATH);
  const inspections = readJson(path.join(process.cwd(), 'data', 'inspection_extractions.json'));
  const results = readJson(path.join(PUBLIC_DIR, 'cermat_results_meta.json'));
  const registr = readJson(path.join(PUBLIC_DIR, 'stav_datovych_sad.json'));
  const rocnik = registr?.sady?.['cermat-prihlasky']?.zobrazeno?.obdobi;
  if (!rocnik) throw new Error('registr neuvádí zobrazené období sady cermat-prihlasky');

  const paths = buildSitemapPaths(analysisData, schoolsData, rocnik, inspections, results.available_years);
  fs.writeFileSync(OUTPUT_PATH, renderSitemap(paths), 'utf8');
  console.log(`Generated sitemap: ${OUTPUT_PATH}`);
  console.log(`Total URLs: ${paths.length}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
