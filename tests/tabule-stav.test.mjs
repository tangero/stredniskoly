import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cilovyStav, branaCekaNaSouhlas, STAVY } from '../scripts/tabule/stav.mjs';

const i = (stitky, stav = 'OPEN') => ({ stav, stitky });

test('stav karty podle štítků a PR', () => {
  assert.equal(cilovyStav(i(['bug-report', 'oblast:detail'])), STAVY.hlaseni);
  assert.equal(cilovyStav(i(['interni', 'pripominka'])), STAVY.hlaseni);
  assert.equal(cilovyStav(i(['interni', 'navrh'])), STAVY.navrh);
  assert.equal(cilovyStav(i(['interni', 'schvaleno', 'stop'])), STAVY.navrh);
  assert.equal(cilovyStav(i(['interni', 'navrh', 'schvaleno'])), STAVY.schvaleno);
  assert.equal(cilovyStav(i(['interni', 'oponentura'])), STAVY.oponentura);
  // Oponentura návrhu (#339): karta je v Oponentuře, stop má přednost.
  assert.equal(cilovyStav(i(['interni', 'navrh', 'oponentura'])), STAVY.oponentura);
  assert.equal(cilovyStav(i(['interni', 'navrh', 'oponentura', 'stop'])), STAVY.navrh);
  // Otázka na vlastníka (#385): na tahu je vlastník i u schváleného zadání.
  assert.equal(cilovyStav(i(['interni', 'schvaleno', 'otazka'])), STAVY.navrh);
  assert.equal(cilovyStav(i(['interni', 'schvaleno'])), STAVY.schvaleno);
  // doklad „Zdroj:“ v interním zadání stačí, v hlášení ne
  assert.equal(cilovyStav({ stav: 'OPEN', stitky: ['interni'], telo: 'Zdroj: vlastník\n\n## Rozsah\nx' }), STAVY.schvaleno);
  assert.equal(cilovyStav({ stav: 'OPEN', stitky: ['interni'], telo: 'Zdroj: někdo' }), STAVY.hlaseni);
  assert.equal(cilovyStav({ stav: 'OPEN', stitky: ['interni', 'bug-report'], telo: 'Zdroj: vlastník' }), STAVY.hlaseni);
  assert.equal(cilovyStav(i(['interni', 'schvaleno', 'k-overeni']), [{ cekaNaSouhlas: false }]), STAVY.vPr);
  assert.equal(cilovyStav(i(['interni', 'schvaleno']), [{ cekaNaSouhlas: false }, { cekaNaSouhlas: true }]), STAVY.cekaNaSouhlas);
  assert.equal(cilovyStav(i(['interni', 'schvaleno'], 'CLOSED')), STAVY.hotovo);
  assert.equal(cilovyStav(i(['trvale'])), null);
});

test('brána čeká na souhlas jen při neúspěchu kvůli souhlasu', () => {
  const k = (conclusion, summary) => ({ conclusion, output: { summary } });
  assert.equal(branaCekaNaSouhlas(k('failure', '- mění pravomoci AI: chybí souhlas vlastníka (PR nemá štítek schvaleno)')), true);
  assert.equal(branaCekaNaSouhlas(k('failure', '- chybí protokol z preview')), false);
  assert.equal(branaCekaNaSouhlas(k('success', 'souhlas vlastníka na PR')), false);
  assert.equal(branaCekaNaSouhlas(undefined), false);
});

