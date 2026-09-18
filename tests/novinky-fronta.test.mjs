import test from 'node:test';
import assert from 'node:assert/strict';
import {
  predejDavku,
  uzavriDavku,
  zrusPripravenouDavku,
  vyporadejRezervace,
  zapisVysledekPolozky,
  rezervujKvotu,
  smiSeOpakovat,
  jeZpravaPlatna,
} from '../src/lib/novinky-fronta.ts';
import { otiskClenu } from '../src/lib/novinky-rozpocet.ts';

/**
 * Falešné spojení: zaznamená každý dotaz a odpoví podle připravených odpovědí.
 * Testy tím ověřují **kontrakt** přechodů, tedy že jsou podmíněné a že se
 * rezervace vypořádá jen po vítězném přechodu.
 */
function spojeni(odpovedi = []) {
  const dotazy = [];
  let i = 0;
  return {
    dotazy,
    dotaz: async (sql, hodnoty = []) => {
      dotazy.push({ sql: sql.replace(/\s+/g, ' ').trim(), hodnoty });
      const odpoved = odpovedi[i++] ?? { rows: [], rowCount: 0 };
      return odpoved;
    },
  };
}

const DAVKA = {
  id: 'd1',
  zprava: 'novinky/2027/kriteria',
  telo: '{"batch":true}',
  otisk_tela: 'abc',
  clenove_otisk: otiskClenu(['p1', 'p2']),
  pokus: 2,
  idempotency_key: 'novinky/2027/kriteria/abc',
  stav: 'pripravena',
  predano_v: null,
};

const UPROSTRED_MESICE = new Date('2027-01-12T09:00:00Z');

test('předání se neprovede v posledních deseti minutách období', async () => {
  const s = spojeni();
  const v = await predejDavku(s, DAVKA, new Date('2027-01-31T23:55:00Z'));
  assert.equal(v.predano, false);
  assert.match(v.duvod, /konec období/);
  assert.equal(s.dotazy.length, 0, 'nesmí se ani podívat do databáze');
});

test('předání váže podmínku na identifikátor, pokus, stav i složení dávky', async () => {
  const s = spojeni([
    { rows: [], rowCount: 0 }, // rezervace k přenosu: žádná
    { rows: [{ clenove_otisk: DAVKA.clenove_otisk, stav: 'pripravena' }], rowCount: 1 },
    { rows: [{ id: 'p1' }, { id: 'p2' }], rowCount: 2 },
    { rows: [], rowCount: 1 }, // přechod dávky
    { rows: [], rowCount: 2 }, // přechod položek
    { rows: [], rowCount: 1 }, // volani_provedeno
  ]);
  const v = await predejDavku(s, DAVKA, UPROSTRED_MESICE);
  assert.equal(v.predano, true);

  const prechod = s.dotazy.find((d) => d.sql.includes("set stav = 'predavana'"));
  assert.ok(prechod.sql.includes('and pokus = $2'), 'přechod musí vázat pokus');
  assert.ok(prechod.sql.includes("stav = 'pripravena'"), 'přechod musí vázat výchozí stav');
  assert.ok(prechod.sql.includes('clenove_otisk = $3'), 'přechod musí vázat složení');
  assert.deepEqual(prechod.hodnoty, [DAVKA.id, DAVKA.pokus, DAVKA.clenove_otisk]);

  const volani = s.dotazy.find((d) => d.sql.includes('volani_provedeno = true'));
  assert.deepEqual(volani.hodnoty, [DAVKA.id, DAVKA.pokus], 'příznak volání patří pokusu');
});

test('dávku, kterou převzal jiný vítěz, předání jen načte a nic neruší', async () => {
  const s = spojeni([
    { rows: [], rowCount: 0 }, // rezervace k přenosu: žádná
    { rows: [{ clenove_otisk: DAVKA.clenove_otisk, stav: 'predavana' }], rowCount: 1 },
  ]);
  const v = await predejDavku(s, DAVKA, UPROSTRED_MESICE);
  assert.equal(v.predano, false);
  assert.match(v.duvod, /ve stavu predavana/);
  assert.ok(!s.dotazy.some((d) => d.sql.includes("set stav = 'zrusena'")), 'nesmí rušit cizí práci');
  assert.ok(!s.dotazy.some((d) => d.sql.includes('vyporadano = now()')), 'nesmí účtovat');
});

