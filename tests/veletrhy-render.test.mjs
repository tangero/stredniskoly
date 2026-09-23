// ============================================================================
// Vykreslení seznamu veletrhů.
//
// Oponentura našla, že poznámka u plzeňské akce (všední dny jen pro školní
// výpravy s registrací) se nevykreslila: podmínka ji vázala na příznaky
// nejistoty, které Plzeň nemá. Data byla správně, render mlčel — proto
// testy nad daty nestačí a je potřeba sáhnout na výstup.
//
// Od 23. 9. 2026 je osou stránky kraj: čipy s počty nahoře, oddíl na kraj,
// uvnitř karty podle data s městem jako první řádkou. Filtr měst zmizel —
// 39 ze 40 měst mělo jedinou akci, rozbalovací seznam se 40 položkami
// vedl vždycky na jednu kartu.
//
// Pravidla vykreslení se testují nad syntetickými kartami, kde to jde;
// skutečná data slouží tam, kde jde o shodu s nimi (počty, města).
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VeletrhySeznam } from '../src/app/veletrhy/VeletrhySeznam.tsx';
import { zobrazitelneAkce } from '../src/lib/veletrhy.ts';
import { akci, cesskyDen } from '../src/lib/veletrhy-pocty.ts';
import { cipKraje, nadpisKraje, vsechnyKraje } from '../src/lib/kraje.mjs';
import { createKrajSlug } from '../src/lib/utils.ts';
import { zavadec, text } from './_zavadec.mjs';

const KE_DNI = new Date('2026-09-22');
const DEN = cesskyDen(KE_DNI);
const slugKraje = (kod) => createKrajSlug(kod, vsechnyKraje().find((k) => k.kod === kod).nazev);

function karty(akce) {
  return akce.map((a) => ({
    id: a.id, nazev: a.nazev, poradatel: a.poradatel, mesto: a.mesto, online: a.online,
    krajKod: a.krajKod, misto: a.misto,
    start: a.start, end: a.end ?? a.start, datum: a.datum, cas: a.cas, url: a.url,
    terminPribligny: a.terminPribligny, zdrojJenAgregator: a.zdrojJenAgregator,
    poznamkaTerminu: a.poznamkaTerminu,
  }));
}

/** Syntetická karta: jen to, co pravidlo potřebuje, zbytek neutrální. */
function karta(prepis) {
  return {
    id: 'x', nazev: 'Akce', poradatel: 'Pořadatel', mesto: 'Město', krajKod: 'CZ020',
    misto: 'Sál', start: '2026-10-05', end: '2026-10-05', datum: '5. října 2026', url: 'https://example.cz/',
    ...prepis,
  };
}

function vykresliKarty(karty) {
  return renderToStaticMarkup(React.createElement(VeletrhySeznam, { akce: karty, den: DEN }));
}

function vykresli(akce) {
  return vykresliKarty(karty(akce));
}

/** Počty po krajích spočítané ručně z dat — nezávislý etalon, ne funkce z lib. */
function pocty(akce) {
  const p = new Map();
  for (const a of akce) p.set(a.krajKod, (p.get(a.krajKod) ?? 0) + 1);
  return p;
}

test('poznámka k termínu se zobrazí i bez příznaku nejistoty', () => {
  const plzen = zobrazitelneAkce(KE_DNI).find((a) => a.id === 'posvit-si-na-budoucnost-plzen-2026');
  assert.ok(plzen, 'Plzeňská akce musí být mezi zobrazitelnými.');
  assert.ok(plzen.poznamkaTerminu, 'Plzeňská akce má nést poznámku o podmínkách vstupu.');
  assert.ok(!plzen.zdrojJenAgregator && !plzen.terminPribligny, 'Plzeň nemá příznak nejistoty — o to tu jde.');

  const html = vykresli([plzen]);
  assert.ok(
    html.includes('registrac'),
    'Poznámka o registraci školních výprav se nevykreslila; čtenář by přijel ve všední den zbytečně.',
  );
});

