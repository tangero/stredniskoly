import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stavTras, cekaNa, cekaniZIssues, cekaniPodleDruhu, kvalitaPoTydnech, tydnyPodleRezimu, median, tydenOd, rezimZTitulku, kratkyTitulek,
  hlaseniPodlePuvodu, hlaseniZIssues, nactiProvoz,
} from '../src/lib/admin-provoz.ts';

// Přehled provozu v administraci (#479, K5).

const TED = Date.parse('2026-10-13T10:00:00Z');
const issue = (o) => ({ number: 1, title: 'X', html_url: 'https://github.com/x/1', body: '', created_at: '2026-10-10T10:00:00Z', updated_at: '2026-10-12T10:00:00Z', labels: [], ...o });
const st = (...n) => n.map((name) => ({ name }));

test('stav tras: chyba, řídké běhy, tep rutiny a nezavedené workflow', () => {
  const s = stavTras([
    { trasa: 'Hlídání dostupnosti', intervalHodin: 5 / 60, behu24h: 6, ocekavano24h: 288, hodinOdUspechu: 0.2, posledniVysledek: 'success' },
    { trasa: 'Brána sloučení', intervalHodin: 1, behu24h: 20, ocekavano24h: 24, hodinOdUspechu: 5, posledniVysledek: 'success' },
    { trasa: 'Triáž', intervalHodin: 1, behu24h: 20, ocekavano24h: 24, hodinOdUspechu: 0.5, posledniVysledek: 'failure' },
    { trasa: 'Plánovač', intervalHodin: 5 / 60, behu24h: 0, ocekavano24h: 288, hodinOdUspechu: null, posledniVysledek: 'nezavedeno' },
    { trasa: 'Rutina Claude Code (tep)', intervalHodin: 3, behu24h: null, ocekavano24h: null, hodinOdUspechu: 13, posledniVysledek: 'tep zapsán' },
    { trasa: 'Rutina Claude Code (tep)', intervalHodin: 3, behu24h: null, ocekavano24h: null, hodinOdUspechu: 1, posledniVysledek: 'tep zapsán' },
    { trasa: 'Review (Kimi)', intervalHodin: null, behu24h: 2, ocekavano24h: null, hodinOdUspechu: 100, posledniVysledek: 'success' },
  ]);
  assert.deepEqual(s.map((x) => x.stav), ['běží řídce', 'chyba', 'chyba', 'nezavedeno', 'chyba', 'v pořádku', 'v pořádku']);
  assert.match(s[0].popis, /6 z 288/);
  assert.match(s[1].popis, /mlčí 5 h/);
});

test('na co čeká otevřený PR podle stavu sloučení a brány', () => {
  assert.equal(cekaNa('dirty', { conclusion: 'success' }), 'konflikt s main');
  assert.equal(cekaNa('clean', { conclusion: 'success' }), 'prošlo, čeká na sloučení');
  assert.equal(cekaNa('clean', { conclusion: 'failure', output: { summary: '- mění pravomoci AI: chybí souhlas vlastníka' } }), 'tvůj souhlas');
  assert.equal(cekaNa('clean', { conclusion: 'failure', output: { summary: '- chybí review asistenta zadání' } }), 'review');
  assert.equal(cekaNa('clean', null), 'brána ještě nerozhodla');
});

