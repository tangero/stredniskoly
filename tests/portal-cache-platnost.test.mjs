// ============================================================================
// Platnost dat čtených stránkou školy a oboru (#231).
//
// Next propisuje číselnou platnost `unstable_cache` do ISR stránky, která
// cache čte. Hodinová platnost portálových cache tak přestavovala stránky
// škol každou hodinu místo po 12 hodinách. Cache proto platnost nemají
// a aktuálnost drží jen značka, kterou zápis v portálu zneplatní.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { zavadec } from './_zavadec.mjs';

const volani = [];
const nextCache = {
  unstable_cache: (fn, klic, volby) => {
    volani.push({ klic: klic.join('/'), volby });
    return fn;
  },
  revalidateTag: () => {},
};
const TAGY = { TAG_PROFIL: 'portal-profil', TAG_SPRAVCI: 'portal-spravci', TAG_KRITERIA: 'portal-kriteria' };
const load = zavadec(undefined, {
  'next/cache': nextCache,
  './novinky-db': { dotaz: async () => ({ rows: [] }), jeDbNastavena: () => false },
  './portal-api': TAGY,
  './portal-profil': { potvrzeneUdaje: async () => ({}) },
  './portal-skol': { getPortalSkolData: () => ({}) },
  './portal-ucty': { verejniSpravci: async () => [] },
  './kriteria-skoly-vyber': { kriteriaOdSkoly: () => null },
});

load('src/lib/portal-profil-verejne.ts');
load('src/lib/portal-verejne.ts');
load('src/lib/kriteria-skoly-verejne.ts');

test('portálové cache nemají časovou platnost a nesou značku', () => {
  const ocekavane = {
    'portal-potvrzene-udaje': TAGY.TAG_PROFIL,
    'portal-verejni-spravci': TAGY.TAG_SPRAVCI,
    'portal-kriteria-verejne': TAGY.TAG_KRITERIA,
  };
  assert.deepEqual(volani.map((v) => v.klic).sort(), Object.keys(ocekavane).sort());
  for (const { klic, volby } of volani) {
    assert.equal(volby.revalidate, false, `${klic}: číselná platnost by zkrátila ISR stránky školy`);
    assert.deepEqual(volby.tags, [ocekavane[klic]], `${klic}: bez značky by zápis v portálu stránku neobnovil`);
  }
});

test('otevřená data školy mají stejnou obnovu jako stránka školy na serveru i v CDN, v prohlížeči žádnou', () => {
  const cislo = (soubor, vzor) => Number(readFileSync(soubor, 'utf8').match(vzor)?.[1]);
  const stranka = cislo('src/app/skola/[slug]/page.tsx', /export const revalidate = (\d+)/);
  assert.ok(stranka >= 3600, 'stránka školy má číselnou platnost');
  for (const trasa of ['json', 'md']) {
    const soubor = `src/app/api/skola/[slug]/${trasa}/route.ts`;
    assert.equal(cislo(soubor, /export const revalidate = (\d+)/), stranka, `${trasa}: revalidate`);
    assert.equal(cislo(soubor, /s-maxage=(\d+)/), stranka, `${trasa}: Cache-Control s-maxage pro CDN`);
    // Prohlížeč by starý profil držel i po zápisu v portálu, značka zneplatní jen server.
    assert.equal(cislo(soubor, /[^-]max-age=(\d+)/), 0, `${trasa}: Cache-Control max-age pro prohlížeč`);
  }
});
