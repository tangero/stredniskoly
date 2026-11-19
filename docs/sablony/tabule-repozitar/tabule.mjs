// Šablona tabule pro další repozitáře (#561, etapa E3). Do cílového repozitáře patří jako
// `.github/tabule/tabule.mjs`, spouští ji workflow `.github/workflows/tabule.yml` ze stejné složky šablony.
// Návod: docs/spoluprace-na-githubu.md v tangero/stredniskoly, oddíl 3.
//
// Co dělá (jen issues tohoto repozitáře, karty ostatních repozitářů nechá být):
//   - otevřené issue, které na tabuli chybí, přidá;
//   - stav karty: Hotovo (zavřené issue), V práci (otevřený PR s „Closes #N“ nebo „Souvisí s #N“), jinak Nové;
//   - pole „Pro lidi“: řádek `Pro lidi: …` z těla issue, jinak název issue;
//   - pole „Čeká na“: podle přiřazení (vlastník → Patrick, účty z KOLEGOVE → kolega, jiný účet → AI),
//     zavřené issue → nikdo, otevřené bez přiřazení → pole prázdné.
// Žádná logika štítků brány sloučení: ta platí jen ve stredniskoly.
//
// Proměnné prostředí:
//   PROJECT_TOKEN    klasický token se scopes `project` a `repo` (zápis do projektu na osobním účtu)
//   GITHUB_TOKEN     čtení issues a PR tohoto repozitáře
//   REPO             vlastník/název (ve workflow github.repository)
//   VLASTNIK         účet, kterému patří projekt a jehož přiřazení znamená „Čeká na: Patrick“
//   CISLO_PROJEKTU   číslo projektu na účtu vlastníka (výchozí 1)
//   KOLEGOVE         účty kolegů oddělené čárkou (proměnná repozitáře, nepovinná)
//   NANECISTO=1      jen vypíše, co by změnil
//
// Bez závislostí, jen Node 22 (fetch). Stavy a pole hledá podle názvu; chybějící jen ohlásí, nezakládá.

import { pathToFileURL } from 'node:url';

export const STAVY = { nove: 'Nové', vPraci: 'V práci', hotovo: 'Hotovo' };
export const CEKA_NA = { vlastnik: 'Patrick', kolega: 'kolega', ai: 'AI', nikdo: 'nikdo' };
export const POLE = { stav: 'Status', proLidi: 'Pro lidi', cekaNa: 'Čeká na' };

const ODKAZ_NA_ISSUE = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?|souvisí s|souvisi s)\s*:?\s*#(\d+)/gi;
const PRO_LIDI = /^Pro lidi:[ \t]*(\S.*)$/m;
const PRO_LIDI_NADPIS = /^#{2,3}[ \t]*Pro lidi[ \t]*\n+(?!#)(\S[^\n]*)/m;
const PRO_LIDI_MAX = 240;

/** Čísla issues, na která odkazuje tělo PR (Closes/Fixes/Resolves #N, Souvisí s #N). */
export function propojenaIssues(telo = '') {
  return [...new Set([...(telo || '').matchAll(ODKAZ_NA_ISSUE)].map((m) => Number(m[1])))];
}

/** Stav karty issue: Hotovo, V práci (má otevřený PR), jinak Nové. */
export function stavKarty({ stav, maOtevrenyPr }) {
  if (stav === 'CLOSED') return STAVY.hotovo;
  return maOtevrenyPr ? STAVY.vPraci : STAVY.nove;
}

/** Text pole „Pro lidi“: řádek `Pro lidi:` nebo oddíl „### Pro lidi“, jinak název issue (`chybi: true`). */
export function proLidi({ titulek = '', telo = '' }) {
  const t = (telo || '').replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?(-->|$)/g, '');
  const m = t.match(PRO_LIDI) || t.match(PRO_LIDI_NADPIS);
  const text = (m ? m[1] : titulek || '').replace(/\s+/g, ' ').trim();
  return { text: text.length > PRO_LIDI_MAX ? `${text.slice(0, PRO_LIDI_MAX - 1)}…` : text, chybi: !m };
}

/**
 * Kdo je na tahu podle přiřazení. Zavřené: nikdo. Kolega má přednost před vlastníkem, vlastník před ostatními
 * účty (AI agenti, boti). Otevřené bez přiřazení: null (pole se vymaže).
 */
