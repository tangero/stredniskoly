import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { zavadec } from './_zavadec.mjs';

const { opravenyNazevSkoly } = zavadec()('src/lib/opravy-nazvu-skol.ts');
const { uplnyNazevZRejstriku } = zavadec()('src/lib/rejstrik-nazev-skoly.ts');
const { getIdentifikaceSkoly } = zavadec()('src/lib/portal-identifikace.ts');

const opravy = JSON.parse(readFileSync('src/data/opravy-nazvu-skol.json', 'utf8')).skoly;

test('každá oprava názvu má název, zdroj, datum platnosti a číslo issue', () => {
  for (const [redizo, o] of Object.entries(opravy)) {
    assert.match(redizo, /^\d{9}$/);
    assert.ok(o.uplny_nazev?.trim(), `${redizo}: chybí uplny_nazev`);
    assert.ok(o.zdroj, `${redizo}: chybí zdroj`);
    assert.match(o.platne_od, /^\d{4}-\d{2}-\d{2}$/, `${redizo}: platne_od`);
    assert.ok(Number.isInteger(o.issue), `${redizo}: chybí issue`);
  }
});

test('oprava přebije název z rejstříku v nadpisu i v portálu', async () => {
  for (const [redizo, o] of Object.entries(opravy)) {
    assert.equal(await opravenyNazevSkoly(redizo), o.uplny_nazev);
    assert.equal(await uplnyNazevZRejstriku(redizo), o.uplny_nazev);
    assert.equal((await getIdentifikaceSkoly(redizo, 'Katalog')).nazev, o.uplny_nazev);
  }
});

test('škola bez opravy má název dál z rejstříku', async () => {
  assert.equal(await opravenyNazevSkoly('000000000'), null);
});
