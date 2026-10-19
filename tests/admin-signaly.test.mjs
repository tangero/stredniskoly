import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nactiSignaly, souborZeZipu, souhrnZArtefaktu, souhrnZJson, MAX_TYDNU } from '../src/lib/admin-signaly.ts';

// Týdenní souhrn signálů v přehledu provozu (#528). GitHub API nahrazuje mock, ZIP jsou fixtures
// vyrobené jako u upload-artifact (deflate s datovým popisovačem; jeden archiv bez komprese).

const fixture = (n) => new Uint8Array(readFileSync(new URL(`./fixtures/signaly-tyden/${n}`, import.meta.url)));
const ZIP = fixture('artefakt.zip');
const ZIP_ULOZENY = fixture('artefakt-ulozeny.zip');
const ZIP_JEN_MD = fixture('artefakt-jen-md.zip');

const beh = (id, o = {}) => ({ id, html_url: `https://github.com/tangero/stredniskoly/actions/runs/${id}`, created_at: '2026-10-05T06:00:00Z', status: 'completed', conclusion: 'success', head_branch: 'main', ...o });
const artefakt = (id, behId, o = {}) => ({ id, expired: false, workflow_run: { id: behId }, ...o });

/** Mock GitHub API: seznam běhů, seznam artefaktů a stažení ZIP podle id artefaktu. */
function mockApi({ behy = [], artefakty = [], zipy = {}, stav = {} } = {}) {
  const volani = [];
  const fetchFn = async (url) => {
    volani.push(url);
    const cesta = url.replace('https://api.github.com/', '');
    for (const [vzor, kod] of Object.entries(stav)) if (cesta.includes(vzor)) return new Response('{}', { status: kod });
    if (cesta.includes('/runs?')) return Response.json({ workflow_runs: behy });
    if (cesta.includes('/artifacts?')) return Response.json({ artifacts: artefakty });
    const m = cesta.match(/artifacts\/(\d+)\/zip$/);
    if (m && zipy[m[1]]) return new Response(zipy[m[1]]);
    return new Response('{}', { status: 404 });
  };
  return { fetchFn, volani };
}

