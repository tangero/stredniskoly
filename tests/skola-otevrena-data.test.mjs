import test from 'node:test';
import assert from 'node:assert/strict';
import { sestavOtevrenaData, otevrenaDataMarkdown, hlavickyOtevrenychDat, VERZE_SCHEMATU } from '../src/lib/skola-otevrena-data.ts';

const skola = { nazev: 'Gymnázium Test', redizo: '600000001', slug: '600000001-gymnazium-test', adresa: 'Ulice 1, Obec', obec: 'Obec', okres: 'Okres', kraj: 'Středočeský', zrizovatel: 'veřejné / státní' };
const obor = (o) => ({ id: 'x', href: '/skola/600000001-gymnazium-test-gymnazium-8lete', nazev: 'Gymnázium', delka: 8, proKoho: 'z 5. třídy', skupina: 'GY8_8', kapacita: 30, prihlasky: 233, prijati: 30, soutezici: 112, zarazeni: 'velmi_tezke', predchoziRok: 2025, zarazeniPredchozi: 'tezke', predchozi: null, tlak: 4.1, cjPrijati: 39.5, maPrijati: 40.6, umisteniPrijatych: 92.4, novy: false, drivejsiNazev: null, vypsano: true, druheKolo: null, ...o });
const profil = {
  redizo: '600000001', rok: 2026, platnostDat: '2026-08-17',
  obory: [obor({}), obor({ id: 'y', nazev: 'Gymnázium', delka: 4, kapacita: 30, prihlasky: 94, zarazeni: 'vetsina_uspela', soutezici: 44, druheKolo: { rok: 2026, zaznam: { stav: 'vypsano', kapacita: 7, prihlasky: 13, prijati: 2, neveslo_se: 0, nesplnilo_podminky: 2, prijato_na_vyssi_prioritu: 9, prijatych_s_vysledkem: 2 }, predchozi: { stav: 'bez_2_kola' } } })],
  maturita: { obdobi: 'jaro', roky: [2025, 2026], skupiny: [{ smo16: 'GY8', nazev: 'Gymnázium 8leté', letNad: 2, letSeZarazenim: 2, skolVeSkupine: 257, stredPodobnychSkol: 71.8, skoryPodobnychSkol: [], vstup: null, posledni: null,
    roky: [{ rok: 2026, stav: 'above', zaznam: { spolecna_cast: { registered: 31, took: 31, passed: 31, passRate: 100 }, cj: { took: 31, averagePercentScore: 78.4, averagePercentile: 83.94, groupComparison: { state: 'above', interval: [74.1, 82.7], medianPercentScore: 71.8, schools: 257 } }, ma: { subjectChoiceShare: 48.39 } } }] }] },
  inspekce: null, inspekceSeznam: null, inspis: null,
  portal: { redizo: '600000001', nazev: 'Gymnázium Test', verze_prijimani: '2027', aktualizovano: '2026-11-03', udaje: {
    dny_otevrenych_dveri: { hodnota: '18. 11. 2026', potvrzeno_dne: '2026-11-03', zdroj: 'skola' },
    popis_skoly: { hodnota: 'Jsme škola.', potvrzeno_dne: '2026-11-03', zdroj: 'skola' },
    skolne: { hodnota: '  ', potvrzeno_dne: '2026-11-03', zdroj: 'skola' },
  } },
  web: 'https://skola.example', poloha: null, okoli: [], soubeh: null,
};

test('JSON nese období z registru, původ údajů od školy a nesčítá přihlášky', () => {
  const d = sestavOtevrenaData(skola, profil, { vysledky: 2026, uchazeci: 2025, maturita: '2026' });
  assert.equal(d.verze_schematu, VERZE_SCHEMATU);
  assert.equal(d.obdobi_dat.prijimaci_rizeni_kolo1, 2026);
  assert.equal(d.celkova_kapacita, 60);
  assert.equal('celkem_prihlasek' in d, false);
  assert.equal(d.obory[0].obtiznost_prijeti, 'velmi_tezke');
  assert.equal(d.obory[0].vypsano_v_roce, 2026);
  assert.deepEqual(d.udaje_od_skoly.map(x => [x.pole, x.puvod]), [['dny_otevrenych_dveri', 'doplnila_skola'], ['popis_skoly', 'text_skoly']]);
  assert.equal(d.maturita.skupiny_oboru[0].roky[0].zarazeni_proti_skupine, 'above');
  assert.equal(d.obory[1].druhe_kolo.kapacita, 7);
  assert.equal(d.obory[1].druhe_kolo.predchozi_rok.stav, 'bez_2_kola');
  assert.equal('druhe_kolo' in d.obory[0], false);
});

