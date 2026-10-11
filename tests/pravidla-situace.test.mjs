import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Kontrolní situace pro pravidla AI (#468): tvar souboru, vyváženost odpovědí a bez osobních údajů.
const { situace, verze } = JSON.parse(fs.readFileSync('tests/pravidla/kontrolni-situace.json', 'utf8'));
const POLE = ['id', 'oblast', 'situace', 'otazka', 'ocekavano', 'akce', 'pravidlo', 'puvod'];
const OBLASTI = new Set(['vyber-prace', 'pr', 'data-a-bezpecnost']);

test('každá situace má všechna pole, jednoznačné id a odpověď ano/ne', () => {
  assert.equal(verze, 1);
  assert.ok(situace.length >= 20 && situace.length <= 40, `počet situací ${situace.length}`);
  const id = new Set();
  for (const s of situace) {
    for (const p of POLE) assert.ok(typeof s[p] === 'string' && s[p].trim(), `${s.id}: chybí ${p}`);
    assert.match(s.id, /^S\d{2}$/);
    assert.ok(!id.has(s.id), `duplicitní ${s.id}`);
    id.add(s.id);
    assert.ok(['ano', 'ne'].includes(s.ocekavano), `${s.id}: ${s.ocekavano}`);
    assert.ok(OBLASTI.has(s.oblast), `${s.id}: oblast ${s.oblast}`);
    assert.match(s.otazka, /\?$/, `${s.id}: otázka nekončí otazníkem`);
  }
});

test('odpovědi jsou vyvážené: model, který odpoví pořád stejně, neprojde', () => {
  const ano = situace.filter((s) => s.ocekavano === 'ano').length;
  assert.ok(ano / situace.length >= 0.3 && ano / situace.length <= 0.7, `podíl ano ${ano}/${situace.length}`);
});

test('situace neobsahují osobní údaje (e-maily kromě example.cz, telefony)', () => {
  for (const s of situace) {
    const text = POLE.map((p) => s[p]).join(' ');
    for (const e of text.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || []) assert.match(e, /@example\.cz$/, `${s.id}: ${e}`);
    assert.doesNotMatch(text, /(\+420)?\s?\d{3}\s?\d{3}\s?\d{3}\b/, `${s.id}: telefon`);
  }
});
