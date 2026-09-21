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
    '@/lib/portal-relace': {
      stavKodu: async () => {
        if (stav === 'db_selze') throw new Error('Neon je nedostupný');
        return { stav, redizo };
      },
    },
    '@/lib/portal-skol': { getNazevSkoly: async () => nazev },
    '@/lib/portal-identifikace': {
      getIdentifikaceSkoly: async (r, n) => {
        dohled.identifikaceVolana += 1;
        // Přesně to, co vrátí reálný modul, když rejstřík chybí: katalogový
        // název, prázdné IČO a adresa, ale REDIZO vždycky.
        if (identifikace === 'bez-rejstriku') return { redizo: r, nazev: n, ico: '', adresa: '', profil: null };
        return { ...SKOLA, redizo: r, nazev: SKOLA.nazev || n };
      },
    },
    '@/lib/portal-api': {
      chyba: (zprava, status) => ({ telo: { error: zprava }, status }),
      odpovedNaChybu: (e, kontext) => {
        dohled.chyby.push(`${kontext}: ${e.message}`);
        return { telo: { error: 'Něco se pokazilo.' }, status: 500 };
      },
      ipZPozadavku: () => '127.0.0.1',
      jeOmezeno: () => false,
    },
  })('src/app/api/portal/kod/route.ts');

  // Stub se nasazuje až kolem samotného volání a hned se vrací. Nasadit ho
  // jednou za celý modul by znamenalo, že druhé volání už nic nezaznamená a
  // neuklizený stub přežije do dalších testů v souboru.
  const zavolej = async () => {
    const puvodniError = console.error;
    console.error = (...a) => dohled.chyby.push(a.join(' '));
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

test('chybějící rejstřík nenechá školu bez identifikace', () => {
  // Realistické zhoršení: rejstřík se nepřibalí do serverless bundle (stalo se
  // už v a28142d). `getIdentifikaceSkoly` nehází — vrátí záznam bez IČO a adresy.
  // REDIZO v něm musí zůstat, jinak by člověk zakládal správce školy, kterou
  // poznal jen podle obecného slova „Gymnázium“.
  return (async () => {
    const { zavolej } = nactiRoute({ stav: 'volny', identifikace: 'bez-rejstriku' });
    const { telo, status } = await zavolej();
    assert.equal(status, 200);
    assert.equal(telo.skola.redizo, '600006247', 'ztratilo se REDIZO');
    assert.equal(telo.skola.ico, '', 'IČO z rejstříku být nemá');
  })();
});

test('škola bez profilu kód nespálí', () => {
  // `getNazevSkoly` hledá jen v zobrazovaném ročníku katalogu; 253 z 1362 škol
  // v rejstříku tam dnes není a po přepnutí na 2027 tam nebude žádná. Bez téhle
  // větve se nabídne založení, kód se nevratně spotřebuje a profil pak skončí
  // na „školu neznáme“ — druhý kód škola nedostane.
  return (async () => {
    const { zavolej, dohled } = nactiRoute({ stav: 'volny', nazev: '' });
    const { telo, status } = await zavolej();
    assert.equal(status, 200);
    assert.equal(telo.stav, 'skola_nenalezena', 'formulář se nabídl i bez profilu k editaci');
    assert.equal(telo.skola, null);
    assert.equal(dohled.identifikaceVolana, 0);
  })();
});

test('spotřebovaný kód netvrdí, že platí, ani u školy mimo katalog', async () => {
  // Stav kódu se posuzuje dřív než katalog. Kdyby to bylo obráceně, dostal by
  // člověk hlášku „škola nemá profil, váš kód zůstává platný“ ke kódu, který je
  // nenávratně spotřebovaný — a zkoušel by ho znovu.
  for (const stav of ['uplatnen', 'skola_ma_spravce']) {
    const { zavolej } = nactiRoute({ stav, nazev: '' });
    const { telo } = await zavolej();
    assert.equal(telo.stav, stav, `stav ${stav} přebil katalog`);
  }
});

test('výpadek databáze skončí hláškou, ne neošetřenou výjimkou', () => {
  // `stavKodu` sahá do Neonu. Bez obalu by odmítnutý slib probublal ven jako
  // neošetřených 500; sousední routy portálu se všechny opírají o odpovedNaChybu.
  return (async () => {
    const { zavolej, dohled } = nactiRoute({ stav: 'db_selze' });
    const { status } = await zavolej();
    assert.equal(status, 500);
    assert.ok(dohled.chyby.some((c) => c.startsWith('ověření kódu:')), 'chyba se nezaznamenala s kontextem');
  })();
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
