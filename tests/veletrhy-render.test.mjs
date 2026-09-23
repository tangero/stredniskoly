// ============================================================================
// Vykreslení seznamu veletrhů.
//
// Oponentura našla, že poznámka u plzeňské akce (všední dny jen pro školní
// výpravy s registrací) se nevykreslila: podmínka ji vázala na příznaky
// nejistoty, které Plzeň nemá. Data byla správně, render mlčel — proto
// testy nad daty nestačí a je potřeba sáhnout na výstup.
//
// Od 23. 9. 2026 je osou stránky kraj: čipy s počty nahoře, oddíl na kraj,
// uvnitř karty podle data s městem jako první řádkou. Filtr měst zmizel —
// 39 ze 40 měst mělo jedinou akci, rozbalovací seznam se 40 položkami
// vedl vždycky na jednu kartu.
// ============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VeletrhySeznam } from '../src/app/veletrhy/VeletrhySeznam.tsx';
import { zobrazitelneAkce, vsechnyKraje } from '../src/lib/veletrhy.ts';
import { akci, cesskyDen } from '../src/lib/veletrhy-pocty.ts';
import { nadpisKraje } from '../src/lib/kraje.mjs';
import { createKrajSlug } from '../src/lib/utils.ts';
import { zavadec, text } from './_zavadec.mjs';

const KE_DNI = new Date('2026-09-22');

function karty(akce) {
  return akce.map((a) => ({
    id: a.id, nazev: a.nazev, poradatel: a.poradatel, mesto: a.mesto, online: a.online,
    krajKod: a.krajKod, misto: a.misto,
    start: a.start, end: a.end ?? a.start, datum: a.datum, cas: a.cas, url: a.url,
    terminPribligny: a.terminPribligny, zdrojJenAgregator: a.zdrojJenAgregator,
    poznamkaTerminu: a.poznamkaTerminu,
  }));
}

function vykresli(akce, kraje = vsechnyKraje()) {
  return renderToStaticMarkup(
    React.createElement(VeletrhySeznam, { akce: karty(akce), kraje, den: cesskyDen(KE_DNI) }),
  );
}

/** Počty po krajích spočítané ručně z dat — nezávislý etalon, ne funkce z lib. */
function pocty(akce) {
  const p = new Map();
  for (const a of akce) p.set(a.krajKod, (p.get(a.krajKod) ?? 0) + 1);
  return p;
}

test('poznámka k termínu se zobrazí i bez příznaku nejistoty', () => {
  const plzen = zobrazitelneAkce(KE_DNI).find((a) => a.id === 'posvit-si-na-budoucnost-plzen-2026');
  assert.ok(plzen, 'Plzeňská akce musí být mezi zobrazitelnými.');
  assert.ok(plzen.poznamkaTerminu, 'Plzeňská akce má nést poznámku o podmínkách vstupu.');
  assert.ok(!plzen.zdrojJenAgregator && !plzen.terminPribligny, 'Plzeň nemá příznak nejistoty — o to tu jde.');

  const html = vykresli([plzen]);
  assert.ok(
    html.includes('registrac'),
    'Poznámka o registraci školních výprav se nevykreslila; čtenář by přijel ve všední den zbytečně.',
  );
});

test('akce z agregátoru nese ve výstupu výstrahu', () => {
  const zAgregatoru = zobrazitelneAkce(KE_DNI).filter((a) => a.zdrojJenAgregator);
  assert.ok(zAgregatoru.length > 0, 'Očekáváme aspoň jednu akci z agregátoru.');

  const html = vykresli(zAgregatoru.slice(0, 1));
  assert.ok(html.includes('neověřený u pořadatele'), 'Výstraha o neověřeném termínu musí být ve výstupu.');
});

test('přibližný termín se ve výstupu označí slovem', () => {
  const pribligne = zobrazitelneAkce(KE_DNI).filter((a) => a.terminPribligny);
  assert.ok(pribligne.length > 0, 'Očekáváme aspoň jednu akci s přibližným termínem.');

  const html = vykresli(pribligne.slice(0, 1));
  assert.ok(html.includes('přibližně'), 'Přibližný termín se musí ve výstupu poznat.');
});

