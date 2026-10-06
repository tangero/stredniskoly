import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { zobrazeneZamereni, nazevSZamerenim, opravyProNabidku2027 } from '../src/lib/opravy-nabidky.ts';

const soubor = JSON.parse(readFileSync(new URL('../src/data/opravy-nabidky-skol.json', import.meta.url), 'utf8'));
const opravy = soubor.opravy;

test('každá oprava má RED IZO, KKOV, zdroj, datum hlášení a číslo issue', () => {
  for (const o of opravy) {
    assert.match(o.redizo, /^\d{9}$/);
    assert.match(o.kkov, /^\d{2}-\d{2}-[A-Z]\/\d{2}$/);
    assert.match(o.zdroj, /^škola/);
    assert.match(o.hlaseno, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Number.isInteger(o.issue));
    assert.ok(['zobrazeni', '2027'].includes(o.plati_pro));
  }
});

test('Opava: obor dostane zaměření od školy', () => {
  assert.equal(
    nazevSZamerenim(opravy, '600017257', '37-42-M/01', 'Logistické a finanční služby', ''),
    'Logistické a finanční služby - Marketing a logistika',
  );
});

test('přepínač oborů na stránce školy bere opravený název, adresu počítá z původního zaměření', () => {
  const zdroj = readFileSync(new URL('../src/app/skola/[slug]/page.tsx', import.meta.url), 'utf8');
  const start = zdroj.indexOf('const nazevProTab');
  const tab = zdroj.slice(start, zdroj.indexOf('return {', zdroj.indexOf('const programsForTabs')));
  assert.match(tab, /const baseName = nazevProTab\(p\)/);
  assert.doesNotMatch(tab, /const baseName = p\.zamereni/);
  assert.match(tab, /createSlug\(school\.nazev, p\.obor, p\.zamereni\)/);
});

test('Ostrava: označení oboru L0+H se nezobrazuje jako zaměření', () => {
  assert.equal(zobrazeneZamereni(opravy, '600171299', '69-41-L/02', '69-53-H/01 Rekondiční a sportovní masér'), '');
  assert.equal(nazevSZamerenim(opravy, '600171299', '69-41-L/02', 'Masér sportovní a rekondiční', '69-53-H/01 Rekondiční a sportovní masér'), 'Masér sportovní a rekondiční');
});

test('jiný obor a jiná škola zůstanou beze změny', () => {
  assert.equal(zobrazeneZamereni(opravy, '600171299', '69-41-L/01', 'Kosmetické služby'), 'Kosmetické služby');
  assert.equal(nazevSZamerenim(opravy, '600000001', '37-42-M/01', 'Logistika', 'Jazyky'), 'Logistika - Jazyky');
});

test('opravy pro 2027 (Boskovice kapacita, Hronov neotevírá) jsou uložené a zobrazení je nečte', () => {
  const pro2027 = opravyProNabidku2027(opravy);
  const boskovice = pro2027.find(o => o.redizo === '600013367' && o.pole === 'kapacita');
  assert.equal(boskovice?.hodnota, 58);
  assert.equal(boskovice?.kkov, '75-31-M/01');
  const hronov = pro2027.find(o => o.redizo === '691012431' && o.pole === 'neotevira');
  assert.equal(hronov?.hodnota, true);
  assert.equal(hronov?.kkov, '34-52-L/01');
  // Zobrazení názvu se jich netýká.
  assert.equal(nazevSZamerenim(opravy, '600013367', '75-31-M/01', 'Předškolní a mimoškolní pedagogika', ''), 'Předškolní a mimoškolní pedagogika');
});
