import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { zavadec } from './_zavadec.mjs';

const { opravenyNazevSkoly } = zavadec()('src/lib/opravy-nazvu-skol.ts');

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

// Opravy, které rejstřík nese shodně, byly odstraněny (#515) a seznam je prázdný. Mechanismus se proto
// ověřuje na smyšlených datech: moduly čtou soubory z process.cwd(), a tak se načtou znovu
// (nový zavaděč = nová cache) v dočasném adresáři.
test('oprava přebije název z rejstříku v nadpisu i v portálu', async () => {
  const puvodni = process.cwd();
  const zdroje = path.resolve('src/lib');
  const koren = mkdtempSync(path.join(tmpdir(), 'opravy-nazvu-'));
  try {
    const zapis = (soubor, data) => {
      mkdirSync(path.dirname(path.join(koren, soubor)), { recursive: true });
      writeFileSync(path.join(koren, soubor), JSON.stringify(data));
    };
    zapis('src/data/opravy-nazvu-skol.json', {
      skoly: { 900000001: { uplny_nazev: 'Gymnázium Nové jméno, Lhota', platne_od: '2026-09-01', zdroj: 'test', issue: 1 } },
    });
    zapis('data/msmt_rejstrik/nazvy-oboru.json', {
      identifikace: {
        900000001: { uplny_nazev: 'Gymnázium, Lhota, Dlouhá 12', ico: '00000001', adresa: 'Dlouhá 12, 100 00 Lhota' },
        900000002: { uplny_nazev: 'Gymnázium, Ves, Krátká 3', ico: '00000002', adresa: 'Krátká 3, 100 00 Ves' },
      },
    });
    // Načíst z kořene repozitáře (zavaděč tak řeší `@/…`), soubory se čtou až při volání.
    const nacti = zavadec();
    const { opravenyNazevSkoly: oprava } = nacti(path.join(zdroje, 'opravy-nazvu-skol.ts'));
    const { uplnyNazevZRejstriku } = nacti(path.join(zdroje, 'rejstrik-nazev-skoly.ts'));
    const { getIdentifikaceSkoly } = nacti(path.join(zdroje, 'portal-identifikace.ts'));
    process.chdir(koren);
    assert.equal(await oprava('900000001'), 'Gymnázium Nové jméno, Lhota');
    assert.equal(await uplnyNazevZRejstriku('900000001'), 'Gymnázium Nové jméno, Lhota');
    assert.equal((await getIdentifikaceSkoly('900000001', 'Katalog')).nazev, 'Gymnázium Nové jméno, Lhota');
    // Bez opravy platí rejstřík
    assert.equal(await oprava('900000002'), null);
    assert.equal(await uplnyNazevZRejstriku('900000002'), 'Gymnázium, Ves, Krátká 3');
    assert.equal((await getIdentifikaceSkoly('900000002', 'Katalog')).nazev, 'Gymnázium, Ves, Krátká 3');
  } finally {
    process.chdir(puvodni);
    rmSync(koren, { recursive: true, force: true });
  }
});

test('škola bez opravy má název dál z rejstříku', async () => {
  assert.equal(await opravenyNazevSkoly('000000000'), null);
});
