// ============================================================================
// Veletrhy a přehlídky SŠ (docs/veletrhy-skol-2027.md).
//
// Testy hlídají čtyři tvrzení, ze kterých by kterékoli porušení znamenalo,
// že web pošle rodinu na akci, která se nekoná, nebo zamlčí akci, která se
// koná. Zdrojové xlsx míchá ověřené termíny s loňskými daty pod hlavičkou
// „2026 TBD", takže rozdíl mezi ověřeným pořadatelem a ověřeným termínem
// je tu nosný, ne formální.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  zobrazitelneAkce,
  cekajiciAkce,
  krajeSAkcemi,
} from '../src/lib/veletrhy.ts';

const PRED_SEZONOU = new Date('2026-09-22');

test('akce s nepotvrzeným termínem se nezobrazí', () => {
  const zobrazene = zobrazitelneAkce(PRED_SEZONOU);
  const sporne = zobrazene.filter((a) => !a.terminPotvrzen);
  assert.equal(
    sporne.length,
    0,
    `Na web by šly akce bez potvrzeného termínu: ${sporne.map((a) => a.id).join(', ')}`,
  );
});

test('zobrazená akce má termín, odkaz i doložený zdroj ověření', () => {
  const bezDokladu = zobrazitelneAkce(PRED_SEZONOU).filter(
    (a) => !a.start || !a.datum || !a.url || !a.zdrojOvereni,
  );
  assert.equal(
    bezDokladu.length,
    0,
    `Akce bez data, odkazu nebo zdroje ověření: ${bezDokladu.map((a) => a.id).join(', ')}`,
  );
});

test('proběhlá akce zmizí ze seznamu', () => {
  const pred = zobrazitelneAkce(new Date('2026-09-29'));
  const po = zobrazitelneAkce(new Date('2026-10-01'));
  const pribram = (s) => s.some((a) => a.id === 'veletrh-pribram-2026');

  assert.ok(pribram(pred), 'Příbram 30. 9. musí být vidět 29. 9.');
  assert.ok(!pribram(po), 'Příbram 30. 9. nesmí být vidět 1. 10.');
});

test('vícedenní akce je vidět i v průběhu, mizí až po posledním dni', () => {
  const id = 'schola-pragensis-2026'; // 26.–28. 11. 2026
  const vidi = (d) => zobrazitelneAkce(new Date(d)).some((a) => a.id === id);

  assert.ok(vidi('2026-11-27'), 'Vícedenní akce musí být vidět i uprostřed svého trvání.');
  assert.ok(vidi('2026-11-28'), 'Akce musí být vidět i poslední den.');
  assert.ok(!vidi('2026-11-29'), 'Den po skončení už akce být vidět nesmí.');
});

test('čekající akce nesou důvod, proč se nezobrazují', () => {
  const bezDuvodu = cekajiciAkce().filter((a) => !a.cekaNa);
  assert.equal(
    bezDuvodu.length,
    0,
    `Nepotvrzené akce bez zapsaného důvodu: ${bezDuvodu.map((a) => a.id).join(', ')}`,
  );
});

test('nabídka krajů obsahuje jen kraje, které mají zobrazitelnou akci', () => {
  const kraje = krajeSAkcemi(PRED_SEZONOU);
  const zobrazene = zobrazitelneAkce(PRED_SEZONOU);

  for (const k of kraje) {
    const skutecny = zobrazene.filter((a) => a.krajKod === k.kod).length;
    assert.equal(k.pocet, skutecny, `Kraj ${k.nazev} hlásí ${k.pocet} akcí, ve skutečnosti jich má ${skutecny}.`);
  }
  assert.ok(kraje.length > 0, 'Před sezónou musí být aspoň jeden kraj s akcí.');
});

test('identifikátory akcí jsou jedinečné', () => {
  const vsechny = [...zobrazitelneAkce(new Date('2020-01-01')), ...cekajiciAkce()];
  const videne = new Set();
  const duplicity = [];
  for (const a of vsechny) {
    if (videne.has(a.id)) duplicity.push(a.id);
    videne.add(a.id);
  }
  assert.deepEqual(duplicity, [], 'Dva záznamy sdílejí identifikátor.');
});

