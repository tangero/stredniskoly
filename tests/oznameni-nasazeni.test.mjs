import { test } from 'node:test';
import assert from 'node:assert/strict';
import { oddil, textProVlastnika, cestyNaWebu, kandidati, oznameno, zprava, ZNACKA, OD, OKNO } from '../scripts/brana/oznameni-nasazeni.mjs';
import { BOT } from '../scripts/brana/brana.mjs';

const TELO = `Closes #10

## Co se změnilo
- \`src/x.tsx\`: nový **blok** okruhů.
- Druhá odrážka.
- Třetí odrážka.

## Pro vlastníka
Na stránce města je nový oddíl s okruhy oborů. Zkontroluj, že se dá rozbalit.
Adresa: /mesto/brno

## Jak ověřit na náhledu
1. Otevři \`<náhled>/mesto/praha#okruhy\` a https://stredniskoly-abc-tangeros-projects.vercel.app/skola/600013464-x.
2. Spusť \`node scripts/test.mjs\` a /api/veletrhy/akce.

## Kontroly
- /neni-v-oddilu
`;

test('oddíl podle nadpisu až po další nadpis', () => {
  assert.match(oddil(TELO, 'Pro vlastníka'), /^Na stránce města/);
  assert.doesNotMatch(oddil(TELO, 'Pro vlastníka'), /Jak ověřit/);
  assert.equal(oddil(TELO, 'Neexistuje'), '');
});

test('text pro vlastníka: oddíl Pro vlastníka bez řádku s adresou, jinak dvě odrážky, jinak první odstavec', () => {
  assert.equal(textProVlastnika(TELO), 'Na stránce města je nový oddíl s okruhy oborů. Zkontroluj, že se dá rozbalit.');
  const bez = TELO.replace(/## Pro vlastníka[\s\S]*?(?=## Jak)/, '');
  assert.equal(textProVlastnika(bez), 'src/x.tsx: nový blok okruhů. Druhá odrážka.');
  assert.equal(textProVlastnika('Automatický export tabulky.\n\nDalší odstavec.'), 'Automatický export tabulky.');
});

test('cesty na webu z Pro vlastníka a Jak ověřit, bez souborů a API, nejvýš tři', () => {
  assert.deepEqual(cestyNaWebu(TELO), ['/mesto/brno', '/mesto/praha', '/skola/600013464-x']);
  assert.deepEqual(cestyNaWebu('## Kontroly\n- /mesto/brno'), []);
});

test('kandidáti: sloučené do main po zavedení oznámení a v okně, nejstarší první', () => {
  const ted = OD + 2 * 24 * 3600 * 1000;
  const p = (cislo, slouceno, zakladna = 'main') => ({ cislo, slouceno: slouceno && new Date(slouceno).toISOString(), zakladna });
  const vysledek = kandidati([p(1, ted - 1000), p(2, OD + 1000), p(3, OD - 1000), p(4, null), p(5, ted - 2000, 'jina'), p(6, ted - OKNO - 1)], { ted });
  assert.deepEqual(vysledek.map((x) => x.cislo), [2, 1]);
});

test('oznámeno jen podle značky od bota', () => {
  assert.equal(oznameno([{ autor: BOT, telo: `x ${ZNACKA('abc1234')}` }]), true);
  assert.equal(oznameno([{ autor: 'nekdo', telo: ZNACKA('abc1234') }]), false);
  assert.equal(oznameno([]), false);
});

test('zpráva: adresy na produkci, bez adresy upozornění, commit a návod na vrácení', () => {
  const text = zprava([
    { cislo: 7, titulek: 'Okruhy', text: 'Nový oddíl.', cesty: ['/mesto/brno'] },
    { cislo: 8, titulek: 'Export', text: '', cesty: [] },
  ], { zakladni: 'https://www.prijimackynaskolu.cz', sha: 'abcdef1234567' });
  assert.match(text, /^Nasazeno na web \(2 změny\):/);
  assert.match(text, /#7 Okruhy\nNový oddíl\.\nZkontroluj:\nhttps:\/\/www\.prijimackynaskolu\.cz\/mesto\/brno/);
  assert.match(text, /#8 Export\nPopis v PR chybí\.\nZkontroluj:\nhttps:\/\/www\.prijimackynaskolu\.cz \(adresu PR neuvádí\)/);
  assert.match(text, /Commit abcdef1\. .*vrátit #číslo/);
});