test('každá vykreslená akce vede na stránku pořadatele a říká, kdo pořádá', () => {
  const prvnich = zobrazitelneAkce(KE_DNI).slice(0, 5);
  const html = vykresli(prvnich);
  for (const a of prvnich) {
    assert.ok(html.includes(`Pořádá ${a.poradatel}`), `Karta ${a.id} musí říct, kdo za akci ručí.`);
  }
  assert.ok(html.includes('Stránka akce'), 'Karta musí vést na stránku akce.');
  // Rozhodnutí zadavatele 23. 9. 2026: jméno pořadatele stačí, dovětek
  // „ne tento web“ na každé kartě byl šum.
  assert.ok(!html.includes('ne tento web'), 'Dovětek o tom, kdo akci nepořádá, na kartu nepatří.');
});

test('kraje jsou oddíly s nadpisem, počtem a řádkem měst; město je první řádka karty', () => {
  const vse = zobrazitelneAkce(KE_DNI);
  const html = vykresli(vse);
  const etalon = pocty(vse);
  const kraje = vsechnyKraje();

  for (const k of kraje) {
    const pocet = etalon.get(k.kod) ?? 0;
    const kotva = `id="${createKrajSlug(k.kod, k.nazev)}"`;
    if (pocet === 0) {
      assert.ok(!html.includes(kotva), `Kraj ${k.nazev} bez akcí nemá mít oddíl.`);
      continue;
    }
    assert.ok(html.includes(kotva), `Kraj ${k.nazev} musí mít oddíl s kotvou, aby na něj šlo odkázat ze stránky kraje.`);
    assert.ok(
      text(html).includes(`${nadpisKraje(k.nazev)} ${akci(pocet)}`),
      `Nadpis oddílu ${k.nazev} musí nést počet akcí.`,
    );
  }
  // Pravidlo pro slovo „kraj“: přívlastek za jménem, Vysočina před ním,
  // Praha bez něj. Review PR #162 našlo „Vysočina kraj“.
  assert.ok(text(html).includes('Středočeský kraj '));
  assert.ok(text(html).includes('Kraj Vysočina '), 'Vysočina má slovo kraj před jménem.');
  assert.ok(!text(html).includes('Vysočina kraj'));
  assert.ok(text(html).includes('Hlavní město Praha 1 akce'));
  assert.ok(!text(html).includes('Praha kraj'));

  // Řádek měst jen tam, kde je co rozlišit: Jihočeský má šest měst,
  // kraj s jedinou akcí by řádkem opakoval, co říká karta pod ním.
  const jihocesky = vse.filter((a) => a.krajKod === 'CZ031');
  assert.ok(jihocesky.length > 1);
  const mesta = [...new Set(jihocesky.map((a) => a.mesto))];
  // Řádek měst je šedý odstavec pod nadpisem; město na kartě je jiný prvek
  // (verzálky), proto se hledá i s koncem atributu class.
  assert.ok(html.includes(`text-gray-600">${mesta.join(' · ')}</p>`), 'Města v kraji mají stát v řádku pod nadpisem, v pořadí konání.');
  const praha = vse.filter((a) => a.krajKod === 'CZ010');
  assert.equal(praha.length, 1, 'Test počítá s jedinou pražskou akcí.');
  assert.ok(!vykresli(praha).includes(`text-gray-600">${praha[0].mesto}</p>`), 'U jediné akce by řádek měst jen opakoval kartu.');

  // Online akce se v řádku měst píše stejně jako na kartě — jedno slovo,
  // jedna podoba v jednom bloku.
  const msk = vse.filter((a) => a.krajKod === 'CZ080');
  assert.ok(msk.some((a) => a.online) && msk.length > 1, 'Test počítá s online akcí v kraji, který má i další akci.');
  assert.ok(html.includes('text-gray-600">Online · '), 'Online v řádku měst se píše s velkým O jako na kartě.');
  assert.ok(!html.includes('online · '));

  // Město na kartě předchází názvu akce: čtenář hledá „Vimperk“, ne
  // „Burza škol Vimperk“.
  const vimperk = jihocesky[0];
  const poziceMesta = html.indexOf(`>${vimperk.mesto}</p>`);
  const poziceNazvu = html.indexOf(vimperk.nazev);
  assert.ok(poziceMesta > -1 && poziceMesta < poziceNazvu, 'Město musí být na kartě dřív než název akce.');
});

