// ============================================================================
// Měření shody obor_klic mezi DiPSy a katalogem (docs/review-prototyp-kriteria-prijeti.md).
//
// Odpovídá na dvě otázky, na kterých stojí prototyp kritérií:
//
// 1. Úplnost: vrací DiPSy API pro školu všechny karty? Kontroluje se dvojí
//    cestou — `meta.totalCount` proti délce `data` u každého dotazu a shoda
//    množin oborů proti `public/applications_<rok>.json`, který je pro rok
//    2026 pozemní pravda (CERMAT).
// 2. Stabilita klíče: sedí klíč odvozený z karty DiPSy na klíč odvozený
//    z katalogu? Klíč počítá importovaný `klicOboru` ze src/lib/portal-kriteria.ts,
//    aby existovala jediná implementace.
//
// Pro rok 2027 je výchozím podkladem katalog 2026: měříme právě shodu
// plánovaných oborů s novými kartami. Jiný rok podkladu lze zvolit parametrem.
//
//   node --experimental-strip-types scripts/dipsy-shoda-kliku.mjs
//   node --experimental-strip-types scripts/dipsy-shoda-kliku.mjs --rok 2026 --vse
//   node --experimental-strip-types scripts/dipsy-shoda-kliku.mjs --vystup docs/podklady/x.json
// ============================================================================

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { createHash } from 'crypto';
import { pathToFileURL } from 'url';
import { klicOboru } from '../src/lib/portal-kriteria.ts';

const ROZUMNY_TIMEOUT_MS = 10_000;
const PRODUCTOVKA_MS = 120;

/**
 * Porovná nabídky školy z katalogu s kartami DiPSy. Klíče jsou hashe, proto se
 * k nespárovaným vypisují i jejich složky: u měření mezi ročníky jde jen tak
 * poznat, zda se změnilo IZO, kód, zaměření, forma, nebo délka.
 */
export function porovnejSkolu(redizo, skolniNabidky, karty) {
  // Neúplnou kartu porovnat nejde (klíč by spadl nebo lhal). Vynechá se z obou porovnání,
  // ale vypíše se zvlášť a škola s ní se nepočítá do plné shody.
  const jeUplna = (c) => typeof c?.skolniObor?.kod === 'string' && c.skolniObor.kod !== ''
    && typeof c.skola?.izo === 'string' && c.skola.izo !== ''
    && (c.zamereni == null || typeof c.zamereni === 'string')
    && typeof c.skolniObor.formaStudia === 'string' && Number.isInteger(c.skolniObor.delkaStudia);
  const uplne = karty.filter(jeUplna);
  const katKlice = new Map(skolniNabidky.map((r) => [klicOboru(redizo, r.izo, r.kkov, r.zamereni ?? '', r.forma, r.delka_studia), r]));
  const dipKlice = new Map(uplne
    .map((c) => [klicOboru(redizo, c.skola.izo, c.skolniObor.kod, c.zamereni ?? '', c.skolniObor.formaStudia, c.skolniObor.delkaStudia), c]));
  const spolecne = [...katKlice.keys()].filter((k) => dipKlice.has(k));

  // Srovnávací klíč bez zaměření: zhroutí různá zaměření téhož kódu do jednoho,
  // takže klesající shoda ukazuje, kolik oborů se zaměření rozlišuje.
  const bezZamereni = (izo, kkov, forma, delka) =>
    createHash('sha256').update(JSON.stringify([redizo, izo.replace(/\D/g, ''), kkov.normalize('NFC').trim().toLocaleLowerCase('cs-CZ'), forma.normalize('NFC').trim().toLocaleLowerCase('cs-CZ').replace('formastudia/', ''), delka])).digest('hex');
  const kat2 = new Map(skolniNabidky.map((r) => [bezZamereni(r.izo, r.kkov, r.forma, r.delka_studia), r]));
  const dip2 = new Map(uplne
    .map((c) => [bezZamereni(c.skola.izo, c.skolniObor.kod, c.skolniObor.formaStudia, c.skolniObor.delkaStudia), c]));

  return {
    redizo,
    nabidek: skolniNabidky.length,
    karet: karty.length,
    shoda: spolecne.length,
    shodaBezZamereni: [...kat2.keys()].filter((k) => dip2.has(k)).length,
    jenKatalog: katKlice.size - spolecne.length,
    jenDipsy: dipKlice.size - spolecne.length,
    nesparovaneKatalog: [...katKlice].filter(([k]) => !dipKlice.has(k))
      .map(([, r]) => ({ id: r.id ?? null, izo: r.izo, kkov: r.kkov, zamereni: r.zamereni ?? '', forma: r.forma, delka: r.delka_studia })),
    neuplneKarty: karty.filter((c) => !jeUplna(c))
      .map((c) => ({ id: c?.id ?? null, izo: c?.skola?.izo ?? null, kkov: c?.skolniObor?.kod ?? null, forma: c?.skolniObor?.formaStudia ?? null, delka: c?.skolniObor?.delkaStudia ?? null })),
    nesparovaneDipsy: [...dipKlice].filter(([k]) => !katKlice.has(k))
      .map(([, c]) => ({ izo: c.skola.izo, kkov: c.skolniObor.kod, zamereni: c.zamereni ?? '', forma: c.skolniObor.formaStudia, delka: c.skolniObor.delkaStudia })),
  };
}

