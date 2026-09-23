// ============================================================================
// Formulář pro nahlášení akce (docs/veletrhy-skol-2027.md § 5.5).
//
// Endpoint dosud neměl test a oponentura v něm našla čtyři chyby: tichý
// úspěch bez pošty, `null` v těle shodilo handler, neplatná data prošla
// a po vyčerpání limitu odpověď tvrdila, že hlášení už máme. Testy hlídají
// jedno pravidlo: **web nesmí potvrdit přijetí hlášení, které nikde není.**
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST, overVstup, jeDatumPlatne, jeUrlPlatna } from '../src/app/api/veletrhy/nahlasit/route.ts';
import { readFileSync } from 'node:fs';
import { nastavPoolProTesty } from '../src/lib/novinky-db.ts';

/**
 * Databáze, která si pamatuje, co do ní přišlo. Test se nikdy nesmí
 * dotknout skutečné databáze — jinak by podle nastavení prostředí buď
 * zapisoval testovací hlášení do provozu, nebo tiše měnil výsledek.
 */
function poolPamet({ selhatInsert = false, visetNavzdy = false } = {}) {
  const zapsane = [];
  // Sloupce, které migrace opravdu zakládá. Kdyby se INSERT rozešel s
  // migrací, dřív to testy nepoznaly: stačilo jim slovo „insert“ v SQL.
  const sloupceMigrace = new Set(
    (readFileSync('db/migrace/005-veletrhy.sql', 'utf-8').match(/^\s{2}(\w+)\s+\S/gm) ?? [])
      .map((r) => r.trim().split(/\s+/)[0]),
  );
  const spojeni = {
    async dotaz(sql, hodnoty) {
      if (visetNavzdy) return new Promise(() => {});
      if (/insert into veletrh_nahlaseni/i.test(sql)) {
        if (selhatInsert) throw new Error('INSERT selhal');
        const uvedene = sql.match(/\(([^)]*)\)\s*values/i)?.[1] ?? '';
        for (const sloupec of uvedene.split(',').map((c) => c.trim()).filter(Boolean)) {
          if (!sloupceMigrace.has(sloupec)) {
            throw new Error(`Sloupec ${sloupec} v migraci 005-veletrhy.sql není.`);
          }
        }
        zapsane.push({ hodnoty, odeslanoMailem: false });
        return { rows: [{ id: zapsane.length }] };
      }
      if (/update veletrh_nahlaseni/i.test(sql)) {
        const z = zapsane[Number(hodnoty[0]) - 1];
        if (z) z.odeslanoMailem = true;
        return { rows: [] };
      }
      return { rows: [] };
    },
  };
  return {
    zapsane,
    pool: {
      async connect() {
        if (visetNavzdy) return new Promise(() => {});
        return { query: (sql, h) => spojeni.dotaz(sql, h), release() {} };
      },
      query: (sql, h) => spojeni.dotaz(sql, h),
    },
  };
}

const PLATNE = {
  nazev: 'Veletrh středních škol',
  start: '2026-11-13',
  adresa: 'Kulturní dům, Hlavní 1',
  mesto: 'Jihlava',
  krajKod: 'CZ063',
  url: 'https://example.cz/veletrh',
  poradatel: 'Krajský úřad',
  email: 'kontakt@example.cz',
};

test('platné nahlášení projde', () => {
  const v = overVstup(PLATNE);
  assert.ok('data' in v, `Platný vstup neprošel: ${'chyba' in v ? v.chyba : ''}`);
});

test('neexistující datum neprojde', () => {
  assert.equal(jeDatumPlatne('2026-02-30'), false, '30. únor neexistuje.');
  assert.equal(jeDatumPlatne('2026-99-99'), false, 'Měsíc 99 neexistuje.');
  assert.equal(jeDatumPlatne('2026-11-13'), true);

  const v = overVstup({ ...PLATNE, start: '2026-02-30' });
  assert.ok('chyba' in v, 'Nahlášení s neexistujícím datem musí být odmítnuto.');
});

