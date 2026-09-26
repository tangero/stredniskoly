// ============================================================================
// Veletrh ve městě školy na stránce školy a stránce oboru.
//
// Blok tvrdí něco o městě školy, takže si nesmí vymýšlet víc, než data vědí:
// testy hlídají přesnou shodu města, jen potvrzené a neproběhlé akce, pravdivou
// větu o tom, že účast školy doložená není, a skrývání po skončení akce.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { zavadec } from './_zavadec.mjs';

const load = zavadec();
const { akceProObec } = load('src/lib/veletrhy.ts');
const { VeletrhUpoutavka } = load('src/components/veletrhy/VeletrhUpoutavka.tsx');

const KE_DNI = new Date('2026-09-24');

const render = (props) => renderToStaticMarkup(React.createElement(VeletrhUpoutavka, props));

test('akceProObec najde potvrzenou neproběhlou akci ve městě a jen ji', () => {
  const akce = akceProObec('Příbram', KE_DNI);
  assert.ok(akce.some((a) => a.id === 'veletrh-pribram-2026'), 'Příbram má potvrzený veletrh 30. 9.');
  for (const a of akce) {
    assert.equal(a.mesto, 'Příbram', 'shoda musí být přesná na obec');
    assert.ok(a.terminPotvrzen, 'na detail školy patří jen potvrzený termín');
    assert.ok((a.end ?? a.start) >= '2026-09-24', 'proběhlá akce se neukazuje');
  }
  assert.deepEqual(akceProObec('Nepomuk', KE_DNI), [], 'město bez akce vrátí prázdno');
  assert.deepEqual(akceProObec('Vimperk', new Date('2026-10-02')), [], 'akce po skončení zmizí');
});

test('termín jen z agregátoru nebo přibližný na detail školy nepatří', () => {
  // Upoutávka tvrdí „Termín ověřen … na webu pořadatele“; u těchto akcí to
  // pravda není (docs/zdroje-dat.md, oddíl 2.15). V přehledu /veletrhy zůstávají.
  const pardubice = akceProObec('Pardubice', KE_DNI).map((a) => a.id);
  assert.ok(!pardubice.includes('schola-bohemia-pardubice-2026'), 'Schola Bohemia má termín jen z agregátoru');
  assert.ok(pardubice.includes('hitparada-skol-pardubice-2026'), 'ověřená akce ve stejném městě zůstává');
  assert.deepEqual(akceProObec('Beroun', KE_DNI), [], 'Burza škol Beroun má termín jen z agregátoru');
  const html = render({ obec: 'Pardubice', variant: 'skola', ke: KE_DNI });
  assert.ok(!html.includes('Web pořadatele ho zatím neuvádí'), 'karta si nesmí odporovat s větou o ověření');
});

test('školní varianta jmenuje akci, termín, místo a přizná, co neví', () => {
  const html = render({ obec: 'Příbram', variant: 'skola', ke: KE_DNI });
  assert.ok(html.includes('Veletrh středních škol ve městě Příbram'), 'nadpis nese město v tvaru, který nepotřebuje skloňovat');
  assert.ok(html.includes('Veletrh středních škol Příbram'), 'jmenuje akci');
  assert.ok(html.includes('30. září 2026'), 'ukáže termín slovy');
  assert.ok(html.includes('9:00–16:00'), 'ukáže čas');
  assert.ok(html.includes('Estrádní sál KD Příbram'), 'ukáže místo');
  assert.ok(html.includes('Stránka akce'), 'vede na stránku pořadatele');
  assert.ok(html.includes('Všechny veletrhy'), 'vede na přehled');
  assert.ok(html.includes('Účast této školy mezi vystavovateli nemáme doloženou'),
    'seznam vystavovatelů neexistuje v žádném zdroji — blok to musí říct');
  assert.ok(html.includes('Termín ověřen 22. 9. 2026'), 'nese datum ověření');
});