/**
 * Odpověď DiPSy bez pole `data` je chyba, ne škola bez karet: jinak by
 * s `totalCount: 0` prošla kontrolou úplnosti jako falešný sirotek.
 */
export function rozborOdpovedi(body) {
  if (!Array.isArray(body?.data)) return { chyba: 'odpověď bez pole data', karty: [], totalCount: null };
  return { karty: body.data, totalCount: body.meta?.totalCount ?? null };
}

/**
 * Kategorie se nepřekrývají. Škola s neúplnou kartou je jen mezi neúplnými:
 * její shodu změřit nejde, takže nepatří ani do plné, částečné, ani nulové shody.
 */
export function poctyShody(vysledky) {
  const neuplne = (v) => (v.neuplneKarty?.length ?? 0) > 0;
  const zmerene = vysledky.filter((v) => v.shoda !== null && v.shoda !== undefined && !neuplne(v));
  return {
    skolSeShodouVsechNabidek: zmerene.filter((v) => v.shoda === v.nabidek).length,
    skolSCastiShodou: zmerene.filter((v) => v.shoda > 0 && v.shoda < v.nabidek).length,
    // Karty má, ale žádný klíč nesedí: u měření mezi ročníky nejzávažnější rozpor.
    skolBezShody: zmerene.filter((v) => v.karet > 0 && v.shoda === 0 && v.nabidek > 0).length,
    skolSNeuplnymiKartami: vysledky.filter(neuplne).length,
  };
}

function argument(nazev, vychozi) {
  const i = process.argv.indexOf(`--${nazev}`);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : vychozi;
}

