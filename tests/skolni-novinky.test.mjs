import test from 'node:test';
import assert from 'node:assert/strict';
import { novinkySkoly } from '../src/lib/skolni-novinky.ts';
import { nastavPoolProTesty } from '../src/lib/novinky-db.ts';

/**
 * Čtecí vrstva školních novinek: testuje se to, co uvidí rodič, ne mezikrok.
 *
 * Falešný pool odpovídá podle pořadí dotazů (přepínače → položky → zdroj),
 * takže testy ověřují **kontrakt** modulu: platnost k času dotazu, přepínače
 * při čtení a fail-closed při výpadku.
 */
function pool(odpovedi) {
  let i = 0;
  const klient = {
    query: async () => odpovedi[i++] ?? { rows: [], rowCount: 0 },
    release() {},
  };
  return { connect: async () => klient, query: klient.query };
}

function radek(prepis = {}) {
  return {
    id: 'n1',
    titulek: 'Den otevřených dveří pro uchazeče',
    url: 'https://skola.cz/dod',
    publikovano: '2026-09-01T00:00:00.000Z',
    zobrazeni: 'karta_terminu',
    tridy: ['dod'],
    terminy: ['2026-12-09'],
    duvod: 'vazba událost–termín–konání doložena',
    konec_platnosti: '2026-12-12T00:00:00.000Z',
    ...prepis,
  };
}

const ZDROJ = { rows: [{ feed_url: 'https://skola.cz/feed/', naposledy_ok: '2026-09-20T04:10:00.000Z', chyby_v_rade: 0 }], rowCount: 1 };

test.afterEach(() => {
  nastavPoolProTesty(null);
  delete process.env.DATABASE_URL;
});

test('bez DATABASE_URL se nic netvrdí – vrací null, ne prázdný seznam', async () => {
  // Prázdný seznam by na stránce znamenal „škola nemá novinky"; to nevíme.
  assert.equal(await novinkySkoly('600001111'), null);
});

test('výpadek databáze se propaguje jako chyba, ne jako nula novinek', async () => {
  process.env.DATABASE_URL = 'postgres://test';
  nastavPoolProTesty({
    connect: async () => ({ query: async () => { throw new Error('spojení selhalo'); }, release() {} }),
    query: async () => { throw new Error('spojení selhalo'); },
  });
  await assert.rejects(() => novinkySkoly('600001111'));
});

test('termínová karta se ukáže, dokud termín nenastal', async () => {
  process.env.DATABASE_URL = 'postgres://test';
  nastavPoolProTesty(pool([{ rows: [], rowCount: 0 }, { rows: [radek()], rowCount: 1 }, ZDROJ]));
  const v = await novinkySkoly('600001111', new Date('2026-11-01T10:00:00Z'));
  assert.equal(v.polozky[0].zobrazeni, 'karta_terminu');
  assert.deepEqual(v.polozky[0].terminy, ['2026-12-09']);
  assert.equal(v.zdrojOverenAt, '2026-09-20T04:10:00.000Z');
});

test('proběhlý termín přestane být pozvánkou, i když sklízeč zatím neběžel', async () => {
  // Platnost se počítá k času dotazu. Sklízeč běží dvakrát denně, takže
  // „budoucí při sklizni" by nechalo včerejší termín viset jako pozvánku.
  process.env.DATABASE_URL = 'postgres://test';
  nastavPoolProTesty(pool([{ rows: [], rowCount: 0 }, { rows: [radek()], rowCount: 1 }, ZDROJ]));
  const v = await novinkySkoly('600001111', new Date('2026-12-10T08:00:00Z'));
  assert.equal(v.polozky[0].zobrazeni, 'odkaz');
  assert.deepEqual(v.polozky[0].terminy, []);
});

test('přepínač skryje jednu položku, ostatní zůstanou', async () => {
  process.env.DATABASE_URL = 'postgres://test';
  nastavPoolProTesty(pool([
    { rows: [{ klic: 'polozka:n1', hodnota: { zapnuto: false } }], rowCount: 1 },
    { rows: [radek(), radek({ id: 'n2', titulek: 'Kritéria přijetí', zobrazeni: 'karta', tridy: ['kriteria'], terminy: [] })], rowCount: 2 },
    ZDROJ,
  ]));
  const v = await novinkySkoly('600001111', new Date('2026-11-01T10:00:00Z'));
  assert.deepEqual(v.polozky.map((p) => p.id), ['n2']);
});

test('vypnuté zvýrazňování třídy sníží kartu na odkaz, ale zprávu neskryje', async () => {
  // Nejistá interpretace znamená odkaz bez karty, ne úplné skrytí zprávy.
  process.env.DATABASE_URL = 'postgres://test';
  nastavPoolProTesty(pool([
    { rows: [{ klic: 'trida:dod', hodnota: { zapnuto: false } }], rowCount: 1 },
    { rows: [radek()], rowCount: 1 },
    ZDROJ,
  ]));
  const v = await novinkySkoly('600001111', new Date('2026-11-01T10:00:00Z'));
  assert.equal(v.polozky.length, 1);
  assert.equal(v.polozky[0].zobrazeni, 'odkaz');
});

test('výpadek zdroje neskryje dříve uložené položky', async () => {
  // Feed neodpovídá ≠ škola nemá novinky; stav zdroje se hlásí zvlášť.
  process.env.DATABASE_URL = 'postgres://test';
  nastavPoolProTesty(pool([
    { rows: [], rowCount: 0 },
    { rows: [radek()], rowCount: 1 },
    { rows: [{ feed_url: 'https://skola.cz/feed/', naposledy_ok: '2026-09-18T04:10:00.000Z', chyby_v_rade: 3 }], rowCount: 1 },
  ]));
  const v = await novinkySkoly('600001111', new Date('2026-11-01T10:00:00Z'));
  assert.equal(v.polozky.length, 1);
  assert.equal(v.zdrojVypadek, true);
});
