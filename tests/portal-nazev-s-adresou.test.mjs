import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getNazevSAdresou, getPredvyplnenyProfil } from '../src/lib/portal-skol.ts';

// Ruční oprava úředního názvu (#476) musí dojít i do portálu školy (/pro-skoly/profil),
// ne jen do nadpisu stránky školy. Škola bez opravy má název dál z katalogu.

const opravy = JSON.parse(readFileSync('src/data/opravy-nazvu-skol.json', 'utf8')).skoly;

test('getNazevSAdresou a nazev_s_adresou nesou opravený název', async () => {
  for (const [redizo, o] of Object.entries(opravy)) {
    const nazev = await getNazevSAdresou(redizo);
    assert.ok(nazev.startsWith(o.uplny_nazev), `${redizo}: ${nazev}`);
    const profil = await getPredvyplnenyProfil(redizo, null);
    assert.ok(profil, `${redizo}: škola není v katalogu`);
    assert.equal(profil.nazev_s_adresou, nazev);
  }
});

test('obec v opraveném názvu se nezdvojí', async () => {
  const nazev = await getNazevSAdresou('600007243');
  assert.equal(nazev.split('Čáslav').length - 1, 1, nazev);
});

test('škola bez opravy má název s adresou beze změny', async () => {
  const redizo = '600006247';
  assert.ok(!(redizo in opravy));
  const nazev = await getNazevSAdresou(redizo);
  const profil = await getPredvyplnenyProfil(redizo, null);
  assert.ok(nazev, 'škola není v katalogu');
  assert.equal(profil.nazev_s_adresou, nazev);
  assert.ok(nazev.startsWith(profil.nazev));
});
