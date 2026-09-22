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

for (const smernice of ['script-src', 'connect-src']) {
  test(`${smernice} povoluje celou doménu Clicky`, () => {
    // Dokumentace Clicky žádá `*.getclicky.com` i `clicky.com`. Vyjmenovat
    // konkrétní hostitele nestačí — skript sahá na víc domén, než je z úryvku
    // kódu vidět, a chybějící doména se projeví jen tichou blokací v konzoli.
    const radek = config.split('\n').find((r) => r.includes(smernice));
    assert.ok(radek, `${smernice} se nenašel`);
    assert.match(radek, /\*\.getclicky\.com/, `${smernice} nepovoluje *.getclicky.com`);
    assert.match(radek, /https:\/\/clicky\.com/, `${smernice} nepovoluje clicky.com`);
  });
}

test('Referrer-Policy nezahazuje původ domény', () => {
  // Při `same-origin` nebo `no-referrer` Clicky návštěvu zahodí, protože
  // neověří doménu. Musí projít původ, ne nutně celá adresa.
  const radek = config.split('\n').find((r) => r.includes("'Referrer-Policy'"));
  assert.ok(radek !== undefined || config.includes('Referrer-Policy'), 'hlavička se nenašla');
  assert.doesNotMatch(config, /Referrer-Policy'[,\s]*\n\s*value: 'same-origin'/, 'same-origin Clicky rozbije');
  assert.doesNotMatch(config, /Referrer-Policy'[,\s]*\n\s*value: 'no-referrer'/, 'no-referrer Clicky rozbije');
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
