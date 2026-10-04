// Smyčka review a oprav (#301, docs/navrh-rizeni-vyvoje-2027.md, oddíl 9d): rozhodnutí workflow
// oprava-z-review.yml, zda komentář `@claude` v PR spustí kolo oprav, a kontrola oprav před pushem.
//
//   node scripts/brana/oprava-z-review.mjs rozhodni           (job „Rozhodnutí“, čte událost komentáře)
//   node scripts/brana/oprava-z-review.mjs kontrola <sha>     (job „Oprava“, po Claude, před pushem)
//
// Výsledek zapisuje do GITHUB_OUTPUT. Konfiguraci čte z main přes API, jako brána.

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { matchesGlob } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BOT, duveryhodny, stopPlati } from './brana.mjs';
import { REPO, vytvorApi, nactiKonfig, nactiPr } from './data.mjs';

export const STITEK_CLOVEK = 'potrebuje-cloveka';
export const VYCHOZI_MAX_KOL = 5;
export const ZNACKA_KOLA = (kolo) => `<!-- oprava-z-review:kolo=${kolo} -->`;
const CTENI_KOLA = /<!-- oprava-z-review:kolo=(\d+) -->/;
const SPOUSTEC = /(^|[^\w@])@claude\b/i;

/** Počet kol oprav na PR: komentáře se značkou kola, které napsal workflow (autor BOT). */
export function pocetKol(komentare = []) {
  return komentare.filter((k) => k.autor === BOT && CTENI_KOLA.test(k.telo || '')).length;
}

/**
 * Smí komentář spustit kolo oprav? Vrací { akce: 'oprava' | 'strop' | 'nic', duvod, kolo?, max }.
 * `pr` je výstup nactiPr doplněný o `hlavaRepo` a `zakladnaRepo` (celé názvy repozitářů),
 * `issues` propojená zadání (jejich `stop` zastavuje i opravy).
 */
export function rozhodniOpravu({ komentar, pr, issues = [], konfig }) {
  const max = Number(konfig.rezimy.review?.max_kol_oprav) || VYCHOZI_MAX_KOL;
  const nic = (duvod) => ({ akce: 'nic', duvod, max });
  if (!SPOUSTEC.test(komentar.telo || '')) return nic('komentář neobsahuje @claude');
  if (!duveryhodny(komentar.autor, konfig)) return nic(`komentář napsal účet ${komentar.autor || 'neznámý'}, ne vlastník ani asistent zadání`);
  if (!duveryhodny(pr.autor, konfig)) return nic(`PR založil účet ${pr.autor || 'neznámý'}, ne vlastník ani asistent zadání`);
  if (!pr.hlavaRepo || pr.hlavaRepo !== pr.zakladnaRepo) return nic('PR je z forku');
  if (pr.stav !== 'open') return nic('PR není otevřený');
  if (stopPlati(pr, konfig)) return nic('PR má štítek stop');
  for (const i of issues) if (stopPlati(i, konfig)) return nic(`issue #${i.cislo} má štítek stop`);
  if (pr.stitky.includes(STITEK_CLOVEK)) return nic(`PR má štítek ${STITEK_CLOVEK}`);
  const kola = pocetKol(pr.komentare);
  if (kola >= max) return { akce: 'strop', duvod: `proběhlo ${kola} z ${max} kol oprav`, max };
  return { akce: 'oprava', duvod: `kolo ${kola + 1} z ${max}`, kolo: kola + 1, max };
}

/** Soubory z cest H2 (`h2` v rezimy.yml), které oprava změnila; ty smyčka nepushne. */
export function zasahH2(soubory, konfig) {
  const vzory = konfig.rezimy.h2 || [];
  return soubory.filter((s) => vzory.some((v) => matchesGlob(s, v)));
}

function vystup(hodnoty) {
  const radky = Object.entries(hodnoty).map(([k, v]) => `${k}=${String(v ?? '').replace(/\r?\n/g, ' ')}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${radky.join('\n')}\n`);
  console.log(radky.join('\n'));
}

async function rozhodni(api) {
  const udalost = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const cislo = udalost.issue?.number;
  if (!udalost.issue?.pull_request || !cislo) return vystup({ akce: 'nic', duvod: 'komentář není u PR' });
  const konfig = await nactiKonfig(api);
  const [{ pr, issues }, p] = await Promise.all([nactiPr(api, cislo), api(`repos/${REPO}/pulls/${cislo}`)]);
  const rozhodnuti = rozhodniOpravu({
    komentar: { autor: udalost.comment?.user?.login, telo: udalost.comment?.body || '' },
    pr: { ...pr, hlavaRepo: p.head?.repo?.full_name, zakladnaRepo: p.base?.repo?.full_name },
    issues,
    konfig,
  });
  vystup({ ...rozhodnuti, pr: cislo, vetev: p.head?.ref, sha: p.head?.sha });
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

async function kontrola(api, pred) {
  if (!/^[0-9a-f]{40}$/.test(pred || '')) throw new Error('kontrola potřebuje plné sha hlavy před opravou');
  const konfig = await nactiKonfig(api);
  const hlava = git('rev-parse', 'HEAD');
  if (hlava === pred) return vystup({ push: false, duvod: 'oprava nevytvořila žádný commit' });
  try {
    git('merge-base', '--is-ancestor', pred, hlava);
  } catch {
    return vystup({ push: false, duvod: 'oprava přepsala historii větve (hlava před opravou není předkem)' });
  }
  const soubory = git('diff', '--name-only', pred, hlava).split('\n').filter(Boolean);
  const h2 = zasahH2(soubory, konfig);
  if (h2.length) return vystup({ push: false, h2: h2.join(', '), duvod: `oprava mění cesty H2: ${h2.join(', ')}` });
  vystup({ push: true, duvod: `změněno souborů: ${soubory.length}` });
}

async function main() {
  const [prikaz, arg] = process.argv.slice(2);
  const api = vytvorApi();
  if (prikaz === 'rozhodni') return rozhodni(api);
  if (prikaz === 'kontrola') return kontrola(api, arg);
  throw new Error('použití: oprava-z-review.mjs rozhodni | kontrola <sha>');
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
