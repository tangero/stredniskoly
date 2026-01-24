import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getAllKraje, getSchoolsByKraj, getRegionStats } from '@/lib/data';
import { createSlug, getDifficultyClass } from '@/lib/utils';
import { krajNames } from '@/types/school';

interface Props {
  params: Promise<{ kraj: string }>;
}

export async function generateStaticParams() {
  const kraje = await getAllKraje();
  return kraje.map((k) => ({ kraj: k.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kraj: krajSlug } = await params;
  const kraje = await getAllKraje();
  const kraj = kraje.find((k) => k.slug === krajSlug);

  if (!kraj) {
    return { title: 'Region nenalezen' };
  }

  return {
    title: `${kraj.nazev} kraj - Přehled škol`,
    description: `Přehled středních škol v ${kraj.nazev} kraji. ${kraj.count} škol a oborů, statistiky přijímacích zkoušek.`,
    openGraph: {
      title: `${kraj.nazev} kraj | Přijímačky na SŠ`,
      description: `Přehled ${kraj.count} středních škol v ${kraj.nazev} kraji.`,
    },
  };
}

export default async function RegionPage({ params }: Props) {
  const { kraj: krajSlug } = await params;
  const kraje = await getAllKraje();
  const kraj = kraje.find((k) => k.slug === krajSlug);

  if (!kraj) {
    notFound();
  }

  const schools = await getSchoolsByKraj(kraj.kod);
  const stats = await getRegionStats(schools);

  // Seřadit školy podle obtížnosti
  const sortedSchools = [...schools].sort((a, b) => b.obtiznost - a.obtiznost);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <nav className="text-sm text-slate-600">
              <Link href="/" className="hover:text-indigo-600">Domů</Link>
              <span className="mx-2">/</span>
              <Link href="/regiony" className="hover:text-indigo-600">Regiony</Link>
              <span className="mx-2">/</span>
              <span className="text-slate-900">{kraj.nazev}</span>
            </nav>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white py-12">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{kraj.nazev} kraj</h1>
            <p className="text-lg opacity-90">
              Přehled {stats.totalSchools} středních škol a oborů
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="text-3xl font-bold text-indigo-600">{stats.totalSchools}</div>
              <div className="text-sm text-slate-600">Škol/oborů</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="text-3xl font-bold text-indigo-600">
                {Math.round(stats.totalKapacita / 100) / 10}k
              </div>
              <div className="text-sm text-slate-600">Celková kapacita</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="text-3xl font-bold text-indigo-600">
                {stats.avgIndexPoptavky.toFixed(1)}
              </div>
              <div className="text-sm text-slate-600">Prům. index poptávky</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="text-3xl font-bold text-indigo-600">
                {Math.round(stats.avgMinBody)}
              </div>
              <div className="text-sm text-slate-600">Prům. min. body</div>
            </div>
          </div>

          {/* Tabulka škol */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Školy v {kraj.nazev} kraji</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 font-medium text-slate-600">Škola</th>
                    <th className="text-left p-4 font-medium text-slate-600">Obor</th>
                    <th className="text-left p-4 font-medium text-slate-600">Obec</th>
                    <th className="text-right p-4 font-medium text-slate-600">Min. body</th>
                    <th className="text-right p-4 font-medium text-slate-600">Index</th>
                    <th className="text-right p-4 font-medium text-slate-600">Obtížnost</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSchools.map((school) => {
                    const difficulty = getDifficultyClass(school.obtiznost);
                    const slug = `${school.id.split('_')[0]}-${createSlug(school.nazev, school.obor)}`;

                    return (
                      <tr key={school.id} className="border-t hover:bg-slate-50">
                        <td className="p-4">
                          <Link href={`/skola/${slug}`} className="text-indigo-600 hover:underline font-medium">
                            {school.nazev}
                          </Link>
                        </td>
                        <td className="p-4 text-slate-600 text-sm">{school.obor}</td>
                        <td className="p-4 text-slate-600 text-sm">{school.obec}</td>
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
        </div>
      </main>

      <Footer />
    </div>
  );
}
