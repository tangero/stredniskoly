import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { nactiPravidla, parsujOdpoved, vyhodnot, souhrn } from '../scripts/pravidla/vyhodnot.mjs';

const situace = [
  { id: 'S01', situace: 'a', otazka: 'a?', ocekavano: 'ano' },
  { id: 'S02', situace: 'b', otazka: 'b?', ocekavano: 'ne' },
];

test('parsujOdpoved vezme JSON i s textem okolo a odmítne neplatné', () => {
  assert.deepEqual(parsujOdpoved('Hotovo: {"odpoved":"Ano","akce":"x"}'), { odpoved: 'ano', akce: 'x' });
  assert.equal(parsujOdpoved('{"odpoved":"možná"}'), null);
  assert.equal(parsujOdpoved('bez jsonu'), null);
});

test('vyhodnot: napodobený model počítá skóre, nestálost a neshody', async () => {
  let n = 0;
  const model = async (v) => {
    if (v.includes('Otázka: a?')) return '{"odpoved":"ano","akce":"ok"}';
    n += 1; // S02: ne, ano, ano => většina špatně, nestálá
    return JSON.stringify({ odpoved: n === 1 ? 'ne' : 'ano', akce: 'y' });
  };
  const v = await vyhodnot({ situace, pravidla: 'PRAVIDLA', model, opakovani: 3 });
  assert.deepEqual(v.ano, { pocet: 1, ok: 1 });
  assert.deepEqual(v.ne, { pocet: 1, ok: 0 });
  assert.deepEqual(v.neshody, ['S02']);
  assert.deepEqual(v.nestalych, ['S02']);
  assert.match(souhrn(v, 'main'), /očekávané „ano“ 1\/1.*neshody S02/);
});

test('model, který odpoví pořád stejně, neprojde ani na jedné polovině', async () => {
  const v = await vyhodnot({ situace, pravidla: '', model: async () => '{"odpoved":"ano"}', opakovani: 3 });
  assert.equal(v.ano.ok, 1);
  assert.equal(v.ne.ok, 0);
});

test('chyba modelu se počítá zvlášť a znehodnotí měření', async () => {
  const v = await vyhodnot({ situace, pravidla: '', model: async () => { throw new Error('x'); }, opakovani: 3 });
  assert.equal(v.chyby.pocet, 6);
  assert.deepEqual(v.chyby.situace, ['S01', 'S02']);
  assert.equal(v.platne, false);
  assert.deepEqual(v.nestalych, []);
  assert.match(souhrn(v, 'main'), /NEPLATNÉ MĚŘENÍ: 6.*S01, S02/);
});

test('jednou selhavší model: chyba je započtena, nestálost ne, měření je neplatné', async () => {
  let n = 0;
  const model = async () => { n += 1; if (n === 2) throw new Error('limit'); return '{"odpoved":"ano"}'; };
  const v = await vyhodnot({ situace: [situace[0]], pravidla: '', model, opakovani: 3 });
  assert.deepEqual(v.chyby, { pocet: 1, situace: ['S01'] });
  assert.equal(v.platne, false);
  assert.equal(v.vysledky[0].spravne, 2);
  assert.equal(v.nestalych.length, 0);
});

test('bezchybné měření je platné', async () => {
  const v = await vyhodnot({ situace, pravidla: '', model: async () => '{"odpoved":"ano"}', opakovani: 1 });
  assert.equal(v.platne, true);
  assert.equal(v.chyby.pocet, 0);
});

test('nactiPravidla čte CLAUDE.md, .claude/claude.md a skilly repozitáře', () => {
  const p = nactiPravidla('.');
  assert.match(p, /===== CLAUDE\.md =====/);
  assert.match(p, /===== \.claude\/claude\.md =====/);
  assert.match(p, /skills\/rizeni-brana\/SKILL\.md/);
  assert.ok(fs.existsSync('tests/pravidla/kontrolni-situace.json'));
});
