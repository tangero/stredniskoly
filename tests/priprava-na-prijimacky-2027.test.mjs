import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildSitemapPaths } from '../scripts/generate-sitemap.mjs';
import { SITE_URL } from '../src/lib/site.mjs';

const ADRESA = '/priprava-na-prijimacky-2027';
const STRANKA = 'src/app/priprava-na-prijimacky-2027/page.tsx';

function soubory(slozka) {
  const vysledek = [];
  for (const polozka of fs.readdirSync(slozka, { withFileTypes: true })) {
    const cesta = path.join(slozka, polozka.name);
    if (polozka.isDirectory()) vysledek.push(...soubory(cesta));
    else vysledek.push(cesta);
  }
  return vysledek;
}

test('nová stránka má canonical, titulek a nemá noindex', () => {
  const zdroj = fs.readFileSync(STRANKA, 'utf8');
  assert.match(zdroj, /canonical:\s*'\/priprava-na-prijimacky-2027'/);
  assert.match(zdroj, /title:\s*TITULEK|Příprava na přijímačky 2027/);
  assert.doesNotMatch(zdroj, /noindex/);
  assert.doesNotMatch(zdroj, /robots:\s*\{[^}]*index:\s*false/s);
});

test('stránka uvádí chybějící oficiální dokument, březen 2027 i plán 2029', () => {
  const text = fs.readFileSync(STRANKA, 'utf8');
  assert.match(text, /oficiální dokument/);
  assert.match(text, /msmt\.gov\.cz/);
  assert.match(text, /cermat\.cz/);
  assert.match(text, /v březnu 2027/);
  assert.doesNotMatch(text, /začátkem března 2027/);
  assert.match(text, /Novinky/);
  assert.match(text, /polovinu března/);
  assert.match(text, /ČT24/);
  assert.match(text, /začátek března/);
  assert.match(text, /ohlášený plán/);
  assert.match(text, /ne o platné pravidlo/);
  assert.match(text, /13\.\s*11\.\s*2026|13\.\s*&nbsp;11\.\s*&nbsp;2026|OVERENO = '2026-11-13'/);
});

test('placené nabídky mají ověřené ceny a Scio je pro 8. třídy', () => {
  const text = fs.readFileSync(STRANKA, 'utf8');
  assert.match(text, /230\s*&nbsp;Kč za žáka|230&nbsp;Kč za žáka/);
  assert.match(text, /26\.\s*&nbsp;4\.\s*do 21\.\s*&nbsp;5\.\s*&nbsp;2027|26\.&nbsp;4\. do 21\.&nbsp;5\.&nbsp;2027/);
  assert.match(text, /pro žáky 8\. tříd, ne pro žáky 9\. tříd školního roku 2026\/2027/);
  assert.match(text, /www2\.scio\.cz\/trenink-na-prijimaci-zkousky-pro-8-tridy/);
  assert.match(text, /699\s*&nbsp;Kč|699&nbsp;Kč/);
  assert.match(text, /799\s*&nbsp;Kč|799&nbsp;Kč/);
  assert.match(text, /29\.\s*&nbsp;11\.\s*&nbsp;2026|29\.&nbsp;11\.&nbsp;2026/);
  assert.match(text, /centrum-eruditio\.cz\/prijimacky-nanecisto/);
});

test('z ostatních souborů webu na novou adresu nevede odkaz', () => {
  const koren = 'src';
  const zakazane = [];
  for (const soubor of soubory(koren)) {
    if (soubor.startsWith('src/app/priprava-na-prijimacky-2027/')) continue;
    if (!/\.(tsx|ts|jsx|js|mjs|md|json)$/.test(soubor)) continue;
    const text = fs.readFileSync(soubor, 'utf8');
    if (text.includes(ADRESA)) zakazane.push(soubor);
  }
  assert.deepEqual(zakazane, [], `odkaz na ${ADRESA} je v: ${zakazane.join(', ')}`);
});

test('sitemapa obsahuje novou adresu a produkční soubor taky', () => {
  const analysis = {
    a: { id: '100_A', nazev: 'Škola Praha', kraj_kod: 'CZ010' },
  };
  const schools = { 2026: [{ id: '100_A', redizo: '100', obor: 'Gymnázium' }] };
  const paths = buildSitemapPaths(analysis, schools, 2026, { schools: {} }, [2026]);
  assert.ok(paths.includes(ADRESA));
  const xml = fs.readFileSync('public/sitemap.xml', 'utf8');
  assert.ok(xml.includes(`${SITE_URL}${ADRESA}`));
});
