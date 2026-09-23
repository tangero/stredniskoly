/**
 * Kontroly přehledu škol v kraji (docs/navrh-stranky-kraje-2027.md).
 *
 * Každý test hlídá jednu závadu staré stránky, která porušovala metodiku a žádná
 * z nich neshodila build ani typy: loňský ročník místo zobrazeného (D1), nuly místo
 * chybějících údajů (D2), nedoložená kategorie oboru, semafor a zakázaná slova.
 *
 * Spuštění: npx tsx --test tests/kraj-prehled.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getKrajPrehled } from '../src/lib/krajData.ts';
import { zobrazeneObdobi } from '../src/lib/stav-datovych-sad.ts';
import { RegionSchoolsTable } from '../src/components/RegionSchoolsTable.tsx';
import { krajNames } from '../src/lib/kraje.mjs';
import { zavadec } from './_zavadec.mjs';

const souhrny = JSON.parse(readFileSync(new URL('../public/souhrny_kolo1.json', import.meta.url), 'utf-8'));

async function vsechnyKraje() {
  const out = [];
  for (const kod of Object.keys(krajNames)) out.push({ kod, p: await getKrajPrehled(kod) });
  return out;
}

test('ročník přehledu je zobrazené období z registru, ne napevno', async () => {
  const rok = Number(await zobrazeneObdobi('cermat-vysledky'));
  const p = await getKrajPrehled('CZ010');
  assert.equal(p.rok, rok);
});

test('přehled nevynechá ani nezdvojí žádnou nabídku ze souhrnů kraje', async () => {
  const rok = String(await zobrazeneObdobi('cermat-vysledky'));
  for (const { kod, p } of await vsechnyKraje()) {
    const ocekavane = Object.entries(souhrny.nabidky).filter(([, n]) => n.kraj === kod && n.roky[rok]).map(([k]) => k).sort();
    const zobrazene = p.skoly.flatMap(s => s.nabidky.map(n => n.klic)).sort();
    assert.deepEqual(zobrazene, ocekavane, `kraj ${kod}`);
  }
});

test('jedna škola je jeden řádek', async () => {
  for (const { kod, p } of await vsechnyKraje()) {
    const redizo = p.skoly.map(s => s.redizo);
    assert.equal(new Set(redizo).size, redizo.length, `kraj ${kod}`);
  }
});

test('chybějící údaj není nula: žádná nabídka nemá kapacitu ani přihlášky na místo 0 jako náhradu', async () => {
  // Stará stránka dávala 57 pražským oborům novým v roce 2026 kapacitu 0 a „0,0× konkurence“ zeleně.
  const nabidky = (await vsechnyKraje()).flatMap(({ p }) => p.skoly.flatMap(s => s.nabidky));
  const nuly = nabidky.filter(n => n.kapacita === 0 || (n.prihlaskyNaMisto === 0 && (n.prihlasky ?? 0) > 0));
  assert.equal(nuly.length, 0, nuly.slice(0, 3).map(n => n.klic).join(', '));
});

test('nové nabídky jsou přiznané a nenesou předchozí ročník', async () => {
  const p = await getKrajPrehled('CZ010');
  const nove = p.skoly.flatMap(s => s.nabidky).filter(n => n.novaNabidka);
  assert.ok(nove.length > 0, 'v Praze jsou obory nové v zobrazeném ročníku');
  assert.ok(nove.every(n => n.zarazeniPredchozi === null && n.predchoziRok === null));
});

test('pořadí v kraji se počítá jen ve srovnatelné skupině s aspoň deseti nabídkami', async () => {
  for (const { p } of await vsechnyKraje()) {
    const podleSkupiny = new Map();
    for (const n of p.skoly.flatMap(s => s.nabidky)) {
      podleSkupiny.set(n.skupina, [...(podleSkupiny.get(n.skupina) ?? []), n]);
    }
    for (const [, nabidky] of podleSkupiny) {
      for (const n of nabidky) {
        if (n.poradiZajem) assert.ok(n.poradiZajem.poradi.z >= 10 && n.poradiZajem.poradi.z <= nabidky.length);
      }
    }
  }
});

function vykresli(p) {
  return renderToStaticMarkup(React.createElement(RegionSchoolsTable, { skoly: p.skoly, krajNazev: 'Hlavní město Praha', rok: p.rok, rokDruhehoKola: p.rokDruhehoKola }));
}

test('vykreslení: bez nedoložené kategorie, zakázaných slov a semaforu', async () => {
  const html = vykresli(await getKrajPrehled('CZ010'));
  for (const slovo of ['Vyvážená', 'Preferovaná', 'konkurence', 'Konkurence', 'Trend', 'trend', 'index poptávky', 'Hranice neověřena']) {
    assert.ok(!html.includes(slovo), `stránka nesmí obsahovat „${slovo}“`);
  }
  assert.ok(!/\b(bg|text)-(red|green)-\d{3}\b/.test(html), 'barvy semaforu nemají na přehledu co dělat');
});

test('vykreslení: odznaky obtížnosti a kohorty jsou na stránce', async () => {
  const html = vykresli(await getKrajPrehled('CZ010'));
  assert.ok(html.includes('velmi těžké'));
  assert.ok(html.includes('škola první volby'));
  assert.ok(html.includes('záložní volba'));
  assert.ok(html.includes('Neříká nic o kvalitě školy'));
});

test('vykreslení: bez zvoleného typu studia se pořadí v kraji nevypisuje', async () => {
  // Obory různých typů se neporovnávají (slovník ukazatelů, oddíl 4).
  const html = vykresli(await getKrajPrehled('CZ010'));
  assert.ok(!html.includes('v Praze podle zájmu'));
  assert.ok(!html.includes('v Praze podle výsledků přijatých'));
});

test('vykreslení: maturita je u škol, které ji mají', async () => {
  const p = await getKrajPrehled('CZ010');
  if (!p.rokMaturity) return;
  const html = vykresli(p);
  assert.ok(html.includes('udělalo'));
  assert.ok(html.includes('ČJ nad středem:'));
});

test('vykreslení: škola zabírá jeden řádek tabulky a nejvýš dva řádky textu v buňce', async () => {
  const p = await getKrajPrehled('CZ010');
  const html = vykresli(p);
  const radky = html.match(/<tr class="align-top/g) ?? [];
  assert.equal(radky.length, Math.min(50, p.skoly.length));
  // Každá buňka vypíše nejvýš dva řádky; u kohort se třetí stupeň připojí do druhého.
  const bunky = html.match(/<td class="px-3 py-2[^"]*">.*?<\/td>/g) ?? [];
  assert.ok(bunky.length >= radky.length * 5, 'kontrola musí buňky skutečně najít');
  for (const td of bunky) {
    const radkyTextu = (td.match(/<div/g) ?? []).length + (td.startsWith('<td class="px-3 py-2"><a') || /<span class="inline-block/.test(td) ? 1 : 0);
    assert.ok(radkyTextu <= 2, td.slice(0, 300));
  }
});

test('vykreslení: obory školy se v tabulce nevypisují, jen počet', async () => {
  const p = await getKrajPrehled('CZ010');
  const html = vykresli(p);
  const skola = p.skoly.find(s => s.nabidky.length >= 3);
  assert.ok(html.includes(`${skola.nabidky.length} obor`));
  assert.ok(!html.includes('přijato '), 'věty o podílu přijatých patří do detailu');
});

test('katalog bez zobrazeného ročníku vrátí null, ne „0 škol“', async () => {
  // Registr se přepne dřív, než vyjde katalog ročníku: chybějící data nejsou nula,
  // stránka má spadnout do notFound(), ne ukázat prázdný přehled.
  const p = await getKrajPrehled('CZ010', { katalog: async () => new Map() });
  assert.equal(p, null);
});

// ============================================================================
// Interaktivní vrstva: filtry, řazení, adresa a stránkování.
//
// Statický render efekty nespustí, takže se komponenta nabíjí přes sdílený
// zavaděč s podstrčeným Reactem (stav, efekty se závislostmi) a `window`
// (adresa, replaceState, popstate). Klikání hledá tlačítko ve stromu elementů
// a zavolá jeho onClick — obsluhy se do statického HTML nedostanou.
// ============================================================================

function sHooky({ search = '' }) {
  const stavy = [];
  let index = 0;
  const zavislosti = [];
  let efektIndex = 0;
  const cekajici = [];
  const uklidy = new Map();
  const posluchace = [];
  const adresy = [];
  const registr = (seznam) => ({
    addEventListener: (typ, fn) => seznam.push({ typ, fn }),
    removeEventListener: (typ, fn) => {
      const i = seznam.findIndex((p) => p.typ === typ && p.fn === fn);
      if (i > -1) seznam.splice(i, 1);
    },
  });
  const okno = {
    location: { pathname: '/regiony/hlavni-mesto-praha', search },
    ...registr(posluchace),
    history: {
      replaceState: (_s, _t, url) => {
        adresy.push(url);
        okno.location.search = url.includes('?') ? url.slice(url.indexOf('?')) : '';
      },
    },
  };
  const react = {
    ...React,
    useState: (pocatek) => {
      const i = index++;
      if (!(i in stavy)) stavy[i] = pocatek;
      return [stavy[i], (hodnota) => { stavy[i] = typeof hodnota === 'function' ? hodnota(stavy[i]) : hodnota; }];
    },
    useMemo: (vypocet) => vypocet(),
    useEffect: (fn, deps) => {
      const i = efektIndex++;
      const drive = zavislosti[i];
      const zmena = drive === undefined || !deps || drive === null
        || deps.length !== drive.length || deps.some((d, j) => !Object.is(d, drive[j]));
      if (zmena) cekajici.push({ i, fn, deps: deps ?? null });
    },
  };
  const Link = (props) => React.createElement('a', { href: props.href }, props.children);
  const { RegionSchoolsTable: Komponenta } = zavadec(react, { 'next/link': { __esModule: true, default: Link } }, { window: okno })('src/components/RegionSchoolsTable.tsx');
  const zacniRender = () => { index = 0; efektIndex = 0; cekajici.length = 0; };
  const render = (props) => {
    zacniRender();
    return renderToStaticMarkup(React.createElement(Komponenta, props));
  };
  const najdi = (prvek, test) => {
    if (!prvek || typeof prvek !== 'object') return null;
    if (Array.isArray(prvek)) { for (const p of prvek) { const n = najdi(p, test); if (n) return n; } return null; }
    if (prvek.props && test(prvek.props)) return prvek;
    return najdi(prvek.props?.children, test);
  };
  const klikni = (props, test, co) => {
    zacniRender();
    const strom = Komponenta(props);
    const tlacitko = najdi(strom, test);
    assert.ok(tlacitko, `${co} ve stromu není.`);
    tlacitko.props.onClick();
  };
  const spust = () => {
    for (const { i, fn, deps } of cekajici.splice(0)) {
      zavislosti[i] = deps;
      uklidy.get(i)?.();
      const uklid = fn();
      if (typeof uklid === 'function') uklidy.set(i, uklid);
      else uklidy.delete(i);
    }
  };
  const listener = (typ) => {
    const p = posluchace.filter((x) => x.typ === typ);
    assert.equal(p.length, 1, `Očekáván jeden posluchač ${typ}, je ${p.length}.`);
    return p[0].fn;
  };
  return { render, klikni, spust, listener, adresy, okno };
}

/** Syntetická nabídka a škola: jen to, co pravidlo potřebuje, zbytek neutrální. */
function nabidka(prepis) {
  return {
    klic: 'k', redizo: 'r', obor: 'Obor', zamereni: '', delka: 4, skupina: 'GY4_4',
    kapacita: null, prihlasky: null, prihlaskyNaMisto: null, zarazeni: null,
    zarazeniPredchozi: null, predchoziRok: null, soutezici: null, prijati: null,
    nesplniliPodminky: null, kohorta: null, novaNabidka: false, meloDruheKolo: false,
    poradiZajem: null, poradiVysledky: null,
    ...prepis,
  };
}