test('akce z agregátoru nese ve výstupu výstrahu, přibližný termín slovo', () => {
  assert.ok(vykresliKarty([karta({ zdrojJenAgregator: true, poznamkaTerminu: 'Termín z kalendáře kraje.' })]).includes('neověřený u pořadatele'));
  assert.ok(vykresliKarty([karta({ terminPribligny: true, poznamkaTerminu: 'Pořadatel uvádí jen měsíc.' })]).includes('přibližně'));
});

test('každá vykreslená akce vede na stránku pořadatele a říká, kdo pořádá', () => {
  const prvnich = zobrazitelneAkce(KE_DNI).slice(0, 5);
  const html = vykresli(prvnich);
  for (const a of prvnich) {
    assert.ok(html.includes(`Pořádá ${a.poradatel}`), `Karta ${a.id} musí říct, kdo za akci ručí.`);
  }
  assert.ok(html.includes('Stránka akce'), 'Karta musí vést na stránku akce.');
  // Rozhodnutí zadavatele 23. 9. 2026: jméno pořadatele stačí, dovětek
  // „ne tento web“ na každé kartě byl šum.
  assert.ok(!html.includes('ne tento web'), 'Dovětek o tom, kdo akci nepořádá, na kartu nepatří.');
});

test('kraje jsou oddíly s nadpisem, počtem, kotvou a odkazem pojmenovaným krajem, ve stejném pořadí jako čipy', () => {
  const vse = zobrazitelneAkce(KE_DNI);
  const html = vykresli(vse);
  const etalon = pocty(vse);

  const poradiCipu = [];
  const poradiOddilu = [];
  for (const k of vsechnyKraje()) {
    const pocet = etalon.get(k.kod) ?? 0;
    const kotva = `id="${slugKraje(k.kod)}"`;
    if (pocet === 0) {
      assert.ok(!html.includes(kotva), `Kraj ${k.nazev} bez akcí nemá mít oddíl.`);
      continue;
    }
    assert.ok(html.includes(kotva), `Kraj ${k.nazev} musí mít oddíl s kotvou, aby na něj šlo odkázat ze stránky kraje.`);
    assert.ok(text(html).includes(`${nadpisKraje(k.kod)} ${akci(pocet)}`), `Nadpis oddílu ${k.nazev} musí nést počet akcí.`);
    // Čtrnáct odkazů se stejným textem: čtečka potřebuje v názvu odkazu kraj.
    assert.ok(html.includes(`aria-label="Střední školy: ${nadpisKraje(k.kod)}"`), `Odkaz na stránku kraje ${k.nazev} bez přístupného názvu.`);
    poradiCipu.push(html.indexOf(`data-kraj="${k.kod}"`));
    poradiOddilu.push(html.indexOf(kotva));
  }
  // Čipy nesou krátký název, oddíly plný; pořadí obou je totéž (abecedně
  // podle krátkého názvu), aby se čtenář neztratil mezi „Vysočina“ v čipech
  // a „Kraj Vysočina“ v nadpisech.
  const serazene = (p) => p.every((x, i) => i === 0 || x > p[i - 1]);
  assert.ok(serazene(poradiCipu) && serazene(poradiOddilu), 'Čipy i oddíly jdou v pořadí vsechnyKraje().');
  const nazvy = vsechnyKraje().map((k) => k.nazev);
  assert.deepEqual(nazvy, [...nazvy].sort((a, b) => a.localeCompare(b, 'cs')), 'Kraje jdou abecedně podle krátkého názvu.');
  assert.ok(!text(html).includes('Vysočina kraj'));
  assert.ok(!text(html).includes('Praha kraj'));
  // Čip Prahy je krátký jako ostatní; plný název má až nadpis oddílu.
  assert.ok(html.includes('data-pocet="1">Praha<span'), 'Čip Prahy má nést „Praha“, ne „Hlavní město Praha“.');
  assert.equal(cipKraje('CZ010'), 'Praha');
  assert.equal(cipKraje('CZ063'), 'Vysočina');
});

