// Chráněný endpoint pro zneplatnění cache veletrhů (#544) a hlídání, že
// všechny cesty zápisu dál volají obnovVeletrhy(). Pouští se přes tsx
// (`npm run test:mesto`), protože trasa importuje přes alias `@/`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { NextRequest } from 'next/server';
import * as revalidace from '../src/app/api/veletrhy/revalidace/route.ts';

process.env.CRON_SECRET = 'tajemstvi-cronu-0123456789';

function pozadavek(hlavicky = {}) {
  return new NextRequest('https://www.prijimackynaskolu.cz/api/veletrhy/revalidace', {
    method: 'POST',
    headers: hlavicky,
  });
}

test('bez tajemství vrátí 401', async () => {
  const r = await revalidace.POST(pozadavek());
  assert.equal(r.status, 401);
});

test('s chybným tajemstvím vrátí 401', async () => {
  const r = await revalidace.POST(pozadavek({ authorization: 'Bearer spatne' }));
  assert.equal(r.status, 401);
});

test('bez nastaveného CRON_SECRET nepustí nikoho', async () => {
  const puvodni = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  try {
    const r = await revalidace.POST(pozadavek({ authorization: 'Bearer ' }));
    assert.equal(r.status, 401);
  } finally {
    process.env.CRON_SECRET = puvodni;
  }
});

test('s platným tajemstvím vrátí 200 (mimo Next revalidace jen zaloguje)', async () => {
  const puvodni = console.error;
  console.error = () => {};
  try {
    const r = await revalidace.POST(pozadavek({ authorization: `Bearer ${process.env.CRON_SECRET}` }));
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { ok: true });
  } finally {
    console.error = puvodni;
  }
});

test('všechny cesty zápisu volají obnovVeletrhy()', () => {
  for (const soubor of [
    'src/app/api/veletrhy/navrhy/route.ts',
    'src/app/api/veletrhy/migrace/route.ts',
    'src/app/admin/veletrhy/akce/route.ts',
    'src/app/api/veletrhy/revalidace/route.ts',
  ]) {
    assert.match(fs.readFileSync(soubor, 'utf8'), /obnovVeletrhy\(\)/, soubor);
  }
});
