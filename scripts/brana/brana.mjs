// Brána sloučení: rozhodnutí, zda PR smí do main (docs/navrh-rizeni-vyvoje-2027.md, oddíly 4 a 9).
//
// Čistá logika bez sítě: dostane PR, soubory, propojená issues a konfiguraci a vrátí verdikt.
// Data z GitHubu sbírá data.mjs, výsledek zapisuje beh.mjs (workflow) a sloucit.mjs (merge).
//
// Fáze 1: režimy R, L a E se pouštějí samy, K a H2 jen se souhlasem vlastníka. Druhý klíč
// a mechanismy z oddílu 5 přibudou ve fázi 2.

import { createHash } from 'node:crypto';
import { matchesGlob } from 'node:path';
import yaml from 'js-yaml';

export const BOT = 'github-actions[bot]';
export const STITKY_HLASENI = ['bug-report', 'portal-skoly', 'feature-request', 'puvod:hlaseni', 'puvod:email'];

const HODINA = 60 * 60 * 1000;
export const ZDROJ = /^Zdroj:\s*(briefing \d{4}-\d{2}-\d{2}|oprava od školy \d{4}-\d{2}-\d{2}-\d{9}|vlastník)\s*$/im;
const ODKAZ_NA_ISSUE = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?|souvisí s|souvisi s)\s*:?\s*#(\d+)/gi;
const UZAVRENI_ISSUE = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s*#(\d+)/gi;
// Řádek kritéria v těle zadání: „- [ ] K1: …“, „- P2: …“, zrušené „- [ ] ~~K3: …~~“.
const RADEK_KRITERIA = /^\s*[-*]\s+(?:\[[ xX]\]\s+)?(~~)?\s*([KP]\d+(?:\.\d+)*)\s*:/;

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

// Žádost o vyhodnocení před sloučením (sloucit.mjs); běh, který ji obslouží, uvede její číslo v external_id.
export const ZADOST = '<!-- brana:pred-sloucenim -->';

/** Identifikátor kontroly brány: PR, stav lhůty, její počátek (ms) a případně číslo žádosti. */
export function externiId({ pr, stav, od, zadost }) {
  return `brana:v1:pr=${pr}:stav=${stav}:od=${od}${zadost ? `:zadost=${zadost}` : ''}`;
}

export function ctiExterniId(id = '') {
  const m = (id || '').match(/^brana:v1:pr=(\d+):stav=([0-9a-f]{64}):od=(\d+)(?::zadost=(\d+))?$/);
  return m ? { pr: Number(m[1]), stav: m[2], od: Number(m[3]), zadost: m[4] ? Number(m[4]) : null } : null;
}

/** Čísla issues, na která PR odkazuje (Closes #N, Souvisí s #N). */
export function propojenaIssues(telo = '') {
  const cisla = new Set();
  for (const m of (telo || '').matchAll(ODKAZ_NA_ISSUE)) cisla.add(Number(m[1]));
  return [...cisla];
}

/** Čísla issues, která PR uzavírá (Closes #N); etapa se „Souvisí s #N“ mezi nimi není. */
export function uzaviranaIssues(telo = '') {
  const cisla = new Set();
  for (const m of (telo || '').matchAll(UZAVRENI_ISSUE)) cisla.add(Number(m[1]));
  return [...cisla];
}

/**
 * Označení kritérií (K1, K3.1) a protikritérií (P1) z řádků seznamu v těle zadání. Přeškrtnuté
 * kritérium je zrušené a protokol ho neuvádí; označení se nepřečíslovávají.
 */
export function oznaceniKriterii(telo = '') {
  return [...new Set(kriteriaZadani(telo).map((k) => k.oznaceni))];
}

/** Platná kritéria K a P i s textem řádku (bez zaškrtávátka); pro ověřovatele náhledu (#333). */
export function kriteriaZadani(telo = '') {
  const kriteria = [];
  for (const radek of (telo || '').replace(/\r\n?/g, '\n').split('\n')) {
    const m = radek.match(RADEK_KRITERIA);
    if (m && !m[1]) kriteria.push({ oznaceni: m[2], text: radek.replace(/^\s*[-*]\s+(?:\[[ xX]\]\s+)?/, '').trim() });
  }
  return kriteria;
}

