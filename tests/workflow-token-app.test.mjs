import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import yaml from 'js-yaml';

// Token GitHub App prijimacky-ai (#403, RA47) smí vznikat jen v jmenovaných workflow, jen se zúženými právy
// a nikdy v jobu, který spouští kód z PR nebo z cizí větve (P4). Tokeny vlastníka zůstávají jen tam, kde je
// App nahradit neumí (Tabule; týdenní přehled se ptá na expiraci).

const SLOZKA = '.github/workflows';
const AKCE = 'actions/create-github-app-token@';
const S_APP = ['csi-weekly-refresh.yml', 'oponentura.yml', 'otazka.yml', 'slouceni.yml', 'tydenni-prehled.yml', 'veletrhy-snimek.yml'];
// Spouštěče, které běží nad kódem z main (nebo z větve, kterou spustil člověk s právem zápisu), ne nad kódem PR.
const BEZPECNE_SPOUSTECE = new Set(['schedule', 'workflow_dispatch', 'workflow_run', 'issues', 'issue_comment']);

const workflow = Object.fromEntries(fs.readdirSync(SLOZKA).filter((f) => /\.ya?ml$/.test(f)).map((f) => {
  const text = fs.readFileSync(`${SLOZKA}/${f}`, 'utf8');
  return [f, { text, data: yaml.load(text) }];
}));
const spoustece = (data) => Object.keys(data.on ?? data[true] ?? {});
const kroky = (data) => Object.entries(data.jobs ?? {}).map(([id, job]) => ({ id, kroky: job.steps ?? [] }));

test('token App vzniká jen v jmenovaných workflow', () => {
  const s = Object.entries(workflow).filter(([, w]) => w.text.includes(AKCE)).map(([f]) => f).sort();
  assert.deepEqual(s, S_APP);
});

test('workflow s tokenem App se nespouští nad kódem z PR', () => {
  for (const f of S_APP) {
    const { data } = workflow[f];
    for (const sp of spoustece(data)) assert.ok(BEZPECNE_SPOUSTECE.has(sp), `${f}: spouštěč ${sp}`);
    for (const { id, kroky: k } of kroky(data)) {
      for (const krok of k.filter((x) => String(x.uses ?? '').startsWith('actions/checkout@'))) {
        const ref = String(krok.with?.ref ?? '');
        assert.doesNotMatch(ref, /pull_request|head_sha|head_branch|head\.ref|head\.sha/, `${f}/${id}: checkout ${ref}`);
      }
    }
  }
});

test('token App má vždy zúžená práva a používá se jen ve svém jobu, bez náhradního tokenu', () => {
  for (const f of S_APP) {
    for (const { id, kroky: k } of kroky(workflow[f].data)) {
      const app = k.filter((x) => String(x.uses ?? '').startsWith(AKCE));
      for (const krok of app) {
        const prava = Object.keys(krok.with ?? {}).filter((x) => x.startsWith('permission-'));
        assert.ok(prava.length > 0, `${f}/${id}: token bez zúžených práv`);
        assert.ok(!prava.some((x) => /administration|workflows|secrets|actions|environments/.test(x)), `${f}/${id}: zakázané právo`);
        assert.equal(krok.id, 'app', `${f}/${id}`);
      }
      const text = JSON.stringify(k);
      if (text.includes('steps.app.outputs.token')) {
        assert.equal(app.length, 1, `${f}/${id}: token App se používá bez kroku, který ho vytvoří`);
        assert.doesNotMatch(text, /steps\.app\.outputs\.token\s*\|\|/, `${f}/${id}: náhradní token`);
      }
    }
  }
});

test('tokeny vlastníka zůstávají jen v Tabuli a v týdenním přehledu', () => {
  for (const [f, { text }] of Object.entries(workflow)) {
    assert.doesNotMatch(text, /secrets\.CSI_PR_TOKEN/, f);
    if (!['tabule.yml', 'tydenni-prehled.yml'].includes(f)) assert.doesNotMatch(text, /secrets\.PROJECT_TOKEN/, f);
  }
});