// --- Nálezy z oponentury Codexem, 22. 9. 2026 -------------------------------

test('den se počítá v českém kalendáři, ne v UTC', async () => {
  const { cesskyDen } = await import('../src/lib/veletrhy.ts');
  // Půl jedné ráno 1. 10. letního času je v UTC ještě 30. 9.; akce z 30. 9.
  // by se tou dobou tvářila jako dnešní.
  const pulnocPoPrechodu = new Date('2026-10-01T00:30:00+02:00');
  assert.equal(cesskyDen(pulnocPoPrechodu), '2026-10-01');

  const vidiPribram = zobrazitelneAkce(pulnocPoPrechodu).some((a) => a.id === 'veletrh-pribram-2026');
  assert.ok(!vidiPribram, 'Příbram z 30. 9. nesmí být vidět po půlnoci 1. 10. českého času.');
});

test('akce s termínem jen z agregátoru nese značku a vysvětlení', () => {
  const zAgregatoru = zobrazitelneAkce(PRED_SEZONOU).filter((a) => a.zdrojJenAgregator);
  assert.ok(zAgregatoru.length > 0, 'Očekáváme aspoň jednu akci z agregátoru; jinak test nehlídá, co má.');

  const bezVysvetleni = zAgregatoru.filter((a) => !a.poznamkaTerminu);
  assert.equal(
    bezVysvetleni.length,
    0,
    `Akce z agregátoru bez věty, proč ji nemáme ověřenou: ${bezVysvetleni.map((a) => a.id).join(', ')}`,
  );
});

test('přibližný termín se nevydává za přesný', () => {
  const pribligne = zobrazitelneAkce(PRED_SEZONOU).filter((a) => a.terminPribligny);
  assert.ok(pribligne.length > 0, 'Online veletrh MSK má přibližný rozsah; očekáváme aspoň jeden takový záznam.');

  for (const a of pribligne) {
    assert.ok(
      a.poznamkaTerminu,
      `Akce ${a.id} má přibližný termín, ale neříká čtenáři, v čem je přibližný.`,
    );
  }
});

test('každý kraj má aspoň jednu zobrazitelnou akci', () => {
  // Pokrytí je hlavní slabina přehledu; když kraj vypadne, stránka o tom
  // musí mluvit pravdivě, ale zároveň chceme vědět, že se to stalo.
  const kraje = krajeSAkcemi(PRED_SEZONOU);
  assert.equal(kraje.length, 14, `Akce chybí v ${14 - kraje.length} krajích: ${kraje.map((k) => k.nazev).join(', ')}`);
});

test('registr a dokumentace uvádějí počty, které v datech opravdu jsou', async () => {
  // Počty se psaly ručně a po dohledání termínů se rozešly s daty.
  // Test je váže na skutečnost, aby příští rozchod spadl tady, ne až na webu.
  const fs = await import('node:fs/promises');
  const vsechny = [...zobrazitelneAkce(new Date('2020-01-01')), ...cekajiciAkce()];
  const cekajici = cekajiciAkce().length;

  const registr = await fs.readFile('public/stav_datovych_sad.json', 'utf-8');
  const sada = JSON.parse(registr).sady['veletrhy-skol'];
  const tvrzeni = sada.zobrazeno.poznamka.match(/(\d+) z (\d+) záznamů čeká/);

  assert.ok(tvrzeni, 'Registr musí uvádět, kolik záznamů čeká na potvrzení termínu.');
  assert.equal(Number(tvrzeni[1]), cekajici, 'Registr uvádí jiný počet čekajících, než v datech je.');
  assert.equal(Number(tvrzeni[2]), vsechny.length, 'Registr uvádí jiný počet záznamů, než v datech je.');

  const zdroje = await fs.readFile('docs/zdroje-dat.md', 'utf-8');
  const vDokumentaci = zdroje.match(/Z (\d+) záznamů jich je (\d+); zbylých (\d+)/);
  assert.ok(vDokumentaci, 'Zdroje dat musí uvádět počty záznamů.');
  assert.equal(Number(vDokumentaci[1]), vsechny.length, 'docs/zdroje-dat.md uvádí jiný celkový počet.');
  assert.equal(Number(vDokumentaci[2]), vsechny.length - cekajici, 'docs/zdroje-dat.md uvádí jiný počet potvrzených.');
  assert.equal(Number(vDokumentaci[3]), cekajici, 'docs/zdroje-dat.md uvádí jiný počet čekajících.');
  const nepouzite = zdroje.match(/\| Nepotvrzené termíny veletrhů \| veletrhy, (\d+) z (\d+) záznamů \|[^\n]*všech (\d+) krajů/);
  assert.ok(nepouzite, 'Také soupis nepoužitých údajů musí uvádět aktuální počty.');
  assert.equal(Number(nepouzite[1]), cekajici);
  assert.equal(Number(nepouzite[2]), vsechny.length);
  assert.equal(Number(nepouzite[3]), krajeSAkcemi(PRED_SEZONOU).length);
});

