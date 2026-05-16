import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MESTA, getCityStats } from '@/lib/cityData';

export const metadata: Metadata = {
  title: 'Střední školy podle měst — přijímačky 2026',
  description: 'Přehled středních škol ve 20 největších českých městech. Data přijímacích zkoušek 2026, kapacity a zájem uchazečů.',
  openGraph: {
    title: 'Střední školy podle měst | Přijímačky 2026',
    description: 'Srovnání středních škol ve 20 největších českých městech.',
  },
};

function fmt(n: number, dec = 0) {
  return n.toLocaleString('cs-CZ', { maximumFractionDigits: dec, minimumFractionDigits: dec });
}

export default async function MestaPage() {
  const mestaData = await Promise.all(
    MESTA.map(async m => {
      const stats = await getCityStats(m.nazev);
      if (!stats) return null;
      const { totals } = stats;
      const idx = totals.kapacita2026 > 0 ? totals.prihlasky2026 / totals.kapacita2026 : null;
      return {
        ...m,
        totalSchools: stats.schools.length,
        kapacita: totals.kapacita2026 || totals.kapacita2025,
        prihlasky: totals.prihlasky2026 || totals.prihlasky2025,
        index: idx,
        nationalIndex: totals.nationalIndex2026,
      };
    })
  );

  const valid = mestaData.filter(Boolean) as NonNullable<typeof mestaData[0]>[];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white py-12">
          <div className="max-w-6xl mx-auto px-4">
            <nav className="text-sm text-blue-200 mb-4">
              <Link href="/" className="hover:text-white">Domů</Link>
              <span className="mx-2">/</span>
              <span className="text-white">Města</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Střední školy ve 20 největších městech ČR
            </h1>
            <p className="text-blue-200 text-lg">
              Kapacity, zájem uchazečů a výsledky přijímacích zkoušek 2026
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {valid.map(m => {
              const vsNat = m.index !== null
                ? m.index < m.nationalIndex ? 'snazší' : 'těžší'
                : null;
              const idxColor = m.index === null ? 'text-slate-500'
                : m.index >= 3 ? 'text-red-600' : m.index >= 2 ? 'text-orange-600' : 'text-green-700';

              return (
                <Link
                  key={m.slug}
                  href={`/mesto/${m.slug}`}
                  className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-blue-300 transition-all group"
                >
                  <h2 className="text-lg font-bold group-hover:text-blue-600 transition-colors mb-1">
                    {m.nazev}
                  </h2>
                  <p className="text-xs text-slate-400 mb-4">{m.kraj}</p>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Oborů / škol</span>
                      <span className="font-semibold">{m.totalSchools}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Kapacita</span>
                      <span className="font-semibold">{fmt(m.kapacita)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Přihlášek 2026</span>
                      <span className="font-semibold">{fmt(m.prihlasky)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Index zájmu</span>
                      <div className="text-right">
                        <span className={`font-bold ${idxColor}`}>
                          {m.index !== null ? `${m.index.toFixed(1)}×` : '—'}
                        </span>
                        {vsNat && (
                          <span className={`block text-xs ${vsNat === 'snazší' ? 'text-green-600' : 'text-red-600'}`}>
                            {vsNat} než ČR
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-blue-600 text-sm font-medium group-hover:underline">
                    Zobrazit detail →
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
