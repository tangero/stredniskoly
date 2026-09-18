// ============================================================================
// Souvislost čísel parametrů v SQL dotazech odběru novinek.
//
// Proč tenhle test existuje: první volání formuláře na produkci spadlo na
// `42P18 could not determine data type of parameter $2`. Dotaz dostával tři
// argumenty, ale v textu používal jen `$1` a `$3` — druhý zůstal nepoužitý,
// protože limit se porovnává v JavaScriptu. Postgres nemá z čeho odvodit typ
// parametru, který se v dotazu nevyskytuje, a odmítne celý dotaz.
//
// Jednotkové testy to zachytit nemohly: falešné spojení parametry nekontroluje.
// Tady se proto čte text zdrojů a hlídá se pravidlo, které Postgres vyžaduje:
// čísla parametrů musí tvořit souvislou řadu od `$1` a jejich nejvyšší číslo
// musí odpovídat počtu předaných argumentů.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const LIB = join(import.meta.dirname, '..', 'src', 'lib');

/** Vrátí zdrojové soubory odběru novinek. */
function zdroje() {
  return readdirSync(LIB)
    .filter((f) => f.startsWith('novinky-') && f.endsWith('.ts'))
    .map((f) => ({ jmeno: f, text: readFileSync(join(LIB, f), 'utf8') }));
}

/**
 * Najde volání `dotaz(...)` a `s.dotaz(...)` a u každého vrátí text dotazu
 * a text pole argumentů. Hledá se podle závorek, ne regexem přes celé volání,
 * aby to nesundala vnořená závorka ve výrazu argumentu.
 */
function volaniDotazu(text) {
  const nalezy = [];
  const zacatek = /(?:\bs\.)?dotaz(?:<[^>]*>)?\(\s*`/g;
  while (zacatek.exec(text) !== null) {
    const odSql = zacatek.lastIndex;
    const konecSql = text.indexOf('`', odSql);
    if (konecSql === -1) continue;
    const sql = text.slice(odSql, konecSql);

    // Za dotazem může, ale nemusí následovat pole argumentů.
    const zbytek = text.slice(konecSql + 1);
    const poCarce = zbytek.match(/^\s*,\s*\[/);
    let argumenty = null;
    if (poCarce) {
      let hloubka = 1;
      let i = poCarce[0].length;
      while (i < zbytek.length && hloubka > 0) {
        if (zbytek[i] === '[') hloubka += 1;
        else if (zbytek[i] === ']') hloubka -= 1;
        i += 1;
      }
      argumenty = zbytek.slice(poCarce[0].length, i - 1);
    }
    nalezy.push({ sql, argumenty, pozice: odSql });
    zacatek.lastIndex = konecSql + 1;
  }
  return nalezy;
}

/** Rozdělí text pole argumentů na prvky podle čárek na nulté úrovni zanoření. */
function pocetArgumentu(text) {
  if (text === null) return 0;
  if (text.trim() === '') return 0;
  let hloubka = 0;
  let pocet = 1;
  let vRetezci = null;
  for (let i = 0; i < text.length; i += 1) {
    const z = text[i];
    if (vRetezci) {
      if (z === vRetezci && text[i - 1] !== '\\') vRetezci = null;
      continue;
    }
    if (z === "'" || z === '"' || z === '`') vRetezci = z;
    else if ('([{'.includes(z)) hloubka += 1;
    else if (')]}'.includes(z)) hloubka -= 1;
    else if (z === ',' && hloubka === 0) pocet += 1;
  }
  // Koncová čárka (prettier ji přidává) nezakládá další argument.
  if (/,\s*$/.test(text)) pocet -= 1;
  return pocet;
}

/** Čísla parametrů použitá v textu dotazu, bez duplikátů, vzestupně. */
function pouziteParametry(sql) {
  const cisla = new Set();
  for (const m of sql.matchAll(/\$(\d+)/g)) cisla.add(Number(m[1]));
  return [...cisla].sort((a, b) => a - b);
}

test('čísla parametrů tvoří souvislou řadu od $1', () => {
  const chyby = [];
  for (const { jmeno, text } of zdroje()) {
    for (const { sql, pozice } of volaniDotazu(text)) {
      const cisla = pouziteParametry(sql);
      if (cisla.length === 0) continue;
      const radek = text.slice(0, pozice).split('\n').length;
      for (let i = 0; i < cisla.length; i += 1) {
        if (cisla[i] !== i + 1) {
          chyby.push(`${jmeno}:${radek} používá ${cisla.map((c) => `$${c}`).join(', ')}`);
          break;
        }
      }
    }
  }
  assert.deepEqual(chyby, [], `dotazy s dírou v číslování:\n${chyby.join('\n')}`);
});

test('počet argumentů odpovídá nejvyššímu použitému parametru', () => {
  const chyby = [];
  for (const { jmeno, text } of zdroje()) {
    for (const { sql, argumenty, pozice } of volaniDotazu(text)) {
      const cisla = pouziteParametry(sql);
      const nejvyssi = cisla.length > 0 ? cisla[cisla.length - 1] : 0;
      const predano = pocetArgumentu(argumenty);
      // Argumenty rozbalené operátorem `...` se spočítat nedají; takový dotaz
      // se přeskočí, protože jeho délka je známá až za běhu.
      if (argumenty !== null && argumenty.includes('...')) continue;
      const radek = text.slice(0, pozice).split('\n').length;
      if (predano !== nejvyssi) {
        chyby.push(`${jmeno}:${radek} předává ${predano}, dotaz čeká ${nejvyssi}`);
      }
    }
  }
  assert.deepEqual(chyby, [], `nesoulad počtu parametrů:\n${chyby.join('\n')}`);
});
