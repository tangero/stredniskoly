import fs from 'node:fs';
import crypto from 'node:crypto';
import { uniqueSchoolIndex, normalizeSchoolKey } from '../../../src/lib/school-key.ts';
const base = 'docs/podklady/migrace-katalogu-2027';
const sourcePaths = ['public/schools_data.json','public/applications_2026.json'];
const [history, current] = sourcePaths.map(p=>JSON.parse(fs.readFileSync(p,'utf8')));
const unique = uniqueSchoolIndex(history['2025'], row=>row.id);
const all = new Set(history['2025'].map(row=>normalizeSchoolKey(row.id)));
const pending = current.data.filter(row=>!unique.has(normalizeSchoolKey(row.id))).map(row=>({
  id_2026:row.id, redizo:row.redizo, kkov:row.kkov, zamereni:row.zamereni, typ:row.typ,
  nazev:row.nazev, obec:row.obec,
  stav:all.has(normalizeSchoolKey(row.id))?'kolize_katalogu':'chybi_presna_shoda',
  id_2025_potvrzene:'', overil:'', zdroj_overeni:'', poznamka:'',
})).sort((a,b)=>a.id_2026.localeCompare(b.id_2026));
const groups = new Map();
for(const row of pending) { const key=`${row.typ}:${row.stav}`; groups.set(key,[...(groups.get(key)??[]),row]); }
const sample=[];
while(sample.length<100) {
  let changed=false;
  for(const rows of groups.values()) if(rows.length && sample.length<100){sample.push(rows.shift()); changed=true;}
  if(!changed)break;
}
const csv=rows=>[Object.keys(rows[0]),...rows.map(Object.values)].map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n')+'\n';
fs.writeFileSync(`${base}/nesparovane.csv`,csv(pending));
fs.writeFileSync(`${base}/vzorek-100.csv`,csv(sample));
fs.writeFileSync(`${base}/souhrn.json`,JSON.stringify({
  sourceHashes:Object.fromEntries(sourcePaths.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')])),
  offers2026:current.data.length, pending:pending.length, absent:pending.filter(r=>r.stav==='chybi_presna_shoda').length,
  ambiguous:pending.filter(r=>r.stav==='kolize_katalogu').length, sample:sample.length,
  reviewed:0, scope:'Import povinné JPZ; bez konzervatoří. Chybějící shoda neznamená nový ani uzavřený obor.',
},null,2)+'\n');
console.log({pending:pending.length,sample:sample.length,reviewed:0});
