// Denní export souhrnných ukazatelů Microsoft Clarity ze simulátoru (#329).
//
// Clarity Data Export API (https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export-api):
// limit 10 dotazů denně, data nejvýš za poslední 1 až 3 dny. Skript dělá 3 dotazy (dimenze URL, zařízení,
// prohlížeč) postupně s prodlevou 2 s. Při odpovědi 429 skončí, nic dalšího neposílá a vrátí kód 2.
//
// Stahují se jen souhrny po adresách (zobrazení, hloubka posunutí, opakovaná a mrtvá kliknutí, čas
// aktivity), žádné záznamy relací ani identifikátory návštěvníků. Výstup patří do soukromého repozitáře
// signálů (#326), do veřejného repozitáře se necommituje: skript odmítne zapsat soubor uvnitř něj.
//
// Použití: CLARITY_API_TOKEN=… node scripts/clarity-export.mjs --vystup /cesta/mimo/repozitar/clarity-RRRR-MM-DD.json [--dni 1]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ADRESA_API = 'https://www.clarity.ms/export-data/api/v1/project-live-insights';
export const DIMENZE = ['URL', 'Device', 'Browser'];
export const PRODLEVA_MS = 2000;
const KOREN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export class PrilisMnohoDotazu extends Error {}

/** Stáhne souhrny pro všechny dimenze; `fetchFn` a `cekej` jdou v testu nahradit. */
export async function stahni({ token, dni = 1, fetchFn = fetch, cekej = ms => new Promise(r => setTimeout(r, ms)) }) {
  if (!token) throw new Error('chybí CLARITY_API_TOKEN');
  if (![1, 2, 3].includes(dni)) throw new Error('--dni smí být 1, 2 nebo 3');
  const vysledek = {};
  for (const [i, dimenze] of DIMENZE.entries()) {
    if (i > 0) await cekej(PRODLEVA_MS);
    const url = `${ADRESA_API}?numOfDays=${dni}&dimension1=${dimenze}`;
    const odpoved = await fetchFn(url, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    if (odpoved.status === 429) throw new PrilisMnohoDotazu(`Clarity vrátila 429 u dimenze ${dimenze}; export končí`);
    if (!odpoved.ok) throw new Error(`Clarity vrátila ${odpoved.status} u dimenze ${dimenze}`);
    vysledek[dimenze] = await odpoved.json();
  }
  return vysledek;
}

/** Výstup nesmí ležet ve veřejném repozitáři. */
export function mimoRepozitar(cil, koren = KOREN) {
  const rel = path.relative(koren, path.resolve(cil));
  return rel.startsWith('..') || path.isAbsolute(rel);
}

async function main() {
  const argumenty = process.argv.slice(2);
  const hodnota = jmeno => { const i = argumenty.indexOf(jmeno); return i >= 0 ? argumenty[i + 1] : undefined; };
  const cil = hodnota('--vystup');
  if (!cil) throw new Error('chybí --vystup (soubor mimo veřejný repozitář)');
  if (!mimoRepozitar(cil)) throw new Error(`výstup ${cil} leží ve veřejném repozitáři; zapiš ho do soukromého repozitáře signálů`);
  const dni = Number(hodnota('--dni') ?? 1);
  const data = await stahni({ token: process.env.CLARITY_API_TOKEN, dni });
  fs.mkdirSync(path.dirname(path.resolve(cil)), { recursive: true });
  fs.writeFileSync(cil, JSON.stringify({ stazeno: new Date().toISOString(), dni, data }, null, 2) + '\n');
  console.log(`zapsáno ${cil}: ${DIMENZE.join(', ')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => {
    console.error(e.message);
    process.exit(e instanceof PrilisMnohoDotazu ? 2 : 1);
  });
}
