import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { zalozRelaci, overRelaci, zrusRelaci, zrusVsechnyRelace, otisk, podepis, overPodpis, PLATNOST_RELACE_MS, PLATNOST_VYZVY_MS } from '../src/lib/admin-relace-jadro.ts';
import { smiDoAdministrace, adresaPrihlaseni, vymenKod } from '../src/lib/admin-github.ts';
import { seznamPasskey, zrusPasskey, strana } from '../src/lib/admin-passkey.ts';

// Přihlášení do administrace (#479): relace na serveru, GitHub a passkey.

async function novaDb() {
  const db = new PGlite();
  await db.exec(fs.readFileSync('db/migrace/008-admin-prihlaseni.sql', 'utf8'));
  return {
    db,
    s: { dotaz: async (sql, hodnoty = []) => { const r = await db.query(sql, hodnoty); return { rows: r.rows, rowCount: r.affectedRows || r.rows.length }; } },
  };
}

const TED = Date.parse('2026-10-13T10:00:00Z');

test('K3: relace platí 8 hodin, cookie nese náhodný identifikátor a databáze jen jeho otisk', async () => {
  const { s, db } = await novaDb();
  const id = await zalozRelaci(s, { zpusob: 'github', githubLogin: 'vlastnik' }, TED);
  assert.ok(id.length >= 40);
  const ulozene = (await db.query('select otisk from admin_relace')).rows.map((r) => r.otisk);
  assert.deepEqual(ulozene, [otisk(id)]);
  assert.ok(!ulozene.includes(id), 'v databázi není identifikátor z cookie');
  const r = await overRelaci(s, id, TED + 60_000);
  assert.equal(r.zpusob, 'github');
  assert.equal(r.githubLogin, 'vlastnik');
  assert.equal(await overRelaci(s, id, TED + PLATNOST_RELACE_MS + 1), null, 'prošlá relace neplatí');
  assert.equal(await overRelaci(s, 'neznamy', TED), null);
  assert.equal(await overRelaci(s, otisk(id), TED), null, 'otisk z databáze nefunguje jako cookie');
  assert.equal(await overRelaci(s, undefined, TED), null);
  const udalosti = (await db.query('select udalost, zpusob from admin_udalost')).rows;
  assert.deepEqual(udalosti, [{ udalost: 'prihlaseni', zpusob: 'github' }]);
});

test('K3: odhlášená relace a odhlášení všech zařízení', async () => {
  const { s } = await novaDb();
  const a = await zalozRelaci(s, { zpusob: 'github' }, TED);
  const b = await zalozRelaci(s, { zpusob: 'github' }, TED);
  await zrusRelaci(s, a);
  assert.equal(await overRelaci(s, a, TED + 1000), null);
  assert.ok(await overRelaci(s, b, TED + 1000));
  const c = await zalozRelaci(s, { zpusob: 'github' }, TED);
  assert.equal(await zrusVsechnyRelace(s), 2);
  assert.equal(await overRelaci(s, b, TED + 1000), null);
  assert.equal(await overRelaci(s, c, TED + 1000), null);
});

test('podepsaná výzva platí jen pro svůj účel, 10 minut a s tímtéž klíčem', () => {
  const t = podepis('github', 'stav-123', TED, 'tajne');
  assert.equal(overPodpis('github', t, TED + 1000, 'tajne'), 'stav-123');
  assert.equal(overPodpis('passkey-prihlaseni', t, TED + 1000, 'tajne'), null, 'jiný účel');
  assert.equal(overPodpis('github', t, TED + PLATNOST_VYZVY_MS + 1, 'tajne'), null, 'prošlá');
  assert.equal(overPodpis('github', t, TED, 'jine'), null, 'jiný klíč');
  const [telo, mac] = t.split('.');
  const podvrzene = Buffer.from(JSON.stringify({ u: 'github', h: 'cizi', e: TED + 1e9 })).toString('base64url');
  assert.equal(overPodpis('github', `${podvrzene}.${mac}`, TED, 'tajne'), null, 'změněné tělo');
  assert.equal(overPodpis('github', telo, TED, 'tajne'), null);
  assert.equal(overPodpis('github', t, TED, undefined), null, 'bez klíče nic neplatí');
  assert.throws(() => podepis('github', 'x', TED, undefined));
});

