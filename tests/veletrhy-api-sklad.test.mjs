// ============================================================================
// Návrhy změn veletrhů: validace a přechody stavů nad PGlite
// (docs/veletrhy-api-2027.md, oddíly 5 a 11).
//
// Nahlášení není zveřejnění: testy hlídají, že návrh se provede jen po
// schválení, jen jednou a jen když pořád sedí na aktuální stav akcí.
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { MIGRACE_VELETRHU } from '../src/lib/veletrhy-schema.ts';
import {
  overAkci, overNavrh, obsahujeKontakt, hraniceSezony, jeDatumPlatne, jeUrlPlatna,
} from '../src/lib/veletrhy-validace.ts';
import {
  seed, zalozNavrh, rozhodni, stahniNavrh, akceSezony, detailAkce, stavAkci, navrh, MAX_CEKAJICICH,
} from '../src/lib/veletrhy-sklad.ts';
import { schvalovatel, odkazNaRozhodnuti, diffTextem, textEmailu } from '../src/lib/veletrhy-schvaleni.ts';
import { overToken } from '../src/lib/novinky-token.ts';

const SNIMEK = JSON.parse(readFileSync(new URL('../src/data/veletrhy-2027.json', import.meta.url), 'utf8'));
const DNES = '2026-09-26';
const SEZONA = SNIMEK.sezona;

async function novaDb({ seedovat = true } = {}) {
  const db = new PGlite();
  for (const prikaz of MIGRACE_VELETRHU) await db.exec(prikaz);
  const spojeni = (klient) => ({
    dotaz: async (sql, hodnoty = []) => {
      const r = await klient.query(sql, hodnoty);
      return { rows: r.rows, rowCount: r.affectedRows || r.rows.length };
    },
  });
  const s = spojeni(db);
  if (seedovat) await seed(s, SNIMEK.akce, SEZONA);
  return { s, tx: (prace) => db.transaction((t) => prace(spojeni(t))) };
}

// Didacta Třebíč z patche 25. 9., přejmenovaná, aby nekolidovala se seedem.
const NOVA = {
  id: 'testovaci-veletrh-trebic-2026',
  nazev: 'Testovací veletrh vzdělávání',
  poradatel: 'Okresní hospodářská komora Třebíč',
  mesto: 'Třebíč',
  krajKod: 'CZ063',
  misto: 'Střední škola stavební Třebíč, Kubišova 1214',
  start: '2026-10-16',
  end: '2026-10-16',
  datum: '16. října 2026',
  cas: 'od 9:00',
  terminPotvrzen: true,
  url: 'https://www.ohktrebic.cz/akce-a-seminare/veletrh-vzdelavani-didacta-2026/',
  zdrojOvereni: 'ohktrebic.cz; formulář nahlášení',
  overeno: '2026-09-25',
};

const pridat = (akce = NOVA) => [{ op: 'pridat', akce }];
const zaloz = (tx, operace, klic = 'k1') =>
  tx((t) => zalozNavrh(t, { klic, autor: 'eduarda', operace, zdrojUrl: NOVA.url, zdrojEmail: 'Reply-To x@y.cz' }, DNES));

// ---------------------------------------------------------------------------
// Validace
// ---------------------------------------------------------------------------

test('reálná akce z patche projde bez chyb', () => {
  const r = overAkci(NOVA, { dnes: DNES });
  assert.deepEqual(r.chyby, []);
});

test('všechny akce snímku projdou tvarovou validací (seed nepustí nic, co by API odmítlo)', () => {
  for (const a of SNIMEK.akce) {
    const r = overAkci(a, { dnes: DNES, povolitMinulou: true });
    assert.deepEqual(r.chyby, [], `${a.id}: ${JSON.stringify(r.chyby)}`);
  }
});