test('řádek měst jen u více akcí, v pořadí konání; místo na kartě i v řádku z jedné definice', () => {
  const vse = zobrazitelneAkce(KE_DNI);
  const html = vykresli(vse);
  const jihocesky = vse.filter((a) => a.krajKod === 'CZ031');
  assert.ok(jihocesky.length > 1, 'Test počítá s krajem s více akcemi.');
  const mesta = [...new Set(jihocesky.map((a) => a.mesto))];
  // Řádek měst je šedý odstavec pod nadpisem; město na kartě je jiný prvek
  // (verzálky), proto se hledá i s koncem atributu class.
  assert.ok(html.includes(`text-gray-600">${mesta.join(' · ')}</p>`), 'Města v kraji mají stát v řádku pod nadpisem, v pořadí konání.');

  // U jediné akce by řádek měst jen opakoval kartu.
  assert.ok(!vykresliKarty([karta({ mesto: 'Jediné' })]).includes('text-gray-600">Jediné</p>'));

  // Online se v řádku píše stejně jako na kartě. Série bez rozepsaných měst
  // nese výčet z `misto` (tam pořadatel města uvádí); bez něj přizná, že
  // místo upřesní pořadatel — na obou místech totéž.
  const smisene = vykresliKarty([
    karta({ id: 'a', mesto: null, online: true, start: '2026-10-01', end: '2026-10-01' }),
    karta({ id: 'b', mesto: 'Ostrava', start: '2026-10-02', end: '2026-10-02' }),
    karta({ id: 'c', mesto: null, misto: 'Třebíč, Havlíčkův Brod', start: '2026-10-03', end: '2026-10-03' }),
    karta({ id: 'd', mesto: null, misto: '', start: '2026-10-04', end: '2026-10-04' }),
  ]);
  assert.ok(smisene.includes('text-gray-600">Online · Ostrava · Třebíč, Havlíčkův Brod · místo upřesní pořadatel</p>'));
  assert.ok(smisene.includes('text-gray-500">Třebíč, Havlíčkův Brod</p>'), 'Série bez měst ukáže na kartě výčet z misto.');
  assert.ok(smisene.includes('text-gray-500">místo upřesní pořadatel</p>'));
  assert.ok(!smisene.includes('online · '));
  assert.ok(text(smisene).includes('Středočeský kraj 4 akce'));

  // Město na kartě předchází názvu akce: čtenář hledá „Vimperk“, ne
  // „Burza škol Vimperk“.
  const vimperk = jihocesky[0];
  const poziceMesta = html.indexOf(`>${vimperk.mesto}</p>`);
  const poziceNazvu = html.indexOf(vimperk.nazev);
  assert.ok(poziceMesta > -1 && poziceMesta < poziceNazvu, 'Město musí být na kartě dřív než název akce.');
});

test('dlaždice: den, rozsah dnů, rozsah přes měsíc, pevná šířka, menší písmo, dateTime jen u jednoho dne', () => {
  const jeden = vykresliKarty([karta({ start: '2026-10-05', end: '2026-10-05' })]);
  assert.ok(jeden.includes('leading-none">5</span>'));
  assert.ok(jeden.includes('uppercase tracking-wide">říj</span>'));
  assert.ok(jeden.includes('dateTime="2026-10-05"'));

  // V průběhu třídenní akce by první den v tučné dlaždici četl jako „už bylo“.
  const tri = vykresliKarty([karta({ start: '2026-10-15', end: '2026-10-17' })]);
  assert.ok(tri.includes('leading-none">15–17</span>'));
  // Strojová hodnota by u rozsahu tvrdila jeden den; radši žádná.
  assert.ok(!tri.includes('dateTime='), 'U vícedenní akce dlaždice nenese dateTime.');

  const presMesic = vykresliKarty([karta({ start: '2026-09-30', end: '2026-10-02' })]);
  assert.ok(presMesic.includes('leading-none">30–2</span>'));
  assert.ok(presMesic.includes('uppercase tracking-wide">zář–říj</span>'));

  // Šířka je pevná, aby text karet v oddílu začínal na stejné svislici;
  // delší rozsah („~21–30“) dostane menší písmo místo širší dlaždice.
  assert.ok(!tri.includes('min-w-14'), 'Dlaždice nesmí růst s délkou textu.');
  assert.match(tri, /<time[^>]*class="[^"]*\bw-16\b/);
  const pribl = vykresliKarty([karta({ terminPribligny: true, start: '2026-11-21', end: '2026-11-30' })]);
  assert.match(pribl, /class="text-base font-bold leading-none">~21–30</);
});

