// ============================================================================
// API veletrhů end-to-end nad PGlite (docs/veletrhy-api-2027.md, oddíl 11):
// token Eduardy, idempotence, nanečisto, schválení odkazem a to, že token
// Eduardy schvalovat neumí. Pouští se přes tsx (`npm run test:mesto`),
// protože trasy importují přes alias `@/`.
// ============================================================================

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { NextRequest } from 'next/server';
import { nastavPoolProTesty } from '../src/lib/novinky-db.ts';
import { MIGRACE_VELETRHU } from '../src/lib/veletrhy-schema.ts';
import { seed } from '../src/lib/veletrhy-sklad.ts';
import { snimekAkci, SEZONA, zobrazitelneAkce } from '../src/lib/veletrhy.ts';
import { nactiAkce } from '../src/lib/veletrhy-zdroj.ts';
import { odkazNaRozhodnuti } from '../src/lib/veletrhy-schvaleni.ts';
import * as akce from '../src/app/api/veletrhy/akce/route.ts';
import * as detailAkce from '../src/app/api/veletrhy/akce/[id]/route.ts';
import * as navrhy from '../src/app/api/veletrhy/navrhy/route.ts';
import * as detailNavrhu from '../src/app/api/veletrhy/navrhy/[id]/route.ts';
import * as stahnout from '../src/app/api/veletrhy/navrhy/[id]/stahnout/route.ts';
import * as rozhodnuti from '../src/app/admin/veletrhy/akce/route.ts';

const TOKEN = 'eda-token-0123456789abcdef0123456789abcdef';
const BASE = 'https://www.prijimackynaskolu.cz';

process.env.DATABASE_URL = 'postgres://test';
process.env.VELETRHY_EDA_TOKEN = TOKEN;
process.env.VELETRHY_SECRET = 'tajemstvi-odkazu';
process.env.ADMIN_TOKEN = 'admin-token';
delete process.env.RESEND_API_KEY;
delete process.env.TELEGRAM_BOT_TOKEN;

let db;

/** PGlite jako Pool: jedno spojení, `begin/commit` jdou přes něj. */
function poolZPglite(pg) {
  const query = async (sql, hodnoty = []) => {
    const r = await pg.query(sql, hodnoty);
    return { rows: r.rows, rowCount: r.affectedRows || r.rows.length };
  };
  return { query, connect: async () => ({ query, release: () => {} }) };
}

before(async () => {
  db = new PGlite();
  for (const p of MIGRACE_VELETRHU) await db.exec(p);
  const pool = poolZPglite(db);
  await seed({ dotaz: pool.query }, snimekAkci(), SEZONA);
  nastavPoolProTesty(pool);
});

