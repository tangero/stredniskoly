#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { adresySkoly, nabidkySeStrankou } from '../src/lib/adresa-oboru.mjs';

const BASE_URL = process.env.SITE_URL || 'https://prijimackynaskolu.cz';
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
 * Adresy škol a oborů pro sitemapu. Skládá je sdílený modul `src/lib/adresa-oboru.ts`,
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

// Must match krajNames in src/types/school.ts
const krajNames = {
  'CZ010': 'Praha',
  'CZ020': 'Středočeský',
  'CZ031': 'Jihočeský',
  'CZ032': 'Plzeňský',
  'CZ041': 'Karlovarský',
  'CZ042': 'Ústecký',
  'CZ051': 'Liberecký',
  'CZ052': 'Královéhradecký',
  'CZ053': 'Pardubický',
  'CZ063': 'Vysočina',
  'CZ064': 'Jihomoravský',
  'CZ071': 'Olomoucký',
  'CZ072': 'Zlínský',
  'CZ080': 'Moravskoslezský'
};

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

function urlEntry(url, lastmod, changefreq, priority) {
  return [
    '  <url>',
    `    <loc>${xmlEscape(url)}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n');
}

function main() {
  if (!fs.existsSync(SCHOOL_ANALYSIS_PATH)) {
    throw new Error(`Missing required file: ${SCHOOL_ANALYSIS_PATH}`);
  }
  if (!fs.existsSync(SCHOOLS_DATA_PATH)) {
    throw new Error(`Missing required file: ${SCHOOLS_DATA_PATH}`);
  }

  const analysisData = readJson(SCHOOL_ANALYSIS_PATH);
  const schoolsData = readJson(SCHOOLS_DATA_PATH);

  // Zobrazený ročník určuje registr stavu datových sad, nikdy ne letopočet v kódu.
  const registr = readJson(path.join(PUBLIC_DIR, 'stav_datovych_sad.json'));
  const rocnik = registr?.sady?.['cermat-prihlasky']?.zobrazeno?.obdobi;
  if (!rocnik) {
    throw new Error('registr neuvádí zobrazené období sady cermat-prihlasky');
  }

  const schoolSlugs = buildSchoolSlugs(analysisData, schoolsData, rocnik);
  const krajSlugs = buildKrajSlugs(analysisData);

  const mtimeAnalysis = fs.statSync(SCHOOL_ANALYSIS_PATH).mtime;
  const mtimeSchools = fs.statSync(SCHOOLS_DATA_PATH).mtime;
  const lastmod = new Date(Math.max(mtimeAnalysis.getTime(), mtimeSchools.getTime())).toISOString();

  const urls = [];
  const staticRoutes = [
    ['/', 'weekly', '1.0'],
    ['/prijimacky-2027', 'weekly', '0.9'],
    ['/vysledky/2026', 'monthly', '0.8'],
    ['/simulator', 'weekly', '0.9'],
    ['/skoly', 'weekly', '0.9'],
    ['/regiony', 'weekly', '0.8'],
    ['/dostupnost', 'weekly', '0.8'],
    ['/praha-dostupnost', 'weekly', '0.7'],
    ['/jak-vybrat-skolu', 'monthly', '0.7'],
    ['/changelog', 'weekly', '0.6'],
  ];

  for (const [route, freq, priority] of staticRoutes) {
    urls.push(urlEntry(`${BASE_URL}${route}`, lastmod, freq, priority));
  }

  for (const krajSlug of krajSlugs) {
    urls.push(urlEntry(`${BASE_URL}/regiony/${krajSlug}`, lastmod, 'weekly', '0.7'));
  }

  for (const slug of schoolSlugs) {
    urls.push(urlEntry(`${BASE_URL}/skola/${slug}`, lastmod, 'weekly', '0.7'));
    urls.push(urlEntry(`${BASE_URL}/skola/${slug}/inspekce`, lastmod, 'weekly', '0.6'));
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');

  fs.writeFileSync(OUTPUT_PATH, xml, 'utf8');
  console.log(`Generated sitemap: ${OUTPUT_PATH}`);
  console.log(`Total URLs: ${urls.length}`);
}

main();