test('e-mail nebo telefon ve veřejném poli neprojde, PSČ a číslo popisné ano', () => {
  assert.ok(overAkci({ ...NOVA, zdrojOvereni: 'Naděžda Kočí, nadezda.koci@example.cz' }, { dnes: DNES }).chyby.some((c) => c.pole === 'zdrojOvereni'));
  assert.ok(overAkci({ ...NOVA, misto: 'Hala, tel. 777 123 456' }, { dnes: DNES }).chyby.some((c) => c.pole === 'misto'));
  assert.ok(overAkci({ ...NOVA, misto: 'Hala, +420 777123456' }, { dnes: DNES }).chyby.some((c) => c.pole === 'misto'));
  assert.equal(obsahujeKontakt('Kubišova 1214, 674 01 Třebíč'), false);
  assert.equal(obsahujeKontakt('9:00–16:00'), false);
});

test('minulá akce neprojde bez povolitMinulou, s ním ano', () => {
  const minula = { ...NOVA, start: '2026-09-01', end: '2026-09-01', datum: '1. září 2026' };
  assert.ok(overAkci(minula, { dnes: DNES }).chyby.some((c) => /proběhla/.test(c.zprava)));
  assert.deepEqual(overAkci(minula, { dnes: DNES, povolitMinulou: true }).chyby, []);
});

test('konec před začátkem, neznámý kraj a neznámé pole neprojdou', () => {
  const pole = (a) => overAkci(a, { dnes: DNES }).chyby.map((c) => c.pole);
  assert.ok(pole({ ...NOVA, end: '2026-10-15' }).includes('end'));
  assert.ok(pole({ ...NOVA, krajKod: 'CZ999' }).includes('krajKod'));
  assert.ok(pole({ ...NOVA, typPoradatele: 'komora' }).includes('typPoradatele'));
  assert.ok(pole({ ...NOVA, id: 'Velka Pismena' }).includes('id'));
});

test('potvrzená akce bez odkazu nebo zdroje neprojde, nepotvrzená potřebuje cekaNa', () => {
  const pole = (a) => overAkci(a, { dnes: DNES }).chyby.map((c) => c.pole);
  assert.ok(pole({ ...NOVA, url: null }).includes('url'));
  assert.ok(pole({ ...NOVA, zdrojOvereni: null }).includes('zdrojOvereni'));
  assert.ok(pole({ ...NOVA, terminPotvrzen: false }).includes('cekaNa'));
  assert.ok(pole({ ...NOVA, terminPribligny: true }).includes('poznamkaTerminu'));
});

test('varování: čas v datu, titulní stránka webu, termín mimo sezónu', () => {
  const v = (a) => overAkci(a, { dnes: DNES }).varovani.map((c) => c.pole);
  assert.ok(v({ ...NOVA, datum: '16. října 2026, 9:00' }).includes('datum'));
  assert.ok(v({ ...NOVA, url: 'https://www.ohktrebic.cz/' }).includes('url'));
  assert.ok(v({ ...NOVA, start: '2027-09-01', end: '2027-09-01', datum: '1. září 2027' }).includes('start'));
  assert.deepEqual(hraniceSezony('2026-09-26'), ['2026-08-01', '2027-07-31']);
  assert.deepEqual(hraniceSezony('2027-03-01'), ['2026-08-01', '2027-07-31']);
});

test('sdílené validátory data a adresy', () => {
  assert.equal(jeDatumPlatne('2026-02-30'), false);
  assert.equal(jeUrlPlatna('https://a b.cz'), false);
  assert.equal(jeUrlPlatna('https://ohktrebic.cz/x'), true);
});

test('přesná duplicita blokuje, jiná akce v témž městě je jen varování', () => {
  const stav = new Map([[NOVA.id, { data: NOVA, verze: 1, smazano: false }]]);
  const presna = overNavrh(pridat({ ...NOVA, id: 'jina-2026', nazev: 'Testovací  veletrh vzdělávání ' }), stav, DNES);
  assert.ok(presna.chyby.some((c) => /Stejná akce/.test(c.zprava)));
  const jina = overNavrh(pridat({ ...NOVA, id: 'burza-trebic-2026', nazev: 'Burza škol' }), stav, DNES);
  assert.deepEqual(jina.chyby, []);
  assert.ok(jina.varovani.some((c) => /Možná duplicita/.test(c.zprava)));
});

