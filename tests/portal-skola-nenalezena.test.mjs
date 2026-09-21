import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { zavadec } from './_zavadec.mjs';

// „Školu jsme nenašli“ se vykresluje čtyřem různým příchozím a jen jeden z nich
// drží přihlašovací kód. Věta o tom, že kód zůstává platný, se v tomhle PR dvakrát
// rozlila i na zbylé tři — přihlášenému správci lhala o kódu, který už spotřeboval,
// a příchozímu odkazem slibovala kód, jaký nikdy nedostal. Tenhle soubor to drží.

// Obálka stránky táhne Header i Footer, a ty čekají mountnutý app router.
// Pro tenhle test jsou to jen kulisy kolem věty, na které záleží.
const prazdna = ({ children }) => React.createElement('div', null, children);
const kulisy = {
  'next/link': { __esModule: true, default: ({ children, ...p }) => React.createElement('a', p, children) },
  '@/components/Header': { Header: prazdna },
  '@/components/Footer': { Footer: prazdna },
  '@/components/portal/PortalEditForm': { PortalEditForm: prazdna },
  '@/lib/portal-skol': { getPredvyplnenyProfil: async () => null, PORTAL_POLE: [] },
  '@/lib/portal-profil-verejne': { potvrzenyProfil: async () => null },
};
const { PortalSkolaNenalezena, PortalEditace } = zavadec(null, kulisy)(
  'src/components/portal/PortalEditace.tsx',
);

const vykresli = (vstup) =>
  renderToStaticMarkup(React.createElement(PortalSkolaNenalezena, { redizo: '600006247', vstup }));

test('kdo drží kód, dostane ujištění, že o něj nepřišel', () => {
  const html = vykresli('kod');
  assert.match(html, /600006247/);
  assert.match(html, /váš kód zůstává platný/);
});

for (const [vstup, kdo] of [
  ['odkaz', 'kdo přišel odkazem z rejstříku'],
  ['ucet', 'přihlášený správce'],
]) {
  test(`${kdo} o kódu nečte`, () => {
    // 'odkaz': žádný kód nedostal. 'ucet': svůj kód už spotřeboval při založení.
    assert.doesNotMatch(vykresli(vstup), /kód/i, 'slibuje kód tomu, kdo žádný nemá');
  });
}

test('bez uvedeného vstupu se o kódu mlčí', () => {
  // Výchozí hodnota je 'ucet' — nejopatrnější volba, když volající neřekne víc.
  assert.doesNotMatch(vykresli(undefined), /kód/i);
});

// ---------------------------------------------------------------------------
// Volající strana. Samotný prop `vstup` je otestovaný výš, ale právě odvození
// z `auth` se v tomhle PR rozbilo třikrát za sebou — a pokaždé tiše.
// ---------------------------------------------------------------------------

const { PortalEditace: EditaceBezProfilu } = zavadec(null, {
  ...kulisy,
  // Škola, která po přepnutí datové sady vypadla z katalogu: profil není co
  // editovat, takže se vykreslí „Školu jsme nenašli“.
  '@/lib/portal-skol': { getPredvyplnenyProfil: async () => null, PORTAL_POLE: [] },
})('src/components/portal/PortalEditace.tsx');

for (const [popis, auth, cteOKodu] of [
  ['kdo přišel s kódem', { kod: 'ABCD-EFGH-JKMN' }, true],
  ['kdo přišel odkazem z rejstříku', { magic: 'token' }, false],
  ['přihlášený správce', { ucet: '600006247' }, false],
]) {
  test(`editace předá správný vstup: ${popis}`, async () => {
    const html = renderToStaticMarkup(
      await EditaceBezProfilu({ redizo: '600006247', auth }),
    );
    assert.match(html, /Školu jsme nenašli/, 'vykreslilo se něco jiného, test nic netvrdí');
    if (cteOKodu) assert.match(html, /váš kód zůstává platný/);
    else assert.doesNotMatch(html, /kód/i, 'slibuje kód tomu, kdo žádný nemá');
  });
}

test('PortalEditace se importuje, jinak by test výš nic nehlídal', () => {
  assert.equal(typeof PortalEditace, 'function');
});
