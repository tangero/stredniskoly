// Vyhodnocení přínosu převodu výsledku testu (zadání #328, část 1): o kolik se liší výsledek cvičného
// testu bez převodu a s převodem a u jakého podílu výsledků převod změní skupinu oboru v Simulátoru
// přijímaček (pod pásmem / v pásmu / nad pásmem).
//
// Vstupy jsou jen soubory webu: převodní tabulky (public/prevod_testu_{rok testu}.json) a index pásem
// Simulátoru (public/simulator_pasma_{rok cíle}.json). Skupinu počítá tatáž funkce jako Simulátor.
// Váhy výsledků: rozdělení řešitelů termínu odvozené z percentilů převodní tabulky.
//
//   node --experimental-strip-types scripts/vyhodnoceni-prevodu-testu.mjs
//
// Výstup: docs/podklady/vyhodnoceni-prevodu-testu.json

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { nactiIndexPasem, polohaVuciPasmu } from '../src/lib/poloha-vuci-pasmu.ts';
import { prevedBody } from '../src/lib/prevod-testu-vypocet.ts';

const KOREN = new URL('../', import.meta.url);
const SROVNATELNE = new Set(['pod', 'v', 'nad']);
// Obor „v dosahu“: převedený nebo nepřevedený výsledek leží do 10 bodů od nejnižšího přijatého.
// Stanoveno před výpočtem (docs/vyhodnoceni-prevodu-testu-2027.md, oddíl Pravidlo).
export const DOSAH = 10;

/**
 * Podíl řešitelů s každým výsledkem 0–100 z percentilů se středním pořadím (v %, na 0,1).
 * Střední pořadí P(s) = F(s−1) + f(s)/2, proto f(s) ≈ (P(s+1) − P(s−1)) / 2; rozdíl přes dva body je
 * stabilní vůči zaokrouhlení, zpětné dopočítání po jednom bodu by chybu sčítalo.
 */
export function vahyZPercentilu(percentil) {
  const n = percentil.length;
  const surove = percentil.map((_, s) => {
    const dalsi = s + 1 < n ? percentil[s + 1] : 100;
    const predchozi = s > 0 ? percentil[s - 1] : 0;
    return Math.max(0, (dalsi - predchozi) / 2);
  });
  const soucet = surove.reduce((a, b) => a + b, 0);
  return surove.map((v) => (soucet ? v / soucet : 0));
}

/** Pro jeden druh testu a jednu převodní tabulku: rozdíl bodů a změny skupin, vážené podle řešitelů. */
export function vyhodnotTermin(tabulka, vahy, radky, druh, minPrijatych) {
  let rozdil = 0, rozdilAbs = 0, zmenaVse = 0, zmenaDosah = 0, vahaDosah = 0, aspon5 = 0;
  const priklady = {};
  for (let s = 0; s < tabulka.length; s++) {
    const w = vahy[s];
    const prevedeno = prevedBody(tabulka, s);
    rozdil += w * (prevedeno - s);
    rozdilAbs += w * Math.abs(prevedeno - s);
    if (Math.abs(prevedeno - s) >= 5) aspon5 += w;
    if (s % 10 === 0) priklady[s] = prevedeno;
    let srovnatelnych = 0, zmen = 0, vDosahu = 0, zmenVDosahu = 0;
    for (const r of radky) {
      const a = polohaVuciPasmu(s, r, druh, minPrijatych);
      const b = polohaVuciPasmu(prevedeno, r, druh, minPrijatych);
      if (!SROVNATELNE.has(a.skupina) || !SROVNATELNE.has(b.skupina)) continue;
      srovnatelnych++;
      const jina = a.skupina !== b.skupina;
      if (jina) zmen++;
      if (Math.min(Math.abs(s - r.min_prijaty), Math.abs(prevedeno - r.min_prijaty)) <= DOSAH) {
        vDosahu++;
        if (jina) zmenVDosahu++;
      }
    }
    if (srovnatelnych) zmenaVse += w * (zmen / srovnatelnych);
    if (vDosahu) { zmenaDosah += w * (zmenVDosahu / vDosahu); vahaDosah += w; }
  }
  return {
    prumerny_rozdil: rozdil,
    prumerny_rozdil_abs: rozdilAbs,
    podil_rozdil_aspon_5: aspon5,
    zmena_skupiny_vsechny_obory: zmenaVse,
    zmena_skupiny_obory_v_dosahu: vahaDosah ? zmenaDosah / vahaDosah : null,
    prevedeno_po_10_bodech: priklady,
  };
}

const zaokr = (x) => (x === null ? null : Math.round(x * 1000) / 1000);

export function vyhodnot(prevod, indexPasem) {
  const vysledek = { rok_testu: prevod.rok_testu, rok_pasem: indexPasem.rok, dosah_bodu: DOSAH, druhy: {} };
  for (const [druh, d] of Object.entries(prevod.druhy)) {
    const radky = [...indexPasem.data.values()].filter((r) => r.druh === Number(druh) && r.min_prijaty !== null);
    const terminy = d.terminy.filter((t) => t.spolehlive).map((t) => ({
      klic: t.klic, resitelu: t.resitelu,
      ...vyhodnotTermin(t.celkem.body_cil, vahyZPercentilu(t.celkem.percentil), radky, Number(druh), indexPasem.min_prijatych_pro_hranici),
    }));
    // Termíny se váží stejně: uchazeč si v TAU vybírá test, počet ostrých řešitelů s tím nesouvisí.
    const prumer = (k) => (terminy.every((t) => t[k] !== null) ? zaokr(terminy.reduce((a, t) => a + t[k], 0) / terminy.length) : null);
    vysledek.druhy[druh] = {
      oboru_s_hranici: radky.length,
      prumerny_rozdil: prumer('prumerny_rozdil'),
      prumerny_rozdil_abs: prumer('prumerny_rozdil_abs'),
      podil_rozdil_aspon_5: prumer('podil_rozdil_aspon_5'),
      zmena_skupiny_vsechny_obory: prumer('zmena_skupiny_vsechny_obory'),
      zmena_skupiny_obory_v_dosahu: prumer('zmena_skupiny_obory_v_dosahu'),
      terminy: terminy.map((t) => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, typeof v === 'number' && k !== 'resitelu' ? zaokr(v) : v]))),
    };
  }
  return vysledek;
}

function main() {
  const registr = JSON.parse(fs.readFileSync(new URL('public/stav_datovych_sad.json', KOREN), 'utf8'));
  const rokTestu = registr.sady['cermat-prevod-testu'].zobrazeno.obdobi;
  const prevod = JSON.parse(fs.readFileSync(new URL(`public/prevod_testu_${rokTestu}.json`, KOREN), 'utf8'));
  const index = nactiIndexPasem(JSON.parse(fs.readFileSync(new URL(`public/simulator_pasma_${prevod.rok_cile}.json`, KOREN), 'utf8')));
  const vysledek = vyhodnot(prevod, index);
  const cesta = new URL('docs/podklady/vyhodnoceni-prevodu-testu.json', KOREN);
  fs.writeFileSync(cesta, `${JSON.stringify(vysledek, null, 2)}\n`);
  for (const [druh, d] of Object.entries(vysledek.druhy)) {
    console.log(`druh ${druh}: obory ${d.oboru_s_hranici}, rozdíl ${d.prumerny_rozdil} (|${d.prumerny_rozdil_abs}|), ≥5 bodů ${d.podil_rozdil_aspon_5}, změna skupiny všechny ${d.zmena_skupiny_vsechny_obory}, v dosahu ${d.zmena_skupiny_obory_v_dosahu}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