// Běh měření; import modulu (testy) na DiPSy nesahá.
async function hlavni() {
  const rok = Number(argument('rok', '2026'));
  const podkladRok = Number(argument('podklad-rok', String(rok === 2027 ? 2026 : rok)));
  const vse = process.argv.includes('--vse');
  const pocetNahodnych = Number(argument('vzorek', '40'));
  const vystup = argument('vystup', null);

  const katalogPath = join(process.cwd(), 'public', `applications_${podkladRok}.json`);
  let nabidky;
  try {
    nabidky = JSON.parse(readFileSync(katalogPath, 'utf8'));
  } catch {
    console.error(`Katalog ${katalogPath} neexistuje — porovnání vyžaduje podkladový katalog.`);
    process.exit(1);
  }

  const poSkole = new Map();
  for (const r of nabidky.data) {
    if (!poSkole.has(r.redizo)) poSkole.set(r.redizo, []);
    poSkole.get(r.redizo).push(r);
  }
  const razene = [...poSkole.entries()].sort((a, b) => b[1].length - a[1].length);

  let vzorek;
  if (vse) {
    vzorek = razene;
  } else {
    // Deterministický vzorek: 10 největších škol (kandidáti na truncaci)
    // + N náhodných se stejným seedem, aby byl běh opakovatelný.
    const nejvetsi = razene.slice(0, 10);
    let seed = 42;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    const zbytek = razene.slice(10);
    const nahodne = [];
    for (let i = 0; i < pocetNahodnych && zbytek.length; i++) nahodne.push(zbytek.splice(Math.floor(rnd() * zbytek.length), 1)[0]);
    vzorek = [...nejvetsi, ...nahodne];
  }

  async function dipsy(redizo, kolo) {
    const url = new URL(`https://api.dipsy.gov.cz/v1/skol-oboro-forma/kolo/${kolo}/search/`);
    url.searchParams.set('keywords', redizo);
    url.searchParams.set('skolniRok', String(rok));
    const res = await fetch(url, { signal: AbortSignal.timeout(ROZUMNY_TIMEOUT_MS) });
    if (!res.ok) return { chyba: `HTTP ${res.status}`, karty: [], totalCount: null };
    return rozborOdpovedi(await res.json());
  }

  const vysledky = [];
  const truncations = [];
  const chybyApi = [];
  const bezTotalCount = [];
  let skolBezKaret = 0;
  let hotovo = 0;

  for (const [redizo, skolniNabidky] of vzorek) {
    const kola = await Promise.all([1, 2, 3].map((k) => dipsy(redizo, k).catch((e) => ({ chyba: e.message, karty: [], totalCount: null }))));
    for (let i = 0; i < kola.length; i++) {
      const k = kola[i];
      if (k.chyba) chybyApi.push({ redizo, kolo: i + 1, chyba: k.chyba });
      else if (k.totalCount === null) bezTotalCount.push({ redizo, kolo: i + 1 });
      else if (k.totalCount !== k.karty.length) truncations.push({ redizo, kolo: i + 1, totalCount: k.totalCount, vraceno: k.karty.length });
    }
    if (kola.some((k) => k.chyba || k.totalCount === null || k.totalCount !== k.karty.length)) {
      vysledky.push({ redizo, nabidek: skolniNabidky.length, karet: null, shoda: null, chyba: 'neúplná odpověď DiPSy' });
      hotovo++;
      await new Promise((r) => setTimeout(r, PRODUCTOVKA_MS));
      continue;
    }
    const karty = kola.flatMap((k) => k.karty).filter((c) => c?.reditelstviSkoly?.redizo === redizo && c.skolniRok === rok);
    if (!karty.length) skolBezKaret++;

    vysledky.push(porovnejSkolu(redizo, skolniNabidky, karty));
    hotovo++;
    if (hotovo % 10 === 0) console.error(`  … ${hotovo}/${vzorek.length} škol`);
    await new Promise((r) => setTimeout(r, PRODUCTOVKA_MS));
  }

  const souhrn = {
    skolCelkem: vzorek.length,
    skolBezKaret,
    skolSChybouApi: chybyApi.length ? new Set(chybyApi.map((x) => x.redizo)).size : 0,
    ...poctyShody(vysledky),
    truncations,
    chybyApi,
    bezTotalCount,
  };

  const doklad = {
    merenoAt: new Date().toISOString(),
    skript: 'scripts/dipsy-shoda-kliku.mjs',
    rokKaret: rok,
    rokKatalogu: podkladRok,
    vzorek: vse ? 'všechny školy katalogu' : `10 největších + ${pocetNahodnych} náhodných (seed 42)`,
    zdrojPravdy: `public/applications_${podkladRok}.json`,
    poznamka: rok === podkladRok
      ? 'Klíč počítá klicOboru ze src/lib/portal-kriteria.ts. Jde o shodu v jednom ročníku.'
      : 'Klíč počítá klicOboru ze src/lib/portal-kriteria.ts. Jde o měření mezi ročníky; chybějící nebo změněné nabídky vyžadují kontrolu.',
    souhrn,
    vysledky,
  };

  const cil = vystup ?? join(process.cwd(), 'docs', 'podklady', `dipsy-shoda-kliku-${rok}-vs-${podkladRok}-${new Date().toISOString().slice(0, 10)}.json`);
  mkdirSync(dirname(cil), { recursive: true });
  writeFileSync(cil, JSON.stringify(doklad, null, 1) + '\n');
  console.log(JSON.stringify(souhrn, null, 1));
  console.log(`Doklad: ${cil}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await hlavni();