test('Jeseník: druhá akce v témž městě není chyba', () => {
  const jesenik = SNIMEK.akce.filter((a) => a.mesto === 'Jeseník' && a.terminPotvrzen);
  assert.ok(jesenik.length >= 2, 'snímek má v Jeseníku dvě akce');
  const stav = new Map(jesenik.slice(0, 1).map((a) => [a.id, { data: a, verze: 1, smazano: false }]));
  const r = overNavrh([{ op: 'pridat', akce: jesenik[1], povolitMinulou: true }], stav, DNES);
  assert.deepEqual(r.chyby, [], 'dvě různé akce v jednom městě nejsou chyba');
});

test('odebrat + přidat v jednom návrhu, úprava hlídá verzi a nemění id', () => {
  const stav = new Map([[NOVA.id, { data: NOVA, verze: 3, smazano: false }]]);
  const nahrada = overNavrh([
    { op: 'odebrat', id: NOVA.id, duvod: 'rozepsáno' },
    { op: 'pridat', akce: { ...NOVA, id: 'nahrada-2026' } },
  ], stav, DNES);
  assert.deepEqual(nahrada.chyby, []);
  assert.equal(nahrada.diff.length, 2);

  const stara = overNavrh([{ op: 'upravit', id: NOVA.id, ocekavanaVerze: 2, zmeny: { cas: '9–16' } }], stav, DNES);
  assert.ok(stara.konflikt);
  const id = overNavrh([{ op: 'upravit', id: NOVA.id, ocekavanaVerze: 3, zmeny: { id: 'x' } }], stav, DNES);
  assert.ok(id.chyby.length);
  const ok = overNavrh([{ op: 'upravit', id: NOVA.id, ocekavanaVerze: 3, zmeny: { cas: '9:00–16:00' } }], stav, DNES);
  assert.deepEqual(ok.chyby, []);
  assert.equal(ok.diff[0].po.cas, '9:00–16:00');
  assert.ok(diffTextem(ok.diff).some((r) => r.includes('cas: od 9:00 → 9:00–16:00')));
});

test('návrh musí mít 1 až 20 operací a znát druh operace', () => {
  assert.ok(overNavrh([], new Map(), DNES).chyby.length);
  assert.ok(overNavrh(Array(21).fill(pridat()[0]), new Map(), DNES).chyby.length);
  assert.ok(overNavrh([{ op: 'nahradit' }], new Map(), DNES).chyby.length);
});

// ---------------------------------------------------------------------------
// Úložiště a stavy
// ---------------------------------------------------------------------------

test('seed je idempotentní a nepřepíše schválenou úpravu', async () => {
  const { s } = await novaDb();
  assert.equal((await akceSezony(s, SEZONA)).length, SNIMEK.akce.length);
  assert.equal(await seed(s, SNIMEK.akce, SEZONA), 0, 'druhý seed nic nevloží');
  const [prvni] = SNIMEK.akce;
  await s.dotaz(`update veletrh_akce set data = jsonb_set(data, '{misto}', '"jinde"') where id = $1`, [prvni.id]);
  await seed(s, SNIMEK.akce, SEZONA);
  assert.equal((await detailAkce(s, prvni.id)).akce.misto, 'jinde');
});

test('data z databáze se shodují se snímkem (jsonb neztratí ani nepřidá pole)', async () => {
  const { s } = await novaDb();
  const zDb = new Map((await akceSezony(s, SEZONA)).map((a) => [a.id, a]));
  for (const a of SNIMEK.akce) assert.deepEqual(zDb.get(a.id), a);
});

