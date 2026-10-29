// Automatické review PR modelem Kimi K3 (#455, docs/navrh-rizeni-vyvoje-2027.md, oddíl 9d): workflow
// review.yml ho spouští pro každou novou hlavu PR. Model jen čte a vrací JSON s nálezy; tento skript z main
// rozhodne, zda se review dělá, ověří výstup modelu a komentáře složí sám (verdikt odvozuje z nálezů).
//
//   node scripts/brana/review.mjs priprav <pr> <složka>        (podklady pro model, výstup smi, sha, predchozi_sha)
//   node scripts/brana/review.mjs radky <diff> [<od sha>]       (mapa změněných řádků z diffu jako JSON na stdout)
//   node scripts/brana/review.mjs over <výstup>                 (exit 0, když je výstup modelu platný)
//   node scripts/brana/review.mjs duvod <surový výstup>         (proč model selhal: limit, predplatne, kroky, jine)
//   node scripts/brana/review.mjs zapis <pr> <sha> <výstup>     (komentář Review a případně @claude)
//
// Blokování (#551, RA53): P1 blokuje vždy. P2 jen s blokující kategorií, důkazem a místem na řádku, který PR
// změnil (u opakovaného review na řádku změněném od posledního review). Ostatní nálezy jsou doporučení.
//
// Výsledek zapisuje do GITHUB_OUTPUT. Konfiguraci čte z main přes API, jako brána.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BOT, odRecenzenta, propojenaIssues } from './brana.mjs';
import { REPO, vytvorApi, nactiKonfig, nactiIssue } from './data.mjs';

