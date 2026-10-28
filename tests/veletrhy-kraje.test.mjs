// Krajské podstránky /veletrhy/[kraj] (#545): metadata všech 14 krajů, prázdný kraj, sitemapa, revalidace.
// Pouští se přes tsx (`npm run test:mesto`), protože modul importuje `.ts` a `.mjs` napříč.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { metaVeletrhuKraje, rocnikAkci } from '../src/lib/veletrhy-pocty.ts';
import { krajNames, vsechnyKraje } from '../src/lib/kraje.mjs';
import { zobrazitelneAkce } from '../src/lib/veletrhy.ts';
import { createKrajSlug } from '../src/lib/utils.ts';

const KODY = Object.keys(krajNames);
const akce = [{ mesto: 'Nymburk', online: false }, { mesto: 'Kolín' }, { mesto: 'Nymburk' }];

test('rocnikAkci: přes přelom roku, jeden rok, bez akcí', () => {
  assert.equal(rocnikAkci([{ start: '2026-10-05', end: '2027-01-20' }]), '2026/27');
  assert.equal(rocnikAkci([{ start: '2026-10-05', end: '2026-11-01' }]), '2026');
  assert.equal(rocnikAkci([]), '');
});

test('K2: každý z 14 krajů má unikátní titulek do 60 znaků a popisek s názvem kraje', () => {
  assert.equal(KODY.length, 14);
  const tituly = new Set();
  for (const kod of KODY) {
    const m = metaVeletrhuKraje(kod, akce, '2026/27');
    assert.ok(m.title.length <= 60, m.title);
    assert.ok(m.title.includes('2026/27'));
    assert.ok(m.description.length <= 200, m.description);
    tituly.add(m.title);
  }
  assert.equal(tituly.size, 14);
  assert.equal(
    metaVeletrhuKraje('CZ020', akce, '2026/27').title,
    'Veletrhy středních škol Středočeský kraj 2026/27',
  );
});

test('popisek nese počet akcí a města bez opakování', () => {
  const m = metaVeletrhuKraje('CZ020', akce, '2026/27');
  assert.match(m.description, /3 akce \(Nymburk, Kolín\)/);
  assert.match(m.description, /Středočeský kraj/);
});

test('K4: prázdný kraj netvrdí nadcházející akce', () => {
  const m = metaVeletrhuKraje('CZ063', [], '2026/27');
  assert.match(m.description, /Nadcházející akci teď nevedeme/);
  assert.doesNotMatch(m.description, /\d+ akc/);
  assert.match(m.title, /Kraj Vysočina/);
});

test('K5: obnovVeletrhy zneplatní i krajské podstránky', () => {
  const zdroj = fs.readFileSync(new URL('../src/lib/veletrhy-zdroj.ts', import.meta.url), 'utf8');
  assert.match(zdroj, /revalidatePath\('\/veletrhy\/\[kraj\]', 'page'\)/);
});

test('K1: generateStaticParams vrací slug všech 14 krajů, neznámý slug je 404 (dynamicParams = false)', async () => {
  const stranka = await import('../src/app/veletrhy/[kraj]/page.tsx');
  const ocekavane = vsechnyKraje().map((k) => createKrajSlug(k.kod, k.nazev)).sort();
  assert.equal(ocekavane.length, 14);
  assert.deepEqual(stranka.generateStaticParams().map((p) => p.kraj).sort(), ocekavane);
  assert.equal(stranka.dynamicParams, false);
  const meta = await stranka.generateMetadata({ params: Promise.resolve({ kraj: 'neexistujici-kraj' }) });
  assert.equal(meta.title, 'Kraj nenalezen');
});

test('K3: akce krajů dohromady dávají přesně výběr zobrazitelných akcí, každá akce je právě v jednom kraji', () => {
  const ke = new Date('2026-09-22');
  const vsechny = zobrazitelneAkce(ke);
  const idy = [];
  for (const k of vsechnyKraje()) {
    for (const a of zobrazitelneAkce(ke).filter((x) => x.krajKod === k.kod)) idy.push(a.id);
  }
  const znameKraje = new Set(vsechnyKraje().map((k) => k.kod));
  const ocekavane = vsechny.filter((a) => znameKraje.has(a.krajKod)).map((a) => a.id);
  assert.deepEqual([...idy].sort(), [...ocekavane].sort());
  assert.equal(new Set(idy).size, idy.length);
});
