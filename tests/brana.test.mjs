import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import yaml from 'js-yaml';
import {
  vyhodnot, rozsah, otisk, propojenaIssues, zaznamSouhlasu, souhlasIssue, rozbor, zamrznuto, ZNACKA, BOT,
  stavLhuty, externiId, ctiExterniId, review,
} from '../scripts/brana/brana.mjs';
import { oblastiZLabeleru } from '../scripts/brana/data.mjs';
import { odpovedNaZadost } from '../scripts/brana/sloucit.mjs';

const konfig = {
  rezimy: yaml.load(fs.readFileSync('.github/rezimy.yml', 'utf8')),
  oblasti: oblastiZLabeleru(yaml.load(fs.readFileSync('.github/labeler.yml', 'utf8'))),
};
const SHA = 'a'.repeat(40);
const SHA2 = 'b'.repeat(40);
const TED = Date.parse('2026-10-10T12:00:00Z');
const PRED = (h) => new Date(TED - h * 3600 * 1000).toISOString();

const TELO_ISSUE = 'Zdroj: vlastník\n\n## Rozsah\nPřidat větu o 2. kole.\n\n## Poznámky\nnic';
const issue = (o = {}) => ({ cislo: 10, autor: 'tangero', stav: 'open', stitky: ['interni'], telo: TELO_ISSUE, komentare: [], udalosti: [], ...o });
const protokolKomentar = (sha = SHA, vysledek = 'splněno', kdy = PRED(55)) => ({
  autor: 'tangero', cas: kdy, telo: `## Protokol z preview\nCommit: ${sha.slice(0, 7)}\n| věta na stránce | ${vysledek} |`,
});
const reviewKomentar = (sha = SHA, verdikt = 'Bez P1 a P2', o = {}) => ({
  autor: 'eduarda-prijimacky', cas: PRED(56), telo: `## Review\n\n**Verdikt:** ${verdikt}  \n**Commit:** \`${sha.slice(0, 7)}\`\n\nNálezy: žádné`, ...o,
});
const pr = (o = {}) => ({
  cislo: 5, autor: 'tangero', stav: 'open', zakladna: 'main', draft: false, telo: 'Closes #10', stitky: [],
  vytvoreno: PRED(72), hlava: { sha: SHA }, komentare: [reviewKomentar(), protokolKomentar()], udalosti: [], ...o,
});
const soubor = (nazev, radky = 10, o = {}) => ({ nazev, stav: 'modified', pridano: radky, odebrano: 0, patch: '', ...o });
const STRANKA = soubor('src/components/skola/DruheKolo.tsx');
// Výchozí: brána tentýž stav (PR, hlava, rozsahy, protokol) viděla už před 60 h.
const run = (o = {}) => {
  const v = { pr: pr(), soubory: [STRANKA], issues: [issue()], konfig, zamrznuti: null, ted: TED, ...o };
  if (!('predchozi' in o)) {
    const nanecisto = vyhodnot({ ...v, predchozi: null });
    v.predchozi = { stav: nanecisto.stav, od: Date.parse(PRED(60)) };
  }
  return vyhodnot(v);
};

const souhlasZaznam = (telo, cas) => ({ autor: BOT, cas, telo: ZNACKA.souhlas(otisk(rozsah(telo))) });
const schvalenoUdalost = (cas, aktor = 'tangero') => ({ akce: 'labeled', stitek: 'schvaleno', cas, aktor });

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

