/** Odstup vlastního výsledku od loňského průměru přijatých.
 *
 * Nejde o pravděpodobnost přijetí ani o bodovou hranici. Známe průměr přijatých
 * a průměr všech konajících, nikoli cut-off ani rozptyl, takže se popisuje
 * poloha vůči loňskému poli, nic víc.
 */

/** Souhrn ČJ + MA je na škále 0–100, jednotlivý předmět na 0–50. */
export type ScoreScale = 'total_0_100' | 'subject_0_50';

/** Pásmo kolem průměru, kde se rozdíl nepovažuje za rozhodný.
 * Předmět má poloviční škálu, proto i poloviční pásmo; jinak by se hodnotil přísněji než souhrn.
 */
export const BAND_BY_SCALE: Record<ScoreScale, number> = {
  total_0_100: 5,
  subject_0_50: 2.5,
};

export type GapStanding = 'above' | 'around' | 'below' | 'unknown';

export interface AdmissionGap {
  /** Kladná hodnota znamená výsledek nad loňským průměrem přijatých. */
  difference: number | null;
  standing: GapStanding;
  scale: ScoreScale;
  band: number;
}

const MAX_BY_SCALE: Record<ScoreScale, number> = { total_0_100: 100, subject_0_50: 50 };

function usableScore(value: unknown, scale: ScoreScale): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    && value >= 0 && value <= MAX_BY_SCALE[scale] ? value : null;
}

/** Chybějící nebo neověřený průměr není nula: vrací se stav 'unknown', nikoli rozdíl. */
export function admissionGap(own: unknown, acceptedAverage: unknown, scale: ScoreScale): AdmissionGap {
  const band = BAND_BY_SCALE[scale];
  const mine = usableScore(own, scale);
  const theirs = usableScore(acceptedAverage, scale);
  if (mine === null || theirs === null) return { difference: null, standing: 'unknown', scale, band };
  const difference = Math.round((mine - theirs) * 10) / 10;
  const standing: GapStanding = difference >= band ? 'above' : difference >= -band ? 'around' : 'below';
  return { difference, standing, scale, band };
}

export const STANDING_LABEL: Record<GapStanding, string> = {
  above: 'Nad průměrem přijatých',
  around: 'Kolem průměru přijatých',
  below: 'Pod průměrem přijatých',
  unknown: 'Průměr není ověřen',
};

const decimal = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 1 });

/** Znaménko je součástí sdělení: bez něj nelze odlišit rezervu od chybějících bodů. */
export function formatGap(gap: AdmissionGap): string {
  if (gap.difference === null) return '—';
  return `${gap.difference > 0 ? '+' : ''}${decimal.format(gap.difference)}`;
}

/** Rozdíl mezi odstupem v ČJ a v MA. Vyrovnaného uchazeče nemá smysl upozorňovat. */
export function subjectImbalance(czech: AdmissionGap, maths: AdmissionGap, threshold = 5): string | null {
  if (czech.difference === null || maths.difference === null) return null;
  const lean = czech.difference - maths.difference;
  if (Math.abs(lean) < threshold) return null;
  return lean > 0 ? 'Proti této škole jsi slabší v matematice' : 'Proti této škole jsi slabší v češtině';
}