export const PRIORITY = ['P1', 'P2', 'P3'];
/** Kategorie nálezu P2, které blokují sloučení (s důkazem a na změněném řádku). */
export const KATEGORIE_BLOKUJICI = ['chovani', 'data', 'text', 'pravidla', 'kriterium', 'bezpecnost'];
export const KATEGORIE = [...KATEGORIE_BLOKUJICI, 'test', 'dokumentace', 'popis-pr', 'robustnost', 'styl'];
const STAVY_PREDCHOZICH = ['vyreseno', 'trva', 'neplati'];
/** Model číslo řádku občas posune; nález do této vzdálenosti od změněného řádku se počítá jako na něm. */
export const TOLERANCE_RADKU = 2;
const ZNACKA_STAVU = /<!-- review:stav ([A-Za-z0-9_-]+) -->/;
const MAX_NALEZU = 20;
const MAX_POPIS = 600;
const RADEK_COMMIT = /^[\s>*_]*Commit:[\s*_]*`?([0-9a-f]{7,40})\b/im;
const NEPODARILO = /^[\s>*_]*Verdikt:[\s*_]*Review se nepodařilo/im;

/**
 * Dělat review této hlavy? Jen otevřený PR mimo draft, ne z forku, od vlastníka, asistenta nebo automatiky,
 * a jen když k hlavě ještě není povedené automatické review (opakovaný běh pro tutéž hlavu nic nepřidá). `znovu`
 * (ruční spuštění workflow) review udělá i tak, například po falešném nálezu.
 * `pr` je ve tvaru z GitHub API (pulls/N), `komentare` ve tvaru z data.mjs.
 */
export function smiReview({ pr, komentare = [], konfig, znovu = false }) {
  const r = konfig.rezimy;
  const ne = (duvod) => ({ ok: false, duvod });
  if (pr.state !== 'open') return ne('PR není otevřený');
  if (pr.draft) return ne('PR je draft');
  if (!pr.head?.repo?.full_name || pr.head.repo.full_name !== pr.base?.repo?.full_name) return ne('PR je z forku');
  const autor = pr.user?.login;
  if (![r.vlastnik, r.asistent, r.automatika].filter(Boolean).includes(autor)) return ne(`PR založil účet ${autor || 'neznámý'}`);
  const sha = pr.head.sha;
  // Nepovedené review hlavu neuzavírá: ruční spuštění, které komentář o selhání doporučuje, musí proběhnout.
  const hotovo = !znovu && komentare.some((k) => odRecenzenta(k, konfig) && k.autor === r.automatika
    && /^#{1,6}\s*Review\b/im.test(k.telo || '') && !NEPODARILO.test(k.telo || '')
    && sha.startsWith((k.telo.match(RADEK_COMMIT)?.[1] || '-').toLowerCase()));
  if (hotovo) return ne(`review k hlavě ${sha.slice(0, 7)} už existuje`);
  return { ok: true, duvod: `review hlavy ${sha.slice(0, 7)}` };
}

/**
 * Text od modelu do komentáře: jeden řádek, bez HTML komentářů (značka review, záznamy brány), bez zmínek
 * účtů (`@claude` v review by spustil opravu mimo stanovený komentář) a v rozumné délce.
 */
export function bezpecnyText(text, max = MAX_POPIS) {
  const t = String(text ?? '')
    .replace(/<!--[\s\S]*?(-->|$)/g, ' ')
    .replace(/[<>]/g, (z) => (z === '<' ? '‹' : '›'))
    .replace(/@/g, '@​')
    .replace(/`{3,}/g, '`')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * Výstup modelu → { shrnuti, nalezy } nebo null. Model má vrátit jen JSON (případně v bloku ```json).
 * Neplatný tvar, neznámá priorita nebo chybějící popis znamenají neplatný výstup celý: review bez verdiktu
 * „Bez P1 a P2“ je bezpečnější než review, které nálezy potichu ztratí.
 */
export function nactiVystup(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  const blok = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? text;
  const od = blok.indexOf('{');
  const po = blok.lastIndexOf('}');
  if (od < 0 || po < od) return null;
  let data;
  try {
    data = JSON.parse(blok.slice(od, po + 1));
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || !Array.isArray(data.nalezy) || typeof data.shrnuti !== 'string') return null;
  const nalezy = [];
  for (const n of data.nalezy) {
    if (!n || !PRIORITY.includes(n.priorita) || typeof n.popis !== 'string' || !n.popis.trim()) return null;
    const radek = Number.isInteger(n.radek) && n.radek > 0 ? n.radek : null;
    // Starý tvar bez kategorie a důkazu je platný (#551); takový nález P2 jen neblokuje.
    const kategorie = KATEGORIE.includes(n.kategorie) ? n.kategorie : '';
    const dukaz = typeof n.dukaz === 'string' ? n.dukaz.trim() : '';
    nalezy.push({ priorita: n.priorita, kategorie, soubor: typeof n.soubor === 'string' ? n.soubor : '', radek, popis: n.popis, dukaz });
  }
  // Stavy předchozích nálezů u opakovaného review; neplatné položky se vynechají (nález pak trvá).
  const predchozi = (Array.isArray(data.predchozi) ? data.predchozi : [])
    .filter((p) => p && typeof p.id === 'string' && STAVY_PREDCHOZICH.includes(p.stav))
    .map((p) => ({ id: p.id, stav: p.stav, dukaz: typeof p.dukaz === 'string' ? p.dukaz.trim() : '' }));
  return { shrnuti: data.shrnuti, nalezy, predchozi };
}

/**
 * Změněné řádky z diffu (unified, i s kontextem): { soubor: [[od, do], …] } s čísly řádků v novém souboru.
 * Počítají se jen přidané a změněné řádky („+“); smazaný soubor nemá žádné.
 */
export function zmeneneRadky(patch = '') {
  const mapa = {};
  let soubor = null;
  let radek = 0;
  let predchozi = '';
  for (const r of String(patch).split('\n')) {
    const hlavicka = predchozi.startsWith('--- ') && !radek;
    predchozi = r;
    if (r.startsWith('diff --git ')) { soubor = null; radek = 0; continue; }
    // „+++ “ je hlavička jen hned po „--- “ před prvním hunkem; jinak je to přidaný řádek začínající „++ “.
    if (hlavicka && r.startsWith('+++ ')) {
      const cesta = r.slice(4).replace(/\t.*$/, '');
      soubor = cesta === '/dev/null' ? null : cesta.replace(/^b\//, '');
      continue;
    }
    if (!radek && r.startsWith('--- ')) continue;
    const hunk = r.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) { radek = Number(hunk[1]); continue; }
    if (!soubor || !radek) continue;
    if (r.startsWith('+')) {
      const useky = (mapa[soubor] ||= []);
      const posledni = useky[useky.length - 1];
      if (posledni && posledni[1] === radek - 1) posledni[1] = radek;
      else useky.push([radek, radek]);
      radek += 1;
    } else if (r.startsWith(' ')) radek += 1;
  }
  return mapa;
}

/** Cesta od modelu bez předpon pracovní složky (`./`, `.review/kod/`). */
const cestaNalezu = (s) => String(s || '').trim().replace(/^\.\//, '').replace(/^\.review\/kod\//, '');

/** Leží nález na změněném řádku (s tolerancí TOLERANCE_RADKU)? */
export function naZmenenemRadku(nalez, mapa) {
  const useky = mapa?.[cestaNalezu(nalez.soubor)];
  if (!useky || !nalez.radek) return false;
  return useky.some(([od, po]) => nalez.radek >= od - TOLERANCE_RADKU && nalez.radek <= po + TOLERANCE_RADKU);
}

/**
 * Blokuje nález sloučení? P1 vždy. P2 jen s blokující kategorií, neprázdným důkazem a na změněném řádku
 * (`radky`, a u opakovaného review navíc `radkyOd`, tedy řádky změněné od posledního review). Bez mapy
 * řádků (chybí podklad) se místo neověřuje a rozhodují kategorie a důkaz: radši přísněji než nic.
 */
export function blokuje(nalez, { radky = null, radkyOd = null } = {}) {
  if (nalez.priorita === 'P1') return true;
  if (nalez.priorita !== 'P2') return false;
  if (!KATEGORIE_BLOKUJICI.includes(nalez.kategorie) || !nalez.dukaz) return false;
  if (radky && !naZmenenemRadku(nalez, radky)) return false;
  if (radkyOd && !naZmenenemRadku(nalez, radkyOd)) return false;
  return true;
}

/** Stav review uložený skriptem v komentáři (`<!-- review:stav … -->`), nebo null. */
export function ctiStav(telo = '') {
  const m = String(telo).match(ZNACKA_STAVU);
  if (!m) return null;
  try {
    const s = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8'));
    return s && typeof s === 'object' && /^[0-9a-f]{40}$/.test(s.sha || '') ? s : null;
  } catch {
    return null;
  }
}

export const zapisStav = (stav) => `<!-- review:stav ${Buffer.from(JSON.stringify(stav)).toString('base64url')} -->`;

/**
 * Poslední platné automatické review PR (jiné hlavy než `sha`) se stavem, nebo null. Počítá jen komentáře
 * účtu `automatika` se značkou review; stav z jiného komentáře by šel podvrhnout.
 */
export function posledniStav(komentare = [], konfig, sha = '') {
  const r = konfig.rezimy;
  const znacka = r.review?.znacka_automatiky;
  for (const k of [...komentare].reverse()) {
    if (k.autor !== r.automatika || !znacka || !(k.telo || '').includes(znacka) || NEPODARILO.test(k.telo || '')) continue;
    const s = ctiStav(k.telo);
    if (s && s.sha !== sha) return s;
  }
  return null;
}

/**
 * Vyhodnocení výstupu modelu: nové nálezy s příznakem `blokuje` a id, předchozí blokující nálezy se stavem
 * (bez stavu od modelu trvají) a seznam blokujících. `predchozi` je stav posledního review, když je review
 * opakované (bez něj nebo bez `radkyOd` se posuzuje celý PR).
 */
export function vyhodnot(vystup, { radky = null, radkyOd = null, predchozi = null } = {}) {
  const opakovane = Boolean(predchozi && radkyOd);
  const stavy = new Map((vystup?.predchozi || []).map((p) => [p.id, p]));
  const minule = opakovane ? (predchozi.nalezy || []).filter((n) => n.blokuje).map((n) => {
    const s = stavy.get(n.id);
    const stav = s?.stav || 'trva';
    return { ...n, stav, dukazStavu: s?.dukaz || '', blokuje: stav === 'trva' };
  }) : [];
  let dalsi = Math.max(0, ...(predchozi?.nalezy || []).map((n) => Number(String(n.id).slice(1)) || 0));
  const nove = (vystup?.nalezy || []).map((n) => ({ ...n, id: `N${++dalsi}`, blokuje: blokuje(n, { radky, radkyOd: opakovane ? radkyOd : null }) }));
  return { opakovane, nove, minule, blokujici: [...minule.filter((n) => n.blokuje), ...nove.filter((n) => n.blokuje)] };
}

const misto = (n) => (n.soubor ? `\`${bezpecnyText(n.soubor, 200).replace(/`/g, '')}${n.radek ? `:${n.radek}` : ''}\`` : 'celý PR');

