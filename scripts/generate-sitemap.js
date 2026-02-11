#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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

function createSlug(name, obor, zamereni, delkaStudia) {
  let slug = slugify(name, 60);

  if (obor) {
    let oborSlug = slugify(obor, 40);
    if (delkaStudia) {
      oborSlug = `${oborSlug}-${delkaStudia}lete`;
    }
    slug = `${slug}-${oborSlug}`;
  }
  if (zamereni) {
    slug = `${slug}-${slugify(zamereni, 40)}`;
  }

  if (slug.length > 150) {
    slug = slug.substring(0, 150);
    const lastDash = slug.lastIndexOf('-');
    if (lastDash > 100) slug = slug.substring(0, lastDash);
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

function buildSchoolSlugs(analysisData, schoolsData) {
  const schools = Object.values(analysisData || {});
  const slugs = new Set();

  const years = schoolsData || {};
  const detailed = years['2025'] || years['2024'] || [];

  const byRedizo = new Map();
  for (const school of schools) {
    const redizo = (school.id || '').split('_')[0];
    if (!redizo) continue;
    if (!byRedizo.has(redizo)) byRedizo.set(redizo, []);
    byRedizo.get(redizo).push(school);
  }

  for (const [redizo, schoolList] of byRedizo) {
    const firstSchool = schoolList[0];
    const schoolNameSlug = createSlug(firstSchool.nazev);

    slugs.add(`${redizo}-${schoolNameSlug}`);

    const oborCounts = new Map();
    for (const school of schoolList) {
      oborCounts.set(school.obor, (oborCounts.get(school.obor) || 0) + 1);
    }

    for (const school of schoolList) {
      const hasDuplicate = (oborCounts.get(school.obor) || 0) > 1;
      const oborSlug = hasDuplicate
        ? createSlug(school.nazev, school.obor, undefined, school.delka_studia)
        : createSlug(school.nazev, school.obor);
      slugs.add(`${redizo}-${oborSlug}`);
    }

    const detailedRecords = detailed.filter((row) => row.redizo === redizo);
    const zamereniCounts = new Map();

    for (const row of detailedRecords) {
      if (!row.zamereni) continue;
      const key = `${row.obor}|${row.zamereni}`;
      zamereniCounts.set(key, (zamereniCounts.get(key) || 0) + 1);
    }

    for (const row of detailedRecords) {
      if (!row.zamereni) continue;
      const key = `${row.obor}|${row.zamereni}`;
      const hasDuplicate = (zamereniCounts.get(key) || 0) > 1;
      const zamereniSlug = hasDuplicate
        ? createSlug(firstSchool.nazev, row.obor, row.zamereni, row.delka_studia)
        : createSlug(firstSchool.nazev, row.obor, row.zamereni);
      slugs.add(`${redizo}-${zamereniSlug}`);
    }
  }

  return Array.from(slugs).sort((a, b) => a.localeCompare(b, 'cs'));
}

function buildKrajSlugs(analysisData) {
  const schools = Object.values(analysisData || {});
  const kraje = new Set();
  for (const school of schools) {
    if (!school?.kraj) continue;
    kraje.add(slugify(school.kraj));
  }
  return Array.from(kraje).sort((a, b) => a.localeCompare(b, 'cs'));
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

  const schoolSlugs = buildSchoolSlugs(analysisData, schoolsData);
  const krajSlugs = buildKrajSlugs(analysisData);

  const mtimeAnalysis = fs.statSync(SCHOOL_ANALYSIS_PATH).mtime;
  const mtimeSchools = fs.statSync(SCHOOLS_DATA_PATH).mtime;
  const lastmod = new Date(Math.max(mtimeAnalysis.getTime(), mtimeSchools.getTime())).toISOString();

  const urls = [];
  const staticRoutes = [
    ['/', 'weekly', '1.0'],
    ['/simulator', 'weekly', '0.9'],
    ['/skoly', 'weekly', '0.9'],
    ['/regiony', 'weekly', '0.8'],
    ['/dostupnost', 'weekly', '0.8'],
    ['/praha-dostupnost', 'weekly', '0.7'],
    ['/jak-funguje-prijimani', 'monthly', '0.8'],
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
