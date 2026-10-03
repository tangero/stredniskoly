// Sloučení PR po bráně (docs/navrh-rizeni-vyvoje-2027.md, oddíl 9).
//
//   node scripts/brana/sloucit.mjs <číslo PR>              vyhodnotí a sloučí
//   node scripts/brana/sloucit.mjs <číslo PR> --jen-vyhodnotit
//
// Těsně před sloučením bránu vyhodnotí znovu nad čerstvými daty (štítek stop, souhlas, protokol)
// a ověří, že kontrola „Brána sloučení“ na aktuální hlavě prošla. Zamrznutí zná jen workflow
// (proměnné repozitáře), proto se bez úspěšné kontroly nesloučí nic. Slučuje se s pevnou hlavou
// (sha), takže push mezi kontrolou a sloučením sloučení odmítne. Vestavěný automatický merge se
// nepoužívá, protože by sloučil podle staršího výsledku.

import { vyhodnot } from './brana.mjs';
import { REPO, vytvorApi, nactiKonfig, nactiPr } from './data.mjs';

const NAZEV_KONTROLY = 'Brána sloučení';

export async function posledniKontrola(api, sha) {
  const d = await api(`repos/${REPO}/commits/${sha}/check-runs?check_name=${encodeURIComponent(NAZEV_KONTROLY)}&filter=latest`);
  return (d.check_runs || []).sort((a, b) => b.id - a.id)[0] || null;
}

async function main() {
  const [arg, prepinac] = process.argv.slice(2);
  const cislo = Number(arg);
  if (!cislo) {
    console.error('Použití: node scripts/brana/sloucit.mjs <číslo PR> [--jen-vyhodnotit]');
    process.exit(2);
  }
  const api = vytvorApi();
  const konfig = await nactiKonfig(api);
  const vstup = await nactiPr(api, cislo);
  const verdikt = vyhodnot({ ...vstup, konfig, zamrznuti: null, ted: Date.now() });
  console.log(`PR #${cislo}, režim ${verdikt.rezim}: ${verdikt.uspech ? 'prošlo' : 'neprošlo'}`);
  for (const d of verdikt.duvody) console.log(`  - ${d}`);

  const kontrola = await posledniKontrola(api, vstup.pr.hlava.sha);
  console.log(`Kontrola na ${vstup.pr.hlava.sha.slice(0, 7)}: ${kontrola ? `${kontrola.conclusion} (${kontrola.output?.title})` : 'zatím žádná'}`);

  if (prepinac === '--jen-vyhodnotit') return;
  if (vstup.pr.stav !== 'open' || vstup.pr.zakladna !== 'main') {
    console.error('PR není otevřený do main; nesloučeno.');
    process.exit(1);
  }
  if (!verdikt.uspech) process.exit(1);
  if (kontrola?.conclusion !== 'success') {
    console.error('Kontrola brány na aktuální hlavě neprošla nebo ještě neběžela; nesloučeno.');
    process.exit(1);
  }
  await api(`repos/${REPO}/pulls/${cislo}/merge`, {
    method: 'PUT',
    body: { sha: vstup.pr.hlava.sha, merge_method: 'merge' },
  });
  console.log(`PR #${cislo} sloučen.`);
}

await main();
