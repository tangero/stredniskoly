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
import { propojenaIssues } from '../brana/brana.mjs';
import { REPO, NAZEV_KONTROLY, vytvorApi } from '../brana/data.mjs';
import { cilovyStav, branaCekaNaSouhlas } from './stav.mjs';

const VLASTNIK = 'tangero';
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
    items(first: 100, after: $po) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
        content { __typename ... on Issue { number state body repository { nameWithOwner } labels(first: 50) { nodes { name } } } }
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
  return { id: projekt.id, pole: projekt.field, polozky };
}

/** Otevřené PR do main podle čísla issue, na které odkazují, s tím, zda brána čeká na souhlas. */
async function prPodleIssue(api) {
  const mapa = new Map();
  for (const p of await api(`repos/${REPO}/pulls?state=open&base=main&per_page=100`)) {
    const k = await api(`repos/${REPO}/commits/${p.head.sha}/check-runs?check_name=${encodeURIComponent(NAZEV_KONTROLY)}&filter=latest`);
    const posledni = (k.check_runs || []).sort((a, b) => b.id - a.id)[0];
    for (const n of propojenaIssues(p.body)) {
      if (!mapa.has(n)) mapa.set(n, []);
      mapa.get(n).push({ cislo: p.number, cekaNaSouhlas: branaCekaNaSouhlas(posledni) });
    }
  }
  return mapa;
}

async function main() {
  const nanecisto = process.env.NANECISTO === '1' || process.argv.includes('--nanecisto');
  const api = vytvorApi();
  const [tabule, prs] = await Promise.all([nactiTabuli(), prPodleIssue(api)]);
  const volby = new Map(tabule.pole.options.map((o) => [o.name, o.id]));
  const chybi = new Set();
  let zmen = 0;

  for (const p of tabule.polozky) {
    const c = p.content;
    if (c?.__typename !== 'Issue' || c.repository.nameWithOwner !== REPO) continue;
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
  console.log(`${nanecisto ? 'Nanečisto: ' : ''}${zmen} změn stavu.`);
  if (chybi.size) console.log(`::warning::V projektu chybí stavy: ${[...chybi].join(', ')} (docs/spoluprace-na-githubu.md, oddíl 3).`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await main();
