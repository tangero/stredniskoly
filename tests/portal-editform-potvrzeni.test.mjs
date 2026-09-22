import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { zavadec } from './_zavadec.mjs';

// Po uložení se dlouhý formulář nahradí krátkou kartou „Děkujeme“. Stránka se
// tím srazí, prohlížeč si podrží pozici posuvníku a ta padne na sekci pod
// formulářem — potvrzení zůstane nad obrazovkou. Kdo formulář vyplnil až dolů,
// se o výsledku vlastní práce nedozví.

const PROFIL = {
  nazev: 'Gymnázium, Praha 9, Litoměřická 726',
  redizo: '600006247',
  obory: [],
  hodnoty: {},
};

/** Vykreslí formulář ve stavu `odeslano`; jinak se na kartu nedá dostat. */
const potvrzeni = () => {
  const react = {
    ...React,
    // `stav` je jediný useState s počáteční hodnotou 'formular'; podstrčí se
    // mu 'odeslano', jinak se na kartu potvrzení nedá dostat bez odeslání.
    useState: (init) => [init === 'formular' ? 'odeslano' : init, () => {}],
    useRef: () => ({ current: null }),
    useEffect: () => {},
  };
  const { PortalEditForm } = zavadec(react)('src/components/portal/PortalEditForm.tsx');
  return renderToStaticMarkup(
    React.createElement(PortalEditForm, { auth: { ucet: '600006247' }, profil: PROFIL, pole: [] }),
  );
};

test('potvrzení se dá zaostřit a oznámit, ne jen vykreslit', () => {
  const html = potvrzeni();
  assert.match(html, /Děkujeme!/);
  // tabindex kvůli fokusu po zmizení odesílacího tlačítka, role kvůli čtečkám.
  assert.match(html, /tabindex="-1"/, 'karta nejde zaostřit, fokus spadne na <body>');
  assert.match(html, /role="status"/, 'čtečka o uložení neřekne');
});

test('potvrzení říká, že se na schválení nečeká', () => {
  // Pozvánka ředitelům slibuje „na schválení nic nečeká“. Kdyby aplikace
  // tvrdila opak, popřela by to v okamžiku, kdy na tom člověku záleží nejvíc.
  const html = potvrzeni();
  assert.match(html, /Na schválení nic nečeká/);
  assert.match(html, /potvrdila škola/);
});

test('formulář nikde neslibuje kontrolu redakcí před zveřejněním', () => {
  // Zbytky po obráceném pořadí moderace: dřív se čekalo na schválení, dnes se
  // publikuje hned a moderuje zpětně.
  const react = { ...React, useRef: () => ({ current: null }), useEffect: () => {} };
  const { PortalEditForm } = zavadec(react)('src/components/portal/PortalEditForm.tsx');
  const html = renderToStaticMarkup(
    React.createElement(PortalEditForm, { auth: { ucet: '600006247' }, profil: PROFIL, pole: [] }),
  );
  assert.doesNotMatch(html, /nejdřív je zkontroluje redakce/, 'text starého modelu moderace');
  assert.doesNotMatch(html, /Odeslat ke kontrole/, 'tlačítko slibuje kontrolu před zveřejněním');
});

test('potvrzení nabídne odkaz na stránku školy ke kontrole', () => {
  // Údaje se publikují hned, takže má smysl rovnou ukázat, kam se koukat.
  // Bez odkazu by se člověk k výsledku vlastní práce musel proklikávat sám.
  const html = potvrzeni();
  assert.match(html, /href="\/skola\/600006247-/, 'chybí odkaz na stránku školy');
  assert.match(html, /Zkontrolovat stránku školy/);
  assert.match(html, /target="_blank"/, 'odkaz přepíše rozepsaný profil');
  assert.match(html, /rel="noopener"/);
});

test('škola bez názvu odkaz nenabídne místo rozbité adresy', () => {
  // `adresaPrehledu` by z prázdného názvu složila /skola/600006247- a ta nikam
  // nevede. Radši bez odkazu než odkaz do prázdna.
  const react = {
    ...React,
    useState: (init) => [init === 'formular' ? 'odeslano' : init, () => {}],
    useRef: () => ({ current: null }),
    useEffect: () => {},
  };
  const { PortalEditForm } = zavadec(react)('src/components/portal/PortalEditForm.tsx');
  const html = renderToStaticMarkup(
    React.createElement(PortalEditForm, {
      auth: { ucet: '600006247' },
      profil: { ...PROFIL, nazev: '' },
      pole: [],
    }),
  );
  assert.match(html, /Děkujeme!/);
  assert.doesNotMatch(html, /Zkontrolovat stránku školy/, 'nabídl odkaz do prázdna');
});
