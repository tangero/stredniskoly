// ============================================================================
// Cache odpovědí API dojezdovosti (#232, docs/cost-rollout-plan.md).
//
// Přepínače se čtou při načtení modulu, proto každý stav dostane vlastní
// zavaděč. Čas řídí podstrčené `Date`, geokódování podstrčený `fetch`:
// test se nedotazuje cizích serverů (pravidlo 7).
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zavadec } from './_zavadec.mjs';

const nextServer = {
  NextResponse: {
    json: (body, init) => ({ status: init?.status ?? 200, body }),
  },
};

let ted = Date.parse('2026-10-01T07:00:00Z');
class FalesneDatum extends Date {
  constructor(...a) { super(...(a.length ? a : [ted])); }
  static now() { return ted; }
}

const geokodovani = [];
const falesnyFetch = async (url) => {
  geokodovani.push(String(url));
  return {
    ok: true,
    json: async () => [{
      lat: '50.0755', lon: '14.4378', display_name: 'Náměstí Míru, Vinohrady, Praha',
      address: { city_district: 'Praha 2' },
    }],
  };
};

const ENV = [
  'DOSTUPNOST_RESPONSE_CACHE_ENABLED', 'DOSTUPNOST_RESPONSE_CACHE_TTL_MS',
  'PRAHA_DOSTUPNOST_RESPONSE_CACHE_ENABLED', 'PRAHA_DOSTUPNOST_RESPONSE_CACHE_TTL_MS',
];