test('Markdown vychází ze stejného objektu', () => {
  const md = otevrenaDataMarkdown(sestavOtevrenaData(skola, profil, { vysledky: 2026, uchazeci: 2025, maturita: '2026' }));
  assert.match(md, /## Co tu lze studovat \(1\. kolo 2026\)/);
  assert.match(md, /velmi těžké se dostat \(přijato 30 ze 112( \(bez (\d+ )?přijatých jinam podle vyšší priority\))?\)/);
  assert.match(md, /\| 2026 \| 31 ze 31 \| 78,4 % \| 71,8 % \| nad středem podobných škol \| 48 % \|/);
  assert.match(md, /\*\*Dny otevřených dveří\*\* \(doplnila škola 2026-11-03\): 18\. 11\. 2026/);
  assert.match(md, /- \*\*2\. kolo:\*\* Ve 2\. kole 2026 škola vypsala 7 míst\. Přišlo 13 přihlášek a přijati byli 2\..*V roce 2025 škola 2\. kolo nevypsala\./);
  assert.doesNotMatch(md, /Celkem přihlášek|2025 \(přihlášky na místo\)|Index poptávky/);
});

test('opravený počet žáků nese původ od školy, ne z exportu InspIS (#220)', () => {
  const inspis = { aktualni_pocet_zaku: 493, nejvyssi_povoleny_pocet_zaku: 550, vyuka_jazyku: null,
    opravy: { aktualni_pocet_zaku: { zdroj: 'škola, e-mail', datum: '2026-10-01' } } };
  const d = sestavOtevrenaData(skola, { ...profil, inspis }, { vysledky: 2026, uchazeci: 2025, maturita: '2026' });
  assert.equal(d.profil_inspis.pocet_zaku, 493);
  assert.deepEqual(d.profil_inspis.opravy_od_skoly, { pocet_zaku: { puvod: 'potvrdila_skola', potvrzeno_dne: '2026-10-01', zdroj: 'škola, e-mail' } });
  const md = otevrenaDataMarkdown(d);
  assert.match(md, /- \*\*Žáků:\*\* 493 \(doplnila škola 2026-10-01, ne údaj z InspIS; nejvýš 550 podle InspIS\)/);

  const bez = sestavOtevrenaData(skola, { ...profil, inspis: { ...inspis, aktualni_pocet_zaku: 456, opravy: undefined } }, { vysledky: 2026, uchazeci: 2025, maturita: '2026' });
  assert.equal('opravy_od_skoly' in bez.profil_inspis, false);
  assert.match(otevrenaDataMarkdown(bez), /- \*\*Žáků:\*\* 456 \(nejvýš 550\)\n/);
});

test('zbylá místa po 1. kole bez JPZ se neukazují záporná: JSON ořízne na 0, Markdown napíše obsazeno', () => {
  const p = { ...profil, obory: [obor({ id: 'u', nazev: 'Obor bez JPZ', kapacita: 39, bezJpz: { druh: 'ucebni_obor_h', zbylaMista: -2 } }), obor({ id: 'v', nazev: 'Jiný obor bez JPZ', kapacita: 14, bezJpz: { druh: 'ucebni_obor_h', zbylaMista: 5 } })] };
  const d = sestavOtevrenaData(skola, p, { vysledky: 2026, uchazeci: 2025, maturita: '2026' });
  assert.equal(d.obory[0].zbyla_mista_po_1_kole, 0);
  assert.equal(d.obory[1].zbyla_mista_po_1_kole, 5);
  const md = otevrenaDataMarkdown(d);
  assert.match(md, /Po 1\. kole obsazeno/);
  assert.doesNotMatch(md, /-2/);
  assert.match(md, /Zbylá místa po 1\. kole:\*\* 5 ze? 14/);
});

test('strojové podoby nesou kanonickou adresu stránky školy (#405)', () => {
  const o = sestavOtevrenaData(skola, profil, { vysledky: 2026, uchazeci: 2026, maturita: '2026' });
  const h = hlavickyOtevrenychDat(o, 'application/json');
  assert.equal(h['Content-Type'], 'application/json');
  assert.equal(h.Link, '<https://www.prijimackynaskolu.cz/skola/600000001-gymnazium-test>; rel="canonical"');
});