test('ZIP z artefaktu: deflate s datovým popisovačem i bez komprese; chybějící soubor je null', () => {
  const json = JSON.parse(new TextDecoder().decode(souborZeZipu(ZIP, 'souhrn.json')));
  assert.equal(json.do, '2026-10-04');
  assert.match(new TextDecoder().decode(souborZeZipu(ZIP, 'souhrn-bez-hledani.md')), /^# Signály za týden/);
  assert.equal(JSON.parse(new TextDecoder().decode(souborZeZipu(ZIP_ULOZENY, 'souhrn.json'))).od, '2026-09-21');
  assert.equal(souborZeZipu(ZIP_JEN_MD, 'souhrn.json'), null);
  assert.throws(() => souborZeZipu(new Uint8Array([1, 2, 3]), 'souhrn.json'), /není ZIP/);
});

test('K1: souhrn posledního týdne z artefaktu (návštěvy, stránky, události, rychlost)', () => {
  const { souhrn, poznamka } = souhrnZArtefaktu(ZIP);
  assert.equal(poznamka, null);
  assert.deepEqual([souhrn.od, souhrn.do], ['2026-09-28', '2026-10-04']);
  assert.deepEqual(souhrn.navstevy, { navstevy: 200, zobrazeni: 500 });
  assert.deepEqual(souhrn.stranky[0], { stranka: '/mesto/brno', zobrazeni: 120 });
  assert.deepEqual(souhrn.rust[0], { stranka: '/simulator', zobrazeni: 60, minulyTyden: 10 });
  assert.deepEqual(souhrn.udalostiAkce, [{ nazev: 'simulator', pocet: 33 }]);
  assert.deepEqual(souhrn.hledaniBezVysledku, { navstevy: 6, vyrazu: 2 });
  assert.equal(souhrn.rychlost.obdobi, '2026-09-20 až 2026-10-17');
  const web = souhrn.rychlost.radky[0];
  assert.deepEqual(web, { typ: 'celý web', zarizeni: 'telefon', bezDat: false, lcp: 2100, inp: 180, cls: 0.05, hodnoceni: { lcp: 'dobrá', inp: 'dobrá', cls: 'dobrá' } });
  assert.ok(souhrn.rychlost.radky.some((r) => r.bezDat && r.lcp === null));
});

test('P1: hledané výrazy se do administrace nedostanou, ani když by je JSON obsahoval', () => {
  const surovy = new TextDecoder().decode(souborZeZipu(ZIP, 'souhrn.json'));
  assert.match(surovy, /tajny hledany vyraz/); // fixture je schválně obsahuje
  const { souhrn } = souhrnZArtefaktu(ZIP);
  assert.doesNotMatch(JSON.stringify(souhrn), /tajny hledany vyraz|hledani"/);
  assert.equal('hledani' in souhrn, false);
});

test('neznámá podoba JSON a artefakt bez souhrn.json dají poznámku', () => {
  assert.equal(souhrnZJson({ verze: 2, od: '2026-09-28', do: '2026-10-04' }), null);
  assert.equal(souhrnZJson({ verze: 1, od: 'včera', do: '2026-10-04' }), null);
  const odmitnuty = souhrnZJson({ verze: 1, od: '2026-09-28', do: '2026-10-04', navstevy: null, stranky: null, vynechano: { stranky: 'Matomo odmítlo dotaz stranky' }, rychlost: { vynechano: 'chybí secret CRUX_API_KEY' } });
  assert.equal(odmitnuty.stranky, null);
  assert.equal(odmitnuty.vynechano.stranky, 'Matomo odmítlo dotaz stranky');
  assert.deepEqual(odmitnuty.rychlost, { vynechano: 'chybí secret CRUX_API_KEY' });
  assert.match(souhrnZArtefaktu(ZIP_JEN_MD).poznamka, /nemá souhrn.json/);
  assert.match(souhrnZArtefaktu(new Uint8Array(30)).poznamka, /nepodařilo přečíst/);
});

test('K2: předchozí týdny, nejvýš 13; neúspěšný běh, vypršelý artefakt a opakovaný týden', async () => {
  const behy = [
    beh(20),
    beh(19, { conclusion: 'failure' }),
    beh(18),
    beh(17),
    beh(16, { conclusion: 'cancelled' }),
    beh(15, { status: 'in_progress', conclusion: null }),
    ...Array.from({ length: 20 }, (_, i) => beh(14 - i)),
  ];
  const artefakty = [artefakt(120, 20), artefakt(118, 18), artefakt(117, 17), artefakt(114, 14, { expired: true })];
  const { fetchFn, volani } = mockApi({ behy, artefakty, zipy: { 120: ZIP, 118: ZIP_ULOZENY, 117: ZIP } });
  const s = await nactiSignaly({ token: 'x', fetchFn });
  assert.equal(s.poznamka, null);
  // 13 dokončených běhů (bez zrušeného a rozběhnutého), běh 17 je ruční opakování týdne běhu 20 a vypadne
  assert.equal(s.tydny.length, MAX_TYDNU - 1);
  assert.deepEqual(s.tydny.slice(0, 4).map((t) => t.behId), [20, 19, 18, 14]);
  assert.equal(s.tydny[0].souhrn.do, '2026-10-04');
  assert.equal(s.tydny[1].souhrn, null);
  assert.match(s.tydny[1].poznamka, /běh selhal/);
  assert.equal(s.tydny[2].souhrn.od, '2026-09-21');
  assert.match(s.tydny[3].poznamka, /vypršel/);
  assert.match(s.tydny[4].poznamka, /artefakt chybí/);
  assert.ok(volani[0].includes('branch=main'));
  assert.ok(volani.filter((u) => u.endsWith('/zip')).length <= MAX_TYDNU);
});

test('K3: chyba API nebo bez oprávnění k artefaktům dá poznámku, nevyhodí výjimku', async () => {
  const nedostupne = await nactiSignaly({ fetchFn: async () => { throw new Error('fetch failed'); } });
  assert.deepEqual(nedostupne.tydny, []);
  assert.match(nedostupne.poznamka, /nedostupné \(fetch failed\)/);

  const behy500 = await nactiSignaly({ fetchFn: mockApi({ stav: { '/runs?': 500 } }).fetchFn });
  assert.match(behy500.poznamka, /HTTP 500/);

  const zadnyBeh = await nactiSignaly({ fetchFn: mockApi().fetchFn });
  assert.match(zadnyBeh.poznamka, /zatím na main neběželo/);

  const bezPrava = await nactiSignaly({ fetchFn: mockApi({ behy: [beh(20)], artefakty: [artefakt(120, 20)], stav: { '/zip': 403 } }).fetchFn });
  assert.match(bezPrava.poznamka, /Actions: Read/);
  assert.match(bezPrava.tydny[0].poznamka, /HTTP 403/);
});

test('token jde jen v hlavičce na GitHub API', async () => {
  const hlavicky = [];
  await nactiSignaly({ token: 'TAJNY', fetchFn: async (url, init) => { hlavicky.push([url, init.headers.authorization]); return Response.json({ workflow_runs: [], artifacts: [] }); } });
  assert.ok(hlavicky.every(([u, a]) => u.startsWith('https://api.github.com/') && !u.includes('TAJNY') && a === 'Bearer TAJNY'));
});