/**
 * Proč běh modelu selhal, ze surového JSON výstupu Claude Code: `limit` (vyčerpaný limit předplatného, další
 * pokus hned nepomůže), `predplatne` (předplatné nemá přístup), `kroky` (vyčerpané kroky), jinak `jine`.
 * Vrací jen jedno z těchto slov, text chyby do komentáře nejde.
 */
export function duvodSelhani(surovy = '') {
  let data = {};
  try {
    data = JSON.parse(surovy);
  } catch {
    data = { result: String(surovy) };
  }
  const text = `${typeof data.result === 'string' ? data.result : ''} ${data.subtype || ''}`;
  if (/usage limit|quota|rate limit|\b429\b/i.test(text)) return 'limit';
  if (/does not have access|subscription|upgrade your plan/i.test(text)) return 'predplatne';
  if (/error_max_turns/.test(text)) return 'kroky';
  return 'jine';
}

export const DUVODY_SELHANI = {
  limit: 'vyčerpaný limit předplatného Kimi; review spusť znovu po obnovení limitu (Actions → Review → Run workflow s číslem PR)',
  predplatne: 'předplatné Kimi teď nemá přístup ke Kimi Code; je třeba zkontrolovat předplatné vlastníka',
  kroky: 'model vyčerpal povolený počet kroků',
  neplatny: 'model ani na třetí pokus nevrátil platný JSON',
  jine: 'výstup modelu chybí nebo je neplatný',
};

