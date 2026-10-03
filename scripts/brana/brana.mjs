// Brána sloučení: rozhodnutí, zda PR smí do main (docs/navrh-rizeni-vyvoje-2027.md, oddíly 4 a 9).
//
// Čistá logika bez sítě: dostane PR, soubory, propojená issues a konfiguraci a vrátí verdikt.
// Data z GitHubu sbírá data.mjs, výsledek zapisuje beh.mjs (workflow) a sloucit.mjs (merge).
//
// Fáze 1: režimy R, L a E se pouštějí samy, K a H2 jen se souhlasem vlastníka. Druhý klíč
// a mechanismy z oddílu 5 přibudou ve fázi 2.

import { createHash } from 'node:crypto';
import { matchesGlob } from 'node:path';

export const BOT = 'github-actions[bot]';
export const STITKY_HLASENI = ['bug-report', 'portal-skoly', 'feature-request', 'puvod:hlaseni', 'puvod:email'];

const HODINA = 60 * 60 * 1000;
const ZDROJ = /^Zdroj:\s*(briefing \d{4}-\d{2}-\d{2}|oprava od školy \d{4}-\d{2}-\d{2}-\d{9}|vlastník)\s*$/im;
const ODKAZ_NA_ISSUE = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?|souvisí s|souvisi s)\s*:?\s*#(\d+)/gi;

// Záznamy, které brána sama píše do komentářů (autor BOT). Jinému autorovi nevěří.
export const ZNACKA = {
  otiskNavrhu: (otisk) => `<!-- brana:otisk-navrhu sha256=${otisk} -->`,
  souhlas: (otisk) => `<!-- brana:souhlas sha256=${otisk} -->`,
  souhlasNeplatny: (otisk) => `<!-- brana:souhlas-neplatny sha256=${otisk} -->`,
  souhlasPr: (sha) => `<!-- brana:souhlas-pr sha=${sha} -->`,
};
const CTENI = {
  otiskNavrhu: /<!-- brana:otisk-navrhu sha256=([0-9a-f]{64}) -->/,
  souhlas: /<!-- brana:souhlas sha256=([0-9a-f]{64}) -->/,
  souhlasNeplatny: /<!-- brana:souhlas-neplatny sha256=([0-9a-f]{64}) -->/,
  souhlasPr: /<!-- brana:souhlas-pr sha=([0-9a-f]{40}) -->/,
};

const shoda = (soubor, vzory = []) => vzory.some((vzor) => matchesGlob(soubor, vzor));
const cas = (iso) => Date.parse(iso);

/** Čísla issues, na která PR odkazuje (Closes #N, Souvisí s #N). */
export function propojenaIssues(telo = '') {
  const cisla = new Set();
  for (const m of (telo || '').matchAll(ODKAZ_NA_ISSUE)) cisla.add(Number(m[1]));
  return [...cisla];
}