export function cekaNa({ stav, prirazeni = [] }, { vlastnik, kolegove = [] }) {
  if (stav === 'CLOSED') return CEKA_NA.nikdo;
  if (prirazeni.some((u) => kolegove.includes(u))) return CEKA_NA.kolega;
  if (vlastnik && prirazeni.includes(vlastnik)) return CEKA_NA.vlastnik;
  return prirazeni.length ? CEKA_NA.ai : null;
}

/** Seznam účtů z proměnné oddělené čárkami nebo mezerami. */
export function seznamUctu(text = '') {
  return [...new Set((text || '').split(/[\s,]+/).map((u) => u.trim()).filter(Boolean))];
}

/** Cílové hodnoty karty issue (stav, Pro lidi, Čeká na). */
export function cilKarty(issue, { otevrenePr, vlastnik, kolegove }) {
  return {
    stav: stavKarty({ stav: issue.stav, maOtevrenyPr: otevrenePr.has(issue.cislo) }),
    proLidi: proLidi({ titulek: issue.titulek, telo: issue.telo }).text,
    cekaNa: cekaNa(issue, { vlastnik, kolegove }),
  };
}

// ---- Volání GitHubu (v testech se nevolá) ----

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

async function rest(cesta) {
  const odp = await fetch(`https://api.github.com/${cesta}`, {
    headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json' },
  });
  if (!odp.ok) throw new Error(`REST ${cesta}: ${odp.status}`);
  return odp.json();
}

const DOTAZ = `query($login: String!, $cislo: Int!, $po: String) {
  user(login: $login) { projectV2(number: $cislo) {
    id
    fields(first: 50) { nodes {
      ... on ProjectV2FieldCommon { id name }
      ... on ProjectV2SingleSelectField { options { id name } }
    } }
    items(first: 100, after: $po) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        fieldValues(first: 30) { nodes {
          ... on ProjectV2ItemFieldTextValue { text field { ... on ProjectV2FieldCommon { name } } }
          ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2FieldCommon { name } } }
        } }
        content { __typename ... on Issue { number repository { nameWithOwner } } }
      }
    }
  } }
}`;

async function nactiTabuli(vlastnik, cislo) {
  const karty = new Map();
  let po = null;
  let projekt;
  do {
    projekt = (await graphql(DOTAZ, { login: vlastnik, cislo, po })).user.projectV2;
    for (const p of projekt.items.nodes) {
      const c = p.content;
      if (c?.__typename !== 'Issue' || c.repository?.nameWithOwner !== process.env.REPO) continue;
      const hodnota = (nazev) => (p.fieldValues?.nodes || []).find((v) => v?.field?.name === nazev);
      karty.set(c.number, {
        id: p.id,
        stav: hodnota(POLE.stav)?.name || null,
        proLidi: hodnota(POLE.proLidi)?.text || '',
        cekaNa: hodnota(POLE.cekaNa)?.name || null,
      });
    }
    po = projekt.items.pageInfo.hasNextPage ? projekt.items.pageInfo.endCursor : null;
  } while (po);
  const pole = new Map((projekt.fields?.nodes || []).filter((f) => f?.name).map((f) => [f.name, f]));
  return { id: projekt.id, pole, karty };
}

async function nactiIssues(repo) {
  const issues = [];
  for (let strana = 1; strana <= 20; strana++) {
    const dil = await rest(`repos/${repo}/issues?state=all&per_page=100&page=${strana}`);
    for (const i of dil) {
      if (i.pull_request) continue;
      issues.push({
        cislo: i.number, nodeId: i.node_id, stav: i.state === 'closed' ? 'CLOSED' : 'OPEN',
        titulek: i.title, telo: i.body || '', prirazeni: (i.assignees || []).map((a) => a.login),
      });
    }
    if (dil.length < 100) break;
  }
  return issues;
}

async function nactiOtevrenePr(repo) {
  const cisla = new Set();
  for (let strana = 1; strana <= 10; strana++) {
    const dil = await rest(`repos/${repo}/pulls?state=open&per_page=100&page=${strana}`);
    for (const p of dil) for (const n of propojenaIssues(p.body)) cisla.add(n);
    if (dil.length < 100) break;
  }
  return cisla;
}

