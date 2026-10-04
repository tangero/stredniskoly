// Srovná stav karet issues na tabuli projektu se štítky a otevřenými PR (stav.mjs).
// Běží ve workflow tabule.yml: při změně štítků, issues a PR a jednou denně.
//
//   PROJECT_TOKEN  klasický token se scopes project a public_repo (zápis do projektu na osobním účtu)
//   GITHUB_TOKEN   čtení PR a kontrol brány
//   NANECISTO=1    jen vypíše, co by změnil
//
// Stavy se hledají podle názvu; chybějící stav (dosud nezaložený v nastavení projektu) se jen ohlásí.
// Karty PR nemění (ty obsluhují vestavěné automatizace projektu).

import { pathToFileURL } from 'node:url';
import { propojenaIssues, STITKY_HLASENI } from '../brana/brana.mjs';
import { REPO, NAZEV_KONTROLY, vytvorApi } from '../brana/data.mjs';
import { cilovyStav, branaCekaNaSouhlas, naCoCeka, naCoCekaPr } from './stav.mjs';

const VLASTNIK = 'tangero';
const ASISTENT = 'eduarda-prijimacky';
const POLE_POZNAMKY = 'Na co čeká';
const CISLO_PROJEKTU = 1;

async function graphql(query, variables) {
  const odp = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.PROJECT_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const d = await odp.json();
  if (!odp.ok || d.errors) throw new Error(`GraphQL: ${odp.status} ${JSON.stringify(d.errors || d)}`);
  return d.data;
}

const DOTAZ = `query($login: String!, $cislo: Int!, $po: String) {
  user(login: $login) { projectV2(number: $cislo) {
    id
    field(name: "Status") { ... on ProjectV2SingleSelectField { id options { id name } } }
    poznamka: field(name: "Na co čeká") { ... on ProjectV2Field { id } }
    items(first: 100, after: $po) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
        poznamka: fieldValueByName(name: "Na co čeká") { ... on ProjectV2ItemFieldTextValue { text } }
        content {
          __typename
          ... on Issue { number state body repository { nameWithOwner } labels(first: 50) { nodes { name } } }
          ... on PullRequest { number state repository { nameWithOwner } }
        }
      }
    }
  } }
}`;

async function nactiTabuli() {
  const polozky = [];
  let po = null;
  let projekt;
  do {
    const d = await graphql(DOTAZ, { login: VLASTNIK, cislo: CISLO_PROJEKTU, po });
    projekt = d.user.projectV2;
    polozky.push(...projekt.items.nodes);
    po = projekt.items.pageInfo.hasNextPage ? projekt.items.pageInfo.endCursor : null;
  } while (po);
  return { id: projekt.id, pole: projekt.field, polePoznamky: projekt.poznamka?.id || null, polozky };
}

