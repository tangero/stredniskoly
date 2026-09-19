import test from 'node:test';
import assert from 'node:assert/strict';
import { pocetZvazovanych, zvazovaneObory, KLIC_VYBERU } from '../src/lib/vyber-zvazovanych.ts';

test('počet zvažovaných oborů pro horní lištu', () => {
  // null znamená „výběr ještě neznáme“: na serveru se lišta vykreslí bez závorky a hydratace sedí.
  assert.equal(pocetZvazovanych(null), null);
  assert.equal(pocetZvazovanych(''), 0);
  assert.equal(pocetZvazovanych('[]'), 0);
  assert.equal(pocetZvazovanych(JSON.stringify(['600171701_79-41-K/81', '600171701_79-41-K/41'])), 2);
  // Počítají se obory, ne školy: dvě nabídky téže školy jsou dvě položky.
  assert.equal(pocetZvazovanych(JSON.stringify(['600000001_79-41-K/41', '600000001_79-41-K/81'])), 2);
});

test('výběr snese poškozené úložiště i duplicity', () => {
  // Rozbité pole se zahodí celé; hodnota bez hranaté závorky se čte jako seznam oddělený čárkou,
  // protože tak vypadá starší podoba výběru ve sdíleném odkazu simulátoru.
  assert.deepEqual(zvazovaneObory('[nedopsane'), []);
  assert.equal(pocetZvazovanych('a,b,a'), 2);
  assert.deepEqual(zvazovaneObory(JSON.stringify([' a ', 'a', '', 'b'])), ['a', 'b']);
});

test('klíč úložiště je stejný jako v simulátoru', () => {
  // Jeden výběr na celém webu stojí na společném klíči; změna by rozdělila výběr na dva.
  assert.equal(KLIC_VYBERU, 'prijimacky-vyber-2027');
});
