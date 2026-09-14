import test from 'node:test';
import assert from 'node:assert/strict';
import { vetyDruhehoKola } from '../src/lib/druhe-kolo-vyklad.ts';

const vypsano = (o) => ({ stav: 'vypsano', kapacita: 7, prihlasky: 13, prijati: 2, neveslo_se: 0, nesplnilo_podminky: 2, prijato_na_vyssi_prioritu: 9, prijatych_s_vysledkem: 2, ...o });

test('vypsané 2. kolo s volnými místy vysvětlí, proč nikoho víc nepřijali', () => {
  // Technické lyceum Gymnázia J. S. Machara, 2. kolo 2026 (ověřeno proti PZ2026_kolo2_skolobory_vysledky.xlsx)
  const v = vetyDruhehoKola({ rok: 2026, zaznam: vypsano({}), predchozi: vypsano({ kapacita: 19, prijati: 5 }) });
  assert.equal(v.hlavni, 'Ve 2. kole 2026 škola vypsala 7 míst. Přišlo 13 přihlášek a přijati byli 2.');
  assert.deepEqual(v.doplnky, ['Ze zbylých uchazečů 9 se dostalo na obor, který měli na přihlášce výš, a 2 nedosáhli požadavku školy.']);
  assert.equal(v.predchozi, 'V roce 2025 škola 2. kolo vypsala také: 19 míst, přijato 5.');
  assert.equal(v.kratce, '2. kolo 2026: 7 míst, přijato 2');
});

test('nevešli se ani ve 2. kole a nejnižší přijatý výsledek', () => {
  const v = vetyDruhehoKola({ rok: 2026, zaznam: vypsano({ kapacita: 20, prihlasky: 66, prijati: 19, neveslo_se: 13, min_prijaty: 24 }), predchozi: null });
  assert.match(v.doplnky[0], /^13 uchazečů se nevešlo kvůli kapacitě ani ve 2\. kole/);
  assert.match(v.doplnky.at(-1), /24 bodů ze 100/);
  assert.equal(v.predchozi, null);
  assert.equal(v.kratce, '2. kolo 2026: 20 míst, přijato 19, 13 se nevešlo');
});

test('nikdo se nepřihlásil, zaplněno, nenaplněno bez 2. kola a bez 2. kola', () => {
  assert.equal(vetyDruhehoKola({ rok: 2026, zaznam: vypsano({ prihlasky: 0, prijati: 0, prijato_na_vyssi_prioritu: 0, nesplnilo_podminky: 0 }), predchozi: null }).hlavni,
    'Ve 2. kole 2026 škola vypsala 7 míst, ale nikdo se nepřihlásil.');
  assert.deepEqual(vetyDruhehoKola({ rok: 2026, zaznam: vypsano({ kapacita: 4, prihlasky: 4, prijati: 4, prijato_na_vyssi_prioritu: 0, nesplnilo_podminky: 0 }), predchozi: null }).doplnky, ['Místa ve 2. kole se zaplnila.']);
  const n = vetyDruhehoKola({ rok: 2026, zaznam: { stav: 'nenaplneno_bez_2_kola', kolo1_kapacita: 30, kolo1_prijati: 23 }, predchozi: { stav: 'bez_2_kola' } });
  assert.match(n.hlavni, /přijala 23 uchazečů na 30 míst, a přesto 2\. kolo nevypsala/);
  assert.equal(n.predchozi, 'V roce 2025 škola 2. kolo také nevypsala.');
  const b = vetyDruhehoKola({ rok: 2026, zaznam: { stav: 'bez_2_kola' }, predchozi: vypsano({}) });
  assert.equal(b.kratce, '2. kolo 2026 nebylo, obor se naplnil v 1. kole');
  assert.equal(b.predchozi, 'V roce 2025 škola 2. kolo vypsala: 7 míst, přijato 2.');
});
