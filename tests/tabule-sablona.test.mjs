// Šablona tabule pro další repozitáře (#561, E3): stav karty, Pro lidi, Čeká na a workflow.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STAVY, CEKA_NA, propojenaIssues, stavKarty, proLidi, cekaNa, seznamUctu, cilKarty, zmenitCekaNa,
} from '../docs/sablony/tabule-repozitar/tabule.mjs';

const ucty = { vlastnik: 'vlastnik-uctu', kolegove: ['kolega-uctu'] };

test('stav karty jen z otevřeného nebo zavřeného issue a otevřeného PR', () => {
  assert.equal(stavKarty({ stav: 'OPEN', maOtevrenyPr: false }), STAVY.nove);
  assert.equal(stavKarty({ stav: 'OPEN', maOtevrenyPr: true }), STAVY.vPraci);
  assert.equal(stavKarty({ stav: 'CLOSED', maOtevrenyPr: true }), STAVY.hotovo);
});

test('odkazy z PR na issues jako v bráně (Closes, Fixes, Souvisí s)', () => {
  assert.deepEqual(propojenaIssues('Closes #12\nSouvisí s #7, fixes: #12 a #99 bez slova'), [12, 7]);
  assert.deepEqual(propojenaIssues(null), []);
});

test('Pro lidi z řádku, z nadpisu formuláře, jinak název issue', () => {
  assert.deepEqual(proLidi({ titulek: 'T', telo: 'Zdroj: vlastník\nPro lidi: Rodina uvidí  termíny.\n' }), { text: 'Rodina uvidí termíny.', chybi: false });
  assert.deepEqual(proLidi({ titulek: 'T', telo: '### Pro lidi\n\nKratší text.\n' }), { text: 'Kratší text.', chybi: false });
  assert.deepEqual(proLidi({ titulek: 'Název issue', telo: 'Pro lidi: <!-- doplň -->' }), { text: 'Název issue', chybi: true });
  assert.ok(proLidi({ titulek: 'x'.repeat(300) }).text.endsWith('…'));
});

test('Čeká na podle přiřazení', () => {
  assert.equal(cekaNa({ stav: 'CLOSED', prirazeni: ['vlastnik-uctu'] }, ucty), CEKA_NA.nikdo);
  assert.equal(cekaNa({ stav: 'OPEN', prirazeni: ['vlastnik-uctu', 'kolega-uctu'] }, ucty), CEKA_NA.kolega);
  assert.equal(cekaNa({ stav: 'OPEN', prirazeni: ['vlastnik-uctu'] }, ucty), CEKA_NA.vlastnik);
  assert.equal(cekaNa({ stav: 'OPEN', prirazeni: ['nejaky-agent'] }, ucty), CEKA_NA.ai);
  assert.equal(cekaNa({ stav: 'OPEN', prirazeni: [] }, ucty), null);
});

test('účty kolegů z proměnné repozitáře', () => {
  assert.deepEqual(seznamUctu('a, b  c,a'), ['a', 'b', 'c']);
  assert.deepEqual(seznamUctu(undefined), []);
});

test('cíl karty skládá stav, Pro lidi a Čeká na', () => {
  const issue = { cislo: 5, stav: 'OPEN', titulek: 'Oprava', telo: 'Pro lidi: Web se načte rychleji.', prirazeni: ['vlastnik-uctu'] };
  assert.deepEqual(cilKarty(issue, { otevrenePr: new Set([5]), ...ucty }), { stav: STAVY.vPraci, proLidi: 'Web se načte rychleji.', cekaNa: CEKA_NA.vlastnik });
});

test('workflow šablony: jen PROJECT_TOKEN, jen čtení a bez kódu z PR', () => {
  const yml = readFileSync(new URL('../docs/sablony/tabule-repozitar/tabule.yml', import.meta.url), 'utf8');
  assert.deepEqual([...new Set(yml.match(/secrets\.\w+/g))], ['secrets.PROJECT_TOKEN']);
  const opravneni = yml.match(/^permissions:\n((?: {2}.+\n)+)/m)[1];
  assert.doesNotMatch(opravneni, /write/);
  assert.match(yml, /pull_request_target/);
  assert.doesNotMatch(yml, /github\.event\.pull_request\.head/);
  assert.match(yml, /node \.github\/tabule\/tabule\.mjs/);
  // Šablona nesmí nést logiku štítků brány sloučení (#561, bod 4).
  const skript = readFileSync(new URL('../docs/sablony/tabule-repozitar/tabule.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(skript, /schvaleno|navrh|k-overeni|brana/);
});

test('zavřené issue s prázdným polem „Čeká na“ se přepíše na „nikdo“', () => {
  const cil = cilKarty({ cislo: 1, stav: 'CLOSED', titulek: 'x', telo: '', stitky: [], prirazeni: [] }, { otevrenePr: new Set(), ...ucty });
  assert.equal(cil.cekaNa, CEKA_NA.nikdo);
  assert.equal(zmenitCekaNa(cil, { cekaNa: null }), true);
  assert.equal(zmenitCekaNa(cil, { cekaNa: CEKA_NA.nikdo }), false);
});
