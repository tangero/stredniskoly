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
import { text } from './_zavadec.mjs';
import { renderToStaticMarkup } from 'react-dom/server';
import { getCityStats, MESTA } from '../src/lib/cityData.ts';
import { ZARAZENI_POPISEK } from '../src/lib/obor-profil.ts';
import { dalsiOboryVeMeste, nactiIndexRejstriku } from '../src/lib/kontext-prihlasek.ts';
import { getSchoolAnalysis, getProgramsByRedizo, getSchoolsData } from '../src/lib/data.ts';
import { zrizovatelPodleRedizo } from '../src/lib/simulator-filter.ts';
import { sestavKartySkol, sestavOkruhyMesta, nazevOkruhu, velikostMesta, castOkruhu } from '../src/lib/mesto-karty.ts';
import { castiObce } from '../src/lib/okruhy-podklad.ts';
import { getOkruheMesta, getOkruhOboru } from '../src/lib/okruhy-oboru.ts';
import { OkruhyMesta, OkruhOboruObsah } from '../src/components/mesto/OkruhyMesta.tsx';
import { smerOboru, SMERY_STUDIA } from '../src/lib/smery-studia.ts';
import { SkolyPodleSmeru } from '../src/components/mesto/SkolyPodleSmeru.tsx';

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

/** Karty škol města stejně jako na stránce (podklad z katalogu, school_analysis a rejstříku). */
async function kartyMesta(mesto) {
  const stats = await getCityStats(mesto);
  assert.ok(stats, `${mesto}: getCityStats nic nevrátil`);
  const klice = new Set(stats.schools.map(r => `${r.redizo}_${r.id.split('_')[1] ?? ''}`));
  const dalsi = await dalsiOboryVeMeste(mesto, klice);
  const kanonickeNazvy = new Map();
  for (const s of Object.values(await getSchoolAnalysis())) {
    const redizo = s.id.split('_')[0];
    if (!kanonickeNazvy.has(redizo)) kanonickeNazvy.set(redizo, s.nazev);
  }
  const nazvyKatalogu = new Map(stats.schools.map(r => [r.redizo, r.nazev_display]));
  const { identifikace } = await nactiIndexRejstriku();
  const zrizovatele = zrizovatelPodleRedizo(await getSchoolsData());
  const karty = sestavKartySkol(stats.schools, dalsi.obory, { nazvyKatalogu, kanonickeNazvy, adresySidel: identifikace, zrizovatele });
  return { stats, dalsi, karty };
}

function vykresli(karty, velikost = 'velke', rok = 2026) {
  return renderToStaticMarkup(React.createElement(SkolyPodleSmeru, { skoly: karty, rok, velikost, hlavicka: null }));
}

/** Klíče `REDIZO_KKOV`, které hlavní přehled města vede. */
async function klaceVPrehledu(mesto) {
  const stats = await getCityStats(mesto);
  assert.ok(stats, `${mesto}: getCityStats nic nevrátil`);
  return new Set(stats.schools.map(r => `${r.redizo}_${r.id.split('_')[1] ?? ''}`));
}

test('každý kód oboru v katalogu i v dalších oborech má směr studia', async () => {
  // Zbytková skupina „ostatní“ znamená, že mapa KKOV → směr zaostala za daty.
  for (const mesto of ['Praha', 'Brno', 'Ostrava', 'Pardubice']) {
    const { karty } = await kartyMesta(mesto);
    const bezSmeru = karty.flatMap(k => k.radky).filter(r => r.smer === 'ostatni').map(r => r.id);
    assert.deepEqual(bezSmeru, [], `${mesto}: obory bez směru studia`);
  }
  assert.equal(smerOboru('79-41-K/41'), 'gymnazia');
  assert.equal(smerOboru('79-41-K/81'), 'viceleta');
  assert.equal(smerOboru('79-41-K/61'), 'viceleta');
  assert.equal(smerOboru('78-42-M/01'), 'technika');
  assert.equal(smerOboru('78-42-M/04'), 'zdravotnictvi');
  assert.equal(smerOboru('78-42-M/06'), 'gymnazia');
  assert.equal(smerOboru('69-41-L/02'), 'zdravotnictvi');
  assert.equal(smerOboru('65-51-H/01'), 'sluzby');
  assert.equal(SMERY_STUDIA.at(-1).id, 'ostatni');
});

