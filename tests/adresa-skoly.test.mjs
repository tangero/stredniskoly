import test from 'node:test';
import assert from 'node:assert/strict';
import { doplnOrientacniCislo } from '../src/lib/adresa-skoly.ts';

test('doplní orientační číslo z rejstříku, obec a PSČ zůstanou z katalogu', () => {
  assert.equal(
    doplnOrientacniCislo('Vejprnická 663, Plzeň, 31800', 'Vejprnická 663/56, 318 00 Plzeň – Skvrňany'),
    'Vejprnická 663/56, Plzeň, 31800',
  );
});

test('orientační číslo s písmenem', () => {
  assert.equal(doplnOrientacniCislo('Nádražní 22, Brno, 60200', 'Nádražní 22/9a, 602 00 Brno'), 'Nádražní 22/9a, Brno, 60200');
});

test('adresa beze změny, když rejstřík orientační číslo nemá nebo se číslo popisné liší', () => {
  assert.equal(doplnOrientacniCislo('Sokolovská 150, Rybitví, 53354', 'Sokolovská 150, 533 54 Rybitví'), 'Sokolovská 150, Rybitví, 53354');
  assert.equal(doplnOrientacniCislo('Sokolovská 15, Rybitví, 53354', 'Sokolovská 150/2, 533 54 Rybitví'), 'Sokolovská 15, Rybitví, 53354');
  assert.equal(doplnOrientacniCislo('Mírová 4, Praha, 11000', 'Jiná 4/1, 110 00 Praha'), 'Mírová 4, Praha, 11000');
});

test('škola bez záznamu v rejstříku', () => {
  assert.equal(doplnOrientacniCislo('Mírová 4, Praha, 11000', undefined), 'Mírová 4, Praha, 11000');
  assert.equal(doplnOrientacniCislo('Mírová 4, Praha, 11000', null), 'Mírová 4, Praha, 11000');
});
