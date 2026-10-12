import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import yaml from 'js-yaml';
import { naRade, ULOHY } from '../scripts/provoz/planovac.mjs';

const T = Date.parse('2026-10-09T10:00:00Z');
const pred = (min) => new Date(T - min * 60000).toISOString();

test('úloha s intervalem je na řadě po intervalu s rezervou dvou minut', () => {
  const u = { workflow: 'x.yml', interval: 15 };
  assert.equal(naRade(u, pred(12), T), false);
  assert.equal(naRade(u, pred(13), T), true);
  assert.equal(naRade(u, null, T), true);
  // Pětiminutová úloha při spouštění po 5 minutách s malým zpožděním nevynechá běh.
  assert.equal(naRade({ workflow: 'd.yml', interval: 5 }, pred(4.5), T), true);
});

test('denní úloha jednou denně po čase, i když plánovač běží nepravidelně', () => {
  const u = { workflow: 'c.yml', denne: '06:52' };
  const den = (hhmm) => Date.parse(`2026-10-09T${hhmm}:00Z`);
  assert.equal(naRade(u, '2026-10-08T06:53:00Z', den('06:50')), false);
  assert.equal(naRade(u, '2026-10-08T06:53:00Z', den('06:55')), true);
  assert.equal(naRade(u, '2026-10-09T06:56:00Z', den('13:51')), false);
  assert.equal(naRade(u, null, den('23:00')), true);
});

test('každé workflow plánovače jde spustit ručně a vstupy odpovídají jeho definici', () => {
  for (const u of ULOHY) {
    const w = yaml.load(fs.readFileSync(`.github/workflows/${u.workflow}`, 'utf8'));
    const on = w.on ?? w[true];
    assert.ok('workflow_dispatch' in on, `${u.workflow}: chybí workflow_dispatch`);
    for (const klic of Object.keys(u.inputs || {})) assert.ok(on.workflow_dispatch?.inputs?.[klic], `${u.workflow}: neznámý vstup ${klic}`);
  }
});

test('denní zprávu spouští jen plánovač, ne plán GitHubu (jinak by přišla dvakrát)', () => {
  const w = yaml.load(fs.readFileSync('.github/workflows/ceka-na-tebe.yml', 'utf8'));
  assert.equal('schedule' in (w.on ?? w[true]), false);
});