test('rozbitá adresa neprojde', () => {
  assert.equal(jeUrlPlatna('https://a b.cz'), false, 'Mezera v adrese.');
  assert.equal(jeUrlPlatna('javascript:alert(1)'), false, 'Jiný protokol než http(s).');
  assert.equal(jeUrlPlatna('https://example.cz/akce'), true);

  const v = overVstup({ ...PLATNE, url: 'https://a b.cz' });
  assert.ok('chyba' in v, 'Nahlášení s rozbitou adresou musí být odmítnuto.');
});

test('přehnaně dlouhý vstup neprojde', () => {
  const v = overVstup({ ...PLATNE, nazev: 'x'.repeat(5000) });
  assert.ok('chyba' in v, 'Pět tisíc znaků v názvu akce musí být odmítnuto.');
});

test('konec dřív než začátek neprojde', () => {
  const v = overVstup({ ...PLATNE, start: '2026-11-13', end: '2026-11-10' });
  assert.ok('chyba' in v, 'Akce nemůže skončit dřív, než začne.');
});

test('chybějící povinné pole neprojde', () => {
  for (const pole of ['nazev', 'adresa', 'mesto', 'poradatel', 'email']) {
    const v = overVstup({ ...PLATNE, [pole]: '' });
    assert.ok('chyba' in v, `Prázdné pole ${pole} musí být odmítnuto.`);
  }
});

test('neznámý kraj neprojde', () => {
  const v = overVstup({ ...PLATNE, krajKod: 'CZ999' });
  assert.ok('chyba' in v, 'Kraj mimo číselník musí být odmítnut.');
});

/** Společné nastavení pro testy, které volají skutečný POST. */
function pripravProstredi(t, { produkce = true } = {}) {
  const puvodni = {
    NODE_ENV: process.env.NODE_ENV,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
  };
  t.after(() => {
    for (const [klic, hodnota] of Object.entries(puvodni)) {
      if (hodnota === undefined) delete process.env[klic];
      else process.env[klic] = hodnota;
    }
    nastavPoolProTesty(null);
  });
  process.env.NODE_ENV = produkce ? 'production' : 'development';
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'error', () => {});
  // Každý test jiná IP i e-mail, aby se nesdílel čítač rate limitu.
  const poradi = (pripravProstredi.pocitadlo = (pripravProstredi.pocitadlo ?? 0) + 1);
  const ip = `198.51.100.${poradi}`;
  const posta = t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 200 }));
  const posli = (telo) => POST(new NextRequest('https://example.cz/api/veletrhy/nahlasit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    // Každý test svůj e-mail, aby se čítače rate limitu nesčítaly mezi testy.
    body: JSON.stringify(
      telo && typeof telo === 'object' && !Array.isArray(telo)
        ? { ...telo, email: `test${poradi}@example.cz` }
        : telo,
    ),
  }));
  return { posta, posli, ip };
}

