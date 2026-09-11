import { formatAdmissionScore, type AdmissionScore } from '@/lib/admission-metric';

export function AdmissionScoreValue({ score }: { score: AdmissionScore }) {
  return (
    <span data-score-unit={score.unit} data-score-year={score.year}>
      {formatAdmissionScore(score)}
    </span>
  );
}