test('zobrazené období se bere z registru, ne z názvu souboru', async () => {
  // Oponentura našla, že návrh tvrdil napojení na registr, které v kódu
  // nebylo: modul importoval JSON napevno a registr nikdo nečetl.
  const { overSezonuProtiRegistru, SEZONA } = await import('../src/lib/veletrhy.ts');
  const fs = await import('node:fs/promises');

  const registr = JSON.parse(await fs.readFile('public/stav_datovych_sad.json', 'utf-8'));
  const vRegistru = registr.sady['veletrhy-skol'].zobrazeno.obdobi;

  assert.equal(
    await overSezonuProtiRegistru(),
    vRegistru,
    'Data a registr se rozcházejí; stránka by ukazovala jiný ročník, než registr tvrdí.',
  );
  assert.equal(SEZONA, vRegistru, `Soubor nese sezónu ${SEZONA}, registr ${vRegistru}.`);
});

test('rozchod dat s registrem seznam zhasne', async () => {
  // Mutační test ukázal, že předchozí test strážní podmínku nehlídal:
  // zrušení `obdobi === SEZONA` prošlo všemi testy. Tenhle podstrčí registr
  // s jiným ročníkem a čeká null — tedy prázdnou stránku místo loňských akcí.
  const { overSezonuProtiRegistru, SEZONA } = await import('../src/lib/veletrhy.ts');

  assert.equal(
    await overSezonuProtiRegistru(async () => '2099'),
    null,
    'Registr přepnul na jiný ročník, ale data se nevyměnila — seznam se nesmí zobrazit.',
  );
  assert.equal(
    await overSezonuProtiRegistru(async () => null),
    null,
    'Bez období v registru se seznam nezobrazuje.',
  );
  assert.equal(
    await overSezonuProtiRegistru(async () => SEZONA),
    SEZONA,
    'Když období souhlasí, seznam se zobrazit musí.',
  );
});

test('každá akce má známý kraj a datum ve tvaru YYYY-MM-DD s koncem po začátku', async () => {
  // Soubor se po nahlášeních edituje ručně. Překlep v `krajKod` by akci
  // započítal do čipu „Všechny kraje“, ale nikde nevykreslil; špatný tvar
  // data by dlaždice vypsala jako „21–NaN“ a řazení podle řetězce by lhalo.
  const { krajNames } = await import('../src/lib/kraje.mjs');
  const { default: soubor } = await import('../src/data/veletrhy-2027.json', { with: { type: 'json' } });
  const den = /^\d{4}-\d{2}-\d{2}$/;
  for (const a of soubor.akce) {
    assert.ok(a.krajKod in krajNames, `${a.id}: neznámý kraj ${a.krajKod}`);
    if (a.start !== null) {
      assert.match(a.start, den, `${a.id}: start ${a.start}`);
      assert.match(a.end ?? a.start, den, `${a.id}: end ${a.end}`);
      assert.ok((a.end ?? a.start) >= a.start, `${a.id}: end ${a.end} před start ${a.start}`);
    }
  }
});
