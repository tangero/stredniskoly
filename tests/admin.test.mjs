import test from 'node:test';
import assert from 'node:assert/strict';
import {
  overAdminToken,
  stavSady,
  extrahujNazevZTitulku,
  extrahujKanalZIssue,
  stariVeDnech,
  formatDatumCasCz,
  stariSlovy,
  getNovinkyPrehled,
} from '../src/lib/admin.ts';
import { nastavPoolProTesty } from '../src/lib/novinky-db.ts';

test('auth: správný token projde, constant-time porovnání', () => {
  assert.equal(overAdminToken('tajny-token-123', 'tajny-token-123'), true);
});

test('auth: špatný, chybějící a prázdný token se odmítnou', () => {
  assert.equal(overAdminToken('spatny', 'tajny-token-123'), false);
  assert.equal(overAdminToken('', 'tajny-token-123'), false);
  assert.equal(overAdminToken(undefined, 'tajny-token-123'), false);
  assert.equal(overAdminToken(null, 'tajny-token-123'), false);
  // jiná délka nesmí projít ani vyhodit výjimku (timingSafeEqual vyžaduje stejnou délku)
  assert.equal(overAdminToken('tajny-token-123-x', 'tajny-token-123'), false);
  assert.equal(overAdminToken('x', 'tajny-token-123'), false);
});

test('auth: chybějící env ADMIN_TOKEN → vždy false (stránka vrací 404)', () => {
  const puvodni = process.env.ADMIN_TOKEN;
  delete process.env.ADMIN_TOKEN;
  try {
    assert.equal(overAdminToken('cokoli'), false);
  } finally {
    if (puvodni) process.env.ADMIN_TOKEN = puvodni;
  }
});

const DNES = new Date('2026-09-13T12:00:00Z');

test('stav sady: obnovit_nejpozdeji v minulosti → zastaralá', () => {
  assert.equal(stavSady({ obnovit_nejpozdeji: '2026-08-11' }, DNES), 'zastaralá');
  assert.equal(stavSady({ obnovit_nejpozdeji: '2027-02-11' }, DNES), 'OK');
  // dnešek ještě není po termínu
  assert.equal(stavSady({ obnovit_nejpozdeji: '2026-09-13' }, DNES), 'OK');
});

test('stav sady: ocekavano.kdy „2027-03“ se porovnává po měsících', () => {
  assert.equal(stavSady({ ocekavano: { kdy: '2026-08' } }, DNES), 'po termínu');
  assert.equal(stavSady({ ocekavano: { kdy: '2026-09' } }, DNES), 'OK'); // aktuální měsíc ještě OK
  assert.equal(stavSady({ ocekavano: { kdy: '2027-03' } }, DNES), 'OK');
});

test('stav sady: „neznámo“ a nesmysly se ignorují', () => {
  assert.equal(stavSady({ ocekavano: { kdy: 'neznámo' } }, DNES), 'OK');
  assert.equal(stavSady({ ocekavano: { kdy: null } }, DNES), 'OK');
  assert.equal(stavSady({}, DNES), 'OK');
  assert.equal(stavSady({ obnovit_nejpozdeji: 'neznámo' }, DNES), 'OK');
});

test('stav sady: zastaralá má přednost před po termínu', () => {
  assert.equal(
    stavSady({ obnovit_nejpozdeji: '2026-01-01', ocekavano: { kdy: '2026-01' } }, DNES),
    'zastaralá',
  );
});

test('titulek issue → název školy', () => {
  assert.equal(extrahujNazevZTitulku('[Portál škol] Gymnázium J. S. Machara (600007774)'), 'Gymnázium J. S. Machara');
  assert.equal(extrahujNazevZTitulku('[Portál škol] 600007774 (600007774)'), '600007774');
  assert.equal(extrahujNazevZTitulku('Jiný titulek'), 'Jiný titulek');
});