/** Stav review asistenta zadání k danému commitu: 'ok', 'nalezy', nebo null (review k němu není). */
function reviewKCommitu(komentare, sha) {
  const r = komentare
    .filter((k) => k.user?.login === ASISTENT && /##\s*Review/i.test(k.body || '') && (k.body || '').includes(sha.slice(0, 7)))
    .sort((a, b) => b.id - a.id)[0];
  if (!r) return null;
  return /bez\s+P1\s+a\s+P2/i.test(r.body) ? 'ok' : 'nalezy';
}

/**
 * Otevřené PR do main: podle čísla PR věta „Na co čeká“, podle čísla issue seznam PR, které na něj
 * odkazují, s tím, zda brána čeká na souhlas.
 */
export async function nactiPr(api) {
  const podleIssue = new Map();
  const podlePr = new Map();
  for (const p of await api(`repos/${REPO}/pulls?state=open&base=main&per_page=100`)) {
    const k = await api(`repos/${REPO}/commits/${p.head.sha}/check-runs?check_name=${encodeURIComponent(NAZEV_KONTROLY)}&filter=latest`);
    const posledni = (k.check_runs || []).sort((a, b) => b.id - a.id)[0];
    const detail = await api(`repos/${REPO}/pulls/${p.number}`);
    const komentare = await api(`repos/${REPO}/issues/${p.number}/comments?per_page=100`);
    const veta = naCoCekaPr({ draft: p.draft, mergeable: detail.mergeable, kontrola: posledni, review: reviewKCommitu(komentare, p.head.sha) });
    podlePr.set(p.number, veta);
    for (const n of propojenaIssues(p.body)) {
      if (!podleIssue.has(n)) podleIssue.set(n, []);
      podleIssue.get(n).push({ cislo: p.number, cekaNaSouhlas: branaCekaNaSouhlas(posledni), naCoCeka: veta });
    }
  }
  return { podleIssue, podlePr };
}

/** Rodič (číslo projektu) a souhrn sub-issues otevřených issues z REST API. */
export async function nactiVazby(api) {
  const vazby = new Map();
  for (let strana = 1; strana <= 10; strana++) {
    const dil = await api(`repos/${REPO}/issues?state=open&per_page=100&page=${strana}`);
    for (const i of dil) {
      if (i.pull_request) continue;
      let rodic = null;
      if ((i.labels || []).some((l) => STITKY_HLASENI.includes(l.name))) {
        try {
          rodic = (await api(`repos/${REPO}/issues/${i.number}/parent`))?.number || null;
        } catch {
          rodic = null; // 404: bez rodiče
        }
      }
      vazby.set(i.number, { rodic, ukoly: i.sub_issues_summary || null });
    }
    if (dil.length < 100) break;
  }
  return vazby;
}

async function main() {
  const nanecisto = process.env.NANECISTO === '1' || process.argv.includes('--nanecisto');
  const api = vytvorApi();
  const [tabule, { podleIssue: prs, podlePr }, vazby] = await Promise.all([nactiTabuli(), nactiPr(api), nactiVazby(api)]);
  const dnes = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Prague' }).format(new Date());
  if (!tabule.polePoznamky && !nanecisto) {
    // Pole se založí jednou; na kartě ho vlastník zapne v nastavení pohledu (Fields).
    const d = await graphql(`mutation($p: ID!, $n: String!) {
      createProjectV2Field(input: { projectId: $p, dataType: TEXT, name: $n }) { projectV2Field { ... on ProjectV2Field { id } } } }`,
    { p: tabule.id, n: POLE_POZNAMKY });
    tabule.polePoznamky = d.createProjectV2Field.projectV2Field.id;
    console.log(`Založeno pole „${POLE_POZNAMKY}“.`);
  }
  let poznamek = 0;
  const volby = new Map(tabule.pole.options.map((o) => [o.name, o.id]));
  const chybi = new Set();
  let zmen = 0;

  for (const p of tabule.polozky) {
    const c = p.content;
    if (!c || c.repository?.nameWithOwner !== REPO) continue;
    // Pole „Na co čeká“ u issues i PR; stav (Status) jen u issues.
    let veta;
    if (c.__typename === 'PullRequest') veta = c.state === 'OPEN' ? podlePr.get(c.number) ?? 'čeká na vyhodnocení' : '';
    else if (c.__typename === 'Issue') {
      const v = vazby.get(c.number) || {};
      veta = naCoCeka({ stav: c.state, stitky: c.labels.nodes.map((l) => l.name), telo: c.body, rodic: v.rodic, ukoly: v.ukoly }, prs.get(c.number) || [], dnes);
    }
    if (veta != null && veta !== (p.poznamka?.text || '')) {
      console.log(`#${c.number} (${c.__typename === 'PullRequest' ? 'PR' : 'issue'}): ${veta || '(prázdné)'}`);
      poznamek++;
      if (!nanecisto && tabule.polePoznamky) {
        if (veta) {
          await graphql(`mutation($p: ID!, $i: ID!, $f: ID!, $t: String!) {
            updateProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f, value: { text: $t } }) { projectV2Item { id } } }`,
          { p: tabule.id, i: p.id, f: tabule.polePoznamky, t: veta });
        } else {
          await graphql(`mutation($p: ID!, $i: ID!, $f: ID!) {
            clearProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f }) { projectV2Item { id } } }`,
          { p: tabule.id, i: p.id, f: tabule.polePoznamky });
        }
      }
    }
    if (c.__typename !== 'Issue') continue;
    const cil = cilovyStav({ stav: c.state, stitky: c.labels.nodes.map((l) => l.name), telo: c.body }, prs.get(c.number) || []);
    const ted = p.fieldValueByName?.name || null;
    if (!cil || cil === ted) continue;
    if (!volby.has(cil)) { chybi.add(cil); continue; }
    console.log(`#${c.number}: ${ted || '(bez stavu)'} → ${cil}`);
    zmen++;
    if (nanecisto) continue;
    await graphql(`mutation($p: ID!, $i: ID!, $f: ID!, $o: String!) {
      updateProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f, value: { singleSelectOptionId: $o } }) { projectV2Item { id } } }`,
    { p: tabule.id, i: p.id, f: tabule.pole.id, o: volby.get(cil) });
  }
  console.log(`${nanecisto ? 'Nanečisto: ' : ''}${zmen} změn stavu, ${poznamek} změn pole „${POLE_POZNAMKY}“.`);
  if (chybi.size) console.log(`::warning::V projektu chybí stavy: ${[...chybi].join(', ')} (docs/spoluprace-na-githubu.md, oddíl 3).`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await main();
