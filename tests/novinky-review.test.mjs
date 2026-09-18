import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import {
  prenesRezervaci,
  zrusDavkuPolozky,
  zrusPripravenouDavku,
  predejDavku,
} from '../src/lib/novinky-fronta.ts';
import { otiskClenu } from '../src/lib/novinky-rozpocet.ts';
import { SPRAVA_PLATNOST_MS, VYZVA_PLATNOST_MS, vytvorToken, overToken } from '../src/lib/novinky-token.ts';

// Testy k nálezům z code review PR #96 (docs/podklady/code-review-pr96-novinky.md).
// Každý drží jedno pravidlo, které se v kódu už jednou porušilo.

function spojeni(odpovedi = []) {
  const dotazy = [];
  let i = 0;
  return {
    dotazy,
    dotaz: async (sql, hodnoty = []) => {
      dotazy.push({ sql: sql.replace(/\s+/g, ' ').trim(), hodnoty });
      return odpovedi[i++] ?? { rows: [], rowCount: 0 };
    },
  };
}

test('P1-1: zrušení dávky vrátí ostatní položky do fronty', async () => {
  const s = spojeni([
    { rows: [], rowCount: 1 }, // přechod dávky na zrusena
    { rows: [], rowCount: 4 }, // ostatní položky zpět na ceka
    { rows: [], rowCount: 0 }, // rezervace
  ]);
  assert.equal(await zrusPripravenouDavku(s, 'd1', 1), true);
  const vraceni = s.dotazy.find((d) => d.sql.includes("set stav = 'ceka', davka_id = null"));
  assert.ok(vraceni, 'ostatní položky se musí vrátit do fronty');
});

test('P1-9: zrušená dávka nedrží tělo s adresami', async () => {
  const s = spojeni([{ rows: [], rowCount: 1 }, { rows: [], rowCount: 0 }, { rows: [], rowCount: 0 }]);
  await zrusPripravenouDavku(s, 'd1', 1);
  assert.ok(s.dotazy[0].sql.includes("telo = ''"), 'tělo se maže hned při zrušení');
  assert.ok(s.dotazy[0].sql.includes('telo_smazano = true'));
});

test('P1-1: odhlášení najde dávku své položky a zruší ji celou', async () => {
  const s = spojeni([
    { rows: [{ davka_id: 'd1', pokus: 2 }], rowCount: 1 },
    { rows: [], rowCount: 1 },
    { rows: [], rowCount: 3 },
    { rows: [], rowCount: 0 },
  ]);
  assert.equal(await zrusDavkuPolozky(s, 'p1'), true);
  assert.ok(s.dotazy.some((d) => d.sql.includes("set stav = 'ceka', davka_id = null")));
  // Podmínka váže pokus, který dávka právě má.
  const prechod = s.dotazy.find((d) => d.sql.includes("set stav = 'zrusena'"));
  assert.deepEqual(prechod.hodnoty, ['d1', 2]);
});

test('P1-4: rezervace se před předáním přenese do aktuálního období', async () => {
  const s = spojeni([
    { rows: [{ obdobi: 'mesic:2026-12', ucel: 'celkem', pocet: 10 }], rowCount: 1 },
    { rows: [], rowCount: 1 }, // rezervace v novém období
    { rows: [], rowCount: 1 }, // zápis rezervace
    { rows: [], rowCount: 1 }, // vypořádání staré
    { rows: [], rowCount: 1 }, // uvolnění staré
  ]);
  assert.equal(await prenesRezervaci(s, 'd1', 1, 'obsah', new Date('2027-01-05T09:00:00Z')), true);
  const nova = s.dotazy.find((d) => d.sql.includes('rezervovano = rezervovano + $3'));
  assert.equal(nova.hodnoty[0], 'mesic:2027-01');
  assert.ok(s.dotazy.some((d) => d.sql.includes('rezervovano = rezervovano - $3')));
});

test('P1-4: bez kapacity v novém období se dávka nepředá', async () => {
  const s = spojeni([
    { rows: [{ obdobi: 'mesic:2026-12', ucel: 'celkem', pocet: 10 }], rowCount: 1 },
    { rows: [], rowCount: 0 }, // nová rezervace neprojde
  ]);
  const v = await predejDavku(
    s,
    { id: 'd1', pokus: 1, clenove_otisk: otiskClenu(['p1']), zprava: 'z', telo: '', otisk_tela: 'o', idempotency_key: 'k', stav: 'pripravena', predano_v: null },
    new Date('2027-01-05T09:00:00Z'),
  );
  assert.equal(v.predano, false);
  assert.match(v.duvod, /kapacita/);
  assert.ok(!s.dotazy.some((d) => d.sql.includes("set stav = 'predavana'")));
});

test('P1-6: odkaz na správu a odhlášení platí déle než ročník', () => {
  assert.ok(SPRAVA_PLATNOST_MS > 9 * 30 * 24 * 60 * 60 * 1000, 'musí přežít celé přijímací řízení');
  assert.ok(SPRAVA_PLATNOST_MS > VYZVA_PLATNOST_MS);
  const token = vytvorToken('p1', SPRAVA_PLATNOST_MS, 'tajne');
  assert.equal(overToken(token, 'tajne'), 'p1');
});

test('P1-7: cron nepřepisuje ručně snížený limit rozpočtu', () => {
  const zdroj = readFileSync(new URL('../src/lib/novinky-odesilac.ts', import.meta.url), 'utf8');
  const usek = zdroj.slice(zdroj.indexOf('export async function zajistiRozpocet'));
  assert.ok(usek.includes('do nothing'), 'limit se nesmí přepisovat');
  assert.ok(!usek.includes('limit_pocet = excluded.limit_pocet'));
});

