import test from 'node:test';
import assert from 'node:assert/strict';
import { zavadec } from './_zavadec.mjs';

// POST /api/portal/uplatnit je místo, kde se přihlašovací kód nevratně
// spotřebuje. Škola dostane jediný; když shoří na účtu, se kterým se nedá nic
// dělat, druhý už nepřijde. Formulář jde obejít prostým POSTem, takže pojistka
// musí držet tady — a musí být hlídaná, jinak ji příští refaktor tiše odnese.

const UDAJE = { jmeno: 'Jana Nováková', funkce: 'ředitelka', email: 'reditelka@skola.cz', zverejnit_jmeno: false };

/** Route s podstrčenými závislostmi; `dohled` sbírá, co se skutečně stalo. */
function nactiRoute({ nazev = 'Gymnázium', redizo = '600006247' } = {}) {
  const dohled = { transakci: 0, uplatnenoKodu: 0, zalozenoZRejstriku: 0 };
  const { POST } = zavadec(null, {
    'next/server': {
      NextResponse: { json: (telo, init) => ({ telo, status: init?.status ?? 200 }) },
    },
    '@/lib/portal-skol': {
      hashKod: () => 'hash',
      validateKod: async () => redizo,
      getNazevSkoly: async () => nazev,
      getNazevSAdresou: async () => nazev,
    },
    '@/lib/portal-magic': {
      overMagicToken: () => redizo,
      portalBaseUrl: () => 'https://example.test',
      nactiEmaily: async () => ({}),
    },
    '@/lib/novinky-db': {
      jeDbNastavena: () => true,
      vTransakci: async (f) => {
        dohled.transakci += 1;
        return f({});
      },
    },
    '@/lib/portal-relace': { nastavRelaci: () => {} },
    '@/lib/portal-ucty': {
      overUdajeOsoby: () => ({ ok: true, udaje: UDAJE }),
      uplatniKod: async () => {
        dohled.uplatnenoKodu += 1;
        return { redizo, osoba_id: 'o1', email: UDAJE.email, jmeno: UDAJE.jmeno };
      },
      zalozSpravceZRejstriku: async () => {
        dohled.zalozenoZRejstriku += 1;
        return { redizo, osoba_id: 'o1', email: UDAJE.email, jmeno: UDAJE.jmeno };
      },
    },
    '@/lib/portal-email': { posliVitejteEmail: async () => true },
    '@/lib/portal-api': {
      chyba: (zprava, status) => ({ telo: { error: zprava }, status }),
      odpovedNaChybu: (e) => ({ telo: { error: String(e) }, status: 500 }),
      ipZPozadavku: () => '127.0.0.1',
      jeOmezeno: () => false,
      obnovVerejneSpravce: () => {},
      oznamNovehoSpravce: async () => {},
    },
  })('src/app/api/portal/uplatnit/route.ts');

  const zavolej = (telo) => POST({ json: async () => ({ ...UDAJE, ...telo }), headers: new Map() });
  return { zavolej, dohled };
}

for (const [jak, telo] of [
  ['kódem', { kod: 'ABCD-EFGH-JKMN' }],
  ['odkazem z rejstříku', { magic: 'token' }],
]) {
  test(`škola bez profilu se nedá převzít ${jak}`, async () => {
    // Prázdný `getNazevSkoly` znamená, že škola není v zobrazovaném období
    // katalogu. `getPredvyplnenyProfil` pak vrátí null a /pro-skoly/profil
    // skončí na „školu neznáme“ — účet by vznikl a nešel by k ničemu použít.
    const { zavolej, dohled } = nactiRoute({ nazev: '' });
    const { status, telo: odpoved } = await zavolej(telo);
    assert.equal(status, 409);
    assert.match(odpoved.error, /kód zůstává platný/, 'chybí ujištění, že kód nepropadl');
    assert.equal(dohled.transakci, 0, 'transakce se spustila, kód mohl shořet');
    assert.equal(dohled.uplatnenoKodu, 0);
    assert.equal(dohled.zalozenoZRejstriku, 0);
  });
}

test('škola v katalogu se převzít dá', async () => {
  // Pojistka nesmí být tak přísná, aby zablokovala běžný případ — přesně ten,
  // kterým projde všech dvacet škol z pilotu.
  const { zavolej, dohled } = nactiRoute();
  const { telo } = await zavolej({ kod: 'ABCD-EFGH-JKMN' });
  assert.equal(telo.ok, true);
  assert.equal(dohled.uplatnenoKodu, 1);
});
