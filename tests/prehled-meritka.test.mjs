import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spocitejMeritka, kratkaMeritka, oddilMeritka, zasah, rezimZBrany, median, psalClovek } from '../scripts/prehled/meritka.mjs';
import { sestavPrehled } from '../scripts/prehled/tydenni.mjs';

const DEN = 86400000;
const TED = Date.parse('2026-10-12T06:00:00Z');
const pred = (d) => new Date(TED - d * DEN).toISOString();
const opt = { ted: TED, vlastnik: 'tangero', asistent: 'eduarda-prijimacky' };
const odkaz = (n, pr) => `${pr ? 'PR' : 'issue'}#${n}`;

const pr = (cislo, telo, vytvoreno, slouceno, o = {}) => ({ cislo, titulek: `PR ${cislo}`, telo, vytvoreno, slouceno, stitky: [], ...o });
const issue = (cislo, vytvoreno, schvaleno = null, o = {}) => ({ cislo, vytvoreno, stitky: ['interni'], schvaleno, cekaNaOdpoved: [], ...o });

function vstup(o = {}) {
  return {
    pulls: [
      // Zadání #10: založeno před 10 dny, schváleno za 3 dny, PR za další den, sloučeno za 2 dny.
      pr(100, 'Closes #10', pred(6), pred(4)),
      // Zadání #11 v režimu R, bez schválení (doklad původu), opravené PR #102 do 14 dnů.
      pr(101, 'Closes #11', pred(20), pred(19.5)),
      pr(102, 'Souvisí s #11', pred(17), pred(16)),
      // Revert PR #103 do 14 dnů.
      pr(103, 'Closes #12', pred(25), pred(24)),
      pr(104, 'Revert "PR 103"\n\nThis reverts #103', pred(23), pred(22.5), { titulek: 'Revert "PR 103"' }),
      // Projekt #13: druhá etapa není oprava.
      pr(105, 'Souvisí s #13', pred(9), pred(8)),
      pr(106, 'Souvisí s #13', pred(7), pred(6)),
      // PR bez zadání se nepočítá.
      pr(107, 'Drobnost', pred(3), pred(2)),
      // Zadání #14: první PR zavřený bez sloučení (vrácení), druhý sloučený, smyčka oprav 2 kola.
      pr(108, 'Closes #14', pred(5), null),
      pr(109, 'Closes #14', pred(3), pred(1), { stitky: ['potrebuje-cloveka'] }),
      // Předchozí 4 týdny.
      pr(110, 'Closes #15', pred(40), pred(38)),
    ],
    issues: {
      10: issue(10, pred(10), pred(7)),
      11: issue(11, pred(21)),
      12: issue(12, pred(26), pred(25.5)),
      13: issue(13, pred(12), pred(11), { stitky: ['interni', 'projekt'] }),
      14: issue(14, pred(6), pred(5.5)),
      15: issue(15, pred(42), pred(41)),
    },
    rezimy: { 100: 'Prošlo (souhlas)', 101: 'Prošlo (R)', 102: 'Prošlo (R)', 103: 'Prošlo (L)', 105: 'Prošlo (E)', 106: 'Prošlo (E)', 109: 'Prošlo (souhlas)', 110: 'Prošlo (souhlas)' },
    komentare: [
      { cislo: 109, autor: 'tangero', telo: '## Oprava z review (kolo 1/5)\n<!-- oprava-z-review:kolo=1 -->', kdy: pred(2) },
      { cislo: 109, autor: 'tangero', telo: '## Oprava z review (kolo 2/5)\n<!-- oprava-z-review:kolo=2 -->', kdy: pred(1.5) },
      { cislo: 10, autor: 'tangero', telo: 'Změna zadání: jen Praha', kdy: pred(5) },
      { cislo: 109, autor: 'tangero', telo: 'Zásah: 10 min - odblokování náhledu', kdy: pred(1) },
      { cislo: 100, autor: 'eduarda-prijimacky', telo: 'Zásah: 5 min - restart běhu, zápis https://example.cz/zapis', kdy: pred(2) },
      { cislo: 100, autor: 'eduarda-prijimacky', telo: 'Zásah: 30 min - bez odkazu', kdy: pred(2) },
      { cislo: 100, autor: 'nekdo', telo: 'Zásah: 99 min - cizí účet', kdy: pred(2) },
      { cislo: 100, autor: 'tangero', telo: 'Zásah: 20 min - starý', kdy: pred(9) },
      { cislo: 100, autor: 'tangero', telo: 'souhlasím se sloučením', kdy: pred(1) },
      { cislo: 100, autor: 'tangero', telo: '## Vypořádání review\nCommit: abc1234', kdy: pred(1) },
    ],
    akce: { rozhodnuti: 3 },
    navrhy: [{ cislo: 20, od: pred(4) }, { cislo: 21, od: pred(1) }],
    ...o,
  };
}

test('K2: řádek za každé sloučené zadání s časy fází a počtem kol oprav', () => {
  const m = spocitejMeritka(vstup(), opt);
  assert.deepEqual(m.zadani.map((z) => z.pr).sort((a, b) => a - b), [100, 101, 102, 103, 105, 106, 109]);
  const z100 = m.zadani.find((z) => z.pr === 100);
  assert.equal(z100.rezim, 'souhlas');
  assert.equal(Math.round(z100.faze.naSchvaleni / DEN), 3);
  assert.equal(Math.round(z100.faze.naRealizaci / DEN), 1);
  assert.equal(Math.round(z100.faze.vPr / DEN), 2);
  assert.equal(Math.round(z100.celkem / DEN), 6);
  const z109 = m.zadani.find((z) => z.pr === 109);
  assert.equal(z109.kola, 2);
  assert.equal(z109.potrebujeCloveka, true);
  // Začátek realizace je první PR k zadání, i ten zavřený bez sloučení.
  assert.equal(Math.round(z109.faze.vPr / DEN), 4);
});

