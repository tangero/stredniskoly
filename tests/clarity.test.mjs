import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { stahni, mimoRepozitar, PrilisMnohoDotazu, DIMENZE } from '../scripts/clarity-export.mjs';

// Microsoft Clarity jen na simulátoru (#329). Testy nevolají Clarity, síť nahrazuje mock.

const odpoved = (status, data = []) => ({ status, ok: status >= 200 && status < 300, json: async () => data });

test('export: tři dotazy po sobě s prodlevou, token v hlavičce', async () => {
  const volani = [];
  const cekani = [];
  const data = await stahni({
    token: 'tajne',
    fetchFn: async (url, opts) => { volani.push({ url, auth: opts.headers.Authorization }); return odpoved(200, [{ metricName: 'Traffic' }]); },
    cekej: async ms => { cekani.push(ms); },
  });
  assert.equal(volani.length, 3);
  assert.deepEqual(volani.map(v => new URL(v.url).searchParams.get('dimension1')), DIMENZE);
  assert.ok(volani.every(v => v.auth === 'Bearer tajne' && new URL(v.url).searchParams.get('numOfDays') === '1'));
  assert.deepEqual(cekani, [2000, 2000]);
  assert.deepEqual(Object.keys(data), DIMENZE);
});

test('export: při 429 skončí a další dotaz nepošle', async () => {
  let pocet = 0;
  await assert.rejects(
    stahni({ token: 't', fetchFn: async () => { pocet++; return odpoved(pocet === 2 ? 429 : 200); }, cekej: async () => {} }),
    PrilisMnohoDotazu,
  );
  assert.equal(pocet, 2);
});

test('export: bez tokenu ani s víc než 3 dny se nic neposílá', async () => {
  let pocet = 0;
  const fetchFn = async () => { pocet++; return odpoved(200); };
  await assert.rejects(stahni({ token: '', fetchFn }), /CLARITY_API_TOKEN/);
  await assert.rejects(stahni({ token: 't', dni: 7, fetchFn }), /--dni/);
  assert.equal(pocet, 0);
});

test('export: výstup jen mimo veřejný repozitář', () => {
  assert.equal(mimoRepozitar('public/clarity.json'), false);
  assert.equal(mimoRepozitar(path.resolve('data/clarity.json')), false);
  assert.equal(mimoRepozitar('/tmp/stredniskoly-rizeni/clarity.json'), true);
  assert.equal(mimoRepozitar('../stredniskoly-rizeni/clarity.json'), true);
});

test('Clarity se zapojuje jen na stránce simulátoru, ne v layoutu', () => {
  const layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
  assert.doesNotMatch(layout, /clarity/i);
  const stranky = fs.readdirSync('src/app', { recursive: true })
    .filter(f => /\.(tsx|ts)$/.test(f))
    .filter(f => /MereniClarity/.test(fs.readFileSync(path.join('src/app', f), 'utf8')));
  assert.deepEqual(stranky, [path.join('simulator', 'page.tsx')]);
  const simulator = fs.readFileSync('src/app/simulator/page.tsx', 'utf8');
  assert.match(simulator, /data-clarity-mask="true"/);
});

test('Clarity dostane signál bez souhlasu a při odchodu ze simulátoru se zastaví', () => {
  const k = fs.readFileSync('src/components/MereniClarity.tsx', 'utf8');
  assert.match(k, /consentv2', \{ ad_Storage: 'denied', analytics_Storage: 'denied' \}/);
  assert.match(k, /clarity\?\.\('stop'\)/);
});

test('formuláře s e-mailem jsou v Clarity maskované, CSP Clarity pouští', () => {
  for (const f of ['src/components/BugReportButton.tsx', 'src/components/novinky/OdberFormular.tsx']) {
    assert.match(fs.readFileSync(f, 'utf8'), /<form [^>]*data-clarity-mask="true"/, f);
  }
  const csp = fs.readFileSync('next.config.ts', 'utf8');
  assert.match(csp, /"script-src [^"]*https:\/\/\*\.clarity\.ms/);
  assert.match(csp, /"connect-src [^"]*https:\/\/\*\.clarity\.ms[^"]*https:\/\/c\.bing\.com/);
});
