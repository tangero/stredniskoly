export const NEARBY_MINUTES = 10;

/** Neznámé párování není dojezd mimo limit. Ostatní filtry se aplikují předem. */
export function splitByCommute<T extends { id: string }>(
  schools: T[], limit: number,
  minutesFor: (school: T) => number | undefined,
  isMapped: (school: T) => boolean,
) {
  const within: T[] = [], near: T[] = [], unknown: T[] = [];
  for (const school of schools) {
    const minutes = minutesFor(school);
    if (minutes !== undefined && Number.isFinite(minutes) && minutes >= 0) {
      if (minutes <= limit) within.push(school);
      else if (minutes <= limit + NEARBY_MINUTES) near.push(school);
    } else if (!isMapped(school)) unknown.push(school);
  }
  const byTime = (a: T, b: T) => (minutesFor(a) ?? Infinity) - (minutesFor(b) ?? Infinity);
  return { within: within.sort(byTime), near: near.sort(byTime), unknown };
}

/** Dojezd překračuje hranice krajů, kraj proto platí jen bez něj; město se s dojezdem kombinuje. */
export function matchesSearchLocation(
  school: { obec: string; kraj: string },
  scope: { city: string; region: string; commute: boolean },
): boolean {
  if (scope.commute) return !scope.city || school.obec.trim() === scope.city;
  return (!scope.city || school.obec.trim() === scope.city) &&
    (!scope.region || school.kraj.trim() === scope.region);
}

export type DruhZrizovatele = 'verejna' | 'soukroma' | 'cirkevni';

export const DRUHY_ZRIZOVATELE: { id: DruhZrizovatele; label: string }[] = [
  { id: 'verejna', label: 'veřejná' },
  { id: 'soukroma', label: 'soukromá' },
  { id: 'cirkevni', label: 'církevní' },
];

/** Katalog nese zřizovatele slovy z CERMATu („veřejné / státní“, „soukromé“, „církevní“); neznámý je null. */
export function druhZrizovatele(zrizovatel: string | null | undefined): DruhZrizovatele | null {
  const z = (zrizovatel ?? '').toLowerCase();
  if (z.includes('soukrom')) return 'soukroma';
  if (z.includes('církev')) return 'cirkevni';
  if (z.includes('veřejn') || z.includes('státn')) return 'verejna';
  return null;
}

/** Bez výběru projde vše; s výběrem jen známý zřizovatel z výběru, neznámý se nepočítá jako shoda. */
export function matchesZrizovatel(school: { zrizovatel?: string | null }, vybrane: DruhZrizovatele[]): boolean {
  if (!vybrane.length) return true;
  const druh = druhZrizovatele(school.zrizovatel);
  return druh !== null && vybrane.includes(druh);
}

/**
 * Zřizovatel patří škole, ne nabídce: nabídky 2026 (applications_2026.json) ho nenesou
 * a podle id nabídky se s katalogem páruje jen část, proto se bere podle RED IZO
 * z katalogu, od nejnovějšího ročníku.
 */
export function zrizovatelPodleRedizo(katalog: Record<string, unknown>): Map<string, string> {
  const vysledek = new Map<string, string>();
  const rocniky = Object.keys(katalog).filter(k => /^\d{4}$/.test(k)).sort().reverse();
  for (const rok of rocniky) {
    const radky = katalog[rok];
    if (!Array.isArray(radky)) continue;
    for (const r of radky as { redizo?: unknown; id?: string; zrizovatel?: string | null }[]) {
      const redizo = String(r.redizo ?? String(r.id ?? '').split('_')[0]);
      if (r.zrizovatel && redizo && !vysledek.has(redizo)) vysledek.set(redizo, r.zrizovatel);
    }
  }
  return vysledek;
}
