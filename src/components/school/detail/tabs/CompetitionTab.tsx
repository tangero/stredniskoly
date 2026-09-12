import Link from 'next/link';

export function CompetitionTab() {
  return <div className="rounded-xl border border-slate-200 bg-white p-6">
    <h3 className="font-semibold text-slate-900">Porovnání dalších oborů</h3>
    <p className="mt-3 text-slate-600">Pro doporučení podle bodových hranic nemáme ověřené podklady. V simulátoru můžete porovnat historické výsledky, počty přihlášek, kapacitu a dojezd.</p>
    <Link href="/simulator" className="mt-4 inline-block text-blue-700 underline">Otevřít simulátor</Link>
  </div>;
}
