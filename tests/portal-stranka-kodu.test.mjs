import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { zavadec } from './_zavadec.mjs';

// /pro-skoly/<kód> je druhá cesta k založení správce (pozvánka posílá lidi na
// formulář, ale starší odkazy míří sem). Má vlastní kopii stráže proti spálení
// jednorázového kódu a vlastní volbu `vstup` — a obojí zatím nic nehlídalo.

const SKOLA = {
  redizo: '600006247',
  nazev: 'Gymnázium, Praha 9, Litoměřická 726',
  ico: '61387061',
  adresa: 'Litoměřická 726/17, 190 00 Praha 9 – Prosek',
  profil: '/skola/600006247-gymnazium',
};

const prazdna = ({ children }) => React.createElement('div', null, children);

/** `dohled.rejstrik` počítá čtení rejstříku, aby šlo poznat práci navíc. */
function nactiStranku({ stav, nazev }) {
  const dohled = { rejstrik: 0 };
  const { default: Stranka } = zavadec(null, {
    next: {},
    'next/navigation': { redirect: () => { throw new Error('nečekané přesměrování'); } },
    '@/components/portal/PortalHlaska': { PortalHlaska: prazdna },
    '@/components/portal/PortalMagicForm': { PortalMagicForm: prazdna },
    '@/components/Header': { Header: prazdna },
    '@/components/Footer': { Footer: prazdna },
    '@/components/portal/PortalEditForm': { PortalEditForm: prazdna },
    'next/link': { __esModule: true, default: ({ children, ...p }) => React.createElement('a', p, children) },
    '@/lib/portal-identifikace': {
      getIdentifikaceSkoly: async (redizo, n) => {
        dohled.rejstrik += 1;
        // Jako skutečná funkce: plný název z rejstříku má přednost před katalogem.
        return { ...SKOLA, redizo, nazev: SKOLA.nazev || n };
      },
    },
    '@/lib/portal-skol': {
      getNazevSkoly: async () => nazev,
      validateKod: async () => '600006247',
      getPredvyplnenyProfil: async () => null,
      PORTAL_POLE: [],
    },
    '@/lib/portal-profil-verejne': { potvrzenyProfil: async () => null },
    '@/lib/novinky-db': { jeDbNastavena: () => true },
    '@/lib/portal-relace': {
      stavKodu: async () => ({ stav, redizo: '600006247' }),
      prihlasenyZCookies: async () => null,
    },
  })('src/app/pro-skoly/[kod]/page.tsx');

  const vykresli = async () =>
    renderToStaticMarkup(await Stranka({ params: Promise.resolve({ kod: 'ABCD-EFGH-JKMN' }) }));
  return { vykresli, dohled };
}

test('volný kód u školy mimo katalog se nenabídne k uplatnění', async () => {
  // Bez stráže by se nabídlo založení, kód by se nenávratně spotřeboval a profil
  // by pak skončil na „školu neznáme“. Druhý kód škola nedostane.
  const { vykresli, dohled } = nactiStranku({ stav: 'volny', nazev: '' });
  const html = await vykresli();
  assert.match(html, /Školu jsme nenašli/);
  assert.doesNotMatch(html, /Staňte se správcem profilu/, 'nabídlo se založení');
  assert.match(html, /váš kód zůstává platný/, 'chybí ujištění tomu, kdo kód drží');
  assert.equal(dohled.rejstrik, 0, 've slepé uličce se četl rejstřík zbytečně');
});

test('volný kód u školy v katalogu otevře založení správce', async () => {
  const { vykresli, dohled } = nactiStranku({ stav: 'volny', nazev: 'Gymnázium' });
  const html = await vykresli();
  assert.match(html, /Staňte se správcem profilu/);
  assert.match(html, /Gymnázium, Praha 9, Litoměřická 726/, 'chybí identifikace z rejstříku');
  assert.equal(dohled.rejstrik, 1);
});

test('spotřebovaný kód mimo katalog netvrdí, že platí', async () => {
  // Stráž se pro spotřebovaný kód schválně přeskakuje: „váš kód zůstává platný“
  // by lhalo o kódu, se kterým už nikdo nic nesvede.
  const { vykresli } = nactiStranku({ stav: 'uplatnen', nazev: '' });
  const html = await vykresli();
  assert.doesNotMatch(html, /kód zůstává platný/);
  assert.match(html, /Kód už byl použit/);
});
