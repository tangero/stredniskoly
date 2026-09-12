import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSchools2026Data, getResultsForYear } from '@/lib/data';
import { normalizeSchoolKey } from '@/lib/school-key';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const source = 'https://data.cermat.cz/files/files/JPZ/agregovana_data_skoly/PZ2026_kolo1_skolobory_vysledky.xlsx';
const number = (n: number | null | undefined) => n == null ? '—' : n.toLocaleString('cs-CZ', { maximumFractionDigits: 1 });

export default async function OfferPage({ params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params;
  const all = await getSchools2026Data();
  const matches = all.filter(row => row.source_id === sourceId);
  if (matches.length !== 1) notFound();
  const offer = matches[0];
  const results = await getResultsForYear(2026);
  const result = Array.from(results).find(([id]) => normalizeSchoolKey(id) === normalizeSchoolKey(offer.id))?.[1];
  const context = offer.admission_context;
  const selection = `/simulator?${new URLSearchParams({ skoly: JSON.stringify([offer.id]), vyber: '1' })}`;
  const others = all.filter(row => row.redizo === offer.redizo && row.id !== offer.id);
  return <div className="min-h-screen bg-slate-50"><Header /><main className="mx-auto max-w-5xl px-4 py-10">
    <Link href="/simulator" className="text-blue-700 underline">Zpět do simulátoru</Link>
    <p className="mt-8 text-sm font-semibold text-blue-700">NABÍDKA OBORU · 1. KOLO 2026</p>
    <h1 className="mt-2 text-3xl font-bold text-slate-900">{offer.nazev}</h1>
    <h2 className="mt-3 text-2xl font-semibold text-blue-800">{offer.obor}{offer.zamereni ? ` · ${offer.zamereni}` : ''}</h2>
    <p className="mt-2 text-slate-600">{offer.obec} · {offer.delka_studia}leté studium · {offer.kkov}</p>
    <p className="my-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">Tento obor je doložen ve výsledcích přijímání 2026. Otevření, kapacita, kritéria a místo výuky pro rok 2027 zatím nejsou potvrzené.</p>
    <Link href={selection} className="inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white">Přidat do Mého výběru</Link>
    <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-semibold">Historické výsledky 2026</h2>
      <dl className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3">{([
        ['Průměr JPZ přijatých', `${number(context?.average_accepted)} / 100`],
        ['Čeština přijatých', `${number(result?.cj_prijati)} / 50`],
        ['Matematika přijatých', `${number(result?.ma_prijati)} / 50`],
        ['Přihlášky (všechny priority)', number(offer.prihlasky)],
        ['Kapacita 2026', number(offer.kapacita)],
        ['Přijatí', number(context?.accepted)],
      ]).map(([label, value]) => <div key={label}><dt className="text-sm text-slate-600">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd></div>)}</dl>
      <p className="mt-6 text-sm text-slate-600">Průměr není hranice přijetí ani předpověď šance. Pomlčka označuje chybějící nebo neověřený údaj. Předmětové průměry mohou zahrnovat jinou skupinu konajících než celkový průměr.</p>
      <a className="mt-3 block text-sm text-blue-700 underline" href={source}>Zdroj: CERMAT, 1. kolo 2026, platnost 17. 8. 2026</a>
    </section>
    {!!others.length && <section className="mt-8"><h2 className="text-xl font-semibold">Další obory této školy ({others.length})</h2><ul className="mt-4 divide-y divide-slate-200">{others.map(other => <li key={other.id} className="py-3"><Link className="font-semibold text-blue-800 hover:underline" href={`/nabidka/2026/${other.source_id}`}>{other.obor}{other.zamereni ? ` · ${other.zamereni}` : ''} · {other.delka_studia} let</Link></li>)}</ul></section>}
  </main><Footer /></div>;
}
