import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import { OdberFormular } from './OdberFormular';
import type { Varianta } from './OdberFormular';
import calendar from '@/data/admissions-2027.json';

// ============================================================================
// Serverová obálka formuláře odběru.
//
// Formulář se zobrazí jen tehdy, když
//  1. je odběr zapnutý (`NOVINKY_ZAPNUTO`),
//  2. registr zná období sady `msmt-harmonogram` (ročník se nebere z kódu),
//  3. kalendář toho období má ještě budoucí událost.
//
// Po poslední události ročníku formulář zmizí, protože by nabízel odběr,
// pro který už neexistuje obsah (docs/novinky-k-prijimackam-2027.md, oddíl 4).
// ============================================================================

export interface OdberBlokProps {
  zdroj: string;
  varianta?: Varianta;
  kraje?: Array<{ kod: string; nazev: string }>;
  nadpis?: string;
}

/** Má kalendář daného období ještě budoucí událost? */
function maBudouciUdalost(dnes = new Date().toISOString().slice(0, 10)): boolean {
  return calendar.groups.some((g) => g.events.some((e) => (e.end ?? e.start) >= dnes));
}

export async function OdberBlok({ zdroj, varianta = 'karta', kraje, nadpis }: OdberBlokProps) {
  if (process.env.NOVINKY_ZAPNUTO !== '1') return null;

  const rocnik = await zobrazeneObdobi('msmt-harmonogram');
  if (!rocnik || !maBudouciUdalost()) return null;

  const naTmavem = varianta === 'karta' || varianta === 'pas';
  const obal = naTmavem
    ? 'rounded-xl border border-white/20 bg-white/5 p-4'
    : 'rounded-xl border border-slate-200 bg-white p-4';

  return (
    <div className={obal}>
      {nadpis && (
        <h3 className={`mb-2 font-bold ${naTmavem ? 'text-white' : 'text-slate-900'}`}>{nadpis}</h3>
      )}
      <OdberFormular rocnik={rocnik} zdroj={zdroj} varianta={varianta} kraje={kraje} />
    </div>
  );
}