const pozadavek = (cesta, { method = 'GET', token = TOKEN, telo, hlavicky = {} } = {}) =>
  new NextRequest(`${BASE}${cesta}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(telo ? { 'content-type': 'application/json' } : {}),
      ...hlavicky,
    },
    body: telo ? JSON.stringify(telo) : undefined,
  });

const params = (id) => ({ params: Promise.resolve({ id }) });

const NOVA = {
  id: 'api-test-veletrh-jihlava-2026',
  nazev: 'API test veletrh',
  poradatel: 'Testovací pořadatel',
  mesto: 'Jihlava',
  krajKod: 'CZ063',
  misto: 'Dům kultury',
  start: '2099-11-05',
  end: '2099-11-05',
  datum: '5. listopadu 2099',
  terminPotvrzen: true,
  url: 'https://example.cz/veletrh',
  zdrojOvereni: 'example.cz',
  overeno: '2026-09-20',
};

test('bez tokenu nebo se špatným tokenem 401', async () => {
  assert.equal((await akce.GET(pozadavek('/api/veletrhy/akce', { token: null }))).status, 401);
  assert.equal((await akce.GET(pozadavek('/api/veletrhy/akce', { token: 'spatny' }))).status, 401);
  assert.equal((await navrhy.POST(pozadavek('/api/veletrhy/navrhy', { method: 'POST', token: 'x', telo: {} }))).status, 401);
});

test('seznam akcí: bez ?vse jen zobrazitelné, s ním i nepotvrzené, vždy s verzí', async () => {
  const r = await (await akce.GET(pozadavek('/api/veletrhy/akce'))).json();
  const vse = await (await akce.GET(pozadavek('/api/veletrhy/akce?vse=1'))).json();
  assert.equal(vse.akce.length, snimekAkci().length);
  assert.equal(r.akce.length, zobrazitelneAkce(new Date()).length);
  assert.ok(r.akce.every((a) => a.verze === 1 && a.zobrazena));
  const d = await detailAkce.GET(pozadavek(`/api/veletrhy/akce/${snimekAkci()[0].id}`), params(snimekAkci()[0].id));
  assert.equal((await d.json()).audit[0].udalost, 'seed');
  assert.equal((await detailAkce.GET(pozadavek('/api/veletrhy/akce/neni'), params('neni'))).status, 404);
});

test('založení návrhu: povinný klíč, nanečisto nic neuloží, opakování vrátí týž návrh', async () => {
  const telo = { operace: [{ op: 'pridat', akce: NOVA }], zdrojUrl: NOVA.url, zdrojEmail: 'e-mail pořadatele 2026-09-20' };
  const bezKlice = await navrhy.POST(pozadavek('/api/veletrhy/navrhy', { method: 'POST', telo }));
  assert.equal(bezKlice.status, 400);

  const nanecisto = await navrhy.POST(pozadavek('/api/veletrhy/navrhy?nanecisto=1', { method: 'POST', telo }));
  assert.equal(nanecisto.status, 200);
  assert.equal((await nanecisto.json()).diff[0].op, 'pridat');
  assert.equal((await db.query('select count(*)::int as n from veletrh_navrh')).rows[0].n, 0);

  const klic = { 'idempotency-key': 'api-test-1' };
  const prvni = await navrhy.POST(pozadavek('/api/veletrhy/navrhy', { method: 'POST', telo, hlavicky: klic }));
  assert.equal(prvni.status, 201);
  const { id, stav } = await prvni.json();
  assert.equal(stav, 'ceka');
  const znovu = await (await navrhy.POST(pozadavek('/api/veletrhy/navrhy', { method: 'POST', telo, hlavicky: klic }))).json();
  assert.equal(znovu.id, id);

  const detail = await (await detailNavrhu.GET(pozadavek(`/api/veletrhy/navrhy/${id}`), params(id))).json();
  assert.equal(detail.stav, 'ceka');
  const seznam = await (await navrhy.GET(pozadavek('/api/veletrhy/navrhy?stav=ceka'))).json();
  assert.ok(seznam.navrhy.some((n) => n.id === id));
});

test('neplatný návrh 400 s chybami po polích, kolize id 409, neznámé pole těla 400', async () => {
  const spatne = await navrhy.POST(pozadavek('/api/veletrhy/navrhy', {
    method: 'POST', hlavicky: { 'idempotency-key': 'spatne' },
    telo: { operace: [{ op: 'pridat', akce: { ...NOVA, id: 'jina-2099', zdrojOvereni: 'jan@example.cz' } }] },
  }));
  assert.equal(spatne.status, 400);
  assert.ok((await spatne.json()).chyby.some((c) => c.pole.endsWith('zdrojOvereni')));

  const existujici = snimekAkci()[0];
  const kolize = await navrhy.POST(pozadavek('/api/veletrhy/navrhy?nanecisto=1', {
    method: 'POST', telo: { operace: [{ op: 'pridat', akce: { ...NOVA, id: existujici.id } }] },
  }));
  assert.equal(kolize.status, 409);

  const pole = await navrhy.POST(pozadavek('/api/veletrhy/navrhy?nanecisto=1', { method: 'POST', telo: { operace: [], schvalit: true } }));
  assert.equal(pole.status, 400);
});

test('token Eduardy neumí schválit: trasa rozhodnutí bez odkazu ani cookie vrátí 404', async () => {
  const { id } = (await (await navrhy.GET(pozadavek('/api/veletrhy/navrhy?stav=ceka'))).json()).navrhy[0];
  const form = new FormData();
  form.set('id', id);
  form.set('akce', 'schvalit');
  const r = await rozhodnuti.POST(new NextRequest(`${BASE}/admin/veletrhy/akce`, {
    method: 'POST', body: form, headers: { authorization: `Bearer ${TOKEN}`, origin: BASE },
  }));
  assert.equal(r.status, 404);
  const n = await (await detailNavrhu.GET(pozadavek(`/api/veletrhy/navrhy/${id}`), params(id))).json();
  assert.equal(n.stav, 'ceka');
});

test('schválení podepsaným odkazem provede návrh, cizí původ odmítne', async () => {
  const { id } = (await (await navrhy.GET(pozadavek('/api/veletrhy/navrhy?stav=ceka'))).json()).navrhy[0];
  const t = new URL(odkazNaRozhodnuti(id, process.env.VELETRHY_SECRET)).searchParams.get('t');
  const odeslat = (origin) => {
    const form = new FormData();
    form.set('t', t);
    form.set('akce', 'schvalit');
    return rozhodnuti.POST(new NextRequest(`${BASE}/admin/veletrhy/akce`, { method: 'POST', body: form, headers: { origin } }));
  };
  assert.equal((await odeslat('https://zly.example')).status, 403);

  const r = await odeslat(BASE);
  assert.equal(r.status, 303);
  assert.match(new URL(r.headers.get('location')).searchParams.get('ok'), /^Provedeno/);
  const n = await (await detailNavrhu.GET(pozadavek(`/api/veletrhy/navrhy/${id}`), params(id))).json();
  assert.equal(n.stav, 'provedeno');
  const vse = await (await akce.GET(pozadavek('/api/veletrhy/akce?vse=1'))).json();
  assert.ok(vse.akce.some((a) => a.id === NOVA.id));

  // Druhé kliknutí nic neprovede.
  assert.match(new URL((await odeslat(BASE)).headers.get('location')).searchParams.get('ok'), /už bylo rozhodnuto/);
});

test('stažení jde jen u čekajícího návrhu', async () => {
  const hlavicky = { 'idempotency-key': 'api-test-stahnout' };
  const telo = { operace: [{ op: 'pridat', akce: { ...NOVA, id: 'stahnout-2099', nazev: 'Jiná akce' } }] };
  const { id } = await (await navrhy.POST(pozadavek('/api/veletrhy/navrhy', { method: 'POST', telo, hlavicky }))).json();
  assert.equal((await stahnout.POST(pozadavek(`/api/veletrhy/navrhy/${id}/stahnout`, { method: 'POST' }), params(id))).status, 200);
  const provedeny = (await (await navrhy.GET(pozadavek('/api/veletrhy/navrhy?stav=provedeno'))).json()).navrhy[0];
  const r = await stahnout.POST(pozadavek(`/api/veletrhy/navrhy/${provedeny.id}/stahnout`, { method: 'POST' }), params(provedeny.id));
  assert.equal(r.status, 409);
});

test('web mimo Next.js runtime i při chybě cache čte snímek, nikdy nespadne', async () => {
  assert.deepEqual(await nactiAkce(), snimekAkci());
  const puvodni = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  assert.deepEqual(await nactiAkce(), snimekAkci());
  process.env.DATABASE_URL = puvodni;
});