test('dlaždice u vícedenní akce nese rozsah dnů a má pevnou šířku', () => {
  // V průběhu třídenní akce by první den v tučné dlaždici četl jako „už bylo“.
  const vse = zobrazitelneAkce(KE_DNI);
  const vicedenni = vse.find((a) => a.end && a.end !== a.start && !a.terminPribligny && a.start.slice(0, 7) === a.end.slice(0, 7));
  assert.ok(vicedenni, 'Test počítá s vícedenní akcí v jednom měsíci.');
  const d1 = Number(vicedenni.start.slice(8));
  const d2 = Number(vicedenni.end.slice(8));
  const html = vykresli([vicedenni]);
  assert.ok(html.includes(`leading-none">${d1}–${d2}</span>`), `Dlaždice má nést „${d1}–${d2}“.`);

  const jednodenni = vse.find((a) => (!a.end || a.end === a.start) && !a.terminPribligny);
  const d = Number(jednodenni.start.slice(8));
  assert.ok(vykresli([jednodenni]).includes(`leading-none">${d}</span>`));

  // Šířka je pevná, aby text karet v oddílu začínal na stejné svislici;
  // delší rozsah („~21–30“) dostane menší písmo místo širší dlaždice.
  assert.ok(!html.includes('min-w-14'), 'Dlaždice nesmí růst s délkou textu.');
  assert.match(html, /<time[^>]*class="[^"]*\bw-16\b/);
  const pribl = vse.find((a) => a.terminPribligny && a.end !== a.start);
  assert.ok(pribl, 'Test počítá s přibližnou vícedenní akcí.');
  assert.match(vykresli([pribl]), /class="text-base font-bold leading-none">~\d+–\d+</);
});

