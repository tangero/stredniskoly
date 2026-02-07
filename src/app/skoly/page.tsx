import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SchoolSearch } from '@/components/SchoolSearch';
import { getAllSchools, getAllKraje } from '@/lib/data';
import { createSlug, getDifficultyClass } from '@/lib/utils';
import { categoryLabels, categoryColors, krajNames } from '@/types/school';

export const metadata: Metadata = {
  title: 'Analýza škol',
  description: 'Prohlédněte si detailní analýzu všech středních škol v ČR. Statistiky přijímacích zkoušek, index poptávky, obtížnost přijetí.',
  openGraph: {
    title: 'Analýza škol | Přijímačky na střední školy',
    description: 'Detailní analýza všech středních škol v ČR.',
  },
};

// Helper pro délku studia badge
function StudyLengthBadge({ delka }: { delka: number }) {
  const colors: Record<number, string> = {
    4: 'bg-blue-100 text-blue-800',
    6: 'bg-blue-100 text-blue-800',
    8: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[delka] || 'bg-slate-100 text-slate-800'}`}>
      {delka}L
    </span>
  );
}

export default async function SchoolsPage() {
  const schools = await getAllSchools();
  const kraje = await getAllKraje();

  // Seřadit podle obtížnosti (nejvyšší první)
  const sortedSchools = [...schools].sort((a, b) => b.obtiznost - a.obtiznost);

  // Top 50 nejobtížnějších
  const topSchools = sortedSchools.slice(0, 50);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="py-0 text-white py-12">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Analýza škol</h1>
            <p className="text-lg opacity-90 mb-8">
              Prohlédněte si detailní statistiky {schools.length.toLocaleString('cs-CZ')} škol a oborů v ČR
            </p>

            {/* Vyhledávání */}
            <SchoolSearch schools={schools} kraje={kraje} />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Stats overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="text-3xl font-bold text-blue-600">{schools.length.toLocaleString('cs-CZ')}</div>
              <div className="text-sm text-slate-600">Škol a oborů</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="text-3xl font-bold text-blue-600">14</div>
              <div className="text-sm text-slate-600">Krajů</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="text-3xl font-bold text-blue-600">
                {Math.round(schools.reduce((sum, s) => sum + s.kapacita, 0) / 1000)}k
              </div>
              <div className="text-sm text-slate-600">Celková kapacita</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="text-3xl font-bold text-blue-600">
                {(schools.reduce((sum, s) => sum + s.index_poptavky, 0) / schools.length).toFixed(1)}
              </div>
              <div className="text-sm text-slate-600">Prům. index poptávky</div>
            </div>
          </div>

          {/* Legenda */}
          <div className="bg-white p-4 rounded-lg shadow-sm mb-4 text-sm">
            <div className="font-medium text-slate-700 mb-2">Legenda:</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:flex md:flex-wrap gap-x-4 gap-y-2 md:items-center">
              <div className="flex gap-2 items-center">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">4L</span>
                <span className="text-slate-600">4leté</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">6L</span>
                <span className="text-slate-600">6leté</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">8L</span>
                <span className="text-slate-600">8leté</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">1. volba</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Prefer.</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Vyvážená</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Záložní</span>
              </div>
            </div>
          </div>

          {/* Top školy */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Top 50 nejobtížnějších škol</h2>
              <p className="text-slate-600 text-sm mt-1">Seřazeno podle indexu obtížnosti přijetí</p>
            </div>

            {/* Desktop tabulka */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 font-medium text-slate-600">#</th>
                    <th className="text-left p-4 font-medium text-slate-600">Škola</th>
                    <th className="text-left p-4 font-medium text-slate-600">Obor</th>
                    <th className="text-center p-4 font-medium text-slate-600">Délka</th>
                    <th className="text-left p-4 font-medium text-slate-600">Kategorie</th>
                    <th className="text-left p-4 font-medium text-slate-600">Kraj</th>
                    <th className="text-right p-4 font-medium text-slate-600">Min. body</th>
                    <th className="text-right p-4 font-medium text-slate-600">Index</th>
                    <th className="text-right p-4 font-medium text-slate-600">Obtížnost</th>
                  </tr>
                </thead>
                <tbody>
                  {topSchools.map((school, idx) => {
                    const difficulty = getDifficultyClass(school.obtiznost);
                    const category = categoryColors[school.category_code];
                    const slug = `${school.id.split('_')[0]}-${createSlug(school.nazev, school.obor)}`;

                    return (
                      <tr key={school.id} className="border-t hover:bg-slate-50">
                        <td className="p-4 text-slate-500">{idx + 1}</td>
                        <td className="p-4">
                          <Link href={`/skola/${slug}`} className="text-blue-600 hover:underline font-medium">
                            {school.nazev}
                          </Link>
                        </td>
                        <td className="p-4 text-slate-600 text-sm">{school.obor}</td>
                        <td className="p-4 text-center">
                          <StudyLengthBadge delka={school.delka_studia} />
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${category.bg} ${category.text}`}>
                            {categoryLabels[school.category_code]}
                          </span>
                        </td>
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

            {/* Mobilní karty */}
            <div className="md:hidden divide-y">
              {topSchools.map((school, idx) => {
                const difficulty = getDifficultyClass(school.obtiznost);
                const category = categoryColors[school.category_code];
                const slug = `${school.id.split('_')[0]}-${createSlug(school.nazev, school.obor)}`;

                return (
                  <div key={school.id} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-slate-400 text-sm font-medium shrink-0">{idx + 1}.</span>
                        <Link href={`/skola/${slug}`} className="text-blue-600 hover:underline font-medium text-sm truncate">
                          {school.nazev}
                        </Link>
                      </div>
                      <span className={`inline-block px-2 py-1 rounded text-sm font-medium shrink-0 ${difficulty.bgClass} ${difficulty.colorClass}`}>
                        {school.obtiznost.toFixed(0)}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 mb-2 truncate">{school.obor}</div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <StudyLengthBadge delka={school.delka_studia} />
                      <span className={`inline-block px-2 py-0.5 rounded font-medium ${category.bg} ${category.text}`}>
                        {categoryLabels[school.category_code]}
                      </span>
                      <span className="text-slate-500">{krajNames[school.kraj_kod] || school.kraj}</span>
                      <span className="ml-auto text-slate-700 font-medium">min. {school.min_body}b</span>
                      <span className="text-slate-500">index {school.index_poptavky.toFixed(1)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Link na regiony */}
          <div className="mt-8 text-center">
            <Link
              href="/regiony"
              className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
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
