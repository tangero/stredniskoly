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

test('přepis kritérií má platný tvar a patří k oborům školy', () => {
  assert.match(data.prepis.zkontrolovano, /^\d{4}-\d{2}-\d{2}$/);
  for (const s of data.skoly) {
    if (!s.kriteria) {
      // Škola bez přepisu má vysvětlení, nebo nemá ani odkaz (pak vysvětluje poznámka u odkazu).
      assert.ok(s.kriteriaPoznamka || s.url === null, `${s.redizo}: bez přepisu chybí vysvětlení`);
      continue;
    }
    for (const k of s.kriteria) {
      assert.ok(s.obory.includes(k.obor), `${s.redizo}: přepis pro obor ${k.obor}, který škola v seznamu nemá`);
      assert.ok(k.casti.length > 0, `${s.redizo} ${k.obor}: bez částí zkoušky`);
      for (const c of k.casti) {
        assert.ok(c.nazev, `${s.redizo} ${k.obor}: část bez názvu`);
        assert.ok(c.maxBody === null || (typeof c.maxBody === 'number' && c.maxBody > 0), `${s.redizo} ${k.obor}: maximum bodů`);
      }
      assert.ok(k.podminka, `${s.redizo} ${k.obor}: chybí podmínka úspěchu`);
      if (k.zdroj !== null) assert.match(k.zdroj, /^https:\/\//, `${s.redizo} ${k.obor}: zdroj musí být https`);
      assert.ok(k.zdroj !== null || s.url, `${s.redizo} ${k.obor}: přepis bez odkazu na zdroj`);
    }
  }
});
