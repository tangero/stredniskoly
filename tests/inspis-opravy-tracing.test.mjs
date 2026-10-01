// ============================================================================
// Ruční opravy profilu InspIS (data/inspis_opravy.json, #220) čte src/lib/data.ts
// za běhu přes fs. Next je sám nepřibalí, a funkce, která soubor nemá, opravu
// potichu vynechá. Každá trasa, která profil čte, ho proto musí mít
// v outputFileTracingIncludes, včetně otevřených dat školy (json a md).
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import config from '../next.config.ts';

// Moduly, přes které se stránky a trasy dostanou k getInspisDataByRedizo.
const CTENARI = ['skola-profil-data', 'obor-profil-data', 'skola-otevrena-data-server'];

function trasy(adr) {
  return readdirSync(adr, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(adr, e.name);
    if (e.isDirectory()) return trasy(p);
    return /^(page\.tsx|route\.ts)$/.test(e.name) ? [p] : [];
  });
}

test('každá trasa, která čte profil InspIS, má přibalené ruční opravy', () => {
  const ctouci = trasy('src/app')
    .filter((soubor) => CTENARI.some((m) => readFileSync(soubor, 'utf8').includes(`lib/${m}'`)))
    .map((soubor) => '/' + path.dirname(path.relative('src/app', soubor)).split(path.sep).join('/'));
  assert.deepEqual(ctouci.sort(), ['/api/skola/[slug]/json', '/api/skola/[slug]/md', '/skola/[slug]']);
  for (const trasa of ctouci) {
    const pribalene = config.outputFileTracingIncludes?.[trasa] ?? [];
    assert.ok(pribalene.includes('./data/inspis_opravy.json'), `${trasa}: chybí data/inspis_opravy.json`);
    assert.ok(pribalene.includes('./data/inspis_school_profiles.json'), `${trasa}: chybí profil InspIS`);
  }
});