const radekNalezu = (n) => `- **${n.priorita}**${n.kategorie ? ` (${n.kategorie})` : ''} ${misto(n)}: ${bezpecnyText(n.popis)}${n.dukaz ? ` Důkaz: ${bezpecnyText(n.dukaz, 300)}` : ''}`;
const podlePriority = (a, b) => PRIORITY.indexOf(a.priorita) - PRIORITY.indexOf(b.priorita);
const STAV_TEXT = { trva: 'trvá', vyreseno: 'vyřešeno', neplati: 'neplatí (zdůvodnění obstálo)' };

/**
 * Komentář „## Review“ ve tvaru, který čte brána. Verdikt skládá skript, ne model, a jen z blokujících
 * nálezů (`vyhodnot`); ostatní jsou pod „Doporučení (neblokuje)“. `kontext` dává mapy změněných řádků,
 * stav předchozího review a počet řádků PR; na konec komentáře se uloží nový stav pro další review.
 */
export function slozReview({ vystup, sha, znacka, model, kontext = {}, duvod = 'jine' }) {
  const kratke = sha.slice(0, 7);
  const paticka = `\n---\n_Automatické review modelem ${model} (workflow Review, #455). Značku a verdikt píše skript, model jen nálezy; blokují jen doložené nálezy na změněných řádcích (#551)._\n${znacka}`;
  if (!vystup) {
    const proc = Object.hasOwn(DUVODY_SELHANI, duvod) ? DUVODY_SELHANI[duvod] : DUVODY_SELHANI.jine;
    return `## Review\n\nVerdikt: Review se nepodařilo (${proc})\nCommit: ${kratke}\n\nBrána PR bez review „Bez P1 a P2“ nepustí. Nové review spustí další commit, ruční spuštění workflow Review, nebo \`schvaleno\` vlastníka přímo na PR. Nepovedené review se nepočítá do kol oprav.\n${paticka}`;
  }
  const h = vyhodnot(vystup, kontext);
  const verdikt = h.blokujici.length ? `Nálezy k opravě (${h.blokujici.map((n) => n.priorita).join(', ')})` : 'Bez P1 a P2';
  const casti = [];
  if (h.minule.length) casti.push(`### Předchozí nálezy\n\n${h.minule.map((n) => `- ${n.id} **${n.priorita}** ${misto(n)}: ${STAV_TEXT[n.stav]}${n.dukazStavu ? `. ${bezpecnyText(n.dukazStavu, 300)}` : ''}`).join('\n')}`);
  const blok = h.nove.filter((n) => n.blokuje).sort(podlePriority);
  const doporuceni = h.nove.filter((n) => !n.blokuje).sort(podlePriority);
  const vypis = (seznam) => seznam.slice(0, MAX_NALEZU).map(radekNalezu).join('\n') + (seznam.length > MAX_NALEZU ? `\n- … a dalších ${seznam.length - MAX_NALEZU} nálezů` : '');
  if (blok.length) casti.push(`### Nálezy\n\n${vypis(blok)}`);
  if (doporuceni.length) casti.push(`### Doporučení (neblokuje)\n\nNález bez blokující kategorie, bez důkazu nebo mimo změněné řádky${h.opakovane ? ' od posledního review' : ''}.\n\n${vypis(doporuceni)}`);
  if (!casti.length) casti.push('Bez nálezů.');
  const poznamka = kontext.predchozi && !h.opakovane ? '\n\n_Předchozí review se nedalo navázat (commit nedostupný), review posoudilo celý PR._' : '';
  const stav = zapisStav({
    sha,
    prvni_sha: kontext.predchozi?.prvni_sha || sha,
    prvni_radky: kontext.predchozi?.prvni_radky ?? kontext.pocetRadku ?? null,
    radky: kontext.pocetRadku ?? null,
    nalezy: h.blokujici.map((n) => ({ id: n.id, priorita: n.priorita, kategorie: n.kategorie, soubor: bezpecnyText(cestaNalezu(n.soubor), 200), radek: n.radek, blokuje: true, popis: bezpecnyText(n.popis, 300) })),
  });
  return `## Review\n\nVerdikt: ${verdikt}\nCommit: ${kratke}\n\n${bezpecnyText(vystup.shrnuti, 1200)}${poznamka}\n\n${casti.join('\n\n')}\n${paticka}\n${stav}`;
}

