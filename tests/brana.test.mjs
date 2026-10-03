import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import yaml from 'js-yaml';
import {
  vyhodnot, rozsah, otisk, propojenaIssues, zaznamSouhlasu, souhlasIssue, rozbor, zamrznuto, ZNACKA, BOT,
} from '../scripts/brana/brana.mjs';
import { oblastiZLabeleru } from '../scripts/brana/data.mjs';

const konfig = {
  rezimy: yaml.load(fs.readFileSync('.github/rezimy.yml', 'utf8')),
  oblasti: oblastiZLabeleru(yaml.load(fs.readFileSync('.github/labeler.yml', 'utf8'))),
};
const SHA = 'a'.repeat(40);
const SHA2 = 'b'.repeat(40);
const TED = Date.parse('2026-10-10T12:00:00Z');
const PRED = (h) => new Date(TED - h * 3600 * 1000).toISOString();

const TELO_ISSUE = 'Zdroj: vlastník\n\n## Rozsah\nPřidat větu o 2. kole.\n\n## Poznámky\nnic';
const issue = (o = {}) => ({ cislo: 10, stav: 'open', stitky: ['interni'], telo: TELO_ISSUE, komentare: [], udalosti: [], ...o });
const protokolKomentar = (sha = SHA, vysledek = 'splněno') => ({
  autor: 'tangero', cas: PRED(1), telo: `## Protokol z preview\nCommit: ${sha.slice(0, 7)}\n| věta na stránce | ${vysledek} |`,
});
const pr = (o = {}) => ({
  cislo: 5, stav: 'open', zakladna: 'main', draft: false, telo: 'Closes #10', stitky: [],
  vytvoreno: PRED(72), hlava: { sha: SHA, cas: PRED(60) }, komentare: [protokolKomentar()], udalosti: [], ...o,
});
const soubor = (nazev, radky = 10, o = {}) => ({ nazev, stav: 'modified', pridano: radky, odebrano: 0, patch: '', ...o });
const STRANKA = soubor('src/components/skola/DruheKolo.tsx');
const run = (o) => vyhodnot({ pr: pr(), soubory: [STRANKA], issues: [issue()], konfig, zamrznuti: null, ted: TED, ...o });

const souhlasZaznam = (telo, cas) => ({ autor: BOT, cas, telo: ZNACKA.souhlas(otisk(rozsah(telo))) });
const schvalenoUdalost = (cas) => ({ akce: 'labeled', stitek: 'schvaleno', cas });

test('konfigurace z repozitáře: devět oblastí, každá s cestami', () => {
  assert.equal(Object.keys(konfig.oblasti).length, 9);
  for (const [oblast, vzory] of Object.entries(konfig.oblasti)) assert.ok(vzory.length > 0, oblast);
  assert.equal(konfig.rezimy.lhuta_l_hodin, 48);
});

test('odkazy na issues v těle PR', () => {
  assert.deepEqual(propojenaIssues('Closes #12\nSouvisí s #7, fixes #12'), [12, 7]);
  assert.deepEqual(propojenaIssues('viz #3'), []);
});

test('rozsah bere oddíl Rozsah, jinak celé tělo', () => {
  assert.equal(rozsah(TELO_ISSUE), 'Přidat větu o 2. kole.');
  assert.equal(rozsah('jen text\r\n'), 'jen text');
});

test('drobné zadání (L) čeká 48 h od poslední změny, pak projde', () => {
  const brzy = run({ pr: pr({ hlava: { sha: SHA, cas: PRED(10) } }) });
  assert.equal(brzy.rezim, 'L');
  assert.equal(brzy.uspech, false);
  assert.ok(brzy.cekaDo > TED);
  const pozde = run();
  assert.equal(pozde.rezim, 'L');
  assert.equal(pozde.uspech, true, pozde.duvody.join('; '));
});

