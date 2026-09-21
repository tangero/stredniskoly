/**
 * Kontroly přehledu škol ve městě.
 *
 * Hlídají pět chyb nalezených v oponentuře PR #139 z 21. 9. 2026, protože každá
 * z nich tvrdila čtenáři něco nepravdivého a žádná neshodila build ani typy.
 *
 * Spuštění: node --test tests/mesto-prehled.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCityStats, MESTA } from '../src/lib/cityData.ts';

/** Města napříč velikostmi; celá stovka by test protáhla bez užitku. */
const VZOREK = ['Praha', 'Pardubice', 'Karlovy Vary', 'Chrudim'];

async function radky(mesta = VZOREK) {
  const out = [];
  for (const nazev of mesta) {
    const stats = await getCityStats(nazev);
    if (stats) out.push(...stats.schools.map(r => ({ ...r, mesto: nazev })));
  }
  return out;
}

test('obor s doloženým výsledkem se neoznačí za nevypsaný', async () => {
  const sporne = (await radky()).filter(r => r.chybiVRocniku && r.zarazeni !== null);
  assert.equal(
    sporne.length, 0,
    `Nabídka se zařazením obtížnosti je vypsaná; nesmí nést „nevypsán“. `
    + `Rozpory: ${sporne.slice(0, 3).map(r => `${r.mesto}/${r.obor}`).join(', ')}`,
  );
});

test('chybějící shoda se starým exportem nemaže údaje ze souhrnu', async () => {
  // Nález 1: kapacita a přihlášky se dřív brali jen z applications_2026.json,
  // takže při neúspěšném spárování zmizely, i když je souhrn 1. kola nese.
  const seZarazenim = (await radky()).filter(r => r.zarazeni !== null);
  const bezPrihlasek = seZarazenim.filter(r => r.prihlasky2026 === null);
  assert.equal(
    bezPrihlasek.length, 0,
    `Nabídka se souhrnem musí mít i přihlášky: ${bezPrihlasek.slice(0, 3).map(r => r.obor).join(', ')}`,
  );
});

test('karta školy odkazuje na přehled školy, ne na jednu nabídku', async () => {
  const podleSkoly = new Map();
  for (const r of await radky()) {
    podleSkoly.set(r.redizo, [...(podleSkoly.get(r.redizo) ?? []), r]);
  }
  for (const [redizo, nabidky] of podleSkoly) {
    const adresy = new Set(nabidky.map(r => r.slugSkoly));
    assert.equal(
      adresy.size, 1,
      `Škola ${redizo} má víc adres přehledu: ${[...adresy].join(' | ')}`,
    );
    // Adresa nesmí nést název oboru, jinak závisí na vyfiltrovaných nabídkách.
    const slug = nabidky[0].slugSkoly;
    assert.ok(
      slug.startsWith(`${redizo}-`),
      `Adresa přehledu školy ${redizo} nezačíná jejím REDIZO: ${slug}`,
    );
  }
});

test('nesplněné podmínky školy jsou k dispozici i tam, kde kapacita nerozhodovala', async () => {
  // Nález 2: bez nich „místo pro všechny“ zamlčí, že hlavní překážkou byly
  // požadavky školy. Test hlídá, že je datová vrstva vůbec nese.
  const misto = (await radky()).filter(r => r.zarazeni === 'kapacita_nerozhodovala');
  assert.ok(misto.length > 0, 've vzorku není žádné „místo pro všechny“');
  assert.ok(
    misto.some(r => r.nesplniliPodminky !== null),
    'u „místa pro všechny“ chybí počet nesplněných podmínek',
  );
});

test('předchozí ročník se nese i u „místa pro všechny“', async () => {
  // Nález 3: doložená změna obtížnosti se nesmí skrýt podle aktuální kategorie.
  const zmena = (await radky()).filter(r =>
    r.zarazeni === 'kapacita_nerozhodovala'
    && r.zarazeniPredchozi
    && r.zarazeniPredchozi !== 'kapacita_nerozhodovala');
  assert.ok(
    zmena.length > 0,
    've vzorku chybí nabídka, která se z těžší kategorie posunula na „místo pro všechny“',
  );
  for (const r of zmena) {
    assert.ok(r.predchoziRok, `${r.obor}: zařazení z předchozího ročníku bez roku`);
  }
});

test('zařazení obtížnosti respektuje práh deseti soutěžících', async () => {
  for (const r of await radky()) {
    if (r.zarazeni === null || r.zarazeni === 'kapacita_nerozhodovala') continue;
    assert.ok(
      (r.soutezici ?? 0) >= 10,
      `${r.obor}: zařazení ${r.zarazeni} při ${r.soutezici} soutěžících je pod prahem`,
    );
  }
});

test('každé město ze seznamu má aspoň jednu nabídku', async () => {
  // Stránka bez nabídek by byla prázdná; generátor měst to má vylučovat.
  for (const mesto of MESTA.slice(0, 12)) {
    const stats = await getCityStats(mesto.nazev);
    assert.ok(stats, `${mesto.nazev}: getCityStats nic nevrátil`);
    assert.ok(stats.schools.length > 0, `${mesto.nazev}: žádná nabídka`);
  }
});
