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
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { VeletrhySeznam, akci, nadpisKraje } from '../src/app/veletrhy/VeletrhySeznam.tsx';
import { zobrazitelneAkce, cesskyDen, krajeSAkcemi } from '../src/lib/veletrhy.ts';
import { createKrajSlug } from '../src/lib/utils.ts';

const KE_DNI = new Date('2026-09-22');

function karty(akce) {
  return akce.map((a) => ({
    id: a.id, nazev: a.nazev, poradatel: a.poradatel, mesto: a.mesto, online: a.online,
    krajKod: a.krajKod, misto: a.misto,
    start: a.start, end: a.end ?? a.start, datum: a.datum, cas: a.cas, url: a.url,
    terminPribligny: a.terminPribligny, zdrojJenAgregator: a.zdrojJenAgregator,
    poznamkaTerminu: a.poznamkaTerminu,
  }));
}

function vykresli(akce, kraje = krajeSAkcemi(KE_DNI)) {
  return renderToStaticMarkup(
    React.createElement(VeletrhySeznam, { akce: karty(akce), kraje, den: cesskyDen(KE_DNI) }),
  );
}

/** Text bez značek a atributů — na hledání vět, ne na hledání `class`. */
function text(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
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

test('akce z agregátoru nese ve výstupu výstrahu', () => {
  const zAgregatoru = zobrazitelneAkce(KE_DNI).filter((a) => a.zdrojJenAgregator);
  assert.ok(zAgregatoru.length > 0, 'Očekáváme aspoň jednu akci z agregátoru.');

  const html = vykresli(zAgregatoru.slice(0, 1));
  assert.ok(html.includes('neověřený u pořadatele'), 'Výstraha o neověřeném termínu musí být ve výstupu.');
});

test('přibližný termín se ve výstupu označí slovem', () => {
  const pribligne = zobrazitelneAkce(KE_DNI).filter((a) => a.terminPribligny);
  assert.ok(pribligne.length > 0, 'Očekáváme aspoň jednu akci s přibližným termínem.');

  const html = vykresli(pribligne.slice(0, 1));
  assert.ok(html.includes('přibližně'), 'Přibližný termín se musí ve výstupu poznat.');
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

test('kraje jsou oddíly s nadpisem, počtem a řádkem měst; město je první řádka karty', () => {
  const vse = zobrazitelneAkce(KE_DNI);
  const html = vykresli(vse);
  const kraje = krajeSAkcemi(KE_DNI);

  for (const k of kraje) {
    assert.ok(
      html.includes(`id="${createKrajSlug(k.kod, k.nazev)}"`),
      `Kraj ${k.nazev} musí mít oddíl s kotvou, aby na něj šlo odkázat ze stránky kraje.`,
    );
    assert.ok(
      text(html).includes(`${nadpisKraje(k.nazev)} ${akci(k.pocet)}`),
      `Nadpis oddílu ${k.nazev} musí nést počet akcí.`,
    );
  }
  // Pravidlo pro slovo „kraj“ je sdílené se stránkou kraje: přívlastek za
  // jménem, Vysočina před ním, Praha bez něj. Review PR #162 našlo
  // „Vysočina kraj“.
  assert.ok(text(html).includes('Středočeský kraj '));
  assert.ok(text(html).includes('Kraj Vysočina '), 'Vysočina má slovo kraj před jménem.');
  assert.ok(!text(html).includes('Vysočina kraj'));
  assert.ok(text(html).includes('Hlavní město Praha 1 akce'));
  assert.ok(!text(html).includes('Praha kraj'));

  // Řádek měst jen tam, kde je co rozlišit: Jihočeský má šest měst,
  // kraj s jedinou akcí by řádkem opakoval, co říká karta pod ním.
  const jihocesky = vse.filter((a) => a.krajKod === 'CZ031');
  assert.ok(jihocesky.length > 1);
  const mesta = [...new Set(jihocesky.map((a) => a.mesto))];
  // Řádek měst je šedý odstavec pod nadpisem; město na kartě je jiný prvek
  // (verzálky), proto se hledá i s koncem atributu class.
  assert.ok(html.includes(`text-gray-600">${mesta.join(' · ')}</p>`), 'Města v kraji mají stát v řádku pod nadpisem, v pořadí konání.');
  const praha = vse.filter((a) => a.krajKod === 'CZ010');
  assert.equal(praha.length, 1, 'Test počítá s jedinou pražskou akcí.');
  assert.ok(!vykresli(praha).includes(`text-gray-600">${praha[0].mesto}</p>`), 'U jediné akce by řádek měst jen opakoval kartu.');

  // Online akce se v řádku měst píše stejně jako na kartě — jedno slovo,
  // jedna podoba v jednom bloku.
  const msk = vse.filter((a) => a.krajKod === 'CZ080');
  assert.ok(msk.some((a) => a.online) && msk.length > 1, 'Test počítá s online akcí v kraji, který má i další akci.');
  assert.ok(html.includes('text-gray-600">Online · '), 'Online v řádku měst se píše s velkým O jako na kartě.');
  assert.ok(!html.includes('online · '));

  // Město na kartě předchází názvu akce: čtenář hledá „Vimperk“, ne
  // „Burza škol Vimperk“.
  const vimperk = jihocesky[0];
  const poziceMesta = html.indexOf(`>${vimperk.mesto}</p>`);
  const poziceNazvu = html.indexOf(vimperk.nazev);
  assert.ok(poziceMesta > -1 && poziceMesta < poziceNazvu, 'Město musí být na kartě dřív než název akce.');
});

test('dlaždice u vícedenní akce nese rozsah dnů, ne jen první den', () => {
  // V průběhu třídenní akce by první den v tučné dlaždici četl jako „už bylo“.
  const vse = zobrazitelneAkce(KE_DNI);
  const vicedenni = vse.find((a) => a.end && a.end !== a.start && !a.terminPribligny && a.start.slice(0, 7) === a.end.slice(0, 7));
  assert.ok(vicedenni, 'Test počítá s vícedenní akcí v jednom měsíci.');
  const d1 = Number(vicedenni.start.slice(8));
  const d2 = Number(vicedenni.end.slice(8));
  const html = vykresli([vicedenni]);
  assert.ok(html.includes(`leading-none">${d1}–${d2}</span>`), `Dlaždice má nést „${d1}–${d2}“.`);

  const jednodenni = vse.find((a) => (!a.end || a.end === a.start) && !a.terminPribligny);
  const d = Number(jednodenni.start.slice(8));
  assert.ok(vykresli([jednodenni]).includes(`leading-none">${d}</span>`));
});

test('čipy krajů nesou počty a filtr měst neexistuje', () => {
  const html = vykresli(zobrazitelneAkce(KE_DNI));
  for (const k of krajeSAkcemi(KE_DNI)) {
    assert.ok(html.includes(`data-kraj="${k.kod}" data-pocet="${k.pocet}"`), `Čip kraje ${k.nazev} s počtem.`);
  }
  assert.ok(!html.includes('<select'), 'Rozbalovací seznamy zmizely; pokrytí má být vidět bez kliknutí.');
  assert.ok(!html.includes('Všechna města'));
});

test('výhrada neúplnosti stojí u každého kraje, ne jen jednou dole', () => {
  const html = vykresli(zobrazitelneAkce(KE_DNI));
  const pocet = html.split('Chybí vám nějaká? Nahlaste nám ji.').length - 1;
  assert.equal(pocet, krajeSAkcemi(KE_DNI).length, 'Každý oddíl kraje má vlastní výzvu k nahlášení.');
});

test('skloňování: 1 akce, 3 akce, 5 akcí; Praha a Vysočina bez přívlastku', () => {
  assert.equal(akci(1), '1 akce');
  assert.equal(akci(3), '3 akce');
  assert.equal(akci(5), '5 akcí');
  assert.equal(nadpisKraje('Středočeský'), 'Středočeský kraj');
  assert.equal(nadpisKraje('Hlavní město Praha'), 'Hlavní město Praha');
  assert.equal(nadpisKraje('Vysočina'), 'Kraj Vysočina');
});

test('počet v kraji se sníží i tehdy, když v něm další akce zůstávají', () => {
  const den = '2026-10-01';
  const kraje = krajeSAkcemi(KE_DNI);
  const html = renderToStaticMarkup(React.createElement(VeletrhySeznam, {
    akce: karty(zobrazitelneAkce(KE_DNI)), kraje, den,
  }));
  const kraj = kraje.find((k) => k.kod === 'CZ020');
  assert.ok(html.includes(`data-kraj="CZ020" data-pocet="${kraj.pocet - 1}"`));
  assert.ok(!html.includes(`data-kraj="CZ020" data-pocet="${kraj.pocet}"`));
});

/**
 * Simuluje životní cyklus hooků nad skutečným zdrojem komponenty.
 * SSR níže ověřuje výsledné HTML; nejde o prohlížečový test hydratace.
 * Efekty se sbírají všechny v pořadí zápisu: první je hodiny, druhý kotva.
 */
function sHooky({ ted: pocatek, hash = '' }) {
  const cesta = new URL('../src/app/veletrhy/VeletrhySeznam.tsx', import.meta.url);
  const require = createRequire(cesta);
  const stavy = [];
  let index = 0;
  const efekty = [];
  let tik;
  let uklizeno = false;
  const cas = { ted: pocatek };
  const posluchace = [];
  const okno = {
    location: { hash, pathname: '/veletrhy', search: '' },
    addEventListener: (typ, fn) => posluchace.push({ typ, fn }),
    removeEventListener: (typ, fn) => {
      const i = posluchace.findIndex((p) => p.typ === typ && p.fn === fn);
      if (i > -1) posluchace.splice(i, 1);
    },
    history: { replaceState: (_s, _t, url) => { okno.location.hash = url.startsWith('#') ? url : ''; } },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(cesta, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, {
    exports,
    require: (id) => id === 'react' ? {
      useState: (pocatek) => {
        const i = index++;
        if (!(i in stavy)) stavy[i] = pocatek;
        return [stavy[i], (hodnota) => { stavy[i] = typeof hodnota === 'function' ? hodnota(stavy[i]) : hodnota; }];
      },
      useMemo: (vypocet) => vypocet(),
      useEffect: (fn) => { efekty.push(fn); },
    } : require({
      '@/lib/utils': '../../lib/utils.ts',
      '@/lib/cesky-tvar': '../../lib/cesky-tvar.ts',
      '@/lib/kraje.mjs': '../../lib/kraje.mjs',
    }[id] ?? id),
    Date: class extends Date { constructor() { super(cas.ted); } },
    Intl,
    window: okno,
    setInterval: (fn, ms) => { assert.equal(ms, 60_000); tik = fn; return 1; },
    clearInterval: (id) => { assert.equal(id, 1); uklizeno = true; },
  });
  const render = (props) => { index = 0; efekty.length = 0; return renderToStaticMarkup(exports.VeletrhySeznam(props)); };
  return { render, stavy, efekty, posluchace, okno, tik: () => tik(), cas, uklizeno: () => uklizeno };
}

test('starý seznam po půlnoci aktualizuje karty i čipy a zachová viditelný aktivní filtr', () => {
  const h = sHooky({ ted: '2026-09-30T21:59:00Z' });
  const akce = karty(zobrazitelneAkce(KE_DNI).slice(0, 2));
  assert.notEqual(akce[0].krajKod, akce[1].krajKod, 'Test potřebuje dvě akce z různých krajů.');
  const kraje = krajeSAkcemi(KE_DNI).filter((k) => akce.some((a) => a.krajKod === k.kod));
  const props = { akce, den: '2026-09-30', kraje };
  const prvni = h.render(props);
  assert.equal(h.efekty.length, 2, 'Komponenta má dva efekty: hodiny a kotvu; třetí by tenhle test tiše minul.');
  assert.ok(prvni.includes(akce[0].nazev));
  h.cas.ted = '2026-09-30T22:01:00Z';
  assert.equal(h.render(props), prvni, 'Před efektem musí i novější klientský čas zachovat serverový den.');
  h.cas.ted = '2026-09-30T21:59:00Z';
  const uklid = h.efekty[0]();
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
  assert.ok(sVyberem.includes('Střední školy v kraji'), 'I bez akcí vede odkaz na stránku kraje.');
  assert.ok(!sVyberem.includes('V kraji Hlavní město'), 'Název kraje se skloňuje přes nadpisKraje, ne surově.');
  uklid();
  assert.ok(h.uklizeno());
});

test('výběr kraje ukáže jen jeho oddíl a čip je stisknutý', () => {
  const h = sHooky({ ted: '2026-09-22T10:00:00Z' });
  const vse = zobrazitelneAkce(KE_DNI);
  const props = { akce: karty(vse), den: '2026-09-22', kraje: krajeSAkcemi(KE_DNI) };
  h.stavy[0] = 'CZ031';
  const html = h.render(props);
  assert.match(html, /aria-pressed="true"[^>]*data-kraj="CZ031"/);
  assert.match(html, /aria-pressed="false"[^>]*data-kraj="CZ020"/);
  const jihoceske = vse.filter((a) => a.krajKod === 'CZ031');
  const ostatni = vse.filter((a) => a.krajKod !== 'CZ031');
  for (const a of jihoceske) assert.ok(html.includes(a.nazev), `Jihočeská akce ${a.id} chybí.`);
  for (const a of ostatni) assert.ok(!html.includes(`>${a.nazev}<`), `Akce jiného kraje ${a.id} se nemá zobrazit.`);
  assert.ok(html.includes('Zobrazen jen Jihočeský kraj.'));
});

test('kotva v adrese předvybere kraj, neznámá nic; změna kotvy se sleduje a po odpojení ne', () => {
  const vse = zobrazitelneAkce(KE_DNI);
  const kraje = krajeSAkcemi(KE_DNI);
  const props = { akce: karty(vse), den: '2026-09-22', kraje };
  const jihocesky = kraje.find((k) => k.kod === 'CZ031');

  const s = sHooky({ ted: '2026-09-22T10:00:00Z', hash: `#${createKrajSlug(jihocesky.kod, jihocesky.nazev)}` });
  s.render(props);
  const uklid = s.efekty[1]();
  assert.equal(s.stavy[0], 'CZ031', 'Odkaz ze stránky kraje má otevřít přehled s tím krajem vybraným.');
  assert.match(s.render(props), /aria-pressed="true"[^>]*data-kraj="CZ031"/);
  // Zpět/vpřed v prohlížeči mění kotvu bez nového načtení; výběr musí jít s ní.
  assert.equal(s.posluchace.filter((p) => p.typ === 'hashchange').length, 1, 'Změna kotvy se má sledovat.');
  s.okno.location.hash = '#neexistuje';
  s.posluchace.find((p) => p.typ === 'hashchange').fn();
  assert.equal(s.stavy[0], '', 'Neznámá kotva nesmí nic vybrat.');
  uklid();
  assert.equal(s.posluchace.length, 0, 'Po odpojení nesmí posluchač zůstat viset.');

  const cizi = sHooky({ ted: '2026-09-22T10:00:00Z', hash: '#neexistuje' });
  cizi.render(props);
  cizi.efekty[1]();
  assert.equal(cizi.stavy[0], '', 'Neznámá kotva nesmí nic vybrat.');
});
