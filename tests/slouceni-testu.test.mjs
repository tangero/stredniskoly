// Věta o více testech musí popisovat totéž sloučení, se kterým stránka počítá (Codex review, kolo 1, nález 1).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { popisSlouceni, slouceneBody } from '../src/lib/slouceni-testu.ts';
import { median } from '../src/lib/prevod-testu-vypocet.ts';

test('simulátor: 40 a 80 bodů se ukáže jako 40, ne průměr 60', () => {
  assert.equal(slouceneBody('nejhorsi', [40, 80], median), 40);
  assert.equal(popisSlouceni('nejhorsi', 2), 'horším z obou výsledků');
  assert.equal(popisSlouceni('nejhorsi', 3), 'nejhorším z 3 výsledků');
});

test('stránka oboru dál používá medián', () => {
  assert.equal(slouceneBody('median', [40, 80], median), 60);
  assert.equal(popisSlouceni('median', 2), 'průměr obou výsledků');
  assert.equal(slouceneBody('median', [], median), null);
});

test('SimulatorClient předává formuláři stejné sloučení, podle kterého řadí', () => {
  const src = readFileSync(new URL('../src/app/simulator/SimulatorClient.tsx', import.meta.url), 'utf8');
  assert.match(src, /bodySkupiny = testy\.nejhorsi/);
  assert.match(src, /<ZadaniTestu[\s\S]*?slouceni="nejhorsi"/);
});
