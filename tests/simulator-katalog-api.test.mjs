/**
 * Katalog simulátoru z /api/schools/search nese zřizovatele (#210).
 *
 * Nález code review PR #211: nabídky 2026 (applications_2026.json) zřizovatele
 * nemají, API ho proto posílalo vždy jako null a filtr zřizovatele skryl všechny
 * nabídky. Test jde přes skutečnou trasu, ne přes JSON katalogu.
 *
 * Spuštění: npm run test:mesto
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../src/app/api/schools/search/route.ts';
import { matchesZrizovatel } from '../src/lib/simulator-filter.ts';

async function dotaz(params) {
  const res = await GET({ nextUrl: new URL(`http://localhost/api/schools/search?${params}`) });
  return res.json();
}

test('katalog simulátoru: skoro každá nabídka má zřizovatele a filtr nic nevyprázdní', async () => {
  const { schools } = await dotaz('simulatorCatalog=1');
  assert.ok(schools.length > 1000, `katalog má jen ${schools.length} nabídek`);
  const bez = schools.filter(s => !s.zrizovatel).length;
  // Zřizovatele nemají jen školy, které v katalogu dřívějších let nebyly (30. 9. 2026: 44 z 3 091).
  assert.ok(bez / schools.length < 0.05, `bez zřizovatele ${bez} z ${schools.length}`);
  for (const druh of ['verejna', 'soukroma', 'cirkevni']) {
    const n = schools.filter(s => matchesZrizovatel(s, [druh])).length;
    assert.ok(n > 0 && n < schools.length, `${druh}: ${n} z ${schools.length}`);
  }
});

test('uložené nabídky načtené přes ids nesou zřizovatele taky', async () => {
  const { schools: katalog } = await dotaz('simulatorCatalog=1');
  // Vzorek se nevybírá podle zřizovatele, jinak by bez něj test prošel naprázdno.
  const vzorek = katalog.slice(0, 20).map(s => s.id);
  const { schools } = await dotaz(`ids=${encodeURIComponent(vzorek.join(','))}`);
  assert.equal(schools.length, vzorek.length);
  const se = schools.filter(s => s.zrizovatel).length;
  assert.ok(se >= 15, `zřizovatele má jen ${se} z ${schools.length} uložených nabídek`);
});
