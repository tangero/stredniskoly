import test from 'node:test';
import assert from 'node:assert/strict';
import { kriteriaOdSkoly, prepisZeZaznamu } from '../src/lib/kriteria-skoly-vyber.ts';

// Kritéria zadaná školou v portálu mají na stránce oboru přednost před
// strojovým přepisem PDF (docs/prototyp-kriteria-prijeti.md, bod 4).

const struktura = (over = {}) => ({
  verze: 1,
  jpz: { cjl_max: 50, mat_max: 50, prepoctovy_koeficient_pct: null, vyssi_vaha: null },
  slozky: [{ druh: 'prospech', nazev: 'Prospěch ze ZŠ', max: 25, poznamka: '' }],
  minima: [{ na_co: 'jpz_celkem', hodnota: 30, jednotka: 'body', popis: '' }],
  rovnost: [], vyslovne_max_celkem: null, ...over,
});
const zaznam = (over = {}) => ({
  redizo: '600001431', rok: 2026, kolo: 1, rezim: 'jine', popis: '', odkaz: 'https://skola.cz/kriteria',
  obor_identita: { redizo: '600001431', kkov: '79-41-K/41', zamereni: '', forma: 'den', delkaStudia: 4 },
  struktura: struktura(), ...over,
});

test('převod záznamu školy: podíl přijímaček, složky, minima, původ „skola“', () => {
  const p = prepisZeZaznamu(zaznam());
  assert.equal(p.prepis, 'skola');
  assert.equal(p.podil_jpz_pct, 80);
  assert.deepEqual(p.slozky, [{ nazev: 'Prospěch ze ZŠ', max: 25, druh: 'prospech' }]);
  assert.match(p.minima[0], /alespoň 30 bodů z jednotné přijímací zkoušky celkem/);
  assert.equal(p.chybi_slozky, false);
});

test('vyšší váha předmětu se ukáže jako přijímačky nepočítané prostým součtem', () => {
  const p = prepisZeZaznamu(zaznam({ rezim: 'jine', struktura: struktura({ slozky: [], jpz: { cjl_max: 50, mat_max: 50, prepoctovy_koeficient_pct: null, vyssi_vaha: { predmet: 'mat', nasobek: 1.5 } } }) }));
  assert.match(p.jpz_navic[0].nazev, /Matematika se počítá 1,5×/);
});

test('starý záznam bez struktury: složky neznáme, nesmí vypadat jako jen JPZ', () => {
  const p = prepisZeZaznamu(zaznam({ struktura: null, popis: 'Body za prospěch a pohovor.' }));
  assert.equal(p.chybi_slozky, true);
  assert.equal(p.popis, 'Body za prospěch a pohovor.');
});

test('výběr: jen denní studium, 1. kolo před „všechna kola“, nejnovější ročník', () => {
  const zaznamy = [
    zaznam({ kolo: null, popis: 'vse' }),
    zaznam({ kolo: 1, popis: 'prvni' }),
    zaznam({ kolo: 2, popis: 'druhe' }),
    zaznam({ obor_identita: { redizo: '600001431', kkov: '79-41-K/41', zamereni: '', forma: 'formastudia/dalkova', delkaStudia: 4 }, popis: 'dalkove' }),
  ];
  const k = kriteriaOdSkoly(zaznamy, '600001431_79-41-K/41');
  assert.equal(k.rok, 2026);
  assert.deepEqual(k.prepisy.map(p => p.popis), ['prvni']);
  const novejsi = kriteriaOdSkoly([...zaznamy, zaznam({ rok: 2027, kolo: null, popis: '2027' })], '600001431_79-41-K/41');
  assert.equal(novejsi.rok, 2027);
  assert.deepEqual(novejsi.prepisy.map(p => p.popis), ['2027']);
});

test('výběr: zaměření stránky má přednost, jiný obor ani jiná škola se nepřiřadí', () => {
  const a = zaznam({ obor_identita: { redizo: '600001431', kkov: '79-41-K/41', zamereni: 'Jazyky', forma: 'den', delkaStudia: 4 }, popis: 'jazyky' });
  const b = zaznam({ obor_identita: { redizo: '600001431', kkov: '79-41-K/41', zamereni: 'Přírodní vědy', forma: 'den', delkaStudia: 4 }, popis: 'prirodni' });
  assert.deepEqual(kriteriaOdSkoly([a, b], '600001431_79-41-K/41', 'jazyky').prepisy.map(p => p.popis), ['jazyky']);
  assert.equal(kriteriaOdSkoly([a, b], '600001431_79-41-K/41').prepisy.length, 2);
  assert.equal(kriteriaOdSkoly([a], '600001431_79-41-K/81'), null);
  assert.equal(kriteriaOdSkoly([a], '600009999_79-41-K/41'), null);
});

test('nestejná maxima předmětů se přenesou jako odlišné bodování přijímaček', () => {
  const p = prepisZeZaznamu(zaznam({ struktura: struktura({ slozky: [], jpz: { cjl_max: 50, mat_max: 100, prepoctovy_koeficient_pct: null, vyssi_vaha: null } }) }));
  assert.match(p.jpz_navic[0].nazev, /Čeština až 50 bodů, matematika až 100 bodů/);
});

test('druh složky „chování“ od školy je srážka, i když název chování nezmiňuje', async () => {
  const { extraBody, srazka } = await import('../src/lib/extra-body.ts');
  const p = prepisZeZaznamu(zaznam({ struktura: struktura({ slozky: [{ druh: 'chovani', nazev: 'Druhý stupeň', max: -10, poznamka: '' }] }) }));
  assert.equal(srazka(p.slozky[0]), true);
  assert.equal(extraBody(p), false);
  const prospech = prepisZeZaznamu(zaznam());
  assert.equal(extraBody(prospech), true);
});

test('kritéria nového ročníku od školy nepřepíší kritéria roku pásem', async () => {
  const { sPrednostiSkoly } = await import('../src/lib/kriteria-skoly-sloucit.ts');
  const prepis = { rok: 2026, pdf: true, noveKriteria: '2027-01-31', prepisy: [{ source_id: 'x', zamereni: '', rezim: 'pouze_jpz', podil_jpz_pct: 100, slozky: [], jpz_navic: [], minima: [], nejasnosti: [], prepis: 'strojovy', nalezy: [] }] };
  const k = sPrednostiSkoly(prepis, [zaznam({ rok: 2027 })], '600001431_79-41-K/41', undefined);
  assert.equal(k.rok, 2026);
  assert.equal(k.prepisy[0].rezim, 'pouze_jpz');
  assert.equal(k.nove.rok, 2027);
  const stejny = sPrednostiSkoly(prepis, [zaznam({ rok: 2026 })], '600001431_79-41-K/41', undefined);
  assert.equal(stejny.prepisy[0].prepis, 'skola');
  assert.equal(stejny.nove, undefined);
});
