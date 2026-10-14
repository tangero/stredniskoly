import { jeDbNastavena } from '@/lib/novinky-db';
import { nactiPilot, stavSkolPortalu, type PilotSkola, type StavSkolyPortalu } from '@/lib/portal-admin';
import { cteni } from '@/lib/portal-relace';

export interface OsloveneSeStavem {
  skola: PilotSkola;
  stav: StavSkolyPortalu | null;
}

/** Oslovené školy (data/portal/pilot.json) a jejich aktivita; null = databáze účtů není nebo neodpovídá. */
export async function nactiOsloveneSeStavem(): Promise<OsloveneSeStavem[] | null> {
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
