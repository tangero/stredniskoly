import test from 'node:test';
import assert from 'node:assert/strict';
import { ulozRozbor, zmenaProtiUlozene } from '../scripts/skolni-novinky-zapis.mjs';

const ulozena = { otisk_obsahu: 'abc', verze_pravidel: '2026-09-20.5' };

test('stejný obsah i stejná pravidla se nepřepisují', () => {
  assert.equal(
    zmenaProtiUlozene(ulozena, { otisk_obsahu: 'abc', verze_pravidel: '2026-09-20.5' }),
    'beze_zmeny',
  );
});

test('jiný obsah je změna položky', () => {
  assert.equal(
    zmenaProtiUlozene(ulozena, { otisk_obsahu: 'xyz', verze_pravidel: '2026-09-20.5' }),
    'zmenena',
  );
});

test('změna verze pravidel přepočítá položku i beze změny obsahu', () => {
  // Bez tohohle by oprava klasifikace čekala na to, až článek přepíše škola.
  // Feed je klouzavé okno, takže u většiny položek by nepřišla nikdy:
  // článek s chybně odvozeným datem by z něj vypadl dřív, než se opraví.
  assert.equal(
    zmenaProtiUlozene(ulozena, { otisk_obsahu: 'abc', verze_pravidel: '2026-09-20.6' }),
    'prepocitana',
  );
});

test('změna obsahu má přednost před změnou pravidel', () => {
  // Obojí najednou je pořád změna obsahu: v přehledu běhu se přepočty
  // počítají zvlášť, aby nevypadaly jako opravy vydané školami.
  assert.equal(
    zmenaProtiUlozene(ulozena, { otisk_obsahu: 'xyz', verze_pravidel: '2026-09-20.6' }),
    'zmenena',
  );
});

/** Zachytává dotazy místo databáze; test se ptá, co se poslalo, ne co se uložilo. */
function odposlech() {
  const dotazy = [];
  return { dotazy, query: async (sql, args) => { dotazy.push({ sql, args }); return { rows: [] }; } };
}

test('chybějící rozbor nemaže ten uložený', async () => {
  // Položka bez rozboru znamená jedno ze dvou: nebyla to pozvánka na akci,
  // nebo se model neozval. Výpadek cizí služby není zjištění, že termín
  // neplatí, a smazaná věta by se do další změny článku nevrátila.
  const k = odposlech();
  await ulozRozbor(k, 'n1', { titulek: 'Den otevřených dveří' });
  assert.equal(k.dotazy.length, 0);
});

test('rozbor bez věty přepíše starou větu, místo aby ji nechal viset', async () => {
  // Model odpověděl a věta nevyšla (akce proběhla, data v textu nejsou).
  // To je zjištění, ne výpadek, a stará věta po něm platit nesmí.
  const k = odposlech();
  await ulozRozbor(k, 'n1', {
    rozbor: { zdroj_textu: 'perex', otisk_textu: 'aa', souhrn: null, terminy: [],
              lhuty: [], model: 'typesafe/jev-1.13', odpovedi: {}, verze_pravidel: 'v1' },
  });
  assert.equal(k.dotazy.length, 1);
  assert.match(k.dotazy[0].sql, /on conflict \(novinka_id\) do update/);
  assert.match(k.dotazy[0].sql, /souhrn = excluded\.souhrn/);
  assert.equal(k.dotazy[0].args[6], null);
});
