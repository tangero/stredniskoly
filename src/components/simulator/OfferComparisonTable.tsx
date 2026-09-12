'use client';

import Link from 'next/link';
import { admissionGap, formatGap, subjectImbalance, STANDING_LABEL, type AdmissionGap, type GapStanding } from '@/lib/admission-gap';
import { applicationsPerPlace } from '@/lib/admission-summary';

export interface ComparisonOffer {
  id: string;
  slug: string;
  href?: string;
  otherOffers?: ComparisonOffer[];
  name: string;
  program: string;
  place: string;
  /** Průměr přijatých 2026: souhrn 0–100, jednotlivé předměty 0–50. */
  acceptedTotal: number | null;
  acceptedCzech: number | null;
  acceptedMaths: number | null;
  applications: number | null;
  capacity: number | null;
  commuteMinutes: number | null;
}

export interface OwnScore {
  czech: number | null;
  maths: number | null;
}

interface Props {
  offers: ComparisonOffer[];
  view?: 'table' | 'cards';
  own: OwnScore;
  savedIds: ReadonlySet<string>;
  onToggleSave: (id: string) => void;
}

const STANDING_STYLE: Record<GapStanding, string> = {
  above: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  around: 'bg-amber-50 text-amber-900 ring-amber-200',
  below: 'bg-rose-50 text-rose-800 ring-rose-200',
  unknown: 'bg-slate-100 text-slate-600 ring-slate-200',
};
const GAP_TEXT: Record<GapStanding, string> = {
  above: 'text-emerald-700',
  around: 'text-amber-800',
  below: 'text-rose-700',
  unknown: 'text-slate-500',
};

const number = (value: number | null | undefined, digits = 1) =>
  value == null || !Number.isFinite(value) ? '—' : value.toLocaleString('cs-CZ', { maximumFractionDigits: digits });

function totalScore(own: OwnScore): number | null {
  return own.czech === null || own.maths === null ? null : own.czech + own.maths;
}

function Standing({ gap, needsOwnScore }: { gap: AdmissionGap; needsOwnScore: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset ${STANDING_STYLE[gap.standing]}`}>
      {needsOwnScore ? 'Zadej své body' : STANDING_LABEL[gap.standing]}
    </span>
  );
}

function Gap({ gap }: { gap: AdmissionGap }) {
  return <span className={`font-semibold tabular-nums ${GAP_TEXT[gap.standing]}`}>{formatGap(gap)}</span>;
}

function SaveButton({ saved, offer, onToggle }: { saved: boolean; offer: ComparisonOffer; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={`${saved ? 'Odebrat z výběru' : 'Uložit do výběru'}: ${offer.program}, ${offer.name}`}
      className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg border text-lg focus-visible:outline-2 focus-visible:outline-blue-600 ${
        saved ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-500 hover:border-blue-500 hover:text-blue-700'
      }`}
    >
      <span aria-hidden="true">{saved ? '★' : '☆'}</span>
    </button>
  );
}

/** Průměry předmětů se počítají nad jinou skupinou konajících než souhrn,
 * takže se u části oborů nesečtou přesně. Nikdy je nevydáváme za sčítance.
 */
