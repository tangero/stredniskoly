import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { vypsanaNabidkaBezZamereni } from '../src/lib/school-key.ts';

test('vypsaná nabídka bez zaměření vedle nevypsaných loňských zaměření', () => {
  const zaznamy = [
    { id: '600005216_65-42-M/02', rok: 2026 },
    { id: '600005216_65-42-M/02_Denní', zamereni: 'Denní', nevypsano_2026: true },
    { id: '600005216_65-42-M/02_Kombinovaná', zamereni: 'Kombinovaná', nevypsano_2026: true },
  ];
  assert.equal(vypsanaNabidkaBezZamereni(zaznamy, '600005216_65-42-M/02'), true);
});

test('nevypsaný záznam bez zaměření ani jen zaměření stránku nepřidají', () => {
  assert.equal(vypsanaNabidkaBezZamereni([{ id: 'X_K', nevypsano_2026: true }], 'X_K'), false);
  assert.equal(vypsanaNabidkaBezZamereni([{ id: 'X_K_a', zamereni: 'a' }, { id: 'X_K_b', zamereni: 'b' }], 'X_K'), false);
  // Jiný obor téže školy se nepočítá.
  assert.equal(vypsanaNabidkaBezZamereni([{ id: 'X_K2' }], 'X_K'), false);
});

test('v katalogu je nabídka 600005216_65-42-M/02 vypsaná bez zaměření', () => {
  const katalog = JSON.parse(fs.readFileSync('public/schools_data.json', 'utf-8'));
  const rok = katalog['2026'];
  if (!rok) return;
  assert.equal(vypsanaNabidkaBezZamereni(rok, '600005216_65-42-M/02'), true);
});
