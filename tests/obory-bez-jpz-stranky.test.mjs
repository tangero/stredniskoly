/**
 * Etapa 3a fáze 2 oborů bez jednotné zkoušky (issue #244): stránka učebního oboru a obory na stránce školy.
 *
 * Hlídá to, co by build ani typy neshodily: že se nezměnila žádná dnešní adresa oboru se zkouškou, že
 * sitemapa a aplikace skládají tytéž adresy, že obtížnost přijetí platí jen nad prahem a ne u C, E, J, P
 * a že na stránce učebního oboru není žádný údaj postavený na bodech.
 */
import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { text } from './_zavadec.mjs';
import { getProgramsByRedizo, getProgramyBezJpz, getSchoolOverview, getSchoolPageType, getSchoolsByRedizo, skolaMimoKatalog } from '../src/lib/data.ts';
import { obtiznostBezJpz, rokBezJpz, typBezJpz } from '../src/lib/obory-bez-jpz.ts';
import { getKrajPrehled } from '../src/lib/krajData.ts';
import { adresaPrehledu, adresyBezJpzMapa, adresySkolyMapa, obsazeneAdresy, zamereniBezKodu } from '../src/lib/adresa-oboru.mjs';
import { buildSitemapPaths } from '../scripts/generate-sitemap.mjs';
import { getProfilUcebnihoOboru } from '../src/lib/ucebni-obor-profil-data.ts';
import { ProfilUcebnihoOboru } from '../src/components/obor/ProfilUcebnihoOboru.tsx';
import { getProfilSkoly } from '../src/lib/skola-profil-data.ts';
import { ZARAZENI_POPISEK } from '../src/lib/obor-profil.ts';
import nextConfig from '../next.config.ts';
// Pod tsx přijde konfigurace jako jmenný prostor modulu, pod node --experimental-strip-types přímo.
const config = nextConfig.default ?? nextConfig;

const DATA = JSON.parse(fs.readFileSync('src/data/obory-bez-jpz-2026.json', 'utf8'));
const ANALYZA = JSON.parse(fs.readFileSync('public/school_analysis.json', 'utf8'));
const VE_KATALOGU = new Set(Object.keys(ANALYZA).map(k => k.split('_')[0]));
const SKOLY = [...new Set(DATA.nabidky.map(n => n.redizo))].filter(r => VE_KATALOGU.has(r)).sort();
const NOVE = [...new Set(DATA.nabidky.map(n => n.redizo))].filter(r => !VE_KATALOGU.has(r)).sort();

async function programySkoly(redizo) {
  const skola = (await getSchoolsByRedizo(redizo))[0];
  const jpz = await getProgramsByRedizo(redizo);
  return { skola, jpz, bez: await getProgramyBezJpz(redizo, skola.nazev, jpz) };
}

test('ročník nabídek bez JPZ je ten, který web zobrazuje', async () => {
  const registr = JSON.parse(fs.readFileSync('public/stav_datovych_sad.json', 'utf8'));
  assert.equal(String(await rokBezJpz()), registr.sady['cermat-prihlasky'].zobrazeno.obdobi);
});

test('nabídky bez JPZ škol na webu mají vlastní adresu a žádnou nepřebírají od oborů se zkouškou', async () => {
  let pocet = 0;
  for (const redizo of SKOLY) {
    const { skola, jpz, bez } = await programySkoly(redizo);
    const obsazene = obsazeneAdresy(redizo, skola.nazev, jpz);
    const adresy = bez.map(p => p.adresa);
    assert.equal(new Set(adresy).size, adresy.length, `${redizo}: dvě nabídky na téže adrese`);
    for (const a of adresy) assert.ok(!obsazene.has(a), `${redizo}: ${a} patří oboru se zkouškou`);
    pocet += bez.length;
  }
  assert.equal(pocet, DATA.nabidky.filter(n => VE_KATALOGU.has(n.redizo)).length);
});

test('adresy oborů se zkouškou vedou na tytéž nabídky jako dřív, adresy učebních oborů na učební obor', async () => {
  for (const redizo of SKOLY.filter((_, i) => i % 9 === 0)) {
    const { skola, jpz, bez } = await programySkoly(redizo);
    for (const [adresa, p] of adresySkolyMapa(redizo, skola.nazev, jpz)) {
      const t = await getSchoolPageType(adresa);
      assert.equal(t.program?.id, p.id, adresa);
      assert.equal(t.program?.bezJpz, undefined, adresa);
    }
    for (const p of bez) {
      const t = await getSchoolPageType(p.adresa);
      assert.equal(t.program?.id, p.id, p.adresa);
      assert.equal(t.presmerovatNa, undefined, p.adresa);
    }
  }
});