test('karty: každá nabídka i každý další obor je právě jednou, karta = jedno REDIZO', async () => {
  for (const mesto of ['Brno', 'Pardubice', 'Tišnov']) {
    const { stats, dalsi, karty } = await kartyMesta(mesto);
    const ids = karty.flatMap(k => k.radky.map(r => r.id));
    assert.equal(ids.length, new Set(stats.schools.map(r => r.id)).size + dalsi.obory.length, `${mesto}: počet řádků nesedí`);
    assert.equal(new Set(ids).size, ids.length, `${mesto}: některý obor je na kartách dvakrát`);
    assert.equal(new Set(karty.map(k => k.redizo)).size, karty.length, `${mesto}: dvě karty pro jednu školu`);
    // Žádná karta nenese holý zkrácený název z rejstříku.
    for (const k of karty) assert.notEqual(k.nazev, 'Gymnázium', `${mesto}: karta ${k.redizo} bez ulice`);
  }
});

test('karty: škola odkazuje na svůj přehled a obor na stránku oboru, která existuje', async () => {
  const { stats, karty } = await kartyMesta('Pardubice');
  const prehledy = new Map(stats.schools.map(r => [r.redizo, r.slugSkoly]));
  for (const k of karty) {
    if (prehledy.has(k.redizo)) assert.equal(k.href, `/skola/${prehledy.get(k.redizo)}`, `${k.redizo}: jiný přehled školy`);
  }
  const radky = karty.flatMap(k => k.radky.filter(r => r.druh === 'jpz'));
  const sOdkazem = radky.filter(r => r.href);
  assert.ok(sOdkazem.length >= radky.length * 0.9, `odkaz na obor má jen ${sOdkazem.length} z ${radky.length} nabídek`);
  // Adresu oboru skládá sdílený modul, takže vždy začíná REDIZO školy.
  for (const r of sOdkazem) assert.ok(r.href.startsWith(`/skola/${r.id.split('_')[0]}-`), `${r.id}: ${r.href}`);
  assert.equal(new Set(sOdkazem.map(r => r.href)).size, sOdkazem.length, 'dvě nabídky sdílejí stránku oboru');
});

