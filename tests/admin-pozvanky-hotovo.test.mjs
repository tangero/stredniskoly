import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Po úspěšné rozesílce ukazovala administrace velkou „0“ nad větou „školy
// dostanou pozvánku“. Nula tam znamená dvě opačné věci — hotovo, nebo není co
// poslat — a v tom lepším případě vypadala jako selhání. Zadavatel to hlásil
// jako matoucí hned po ostré rozesílce 20 pozvánek.

const zdroj = readFileSync('src/app/admin/portal/pozvanky/page.tsx', 'utf8');

test('nula k odeslání se rozlišuje na „hotovo“ a „není co poslat“', () => {
  assert.match(zdroj, /const hotovo =/, 'chybí rozlišení obou významů nuly');
  assert.match(zdroj, /\{hotovo \?/, 'hlavní číslo na rozlišení nereaguje');
  assert.match(zdroj, /Hotovo/, 'chybí text pro dokončenou rozesílku');
});

test('za hotové se nevydá prázdný pilot ani uvázlé školy', () => {
  // Bez `celkem > 0` by prázdný seznam hlásil „Hotovo“, aniž by cokoli odešlo;
  // bez shody `jizOdeslano === celkem` by to hlásil i pilot, kde školy uvázly
  // na chybějícím kódu — tedy přesně tam, kde je potřeba zasáhnout.
  const radek = zdroj.split('\n').find((r) => r.includes('const hotovo ='));
  assert.ok(radek, 'podmínka se nenašla');
  assert.match(radek, /pocty\.celkem > 0/, 'prázdný pilot by hlásil hotovo');
  assert.match(radek, /pocty\.jizOdeslano === pocty\.celkem/, 'uvázlé školy by hlásily hotovo');
});

test('věta o počtu škol se neopakuje ve dvou stejných větvích', () => {
  // Původní ternár měl obě větve shodné („škol pilotu“ : „škol pilotu“).
  assert.doesNotMatch(zdroj, /'škol pilotu' : 'škol pilotu'/, 'ternár s totožnými větvemi');
});
