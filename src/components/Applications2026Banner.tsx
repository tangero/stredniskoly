import Link from 'next/link';
import type { School2026Data } from '@/lib/data';
import { applicationsPerPlace, capacitySummary } from '@/lib/admission-summary';

interface Props {
  data2026: School2026Data[];
  /** Zobrazený ročník přihlášek z registru (sada cermat-prihlasky). */
  rok: number;
  /** Datum platnosti dat z registru, RRRR-MM-DD. */
  platnost: string | null;
  totalKapacita2025?: number;
  totalPrihlasky2025?: number;
  singleProgram?: boolean;
}

function datum(iso: string): string {
  const [r, m, d] = iso.split('-').map(Number);
  return `${d}. ${m}. ${r}`;
}

export function Applications2026Banner({ data2026, rok, platnost }: Props) {
  const capacity = data2026.reduce((sum, row) => sum + row.kapacita, 0);
  const jednaNabidka = data2026.length === 1;
  // Přihlášky na místo a první priority se počítají výhradně za nabídku (slovník ukazatelů):
  // součet za školu sčítá různé konkurzy a tytéž uchazeče víckrát.
  const nabidka = jednaNabidka ? data2026[0] : null;
  const ratio = nabidka ? applicationsPerPlace(nabidka.prihlasky, nabidka.kapacita) : null;
  const first = nabidka?.prihlasky_priority?.[0] ?? null;
  const summary = nabidka ? capacitySummary(nabidka.admission_context) : null;
  const polozky: [string, string][] = nabidka
    ? [
        ['Přihlášky', nabidka.prihlasky.toLocaleString('cs-CZ')],
        ['Kapacita míst', capacity.toLocaleString('cs-CZ')],
        ['Přihlášky na místo', ratio === null ? '—' : ratio.toLocaleString('cs-CZ', { maximumFractionDigits: 1 }) + '×'],
        ['První priority', first === null ? '—' : first.toLocaleString('cs-CZ')],
      ]
    : [
        ['Vypsaných oborů', data2026.length.toLocaleString('cs-CZ')],
        ['Kapacita míst celkem', capacity.toLocaleString('cs-CZ')],
      ];
  return <section className="mb-8 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
    <h3 className="bg-blue-600 px-5 py-3 font-semibold text-white">Přihlášky {rok} · 1. kolo</h3>
    <div className="p-5"><dl className={`grid grid-cols-2 gap-5 ${nabidka ? 'md:grid-cols-4' : ''}`}>
      {polozky.map(([label, value]) => <div key={label}><dt className="text-sm text-slate-600">{label}</dt><dd className="mt-1 text-2xl font-bold text-slate-900">{value}</dd></div>)}
    </dl>
    {summary && <p className="mt-4 text-sm text-slate-700">{summary}</p>}
    {!nabidka && <p className="mt-4 text-sm text-slate-700">Přihlášky na místo a první priority uvádíme u jednotlivých oborů. Součet za celou školu by sčítal různé konkurzy a tytéž uchazeče počítal víckrát.</p>}
    <p className="mt-4 text-sm text-slate-600">Historická poptávka není osobní pravděpodobnost přijetí. Nabídku a kritéria pro příští přijímací řízení ověřte u školy.</p>
    <div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-4 text-sm"><span className="text-slate-500">Zdroj: CERMAT{platnost ? `, stav k ${datum(platnost)}` : ''}.</span><Link href="/simulator" className="text-blue-700">Porovnat obory →</Link></div></div>
  </section>;
}
