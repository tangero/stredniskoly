// Srovná stav karet issues na tabuli projektu se štítky a otevřenými PR (stav.mjs).
// Běží ve workflow tabule.yml: při změně štítků, issues a PR a jednou denně.
//
//   PROJECT_TOKEN  klasický token se scopes project a public_repo (zápis do projektu na osobním účtu)
//   GITHUB_TOKEN   čtení PR a kontrol brány
//   NANECISTO=1    jen vypíše, co by změnil
//
// Stavy se hledají podle názvu; chybějící stav (dosud nezaložený v nastavení projektu) se jen ohlásí.
// Stav karet PR nemění (ty obsluhují vestavěné automatizace projektu), jen pole „Na co čeká“ a „Čeká na“.
// Pilot (#561): pole „Pro lidi“ (řádek `Pro lidi:` z těla issue), „Čeká na“ (kdo je na tahu) a „Termín“
// (datum připomínky) skript založí, když chybí, a plní je u issues tohoto repozitáře.

import { pathToFileURL } from 'node:url';
import { propojenaIssues, STITKY_HLASENI } from '../brana/brana.mjs';
import { REPO, NAZEV_KONTROLY, vytvorApi, nactiKonfig } from '../brana/data.mjs';
import { cilovyStav, branaCekaNaSouhlas, naCoCeka, naCoCekaPr, proLidi, cekaNa, cekaNaPr, termin, CEKA_NA } from './stav.mjs';

const VLASTNIK = 'tangero';
const ASISTENT = 'eduarda-prijimacky';
const POLE_POZNAMKY = 'Na co čeká';
const POLE_PRO_LIDI = 'Pro lidi';
const POLE_CEKA_NA = 'Čeká na';
const POLE_TERMIN = 'Termín';
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
    fields(first: 50) { nodes {
      ... on ProjectV2FieldCommon { id name }
      ... on ProjectV2SingleSelectField { options { id name } }
    } }
    items(first: 100, after: $po) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
        fieldValues(first: 30) { nodes {
          ... on ProjectV2ItemFieldTextValue { text field { ... on ProjectV2FieldCommon { name } } }
          ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2FieldCommon { name } } }
          ... on ProjectV2ItemFieldDateValue { date field { ... on ProjectV2FieldCommon { name } } }
        } }
        content {
          __typename
          ... on Issue { number title state body repository { nameWithOwner } labels(first: 50) { nodes { name } } assignees(first: 10) { nodes { login } } }
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
  // Pole se hledají v seznamu: field(name:) u chybějícího pole vrací chybu, ne null.
  const pole = (nazev) => (projekt.fields?.nodes || []).find((f) => f?.name === nazev) || null;
  const poznamka = pole(POLE_POZNAMKY);
  for (const p of polozky) {
    const hodnota = (nazev) => (p.fieldValues?.nodes || []).find((v) => v?.field?.name === nazev);
    p.poznamka = { text: hodnota(POLE_POZNAMKY)?.text || '' };
    p.hodnoty = { proLidi: hodnota(POLE_PRO_LIDI)?.text || '', cekaNa: hodnota(POLE_CEKA_NA)?.name || null, termin: hodnota(POLE_TERMIN)?.date || null };
  }
  return { id: projekt.id, pole: projekt.field, polePoznamky: poznamka?.id || null, poleProLidi: pole(POLE_PRO_LIDI), poleCekaNa: pole(POLE_CEKA_NA), poleTermin: pole(POLE_TERMIN), polozky };
}

