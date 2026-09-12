import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MAX_SELECTION, MAX_SHARE_URL_LENGTH,
  readSelection, selectionForShare, shareUrlFor,
} from '../src/lib/simulator-state.ts';

const ORIGIN = 'https://www.prijimackynaskolu.cz';
const realIds = Object.keys(JSON.parse(readFileSync(new URL('../public/cermat_results_2026.json', import.meta.url), 'utf8')));

test('uložený výběr unese desítky kandidátů, jak vyžaduje Můj výběr', () => {
  // PRD: na ukládání nepřenášet zákonný limit přihlášek, dítě může mít desítky kandidátů.
  assert.ok(MAX_SELECTION >= 100, `strop ${MAX_SELECTION} neunese desítky kandidátů`);
  const many = realIds.slice(0, 120);
  assert.equal(readSelection(JSON.stringify(many)).length, 120);
});

test('sdílený odkaz se vejde do délky adresy i pro rozsáhlý výběr', () => {
  for (const count of [0, 1, 30, 120, realIds.length]) {
    const ids = realIds.slice(0, count);
    const shared = selectionForShare(ids, ORIGIN);
    assert.ok(shareUrlFor(shared, ORIGIN).length <= MAX_SHARE_URL_LENGTH,
      `odkaz pro ${count} oborů přesáhl limit`);
    assert.ok(shared.length <= ids.length);
  }
});

test('krátký výběr se do odkazu vejde celý a zachová pořadí', () => {
  const ids = realIds.slice(0, 25);
  assert.deepEqual(selectionForShare(ids, ORIGIN), ids);
});

test('při zkrácení zůstane odkaz co nejdelší: o jeden obor víc už se nevejde', () => {
  const ids = realIds.slice(0, 200);
  const shared = selectionForShare(ids, ORIGIN);
  assert.ok(shared.length < ids.length, 'test potřebuje výběr, který se nevejde');
  assert.ok(shareUrlFor(ids.slice(0, shared.length + 1), ORIGIN).length > MAX_SHARE_URL_LENGTH);
});

test('dlouhá ID zkrátí odkaz dřív; rozhoduje délka adresy, ne počet oborů', () => {
  const longest = realIds.slice().sort((a, b) => b.length - a.length).slice(0, 60);
  const shortest = realIds.slice().sort((a, b) => a.length - b.length).slice(0, 60);
  assert.ok(selectionForShare(longest, ORIGIN).length < selectionForShare(shortest, ORIGIN).length);
});

test('odkaz otevře uložený výběr a přečte se beze ztráty oborů', () => {
  const ids = realIds.slice(0, 30);
  const url = new URL(shareUrlFor(ids, ORIGIN));
  assert.equal(url.searchParams.get('vyber'), '1');
  assert.deepEqual(readSelection(url.searchParams.get('skoly')), ids);
});
