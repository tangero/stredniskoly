// Čerstvost dat (#355, etapa 3, docs/monitoring-produkce.md): ze stavu datových sad (`public/stav_datovych_sad.json`)
// vybere sady s použitím `web`, jejichž očekávaný termín (`ocekavano.kdy`) minul a web pořád ukazuje starší období
// (`zobrazeno.obdobi` < `ocekavano.obdobi`). Týdenní přehled je vypíše, kontrola dostupnosti je ve zvýšeném režimu
// pošle do Telegramu, jednou za sadu a očekávané období. Registr ani datovou linku nemění, jen čte soubor z checkoutu.

import fs from 'node:fs';
import { REPO } from '../brana/data.mjs';

export const CESTA_REGISTRU = new URL('../../public/stav_datovych_sad.json', import.meta.url);

export const nactiRegistr = (cesta = CESTA_REGISTRU) => JSON.parse(fs.readFileSync(cesta, 'utf8'));

/** Okamžik, kdy termín uplynul (UTC): `RRRR-MM` po celém měsíci, `RRRR-MM-DD` po celém dni; jinak null. */
export function konecTerminu(kdy) {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(kdy || '');
  if (!m) return null;
  return m[3] ? Date.UTC(+m[1], +m[2] - 1, +m[3] + 1) : Date.UTC(+m[1], +m[2], 1);
}

/** Sady po očekávaném termínu. Sady bez očekávaného období nebo termínu se neposuzují (není s čím porovnat). */
export function sadyPoTerminu(registr, ted) {
  return Object.entries(registr?.sady || {}).flatMap(([sada, s]) => {
    const zobrazeno = s.zobrazeno?.obdobi;
    const { obdobi: ocekavano, kdy } = s.ocekavano || {};
    if (s.pouziti !== 'web' || !zobrazeno || !ocekavano) return [];
    const konec = konecTerminu(kdy);
    if (konec == null || ted < konec || !(String(zobrazeno) < String(ocekavano))) return [];
    return [{ sada, nazev: s.nazev || sada, zobrazeno: String(zobrazeno), ocekavano: String(ocekavano), kdy }];
  });
}

const klic = (s) => `${s.sada}@${s.ocekavano}`;

export const textCerstvost = (s) => `Data po termínu: ${s.nazev} (${s.sada}). Web ukazuje ${s.zobrazeno}, `
  + `období ${s.ocekavano} se čekalo do ${s.kdy}.\nhttps://github.com/${REPO}/blob/main/public/stav_datovych_sad.json`;

/**
 * Ve zvýšeném režimu pošle každou sadu po termínu do Telegramu jednou za sadu a období (K17). Odeslané zapíše
 * do `stav.cerstvost` (klíč `sada@obdobi`, čas odeslání); nepovedené odeslání se zkusí v dalším běhu. Sady,
 * které už po termínu nejsou (přepnuté), ze stavu vypadnou. V běžném režimu nic neposílá ani nemaže.
 */
export async function oznamCerstvost(stav, sady, { rezimBehu, telegram, ted }) {
  if (rezimBehu !== 'zvyseny') return 0;
  const drive = stav.cerstvost || {};
  const nove = Object.fromEntries(sady.filter((s) => drive[klic(s)]).map((s) => [klic(s), drive[klic(s)]]));
  let poslano = 0;
  for (const s of sady.filter((x) => !nove[klic(x)])) {
    try {
      await telegram(textCerstvost(s));
      nove[klic(s)] = new Date(ted).toISOString();
      poslano++;
    } catch (e) {
      console.log(`::warning::Upozornění na data po termínu (${s.sada}) se nepodařilo poslat: ${e.message}`);
    }
  }
  stav.cerstvost = nove;
  return poslano;
}
