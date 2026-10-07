import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

// BreadcrumbList (#405, fáze 1; SEO audit 20. 9. 2026, bod 8).
const require = createRequire(import.meta.url);
function load(relative) {
  const source = fs.readFileSync(path.resolve(relative), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
  const modul = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(s => {
    if (!s.startsWith('@/')) return require(s);
    const t = s.replace('@/', 'src/');
    for (const p of [`${t}.ts`, `${t}.tsx`, t]) if (fs.existsSync(p)) return p.endsWith('.mjs') ? require(path.resolve(p)) : load(p);
    return require(path.resolve(`${t}`));
  }, modul, modul.exports);
  return modul.exports;
}
const { drobeckyJsonLd } = load('src/lib/drobecky.ts');

test('BreadcrumbList: pořadí, absolutní adresy s www, poslední položka bez adresy', () => {
  const j = drobeckyJsonLd([{ nazev: 'Domů', cesta: '/' }, { nazev: 'Regiony', cesta: '/regiony' }, { nazev: 'Jihomoravský' }]);
  assert.equal(j['@type'], 'BreadcrumbList');
  assert.deepEqual(j.itemListElement.map(x => [x.position, x.name, x.item]), [
    [1, 'Domů', 'https://www.prijimackynaskolu.cz/'],
    [2, 'Regiony', 'https://www.prijimackynaskolu.cz/regiony'],
    [3, 'Jihomoravský', undefined],
  ]);
});

test('stránky s drobečkovou navigací vkládají BreadcrumbList', () => {
  for (const soubor of ['src/components/skola/ProfilSkoly.tsx', 'src/app/mesto/[mesto]/page.tsx', 'src/app/mesto/page.tsx', 'src/app/regiony/[kraj]/page.tsx']) {
    assert.match(fs.readFileSync(soubor, 'utf8'), /<DrobeckyJsonLd polozky=/, soubor);
  }
  // Stránka oboru: nová podoba i starší, obě se svou navigací.
  assert.equal(fs.readFileSync('src/app/skola/[slug]/page.tsx', 'utf8').match(/<DrobeckyJsonLd /g).length, 2);
});
