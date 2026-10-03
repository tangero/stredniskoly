// Sloučení PR po bráně (docs/navrh-rizeni-vyvoje-2027.md, oddíl 9).
//
//   node scripts/brana/sloucit.mjs <číslo PR>              vyhodnotí a sloučí
//   node scripts/brana/sloucit.mjs <číslo PR> --jen-vyhodnotit
//
// Těsně před sloučením bránu vyhodnotí znovu nad čerstvými daty (štítek stop, souhlas, protokol)
// a vyžádá si nové vyhodnocení na serveru: komentář v PR spustí workflow brány a skript čeká na
// kontrolu, kterou zapsal právě běh vyvolaný tímto komentářem (číslo komentáře v external_id).
// Jiný výsledek, i později dokončený, nestačí: mohl načíst vstupy před začátkem zamrznutí nebo
// před přidáním stop. Po odpovědi skript veto ověří ještě jednou. Slučuje se s pevnou hlavou (sha),
// takže push mezi kontrolou a sloučením sloučení odmítne. Vestavěný automatický merge se
// nepoužívá, protože by sloučil podle staršího výsledku.

import { pathToFileURL } from 'node:url';
import { vyhodnot, ZADOST } from './brana.mjs';
import { REPO, NAZEV_KONTROLY, vytvorApi, nactiKonfig, nactiPr, kontrolyBrany } from './data.mjs';

const CEKANI_MS = 10 * 60 * 1000;
const INTERVAL_MS = 15 * 1000;

/** Čeká na kontrolu brány, která odpovídá na žádost (komentář `zadost`) u PR `cislo`; null po vypršení. */
export async function odpovedNaZadost(api, sha, cislo, zadost, { cekani = CEKANI_MS, interval = INTERVAL_MS, spanek } = {}) {
  const spi = spanek || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const konec = Date.now() + cekani;
  for (;;) {
    const k = (await kontrolyBrany(api, sha)).find((x) => x.brana.pr === cislo && x.brana.zadost === zadost);
    if (k && k.status === 'completed') return k;
    if (Date.now() >= konec) return null;
    await spi(interval);
  }
}

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
  if (konfig.rezimy.slucovani_ai !== true) {
    console.error('Slučování AI je vypnuté (slucovani_ai v .github/rezimy.yml v main); sloučí vlastník.');
    process.exit(1);
  }
  if (vstup.pr.stav !== 'open' || vstup.pr.zakladna !== 'main') {
    console.error('PR není otevřený do main; nesloučeno.');
    process.exit(1);
  }
  if (!verdikt.uspech) process.exit(1);

  const zadost = await api(`repos/${REPO}/issues/${cislo}/comments`, {
    method: 'POST',
    body: { body: `Žádost o vyhodnocení brány před sloučením commitu ${vstup.pr.hlava.sha.slice(0, 7)}.\n\n${ZADOST}` },
  });
  const odpoved = await odpovedNaZadost(api, vstup.pr.hlava.sha, cislo, zadost.id);
  if (odpoved?.conclusion !== 'success') {
    console.error(odpoved
      ? `Brána po žádosti neprošla (${odpoved.output?.title}); nesloučeno.`
      : 'Brána do 10 minut na žádost neodpověděla; nesloučeno.');
    process.exit(1);
  }
  // Veto mohlo přibýt i během čekání: poslední místní kontrola na čerstvých datech a stejné hlavě.
  const znovu = await nactiPr(api, cislo);
  const zaver = vyhodnot({ ...znovu, konfig, zamrznuti: null, ted: Date.now() });
  if (!zaver.uspech || znovu.pr.hlava.sha !== vstup.pr.hlava.sha) {
    console.error(`Před sloučením se stav změnil: ${zaver.duvody.join('; ')}; nesloučeno.`);
    process.exit(1);
  }
  await api(`repos/${REPO}/pulls/${cislo}/merge`, {
    method: 'PUT',
    body: { sha: vstup.pr.hlava.sha, merge_method: 'merge' },
  });
  console.log(`PR #${cislo} sloučen.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await main();