test('K1: medián podle režimu a srovnání s předchozími 4 týdny', () => {
  const m = spocitejMeritka(vstup(), opt);
  assert.equal(m.podleRezimu.R.pocet, 2);
  assert.equal(m.podleRezimu.E.pocet, 2);
  assert.equal(m.podleRezimuPredchozi.souhlas.pocet, 1);
  assert.equal(Math.round(m.medianPredchozi / DEN), 4);
  const text = oddilMeritka(m, odkaz);
  assert.match(text, /## Měřítka/);
  assert.match(text, /režim R: .* \(2×\)/);
});

test('K3: revert a opravný PR do 14 dnů se započítají, další etapa projektu ne', () => {
  const m = spocitejMeritka(vstup(), opt);
  const podle = Object.fromEntries(m.zadani.map((z) => [z.pr, z.oprava]));
  assert.equal(podle[101], 102);
  assert.equal(podle[103], 104);
  assert.equal(podle[105], null);
  assert.equal(m.opravy.pocet, 2);
  // Oprava po 14 dnech se nepočítá.
  const pozde = vstup();
  pozde.pulls.find((p) => p.cislo === 102).slouceno = pred(4);
  assert.equal(spocitejMeritka(pozde, opt).zadani.find((z) => z.pr === 101).oprava, null);
});

test('K4: akce z účtu vlastníka za týden, jen krátké komentáře psané člověkem', () => {
  const m = spocitejMeritka(vstup(), opt);
  assert.equal(m.akceVlastnika.rozhodnuti, 3);
  // „souhlasím se sloučením“, změna zadání a zápis zásahu; vypořádání review s Commit: a značky smyčky ne.
  assert.equal(m.akceVlastnika.komentare, 3);
  assert.equal(psalClovek('## Code review\nCommit: abc'), false);
  assert.equal(psalClovek('ok, sluč to'), true);
  assert.equal(psalClovek('x\n\n---\n_Generated by [Claude Code](https://claude.ai/code)_'), false);
});

test('K5: krátká verze má tři čísla měřítek', () => {
  const m = spocitejMeritka(vstup(), opt);
  const radek = kratkaMeritka(m);
  assert.match(radek, /^Měřítka \(4 týdny\): zadání→sloučení medián [\d.]+ d, opravy a reverty do 14 dnů \d+ %, ruční zásahy 15 min za týden$/);
  const { kratky } = sestavPrehled({
    od: TED - 7 * DEN, ted: TED, slouceno: [], rozhodnuti: [], navrhy: [], zastavene: [], cekajiNaSouhlas: [], cervenaMain: [], expirace: {}, meritka: m,
  });
  assert.ok(kratky.includes(radek));
});

test('K6: pět nejdelších čekání ve fázi s tím, na co se čekalo', () => {
  const m = spocitejMeritka(vstup(), opt);
  assert.equal(m.cekani.length, 5);
  for (let i = 1; i < m.cekani.length; i++) assert.ok(m.cekani[i - 1].trvani >= m.cekani[i].trvani);
  assert.match(oddilMeritka(m, odkaz), /### Nejdelší čekání ve fázi\n- [\d.]+ d (na schválení vlastníkem|na realizaci \(AI\)|v PR \(brána, review, lhůta\))/);
});

test('K7: zásahy vlastníka a asistenta s odkazem za týden, jiné účty ne', () => {
  const m = spocitejMeritka(vstup(), opt);
  assert.equal(m.minutyZasahu, 15);
  assert.deepEqual(m.zasahy.map((z) => z.kdo).sort(), ['eduarda-prijimacky', 'tangero']);
  assert.equal(zasah({ autor: 'tangero', telo: 'Zásah: 7 min - test', cislo: 1 }, opt).duvod, 'test');
  assert.equal(zasah({ autor: 'eduarda-prijimacky', telo: 'Zásah: 7 min - bez zápisu', cislo: 1 }, opt), null);
  assert.equal(zasah({ autor: 'tangero', telo: 'Bez zásahu', cislo: 1 }, opt), null);
});

test('K8: vrácení po naprogramování: změna zadání, PR zavřený bez sloučení, čeká na odpověď', () => {
  const m = spocitejMeritka(vstup(), opt);
  const vracena = m.zadani.filter((z) => z.vraceno).map((z) => z.pr).sort((a, b) => a - b);
  assert.deepEqual(vracena, [100, 109]);
  const v = vstup();
  v.issues[11].cekaNaOdpoved = [pred(19.8)];
  assert.ok(spocitejMeritka(v, opt).zadani.find((z) => z.pr === 101).vraceno);
});

test('pomocné funkce: režim z titulku brány a medián', () => {
  assert.equal(rezimZBrany('Prošlo (H2)'), 'H2');
  assert.equal(rezimZBrany('Čeká na lhůtu (L)'), 'L');
  assert.equal(rezimZBrany(null), 'neznámý');
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([]), null);
});

test('chyba měřítek nezastaví přehled', () => {
  const { dlouhy, kratky } = sestavPrehled({
    od: TED - 7 * DEN, ted: TED, slouceno: [], rozhodnuti: [], navrhy: [], zastavene: [], cekajiNaSouhlas: [], cervenaMain: [], expirace: {},
    meritka: { chyba: 'GET x: 500' },
  });
  assert.match(dlouhy, /## Měřítka\n- nepodařilo se spočítat: GET x: 500/);
  assert.doesNotMatch(kratky, /Měřítka/);
});