function nactiTrasu(soubor, env) {
  const puvodni = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));
  for (const k of ENV) delete process.env[k];
  Object.assign(process.env, env);
  try {
    const load = zavadec(undefined, { 'next/server': nextServer }, { Date: FalesneDatum, fetch: falesnyFetch });
    return load(soubor);
  } finally {
    for (const [k, v] of Object.entries(puvodni)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

const pozadavek = (telo) => ({ json: async () => telo });
const bezCache = (body) => {
  const kopie = structuredClone(body);
  delete kopie.diagnostics;
  return kopie;
};

// Zastávka z data/transit_graph.json (Plzeň, Hlavní nádraží).
const CELOSTATNI = { stopId: 'CISJR:53408|CRZ:33145|IDPK:58768|IDPK:58769|PMDP_GTFS:362', maxMinutes: 30, page: 1 };
const PRAHA = { address: 'Náměstí Míru', maxMinutes: 30, page: 1, coverageMode: 'praha' };

const TRASY = [
  {
    nazev: 'celostátní /api/dostupnost',
    soubor: 'src/app/api/dostupnost/route.ts',
    zapnout: { DOSTUPNOST_RESPONSE_CACHE_ENABLED: 'true', DOSTUPNOST_RESPONSE_CACHE_TTL_MS: '60000' },
    dotaz: CELOSTATNI,
    stejnyJinakZapsany: { ...CELOSTATNI, stopId: ` ${CELOSTATNI.stopId} ` },
  },
  {
    nazev: 'pražská /api/praha-dostupnost',
    soubor: 'src/app/api/praha-dostupnost/route.ts',
    zapnout: { PRAHA_DOSTUPNOST_RESPONSE_CACHE_ENABLED: 'true', PRAHA_DOSTUPNOST_RESPONSE_CACHE_TTL_MS: '60000' },
    dotaz: PRAHA,
    stejnyJinakZapsany: { ...PRAHA, address: '  náměstí   MÍRU ' },
  },
];

for (const t of TRASY) {
  test(`${t.nazev}: vypnutá cache nikdy netrefí`, async () => {
    const { POST } = nactiTrasu(t.soubor, {});
    const prvni = await POST(pozadavek(t.dotaz));
    const druhy = await POST(pozadavek(t.dotaz));
    assert.equal(prvni.status, 200, JSON.stringify(prvni.body).slice(0, 200));
    assert.deepEqual(prvni.body.diagnostics.responseCache, { ...prvni.body.diagnostics.responseCache, enabled: false, hit: false });
    assert.equal(druhy.body.diagnostics.responseCache.hit, false);
  });

  test(`${t.nazev}: zapnutá cache vrátí shodný výsledek jako vypnutá a druhý dotaz trefí`, async () => {
    const vypnuta = nactiTrasu(t.soubor, {});
    const zapnuta = nactiTrasu(t.soubor, t.zapnout);
    const ocekavany = await vypnuta.POST(pozadavek(t.dotaz));
    const prvni = await zapnuta.POST(pozadavek(t.dotaz));
    const druhy = await zapnuta.POST(pozadavek(t.dotaz));
    assert.equal(prvni.body.diagnostics.responseCache.hit, false);
    assert.equal(druhy.body.diagnostics.responseCache.hit, true);
    assert.deepEqual(bezCache(prvni.body), bezCache(ocekavany.body));
    assert.deepEqual(bezCache(druhy.body), bezCache(ocekavany.body));
  });

  test(`${t.nazev}: odpověď z cache je kopie, úprava ji nepoškodí`, async () => {
    const { POST } = nactiTrasu(t.soubor, t.zapnout);
    await POST(pozadavek(t.dotaz));
    const druhy = await POST(pozadavek(t.dotaz));
    druhy.body.input.maxMinutes = -1;
    druhy.body.diagnostics.responseCache.hit = 'poškozeno';
    const treti = await POST(pozadavek(t.dotaz));
    assert.equal(treti.body.input.maxMinutes, t.dotaz.maxMinutes);
    assert.equal(treti.body.diagnostics.responseCache.hit, true);
  });

  test(`${t.nazev}: po uplynutí TTL se počítá znovu`, async () => {
    const { POST } = nactiTrasu(t.soubor, t.zapnout);
    await POST(pozadavek(t.dotaz));
    ted += 59_000;
    assert.equal((await POST(pozadavek(t.dotaz))).body.diagnostics.responseCache.hit, true, 'v TTL');
    ted += 2_000;
    assert.equal((await POST(pozadavek(t.dotaz))).body.diagnostics.responseCache.hit, false, 'po TTL');
  });

  test(`${t.nazev}: jinak zapsaný stejný dotaz trefí cache`, async () => {
    const { POST } = nactiTrasu(t.soubor, t.zapnout);
    await POST(pozadavek(t.dotaz));
    const jiny = await POST(pozadavek(t.stejnyJinakZapsany));
    assert.equal(jiny.body.diagnostics.responseCache.hit, true);
  });

  test(`${t.nazev}: jiný limit minut cache netrefí`, async () => {
    const { POST } = nactiTrasu(t.soubor, t.zapnout);
    await POST(pozadavek(t.dotaz));
    const jiny = await POST(pozadavek({ ...t.dotaz, maxMinutes: t.dotaz.maxMinutes + 15 }));
    assert.equal(jiny.body.diagnostics.responseCache.hit, false);
  });
}

test('pražská trasa: odpověď z cache vrací adresu tak, jak ji zadal tento dotaz', async () => {
  const { POST } = nactiTrasu('src/app/api/praha-dostupnost/route.ts', TRASY[1].zapnout);
  await POST(pozadavek(PRAHA));
  const jiny = await POST(pozadavek({ ...PRAHA, address: 'namesti miru' }));
  assert.equal(jiny.body.diagnostics.responseCache.hit, true);
  assert.equal(jiny.body.input.address, 'namesti miru');
});

test('simulátorový pohled celostátní trasy cache nečte ani nezapisuje', async () => {
  const { POST } = nactiTrasu('src/app/api/dostupnost/route.ts', TRASY[0].zapnout);
  const sim = await POST(pozadavek({ ...CELOSTATNI, view: 'simulator' }));
  assert.ok(Array.isArray(sim.body.estimates), 'simulátor vrací odhady');
  const bezny = await POST(pozadavek(CELOSTATNI));
  assert.equal(bezny.body.diagnostics.responseCache.hit, false, 'simulátor do cache nezapsal');
  const sim2 = await POST(pozadavek({ ...CELOSTATNI, view: 'simulator' }));
  assert.ok(Array.isArray(sim2.body.estimates), 'simulátor nedostal běžnou odpověď z cache');
});

test('geokódování šlo jen na podstrčený fetch', () => {
  assert.ok(geokodovani.length > 0);
});
