import test from 'node:test';
import assert from 'node:assert/strict';
import {
  zarazeniObtiznosti, slovniPodil, zOd, stavNabidky, zminitPozadavek, vetaPozadavku,
  poradiVeSkupine, textPoradi, nazevSkupiny, soutezicichUchazecu, vKraji,
} from '../src/lib/obor-profil.ts';

const machar8 = { kapacita: 30, prihlasky: 233, prijati: 30, capacity_rejected: 82, conditions_not_met: 85, higher_priority: 36, zarazeni_obtiznosti: 'velmi_tezke' };

// Od 17. 9. 2026 (dávka D2) počítá zařazení generátor `build-souhrny-kolo1.py`
// a TypeScript nad ním uplatňuje jen pravidlo zobrazení. Prahy třetina, polovina
// a dvě třetiny proto testuje `tests/test_souhrny_kolo1.py`, ne tenhle soubor.
test('obtížnost přijetí se přebírá z dat, nepočítá se znovu', () => {
  assert.equal(zarazeniObtiznosti(machar8), 'velmi_tezke');
  assert.equal(zarazeniObtiznosti({ prijati: 29, capacity_rejected: 38, zarazeni_obtiznosti: 'tezke' }), 'tezke');
  assert.equal(zarazeniObtiznosti({ prijati: 30, capacity_rejected: 24, zarazeni_obtiznosti: 'stredne_tezke' }), 'stredne_tezke');
  assert.equal(zarazeniObtiznosti({ prijati: 30, capacity_rejected: 14, zarazeni_obtiznosti: 'vetsina_uspela' }), 'vetsina_uspela');
  // Bez odmítnutých kvůli kapacitě rozhoduje zobrazení samo: pole z dat se nečeká.
  assert.equal(zarazeniObtiznosti({ prijati: 23, capacity_rejected: 0 }), 'kapacita_nerozhodovala');
});

test('pod deseti soutěžícími uchazeči a bez údaje se obtížnost neurčí', () => {
  assert.equal(zarazeniObtiznosti({ prijati: 3, capacity_rejected: 4, zarazeni_obtiznosti: 'velmi_tezke' }), null);
  assert.equal(zarazeniObtiznosti({ prijati: 3 }), null);
  // Data zařazení nenesou (starší ročník, chybějící pole): stránka nic netvrdí.
  assert.equal(zarazeniObtiznosti({ prijati: 30, capacity_rejected: 82 }), null);
  assert.equal(soutezicichUchazecu({ prijati: 30, capacity_rejected: 82 }), 112);
});

test('podíl slovy a předložka před číslem', () => {
  assert.equal(slovniPodil(30, 112), 'zhruba každý čtvrtý');
  assert.equal(slovniPodil(29, 67), 'zhruba každý druhý');
  assert.equal(slovniPodil(30, 44), 'zhruba dva ze tří');
  assert.equal(slovniPodil(60, 436), 'zhruba každý sedmý');
  assert.equal(slovniPodil(1, 50), 'méně než každý desátý');
  assert.equal(zOd(112), 'ze');
  assert.equal(zOd(67), 'ze');
  assert.equal(zOd(7), 'ze');
  assert.equal(zOd(44), 'ze');
  assert.equal(zOd(4), 'ze');
  assert.equal(zOd(2), 'ze');
  assert.equal(zOd(12), 'ze');
  assert.equal(zOd(30), 'ze');
  assert.equal(zOd(55), 'z');
  assert.equal(zOd(10), 'z');
  assert.equal(zOd(1), 'z');
  assert.equal(zOd(85), 'z');
  assert.equal(zOd(233), 'ze');
  assert.equal(zOd(1000), 'z');
  assert.equal(zOd(2500), 'ze');
});

test('stav nabídky a zmínka o požadavku školy', () => {
  assert.equal(stavNabidky(machar8), 'nevesli_se');
  assert.equal(stavNabidky({ kapacita: 30, prijati: 23, capacity_rejected: 0 }), 'nenaplneno');
  assert.equal(stavNabidky({ kapacita: 30, prijati: 30, capacity_rejected: 0 }), 'naplneno');
  assert.equal(zminitPozadavek(machar8), true);
  assert.equal(zminitPozadavek({ prihlasky: 65, prijati: 23, conditions_not_met: 10 }), false);
});

test('věta o požadavku školy podle odvozené hranice', () => {
  assert.match(vetaPozadavku({ typ: 'slabsi_test', nejvyse_nesplneny: 19, nejnize_soutezici: 20 }), /minimu 20 bodů v každém testu/);
  assert.match(vetaPozadavku({ typ: 'soucet', nejvyse_nesplneny: 29, nejnize_soutezici: 33 }), /30 až 33 bodů celkem/);
  assert.match(vetaPozadavku({ typ: 'nevysvetleno_vysledkem_jpz' }), /například minima bodů/);
  assert.doesNotMatch(vetaPozadavku(null), /podmínk/);
});

test('pořadí ve skupině se shodou a prahem deseti nabídek', () => {
  const skupina = [5, 4.1, 4.1, 3, 2, 1.5, 1, 0.8, 0.5, 0.2];
  assert.deepEqual(poradiVeSkupine(5, skupina), { od: 1, do: 1, z: 10 });
  assert.deepEqual(poradiVeSkupine(4.1, skupina), { od: 2, do: 3, z: 10 });
  assert.equal(textPoradi(poradiVeSkupine(4.1, skupina)), '2.–3.');
  assert.equal(poradiVeSkupine(1, skupina.slice(0, 9)), null);
});

test('název srovnatelné skupiny', () => {
  assert.equal(nazevSkupiny('GY8_8'), 'osmiletých gymnázií');
  assert.equal(nazevSkupiny('LYC_4'), 'čtyřletých lyceí');
});

test('kraj v 6. pádě s předložkou', () => {
  assert.equal(vKraji('Středočeský'), 've Středočeském kraji');
  assert.equal(vKraji('Zlínský'), 've Zlínském kraji');
  assert.equal(vKraji('Ústecký'), 'v Ústeckém kraji');
  assert.equal(vKraji('Jihomoravský'), 'v Jihomoravském kraji');
  assert.equal(vKraji('Hlavní město Praha'), 'v Praze');
  assert.equal(vKraji('Kraj Vysočina'), 'v Kraji Vysočina');
});