/** Označení, pro která protokol nemá řádek. Řádek tabulky nebo seznamu začíná označením. */
export function chybejiciVProtokolu(oznaceni, teloProtokolu = '') {
  return oznaceni.filter((o) => {
    const vzor = new RegExp(`^\\s*(?:\\|\\s*|[-*]\\s+)?${o.replace(/\./g, '\\.')}(?!\\.?\\d)`, 'm');
    return !vzor.test(teloProtokolu);
  });
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

/**
 * Rozhodnutí vlastníka: událost z jeho účtu (`vlastnik` v rezimy.yml). Claude Code pracuje přes
 * tentýž účet a řídí se pravidlem, že `schvaleno` nepřidává (RA35); účty asistenta zadání a dalších
 * botů brána odliší podle autora události.
 */
/** Účet vlastníka nebo asistenta zadání; jen jim brána věří doklad původu, protokol a PR se zadáním. */
export function duveryhodny(login, konfig) {
  return Boolean(login) && (login === konfig.rezimy.vlastnik || login === konfig.rezimy.asistent);
}

export function odVlastnika(udalost, konfig) {
  return Boolean(udalost.aktor) && udalost.aktor === konfig.rezimy.vlastnik;
}

/**
 * Platí `stop`? Události se procházejí postupně a každé veto si pamatuje autora. Odebrání štítku
 * vlastníkem ruší všechna veta, odebrání jiným účtem jen veta, která přidal on sám (oddíl 6: stop smí
 * odebrat jen ten, kdo ho přidal, nebo vlastník). Neodvolané veto platí i bez štítku, takže ho cizí
 * účet nezahladí ani dalším přidáním a odebráním.
 */
export function stopPlati(objekt, konfig) {
  if (objekt.stitky.includes('stop')) return true;
  const veta = [];
  const udalosti = (objekt.udalosti || [])
    .filter((u) => u.stitek === 'stop')
    .sort((a, b) => cas(a.cas) - cas(b.cas));
  for (const u of udalosti) {
    if (u.akce === 'labeled') veta.push(u.aktor);
    else if (u.akce === 'unlabeled') {
      if (odVlastnika(u, konfig)) veta.length = 0;
      else for (let n = veta.length - 1; n >= 0; n--) if (u.aktor && veta[n] === u.aktor) veta.splice(n, 1);
    }
  }
  return veta.length > 0;
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
  if (!odVlastnika(pridani, konfig)) return { platny: false, duvod: `schvaleno přidal účet ${pridani.aktor}, ne vlastník` };
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
 * Záznam při přidání `schvaleno` na issue. Otisk se bere z těla ve schvalovací události (to vlastník
 * viděl), ne z aktuálního API: issue se mohlo změnit, než workflow doběhl. Souhlas platí, jen když se
 * rozsah od přidání `navrh` nezměnil; issue bez otisku návrhu (schválené rovnou) se zaznamená s rozsahem
 * z události. Při změně vrátí `platny: false` a nový otisk návrhu pro rozsah z události, takže opakované
 * přidání `schvaleno` po kontrole potvrdí právě tento rozsah.
 */
export function zaznamSouhlasu(issue, teloUdalosti) {
  const schvaleny = otisk(rozsah(teloUdalosti));
  const navrh = issue.komentare
    .filter((k) => k.autor === BOT && CTENI.otiskNavrhu.test(k.telo))
    .sort((a, b) => cas(b.cas) - cas(a.cas))[0];
  if (navrh && navrh.telo.match(CTENI.otiskNavrhu)[1] !== schvaleny) {
    return { platny: false, znacky: `${ZNACKA.souhlasNeplatny(schvaleny)}\n${ZNACKA.otiskNavrhu(schvaleny)}` };
  }
  return { platny: true, znacky: ZNACKA.souhlas(schvaleny) };
}

/** Souhlas na PR platí pro hlavu, kterou měl PR při přidání `schvaleno`. */
export function souhlasPr(pr, konfig) {
  if (!pr.stitky.includes('schvaleno')) return { platny: false, duvod: 'PR nemá štítek schvaleno' };
  const pridani = posledniUdalost(pr.udalosti, 'labeled', 'schvaleno');
  if (!pridani) return { platny: false, duvod: 'nelze dohledat přidání štítku schvaleno' };
  if (!odVlastnika(pridani, konfig)) return { platny: false, duvod: `schvaleno přidal účet ${pridani.aktor}, ne vlastník` };
  const zaznam = zaznamyBrany(pr.komentare, cas(pridani.cas)).find((k) => CTENI.souhlasPr.test(k.telo));
  if (!zaznam) return { platny: false, duvod: 'souhlas ještě není zaznamenaný (zaznamená ho workflow brány)' };
  if (zaznam.telo.match(CTENI.souhlasPr)[1] !== pr.hlava.sha) {
    return { platny: false, duvod: 'PR se po schválení změnil; schvaleno je třeba odebrat a přidat znovu' };
  }
  return { platny: true };
}

/** Oprávnění a použité secrets workflow; null, když obsah chybí nebo nejde přečíst. */
export function pravaWorkflow(obsah) {
  if (typeof obsah !== 'string') return null;
  let w;
  try {
    w = yaml.load(obsah);
  } catch {
    return null;
  }
  if (!w || typeof w !== 'object') return null;
  const joby = {};
  for (const [id, job] of Object.entries(w.jobs || {})) joby[id] = job?.permissions ?? null;
  const secrets = [...new Set(obsah.match(/secrets\.[A-Za-z0-9_]+/g) || [])].sort();
  return JSON.stringify({ prava: w.permissions ?? null, joby, secrets });
}

/**
 * Mění úprava workflow oprávnění nebo secrets? Nový workflow ano (bez bloku `permissions` dostane
 * výchozí práva tokenu), nečitelný obsah také; smazání ne.
 */
export function meniPravaWorkflow(s) {
  if (!/^\.github\/workflows\//.test(s.nazev) && !/^\.github\/workflows\//.test(s.puvodni || '')) return false;
  if (s.stav === 'removed') return false;
  if (s.stav === 'added') return true;
  const pred = pravaWorkflow(s.obsahPred);
  const po = pravaWorkflow(s.obsahPo);
  return pred === null || po === null || pred !== po;
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
    if (meniPravaWorkflow(s)) h2.add(s.nazev);
    for (const [kategorie, vzory] of Object.entries(r.k || {})) {
      if (cesty(s).some((c) => shoda(c, vzory))) k.add(kategorie);
    }
    if ((s.stav === 'removed' || s.stav === 'renamed') && cesty(s).some((c) => shoda(c, r.stranky))) k.add('adresy');
    for (const [oblast, vzory] of Object.entries(konfig.oblasti)) {
      if (cesty(s).some((c) => shoda(c, vzory))) oblasti.add(oblast);
    }
    if (!shoda(s.nazev, r.testy)) radky += (s.pridano || 0) + (s.odebrano || 0);
    // Přesun stránky do dokumentace web mění: výjimka platí, jen když obě cesty patří mezi bez_preview.
    if (!cesty(s).every((c) => shoda(c, r.bez_preview))) jenBezPreview = false;
  }
  return { h2: [...h2], k: [...k].sort(), oblasti: [...oblasti].sort(), radky, jenBezPreview };
}

/**
 * Poslední protokol z preview pro aktuální hlavu PR (oddíl 11). Repozitář je veřejný, proto se počítá
 * jen protokol od vlastníka, asistenta zadání nebo github-actions[bot]; tělo PR jen u důvěryhodného autora.
 */
/**
 * Automatická obnova dat (RA46): PR bez propojeného zadání od účtu vlastníka nebo automatiky (workflow, GitHub App
 * `automatika` v rezimy.yml, #403), ne z forku, z větve uvedené v `datove_obnovy` v rezimy.yml, který mění jen cesty
 * povolené pro tuto větev. Projde v režimu R bez souhlasu a bez review; CI zůstává povinné. Jinde účet automatiky
 * žádnou důvěru nemá: není vlastník (souhlas, stop), asistent (doklad, review) ani github-actions[bot] (záznamy).
 */
export function datovaObnova(pr, soubory, konfig, issues = []) {
  const obnovy = konfig.rezimy.datove_obnovy || {};
  // Klíč je název větve, nebo vzor (`data/*` pro předání z datové linky, větev `data/<sada>-<období>-<kód>`).
  const klic = Object.keys(obnovy).find((k) => k === pr.vetev || (Boolean(pr.vetev) && matchesGlob(pr.vetev, k)));
  const povolene = klic && obnovy[klic];
  const autor = pr.autor === konfig.rezimy.vlastnik || (Boolean(konfig.rezimy.automatika) && pr.autor === konfig.rezimy.automatika);
  if (!povolene || issues.length || pr.zForku !== false || !autor || !soubory.length) return false;
  return soubory.every((s) => [s.nazev, s.puvodni].filter(Boolean).every((c) => shoda(c, povolene)));
}

// Řádek, který do těla issue píše jen server webu (src/app/api/portal-skoly/route.ts) podle ověřeného přístupu školy.
const KANAL_SKOLY = /^\*\*Kanál:\*\*[ \t]*(ucet|magic-link|kod)[ \t]*$/m;

/**
 * Hlášení nesrovnalosti od školy z portálu (RA52, #461): štítek `portal-skoly`, issue založil web účtem vlastníka
 * a v těle je kanál ověřeného přístupu školy (účet, odkaz na rejstříkovou adresu, přihlašovací kód). Text školy
 * je jen podnět. Bez `schvaleno` smí PR měnit jen soubory s opravami údajů škol (`hlaseni_skol` v rezimy.yml).
 */
export function hlaseniSkoly(issue, konfig) {
  return Boolean(issue) && (issue.stitky || []).includes('portal-skoly') && issue.autor === konfig.rezimy.vlastnik
    && KANAL_SKOLY.test(issue.telo || '');
}

/** Mění PR jen soubory s opravami údajů škol? */
export function jenOpravySkol(soubory, konfig) {
  const povolene = konfig.rezimy.hlaseni_skol || [];
  return soubory.length > 0 && soubory.every((s) => [s.nazev, s.puvodni].filter(Boolean).every((c) => shoda(c, povolene)));
}

/**
 * Issue, které založila automatika repozitáře se štítkem `rutina`: výpadek z hlídání dostupnosti
 * (scripts/provoz/dostupnost.mjs) nebo regrese z ověření v produkci (scripts/brana/overeni-produkce.mjs).
 * Za github-actions[bot] píšou jen workflow tohoto repozitáře, jejichž změna je K nebo H2; doklad „Zdroj:“
 * proto nepotřebuje (#440). Platí jen pro rutinu: přes limit rutiny běží jako drobné zadání (L).
 */
export function zjistilaAutomatika(issue) {
  return issue?.autor === BOT && (issue.stitky || []).includes('rutina');
}

/** Text oddílu `## Pro vlastníka` z popisu PR, prázdný, když oddíl chybí nebo je prázdný. */
export function proVlastnika(telo = '') {
  const m = telo.match(/^##[ \t]+Pro vlastníka[^\n]*\n([\s\S]*?)(?=^##[ \t]|(?![\s\S]))/im);
  return m ? m[1].replace(/<!--[\s\S]*?-->/g, '').trim() : '';
}

export function protokol(pr, konfig, issues = []) {
  const smi = (autor) => autor === BOT || duveryhodny(autor, konfig);
  const kratke = pr.hlava.sha.slice(0, 7);
  // Tělo PR nemá čas úpravy; updated_at je pozdější nebo stejný, tedy opatrnější.
  // Rozhoduje naposledy upravený protokol; jeho text vstupuje do stavu lhůty (stavLhuty).
  const texty = [{ telo: pr.telo || '', cas: pr.upraveno || pr.vytvoreno, autor: pr.autor }, ...pr.komentare.map((k) => ({ ...k, cas: k.upraveno || k.cas }))]
    .filter((t) => smi(t.autor) && /Protokol z preview/i.test(t.telo) && t.telo.includes(kratke))
    .sort((a, b) => cas(b.cas) - cas(a.cas));
  if (!texty.length) return { ok: false, duvod: `chybí protokol z preview pro commit ${kratke}` };
  if (/(^|[^\p{L}])nesplněno/iu.test(texty[0].telo)) return { ok: false, nesplneno: true, duvod: 'protokol z preview obsahuje nesplněné kritérium' };
  // Pokrytí kritérií K a P z uzavíraných zadání; zadání bez označení se posuzují jako dřív.
  const uzavirana = new Set(uzaviranaIssues(pr.telo));
  for (const i of issues.filter((i) => uzavirana.has(i.cislo))) {
    const chybi = chybejiciVProtokolu(oznaceniKriterii(i.telo), texty[0].telo);
    if (chybi.length) return { ok: false, duvod: `protokol z preview neuvádí kritéria z issue #${i.cislo}: ${chybi.join(', ')}` };
  }
  return { ok: true, telo: texty[0].telo };
}

const RADEK_COMMIT = /^[\s>*_]*Commit:[\s*_]*`?([0-9a-f]{7,40})\b/im;
const RADEK_VERDIKT = /^[\s>*_]*Verdikt:[\s*_]*(.*)$/im;

/**
 * Smí komentář platit jako review nebo žádost o opravu z review? Asistent zadání vždy; automatika (App) jen
 * s značkou automatického review z `review.znacka_automatiky` (#455). Značku píše skript workflow Review
 * z main, model ji do textu nedostane (scripts/brana/review.mjs ji z jeho textu odstraní).
 */
export function odRecenzenta(komentar, konfig) {
  const r = konfig.rezimy;
  if (r.asistent && komentar.autor === r.asistent) return true;
  const znacka = r.review?.znacka_automatiky;
  return Boolean(znacka && r.automatika && komentar.autor === r.automatika && (komentar.telo || '').includes(znacka));
}

/**
 * Review asistenta zadání pro aktuální hlavu PR (smyčka review a oprav, #301). Počítá se jen komentář
 * s nadpisem „Review“ od účtu `asistent` (nebo automatické review, `odRecenzenta`) s řádkem `Commit: <sha>`
 * pro hlavu PR; vlastník se nepočítá,
 * protože přes jeho účet pracuje Claude Code, který PR připravil. Rozhoduje naposledy upravené review
 * pro tuto hlavu a projde jen verdikt „Bez P1 a P2“.
 */
export function review(pr, konfig) {
  const kratke = pr.hlava.sha.slice(0, 7);
  const texty = pr.komentare
    .filter((k) => odRecenzenta(k, konfig) && /^#{1,6}\s*Review\b/im.test(k.telo))
    .filter((k) => {
      const m = k.telo.match(RADEK_COMMIT);
      return m && pr.hlava.sha.startsWith(m[1].toLowerCase());
    })
    .map((k) => ({ ...k, cas: k.upraveno || k.cas }))
    .sort((a, b) => cas(b.cas) - cas(a.cas));
  if (!texty.length) return { ok: false, duvod: `chybí review asistenta zadání pro commit ${kratke}` };
  const verdikt = (texty[0].telo.match(RADEK_VERDIKT)?.[1] || '').replace(/[*_`]/g, '').trim();
  if (!/^bez\s+P1\s+a\s+P2\b/i.test(verdikt)) {
    return { ok: false, duvod: `review asistenta zadání pro commit ${kratke} nemá verdikt „Bez P1 a P2“ (${verdikt || 'verdikt chybí'})` };
  }
  // Do stavu lhůty jde i identita a čas review: nové review se stejným textem lhůtu založí znovu.
  return { ok: true, telo: texty[0].telo, stav: JSON.stringify([texty[0].id ?? null, texty[0].cas, texty[0].telo]) };
}

