import test from 'node:test';
import assert from 'node:assert/strict';
import { zavadec } from './_zavadec.mjs';

// POST /api/portal/kod je jediná cesta, kterou se škola dostane k založení
// správce. Odpovídá na neautentizovaný požadavek a sahá přitom do dvou velkých
// datových souborů, takže na ní záleží dvojí: že platný kód projde i při potížích
// se zdroji dat, a že u neplatného nebo spotřebovaného kódu nic navíc neprozradí.

const SKOLA = {
  redizo: '600006247',
  nazev: 'Gymnázium, Praha 9, Litoměřická 726',
  ico: '61387061',
  adresa: 'Litoměřická 726/17, 190 00 Praha 9 – Prosek',
  profil: '/skola/600006247-gymnazium',
};

/** Route s podstrčenými závislostmi; `dohled` sbírá, co se skutečně zavolalo. */
function nactiRoute({ stav, redizo = '600006247', nazev = 'Gymnázium', identifikace }) {
  const dohled = { identifikaceVolana: 0, chyby: [] };
  const { POST } = zavadec(null, {
    'next/server': {
      NextResponse: { json: (telo, init) => ({ telo, status: init?.status ?? 200 }) },
    },
    '@/lib/novinky-db': { jeDbNastavena: () => true },
    '@/lib/portal-relace': { stavKodu: async () => ({ stav, redizo }) },
    '@/lib/portal-skol': { getNazevSkoly: async () => nazev },
    '@/lib/portal-identifikace': {
      getIdentifikaceSkoly: async (r, n) => {
        dohled.identifikaceVolana += 1;
        if (identifikace === 'selze') throw new Error('rejstřík nejde přečíst');
        return { ...SKOLA, redizo: r, nazev: SKOLA.nazev || n };
      },
    },
    '@/lib/portal-api': {
      chyba: (zprava, status) => ({ telo: { error: zprava }, status }),
      ipZPozadavku: () => '127.0.0.1',
      jeOmezeno: () => false,
    },
  })('src/app/api/portal/kod/route.ts');

  const puvodniError = console.error;
  console.error = (...a) => dohled.chyby.push(a.join(' '));
  const zavolej = async () => {
    try {
      return await POST({ json: async () => ({ kod: 'ABCD-EFGH-JKMN' }), headers: new Map() });
    } finally {
      console.error = puvodniError;
    }
  };
  return { zavolej, dohled };
}

test('volný kód vrátí identifikaci školy', async () => {
  const { zavolej, dohled } = nactiRoute({ stav: 'volny' });
  const { telo, status } = await zavolej();
  assert.equal(status, 200);
  assert.equal(telo.stav, 'volny');
  assert.equal(telo.skola.nazev, SKOLA.nazev, 'chybí plný název z rejstříku');
  assert.equal(telo.skola.ico, SKOLA.ico);
  assert.equal(dohled.identifikaceVolana, 1);
});

test('rozbitá identifikace platný kód neshodí', async () => {
  // Bez ošetření by škola s platným kódem dostala HTTP 500 a správce nezaložila.
  // Formulář se bez identifikace vykreslí dál, jen ochuzený.
  const { zavolej, dohled } = nactiRoute({ stav: 'volny', identifikace: 'selze' });
  const { telo, status } = await zavolej();
  assert.equal(status, 200, 'selhání identifikace nesmí skončit chybou');
  assert.equal(telo.stav, 'volny');
  assert.equal(telo.skola, null);
  assert.equal(telo.nazev, 'Gymnázium', 'název z katalogu zůstává');
  assert.ok(dohled.chyby.length > 0, 'selhání se nikde nezaznamenalo');
});

for (const stav of ['uplatnen', 'skola_ma_spravce']) {
  test(`kód ve stavu ${stav} identifikaci nečte ani neposílá`, async () => {
    // Adresa a IČO ke kódu, se kterým už nikdo nic nesvede, nemají kam sloužit —
    // a rejstřík by se kvůli nim četl zbytečně.
    const { zavolej, dohled } = nactiRoute({ stav });
    const { telo } = await zavolej();
    assert.equal(telo.stav, stav);
    assert.equal(telo.skola, null);
    assert.equal(dohled.identifikaceVolana, 0, 'rejstřík se četl zbytečně');
  });
}

test('neplatný kód neprozradí žádnou školu', async () => {
  // Kdyby odpověď nesla název, dal by se cizí kód hádat a podle odpovědi ověřit.
  const { zavolej, dohled } = nactiRoute({ stav: 'neplatny', redizo: null });
  const { telo } = await zavolej();
  assert.deepEqual(telo, { stav: 'neplatny' });
  assert.equal(dohled.identifikaceVolana, 0);
});
