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
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getCityStats, MESTA } from '../src/lib/cityData.ts';
import { CitySchoolsTable } from '../src/components/CitySchoolsTable.tsx';
import { ZARAZENI_POPISEK } from '../src/lib/obor-profil.ts';

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

// ---------------------------------------------------------------------------
// Vykreslený výstup
//
// Testy výše hlídají datovou vrstvu. Nálezy 2, 3 a 5 z oponentury PR #139 ale
// byly chyby ve vykreslení nad daty, která už tehdy byla správná — kontrola
// polí je tedy nezachytí. Následující testy proto vykreslují komponentu a
// čtou text, který uvidí čtenář.
// ---------------------------------------------------------------------------

/** Vykreslí přehled města do statického HTML. */
async function vykresliPrehled(mesto) {
  const stats = await getCityStats(mesto);
  assert.ok(stats, `${mesto}: getCityStats nic nevrátil`);
  return {
    html: renderToStaticMarkup(
      React.createElement(CitySchoolsTable, { schools: stats.schools, rok: 2026 }),
    ),
    stats,
  };
}

/** HTML na čistý text, aby se dalo hledat ve větách přes značky. */
function text(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

test('vykreslení: nesplněné podmínky školy jsou v textu u „místa pro všechny“', async () => {
  const stats = await getCityStats('Pardubice');
  const nadPrahem = stats.schools.filter(r => {
    const prihlasky = r.prihlasky2026 ?? r.prihlasky2025;
    const c = r.nesplniliPodminky;
    return c && prihlasky && (c >= (r.prijatiZeSoutezicich ?? 0) || c >= 0.2 * prihlasky);
  });
  assert.ok(nadPrahem.length > 0, 'v Pardubicích není nabídka nad prahem podmínek');

  // Vykresluje se po jedné nabídce; hledání v celém městě by prošlo i tehdy,
  // kdyby věta u „místa pro všechny“ zmizela a zbyla jen u ostatních stupňů.
  for (const r of nadPrahem.slice(0, 5)) {
    const vykresleny = text(renderToStaticMarkup(
      React.createElement(CitySchoolsTable, { schools: [r], rok: 2026 }),
    ));
    assert.ok(
      vykresleny.includes('nedosáhlo požadavků školy'),
      `u „${r.obor}“ (${r.zarazeni}) chybí věta o nesplněných podmínkách, `
      + `přestože ${r.nesplniliPodminky} přihlášených jich nedosáhlo`,
    );
    assert.ok(
      vykresleny.includes(String(r.nesplniliPodminky)),
      `u „${r.obor}“ chybí počet ${r.nesplniliPodminky}`,
    );
  }

  // Nejméně jedna z nich musí být „místo pro všechny“ — to je jádro nálezu 2.
  const misto = nadPrahem.filter(r => r.zarazeni === 'kapacita_nerozhodovala');
  assert.ok(misto.length > 0, 'vzorek neobsahuje „místo pro všechny“ nad prahem podmínek');
});

test('vykreslení: předchozí ročník je v textu i u „místa pro všechny“', async () => {
  const stats = await getCityStats('Praha');
  const zmena = stats.schools.filter(r =>
    r.zarazeni === 'kapacita_nerozhodovala'
    && r.zarazeniPredchozi
    && r.zarazeniPredchozi !== 'kapacita_nerozhodovala');
  assert.ok(zmena.length > 0, 'v Praze není nabídka, která se posunula na „místo pro všechny“');

  // Vykreslí se **jen ta jedna nabídka**. Hledat text v celém městě nestačí:
  // „v roce 2025“ nese i 264 jiných pražských nabídek, takže by test prošel
  // i po vrácení předčasného returnu, který historii u této kategorie skryl.
  for (const r of zmena.slice(0, 5)) {
    const vykresleny = text(renderToStaticMarkup(
      React.createElement(CitySchoolsTable, { schools: [r], rok: 2026 }),
    ));
    assert.ok(
      vykresleny.includes(`v roce ${r.predchoziRok} ${ZARAZENI_POPISEK[r.zarazeniPredchozi]}`),
      `u „${r.obor}“ se nevykreslilo předchozí zařazení `
      + `(čekáno „v roce ${r.predchoziRok} ${ZARAZENI_POPISEK[r.zarazeniPredchozi]}“)`,
    );
  }
});

test('vykreslení: karta školy odkazuje na přehled školy', async () => {
  const { html, stats } = await vykresliPrehled('Pardubice');
  const podleSkoly = new Map();
  for (const r of stats.schools) {
    podleSkoly.set(r.redizo, [...(podleSkoly.get(r.redizo) ?? []), r]);
  }
  const viceNabidek = [...podleSkoly.entries()].filter(([, v]) => v.length > 1);
  assert.ok(viceNabidek.length > 0, 'v Pardubicích není škola s víc nabídkami');

  for (const [redizo, nabidky] of viceNabidek) {
    const odkazy = [...html.matchAll(new RegExp(`href="/skola/(${redizo}[^"]*)"`, 'g'))]
      .map(m => m[1]);
    assert.ok(odkazy.length > 0, `škola ${redizo} není v přehledu odkázaná`);
    assert.deepEqual(
      [...new Set(odkazy)], [nabidky[0].slugSkoly],
      `škola ${redizo} odkazuje jinam než na svůj přehled`,
    );
  }

  // Podstata nálezu 5: cíl odkazu nesmí záviset na tom, které nabídky jsou
  // zobrazené. Vykreslíme tutéž školu vždy jen s jednou z jejích nabídek a
  // adresa musí zůstat stejná.
  //
  // Kontrola „adresa neobsahuje název oboru“ se tu nedá použít: u AGYS —
  // Anglického gymnázia a SOŠ je slovo „gymnázium“ součástí názvu školy,
  // takže by hlásila planý poplach nad správnou adresou.
  for (const [redizo, nabidky] of viceNabidek) {
    const adresyPodleFiltru = new Set();
    for (const jedna of nabidky) {
      const castecne = renderToStaticMarkup(
        React.createElement(CitySchoolsTable, { schools: [jedna], rok: 2026 }),
      );
      const nalezene = [...castecne.matchAll(/href="\/skola\/([^"]+)"/g)].map(m => m[1]);
      assert.equal(
        nalezene.length, 1,
        `${redizo}: karta s jednou nabídkou má ${nalezene.length} odkazů na školu`,
      );
      adresyPodleFiltru.add(nalezene[0]);
    }
    assert.equal(
      adresyPodleFiltru.size, 1,
      `škola ${redizo} mění adresu podle zobrazené nabídky: ${[...adresyPodleFiltru].join(' | ')}`,
    );
  }
});

test('vykreslení: obor s doloženým výsledkem nenese „nevypsán“', async () => {
  const { html, stats } = await vykresliPrehled('Praha');
  const vykresleny = text(html);
  const doklad = stats.schools.filter(r => r.zarazeni !== null);
  assert.ok(doklad.length > 0, 'v Praze není nabídka se zařazením');
  // Počet hlášení „nevypsán“ nesmí přesáhnout počet nabídek, které v ročníku chybí.
  const hlaseni = (vykresleny.match(/nevypsán/g) ?? []).length;
  const chybejici = stats.schools.filter(r => r.chybiVRocniku).length;
  assert.ok(
    hlaseni <= chybejici,
    `„nevypsán“ se vykreslil ${hlaseni}×, ale v ročníku chybí jen ${chybejici} nabídek`,
  );
});

test('vykreslení: rozložení obtížnosti odpovídá datům', async () => {
  const { html, stats } = await vykresliPrehled('Pardubice');
  const vykresleny = text(html);
  const pocty = new Map();
  for (const r of stats.schools) {
    if (r.zarazeni) pocty.set(r.zarazeni, (pocty.get(r.zarazeni) ?? 0) + 1);
  }
  assert.ok(pocty.size > 1, 'v Pardubicích není víc stupňů obtížnosti');
  for (const [zarazeni, pocet] of pocty) {
    const popisek = ZARAZENI_POPISEK[zarazeni];
    assert.ok(
      new RegExp(`${popisek}[^0-9]*${pocet}\\b`).test(vykresleny),
      `u stupně „${popisek}“ chybí ve výpisu počet ${pocet}`,
    );
  }
  // Pojem se musí vysvětlit při prvním výskytu v bloku (slovník pojmů).
  assert.match(vykresleny, /soutěžících uchazečů/);
  assert.match(vykresleny, /kdo splnili požadavky školy/);
});
