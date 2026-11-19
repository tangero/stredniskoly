import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import yaml from 'js-yaml';
import { coHlidat, textKomentare, nazvyTestu, radkyAnotaci } from '../scripts/provoz/hlidac-pr.mjs';
import { odHlidace, ZNACKA_HLIDACE } from '../scripts/brana/oprava-z-review.mjs';
import { ULOHY } from '../scripts/provoz/planovac.mjs';

const konfig = { rezimy: yaml.load(fs.readFileSync('.github/rezimy.yml', 'utf8')), oblasti: {} };
const SHA = 'e'.repeat(40);
const zelene = [{ nazev: 'TypeScript', stav: 'completed', zaver: 'success' }, { nazev: 'Python testy a kontroly dat', stav: 'completed', zaver: 'success' }];
const pr = (o = {}) => ({ autor: 'tangero', zForku: false, stitky: [], sha: SHA, konflikt: false, testy: zelene, komentare: [], ...o });

test('konflikt s main má přednost před testy', () => {
  assert.deepEqual(coHlidat(pr({ konflikt: true, testy: [{ nazev: 'TypeScript', stav: 'completed', zaver: 'failure' }] }), konfig), { duvod: 'konflikt', cervene: [] });
});

test('červené testy až po doběhnutí všech kontrol', () => {
  const cervene = [{ nazev: 'TypeScript', stav: 'completed', zaver: 'failure' }, { nazev: 'Integrace katalogu', stav: 'in_progress', zaver: null }];
  assert.equal(coHlidat(pr({ testy: cervene }), konfig), null);
  cervene[1] = { nazev: 'Integrace katalogu', stav: 'completed', zaver: 'timed_out' };
  assert.deepEqual(coHlidat(pr({ testy: cervene }), konfig), { duvod: 'testy', cervene: ['TypeScript', 'Integrace katalogu'] });
  assert.equal(coHlidat(pr(), konfig), null);
});

test('cizí autor, fork a štítky schvaleno, stop, potrebuje-cloveka hlídač vynechá', () => {
  const k = { konflikt: true };
  assert.equal(coHlidat(pr({ ...k, autor: 'dependabot[bot]' }), konfig), null);
  assert.equal(coHlidat(pr({ ...k, autor: konfig.rezimy.automatika }), konfig), null);
  assert.equal(coHlidat(pr({ ...k, zForku: true }), konfig), null);
  for (const s of ['schvaleno', 'stop', 'potrebuje-cloveka']) assert.equal(coHlidat(pr({ ...k, stitky: [s] }), konfig), null);
  assert.notEqual(coHlidat(pr({ ...k, autor: 'eduarda-prijimacky' }), konfig), null);
});

test('za hlavu a důvod jen jednou; značku od jiného účtu nebere', () => {
  const telo = textKomentare({ sha: SHA, duvod: 'konflikt' });
  assert.equal(coHlidat(pr({ konflikt: true, komentare: [{ autor: konfig.rezimy.automatika, telo }] }), konfig), null);
  assert.notEqual(coHlidat(pr({ konflikt: true, komentare: [{ autor: 'nekdo', telo }] }), konfig), null);
  // Nová hlava nebo jiný důvod se hlásí znovu.
  assert.notEqual(coHlidat(pr({ konflikt: true, sha: 'f'.repeat(40), komentare: [{ autor: konfig.rezimy.automatika, telo }] }), konfig), null);
});

test('komentář hlídače spustí smyčku oprav: @claude na začátku a značka, kterou smyčka přečte', () => {
  const telo = textKomentare({ sha: SHA, duvod: 'testy', cervene: ['TypeScript'], chyby: ['TypeScript: src/a.ts:3 chyba'] });
  assert.match(telo, /^@claude /);
  assert.ok(telo.includes(ZNACKA_HLIDACE(SHA, 'testy')));
  assert.match(telo, /src\/a\.ts:3 chyba/);
  assert.deepEqual(odHlidace({ autor: konfig.rezimy.automatika, telo }, konfig), { sha: SHA, duvod: 'testy' });
});

test('testy jsou joby workflow Testy bez nasazení na Vercel', () => {
  const nazvy = nazvyTestu(fs.readFileSync('.github/workflows/testy.yml', 'utf8'));
  assert.ok(nazvy.includes('TypeScript'));
  assert.ok(nazvy.includes('Python testy a kontroly dat'));
  assert.ok(!nazvy.some((n) => /Vercel/.test(n)));
});

test('anotace: jen chyby, zkrácené', () => {
  const r = radkyAnotaci([
    { annotation_level: 'warning', message: 'varování', path: 'a', start_line: 1 },
    { annotation_level: 'failure', message: 'Process completed with exit code 1.', path: '.github', start_line: 1 },
    { annotation_level: 'failure', message: 'x'.repeat(500), path: 'src/b.ts', start_line: 9 },
  ]);
  assert.equal(r.length, 2);
  assert.equal(r[0], 'Process completed with exit code 1.');
  assert.ok(r[1].startsWith('src/b.ts:9 ') && r[1].length === 200);
});

test('hlídač spouští Plánovač každou hodinu a workflow píše tokenem App', () => {
  assert.ok(ULOHY.some((u) => u.workflow === 'hlidac-pr.yml' && u.interval === 60));
  const w = yaml.load(fs.readFileSync('.github/workflows/hlidac-pr.yml', 'utf8'));
  const kroky = w.jobs.hlidac.steps;
  assert.ok(kroky.some((s) => String(s.uses || '').startsWith('actions/create-github-app-token@')));
  assert.equal(w.jobs.hlidac.permissions['pull-requests'], 'read');
  assert.match(kroky.find((s) => s.name === 'Hlídač').env.APP_TOKEN, /steps\.app\.outputs\.token/);
});
