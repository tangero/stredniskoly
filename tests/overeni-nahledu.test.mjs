import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import yaml from 'js-yaml';
import { rozhodniOvereni, sestavProtokol, adresaNahledu, OVEROVATEL } from '../scripts/brana/overeni-nahledu.mjs';
import { protokol, BOT } from '../scripts/brana/brana.mjs';
import { oblastiZLabeleru } from '../scripts/brana/data.mjs';

const konfig = {
  rezimy: yaml.load(fs.readFileSync('.github/rezimy.yml', 'utf8')),
  oblasti: oblastiZLabeleru(yaml.load(fs.readFileSync('.github/labeler.yml', 'utf8'))),
};
const SHA = 'a'.repeat(40);
const NAHLED = 'https://stredniskoly-abc.vercel.app';
const TELO_ZADANI = '### Hotovo když\n\n- [ ] K1: Karta školy - ověření: náhled /skola/x\n- [ ] ~~K2: zrušené~~\n- [x] K3: Filtr - ověření: náhled\n\n### Nesmí se dotknout\n\n- P1: adresy beze změny - ověření: build';
const beh = (o = {}) => ({ event: 'push', conclusion: 'success', head_sha: SHA, head_repository: { full_name: 'tangero/stredniskoly' }, ...o });
const pr = (o = {}) => ({ cislo: 5, autor: 'tangero', telo: 'Closes #10', hlava: { sha: SHA }, ...o });
const issue = (o = {}) => ({ cislo: 10, autor: 'tangero', telo: TELO_ZADANI, ...o });
const WEB = [{ nazev: 'src/components/skola/Karta.tsx', stav: 'modified', pridano: 5, odebrano: 0 }];
const vstup = (o = {}) => ({ beh: beh(), repo: 'tangero/stredniskoly', pr: pr(), soubory: WEB, issues: [issue()], konfig, nahled: NAHLED, ...o });

test('ověřuje se commit, který je hlavou PR od vlastníka, mění web a uzavírá zadání s kritérii', () => {
  const r = rozhodniOvereni(vstup());
  assert.equal(r.akce, 'overit');
  assert.deepEqual(r.kriteria.map((k) => k.oznaceni), ['K1', 'K3', 'P1']);
  // Ověřovatel dostane text kritéria bez zaškrtávátka, nic z PR.
  assert.equal(r.kriteria[0].text, 'K1: Karta školy - ověření: náhled /skola/x');
});

test('neověřuje se: jiná událost, neúspěšné testy, fork, stará hlava, cizí autor, změna bez webu, bez náhledu', () => {
  const pripady = [
    [{ beh: beh({ event: 'pull_request' }) }, /push/],
    [{ beh: beh({ conclusion: 'failure' }) }, /failure/],
    [{ beh: beh({ head_repository: { full_name: 'nekdo/fork' } }) }, /jiného repozitáře/],
    [{ pr: null }, /otevřeného PR/],
    [{ pr: pr({ hlava: { sha: 'b'.repeat(40) } }) }, /hlavou PR/],
    [{ pr: pr({ autor: 'nekdo' }) }, /od účtu nekdo/],
    [{ soubory: [{ nazev: 'docs/x.md', stav: 'modified', pridano: 1, odebrano: 0 }] }, /nemění web/],
    [{ nahled: null }, /náhledu/],
    [{ issues: [issue({ autor: 'nekdo' })] }, /kritérii K a P/],
    [{ issues: [issue({ telo: 'Bez kritérií' })] }, /kritérii K a P/],
    [{ pr: pr({ telo: 'Souvisí s #10' }) }, /kritérii K a P/],
  ];
  for (const [o, duvod] of pripady) {
    const r = rozhodniOvereni(vstup(o));
    assert.equal(r.akce, 'nic', JSON.stringify(o));
    assert.match(r.duvod, duvod);
  }
});