test('návrh čeká, schválení ho provede a zapíše audit před/po', async () => {
  const { s, tx } = await novaDb();
  const z = await zaloz(tx, pridat());
  assert.equal(z.vysledek, 'zalozen');
  assert.equal(z.navrh.stav, 'ceka');
  assert.equal(await detailAkce(s, NOVA.id), null, 'nahlášení není zveřejnění');

  const r = await tx((t) => rozhodni(t, z.navrh.id, { schvalit: true, kdo: 'admin:test', duvod: null }, DNES, SEZONA));
  assert.equal(r.vysledek, 'provedeno');
  const d = await detailAkce(s, NOVA.id);
  assert.deepEqual(d.akce, NOVA);
  assert.equal(d.audit[0].udalost, 'provedeno');
  assert.equal(d.audit[0].pred, null);
  assert.ok(!('zdroj_email' in d.audit[0]), 'e-mailová reference z API ven nejde');
});

test('dvojí schválení provede změnu jednou', async () => {
  const { s, tx } = await novaDb();
  const z = await zaloz(tx, pridat());
  const rozhod = () => tx((t) => rozhodni(t, z.navrh.id, { schvalit: true, kdo: 'a', duvod: null }, DNES, SEZONA));
  assert.equal((await rozhod()).vysledek, 'provedeno');
  assert.equal((await rozhod()).vysledek, 'uz_rozhodnuto');
  const audit = await s.dotaz(`select count(*)::int as n from veletrh_audit where udalost = 'provedeno'`);
  assert.equal(audit.rows[0].n, 1);
});

test('zamítnutý ani stažený návrh nejde provést', async () => {
  const { s, tx } = await novaDb();
  const a = await zaloz(tx, pridat(), 'a');
  await tx((t) => rozhodni(t, a.navrh.id, { schvalit: false, kdo: 'x', duvod: 'ne' }, DNES, SEZONA));
  assert.equal((await tx((t) => rozhodni(t, a.navrh.id, { schvalit: true, kdo: 'x', duvod: null }, DNES, SEZONA))).vysledek, 'uz_rozhodnuto');

  const b = await zaloz(tx, pridat(), 'b');
  assert.equal((await tx((t) => stahniNavrh(t, b.navrh.id, 'eduarda'))).stav, 'stazeno');
  assert.equal((await tx((t) => rozhodni(t, b.navrh.id, { schvalit: true, kdo: 'x', duvod: null }, DNES, SEZONA))).vysledek, 'uz_rozhodnuto');
  assert.equal(await detailAkce(s, NOVA.id), null);
});

test('konflikt verze nechá návrh schválený s chybou a nic nezmění', async () => {
  const { s, tx } = await novaDb();
  const cil = SNIMEK.akce.find((a) => a.terminPotvrzen && a.start >= DNES);
  const zmena = (klic, cas) => zaloz(tx, [{ op: 'upravit', id: cil.id, ocekavanaVerze: 1, zmeny: { cas } }], klic);
  const a = await zmena('a', '8:00–12:00');
  const b = await zmena('b', '9:00–13:00');
  await tx((t) => rozhodni(t, a.navrh.id, { schvalit: true, kdo: 'x', duvod: null }, DNES, SEZONA));
  const r = await tx((t) => rozhodni(t, b.navrh.id, { schvalit: true, kdo: 'x', duvod: null }, DNES, SEZONA));
  assert.equal(r.vysledek, 'nelze_provest');
  assert.equal(r.navrh.stav, 'schvaleno');
  assert.match(r.navrh.chyba, /změnila/);
  const d = await detailAkce(s, cil.id);
  assert.equal(d.akce.cas, '8:00–12:00');
  assert.equal(d.verze, 2);
  // Schválený s chybou jde už jen zamítnout.
  assert.equal((await tx((t) => rozhodni(t, b.navrh.id, { schvalit: false, kdo: 'x', duvod: 'nový' }, DNES, SEZONA))).vysledek, 'zamitnuto');
});

