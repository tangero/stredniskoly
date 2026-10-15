import { jeDbNastavena } from './novinky-db';
import { nactiPilot, stavSkolPortalu } from './portal-admin';
import { cteni } from './portal-relace';
import type { OslovenaSkola } from './portal-oslovene';

/**
 * Oslovené školy portálu (data/portal/pilot.json) s jejich účty a aktivitou.
 * Prázdné pole = seznam chybí; null = databáze není nebo neodpovídá.
 */
export async function nactiOsloveneSkoly(): Promise<OslovenaSkola[] | null> {
  const pilot = await nactiPilot();
  if (pilot.length === 0) return [];
  if (!jeDbNastavena()) return null;
  try {
    const stav = new Map((await stavSkolPortalu(cteni, pilot.map((p) => p.redizo))).map((s) => [s.redizo, s]));
    return pilot.map((skola) => ({ skola, stav: stav.get(skola.redizo) ?? null }));
  } catch (e) {
    console.error('❌ Admin: stav oslovených škol', e);
    return null;
  }
}
