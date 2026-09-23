import test from 'node:test';
import assert from 'node:assert/strict';
import { ulozPolozku, ulozRozbor, zmenaProtiUlozene, zapisDavku } from '../scripts/skolni-novinky-zapis.mjs';

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

test('rozbor se uloží i u položky beze změny', async () => {
  // Sklízeč se modelu ptá dřív, než se tady zjistí, že se článek nezměnil,
  // takže odpověď je už zaplacená. Kdyby se zahodila, platilo by se za ni
  // každý běh znovu a věta u položky se stálým textem by se nikdy neobnovila.
  const dotazy = [];
  const klient = {
    query: async (sql, args) => {
      dotazy.push({ sql, args });
      return { rows: /select id, otisk_obsahu/.test(sql)
        ? [{ id: 'n1', otisk_obsahu: 'abc', verze_pravidel: 'v1' }] : [] };
    },
  };
  const vysledek = await ulozPolozku(klient, '600001111', {
    identita: 'i1', otisk_obsahu: 'abc', verze_pravidel: 'v1',
    rozbor: { zdroj_textu: 'perex', otisk_textu: 'aa', souhrn: 'Škola pořádá den otevřených dveří 5. 1. 2027.',
              terminy: [{ datum: '2027-01-05', cas: null, akce: 'dod' }], akce: 'dod',
              lhuty: [], model: 'typesafe/jev-1.13', odpovedi: {}, verze_pravidel: 'v1' },
  });
  assert.equal(vysledek.zmena, 'beze_zmeny');
  // Řádek novinky se nepřepisuje, nová verze nevzniká — jen rozbor.
  assert.equal(dotazy.filter((d) => /^\s*update skola_novinka set/.test(d.sql)).length, 0);
  assert.equal(dotazy.filter((d) => /insert into skola_novinka_verze/.test(d.sql)).length, 0);
  assert.equal(dotazy.filter((d) => /insert into skola_novinka_rozbor/.test(d.sql)).length, 1);
});

test('položka beze změny a bez rozboru nesahá do databáze podruhé', async () => {
  const dotazy = [];
  const klient = {
    query: async (sql, args) => {
      dotazy.push({ sql, args });
      return { rows: /select id, otisk_obsahu/.test(sql)
        ? [{ id: 'n1', otisk_obsahu: 'abc', verze_pravidel: 'v1' }] : [] };
    },
  };
  await ulozPolozku(klient, '600001111',
    { identita: 'i1', otisk_obsahu: 'abc', verze_pravidel: 'v1' });
  assert.equal(dotazy.length, 1);
});

test('sklízeč skryje podezřelý článek i při nezměněném obsahu a respektuje ruční zásah', async () => {
  const dotazy = [];
  const id = '5ace3051-58c9-4bc6-ad8e-a46e791e4647';
  const klient = { query: async (sql, args) => {
    dotazy.push({ sql, args });
    if (/select id, otisk_obsahu/.test(sql)) return { rows: [{ id, otisk_obsahu: 'abc', verze_pravidel: 'v1' }] };
    if (/select chyby_v_rade/.test(sql)) return { rows: [{ chyby_v_rade: 0 }] };
    return { rows: [] };
  } };
  await zapisDavku(klient, {
    meta: { zahajeno: '2026-09-23T10:00:00Z', zdroju_zkouseno: 1, verze_pravidel: 'v1' },
    zdroje: [{ redizo: '600004724', stav: 'ok', feed_url: 'https://www.gybot.cz/feed',
      polozky: [{ identita: 'spam1', otisk_obsahu: 'abc', verze_pravidel: 'v1',
        titulek: 'Retrobet Casino Deutschland',
        url: 'https://www.gybot.cz/nezarazene/retrobet-casino-deutschland/' }] }],
  });
  const skryti = dotazy.find((d) => /insert into skola_prepinac/.test(d.sql));
  assert.equal(skryti.args[0], `polozka:${id}`);
  assert.match(skryti.sql, /where skola_prepinac\.zdroj_zmeny = 'auto:spam-kasino'/);
});