test('kanál se vytáhne z těla issue; e-mail editora se neextrahuje', () => {
  const body = [
    '**Škola:** Gymnázium',
    '**REDIZO:** 600171701',
    '**Kanál:** magic-link',
    '**Kontakt editora (interní, nepublikovat):** reditel@gym.cz',
  ].join('\n');
  assert.equal(extrahujKanalZIssue(body), 'magic-link');
  assert.equal(extrahujKanalZIssue(body.replace('magic-link', 'kod')), 'kod');
  assert.equal(extrahujKanalZIssue('žádný kanál'), null);
  assert.equal(extrahujKanalZIssue(null), null);
  // extrakce kanálu nesmí vracet nic z e-mailové řádky
  const kanal = extrahujKanalZIssue(body);
  assert.ok(!kanal.includes('@'));
});

test('stáří ve dnech a česky slovy', () => {
  assert.equal(stariVeDnech('2026-09-13T09:00:00Z', DNES), 0);
  assert.equal(stariVeDnech('2026-09-10T09:00:00Z', DNES), 3);
  assert.equal(stariVeDnech('2026-09-14T09:00:00Z', DNES), 0); // budoucnost neleze pod 0
  assert.equal(stariSlovy(0), 'dnes');
  assert.equal(stariSlovy(1), 'včera');
  assert.equal(stariSlovy(5), 'před 5 dny');
});

test('formátování data a času česky', () => {
  assert.equal(formatDatumCasCz('2026-09-13T11:04:54+00:00'), '13. 9. 2026 11:04');
  assert.equal(formatDatumCasCz('neni-datum'), 'neni-datum'); // neparsrovatelné projde beze změny
});

test('přehled novinek: bez DATABASE_URL vrací null (odběr nenakonfigurován)', async () => {
  const puvodni = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    assert.equal(await getNovinkyPrehled(), null);
  } finally {
    if (puvodni !== undefined) process.env.DATABASE_URL = puvodni;
  }
});

test('přehled novinek: počty z databáze se namapují, adresy se nečtou', async () => {
  const puvodni = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgres://test';
  const dotazy = [];
  nastavPoolProTesty({
    async query(sql) {
      dotazy.push(sql);
      if (sql.includes('group by zdroj')) {
        return { rows: [{ zdroj: 'titulka-karta', pocet: 9 }, { zdroj: 'paticka', pocet: 3 }], rowCount: 2 };
      }
      if (sql.includes('from odber_novinek')) {
        return { rows: [{ celkem: 12, nove7: 3, nove30: 5 }], rowCount: 1 };
      }
      if (sql.includes('from zadost_o_potvrzeni')) return { rows: [{ pocet: 2 }], rowCount: 1 };
      if (sql.includes('from polozka_odeslani')) return { rows: [{ pocet: 4 }], rowCount: 1 };
      throw new Error(`neočekávaný dotaz: ${sql}`);
    },
  });
  try {
    const n = await getNovinkyPrehled();
    assert.deepEqual(n, {
      odberatele: 12,
      nove7: 3,
      nove30: 5,
      cekajiciPotvrzeni: 2,
      frontaCeka: 4,
      dleZdroje: [
        { zdroj: 'titulka-karta', pocet: 9 },
        { zdroj: 'paticka', pocet: 3 },
      ],
    });
    // Přehled smí číst jen počty; select e-mailových adres by administraci
    // vynesl osobní údaje, které k přehledu nepotřebuje.
    assert.ok(dotazy.every((q) => !/\bemail\b/.test(q)), 'dotazy nesmí sahat na adresy');
  } finally {
    nastavPoolProTesty(null);
    if (puvodni === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = puvodni;
  }
});

test('přehled novinek: chyba databáze znamená null, ne pád stránky', async () => {
  const puvodni = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgres://test';
  nastavPoolProTesty({
    async query() {
      throw new Error('databáze nedostupná');
    },
  });
  try {
    assert.equal(await getNovinkyPrehled(), null);
  } finally {
    nastavPoolProTesty(null);
    if (puvodni === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = puvodni;
  }
});