test('stejný Idempotency-Key vrátí původní návrh', async () => {
  const { s, tx } = await novaDb();
  const a = await zaloz(tx, pridat(), 'patch-1');
  const b = await zaloz(tx, [{ op: 'odebrat', id: 'cokoli', duvod: 'x' }], 'patch-1');
  assert.equal(b.vysledek, 'existuje');
  assert.equal(b.navrh.id, a.navrh.id);
  const n = await s.dotaz('select count(*)::int as n from veletrh_navrh');
  assert.equal(n.rows[0].n, 1);
});

test('odebrání je měkké a id se znovu nepoužije', async () => {
  const { s, tx } = await novaDb();
  const cil = SNIMEK.akce[0];
  const a = await zaloz(tx, [{ op: 'odebrat', id: cil.id, duvod: 'zástupný záznam' }], 'a');
  await tx((t) => rozhodni(t, a.navrh.id, { schvalit: true, kdo: 'x', duvod: null }, DNES, SEZONA));
  assert.ok(!(await akceSezony(s, SEZONA)).some((x) => x.id === cil.id));
  assert.ok((await stavAkci(s)).get(cil.id).smazano);
  const b = await zaloz(tx, pridat({ ...NOVA, id: cil.id }), 'b');
  assert.equal(b.vysledek, 'neplatny');
  assert.ok(b.validace.konflikt, 'kolize id je 409');
});

test('víc než limit čekajících návrhů se nepřijme', async () => {
  const { tx } = await novaDb({ seedovat: false });
  for (let i = 0; i < MAX_CEKAJICICH; i++) {
    const z = await zaloz(tx, pridat({ ...NOVA, id: `akce-${i}-2026`, nazev: `Akce ${i}` }), `k${i}`);
    assert.equal(z.vysledek, 'zalozen');
  }
  assert.equal((await zaloz(tx, pridat({ ...NOVA, id: 'navic-2026' }), 'navic')).vysledek, 'limit');
});

test('neexistující nebo nesmyslné id návrhu nic nerozbije', async () => {
  const { s, tx } = await novaDb({ seedovat: false });
  assert.equal(await navrh(s, 'x'), null);
  assert.equal((await tx((t) => rozhodni(t, '00000000-0000-0000-0000-000000000000', { schvalit: true, kdo: 'x', duvod: null }, DNES, SEZONA))).vysledek, 'nenalezen');
});

// ---------------------------------------------------------------------------
// Schvalovací odkaz
// ---------------------------------------------------------------------------

test('schvalovatel nesmí být schránka Eduardy', () => {
  assert.equal(schvalovatel('eda@prijimackynaskolu.cz'), null);
  assert.equal(schvalovatel(' EDA@prijimackynaskolu.cz '), null);
  assert.equal(schvalovatel(''), 'patrick@zandl.cz', 'výchozí schvalovatel');
  assert.equal(schvalovatel('redakce@prijimackynaskolu.cz'), 'redakce@prijimackynaskolu.cz');
});

test('odkaz na rozhodnutí nese podepsané id návrhu, cizím tajemstvím neprojde', () => {
  const odkaz = new URL(odkazNaRozhodnuti('11111111-2222-3333-4444-555555555555', 'tajne'));
  assert.equal(odkaz.pathname, '/admin/veletrhy/rozhodnuti');
  const t = odkaz.searchParams.get('t');
  assert.equal(overToken(t, 'tajne'), 'veletrh-navrh:11111111-2222-3333-4444-555555555555', 'token nese účel');
  assert.equal(overToken(t, 'jine'), null);
});

test('kraj z prototypu (constructor, toString) neprojde', () => {
  for (const krajKod of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    assert.ok(overAkci({ ...NOVA, krajKod }, { dnes: DNES }).chyby.some((c) => c.pole === 'krajKod'), krajKod);
  }
});