async function main() {
  const nanecisto = process.env.NANECISTO === '1' || process.argv.includes('--nanecisto');
  const repo = process.env.REPO;
  const vlastnik = process.env.VLASTNIK || repo.split('/')[0];
  const kolegove = seznamUctu(process.env.KOLEGOVE);
  const [tabule, issues, otevrenePr] = await Promise.all([
    nactiTabuli(vlastnik, Number(process.env.CISLO_PROJEKTU || 1)), nactiIssues(repo), nactiOtevrenePr(repo),
  ]);
  const chybi = new Set();
  const polozkaVolby = (nazev, volba) => {
    const f = tabule.pole.get(nazev);
    if (!f) { chybi.add(`pole „${nazev}“`); return undefined; }
    if (volba == null) return null;
    const o = (f.options || []).find((x) => x.name === volba);
    if (!o) { chybi.add(`${nazev}: ${volba}`); return undefined; }
    return { singleSelectOptionId: o.id };
  };
  const nastav = async (karta, nazev, hodnota) => {
    const f = tabule.pole.get(nazev);
    if (nanecisto || !f || !karta.id) return;
    if (hodnota === null) {
      await graphql(`mutation($p: ID!, $i: ID!, $f: ID!) {
        clearProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f }) { projectV2Item { id } } }`,
      { p: tabule.id, i: karta.id, f: f.id });
    } else {
      await graphql(`mutation($p: ID!, $i: ID!, $f: ID!, $v: ProjectV2FieldValue!) {
        updateProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f, value: $v }) { projectV2Item { id } } }`,
      { p: tabule.id, i: karta.id, f: f.id, v: hodnota });
    }
  };
  let pridano = 0;
  let zmen = 0;
  for (const issue of issues) {
    let karta = tabule.karty.get(issue.cislo);
    if (!karta) {
      // Zavřená issues, která na tabuli nejsou, se nepřidávají (historie by tabuli zahltila).
      if (issue.stav !== 'OPEN') continue;
      console.log(`#${issue.cislo}: přidat na tabuli`);
      pridano++;
      karta = { id: null, stav: null, proLidi: '', cekaNa: null };
      if (!nanecisto) {
        const d = await graphql(`mutation($p: ID!, $c: ID!) {
          addProjectV2ItemById(input: { projectId: $p, contentId: $c }) { item { id } } }`, { p: tabule.id, c: issue.nodeId });
        karta.id = d.addProjectV2ItemById.item.id;
      }
    }
    const cil = cilKarty(issue, { otevrenePr, vlastnik, kolegove });
    if (cil.stav !== karta.stav) {
      const v = polozkaVolby(POLE.stav, cil.stav);
      if (v) { console.log(`#${issue.cislo}: ${karta.stav || '(bez stavu)'} → ${cil.stav}`); zmen++; await nastav(karta, POLE.stav, v); }
    }
    // Pole „Pro lidi“ a „Čeká na“ jen u otevřených: zavřené karty mají „nikdo“ a text už nepotřebují měnit.
    if (issue.stav === 'OPEN' && cil.proLidi !== karta.proLidi) {
      if (tabule.pole.has(POLE.proLidi)) { console.log(`#${issue.cislo}: Pro lidi → ${cil.proLidi}`); zmen++; await nastav(karta, POLE.proLidi, { text: cil.proLidi }); }
      else chybi.add(`pole „${POLE.proLidi}“`);
    }
    if (cil.cekaNa !== karta.cekaNa && (issue.stav === 'OPEN' || karta.cekaNa)) {
      const v = polozkaVolby(POLE.cekaNa, cil.cekaNa);
      if (v !== undefined) { console.log(`#${issue.cislo}: Čeká na → ${cil.cekaNa || '(prázdné)'}`); zmen++; await nastav(karta, POLE.cekaNa, v); }
    }
  }
  console.log(`${nanecisto ? 'Nanečisto: ' : ''}${pridano} přidaných karet, ${zmen} změn.`);
  if (chybi.size) console.log(`::warning::V projektu chybí: ${[...chybi].join(', ')} (návod k šabloně tabule).`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await main();