test('POST ověřuje přijetí i chybové odpovědi bez skutečného odesílání pošty', async (t) => {
  const puvodni = { NODE_ENV: process.env.NODE_ENV, RESEND_API_KEY: process.env.RESEND_API_KEY };
  t.after(() => {
    for (const [klic, hodnota] of Object.entries(puvodni)) {
      if (hodnota === undefined) delete process.env[klic];
      else process.env[klic] = hodnota;
    }
  });
  process.env.NODE_ENV = 'production';
  // Bez databáze: tenhle test popisuje chování, kdy hlášení drží jen pošta.
  const puvodniDb = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  nastavPoolProTesty(null);
  t.after(() => {
    if (puvodniDb === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = puvodniDb;
    nastavPoolProTesty(null);
  });
  let ted = Date.parse('2026-09-22T10:00:00Z');
  t.mock.method(Date, 'now', () => ted);
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'error', () => {});
  const posta = t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 200 }));
  const posli = (telo, ip = '192.0.2.1') => POST(new NextRequest('https://example.cz/api/veletrhy/nahlasit', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(telo),
  }));

  for (const telo of [null, [], 42, 'text', { ...PLATNE, start: '2026-02-30' }, { ...PLATNE, url: 'https://a b.cz' }]) {
    assert.equal((await posli(telo)).status, 400);
  }
  assert.equal(posta.mock.callCount(), 0);

  delete process.env.RESEND_API_KEY;
  assert.equal(
    (await posli(PLATNE)).status,
    503,
    'Produkce bez pošty i bez databáze nesmí potvrdit přijetí.',
  );
  assert.equal(posta.mock.callCount(), 0);

  process.env.RESEND_API_KEY = 'testovaci-klic';
  for (const status of [429, 500]) {
    ted += 15 * 60_000;
    posta.mock.mockImplementation(async () => new Response('{}', { status }));
    assert.equal((await posli(PLATNE)).status, 503, `Odmítnutí poštou ${status} nesmí být úspěch.`);
  }
  ted += 15 * 60_000;
  posta.mock.mockImplementation(async () => { throw new Error('Výpadek spojení'); });
  assert.equal((await posli(PLATNE)).status, 503);

  ted += 15 * 60_000;
  posta.mock.mockImplementation(async () => new Response('{}', { status: 200 }));
  for (let i = 0; i < 3; i++) assert.equal((await posli(PLATNE)).status, 200);
  const predLimitem = posta.mock.callCount();
  const limit = await posli(PLATNE);
  assert.equal(limit.status, 429);
  assert.equal(limit.headers.get('Retry-After'), '900');
  assert.doesNotMatch((await limit.json()).error, /už jsme přijali/);
  assert.equal(posta.mock.callCount(), predLimitem, 'Blokovaný pokus nesmí poslat poštu.');

  // Zablokovaná IP musí započítat i pokusy nového e-mailu.
  const dalsi = { ...PLATNE, email: 'dalsi@example.cz' };
  for (let i = 0; i < 3; i++) assert.equal((await posli(dalsi)).status, 429);
  assert.equal((await posli(dalsi, '192.0.2.2')).status, 429);
  ted += 15 * 60_000;
  assert.equal((await posli(dalsi, '192.0.2.2')).status, 200, 'Po uplynutí okna lze hlásit znovu.');
  const payload = JSON.parse(posta.mock.calls.at(-1).arguments[1].body);
  assert.equal(payload.reply_to, dalsi.email);
  assert.ok(payload.text.includes(PLATNE.url));
});

test('uložené hlášení se potvrdí, i když pošta selže', async (t) => {
  // Kvůli tomuhle databázová fronta vznikla: výpadek pošty nesmí znamenat,
  // že hlášení zmizí. Když je záznam v databázi, přijetí potvrdit smíme.
  const prostredi = pripravProstredi(t);
  const { pool, zapsane } = poolPamet();
  nastavPoolProTesty(pool);
  process.env.DATABASE_URL = 'postgres://test';
  process.env.RESEND_API_KEY = 'testovaci-klic';
  prostredi.posta.mock.mockImplementation(async () => new Response('{}', { status: 500 }));

  const odpoved = await prostredi.posli(PLATNE);
  assert.equal(odpoved.status, 200, 'Hlášení je v databázi, takže přijetí potvrdit smíme.');
  assert.equal(zapsane.length, 1, 'Hlášení se muselo uložit do fronty.');
  assert.equal(zapsane[0].odeslanoMailem, false, 'Neodeslaná pošta se nesmí označit za odeslanou.');
});

test('úspěšná pošta se v databázi poznamená', async (t) => {
  const prostredi = pripravProstredi(t);
  const { pool, zapsane } = poolPamet();
  nastavPoolProTesty(pool);
  process.env.DATABASE_URL = 'postgres://test';
  process.env.RESEND_API_KEY = 'testovaci-klic';

  assert.equal((await prostredi.posli(PLATNE)).status, 200);
  assert.equal(zapsane[0].odeslanoMailem, true, 'Odeslanou poštu je potřeba poznamenat.');
});

