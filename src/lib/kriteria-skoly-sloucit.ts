import { kriteriaOdSkoly } from './kriteria-skoly-vyber.ts';
import type { KriteriaOboru } from './prevod-testu-vypocet.ts';

/**
 * Údaje, které škola zadala v portálu, mají přednost před přepisem PDF
 * (docs/prototyp-kriteria-prijeti.md, bod 4). Ročník novější než přepis
 * jsou kritéria pro nové řízení.
 */
export function sPrednostiSkoly(
  prepis: KriteriaOboru | null, odSkol: Parameters<typeof kriteriaOdSkoly>[0], klic: string, zamereni: string | undefined,
): KriteriaOboru | null {
  const skola = kriteriaOdSkoly(odSkol, klic, zamereni);
  if (!skola) return prepis;
  // Kritéria nového ročníku nesmí přepsat vysvětlení pásem minulého roku: jdou vedle.
  if (prepis && skola.rok > prepis.rok) return { ...prepis, nove: skola };
  return { rok: skola.rok, pdf: prepis?.pdf ?? false, prepisy: skola.prepisy, noveKriteria: prepis?.noveKriteria ?? null };
}

