/** Procentní skór CERMAT přepočtený na škálu 0–50, nikoli školní body.
 * Nula je hodnota, chybějící či neplatný údaj zůstává null.
 */
export function subjectScore(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
    ? Math.round(value * 5) / 10 : null;
}

/** Starý import nemá ověřenou identitu populace individuálního minima.
 * Slučuje REDIZO+KKOV bez zaměření a formy studia. min_body nemá doloženou
 * škálu školních kritérií. Nic z toho nesmí sloužit jako hranice přijetí.
 * Viz docs/dodavka-s0-2027.md. Obnovení vyžaduje nový ověřený import.
 */
export function unavailableAdmissionScores() {
  return {
    jpz_min: null,
    cj_at_jpz_min: null,
    ma_at_jpz_min: null,
    min_body: null,
    extra_body: null,
    hasExtraCriteria: null,
    cohorts: null,
  };
}

export const MISSING_COMPARISON = 'Pro toto porovnání nemáme ověřený údaj';
