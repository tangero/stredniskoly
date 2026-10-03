// Sloučení PR po bráně (docs/navrh-rizeni-vyvoje-2027.md, oddíl 9).
//
//   node scripts/brana/sloucit.mjs <číslo PR>              vyhodnotí a sloučí
//   node scripts/brana/sloucit.mjs <číslo PR> --jen-vyhodnotit
//
// Těsně před sloučením bránu vyhodnotí znovu nad čerstvými daty (štítek stop, souhlas, protokol)
// a vyžádá si nové vyhodnocení na serveru: komentář v PR spustí workflow brány a skript čeká na
// kontrolu „Brána sloučení“ zapsanou až po tomto komentáři. Starší úspěch nestačí, protože mezitím
// mohlo začít zamrznutí (proměnné repozitáře zná jen workflow). Slučuje se s pevnou hlavou (sha),
// takže push mezi kontrolou a sloučením sloučení odmítne. Vestavěný automatický merge se
// nepoužívá, protože by sloučil podle staršího výsledku.

import { pathToFileURL } from 'node:url';
import { vyhodnot } from './brana.mjs';
import { REPO, vytvorApi, nactiKonfig, nactiPr } from './data.mjs';

const NAZEV_KONTROLY = 'Brána sloučení';

const CEKANI_MS = 10 * 60 * 1000;
const INTERVAL_MS = 15 * 1000;

/** Čeká na kontrolu brány na hlavě, zapsanou nejdřív v čase `od`; null po vypršení. */
export async function cerstvaKontrola(api, sha, od, { cekani = CEKANI_MS, interval = INTERVAL_MS, spanek } = {}) {
  const spi = spanek || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const konec = Date.now() + cekani;
  for (;;) {
    const k = await posledniKontrola(api, sha);
    if (k && k.status === 'completed' && Date.parse(k.started_at) >= od) return k;
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
  if (vstup.pr.stav !== 'open' || vstup.pr.zakladna !== 'main') {
    console.error('PR není otevřený do main; nesloučeno.');
    process.exit(1);
  }
  if (!verdikt.uspech) process.exit(1);

  const zadost = await api(`repos/${REPO}/issues/${cislo}/comments`, {
    method: 'POST',
    body: { body: `Žádost o vyhodnocení brány před sloučením commitu ${vstup.pr.hlava.sha.slice(0, 7)}.\n\n<!-- brana:pred-sloucenim -->` },
  });
  // Čas serveru, ne místní hodiny; sekundová přesnost, proto „nejdřív v tutéž sekundu“.
  const od = Date.parse(zadost.created_at);
  const cerstva = await cerstvaKontrola(api, vstup.pr.hlava.sha, od);
  if (cerstva?.conclusion !== 'success') {
    console.error(cerstva
      ? `Brána po žádosti neprošla (${cerstva.output?.title}); nesloučeno.`
      : 'Brána do 10 minut po žádosti nezapsala nový výsledek; nesloučeno.');
    process.exit(1);
  }
  await api(`repos/${REPO}/pulls/${cislo}/merge`, {
    method: 'PUT',
    body: { sha: vstup.pr.hlava.sha, merge_method: 'merge' },
  });
  console.log(`PR #${cislo} sloučen.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await main();
