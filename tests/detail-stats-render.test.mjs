import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { historicalSubjectAverage } from '../src/lib/admission-metric.ts';

// Vykreslí skutečné TSX komponenty, včetně společného rendereru, bez Next serveru.
const require = createRequire(import.meta.url);
function load(relative) {
  const filename = path.resolve(relative);
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  }});
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(specifier => {
    if (!specifier.startsWith('@/')) return require(specifier);
    const target = specifier.replace('@/', 'src/');
    return load(fs.existsSync(`${target}.tsx`) ? `${target}.tsx` : `${target}.ts`);
  }, module, module.exports);
  return module.exports;
}
const { StatsTab } = load('src/components/school/detail/tabs/StatsTab.tsx');
const score = (value, field) => historicalSubjectAverage({ value, field, unit: 'percent_0_100', offerId: '600007774_78-42-M/01' });
const stats = {
  subjectAverages: { cj: score(72.2, 'cj_prumer'), ma: score(60.2, 'ma_prumer') },
  prihlasky_priority: [7, 20, 10, 0, 0], prijati_priority: [7, 4, 0, 0, 0],
};
const render = (extendedStats, applications = 37) => renderToStaticMarkup(React.createElement(StatsTab, {
  program: { prihlasky: applications, min_body: 50 }, extendedStats,
}));

test('detail vykreslí správnou jednotku a historické počty bez osobní predikce', () => {
  const html = render(stats);
  assert.match(html, /36,1 \/ 50 bodů/);
  assert.match(html, /30,1 \/ 50 bodů/);
  assert.match(html, /2025/);
  assert.match(html, />37<\/dd>/);
  assert.match(html, />5\.<\/th>/);
  assert.doesNotMatch(html, /\/100|\(těžší\)|\(lehčí\)|Šance přijetí podle priority|Minimální body|100%/);
});

test('nula se vykreslí jako údaj, chybějící priorita a skóre se nedoplní nulou', () => {
  const html = render({ ...stats, subjectAverages: {
    cj: score(0, 'cj_prumer'), ma: score(null, 'ma_prumer'),
  }, prihlasky_priority: [0, 1], prijati_priority: [0] }, 0);
  assert.match(html, /0 \/ 50 bodů/);
  assert.match(html, />0<\/dd>/);
  assert.match(html, /Údaj není k dispozici/);
  assert.doesNotMatch(html, /NaN|undefined/);
  assert.doesNotMatch(render(null), /Průměrné výsledky JPZ/);
});
