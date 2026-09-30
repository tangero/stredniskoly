import { kriteriaOdSkoly, norm, type ZaznamKriteriiSkoly } from './kriteria-skoly-vyber.ts';
import type { KriteriaOboru, PrepisKriterii } from './prevod-testu-vypocet.ts';

/**
 * Údaje, které škola zadala v portálu, mají přednost před přepisem PDF
 * (docs/prototyp-kriteria-prijeti.md, bod 4).
 *
 * - Ročník pásem (`rokHistorie`): údaje školy za týž ročník nahradí přepis jen
 *   u zaměření, která škola zadala; ostatní zůstanou z přepisu i s výhradou.
 * - Novější ročník (nové řízení) jde vedle jako `nove`, i když přepis chybí;
 *   vysvětlení pásem dál stojí na kritériích roku pásem. Na stránce zaměření
 *   jen kritéria téhož zaměření; na společné stránce jen tehdy, když škola
 *   zadala všechna zaměření známá z přepisu.
 */
export function sPrednostiSkoly(
  prepis: KriteriaOboru | null, odSkol: ZaznamKriteriiSkoly[], klic: string, zamereni: string | undefined,
  rokHistorie: number,
): KriteriaOboru | null {
  const zaklad: KriteriaOboru = prepis ?? { rok: rokHistorie, pdf: false, prepisy: [], noveKriteria: null };
  const naStrance = (p: PrepisKriterii) => !zamereni || norm(p.zamereni) === norm(zamereni);
  const vRoce = kriteriaOdSkoly(odSkol, klic, undefined, zaklad.rok);
  let prepisy: PrepisKriterii[] = zaklad.prepisy;
  if (vRoce) {
    const odSkoly = new Map(vRoce.prepisy.map(p => [norm(p.zamereni), p]));
    const znama = new Set(zaklad.prepisy.map(p => norm(p.zamereni)));
    prepisy = zaklad.prepisy.map(p => odSkoly.get(norm(p.zamereni)) ?? p);
    // Zaměření, které přepis nezná: přidat, na stránce konkrétního zaměření jen to její.
    for (const [z, p] of odSkoly) if (!znama.has(z) && naStrance(p)) prepisy.push(p);
    if (zamereni && prepisy.some(naStrance)) prepisy = prepisy.filter(naStrance);
  }
  const vysledek: KriteriaOboru = { ...zaklad, prepisy };
  const nove = kriteriaOdSkoly(odSkol, klic, undefined);
  if (nove && nove.rok > zaklad.rok) {
    const vhodne = nove.prepisy.filter(naStrance);
    const zadana = new Set(vhodne.map(p => norm(p.zamereni)));
    if (vhodne.length && prepisy.every(p => zadana.has(norm(p.zamereni)))) vysledek.nove = { rok: nove.rok, prepisy: vhodne };
  }
  return vysledek.prepisy.length || vysledek.nove ? vysledek : null;
}
