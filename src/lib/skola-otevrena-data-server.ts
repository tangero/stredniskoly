import { getSchoolPageType, getSchoolOverview, get2026DataByRedizo } from '@/lib/data';
import { normalizeSchoolKey, uniqueSchoolIndex } from '@/lib/school-key';
import { getProfilSkoly } from '@/lib/skola-profil-data';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import { sestavOtevrenaData, type OtevrenaDataSkoly } from '@/lib/skola-otevrena-data';
import { createSlug } from '@/lib/utils';
import { krajNames } from '@/types/school';

/** Otevřená data školy ze stejné datové vrstvy jako stránka školy; null, když škola neexistuje. */
export async function nactiOtevrenaDataSkoly(slug: string): Promise<OtevrenaDataSkoly | null> {
  const pageInfo = await getSchoolPageType(slug);
  if (!pageInfo.school) return null;
  const redizo = pageInfo.redizo;
  const overview = await getSchoolOverview(redizo);
  if (!overview) return null;
  const [nabidky2026, obdobiVysledky, obdobiUchazeci, obdobiMaturita] = await Promise.all([
    get2026DataByRedizo(redizo), zobrazeneObdobi('cermat-vysledky'), zobrazeneObdobi('cermat-uchazeci-kolo1'), zobrazeneObdobi('cermat-maturita'),
  ]);
  const index = uniqueSchoolIndex(nabidky2026, row => row.id);
  const programy = [...overview.programs].sort((a, b) => a.obor.localeCompare(b.obor, 'cs') || b.delka_studia - a.delka_studia || a.id.localeCompare(b.id));
  const vypsane = new Set(programy.filter(p => index.get(normalizeSchoolKey(p.id))).map(p => p.id));
  const profil = await getProfilSkoly(redizo, overview.nazev, programy, vypsane);
  return sestavOtevrenaData(
    {
      nazev: overview.nazev, redizo, slug: `${redizo}-${createSlug(overview.nazev)}`,
      adresa: overview.adresa_plna || overview.adresa, obec: overview.obec, okres: overview.okres,
      kraj: krajNames[overview.kraj_kod] || overview.kraj, zrizovatel: overview.zrizovatel,
    },
    profil,
    { vysledky: obdobiVysledky ? Number(obdobiVysledky) : null, uchazeci: obdobiUchazeci ? Number(obdobiUchazeci) : null, maturita: obdobiMaturita },
  );
}
