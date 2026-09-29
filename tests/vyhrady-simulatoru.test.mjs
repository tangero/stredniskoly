import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const zdroj = readFileSync(new URL('../src/components/simulator/VyhradySimulatoru.tsx', import.meta.url), 'utf8');
const klient = readFileSync(new URL('../src/app/simulator/SimulatorClient.tsx', import.meta.url), 'utf8');

test('výhrady nemají letopočet napevno, rok jde z registru', () => {
  assert.equal(/\b20\d\d\b/.test(zdroj), false);
  assert.match(zdroj, /\{rokPasem\}/);
  assert.match(zdroj, /\{rokKriterii\}/);
});

test('výhrady nepočítají šanci ani procento', () => {
  assert.equal(/%|pravděpodobnost/i.test(zdroj.replace(/\/\*[\s\S]*?\*\//g, '')), false);
  assert.match(zdroj, /nepočítá šanci/);
});

test('blok výhrad je v obou pohledech simulátoru a nad výsledky je zkrácená výhrada', () => {
  assert.equal((klient.match(/\{vyhrady\}/g) ?? []).length, 2);
  assert.match(klient, /<VyhradaNahore/);
});
