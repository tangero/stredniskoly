/**
 * Popularity scoring pro určení top škol (bez analytics dat)
 *
 * Používá proxy metriky:
 * - Lokace (velká města = více searches)
 * - Typ školy (gymnázia = více researche)
 * - Počet přihlášek (populární školy)
 * - Obtížnost (prestižní školy)
 */

interface SchoolForPopularity {
  redizo: string;
  nazev: string;
  kraj_kod: string;
  obec: string;
  typ: string;
  prihlasky: number;
  obtiznost: number;
  kapacita: number;
}

/**
 * Vypočítá popularity score (0-100)
 */
export function calculatePopularityScore(school: SchoolForPopularity): number {
  let score = 0;

  // 1. LOKACE (40 bodů max)
  // Praha má nejvíc searches (20% populace ČR, 40% web trafficu)
  if (school.kraj_kod === 'PR') {
    score += 20;
  } else if (school.kraj_kod === 'JM' && school.obec.toLowerCase().includes('brno')) {
    // Brno - druhé největší město
    score += 15;
  } else if (school.kraj_kod === 'MS' && school.obec.toLowerCase().includes('ostrava')) {
    // Ostrava - třetí největší
    score += 12;
  } else if (
    (school.kraj_kod === 'PL' && school.obec.toLowerCase().includes('plzeň')) ||
    (school.kraj_kod === 'LI' && school.obec.toLowerCase().includes('liberec')) ||
    (school.kraj_kod === 'OL' && school.obec.toLowerCase().includes('olomouc'))
  ) {
    // Další krajská města
    score += 8;
  } else if (school.kraj_kod === 'ST' || school.kraj_kod === 'JC') {
    // Středočeský a Jihočeský kraj (blízko Prahy)
    score += 5;
  }

  // 2. TYP ŠKOLY (30 bodů max)
  // Gymnázia = nejvíc researche (rodiče více zjišťují info)
  if (school.typ === 'Gymnázium' || school.typ.toLowerCase().includes('gymnázium')) {
    score += 30;
  } else if (school.typ === 'SOŠ' || school.typ.toLowerCase().includes('střední odborná')) {
    score += 15;
  } else if (school.typ.toLowerCase().includes('obchodní akademie')) {
    score += 12;
  } else if (school.typ.toLowerCase().includes('konzervatoř')) {
    score += 10;
  } else {
    // SOU, ostatní
    score += 5;
  }

  // 3. POČET PŘIHLÁŠEK (20 bodů max)
  // Více přihlášek = populárnější škola = více web searches
  const prihlaskyNormalized = Math.min(school.prihlasky / 400, 1); // 400+ přihlášek = max
  score += prihlaskyNormalized * 20;

  // 4. OBTÍŽNOST/PRESTIŽ (10 bodů max)
  // Prestižní školy (vysoká obtížnost) = více researche
  const obtiznostNormalized = Math.min(school.obtiznost / 100, 1);
  score += obtiznostNormalized * 10;

  return Math.round(score);
}

/**
 * Seřadí školy podle popularity score
 */
export function sortSchoolsByPopularity(
  schools: SchoolForPopularity[]
): Array<SchoolForPopularity & { popularityScore: number }> {
  return schools
    .map(school => ({
      ...school,
      popularityScore: calculatePopularityScore(school),
    }))
    .sort((a, b) => b.popularityScore - a.popularityScore);
}

/**
 * Vrátí top N nejpopulárnějších škol
 */
export function getTopSchools(
  schools: SchoolForPopularity[],
  count: number = 200
): SchoolForPopularity[] {
  const sorted = sortSchoolsByPopularity(schools);
  return sorted.slice(0, count);
}

/**
 * Debug: Vypíše top 20 škol s jejich scores
 */
export function debugTopSchools(schools: SchoolForPopularity[]) {
  const top = sortSchoolsByPopularity(schools).slice(0, 20);

  console.log('\n🏆 TOP 20 NEJPOPULÁRNĚJŠÍCH ŠKOL (podle scoring algoritmu):\n');
  top.forEach((school, idx) => {
    console.log(
      `${idx + 1}. [${school.popularityScore} bodů] ${school.nazev} (${school.obec})`
    );
  });
  console.log('\n');

  return top;
}
