// Stagnace smyčky oprav z review (#327, docs/navrh-rizeni-vyvoje-2027.md, oddíl 9d): když poslední review
// obsahuje nález P1 nebo P2 ve stejném souboru a s textem podobným nálezu z předchozího review (nad 80 %),
// kolo oprav nemá smysl a rozhodnutí se změní na `strop`. Skript jen omezuje, nic nepřidává ani neodebírá
// štítky a neměří nic mimo komentáře PR.
//
//   AKCE=oprava DUVOD="kolo 2 z 5" node scripts/review/stagnace.mjs <pr>   (krok v jobu „Rozhodnutí“)
//
// Výsledek `akce` a `duvod` zapisuje do GITHUB_OUTPUT (beze změny, když nález nestagnuje).

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { vytvorApi, nactiKonfig, REPO } from '../brana/data.mjs';

export const PRAH_PODOBNOSTI = 0.8;
export const DUVOD_STAGNACE = 'opakovaný nález';

const NADPIS = /^#{2,4}\s*(P[12])\b/i;
const DALSI_NADPIS = /^#{1,4}\s+\S/;
const SOUBOR = /`([\w@.\-/\[\]()]+\.[A-Za-z0-9]{1,6}|[\w@.\-/\[\]()]+\/[\w@.\-/\[\]()]+)`/;

/** Normalizovaný text: malá písmena bez diakritiky a bez markdownu, slova delší než 2 znaky. */
function slova(text) {
  return String(text)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/`[^`]*`/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter((s) => s.length > 2);
}

/** Podobnost dvou textů 0 až 1 (Diceův koeficient nad dvojicemi po sobě jdoucích slov). */
export function podobnost(a, b) {
  const dvojice = (t) => {
    const s = slova(t);
    const m = new Map();
    for (let i = 0; i < s.length - 1; i += 1) m.set(`${s[i]} ${s[i + 1]}`, (m.get(`${s[i]} ${s[i + 1]}`) || 0) + 1);
    return { m, n: Math.max(s.length - 1, 0), s };
  };
  const x = dvojice(a);
  const y = dvojice(b);
  if (!x.n || !y.n) return x.s.join(' ') === y.s.join(' ') && x.s.length ? 1 : 0;
  let spolecne = 0;
  for (const [k, v] of x.m) spolecne += Math.min(v, y.m.get(k) || 0);
  return (2 * spolecne) / (x.n + y.n);
}

/** Nálezy P1 a P2 z textu review: odrážky pod nadpisy „P1“ a „P2“; soubor je první cesta v zpětných apostrofech. */
export function nalezy(telo = '') {
  const vysledek = [];
  let zavaznost = null;
  let aktualni = null;
  const uzavri = () => {
    if (aktualni) vysledek.push({ zavaznost, soubor: aktualni.soubor, text: aktualni.radky.join(' ').trim() });
    aktualni = null;
  };
  for (const radek of String(telo).split(/\r?\n/)) {
    const nadpis = radek.match(NADPIS);
    if (nadpis || DALSI_NADPIS.test(radek)) {
      uzavri();
      zavaznost = nadpis ? nadpis[1].toUpperCase() : null;
      continue;
    }
    if (!zavaznost) continue;
    if (/^\s*[-*]\s+/.test(radek)) {
      uzavri();
      aktualni = { soubor: null, radky: [] };
    }
    if (aktualni) {
      aktualni.radky.push(radek.replace(/^\s*[-*]\s+/, '').trim());
      aktualni.soubor ||= radek.match(SOUBOR)?.[1] || null;
    }
  }
  uzavri();
  return vysledek.filter((n) => n.text);
}

/** Je komentář review asistenta zadání (nadpis „Review“ a řádek „Verdikt:“)? */
export function jeReview(komentar, asistent) {
  return komentar.autor === asistent && /^#+\s*Review\b/m.test(komentar.telo || '') && /^Verdikt:/m.test(komentar.telo || '');
}

/**
 * Opakuje poslední review nález z předchozího? Vrací { stagnace, nalez? }. První review nebo review
 * bez P1 a P2 nestagnuje; nález bez souboru se neporovnává (nelze ověřit, že jde o totéž místo).
 */
export function opakovanyNalez(komentare, asistent, prah = PRAH_PODOBNOSTI) {
  const review = komentare.filter((k) => jeReview(k, asistent));
  if (review.length < 2) return { stagnace: false };
  const [predchozi, posledni] = review.slice(-2).map((k) => nalezy(k.telo));
  for (const n of posledni) {
    if (!n.soubor) continue;
    const shoda = predchozi.find((p) => p.soubor === n.soubor && podobnost(p.text, n.text) > prah);
    if (shoda) return { stagnace: true, nalez: { zavaznost: n.zavaznost, soubor: n.soubor } };
  }
  return { stagnace: false };
}

/** Rozhodnutí po kroku „Rozhodnout“: u akce `oprava` ji při opakovaném nálezu změní na `strop`. */
export function rozhodniStagnaci({ akce, duvod }, komentare, asistent) {
  if (akce !== 'oprava') return { akce, duvod };
  const { stagnace, nalez } = opakovanyNalez(komentare, asistent);
  if (!stagnace) return { akce, duvod };
  return { akce: 'strop', duvod: `${DUVOD_STAGNACE} ${nalez.zavaznost} v ${nalez.soubor} ve dvou review po sobě` };
}

async function main() {
  const cislo = Number(process.argv[2]);
  if (!cislo) throw new Error('použití: stagnace.mjs <pr>');
  const api = vytvorApi();
  const konfig = await nactiKonfig(api);
  const komentare = [];
  for (let strana = 1; strana <= 30; strana += 1) {
    const dil = await api(`repos/${REPO}/issues/${cislo}/comments?per_page=100&page=${strana}`);
    komentare.push(...dil.map((k) => ({ autor: k.user?.login, telo: k.body || '' })));
    if (dil.length < 100) break;
  }
  const v = rozhodniStagnaci({ akce: process.env.AKCE, duvod: process.env.DUVOD || '' }, komentare, konfig.rezimy.asistent);
  const radky = Object.entries(v).map(([k, x]) => `${k}=${String(x ?? '').replace(/\r?\n/g, ' ')}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${radky.join('\n')}\n`);
  console.log(radky.join('\n'));
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
