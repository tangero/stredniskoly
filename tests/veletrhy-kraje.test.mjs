// Krajské podstránky /veletrhy/[kraj] (#545): metadata všech 14 krajů, prázdný kraj, sitemapa, revalidace.
// Pouští se přes tsx (`npm run test:mesto`), protože modul importuje `.ts` a `.mjs` napříč.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { metaVeletrhuKraje, rocnikAkci } from '../src/lib/veletrhy-pocty.ts';
import { krajNames, nadpisKraje, vsechnyKraje } from '../src/lib/kraje.mjs';
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

// #594: krajské město nebo značka akce v titulku tří krajů, ostatních 11 beze změny.
const TITULKY_594 = {
  CZ064: 'Veletrhy středních škol Brno a Jihomoravský kraj 2026',
  CZ010: 'Veletrhy středních škol Praha 2026',
  CZ071: 'Veletrhy středních škol Olomoucký kraj 2026 – Scholaris',
};

test('#594 K1–K3: Brno, Praha a Scholaris v titulku krajských stránek', () => {
  for (const [kod, ocekavany] of Object.entries(TITULKY_594)) {
    const m = metaVeletrhuKraje(kod, akce, '2026');
    assert.equal(m.title, ocekavany);
    assert.ok(m.title.length <= 60, m.title);
  }
});

test('#594 K5: titulky s ročníkem 2026 jsou unikátní a do 60 znaků u všech 14 krajů', () => {
  const tituly = new Set(KODY.map((kod) => metaVeletrhuKraje(kod, akce, '2026').title));
  assert.equal(tituly.size, 14);
  for (const t of tituly) assert.ok(t.length <= 60, t);
});

test('#594 K6: zbylých 11 krajů má titulek jako dosud', () => {
  const ostatni = KODY.filter((kod) => !(kod in TITULKY_594));
  assert.equal(ostatni.length, 11);
  for (const kod of ostatni) {
    for (const rocnik of ['2026', '2026/27']) {
      assert.equal(
        metaVeletrhuKraje(kod, akce, rocnik).title,
        `Veletrhy středních škol ${nadpisKraje(kod)} ${rocnik}`,
      );
    }
  }
});

test('#594: popisek Olomouckého kraje jmenuje Scholaris jen u nadcházející akce s tímto názvem', () => {
  const se = metaVeletrhuKraje('CZ071', [{ mesto: 'Olomouc', nazev: 'Scholaris Olomouc 2026' }], '2026');
  assert.match(se.description, /včetně Scholaris, Olomoucký kraj/);
  assert.ok(se.description.length <= 200, se.description);
  const bez = metaVeletrhuKraje('CZ071', [{ mesto: 'Olomouc', nazev: 'Burza škol' }], '2026');
  assert.doesNotMatch(bez.description, /Scholaris/);
  assert.doesNotMatch(metaVeletrhuKraje('CZ071', [], '2026').description, /Scholaris/);
  // Jinde se popisek nemění ani s akcí stejného jména.
  assert.doesNotMatch(
    metaVeletrhuKraje('CZ064', [{ mesto: 'Brno', nazev: 'Scholaris Brno' }], '2026').description,
    /Scholaris/,
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
