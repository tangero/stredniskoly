/**
 * Kontroly vyhledávání měst.
 *
 * Nález 4 z oponentury PR #139: API vracelo města správně, ale hlavička je
 * nezpracovávala, takže „Pardubice“ přehled města nenabídly. Vykreslit
 * `Header.tsx` v testu by znamenalo obsluhovat `useRouter` a klientské háky,
 * proto se kontroluje zvlášť dotazovací vrstva a zvlášť to, že ji hlavička
 * čte, vykresluje a ukládá do mezipaměti.
 *
 * Spuštění: npm run test:mesto (soubor běží spolu s přehledem města)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GET } from '../src/app/api/schools/search/route.ts';
import { MESTA } from '../src/lib/mesta.mjs';

const HEADER = readFileSync(new URL('../src/components/Header.tsx', import.meta.url), 'utf-8');

async function hledej(dotaz, limit = 10) {
  const url = `http://localhost/api/schools/search?search=${encodeURIComponent(dotaz)}&limit=${limit}`;
  const res = await GET({ nextUrl: new URL(url) });
  return res.json();
}

test('API nabídne město s přehledem škol', async () => {
  const data = await hledej('pardubice');
  assert.ok(Array.isArray(data.mesta), 'odpověď nemá pole mesta');
  const pardubice = data.mesta.find(m => m.nazev === 'Pardubice');
  assert.ok(pardubice, 'Pardubice nejsou mezi nalezenými městy');
  assert.equal(pardubice.slug, 'pardubice');
  assert.ok(pardubice.skol > 0, 'město bez škol se nabízet nemá');
});

test('API vrací města i při limitu, který používá hlavička', async () => {
  // Nález 4 se projevoval právě při limit=10; kdyby se města počítala až
  // z odstránkovaného seznamu, tady by zmizela.
  for (const limit of [1, 5, 10, 50]) {
    const data = await hledej('pardubice', limit);
    assert.ok(
      data.mesta?.some(m => m.slug === 'pardubice'),
      `při limit=${limit} chybí Pardubice mezi městy`,
    );
  }
});

test('shoda je od začátku slova a bez ohledu na diakritiku a velikost písmen', async () => {
  for (const dotaz of ['pardub', 'PARDUBICE', 'Pardubice']) {
    const data = await hledej(dotaz);
    assert.ok(
      data.mesta?.some(m => m.slug === 'pardubice'),
      `dotaz „${dotaz}“ Pardubice nenašel`,
    );
  }
  // Uvnitř slova se neshoduje, jinak by „brno“ našlo Dobronín.
  const uvnitr = await hledej('ardubic');
  assert.equal(
    uvnitr.mesta?.length ?? 0, 0,
    'shoda uvnitř slova by nabízela nesouvisející města',
  );
});

test('obecný dotaz město nenabídne', async () => {
  const data = await hledej('gymnazium');
  assert.equal(data.mesta?.length ?? 0, 0, 'název oboru nemá nabízet město');
  assert.ok(data.schools.length > 0, 'obecný dotaz nenašel žádnou školu');
});

test('nabízená města mají stránku v seznamu měst', async () => {
  const znama = new Set(MESTA.map(m => m.slug));
  for (const dotaz of ['praha', 'brno', 'karlovy', 'chrudim']) {
    for (const mesto of (await hledej(dotaz)).mesta ?? []) {
      assert.ok(znama.has(mesto.slug), `${mesto.nazev}: odkaz by vedl na 404`);
    }
  }
});

test('hlavička města zpracovává, vykresluje i cachuje', () => {
  // Nález 4: bez těchto čtyř míst zůstane odpověď API nevyužitá.
  assert.match(HEADER, /data\.mesta/, 'hlavička nečte pole mesta z odpovědi API');
  // Nestačí, že se `setSearchMesta` v souboru vyskytuje: musí se volat i nad
  // čerstvou odpovědí, ne jen nad mezipamětí. Odstranění tohoto jednoho řádku
  // bylo přesně to, co test dřív přehlédl.
  assert.match(
    HEADER, /setSearchMesta\(mesta\)/,
    'hlavička nepředá města z odpovědi API do stavu',
  );
  assert.match(HEADER, /href=\{`\/mesto\/\$\{mesto\.slug\}`\}/, 'hlavička neodkazuje na přehled města');
  assert.match(HEADER, /kompletní přehled škol/, 'hlavička nevykresluje popisek přehledu');
  // Mezipaměť musí města nést, jinak se po druhém napsání dotazu ztratí.
  assert.match(
    HEADER, /expiresAt: number; results: SearchResult\[\]; mesta: NalezeneMesto\[\]/,
    'mezipaměť hlavičky neukládá města',
  );
  assert.match(HEADER, /setSearchMesta\(cached\.mesta\)/, 'hlavička nečte města z mezipaměti');
  // Prázdný stav musí brát města v potaz, jinak se hláška „nic nenalezeno“
  // ukáže i tehdy, když město nalezené je.
  assert.match(
    HEADER, /searchResults\.length === 0 && searchMesta\.length === 0/,
    'prázdný stav hlavičky nepočítá s nalezenými městy',
  );
});