test('ve vývoji bez pošty se hlášení neoznačí za odeslané', async (t) => {
  // Log v konzoli je dohledatelné místo, takže přijetí potvrdíme — ale
  // tvrdit, že e-mail odešel, by byla lež i ve vývoji.
  const prostredi = pripravProstredi(t, { produkce: false });
  const { pool, zapsane } = poolPamet();
  nastavPoolProTesty(pool);
  process.env.DATABASE_URL = 'postgres://test';
  delete process.env.RESEND_API_KEY;

  assert.equal((await prostredi.posli(PLATNE)).status, 200);
  assert.equal(zapsane[0].odeslanoMailem, false, 'Bez pošty nesmí být příznak odeslání pravdivý.');
});

test('nedostupná databáze nezablokuje záložní poštu', async (t) => {
  // Pool nemá timeout: visící connect() by bez limitu zdržel i e-mail
  // a hlášení by neskončilo nikde.
  const prostredi = pripravProstredi(t);
  const { pool } = poolPamet({ visetNavzdy: true });
  nastavPoolProTesty(pool);
  process.env.DATABASE_URL = 'postgres://test';
  process.env.RESEND_API_KEY = 'testovaci-klic';

  const zacatek = Date.now();
  const odpoved = await prostredi.posli(PLATNE);
  assert.equal(odpoved.status, 200, 'Pošta musí hlášení zachránit, i když databáze neodpovídá.');
  assert.equal(prostredi.posta.mock.callCount(), 1, 'E-mail se musel odeslat.');
  assert.ok(Date.now() - zacatek < 10_000, 'Čekání na databázi musí mít strop.');
});

test('selhání databáze i pošty se přizná', async (t) => {
  const prostredi = pripravProstredi(t);
  const { pool } = poolPamet({ selhatInsert: true });
  nastavPoolProTesty(pool);
  process.env.DATABASE_URL = 'postgres://test';
  process.env.RESEND_API_KEY = 'testovaci-klic';
  prostredi.posta.mock.mockImplementation(async () => new Response('{}', { status: 500 }));

  assert.equal(
    (await prostredi.posli(PLATNE)).status,
    503,
    'Když hlášení neskončí nikde, nesmíme potvrdit přijetí.',
  );
});

test('INSERT v kódu sedí na sloupce, které migrace zakládá', async (t) => {
  // Mutační test kola 4 ukázal, že tohle testy nepoznaly: přejmenování
  // sloupce v migraci by rozbilo zápis až v provozu.
  const prostredi = pripravProstredi(t);
  const { pool, zapsane } = poolPamet();
  nastavPoolProTesty(pool);
  process.env.DATABASE_URL = 'postgres://test';
  process.env.RESEND_API_KEY = 'testovaci-klic';

  assert.equal((await prostredi.posli(PLATNE)).status, 200);
  assert.equal(zapsane.length, 1, 'INSERT musel projít kontrolou sloupců proti migraci.');
});

test('migrace fronty hlášení drží pravidla z návrhu', async () => {
  // Fronta je jediné místo, kde hlášení přežije výpadek pošty. Test hlídá,
  // že migrace nese stavy, o které se opírá § 6.3, a že se hlášení nemaže.
  const fs = await import('node:fs/promises');
  const sql = await fs.readFile('db/migrace/005-veletrhy.sql', 'utf-8');

  assert.ok(sql.includes('veletrh_nahlaseni'), 'Migrace musí zakládat tabulku fronty.');
  for (const stav of ['nove', 'overeno', 'zamitnuto', 'duplicita']) {
    assert.ok(sql.includes(`'${stav}'`), `Stav ${stav} chybí — § 6.3 s ním počítá.`);
  }
  assert.ok(
    sql.includes('odeslano_mailem'),
    'Záznam musí vést, jestli hlášení odešlo i e-mailem; jinak nejde dohledat, co pošta spolkla.',
  );
  assert.ok(!/delete\s+from\s+veletrh_nahlaseni/i.test(sql), 'Zamítnutá hlášení se nemažou.');
});
