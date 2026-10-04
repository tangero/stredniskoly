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
