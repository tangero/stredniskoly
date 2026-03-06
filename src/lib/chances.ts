/**
 * Výpočetní logika pro kalkulačku "Moje šance"
 *
 * Porovnává data přihlášek 2026 s historickými daty 2024/2025
 * a odhaduje šance na přijetí pro kombinaci přihlášek.
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
  // Odhad šancí
  estimatedChancePct: number;
  chanceLevel: 'high' | 'medium' | 'low' | 'very_low';
  chanceLabel: string;
  chanceColor: string;
  // Historická minimální hranice
  estimatedMinScore: number;
  // Historická úspěšnost
  acceptRate2025: number; // % přijatých v 2025
  acceptRate2024?: number; // % přijatých v 2024
  // Priority analýza
  p1Applicants2026: number;
  p1Ratio: number; // kolik P1 přihlášek vs kapacita
}

export interface CombinationAnalysis {
  results: ChanceResult[];
  overallRisk: 'safe' | 'balanced' | 'risky' | 'very_risky';
  riskLabel: string;
  riskDescription: string;
  riskColor: string;
  hasBackup: boolean;
  suggestions: string[];
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
 * Odhadne šance na přijetí na základě historických dat a aktuálního tlaku
 */
function estimateChance(school: SchoolApplication2026): {
  chancePct: number;
  level: ChanceResult['chanceLevel'];
  label: string;
  color: string;
  estimatedMinScore: number;
} {
  const index2026 = school.index_poptavky_2026;
  const index2025 = school.index_poptavky_2025;

  // Základní šance odvozená z historické úspěšnosti přijetí
  const historicalAcceptRate = school.prijati_2025 / Math.max(1, school.prihlasky_2025);

  // Adjustovat podle změny v poptávce
  const demandChange = index2026 / Math.max(0.1, index2025);
  const adjustedRate = historicalAcceptRate / demandChange;

  // Převést na procenta (0-100), omezit na realistický rozsah
  const chancePct = Math.min(95, Math.max(5, adjustedRate * 100));

  // Odhadnout minimální skóre
  let estimatedMinScore = school.min_body_2025;
  if (demandChange > 1.1) {
    // Vyšší poptávka → vyšší požadované skóre
    estimatedMinScore = Math.round(school.min_body_2025 * (1 + (demandChange - 1) * 0.3));
  } else if (demandChange < 0.9) {
    // Nižší poptávka → nižší požadované skóre
    estimatedMinScore = Math.round(school.min_body_2025 * (1 - (1 - demandChange) * 0.2));
  }

  // Kategorizace
  if (chancePct >= 70) return { chancePct: Math.round(chancePct), level: 'high', label: 'Vysoká šance', color: 'text-green-600', estimatedMinScore };
  if (chancePct >= 45) return { chancePct: Math.round(chancePct), level: 'medium', label: 'Střední šance', color: 'text-amber-600', estimatedMinScore };
  if (chancePct >= 25) return { chancePct: Math.round(chancePct), level: 'low', label: 'Nízká šance', color: 'text-orange-600', estimatedMinScore };
  return { chancePct: Math.round(chancePct), level: 'very_low', label: 'Velmi nízká šance', color: 'text-red-600', estimatedMinScore };
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

/**
 * Analyzuje jednu školu
 */
export function analyzeSchool(school: SchoolApplication2026): ChanceResult {
  const demand = getDemandLevel(school.index_poptavky_2026);
  const trend = calculateTrend(school);
  const chance = estimateChance(school);

  const p1Applicants = school.prihlasky_priority_2026?.[0] || 0;
  const p1Ratio = school.kapacita_2026 > 0 ? p1Applicants / school.kapacita_2026 : 0;

  // Historická úspěšnost přijetí
  const acceptRate2025 = school.prihlasky_2025 > 0
    ? Math.round((school.prijati_2025 / school.prihlasky_2025) * 100)
    : 0;
  const acceptRate2024 = (school.prihlasky_2024 && school.prijati_2024 && school.prihlasky_2024 > 0)
    ? Math.round((school.prijati_2024 / school.prihlasky_2024) * 100)
    : undefined;

  return {
    school,
    demandLevel: demand.level,
    demandLabel: demand.label,
    demandColor: demand.color,
    trendDirection: trend.direction,
    trendPct: trend.pct,
    trendLabel: trend.label,
    estimatedChancePct: chance.chancePct,
    chanceLevel: chance.level,
    chanceLabel: chance.label,
    chanceColor: chance.color,
    estimatedMinScore: chance.estimatedMinScore,
    acceptRate2025,
    acceptRate2024,
    p1Applicants2026: p1Applicants,
    p1Ratio: Math.round(p1Ratio * 100) / 100,
  };
}

/**
 * Analyzuje kombinaci přihlášek a hodnotí strategii
 */
export function analyzeCombination(schools: SchoolApplication2026[]): CombinationAnalysis {
  const results = schools.map(analyzeSchool);

  // Počet škol s vysokou/nízkou šancí
  const highChance = results.filter(r => r.chanceLevel === 'high').length;
  const lowChance = results.filter(r => r.chanceLevel === 'low' || r.chanceLevel === 'very_low').length;
  const veryHighDemand = results.filter(r => r.demandLevel === 'very_high').length;

  // Má záložní variantu? (alespoň 1 škola se střední+ šancí)
  const hasBackup = results.some(r => r.chanceLevel === 'high' || r.chanceLevel === 'medium');

  // Celkové hodnocení rizika
  let overallRisk: CombinationAnalysis['overallRisk'];
  let riskLabel: string;
  let riskDescription: string;
  let riskColor: string;

  if (veryHighDemand === results.length) {
    overallRisk = 'very_risky';
    riskLabel = 'Velmi riziková kombinace';
    riskDescription = 'Všechny zvolené školy mají velmi vysokou konkurenci. Zvažte přidání záložní varianty s nižší konkurencí.';
    riskColor = 'text-red-600';
  } else if (lowChance >= 2 && !hasBackup) {
    overallRisk = 'risky';
    riskLabel = 'Riziková kombinace';
    riskDescription = 'Většina vašich škol má nízké šance na přijetí a nemáte záložní variantu.';
    riskColor = 'text-orange-600';
  } else if (highChance >= 1 && lowChance <= 1) {
    overallRisk = 'safe';
    riskLabel = 'Bezpečná kombinace';
    riskDescription = 'Vaše kombinace přihlášek obsahuje školy s různou úrovní náročnosti. Dobrá strategie!';
    riskColor = 'text-green-600';
  } else {
    overallRisk = 'balanced';
    riskLabel = 'Vyvážená kombinace';
    riskDescription = 'Vaše přihlášky jsou rozumně rozložené mezi náročnější a dostupnější školy.';
    riskColor = 'text-blue-600';
  }

  // Doporučení
  const suggestions: string[] = [];

  if (!hasBackup) {
    suggestions.push('Zvažte přidání školy s nižší konkurencí jako záložní variantu.');
  }

  if (veryHighDemand >= 2) {
    suggestions.push('Máte více škol s velmi vysokou konkurencí. Připravte se na přijímací zkoušky důkladně.');
  }

  const allSameKraj = results.length > 1 && new Set(results.map(r => r.school.kraj)).size === 1;
  if (allSameKraj && results.length >= 3) {
    suggestions.push('Všechny školy jsou ve stejném kraji. Zvažte i školy v okolních krajích pro větší šanci.');
  }

  if (results.some(r => r.trendDirection === 'up' && r.trendPct > 15)) {
    suggestions.push('U některých škol výrazně roste zájem oproti minulému roku. Počítejte s vyšší konkurencí.');
  }

  if (suggestions.length === 0) {
    suggestions.push('Vaše strategie vypadá dobře. Soustřeďte se na přípravu k přijímacím zkouškám.');
  }

  return {
    results,
    overallRisk,
    riskLabel,
    riskDescription,
    riskColor,
    hasBackup,
    suggestions,
  };
}