test('sitemapa nese přesně adresy učebních oborů, které aplikace rozpozná', async () => {
  const schools = JSON.parse(fs.readFileSync('public/schools_data.json', 'utf8'));
  const sBez = new Set(buildSitemapPaths(ANALYZA, schools, '2026', { schools: {} }, [2026], DATA));
  const bez = new Set(buildSitemapPaths(ANALYZA, schools, '2026', { schools: {} }, [2026]));
  const pridane = [...sBez].filter(x => !bez.has(x)).map(x => x.replace('/skola/', '')).sort();
  const aplikace = [];
  for (const redizo of SKOLY) aplikace.push(...(await programySkoly(redizo)).bez.map(p => p.adresa));
  // Nové školy (etapa 3b): přehled a stránky nabídek.
  for (const redizo of NOVE) {
    const skola = await skolaMimoKatalog(redizo);
    aplikace.push(adresaPrehledu(redizo, skola.nazev), ...(await getProgramyBezJpz(redizo, skola.nazev, [])).map(p => p.adresa));
  }
  assert.deepEqual(pridane, aplikace.sort());
  assert.ok([...bez].every(x => sBez.has(x)), 'sitemapa ztratila adresu');
  // Jiný ročník souboru se do sitemapy nedostane.
  assert.equal(buildSitemapPaths(ANALYZA, schools, '2026', { schools: {} }, [2026], { ...DATA, rok: 2025 }).length, bez.size);
});

test('obtížnost přijetí slovy jen nad prahem 10 soutěžících, i pro místo pro všechny, a nikdy u C, E, J a P', () => {
  const n = (kategorie, prijati, nepr_kapacita, zarazeni_obtiznosti) => ({ kategorie, prijati, nepr_kapacita, zarazeni_obtiznosti });
  assert.equal(obtiznostBezJpz(n('H', 9, 0, 'kapacita_nerozhodovala')), null);
  assert.equal(obtiznostBezJpz(n('H', 10, 0, 'kapacita_nerozhodovala')), 'kapacita_nerozhodovala');
  assert.equal(obtiznostBezJpz(n('H', 20, 30, 'tezke')), 'tezke');
  assert.equal(obtiznostBezJpz(n('M', 20, 30, 'tezke')), 'tezke');
  for (const k of ['C', 'E', 'J', 'P']) assert.equal(obtiznostBezJpz(n(k, 20, 30, 'tezke')), null, k);
  assert.equal(obtiznostBezJpz(n('H', null, 3, 'tezke')), null);
  // Rozdělení učebních oborů H, jak ho stránky ukážou (návrh, oddíl 3.6 a 10.1).
  const h = {};
  for (const x of DATA.nabidky.filter(x => x.kategorie === 'H')) { const z = obtiznostBezJpz(x); if (z) h[z] = (h[z] ?? 0) + 1; }
  assert.deepEqual(h, { kapacita_nerozhodovala: 574, vetsina_uspela: 302, stredne_tezke: 164, tezke: 78, velmi_tezke: 17 });
});

async function vykresli(predikat) {
  const n = DATA.nabidky.find(x => VE_KATALOGU.has(x.redizo) && predikat(x));
  const { skola, jpz, bez } = await programySkoly(n.redizo);
  const program = bez.find(p => p.id === n.id);
  const data = await getProfilUcebnihoOboru(program, [...jpz, ...bez]);
  // Veletrh ve městě je asynchronní komponenta serveru; statické vykreslení ji neumí, obec proto prázdná.
  return { n, html: text(renderToStaticMarkup(React.createElement(ProfilUcebnihoOboru, { data, adresa: skola.adresa, obec: '', skolaHref: '/skola/x' }))) };
}

const BODY = /\b(bod[ůy]?|percentil\w*|průměr\w* JPZ)\b/i;

test('stránka učebního oboru: pět otázek, zbylá místa jako první údaj, žádné body', async () => {
  const { n, html } = await vykresli(x => x.kategorie === 'H' && x.zbyla_mista >= 5 && x.kolo_2 !== null);
  for (const nadpis of ['Je tam místo', 'Stojí o obor někdo', 'Kam se hlásí ostatní', 'Co přijde potom', 'Jak se tam dostat']) assert.match(html, new RegExp(nadpis));
  assert.match(html, new RegExp(`Po 1\\. kole \\d{4} zbylo ${n.zbyla_mista} míst`));
  assert.match(html, /učební obor\s*, tedy obor s výučním listem/);
  assert.match(html, /výučním listem\s*, tedy dokladem o vyučení v oboru/);
  assert.doesNotMatch(html.replace('Body tu nejsou', ''), BODY);
});

