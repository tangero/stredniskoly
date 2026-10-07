// Varianta B přehledu veletrhů: stejná data a stejné věty, jiné rozložení. Od #429 je veřejnou
// stránkou /veletrhy. Výpis komponenty bez `varianta` (původní rozložení) hlídá dál veletrhy-render.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VeletrhySeznam } from '../src/app/veletrhy/VeletrhySeznam.tsx';
import { cesskyDen } from '../src/lib/veletrhy-pocty.ts';
import { createKrajSlug } from '../src/lib/utils.ts';
import { vsechnyKraje } from '../src/lib/kraje.mjs';

const DEN = cesskyDen(new Date('2026-09-22'));

function karta(prepis) {
  return {
    id: 'x',
    nazev: 'Akce',
    poradatel: 'Pořadatel',
    mesto: 'Město',
    krajKod: 'CZ020',
    misto: 'Sál',
    start: '2026-10-05',
    end: '2026-10-05',
    datum: '5. října 2026',
    url: 'https://example.cz/',
    ...prepis,
  };
}

const viditelne = (html) =>
  html
    .replace(/<[^>]*\bsr-only\b[^>]*>[\s\S]*?<\/[^>]+>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function vykresli(akce, varianta) {
  return renderToStaticMarkup(
    React.createElement(VeletrhySeznam, {
      akce,
      den: DEN,
      ...(varianta ? { varianta, otazky: React.createElement('p', null, 'Otázky ke stánku') } : {}),
    }),
  );
}

test('výpis bez varianty nemá pás nejbližších akcí ani značku varianty', () => {
  const html = vykresli([karta()]);
  assert.equal(html.includes('Nejbližší akce'), false);
  assert.equal(html.includes('data-varianta'), false);
  assert.ok(html.includes('<time dateTime="2026-10-05">5. října 2026</time>'));
  assert.ok(html.includes('border-amber-200') === false);
});

test('varianta B ukáže tři nejbližší v pořadí data a odkáže na kraj', () => {
  const html = vykresli([
    karta({ id: 'd', start: '2026-12-01', end: '2026-12-01', datum: '1. prosince 2026', nazev: 'Pozdě' }),
    karta({ id: 'a', start: '2026-10-20', end: '2026-10-20', datum: '20. října 2026', nazev: 'Prostřední', krajKod: 'CZ064' }),
    karta({ id: 'b', start: '2026-10-01', end: '2026-10-01', datum: '1. října 2026', nazev: 'První' }),
    karta({ id: 'c', start: '2026-11-02', end: '2026-11-02', datum: '2. listopadu 2026', nazev: 'Třetí', krajKod: 'CZ032' }),
  ], 'b');
  const pas = html.slice(html.indexOf('Nejbližší akce'), html.indexOf('Kde se veletrh koná'));
  const prvni = pas.indexOf('První');
  const prostredni = pas.indexOf('Prostřední');
  const treti = pas.indexOf('Třetí');
  assert.ok(prvni > -1 && prvni < prostredni && prostredni < treti);
  assert.equal(pas.includes('Pozdě'), false);
  assert.ok(html.includes('Pozdě'), 'Akce mimo pás tří nejbližších zůstává v seznamu krajů.');
  assert.ok(html.includes('Seznam níže je podle krajů.'));
  const slug = createKrajSlug('CZ064', vsechnyKraje().find((k) => k.kod === 'CZ064').nazev);
  assert.ok(html.includes(`href="#${slug}"`));
  assert.ok(html.includes('Otázky ke stánku'));
  assert.ok(html.includes('data-varianta="b"'));
  assert.ok(html.includes('id="kde"'));
});

test('na kartě varianty B je datum vidět ve dlaždici a věta s datem je pro čtečku', () => {
  const html = vykresli([
    karta({ cas: '9:00–16:00', terminPribligny: true, poznamkaTerminu: 'Pořadatel uvádí jen měsíc.' }),
  ], 'b');
  assert.ok(html.includes('leading-none">~5</span>'));
  assert.ok(html.includes('<time class="sr-only" dateTime="2026-10-05">'));
  assert.ok(html.includes('přibližně'));
  assert.equal(viditelne(html).includes('5. října 2026'), false);
  assert.ok(viditelne(html).includes('9:00–16:00 · Sál'));
  assert.ok(html.includes('Termín je přibližný.'));
  assert.equal(html.includes('border-amber-200'), false);
  assert.ok(html.includes('Pořádá Pořadatel'));
  assert.ok(html.includes('Stránka akce'));
  assert.ok(html.includes('Víme jen o této akci s potvrzeným termínem.'));
  assert.ok(html.includes('před zveřejněním ji ověříme na stránce pořadatele.'));
});

test('veřejná stránka /veletrhy je varianta B, indexovaná, bez přepisu a s přesměrováním prototypu (#429)', () => {
  const config = readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8');
  assert.equal(config.includes("key: 'varianta'"), false);
  assert.match(config, /source: '\/prototyp\/veletrhy', destination: '\/veletrhy', permanent: true/);
  const verejna = readFileSync(new URL('../src/app/veletrhy/page.tsx', import.meta.url), 'utf8');
  assert.match(verejna, /varianta="b"/);
  assert.match(verejna, /canonical: '\/veletrhy'/);
  assert.equal(/index: false/.test(verejna), false);
  assert.match(verejna, /Co si na veletrhu zjistit/);
  assert.equal(verejna.includes('searchParams'), false);
});