function skola(prepis) {
  return {
    redizo: 'r', nazev: 'Škola', obec: 'Obec', okres: '', ulice: '', zrizovatel: 'Praha',
    slug: 'skola', web: null, maturita: null, nabidky: [],
    ...prepis,
  };
}

const PROPS = (skoly) => ({ skoly, krajNazev: 'Hlavní město Praha', rok: 2026, rokDruhehoKola: null });
const radkyTabulky = (html) => (html.match(/<tr class="align-top/g) ?? []).length;

test('řazení podle počtu míst seřadí školy sestupně a zapíše se do adresy', () => {
  const skoly = [
    skola({ redizo: 'a', nazev: 'Alfa', nabidky: [nabidka({ klic: 'a', kapacita: 10 })] }),
    skola({ redizo: 'b', nazev: 'Beta', nabidky: [nabidka({ klic: 'b', kapacita: 30 })] }),
    skola({ redizo: 'c', nazev: 'Gama', nabidky: [nabidka({ klic: 'c', kapacita: 20 })] }),
  ];
  const h = sHooky({});
  const props = PROPS(skoly);
  h.render(props);
  h.spust();
  const pred = h.render(props);
  assert.ok(pred.indexOf('Alfa') < pred.indexOf('Beta'), 'výchozí řazení je podle názvu');
  h.klikni(props, (p) => p['data-razeni'] === 'mista', 'Řazení podle počtu míst');
  const po = h.render(props);
  assert.ok(po.indexOf('Beta') < po.indexOf('Gama') && po.indexOf('Gama') < po.indexOf('Alfa'), 'sestupně podle míst');
  assert.ok(h.adresy.at(-1).includes('razeni=mista'), 'výběr řazení se zapíše do adresy');
});

test('filtr typu studia ukáže jen svoji skupinu, odemkne pořadí a klik je přepnutý', () => {
  const poradi = (od, z) => ({ poradi: { od, do: od, z }, predchozi: null });
  const skoly = [
    skola({ redizo: 'a', nazev: 'Alfa', nabidky: [nabidka({ klic: 'a', skupina: 'GY4_4', poradiVysledky: poradi(2, 5) })] }),
    skola({ redizo: 'b', nazev: 'Beta', nabidky: [nabidka({ klic: 'b', skupina: 'GY8_8', poradiVysledky: poradi(1, 40) })] }),
  ];
  const h = sHooky({});
  const props = PROPS(skoly);
  h.render(props);
  h.spust();
  h.klikni(props, (p) => p['data-skupina'] === 'GY4_4', 'Čtyřleté gymnázium');
  let po = h.render(props);
  assert.ok(po.includes('Alfa') && !po.includes('Beta'), 'filtr ukáže jen vybraný typ studia');
  assert.ok(h.adresy.at(-1).includes('typ=GY4_4'), 'výběr typu se zapíše do adresy');
  assert.match(po, /aria-pressed="true"[^>]*data-skupina="GY4_4"|data-skupina="GY4_4"[^>]*aria-pressed="true"/);
  assert.ok(!po.includes('Pořadí v kraji podle'), 'bez řazení pořadí zůstane skryté');
  h.klikni(props, (p) => p['data-razeni'] === 'vysledky', 'Řazení pořadí podle výsledků');
  po = h.render(props);
  assert.ok(po.includes('Pořadí v kraji podle výsledků'), 'po výběru typu se pořadí v kraji ukáže');
  assert.ok(po.includes('2. z 5'), 'pořadí nabídky z vybrané skupiny');
  assert.ok(!po.includes('1. z 40'), 'pořadí jiné skupiny se nepropsalo');
});

test('pořadí v kraji z adresy bez zvoleného typu studia se zahodí', () => {
  const h = sHooky({ search: '?razeni=vysledky' });
  const props = PROPS([skola({ nabidky: [nabidka({ poradiVysledky: { poradi: { od: 1, do: 1, z: 10 }, predchozi: null } })] })]);
  h.render(props);
  h.spust();
  const po = h.render(props);
  assert.ok(!po.includes('Pořadí v kraji podle'), 'pořadí se bez skupiny nezobrazí');
  assert.match(po, /aria-pressed="false"[^>]*data-razeni="vysledky"|data-razeni="vysledky"[^>]*aria-pressed="false"/);
});

test('filtr zřizovatele nechá jen školy daného druhu a klik je přepnutý', () => {
  const skoly = [
    skola({ redizo: 'a', nazev: 'Alfa', zrizovatel: 'soukromá společnost', nabidky: [nabidka({ klic: 'a' })] }),
    skola({ redizo: 'b', nazev: 'Beta', zrizovatel: 'Praha', nabidky: [nabidka({ klic: 'b' })] }),
  ];
  const h = sHooky({});
  const props = PROPS(skoly);
  h.render(props);
  h.spust();
  h.klikni(props, (p) => p['data-zrizovatel'] === 'soukroma', 'Čip soukromá');
  const po = h.render(props);
  assert.ok(po.includes('Alfa') && !po.includes('Beta'));
  assert.match(po, /data-zrizovatel="soukroma"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-zrizovatel="soukroma"/);
});

test('stránkování přidá dávku a popstate ho zruší', async () => {
  const p = await getKrajPrehled('CZ010');
  assert.ok(p.skoly.length > 50, 'Praha má víc než 50 škol, jinak test nemá smysl.');
  const h = sHooky({});
  const props = PROPS(p.skoly);
  h.render(props);
  h.spust();
  assert.equal(radkyTabulky(h.render(props)), 50, 'první dávka je 50 řádků');
  h.klikni(props, (x) => Array.isArray(x.children) && x.children[0] === 'Zobrazit dalších ', 'Tlačítko Zobrazit dalších');
  const rozsireno = h.render(props);
  assert.equal(radkyTabulky(rozsireno), 100, 'další dávka přidá 50 řádků');
  h.listener('popstate')();
  assert.equal(radkyTabulky(h.render(props)), 50, 'popstate vrátí stránkování i filtr do stavu z adresy');
});
