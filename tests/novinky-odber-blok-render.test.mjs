import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Vykreslí skutečné komponenty odběru bez Next serveru (vzor: detail-stats-render).
// Hlídá dvě chyby z review PR #132, které se na pohled do kódu špatně poznají:
// prázdný tmavý pruh po vypnutí odběru a tmavý text na tmavém pozadí.

const require = createRequire(import.meta.url);

/** Vlastní zavaděč: umí i `@/…json` a umí podstrčit upravený React. */
function zavadec(reactModul) {
  const cache = new Map();
  return function load(relative) {
    const filename = path.resolve(relative);
    if (cache.has(filename)) return cache.get(filename);
    if (filename.endsWith('.json')) {
      const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
      cache.set(filename, data);
      return data;
    }
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    });
    const module = { exports: {} };
    cache.set(filename, module.exports);
    new Function('require', 'module', 'exports', outputText)((specifier) => {
      if (specifier === 'react' && reactModul) return reactModul;
      // `@/…` míří do src/, `./…` vedle importujícího souboru, zbytek je balíček.
      const target = specifier.startsWith('@/')
        ? specifier.replace('@/', 'src/')
        : specifier.startsWith('.')
          ? path.join(path.dirname(filename), specifier)
          : null;
      if (target === null) return require(specifier);
      for (const pripona of ['', '.tsx', '.ts', '.json']) {
        const kandidat = `${target}${pripona}`;
        if (fs.existsSync(kandidat) && !fs.statSync(kandidat).isDirectory()) return load(kandidat);
      }
      throw new Error(`nenalezeno: ${specifier}`);
    }, module, module.exports);
    cache.set(filename, module.exports);
    return module.exports;
  };
}

async function vykresliBlok(vlastnosti) {
  const { OdberBlok } = zavadec()('src/components/novinky/OdberBlok.tsx');
  // Serverová komponenta je async: element se musí nejdřív vyřešit.
  const element = await OdberBlok(vlastnosti);
  return element === null ? '' : renderToStaticMarkup(element);
}

test('stránka školy nebalí blok do vlastního pozadí', () => {
  // Skutečná příčina prázdného tmavého pruhu (review PR #132, P3): obal stavěl
  // volající, takže se vykreslil i tehdy, když blok vrátil null. Tmavé pozadí
  // proto patří dovnitř komponenty, za její podmínky – tady se hlídá, že se
  // obal do stránky nevrátil.
  const zdroj = fs.readFileSync('src/components/skola/ProfilSkoly.tsx', 'utf8').split('\n');
  const i = zdroj.findIndex((r) => r.includes('<OdberBlok'));
  assert.ok(i > 0, 'blok odběru na stránce školy není');
  assert.match(zdroj[i], /samostatna/, 'blok si nenese vlastní pozadí');

  const predchozi = zdroj.slice(0, i).reverse()
    .find((r) => r.trim() && !r.trim().startsWith('//') && !r.trim().startsWith('*') && !r.trim().startsWith('{/*'));
  assert.doesNotMatch(
    predchozi ?? '',
    /<div[^>]*\sclassName="[^"]*\bbg-/,
    `blok je zabalený do vlastního pozadí, po vypnutí odběru zbyde prázdný pruh: ${predchozi}`,
  );
});

test('vypnutý odběr nezanechá prázdný tmavý pruh', async () => {
  delete process.env.NOVINKY_ZAPNUTO;
  const html = await vykresliBlok({ zdroj: 'skola', varianta: 'karta', nadpis: 'Nadpis', samostatna: true });
  // Pozadí ani rámeček se nesmí vykreslit: obal patří dovnitř komponenty, za
  // její podmínky. Kdyby ho stavěl volající, zbyl by tu prázdný pruh.
  assert.equal(html, '', `blok měl zmizet celý, vykreslil: ${html}`);
});

test('zapnutý odběr vykreslí samostatnou tmavou kartu i nadpis', async () => {
  process.env.NOVINKY_ZAPNUTO = '1';
  try {
    const html = await vykresliBlok({ zdroj: 'skola', varianta: 'karta', nadpis: 'Vše nové o přijímačkách e-mailem?', samostatna: true });
    assert.match(html, /bg-\[#16325c\]/, 'chybí vlastní tmavé pozadí');
    assert.match(html, /Vše nové o přijímačkách e-mailem\?/);
    assert.match(html, /type="email"/);
  } finally {
    delete process.env.NOVINKY_ZAPNUTO;
  }
});

test('pokyn k potvrzení odběru má na tmavém pozadí světlý text', () => {
  // Stav `poslano` se nasadí podstrčeným useState; jinak by se na něj nedalo
  // dosáhnout bez odeslání formuláře.
  const reactSPoslano = {
    ...React,
    useState: (init) => (init === 'formular' ? ['poslano', () => {}] : React.useState(init)),
  };
  const { OdberFormular } = zavadec(reactSPoslano)('src/components/novinky/OdberFormular.tsx');
  const html = renderToStaticMarkup(
    React.createElement(OdberFormular, { rocnik: '2027', zdroj: 'skola', varianta: 'karta' }),
  );

  assert.match(html, /Potvrď odběr v e-mailu\./);
  // Barva musí být na samotném bloku potvrzení, ne zděděná z rodiče: na stránce
  // školy by se jinak zdědilo tmavé #28313b z layoutu a kontrast klesl na 1,6:1.
  const blok = html.match(/<div class="([^"]*)">\s*<p class="font-semibold">/);
  assert.ok(blok, 'blok potvrzení se nenašel');
  assert.match(blok[1], /text-white/, `blok potvrzení nemá světlý text: ${blok[1]}`);
});

test('na světlém pozadí má pokyn k potvrzení naopak tmavý text', () => {
  const reactSPoslano = {
    ...React,
    useState: (init) => (init === 'formular' ? ['poslano', () => {}] : React.useState(init)),
  };
  const { OdberFormular } = zavadec(reactSPoslano)('src/components/novinky/OdberFormular.tsx');
  const html = renderToStaticMarkup(
    React.createElement(OdberFormular, { rocnik: '2027', zdroj: 'novinky', varianta: 'stranka' }),
  );
  const blok = html.match(/<div class="([^"]*)">\s*<p class="font-semibold">/);
  assert.ok(blok);
  assert.match(blok[1], /text-slate-900/);
});
