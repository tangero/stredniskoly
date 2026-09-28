import { promises as fs } from 'fs';
import path from 'path';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import type { KriteriaOboru, PoziceOboru } from '@/lib/prevod-testu-vypocet';
import calendar from '@/data/admissions-2027.json';

// ============================================================================
// Podklady prototypu pásmového proužku k jednomu oboru (docs/navrh-pasmovy-
// prouzek-2027.md, oddíl 4.6): rozdělení výsledků soutěžících uchazečů pro
// *Pořadí mezi soutěžícími* a přepis kritérií 2026 z PDF v DiPSy.
// Soubory mají stovky kB, klientovi jde jen záznam vybraného oboru.
// ============================================================================

// Cachuje se probíhající načtení, ne až výsledek: souběžné požadavky (stránka
// načítá devět oborů naráz) by jinak každý četly a parsovaly soubor znovu.
const cache = new Map<string, Promise<unknown>>();

function nacti<T>(soubor: string): Promise<T | null> {
  let slib = cache.get(soubor) as Promise<T | null> | undefined;
  if (!slib) {
    slib = fs.readFile(path.join(process.cwd(), 'public', soubor), 'utf-8')
      .then((t) => JSON.parse(t) as T)
      .catch(() => {
        cache.delete(soubor); // chybějící soubor zkusit příště znovu
        return null;
      });
    cache.set(soubor, slib);
  }
  return slib;
}

/** Rozdělení výsledků soutěžících uchazečů o obor v roce pásem. */
export async function poziceOboru(klic: string): Promise<PoziceOboru | null> {
  const rok = await zobrazeneObdobi('cermat-uchazeci-kolo1');
  if (!rok) return null;
  const d = await nacti<{ data: Record<string, Record<string, number>> }>(`pozice_soutezicich_${rok}.json`);
  return d?.data[klic] ?? null;
}

/** Přepis kritérií předchozího ročníku; rok souboru určuje sada `dipsy-kriteria`. */
export async function kriteriaOboru(klic: string): Promise<KriteriaOboru | null> {
  const rok = await zobrazeneObdobi('dipsy-kriteria');
  if (!rok) return null;
  const d = await nacti<{ rok: number; data: Record<string, { pdf: boolean; prepisy: KriteriaOboru['prepisy'] }> }>(
    `kriteria_prijeti_${rok}.json`,
  );
  if (!d) return null;
  // Termín, kdy školy zveřejní kritéria nového ročníku, z harmonogramu MŠMT.
  const udalost = calendar.groups
    .flatMap((g: { events: { id: string; date: string }[] }) => g.events)
    .find((e) => e.id === 'ss-kriteria');
  const zaznam = d.data[klic];
  return {
    rok: d.rok,
    pdf: Boolean(zaznam?.pdf),
    prepisy: zaznam?.prepisy ?? [],
    noveKriteria: udalost?.date ?? null,
  };
}
