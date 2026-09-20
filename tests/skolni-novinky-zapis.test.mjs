import test from 'node:test';
import assert from 'node:assert/strict';
import { zmenaProtiUlozene } from '../scripts/skolni-novinky-zapis.mjs';

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
