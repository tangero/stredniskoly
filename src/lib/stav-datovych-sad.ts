import { promises as fs } from 'fs';
import path from 'path';

/**
 * Registr stavu datových sad, public/stav_datovych_sad.json.
 *
 * Jediné místo, které určuje, jaké období datové sady web zobrazuje.
 * Postup a pravidla: docs/zdroje-dat.md, oddíl 5. Letopočet dat se v kódu
 * nepíše napevno.
 */
interface ZaznamSady {
  zobrazeno: { obdobi: string | null; platne_k?: string; stazeno?: string; verze?: string };
}

// Cachuje se příslib, ne hodnota: souběžné požadavky by jinak spustily tolik
// čtení a `JSON.parse`, kolik jich přijde, než první dobehne.
let cache: Promise<Record<string, ZaznamSady>> | null = null;

function sady(): Promise<Record<string, ZaznamSady>> {
  if (!cache) {
    const soubor = path.join(process.cwd(), 'public', 'stav_datovych_sad.json');
    cache = fs
      .readFile(soubor, 'utf-8')
      .then((o) => JSON.parse(o).sady ?? {})
      .catch((e) => {
        cache = null; // ať se po výpadku disku dá zkusit znovu
        throw e;
      });
  }
  return cache;
}

/** Zobrazené období sady, například „2026“; null, když sada nic nezobrazuje. */
export async function zobrazeneObdobi(sada: string): Promise<string | null> {
  return (await sady())[sada]?.zobrazeno?.obdobi ?? null;
}

/**
 * Verze zobrazených dat, například „předběžná, platné přihlášky ke dni 13. 5. 2026“.
 *
 * CERMAT vydává data o uchazečích nejdřív předběžně a finální revizi až o rok
 * později. Když web ukazuje předběžný ročník, musí to být u čísel vidět;
 * null, když registr verzi nevede nebo jde o úplná data.
 */
export async function verzeObdobi(sada: string): Promise<string | null> {
  return (await sady())[sada]?.zobrazeno?.verze ?? null;
}

/** Datum platnosti zobrazených dat (RRRR-MM-DD), pokud ho registr vede; jinak datum stažení. */
export async function platnostObdobi(sada: string): Promise<string | null> {
  const z = (await sady())[sada]?.zobrazeno;
  return z?.platne_k ?? z?.stazeno ?? null;
}