/** Oddíl „Rozsah“ z těla issue; bez něj celé tělo. Normalizovaný, aby otisk nezávisel na koncích řádků. */
export function rozsah(telo = '') {
  const radky = (telo || '').replace(/\r\n?/g, '\n').split('\n');
  const start = radky.findIndex((r) => /^#{2,3}\s+Rozsah\s*$/i.test(r.trim()));
  let vyber = radky;
  if (start >= 0) {
    const uroven = radky[start].trim().match(/^#+/)[0].length;
    const konec = radky.findIndex((r, i) => i > start && /^#+\s/.test(r) && r.match(/^#+/)[0].length <= uroven);
    vyber = radky.slice(start + 1, konec < 0 ? undefined : konec);
  }
  return vyber.map((r) => r.trimEnd()).join('\n').trim();
}

export const otisk = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

function posledniUdalost(udalosti, akce, stitek) {
  return udalosti
    .filter((u) => u.akce === akce && u.stitek === stitek)
    .reduce((nej, u) => (!nej || cas(u.cas) > cas(nej.cas) ? u : nej), null);
}

function zaznamyBrany(komentare, od) {
  return komentare
    .filter((k) => k.autor === BOT && cas(k.cas) >= od)
    .sort((a, b) => cas(b.cas) - cas(a.cas));
}

/**
 * Platnost souhlasu vlastníka na issue (oddíl 9a): štítek `schvaleno` a záznam brány pořízený
 * při jeho přidání, jehož otisk rozsahu odpovídá dnešnímu tělu.
 */
export function souhlasIssue(issue, konfig) {
  if (!issue.stitky.includes('schvaleno')) return { platny: false, duvod: 'bez štítku schvaleno' };
  const pridani = posledniUdalost(issue.udalosti, 'labeled', 'schvaleno');
  const dnes = otisk(rozsah(issue.telo));
  if (!pridani) return { platny: false, duvod: 'nelze dohledat přidání štítku schvaleno' };
  const T = cas(pridani.cas);
  for (const k of zaznamyBrany(issue.komentare, T)) {
    if (CTENI.souhlasNeplatny.test(k.telo)) {
      return { platny: false, duvod: 'rozsah se změnil mezi návrhem a schválením; schvaleno je třeba přidat znovu' };
    }
    const m = k.telo.match(CTENI.souhlas);
    if (m) {
      return m[1] === dnes
        ? { platny: true }
        : { platny: false, duvod: 'rozsah se po schválení změnil; schvaleno je třeba přidat znovu' };
    }
  }
  if (T < cas(konfig.rezimy.platnost_od)) return { platny: true, zaznamenat: { issue: issue.cislo, otisk: dnes } };
  return { platny: false, duvod: 'souhlas ještě není zaznamenaný (zaznamená ho workflow brány)' };
}

/**
 * Záznam při přidání `schvaleno` na issue: souhlas platí, jen když se rozsah od přidání `navrh`
 * nezměnil. Issue bez otisku návrhu (vlastník ho schválil rovnou) se zaznamená s dnešním rozsahem.
 */
export function zaznamSouhlasu(issue) {
  const dnes = otisk(rozsah(issue.telo));
  const navrh = issue.komentare
    .filter((k) => k.autor === BOT && CTENI.otiskNavrhu.test(k.telo))
    .sort((a, b) => cas(b.cas) - cas(a.cas))[0];
  if (navrh && navrh.telo.match(CTENI.otiskNavrhu)[1] !== dnes) return ZNACKA.souhlasNeplatny(dnes);
  return ZNACKA.souhlas(dnes);
}

/** Souhlas na PR platí pro hlavu, kterou měl PR při přidání `schvaleno`. */
export function souhlasPr(pr) {
  if (!pr.stitky.includes('schvaleno')) return { platny: false, duvod: 'PR nemá štítek schvaleno' };
  const pridani = posledniUdalost(pr.udalosti, 'labeled', 'schvaleno');
  if (!pridani) return { platny: false, duvod: 'nelze dohledat přidání štítku schvaleno' };
  const zaznam = zaznamyBrany(pr.komentare, cas(pridani.cas)).find((k) => CTENI.souhlasPr.test(k.telo));
  if (!zaznam) return { platny: false, duvod: 'souhlas ještě není zaznamenaný (zaznamená ho workflow brány)' };
  if (zaznam.telo.match(CTENI.souhlasPr)[1] !== pr.hlava.sha) {
    return { platny: false, duvod: 'PR se po schválení změnil; schvaleno je třeba odebrat a přidat znovu' };
  }
  return { platny: true };
}

/** Rozdělení změněných souborů podle rezimy.yml a labeler.yml. */
export function rozbor(soubory, konfig) {
  const r = konfig.rezimy;
  const cesty = (s) => [s.nazev, s.puvodni].filter(Boolean);
  const h2 = new Set();
  const k = new Set();
  const oblasti = new Set();
  let radky = 0;
  let jenBezPreview = true;
  for (const s of soubory) {
    if (cesty(s).some((c) => shoda(c, r.h2))) h2.add(s.nazev);
    if (/^\.github\/workflows\//.test(s.nazev) && /^[+-].*(secrets\.|permissions:)/m.test(s.patch || '')) h2.add(s.nazev);
    for (const [kategorie, vzory] of Object.entries(r.k || {})) {
      if (cesty(s).some((c) => shoda(c, vzory))) k.add(kategorie);
    }
    if ((s.stav === 'removed' || s.stav === 'renamed') && cesty(s).some((c) => shoda(c, r.stranky))) k.add('adresy');
    for (const [oblast, vzory] of Object.entries(konfig.oblasti)) {
      if (cesty(s).some((c) => shoda(c, vzory))) oblasti.add(oblast);
    }
    if (!shoda(s.nazev, r.testy)) radky += (s.pridano || 0) + (s.odebrano || 0);
    if (!shoda(s.nazev, r.bez_preview)) jenBezPreview = false;
  }
  return { h2: [...h2], k: [...k].sort(), oblasti: [...oblasti].sort(), radky, jenBezPreview };
}

/** Poslední protokol z preview pro aktuální hlavu PR (oddíl 11). */
export function protokol(pr) {
  const kratke = pr.hlava.sha.slice(0, 7);
  const texty = [{ telo: pr.telo || '', cas: pr.vytvoreno }, ...pr.komentare]
    .filter((t) => /Protokol z preview/i.test(t.telo) && t.telo.includes(kratke))
    .sort((a, b) => cas(b.cas) - cas(a.cas));
  if (!texty.length) return { ok: false, duvod: `chybí protokol z preview pro commit ${kratke}` };
  if (/(^|[^\p{L}])nesplněno/iu.test(texty[0].telo)) return { ok: false, duvod: 'protokol z preview obsahuje nesplněné kritérium' };
  return { ok: true };
}

/** Zamrznutí z proměnných ZAMRZNUTI_OD a ZAMRZNUTI_DO (RRRR-MM-DD, obě včetně). */
export function zamrznuto(zamrznuti, ted) {
  if (!zamrznuti?.od || !zamrznuti?.do) return false;
  return ted >= cas(`${zamrznuti.od}T00:00:00Z`) && ted < cas(`${zamrznuti.do}T00:00:00Z`) + 24 * HODINA;
}

/**
 * Verdikt brány. Vrací { uspech, rezim, duvody, cekaDo?, zaznamenat[] }.
 * `duvody` jsou věty pro souhrn kontroly; při úspěchu popisují, proč PR prošel.
 */
export function vyhodnot({ pr, soubory, issues, konfig, zamrznuti, ted }) {
  const r = konfig.rezimy;
  const blokuje = [];
  const info = [];
  const zaznamenat = [];
  const a = rozbor(soubory, konfig);

  if (pr.stitky.includes('stop')) blokuje.push('PR má štítek stop');
  for (const i of issues) if (i.stitky.includes('stop')) blokuje.push(`issue #${i.cislo} má štítek stop`);
  if (pr.draft) blokuje.push('PR je rozpracovaný (draft)');

  const vRozsahuRutiny = !a.h2.length && !a.k.length && a.radky <= r.rutina_max_radku && a.oblasti.length <= 1;
  if (zamrznuto(zamrznuti, ted)) {
    if (!pr.stitky.includes('incident')) blokuje.push(`zamrznutí ${zamrznuti.od} až ${zamrznuti.do}`);
    else if (!vRozsahuRutiny) blokuje.push('incident při zamrznutí smí měnit jen to, co rutina (bez cest K a H2, v limitu řádků, v jedné oblasti)');
    else info.push('incidentní postup při zamrznutí');
  }

  if (!a.jenBezPreview) {
    const p = protokol(pr);
    if (!p.ok) blokuje.push(p.duvod);
  }

  const sPr = souhlasPr(pr);
  const souhlasy = new Map();
  for (const i of issues) {
    const s = souhlasIssue(i, konfig);
    souhlasy.set(i.cislo, s);
    if (s.zaznamenat) zaznamenat.push(s.zaznamenat);
  }
  const nekteryIssueSouhlas = [...souhlasy.values()].some((s) => s.platny);

  let rezim;
  let cekaDo;
  const potrebaSouhlasu = (proc) => {
    if (sPr.platny) return info.push(`${proc}: souhlas vlastníka na PR`);
    blokuje.push(`${proc}: chybí souhlas vlastníka (${sPr.duvod})`);
  };

  if (a.h2.length) {
    rezim = 'H2';
    potrebaSouhlasu(`mění pravomoci AI (${a.h2.join(', ')})`);
  } else if (a.k.length) {
    rezim = 'K';
    if (nekteryIssueSouhlas) info.push(`kontrolovaná činnost (${a.k.join(', ')}): souhlas vlastníka na issue`);
    else {
      potrebaSouhlasu(`kontrolovaná činnost (${a.k.join(', ')})`);
      for (const [cislo, s] of souhlasy) if (!sPr.platny) blokuje.push(`souhlas na issue #${cislo} neplatí: ${s.duvod}`);
    }
  } else if (!issues.length) {
    rezim = 'K';
    potrebaSouhlasu('PR bez propojeného zadání');
  } else if (sPr.platny) {
    rezim = 'souhlas';
    info.push('souhlas vlastníka na PR');
  } else {
    // Nejpřísnější z propojených issues.
    const poradi = { R: 0, E: 1, souhlas: 1, L: 2, K: 3 };
    rezim = 'R';
    for (const i of issues) {
      const s = souhlasy.get(i.cislo);
      let ri;
      if (s.platny) ri = 'souhlas';
      else if (i.stitky.some((st) => STITKY_HLASENI.includes(st))) {
        ri = 'K';
        blokuje.push(`issue #${i.cislo} pochází z hlášení; ve fázi 1 potřebuje schvaleno (${s.duvod})`);
      } else if (!ZDROJ.test(i.telo || '')) {
        ri = 'K';
        blokuje.push(`issue #${i.cislo} nemá doklad „Zdroj:“ ani platný souhlas (${s.duvod})`);
      } else if (i.stitky.includes('projekt')) ri = 'E';
      else if (i.stitky.includes('rutina') || pr.stitky.includes('rutina')) {
        if (vRozsahuRutiny) ri = 'R';
        else {
          ri = 'L';
          info.push(`rutina přesahuje limit (${a.radky} řádků, oblasti: ${a.oblasti.join(', ') || 'žádná'}), běží jako drobné zadání`);
        }
      } else ri = 'L';
      if (poradi[ri] > poradi[rezim]) rezim = ri;
    }
    if (rezim === 'L') {
      const zmena = Math.max(cas(pr.vytvoreno), cas(pr.hlava.cas));
      cekaDo = zmena + r.lhuta_l_hodin * HODINA;
      if (ted < cekaDo) blokuje.push(`drobné zadání: lhůta na veto běží do ${new Date(cekaDo).toISOString().slice(0, 16).replace('T', ' ')} UTC`);
      else info.push(`drobné zadání: lhůta ${r.lhuta_l_hodin} h uplynula bez stop`);
    } else if (rezim === 'E') info.push('etapa projektu v mandátu');
    else if (rezim === 'R') info.push('rutina z interního zadání');
    else if (rezim === 'souhlas') info.push('souhlas vlastníka na propojeném issue');
  }

  return {
    uspech: blokuje.length === 0,
    rezim,
    duvody: blokuje.length ? blokuje : info,
    cekaDo: blokuje.length && rezim === 'L' ? cekaDo : undefined,
    rozbor: a,
    zaznamenat,
  };
}