test('čipy krajů nesou počty spočítané z dat a filtr měst neexistuje', () => {
  const vse = zobrazitelneAkce(KE_DNI);
  const html = vykresli(vse);
  const etalon = pocty(vse);
  for (const [kod, pocet] of etalon) {
    assert.ok(html.includes(`data-kraj="${kod}" data-pocet="${pocet}"`), `Čip kraje ${kod} s počtem ${pocet}.`);
  }
  assert.equal((html.match(/data-kraj="/g) ?? []).length, etalon.size, 'Čipy jen pro kraje s akcí.');
  assert.ok(html.includes(`>Všechny kraje<span class="rounded-full px-1.5 text-xs font-semibold bg-white/20">${vse.length}</span>`));
  assert.ok(!html.includes('<select'), 'Rozbalovací seznamy zmizely; pokrytí má být vidět bez kliknutí.');
  assert.ok(!html.includes('Všechna města'));
});

test('výhrada neúplnosti stojí u každého kraje s větou, že nahlášení není zveřejnění', () => {
  const vse = zobrazitelneAkce(KE_DNI);
  const html = vykresli(vse);
  // Věta je doslova ta ze slovníku pojmů (pojem „nahlásit akci“): „akci
  // před zveřejněním ověříme na stránce pořadatele“.
  const veta = 'Nahlaste nám ji</a> — před zveřejněním ji ověříme na stránce pořadatele.';
  assert.equal(html.split(veta).length - 1, pocty(vse).size, 'Každý oddíl kraje má vlastní výzvu k nahlášení i s větou ze slovníku pojmů.');
  // Počet se počítá z akcí s potvrzeným termínem; věta musí říct, z jaké
  // množiny je, jinak tvrdí, že o víc akcích nevíme.
  const stredocesky = pocty(vse).get('CZ020');
  assert.ok(html.includes(`Víme jen o těchto ${stredocesky} akcích s potvrzeným termínem.`));
  assert.ok(html.includes('Víme jen o této akci s potvrzeným termínem.'));
});

test('skloňování: 1 akce, 3 akce, 5 akcí; Praha a Vysočina bez přívlastku', () => {
  assert.equal(akci(1), '1 akce');
  assert.equal(akci(3), '3 akce');
  assert.equal(akci(5), '5 akcí');
  assert.equal(nadpisKraje('Středočeský'), 'Středočeský kraj');
  assert.equal(nadpisKraje('Hlavní město Praha'), 'Hlavní město Praha');
  assert.equal(nadpisKraje('Vysočina'), 'Kraj Vysočina');
});

test('počet v kraji se sníží i tehdy, když v něm další akce zůstávají', () => {
  const den = '2026-10-01';
  const vse = zobrazitelneAkce(KE_DNI);
  const html = renderToStaticMarkup(React.createElement(VeletrhySeznam, {
    akce: karty(vse), kraje: vsechnyKraje(), den,
  }));
  const pred = pocty(vse).get('CZ020');
  assert.ok(html.includes(`data-kraj="CZ020" data-pocet="${pred - 1}"`));
  assert.ok(!html.includes(`data-kraj="CZ020" data-pocet="${pred}"`));
});

/**
 * Životní cyklus hooků nad skutečným zdrojem komponenty přes sdílený
 * zavaděč (ES2022, `@/` i `.mjs`). Globály `window`, `document`, `Date`
 * a časovače jsou podstrčené, takže SSR ověřuje HTML po každém efektu.
 * Efekty se sbírají v pořadí zápisu: hodiny, kotva, posun na oddíl.
 */
function sHooky({ ted: pocatek, hash = '' }) {
  const stavy = [];
  const refy = [];
  let index = 0;
  let refIndex = 0;
  const efekty = [];
  let tik;
  let uklizeno = false;
  const cas = { ted: pocatek };
  const posluchace = [];
  const posunuto = [];
  const okno = {
    location: { hash, pathname: '/veletrhy', search: '' },
    addEventListener: (typ, fn) => posluchace.push({ typ, fn }),
    removeEventListener: (typ, fn) => {
      const i = posluchace.findIndex((p) => p.typ === typ && p.fn === fn);
      if (i > -1) posluchace.splice(i, 1);
    },
    history: { replaceState: (_s, _t, url) => { okno.location.hash = url.startsWith('#') ? url : ''; } },
  };
  const react = {
    ...React,
    useState: (pocatek) => {
      const i = index++;
      if (!(i in stavy)) stavy[i] = pocatek;
      return [stavy[i], (hodnota) => { stavy[i] = typeof hodnota === 'function' ? hodnota(stavy[i]) : hodnota; }];
    },
    useRef: (pocatek) => {
      const i = refIndex++;
      if (!(i in refy)) refy[i] = { current: pocatek };
      return refy[i];
    },
    useMemo: (vypocet) => vypocet(),
    useEffect: (fn) => { efekty.push(fn); },
  };
  const { VeletrhySeznam: Komponenta } = zavadec(react, {}, {
    window: okno,
    document: { getElementById: (id) => ({ scrollIntoView: () => posunuto.push(id) }) },
    Date: class extends Date { constructor() { super(cas.ted); } },
    setInterval: (fn, ms) => { assert.equal(ms, 60_000); tik = fn; return 1; },
    clearInterval: (id) => { assert.equal(id, 1); uklizeno = true; },
  })('src/app/veletrhy/VeletrhySeznam.tsx');
  const render = (props) => {
    index = 0;
    refIndex = 0;
    efekty.length = 0;
    return renderToStaticMarkup(React.createElement(Komponenta, props));
  };
  return { render, stavy, efekty, posluchace, posunuto, okno, tik: () => tik(), cas, uklizeno: () => uklizeno };
}

test('starý seznam po půlnoci aktualizuje karty i čipy a zachová viditelný aktivní filtr', () => {
  const h = sHooky({ ted: '2026-09-30T21:59:00Z' });
  const akce = karty(zobrazitelneAkce(KE_DNI).slice(0, 2));
  assert.notEqual(akce[0].krajKod, akce[1].krajKod, 'Test potřebuje dvě akce z různých krajů.');
  const props = { akce, den: '2026-09-30', kraje: vsechnyKraje() };
  const prvni = h.render(props);
  assert.equal(h.efekty.length, 4, 'Komponenta má čtyři efekty: hodiny, zrcadlo stavu, kotvu a posun; další by tenhle test tiše minul.');
  assert.ok(prvni.includes(akce[0].nazev));
  h.cas.ted = '2026-09-30T22:01:00Z';
  assert.equal(h.render(props), prvni, 'Před efektem musí i novější klientský čas zachovat serverový den.');
  h.cas.ted = '2026-09-30T21:59:00Z';
  const uklid = h.efekty[0]();
  assert.equal(h.render(props), prvni, 'Po připojení ve stejný den musí být výstup stejný.');
  h.cas.ted = '2026-09-30T22:01:00Z'; // 1. října v Praze
  h.tik();
  const poPulnoci = h.render(props);
  assert.ok(!poPulnoci.includes(akce[0].nazev));
  assert.ok(!poPulnoci.includes(`data-kraj="${akce[0].krajKod}" data-pocet="1"`), 'Čip kraje bez akcí musí zmizet.');
  assert.ok(poPulnoci.includes(akce[1].nazev));
  // Výběr uskutečněný před půlnocí nesmí zmizet z ovladačů, zatímco filtruje.
  h.stavy[0] = akce[0].krajKod;
  const sVyberem = h.render(props);
  assert.match(sVyberem, new RegExp(`aria-pressed="true"[^>]*data-kraj="${akce[0].krajKod}" data-pocet="0"[^>]*>[^<]*<span[^>]*>\\(bez aktuálních akcí\\)`));
  assert.ok(sVyberem.includes('Zrušit filtr'));
  assert.ok(!sVyberem.includes(akce[1].nazev), 'Filtr na kraj bez akcí nesmí ukázat akce jiného kraje.');
  // Prázdný stav se hlásí jednou, ne dvakrát, a čtenář má kam dál.
  assert.equal(sVyberem.split('Neznamená to, že se žádná nekoná').length - 1, 1);
  assert.ok(sVyberem.includes('Střední školy v kraji'), 'I bez akcí vede odkaz na stránku kraje.');
  assert.ok(sVyberem.includes(`${nadpisKraje(vsechnyKraje().find((k) => k.kod === akce[0].krajKod).nazev)}: teď o žádné akci nevíme.`));
  uklid();
  assert.ok(h.uklizeno());
});

test('výběr kraje ukáže jen jeho oddíl a čip je stisknutý', () => {
  const h = sHooky({ ted: '2026-09-22T10:00:00Z' });
  const vse = zobrazitelneAkce(KE_DNI);
  const props = { akce: karty(vse), den: '2026-09-22', kraje: vsechnyKraje() };
  h.stavy[0] = 'CZ031';
  const html = h.render(props);
  assert.match(html, /aria-pressed="true"[^>]*data-kraj="CZ031"/);
  assert.match(html, /aria-pressed="false"[^>]*data-kraj="CZ020"/);
  const jihoceske = vse.filter((a) => a.krajKod === 'CZ031');
  const ostatni = vse.filter((a) => a.krajKod !== 'CZ031');
  for (const a of jihoceske) assert.ok(html.includes(a.nazev), `Jihočeská akce ${a.id} chybí.`);
  for (const a of ostatni) assert.ok(!html.includes(`>${a.nazev}<`), `Akce jiného kraje ${a.id} se nemá zobrazit.`);
  assert.ok(html.includes('Zobrazen jen Jihočeský kraj.'));
  // Harness překládá do ES2022: řádek měst (spread nad Set) musí být i tady.
  const mesta = [...new Set(jihoceske.map((a) => a.mesto))];
  assert.ok(html.includes(`text-gray-600">${mesta.join(' · ')}</p>`), 'Řádek měst chybí — zavaděč by překládal jiný program než produkce.');
});

test('kotva předvybere kraj a posune na oddíl až po překreslení; cizí kotva výběr nechá být', () => {
  const vse = zobrazitelneAkce(KE_DNI);
  const kraje = vsechnyKraje();
  const props = { akce: karty(vse), den: '2026-09-22', kraje };
  const slug = createKrajSlug('CZ031', kraje.find((k) => k.kod === 'CZ031').nazev);

  const s = sHooky({ ted: '2026-09-22T10:00:00Z', hash: `#${slug}` });
  s.render(props);
  // Mount: React spustí všechny efekty v jednom průchodu ještě se starým
  // stavem (kraj = ''). Posun se proto nesmí odbýt hned — měřil by plný
  // seznam a po zúžení by čtenář skončil u patičky.
  const uklidZrcadla = s.efekty[1]();
  const uklid = s.efekty[2]();
  s.efekty[3]();
  assert.equal(s.stavy[0], 'CZ031', 'Odkaz ze stránky kraje má otevřít přehled s tím krajem vybraným.');
  assert.deepEqual(s.posunuto, [], 'Posun nesmí proběhnout před překreslením — měřil by plný seznam.');
  s.render(props);
  s.efekty[1]();
  s.efekty[3]();
  assert.deepEqual(s.posunuto, [slug], 'Po překreslení se zúženým seznamem se posune na oddíl kraje.');
  s.render(props);
  s.efekty[3]();
  assert.deepEqual(s.posunuto, [slug], 'Posun je jednorázový, ne při každém překreslení.');
  assert.match(s.render(props), /aria-pressed="true"[^>]*data-kraj="CZ031"/);

  // Zpět/vpřed v prohlížeči mění kotvu bez nového načtení; výběr musí jít s ní.
  assert.equal(s.posluchace.filter((p) => p.typ === 'hashchange').length, 1, 'Změna kotvy se má sledovat.');
  const zmena = s.posluchace.find((p) => p.typ === 'hashchange').fn;
  // Cizí kotva (jiný prvek na stránce) výběr neruší.
  s.okno.location.hash = '#co-si-zjistit';
  zmena();
  assert.equal(s.stavy[0], 'CZ031', 'Cizí kotva nesmí smazat zvolený filtr.');
  // Návrat na kotvu už vybraného kraje: stav se nemění, posune se rovnou
  // a nic nezůstane nastražené na příští klik na čip.
  s.okno.location.hash = `#${slug}`;
  zmena();
  assert.deepEqual(s.posunuto, [slug, slug], 'Kotva už vybraného kraje posune hned.');
  s.stavy[0] = '';
  s.render(props);
  s.efekty[3]();
  assert.deepEqual(s.posunuto, [slug, slug], 'Po zrušení výběru nesmí vystřelit starý cíl.');
  s.stavy[0] = 'CZ031';
  // Prázdná adresa výběr ruší.
  s.okno.location.hash = '';
  zmena();
  assert.equal(s.stavy[0], '');
  uklid();
  uklidZrcadla?.();
  assert.equal(s.posluchace.length, 0, 'Po odpojení nesmí posluchač zůstat viset.');

  const cizi = sHooky({ ted: '2026-09-22T10:00:00Z', hash: '#neexistuje' });
  cizi.render(props);
  cizi.efekty[2]();
  assert.equal(cizi.stavy[0], '', 'Neznámá kotva při načtení nic nevybere.');
});

test('kotva na kraj, kterému akce proběhly, ukáže prázdný stav s odkazem na kraj', () => {
  // Šest krajů má jedinou akci; po ní odkaz ze stránky kraje nesmí tiše
  // ukázat celý seznam s kotvou v adrese.
  const vse = zobrazitelneAkce(KE_DNI);
  const kraje = vsechnyKraje();
  const liberecky = kraje.find((k) => k.kod === 'CZ051');
  const slug = createKrajSlug(liberecky.kod, liberecky.nazev);
  const bezLibereckych = vse.filter((a) => a.krajKod !== 'CZ051');
  const s = sHooky({ ted: '2026-09-22T10:00:00Z', hash: `#${slug}` });
  const props = { akce: karty(bezLibereckych), den: '2026-09-22', kraje };
  s.render(props);
  s.efekty[2]();
  assert.equal(s.stavy[0], 'CZ051', 'Známý kraj bez akcí se musí poznat od překlepu.');
  const html = s.render(props);
  assert.ok(html.includes('Liberecký kraj: teď o žádné akci nevíme.'));
  assert.ok(html.includes(`href="/regiony/${slug}"`), 'Odkaz zpět na stránku kraje.');
  assert.ok(!html.includes(bezLibereckych[0].nazev), 'Ostatní kraje se nezobrazí.');
  assert.match(html, /aria-pressed="true"[^>]*data-kraj="CZ051" data-pocet="0"/);
});
