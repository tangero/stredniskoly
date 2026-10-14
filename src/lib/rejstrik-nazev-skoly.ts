import { promises as fs } from 'fs';
import path from 'path';
import { opravenyNazevSkoly } from './opravy-nazvu-skol';
import { doplnOrientacniCislo } from './adresa-skoly';

// ============================================================================
// Plný název školy z rejstříku škol MŠMT pro nadpis a titulek stránky školy.
// Katalog (public/school_analysis.json) nese jen zkrácený název („Střední
// zdravotnická škola, Mládeže“), plný název („Střední zdravotnická škola,
// Beroun, Mládeže 1102“) je v indexu rejstříku, který generuje
// scripts/build-nazvy-oboru-rejstrik.py. Tentýž soubor čte portál
// (portal-identifikace.ts); index má skoro megabajt, proto se cachuje příslib.
// ============================================================================

let cache: Promise<Record<string, { uplny_nazev?: string; adresa?: string }>> | null = null;

function nactiIdentifikaci(): Promise<Record<string, { uplny_nazev?: string; adresa?: string }>> {
  if (!cache) {
    cache = fs
      .readFile(path.join(process.cwd(), 'data', 'msmt_rejstrik', 'nazvy-oboru.json'), 'utf-8')
      .then((obsah) => (JSON.parse(obsah) as { identifikace?: Record<string, { uplny_nazev?: string; adresa?: string }> }).identifikace ?? {})
      .catch((e) => {
        cache = null; // po výpadku zkusit znovu
        throw e;
      });
  }
  return cache;
}

/** Plný název z rejstříku (přebije ho ruční oprava z src/data/opravy-nazvu-skol.json), nebo null, když škola v indexu není nebo index nejde načíst. */
export async function uplnyNazevZRejstriku(redizo: string): Promise<string | null> {
  const oprava = await opravenyNazevSkoly(redizo);
  if (oprava) return oprava;
  try {
    return (await nactiIdentifikaci())[redizo]?.uplny_nazev?.trim() || null;
  } catch (e) {
    console.error('❌ Stránka školy: data/msmt_rejstrik/nazvy-oboru.json nejde načíst', e);
    return null;
  }
}

/** Katalogová adresa doplněná o orientační číslo z rejstříku; při výpadku indexu adresa beze změny. */
export async function adresaSkolyZRejstriku(redizo: string, adresaKatalog: string): Promise<string> {
  try {
    return doplnOrientacniCislo(adresaKatalog, (await nactiIdentifikaci())[redizo]?.adresa);
  } catch (e) {
    console.error('❌ Stránka školy: data/msmt_rejstrik/nazvy-oboru.json nejde načíst', e);
    return adresaKatalog;
  }
}