test('pole „Na co čeká“ u PR', async () => {
  const { naCoCekaPr } = await import('../scripts/tabule/stav.mjs');
  const k = (conclusion, summary = '') => ({ status: 'completed', conclusion, output: { summary } });
  assert.equal(naCoCekaPr({ draft: true }), 'rozpracovaný (draft)');
  assert.equal(naCoCekaPr({ mergeable: false, review: 'ok' }), 'konflikt s main, opraví autor PR · review bez P1/P2');
  assert.equal(naCoCekaPr({ kontrola: { status: 'in_progress' } }), 'brána se vyhodnocuje · review zatím není');
  assert.equal(naCoCekaPr({ kontrola: k('success'), review: 'ok' }), 'brána prošla, sloučí se automaticky · review bez P1/P2');
  assert.equal(naCoCekaPr({ kontrola: k('failure', '- chybí protokol z preview pro commit abc1234\nRežim: L'), review: 'nalezy' }),
    'chybí protokol z preview · review má nálezy k opravě');
  assert.equal(naCoCekaPr({ kontrola: k('failure', '- drobné zadání: lhůta na veto běží do 2026-10-08 12:30 UTC') }),
    'lhůta na veto do 8. 10. 14:30 · review zatím není');
  assert.match(naCoCekaPr({ kontrola: k('failure', '- mění pravomoci AI (x): chybí souhlas vlastníka (PR nemá štítek schvaleno)') }), /^čeká na tvé schvaleno/);
});

test('pole „Na co čeká“ u issue', async () => {
  const { naCoCeka } = await import('../scripts/tabule/stav.mjs');
  const n = (stitky, o = {}, prs = []) => naCoCeka({ stav: 'OPEN', stitky, telo: '', ...o }, prs, '2026-10-04');
  assert.equal(naCoCeka({ stav: 'CLOSED', stitky: [] }), '');
  assert.equal(n(['trvale']), null);
  assert.equal(n(['interni', 'navrh']), 'čeká na tvé rozhodnutí: schvaleno, nebo zamitnuto');
  assert.equal(n(['interni', 'navrh', 'oponentura']), 'oponentura, pak k tvému rozhodnutí');
  assert.match(n(['interni', 'schvaleno', 'otazka']), /^otázka čeká na tvou odpověď/);
  assert.equal(n(['interni', 'pripominka'], { telo: 'Termín: 2027-01-20' }), 'připomínka, termín 20. 1. 2027');
  assert.equal(n(['interni', 'pripominka'], { telo: 'Termín: 2026-10-01' }), 'připomínka je splatná, čeká na vyhodnocení');
  assert.equal(n(['interni', 'schvaleno'], {}, [{ cislo: 9, naCoCeka: 'chybí protokol z preview' }]), 'PR #9: chybí protokol z preview');
  assert.equal(n(['portal-skoly'], { rodic: 244 }), 'patří k projektu #244, vyřeší ho jeho etapa');
  assert.equal(n(['bug-report']), 'hlášení: čeká na třídění, schvaleno nebo připojení k projektu');
  assert.equal(n(['interni', 'schvaleno', 'question']), 'čeká na odpověď na dotaz v issue');
  assert.equal(n(['interni', 'projekt', 'schvaleno'], { ukoly: { total: 14, completed: 0 } }), 'projekt: hotovo 0 z 14 úkolů, čeká na další etapu');
  assert.equal(n(['interni'], { telo: 'Zdroj: vlastník' }), 'čeká na realizaci (hodinová úloha)');
  assert.equal(n(['interni']), 'chybí schvaleno nebo doklad Zdroj:');
  assert.equal(n(['nova-data', 'oblast:data']), 'čeká na nová data (datová linka)');
});

// Pilot tabule (#561): „Pro lidi“, „Čeká na“, „Termín“.
import { proLidi, cekaNa, cekaNaPr, termin, CEKA_NA } from '../scripts/tabule/stav.mjs';

test('K1: pole „Pro lidi“ z řádku v těle issue, jinak název issue', () => {
  const telo = 'Zdroj: vlastník\n\nPro lidi: Na stránce školy uvidíte i obory pro dospělé.\n\n### Proč';
  assert.deepEqual(proLidi({ titulek: '[Zadání] Dálkové obory', telo }), { text: 'Na stránce školy uvidíte i obory pro dospělé.', chybi: false });
  assert.deepEqual(proLidi({ titulek: '[Zadání] Dálkové obory', telo: 'Zdroj: vlastník' }), { text: '[Zadání] Dálkové obory', chybi: true });
  // Prázdný řádek se nepočítá, dlouhý text se zkrátí.
  assert.equal(proLidi({ titulek: 'T', telo: 'Pro lidi: \nx' }).chybi, true);
  // Tvar z formuláře: nadpis a text pod ním; prázdný oddíl (rovnou další nadpis) se nepočítá.
  assert.equal(proLidi({ titulek: 'T', telo: '### Proč\n\nx\n\n### Pro lidi\n\nUvidíte novou mapu.\n\n### Co' }).text, 'Uvidíte novou mapu.');
  assert.equal(proLidi({ titulek: 'T', telo: '### Pro lidi\r\n\r\nText z Windows.' }).text, 'Text z Windows.');
  assert.equal(proLidi({ titulek: 'T', telo: '### Pro lidi\n\n### Co' }).chybi, true);
  assert.equal(proLidi({ titulek: 'T', telo: `Pro lidi: ${'a'.repeat(400)}` }).text.length, 240);
});