/**
 * Žádost o opravu pro workflow Oprava z review, se značkou (bez ní ji smyčka nevezme). Jen když je co blokuje;
 * u prvního review přidá doporučení jako nepovinná, u opakovaného jen blokující nálezy (#551).
 */
export function slozOpravu({ vystup, sha, znacka, kontext = {} }) {
  const h = vyhodnot(vystup, kontext);
  if (!h.blokujici.length) return null;
  const seznam = h.blokujici.slice(0, MAX_NALEZU).map((n) => (n.stav ? `- ${n.id} **${n.priorita}** ${misto(n)}: ${bezpecnyText(n.popis || '')} (trvá z předchozího review)` : radekNalezu(n)));
  const nepovinne = h.opakovane ? [] : h.nove.filter((n) => !n.blokuje && n.priorita === 'P2').slice(0, MAX_NALEZU).map(radekNalezu);
  const doporuceni = nepovinne.length ? `\n\nNepovinně, pokud oprava zabere do 20 řádků (jinak napiš proč ne):\n\n${nepovinne.join('\n')}` : '';
  return `@claude Oprav prosím nálezy z automatického review ke commitu ${sha.slice(0, 7)}:\n\n${seznam.join('\n')}${doporuceni}\n\nNález, který podle pravidel projektu nebo zadání není chyba, neopravuj a napiš proč.\n\n${znacka}`;
}