test('změněné složení dosud připravené dávky předání zastaví', async () => {
  const s = spojeni([
    { rows: [], rowCount: 0 }, // rezervace k přenosu: žádná
    { rows: [{ clenove_otisk: DAVKA.clenove_otisk, stav: 'pripravena' }], rowCount: 1 },
    { rows: [{ id: 'p1' }], rowCount: 1 }, // p2 se odhlásil
  ]);
  const v = await predejDavku(s, DAVKA, UPROSTRED_MESICE);
  assert.equal(v.predano, false);
  assert.match(v.duvod, /složení/);
  assert.ok(!s.dotazy.some((d) => d.sql.includes("set stav = 'predavana'")));
});

test('uzavření účtuje jen při vítězném přechodu', async () => {
  const prohra = spojeni([{ rows: [], rowCount: 0 }]);
  assert.equal(await uzavriDavku(prohra, 'd1', 2, 'odeslana'), false);
  assert.equal(prohra.dotazy.length, 1, 'po prohře se nic dalšího nedělá');

  const vyhra = spojeni([
    { rows: [], rowCount: 1 }, // přechod
    { rows: [{ obdobi: 'mesic:2027-01', ucel: 'celkem', pocet: 2, volani_provedeno: true }], rowCount: 1 },
    { rows: [], rowCount: 1 }, // převod na spotřebu
  ]);
  assert.equal(await uzavriDavku(vyhra, 'd1', 2, 'odeslana'), true);
  const prechod = vyhra.dotazy[0];
  assert.ok(prechod.sql.includes('and pokus = $2') && prechod.sql.includes("stav = 'predavana'"));
  assert.ok(vyhra.dotazy.some((d) => d.sql.includes('spotrebovano = spotrebovano + $3')));
});

test('prokazatelná chyba vrátí položky do fronty', async () => {
  const s = spojeni([
    { rows: [], rowCount: 1 }, // přechod na chyba
    { rows: [], rowCount: 2 }, // položky zpět na ceka
    { rows: [], rowCount: 0 }, // rezervace
  ]);
  assert.equal(await uzavriDavku(s, 'd1', 1, 'chyba'), true);
  assert.ok(s.dotazy.some((d) => d.sql.includes("set stav = 'ceka', davka_id = null")));
});

test('vypořádání rezervace uvolní kvótu, když volání neproběhlo', async () => {
  const s = spojeni([
    { rows: [{ obdobi: 'mesic:2027-01', ucel: 'celkem', pocet: 5, volani_provedeno: false }], rowCount: 1 },
    { rows: [], rowCount: 1 },
  ]);
  assert.equal(await vyporadejRezervace(s, 'd1', 1), 1);
  const uvolneni = s.dotazy[1];
  assert.ok(uvolneni.sql.includes('rezervovano = rezervovano - $3'));
  assert.ok(!uvolneni.sql.includes('spotrebovano'), 'neprovedené volání se nesmí zaúčtovat');
});

test('vypořádání je jednorázové: podmínkou je vyporadano is null', async () => {
  const s = spojeni([{ rows: [], rowCount: 0 }]);
  assert.equal(await vyporadejRezervace(s, 'd1', 1), 0);
  assert.ok(s.dotazy[0].sql.includes('vyporadano is null'));
  assert.ok(s.dotazy[0].sql.includes('pokus = $2'), 'vypořádává se konkrétní pokus');
});

test('zrušení nepředané dávky vrátí položky a uvolní rezervaci', async () => {
  const s = spojeni([
    { rows: [], rowCount: 1 }, // přechod na zrusena
    { rows: [], rowCount: 2 }, // položky zpět
    { rows: [], rowCount: 0 }, // rezervace
  ]);
  assert.equal(await zrusPripravenouDavku(s, 'd1', 3), true);
  assert.ok(s.dotazy[0].sql.includes("stav = 'pripravena'"), 'rušit lze jen nepředanou dávku');
  assert.deepEqual(s.dotazy[0].hodnoty, ['d1', 3]);
});

