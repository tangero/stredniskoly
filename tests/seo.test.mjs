import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildSitemapPaths, renderSitemap } from '../scripts/generate-sitemap.mjs';
import { SITE_URL } from '../src/lib/site.mjs';

const analysis = {
  a: { id: '100_A', nazev: 'Škola Praha', kraj_kod: 'CZ010' },
  b: { id: '200_B', nazev: 'Škola Brno', kraj_kod: 'CZ064' },
};
const schools = { 2026: [
  { id: '100_A', redizo: '100', obor: 'Gymnázium' },
  { id: '100_A_z', redizo: '100', obor: 'Gymnázium', zamereni: 'Jazyky' },
  { id: '200_B', redizo: '200', obor: 'Lyceum' },
] };

test('sitemapa sjednotí obory a publikuje jen jednu existující inspekci školy', () => {
  const inspections = { schools: {
    100: [{ parsed_output: { for_parents: { plain_czech_summary: 'Shrnutí' } } },
      { parsed_output: { for_parents: { plain_czech_summary: 'Další inspekce' } } }],
    200: [{ parsed_output: { for_parents: {} } }],
    300: [{ parsed_output: { for_parents: { plain_czech_summary: 'Škola mimo katalog' } } }],
  } };
  const paths = buildSitemapPaths(analysis, schools, 2026, inspections, [2025, 2026]);
  assert.deepEqual(paths.filter(p => p.endsWith('/inspekce')), ['/skola/100-skola-praha/inspekce']);
  assert.ok(paths.includes('/skola/100-skola-praha-gymnazium-jazyky'));
  assert.ok(!paths.includes('/skola/100-skola-praha-gymnazium'));
  for (const p of ['/mesto', '/mesto/praha', '/regiony/hlavni-mesto-praha', '/vysledky/2025']) assert.ok(paths.includes(p));
  for (const p of ['/regiony/praha', '/praha-dostupnost', '/moje-sance']) assert.ok(!paths.includes(p));
  assert.equal(new Set(paths).size, paths.length);
  const xml = renderSitemap(paths);
  assert.ok(!xml.includes('<lastmod>'), 'mtime souborů není změna jednotlivých stránek');
  assert.ok(!xml.includes('https://prijimackynaskolu.cz'));
  assert.ok(xml.includes(`${SITE_URL}/mesto/praha`));
});

test('produkční sitemapa neobsahuje žádnou inspekci bez publikovatelného shrnutí ani duplicitu školy', () => {
  const xml = fs.readFileSync('public/sitemap.xml', 'utf8');
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  assert.ok(urls.length > 4000);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.every(url => new URL(url).origin === SITE_URL));
  const data = JSON.parse(fs.readFileSync('data/inspection_extractions.json', 'utf8'));
  const inspections = urls.filter(u => u.endsWith('/inspekce'));
  const redizos = inspections.map(u => new URL(u).pathname.split('/')[2].split('-')[0]);
  assert.equal(new Set(redizos).size, redizos.length);
  for (let i = 0; i < inspections.length; i++) {
    assert.ok(data.schools[redizos[i]].some(r => r.parsed_output?.for_parents?.plain_czech_summary));
    assert.ok(urls.includes(inspections[i].replace(/\/inspekce$/, '')));
  }
  assert.ok(!urls.includes(`${SITE_URL}/skola/600013448-gymnazium-videnska/inspekce`));
});
