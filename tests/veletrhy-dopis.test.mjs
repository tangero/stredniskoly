// ============================================================================
// Dopis pořadatelům veletrhů.
//
// Šablona v src/lib/veletrhy-dopis.ts má držet schválený text z
// docs/podklady/dopis-poradatelum-veletrhu.md slovo od slova. Bez testu to
// bylo tvrzení; tady se text vygeneruje ze skutečných dat a porovná
// s podkladem odstavec po odstavci, včetně variant věty o termínu.
//
// Běží pod tsx (test:mesto), protože šablona importuje data přes alias `@/`.
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dopisPoradateli, textDopisu, akceAdresata, ODESILATEL_DOPISU } from '../src/lib/veletrhy-dopis.ts';
import { zobrazitelneAkce, cekajiciAkce } from '../src/lib/veletrhy.ts';

const PODKLAD = readFileSync('docs/podklady/dopis-poradatelum-veletrhu.md', 'utf8');
const KE_DNI = new Date('2026-09-22');
const AKCE = zobrazitelneAkce(KE_DNI);

/** Schválené odstavce dopisu: mezi řádkem s předmětem a druhým oddělovačem. */
function odstavcePodkladu() {
  const telo = PODKLAD.split('\n---\n')[1];
  return telo
    .split(/\n\s*\n/)
    .map((o) => o.trim())
    .filter((o) => o && !o.startsWith('**Předmět:**'))
    // Odrážky jsou v podkladu jeden odstavec, v textové verzi každá zvlášť.
    .flatMap((o) => (o.startsWith('- ') ? o.split('\n') : [o]));
}