function vystupGh(hodnoty) {
  const radky = Object.entries(hodnoty).map(([k, v]) => `${k}=${String(v ?? '').replace(/\r?\n/g, ' ')}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${radky.join('\n')}\n`);
  console.log(radky.join('\n'));
}

const komentareApi = async (api, cislo) => {
  const vse = [];
  for (let strana = 1; ; strana++) {
    const davka = await api(`repos/${REPO}/issues/${cislo}/comments?per_page=100&page=${strana}`);
    vse.push(...davka.map((k) => ({ id: k.id, autor: k.user?.login, telo: k.body || '' })));
    if (davka.length < 100) return vse;
  }
};

async function priprav(api, cislo, slozka) {
  const konfig = await nactiKonfig(api);
  const pr = await api(`repos/${REPO}/pulls/${cislo}`);
  const znovu = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
  const komentare = await komentareApi(api, cislo);
  const rozhodnuti = smiReview({ pr, komentare, konfig, znovu });
  if (!rozhodnuti.ok) return vystupGh({ smi: false, duvod: rozhodnuti.duvod, sha: pr.head?.sha });
  // Podklady pro model: popis PR a propojená zadání jako text. Diff a strom hlavy připraví workflow.
  const zadani = [];
  for (const n of propojenaIssues(pr.body || '')) {
    const i = await nactiIssue(api, n, { sRodicem: false });
    if (i) zadani.push(`## Zadání #${n}\n\n${i.telo || ''}`);
  }
  fs.mkdirSync(slozka, { recursive: true });
  fs.writeFileSync(path.join(slozka, 'pr.md'),
    `# PR #${cislo}: ${pr.title}\n\nVětev: ${pr.head.ref}\nHlava: ${pr.head.sha}\n\n${pr.body || ''}\n\n${zadani.join('\n\n') || 'PR nemá propojené zadání.'}\n`);
  // Opakované review (#551): předchozí blokující nálezy a odpovědi pod nimi. Diff od posledního review
  // připraví workflow; když commit nenajde, review posoudí celý PR.
  const predchozi = podkladPredchozich(komentare, konfig, pr.head.sha);
  if (predchozi) fs.writeFileSync(path.join(slozka, 'predchozi.json'), `${JSON.stringify(predchozi, null, 2)}\n`);
  vystupGh({ smi: true, duvod: rozhodnuti.duvod, sha: pr.head.sha, predchozi_sha: predchozi?.sha || '' });
}

/** Podklad pro model u opakovaného review: nálezy posledního review a komentáře vlastníka, asistenta a workflow po něm. */
export function podkladPredchozich(komentare, konfig, sha) {
  const stav = posledniStav(komentare, konfig, sha);
  if (!stav) return null;
  const r = konfig.rezimy;
  const index = komentare.findLastIndex((k) => ctiStav(k.telo)?.sha === stav.sha);
  const odpovedi = komentare.slice(index + 1)
    .filter((k) => [r.vlastnik, r.asistent, BOT].includes(k.autor) && !ZNACKA_STAVU.test(k.telo || ''))
    .slice(-10)
    .map((k) => ({ autor: k.autor, text: String(k.telo || '').slice(0, 4000) }));
  return { sha: stav.sha, nalezy: stav.nalezy || [], odpovedi };
}

