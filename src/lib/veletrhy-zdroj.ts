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

// Bez časové platnosti (`revalidate: false`): data se mění jen schválením
// návrhu a to značku zneplatní. Číselná platnost by navíc zkrátila ISR
// každé stránky, která cache čte, na tutéž hodnotu (Next ji propisuje do
// stránky), takže stránky škol by se místo po 12 hodinách přestavovaly
// každou hodinu. Proběhlé akce filtruje render podle data, ne cache.
class BezSeedu extends Error {}

const nactiZDb = unstable_cache(
  async (): Promise<Veletrh[]> => {
    const akce = await akceSezony({ dotaz }, SEZONA);
    if (akce.length) return akce;
    // Tabulka bez jediného řádku = seed neproběhl. Výjimka se do cache
    // neuloží, takže seed skriptem (bez revalidace) se projeví hned.
    // Když naopak schválení odebere všechny akce, platí prázdno.
    const r = await dotaz<{ pocet: number }>('select count(*)::int as pocet from veletrh_akce');
    if ((r.rows[0]?.pocet ?? 0) === 0) throw new BezSeedu();
    return akce;
  },
  ['veletrhy-akce'],
  { tags: [TAG_VELETRHY], revalidate: false },
);

export async function nactiAkce(): Promise<Veletrh[]> {
  if (!jeDbNastavena()) return snimekAkci();
  try {
    return await nactiZDb();
  } catch (e) {
    if (e instanceof BezSeedu) return snimekAkci();
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