test('zrušení už předané dávky neprojde', async () => {
  const s = spojeni([{ rows: [], rowCount: 0 }]);
  assert.equal(await zrusPripravenouDavku(s, 'd1', 3), false);
  assert.equal(s.dotazy.length, 1);
});

test('výsledek položky se doplní i po uzavření dávky', async () => {
  const pred = spojeni([{ rows: [], rowCount: 1 }]);
  assert.equal(await zapisVysledekPolozky(pred, 'p1', 'em_1'), true);
  assert.ok(pred.dotazy[0].sql.includes("stav = 'predavana'"));

  const po = spojeni([
    { rows: [], rowCount: 0 }, // už není predavana
    { rows: [], rowCount: 1 }, // doplnění stavu doručení
  ]);
  assert.equal(await zapisVysledekPolozky(po, 'p1', 'em_1', 'delivered'), true);
  assert.equal(po.dotazy.length, 2, 'pozdní webhook se nesmí zahodit');
});

test('rezervace kvóty je podmíněná limitem a nezdaří se, když nestačí', async () => {
  const s = spojeni([{ rows: [], rowCount: 0 }]);
  assert.equal(await rezervujKvotu(s, 'd1', 1, 100, 'obsah', UPROSTRED_MESICE), false);
  assert.ok(s.dotazy[0].sql.includes('rezervovano + spotrebovano + $3 <= limit_pocet'));
});

test('potvrzení rezervuje měsíční strop i denní limit', async () => {
  const s = spojeni([
    { rows: [], rowCount: 1 },
    { rows: [], rowCount: 1 },
    { rows: [], rowCount: 1 },
    { rows: [], rowCount: 1 },
  ]);
  assert.equal(await rezervujKvotu(s, 'd1', 1, 1, 'potvrzeni', UPROSTRED_MESICE), true);
  const obdobi = s.dotazy.filter((d) => d.sql.includes('rozpocet_emailu')).map((d) => d.hodnoty[0]);
  assert.deepEqual(obdobi, ['mesic:2027-01', 'den:2027-01-12']);
});

test('opakovat lze jen v okně idempotence', () => {
  const kdy = new Date('2027-01-12T09:00:00Z');
  assert.ok(smiSeOpakovat({ predano_v: '2027-01-12T05:00:00Z' }, kdy));
  assert.ok(!smiSeOpakovat({ predano_v: '2027-01-10T05:00:00Z' }, kdy));
  assert.ok(!smiSeOpakovat({ predano_v: null }, kdy));
});

test('platnost zprávy hlídá splatnost, konec užitečnosti i otisk kalendáře', async () => {
  const radek = {
    otisk_obsahu: 'o1',
    otisk_kalendare: 'k1',
    splatnost: '2027-01-12',
    konec_uzitecnosti: '2027-01-31',
  };
  const vcas = await jeZpravaPlatna(spojeni([{ rows: [radek], rowCount: 1 }]), 'z', 'k1', new Date('2027-01-12T09:00:00Z'));
  assert.deepEqual(vcas, { platna: true, otiskObsahu: 'o1' });

  const pozde = await jeZpravaPlatna(spojeni([{ rows: [radek], rowCount: 1 }]), 'z', 'k1', new Date('2027-02-01T09:00:00Z'));
  assert.equal(pozde.platna, false);
  assert.match(pozde.duvod, /konec užitečnosti/);

  const brzy = await jeZpravaPlatna(spojeni([{ rows: [radek], rowCount: 1 }]), 'z', 'k1', new Date('2027-01-01T09:00:00Z'));
  assert.equal(brzy.platna, false);

  const jinyKalendar = await jeZpravaPlatna(spojeni([{ rows: [radek], rowCount: 1 }]), 'z', 'k2', new Date('2027-01-12T09:00:00Z'));
  assert.equal(jinyKalendar.platna, false);
  assert.match(jinyKalendar.duvod, /kalendář/);

  const chybi = await jeZpravaPlatna(spojeni([{ rows: [], rowCount: 0 }]), 'z', 'k1');
  assert.equal(chybi.platna, false);
});
