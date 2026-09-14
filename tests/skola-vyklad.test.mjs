import test from 'node:test';
import assert from 'node:assert/strict';
import {
  vzdalenostKm, smerStupne, proKohoObor, delkaSlovy, oboryVetou, pocetOboru, shrnutiMaturity, letNadSlovy, jakCastoNadStredem, nazevSkupinyMaturity,
} from '../src/lib/skola-vyklad.ts';

const machar = { lat: 50.184405, lon: 14.6701023 };
const celakovice = { lat: 50.1604, lon: 14.7501 };

test('vzdálenost vzdušnou čarou a směr', () => {
  const km = vzdalenostKm(machar, celakovice);
  assert.ok(km > 5.5 && km < 6.5, String(km));
  const smer = smerStupne(machar, celakovice);
  assert.ok(smer > 90 && smer < 180, String(smer)); // Čelákovice leží jihovýchodně
  assert.equal(Math.round(vzdalenostKm(machar, machar)), 0);
});

test('pro koho obor je a délka slovy', () => {
  assert.equal(proKohoObor('GY8_8', 8), 'z 5. třídy');
  assert.equal(proKohoObor('GY6_6', 6), 'ze 7. třídy');
  assert.equal(proKohoObor('LYC_4', 4), 'z 9. třídy');
  assert.equal(proKohoObor('NAS_2', 2), 'po vyučení');
  assert.equal(delkaSlovy(4), '4 roky');
  assert.equal(delkaSlovy(8), '8 let');
  assert.equal(pocetOboru(3), '3 obory');
  assert.equal(pocetOboru(5), '5 oborů');
  assert.equal(pocetOboru(1), '1 obor');
});

test('obory školy větou', () => {
  assert.equal(
    oboryVetou([{ obor: 'Gymnázium', delka: 4 }, { obor: 'Technické lyceum', delka: 4 }, { obor: 'Gymnázium', delka: 8 }]),
    'Gymnázium osmileté a čtyřleté, technické lyceum',
  );
  assert.equal(oboryVetou([{ obor: 'Hotelnictví', delka: 4 }]), 'Hotelnictví');
  const mnoho = ['A', 'B', 'C', 'D', 'E', 'F'].map(o => ({ obor: o, delka: 4 }));
  assert.equal(oboryVetou(mnoho), 'A, b, c, d a 2 další obory');
});

const zaznam = (stav, took = 30) => ({ cj: { took, averagePercentile: 80, ...(stav ? { groupComparison: { state: stav, interval: [1, 2], medianPercentScore: 70, schools: 200 } } : {}) } });

test('shrnutí maturity přes čtyři roky', () => {
  const skola = {
    2022: { GY8: zaznam('below') },
    2023: { GY8: zaznam('above'), GY4: zaznam('below') },
    2024: { GY8: zaznam('indistinguishable'), GY4: zaznam('indistinguishable') },
    2025: { GY8: zaznam('above'), GY4: zaznam('above') },
    2026: { GY8: zaznam('above'), GY4: zaznam('above') },
  };
  const roky = [2022, 2023, 2024, 2025, 2026];
  const gy8 = shrnutiMaturity(roky, skola, 'GY8');
  assert.deepEqual(gy8.roky.map(r => r.rok), [2023, 2024, 2025, 2026]);
  assert.equal(gy8.letNad, 3);
  assert.equal(letNadSlovy(gy8), 've 3 ze 4 let');
  const gy4 = shrnutiMaturity(roky, skola, 'GY4');
  assert.equal(letNadSlovy(gy4), 'v letech 2025 a 2026');
  assert.equal(gy4.posledni.rok, 2026);
});

test('roky bez zařazení se nepočítají jako ne nad skupinou', () => {
  const skola = { 2025: { LYC: zaznam(null, 6) }, 2026: { LYC: zaznam('above') } };
  const s = shrnutiMaturity([2023, 2024, 2025, 2026], skola, 'LYC');
  assert.equal(s.letSeZarazenim, 1);
  assert.equal(letNadSlovy(s), 'v roce 2026');
  const vsude = shrnutiMaturity([2025, 2026], { 2025: { X: zaznam('above') }, 2026: { X: zaznam('above') } }, 'X');
  assert.equal(letNadSlovy(vsude), 've všech 2 letech');
  const nikdy = shrnutiMaturity([2025, 2026], { 2025: { X: zaznam('below') }, 2026: { X: zaznam('indistinguishable') } }, 'X');
  assert.equal(letNadSlovy(nikdy), 'v žádném ze 2 let');
  assert.equal(shrnutiMaturity([2026], {}, 'X').posledni, null);
});

test('jak často nad středem podobných škol a názvy skupin', () => {
  assert.equal(jakCastoNadStredem([{ letNad: 4, letSeZarazenim: 4 }, { letNad: 3, letSeZarazenim: 4 }, { letNad: 3, letSeZarazenim: 4 }]), 'téměř každý rok');
  assert.equal(jakCastoNadStredem([{ letNad: 4, letSeZarazenim: 4 }]), 'každý rok');
  assert.equal(jakCastoNadStredem([{ letNad: 3, letSeZarazenim: 4 }, { letNad: 2, letSeZarazenim: 4 }]), 've většině let');
  assert.equal(jakCastoNadStredem([{ letNad: 2, letSeZarazenim: 4 }]), 'zhruba v polovině let');
  assert.equal(jakCastoNadStredem([{ letNad: 1, letSeZarazenim: 4 }]), 'jen v některých letech');
  assert.equal(jakCastoNadStredem([{ letNad: 0, letSeZarazenim: 3 }]), 'v žádném ze sledovaných let');
  assert.equal(jakCastoNadStredem([{ letNad: 0, letSeZarazenim: 0 }]), null);
  assert.equal(nazevSkupinyMaturity('GY8', 'GYMNÁZIUM 8LETÉ'), 'osmileté gymnázium');
  assert.equal(nazevSkupinyMaturity('SEK', 'EKONOMICKÉ OBORY'), 'ekonomické obory');
});
