import test from 'node:test';
import assert from 'node:assert/strict';
import { zavadec } from './_zavadec.mjs';

const { getIdentifikaceSkoly } = zavadec()('src/lib/portal-identifikace.ts');

// Katalog, který selže při čtení. `process.chdir` na tohle nestačí: cesta
// k datům se v src/lib/data.ts počítá při načtení modulu, ne při volání.
const { getIdentifikaceSkoly: sRozbitymKatalogem } = zavadec(null, {
  '@/lib/data': {
    getSchoolsByRedizo: async () => {
      throw new Error('school_analysis.json nejde přečíst');
    },
  },
})('src/lib/portal-identifikace.ts');

// Identifikace školy je ozdoba, uplatnění kódu je podstata. Když chybí katalog
// nebo rejstříkový index, nesmí to shodit ověření platného kódu — škola by se
// zasekla na HTTP 500 a správce by nezaložila.

test('rozbitý katalog identifikaci neshodí, jen ochudí', async () => {
  // Bez tohohle ošetření skončí ověření platného kódu na HTTP 500 a škola se
  // k založení správce vůbec nedostane.
  const skola = await sRozbitymKatalogem('600006247', 'Gymnázium');
  assert.equal(skola.redizo, '600006247');
  assert.equal(skola.profil, null, 'bez nabídek odkaz na profil nevede nikam');
  // Rejstřík je nezávislý zdroj, takže plný název a IČO zůstanou.
  assert.match(skola.nazev, /Litoměřická/);
  assert.match(skola.ico, /^\d+$/);
});

test('neznámé REDIZO vrátí aspoň to, co přišlo od volajícího', async () => {
  const skola = await getIdentifikaceSkoly('999999999', 'Gymnázium');
  assert.equal(skola.redizo, '999999999');
  assert.equal(skola.nazev, 'Gymnázium');
  assert.equal(skola.profil, null);
});

test('se skutečnými daty doplní plný název, adresu a IČO z rejstříku', async () => {
  const skola = await getIdentifikaceSkoly('600006247', 'Gymnázium');
  assert.match(skola.nazev, /Litoměřická/, 'plný název z rejstříku');
  assert.match(skola.adresa, /Litoměřická/);
  assert.match(skola.ico, /^\d+$/);
});
