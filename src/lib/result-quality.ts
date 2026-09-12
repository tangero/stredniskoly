import type { AdmissionContext } from './admission-summary';

interface ResultScores { prijati: number; cj_ma_prijati: number; cj_prijati: number; ma_prijati: number }
/** Zadržený průměr se neobnovuje z paralelního importu, ani do pořadí. */
export function canPublishAcceptedResult(row: ResultScores, context: AdmissionContext | null | undefined): boolean {
  if (!context || context.average_accepted === null || context.tested_accepted === null || context.accepted === null) return false;
  if (!Number.isFinite(context.average_accepted) || context.average_accepted < 0 || context.average_accepted > 100) return false;
  if (!Number.isInteger(context.tested_accepted) || !Number.isInteger(context.accepted)
    || context.tested_accepted <= 0 || context.tested_accepted > context.accepted || row.prijati !== context.accepted) return false;
  if (![row.cj_prijati, row.ma_prijati].every(value => Number.isFinite(value) && value >= 0 && value <= 50)) return false;
  return Number.isFinite(row.cj_ma_prijati) && row.cj_ma_prijati >= 0 && row.cj_ma_prijati <= 100
    && Math.abs(row.cj_ma_prijati - context.average_accepted) <= 0.11;
}
