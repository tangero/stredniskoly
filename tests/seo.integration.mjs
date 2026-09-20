import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
const base = process.env.BASE_URL ?? 'http://localhost:3237';
const origin = 'https://www.prijimackynaskolu.cz';
// Node fetch může Host přepsat podle URL; raw HTTP ověřuje skutečný host routing.
function requestHost(path, host) {
  return new Promise((resolve, reject) => {
    const url = new URL(base + path);
    (url.protocol === 'https:' ? https : http).get(url, { headers: { host } }, r => {
      r.resume();
      r.on('end', () => resolve({ status: r.statusCode, headers: new Headers(r.headers) }));
    }).on('error', reject);
  });
}
function canonicalUrl(html) {
  const tags = [...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*>/g)].map(m => m[0]);
  assert.equal(tags.length, 1);
  return new URL(tags[0].match(/href="([^"]+)"/)[1]).href;
}
const school = '/skola/600008681-stredni-skola-a-zakladni-skola-nerudova';
const program = '/skola/600009793-gymnazium-a-stredni-odborna-skola-skolni-gymnazium-4lete';
const inspection = '/skola/600009793-gymnazium-a-stredni-odborna-skola-skolni/inspekce';

// SEO kontroluje serverové HTML a HTTP odpovědi, včetně streamovaných metadat.
test('každá veřejná šablona má právě jeden vlastní www canonical', async () => {
  for (const path of ['/', '/mesto', '/mesto/praha', '/regiony', '/regiony/hlavni-mesto-praha',
    '/skoly', '/simulator', '/dostupnost', '/jak-vybrat-skolu', '/prijimacky-2027',
    '/vysledky/2026', '/novinky', '/pro-skoly', '/issues', '/changelog', '/ochrana-osobnich-udaju',
    school, program, `${program}/pro-me`, `${school}/inspekce`]) {
    const r = await fetch(base + path, { redirect: 'manual' });
    assert.equal(r.status, 200, path);
    const html = await r.text();
    const tags = [...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*>/g)].map(m => m[0]);
    assert.equal(tags.length, 1, path);
    assert.equal(canonicalUrl(html), new URL(path, origin).href, path);
  }
});

test('parametry filtru nevedou na homepage a nezakládají novou kanonickou stránku', async () => {
  for (const path of ['/regiony/hlavni-mesto-praha?delka=4', '/simulator?skoly=%5B%5D']) {
    const html = await fetch(base + path).then(r => r.text());
    assert.ok(html.includes(`rel="canonical" href="${origin}${path.split('?')[0]}"`));
  }
});

test('oborová inspekce se přesměruje na existující inspekci školy a chybějící vrací 404', async () => {
  const r = await fetch(`${base}${program}/inspekce`, { redirect: 'manual' });
  assert.equal(r.status, 308);
  assert.equal(new URL(r.headers.get('location'), base).pathname, inspection);
  const canonical = await fetch(base + inspection);
  assert.equal(canonical.status, 200);
  assert.ok((await canonical.text()).includes(`rel="canonical" href="${origin}${inspection}"`));
  const missing = await fetch(base + '/skola/600013448-gymnazium-videnska/inspekce');
  assert.equal(missing.status, 404);
});

test('Vercel alias zachová cestu a parametry, preview se neindexuje a produkce zůstane povolená', async () => {
  for (const path of ['/', '/mesto/praha?delka=4', `${school}/inspekce`, '/sitemap.xml']) {
    const r = await requestHost(path, 'stredniskoly.vercel.app');
    assert.equal(r.status, 308, path);
    assert.equal(new URL(r.headers.get('location')).href, new URL(path, origin).href);
  }
  const preview = await requestHost('/prijimacky-2027', 'stredniskoly-test.vercel.app');
  assert.equal(preview.status, 200);
  assert.equal(preview.headers.get('x-robots-tag'), 'noindex');
  const production = await requestHost('/prijimacky-2027', 'www.prijimackynaskolu.cz');
  assert.equal(production.status, 200);
  assert.equal(production.headers.get('x-robots-tag'), null);
});

test('robots zpřístupňuje Next prostředky a odkazuje na kanonickou sitemapu', async () => {
  const r = await fetch(base + '/robots.txt');
  assert.equal(r.status, 200);
  const robots = await r.text();
  assert.ok(!robots.includes('Disallow: /_next'));
  assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
  assert.ok(robots.includes('Disallow: /api/'));
  assert.ok(robots.includes('Allow: /api/skola/'));
});

test('sitemapu server skutečně poskytuje a reprezentativní cesty nevracejí redirect ani 404', async () => {
  const xml = await fetch(base + '/sitemap.xml').then(r => r.text());
  assert.equal(xml, fs.readFileSync('public/sitemap.xml', 'utf8'));
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => new URL(m[1]));
  // Deterministický průřez všemi částmi inventáře, včetně inspekcí.
  for (const i of [0, 12, 20, 35, 100, 500, 1000, 2000, 3000, 4200, 4500, 4800, urls.length - 1]) {
    const r = await fetch(base + urls[i].pathname, { redirect: 'manual' });
    assert.equal(r.status, 200, urls[i].pathname);
    const html = await r.text();
    assert.equal(canonicalUrl(html), urls[i].href, urls[i].pathname);
  }
});
