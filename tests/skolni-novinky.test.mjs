import test from 'node:test';
import assert from 'node:assert/strict';
import { novinkySkoly } from '../src/lib/skolni-novinky.ts';
import { nastavPoolProTesty } from '../src/lib/novinky-db.ts';

/**
 * Čtecí vrstva školních novinek: testuje se to, co uvidí rodič, ne mezikrok.
 *
 * Falešný pool odpovídá podle pořadí dotazů (přepínače → zprávy k přijímačkám →
 * zprávy ze života školy → zdroj), takže testy ověřují **kontrakt** modulu:
 * platnost k času dotazu, přepínače při čtení a fail-closed při výpadku.
 *
 * Pořadí je v testech vidět schválně: kdyby modul dotazy prohodil nebo jeden
 * vynechal, testy to mají odhalit, ne mlčky přejít.
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

const PRAZDNO = { rows: [], rowCount: 0 };
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

test('pozvánka se ukáže jako karta, ale termín do odpovědi nejde', async () => {
  // Karta říká, o čem zpráva je, a vede na článek školy; datum si čtenář
  // přečte tam. Sloupec `terminy` zůstává v databázi pro dohled a platnost.
  process.env.DATABASE_URL = 'postgres://test';
  nastavPoolProTesty(pool([{ rows: [], rowCount: 0 }, { rows: [radek()], rowCount: 1 }, PRAZDNO, ZDROJ]));
  const v = await novinkySkoly('600001111', new Date('2026-11-01T10:00:00Z'));
  assert.equal(v.polozky[0].zobrazeni, 'karta');
  assert.equal('terminy' in v.polozky[0], false);
  assert.equal(v.zdrojOverenAt, '2026-09-20T04:10:00.000Z');
});

test('položka uložená starými pravidly se přečte jako karta', async () => {
  // V databázi leží `karta_terminu`, dokud ji nepřepočítá další sklizeň.
  process.env.DATABASE_URL = 'postgres://test';
  nastavPoolProTesty(pool([
    { rows: [], rowCount: 0 },
    { rows: [radek({ zobrazeni: 'karta_terminu' })], rowCount: 1 },
    PRAZDNO, ZDROJ,
  ]));
  const v = await novinkySkoly('600001111', new Date('2026-11-01T10:00:00Z'));
  assert.equal(v.polozky[0].zobrazeni, 'karta');
});

test('proběhlý termín přestane být pozvánkou, i když sklízeč zatím neběžel', async () => {
  // Platnost se počítá k času dotazu. Sklízeč běží dvakrát denně, takže
  // „budoucí při sklizni" by nechalo včerejší termín viset jako pozvánku.
  process.env.DATABASE_URL = 'postgres://test';
  nastavPoolProTesty(pool([{ rows: [], rowCount: 0 }, { rows: [radek()], rowCount: 1 }, PRAZDNO, ZDROJ]));
  const v = await novinkySkoly('600001111', new Date('2026-12-10T08:00:00Z'));
  assert.equal(v.polozky[0].zobrazeni, 'odkaz');
});

test('přepínač skryje jednu položku, ostatní zůstanou', async () => {
  process.env.DATABASE_URL = 'postgres://test';
  nastavPoolProTesty(pool([
    { rows: [{ klic: 'polozka:n1', hodnota: { zapnuto: false } }], rowCount: 1 },
    { rows: [radek(), radek({ id: 'n2', titulek: 'Kritéria přijetí', zobrazeni: 'karta', tridy: ['kriteria'], terminy: [] })], rowCount: 2 },
    PRAZDNO,
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
    PRAZDNO,
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
    PRAZDNO,
    { rows: [{ feed_url: 'https://skola.cz/feed/', naposledy_ok: '2026-09-18T04:10:00.000Z', chyby_v_rade: 3 }], rowCount: 1 },
  ]));
  const v = await novinkySkoly('600001111', new Date('2026-11-01T10:00:00Z'));
  assert.equal(v.polozky.length, 1);
  assert.equal(v.zdrojVypadek, true);
});

test('důležitá zpráva se dostane na stránku, i když ji přebilo pět novějších', async () => {
  // Nález z provozu (škola 600011801, 20. 9. 2026): pozvánku na den otevřených
  // dveří vytlačila nabídka práce pro dojiče, protože výběr pěti položek
  // probíhal podle data dřív, než se vědělo, co je co.
  process.env.DATABASE_URL = 'postgres://test';
  const novejsi = Array.from({ length: 5 }, (_, i) =>
    radek({
      id: `z${i}`,
      titulek: `Vyhlášení ${i}. kola přijímacího řízení`,
      publikovano: `2026-09-1${i}T00:00:00.000Z`,
      zobrazeni: 'odkaz',
      tridy: ['prijimaci_rizeni'],
      terminy: [],
      konec_platnosti: null,
    }),
  );
  const dod = radek({ id: 'dod', publikovano: '2026-09-02T00:00:00.000Z', terminy: ['2026-10-01'] });
  nastavPoolProTesty(pool([
    { rows: [], rowCount: 0 },
    { rows: [...novejsi.reverse(), dod], rowCount: 6 },
    PRAZDNO,
    ZDROJ,
  ]));
  const v = await novinkySkoly('600011801', new Date('2026-09-20T10:00:00Z'));
  assert.equal(v.polozky.length, 5);
  assert.equal(v.polozky[0].id, 'dod');
  assert.equal(v.polozky[0].zobrazeni, 'karta');
  // Vypadne nejstarší z běžných zpráv, ne pozvánka.
  assert.deepEqual(v.polozky.slice(1).map((p) => p.id), ['z4', 'z3', 'z2', 'z1']);
});

test('bez karty s termínem zůstává pořadí podle data a bere se prvních pět', async () => {
  process.env.DATABASE_URL = 'postgres://test';
  const zpravy = Array.from({ length: 6 }, (_, i) =>
    radek({
      id: `z${i}`,
      publikovano: `2026-09-0${6 - i}T00:00:00.000Z`,
      zobrazeni: 'odkaz',
      tridy: ['prijimaci_rizeni'],
      terminy: [],
      konec_platnosti: null,
    }),
  );
  nastavPoolProTesty(pool([{ rows: [], rowCount: 0 }, { rows: zpravy, rowCount: 6 }, PRAZDNO, ZDROJ]));
  const v = await novinkySkoly('600011801', new Date('2026-09-20T10:00:00Z'));
  assert.deepEqual(v.polozky.map((p) => p.id), ['z0', 'z1', 'z2', 'z3', 'z4']);
});

test('zprávy ze života školy se vedou zvlášť a neberou místo přijímačkám', async () => {
  // Výlet primy je pro rodiče zajímavý, ale nesmí vytlačit termín dne
  // otevřených dveří. Proto dva dotazy a dva seznamy, ne jeden společný.
  process.env.DATABASE_URL = 'postgres://test';
  const zivot = Array.from({ length: 3 }, (_, i) =>
    radek({
      id: `s${i}`,
      titulek: `Prima na seznamovacím kurzu ${i}`,
      publikovano: `2026-09-1${i}T00:00:00.000Z`,
      zobrazeni: 'seznam',
      tridy: [],
      terminy: [],
      konec_platnosti: null,
    }),
  );
  nastavPoolProTesty(pool([
    PRAZDNO,
    { rows: [radek()], rowCount: 1 },
    { rows: zivot, rowCount: 3 },
    ZDROJ,
  ]));
  const v = await novinkySkoly('600001111', new Date('2026-11-01T10:00:00Z'));
  assert.deepEqual(v.polozky.map((p) => p.id), ['n1']);
  assert.deepEqual(v.zeZivota.map((p) => p.id), ['s0', 's1', 's2']);
});

test('bez data vydání se pošle den, kdy jsme zprávu poprvé viděli', async () => {
  // Feed datum neuvedl, nebo uvedl nesmysl v budoucnosti a sklízeč ho zahodil.
  // „Nevíme kdy" je horší odpověď než „objevilo se mezi dvěma sklizněmi".
  process.env.DATABASE_URL = 'postgres://test';
  nastavPoolProTesty(pool([
    PRAZDNO,
    { rows: [radek({ publikovano: null, vytvoreno: '2026-09-19T04:10:00.000Z' })], rowCount: 1 },
    PRAZDNO,
    ZDROJ,
  ]));
  const v = await novinkySkoly('600001111', new Date('2026-11-01T10:00:00Z'));
  assert.equal(v.polozky[0].publikovano, null);
  assert.equal(v.polozky[0].objevenoAt, '2026-09-19T04:10:00.000Z');
});

test('s datem vydání se datum objevení neposílá, aby stránka neměla dvě data', async () => {
  process.env.DATABASE_URL = 'postgres://test';
  nastavPoolProTesty(pool([
    PRAZDNO,
    { rows: [radek({ vytvoreno: '2026-09-19T04:10:00.000Z' })], rowCount: 1 },
    PRAZDNO,
    ZDROJ,
  ]));
  const v = await novinkySkoly('600001111', new Date('2026-11-01T10:00:00Z'));
  assert.equal(v.polozky[0].objevenoAt, null);
});