test('K2: „Čeká na“ podle stavu karty, kolega podle přiřazení', () => {
  const o = { dnes: '2026-11-01', kolegove: ['kolega-x'] };
  const iss = (stitky, extra = {}) => ({ stav: 'OPEN', stitky, ...extra });
  assert.equal(cekaNa(iss(['interni', 'navrh']), STAVY.navrh, o), CEKA_NA.vlastnik);
  assert.equal(cekaNa(iss(['interni', 'schvaleno']), STAVY.cekaNaSouhlas, o), CEKA_NA.vlastnik);
  assert.equal(cekaNa(iss(['interni', 'schvaleno']), STAVY.vPr, o), CEKA_NA.ai);
  assert.equal(cekaNa(iss(['interni', 'schvaleno']), STAVY.schvaleno, o), CEKA_NA.ai);
  assert.equal(cekaNa(iss(['interni'], { stav: 'CLOSED' }), STAVY.hotovo, o), CEKA_NA.nikdo);
  assert.equal(cekaNa(iss(['trvale']), null, o), null);
  // Veřejné hlášení bez rozhodnutí čeká na vlastníka; s rodičem nebo se schvaleno na AI.
  assert.equal(cekaNa(iss(['bug-report']), STAVY.hlaseni, o), CEKA_NA.vlastnik);
  assert.equal(cekaNa(iss(['bug-report'], { rodic: 541 }), STAVY.hlaseni, o), CEKA_NA.ai);
  assert.equal(cekaNa(iss(['interni']), STAVY.hlaseni, o), CEKA_NA.ai);
  // Připomínka: před termínem nikdo, od termínu vlastník.
  assert.equal(cekaNa(iss(['interni', 'pripominka'], { telo: 'Termín: 2026-11-28' }), STAVY.hlaseni, o), CEKA_NA.nikdo);
  assert.equal(cekaNa(iss(['interni', 'pripominka'], { telo: 'Termín: 2026-11-01' }), STAVY.hlaseni, o), CEKA_NA.vlastnik);
  // Přiřazení kolegovi má přednost i před návrhem; cizí přiřazení ne.
  assert.equal(cekaNa(iss(['interni', 'navrh'], { prirazeni: ['kolega-x'] }), STAVY.navrh, o), CEKA_NA.kolega);
  assert.equal(cekaNa(iss(['interni', 'navrh'], { prirazeni: ['nekdo'] }), STAVY.navrh, o), CEKA_NA.vlastnik);
  assert.equal(cekaNa(iss(['interni', 'navrh'], { prirazeni: ['kolega-x'] }), STAVY.navrh, { dnes: '2026-11-01' }), CEKA_NA.vlastnik, 'bez seznamu kolegů');
  assert.deepEqual(Object.values(CEKA_NA), ['Patrick', 'kolega', 'AI', 'nikdo']);
});

test('„Čeká na“ u PR a termín připomínky', () => {
  assert.equal(cekaNaPr({ otevreny: true, cekaNaSouhlas: true }), CEKA_NA.vlastnik);
  assert.equal(cekaNaPr({ otevreny: true, cekaNaSouhlas: false }), CEKA_NA.ai);
  assert.equal(cekaNaPr({ otevreny: false, cekaNaSouhlas: true }), CEKA_NA.nikdo);
  assert.equal(termin('Zdroj: vlastník\nTermín: 2026-11-28\n'), '2026-11-28');
  assert.equal(termin('bez termínu'), null);
});
