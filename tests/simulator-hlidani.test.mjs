import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Výběr škol k hlídání v simulátoru (#523, E6b), bez sítě a bez databáze.
const { skolyKHlidani, MAX_SKOL_K_HLIDANI } = await import('../src/lib/simulator-hlidani.ts');
const { urciZdroj } = await import('../src/lib/novinky-zdroje.ts');
const { MAX_SKOL_NA_ZADOST } = await import('../src/lib/novinky-odber.ts');

const nazvy = { '600000001': 'Gymnázium Smyšlené', '600000002': 'Průmyslovka Smyšlená' };
const nazev = (id) => nazvy[id.split('_')[0]] ?? null;

test('obory téže školy se sloučí a pořadí drží pořadí zvažovaných', () => {
  const ids = ['600000002_2341M01', '600000001_7941K41', '600000002_1820M01_zamereni'];
  assert.deepEqual(skolyKHlidani(ids, nazev), [
    { redizo: '600000002', nazev: 'Průmyslovka Smyšlená' },
    { redizo: '600000001', nazev: 'Gymnázium Smyšlené' },
  ]);
});

test('obor mimo katalog a neplatné id se nenabídnou', () => {
  assert.deepEqual(skolyKHlidani(['600000009_7941K41', 'nesmysl', '12_x'], nazev), []);
});

test('počet škol nepřekročí limit žádosti o hlídání', () => {
  assert.equal(MAX_SKOL_K_HLIDANI, MAX_SKOL_NA_ZADOST);
  const ids = Array.from({ length: 30 }, (_, i) => `${String(600000100 + i)}_7941K41`);
  assert.equal(skolyKHlidani(ids, () => 'Škola').length, MAX_SKOL_K_HLIDANI);
});

test('zdroj simulator-hlidat je povolený', () => {
  assert.equal(urciZdroj('simulator-hlidat'), 'simulator-hlidat');
});

test('simulátor nabídne hlídání jen při zapnutém hlídání a po zadání výsledku testu (K15)', () => {
  const kod = readFileSync(new URL('../src/app/simulator/SimulatorClient.tsx', import.meta.url), 'utf8');
  assert.match(kod, /hlidani && bodySkupiny !== null \? skolyKHlidani\(/);
  assert.match(kod, /skolyHlidani\.length > 0 && <HlidatZvazovaneSkoly/);
  const stranka = readFileSync(new URL('../src/app/simulator/page.tsx', import.meta.url), 'utf8');
  assert.match(stranka, /hlidani=\{jeHlidaniZapnuto\(\)\}/);
  const blok = readFileSync(new URL('../src/components/novinky/HlidatZvazovaneSkoly.tsx', import.meta.url), 'utf8');
  // Školy ani souhlas nejsou předem zaškrtnuté.
  assert.match(blok, /useState<string\[\]>\(\[\]\)/);
  assert.match(blok, /const \[souhlas, setSouhlas\] = useState\(false\)/);
});