test('drobné zadání (L) čeká 48 h od prvního vyhodnocení stavu, pak projde', () => {
  const nove = run({ predchozi: null });
  assert.equal(nove.rezim, 'L');
  assert.equal(nove.uspech, false);
  assert.equal(nove.lhutaOd, TED);
  assert.ok(nove.cekaDo > TED);
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
  const rutina = run({ pr: pr({ stitky: ['rutina'], hlava: { sha: SHA } }) });
  assert.equal(rutina.rezim, 'R');
  assert.equal(rutina.uspech, true, rutina.duvody.join('; '));
  const velka = run({ pr: pr({ stitky: ['rutina'], hlava: { sha: SHA } }), soubory: [soubor('src/components/skola/X.tsx', 400)], predchozi: null });
  assert.equal(velka.rezim, 'L');
  assert.equal(velka.uspech, false);
  const dveOblasti = run({
    pr: pr({ stitky: ['rutina'], hlava: { sha: SHA } }),
    soubory: [STRANKA, soubor('src/app/veletrhy/page.tsx')],
  });
  assert.equal(dveOblasti.rezim, 'L');
});

test('etapa projektu s dokladem projde hned', () => {
  const v = run({ pr: pr({ hlava: { sha: SHA } }), issues: [issue({ stitky: ['interni', 'projekt'] })] });
  assert.equal(v.rezim, 'E');
  assert.equal(v.uspech, true, v.duvody.join('; '));
});

