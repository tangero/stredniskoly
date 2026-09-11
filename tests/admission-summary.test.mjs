import test from 'node:test';
import assert from 'node:assert/strict';
import { applicationsPerPlace } from '../src/lib/admission-summary.ts';
test('historická poptávka rozlišuje nulové přihlášky, chybějící údaj a nulovou kapacitu',()=>{
 assert.equal(applicationsPerPlace(139,25),5.56);
 assert.equal(applicationsPerPlace(0,25),0);
 for(const [a,c] of [[null,25],[139,null],[139,0],[-1,25],[139,-1],[Infinity,25],[1,NaN]]) assert.equal(applicationsPerPlace(a,c),null);
});