test('stupeň vetsina_uspela se na stránce učebního oboru vykreslí souvislou větou', async () => {
  const { html } = await vykresli(x => x.kategorie === 'H' && obtiznostBezJpz(x) === 'vetsina_uspela');
  assert.match(html, /V 1\. kole \d{4} se dostala většina soutěžících uchazečů, ale ne všichni: z/);
  assert.doesNotMatch(html, /bylo se dostala/);
});

test('obor E ani konzervatoř nemají obtížnost přijetí; konzervatoř nemá otázku Co přijde potom', async () => {
  for (const [kat, extra] of [['E', /učební obor/], ['P', /talentovou zkouškou/]]) {
    // Konzervatoř je ve školách na webu jediná (ostatní přibudou s novými školami v etapě 3b), bez prahu.
    const { html } = await vykresli(x => x.kategorie === kat && (kat === 'P' || (x.prijati !== null && x.nepr_kapacita !== null && x.prijati + x.nepr_kapacita >= 10)));
    for (const popisek of Object.values(ZARAZENI_POPISEK)) assert.doesNotMatch(html, new RegExp(`bylo ${popisek} se sem dostat`), `${kat}: ${popisek}`);
    assert.doesNotMatch(html, /místo pro všechny, kdo splnili/);
    assert.match(html, extra);
    assert.doesNotMatch(html.replace('Body tu nejsou', ''), BODY, kat);
    if (kat === 'P') assert.doesNotMatch(html, /Co přijde potom/);
  }
});

test('stránka školy řadí učební obory s ostatními podle názvu a dává jim adresu', async () => {
  const redizo = '600014231';
  const { skola, jpz, bez } = await programySkoly(redizo);
  assert.ok(bez.length > 0);
  const profil = await getProfilSkoly(redizo, skola.nazev, jpz, new Set(jpz.map(p => p.id)), bez);
  const nazvy = profil.obory.map(o => o.nazev);
  assert.deepEqual(nazvy, [...nazvy].sort((a, b) => a.localeCompare(b, 'cs')));
  const ucebni = profil.obory.filter(o => o.bezJpz);
  assert.equal(ucebni.length, bez.length);
  assert.ok(ucebni.every(o => o.href.startsWith(`/skola/${redizo}-`) && o.cjPrijati === null && o.umisteniPrijatych === null));
  // Obory se zkouškou mají tytéž odkazy jako bez učebních oborů.
  const bezUcebnich = await getProfilSkoly(redizo, skola.nazev, jpz, new Set(jpz.map(p => p.id)));
  assert.deepEqual(profil.obory.filter(o => !o.bezJpz).map(o => o.href).sort(), bezUcebnich.obory.map(o => o.href).sort());
});

test('trasy, které čtou nabídky bez JPZ za běhu, mají soubor přibalený (jinak by se učební obory na Vercelu tiše přesměrovaly)', () => {
  for (const trasa of ['/skola/[slug]', '/api/skola/[slug]/json', '/api/skola/[slug]/md']) {
    assert.ok((config.outputFileTracingIncludes?.[trasa] ?? []).includes('./src/data/obory-bez-jpz-2026.json'), trasa);
  }
});

// ---------------------------------------------------------------------------
// Etapa 3b: školy jen s obory bez JPZ, které katalog nevede
// ---------------------------------------------------------------------------

test('všech 221 nových škol má přehled a stránky nabídek, které aplikace rozpozná', async () => {
  assert.equal(NOVE.length, 221);
  for (const redizo of NOVE) {
    const skola = await skolaMimoKatalog(redizo);
    assert.ok(skola?.nazev && skola.obec && skola.kraj_kod && skola.zrizovatel && skola.okres, redizo);
    const prehled = await getSchoolPageType(adresaPrehledu(redizo, skola.nazev));
    assert.equal(prehled.type, 'overview', redizo);
    assert.equal(prehled.presmerovatNa, undefined, redizo);
    assert.ok(await getSchoolOverview(redizo), redizo);
  }
  for (const redizo of NOVE.filter((_, i) => i % 7 === 0)) {
    const skola = await skolaMimoKatalog(redizo);
    for (const p of await getProgramyBezJpz(redizo, skola.nazev, [])) {
      const t = await getSchoolPageType(p.adresa);
      assert.equal(t.program?.id, p.id, p.adresa);
    }
  }
});

test('škola bez nabídky bez JPZ záznam mimo katalog nedostane; škola v katalogu se čte z katalogu', async () => {
  assert.equal(await skolaMimoKatalog('000000000'), null);
  // Škola, kterou katalog vede, má přehled ze školy katalogu, ne ze záznamu rejstříku.
  const t = await getSchoolPageType('600014231-stredni-skola-edvarda-benese-breclav-nabr-komenskeho');
  assert.equal(t.school?.id.endsWith('_'), false);
});

