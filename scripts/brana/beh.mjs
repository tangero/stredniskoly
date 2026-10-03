// Běh brány sloučení ve workflow brana-slouceni.yml (z main, pull_request_target a další události).
// Zaznamená otisky a souhlasy a ke každému dotčenému PR zapíše kontrolu „Brána sloučení“
// na jeho aktuální hlavu. Kód z PR nespouští ani nestahuje.

import fs from 'node:fs';
import { vyhodnot, zaznamSouhlasu, otisk, rozsah, ZNACKA } from './brana.mjs';
import { REPO, vytvorApi, nactiKonfig, nactiPr, nactiIssue, prOdkazujiciNa, otevrenePr } from './data.mjs';

export const NAZEV_KONTROLY = 'Brána sloučení';

const api = vytvorApi();
const udalost = process.env.GITHUB_EVENT_NAME;
const data = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const zamrznuti = { od: process.env.ZAMRZNUTI_OD || '', do: process.env.ZAMRZNUTI_DO || '' };

const komentuj = (cislo, telo) => api(`repos/${REPO}/issues/${cislo}/comments`, { method: 'POST', body: { body: telo } });

async function zapisKontrolu(pr, verdikt) {
  const titulek = verdikt.uspech
    ? `Prošlo (${verdikt.rezim})`
    : verdikt.cekaDo
      ? `Čeká na lhůtu (${verdikt.rezim})`
      : `Neprošlo (${verdikt.rezim})`;
  const a = verdikt.rozbor;
  const souhrn = [
    ...verdikt.duvody.map((d) => `- ${d}`),
    '',
    `Režim: ${verdikt.rezim}. Oblasti: ${a.oblasti.join(', ') || 'žádná'}. Změněné řádky mimo testy: ${a.radky}.`,
    a.k.length ? `Kontrolované činnosti: ${a.k.join(', ')}.` : '',
    a.h2.length ? `Pravomoci AI: ${a.h2.join(', ')}.` : '',
    'Pravidla: docs/navrh-rizeni-vyvoje-2027.md, oddíly 4 a 9; cesty v .github/rezimy.yml.',
  ].filter((r) => r !== '').join('\n');
  await api(`repos/${REPO}/check-runs`, {
    method: 'POST',
    body: {
      name: NAZEV_KONTROLY,
      head_sha: pr.hlava.sha,
      status: 'completed',
      conclusion: verdikt.uspech ? 'success' : 'failure',
      output: { title: titulek, summary: souhrn },
    },
  });
}

async function vyhodnotPr(cislo, konfig) {
  const vstup = await nactiPr(api, cislo);
  if (vstup.pr.stav !== 'open' || vstup.pr.zakladna !== 'main') return;
  const verdikt = vyhodnot({ ...vstup, konfig, zamrznuti, ted: Date.now() });
  for (const z of verdikt.zaznamenat) {
    await komentuj(z.issue, `Brána sloučení zaznamenala souhlas vlastníka přidaný před jejím zavedením, s dnešním rozsahem issue.\n\n${ZNACKA.souhlas(z.otisk)}`);
  }
  await zapisKontrolu(vstup.pr, verdikt);
  console.log(`PR #${cislo}: ${verdikt.uspech ? 'prošlo' : 'neprošlo'} (${verdikt.rezim}) – ${verdikt.duvody.join('; ')}`);
}

async function main() {
  const konfig = await nactiKonfig(api);
  let cisla = [];

  if (udalost === 'pull_request_target') {
    const pr = data.pull_request;
    if (data.action === 'labeled' && data.label?.name === 'schvaleno') {
      await komentuj(pr.number, `Brána sloučení zaznamenala souhlas vlastníka s commitem ${pr.head.sha.slice(0, 7)}. Nový push souhlas zruší.\n\n${ZNACKA.souhlasPr(pr.head.sha)}`);
    }
    cisla = [pr.number];
  } else if (udalost === 'issues' || udalost === 'issue_comment') {
    const cislo = data.issue.number;
    if (data.issue.pull_request) cisla = [cislo];
    else {
      if (udalost === 'issues' && data.action === 'labeled' && data.label?.name === 'navrh') {
        await komentuj(cislo, `Brána sloučení uložila otisk rozsahu k návrhu. Změna rozsahu před schválením souhlas zneplatní.\n\n${ZNACKA.otiskNavrhu(otisk(rozsah(data.issue.body || '')))}`);
      }
      if (udalost === 'issues' && data.action === 'labeled' && data.label?.name === 'schvaleno') {
        const issue = await nactiIssue(api, cislo);
        const znacka = zaznamSouhlasu(issue);
        const platny = znacka.startsWith('<!-- brana:souhlas ');
        await komentuj(cislo, platny
          ? `Brána sloučení zaznamenala souhlas vlastníka s tímto rozsahem. Pozdější změna rozsahu ho zneplatní.\n\n${znacka}`
          : `Brána sloučení souhlas nezaznamenala: rozsah se od přidání štítku navrh změnil. Zkontroluj tělo issue a přidej schvaleno znovu.\n\n${znacka}`);
      }
      cisla = await prOdkazujiciNa(api, cislo);
    }
  } else if (udalost === 'workflow_dispatch' && data.inputs?.pr) {
    cisla = [Number(data.inputs.pr)];
  } else {
    cisla = await otevrenePr(api);
  }

  let chyba = false;
  for (const cislo of cisla) {
    try {
      await vyhodnotPr(cislo, konfig);
    } catch (e) {
      chyba = true;
      console.error(`PR #${cislo}: ${e.message}`);
    }
  }
  if (chyba) process.exitCode = 1;
}

await main();
