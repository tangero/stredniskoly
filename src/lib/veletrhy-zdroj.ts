import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { dotaz, jeDbNastavena } from './novinky-db';
import { akceSezony } from './veletrhy-sklad';
import { SEZONA, snimekAkci, type Veletrh } from './veletrhy';

// ============================================================================
// Akce veletrhů pro web (docs/veletrhy-api-2027.md, oddíl 6).
//
// Jedna položka cache pro celou sezónu, sdílená přehledem /veletrhy
// i upoutávkou na stránce školy a oboru. Databáze tak dostane dotaz nejvýš
// jednou za hodinu a jednou po každém schválení, ať stránek a návštěv je
// kolik chce. Žádná cache po školách ani po městech: rozpad by jen násobil
// dotazy.
//
// Bez databáze (build, náhled, lokální vývoj) a při jejím výpadku se čte
// snímek src/data/veletrhy-2027.json. Stránka kvůli veletrhům nespadne.
// ============================================================================

export const TAG_VELETRHY = 'veletrhy';

const nactiZDb = unstable_cache(
  async (): Promise<Veletrh[]> => akceSezony({ dotaz }, SEZONA),
  ['veletrhy-akce'],
  { tags: [TAG_VELETRHY], revalidate: 3600 },
);

export async function nactiAkce(): Promise<Veletrh[]> {
  if (!jeDbNastavena()) return snimekAkci();
  try {
    const akce = await nactiZDb();
    // Prázdná tabulka znamená, že neproběhl seed, ne že akce nejsou.
    return akce.length ? akce : snimekAkci();
  } catch (e) {
    console.error('❌ Veletrhy: akce nejdou načíst z databáze, čte se snímek', e);
    return snimekAkci();
  }
}

/**
 * Po provedení návrhu. Značka obnoví /veletrhy i stránky škol a oborů
 * (přestaví se líně při další návštěvě, žádné hromadné přegenerování).
 */
export function obnovVeletrhy(): void {
  try {
    revalidateTag(TAG_VELETRHY, { expire: 0 });
    revalidatePath('/veletrhy');
  } catch (e) {
    // Mimo požadavek Next.js (testy, skripty) revalidace není k dispozici.
    console.error('❌ Veletrhy: revalidace selhala', e);
  }
}