test('K2: přes GitHub projde jen účet vlastníka se zapnutým dvoufázovým ověřením', () => {
  assert.deepEqual(smiDoAdministrace({ id: 996974, login: 'tangero', two_factor_authentication: true }, '996974'), { ok: true });
  assert.equal(smiDoAdministrace({ id: 1, login: 'tangero', two_factor_authentication: true }, '996974').ok, false, 'stejný login, jiné id');
  assert.equal(smiDoAdministrace({ id: 996974, two_factor_authentication: false }, '996974').ok, false);
  assert.equal(smiDoAdministrace({ id: 996974 }, '996974').ok, false, 'chybějící údaj o 2FA znamená odmítnutí');
  assert.equal(smiDoAdministrace({ id: 996974, two_factor_authentication: true }, undefined).ok, false, 'bez nastaveného vlastníka nikdo');
  assert.equal(smiDoAdministrace({ id: 996974, two_factor_authentication: true }, 'tangero').ok, false, 'id musí být číslo');
});

test('adresa přihlášení přes GitHub a výměna kódu', async () => {
  const u = new URL(adresaPrihlaseni('stav', 'https://www.prijimackynaskolu.cz/admin/prihlaseni/github/zpet', 'klient'));
  assert.equal(u.origin + u.pathname, 'https://github.com/login/oauth/authorize');
  assert.equal(u.searchParams.get('scope'), 'read:user');
  assert.equal(u.searchParams.get('state'), 'stav');
  assert.equal(u.searchParams.get('allow_signup'), 'false');
  const dobry = async () => new Response(JSON.stringify({ access_token: 'gho_x' }), { status: 200 });
  assert.equal(await vymenKod('kod', 'https://x/zpet', dobry, 'a', 'b'), 'gho_x');
  const spatny = async () => new Response(JSON.stringify({ error: 'bad_verification_code' }), { status: 200 });
  await assert.rejects(vymenKod('kod', 'https://x/zpet', spatny, 'a', 'b'), /bad_verification_code/);
  await assert.rejects(vymenKod('kod', 'https://x/zpet', dobry, undefined, 'b'), /CLIENT_ID/);
});

test('passkey: seznam bez zrušených, zrušení se zapíše; strana WebAuthn podle adresy', async () => {
  const { s, db } = await novaDb();
  await db.query(`insert into admin_passkey (id, verejny_klic, nazev) values ('a', 'klic', 'iPhone'), ('b', 'klic', 'Mac')`);
  assert.deepEqual((await seznamPasskey(s)).map((p) => p.nazev), ['iPhone', 'Mac']);
  assert.equal(await zrusPasskey(s, 'a'), true);
  assert.equal(await zrusPasskey(s, 'a'), false, 'podruhé už není co rušit');
  assert.deepEqual((await seznamPasskey(s)).map((p) => p.nazev), ['Mac']);
  assert.equal((await db.query(`select count(*)::int as n from admin_udalost where udalost = 'passkey_zrusen'`)).rows[0].n, 1);
  assert.deepEqual(strana('https://www.prijimackynaskolu.cz/admin/prihlaseni/passkey'), { rpID: 'www.prijimackynaskolu.cz', origin: 'https://www.prijimackynaskolu.cz' });
});

// K1, K4: každá stránka administrace vyžaduje relaci, každá akce ji ověří; starý vstup tokenem je zrušený.
const soubory = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? soubory(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const ADMIN = soubory('src/app/admin');

test('K1: stránky administrace vyžadují relaci (kromě přihlášení)', () => {
  for (const f of ADMIN.filter((x) => x.endsWith('page.tsx') && !x.includes(`${path.sep}prihlaseni${path.sep}`))) {
    const text = fs.readFileSync(f, 'utf8');
    // Rozhodnutí o veletrzích má i vstup podepsaným odkazem z e-mailu; relaci ověřuje přes adminZCookies.
    assert.ok(/vyzadujAdmina\(\)|adminZCookies\(\)/.test(text), `${f} neověřuje přihlášení`);
  }
});

test('K1: akce administrace (POST) ověří relaci nebo podepsaný odkaz a původ požadavku', () => {
  for (const f of ADMIN.filter((x) => x.endsWith('route.ts') && !x.includes(`${path.sep}prihlaseni${path.sep}`) && !x.includes(`${path.sep}auth${path.sep}`))) {
    const text = fs.readFileSync(f, 'utf8');
    assert.ok(/adminZPozadavku\(request\)/.test(text), `${f} neověřuje relaci`);
    assert.ok(/jeNasPuvod\(request\)/.test(text), `${f} neověřuje původ požadavku`);
  }
});

test('K4: token v adrese ani ADMIN_TOKEN už nikoho nepřihlásí', async () => {
  for (const f of ADMIN) assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /overAdminToken|admin_token'|ADMIN_TOKEN/, f);
  const auth = fs.readFileSync('src/app/admin/auth/route.ts', 'utf8');
  assert.match(auth, /status: 410/);
  assert.doesNotMatch(auth, /cookies\.set/);
});