test('identita nových škol z rejstříku nenese osobní údaje', () => {
  const text = JSON.stringify(DATA.skoly).toLowerCase();
  for (const zakazano of ['reditel', 'ředitel', '@', 'email', 'datumnarozeni']) assert.ok(!text.includes(zakazano), zakazano);
});

test('kód oboru v zaměření se do názvu ani adresy nedostane', () => {
  assert.equal(zamereniBezKodu('82-44-M/01 Skladba'), 'Skladba');
  assert.equal(zamereniBezKodu('82-46-P/01, 82-46-M/01'), '');
  assert.equal(zamereniBezKodu('zahradník'), 'zahradník');
  assert.equal(zamereniBezKodu('hra na pozoun 82-44-M,P/01'), 'hra na pozoun');
  assert.equal(zamereniBezKodu('Housle (82-44-M/01)'), 'Housle');
  assert.equal(zamereniBezKodu('Odborné zaměření činohra (82-47-M/01)'), 'Odborné zaměření činohra');
  assert.equal(zamereniBezKodu('82-45-M/01, 82-45-P/01; Sólový zpěv – klasický'), 'Sólový zpěv – klasický');
  // Žádné zaměření bez JPZ po vyčištění kód oboru nenese.
  assert.ok(DATA.nabidky.every(n => !/\d{2}-\d{2}-[A-Z]/.test(zamereniBezKodu(n.zamereni))));
});

test('adresy učebních oborů ze 3a, které změnilo vynechání kódu oboru, se přesměrují na adresu téže nabídky', async () => {
  const zmenene = [];
  for (const redizo of SKOLY) {
    const { skola, jpz, bez } = await programySkoly(redizo);
    const vstup = DATA.nabidky.filter(n => n.redizo === redizo)
      .map(n => ({ id: n.id, obor: n.obor, zamereni: n.zamereni || undefined, delka_studia: n.delka ?? 0, nabidka: n }));
    const stare = adresyBezJpzMapa(redizo, skola.nazev, vstup, obsazeneAdresy(redizo, skola.nazev, jpz), true);
    const dnesni = new Map(bez.map(p => [p.id, p.adresa]));
    for (const [adresa, v] of stare) {
      if (dnesni.get(v.id) === adresa) continue;
      zmenene.push(adresa);
      const t = await getSchoolPageType(adresa);
      assert.equal(t.presmerovatNa, `/skola/${dnesni.get(v.id)}`, adresa);
    }
  }
  assert.equal(zmenene.length, 15);
  assert.deepEqual([...new Set(zmenene.map(a => a.split('-')[0]))].sort(), ['600016242', '600017133', '600170853', '610250574']);
});

test('stránka školy nese domovy mládeže a internáty z rejstříku', async () => {
  const redizo = '600014231';
  const { skola, jpz, bez } = await programySkoly(redizo);
  const profil = await getProfilSkoly(redizo, skola.nazev, jpz, new Set(jpz.map(p => p.id)), bez);
  assert.deepEqual(profil.domovy.map(d => d.druh), ['H22']);
});

// ---------------------------------------------------------------------------
// Etapa 3c-2: přehled kraje
// ---------------------------------------------------------------------------

test('kraj: všechny denní nabídky bez JPZ v kraji jsou v přehledu, bez kohorty a pořadí, i školy mimo katalog', async () => {
  const kraj = 'CZ064';
  const prehled = await getKrajPrehled(kraj);
  const nabidky = prehled.skoly.flatMap(s => s.nabidky);
  const bez = nabidky.filter(n => ['UCEBNI', 'UMELECKY', 'KONZ', 'PRAKT'].includes(n.skupina));
  const ocekavane = DATA.nabidky.filter(n => DATA.skoly[n.redizo]?.kraj_kod === kraj);
  assert.equal(bez.length, ocekavane.length);
  assert.ok(bez.every(n => n.kohorta === null && n.poradiZajem === null && n.poradiVysledky === null));
  for (const n of bez) {
    const b = ocekavane.find(x => x.id === n.klic);
    assert.equal(n.skupina, typBezJpz(b.kategorie));
    assert.equal(n.zarazeni, obtiznostBezJpz(b), n.klic);
  }
  // Nedenní nástavby do přehledu nepatří.
  assert.ok(!nabidky.some(n => DATA.nastavby.some(x => x.id === n.klic)));
  // Škola, kterou katalog nevede, má kartu s adresou přehledu.
  const nove = prehled.skoly.filter(s => !VE_KATALOGU.has(s.redizo));
  assert.ok(nove.length > 0);
  for (const s of nove) assert.equal(s.slug, adresaPrehledu(s.redizo, DATA.skoly[s.redizo].nazev));
});
