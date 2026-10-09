import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { zavadec } from './_zavadec.mjs';

function nactiTrasu() {
  const soubory = {
    'transit_graph.json': {
      stops: { A: ['Alfa', 50.1, 14.4], B: ['Beta', 50.2, 14.5], C: ['Gama', 49.7, 13.4], D: ['Delta', 49.8, 13.5] },
      edges: { A: [['B', 1, ['PID:26']]], C: [['D', 1, ['26']]] },
      headways: { 'PID:26': 8, '26': 39.5 },
      route_names: { 'PID:26': '26' },
    },
    'school_locations.json': { schools: {
      '999000001': { stop_id: 'B', stop_name: 'Beta', lat: 50.2, lon: 14.5, distance_km: 0 },
      '999000002': { stop_id: 'D', stop_name: 'Delta', lat: 49.8, lon: 13.5, distance_km: 0 },
    } },
    'schools_data.json': { '2025': [
      { redizo: '999000001', id: '999000001_79-41-K/41', nazev: 'Škola Alfa', adresa: 'Alfa', obec: 'Alfa' },
      { redizo: '999000002', id: '999000002_79-41-K/41', nazev: 'Škola Beta', adresa: 'Beta', obec: 'Beta' },
    ] },
    'school_analysis.json': {},
  };
  const load = zavadec(undefined, {
    'fs': { promises: { readFile: async (soubor) => {
      const name = path.basename(soubor);
      assert.ok(Object.hasOwn(soubory, name), `neočekávaný soubor ${name}`);
      return JSON.stringify(soubory[name]);
    } } },
    '@/lib/data': { getResultsForYear: async () => new Map() },
    'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
  });
  return load('src/app/api/dostupnost/route.ts');
}

for (const view of [undefined, 'simulator']) {
  test(`API ${view ?? 'běžné'}: interval PID neovlivní jinou linku 26 a interní klíč se nezobrazuje`, async () => {
    const { POST } = nactiTrasu();
    for (const [stopId, minuty] of [['A', 5], ['C', 11]]) {
      const res = await POST({ json: async () => ({ stopId, maxMinutes: 30, view }) });
      assert.equal(res.status, 200);
      const vysledky = view ? res.body.estimates : res.body.reachableSchools;
      assert.equal(vysledky.length, 1);
      assert.equal(view ? vysledky[0].minutes : vysledky[0].estimatedMinutes, minuty);
      assert.deepEqual(view ? vysledky[0].lines : vysledky[0].usedLines, ['26']);
    }
  });
}
