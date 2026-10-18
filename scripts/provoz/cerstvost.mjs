// Čerstvost dat (#355, etapa 3; #507, docs/monitoring-produkce.md): ze stavu datových sad
// (`public/stav_datovych_sad.json`) vybere sady s použitím `web`, jejichž očekávaný termín (`ocekavano.kdy`) minul
// a web pořád ukazuje starší období, než se čekalo (podle konce období, ne podle textu), nebo se očekávané období
// vůbec nezjistilo (`ocekavano.obdobi` chybí, stejně jako „po termínu“ v administraci, `src/lib/admin.ts`).
// Týdenní přehled je vypíše, kontrola dostupnosti je ve zvýšeném režimu pošle do Telegramu, jednou za sadu
// a očekávané období (u sady bez něj za termín). Registr ani datovou linku nemění, jen čte soubor z checkoutu.

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

/** Konec období (UTC, výlučně): `RRRR` konec roku, `RRRR-MM` konec měsíce, `RRRR-MM-DD` konec dne; jinak null. */
export function konecObdobi(obdobi) {
  const text = String(obdobi ?? '');
  return /^\d{4}$/.test(text) ? Date.UTC(+text + 1, 0, 1) : konecTerminu(text);
}

const varujKonzole = (text) => console.log(`::warning::${text}`);

/**
 * Sady po očekávaném termínu. Se známým očekávaným obdobím jen ty, jejichž zobrazené období končí dřív než
 * očekávané; nerozpoznatelný tvar období se nehlásí, jen se vypíše varováním. Sada bez očekávaného období se po
 * termínu hlásí vždy (`ocekavano: null`, termín minul a nové období se nezjistilo). Sady bez termínu se neposuzují.
 */
export function sadyPoTerminu(registr, ted, { varuj = varujKonzole } = {}) {
  return Object.entries(registr?.sady || {}).flatMap(([sada, s]) => {
    const zobrazeno = s.zobrazeno?.obdobi;
    const { obdobi: ocekavano, kdy } = s.ocekavano || {};
    if (s.pouziti !== 'web' || !zobrazeno) return [];
    const konec = konecTerminu(kdy);
    if (konec == null || ted < konec) return [];
    const zaznam = { sada, nazev: s.nazev || sada, zobrazeno: String(zobrazeno), ocekavano: null, kdy };
    if (!ocekavano) return [zaznam];
    const [konecZobrazeno, konecOcekavano] = [konecObdobi(zobrazeno), konecObdobi(ocekavano)];
    if (konecZobrazeno == null || konecOcekavano == null) {
      varuj(`Čerstvost dat: sada ${sada} má nerozpoznatelné období (zobrazeno ${zobrazeno}, očekáváno ${ocekavano}), neposuzuje se.`);
      return [];
    }
    return konecZobrazeno < konecOcekavano ? [{ ...zaznam, ocekavano: String(ocekavano) }] : [];
  });
}

/** Klíč deduplikace: sada a očekávané období, u sady bez něj sada a termín. */
const klic = (s) => (s.ocekavano ? `${s.sada}@${s.ocekavano}` : `${s.sada}@termin-${s.kdy}`);

/** Co se čekalo: „období X se čekalo do K“, nebo „termín K minul, nové období nezjištěno“. */
export const popisOcekavani = (s) => (s.ocekavano
  ? `období ${s.ocekavano} se čekalo do ${s.kdy}`
  : `termín ${s.kdy} minul, nové období nezjištěno`);

export const textCerstvost = (s) => `Data po termínu: ${s.nazev} (${s.sada}). Web ukazuje ${s.zobrazeno}, `
  + `${popisOcekavani(s)}.\nhttps://github.com/${REPO}/blob/main/public/stav_datovych_sad.json`;

/**
 * Ve zvýšeném režimu pošle každou sadu po termínu do Telegramu jednou za sadu a období (K17). Odeslané zapíše
 * do `stav.cerstvost` (klíč `sada@obdobi`, u sady bez očekávaného období `sada@termin-kdy`, čas odeslání); nepovedené odeslání se zkusí v dalším běhu. Sady,
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
