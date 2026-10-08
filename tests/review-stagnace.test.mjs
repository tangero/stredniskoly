import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nalezy, podobnost, opakovanyNalez, rozhodniStagnaci } from '../scripts/review/stagnace.mjs';

const ASISTENT = 'eduarda-prijimacky';
const review = (p2, p1 = '') => ({
  autor: ASISTENT,
  telo: `## Review\n\nVerdikt: Nálezy P2\nCommit: abc1234\n\n${p1 ? `### P1\n\n${p1}\n\n` : ''}### P2\n\n${p2}\n\n### P3\n\n- \`src/jiny.ts\` drobnost, kterou nikdo nepočítá.\n`,
});

const A = '- `src/lib/skola.ts`: funkce `nazev` při prázdném vstupu vrací undefined a stránka školy spadne.';
const A2 = '- `src/lib/skola.ts`: funkce `nazev` při prázdném vstupu vrací undefined, takže stránka školy spadne.';
const B = '- `src/lib/mesto.ts`: chybí test pro město bez škol, výpis zůstane prázdný.';

test('nálezy: jen P1 a P2, soubor z první cesty v apostrofech', () => {
  const n = nalezy(review(`${A}\n${B}`, '- `src/x.ts`: pád.').telo);
  assert.deepEqual(n.map((x) => [x.zavaznost, x.soubor]), [['P1', 'src/x.ts'], ['P2', 'src/lib/skola.ts'], ['P2', 'src/lib/mesto.ts']]);
});

test('podobnost: přeformulování je nad 80 %, jiný text pod', () => {
  assert.ok(podobnost(A, A) === 1);
  assert.ok(podobnost(A, A2) > 0.8);
  assert.ok(podobnost(A, B) < 0.3);
});

test('K4: stejný nález ve dvou review po sobě je stagnace a rozhodnutí se změní na strop', () => {
  const komentare = [review(A), { autor: 'tangero', telo: '@claude oprav' }, review(A2)];
  assert.equal(opakovanyNalez(komentare, ASISTENT).stagnace, true);
  const v = rozhodniStagnaci({ akce: 'oprava', duvod: 'kolo 2 z 5' }, komentare, ASISTENT);
  assert.equal(v.akce, 'strop');
  assert.match(v.duvod, /^opakovaný nález P2 v src\/lib\/skola\.ts/);
});

test('K5: první kolo, jiný nález nebo jiný soubor rozhodnutí nemění', () => {
  const beze = { akce: 'oprava', duvod: 'kolo 1 z 5' };
  assert.deepEqual(rozhodniStagnaci(beze, [review(A)], ASISTENT), beze);
  assert.deepEqual(rozhodniStagnaci(beze, [review(A), review(B)], ASISTENT), beze);
  const jinySoubor = A2.replace('src/lib/skola.ts', 'src/lib/jina.ts');
  assert.deepEqual(rozhodniStagnaci(beze, [review(A), review(jinySoubor)], ASISTENT), beze);
});

test('nález jen v P3 nebo review cizího účtu se nepočítá; jiná akce než oprava zůstává', () => {
  const cizi = { ...review(A), autor: 'nekdo' };
  assert.equal(opakovanyNalez([cizi, cizi], ASISTENT).stagnace, false);
  const stop = { akce: 'nic', duvod: 'PR má štítek stop' };
  assert.deepEqual(rozhodniStagnaci(stop, [review(A), review(A)], ASISTENT), stop);
});
