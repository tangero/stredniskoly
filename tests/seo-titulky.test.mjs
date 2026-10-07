import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MAX_POPIS, MAX_TITULEK, popisMesta, popisOboru, popisOboruBezJpz, popisSkoly, titulekMesta, titulekOboru, titulekSkoly, zkrat,
} from '../src/lib/seo-titulky.ts';

// Titulky a popisy ve výsledcích vyhledávání (#405, fáze 1; kontrolní SEO audit #414).

test('titulek města začíná „Přijímačky“ a jménem města a vejde se do limitu u všech měst', () => {
  assert.equal(titulekMesta('Brno'), 'Přijímačky Brno: střední školy a obtížnost přijetí');
  const mesta = [...fs.readFileSync('src/lib/mesta.mjs', 'utf8').matchAll(/nazev: '([^']+)'/g)].map(m => m[1]);
  assert.ok(mesta.length > 100);
  for (const m of mesta) {
    const t = titulekMesta(m);
    assert.ok(t.length <= MAX_TITULEK, t);
    assert.ok(t.startsWith(`Přijímačky ${m}`), t);
    assert.ok(popisMesta(m, 2026).length <= MAX_POPIS, m);
  }
});

test('titulek školy a oboru: obec a „přijímačky“, do 60 znaků, popis do 155', () => {
  assert.equal(titulekSkoly('Gymnázium, Sady pionýrů', 'Lovosice'), 'Přijímačky Lovosice: Gymnázium, Sady pionýrů');
  assert.equal(titulekOboru('Gymnázium', 'Gymnázium, Sady pionýrů', 'Lovosice'), 'Gymnázium – Gymnázium, Sady pionýrů, Lovosice: přijímačky');
  const dlouhy = 'Střední průmyslová škola strojní a elektrotechnická a Vyšší odborná škola, Resslova';
  assert.match(titulekOboru('Kuchař - číšník', 'SŠ technická a gastronomická, Bezručova', 'Blansko'), /^Přijímačky Blansko: Kuchař - číšník – SŠ/);
  for (const t of [titulekSkoly(dlouhy, 'Ústí nad Labem'), titulekOboru('Mechanik seřizovač – mechatronik', dlouhy, 'Ústí nad Labem')]) {
    assert.ok(t.length <= MAX_TITULEK, t);
  }
  for (const p of [popisSkoly(dlouhy, 'Ústí nad Labem', 2026), popisOboru('Mechanik', dlouhy, 'Brno', 2026), popisOboruBezJpz('Truhlář', 'učební obor', dlouhy, 'Brno', 2026)]) {
    assert.ok(p.length <= MAX_POPIS, p);
  }
});

test('popisy: rok z parametru (bez roku nic napevno), pojmy ze slovníku pojmů', () => {
  assert.match(popisOboru('Gymnázium', 'Gymnázium, Sady pionýrů', 'Lovosice', 2026), /v 1\. kole 2026/);
  assert.doesNotMatch(popisOboru('Gymnázium', 'Gymnázium, Sady pionýrů', 'Lovosice', null), /\d{4}/);
  assert.match(popisOboruBezJpz('Truhlář', 'učební obor', 'SOU', 'Brno', 2026), /zbylá místa po 1\. kole 2026/);
  for (const t of [popisMesta('Brno', 2026), popisSkoly('X', 'Brno', 2026), popisOboru('X', 'Y', 'Brno', 2026), popisOboruBezJpz('X', 'učební obor', 'Y', 'Brno', 2026)]) {
    assert.doesNotMatch(t, /volná místa|hranice přijetí|šance/i, t);
  }
});

test('zkrácení na celé slovo s výpustkou', () => {
  assert.equal(zkrat('krátký text', 60), 'krátký text');
  const z = zkrat('jedna dvě tři čtyři pět šest sedm osm devět deset', 20);
  assert.ok(z.length <= 20 && z.endsWith('…') && !z.includes('  '), z);
});
