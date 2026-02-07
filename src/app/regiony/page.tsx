import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SchoolSearch } from '@/components/SchoolSearch';
import { getAllKraje, getAllSchools, getSchoolsByKraj, getRegionStats, getExtendedSchoolStatsForSchools } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Přehled regionů',
  description: 'Přehled středních škol podle krajů ČR. Statistiky přijímacích zkoušek pro jednotlivé regiony.',
  openGraph: {
    title: 'Přehled regionů | Přijímačky na střední školy',
    description: 'Přehled středních škol podle krajů ČR.',
  },
};

// Lokální verze createSlug
function createSlug(name: string, obor?: string): string {
  let slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (obor) {
    const oborSlug = obor
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    slug = `${slug}-${oborSlug}`;
  }

  return slug;
}

export default async function RegionsPage() {
  const kraje = await getAllKraje();
  const allSchools = await getAllSchools();

  // Získat rozšířená data pro top školy
  const extendedStatsMap = await getExtendedSchoolStatsForSchools(allSchools.map(s => s.id));

  // Top 10 nejtěžších škol podle JPZ bodů (porovnatelné)
  const top10Schools = [...allSchools]
    .map(school => {
      const stats = extendedStatsMap.get(school.id);
      return {
        ...school,
        jpzMin: stats?.jpz_min || school.min_body,
        hasExtraCriteria: stats?.hasExtraCriteria || false
      };
    })
    .sort((a, b) => b.jpzMin - a.jpzMin)
    .slice(0, 10);

  // Získat statistiky pro každý kraj
  const krajStats = await Promise.all(
    kraje.map(async (kraj) => {
      const schools = await getSchoolsByKraj(kraj.kod);
      const stats = await getRegionStats(schools);
      return {
        ...kraj,
        stats,
      };
    })
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white py-12">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Přehled regionů</h1>
            <p className="text-lg opacity-90 mb-8">
              Vyberte kraj pro zobrazení přehledu středních škol
            </p>

            {/* Vyhledávání */}
            <SchoolSearch schools={allSchools} kraje={kraje} />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Top 10 nejtěžších oborů */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-lg">
                🔥
              </span>
              Top 10 nejtěžších středoškolských oborů podle přijímacích nároků
            </h2>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Desktop tabulka */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-slate-600 w-8">#</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">Škola / Obor / Město</th>
                      <th className="text-center px-3 py-2 font-medium text-slate-600 whitespace-nowrap">JPZ body</th>
                      <th className="text-center px-3 py-2 font-medium text-slate-600">Konkurence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top10Schools.map((school, index) => {
                      const slug = `${school.id.split('_')[0]}-${createSlug(school.nazev, school.obor)}`;
                      const medalColors = ['text-amber-500', 'text-slate-400', 'text-amber-700'];

                      return (
                        <tr key={school.id} className="border-t hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <span className={`font-bold ${index < 3 ? medalColors[index] : 'text-slate-400'}`}>
                              {index + 1}.
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <Link href={`/skola/${slug}`} className="group inline">
                              <span className="font-medium text-indigo-600 group-hover:underline">{school.nazev}</span>
                              <span className="text-slate-400 mx-1">·</span>
                              <span className="text-slate-600">{school.obor}</span>
                              <span className="text-slate-400 mx-1">·</span>
                              <span className="text-slate-500">{school.obec}, {school.kraj}</span>
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <span className="font-bold text-slate-900">{school.jpzMin}</span>
                            {school.hasExtraCriteria && <span className="ml-1" title="Dodatečná kritéria (prospěch)">📝</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`font-semibold ${
                              school.index_poptavky >= 3 ? 'text-red-600' :
                              school.index_poptavky >= 2 ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              {school.index_poptavky.toFixed(1)}×
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
                {top10Schools.map((school, index) => {
                  const slug = `${school.id.split('_')[0]}-${createSlug(school.nazev, school.obor)}`;
                  const medalColors = ['text-amber-500', 'text-slate-400', 'text-amber-700'];

                  return (
                    <div key={school.id} className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`font-bold shrink-0 ${index < 3 ? medalColors[index] : 'text-slate-400'}`}>
                            {index + 1}.
                          </span>
                          <Link href={`/skola/${slug}`} className="font-medium text-indigo-600 hover:underline text-sm truncate">
                            {school.nazev}
                          </Link>
                        </div>
                        <span className="font-bold text-slate-900 shrink-0">{school.jpzMin}b</span>
                      </div>
                      <div className="text-sm text-slate-600 mb-1 truncate">{school.obor}</div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">{school.obec}, {school.kraj}</span>
                        <span className={`font-semibold ${
                          school.index_poptavky >= 3 ? 'text-red-600' :
                          school.index_poptavky >= 2 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {school.index_poptavky.toFixed(1)}× konkurence
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Seznam krajů */}
          <section>
            <h2 className="text-2xl font-bold mb-6">Kraje České republiky</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {krajStats.map((kraj) => (
                <Link
                  key={kraj.kod}
                  href={`/regiony/${kraj.slug}`}
                  className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow group"
                >
                  <h3 className="text-xl font-semibold mb-4 group-hover:text-indigo-600 transition-colors">
                    {kraj.nazev}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-2xl font-bold text-indigo-600">{kraj.stats.totalSchools}</div>
                      <div className="text-slate-600">Škol/oborů</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-indigo-600">
                        {Math.round(kraj.stats.totalKapacita / 100) / 10}k
                      </div>
                      <div className="text-slate-600">Kapacita</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-indigo-600">
                        {kraj.stats.avgIndexPoptavky.toFixed(1)}
                      </div>
                      <div className="text-slate-600">Prům. index</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-indigo-600">
                        {Math.round(kraj.stats.avgMinBody)}
                      </div>
                      <div className="text-slate-600">Prům. min. body</div>
                    </div>
                  </div>
                  <div className="mt-4 text-indigo-600 text-sm font-medium group-hover:underline">
                    Zobrazit detail →
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
