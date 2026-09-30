import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { zavadec } from './_zavadec.mjs';

// Prototyp pásmového proužku (docs/navrh-pasmovy-prouzek-2027.md).
//
// Proužek a věta pod ním popisují totéž. Když se rozejdou, uchazeč čte dvě
// různá čísla o jedné věci — a právě to se v prvním sestavení stalo u oboru,
// kde mezi mezemi nikdo nebyl.

const ZAKLAD = {
  soutezicich: 94,
  prijatych: 29,
  neveslo_se: 60,
  prijato_na_vyssi_prioritu: 0,
  nesplnilo_podminky: 5,
  min_prijaty: 81,
  min_prijaty_percentil: 93.6,
  median_prijatych: 89,
  vice_zamereni: false,
  talentova_zkouska: false,
  pasma: [
    { od: 70, do: 80, prijato: 0, soutezilo: 16 },
    { od: 80, do: 90, prijato: 16, soutezilo: 35 },
    { od: 90, do: 100, prijato: 13, soutezilo: 15 },
  ],
};

/** Stav vstupů se podstrkuje přes useState; jinak se na výsledek nedá dostat. */
function vykresli(data, { cj = '', ma = '', test: druhTestuZadani = 'jiny', druh = '8', prevod = null, rok = 2026, kriteria = null, vstupOtevreny = true } = {}) {
  let poradi = 0;
  const react = {
    ...React,
    useState: (init) => {
      poradi += 1;
      // 1 = zadané testy, 2 = rozbalené zadání.
      // Test je „jiný“, tedy bez převodu: věty se tu ověřují na bodech tak, jak jsou.
      if (poradi === 1) return [[{ test: druhTestuZadani, cj, ma }], () => {}];
      return [typeof init === 'function' ? init() : init, () => {}];
    },
  };
  const { KdeStojim } = zavadec(react)('src/components/obor/KdeStojim.tsx');
  const terminy = prevod?.druhy[druh];
  return renderToStaticMarkup(
    React.createElement(KdeStojim, {
      data,
      rok,
      druh,
      prevod: prevod && terminy ? { rok_testu: prevod.rok_testu, rok_cile: prevod.rok_cile, terminy } : null,
      kriteria,
      vstupOtevreny,
    }),
  );
}

test('bez zadaných bodů proužek nevyhodnocuje, jen vyzve', () => {
  const html = vykresli({ ...ZAKLAD, pasmo_nejistoty: [81, 93] });
  assert.match(html, /Zadej výsledek testu/);
  assert.doesNotMatch(html, /Chybí ti/);
});

test('v pásmu nejistoty se uvádějí počty, ne procenta', () => {
  // Přirozené četnosti se chápou spolehlivěji a nepředstírají přesnost,
  // kterou data nemají. Počty musí pocházet z přesných polí, ne ze součtu pásem.
  const html = vykresli(
    { ...ZAKLAD, pasmo_nejistoty: [81, 93], pasmo_nejistoty_soutezilo: 41, pasmo_nejistoty_prijato: 24 },
    { cj: '42', ma: '42' },
  );
  assert.match(html, /ze 41 uchazečů dostalo 24/);
  // Procenta hledáme v textu, ne v `style="left: 84%"`.
  const text = html.replace(/ style="[^"]*"/g, '').replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(text, /\d+\s*%/, 'procenta předstírají přesnost, kterou data nemají');
});

test('pod pásmem se říká, kolik bodů chybí', () => {
  // Konkrétní cíl místo verdiktu: „chybí ti 13 bodů“ unese čtrnáctiletý líp
  // než „nemáš na to“.
  const html = vykresli({ ...ZAKLAD, pasmo_nejistoty: [81, 93] }, { cj: '38', ma: '30' });
  assert.match(html, /Pod 81 body z přijímaček se v roce 2026 nedostal nikdo/);
  assert.match(html, /Chybí ti 13 bodů z jednotné přijímací zkoušky/);
  // Doppler: jeden bod, jednotné číslo.
  assert.match(vykresli({ ...ZAKLAD, pasmo_nejistoty: [81, 93] }, { cj: '40', ma: '40' }), /Chybí ti 1 bod z jednotné/);
});