export function OfferComparisonTable({ offers, own, savedIds, onToggleSave, view = 'table' }: Props) {
  const mine = totalScore(own);

  const rows = offers.map(offer => {
    const total = admissionGap(mine, offer.acceptedTotal, 'total_0_100');
    const czech = admissionGap(own.czech, offer.acceptedCzech, 'subject_0_50');
    const maths = admissionGap(own.maths, offer.acceptedMaths, 'subject_0_50');
    return {
      offer,
      total, czech, maths,
      imbalance: subjectImbalance(czech, maths),
      ratio: applicationsPerPlace(offer.applications, offer.capacity),
      saved: savedIds.has(offer.id),
    };
  });

  function otherPrograms(offer: ComparisonOffer) {
    if (!offer.otherOffers?.length) return null;
    return <details className="mt-3 text-sm"><summary className="cursor-pointer py-2 font-medium text-blue-800">Další obory této školy ({offer.otherOffers.length})</summary>
      <p className="my-2 text-xs text-slate-600">I mimo tvoje filtry; mohou mít jiné místo výuky.</p>
      <ul className="divide-y divide-slate-200">{offer.otherOffers.map(other => <li key={other.id} className="flex items-start justify-between gap-3 py-3">
        <div><Link className="font-semibold text-blue-800 hover:underline" href={other.href ?? `/skola/${other.slug}`}>{other.program}</Link>
        <p className="mt-1 text-xs text-slate-600">Průměr přijatých 2026: {number(other.acceptedTotal)} / 100</p></div>
        <SaveButton offer={other} saved={savedIds.has(other.id)} onToggle={() => onToggleSave(other.id)} />
      </li>)}</ul></details>;
  }

  const withoutSubjects = offers.filter(offer => offer.acceptedCzech === null || offer.acceptedMaths === null).length;

  if (!rows.length) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-slate-700">
        V zadaných podmínkách není žádný obor. Zkus rozšířit čas na cestu, změnit kraj nebo zrušit některý filtr.
      </p>
    );
  }

  return (
    <>
      {/* Mobil: tabulku nelze zmenšit, proto stejná data jako karty. */}
      <ul className={`space-y-3 ${view === 'table' ? 'lg:hidden' : ''}`}>
        {rows.map(({ offer, total, czech, maths, imbalance, ratio, saved }) => (
          <li key={offer.id} className={`rounded-xl border bg-white p-4 ${saved ? 'border-blue-400' : 'border-slate-200'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={offer.href ?? `/skola/${offer.slug}`} className="font-semibold text-slate-900 hover:text-blue-700 hover:underline">{offer.name}</Link>
                <p className="mt-1 font-semibold text-blue-800">{offer.program}</p>
                <p className="mt-1 text-sm text-slate-500">{offer.place}</p>
              </div>
              <SaveButton saved={saved} offer={offer} onToggle={() => onToggleSave(offer.id)} />
            </div>
            {otherPrograms(offer)}
            <div className="mt-3"><Standing gap={total} needsOwnScore={mine === null && offer.acceptedTotal !== null} /></div>
            {imbalance && <p className="mt-2 text-sm text-slate-600">{imbalance}</p>}
            <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-slate-200 pt-3 text-sm">
              {([['Celkem', offer.acceptedTotal, total, '100'], ['Čeština', offer.acceptedCzech, czech, '50'], ['Matematika', offer.acceptedMaths, maths, '50']] as const).map(([label, accepted, gap, max]) => (
                <div key={label}>
                  <dt className="text-xs text-slate-600">{label}</dt>
                  <dd className="mt-1 font-semibold tabular-nums text-slate-900">{number(accepted)}<span className="text-xs font-normal text-slate-500"> / {max}</span></dd>
                  <dd className="text-xs"><Gap gap={gap} /> tvůj odstup</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-slate-600">
              Zájem <span className="font-semibold tabular-nums text-slate-900">{ratio === null ? '—' : number(ratio)}</span> přihlášek na místo
              {offer.commuteMinutes !== null && <> · dojezd <span className="font-semibold tabular-nums text-slate-900">{offer.commuteMinutes}</span> min</>}
            </p>
          </li>
        ))}
      </ul>

      <div className={`${view === 'table' ? 'hidden lg:block' : 'hidden'} overflow-x-auto rounded-xl border border-slate-200 bg-white`}>
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Porovnání oborů podle průměrů přijatých v roce 2026 a tvého výsledku</caption>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
              <th scope="col" rowSpan={2} className="px-3 py-2 font-semibold">Uložit</th>
              <th scope="col" rowSpan={2} className="px-3 py-2 font-semibold">Škola a obor</th>
              <th scope="col" rowSpan={2} className="px-3 py-2 font-semibold">Srovnání s přijatými</th>
              <th scope="col" colSpan={2} className="border-l border-slate-200 px-3 py-2 text-center font-semibold">Celkem ze 100</th>
              <th scope="col" colSpan={2} className="border-l border-slate-200 bg-violet-50/60 px-3 py-2 text-center font-semibold">Čeština z 50</th>
              <th scope="col" colSpan={2} className="border-l border-slate-200 bg-teal-50/60 px-3 py-2 text-center font-semibold">Matematika z 50</th>
              <th scope="col" rowSpan={2} className="border-l border-slate-200 px-3 py-2 text-right font-semibold">Zájem</th>
              <th scope="col" rowSpan={2} className="px-3 py-2 text-right font-semibold">Dojezd</th>
            </tr>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th scope="col" className="border-l border-slate-200 px-3 pb-2 text-right font-medium">přijatí</th>
              <th scope="col" className="px-3 pb-2 text-right font-medium">rozdíl</th>
              <th scope="col" className="border-l border-slate-200 bg-violet-50/60 px-3 pb-2 text-right font-medium">přijatí</th>
              <th scope="col" className="bg-violet-50/60 px-3 pb-2 text-right font-medium">rozdíl</th>
              <th scope="col" className="border-l border-slate-200 bg-teal-50/60 px-3 pb-2 text-right font-medium">přijatí</th>
              <th scope="col" className="bg-teal-50/60 px-3 pb-2 text-right font-medium">rozdíl</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ offer, total, czech, maths, imbalance, ratio, saved }) => (
              <tr key={offer.id} className={`border-b border-slate-100 last:border-0 ${saved ? 'bg-blue-50/60' : ''}`}>
                <td className="px-3 py-3"><SaveButton saved={saved} offer={offer} onToggle={() => onToggleSave(offer.id)} /></td>
                <td className="max-w-72 px-3 py-3">
                  <Link href={offer.href ?? `/skola/${offer.slug}`} className="font-semibold text-slate-900 hover:text-blue-700 hover:underline">{offer.name}</Link>
                  <span className="mt-1 block font-semibold text-blue-800">{offer.program}</span><span className="mt-1 block text-xs text-slate-500">{offer.place}</span>
                  {otherPrograms(offer)}
                </td>
                <td className="px-3 py-3">
                  <Standing gap={total} needsOwnScore={mine === null && offer.acceptedTotal !== null} />
                  {imbalance && <span className="mt-1 block text-xs text-slate-600">{imbalance}</span>}
                </td>
                <td className="border-l border-slate-200 px-3 py-3 text-right font-semibold tabular-nums text-slate-900">{number(offer.acceptedTotal)}</td>
                <td className="px-3 py-3 text-right"><Gap gap={total} /></td>
                <td className="border-l border-slate-200 bg-violet-50/40 px-3 py-3 text-right font-semibold tabular-nums text-slate-900">{number(offer.acceptedCzech)}</td>
                <td className="bg-violet-50/40 px-3 py-3 text-right"><Gap gap={czech} /></td>
                <td className="border-l border-slate-200 bg-teal-50/40 px-3 py-3 text-right font-semibold tabular-nums text-slate-900">{number(offer.acceptedMaths)}</td>
                <td className="bg-teal-50/40 px-3 py-3 text-right"><Gap gap={maths} /></td>
                <td className="border-l border-slate-200 px-3 py-3 text-right tabular-nums">
                  <span className="font-semibold text-slate-900">{ratio === null ? '—' : number(ratio)}</span>
                  <span className="block text-xs text-slate-500">{number(offer.applications, 0)} přihl. / {number(offer.capacity, 0)} míst</span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-slate-900">{offer.commuteMinutes === null ? '—' : `${offer.commuteMinutes} min`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-600">
        Sloupce „rozdíl“ porovnávají tvůj výsledek s průměrem přijatých v roce 2026. Kladné číslo znamená, že jsi nad průměrem z roku 2026, nikoli že jsi přijat. Průměr není bodové minimum a nepřenáší se na rok 2027. Součet češtiny a matematiky se
        u části oborů mírně liší od celkového průměru, protože každý průměr se počítá nad jinou skupinou konajících.
        Pomlčka znamená chybějící nebo neověřený údaj, nikoli nulu. Počet přihlášek na místo není osobní šance na přijetí.
      </p>
      {withoutSubjects > 0 && (
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          U {withoutSubjects} z {rows.length} zobrazených oborů se výsledky jednotlivých testů nepodařilo jednoznačně přiřadit.
          Neznamená to, že je obor snadnější ani že jeho uchazeči psali hůř.
        </p>
      )}
    </>
  );
}
