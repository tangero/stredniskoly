import { promises as fs } from 'fs';
import path from 'path';

// Ruční opravy úředního názvu školy (src/data/opravy-nazvu-skol.json), dokud je
// rejstřík škol MŠMT nenese. Cachuje se příslib, ne hodnota.
let cache: Promise<Record<string, { uplny_nazev?: string }>> | null = null;

function nactiOpravy(): Promise<Record<string, { uplny_nazev?: string }>> {
  if (!cache) {
    cache = fs
      .readFile(path.join(process.cwd(), 'src', 'data', 'opravy-nazvu-skol.json'), 'utf-8')
      .then((obsah) => (JSON.parse(obsah) as { skoly?: Record<string, { uplny_nazev?: string }> }).skoly ?? {})
      .catch((e) => {
        cache = null; // po výpadku zkusit znovu
        throw e;
      });
  }
  return cache;
}

/** Všechny opravy (REDIZO → úřední název); prázdný objekt, když soubor nejde načíst. */
export async function vsechnyOpravyNazvu(): Promise<Record<string, string>> {
  try {
    const opravy = await nactiOpravy();
    return Object.fromEntries(
      Object.entries(opravy).flatMap(([redizo, o]) => (o.uplny_nazev?.trim() ? [[redizo, o.uplny_nazev.trim()]] : [])),
    );
  } catch (e) {
    console.error('❌ src/data/opravy-nazvu-skol.json nejde načíst', e);
    return {};
  }
}

/** Opravený úřední název školy, nebo null, když oprava není (nebo soubor nejde načíst). */
export async function opravenyNazevSkoly(redizo: string): Promise<string | null> {
  try {
    return (await nactiOpravy())[redizo]?.uplny_nazev?.trim() || null;
  } catch (e) {
    console.error('❌ src/data/opravy-nazvu-skol.json nejde načíst', e);
    return null;
  }
}
