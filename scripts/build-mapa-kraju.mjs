#!/usr/bin/env node
/**
 * Obrysy 14 krajů pro mapu na /veletrhy (docs/navrh-mapa-a-odkazy-veletrhu-2027.md).
 *
 * Zdroj: RÚIAN, ČÚZK, vrstva VUSC_P ze SHP za celý stát (EPSG:5514),
 * licence CC BY 4.0. Stažení (asi 250 MB) je ruční, výsledek se commituje,
 * takže build ani web na ČÚZK nezávisí:
 *
 *   curl -L -o stat.zip https://services.cuzk.gov.cz/shp/stat/epsg-5514/1.zip
 *   unzip stat.zip '1/VUSC_P.*'
 *   node scripts/build-mapa-kraju.mjs --vstup 1/VUSC_P.shp --stazeno 2026-09-28
 *
 * Výstup `src/data/mapa-kraju.json`: pro každý kraj kód NUTS 3 (klíč na
 * `krajKod` veletrhů), cesta SVG a bod štítku uvnitř plochy. Názvy krajů
 * záměrně nenese: web je bere z `src/lib/kraje.mjs` a druhý zdroj názvů
 * by se s ním rozešel.
 *
 * Zjednodušení dělá mapshaper (pevná verze přes npx): topologicky, takže
 * sousední kraje sdílejí hranici a mezi nimi nevzniknou škvíry.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const VYSTUP = path.join(ROOT, 'src', 'data', 'mapa-kraju.json');
const MAPSHAPER = 'mapshaper@0.6.121';
/** Podíl ponechaných bodů; 1 % stačí na obrázek do šířky 720 px. */
const ZJEDNODUSENI = '1%';
/** Šířka viewBoxu; jednotka pak odpovídá zhruba 470 m. */
const SIRKA = 1000;

const argv = process.argv.slice(2);
const arg = (jmeno) => (argv.includes(jmeno) ? argv[argv.indexOf(jmeno) + 1] : null);
const vstup = arg('--vstup');
const stazeno = arg('--stazeno');
if (!vstup || !stazeno || !/^\d{4}-\d{2}-\d{2}$/.test(stazeno)) {
  console.error('Použití: node scripts/build-mapa-kraju.mjs --vstup 1/VUSC_P.shp --stazeno RRRR-MM-DD');
  process.exit(1);
}

// Mapshaper neumí WKT S-JTSK (Křovák) a na .prj spadne. Souřadnice
// nepřevádíme, jen je posuneme a otočíme osu y, takže .prj nepotřebujeme:
// do dočasné složky jde jen .shp, .shx, .dbf a .cpg.
const docasna = fs.mkdtempSync(path.join(os.tmpdir(), 'mapa-kraju-'));
const zaklad = vstup.replace(/\.shp$/i, '');
for (const pripona of ['.shp', '.shx', '.dbf', '.cpg']) {
  if (fs.existsSync(zaklad + pripona)) fs.copyFileSync(zaklad + pripona, path.join(docasna, `VUSC_P${pripona}`));
}
const shp = path.join(docasna, 'VUSC_P.shp');
const mapshaper = (...args) => execFileSync('npx', ['--yes', MAPSHAPER, ...args], { stdio: ['ignore', 'ignore', 'inherit'] });

const obrysy = path.join(docasna, 'obrysy.json');
const body = path.join(docasna, 'body.json');
mapshaper(shp, '-simplify', ZJEDNODUSENI, 'weighted', 'keep-shapes', '-clean', '-o', 'format=geojson', obrysy);
// Bod uvnitř plochy („pole of inaccessibility“): u protáhlých krajů by
// těžiště padlo mimo ně nebo na souseda, u Středočeského do Prahy.
mapshaper(shp, '-points', 'inner', '-o', 'format=geojson', body);

const kraje = JSON.parse(fs.readFileSync(obrysy, 'utf-8')).features;
const stitky = new Map(
  JSON.parse(fs.readFileSync(body, 'utf-8')).features.map((f) => [f.properties.NUTS3_KOD, f.geometry.coordinates]),
);
if (kraje.length !== 14) throw new Error(`Čekáno 14 krajů, vrstva jich má ${kraje.length}.`);

const prstence = (g) => (g.type === 'Polygon' ? g.coordinates : g.coordinates.flat());
let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
for (const f of kraje) {
  for (const [x, y] of prstence(f.geometry).flat()) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
}
// EPSG:5514 East-North: x roste k východu, y k severu (obě záporné).
// SVG má y dolů, proto maxY − y.
const meritko = SIRKA / (maxX - minX);
const vyska = Math.round((maxY - minY) * meritko);
const bod = ([x, y]) => [Math.round((x - minX) * meritko), Math.round((maxY - y) * meritko)];

function cesta(geometrie) {
  return prstence(geometrie)
    .map((prstenec) => {
      const pts = prstenec.map(bod).filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
      return `M${pts.map((p) => p.join(' ')).join('L')}Z`;
    })
    .join('');
}

const vysledek = {
  zdroj: 'RÚIAN, ČÚZK, vrstva VUSC_P (services.cuzk.gov.cz/shp/stat/epsg-5514/1.zip)',
  licence: 'CC BY 4.0, © ČÚZK',
  stazeno,
  zjednoduseni: ZJEDNODUSENI,
  viewBox: [SIRKA, vyska],
  kraje: kraje
    .map((f) => {
      const kod = f.properties.NUTS3_KOD;
      if (!stitky.has(kod)) throw new Error(`Kraj ${kod} nemá bod štítku.`);
      return { kod, d: cesta(f.geometry), stitek: bod(stitky.get(kod)) };
    })
    .sort((a, b) => a.kod.localeCompare(b.kod)),
};

fs.writeFileSync(VYSTUP, JSON.stringify(vysledek, null, 1) + '\n');
fs.rmSync(docasna, { recursive: true, force: true });
console.log(`Zapsáno ${path.relative(ROOT, VYSTUP)}: ${vysledek.kraje.length} krajů, viewBox ${SIRKA}×${vyska}, ${fs.statSync(VYSTUP).size} B`);
