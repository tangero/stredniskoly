// Odkazy na kritéria přijetí konzervatoří (#504): úplnost seznamu a tvar záznamů.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../src/data/kriteria-konzervatori-2027.json', import.meta.url), 'utf8'));
const OBORY = new Set(['Hudba', 'Zpěv', 'Tanec', 'Současný tanec', 'Hudebně dramatické umění']);

function redizaZRejstriku() {
  const csv = readFileSync(new URL('../public/pro-novinare/konzervatore-skoly.csv', import.meta.url), 'utf8');
  return new Set([...csv.matchAll(/,(\d{9}),/g)].map((m) => m[1]));
}

test('seznam pokrývá všechny konzervatoře z rejstříku a žádnou navíc', () => {
  const zData = data.skoly.map((s) => s.redizo);
  assert.equal(new Set(zData).size, zData.length, 'duplicitní RED IZO');
  assert.deepEqual([...zData].sort(), [...redizaZRejstriku()].sort());
});

test('záznamy mají platný tvar', () => {
  assert.match(data.skolniRok, /^\d{4}\/\d{4}$/);
  assert.match(data.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
  for (const s of data.skoly) {
    assert.match(s.redizo, /^\d{9}$/);
    assert.ok(s.nazev && s.obec, `${s.redizo}: název a obec`);
    for (const o of s.obory) assert.ok(OBORY.has(o), `${s.redizo}: neznámý obor ${o}`);
    if (s.url === null) assert.ok(s.poznamka, `${s.redizo}: bez odkazu musí mít poznámku`);
    else assert.match(s.url, /^https:\/\//, `${s.redizo}: odkaz musí být https`);
  }
});