test('stop na PR nebo na issue blokuje vždy, i incident a souhlas', () => {
  assert.equal(run({ pr: pr({ stitky: ['stop'] }) }).uspech, false);
  const zIssue = run({ issues: [issue({ stitky: ['interni', 'stop'] })] });
  assert.equal(zIssue.uspech, false);
  assert.match(zIssue.duvody.join(), /issue #10 má štítek stop/);
  const incident = run({
    pr: pr({ stitky: ['stop', 'incident', 'rutina'] }),
    zamrznuti: { od: '2026-10-01', do: '2026-10-20' },
  });
  assert.equal(incident.uspech, false);
});

test('bez protokolu z preview pro aktuální hlavu neprojde', () => {
  const bez = run({ pr: pr({ komentare: [] }) });
  assert.equal(bez.uspech, false);
  assert.match(bez.duvody.join(), /chybí protokol/);
  const stary = run({ pr: pr({ komentare: [protokolKomentar(SHA2)] }) });
  assert.equal(stary.uspech, false);
  const nesplneno = run({ pr: pr({ komentare: [protokolKomentar(SHA, 'nesplněno')] }) });
  assert.match(nesplneno.duvody.join(), /nesplněné/);
});

test('změna jen v dokumentaci protokol nepotřebuje', () => {
  const v = run({ pr: pr({ komentare: [] }), soubory: [soubor('docs/neco.md')] });
  assert.equal(v.uspech, true, v.duvody.join('; '));
});

test('rutina projde hned, nad limit běží jako drobné zadání', () => {
  const rutina = run({ pr: pr({ stitky: ['rutina'], hlava: { sha: SHA, cas: PRED(1) } }) });
  assert.equal(rutina.rezim, 'R');
  assert.equal(rutina.uspech, true, rutina.duvody.join('; '));
  const velka = run({ pr: pr({ stitky: ['rutina'], hlava: { sha: SHA, cas: PRED(1) } }), soubory: [soubor('src/components/skola/X.tsx', 400)] });
  assert.equal(velka.rezim, 'L');
  assert.equal(velka.uspech, false);
  const dveOblasti = run({
    pr: pr({ stitky: ['rutina'], hlava: { sha: SHA, cas: PRED(1) } }),
    soubory: [STRANKA, soubor('src/app/veletrhy/page.tsx')],
  });
  assert.equal(dveOblasti.rezim, 'L');
});

test('etapa projektu s dokladem projde hned', () => {
  const v = run({ pr: pr({ hlava: { sha: SHA, cas: PRED(1) } }), issues: [issue({ stitky: ['interni', 'projekt'] })] });
  assert.equal(v.rezim, 'E');
  assert.equal(v.uspech, true, v.duvody.join('; '));
});

test('issue bez dokladu a bez souhlasu neprojde, hlášení ve fázi 1 také ne', () => {
  assert.equal(run({ issues: [issue({ telo: 'bez zdroje' })] }).uspech, false);
  const hlaseni = run({ issues: [issue({ stitky: ['bug-report'] })] });
  assert.equal(hlaseni.uspech, false);
  assert.match(hlaseni.duvody.join(), /hlášení/);
});

test('PR bez propojeného zadání potřebuje souhlas na PR', () => {
  const v = run({ pr: pr({ telo: 'data' }), issues: [] });
  assert.equal(v.uspech, false);
  const se = run({
    pr: pr({
      telo: 'data', issues: [], stitky: ['schvaleno'],
      udalosti: [schvalenoUdalost(PRED(2))],
      komentare: [protokolKomentar(), { autor: BOT, cas: PRED(2), telo: ZNACKA.souhlasPr(SHA) }],
    }),
    issues: [],
  });
  assert.equal(se.uspech, true, se.duvody.join('; '));
});

test('souhlas na PR platí jen pro schválenou hlavu', () => {
  const v = run({
    pr: pr({
      telo: 'x', stitky: ['schvaleno'], udalosti: [schvalenoUdalost(PRED(2))],
      komentare: [protokolKomentar(), { autor: BOT, cas: PRED(2), telo: ZNACKA.souhlasPr(SHA2) }],
    }),
    issues: [],
  });
  assert.equal(v.uspech, false);
  assert.match(v.duvody.join(), /po schválení změnil/);
});

test('záznam souhlasu od jiného autora než brány se nepočítá', () => {
  const v = run({
    pr: pr({
      telo: 'x', stitky: ['schvaleno'], udalosti: [schvalenoUdalost(PRED(2))],
      komentare: [protokolKomentar(), { autor: 'tangero', cas: PRED(2), telo: ZNACKA.souhlasPr(SHA) }],
    }),
    issues: [],
  });
  assert.equal(v.uspech, false);
});

test('H2: změna brány potřebuje souhlas na PR, souhlas na issue nestačí', () => {
  const schvaleneIssue = issue({
    stitky: ['interni', 'schvaleno'], udalosti: [schvalenoUdalost(PRED(5))], komentare: [souhlasZaznam(TELO_ISSUE, PRED(5))],
  });
  const v = run({ soubory: [soubor('scripts/brana/brana.mjs')], issues: [schvaleneIssue] });
  assert.equal(v.rezim, 'H2');
  assert.equal(v.uspech, false);
});

test('H2: workflow, které mění secrets nebo permissions', () => {
  const a = rozbor([soubor('.github/workflows/testy.yml', 2, { patch: '@@\n+        env:\n+          T: ${{ secrets.X }}' })], konfig);
  assert.deepEqual(a.h2, ['.github/workflows/testy.yml']);
  const b = rozbor([soubor('.github/workflows/testy.yml', 2, { patch: '@@\n+        run: echo' })], konfig);
  assert.deepEqual(b.h2, []);
  assert.deepEqual(b.k, ['workflows']);
});

test('K: migrace projde se souhlasem na issue', () => {
  const schvaleneIssue = issue({
    stitky: ['interni', 'schvaleno'], udalosti: [schvalenoUdalost(PRED(5))], komentare: [souhlasZaznam(TELO_ISSUE, PRED(5))],
  });
  const bez = run({ soubory: [soubor('db/migrace/030-x.sql')] });
  assert.equal(bez.rezim, 'K');
  assert.equal(bez.uspech, false);
  const se = run({ soubory: [soubor('db/migrace/030-x.sql')], issues: [schvaleneIssue] });
  assert.equal(se.uspech, true, se.duvody.join('; '));
});

test('smazaná stránka je K (adresy)', () => {
  assert.deepEqual(rozbor([soubor('src/app/skoly/page.tsx', 0, { stav: 'removed', odebrano: 50 })], konfig).k, ['adresy']);
  assert.deepEqual(rozbor([soubor('src/app/skoly/page.tsx')], konfig).k, []);
});

test('přejímka O2: souhlas s rozsahem A nepokryje změněný rozsah B', () => {
  const telB = TELO_ISSUE.replace('Přidat větu o 2. kole.', 'Přidat větu a rozeslat e-mail všem školám.');
  const v = run({
    issues: [issue({
      telo: telB, stitky: ['interni', 'schvaleno'],
      udalosti: [schvalenoUdalost(PRED(5))], komentare: [souhlasZaznam(TELO_ISSUE, PRED(5))],
    })],
    soubory: [soubor('db/migrace/030-x.sql')],
  });
  assert.equal(v.uspech, false);
  assert.match(v.duvody.join(), /rozsah se po schválení změnil/);
});

test('přejímka O2: změna rozsahu mezi navrh a schvaleno souhlas zneplatní', () => {
  const navrhA = { autor: BOT, cas: PRED(10), telo: ZNACKA.otiskNavrhu(otisk(rozsah(TELO_ISSUE))) };
  const telB = TELO_ISSUE.replace('2. kole', '3. kole');
  assert.match(zaznamSouhlasu(issue({ telo: telB, komentare: [navrhA] })), /souhlas-neplatny/);
  assert.match(zaznamSouhlasu(issue({ komentare: [navrhA] })), /brana:souhlas sha256/);
  const v = souhlasIssue(issue({
    telo: telB, stitky: ['schvaleno'], udalosti: [schvalenoUdalost(PRED(5))],
    komentare: [navrhA, { autor: BOT, cas: PRED(5), telo: ZNACKA.souhlasNeplatny(otisk(rozsah(telB))) }],
  }), konfig);
  assert.equal(v.platny, false);
});

test('starší schválení před zavedením brány se zaznamená s dnešním rozsahem', () => {
  const s = souhlasIssue(issue({ stitky: ['schvaleno'], udalosti: [schvalenoUdalost('2026-09-20T10:00:00Z')] }), konfig);
  assert.equal(s.platny, true);
  assert.equal(s.zaznamenat.otisk, otisk(rozsah(TELO_ISSUE)));
  const nove = souhlasIssue(issue({ stitky: ['schvaleno'], udalosti: [schvalenoUdalost(PRED(1))] }), konfig);
  assert.equal(nove.platny, false);
});

test('zamrznutí blokuje, incident v rozsahu rutiny projde', () => {
  const z = { od: '2026-10-01', do: '2026-10-10' };
  assert.equal(zamrznuto(z, TED), true);
  assert.equal(zamrznuto({ od: '2026-10-01', do: '2026-10-09' }, TED), false);
  assert.equal(run({ zamrznuti: z }).uspech, false);
  const incident = run({ zamrznuti: z, pr: pr({ stitky: ['incident', 'rutina'], hlava: { sha: SHA, cas: PRED(1) } }) });
  assert.equal(incident.uspech, true, incident.duvody.join('; '));
  const velky = run({ zamrznuti: z, pr: pr({ stitky: ['incident'] }), soubory: [soubor('db/migrace/1.sql')] });
  assert.equal(velky.uspech, false);
});

test('rozpracovaný PR neprojde', () => {
  assert.equal(run({ pr: pr({ draft: true }) }).uspech, false);
});
