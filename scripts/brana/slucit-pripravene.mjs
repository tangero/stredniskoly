// Automatické slučování (docs/navrh-rizeni-vyvoje-2027.md, oddíl 9, RA40): po každém běhu brány projde
// otevřené PR do main a ty, jejichž poslední kontrola „Brána sloučení“ prošla, sloučí funkcí sloucit()
// ze sloucit.mjs (nové vyhodnocení, žádost o kontrolu na serveru, pevná hlava). Běží ve workflow
// slouceni.yml s tokenem vlastníka: komentář s žádostí od GITHUB_TOKEN by bránu nespustil.

import { pathToFileURL } from 'node:url';
import { REPO, vytvorApi } from './data.mjs';
import { ctiExterniId } from './brana.mjs';
import { sloucit, posledniKontrola } from './sloucit.mjs';

/**
 * Čísla otevřených PR do main (bez draftů), která brána naposledy pustila a GitHub je dovolí sloučit.
 * Vynechá PR s konfliktem nebo s nedoběhlými povinnými kontrolami (`mergeable_state` jiný než `clean`
 * a `unstable`; brána bývá hotová dřív než testy) a PR, jejichž poslední kontrola už odpovídala na žádost
 * před sloučením: pokus na tomto commitu proběhl a GitHub ho odmítl. Bez toho by každá žádost spustila
 * bránu a ta nový pokus, dokola.
 */
export async function pripravene(api, { spanek = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const otevrene = await api(`repos/${REPO}/pulls?state=open&base=main&per_page=100`);
  const vysledek = [];
  for (const p of otevrene) {
    if (p.draft) continue;
    const k = await posledniKontrola(api, p.head.sha);
    if (k?.status !== 'completed' || k.conclusion !== 'success') continue;
    if (ctiExterniId(k.external_id)?.zadost) continue;
    // GitHub počítá slučitelnost líně: první dotaz může vrátit `unknown`, chvíli počkej a zeptej se znovu.
    let detail = await api(`repos/${REPO}/pulls/${p.number}`);
    for (let i = 0; i < 3 && (detail.mergeable == null || detail.mergeable_state === 'unknown'); i++) {
      await spanek(3000);
      detail = await api(`repos/${REPO}/pulls/${p.number}`);
    }
    if (detail.mergeable === false || !['clean', 'unstable', 'has_hooks'].includes(detail.mergeable_state)) continue;
    vysledek.push(p.number);
  }
  return vysledek;
}

async function main() {
  const api = vytvorApi();
  const cisla = await pripravene(api);
  console.log(cisla.length ? `Brána pustila: ${cisla.map((n) => `#${n}`).join(', ')}` : 'Žádný PR, který by brána pustila.');
  let chyba = false;
  for (const n of cisla) {
    try {
      const v = await sloucit(api, n);
      if (!v.slouceno) console.log(`#${n}: ${v.duvod}`);
    } catch (e) {
      // Chyba u jednoho PR nesmí zastavit ostatní.
      chyba = true;
      console.log(`::error::#${n}: ${e.message}`);
    }
  }
  if (chyba) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await main();