test('oborová varianta je položka seznamu „Co vám pomůže“', () => {
  const html = render({ obec: 'Břeclav', variant: 'obor', ke: KE_DNI });
  assert.ok(html.startsWith('<li>'), 'varianta obor je položka <li>');
  assert.ok(html.includes('7.–8. října 2026'), 'vícedenní akce se ukáže celá');
  assert.ok(html.includes('účast této školy mezi vystavovateli nemáme doloženou'));
  assert.ok(!html.includes('<div'), 'žádná karta, jen položka seznamu');
});

test('odsazení karty jde s kartou, bez akce nezůstane prázdný obal', () => {
  assert.ok(render({ obec: 'Příbram', variant: 'skola', ke: KE_DNI, className: 'mb-8' }).includes('mb-8'));
  assert.equal(render({ obec: 'Nepomuk', variant: 'skola', ke: KE_DNI, className: 'mb-8' }), '');
});

test('město bez potvrzené akce nevykreslí nic', () => {
  assert.equal(render({ obec: 'Nepomuk', variant: 'skola', ke: KE_DNI }), '');
  assert.equal(render({ obec: 'Nepomuk', variant: 'obor', ke: KE_DNI }), '');
});

test('město se dvěma akcemi ukáže obě v množném čísle', () => {
  const html = render({ obec: 'Olomouc', variant: 'skola', ke: KE_DNI });
  assert.ok(html.includes('Veletrhy středních škol ve městě Olomouc'), 'nadpis v množném čísle');
  assert.equal((html.match(/Stránka akce/g) ?? []).length, 2, 'každá akce má svůj odkaz');
});

test('klientská pojistka skryje upoutávku po skončení akce', () => {
  // Stejný postup jako u nočního filtru VeletrhySeznam: hooks se simulují
  // nad přeloženým zdrojem. Serverová snapshota je vždy „vidět“ (staví ji
  // revalidate), klientská se vyhodnotí až v prohlížeči.
  const cesta = new URL('../src/components/veletrhy/VeletrhSkryvani.tsx', import.meta.url);
  const require = createRequire(cesta);
  let ted = '2026-09-30T10:00:00Z';
  let rezim = 'server';
  const exports = {};
  // Den počítá sdílená cesskyDen; tady dostane podstrčený čas testu.
  const { cesskyDen } = load('src/lib/veletrhy-pocty.ts');
  vm.runInNewContext(ts.transpileModule(readFileSync(cesta, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require: (id) => id === 'react' ? {
      useSyncExternalStore: (prihlasit, klientsky, serverovy) => (rezim === 'server' ? serverovy : klientsky)(),
    } : id === '@/lib/veletrhy-pocty' ? { cesskyDen: () => cesskyDen(new Date(ted)) } : require(id),
    Intl,
    Date: class extends Date { constructor() { super(ted); } },
  });
  const props = { doKonce: '2026-09-30', children: 'upoutávka' };
  const renderuj = () => renderToStaticMarkup(exports.VeletrhSkryvani(props));
  assert.ok(renderuj().includes('upoutávka'), 'server vykreslí blok vždy, skrývá až klient');
  rezim = 'klient';
  assert.ok(renderuj().includes('upoutávka'), 've den konání je blok pořád vidět');
  ted = '2026-10-01T10:00:00Z'; // den po skončení, v Praze
  assert.equal(renderuj(), '', 'po skončení akce se blok skryje');
});

test('oborová varianta se po skončení akce skrývá stejně jako karta', () => {
  // Stránka oboru se revaliduje po hodině; bez obalu by proběhlá akce
  // visela v „Co vám pomůže“ jako nadcházející.
  const zdroj = readFileSync(new URL('../src/components/veletrhy/VeletrhUpoutavka.tsx', import.meta.url), 'utf8');
  const obor = zdroj.slice(zdroj.indexOf("if (variant === 'obor')"), zdroj.indexOf('return (\n    <VeletrhSkryvani doKonce={doKonce}>\n      <div'));
  assert.ok(obor.includes('<VeletrhSkryvani doKonce={doKonce}>'), 'varianta obor je obalená VeletrhSkryvani');
});
