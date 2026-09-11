/** Úzký kontrakt skóre: jednotka a původ cestují s hodnotou až do rendereru. */
export interface AdmissionScore {
  value: number | null;
  unit: 'jpz_subject_0_50';
  year: number;
  round: number | null;
  population: 'not_documented';
  sampleSize: null;
  offerId: string;
  sourceId: string;
  validAt: null;
  quality: 'limited' | 'unavailable';
  reasons: string[];
  sourceValue: number | null;
  sourceUnit: 'percent_0_100';
  sourceField: 'cj_prumer' | 'ma_prumer';
  transformation: 'percent_to_subject_half_v1';
  rounding: 'nearest_tenth_v1';
}

export function historicalSubjectAverage(input: {
  value: unknown;
  unit: 'percent_0_100';
  field: AdmissionScore['sourceField'];
  offerId: string;
}): AdmissionScore {
  // Kontrola jednotky i za běhu: již převedený kontrakt nelze převést podruhé.
  if (input.unit !== 'percent_0_100') throw new Error('Očekávána zdrojová procentní škála');
  const sourceValue = typeof input.value === 'number' && Number.isFinite(input.value)
    && input.value >= 0 && input.value <= 100 ? input.value : null;
  return {
    value: sourceValue === null ? null : Math.round(sourceValue * 5) / 10,
    unit: 'jpz_subject_0_50', year: 2025, round: null,
    population: 'not_documented', sampleSize: null,
    offerId: input.offerId, sourceId: 'schools_data.json:2025', validAt: null,
    quality: sourceValue === null ? 'unavailable' : 'limited',
    reasons: sourceValue === null ? ['missing_or_invalid_source'] : ['population_and_sample_not_documented'],
    sourceValue, sourceUnit: 'percent_0_100', sourceField: input.field,
    transformation: 'percent_to_subject_half_v1', rounding: 'nearest_tenth_v1',
  };
}

const decimal = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 1 });
export function formatAdmissionScore(score: AdmissionScore): string {
  if (score.unit !== 'jpz_subject_0_50') throw new Error('Neznámá jednotka skóre');
  if (score.value === null || !Number.isFinite(score.value) || score.value < 0 || score.value > 50) return 'Údaj není k dispozici';
  return `${decimal.format(score.value)} / 50 bodů`;
}