/**
 * Otisk všeho, k čemu se vztahuje lhůta na veto: PR, hlava, rozsahy propojených zadání a protokol.
 * Brána ho ukládá do kontroly (external_id) spolu s časem, odkdy lhůta pro tento stav běží; každá
 * změna (nový push, i dříve vytvořeného commitu; úprava rozsahu; nový nebo upravený protokol) lhůtu
 * založí znovu časem vyhodnocení. Čas commitu ani kontrol jiných PR se nepoužívá.
 */
export function stavLhuty(pr, issues, protokolTelo = '', reviewTelo = '') {
  const rozsahy = issues.map((i) => [i.cislo, otisk(rozsah(i.telo))]).sort((a, b) => a[0] - b[0]);
  // Review vstupuje do otisku, jen když existuje: lhůta L běží od review, stav PR bez něj se nemění.
  return otisk(JSON.stringify({ pr: pr.cislo, sha: pr.hlava.sha, rozsahy, protokol: protokolTelo, ...(reviewTelo ? { review: reviewTelo } : {}) }));
}

/** Zamrznutí z proměnných ZAMRZNUTI_OD a ZAMRZNUTI_DO (RRRR-MM-DD, obě včetně). */
export function zamrznuto(zamrznuti, ted) {
  if (!zamrznuti?.od || !zamrznuti?.do) return false;
  return ted >= cas(`${zamrznuti.od}T00:00:00Z`) && ted < cas(`${zamrznuti.do}T00:00:00Z`) + 24 * HODINA;
}

