#!/usr/bin/env node
/**
 * Moderace návrhů z Portálu pro školy (pilot 2027).
 *
 * VĚDOMÁ JEDNODUCHOST PILOTU: o schválení rozhoduje člověk čtením GitHub issue.
 * Tento skript nic nehodnotí – příkaz `apply` jen mechanicky přepíše JSON payload
 * z issue do public/portal_skol.json, přidá komentář „převzato" a issue zavře.
 * Před spuštěním `apply` si issue přečtěte a zkontrolujte obsah.
 *
 * Použití:
 *   GITHUB_TOKEN=… node scripts/portal-moderace.js list
 *   GITHUB_TOKEN=… node scripts/portal-moderace.js apply 123
 *   GITHUB_TOKEN=… node scripts/portal-moderace.js apply 123 --dry-run   # jen vypíše, nic nezapíše
 *
 * GITHUB_TOKEN potřebuje právo issues:write na repozitáři tangero/stredniskoly.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validatePortalPayload, buildPortalZaznam, PORTAL_VERZE_PRJIMANI } from '../src/lib/portal-skol.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL_JSON = path.join(ROOT, 'public', 'portal_skol.json');
const REPO = 'tangero/stredniskoly';
const LABEL = 'portal-skoly';

const token = process.env.GITHUB_TOKEN;

function headers() {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function github(pathUrl, options = {}) {
  const response = await fetch(`https://api.github.com${pathUrl}`, {
    ...options,
    headers: headers(),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${response.status}: ${text.slice(0, 300)}`);
  }
  return response.json();
}

async function list() {
  const issues = await github(`/repos/${REPO}/issues?labels=${LABEL}&state=open&per_page=100`);
  if (issues.length === 0) {
    console.log('Žádná otevřená issue s labelem „portal-skoly“.');
    return;
  }
  console.log(`Otevřené návrhy (${issues.length}):\n`);
  for (const issue of issues) {
    const datum = issue.created_at.slice(0, 10);
    console.log(`#${issue.number}\t${datum}\t${issue.title}`);
  }
  console.log(`\nSchválení proveďte: node scripts/portal-moderace.js apply <číslo>`);
}

/** Vytáhne všechny ```json ...``` bloky z textu. */
function extractJsonBlocks(body) {
  const blocks = [];
  const re = /```json\s*\n([\s\S]*?)\n```/g;
  let match;
  while ((match = re.exec(body || '')) !== null) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch {
      // poškozený blok přeskočíme
    }
  }
  return blocks;
}

/**
 * Najde aktuální payload: novější verze návrhu přicházejí jako komentáře
 * (API přidává komentář místo duplicitního issue), použije se tedy POSLEDNÍ
 * json blok z těla issue a všech komentářů v chronologickém pořadí.
 */
async function extractLatestPayload(issue) {
  const kandidati = extractJsonBlocks(issue.body);
  const comments = await github(`/repos/${REPO}/issues/${issue.number}/comments?per_page=100`);
  for (const comment of comments) {
    kandidati.push(...extractJsonBlocks(comment.body));
  }
  if (kandidati.length === 0) {
    throw new Error('V issue ani komentářích jsem nenašel ```json blok s payloadem.');
  }
  return kandidati[kandidati.length - 1];
}

async function apply(issueNumber, dryRun) {
  const issue = await github(`/repos/${REPO}/issues/${issueNumber}`);
  if (issue.state !== 'open') {
    throw new Error(`Issue #${issueNumber} není otevřené (stav: ${issue.state}).`);
  }
  const maLabel = (issue.labels || []).some((l) => (typeof l === 'string' ? l : l.name) === LABEL);
  if (!maLabel) {
    console.warn(`⚠️  Issue #${issueNumber} nemá label „${LABEL}“ – pokračuji, ale ověřte, že jde o návrh z portálu.`);
  }

  const rawPayload = await extractLatestPayload(issue);
  const redizo = String(rawPayload.redizo || '');
  if (!/^\d{9,10}$/.test(redizo)) {
    throw new Error('Payload nemá platné REDIZO.');
  }

  // Znovu zvalidujeme payload proti stejným pravidlům jako API (délky, povolená pole, souhlas)
  const vysledek = validatePortalPayload(rawPayload, { bezKontaktu: true });
  if (!vysledek.ok) {
    throw new Error(`Payload neprošel validací: ${vysledek.error}`);
  }

  const portalData = fs.existsSync(PORTAL_JSON)
    ? JSON.parse(fs.readFileSync(PORTAL_JSON, 'utf-8'))
    : {};

  const dnes = new Date().toISOString().slice(0, 10);
  const zaznam = buildPortalZaznam(
    portalData[redizo] || null,
    {
      redizo,
      nazev: String(rawPayload.nazev || ''),
      verze_prijimani: rawPayload.verze_prijimani || PORTAL_VERZE_PRJIMANI,
      udaje: vysledek.udaje,
      udaje_sedi: vysledek.udaje_sedi,
      nesrovnalost: vysledek.nesrovnalost,
      souhlas_cc_by: true,
      kontakt_email: '',
    },
    dnes,
  );

  console.log(`Issue #${issueNumber}: ${issue.title}`);
  console.log(`REDIZO ${redizo} – zapsané údaje (potvrzeno_dne ${dnes}, zdroj „skola“):`);
  for (const [key, v] of Object.entries(zaznam.udaje)) {
    console.log(`  - ${key}: ${String(v.hodnota).slice(0, 80)}${v.hodnota.length > 80 ? '…' : ''}`);
  }
  if (Object.keys(zaznam.udaje).length === 0) {
    console.log('  (žádná pole – návrh obsahoval jen potvrzení/nesrovnalost; publikuje se prázdný záznam, web ho nezobrazí)');
  }
  if (vysledek.nesrovnalost) {
    console.log(`\n⚠️  Návrh obsahuje nesrovnalost v datech katalogu – ta se NEPUBLIKUJE, řeší ji redakce:\n  ${vysledek.nesrovnalost.slice(0, 200)}`);
  }

  if (dryRun) {
    console.log('\n--dry-run: nic jsem nezapsal ani nezavřel.');
    return;
  }

  portalData[redizo] = zaznam;
  fs.writeFileSync(PORTAL_JSON, JSON.stringify(portalData, null, 2) + '\n');
  console.log(`\nZapsáno do ${path.relative(ROOT, PORTAL_JSON)}.`);

  await github(`/repos/${REPO}/issues/${issueNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body: `Převzato do \`public/portal_skol.json\` (${dnes}).` }),
  });
  await github(`/repos/${REPO}/issues/${issueNumber}`, {
    method: 'PATCH',
    body: JSON.stringify({ state: 'closed' }),
  });
  console.log(`Issue #${issueNumber} okomentováno a zavřeno.`);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!token) {
    console.error('Chybí GITHUB_TOKEN v prostředí.');
    process.exit(1);
  }
  try {
    if (command === 'list') {
      await list();
    } else if (command === 'apply') {
      const issueNumber = Number(rest.find((a) => /^\d+$/.test(a)));
      if (!issueNumber) {
        console.error('Použití: node scripts/portal-moderace.js apply <číslo-issue> [--dry-run]');
        process.exit(1);
      }
      await apply(issueNumber, rest.includes('--dry-run'));
    } else {
      console.error('Neznámý příkaz. Použití: list | apply <číslo-issue> [--dry-run]');
      process.exit(1);
    }
  } catch (error) {
    console.error(`Chyba: ${error.message}`);
    process.exit(1);
  }
}

main();
