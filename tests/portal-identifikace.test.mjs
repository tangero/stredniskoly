import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

// Škola se bere z rejstříkového indexu, ne natvrdo: index obnovuje datová linka
// a přejmenovaná nebo zaniklá škola by jinak shodila CI bez jediné změny kódu.
// Očekávané hodnoty pocházejí z téhož záznamu, takže test pořád pozná, když se
// rejstřík vůbec nepoužije — jen nestojí na konkrétní škole.
const index = JSON.parse(readFileSync('data/msmt_rejstrik/nazvy-oboru.json', 'utf8'));
const [REDIZO, ZAZNAM] = Object.entries(index.identifikace).find(
  ([, z]) => z.uplny_nazev && z.ico && z.adresa,
);

// Identifikace školy je ozdoba, uplatnění kódu je podstata. Když chybí katalog
// nebo rejstříkový index, nesmí to shodit ověření platného kódu — škola by se
// zasekla na HTTP 500 a správce by nezaložila.

test('rozbitý katalog identifikaci neshodí, jen ochudí', async () => {
  // Bez tohohle ošetření skončí ověření platného kódu na HTTP 500 a škola se
  // k založení správce vůbec nedostane.
  const skola = await sRozbitymKatalogem(REDIZO, 'zkrácený název');
  assert.equal(skola.redizo, REDIZO);
  assert.equal(skola.profil, null, 'bez nabídek odkaz na profil nevede nikam');
  // Rejstřík je nezávislý zdroj, takže plný název a IČO zůstanou.
  assert.equal(skola.nazev, ZAZNAM.uplny_nazev);
  assert.equal(skola.ico, ZAZNAM.ico);
});

test('neznámé REDIZO vrátí aspoň to, co přišlo od volajícího', async () => {
  const skola = await getIdentifikaceSkoly('999999999', 'Gymnázium');
  assert.equal(skola.redizo, '999999999');
  assert.equal(skola.nazev, 'Gymnázium');
  assert.equal(skola.profil, null);
});

test('se skutečnými daty doplní plný název, adresu a IČO z rejstříku', async () => {
  const skola = await getIdentifikaceSkoly(REDIZO, 'zkrácený název');
  assert.equal(skola.nazev, ZAZNAM.uplny_nazev, 'plný název z rejstříku, ne z katalogu');
  assert.equal(skola.adresa, ZAZNAM.adresa);
  assert.equal(skola.ico, ZAZNAM.ico);
  assert.notEqual(skola.nazev, 'zkrácený název', 'rejstřík se vůbec nepoužil');
});
