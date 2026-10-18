import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getNazevSAdresou, getPredvyplnenyProfil, nazevSAdresou } from '../src/lib/portal-skol.ts';

// Název školy v portálu (/pro-skoly/profil, přepínač škol, kritéria, issue a zprávy) se bere
// v pořadí: ruční oprava → úplný název z rejstříku MŠMT → katalog s ulicí a obcí (#515).
// Ruční oprava (#476, #374) i název z rejstříku jsou úplné úřední názvy, ulice ani obec se
// k nim nepřidávají.

const opravy = JSON.parse(readFileSync('src/data/opravy-nazvu-skol.json', 'utf8')).skoly;
const identifikace = JSON.parse(readFileSync('data/msmt_rejstrik/nazvy-oboru.json', 'utf8')).identifikace ?? {};

test('getNazevSAdresou a nazev_s_adresou nesou opravený název', async () => {
  for (const [redizo, o] of Object.entries(opravy)) {
    const nazev = await getNazevSAdresou(redizo);
    // Oprava je úplný úřední název: ulice ani obec se k ní nepřidávají (#374).
    assert.equal(nazev, o.uplny_nazev, redizo);
    const profil = await getPredvyplnenyProfil(redizo, null);
    assert.ok(profil, `${redizo}: škola není v katalogu`);
    assert.equal(profil.nazev_s_adresou, nazev);
  }
});

test('obec v opraveném názvu se nezdvojí', async () => {
  const nazev = await getNazevSAdresou('600007243');
  assert.equal(nazev.split('Čáslav').length - 1, 1, nazev);
});

test('K1: nadpis profilu 600171388 ukáže úřední název bez zdvojené ulice (#374, #515)', async () => {
  const ocekavany = opravy['600171388']?.uplny_nazev || identifikace['600171388']?.uplny_nazev;
  assert.equal(ocekavany, 'Střední škola řemesel, Šumperk');
  assert.equal(await getNazevSAdresou('600171388'), ocekavany);
  assert.equal((await getPredvyplnenyProfil('600171388', null)).nazev_s_adresou, ocekavany);
  const caslav = await getNazevSAdresou('600007243');
  assert.equal(caslav, opravy['600007243']?.uplny_nazev || identifikace['600007243']?.uplny_nazev);
  assert.ok(!caslav.includes('Masarykova'), caslav);
});

test('K1: škola bez opravy má úplný název z rejstříku, bez přidané ulice a obce (#515)', async () => {
  const redizo = '600006247';
  assert.ok(!(redizo in opravy));
  const zRejstriku = identifikace[redizo]?.uplny_nazev;
  assert.ok(zRejstriku, 'škola není v rejstříku');
  const nazev = await getNazevSAdresou(redizo);
  const profil = await getPredvyplnenyProfil(redizo, null);
  assert.equal(nazev, zRejstriku);
  assert.equal(profil.nazev_s_adresou, zRejstriku);
  // Zkrácený název z katalogu (z něj vzniká adresa stránky školy) zůstává (P1).
  assert.notEqual(profil.nazev, zRejstriku);
});

test('K2: škola z katalogu bez záznamu v rejstříku má název z katalogu s ulicí a obcí', async () => {
  const katalog = JSON.parse(readFileSync('public/schools_data.json', 'utf8'));
  const rocnik = Object.keys(katalog).filter((k) => /^\d{4}$/.test(k)).sort().at(-1);
  const radek = katalog[rocnik].find(
    (s) => !identifikace[String(s.redizo)]?.uplny_nazev && !(String(s.redizo) in opravy),
  );
  if (!radek) return; // všechny školy katalogu jsou v rejstříku; ověří to test na smyšlených datech
  const redizo = String(radek.redizo);
  const profil = await getPredvyplnenyProfil(redizo, null);
  assert.ok(profil, `${redizo}: škola není v zobrazeném katalogu`);
  const nazev = await getNazevSAdresou(redizo);
  assert.equal(nazev, nazevSAdresou(profil.nazev, String(radek.ulice || ''), profil.obec));
  assert.equal(profil.nazev_s_adresou, nazev);
  assert.ok(nazev.startsWith(profil.nazev) && nazev.endsWith(`, ${profil.obec}`), nazev);
});

test('K1–K3 na smyšlených datech: oprava → rejstřík → katalog s ulicí a obcí', () => {
  // Modul čte soubory z process.cwd(), proto se spouští v dočasném adresáři s vlastními daty.
  const koren = mkdtempSync(path.join(tmpdir(), 'portal-nazev-'));
  try {
    const zapis = (soubor, data) => {
      mkdirSync(path.dirname(path.join(koren, soubor)), { recursive: true });
      writeFileSync(path.join(koren, soubor), JSON.stringify(data));
    };
    const radek = (redizo, nazev, ulice, obec) => ({ redizo, nazev, ulice, obec, kraj: 'Kraj', obor: 'Gymnázium' });
    zapis('public/schools_data.json', {
      2026: [
        radek('900000001', 'Gymnázium', 'Dlouhá 12', 'Lhota'),
        radek('900000002', 'Gymnázium', 'Krátká 3', 'Lhota'),
        radek('900000003', 'Střední škola', 'Polní 7', 'Ves'),
      ],
    });
    zapis('public/stav_datovych_sad.json', { sady: {} });
    zapis('data/msmt_rejstrik/nazvy-oboru.json', {
      identifikace: {
        900000001: { uplny_nazev: 'Gymnázium, Lhota, Dlouhá 12', adresa: 'Dlouhá 12, 100 00 Lhota' },
        900000002: { uplny_nazev: 'Gymnázium Krátká, Lhota', adresa: 'Krátká 3, 100 00 Lhota' },
      },
    });
    zapis('src/data/opravy-nazvu-skol.json', { skoly: { 900000002: { uplny_nazev: 'Gymnázium Nové jméno, Lhota' } } });
    const modul = path.resolve('src/lib/portal-skol.ts');
    const skript = `
      const { getNazevSAdresou, getPredvyplnenyProfil } = await import(${JSON.stringify(modul)});
      const vysledek = {};
      for (const r of ['900000001', '900000002', '900000003', '900000009']) {
        vysledek[r] = [await getNazevSAdresou(r), (await getPredvyplnenyProfil(r, null))?.nazev_s_adresou ?? null];
      }
      console.log(JSON.stringify(vysledek));`;
    const vystup = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', skript], {
      cwd: koren,
      encoding: 'utf8',
    });
    const v = JSON.parse(vystup.trim().split('\n').at(-1));
    // K1: název z rejstříku přesně, bez přidané ulice a obce
    assert.deepEqual(v['900000001'], ['Gymnázium, Lhota, Dlouhá 12', 'Gymnázium, Lhota, Dlouhá 12']);
    // K3: ruční oprava má přednost před rejstříkem
    assert.deepEqual(v['900000002'], ['Gymnázium Nové jméno, Lhota', 'Gymnázium Nové jméno, Lhota']);
    // K2: škola mimo rejstřík má katalogový název s ulicí a obcí
    assert.deepEqual(v['900000003'], ['Střední škola Polní, Ves', 'Střední škola Polní, Ves']);
    // Škola mimo katalog nemá v portálu profil ani název
    assert.deepEqual(v['900000009'], ['', null]);
  } finally {
    rmSync(koren, { recursive: true, force: true });
  }
});
