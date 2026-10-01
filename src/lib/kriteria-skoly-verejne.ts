import { unstable_cache } from 'next/cache';
import { dotaz, jeDbNastavena } from './novinky-db';
import { TAG_KRITERIA } from './portal-api';
import type { ZaznamKriteriiSkoly } from './kriteria-skoly-vyber';

export { kriteriaOdSkoly, type ZaznamKriteriiSkoly } from './kriteria-skoly-vyber';

// ============================================================================
// Kritéria zadaná školou v portálu pro veřejné stránky oboru
// (docs/prototyp-kriteria-prijeti.md, bod 4). Stejný vzor jako
// portal-profil-verejne.ts: jeden dotaz pro celý web v cache se značkou,
// zápis kritérií ji zneplatní. Platnost 12 hodin jako ISR stránky oboru
// (viz portal-profil-verejne.ts).
//
// Bez databáze (build, náhled) a při výpadku se vrací prázdný seznam: stránka
// pak ukáže strojový přepis s výhradou, jako dosud. Nikdy nespadne kvůli portálu.
// ============================================================================

const nactiZaznamy = unstable_cache(
  async (): Promise<ZaznamKriteriiSkoly[]> => {
    const result = await dotaz<ZaznamKriteriiSkoly>(
      `select redizo, rok, kolo, rezim, popis, odkaz, obor_identita, struktura
         from portal_kriteria where zneplatneno is null`,
    );
    return result.rows;
  },
  ['portal-kriteria-verejne'],
  { tags: [TAG_KRITERIA], revalidate: 43200 },
);

export async function vsechnaKriteriaSkol(): Promise<ZaznamKriteriiSkoly[]> {
  if (!jeDbNastavena()) return [];
  try {
    return await nactiZaznamy();
  } catch (e) {
    console.error('❌ Portál: kritéria škol nejdou načíst', e);
    return [];
  }
}
