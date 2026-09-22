// ============================================================================
// Vykreslení seznamu veletrhů.
//
// Oponentura našla, že poznámka u plzeňské akce (všední dny jen pro školní
// výpravy s registrací) se nevykreslila: podmínka ji vázala na příznaky
// nejistoty, které Plzeň nemá. Data byla správně, render mlčel — proto
// testy nad daty nestačí a je potřeba sáhnout na výstup.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { VeletrhySeznam } from '../src/app/veletrhy/VeletrhySeznam.tsx';
import { zobrazitelneAkce, nazevKraje, cesskyDen, krajeSAkcemi, mestaSAkcemi } from '../src/lib/veletrhy.ts';

const KE_DNI = new Date('2026-09-22');

function vykresli(akce) {
  const karty = akce.map((a) => ({
    id: a.id, nazev: a.nazev, poradatel: a.poradatel, mesto: a.mesto, online: a.online,
    krajKod: a.krajKod, krajNazev: nazevKraje(a.krajKod), misto: a.misto,
    start: a.start, end: a.end ?? a.start, datum: a.datum, cas: a.cas, url: a.url,
    terminPribligny: a.terminPribligny, zdrojJenAgregator: a.zdrojJenAgregator,
    poznamkaTerminu: a.poznamkaTerminu,
  }));
  return renderToStaticMarkup(
    React.createElement(VeletrhySeznam, { akce: karty, kraje: [], mesta: [], den: cesskyDen(KE_DNI) }),
  );
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

test('každá vykreslená akce vede na stránku pořadatele a přiznává, kdo pořádá', () => {
  const html = vykresli(zobrazitelneAkce(KE_DNI).slice(0, 5));
  assert.ok(html.includes('Pořadatelem je'), 'Karta musí říct, kdo za akci ručí.');
  assert.ok(html.includes('Stránka akce'), 'Karta musí vést na stránku akce.');
});

test('počet v kraji se sníží i tehdy, když v něm další akce zůstávají', () => {
  const den = '2026-10-01';
  const akce = zobrazitelneAkce(KE_DNI).map((a) => ({ ...a, krajNazev: nazevKraje(a.krajKod) }));
  const kraje = krajeSAkcemi(KE_DNI);
  const html = renderToStaticMarkup(React.createElement(VeletrhySeznam, {
    akce, kraje, mesta: mestaSAkcemi(KE_DNI), den,
  }));
  const kraj = kraje.find((k) => k.kod === 'CZ020');
  assert.ok(html.includes(`${kraj.nazev} (${kraj.pocet - 1})`));
  assert.ok(!html.includes(`${kraj.nazev} (${kraj.pocet})`));
});

test('starý seznam po půlnoci aktualizuje karty i nabídky a zachová viditelný aktivní filtr', () => {
  // Simulujeme životní cyklus hooků nad skutečným zdrojem komponenty.
  // SSR níže ověřuje výsledné HTML; nejde o prohlížečový test hydratace.
  const cesta = new URL('../src/app/veletrhy/VeletrhySeznam.tsx', import.meta.url);
  const require = createRequire(cesta);
  const stavy = [];
  let index = 0;
  let efekt;
  let tik;
  let uklizeno = false;
  let ted = '2026-09-30T21:59:00Z';
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
      useEffect: (fn) => { efekt ??= fn; },
    } : require(id === '@/lib/utils' ? '../../lib/utils.ts' : id),
    Date: class extends Date { constructor() { super(ted); } },
    Intl,
    setInterval: (fn, ms) => { assert.equal(ms, 60_000); tik = fn; return 1; },
    clearInterval: (id) => { assert.equal(id, 1); uklizeno = true; },
  });
  const akce = zobrazitelneAkce(KE_DNI).slice(0, 2).map((a) => ({ ...a, krajNazev: nazevKraje(a.krajKod) }));
  const props = {
    akce, den: '2026-09-30', mesta: akce.map((a) => a.mesto),
    kraje: akce.map((a) => ({ kod: a.krajKod, nazev: nazevKraje(a.krajKod), pocet: 1 })),
  };
  const render = () => { index = 0; return renderToStaticMarkup(exports.VeletrhySeznam(props)); };
  const prvni = render();
  assert.ok(prvni.includes(akce[0].nazev));
  ted = '2026-09-30T22:01:00Z';
  assert.equal(render(), prvni, 'Před efektem musí i novější klientský čas zachovat serverový den.');
  ted = '2026-09-30T21:59:00Z';
  const uklid = efekt();
  assert.equal(render(), prvni, 'Po připojení ve stejný den musí být výstup stejný.');
  ted = '2026-09-30T22:01:00Z'; // 1. října v Praze
  tik();
  const poPulnoci = render();
  assert.ok(!poPulnoci.includes(akce[0].nazev));
  assert.ok(!poPulnoci.includes('value="Příbram"'));
  assert.ok(!poPulnoci.includes('value="CZ020"'));
  assert.ok(poPulnoci.includes(akce[1].nazev));
  // Výběr uskutečněný před půlnocí nesmí zmizet z ovladačů, zatímco filtruje.
  stavy[0] = 'CZ020';
  stavy[1] = 'Příbram';
  const sVyberem = render();
  assert.match(sVyberem, /value="CZ020" selected=""[^>]*>[^<]*bez aktuálních akcí/);
  assert.match(sVyberem, /value="Příbram" selected=""[^>]*>Příbram \(bez aktuálních akcí\)/);
  assert.ok(sVyberem.includes('Zrušit filtr'));
  uklid();
  assert.ok(uklizeno);
});
