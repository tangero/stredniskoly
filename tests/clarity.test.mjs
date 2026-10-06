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

test('Clarity se zapojuje jen na simulátoru a stránce školy a oboru, ne v layoutu', () => {
  const layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
  assert.doesNotMatch(layout, /clarity/i);
  const stranky = fs.readdirSync('src/app', { recursive: true })
    .filter(f => /\.(tsx|ts)$/.test(f))
    .filter(f => /MereniClarity/.test(fs.readFileSync(path.join('src/app', f), 'utf8')))
    .sort();
  assert.deepEqual(stranky, [path.join('simulator', 'page.tsx'), path.join('skola', '[slug]', 'page.tsx')]);
  const simulator = fs.readFileSync('src/app/simulator/page.tsx', 'utf8');
  assert.match(simulator, /data-clarity-mask="true"/);
});

test('stránky školy a oboru: odmaskovaný obsah, měření oddílů, typ stránky', () => {
  const stranka = fs.readFileSync('src/app/skola/[slug]/page.tsx', 'utf8');
  assert.match(stranka, /<MereniClarity typStranky="skola" oddily \/>/);
  assert.match(stranka, /<MereniClarity typStranky="obor" nabidka=\{nabidkaOboru\} oddily \/>/);
  assert.equal((stranka.match(/data-clarity-unmask="true"/g) || []).length, 2);
  // formuláře uvnitř odmaskovaného obsahu zůstávají maskované
  assert.match(fs.readFileSync('src/components/novinky/OdberBlok.tsx', 'utf8'), /data-clarity-mask="true"/);
  assert.match(fs.readFileSync('src/components/obor/ProfilOboru.tsx', 'utf8'), /aria-labelledby="kde-stojim" data-clarity-mask="true"/);
});

test('oddíly a důkazy mají stálý identifikátor odvozený z id a nadpisu', async () => {
  const { idDukazu } = await import('../src/lib/mereni-oddilu.ts');
  assert.equal(idDukazu('Kolik soutěžících uchazečů se dostalo'), 'dukaz-kolik-soutezicich-uchazecu-se-dostalo');
  assert.equal(idDukazu('2. kolo'), 'dukaz-2-kolo');
  for (const f of ['src/components/obor/ProfilOboru.tsx', 'src/components/skola/ProfilSkoly.tsx']) {
    const zdroj = fs.readFileSync(f, 'utf8');
    assert.match(zdroj, /<section id=\{id\} data-oddil=\{id\}/, f);
    assert.match(zdroj, /<details open=\{otevreny\} data-oddil=\{idDukazu\(nadpis\)\}/, f);
    // nadpis důkazu je vždy pevný text, ne výraz: jinak by identifikátor závisel na datech
    const dukazy = [...zdroj.matchAll(/<Dukaz nadpis=(\S)/g)].map(m => m[1]);
    assert.ok(dukazy.length > 0 && dukazy.every(z => z === '"'), f);
  }
  // dokumentace vyjmenovává identifikátory oddílů
  const doc = fs.readFileSync('docs/zdroje-dat.md', 'utf8');
  for (const id of ['prijeti', 'pomoc', 'studium', 'obory', 'vede', 'jaka', 'kde']) assert.match(doc, new RegExp('`' + id + '`'));
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

test('oddíl vysoký 5× okno pošle oddil_videt po 3 s, jednou (mock IntersectionObserver)', async () => {
  const { sledujViditelnost, prahyPozorovani, PRAH_VIDITELNOSTI_MS } = await import('../src/lib/mereni-oddilu.ts');
  const okno = 800;
  const puvodni = { io: globalThis.IntersectionObserver, h: globalThis.innerHeight, st: globalThis.setTimeout, ct: globalThis.clearTimeout };
  const pozorovatele = [];
  const casovace = new Map();
  let dalsi = 1;
  globalThis.innerHeight = okno;
  globalThis.setTimeout = (fn, ms) => { casovace.set(dalsi, { fn, ms }); return dalsi++; };
  globalThis.clearTimeout = id => { casovace.delete(id); };
  globalThis.IntersectionObserver = class {
    constructor(cb, opts) { this.cb = cb; this.opts = opts; pozorovatele.push(this); }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  try {
    const prvek = { dataset: { oddil: 'obory' }, getBoundingClientRect: () => ({ height: okno * 5 }) };
    const poslano = [];
    const konec = sledujViditelnost([prvek], id => poslano.push(id));
    const io = pozorovatele[0];
    // polovina okna je 0,1 výšky prvku; ten musí být mezi prahy, jinak se vyhodnocení nikdy nespustí
    assert.ok(io.opts.threshold.some(p => Math.abs(p - 0.1) < 1e-9));
    assert.ok(prahyPozorovani(okno * 5, okno).some(p => Math.abs(p - 0.1) < 1e-9));
    // vidět je 0,3 okna: nic se neodpočítává
    io.cb([{ target: prvek, isIntersecting: true, intersectionRatio: 0.05, intersectionRect: { height: okno * 0.3 } }]);
    assert.equal(casovace.size, 0);
    // vidět je celé okno (podíl prvku 0,2): spustí se jeden 3s časovač
    const zaznam = { target: prvek, isIntersecting: true, intersectionRatio: 0.2, intersectionRect: { height: okno } };
    io.cb([zaznam]);
    io.cb([zaznam]);
    assert.equal(casovace.size, 1);
    const [{ fn, ms }] = casovace.values();
    assert.equal(ms, PRAH_VIDITELNOSTI_MS);
    fn();
    assert.deepEqual(poslano, ['obory']);
    io.cb([zaznam]);
    assert.deepEqual(poslano, ['obory']);
    konec();
  } finally {
    globalThis.IntersectionObserver = puvodni.io;
    globalThis.innerHeight = puvodni.h;
    globalThis.setTimeout = puvodni.st;
    globalThis.clearTimeout = puvodni.ct;
  }
});
