// Sběr dat pro bránu sloučení z GitHub REST API. Konfiguraci čte vždy z main,
// aby ji úprava ve větvi PR neovlivnila.

import { execFileSync } from 'node:child_process';
import yaml from 'js-yaml';
import { propojenaIssues, ctiExterniId } from './brana.mjs';

export const NAZEV_KONTROLY = 'Brána sloučení';

export const REPO = process.env.GITHUB_REPOSITORY || 'tangero/stredniskoly';

/**
 * Volání API: v Actions přes fetch s tokenem z GITHUB_TOKEN, mimo Actions přes přihlášené `gh`.
 * Vrací rozparsovaný JSON (u 204 null).
 */
export function vytvorApi({
  token = process.env.GITHUB_ACTIONS === 'true' ? process.env.GITHUB_TOKEN : undefined,
  fetchFn = globalThis.fetch,
} = {}) {
  if (token) {
    return async (cesta, { method = 'GET', body } = {}) => {
      const odp = await fetchFn(`https://api.github.com/${cesta}`, {
        method,
        headers: {
          authorization: `Bearer ${token}`,
          accept: 'application/vnd.github+json',
          'x-github-api-version': '2022-11-28',
          ...(body ? { 'content-type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!odp.ok) throw new Error(`${method} ${cesta}: ${odp.status} ${await odp.text()}`);
      return odp.status === 204 ? null : odp.json();
    };
  }
  return async (cesta, { method = 'GET', body } = {}) => {
    const args = ['api', '-X', method, cesta];
    if (body) args.push('--input', '-');
    const vystup = execFileSync('gh', args, {
      input: body ? JSON.stringify(body) : undefined,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
    return vystup.trim() ? JSON.parse(vystup) : null;
  };
}

async function vse(api, cesta) {
  const vysledek = [];
  for (let strana = 1; strana <= 30; strana++) {
    const dil = await api(`${cesta}${cesta.includes('?') ? '&' : '?'}per_page=100&page=${strana}`);
    vysledek.push(...dil);
    if (dil.length < 100) break;
  }
  return vysledek;
}

/** Text souboru v daném commitu; undefined, když neexistuje nebo nejde načíst. */
async function obsah(api, cesta, ref) {
  try {
    const d = await api(`repos/${REPO}/contents/${encodeURI(cesta)}?ref=${ref}`);
    return Buffer.from(d.content, 'base64').toString('utf8');
  } catch {
    return undefined;
  }
}

// BRANA_REF jen pro zkoušku konfigurace z větve před sloučením; workflow ho nenastavuje.
async function souborZMain(api, cesta) {
  const d = await api(`repos/${REPO}/contents/${cesta}?ref=${encodeURIComponent(process.env.BRANA_REF || 'main')}`);
  return Buffer.from(d.content, 'base64').toString('utf8');
}

/** rezimy.yml a oblasti z labeler.yml, obojí z main. */
export async function nactiKonfig(api) {
  const rezimy = yaml.load(await souborZMain(api, '.github/rezimy.yml'));
  const labeler = yaml.load(await souborZMain(api, '.github/labeler.yml'));
  return { rezimy, oblasti: oblastiZLabeleru(labeler) };
}

export function oblastiZLabeleru(labeler) {
  const oblasti = {};
  for (const [stitek, pravidla] of Object.entries(labeler || {})) {
    oblasti[stitek] = (pravidla || [])
      .flatMap((p) => p['changed-files'] || [])
      .flatMap((z) => z['any-glob-to-any-file'] || []);
  }
  return oblasti;
}

const komentare = async (api, cislo) =>
  (await vse(api, `repos/${REPO}/issues/${cislo}/comments`)).map((k) => ({
    id: k.id,
    autor: k.user?.login,
    telo: k.body || '',
    cas: k.created_at,
    upraveno: k.updated_at,
  }));

const udalosti = async (api, cislo) =>
  (await vse(api, `repos/${REPO}/issues/${cislo}/events`))
    .filter((u) => u.event === 'labeled' || u.event === 'unlabeled')
    .map((u) => ({ akce: u.event, stitek: u.label?.name, cas: u.created_at, aktor: u.actor?.login }));

export async function nactiIssue(api, cislo) {
  const i = await api(`repos/${REPO}/issues/${cislo}`);
  if (i.pull_request) return null;
  return {
    cislo,
    autor: i.user?.login,
    stav: i.state,
    stitky: i.labels.map((l) => l.name),
    telo: i.body || '',
    komentare: await komentare(api, cislo),
    udalosti: await udalosti(api, cislo),
  };
}

/** Všechno, co brána potřebuje k jednomu PR. */
export async function nactiPr(api, cislo) {
  const p = await api(`repos/${REPO}/pulls/${cislo}`);
  const soubory = [];
  for (const s of await vse(api, `repos/${REPO}/pulls/${cislo}/files`)) {
    const soubor = {
      nazev: s.filename,
      puvodni: s.previous_filename,
      stav: s.status,
      pridano: s.additions,
      odebrano: s.deletions,
    };
    // U workflow brána porovnává oprávnění před a po, proto potřebuje oba obsahy (jen čte text).
    if (/^\.github\/workflows\//.test(s.filename) || /^\.github\/workflows\//.test(s.previous_filename || '')) {
      soubor.obsahPred = await obsah(api, s.previous_filename || s.filename, p.base.sha);
      soubor.obsahPo = await obsah(api, s.filename, p.head.sha);
    }
    soubory.push(soubor);
  }
  const issues = [];
  for (const n of propojenaIssues(p.body)) {
    const i = await nactiIssue(api, n);
    if (i) issues.push(i);
  }
  return {
    predchozi: await predchoziStav(api, cislo, p.head.sha),
    pr: {
      cislo,
      autor: p.user?.login,
      stav: p.state,
      zakladna: p.base.ref,
      draft: p.draft,
      telo: p.body || '',
      stitky: p.labels.map((l) => l.name),
      vytvoreno: p.created_at,
      upraveno: p.updated_at,
      hlava: { sha: p.head.sha },
      komentare: await komentare(api, cislo),
      udalosti: await udalosti(api, cislo),
    },
    soubory,
    issues,
  };
}

/** Kontroly brány na commitu (jen ty, které zapsal workflow brány, poznají se podle externího id). */
export async function kontrolyBrany(api, sha) {
  const d = await api(`repos/${REPO}/commits/${sha}/check-runs?check_name=${encodeURIComponent(NAZEV_KONTROLY)}&filter=all&per_page=100`);
  return (d.check_runs || [])
    .map((k) => ({ ...k, brana: ctiExterniId(k.external_id) }))
    .filter((k) => k.brana && k.app?.slug === 'github-actions')
    .sort((a, b) => b.id - a.id);
}

/** Stav lhůty z poslední kontroly brány pro tento PR a commit; null, když brána tuto dvojici ještě neviděla. */
async function predchoziStav(api, cislo, sha) {
  const k = (await kontrolyBrany(api, sha)).find((x) => x.brana.pr === cislo);
  return k ? { stav: k.brana.stav, od: k.brana.od } : null;
}

/** Otevřené PR do main, které odkazují na dané issue. */
export async function prOdkazujiciNa(api, cisloIssue) {
  const otevrene = await vse(api, `repos/${REPO}/pulls?state=open&base=main`);
  return otevrene.filter((p) => propojenaIssues(p.body).includes(cisloIssue)).map((p) => p.number);
}

export async function otevrenePr(api) {
  return (await vse(api, `repos/${REPO}/pulls?state=open&base=main`)).map((p) => p.number);
}
