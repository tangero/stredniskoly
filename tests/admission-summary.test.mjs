import test from 'node:test';
import assert from 'node:assert/strict';
import { applicationsPerPlace } from '../src/lib/admission-summary.ts';
test('historická poptávka rozlišuje nulové přihlášky, chybějící údaj a nulovou kapacitu',()=>{
 assert.equal(applicationsPerPlace(139,25),5.56);
 assert.equal(applicationsPerPlace(0,25),0);
 for(const [a,c] of [[null,25],[139,null],[139,0],[-1,25],[139,-1],[Infinity,25],[1,NaN]]) assert.equal(applicationsPerPlace(a,c),null);
});

test('souhrn kapacity rozlišuje nulu, neznámý údaj a nesouhlasící rozpad', async () => {
  const { capacitySummary } = await import('../src/lib/admission-summary.ts');
  assert.match(capacitySummary({ outcomes_complete: true, capacity_rejected: 0 }), /nikdo/);
  assert.match(capacitySummary({ outcomes_complete: true, capacity_rejected: 12 }), /12/);
  assert.equal(capacitySummary({ outcomes_complete: false, capacity_rejected: 0 }), null);
  assert.equal(capacitySummary(null), null);
});

test('žebříček řadí ověřené průměry sestupně a nesahá po zadrženém skóru', async () => {
  const { rankAdmissionOffers, rankingPages } = await import('../src/lib/admission-summary.ts');
  const offers = [{ id: 'a', history: { average: 60 } }, { id: 'b', history: { average: 90 } },
    { id: 'c', admission_context: { average_accepted: null }, history: { average: 99 } },
    { id: 'd', history: null }, { id: 'e', history: { average: 90 } }];
  assert.deepEqual(rankAdmissionOffers(offers).map(s => s.id), ['b', 'e', 'a']);
  assert.deepEqual(offers.map(s => s.id), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(rankingPages(1, 10), [1, 2, 3, 4, '…', 10]);
  assert.deepEqual(rankingPages(5, 10), [1, '…', 4, 5, 6, '…', 10]);
  assert.deepEqual(rankingPages(10, 10), [1, '…', 7, 8, 9, 10]);
});
