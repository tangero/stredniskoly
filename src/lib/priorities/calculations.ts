/**
 * Priority Calculations for V2 Overview Page
 *
 * Výpočty pro 3 priority karty:
 * 1. Šance přijetí (Acceptance Chance)
 * 2. Náročnost (Difficulty)
 * 3. Poptávka (Demand)
 */

export type Priority = "high" | "medium" | "low";

export interface AcceptanceChanceResult {
  percentage: number;
  priority: Priority;
  label: string;
  description: string;
  trend?: string;
}

export interface DifficultyResult {
  score: number;
  maxScore: number;
  priority: Priority;
  label: string;
  description: string;
  percentile: number;
}

export interface DemandResult {
  indexPoptavky: number;
  priority: Priority;
  label: string;
  description: string;
  emoji: string;
}

/**
 * Vypočítá šanci přijetí na základě min. bodů a indexu poptávky
 */
export function calculateAcceptanceChance(params: {
  minBody: number;
  kapacita: number;
  prihlasky: number;
  prijati: number;
}): AcceptanceChanceResult {
  const { minBody, kapacita, prihlasky, prijati } = params;

  // Index poptávky (kolikrát více přihlášek než míst)
  const indexPoptavky = prihlasky / kapacita;

  // Acceptance rate (kolik % uchazečů je přijato)
  const acceptanceRate = (prijati / prihlasky) * 100;

  // Určit prioritu a popis
  if (acceptanceRate >= 70 || indexPoptavky < 1.5) {
    return {
      percentage: Math.round(acceptanceRate),
      priority: "high",
      label: "Vysoká šance",
      description: "S průměrnými body máte vysokou šanci být přijat/a",
    };
  } else if (acceptanceRate >= 40 || indexPoptavky < 2.5) {
    return {
      percentage: Math.round(acceptanceRate),
      priority: "medium",
      label: "Střední šance",
      description: "Potřebujete nadprůměrné body, ale je to reálné",
    };
  } else {
    return {
      percentage: Math.round(acceptanceRate),
      priority: "low",
      label: "Nízká šance",
      description: "Velmi konkurenční škola, potřebujete výborné body",
    };
  }
}

/**
 * Vypočítá náročnost školy (obtížnost + kontext v rámci ČR)
 */
export function calculateDifficulty(params: {
  obtiznost: number;
  minBody: number;
  typ: string;
}): DifficultyResult {
  const { obtiznost, minBody } = params;

  // obtiznost je již percentil (0-100)
  const percentile = Math.round(obtiznost);

  // Určit prioritu a label
  let priority: Priority;
  let label: string;
  let description: string;

  if (percentile >= 90) {
    priority = "high";
    label = "Velmi náročné";
    description = `Top 10% nejnáročnějších škol v ČR`;
  } else if (percentile >= 75) {
    priority = "high";
    label = "Náročné";
    description = `Náročnější než 75% škol v ČR`;
  } else if (percentile >= 60) {
    priority = "medium";
    label = "Středně náročné";
    description = `Středně náročná škola v rámci ČR`;
  } else if (percentile >= 40) {
    priority = "medium";
    label = "Mírně náročné";
    description = `Průměrná náročnost v rámci ČR`;
  } else {
    priority = "low";
    label = "Dostupné";
    description = `Nižší náročnost přijetí`;
  }

  return {
    score: minBody,
    maxScore: 1000,
    priority,
    label,
    description,
    percentile,
  };
}

/**
 * Vypočítá úroveň poptávky (konkurence mezi uchazeči)
 */
export function calculateDemand(params: {
  indexPoptavky: number;
  prihlasky: number;
  kapacita: number;
}): DemandResult {
  const { indexPoptavky } = params;

  // Určit prioritu, label a popis
  if (indexPoptavky >= 3) {
    return {
      indexPoptavky: Number(indexPoptavky.toFixed(1)),
      priority: "high",
      label: "Vysoká poptávka",
      description: "Vysoký zájem, doporučujeme záložní variantu",
      emoji: "🔥",
    };
  } else if (indexPoptavky >= 2) {
    return {
      indexPoptavky: Number(indexPoptavky.toFixed(1)),
      priority: "medium",
      label: "Střední poptávka",
      description: "Střední konkurence mezi uchazeči",
      emoji: "⚠️",
    };
  } else if (indexPoptavky >= 1.5) {
    return {
      indexPoptavky: Number(indexPoptavky.toFixed(1)),
      priority: "medium",
      label: "Mírná poptávka",
      description: "Mírná konkurence, reálná šance přijetí",
      emoji: "📊",
    };
  } else {
    return {
      indexPoptavky: Number(indexPoptavky.toFixed(1)),
      priority: "low",
      label: "Nízká poptávka",
      description: "Nízká konkurence, vysoká šance přijetí",
      emoji: "✅",
    };
  }
}

/**
 * Agreguje všechny 3 priority do jednoho objektu
 */
export interface PriorityScores {
  acceptance: AcceptanceChanceResult;
  difficulty: DifficultyResult;
  demand: DemandResult;
}

export function calculateAllPriorities(params: {
  minBody: number;
  obtiznost: number;
  indexPoptavky: number;
  kapacita: number;
  prihlasky: number;
  prijati: number;
  typ: string;
}): PriorityScores {
  return {
    acceptance: calculateAcceptanceChance(params),
    difficulty: calculateDifficulty(params),
    demand: calculateDemand(params),
  };
}