test('vykreslení: obory bez jednotné zkoušky nenesou obtížnost přijetí', async () => {
  // Obor bez dat by se s odznakem tvářil jako snadný; tak se rozbil starý index u 386 oborů.
  const { karty } = await kartyMesta('Chomutov');
  const jenDalsi = karty
    .map(k => ({ ...k, radky: k.radky.filter(r => r.druh !== 'jpz') }))
    .filter(k => k.radky.length);
  assert.ok(jenDalsi.length > 0, 'v Chomutově nejsou další obory');
  const html = vykresli(jenDalsi);
  const odznaky = [...html.matchAll(/rounded-full[^"]*"[^>]*>([^<]+)</g)].map(m => m[1].trim());
  for (const popisek of Object.values(ZARAZENI_POPISEK)) {
    assert.ok(!odznaky.includes(popisek), `obor bez dat nese odznak „${popisek}“`);
  }
  assert.match(text(html), /bez jednotné zkoušky/);
});

test('vykreslení: každý obor je v textu, výchozí stav ukazuje všechny směry', async () => {
  const { karty } = await kartyMesta('Pardubice');
  const vykresleny = text(vykresli(karty, velikostMesta(karty.flatMap(k => k.radky).filter(r => r.druh === 'jpz').length)));
  for (const r of karty.flatMap(k => k.radky)) {
    assert.ok(vykresleny.includes(r.obor), `obor „${r.obor}“ se nevykreslil`);
  }
  assert.match(vykresleny, /Všechny směry/);
});

test('vykreslení: počty v čipech směrů a v nabídce obtížnosti odpovídají datům', async () => {
  const { karty } = await kartyMesta('Brno');
  const radky = karty.flatMap(k => k.radky);
  const vykresleny = text(vykresli(karty));
  for (const s of SMERY_STUDIA) {
    const pocet = radky.filter(r => r.smer === s.id).length;
    if (!pocet) continue;
    assert.ok(new RegExp(`${s.kratce}\\s*${pocet}\\b`).test(vykresleny), `čip „${s.kratce}“ nemá počet ${pocet}`);
  }
  for (const [z, popisek] of Object.entries(ZARAZENI_POPISEK)) {
    const pocet = radky.filter(r => r.zarazeni === z).length;
    assert.ok(vykresleny.includes(`${popisek} (${pocet})`), `nabídka obtížnosti „${popisek}“ nemá počet ${pocet}`);
  }
  // Pojem se vysvětlí při prvním výskytu v bloku (slovník pojmů).
  assert.match(vykresleny, /soutěžících uchazečů/);
  assert.match(vykresleny, /kdo splnili požadavky školy/);
});

test('vykreslení: malé město nemá čipy ani filtry, rok bez registru se nevypíše', async () => {
  const { karty } = await kartyMesta('Tišnov');
  const html = vykresli(karty, 'male', null);
  assert.doesNotMatch(html, /Všechny směry|Hledat školu|S výučním listem/);
  assert.doesNotMatch(text(html), /v 1\. kole \d{4}/);
});

test('vykreslení: obor s doloženým výsledkem nenese „nevypsán“', async () => {
  const { stats, karty } = await kartyMesta('Praha');
  const hlaseni = (text(vykresli(karty)).match(/nevypsán/g) ?? []).length;
  const chybejici = stats.schools.filter(r => r.chybiVRocniku).length;
  assert.ok(hlaseni <= chybejici, `„nevypsán“ ${hlaseni}×, v ročníku chybí jen ${chybejici} nabídek`);
});

test('vykreslení: podle obtížnosti se neřadí, karty jdou podle názvu školy', async () => {
  const { karty } = await kartyMesta('Brno');
  const nazvy = karty.map(k => k.nazev);
  assert.deepEqual(nazvy, [...nazvy].sort((a, b) => a.localeCompare(b, 'cs')));
});

// ---------------------------------------------------------------------------
// Další obory ve městě: podklad
// ---------------------------------------------------------------------------

test('další obory: dvě školy se stejným názvem zůstanou dvěma kartami', () => {
  // Zkrácený název z rejstříku je u řady škol jen „Gymnázium“; seskupení podle názvu je slilo.
  const o = (redizo, obor) => ({ klic: `${redizo}_65-51-H/01`, redizo, skola: 'Gymnázium', obor, duvod: 'bez_zkousky' });
  const karty = sestavKartySkol([], [o('1', 'Kuchař'), o('2', 'Číšník')], {
    nazvyKatalogu: new Map(), kanonickeNazvy: new Map(),
    adresySidel: { 1: { adresa: 'Křenová 304, 602 00 Brno' }, 2: { adresa: '17. listopadu 1126, 708 00 Ostrava' } },
  });
  assert.deepEqual(karty.map(k => k.nazev), ['Gymnázium, 17. listopadu', 'Gymnázium, Křenová']);
});

test('další obory: podklad je soupis oborů, ne výběr souběžných voleb', async () => {
  // Pole `mimo_prehled` vzniká jen z prvních šesti souběžných voleb s aspoň
  // deseti společnými uchazeči. Kdyby oddíl stál na něm, vynechal by 704 oborů,
  // které data doloženě nesou — například Hudbu a Zpěv na konzervatoři v Pardubicích.
  const { obory } = await dalsiOboryVeMeste('Pardubice', await klaceVPrehledu('Pardubice'));
  const konzervator = obory.filter(o => /onzervato/.test(o.skola)).map(o => o.obor);
  assert.ok(
    konzervator.includes('Hudba') && konzervator.includes('Zpěv'),
    `konzervatoř v Pardubicích chybí nebo nemá Hudbu a Zpěv: ${konzervator.join(', ') || 'nic'}`,
  );
  assert.ok(obory.length >= 20, `Pardubice mají jen ${obory.length} dalších oborů, čekáno aspoň 20`);
});

test('další obory: nezdvojují nabídku z hlavního přehledu', async () => {
  for (const mesto of ['Pardubice', 'Chomutov', 'Karlovy Vary']) {
    const vPrehledu = await klaceVPrehledu(mesto);
    const { obory } = await dalsiOboryVeMeste(mesto, vPrehledu);
    for (const o of obory) {
      assert.ok(
        !vPrehledu.has(o.klic),
        `${mesto}: obor ${o.klic} („${o.obor}“) je v hlavním přehledu i mezi dalšími`,
      );
    }
  }
});

test('další obory: zdroj nese práh, pod kterým obory v seznamu nejsou', async () => {
  // Zdroj vyřazuje obory s méně než `meze.min_uchazecu` uchazeči; stránka to říká ve vysvětlivce.
  // Doložený případ: Praktická škola jednoletá v Pardubicích (600024270_78-62-C/01) v seznamu není,
  // dvouletá se 13 uchazeči ano.
  const { obory, minUchazecu } = await dalsiOboryVeMeste('Pardubice', await klaceVPrehledu('Pardubice'));
  assert.equal(typeof minUchazecu, 'number', 'práh ze zdroje se nečte');
  const klice = new Set(obory.map(o => o.klic));
  assert.ok(!klice.has('600024270_78-62-C/01'), 'obor pod prahem je v seznamu — zdroj se změnil');
  assert.ok(klice.has('600024270_78-62-C/02'), 'dvouletá varianta nad prahem chybí');
});

test('pruh oborů školy: místa vypsané nabídky jsou z katalogu zobrazeného ročníku', async () => {
  // Pruh oborů bral u oborů bez zaměření místa ze school_analysis.json (starší ročník):
  // AKADEMIA Gy ukazovala u čtyřletého gymnázia 20 míst, stránka města a katalog 2026 10.
  const katalog = (await getSchoolsData())['2026'];
  const vKatalogu = new Map(katalog.map(z => [z.id, z]));
  const p = (await getProgramsByRedizo('600024938')).find(x => x.id === '600024938_79-41-K/41');
  assert.equal(p.kapacita, 10);
  assert.equal(p.rok, 2026);
  for (const redizo of ['600013596', '600013464', '600024938', '600171027']) {
    for (const x of await getProgramsByRedizo(redizo)) {
      const z = vKatalogu.get(x.id);
      if (!z || z.nevypsano_2026) continue;
      assert.equal(x.kapacita, z.kapacita, `${x.id}: pruh ${x.kapacita}, katalog ${z.kapacita}`);
    }
  }
});

test('vykreslení: soukromá a církevní škola nese větu o školném, veřejná ne', async () => {
  const { karty } = await kartyMesta('Brno');
  const akademia = karty.find(k => k.redizo === '600024938');
  assert.equal(akademia.zrizovatel, 'soukroma');
  const verejna = karty.find(k => k.zrizovatel === 'verejna');
  const cirkevni = karty.find(k => k.zrizovatel === 'cirkevni');
  assert.ok(verejna && cirkevni, 'v Brně chybí veřejná nebo církevní škola');
  assert.match(text(vykresli([akademia])), /soukromá škola · může vybírat školné/);
  assert.match(text(vykresli([cirkevni])), /církevní škola · může vybírat školné/);
  assert.doesNotMatch(text(vykresli([verejna])), /školné/);
  // Výběr zřizovatele počítá školy, ne obory.
  const html = text(vykresli(karty));
  const soukromych = karty.filter(k => k.zrizovatel === 'soukroma').length;
  assert.ok(html.includes(`soukromé (${soukromych})`), `výběr zřizovatele nemá počet ${soukromych}`);
});

// ---------------------------------------------------------------------------
// Okruhy oborů na stránce města
// ---------------------------------------------------------------------------

async function okruhyMesta(mesto) {
  const { stats } = await kartyMesta(mesto);
  const data = await getOkruheMesta(mesto);
  assert.ok(data, `${mesto}: okruhy nevycházejí`);
  const kanonickeNazvy = new Map();
  for (const s of Object.values(await getSchoolAnalysis())) {
    const redizo = s.id.split('_')[0];
    if (!kanonickeNazvy.has(redizo)) kanonickeNazvy.set(redizo, s.nazev);
  }
  const katalog = new Map();
  for (const z of (await getSchoolsData())['2026']) {
    const k = `${z.redizo}_${z.id.split('_')[1]}`;
    katalog.set(k, [...(katalog.get(k) ?? []), { nazevDisplay: z.nazev_display, obor: z.obor, zamereni: z.zamereni ?? '', delka: z.delka_studia ?? null }]);
  }
  const nazvyKatalogu = new Map((await getSchoolsData())['2026'].map(z => [z.redizo, z.nazev_display]));
  const rejstrik = await nactiIndexRejstriku();
  return { data, ...sestavOkruhyMesta(data.okruhy, mesto, stats.schools, { katalog, nazvyKatalogu, kanonickeNazvy, rejstrik, castiObce: await castiObce(mesto) }) };
}

test('jméno okruhu ze směrů studia, víceletá gymnázia podle délky, učební obory', () => {
  const o = (kkov, uchazecu) => ({ klic: `1_${kkov}`, uchazecu });
  assert.equal(nazevOkruhu([o('79-41-K/41', 300), o('78-42-M/05', 50)]), 'Gymnázia a všeobecná lycea');
  assert.equal(nazevOkruhu([o('79-41-K/81', 300), o('79-41-K/41', 20)]), 'Osmiletá gymnázia (z 5. třídy)');
  assert.equal(nazevOkruhu([o('79-41-K/61', 300)]), 'Šestiletá gymnázia (ze 7. třídy)');
  assert.equal(nazevOkruhu([o('23-51-H/01', 200), o('36-67-H/01', 100)]), 'Technika a IT · učební obory');
  assert.equal(nazevOkruhu([o('63-41-M/02', 200), o('79-41-K/41', 100)]), 'Ekonomika, obchod a správa · Gymnázia a všeobecná lycea');
});

test('okruhy Brna: jména se neopakují, řádky nesou školu s ulicí, pořadí podle uchazečů', async () => {
  const { data, okruhy, nastavby } = await okruhyMesta('Brno');
  const vse = [...okruhy, ...nastavby];
  assert.ok(vse.length >= 10, `Brno má jen ${vse.length} okruhů`);
  const jmena = vse.map(o => o.nazev);
  assert.equal(new Set(jmena).size, jmena.length, `opakuje se jméno: ${jmena.join(' | ')}`);
  for (const o of vse) {
    assert.ok(o.radky.length >= 3, `okruh ${o.id} má méně než 3 obory`);
    for (const r of o.radky) assert.notEqual(r.skola, 'Gymnázium', `okruh ${o.id}: holé „Gymnázium“`);
    const u = o.radky.map(r => r.uchazecu);
    assert.deepEqual(u, [...u].sort((a, b) => b - a), `okruh ${o.id} není seřazený podle uchazečů`);
  }
  const html = text(renderToStaticMarkup(React.createElement(OkruhyMesta, { okruhy, nastavby, rok: data.rok, rokObtiznosti: data.rok })));
  assert.match(html, /Které další obory v okolí uchazeči také volí/);
  // Pojem okruh se vysvětlí při prvním výskytu v bloku (slovník pojmů).
  assert.match(html, /měli je často zároveň na přihlášce/);
  assert.match(html, /Obory na okraji okruhu se mohou mezi ročníky přesunout do sousedního/);
  assert.doesNotMatch(html, /oblíben|žádan|pojistk|shluk/i);
});

test('okruhy: obor s jedinou nabídkou ve městě vede na stránku oboru', async () => {
  const { okruhy } = await okruhyMesta('Brno');
  const radky = okruhy.flatMap(o => o.radky).filter(r => r.href);
  assert.ok(radky.some(r => /-gymnazium-4lete$/.test(r.href)), 'žádný řádek nevede na stránku oboru');
  for (const r of radky) assert.ok(r.href.startsWith(`/skola/${r.klic.split('_')[0]}-`), `${r.klic}: ${r.href}`);
});

test('okruhy: rok uchazečů a rok obtížnosti se nesloučí, když se liší', async () => {
  // Sady cermat-uchazeci-kolo1 a cermat-vysledky se přepínají zvlášť (review PR #351, P2).
  const { okruhy, nastavby } = await okruhyMesta('Brno');
  const html = text(renderToStaticMarkup(React.createElement(OkruhyMesta, { okruhy, nastavby, rok: 2027, rokObtiznosti: 2026 })));
  assert.match(html, /Data o uchazečích 1\. kola 2027/);
  assert.match(html, /Obtížnost přijetí je z 1\. kola 2026/);
  assert.match(html, /Obtížnost přijetí 2026/);
  assert.doesNotMatch(html, /Obtížnost přijetí 2027/);
  const stejne = text(renderToStaticMarkup(React.createElement(OkruhyMesta, { okruhy, nastavby, rok: 2026, rokObtiznosti: 2026 })));
  assert.doesNotMatch(stejne, /Obtížnost přijetí je z 1\. kola/);
});

test('stránka oboru: obor najde svůj okruh, týž jako na stránce města', async () => {
  const nalez = await getOkruhOboru('600013464_79-41-K/41_všeobecné');
  assert.ok(nalez, 'Gymnázium Křenová nemá okruh');
  assert.equal(nalez.obec, 'Brno');
  const mesto = await getOkruheMesta('Brno');
  const stejny = mesto.okruhy.find(o => o.id === nalez.okruh.id);
  assert.ok(stejny, 'okruh oboru není mezi okruhy stránky města');
  assert.deepEqual(stejny.obory.map(o => o.klic), nalez.okruh.obory.map(o => o.klic));
  assert.equal(await getOkruhOboru('999999999_00-00-X/00'), null);
});

test('stránka oboru: okruh sdílený více městy se bere z města, kde obor leží (review PR #352, P2)', async () => {
  const nalez = await getOkruhOboru('600006751_79-41-K/41');
  assert.ok(nalez, 'gymnázium ve Vlašimi nemá okruh');
  assert.equal(nalez.obec, 'Vlašim');
  const mesto = await getOkruheMesta('Vlašim');
  const stejny = mesto.okruhy.find(o => o.id === nalez.okruh.id);
  assert.deepEqual(stejny.obory.map(o => o.klic), nalez.okruh.obory.map(o => o.klic));
});

test('stránka oboru: okruh zkrácený na deset oborů, tento obor vždy a zvýrazněný', async () => {
  const { okruhy } = await okruhyMesta('Brno');
  const velky = okruhy.find(o => o.radky.length > 12);
  assert.ok(velky, 'v Brně není okruh s víc než 12 obory');
  const posledni = velky.radky.at(-1);
  const html = renderToStaticMarkup(React.createElement(OkruhOboruObsah, {
    okruh: velky, klic: posledni.klic, rokObtiznosti: 2026, obec: 'Brno', hrefMesta: `/mesto/brno#okruh-${velky.id}`,
  }));
  assert.equal((html.match(/<tr/g) ?? []).length, 11, 'čekáno 10 největších a tento obor');
  assert.equal((html.match(/aria-current="true"/g) ?? []).length, 1);
  assert.match(text(html), new RegExp(`ještě ${velky.radky.length - 11} `));
  assert.match(html, new RegExp(`href="/mesto/brno#okruh-${velky.id}"`));
  assert.match(text(html), /měli je často zároveň na přihlášce/);
});

// ---------------------------------------------------------------------------
// Shodná jména okruhů (#364)
// ---------------------------------------------------------------------------

test('jména okruhů se neopakují v Praze, Ostravě ani Brně (okruhy i nástavby dohromady)', async () => {
  for (const mesto of ['Praha', 'Ostrava', 'Brno']) {
    const { okruhy, nastavby } = await okruhyMesta(mesto);
    const jmena = [...okruhy, ...nastavby].map(o => o.nazev);
    assert.equal(new Set(jmena).size, jmena.length, `${mesto}: ${jmena.filter((x, i) => jmena.indexOf(x) !== i).join(' | ')}`);
  }
});

test('část obce okruhu: převažující podle uchazečů místních oborů, druhá od čtvrtiny', () => {
  const casti = new Map([['1', 'Praha 4'], ['2', 'Praha 10'], ['3', 'Praha 6']]);
  const r = (red, uchazecu, obec = null) => ({ klic: `${red}_79-41-K/81`, uchazecu, obec });
  assert.equal(castOkruhu([r('1', 300), r('2', 150), r('3', 20)], casti), 'Praha 4, Praha 10');
  assert.equal(castOkruhu([r('1', 300), r('3', 50)], casti), 'Praha 4');
  // Obor z jiné obce se nepočítá.
  assert.equal(castOkruhu([r('2', 900, 'Beroun'), r('1', 10)], casti), 'Praha 4');
  assert.equal(castOkruhu([r('9', 100)], casti), null);
});

test('Ostrava: okruhy umění se liší převažujícím oborem, ekonomika skupinou oborů', async () => {
  const { okruhy, nastavby } = await okruhyMesta('Ostrava');
  const jmena = [...okruhy, ...nastavby].map(o => o.nazev);
  assert.ok(jmena.includes('Ekonomika, obchod a správa: právo a veřejná správa'), jmena.join(' | '));
  assert.ok(jmena.includes('Ekonomika, obchod a správa: podnikání'), jmena.join(' | '));
  assert.equal(jmena.filter(n => n.startsWith('Umění a design · Moravská Ostrava')).length, 2);
});
