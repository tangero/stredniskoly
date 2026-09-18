// ============================================================================
// Značky oborů, které přehled nezahrnuje, v tabulce „Obory výš a níž“.
//
// Proč tenhle test existuje: code review PR #99 našlo, že nové mapování
// `mimo_prehled` → značka → popisek nekryl žádný test, takže chybu v něm by CI
// nechytilo. Logika navíc žila jako vnořený ternární výraz v komponentě a v
// datové vrstvě, kde se testovat nedala.
//
// Test drží dvě tvrzení:
//  1. tři stavy značky, ne dva — obor, o kterém nevíme nic, není „mimo přehled“,
//  2. popisky odpovídají slovníku pojmů.
//
// Že kategorie C, E, H, J a P znamenají obor bez jednotné zkoušky (teze R10),
// drží `tests/test_kontext_mimo_prehled.py` tam, kde ten výpočet žije. Zdvojovat
// to tady by dalo pokrytí, které nic neověřuje: značka dostává hotový příznak.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { popisekObtiznosti, znackaMimoPrehled } from '../src/lib/obor-profil.ts';

test('obor z katalogu značku nedostane', () => {
  assert.equal(znackaMimoPrehled(true, undefined), null);
  // I když v soupisu je: katalog má přednost, protože o oboru víme všechno.
  assert.equal(znackaMimoPrehled(true, { bez_jednotne_zkousky: true }), null);
});

test('obor ze soupisu dostane značku podle důvodu', () => {
  assert.equal(znackaMimoPrehled(false, { bez_jednotne_zkousky: true }), 'bez_zkousky');
  assert.equal(znackaMimoPrehled(false, { bez_jednotne_zkousky: false }), 'jiny');
});

test('obor, o kterém nevíme nic, není „mimo přehled“', () => {
  // Nález P2 z code review PR #99: dokud tady byl fallback `jiny`, tvrdila
  // tabulka „mimo přehled“ i u oboru, který v soupisu vůbec není. Přehled o něm
  // ale neví nic, takže smí říct jen „bez údajů“.
  assert.equal(znackaMimoPrehled(false, undefined), null);
  assert.equal(popisekObtiznosti({ zarazeni: null, mimoPrehled: znackaMimoPrehled(false, undefined) }), 'bez údajů');
});

test('popisek ve sloupci obtížnosti odpovídá slovníku pojmů', () => {
  assert.equal(popisekObtiznosti({ zarazeni: 'tezke', mimoPrehled: null }), 'těžké');
  assert.equal(popisekObtiznosti({ zarazeni: null, mimoPrehled: 'bez_zkousky' }), 'bez jednotné zkoušky');
  assert.equal(popisekObtiznosti({ zarazeni: null, mimoPrehled: 'jiny' }), 'mimo přehled');
  assert.equal(popisekObtiznosti({ zarazeni: null, mimoPrehled: null }), 'bez údajů');
});

test('zařazení má přednost před značkou', () => {
  // Obor může být v katalogu i v soupisu (různé roky). Když zařazení máme,
  // ukazuje se ono, protože říká víc než důvod nezahrnutí.
  assert.equal(popisekObtiznosti({ zarazeni: 'velmi_tezke', mimoPrehled: 'bez_zkousky' }), 'velmi těžké');
});
