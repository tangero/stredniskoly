// Automatické slučování (docs/navrh-rizeni-vyvoje-2027.md, oddíl 9, RA40): po každém běhu brány projde
// otevřené PR do main a ty, jejichž poslední kontrola „Brána sloučení“ prošla, sloučí funkcí sloucit()
// ze sloucit.mjs (nové vyhodnocení, žádost o kontrolu na serveru, pevná hlava). Běží ve workflow
// slouceni.yml s tokenem vlastníka: komentář s žádostí od GITHUB_TOKEN by bránu nespustil.

import { pathToFileURL } from 'node:url';
import { REPO, vytvorApi } from './data.mjs';
import { sloucit, posledniKontrola } from './sloucit.mjs';

/** Čísla otevřených PR do main (bez draftů), která brána naposledy pustila. */
export async function pripravene(api) {
  const otevrene = await api(`repos/${REPO}/pulls?state=open&base=main&per_page=100`);
  const vysledek = [];
  for (const p of otevrene) {
    if (p.draft) continue;
    const k = await posledniKontrola(api, p.head.sha);
    if (k?.status === 'completed' && k.conclusion === 'success') vysledek.push(p.number);
  }
  return vysledek;
}

async function main() {
  const api = vytvorApi();
  const cisla = await pripravene(api);
  console.log(cisla.length ? `Brána pustila: ${cisla.map((n) => `#${n}`).join(', ')}` : 'Žádný PR, který by brána pustila.');
  for (const n of cisla) {
    const v = await sloucit(api, n);
    if (!v.slouceno) console.log(`#${n}: ${v.duvod}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await main();