test('čekání z issues: otázky, návrhy, hlášení veřejnosti, splatné připomínky; trvale a hlášení škol ne', () => {
  const c = cekaniZIssues([
    issue({ number: 10, labels: st('interni', 'otazka') }),
    issue({ number: 11, labels: st('interni', 'navrh') }),
    issue({ number: 12, labels: st('interni', 'navrh', 'schvaleno') }),
    issue({ number: 13, labels: st('bug-report'), title: 'Adresa školy je špatně\n\nděkuji, Jan' }),
    issue({ number: 14, labels: st('portal-skoly') }),
    issue({ number: 15, labels: st('interni', 'pripominka'), body: 'Termín: 2026-10-08' }),
    issue({ number: 16, labels: st('interni', 'pripominka'), body: 'Termín: 2027-01-20' }),
    issue({ number: 17, labels: st('interni', 'trvale', 'rutina') }),
    issue({ number: 18, labels: st('bug-report', 'zamitnuto') }),
  ], TED);
  assert.deepEqual(c.map((x) => [x.druh, x.cislo]), [['otázka', 10], ['návrh', 11], ['hlášení veřejnosti', 13], ['splatná připomínka', 15]]);
  assert.equal(c[2].titulek, 'Adresa školy je špatně', 'titulek jen první řádek, bez podpisu');
  assert.equal(c[3].cekaDni, 5.4);
  assert.deepEqual(cekaniPodleDruhu(c).map((x) => x.pocet), [1, 1, 1, 1]);
});

test('hlášení podle původu', () => {
  const h = hlaseniZIssues([issue({ number: 1, labels: st('portal-skoly') }), issue({ number: 2, labels: st('bug-report', 'schvaleno') }), issue({ number: 3, labels: st('bug-report') }), issue({ number: 4, labels: st('interni') })], TED);
  assert.deepEqual(hlaseniPodlePuvodu(h), [
    { od: 'škola', otevreno: 1, bezSchvaleni: 1, nejstarsiDni: 3 },
    { od: 'veřejnost', otevreno: 2, bezSchvaleni: 1, nejstarsiDni: 3 },
  ]);
});

test('týdny, režimy, kvalita a medián', () => {
  assert.equal(tydenOd('2026-10-11T23:00:00Z'), '2026-10-05');
  assert.equal(tydenOd('2026-10-12T00:30:00Z'), '2026-10-12');
  assert.equal(rezimZTitulku('Prošlo (H2)'), 'H2');
  assert.equal(kratkyTitulek('a'.repeat(120)).length, 90);
  const slouceno = [
    { cislo: 1, tyden: '2026-10-05', rezim: 'R', hodinDoSlouceni: 1, vraceni: false },
    { cislo: 2, tyden: '2026-10-05', rezim: 'K', hodinDoSlouceni: 3, vraceni: true },
    { cislo: 3, tyden: '2026-10-12', rezim: 'R', hodinDoSlouceni: 2, vraceni: false },
  ];
  assert.deepEqual(tydnyPodleRezimu(slouceno), [
    { tyden: '2026-10-05', pocty: { R: 1, K: 1 }, celkem: 2 },
    { tyden: '2026-10-12', pocty: { R: 1 }, celkem: 1 },
  ]);
  const k = kvalitaPoTydnech(slouceno, [{ cislo: 9, tyden: '2026-10-05', otevrena: false }]);
  assert.deepEqual(k.map((r) => [r.tyden, r.slouceno, r.regrese, r.vraceni, r.podil]), [['2026-10-12', 1, 0, 0, 0], ['2026-10-05', 2, 1, 1, 1]]);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([]), null);
});

test('K5: selhání jednoho zdroje nezastaví ostatní oddíly', async () => {
  const fetchFn = async (url) => {
    const u = String(url);
    if (u.includes('/actions/')) return new Response('{}', { status: 500 });
    if (u.includes('/issues/462/comments')) return new Response('[]', { status: 200 });
    if (u.includes('/issues?state=open')) return new Response(JSON.stringify([issue({ number: 10, labels: st('interni', 'otazka') })]), { status: 200 });
    if (u.includes('/issues?state=all')) return new Response('[]', { status: 200 });
    if (u.includes('/pulls?')) return new Response('[]', { status: 200 });
    return new Response('{}', { status: 404 });
  };
  const p = await nactiProvoz({ ted: TED, fetchFn });
  assert.equal(p.trasy, null);
  assert.equal(p.chyby.length, 1);
  assert.match(p.chyby[0], /^trasy:/);
  assert.equal(p.ceka.length, 1);
  assert.deepEqual(p.fronta, []);
  assert.deepEqual(p.slouceno, []);
  assert.deepEqual(p.regrese, []);
});