/** Založí chybějící pole pilotu (#561). „Čeká na“ jako volbu s pevnými možnostmi, ostatní jako text a datum. */
async function zalozPole(tabule) {
  const zaloz = async (nazev, typ, volby) => {
    const d = await graphql(`mutation($p: ID!, $n: String!, $t: ProjectV2CustomFieldType!, $v: [ProjectV2SingleSelectFieldOptionInput!]) {
      createProjectV2Field(input: { projectId: $p, dataType: $t, name: $n, singleSelectOptions: $v }) {
        projectV2Field { ... on ProjectV2Field { id name } ... on ProjectV2SingleSelectField { id name options { id name } } } } }`,
    { p: tabule.id, n: nazev, t: typ, v: volby || null });
    console.log(`Založeno pole „${nazev}“.`);
    return d.createProjectV2Field.projectV2Field;
  };
  if (!tabule.poleProLidi) tabule.poleProLidi = await zaloz(POLE_PRO_LIDI, 'TEXT');
  if (!tabule.poleTermin) tabule.poleTermin = await zaloz(POLE_TERMIN, 'DATE');
  if (!tabule.poleCekaNa) {
    tabule.poleCekaNa = await zaloz(POLE_CEKA_NA, 'SINGLE_SELECT', Object.values(CEKA_NA).map((name) => ({ name, color: 'GRAY', description: '' })));
  }
}

/** Zapíše nebo vymaže hodnotu pole položky (text, datum, nebo id volby). */
async function nastavPole(tabule, polozka, pole, hodnota) {
  if (hodnota == null || hodnota === '') {
    await graphql(`mutation($p: ID!, $i: ID!, $f: ID!) {
      clearProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f }) { projectV2Item { id } } }`,
    { p: tabule.id, i: polozka.id, f: pole.id });
    return;
  }
  await graphql(`mutation($p: ID!, $i: ID!, $f: ID!, $v: ProjectV2FieldValue!) {
    updateProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f, value: $v }) { projectV2Item { id } } }`,
  { p: tabule.id, i: polozka.id, f: pole.id, v: hodnota });
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
  const souhlasPr = new Map();
  for (const p of await api(`repos/${REPO}/pulls?state=open&base=main&per_page=100`)) {
    const k = await api(`repos/${REPO}/commits/${p.head.sha}/check-runs?check_name=${encodeURIComponent(NAZEV_KONTROLY)}&filter=latest`);
    const posledni = (k.check_runs || []).sort((a, b) => b.id - a.id)[0];
    const detail = await api(`repos/${REPO}/pulls/${p.number}`);
    const komentare = await api(`repos/${REPO}/issues/${p.number}/comments?per_page=100`);
    const veta = naCoCekaPr({ draft: p.draft, mergeable: detail.mergeable, kontrola: posledni, review: reviewKCommitu(komentare, p.head.sha) });
    podlePr.set(p.number, veta);
    // Podle čísla PR i bez propojeného issue: samostatný PR čekající na souhlas je také „Čeká na: Patrick“.
    souhlasPr.set(p.number, branaCekaNaSouhlas(posledni));
    for (const n of propojenaIssues(p.body)) {
      if (!podleIssue.has(n)) podleIssue.set(n, []);
      podleIssue.get(n).push({ cislo: p.number, cekaNaSouhlas: branaCekaNaSouhlas(posledni), naCoCeka: veta });
    }
  }
  return { podleIssue, podlePr, souhlasPr };
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
        } catch (e) {
          // 404: bez rodiče. Jinou chybu (5xx, limit) jen ohlásit; věta na kartě pak bude méně přesná.
          if (!/\b404\b/.test(`${e.message} ${e.stderr || ''}`)) console.log(`::warning::Rodiče issue #${i.number} nešlo načíst: ${e.message}`);
          rodic = null;
        }
      }
      vazby.set(i.number, { rodic, ukoly: i.sub_issues_summary || null });
    }
    if (dil.length < 100) break;
  }
  return vazby;
}

/**
 * Účty kolegů pro „Čeká na“ z rezimy.yml: seznam `kolegove`, nebo jeden účet `kolega` (#561).
 * Dokud tam žádný není, kolega se nepozná.
 */
export function uctyKolegu(rezimy = {}) {
  const ucty = [rezimy.kolegove, rezimy.kolega].flat().filter((u) => typeof u === 'string' && u.trim());
  return [...new Set(ucty.map((u) => u.trim()))];
}

