import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Měření Matomo (#405, fáze 1; SEO audit 20. 9. 2026, oddíl 6): jen produkční doména, přechody v aplikaci.

test('skript Matomo běží jen na produkční doméně a komponenta přechodů je v layoutu', () => {
  const layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
  assert.match(layout, /window\.location\.hostname === '\$\{new URL\(SITE_URL\)\.hostname\}'/);
  assert.match(layout, /<MatomoPrechody \/>/);
  const site = fs.readFileSync('src/lib/site.mjs', 'utf8');
  assert.match(site, /SITE_URL = 'https:\/\/www\.prijimackynaskolu\.cz'/);
});

test('přechody: měří se změna cesty, ne parametrů, první načtení se nepočítá dvakrát', () => {
  const k = fs.readFileSync('src/components/MatomoPrechody.tsx', 'utf8');
  assert.match(k, /usePathname\(\)/);
  assert.doesNotMatch(k, /useSearchParams/);
  assert.match(k, /\}, \[cesta\]\);/);
  assert.match(k, /if \(odkud === null\) return;/);
  for (const prikaz of ['setReferrerUrl', 'setCustomUrl', 'setDocumentTitle', 'trackPageView']) assert.match(k, new RegExp(`'${prikaz}'`));
});
