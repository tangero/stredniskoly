import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { zavadec } from './_zavadec.mjs';

// Kdo uplatňuje kód, se stává správcem profilu školy a musí poznat, které.
// Katalog nese jen zkrácený název („Gymnázium“), podle kterého to poznat nejde.
// Hlavička s plným názvem byla jen na /pro-skoly/<kód>, kdežto pozvánka posílá
// lidi na formulář na /pro-skoly — tam chyběla.

const { PortalZalozeni } = zavadec()('src/components/portal/PortalZalozeni.tsx');

const SKOLA = {
  redizo: '600006247',
  nazev: 'Gymnázium, Praha 9, Litoměřická 726',
  ico: '61387061',
  adresa: 'Litoměřická 726/17, 190 00 Praha 9 – Prosek',
  profil: '/skola/600006247-gymnazium',
};

const vykresli = (skola, uroven) =>
  renderToStaticMarkup(
    React.createElement(PortalZalozeni, { nazevSkoly: 'Gymnázium', auth: { kod: 'ABCD-EFGH-JKMN' }, skola, uroven }),
  );

test('založení správce ukáže, ke které škole se člověk hlásí', () => {
  const html = vykresli(SKOLA, 'h4');
  assert.match(html, /Gymnázium, Praha 9, Litoměřická 726/, 'chybí plný název z rejstříku');
  assert.match(html, /Litoměřická 726\/17/, 'chybí adresa');
  assert.match(html, /61387061/, 'chybí IČO');
  assert.match(html, /600006247/, 'chybí REDIZO');
  assert.match(html, /Pokud to není vaše škola/, 'chybí věta pro případ cizí školy');
});

test('úroveň nadpisů se řídí místem, kde formulář stojí', () => {
  // V kartě na /pro-skoly visí pod h2 „Upravit profil školy“ a h3 „Máme
  // přihlašovací kód“, takže identifikace i nadpis formuláře patří na h4.
  const vKarte = vykresli(SKOLA, 'h4');
  assert.doesNotMatch(vKarte, /<h1|<h2|<h3/, 'přeskočená úroveň nadpisu');
  assert.match(vKarte, /<h4[^>]*>Gymnázium, Praha 9/);
  assert.match(vKarte, /<h4[^>]*>Staňte se správcem profilu<\/h4>/);

  // Na samostatné stránce /pro-skoly/<kód> je formulář hned pod h1 hlavičky.
  const samostatne = vykresli(null, 'h2');
  assert.match(samostatne, /<h2[^>]*>Staňte se správcem profilu<\/h2>/);
});

test('bez identifikace se formulář vykreslí dál, jen bez hlavičky', () => {
  // Rejstříkový index může chybět; to nesmí shodit založení správce.
  const html = vykresli(null, 'h4');
  assert.match(html, /Staňte se správcem profilu/);
  assert.doesNotMatch(html, /IČO/);
});