async function main() {
  const nanecisto = process.env.NANECISTO === '1' || process.argv.includes('--nanecisto');
  const api = vytvorApi();
  const [tabule, { podleIssue: prs, podlePr, souhlasPr }, vazby, konfig] = await Promise.all([nactiTabuli(), nactiPr(api), nactiVazby(api), nactiKonfig(api)]);
  const kolegove = uctyKolegu(konfig.rezimy);
  if (!nanecisto) await zalozPole(tabule);
  const volbyCekaNa = new Map((tabule.poleCekaNa?.options || []).map((o) => [o.name, o.id]));
  let poliPilotu = 0;
  const bezProLidi = [];
  /** Srovná pole pilotu u položky; vrací počet změněných polí. Nanečisto jen vypíše. */
  const srovnejPilot = async (p, cil) => {
    const zmeny = [];
    if ('proLidi' in cil && cil.proLidi !== p.hodnoty.proLidi) zmeny.push([tabule.poleProLidi, cil.proLidi ? { text: cil.proLidi } : null, POLE_PRO_LIDI, cil.proLidi]);
    if ('termin' in cil && cil.termin !== p.hodnoty.termin) zmeny.push([tabule.poleTermin, cil.termin ? { date: cil.termin } : null, POLE_TERMIN, cil.termin]);
    if ('cekaNa' in cil && cil.cekaNa && cil.cekaNa !== p.hodnoty.cekaNa) {
      const id = volbyCekaNa.get(cil.cekaNa);
      if (id || nanecisto) zmeny.push([tabule.poleCekaNa, id ? { singleSelectOptionId: id } : null, POLE_CEKA_NA, cil.cekaNa]);
      else chybi.add(`${POLE_CEKA_NA}: ${cil.cekaNa}`);
    }
    for (const [pole, hodnota, nazev, popis] of zmeny) {
      console.log(`#${p.content.number}: ${nazev} → ${popis || '(prázdné)'}`);
      if (!nanecisto && pole) await nastavPole(tabule, p, pole, hodnota);
    }
    return zmeny.length;
  };
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
    if (c.__typename === 'PullRequest') {
      veta = c.state === 'OPEN' ? podlePr.get(c.number) ?? 'čeká na vyhodnocení' : '';
      if (c.state === 'OPEN') {
        const kdo = cekaNaPr({ otevreny: true, cekaNaSouhlas: souhlasPr.get(c.number) === true });
        poliPilotu += await srovnejPilot(p, { cekaNa: kdo });
      }
    }
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
    const stitky = c.labels.nodes.map((l) => l.name);
    const cil = cilovyStav({ stav: c.state, stitky, telo: c.body }, prs.get(c.number) || []);
    // Pole pilotu jen u otevřených: zavřených karet jsou stovky a pohledy pilotu filtrují `is:open`.
    if (cil !== null && c.state === 'OPEN') {
      const pl = proLidi({ titulek: c.title, telo: c.body });
      if (pl.chybi && c.state === 'OPEN' && stitky.includes('interni')) bezProLidi.push(c.number);
      const v = vazby.get(c.number) || {};
      const kdo = cekaNa({ stav: c.state, stitky, telo: c.body, rodic: v.rodic, prirazeni: (c.assignees?.nodes || []).map((a) => a.login) }, cil, { kolegove, dnes });
      poliPilotu += await srovnejPilot(p, { proLidi: pl.text, cekaNa: kdo, termin: stitky.includes('pripominka') ? termin(c.body) : null });
    }
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
  console.log(`${nanecisto ? 'Nanečisto: ' : ''}${zmen} změn stavu, ${poznamek} změn pole „${POLE_POZNAMKY}“, ${poliPilotu} změn polí pilotu.`);
  if (bezProLidi.length) console.log(`::warning::Interní zadání bez řádku „Pro lidi:“ (pole má název issue): ${bezProLidi.map((n) => `#${n}`).join(', ')}`);
  if (chybi.size) console.log(`::warning::V projektu chybí stavy: ${[...chybi].join(', ')} (docs/spoluprace-na-githubu.md, oddíl 3).`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await main();
