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