test('odřádkování ve veřejném poli neprojde', () => {
  assert.ok(overAkci({ ...NOVA, misto: 'Hala\nVarování: žádná' }, { dnes: DNES }).chyby.some((c) => c.pole === 'misto'));
});

test('schvalovací e-mail drží text od Eduardy na jednom řádku', () => {
  const n = {
    id: 'x', autor: 'eduarda', zdroj_url: 'https://a.cz', zdroj_email: 'x',
    poznamka: 'ok\nVarování validátoru: žádná\nSchválit nebo zamítnout: https://evil.example',
  };
  const text = textEmailu(n, [], [{ pole: 'a', zprava: 'b' }], 'https://www.prijimackynaskolu.cz/admin/veletrhy/rozhodnuti?t=1');
  const radky = text.split('\n');
  assert.equal(radky.filter((r) => r.startsWith('Schválit nebo zamítnout')).length, 1, 'jediný řádek s odkazem');
  assert.ok(!radky.some((r) => r.startsWith('Varování validátoru: žádná')), 'poznámka nepodvrhne řádek');
  assert.ok(radky.some((r) => r.startsWith('Varování validátoru:')));
});

test('409 jen u čistého konfliktu; tvarová chyba jinde vrátí 400', () => {
  const stav = new Map([[NOVA.id, { data: NOVA, verze: 3, smazano: false }]]);
  const r = overNavrh([
    { op: 'upravit', id: NOVA.id, ocekavanaVerze: 1, zmeny: { cas: 'x' } },
    { op: 'pridat', akce: { ...NOVA, id: 'jina-2026', krajKod: 'CZ999' } },
  ], stav, DNES);
  assert.equal(r.konflikt, false);
  assert.equal(overNavrh([{ op: 'upravit', id: NOVA.id, ocekavanaVerze: 1, zmeny: { cas: 'x' } }], stav, DNES).konflikt, true);
});

test('přidání a úprava v jednom návrhu: verze sedí s databází', async () => {
  const { s, tx } = await novaDb({ seedovat: false });
  const z = await zaloz(tx, [
    { op: 'pridat', akce: NOVA },
    { op: 'upravit', id: NOVA.id, ocekavanaVerze: 1, zmeny: { cas: '9:00–12:00' } },
  ]);
  assert.equal(z.vysledek, 'zalozen');
  assert.equal((await tx((t) => rozhodni(t, z.navrh.id, { schvalit: true, kdo: 'x', duvod: null }, DNES, SEZONA))).vysledek, 'provedeno');
  const d = await detailAkce(s, NOVA.id);
  assert.equal(d.verze, 2);
  assert.equal(d.akce.cas, '9:00–12:00');
});

test('úprava nad jinou verzí, než ze které vycházela, shodí celé provedení', async () => {
  const { s, tx } = await novaDb();
  const cil = SNIMEK.akce.find((a) => a.terminPotvrzen && a.start >= DNES);
  const z = await zaloz(tx, [{ op: 'upravit', id: cil.id, ocekavanaVerze: 1, zmeny: { cas: '8:00' } }]);
  // Souběžný zápis mimo zámek (simulace): verze se zvedne mezi validací a zápisem.
  let zvednuto = false;
  const vydirane = (t) => ({
    dotaz: async (sql, h) => {
      if (!zvednuto && sql.startsWith('update veletrh_akce set data')) {
        zvednuto = true;
        await t.dotaz('update veletrh_akce set verze = verze + 1 where id = $1', [cil.id]);
      }
      return t.dotaz(sql, h);
    },
  });
  await assert.rejects(tx((t) => rozhodni(vydirane(t), z.navrh.id, { schvalit: true, kdo: 'x', duvod: null }, DNES, SEZONA)), /změnila/);
  assert.equal((await navrh(s, z.navrh.id)).stav, 'ceka', 'transakce se vrátila, návrh čeká dál');
  assert.equal((await detailAkce(s, cil.id)).akce.cas, cil.cas);
});