/**
 * Verdikt brány. Vrací { uspech, rezim, duvody, cekaDo?, stav, lhutaOd, zaznamenat[] }.
 * `predchozi` je { stav, od } z poslední kontroly brány pro tento PR a commit (externiId).
 * `duvody` jsou věty pro souhrn kontroly; při úspěchu popisují, proč PR prošel.
 */
/**
 * Sub-issue patří ke schválenému projektu: rodič je otevřený, má štítek `projekt`, nečeká na rozhodnutí
 * (`navrh`, `zamitnuto`) a má platný souhlas vlastníka nebo doklad „Zdroj:“ od vlastníka či asistenta.
 * Drobný úkol zapsaný z rozhodnutí vlastníka (vlastní doklad) se pak slučuje jako etapa, bez lhůty.
 */
export function schvalenyProjekt(rodic, konfig) {
  if (!rodic || rodic.stav !== 'open' || !rodic.stitky.includes('projekt')) return false;
  if (rodic.stitky.some((s) => s === 'navrh' || s === 'zamitnuto' || STITKY_HLASENI.includes(s))) return false;
  return souhlasIssue(rodic, konfig).platny || (ZDROJ.test(rodic.telo || '') && duveryhodny(rodic.autor, konfig));
}

export function vyhodnot({ pr, soubory, issues, konfig, zamrznuti, ted, predchozi = null }) {
  const r = konfig.rezimy;
  const blokuje = [];
  const info = [];
  const zaznamenat = [];
  const a = rozbor(soubory, konfig);
  const obnova = datovaObnova(pr, soubory, konfig, issues);

  if (stopPlati(pr, konfig)) blokuje.push('PR má štítek stop (nebo ho odebral jiný účet než ten, kdo ho přidal, či vlastník)');
  for (const i of issues) if (stopPlati(i, konfig)) blokuje.push(`issue #${i.cislo} má štítek stop`);
  for (const i of issues) if (i.rodic && stopPlati(i.rodic, konfig)) blokuje.push(`projekt #${i.rodic.cislo} (rodič issue #${i.cislo}) má štítek stop`);
  if (pr.draft) blokuje.push('PR je rozpracovaný (draft)');

  const vRozsahuRutiny = !a.h2.length && !a.k.length && a.radky <= r.rutina_max_radku && a.oblasti.length <= 1;
  if (zamrznuto(zamrznuti, ted)) {
    if (!pr.stitky.includes('incident')) blokuje.push(`zamrznutí ${zamrznuti.od} až ${zamrznuti.do}`);
    else if (!vRozsahuRutiny) blokuje.push('incident při zamrznutí smí měnit jen to, co rutina (bez cest K a H2, v limitu řádků, v jedné oblasti)');
    else info.push('incidentní postup při zamrznutí');
  }

  const sPr = souhlasPr(pr, konfig);
  let protokolTelo = '';
  if (!a.jenBezPreview) {
    const p = protokol(pr, konfig, issues);
    // Protokol z preview se nevyžaduje (RA45): vlastník dostane po nasazení oznámení s adresou
    // (oznameni-nasazeni.mjs). Blokuje jen protokol k aktuální hlavě, který hlásí nesplněné kritérium.
    if (p.ok) protokolTelo = p.telo;
    else if (p.nesplneno) blokuje.push(p.duvod);
    // Vlastník dostane po nasazení oddíl „Pro vlastníka“ do Telegramu; PR se zadáním ho musí mít (RA45).
    if (issues.length && !proVlastnika(pr.telo)) blokuje.push('popis PR nemá oddíl „Pro vlastníka“ (1 až 3 věty, co návštěvník na webu uvidí jinak, a adresa)');
  }

  // Review asistenta zadání (#301): ne u změn bez dopadu na web a ne u PR se souhlasem vlastníka na PR.
  let reviewTelo = '';
  if (r.review?.vyzadovat && !a.jenBezPreview && !sPr.platny && !obnova) {
    const rv = review(pr, konfig);
    if (!rv.ok) blokuje.push(rv.duvod);
    else reviewTelo = rv.stav;
  }
  const stav = stavLhuty(pr, issues, protokolTelo, reviewTelo);
  const lhutaOd = predchozi?.stav === stav ? predchozi.od : ted;

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

  const cizi = !duveryhodny(pr.autor, konfig);
  if (obnova) {
    rezim = 'R';
    info.push(`automatická obnova dat z větve ${pr.vetev}: jen povolené datové cesty, bez souhlasu a review (RA46)`);
  } else if (a.h2.length) {
    rezim = 'H2';
    potrebaSouhlasu(`mění pravomoci AI (${a.h2.join(', ')})`);
  } else if (a.k.length) {
    rezim = 'K';
    if (nekteryIssueSouhlas && !cizi) info.push(`kontrolovaná činnost (${a.k.join(', ')}): souhlas vlastníka na issue`);
    else {
      potrebaSouhlasu(`kontrolovaná činnost (${a.k.join(', ')})`);
      for (const [cislo, s] of souhlasy) if (!sPr.platny) blokuje.push(`souhlas na issue #${cislo} neplatí: ${s.duvod}`);
    }
  } else if (!issues.length) {
    rezim = 'K';
    potrebaSouhlasu('PR bez propojeného zadání');
  } else if (cizi) {
    // Fork, Dependabot, cizí účet: zadání v issue neschvaluje cizí kód.
    rezim = 'K';
    potrebaSouhlasu(`PR od účtu ${pr.autor || 'neznámého'} (ne vlastník ani asistent)`);
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
        if (schvalenyProjekt(i.rodic, konfig)) {
          // Připojení hlášení ke schválenému projektu je rozhodnutí o něm (RA39); práci vymezuje rozsah
          // projektu, text hlášení ji neřídí.
          ri = 'E';
          info.push(`hlášení #${i.cislo} patří ke schválenému projektu #${i.rodic.cislo}`);
        } else if (hlaseniSkoly(i, konfig) && jenOpravySkol(soubory, konfig)) {
          // Rozhodnutí vlastníka 9. 10. 2026 (RA52): hlášení přihlášené školy je oprava od školy.
          ri = vRozsahuRutiny ? 'R' : 'L';
          info.push(`hlášení školy #${i.cislo} z portálu, jen opravy údajů škol (RA52)${ri === 'L' ? '; přesahuje limit rutiny, běží jako drobné zadání' : ''}`);
        } else if (hlaseniSkoly(i, konfig)) {
          ri = 'K';
          blokuje.push(`hlášení školy #${i.cislo}: PR mění i jiné soubory než opravy údajů škol (hlaseni_skol v rezimy.yml), potřebuje schvaleno (${s.duvod})`);
        } else {
          ri = 'K';
          blokuje.push(`issue #${i.cislo} pochází z hlášení; ve fázi 1 potřebuje schvaleno, nebo připojení ke schválenému projektu (${s.duvod})`);
        }
      } else if (zjistilaAutomatika(i)) {
        if (vRozsahuRutiny) ri = 'R';
        else {
          ri = 'L';
          info.push(`oprava z automatického zjištění #${i.cislo} přesahuje limit rutiny, běží jako drobné zadání`);
        }
        if (ri === 'R') info.push(`rutina z automatického zjištění #${i.cislo} (výpadek nebo regrese)`);
      } else if (!ZDROJ.test(i.telo || '')) {
        ri = 'K';
        blokuje.push(`issue #${i.cislo} nemá doklad „Zdroj:“ ani platný souhlas (${s.duvod})`);
      } else if (!duveryhodny(i.autor, konfig)) {
        ri = 'K';
        blokuje.push(`issue #${i.cislo} založil účet ${i.autor || 'neznámý'}; doklad „Zdroj:“ platí jen od vlastníka nebo asistenta (${s.duvod})`);
      } else if (i.stitky.includes('projekt')) ri = 'E';
      else if (schvalenyProjekt(i.rodic, konfig)) {
        ri = 'E';
        info.push(`issue #${i.cislo} je úkol schváleného projektu #${i.rodic.cislo}`);
      }
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
      // Lhůta běží od prvního vyhodnocení brány, které vidělo dnešní stav (stavLhuty).
      cekaDo = lhutaOd + r.lhuta_l_hodin * HODINA;
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
    stav,
    lhutaOd,
    rozbor: a,
    zaznamenat,
  };
}
