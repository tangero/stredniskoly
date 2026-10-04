import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import yaml from 'js-yaml';
import { BOT } from '../scripts/brana/brana.mjs';
import { rozhodniOpravu, pocetKol, zasahH2, ZNACKA_KOLA, STITEK_CLOVEK } from '../scripts/brana/oprava-z-review.mjs';

const konfig = { rezimy: yaml.load(fs.readFileSync('.github/rezimy.yml', 'utf8')), oblasti: {} };
const REPO = 'tangero/stredniskoly';
const komentar = (o = {}) => ({ autor: 'eduarda-prijimacky', telo: '@claude oprav nálezy P2 z review (commit abc1234)', ...o });
const kolo = (n) => ({ autor: BOT, telo: `## Oprava z review (kolo ${n}/5)\n\n${ZNACKA_KOLA(n)}` });
const pr = (o = {}) => ({
  cislo: 7, autor: 'tangero', stav: 'open', stitky: [], komentare: [], udalosti: [],
  hlavaRepo: REPO, zakladnaRepo: REPO, ...o,
});
const rozhodni = (o = {}) => rozhodniOpravu({ komentar: komentar(), pr: pr(), issues: [], konfig, ...o });

test('konfigurace: review vyžadované, strop 5 kol', () => {
  assert.equal(konfig.rezimy.review.vyzadovat, true);
  assert.equal(konfig.rezimy.review.max_kol_oprav, 5);
});

test('komentář asistenta nebo vlastníka u PR vlastníka spustí 1. kolo', () => {
  assert.deepEqual(rozhodni(), { akce: 'oprava', duvod: 'kolo 1 z 5', kolo: 1, max: 5 });
  assert.equal(rozhodni({ komentar: komentar({ autor: 'tangero' }) }).akce, 'oprava');
  assert.equal(rozhodni({ pr: pr({ autor: 'eduarda-prijimacky' }) }).akce, 'oprava');
});

test('cizí účet, bot, fork ani cizí PR opravu nespustí', () => {
  assert.equal(rozhodni({ komentar: komentar({ autor: 'nekdo-z-internetu' }) }).akce, 'nic');
  assert.equal(rozhodni({ komentar: komentar({ autor: BOT }) }).akce, 'nic');
  assert.equal(rozhodni({ komentar: komentar({ autor: 'dependabot[bot]' }) }).akce, 'nic');
  const fork = rozhodni({ pr: pr({ hlavaRepo: 'nekdo/stredniskoly' }) });
  assert.deepEqual([fork.akce, fork.duvod], ['nic', 'PR je z forku']);
  assert.equal(rozhodni({ pr: pr({ hlavaRepo: undefined }) }).akce, 'nic');
  assert.equal(rozhodni({ pr: pr({ autor: 'dependabot[bot]' }) }).akce, 'nic');
  assert.equal(rozhodni({ pr: pr({ stav: 'closed' }) }).akce, 'nic');
});

test('komentář bez @claude nic nespustí, zmínka v e-mailu také ne', () => {
  assert.equal(rozhodni({ komentar: komentar({ telo: 'Review: bez P1 a P2' }) }).akce, 'nic');
  assert.equal(rozhodni({ komentar: komentar({ telo: 'napiš na x@claude.ai' }) }).akce, 'nic');
  assert.equal(rozhodni({ komentar: komentar({ telo: 'Opravit:\n@Claude P2 v src/x.ts' }) }).akce, 'oprava');
});

test('stop na PR nebo propojeném issue a štítek potrebuje-cloveka zastaví další kola', () => {
  assert.match(rozhodni({ pr: pr({ stitky: ['stop'] }) }).duvod, /stop/);
  const veto = { akce: 'labeled', stitek: 'stop', cas: '2026-10-04T10:00:00Z', aktor: 'eduarda-prijimacky' };
  const odebranoCizim = { akce: 'unlabeled', stitek: 'stop', cas: '2026-10-04T11:00:00Z', aktor: 'nekdo' };
  assert.equal(rozhodni({ pr: pr({ udalosti: [veto, odebranoCizim] }) }).akce, 'nic');
  const issue = { cislo: 10, stitky: ['interni', 'stop'], udalosti: [] };
  assert.match(rozhodni({ issues: [issue] }).duvod, /issue #10 má štítek stop/);
  assert.equal(rozhodni({ pr: pr({ stitky: [STITEK_CLOVEK] }) }).akce, 'nic');
});

test('strop: po 5 kolech workflow přidá štítek, další kolo nespustí', () => {
  const ctyri = [1, 2, 3, 4].map(kolo);
  assert.deepEqual(rozhodni({ pr: pr({ komentare: ctyri }) }), { akce: 'oprava', duvod: 'kolo 5 z 5', kolo: 5, max: 5 });
  const pet = [1, 2, 3, 4, 5].map(kolo);
  assert.deepEqual(rozhodni({ pr: pr({ komentare: pet }) }), { akce: 'strop', duvod: 'proběhlo 5 z 5 kol oprav', max: 5 });
});

test('kola počítá jen značka od workflow; značka od jiného autora se nepočítá', () => {
  assert.equal(pocetKol([kolo(1), { ...kolo(2), autor: 'tangero' }, { autor: BOT, telo: 'Oprava z review bez značky' }]), 1);
});

test('oprava nesmí změnit cesty H2', () => {
  assert.deepEqual(zasahH2(['src/app/page.tsx', 'scripts/brana/brana.mjs', '.github/rezimy.yml', 'CLAUDE.md', 'docs/x.md'], konfig),
    ['scripts/brana/brana.mjs', '.github/rezimy.yml', 'CLAUDE.md']);
  assert.deepEqual(zasahH2(['tests/brana.test.mjs'], konfig), []);
});

test('workflow: minimální oprávnění, jen token pro Claude, bez pull_request_target', () => {
  const obsah = fs.readFileSync('.github/workflows/oprava-z-review.yml', 'utf8');
  const w = yaml.load(obsah);
  assert.deepEqual(Object.keys(w.on), ['issue_comment']);
  assert.doesNotMatch(obsah, /pull_request_target/);
  assert.deepEqual(w.permissions, {});
  assert.deepEqual([...new Set(obsah.match(/secrets\.[A-Za-z0-9_]+/g))], ['secrets.CLAUDE_CODE_OAUTH_TOKEN']);
  assert.deepEqual(w.jobs.oprava.permissions, { contents: 'write', 'pull-requests': 'write' });
  assert.deepEqual(w.jobs.testy.permissions, { actions: 'write' });
  for (const [id, job] of Object.entries(w.jobs)) assert.ok(job['timeout-minutes'] > 0, id);
  assert.match(w.concurrency.group, /github\.event\.issue\.number/);
  // Claude nemá push ani gh v povolených nástrojích; pushne až krok po kontrole H2.
  const claude = w.jobs.oprava.steps.find((s) => s.uses?.startsWith('anthropics/claude-code-action'));
  assert.doesNotMatch(claude.with.claude_args, /git push|Bash\(gh|Bash\(\*\)|Bash"/);
  assert.match(obsah, /oprava-z-review\.mjs" kontrola/);
  // Žádný krok neslučuje ani nepřidává schvaleno či zamitnuto.
  assert.doesNotMatch(obsah, /gh pr merge|--add-label (schvaleno|zamitnuto)|\/merge/);
});
