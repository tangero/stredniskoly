// #571: hledání v hlavičce po Enteru přejde na /skoly?search=<dotaz>; stránka musí dotaz převzít.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dotazZAdresy } from '../src/lib/hledani-z-adresy.ts';

test('dotaz z adresy /skoly?search=… se převezme', () => {
  assert.equal(dotazZAdresy('?search=Gymnazium%20kladni'), 'Gymnazium kladni');
  assert.equal(dotazZAdresy('?search=Gymn%C3%A1zium+Kladno'), 'Gymnázium Kladno');
  assert.equal(dotazZAdresy('?kraj=CZ010&search=%20porg%20'), 'porg');
});

test('bez parametru search zůstane hledání prázdné', () => {
  assert.equal(dotazZAdresy(''), '');
  assert.equal(dotazZAdresy('?kraj=CZ010'), '');
  assert.equal(dotazZAdresy('?search='), '');
});

test('hledání na stránce /skoly čte dotaz z adresy, kam vede hledání v hlavičce', () => {
  const hlavicka = fs.readFileSync('src/components/Header.tsx', 'utf8');
  assert.match(hlavicka, /\/skoly\?search=/);
  const hledani = fs.readFileSync('src/components/SchoolSearch.tsx', 'utf8');
  assert.match(hledani, /dotazZAdresy\(window\.location\.search\)/);
});
