import test from 'node:test';
import assert from 'node:assert/strict';
const base = process.env.BASE_URL || 'http://localhost:3227';
const slug = '600007774-gymnazium-j-s-machara-kralovicka-technicke-lyceum';
const visible = html => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<!--.*?-->/gs,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
for (const route of [`/skola/${slug}`, `/skola/${slug}/detail`, `/skola/${slug}/pro-me`, '/skola/600007774-gymnazium-j-s-machara-kralovicka', '/skoly', '/vysledky/2026', '/regiony/stredocesky', '/regiony']) {
  test(`P0 veřejný text a metadata: ${route}`, async () => {
    const res = await fetch(base+route); assert.equal(res.status,200);
    const html = await res.text(); const text = visible(html);
    assert.doesNotMatch(text, /Min\. skóre pro přijetí \(2025\):|Šance přijetí podle priority|Splňujete bodové požadavky|rodiče reagují|Nejobtížnější obory|Náročnost přijímaček|Prům\. min\. body/);
    assert.doesNotMatch(html, /name="description" content="[^"]*Min\. body/);
    if (route.endsWith('/detail') || route===`/skola/${slug}`) assert.match(text,/36,1 \/ 50 bodů/);
  });
}
test('JSON a Markdown nemají numerickou hranici přijetí', async () => {
  const res = await fetch(`${base}/api/skola/${slug}/json`); assert.equal(res.status,200);
  const json = await res.json(); assert.ok(json.obory.length > 0);
  for (const row of json.obory) assert.equal(row.min_body,null);
  const md = await fetch(`${base}/api/skola/${slug}/md`); assert.equal(md.status,200);
  assert.doesNotMatch(await md.text(), /Minimální body pro přijetí:\*\* \d|Obtížnost přijetí/);
});
test('starý průvodce šancemi směruje do udržovaného simulátoru a zachová výběr', async () => {
  const params = new URLSearchParams({skoly: JSON.stringify(['600007774_78-42-M/01'])});
  const res = await fetch(`${base}/moje-sance?${params}`,{redirect:'manual'});
  assert.ok([307,308].includes(res.status)); assert.equal(res.headers.get('location'),`/simulator?${params}`);
});

test('výpis dojezdu nevrací minimum ani neověřenou obtížnost, průměr má škálu 0–100', async () => {
  const stops = await (await fetch(`${base}/api/dostupnost/stop-suggest?q=And%C4%9Blsk%C3%A1%20Hora%2C%20chaty`)).json();
  assert.ok(stops.suggestions.length);
  const response = await fetch(`${base}/api/dostupnost`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({stopId:stops.suggestions[0].stopId,maxMinutes:60})});
  assert.equal(response.status,200);
  const result = await response.json(); assert.ok(result.reachableSchools.length);
  for(const school of result.reachableSchools) {
    assert.equal(school.minBodyMin,null); assert.equal(school.difficultyScore,null); assert.equal(school.admissionBand,'unknown');
    for(const program of school.programs) { assert.equal(program.jpzMin,null); assert.ok(program.jpzPrumer === null || program.jpzPrumer >= 0 && program.jpzPrumer <= 100); }
  }
});

test('čtyřleté a osmileté gymnázium zůstanou oddělené, termíny jsou archivní', async () => {
  for(const length of [4,8]) {
    const res = await fetch(`${base}/skola/600001431-biskupske-gymnazium-konevova-gymnazium-${length}lete`);
    assert.equal(res.status,200); const html = await res.text();

    assert.doesNotMatch(visible(html),/Min\. skóre pro přijetí \(2025\):|Šance přijetí podle priority/);
  }
});
test('přehled školy označí staré termíny jako archivní', async () => {
  const res = await fetch(`${base}/skola/600001431-biskupske-gymnazium-konevova`);
  assert.equal(res.status,200); const html=await res.text();
  assert.match(visible(html),/Pro rok 2027 neověřeno/);
  assert.match(html,/Starší údaj z InspIS/);
});
test('známý zadržený výsledek MESIT není mezi publikovanými výsledky', async () => {
  const res = await fetch(`${base}/vysledky/2026`); assert.equal(res.status,200);
  const html = await res.text();
  assert.ok(html.includes('600007774_78-42-M/01'));
  assert.ok(!html.includes('600015611_64-41-L/51'));
});