/** Text dopisu tak, jak ho čte příjemce bez HTML; adresy bez `https://`, jak je má podklad. */
function textAdresatovi(adresat) {
  return textDopisu(dopisPoradateli(adresat).html).replace(/https:\/\//g, '');
}

function adresat(prepis = {}) {
  const jedna = AKCE.find((a) => !a.online && !a.zdrojJenAgregator && !a.terminPribligny);
  return {
    id: 'zkouska',
    email: 'zkouska@example.cz',
    osloveni: 'Vážená paní ředitelko',
    predmet: jedna.nazev,
    akce: [jedna.id],
    kraj: '/regiony/zkusebni',
    varianta: 'overeno',
    ...prepis,
  };
}

test('dopis s jednou akcí drží schválený text odstavec po odstavci', () => {
  const a = adresat();
  const text = textAdresatovi(a);
  const akce = akceAdresata(a)[0];
  let porovnano = 0;
  for (const odstavec of odstavcePodkladu()) {
    if (odstavec === '{akce}') {
      // Varianta „jedna akce“: název tučně, termín, místo.
      assert.ok(text.includes(`${akce.nazev}, ${akce.datum}, ${akce.mesto}`), 'Řádek akce nese název, termín a město z dat.');
      porovnano++;
      continue;
    }
    const ocekavany = odstavec
      .replace('{osloveni}', a.osloveni)
      .replace('{odkaz_kraj}', `www.prijimackynaskolu.cz${a.kraj}`);
    assert.ok(text.includes(ocekavany), `Odstavec z podkladu v dopise není nebo se liší:\n${ocekavany}`);
    porovnano++;
  }
  assert.ok(porovnano >= 12, `Podklad má mít aspoň 12 odstavců k porovnání, našlo se ${porovnano}.`);
});

test('předmět a odesílatel odpovídají podkladu', () => {
  const a = adresat();
  const { subject, odesilatel } = dopisPoradateli(a);
  assert.equal(subject, `${a.predmet} v přehledu veletrhů na Přijímačky na školu`);
  assert.equal(odesilatel, ODESILATEL_DOPISU);
  assert.match(ODESILATEL_DOPISU, /^Patrick Zandl – Přijímačky na školu <eda@prijimackynaskolu\.cz>$/, 'Podepisuje člověk, odchází z eda@.');
});

test('varianty věty o termínu zní přesně tak, jak je schválil podklad', () => {
  // Citace v podkladu: řádky „> …“ bez tučného nadpisu a bez odrážky.
  const citace = [...PODKLAD.matchAll(/^> ([^*\-].*)$/gm)].map((m) => m[1].trim());
  const zdroj = citace.find((c) => c.includes('{zdroj}'));
  const agregator = citace.find((c) => c.includes('přehledu akcí'));
  const pribligny = citace.find((c) => c.includes('přibližný'));
  assert.ok(zdroj && agregator && pribligny, 'Podklad má tři citované varianty věty o termínu.');

  const sCizimWebem = textAdresatovi(adresat({ varianta: 'overeno', zdrojTerminu: 'SPŠ Ostrov' }));
  assert.ok(sCizimWebem.includes(zdroj.replace('{zdroj}', 'SPŠ Ostrov')), 'Věta o termínu z cizího webu.');
  assert.ok(!sCizimWebem.includes('odkazujeme na vaši stránku'), 'S cizím zdrojem termínu nesmí dopis tvrdit, že odkazujeme na stránku adresáta.');
  assert.ok(!sCizimWebem.includes('ověřili na vašem webu'));

  const zAgregatoru = AKCE.find((a) => a.zdrojJenAgregator);
  assert.ok(zAgregatoru, 'Test počítá s akcí z agregátoru.');
  const textAgregator = textAdresatovi(adresat({ varianta: 'agregator', akce: [zAgregatoru.id], predmet: zAgregatoru.nazev }));
  assert.ok(textAgregator.includes(agregator), 'Věta o neověřeném termínu.');
  assert.ok(!textAgregator.includes('ověřili na vašem webu'));

  const online = AKCE.find((a) => a.online && a.terminPribligny);
  assert.ok(online, 'Test počítá s online akcí s přibližným termínem.');
  const textPribligny = textAdresatovi(adresat({ varianta: 'pribligny', akce: [online.id], predmet: online.nazev }));
  assert.ok(textPribligny.includes(pribligny), 'Věta o přibližném termínu.');
  assert.ok(textPribligny.includes(`${online.datum}, online`), 'Online akce má místo „online“.');
});

test('série akcí jednoho pořadatele má výčet a množné tvary', () => {
  const serie = [...new Map(AKCE.filter((a) => !a.online).map((a) => [a.poradatel, a])).values()]
    .map((prvni) => AKCE.filter((a) => a.poradatel === prvni.poradatel))
    .find((s) => s.length >= 3);
  assert.ok(serie, 'Test počítá s pořadatelem se třemi a více akcemi.');
  const a = adresat({ akce: serie.map((x) => x.id), predmet: 'Zkušební série' });
  const text = textAdresatovi(a);
  assert.ok(text.includes('Jsou v něm i vaše akce „Zkušební série“:'));
  for (const x of serie) assert.ok(text.includes(`- ${x.datum}, ${x.mesto}`), `Výčet nese termín a město akce ${x.id}.`);
  assert.ok(text.includes('U akcí uvádíme vás jako pořadatele a odkazujeme na vaši stránku. Termíny jsme ověřili na vašem webu.'));
  assert.ok(text.includes('online mediálním partnerem akcí'));
  assert.ok(text.includes('My na vaše akce odkazujeme už teď a v přehledu je necháme tak jako tak'));
});

test('neznámá akce nebo akce bez termínu dopis zastaví, nevynechá se potichu', () => {
  assert.throws(() => dopisPoradateli(adresat({ akce: ['neexistuje-2026'] })), /v datech není/);
  // Akce čekající na potvrzení termínu jsou v datech, ale bez `datum`;
  // dopis o nich nesmí odejít s prázdným termínem.
  const bezTerminu = cekajiciAkce().find((a) => !a.datum);
  assert.ok(bezTerminu, 'Test počítá s akcí bez termínu v datech.');
  assert.throws(() => dopisPoradateli(adresat({ akce: [bezTerminu.id] })), /nemá termín/);
});

test('textová verze má odkaz jako adresu jednou, ne dvakrát, a bez značek', () => {
  const html = dopisPoradateli(adresat()).html;
  const text = textDopisu(html);
  // Obecný převod z portálu píše „text: adresa“, což by tu dalo adresu dvakrát za sebou.
  assert.equal((text.match(/https:\/\/www\.prijimackynaskolu\.cz\/veletrhy(?!\/)/g) ?? []).length, 2, 'Odkaz na přehled je v dopise dvakrát (představení a nabídka), ne čtyřikrát.');
  assert.ok(!/(https:\/\/\S+)\s*:\s*\1/.test(text), 'Adresa nesmí být v textu zdvojená „adresa: adresa“.');
  assert.ok(!/<[a-z]/i.test(text), 'V textové verzi nesmí zůstat HTML značky.');
  assert.ok(!text.includes('&'), 'Entity musí být rozepsané.');
  assert.ok(text.startsWith('Vážená paní ředitelko,'), 'Text začíná oslovením, ne prázdnými řádky.');
  assert.ok(text.endsWith('patrick@zandl.cz'), 'Text končí podpisem.');
});

// Varianta bez termínu: akce bez potvrzeného termínu na webu není. Dopis
// o termín prosí a nesmí tvrdit, že akci už vedeme nebo na ni odkazujeme.
const BEZ = {
  id: 'zkouska', email: 'x@example.cz', osloveni: 'Dobrý den', predmet: 'Mozaika středních škol',
  akce: ['mozaika-pelhrimov-2026'], kraj: '/regiony/vysocina', varianta: 'bezTerminu',
};

test('dopis bez termínu prosí o termín a netvrdí, že akci vedeme', () => {
  const { subject, html } = dopisPoradateli(BEZ);
  const text = textDopisu(html);
  assert.ok(text.includes('letošní termín jsme zatím nenašli. Pošlete mi ho prosím'));
  assert.ok(text.includes('Zatím v něm chybí vaše akce'));
  for (const nepravda of ['Je v něm i vaše akce', 'odkazujeme už teď', 'uvádíme vás jako pořadatele']) {
    assert.ok(!text.includes(nepravda), `Dopis bez termínu nesmí tvrdit: „${nepravda}“`);
  }
  assert.ok(!subject.includes('v přehledu'), 'Předmět nesmí tvrdit, že akce v přehledu je.');
});

test('varianta bez termínu u akce s potvrzeným termínem je chyba', () => {
  assert.throws(() => dopisPoradateli({ ...BEZ, akce: ['veletrh-pribram-2026'] }), /termín má/);
});

test('ověřená varianta u akce bez termínu je chyba, ne dopis s prázdným datem', () => {
  assert.throws(() => dopisPoradateli({ ...BEZ, varianta: 'overeno' }), /nemá termín/);
});
