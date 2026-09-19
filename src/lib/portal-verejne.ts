import { unstable_cache } from 'next/cache';
import { dotaz, jeDbNastavena } from './novinky-db';
import { verejniSpravci, type VerejnySpravce } from './portal-ucty';
import { TAG_SPRAVCI } from './portal-api';

// ============================================================================
// Veřejné „Profil spravuje“ (docs/ucty-portalu-skol-2027.md, oddíl 3).
// Jeden dotaz pro celý web v cache s tagem; změna správce nebo odvolání
// souhlasu cache zneplatní, jinak se obnoví nejpozději za hodinu.
// Bez databáze (build, náhled) se nic nezobrazí a nic nespadne.
// ============================================================================

const nactiSpravce = unstable_cache(
  async (): Promise<Record<string, VerejnySpravce>> => {
    const seznam = await verejniSpravci({ dotaz });
    return Object.fromEntries(seznam.map((s) => [s.redizo, s]));
  },
  ['portal-verejni-spravci'],
  { tags: [TAG_SPRAVCI], revalidate: 3600 },
);

export async function vsichniVerejniSpravci(): Promise<Record<string, VerejnySpravce>> {
  if (!jeDbNastavena()) return {};
  try {
    return await nactiSpravce();
  } catch (e) {
    console.error('❌ Portál: veřejní správci nejdou načíst', e);
    return {};
  }
}

export async function spravceProfilu(redizo: string): Promise<VerejnySpravce | null> {
  return (await vsichniVerejniSpravci())[redizo] ?? null;
}

/** Text „Profil spravuje …“ pro stránku školy i /pro-skoly. */
export function profilSpravujeText(s: VerejnySpravce): string {
  if (!s.jmeno) return 'Profil spravuje škola';
  return `Profil spravuje ${s.jmeno}${s.funkce ? `, ${s.funkce}` : ''}`;
}
