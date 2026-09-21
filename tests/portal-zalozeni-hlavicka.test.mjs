import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Kdo uplatňuje kód, se stává správcem profilu školy a musí poznat, které.
// Katalog nese jen zkrácený název („Gymnázium“), podle kterého to poznat nejde.
// Hlavička s plným názvem byla jen na /pro-skoly/<kód>, kdežto pozvánka posílá
// lidi na formulář na /pro-skoly — tam chyběla.

const require = createRequire(import.meta.url);

function load(relative) {
  const filename = path.resolve(relative);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const modul = { exports: {} };
  new Function('require', 'module', 'exports', outputText)((specifier) => {
    const target = specifier.startsWith('@/')
      ? specifier.replace('@/', 'src/')
      : specifier.startsWith('.')
        ? path.join(path.dirname(filename), specifier)
        : null;
    if (target === null) return require(specifier);
    for (const pripona of ['', '.tsx', '.ts']) {
      const kandidat = `${target}${pripona}`;
      if (fs.existsSync(kandidat) && !fs.statSync(kandidat).isDirectory()) return load(kandidat);
    }
    throw new Error(`nenalezeno: ${specifier}`);
  }, modul, modul.exports);
  return modul.exports;
}

const { PortalZalozeni } = load('src/components/portal/PortalZalozeni.tsx');

const SKOLA = {
  redizo: '600006247',
  nazev: 'Gymnázium, Praha 9, Litoměřická 726',
  ico: '61387061',
  adresa: 'Litoměřická 726/17, 190 00 Praha 9 – Prosek',
  profil: '/skola/600006247-gymnazium',
};

const vykresli = (skola) =>
  renderToStaticMarkup(
    React.createElement(PortalZalozeni, { nazevSkoly: 'Gymnázium', auth: { kod: 'ABCD-EFGH-JKMN' }, skola }),
  );

test('založení správce ukáže, ke které škole se člověk hlásí', () => {
  const html = vykresli(SKOLA);
  assert.match(html, /Gymnázium, Praha 9, Litoměřická 726/, 'chybí plný název z rejstříku');
  assert.match(html, /Litoměřická 726\/17/, 'chybí adresa');
  assert.match(html, /61387061/, 'chybí IČO');
  assert.match(html, /600006247/, 'chybí REDIZO');
  assert.match(html, /Pokud to není vaše škola/, 'chybí věta pro případ cizí školy');
});

test('hlavička nepřebíjí nadpis stránky', () => {
  // Formulář žije na /pro-skoly, kde h1 („Upravit profil školy“) už je.
  const html = vykresli(SKOLA);
  assert.doesNotMatch(html, /<h1/, 'druhý h1 na stránce');
  assert.match(html, /<h2[^>]*>Gymnázium, Praha 9/);
});

test('bez identifikace se formulář vykreslí dál, jen bez hlavičky', () => {
  // Rejstříkový index může chybět; to nesmí shodit založení správce.
  const html = vykresli(null);
  assert.match(html, /Staňte se správcem profilu/);
  assert.doesNotMatch(html, /IČO/);
});