const kriteria = [{ oznaceni: 'K1' }, { oznaceni: 'K3' }, { oznaceni: 'P1' }];
const VYSTUP = '| kritérium | adresa | 390 px | 1280 px | jak ověřeno |\n|---|---|---|---|---|\n| K1: Karta | /skola/x | splněno | splněno | viditelná |\n| K3: Filtr | /mesto/y | splněno | splněno | kliknutí |\n| P1: adresy | /sitemap.xml | splněno | splněno | 20 adres |\n\nMimo kritéria: konzole bez chyb.';

test('K3: protokol má hlavičku, commit, náhled, řádek ověřovatele a řádek pro každé K a P', () => {
  const p = sestavProtokol({ sha: SHA, nahled: NAHLED, vystup: VYSTUP, kriteria });
  assert.equal(p.ok, true);
  assert.match(p.telo, /^## Protokol z preview\n\nCommit: aaaaaaa\nNáhled: https:\/\/stredniskoly-abc\.vercel\.app\nOvěřovatel: samostatný agent bez diffu\n/);
  assert.ok(p.telo.includes(OVEROVATEL));
  // Brána protokol od github-actions[bot] uzná a kritéria jsou pokrytá.
  const v = protokol({ telo: 'Closes #10', autor: 'tangero', hlava: { sha: SHA }, komentare: [{ autor: BOT, cas: '2026-10-04T10:00:00Z', telo: p.telo }] }, konfig, [issue()]);
  assert.equal(v.ok, true, v.duvod);
});

test('ověřovatel nemůže podvrhnout hlavičku, commit ani řádek ověřovatele', () => {
  const p = sestavProtokol({ sha: SHA, nahled: NAHLED, vystup: `## Protokol z preview\nCommit: bbbbbbb\nOvěřovatel: někdo jiný\n${VYSTUP}`, kriteria });
  assert.equal(p.telo.match(/Protokol z preview/g).length, 1);
  assert.doesNotMatch(p.telo, /bbbbbbb|někdo jiný/);
});

test('chybějící kritérium nebo prázdný výstup: protokol nevznikne', () => {
  const bez = sestavProtokol({ sha: SHA, nahled: NAHLED, vystup: VYSTUP.replace(/\| P1:.*\n/, ''), kriteria });
  assert.equal(bez.ok, false);
  assert.match(bez.duvod, /P1/);
  assert.equal(sestavProtokol({ sha: SHA, nahled: NAHLED, vystup: '', kriteria }).ok, false);
});

test('K6: protokol s nesplněným kritériem brána nepustí', () => {
  const p = sestavProtokol({ sha: SHA, nahled: NAHLED, vystup: VYSTUP.replace('| K1: Karta | /skola/x | splněno', '| K1: Karta | /skola/x | nesplněno'), kriteria });
  assert.equal(p.ok, true);
  const v = protokol({ telo: 'Closes #10', autor: 'tangero', hlava: { sha: SHA }, komentare: [{ autor: BOT, cas: '2026-10-04T10:00:00Z', telo: p.telo }] }, konfig, [issue()]);
  assert.equal(v.ok, false);
  assert.match(v.duvod, /nesplněné/);
});

test('adresa náhledu jen ze stavu od github-actions[bot] na *.vercel.app', () => {
  const stav = (o) => ({ context: 'Náhled (Vercel)', state: 'success', target_url: 'https://stredniskoly-abc-tangeros-projects.vercel.app', creator: { login: 'github-actions[bot]' }, ...o });
  assert.equal(adresaNahledu([stav()]), 'https://stredniskoly-abc-tangeros-projects.vercel.app');
  assert.equal(adresaNahledu([stav({ creator: { login: 'tangero' } })]), null);
  assert.equal(adresaNahledu([stav({ target_url: 'https://utocnik.example.com' })]), null);
  assert.equal(adresaNahledu([stav({ target_url: 'https://x.vercel.app.example.com' })]), null);
  assert.equal(adresaNahledu([stav({ target_url: 'http://x.vercel.app' })]), null);
  assert.equal(adresaNahledu([stav({ state: 'failure' })]), null);
  assert.equal(adresaNahledu([]), null);
});