async function zapis(api, cislo, sha, soubor) {
  const konfig = await nactiKonfig(api);
  const znacka = konfig.rezimy.review?.znacka_automatiky;
  if (!znacka) throw new Error('v rezimy.yml chybí review.znacka_automatiky');
  const pr = await api(`repos/${REPO}/pulls/${cislo}`);
  // Hlava se mezitím změnila: review staré hlavy by brána stejně nepočítala, novou udělá další běh.
  if (pr.head.sha !== sha) return vystupGh({ zapsano: false, duvod: `hlava se změnila na ${pr.head.sha.slice(0, 7)}` });
  const text = fs.existsSync(soubor) ? fs.readFileSync(soubor, 'utf8') : '';
  const vystup = nactiVystup(text);
  const model = process.env.KIMI_MODEL || 'Kimi K3';
  const kontext = kontextZapisu({ slozka: path.dirname(soubor), komentare: await komentareApi(api, cislo), konfig, pr });
  const duvod = (() => {
    try {
      return fs.readFileSync(path.join(path.dirname(soubor), 'duvod.txt'), 'utf8').trim();
    } catch {
      return text.trim() ? 'neplatny' : 'jine';
    }
  })();
  await api(`repos/${REPO}/issues/${cislo}/comments`, { method: 'POST', body: { body: slozReview({ vystup, sha, znacka, model, kontext, duvod }) } });
  // Schválený PR (#551): oprava by pushla nový commit a souhlas vlastníka, vázaný na hlavu, by propadl.
  const schvaleny = (pr.labels || []).some((l) => l.name === 'schvaleno');
  const oprava = vystup && !schvaleny ? slozOpravu({ vystup, sha, znacka, kontext }) : null;
  if (oprava) await api(`repos/${REPO}/issues/${cislo}/comments`, { method: 'POST', body: { body: oprava } });
  vystupGh({ zapsano: true, platny: Boolean(vystup), oprava: Boolean(oprava), schvaleny });
}

/**
 * Kontext pro verdikt: mapy změněných řádků z podkladů jobu Review (radky.json, radky-od-review.json)
 * a stav předchozího review. Mapa od review se použije, jen když patří k poslednímu review.
 */
export function kontextZapisu({ slozka, komentare, konfig, pr }) {
  const cti = (jmeno) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(slozka, jmeno), 'utf8'));
    } catch {
      return null;
    }
  };
  const predchozi = posledniStav(komentare, konfig, pr.head.sha);
  const od = cti('radky-od-review.json');
  return {
    radky: cti('radky.json')?.radky || null,
    radkyOd: predchozi && od?.od === predchozi.sha ? od.radky : null,
    predchozi,
    pocetRadku: Number.isInteger(pr.additions) ? pr.additions + (pr.deletions || 0) : null,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const [akce, ...args] = process.argv.slice(2);
  // radky a over nepotřebují API ani token: běží v jobu Review nad podklady z hlavy PR (jen čtou text).
  if (akce === 'radky') {
    const od = /^[0-9a-f]{40}$/.test(args[1] || '') ? args[1] : null;
    process.stdout.write(`${JSON.stringify({ od, radky: zmeneneRadky(fs.readFileSync(args[0], 'utf8')) })}\n`);
    process.exit(0);
  }
  if (akce === 'duvod') {
    process.stdout.write(`${duvodSelhani(fs.existsSync(args[0] || '') ? fs.readFileSync(args[0], 'utf8') : '')}\n`);
    process.exit(0);
  }
  if (akce === 'over') process.exit(nactiVystup(fs.existsSync(args[0] || '') ? fs.readFileSync(args[0], 'utf8') : '') ? 0 : 1);
  const api = vytvorApi();
  const beh = akce === 'priprav' ? priprav(api, Number(args[0]), args[1])
    : akce === 'zapis' ? zapis(api, Number(args[0]), args[1], args[2])
    : Promise.reject(new Error('použití: review.mjs priprav <pr> <složka> | radky <diff> [<od sha>] | over <výstup> | duvod <surový> | zapis <pr> <sha> <výstup>'));
  beh.catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