test('nad pásmem se neslibuje víc, než data nesou', () => {
  const html = vykresli({ ...ZAKLAD, pasmo_nejistoty: [81, 93] }, { cj: '48', ma: '48' });
  assert.match(html, /Nad 93 bodů se v roce 2026 dostali všichni/);
});

test('když mezi mezemi nikdo nebyl, věta sedí s proužkem', () => {
  // Původní sestavení tvrdilo „nad 44 se dostali všichni“, zatímco proužek
  // kreslil zelenou až od 51. Dvě různá čísla o jedné věci.
  const data = { ...ZAKLAD, min_prijaty: 51, pasmo_nejistoty: [51, 44] };
  const html = vykresli(data, { cj: '42', ma: '42' });
  assert.match(html, /Nad 51 bodů se v roce 2026 dostali všichni/);
  assert.match(html, /mezi 44 a 51 body nebyl nikdo/);
  assert.doesNotMatch(html, /Nad 44 bodů se v roce 2026 dostali všichni/, 'věta odporuje proužku');
});

test('výhrady jsou na obrazovce, ne jen v dokumentaci', () => {
  const html = vykresli({ ...ZAKLAD, pasmo_nejistoty: [81, 93] }, { cj: '42', ma: '42' });
  assert.match(html, /Není to hranice ani předpověď/);
  assert.match(html, /mění obtížnost samotné zkoušky/);
});

test('u oboru, kde o pořadí nerozhodl test, se to přizná', () => {
  const html = vykresli(
    { ...ZAKLAD, pasmo_nejistoty: [10, 90], rozhodl_test: 0.62 },
    { cj: '25', ma: '25' },
  );
  assert.match(html, /proužek je jen orientační/);
});

test('nesmyslné body se neberou jako výsledek', () => {
  // Bez kontroly by 80 v češtině (maximum je 50) posunulo špendlík mimo osu.
  const html = vykresli({ ...ZAKLAD, pasmo_nejistoty: [81, 93] }, { cj: '80', ma: '80' });
  assert.match(html, /Zadej výsledek testu/);
});

// ---------------------------------------------------------------------------
// Stránka prototypu. Je nezalistovaná, ne chráněná — a tenhle rozdíl se dá
// snadno rozbít jedním nepozorným commitem.
// ---------------------------------------------------------------------------

