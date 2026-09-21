import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { zavadec } from './_zavadec.mjs';

// PortalKodForm je jediné místo, které překládá odpověď /api/portal/kod na to,
// co škola uvidí. Testy dosud mířily na komponenty pod ním, takže tahle vrstva
// zůstávala nepokrytá — a přitom se v ní rozhoduje, jestli se škole nabídne
// spotřebování jednorázového kódu.

/**
 * Náhrada `useState` pro statický render: první `useState('')` je pole s kódem,
 * druhý `useState(false)` příznak ověřování, třetí `useState(null)` výsledek.
 * Podstrčením výsledku se dá vykreslit stav, na který by se jinak dalo dostat
 * jen skutečným síťovým voláním. Pravý hook se nevolá — podmíněné volání hooku
 * by porušilo pravidla hooků a neprošlo lintem.
 */
const sVysledkem = (vysledek) => {
  let poradi = 0;
  return {
    ...React,
    useState: (init) => {
      poradi += 1;
      return [poradi === 3 ? vysledek : init, () => {}];
    },
  };
};

const vykresli = (vysledek) => {
  const { PortalKodForm } = zavadec(sVysledkem(vysledek))('src/components/portal/PortalKodForm.tsx');
  return renderToStaticMarkup(React.createElement(PortalKodForm));
};

const SKOLA = {
  redizo: '600006247',
  nazev: 'Gymnázium, Praha 9, Litoměřická 726',
  ico: '61387061',
  adresa: 'Litoměřická 726/17, 190 00 Praha 9 – Prosek',
  profil: '/skola/600006247-gymnazium',
};

test('volný kód otevře založení správce i s identifikací školy', () => {
  const html = vykresli({ stav: 'volny', nazev: 'Gymnázium', kod: 'ABCD-EFGH-JKMN', skola: SKOLA });
  assert.match(html, /Staňte se správcem profilu/);
  assert.match(html, /Gymnázium, Praha 9, Litoměřická 726/, 'formulář nedostal identifikaci');
  assert.match(html, /600006247/, 'chybí REDIZO');
});

test('škola bez profilu ujistí, že kód nepropadl', () => {
  // Nejdůležitější věta téhle obrazovky: kód je jednorázový a škola dostane
  // jediný, takže musí vědět, že o něj nepřišla.
  const html = vykresli({ stav: 'skola_nenalezena', nazev: '' });
  assert.match(html, /kód zůstává platný/);
  assert.doesNotMatch(html, /Staňte se správcem profilu/, 'nabídlo se založení, kód mohl shořet');
});

test('spotřebovaný kód a škola se správcem mají každý svou hlášku', () => {
  const uplatnen = vykresli({ stav: 'uplatnen', nazev: 'Gymnázium' });
  assert.match(uplatnen, /Tento kód už byl použit/);
  assert.match(uplatnen, /<strong>Gymnázium: <\/strong>/, 'chybí název školy před hláškou');

  const maSpravce = vykresli({ stav: 'skola_ma_spravce', nazev: 'Gymnázium' });
  assert.match(maSpravce, /Profil této školy už má správce/);
});

test('bez názvu školy nezbyde holá dvojtečka', () => {
  const html = vykresli({ stav: 'uplatnen', nazev: '' });
  assert.doesNotMatch(html, /<strong>:/, 'holá dvojtečka bez názvu');
  assert.match(html, /Tento kód už byl použit/);
});

test('neplatný kód nabídne opravu překlepu, ne kontakt na podporu', () => {
  const html = vykresli({ stav: 'neplatny' });
  assert.match(html, /Tento kód neznáme/);
  assert.doesNotMatch(html, /Staňte se správcem profilu/);
});

test('neznámý stav nevykreslí prázdnou obrazovku', () => {
  // Odpověď, kterou se nepodařilo přečíst (prázdné tělo z edge, useknutý proud),
  // dřív uložila stav, na který nesedí žádná větev — formulář se vrátil do klidu
  // a neobjevilo se vůbec nic. Renderu musí zbýt aspoň samotný formulář.
  const html = vykresli({});
  assert.match(html, /Použít kód/, 'zmizel i formulář');
  assert.doesNotMatch(html, /Staňte se správcem profilu/);
});
