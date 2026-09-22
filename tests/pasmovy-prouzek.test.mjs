import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { zavadec } from './_zavadec.mjs';

// Prototyp pásmového proužku (docs/navrh-pasmovy-prouzek-2027.md).
//
// Proužek a věta pod ním popisují totéž. Když se rozejdou, uchazeč čte dvě
// různá čísla o jedné věci — a právě to se v prvním sestavení stalo u oboru,
// kde mezi mezemi nikdo nebyl.

const ZAKLAD = {
  soutezicich: 94,
  prijatych: 29,
  neveslo_se: 60,
  prijato_na_vyssi_prioritu: 0,
  nesplnilo_podminky: 5,
  min_prijaty: 81,
  min_prijaty_percentil: 93.6,
  median_prijatych: 89,
  vice_zamereni: false,
  talentova_zkouska: false,
  pasma: [
    { od: 70, do: 80, prijato: 0, soutezilo: 16 },
    { od: 80, do: 90, prijato: 16, soutezilo: 35 },
    { od: 90, do: 100, prijato: 13, soutezilo: 15 },
  ],
};

/** Stav vstupů se podstrkuje přes useState; jinak se na výsledek nedá dostat. */
function vykresli(data, { cj = '', ma = '' } = {}) {
  let poradi = 0;
  const react = {
    ...React,
    useState: (init) => {
      poradi += 1;
      // 1 = vybraný obor, 2 = čeština, 3 = matematika, 4 = přepínač rozdělení
      if (poradi === 2) return [cj, () => {}];
      if (poradi === 3) return [ma, () => {}];
      return [init, () => {}];
    },
  };
  const { PasmovyProuzek } = zavadec(react)('src/components/prototyp/PasmovyProuzek.tsx');
  return renderToStaticMarkup(
    React.createElement(PasmovyProuzek, {
      obory: [{ id: 'x_79-41-K/81', nazev: 'Gymnázium', obec: 'Praha', obor: 'Gymnázium', data }],
    }),
  );
}

test('bez zadaných bodů proužek nevyhodnocuje, jen vyzve', () => {
  const html = vykresli({ ...ZAKLAD, pasmo_nejistoty: [81, 93] });
  assert.match(html, /Zadej svoje body/);
  assert.doesNotMatch(html, /Chybí ti/);
});

test('v pásmu nejistoty se uvádějí počty, ne procenta', () => {
  // Přirozené četnosti se chápou spolehlivěji a nepředstírají přesnost,
  // kterou data nemají. Počty musí pocházet z přesných polí, ne ze součtu pásem.
  const html = vykresli(
    { ...ZAKLAD, pasmo_nejistoty: [81, 93], pasmo_nejistoty_soutezilo: 41, pasmo_nejistoty_prijato: 24 },
    { cj: '42', ma: '42' },
  );
  assert.match(html, /ze 41 uchazečů dostalo 24/);
  // Procenta hledáme v textu, ne v `style="left: 84%"`.
  const text = html.replace(/ style="[^"]*"/g, '').replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(text, /\d+\s*%/, 'procenta předstírají přesnost, kterou data nemají');
});

test('pod pásmem se říká, kolik bodů chybí', () => {
  // Konkrétní cíl místo verdiktu: „chybí ti 13 bodů“ unese čtrnáctiletý líp
  // než „nemáš na to“.
  const html = vykresli({ ...ZAKLAD, pasmo_nejistoty: [81, 93] }, { cj: '38', ma: '30' });
  assert.match(html, /Pod 81 bodů se loni nedostal nikdo/);
  assert.match(html, /Chybí ti 13 bodů/);
});

test('nad pásmem se neslibuje víc, než data nesou', () => {
  const html = vykresli({ ...ZAKLAD, pasmo_nejistoty: [81, 93] }, { cj: '48', ma: '48' });
  assert.match(html, /Nad 93 bodů se loni dostali všichni/);
});