test('P1-8: webhook kontroluje čas podpisu a účinek řeší uvnitř stráže', () => {
  const zdroj = readFileSync(
    new URL('../src/app/api/novinky/resend-webhook/route.ts', import.meta.url),
    'utf8',
  );
  assert.ok(zdroj.includes('TOLERANCE_PODPISU_MS'), 'chybí tolerance času podpisu');
  assert.ok(zdroj.includes('zrusitAdresu = TRVALE_ZRUSENI.includes(typ)'));
  assert.ok(zdroj.includes('ucinek_hotov'), 'dokončení účinku se musí evidovat');
});

test('P1-5: token nezůstává v adrese stránek odhlášení a správy', () => {
  const odhlasit = readFileSync(
    new URL('../src/app/api/novinky/odhlasit/route.ts', import.meta.url),
    'utf8',
  );
  assert.ok(odhlasit.includes('nastavRelaciOdhlaseni'), 'token se mění za relaci');
  assert.ok(!odhlasit.includes("cil.searchParams.set('t'"), 'token nesmí jít do adresy');

  const sprava = readFileSync(
    new URL('../src/app/api/novinky/sprava/route.ts', import.meta.url),
    'utf8',
  );
  assert.ok(sprava.includes('nastavRelaciSpravy'));
  assert.ok(sprava.includes('precitRelaciSpravy'));
});

test('P1-6: neplatný odhlašovací odkaz nehlásí úspěch', () => {
  const zdroj = readFileSync(
    new URL('../src/app/api/novinky/odhlasit/route.ts', import.meta.url),
    'utf8',
  );
  const usek = zdroj.slice(zdroj.indexOf('export async function POST'));
  assert.ok(usek.includes('status: 400'), 'musí vrátit chybu, ne success');
});

test('P1-2 a P1-3: potvrzení i uvítání jdou přes dávku s rezervací kvóty', () => {
  const servisni = readFileSync(new URL('../src/lib/novinky-servisni.ts', import.meta.url), 'utf8');
  assert.ok(servisni.includes('pripravDavku'), 'servisní e-mail musí jít přes dávku');
  assert.ok(servisni.includes('predejDavku'), 'a mít hranici předání');
  assert.ok(servisni.includes('export async function dovezServisni'), 'fronta musí mít konzumenta');

  for (const cesta of ['../src/app/api/novinky/prihlasit/route.ts', '../src/app/api/novinky/potvrdit/route.ts']) {
    const zdroj = readFileSync(new URL(cesta, import.meta.url), 'utf8');
    assert.ok(zdroj.includes('odesliServisni'), `${cesta} musí použít servisní cestu`);
    assert.ok(!zdroj.includes('odesliDavku('), `${cesta} nesmí volat Resend přímo`);
  }

  const cron = readFileSync(
    new URL('../src/app/api/novinky/odeslat/route.ts', import.meta.url),
    'utf8',
  );
  assert.ok(cron.includes('dovezServisni'), 'cron musí servisní položky dovážet');
});

test('P1-10 po revizi produktu: odběr je jeden, odhlášení ruší celý', () => {
  // Nález P1-10 (odhlášení rušilo oba segmenty) zanikl rozhodnutím zadavatele
  // z 18. 9. 2026: odběr je jeden newsletter bez ročníku a bez segmentů.
  // Test proto hlídá, že segmentace nezůstala nikde napůl.
  const zdroj = readFileSync(new URL('../src/lib/novinky-odber.ts', import.meta.url), 'utf8');
  const usek = zdroj.slice(zdroj.indexOf('export async function odhlas'));
  assert.ok(usek.includes('delete from odber_novinek where odberatel_id = $1'));
  assert.ok(!usek.includes('druh_studia'), 'segment se už nikde nerozhoduje');

  const schema = readFileSync(new URL('../src/lib/novinky-schema.ts', import.meta.url), 'utf8');
  assert.ok(!schema.includes('segment text[]'), 'položka segment nenese');
  assert.ok(!schema.includes('druh_studia'), 'odběr nemá druh studia');
  assert.ok(!schema.includes('zprava_o_kalendari'), 'čekání na kalendář zaniklo');
  assert.ok(schema.includes('odberatel_id uuid primary key'), 'jeden odběr na odběratele');
});

test('odběr nemá ročník: ten se bere u každé zprávy z registru', () => {
  const zdroj = readFileSync(new URL('../src/lib/novinky-odber.ts', import.meta.url), 'utf8');
  const prihlas = zdroj.slice(zdroj.indexOf('export async function prihlas'), zdroj.indexOf('async function zvysLimit'));
  assert.ok(!prihlas.includes('rocnik'), 'přihlášení se na ročník neptá');
  const formular = readFileSync(
    new URL('../src/components/novinky/OdberFormular.tsx', import.meta.url),
    'utf8',
  );
  // Hledá se v odesílaném těle požadavku, ne v komentářích.
  const telo = formular.slice(formular.indexOf('body: JSON.stringify'), formular.indexOf('});', formular.indexOf('body: JSON.stringify')));
  for (const pole of ['druhy', 'kraj', 'rocnik', 'jenKalendar']) {
    assert.ok(!telo.includes(pole), `formulář nemá posílat ${pole}`);
  }
});

test('opakované přihlášení dostane uvítání znovu (klíč zprávy nese jti)', () => {
  const zdroj = readFileSync(new URL('../src/lib/novinky-odber.ts', import.meta.url), 'utf8');
  assert.ok(zdroj.includes('`novinky/uvitani/${jti}`'), 'jinak by uvítání tiše nepřišlo');
});