test('stránka prototypu se neindexuje', async () => {
  const { readFile } = await import('node:fs/promises');
  const zdroj = await readFile('src/app/prototyp/pasma/page.tsx', 'utf8');
  assert.match(zdroj, /robots:\s*\{\s*index:\s*false/, 'chybí noindex');
});

test('prototyp není v sitemapě', async () => {
  const { readFile } = await import('node:fs/promises');
  const generator = await readFile('scripts/generate-sitemap.mjs', 'utf8');
  assert.doesNotMatch(generator, /prototyp/, 'prototyp by se dostal do sitemapy');
});

test('prototyp není zakázaný v robots.txt', async () => {
  // Zní to obráceně: zakázané procházení by vyhledávači zabránilo `noindex`
  // přečíst, takže adresa by se mohla objevit v indexu bez obsahu.
  const { readFile } = await import('node:fs/promises');
  const robots = await readFile('src/app/robots.ts', 'utf8');
  assert.doesNotMatch(robots, /prototyp/, 'disallow by znemožnil přečíst noindex');
});

test('na prototyp nikde nevede odkaz', async () => {
  const { readFile, readdir } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const najdi = async (dir) => {
    const polozky = await readdir(dir, { withFileTypes: true });
    const soubory = [];
    for (const p of polozky) {
      const cesta = join(dir, p.name);
      if (p.isDirectory()) soubory.push(...(await najdi(cesta)));
      else if (/\.tsx?$/.test(p.name)) soubory.push(cesta);
    }
    return soubory;
  };
  const odkazujici = [];
  for (const f of await najdi('src')) {
    if (f.includes('prototyp')) continue; // sama stránka a komponenta
    const obsah = await readFile(f, 'utf8');
    if (/href=["'`]\/prototyp/.test(obsah)) odkazujici.push(f);
  }
  assert.deepEqual(odkazujici, [], 'prototyp má být dostupný jen přímou adresou');
});

// Převod: tabulka posouvá každý výsledek o +2 body, jen pro test osmiletých (druh 8).
const PREVOD = {
  rok_testu: 2024,
  rok_cile: 2026,
  druhy: { 8: [{ klic: '1-radny', nazev: '1. řádný termín', radny: true, resitelu: 1, spolehlive: true,
    body_cil: Array.from({ length: 101 }, (_, i) => Math.min(100, i + 2)) }] },
};

test('test TAU se převede podle tabulky druhu testu oboru', () => {
  const html = vykresli({ ...ZAKLAD, pasmo_nejistoty: [81, 93] },
    { cj: '40', ma: '40', test: '1-radny', druh: '8', prevod: PREVOD });
  assert.match(html, /80 bodů → <b>82<\/b> bodů roku 2026/);
});

test('obor jiného druhu nedostane tabulku cizího testu', () => {
  // Stránka posílá jen tabulku druhu testu oboru; pro čtyřletý obor tu není.
  const html = vykresli({ ...ZAKLAD, pasmo_nejistoty: [81, 93] },
    { cj: '40', ma: '40', test: '1-radny', druh: '4', prevod: PREVOD });
  assert.match(html, /80 bodů \(bez převodu\)/);
});

test('proužek je vidět i bez zadání, zadání se rozbalí tlačítkem', () => {
  const html = vykresli({ ...ZAKLAD, pasmo_nejistoty: [81, 93] }, { vstupOtevreny: false });
  assert.match(html, /nedostal se nikdo/);
  assert.match(html, /Zadej výsledek testu a uvidíš, kde bys stál/);
  assert.doesNotMatch(html, /Čeština/);
});

const PREPIS = { source_id: 's', zamereni: '', prepis: 'strojovy', rezim: 'pouze_jpz', podil_jpz_pct: 100,
  slozky: [], jpz_navic: [], minima: [], nalezy: [], chybi_slozky: false };

test('kde rozhodovala jen JPZ, stačí věta místo bloku kritérií', () => {
  const kriteria = { rok: 2026, pdf: true, prepisy: [PREPIS], noveKriteria: '31. 1. 2027' };
  const html = vykresli({ ...ZAKLAD, pasmo_nejistoty: [81, 93] }, { kriteria });
  assert.match(html, /škola přijímala\s+podle jednotné přijímací zkoušky/);
  assert.match(html, /teprve vyhlásí; školy je zveřejní 31. 1. 2027/);
  assert.doesNotMatch(html, /Co kromě přijímaček rozhodovalo/);
});

test('kde rozhodovalo i něco jiného, blok kritérií s výhradou', () => {
  const kriteria = { rok: 2026, pdf: true, noveKriteria: null, prepisy: [{ ...PREPIS, rezim: 'jine', podil_jpz_pct: 60,
    slozky: [{ nazev: 'Prospěch', max: 40 }] }] };
  const html = vykresli({ ...ZAKLAD, pasmo_nejistoty: [81, 93] }, { kriteria });
  assert.match(html, /Co kromě přijímaček rozhodovalo v roce 2026/);
  assert.match(html, /každý desátý přepis/);
});

test('bez přepisu kritérií se nic neukazuje', () => {
  const html = vykresli({ ...ZAKLAD, pasmo_nejistoty: [81, 93] }, { kriteria: { rok: 2026, pdf: true, prepisy: [], noveKriteria: null } });
  assert.doesNotMatch(html, /kritéri/i);
});

test('tabulky pro jiný cílový rok než pásma se nepoužijí', () => {
  const html = vykresli({ ...ZAKLAD, pasmo_nejistoty: [81, 93] },
    { cj: '40', ma: '40', test: '1-radny', druh: '8', prevod: PREVOD, rok: 2027 });
  assert.match(html, /Převodní tabulky jsou spočítané pro rok 2026, pásma jsou z roku 2027/);
  assert.doesNotMatch(html, /bodů roku 2027/);
});

test('extra body: odečet za průměr ano, samotná sankce za chování ne', () => {
  const { extraBody } = zavadec()('src/components/obor/KdeStojim.tsx');
  const prepis = (slozky) => ({ rezim: 'jine', chybi_slozky: false, jpz_navic: [], slozky: slozky.map(nazev => ({ nazev, max: null })) });
  // 600170900_39-41-L/01: prospěch hodnocený odečtem
  assert.equal(extraBody(prepis(['odečet za průměr 2. pololetí 8. třídy', 'odečet za známku chvalitebné z chování'])), true);
  // 600012514_65-42-M/01: jediná složka je sankce za chování
  assert.equal(extraBody(prepis(['snížený stupeň z chování'])), false);
  assert.equal(extraBody(prepis(['studijní průměr'])), true);
  // 600020665_53-43-M/01: prospěch „bez známky z chování“ není sankce
  assert.equal(extraBody(prepis(['průměrný prospěch (bez známky chování) 1. pololetí 9. ročníku'])), true);
  assert.equal(extraBody(prepis(['odečet za chování uspokojivé', 'penalizace za sníženou známku z chování'])), false);
});

test('kritéria od školy: bez výhrady o přepisu, s původem „podle údajů školy“', () => {
  const prepis = {
    source_id: '', zamereni: '', rezim: 'jine', podil_jpz_pct: 80, slozky: [{ nazev: 'Prospěch ze ZŠ', max: 25 }],
    jpz_navic: [], minima: [], nejasnosti: [], prepis: 'skola', nalezy: [], chybi_slozky: false, odkaz: 'https://skola.cz/k',
  };
  const html = vykresli({ ...ZAKLAD, pasmo_nejistoty: [81, 93] }, { kriteria: { rok: 2026, pdf: true, prepisy: [prepis], noveKriteria: '2027-01-31' } });
  assert.match(html, /Podle údajů školy/);
  assert.doesNotMatch(html, /Přepsal to z PDF počítač/);
  assert.match(html, /O přijetí rozhodují i extra body/);
  assert.match(html, /Kritéria pro nové přijímací řízení se teprve vyhlásí/);
  const nove = vykresli({ ...ZAKLAD, pasmo_nejistoty: [81, 93] }, { kriteria: { rok: 2027, pdf: true, prepisy: [prepis], noveKriteria: '2027-01-31', noveRizeni: true } });
  assert.match(nove, /Co kromě přijímaček rozhoduje v roce 2027/);
  assert.doesNotMatch(nove, /teprve vyhlásí/);
});

test('smíšený původ: jedno zaměření od školy nezakryje výhradu přepisu ostatních', () => {
  const zaklad = { source_id: '', rezim: 'pouze_jpz', podil_jpz_pct: 100, slozky: [], jpz_navic: [], minima: [], nejasnosti: [], nalezy: [], chybi_slozky: false };
  const html = vykresli({ ...ZAKLAD, pasmo_nejistoty: [81, 93] }, { kriteria: { rok: 2026, pdf: true, noveKriteria: null, prepisy: [
    { ...zaklad, zamereni: 'Jazyky', prepis: 'skola' }, { ...zaklad, zamereni: 'Vědy', prepis: 'strojovy' },
  ] } });
  assert.match(html, /Podle údajů školy je zaměření Jazyky; ostatní zaměření jsou z přepisu PDF/);
  assert.match(html, /Přepsal to z PDF počítač/);
});
