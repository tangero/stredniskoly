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
  zobrazeno: { obdobi: string | null; platne_k?: string; stazeno?: string };
}

let cache: Record<string, ZaznamSady> | null = null;

async function sady(): Promise<Record<string, ZaznamSady>> {
  if (cache) return cache;
  const soubor = path.join(process.cwd(), 'public', 'stav_datovych_sad.json');
  cache = JSON.parse(await fs.readFile(soubor, 'utf-8')).sady ?? {};
  return cache!;
}

/** Zobrazené období sady, například „2026“; null, když sada nic nezobrazuje. */
export async function zobrazeneObdobi(sada: string): Promise<string | null> {
  return (await sady())[sada]?.zobrazeno?.obdobi ?? null;
}

/** Datum platnosti zobrazených dat (RRRR-MM-DD), pokud ho registr vede; jinak datum stažení. */
export async function platnostObdobi(sada: string): Promise<string | null> {
  const z = (await sady())[sada]?.zobrazeno;
  return z?.platne_k ?? z?.stazeno ?? null;
}