test('úkol schváleného projektu (sub-issue) s dokladem projde hned, bez lhůty', () => {
  const TELO_PROJEKTU = '## Rozsah\nZavést řízení vývoje.';
  const projekt = (o = {}) => issue({
    cislo: 50, stitky: ['interni', 'projekt', 'schvaleno'], telo: TELO_PROJEKTU,
    udalosti: [schvalenoUdalost(PRED(100))], komentare: [souhlasZaznam(TELO_PROJEKTU, PRED(100))], ...o,
  });
  const ukol = (rodic, o = {}) => issue({ rodic, ...o });
  const hned = (rodic, o) => run({ predchozi: null, issues: [ukol(rodic, o)] });

  const v = hned(projekt());
  assert.equal(v.rezim, 'E');
  assert.equal(v.uspech, true, v.duvody.join('; '));
  assert.match(v.duvody.join(), /úkol schváleného projektu #50/);
  // projekt založený s dokladem od vlastníka stačí i bez štítku schvaleno
  assert.equal(hned(projekt({ stitky: ['interni', 'projekt'], telo: `Zdroj: vlastník\n\n${TELO_PROJEKTU}`, udalosti: [], komentare: [] })).rezim, 'E');

  // bez schváleného projektu jde o drobné zadání s lhůtou
  assert.equal(hned(null).rezim, 'L');
  assert.equal(hned(projekt({ stitky: ['interni', 'projekt', 'navrh'], udalosti: [], komentare: [] })).rezim, 'L');
  assert.equal(hned(projekt({ stitky: ['interni', 'schvaleno'] })).rezim, 'L', 'rodič bez štítku projekt');
  assert.equal(hned(projekt({ stav: 'closed' })).rezim, 'L');
  assert.equal(hned(projekt({ autor: 'cizi', stitky: ['interni', 'projekt'], telo: `Zdroj: vlastník\n\n${TELO_PROJEKTU}`, udalosti: [], komentare: [] })).rezim, 'L');

  // úkol bez vlastního dokladu nepustí ani schválený projekt; stop na projektu blokuje i úkoly
  assert.equal(hned(projekt(), { telo: 'bez zdroje' }).uspech, false);
  const stop = hned(projekt({ stitky: ['interni', 'projekt', 'schvaleno', 'stop'] }));
  assert.equal(stop.uspech, false);
  assert.match(stop.duvody.join(), /projekt #50 \(rodič issue #10\) má štítek stop/);
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

const WF = `name: T
on: push
permissions:
  contents: read
jobs:
  a:
    runs-on: ubuntu-latest
    steps:
      - run: echo
`;
const wf = (pred, po, o = {}) => soubor('.github/workflows/testy.yml', 2, { obsahPred: pred, obsahPo: po, ...o });

test('H2: workflow, které mění oprávnění nebo secrets', () => {
  // Změna hodnoty pod nezměněným řádkem `permissions:` (review P1).
  assert.deepEqual(rozbor([wf(WF, WF.replace('contents: read', 'contents: write'))], konfig).h2, ['.github/workflows/testy.yml']);
  assert.deepEqual(rozbor([wf(WF, WF.replace('runs-on: ubuntu-latest', 'runs-on: ubuntu-latest\n    permissions: write-all'))], konfig).h2.length, 1);
  assert.deepEqual(rozbor([wf(WF, WF.replace('- run: echo', '- run: echo ${{ secrets.X }}'))], konfig).h2.length, 1);
  const bezPrav = rozbor([wf(WF, WF.replace('- run: echo', '- run: echo ahoj'))], konfig);
  assert.deepEqual(bezPrav.h2, []);
  assert.deepEqual(bezPrav.k, ['workflows']);
});

test('H2: nový workflow a nečitelný obsah konzervativně, smazání ne', () => {
  assert.equal(rozbor([wf(undefined, WF, { stav: 'added' })], konfig).h2.length, 1);
  assert.equal(rozbor([wf(WF, undefined)], konfig).h2.length, 1);
  assert.equal(rozbor([wf(WF, 'jobs: [nezavrene')], konfig).h2.length, 1);
  assert.equal(rozbor([wf(WF, undefined, { stav: 'removed' })], konfig).h2.length, 0);
});

test('H2 přes workflow neprojde se souhlasem na issue', () => {
  const schvaleneIssue = issue({
    stitky: ['interni', 'schvaleno'], udalosti: [schvalenoUdalost(PRED(5))], komentare: [souhlasZaznam(TELO_ISSUE, PRED(5))],
  });
  const v = run({ soubory: [wf(WF, WF.replace('contents: read', 'contents: write'))], issues: [schvaleneIssue] });
  assert.equal(v.rezim, 'H2');
  assert.equal(v.uspech, false);
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

test('přesun stránky do dokumentace potřebuje protokol', () => {
  const presun = soubor('docs/removed-page.md', 0, { stav: 'renamed', puvodni: 'src/app/skoly/page.tsx' });
  const a = rozbor([presun], konfig);
  assert.equal(a.jenBezPreview, false);
  assert.deepEqual(a.k, ['adresy']);
  const v = run({
    pr: pr({ komentare: [] }), soubory: [presun],
    issues: [issue({ stitky: ['interni', 'schvaleno'], udalosti: [schvalenoUdalost(PRED(5))], komentare: [souhlasZaznam(TELO_ISSUE, PRED(5))] })],
  });
  assert.equal(v.uspech, false);
  assert.match(v.duvody.join(), /chybí protokol/);
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
  const odmitnuti = zaznamSouhlasu(issue({ telo: telB, komentare: [navrhA] }), telB);
  assert.equal(odmitnuti.platny, false);
  assert.match(odmitnuti.znacky, /souhlas-neplatny/);
  assert.equal(zaznamSouhlasu(issue({ komentare: [navrhA] }), TELO_ISSUE).platny, true);
  const v = souhlasIssue(issue({
    telo: telB, stitky: ['schvaleno'], udalosti: [schvalenoUdalost(PRED(5))],
    komentare: [navrhA, { autor: BOT, cas: PRED(5), telo: odmitnuti.znacky }],
  }), konfig);
  assert.equal(v.platny, false);
});

test('celý cyklus A → B → odmítnutí → nové potvrzení B', () => {
  const navrhA = { autor: BOT, cas: PRED(10), telo: ZNACKA.otiskNavrhu(otisk(rozsah(TELO_ISSUE))) };
  const telB = TELO_ISSUE.replace('2. kole', '3. kole');
  const odmitnuti = { autor: BOT, cas: PRED(5), telo: zaznamSouhlasu(issue({ telo: telB, komentare: [navrhA] }), telB).znacky };
  // Vlastník B zkontroluje a přidá schvaleno znovu: porovná se s novým otiskem návrhu B.
  const znovu = zaznamSouhlasu(issue({ telo: telB, komentare: [navrhA, odmitnuti] }), telB);
  assert.equal(znovu.platny, true);
  const s = souhlasIssue(issue({
    telo: telB, stitky: ['schvaleno'],
    udalosti: [schvalenoUdalost(PRED(5)), { akce: 'unlabeled', stitek: 'schvaleno', cas: PRED(5) }, schvalenoUdalost(PRED(2))],
    komentare: [navrhA, odmitnuti, { autor: BOT, cas: PRED(2), telo: znovu.znacky }],
  }), konfig);
  assert.equal(s.platny, true, s.duvod);
});

test('opožděný běh: souhlas se zaznamená s rozsahem ze schvalovací události, ne z API', () => {
  const telB = TELO_ISSUE.replace('Přidat větu o 2. kole.', 'Přidat větu a rozeslat e-mail.');
  // Schváleno přímo (bez navrh) s tělem A; než workflow doběhl, API už vrací B.
  const z = zaznamSouhlasu(issue({ telo: telB }), TELO_ISSUE);
  assert.equal(z.platny, true);
  const s = souhlasIssue(issue({
    telo: telB, stitky: ['schvaleno'], udalosti: [schvalenoUdalost(PRED(2))],
    komentare: [{ autor: BOT, cas: PRED(2), telo: z.znacky }],
  }), konfig);
  assert.equal(s.platny, false);
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
  const incident = run({ zamrznuti: z, pr: pr({ stitky: ['incident', 'rutina'], hlava: { sha: SHA } }) });
  assert.equal(incident.uspech, true, incident.duvody.join('; '));
  const velky = run({ zamrznuti: z, pr: pr({ stitky: ['incident'] }), soubory: [soubor('db/migrace/1.sql')] });
  assert.equal(velky.uspech, false);
});

const sPredchozim = (stavZ, o = {}) => {
  const predchozi = { stav: vyhodnot({ pr: pr(), soubory: [STRANKA], issues: [issue()], konfig, ted: TED, ...stavZ }).stav, od: Date.parse(PRED(60)) };
  return run({ predchozi, ...o });
};

test('lhůta L se založí znovu při změně hlavy, rozsahu zadání nebo protokolu', () => {
  // Starší commit pushnutý do PR: jiná hlava, i když CI na něm běželo dávno v jiné větvi.
  const novaHlava = sPredchozim({}, { pr: pr({ hlava: { sha: SHA2 }, komentare: [protokolKomentar(SHA2)] }) });
  assert.equal(novaHlava.uspech, false);
  assert.equal(novaHlava.lhutaOd, TED);
  // Rozsah neodsouhlaseného zadání se změnil z A na B.
  const telB = TELO_ISSUE.replace('Přidat větu o 2. kole.', 'Dávka B');
  assert.equal(sPredchozim({}, { issues: [issue({ telo: telB })] }).uspech, false);
  // Existující protokol upravený (nesplněno → splněno) nebo nový protokol.
  const predchoziNesplneno = { pr: pr({ komentare: [protokolKomentar(SHA, 'nesplněno')] }) };
  const upraveny = sPredchozim(predchoziNesplneno, { pr: pr({ komentare: [{ ...protokolKomentar(SHA), upraveno: PRED(0.1) }] }) });
  assert.equal(upraveny.uspech, false);
  assert.match(upraveny.duvody.join(), /lhůta na veto běží/);
  // Beze změny stavu lhůta trvá od původního počátku.
  assert.equal(sPredchozim({}).uspech, true);
});

test('stav lhůty a identifikátor kontroly', () => {
  const st = stavLhuty(pr(), [issue()], 'x');
  assert.notEqual(st, stavLhuty(pr({ cislo: 6 }), [issue()], 'x'));
  const id = externiId({ pr: 5, stav: st, od: TED, zadost: 77 });
  assert.deepEqual(ctiExterniId(id), { pr: 5, stav: st, od: TED, zadost: 77 });
  assert.equal(ctiExterniId(externiId({ pr: 5, stav: st, od: TED })).zadost, null);
  assert.equal(ctiExterniId('cizi'), null);
});

test('sloučení čeká na odpověď právě na svou žádost, jiný i později dokončený běh nestačí', async () => {
  const st = 'c'.repeat(64);
  const kontrola = (id, zadost, conclusion, pr = 5) => ({
    id, status: 'completed', conclusion, app: { slug: 'github-actions' }, external_id: externiId({ pr, stav: st, od: TED, zadost }),
  });
  // Běh zahájený před žádostí doběhne až po ní: nemá číslo žádosti, proto se nepočítá.
  const starsiBeh = kontrola(3, null, 'success');
  const jinyPr = kontrola(4, 900, 'success', 6);
  const odpoved = kontrola(5, 900, 'failure');
  let volani = 0;
  const api = async () => ({ check_runs: volani++ < 2 ? [starsiBeh, jinyPr] : [starsiBeh, jinyPr, odpoved] });
  const k = await odpovedNaZadost(api, SHA, 5, 900, { cekani: 60_000, interval: 0, spanek: async () => {} });
  assert.equal(k.id, 5);
  assert.equal(k.conclusion, 'failure');
  const nic = await odpovedNaZadost(async () => ({ check_runs: [starsiBeh] }), SHA, 5, 900, { cekani: 0, interval: 0, spanek: async () => {} });
  assert.equal(nic, null);
  // Kontrola se stejným jménem, ale od jiné aplikace, se nepočítá.
  const cizi = { ...odpoved, id: 9, app: { slug: 'jina-aplikace' } };
  assert.equal(await odpovedNaZadost(async () => ({ check_runs: [cizi] }), SHA, 5, 900, { cekani: 0, interval: 0, spanek: async () => {} }), null);
});

test('schvaleno z jiného účtu než vlastníka není souhlas', () => {
  const s = souhlasIssue(issue({
    stitky: ['schvaleno'], udalosti: [schvalenoUdalost(PRED(5), 'eduarda-prijimacky')],
    komentare: [souhlasZaznam(TELO_ISSUE, PRED(5))],
  }), konfig);
  assert.equal(s.platny, false);
  assert.match(s.duvod, /eduarda-prijimacky/);
  const v = run({
    pr: pr({
      telo: 'x', stitky: ['schvaleno'], udalosti: [schvalenoUdalost(PRED(2), 'eduarda-prijimacky')],
      komentare: [protokolKomentar(), { autor: BOT, cas: PRED(2), telo: ZNACKA.souhlasPr(SHA) }],
    }),
    issues: [],
  });
  assert.equal(v.uspech, false);
});

test('neodvolané veto nezahladí nové přidání a odebrání stop cizím účtem (PR i issue)', () => {
  const ud = (akce, aktor, h) => ({ akce, stitek: 'stop', cas: PRED(h), aktor });
  const cyklus = [
    ud('labeled', 'tangero', 8), ud('unlabeled', 'eduarda-prijimacky', 7),
    ud('labeled', 'eduarda-prijimacky', 6), ud('unlabeled', 'eduarda-prijimacky', 5),
  ];
  assert.equal(run({ issues: [issue({ udalosti: cyklus })] }).uspech, false);
  assert.equal(run({ pr: pr({ udalosti: cyklus }) }).uspech, false);
  // Vlastník veto odvolá: projde.
  assert.equal(run({ issues: [issue({ udalosti: [...cyklus, ud('unlabeled', 'tangero', 4)] })] }).uspech, true);
});

test('stop odebraný cizím účtem dál platí, odebraný tím, kdo ho přidal, nebo vlastníkem ne', () => {
  const ud = (akce, aktor, h) => ({ akce, stitek: 'stop', cas: PRED(h), aktor });
  const s = (udalosti) => run({ issues: [issue({ udalosti })] }).uspech;
  assert.equal(s([ud('labeled', 'tangero', 5), ud('unlabeled', 'eduarda-prijimacky', 4)]), false);
  assert.equal(s([ud('labeled', 'eduarda-prijimacky', 5), ud('unlabeled', 'eduarda-prijimacky', 4)]), true);
  assert.equal(s([ud('labeled', 'eduarda-prijimacky', 5), ud('unlabeled', 'tangero', 4)]), true);
});

test('veřejný repozitář: doklad „Zdroj:“ v cizím issue se nepočítá', () => {
  const v = run({ issues: [issue({ autor: 'nekdo-z-internetu' })] });
  assert.equal(v.uspech, false);
  assert.match(v.duvody.join(), /nekdo-z-internetu/);
  // Issue od asistenta zadání s dokladem projde jako drobné zadání.
  assert.equal(run({ issues: [issue({ autor: 'eduarda-prijimacky' })] }).uspech, true);
  // Rutina s cizím issue také neprojde.
  assert.equal(run({ pr: pr({ stitky: ['rutina'] }), issues: [issue({ autor: 'nekdo-z-internetu', stitky: ['interni', 'rutina'] })] }).uspech, false);
});

test('veřejný repozitář: protokol z preview od cizího účtu se nepočítá', () => {
  const cizi = { ...protokolKomentar(), autor: 'nekdo-z-internetu' };
  const v = run({ pr: pr({ komentare: [cizi] }) });
  assert.equal(v.uspech, false);
  assert.match(v.duvody.join(), /chybí protokol/);
  assert.equal(run({ pr: pr({ komentare: [reviewKomentar(), { ...protokolKomentar(), autor: 'eduarda-prijimacky' }] }) }).uspech, true);
  assert.equal(run({ pr: pr({ komentare: [reviewKomentar(), { ...protokolKomentar(), autor: BOT }] }) }).uspech, true);
  // Protokol v těle cizího PR také ne.
  const telo = `Closes #10\n\n## Protokol z preview\nCommit: ${SHA.slice(0, 7)}`;
  assert.match(run({ pr: pr({ autor: 'nekdo-z-internetu', telo, komentare: [] }) }).duvody.join(), /chybí protokol/);
});

test('veřejný repozitář: PR jiného autora potřebuje souhlas na PR, i se schváleným issue', () => {
  const schvaleneIssue = issue({
    stitky: ['interni', 'schvaleno'], udalosti: [schvalenoUdalost(PRED(5))], komentare: [souhlasZaznam(TELO_ISSUE, PRED(5))],
  });
  for (const soubory of [[STRANKA], [soubor('db/migrace/030-x.sql')]]) {
    const v = run({ pr: pr({ autor: 'dependabot[bot]' }), issues: [schvaleneIssue], soubory });
    assert.equal(v.uspech, false, soubory[0].nazev);
  }
  const se = run({
    pr: pr({
      autor: 'nekdo-z-internetu', stitky: ['schvaleno'], udalosti: [schvalenoUdalost(PRED(2))],
      komentare: [protokolKomentar(), { autor: BOT, cas: PRED(2), telo: ZNACKA.souhlasPr(SHA) }],
    }),
  });
  assert.equal(se.uspech, true, se.duvody.join('; '));
});

test('rozpracovaný PR neprojde', () => {
  assert.equal(run({ pr: pr({ draft: true }) }).uspech, false);
});

test('review: bez review asistenta pro aktuální hlavu PR neprojde, s verdiktem „Bez P1 a P2“ projde', () => {
  const bez = run({ pr: pr({ komentare: [protokolKomentar()] }) });
  assert.equal(bez.uspech, false);
  assert.match(bez.duvody.join(), /chybí review asistenta zadání pro commit aaaaaaa/);
  assert.equal(run().uspech, true, run().duvody.join('; '));
  // Druhý formát, který asistent píše: bez tučného písma a zpětných apostrofů.
  const prosty = { autor: 'eduarda-prijimacky', cas: PRED(56), telo: `## Review\n\nVerdikt: Bez P1 a P2\nCommit: ${SHA.slice(0, 7)}\n\nNálezy: žádné` };
  assert.equal(run({ pr: pr({ komentare: [prosty, protokolKomentar()] }) }).uspech, true);
});

test('review: cizí účet, vlastník, starší hlava, nálezy P2 a zmínka sha mimo řádek Commit se nepočítají', () => {
  const zkus = (k) => run({ pr: pr({ komentare: [k, protokolKomentar()] }) });
  assert.match(zkus(reviewKomentar(SHA, 'Bez P1 a P2', { autor: 'nekdo-z-internetu' })).duvody.join(), /chybí review/);
  assert.match(zkus(reviewKomentar(SHA, 'Bez P1 a P2', { autor: 'tangero' })).duvody.join(), /chybí review/);
  assert.match(zkus(reviewKomentar(SHA, 'Bez P1 a P2', { autor: BOT })).duvody.join(), /chybí review/);
  assert.match(zkus(reviewKomentar(SHA2)).duvody.join(), /chybí review asistenta zadání pro commit aaaaaaa/);
  const p2 = zkus(reviewKomentar(SHA, 'P2 – opravit před sloučením'));
  assert.equal(p2.uspech, false);
  assert.match(p2.duvody.join(), /nemá verdikt „Bez P1 a P2“ \(P2 – opravit před sloučením\)/);
  const vOdkazu = { autor: 'eduarda-prijimacky', cas: PRED(56), telo: `## Review\n\nVerdikt: Bez P1 a P2\nCommit: ${SHA2.slice(0, 7)}\nViz https://github.com/x/commit/${SHA}` };
  assert.match(zkus(vOdkazu).duvody.join(), /chybí review/);
});

test('review: rozhoduje poslední review pro hlavu; po opravě nové review s „Bez P1 a P2“ projde', () => {
  const stare = reviewKomentar(SHA, 'P1 – rozbitá stránka', { cas: PRED(58) });
  const nove = reviewKomentar(SHA, 'Bez P1 a P2', { cas: PRED(57) });
  assert.equal(run({ pr: pr({ komentare: [stare, nove, protokolKomentar()] }) }).uspech, true);
  assert.equal(run({ pr: pr({ komentare: [nove, { ...stare, cas: PRED(56) }, protokolKomentar()] }) }).uspech, false);
  assert.equal(review(pr(), konfig).ok, true);
});

test('review: výjimka pro změny bez dopadu na web a pro PR se schvaleno na PR', () => {
  const docs = run({ pr: pr({ komentare: [] }), soubory: [soubor('docs/neco.md')] });
  assert.doesNotMatch(docs.duvody.join(), /review/);
  const sSouhlasem = run({
    pr: pr({
      stitky: ['schvaleno'], udalosti: [schvalenoUdalost(PRED(3))],
      komentare: [protokolKomentar(), { autor: BOT, cas: PRED(2), telo: ZNACKA.souhlasPr(SHA) }],
    }),
  });
  assert.equal(sSouhlasem.uspech, true, sSouhlasem.duvody.join('; '));
});

test('review: lhůta L běží od review, nové review ji založí znovu', () => {
  const bezReview = run({ pr: pr({ komentare: [protokolKomentar()] }), predchozi: null });
  const sReview = run({ predchozi: { stav: bezReview.stav, od: Date.parse(PRED(60)) } });
  assert.equal(sReview.lhutaOd, TED);
  assert.equal(sReview.uspech, false);
  assert.match(sReview.duvody.join(), /lhůta na veto běží/);
});

test('review: nové review se stejným textem lhůtu L založí znovu', () => {
  const stare = reviewKomentar(SHA, 'Bez P1 a P2', { id: 1, cas: PRED(60) });
  const v1 = run({ pr: pr({ komentare: [stare, protokolKomentar()] }), predchozi: null });
  const nove = { ...stare, id: 2, cas: PRED(0.1) };
  const v2 = run({ pr: pr({ komentare: [nove, protokolKomentar()] }), predchozi: { stav: v1.stav, od: Date.parse(PRED(60)) } });
  assert.notEqual(v2.stav, v1.stav);
  assert.equal(v2.lhutaOd, TED);
  assert.equal(v2.uspech, false);
});
