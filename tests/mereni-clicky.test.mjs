import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Měřicí skript blokovaný CSP je nejhorší možný stav: v kódu vypadá nasazený,
// v prohlížeči mlčí a pozná se to až tím, že v Clicky nejsou žádná data.
// Tyhle testy drží skript a CSP u sebe.

const layout = readFileSync('src/app/layout.tsx', 'utf8');
const config = readFileSync('next.config.ts', 'utf8');
const zasady = readFileSync('src/app/ochrana-osobnich-udaju/page.tsx', 'utf8');

test('Clicky se načítá a zná své ID', () => {
  assert.match(layout, /static\.getclicky\.com\/js/, 'chybí skript Clicky');
  assert.match(layout, /data-id="101500959"/, 'bez ID se měření nespáruje s účtem');
});

test('doména skriptu je v script-src', () => {
  const radek = config.split('\n').find((r) => r.includes('script-src'));
  assert.ok(radek, 'script-src se nenašel');
  assert.match(radek, /static\.getclicky\.com/, 'CSP skript zablokuje');
});

test('doména sběru je v connect-src', () => {
  const radek = config.split('\n').find((r) => r.includes('connect-src'));
  assert.ok(radek, 'connect-src se nenašel');
  assert.match(radek, /in\.getclicky\.com/, 'CSP odeslání naměřených dat zablokuje');
});

test('Matomo zůstává vedle Clicky, ne místo něj', () => {
  // Matomo drží dlouhodobou řadu návštěvnosti; nahradit ho by tu řadu přetrhlo.
  assert.match(layout, /ma\.hlidacstatu\.cz/, 'zmizelo Matomo');
  assert.match(layout, /matomo-analytics/, 'zmizel blok Matoma');
});

test('adresa skriptu je https, ne protokolově relativní', () => {
  // `//static.getclicky.com/js` by na http stránce stáhlo skript po http.
  assert.doesNotMatch(layout, /src="\/\/static\.getclicky\.com/, 'protokolově relativní adresa');
});

test('zásady ochrany údajů jmenují oba měřicí nástroje', () => {
  // Zpracovatel, který není v zásadách uvedený, tam chybí i právně.
  assert.match(zasady, /Matomo/, 'zásady nejmenují Matomo');
  assert.match(zasady, /Clicky/, 'zásady nejmenují Clicky');
  assert.match(zasady, /Clicky[\s\S]{0,300}Spojených státech/, 'chybí zmínka o přenosu do třetí země');
});