test('když mezi mezemi nikdo nebyl, věta sedí s proužkem', () => {
  // Původní sestavení tvrdilo „nad 44 se dostali všichni“, zatímco proužek
  // kreslil zelenou až od 51. Dvě různá čísla o jedné věci.
  const data = { ...ZAKLAD, min_prijaty: 51, pasmo_nejistoty: [51, 44] };
  const html = vykresli(data, { cj: '42', ma: '42' });
  assert.match(html, /Nad 51 bodů se loni dostali všichni/);
  assert.match(html, /mezi 44 a 51 body nebyl nikdo/);
  assert.doesNotMatch(html, /Nad 44 bodů se loni dostali všichni/, 'věta odporuje proužku');
});

test('výhrady jsou na obrazovce, ne jen v dokumentaci', () => {
  const html = vykresli({ ...ZAKLAD, pasmo_nejistoty: [81, 93] }, { cj: '42', ma: '42' });
  assert.match(html, /Není to hranice ani předpověď/);
  assert.match(html, /mění obtížnost samotné zkoušky/);
});

test('u oboru, kde o pořadí nerozhodl test, se to přizná', () => {
  const html = vykresli(
    { ...ZAKLAD, pasmo_nejistoty: [10, 90], rozhodl_test: 0.62 },
    { cj: '25', ma: '25' },
  );
  assert.match(html, /proužek je jen orientační/);
});

test('nesmyslné body se neberou jako výsledek', () => {
  // Bez kontroly by 80 v češtině (maximum je 50) posunulo špendlík mimo osu.
  const html = vykresli({ ...ZAKLAD, pasmo_nejistoty: [81, 93] }, { cj: '80', ma: '80' });
  assert.match(html, /Zadej svoje body/);
});

// ---------------------------------------------------------------------------
// Stránka prototypu. Je nezalistovaná, ne chráněná — a tenhle rozdíl se dá
// snadno rozbít jedním nepozorným commitem.
// ---------------------------------------------------------------------------

test('stránka prototypu se neindexuje', async () => {
  const { readFile } = await import('node:fs/promises');
  const zdroj = await readFile('src/app/prototyp/pasma/page.tsx', 'utf8');
  assert.match(zdroj, /robots:\s*\{\s*index:\s*false/, 'chybí noindex');
});

test('prototyp není v sitemapě', async () => {
  const { readFile } = await import('node:fs/promises');
  const generator = await readFile('scripts/generate-sitemap.mjs', 'utf8');
  assert.doesNotMatch(generator, /prototyp/, 'prototyp by se dostal do sitemapy');
});

test('prototyp není zakázaný v robots.txt', async () => {
  // Zní to obráceně: zakázané procházení by vyhledávači zabránilo `noindex`
  // přečíst, takže adresa by se mohla objevit v indexu bez obsahu.
  const { readFile } = await import('node:fs/promises');
  const robots = await readFile('src/app/robots.ts', 'utf8');
  assert.doesNotMatch(robots, /prototyp/, 'disallow by znemožnil přečíst noindex');
});

test('na prototyp nikde nevede odkaz', async () => {
  const { readFile, readdir } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const najdi = async (dir) => {
    const polozky = await readdir(dir, { withFileTypes: true });
    const soubory = [];
    for (const p of polozky) {
      const cesta = join(dir, p.name);
      if (p.isDirectory()) soubory.push(...(await najdi(cesta)));
      else if (/\.tsx?$/.test(p.name)) soubory.push(cesta);
    }
    return soubory;
  };
  const odkazujici = [];
  for (const f of await najdi('src')) {
    if (f.includes('prototyp')) continue; // sama stránka a komponenta
    const obsah = await readFile(f, 'utf8');
    if (/href=["'`]\/prototyp/.test(obsah)) odkazujici.push(f);
  }
  assert.deepEqual(odkazujici, [], 'prototyp má být dostupný jen přímou adresou');
});
