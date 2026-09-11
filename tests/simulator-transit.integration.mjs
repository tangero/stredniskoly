import test from 'node:test';
import assert from 'node:assert/strict';
const base = process.env.BASE_URL;
if (!base) throw new Error('Nastav BASE_URL.');
async function post(body) { const r = await fetch(`${base}/api/dostupnost`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); assert.equal(r.status,200); return r.json(); }
test('dopravní kontrakt vrací jen dopravu a skutečné položky nad limitem', async () => {
 const stops = await (await fetch(`${base}/api/dostupnost/stop-suggest?q=And%C4%9Blsk%C3%A1%20Hora%2C%20chaty`)).json();
 assert.ok(stops.suggestions.length);
 const result = await post({stopId:stops.suggestions[0].stopId,maxMinutes:30,view:'simulator'});
 assert.deepEqual(Object.keys(result).sort(),['estimates','mappedProgramIds','originName','model','searchedMinutes'].sort());
 assert.equal(result.searchedMinutes,40);
 assert.ok(result.estimates.some(e=>e.minutes>30&&e.minutes<=40));
 for(const e of result.estimates){ assert.ok(e.minutes>=0&&e.minutes<=40);assert.deepEqual(Object.keys(e).sort(),['programIds','minutes','walkMinutes','transfers','lines','stopName'].sort());assert.ok(e.programIds.every(id=>result.mappedProgramIds.includes(id))); }
 const extended = await post({stopId:stops.suggestions[0].stopId,maxMinutes:40,view:'simulator'});
 for(const e of result.estimates) assert.ok(extended.estimates.some(x=>x.programIds.join()===e.programIds.join()&&x.minutes===e.minutes));
});
test('úplný aktuálně dostupný katalog poskytuje skutečné názvy oborů bez změny běžného stránkování', async()=>{
 const all = await(await fetch(`${base}/api/schools/search?simulatorCatalog=1`)).json();
 const page = await(await fetch(`${base}/api/schools/search?limit=20`)).json();
 assert.equal(all.schools.length,all.total);assert.ok(all.total>100);assert.equal(page.schools.length,20);assert.equal(page.total,all.total);
 assert.ok(all.schools.every(s=>typeof s.obor==='string' && !('jpzMin' in s)));
});