test('čipy krajů nesou počty spočítané z dat, součet jen z vykreslených, filtr měst neexistuje', () => {
  const vse = zobrazitelneAkce(KE_DNI);
  const html = vykresli(vse);
  const etalon = pocty(vse);
  for (const [kod, pocet] of etalon) {
    assert.ok(html.includes(`data-kraj="${kod}" data-pocet="${pocet}"`), `Čip kraje ${kod} s počtem ${pocet}.`);
  }
  assert.equal((html.match(/data-kraj="/g) ?? []).length, etalon.size, 'Čipy jen pro kraje s akcí.');
  assert.ok(html.includes(`>Všechny kraje<span class="rounded-full px-1.5 text-xs font-semibold bg-white/20">${vse.length}</span>`));
  assert.ok(!html.includes('<select'), 'Rozbalovací seznamy zmizely; pokrytí má být vidět bez kliknutí.');
  assert.ok(!html.includes('Všechna města'));

  // Akce s krajem mimo číselník se nesmí započítat do „Všechny kraje“,
  // když ji žádný oddíl nevykreslí — čísla by nesouhlasila.
  const sPreklepem = vykresliKarty([karta({ id: 'a' }), karta({ id: 'b', krajKod: 'CZ0631', nazev: 'Neviditelná' })]);
  assert.ok(sPreklepem.includes('bg-white/20">1</span>'), 'Součet má být z vykreslených oddílů.');
  assert.ok(!sPreklepem.includes('Neviditelná'));
});

test('výhrada neúplnosti stojí u každého kraje s množinou a větou ze slovníku', () => {
  const vse = zobrazitelneAkce(KE_DNI);
  const html = vykresli(vse);
  // Věta je doslova ta ze slovníku pojmů (pojem „nahlásit akci“).
  const veta = 'Nahlaste nám ji</a> — před zveřejněním ji ověříme na stránce pořadatele.';
  assert.equal(html.split(veta).length - 1, pocty(vse).size, 'Každý oddíl kraje má vlastní výzvu k nahlášení i s větou ze slovníku pojmů.');
  // Počet se počítá z akcí s potvrzeným termínem; věta musí říct, z jaké
  // množiny je, jinak tvrdí, že o víc akcích nevíme.
  assert.ok(vykresliKarty([karta({ id: 'a' }), karta({ id: 'b' }), karta({ id: 'c' })]).includes('Víme jen o těchto 3 akcích s potvrzeným termínem.'));
  assert.ok(vykresliKarty([karta()]).includes('Víme jen o této akci s potvrzeným termínem.'));
});

test('skloňování: 1 akce, 3 akce, 5 akcí; nadpis kraje podle kódu', () => {
  assert.equal(akci(1), '1 akce');
  assert.equal(akci(3), '3 akce');
  assert.equal(akci(5), '5 akcí');
  assert.equal(nadpisKraje('CZ020'), 'Středočeský kraj');
  assert.equal(nadpisKraje('CZ010'), 'Hlavní město Praha');
  assert.equal(nadpisKraje('CZ063'), 'Kraj Vysočina');
});

test('počet v kraji se sníží i tehdy, když v něm další akce zůstávají', () => {
  const den = '2026-10-01';
  const vse = zobrazitelneAkce(KE_DNI);
  const html = renderToStaticMarkup(React.createElement(VeletrhySeznam, { akce: karty(vse), den }));
  const pred = pocty(vse).get('CZ020');
  assert.ok(html.includes(`data-kraj="CZ020" data-pocet="${pred - 1}"`));
  assert.ok(!html.includes(`data-kraj="CZ020" data-pocet="${pred}"`));
});

/**
 * Životní cyklus hooků nad skutečným zdrojem komponenty přes sdílený
 * zavaděč (ES2022, `@/` i `.mjs`). Globály `window`, `document`, `Date`
 * a časovače jsou podstrčené, takže SSR ověřuje HTML po každém efektu.
 *
 * Efekty se spouštějí jako v Reactu: po renderu `spust()` provede ty,
 * kterým se změnily závislosti proti poslednímu spuštění (poprvé všechny),
 * v pořadí zápisu a se zavřením nad stavem z toho renderu; `odpoj()`
 * zavolá úklidy. `klikni(kod)` najde čip ve stromu elementů a zavolá jeho
 * onClick — obsluhy se do statického HTML nedostanou. `replaceState`
 * vysílá `currententrychange` jako Chromium.
 */
function sHooky({ ted: pocatek, hash = '' }) {
  const stavy = [];
  let index = 0;
  const refy = [];
  let refIndex = 0;
  const zavislosti = [];
  let efektIndex = 0;
  const cekajici = [];
  const uklidy = new Map();
  let tik;
  let uklizeno = false;
  const cas = { ted: pocatek };
  const posluchace = [];
  const posunuto = [];
  const registr = (seznam) => ({
    addEventListener: (typ, fn) => seznam.push({ typ, fn }),
    removeEventListener: (typ, fn) => {
      const i = seznam.findIndex((p) => p.typ === typ && p.fn === fn);
      if (i > -1) seznam.splice(i, 1);
    },
  });
  const okno = {
    location: { hash, pathname: '/veletrhy', search: '' },
    ...registr(posluchace),
    // Navigation API: Next při odkazu na tutéž stránku s jinou kotvou
    // volá pushState, po kterém hashchange nepřijde; a Chromium hlásí
    // currententrychange i po vlastním replaceState.
    navigation: registr(posluchace),
    history: {
      replaceState: (_s, _t, url) => {
        okno.location.hash = url.startsWith('#') ? url : '';
        for (const p of posluchace.filter((x) => x.typ === 'currententrychange')) p.fn();
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
    useRef: (pocatek) => {
      const i = refIndex++;
      if (!(i in refy)) refy[i] = { current: pocatek };
      return refy[i];
    },
    useMemo: (vypocet) => vypocet(),
    // Závislosti se porovnávají s posledním *spuštěním*, ne s posledním
    // renderem: render bez `spust()` je jako render, který React ještě
    // necommitnul.
    useEffect: (fn, deps) => {
      const i = efektIndex++;
      const drive = zavislosti[i];
      const zmena = drive === undefined || !deps || drive === null
        || deps.length !== drive.length || deps.some((d, j) => !Object.is(d, drive[j]));
      if (zmena) cekajici.push({ i, fn, deps: deps ?? null });
    },
  };
  const { VeletrhySeznam: Komponenta } = zavadec(react, {}, {
    window: okno,
    document: { getElementById: (id) => ({ scrollIntoView: () => posunuto.push(id) }) },
    Date: class extends Date { constructor() { super(cas.ted); } },
    setInterval: (fn, ms) => { assert.equal(ms, 60_000); tik = fn; return 1; },
    clearInterval: (id) => { assert.equal(id, 1); uklizeno = true; },
  })('src/app/veletrhy/VeletrhySeznam.tsx');
  const zacniRender = () => { index = 0; refIndex = 0; efektIndex = 0; cekajici.length = 0; };
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
  const klikni = (props, kod) => {
    zacniRender();
    const strom = Komponenta(props);
    const cip = najdi(strom, (p) => p['data-kraj'] === kod);
    assert.ok(cip, `Čip ${kod} ve stromu není.`);
    cip.props.onClick();
  };
  const spust = () => {
    const spustene = cekajici.splice(0);
    for (const { i, fn, deps } of spustene) {
      zavislosti[i] = deps;
      uklidy.get(i)?.();
      const uklid = fn();
      if (typeof uklid === 'function') uklidy.set(i, uklid);
      else uklidy.delete(i);
    }
    return spustene.length;
  };
  const odpoj = () => {
    for (const uklid of uklidy.values()) uklid();
    uklidy.clear();
  };
  const listener = (typ) => {
    const p = posluchace.filter((x) => x.typ === typ);
    assert.equal(p.length, 1, `Očekáván jeden posluchač ${typ}, je ${p.length}.`);
    return p[0].fn;
  };
  return { render, klikni, spust, odpoj, listener, stavy, posluchace, posunuto, okno, tik: () => tik(), cas, uklizeno: () => uklizeno };
}

test('starý seznam po půlnoci aktualizuje karty i čipy a zachová viditelný aktivní filtr', () => {
  const h = sHooky({ ted: '2026-09-30T21:59:00Z' });
  const akce = karty(zobrazitelneAkce(KE_DNI).slice(0, 2));
  assert.notEqual(akce[0].krajKod, akce[1].krajKod, 'Test potřebuje dvě akce z různých krajů.');
  const props = { akce, den: '2026-09-30' };
  const prvni = h.render(props);
  assert.ok(prvni.includes(akce[0].nazev));
  h.cas.ted = '2026-09-30T22:01:00Z';
  assert.equal(h.render(props), prvni, 'Před efekty musí i novější klientský čas zachovat serverový den.');
  h.cas.ted = '2026-09-30T21:59:00Z';
  h.spust();
  assert.equal(h.render(props), prvni, 'Po připojení ve stejný den musí být výstup stejný.');
  h.cas.ted = '2026-09-30T22:01:00Z'; // 1. října v Praze
  h.tik();
  const poPulnoci = h.render(props);
  assert.ok(!poPulnoci.includes(akce[0].nazev));
  assert.ok(!poPulnoci.includes(`data-kraj="${akce[0].krajKod}" data-pocet="1"`), 'Čip kraje bez akcí musí zmizet.');
  assert.ok(poPulnoci.includes(akce[1].nazev));
  // Výběr uskutečněný před půlnocí nesmí zmizet z ovladačů, zatímco filtruje.
  h.stavy[0] = akce[0].krajKod;
  const sVyberem = h.render(props);
  assert.match(sVyberem, new RegExp(`aria-pressed="true"[^>]*data-kraj="${akce[0].krajKod}" data-pocet="0"[^>]*>[^<]*<span[^>]*>\\(bez aktuálních akcí\\)`));
  assert.ok(sVyberem.includes('Zrušit filtr'));
  assert.ok(!sVyberem.includes(akce[1].nazev), 'Filtr na kraj bez akcí nesmí ukázat akce jiného kraje.');
  // Prázdný stav se hlásí jednou, ne dvakrát, a čtenář má kam dál.
  assert.equal(sVyberem.split('Neznamená to, že se žádná nekoná').length - 1, 1);
  assert.ok(sVyberem.includes(`aria-label="Střední školy: ${nadpisKraje(akce[0].krajKod)}"`), 'I bez akcí vede odkaz na stránku kraje.');
  assert.ok(sVyberem.includes(`${nadpisKraje(akce[0].krajKod)}: teď o žádné akci nevíme.`));
  h.odpoj();
  assert.ok(h.uklizeno());
});

test('výběr kraje ukáže jen jeho oddíl, čip je stisknutý, věta bez rodu', () => {
  const h = sHooky({ ted: '2026-09-22T10:00:00Z' });
  const vse = zobrazitelneAkce(KE_DNI);
  const props = { akce: karty(vse), den: '2026-09-22' };
  h.stavy[0] = 'CZ031';
  const html = h.render(props);
  assert.match(html, /aria-pressed="true"[^>]*data-kraj="CZ031"/);
  assert.match(html, /aria-pressed="false"[^>]*data-kraj="CZ020"/);
  const jihoceske = vse.filter((a) => a.krajKod === 'CZ031');
  const ostatni = vse.filter((a) => a.krajKod !== 'CZ031');
  for (const a of jihoceske) assert.ok(html.includes(a.nazev), `Jihočeská akce ${a.id} chybí.`);
  for (const a of ostatni) assert.ok(!html.includes(`>${a.nazev}<`), `Akce jiného kraje ${a.id} se nemá zobrazit.`);
  assert.ok(html.includes('Zobrazujeme jen Jihočeský kraj.'));
  // „Zobrazen jen Hlavní město Praha“ by neseděl v rodě; věta je bez příčestí.
  h.stavy[0] = 'CZ010';
  assert.ok(h.render(props).includes('Zobrazujeme jen Hlavní město Praha.'));
  // Harness překládá do ES2022: řádek měst (spread nad Set) musí být i tady.
  h.stavy[0] = 'CZ031';
  const mesta = [...new Set(jihoceske.map((a) => a.mesto))];
  assert.ok(h.render(props).includes(`text-gray-600">${mesta.join(' · ')}</p>`), 'Řádek měst chybí — zavaděč by překládal jiný program než produkce.');
});

test('kotva předvybere kraj a posune až po překreslení; posun je na každé čtení kotvy, ne na každý render', () => {
  const props = { akce: karty(zobrazitelneAkce(KE_DNI)), den: '2026-09-22' };
  const slug = slugKraje('CZ031');

  const s = sHooky({ ted: '2026-09-22T10:00:00Z', hash: `#${slug}` });
  s.render(props);
  // Mount: React spustí všechny efekty v jednom průchodu ještě se starým
  // stavem. Posun se proto nesmí odbýt hned — měřil by plný seznam a po
  // zúžení by čtenář skončil u patičky.
  s.spust();
  assert.equal(s.stavy[0], 'CZ031', 'Odkaz ze stránky kraje má otevřít přehled s tím krajem vybraným.');
  assert.deepEqual(s.posunuto, [], 'Posun nesmí proběhnout před překreslením — měřil by plný seznam.');
  s.render(props);
  s.spust();
  assert.deepEqual(s.posunuto, [slug], 'Po překreslení se zúženým seznamem se posune na oddíl kraje.');
  s.render(props);
  assert.equal(s.spust(), 0, 'Bez změny stavu neběží žádný efekt.');
  assert.deepEqual(s.posunuto, [slug], 'Posun je jednorázový, ne při každém překreslení.');
  assert.match(s.render(props), /aria-pressed="true"[^>]*data-kraj="CZ031"/);

  // Zpět/vpřed mění kotvu bez nového načtení; výběr musí jít s ní.
  const zmena = s.listener('hashchange');
  // Cizí kotva (jiný prvek na stránce) výběr neruší.
  s.okno.location.hash = '#co-si-zjistit';
  zmena();
  assert.equal(s.stavy[0], 'CZ031', 'Cizí kotva nesmí smazat zvolený filtr.');
  // Návrat na kotvu už vybraného kraje: stav kraje se nemění, ale posun
  // proběhne znovu, protože jde o nové čtení kotvy.
  s.okno.location.hash = `#${slug}`;
  zmena();
  s.render(props);
  s.spust();
  assert.deepEqual(s.posunuto, [slug, slug], 'Kotva už vybraného kraje posune znovu.');
  // Prázdná adresa výběr ruší.
  s.okno.location.hash = '';
  zmena();
  assert.equal(s.stavy[0], '');
  s.odpoj();
  assert.equal(s.posluchace.length, 0, 'Po odpojení nesmí posluchač zůstat viset.');

  const cizi = sHooky({ ted: '2026-09-22T10:00:00Z', hash: '#neexistuje' });
  cizi.render(props);
  cizi.spust();
  assert.equal(cizi.stavy[0], '', 'Neznámá kotva při načtení nic nevybere.');
});

test('klik na čip zapíše kotvu do adresy, ale stránkou nehýbe; zpět a vpřed už ano', () => {
  // Chromium hlásí currententrychange i po vlastním replaceState; bez stráže
  // by klik na čip posunul stránku na oddíl a čipy zmizely z obrazovky.
  const props = { akce: karty(zobrazitelneAkce(KE_DNI)), den: '2026-09-22' };
  const slug = slugKraje('CZ031');
  const h = sHooky({ ted: '2026-09-22T10:00:00Z' });
  h.render(props);
  h.spust();
  h.klikni(props, 'CZ031');
  assert.equal(h.stavy[0], 'CZ031');
  assert.equal(h.okno.location.hash, `#${slug}`, 'Výběr se propíše do adresy.');
  h.render(props);
  assert.equal(h.spust(), 0, 'Vlastní zápis adresy nesmí založit posun.');
  assert.deepEqual(h.posunuto, [], 'Klik na čip nehýbe stránkou.');
  // Odkliknutí téhož čipu ruší filtr i kotvu.
  h.klikni(props, 'CZ031');
  assert.equal(h.stavy[0], '');
  assert.equal(h.okno.location.hash, '');
  // Zpět (na #jihocesky) a vpřed už jsou navigace čtenáře: první cizí změna
  // stráž ruší, kotva se vybere i posune.
  const zmena = h.listener('hashchange');
  h.okno.location.hash = `#${slug}`;
  zmena();
  assert.equal(h.stavy[0], 'CZ031', 'Zpět na kotvu kraje musí kraj vybrat.');
  h.render(props);
  h.spust();
  assert.deepEqual(h.posunuto, [slug]);
  h.okno.location.hash = '';
  zmena();
  assert.equal(h.stavy[0], '');
  h.odpoj();
});

test('odkaz Next na tutéž stránku bez kotvy (pushState, bez hashchange) zruší výběr', () => {
  // Next při odkazu z patičky na /veletrhy z /veletrhy#jihocesky jen zavolá
  // pushState a komponentu nechá připojenou. Bez sledování Navigation API
  // by stránka zůstala vyfiltrovaná, zatímco adresa už kotvu nenese.
  const slug = slugKraje('CZ031');
  const s = sHooky({ ted: '2026-09-22T10:00:00Z', hash: `#${slug}` });
  const props = { akce: karty(zobrazitelneAkce(KE_DNI)), den: '2026-09-22' };
  s.render(props);
  s.spust();
  assert.equal(s.stavy[0], 'CZ031');
  const navigace = s.listener('currententrychange');
  s.okno.location.hash = '';
  navigace();
  assert.equal(s.stavy[0], '', 'Po pushState bez kotvy musí výběr zmizet.');
  s.odpoj();
  assert.equal(s.posluchace.length, 0);
});

test('kotva na kraj, kterému akce proběhly, ukáže prázdný stav s odkazem na kraj', () => {
  // Šest krajů má jedinou akci; po ní odkaz ze stránky kraje nesmí tiše
  // ukázat celý seznam s kotvou v adrese.
  const slug = slugKraje('CZ051');
  const bezLibereckych = [karta({ id: 'a', krajKod: 'CZ020' }), karta({ id: 'b', krajKod: 'CZ031' })];
  const s = sHooky({ ted: '2026-09-22T10:00:00Z', hash: `#${slug}` });
  const props = { akce: bezLibereckych, den: '2026-09-22' };
  s.render(props);
  s.spust();
  assert.equal(s.stavy[0], 'CZ051', 'Známý kraj bez akcí se musí poznat od překlepu.');
  const html = s.render(props);
  assert.ok(html.includes('Liberecký kraj: teď o žádné akci nevíme.'));
  assert.ok(html.includes(`href="/regiony/${slug}"`), 'Odkaz zpět na stránku kraje.');
  assert.ok(!html.includes('>Akce<'), 'Ostatní kraje se nezobrazí.');
  assert.match(html, /aria-pressed="true"[^>]*data-kraj="CZ051" data-pocet="0"/);
});
