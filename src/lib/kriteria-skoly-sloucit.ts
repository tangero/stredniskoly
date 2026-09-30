import { kriteriaOdSkoly, norm, type ZaznamKriteriiSkoly } from './kriteria-skoly-vyber.ts';
import type { KriteriaOboru, PrepisKriterii } from './prevod-testu-vypocet.ts';

/**
 * Údaje, které škola zadala v portálu, mají přednost před přepisem PDF
 * (docs/prototyp-kriteria-prijeti.md, bod 4).
 *
 * - Ročník přepisu: údaje školy za týž ročník nahradí přepis jen u zaměření,
 *   která škola zadala; ostatní zaměření zůstanou z přepisu i s jeho výhradou.
 * - Novější ročník (nové řízení) jde vedle jako `nove`; vysvětlení pásem
 *   minulého roku dál stojí na kritériích roku pásem. Ukáže se jen tehdy, když
 *   škola zadala všechna zaměření, která známe z přepisu, jinak by jedno
 *   potvrzené zaměření mluvilo za celý obor.
 */
export function sPrednostiSkoly(
  prepis: KriteriaOboru | null, odSkol: ZaznamKriteriiSkoly[], klic: string, zamereni: string | undefined,
): KriteriaOboru | null {
  if (!prepis) {
    const skola = kriteriaOdSkoly(odSkol, klic, zamereni);
    return skola ? { rok: skola.rok, pdf: false, prepisy: skola.prepisy, noveKriteria: null } : null;
  }
  const vRoce = kriteriaOdSkoly(odSkol, klic, undefined, prepis.rok);
  let prepisy: PrepisKriterii[] = prepis.prepisy;
  if (vRoce) {
    const odSkoly = new Map(vRoce.prepisy.map(p => [norm(p.zamereni), p]));
    const znama = new Set(prepis.prepisy.map(p => norm(p.zamereni)));
    prepisy = prepis.prepisy.map(p => odSkoly.get(norm(p.zamereni)) ?? p);
    // Zaměření, které přepis nezná: přidat, na stránce konkrétního zaměření jen to její.
    for (const [z, p] of odSkoly) {
      if (znama.has(z)) continue;
      if (zamereni && z !== norm(zamereni)) continue;
      prepisy.push(p);
    }
    if (zamereni && prepisy.some(p => norm(p.zamereni) === norm(zamereni)))
      prepisy = prepisy.filter(p => norm(p.zamereni) === norm(zamereni));
  }
  const vysledek: KriteriaOboru = { ...prepis, prepisy };
  const nove = kriteriaOdSkoly(odSkol, klic, zamereni);
  if (nove && nove.rok > prepis.rok) {
    const zadana = new Set(nove.prepisy.map(p => norm(p.zamereni)));
    if (prepisy.every(p => zadana.has(norm(p.zamereni)))) vysledek.nove = nove;
  }
  return vysledek;
}
