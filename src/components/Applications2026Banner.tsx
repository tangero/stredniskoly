import Link from 'next/link';
import type { School2026Data } from '@/lib/data';
import { applicationsPerPlace, capacitySummary } from '@/lib/admission-summary';

interface Props {
  data2026: School2026Data[];
  totalKapacita2025: number;
  totalPrihlasky2025: number;
  singleProgram?: boolean;
}
export function Applications2026Banner({ data2026 }: Props) {
  const applications = data2026.reduce((sum, row) => sum + row.prihlasky, 0);
  const capacity = data2026.reduce((sum, row) => sum + row.kapacita, 0);
  const ratio = applicationsPerPlace(applications, capacity);
  const first = data2026.every(row => row.prihlasky_priority?.[0] != null)
    ? data2026.reduce((sum, row) => sum + row.prihlasky_priority[0], 0) : null;
  const summary = data2026.length === 1 ? capacitySummary(data2026[0].admission_context) : null;
  return <section className="mb-8 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
    <h3 className="bg-blue-600 px-5 py-3 font-semibold text-white">Přihlášky 2026 · 1. kolo</h3>
    <div className="p-5"><dl className="grid grid-cols-2 gap-5 md:grid-cols-4">
      {([['Přihlášky', applications], ['Kapacita míst', capacity], ['Přihlášky na místo', ratio === null ? '—' : ratio.toLocaleString('cs-CZ', { maximumFractionDigits: 1 }) + '×'], ['První priority', first ?? '—']] as const).map(([label, value]) => <div key={label}><dt className="text-sm text-slate-600">{label}</dt><dd className="mt-1 text-2xl font-bold text-slate-900">{typeof value === 'number' ? value.toLocaleString('cs-CZ') : value}</dd></div>)}
    </dl>
    {summary && <p className="mt-4 text-sm text-slate-700">{summary}</p>}
    <p className="mt-4 text-sm text-slate-600">Historická poptávka není osobní pravděpodobnost přijetí. Nabídku a kritéria pro rok 2027 ověřte u školy. Součty za školu se týkají nabídek v rozsahu importu.</p>
    <div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-4 text-sm"><span className="text-slate-500">Zdroj: CERMAT, stav k 17. 8. 2026.</span><Link href="/simulator" className="text-blue-700">Porovnat obory →</Link></div></div>
  </section>;
}
