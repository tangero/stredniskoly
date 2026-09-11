/**
 * Popisná data přihlášek 2026 a historie 2024/2025.
 * Veřejné rozhraní neodhaduje přijetí jednotlivce ani riziko kombinace.
 */

export interface SchoolApplication2026 {
  id: string;
  redizo: string;
  nazev: string;
  nazev_display: string;
  obor: string;
  zamereni?: string;
  obec: string;
  kraj: string;
  typ: string;
  delka_studia: number;
  slug: string;
  priority: number; // 1-3
  // Data 2026
  kapacita_2026: number;
  prihlasky_2026: number;
  prihlasky_priority_2026: number[];
  index_poptavky_2026: number;
  // Historická data 2025
  kapacita_2025: number;
  prihlasky_2025: number;
  prijati_2025: number;
  min_body_2025: number;
  prumer_body_2025: number;
  index_poptavky_2025: number;
  prihlasky_priority_2025?: number[];
  prijati_priority_2025?: number[];
  // Historická data 2024
  kapacita_2024?: number;
  prihlasky_2024?: number;
  prijati_2024?: number;
  min_body_2024?: number;
  index_poptavky_2024?: number;
  is_new_2026?: boolean;
}

export interface ChanceResult {
  school: SchoolApplication2026;
  // Konkurenční tlak
  demandLevel: 'low' | 'medium' | 'high' | 'very_high';
  demandLabel: string;
  demandColor: string;
  // Trend
  trendDirection: 'up' | 'down' | 'stable';
  trendPct: number;
  trendLabel: string;
  // Historická úspěšnost
  acceptRate2025: number | null; // % přijatých v 2025
  acceptRate2024?: number; // % přijatých v 2024
  // Priority analýza
  p1Applicants2026: number;
  p1Ratio: number; // kolik P1 přihlášek vs kapacita
}

export interface CombinationAnalysis {
  results: ChanceResult[];

}

/**
 * Vypočítá úroveň poptávky na základě indexu
 */
function getDemandLevel(index: number): { level: ChanceResult['demandLevel']; label: string; color: string } {
  if (index < 1.5) return { level: 'low', label: 'Nízká konkurence', color: 'text-green-600' };
  if (index < 2.5) return { level: 'medium', label: 'Střední konkurence', color: 'text-amber-600' };
  if (index < 4) return { level: 'high', label: 'Vysoká konkurence', color: 'text-orange-600' };
  return { level: 'very_high', label: 'Velmi vysoká konkurence', color: 'text-red-600' };
}

/**
 * Vypočítá trend přihlášek (2025 → 2026)
 */
function calculateTrend(school: SchoolApplication2026): { direction: ChanceResult['trendDirection']; pct: number; label: string } {
  const prihlasky2025 = school.prihlasky_2025;
  const prihlasky2026 = school.prihlasky_2026;

  if (prihlasky2025 === 0) return { direction: 'stable', pct: 0, label: 'Bez dat' };

  const changePct = ((prihlasky2026 - prihlasky2025) / prihlasky2025) * 100;

  if (changePct > 5) return { direction: 'up', pct: Math.round(changePct), label: `+${Math.round(changePct)} % přihlášek` };
  if (changePct < -5) return { direction: 'down', pct: Math.round(changePct), label: `${Math.round(changePct)} % přihlášek` };
  return { direction: 'stable', pct: Math.round(changePct), label: 'Stabilní zájem' };
}

/** Podíl přijatých z přihlášek v daném roce, nikdy osobní pravděpodobnost. */
function historicalAcceptRate(accepted: number | undefined, applications: number | undefined): number | null {
  if (typeof accepted !== 'number' || typeof applications !== 'number' ||
      !Number.isFinite(accepted) || !Number.isFinite(applications) ||
      applications <= 0 || accepted < 0 || accepted > applications) return null;
  return Math.round(accepted / applications * 100);
}

/**
 * Analyzuje jednu školu
 */
export function analyzeSchool(school: SchoolApplication2026): ChanceResult {
  const demand = getDemandLevel(school.index_poptavky_2026);
  const trend = calculateTrend(school);

  const p1Applicants = school.prihlasky_priority_2026?.[0] || 0;
  const p1Ratio = school.kapacita_2026 > 0 ? p1Applicants / school.kapacita_2026 : 0;

  // Historická úspěšnost přijetí
  const acceptRate2025 = historicalAcceptRate(school.prijati_2025, school.prihlasky_2025);
  const acceptRate2024 = historicalAcceptRate(school.prijati_2024, school.prihlasky_2024) ?? undefined;

  return {
    school,
    demandLevel: demand.level,
    demandLabel: demand.label,
    demandColor: demand.color,
    trendDirection: trend.direction,
    trendPct: trend.pct,
    trendLabel: trend.label,
    acceptRate2025,
    acceptRate2024,
    p1Applicants2026: p1Applicants,
    p1Ratio: Math.round(p1Ratio * 100) / 100,
  };
}

/** Vrací pouze popisnou historii jednotlivých nabídek. */
export function analyzeCombination(schools: SchoolApplication2026[]): CombinationAnalysis {
  return { results: schools.map(analyzeSchool) };
}
