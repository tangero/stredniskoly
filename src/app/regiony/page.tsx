import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getAllKraje, getSchoolsByKraj, getRegionStats } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Přehled regionů',
  description: 'Přehled středních škol podle krajů ČR. Statistiky přijímacích zkoušek pro jednotlivé regiony.',
  openGraph: {
    title: 'Přehled regionů | Přijímačky na SŠ',
    description: 'Přehled středních škol podle krajů ČR.',
  },
};

export default async function RegionsPage() {
  const kraje = await getAllKraje();

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
            <p className="text-lg opacity-90">
              Vyberte kraj pro zobrazení přehledu středních škol
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {krajStats.map((kraj) => (
              <Link
                key={kraj.kod}
                href={`/region/${kraj.slug}`}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow group"
              >
                <h2 className="text-xl font-semibold mb-4 group-hover:text-indigo-600 transition-colors">
                  {kraj.nazev}
                </h2>
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
        </div>
      </main>

      <Footer />
    </div>
  );
}
