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
  // Bez typové stráže by se u stavu mimo HLASKY vykreslila prázdná ambrová karta.
  assert.doesNotMatch(html, /bg-amber-50/, 'prázdná ambrová karta u neplatného kódu');
});

test('neznámý stav nevykreslí prázdnou obrazovku ani prázdnou kartu', () => {
  // Odpověď, kterou se nepodařilo přečíst (prázdné tělo z edge, useknutý proud),
  // dřív uložila stav, na který nesedí žádná větev — formulář se vrátil do klidu
  // a neobjevilo se vůbec nic. Renderu musí zbýt aspoň samotný formulář.
  const html = vykresli({});
  assert.match(html, /Použít kód/, 'zmizel i formulář');
  assert.doesNotMatch(html, /Staňte se správcem profilu/);
  assert.doesNotMatch(html, /bg-amber-50/, 'prázdná ambrová karta u neznámého stavu');
});

// ---------------------------------------------------------------------------
// Odeslání formuláře. Render sám o sobě nepokryje to, jak se odpověď API
// překládá do stavu — a právě tam se rozhoduje, jestli škola uvidí aspoň chybu,
// nebo obrazovku, na které se po kliknutí nestalo vůbec nic.
// ---------------------------------------------------------------------------

/**
 * Vrátí `onSubmit` formuláře i seznam stavů, které komponenta nastavila.
 *
 * Stavy se rozlišují podle POŘADÍ volání `useState`. Je to křehké vůči
 * přeházení deklarací v komponentě — ale ne tiše: po přehození padnou všechny
 * testy tohoto souboru naráz, ne jeden nenápadně.
 */
function pripravOdeslani() {
  const nastaveno = [];
  let poradi = 0;
  const react = {
    ...React,
    useState: (init) => {
      poradi += 1;
      const i = poradi;
      // 1 = kód v poli, 2 = ověřuji, 3 = výsledek, 4 = chyba
      return [i === 1 ? 'ABCD-EFGH-JKMN' : init, (v) => nastaveno.push({ i, v })];
    },
  };
  const { PortalKodForm } = zavadec(react)('src/components/portal/PortalKodForm.tsx');
  const strom = PortalKodForm({});
  const najdiForm = (uzel) => {
    if (!uzel || typeof uzel !== 'object') return null;
    if (Array.isArray(uzel)) return uzel.map(najdiForm).find(Boolean) ?? null;
    if (uzel.type === 'form') return uzel;
    return najdiForm(uzel.props?.children);
  };
  const form = najdiForm(strom.props.children);
  assert.ok(form, 'formulář se ve stromu nenašel');
  return { odeslat: form.props.onSubmit, nastaveno };
}

test('nečitelná odpověď skončí hláškou, ne tichou obrazovkou', async () => {
  // HTTP 200 s tělem, které není JSON (mezistránka CDN, useknutý proud) dá `{}`.
  // Bez ošetření by se uložil stav, na který nesedí žádná větev vykreslení.
  const { odeslat, nastaveno } = pripravOdeslani();
  global.fetch = async () => ({ ok: true, json: async () => { throw new Error('není JSON'); } });
  try {
    await odeslat({ preventDefault() {} });
  } finally {
    delete global.fetch;
  }
  const chyby = nastaveno.filter((z) => z.i === 4 && z.v);
  assert.equal(chyby.length, 1, 'chybová hláška se nenastavila');
  assert.match(chyby[0].v, /nepodařilo ověřit/i);
  assert.equal(nastaveno.filter((z) => z.i === 3 && z.v).length, 0, 'uložil se nepoužitelný výsledek');
});

test('výpadek sítě škola pozná', async () => {
  const { odeslat, nastaveno } = pripravOdeslani();
  global.fetch = async () => { throw new Error('ECONNREFUSED'); };
  try {
    await odeslat({ preventDefault() {} });
  } finally {
    delete global.fetch;
  }
  assert.match(nastaveno.find((z) => z.i === 4 && z.v)?.v ?? '', /připojení/i);
});

test('volný kód pošle do formuláře kód i identifikaci školy', async () => {
  // Šťastná cesta, kterou projde všech dvacet ředitelů. Dokud ji nic nehlídalo,
  // prošlo i to, kdyby se větev `volny` nikdy netrefila nebo se kód ztratil.
  const { odeslat, nastaveno } = pripravOdeslani();
  const skola = { ...SKOLA };
  global.fetch = async () => ({ ok: true, json: async () => ({ stav: 'volny', nazev: 'Gymnázium', skola }) });
  try {
    await odeslat({ preventDefault() {} });
  } finally {
    delete global.fetch;
  }
  const vysledek = nastaveno.find((z) => z.i === 3 && z.v)?.v;
  assert.equal(vysledek?.stav, 'volny', 'větev volného kódu se netrefila');
  assert.equal(vysledek.kod, 'ABCD-EFGH-JKMN', 'kód se do formuláře nedostal');
  assert.equal(vysledek.skola?.redizo, SKOLA.redizo, 'identifikace se zahodila');
  assert.equal(nastaveno.filter((z) => z.i === 4 && z.v).length, 0, 'nastavila se chyba');
});

test('chybová odpověď API se škole ukáže', async () => {
  // Přes tuhle větev chodí i hláška o překročeném limitu pokusů. Bez ní by po
  // kliknutí nenastalo vůbec nic.
  const { odeslat, nastaveno } = pripravOdeslani();
  global.fetch = async () => ({ ok: false, json: async () => ({ error: 'Příliš mnoho pokusů.' }) });
  try {
    await odeslat({ preventDefault() {} });
  } finally {
    delete global.fetch;
  }
  assert.equal(nastaveno.find((z) => z.i === 4 && z.v)?.v, 'Příliš mnoho pokusů.');
  assert.equal(nastaveno.filter((z) => z.i === 3 && z.v).length, 0);
});
