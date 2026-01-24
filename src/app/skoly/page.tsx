import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getAllSchools } from '@/lib/data';
import { createSlug, getDifficultyClass } from '@/lib/utils';
import { categoryLabels, categoryColors, krajNames } from '@/types/school';

export const metadata: Metadata = {
  title: 'Analýza škol',
  description: 'Prohlédněte si detailní analýzu všech středních škol v ČR. Statistiky přijímacích zkoušek, index poptávky, obtížnost přijetí.',
  openGraph: {
    title: 'Analýza škol | Přijímačky na SŠ',
    description: 'Detailní analýza všech středních škol v ČR.',
  },
};

export default async function SchoolsPage() {
  const schools = await getAllSchools();

  // Seřadit podle obtížnosti (nejvyšší první)
  const sortedSchools = [...schools].sort((a, b) => b.obtiznost - a.obtiznost);

  // Top 50 nejobtížnějších
  const topSchools = sortedSchools.slice(0, 50);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white py-12">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Analýza škol</h1>
            <p className="text-lg opacity-90">
              Prohlédněte si detailní statistiky {schools.length.toLocaleString('cs-CZ')} škol a oborů v ČR
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Stats overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="text-3xl font-bold text-indigo-600">{schools.length.toLocaleString('cs-CZ')}</div>
              <div className="text-sm text-slate-600">Škol a oborů</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="text-3xl font-bold text-indigo-600">14</div>
              <div className="text-sm text-slate-600">Krajů</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="text-3xl font-bold text-indigo-600">
                {Math.round(schools.reduce((sum, s) => sum + s.kapacita, 0) / 1000)}k
              </div>
              <div className="text-sm text-slate-600">Celková kapacita</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="text-3xl font-bold text-indigo-600">
                {(schools.reduce((sum, s) => sum + s.index_poptavky, 0) / schools.length).toFixed(1)}
              </div>
              <div className="text-sm text-slate-600">Prům. index poptávky</div>
            </div>
          </div>

          {/* Top školy */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Top 50 nejobtížnějších škol</h2>
              <p className="text-slate-600 text-sm mt-1">Seřazeno podle indexu obtížnosti přijetí</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 font-medium text-slate-600">#</th>
                    <th className="text-left p-4 font-medium text-slate-600">Škola</th>
                    <th className="text-left p-4 font-medium text-slate-600">Obor</th>
                    <th className="text-left p-4 font-medium text-slate-600">Kraj</th>
                    <th className="text-right p-4 font-medium text-slate-600">Min. body</th>
                    <th className="text-right p-4 font-medium text-slate-600">Index</th>
                    <th className="text-right p-4 font-medium text-slate-600">Obtížnost</th>
                  </tr>
                </thead>
                <tbody>
                  {topSchools.map((school, idx) => {
                    const difficulty = getDifficultyClass(school.obtiznost);
                    const slug = `${school.id.split('_')[0]}-${createSlug(school.nazev, school.obor)}`;

                    return (
                      <tr key={school.id} className="border-t hover:bg-slate-50">
                        <td className="p-4 text-slate-500">{idx + 1}</td>
                        <td className="p-4">
                          <Link href={`/skola/${slug}`} className="text-indigo-600 hover:underline font-medium">
                            {school.nazev}
                          </Link>
                        </td>
                        <td className="p-4 text-slate-600 text-sm">{school.obor}</td>
                        <td className="p-4 text-slate-600 text-sm">{krajNames[school.kraj_kod] || school.kraj}</td>
                        <td className="p-4 text-right font-medium">{school.min_body}</td>
                        <td className="p-4 text-right">{school.index_poptavky.toFixed(1)}</td>
                        <td className="p-4 text-right">
                          <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${difficulty.bgClass} ${difficulty.colorClass}`}>
                            {school.obtiznost.toFixed(0)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Link na regiony */}
          <div className="mt-8 text-center">
            <Link
              href="/regiony"
              className="inline-block bg-indigo-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Zobrazit podle regionů
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
