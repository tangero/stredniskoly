import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { RegionSchoolsTable } from '@/components/RegionSchoolsTable';
import { getAllKraje, getSchoolsByKraj, getRegionStats, getExtendedSchoolStatsForSchools, getTrendDataForSchools, ExtendedSchoolStats, YearlyTrendData } from '@/lib/data';

interface Props {
  params: Promise<{ kraj: string }>;
  searchParams: Promise<{ delka?: string }>;
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
      title: `${kraj.nazev} kraj | Přijímačky na střední školy`,
      description: `Přehled ${kraj.count} středních škol v ${kraj.nazev} kraji.`,
    },
  };
}

export default async function RegionPage({ params, searchParams }: Props) {
  const { kraj: krajSlug } = await params;
  const { delka: delkaParam } = await searchParams;
  const kraje = await getAllKraje();
  const kraj = kraje.find((k) => k.slug === krajSlug);

  if (!kraj) {
    notFound();
  }

  const allSchools = await getSchoolsByKraj(kraj.kod);
  const stats = await getRegionStats(allSchools);

  // Načíst rozšířená data a trend data pro všechny školy
  const schoolIds = allSchools.map(s => s.id);
  const [extendedStatsMap, trendDataMap] = await Promise.all([
    getExtendedSchoolStatsForSchools(schoolIds),
    getTrendDataForSchools(schoolIds)
  ]);

  // Převést Map na Record pro předání do client komponenty
  const extendedStatsRecord: Record<string, ExtendedSchoolStats> = {};
  extendedStatsMap.forEach((value, key) => {
    extendedStatsRecord[key] = value;
  });

  const trendDataRecord: Record<string, YearlyTrendData> = {};
  trendDataMap.forEach((value, key) => {
    trendDataRecord[key] = value;
  });

  // Spočítat počty podle délky studia (před filtrováním)
  const countByLength = {
    8: allSchools.filter(s => s.delka_studia === 8).length,
    6: allSchools.filter(s => s.delka_studia === 6).length,
    4: allSchools.filter(s => s.delka_studia === 4).length,
  };

  // Filtrovat podle délky studia pokud je zadáno
  const selectedDelka = delkaParam ? parseInt(delkaParam) : null;
  const filteredSchools = selectedDelka
    ? allSchools.filter(s => s.delka_studia === selectedDelka)
    : allSchools;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <nav className="text-sm text-slate-600">
              <Link href="/" className="hover:text-blue-600">Domů</Link>
              <span className="mx-2">/</span>
              <Link href="/regiony" className="hover:text-blue-600">Regiony</Link>
              <span className="mx-2">/</span>
              <span className="text-slate-900">{kraj.nazev}</span>
            </nav>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white py-12">
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
              <div className="text-3xl font-bold text-blue-600">{stats.totalSchools}</div>
              <div className="text-sm text-slate-600">Škol/oborů</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="text-3xl font-bold text-blue-600">
                {Math.round(stats.totalKapacita / 100) / 10}k
              </div>
              <div className="text-sm text-slate-600">Celková kapacita</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="text-3xl font-bold text-blue-600">
                {stats.avgIndexPoptavky.toFixed(1)}
              </div>
              <div className="text-sm text-slate-600">Prům. index poptávky</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="text-3xl font-bold text-blue-600">
                {Math.round(stats.avgMinBody)}
              </div>
              <div className="text-sm text-slate-600">Prům. min. body</div>
            </div>
          </div>

          {/* Filtry podle délky studia */}
          <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-slate-700">Filtrovat podle délky:</span>
              <Link
                href={`/regiony/${krajSlug}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !selectedDelka
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Všechny ({stats.totalSchools})
              </Link>
              {countByLength[8] > 0 && (
                <Link
                  href={`/regiony/${krajSlug}?delka=8`}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedDelka === 8
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                  }`}
                >
                  8leté ({countByLength[8]})
                </Link>
              )}
              {countByLength[6] > 0 && (
                <Link
                  href={`/regiony/${krajSlug}?delka=6`}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedDelka === 6
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                  }`}
                >
                  6leté ({countByLength[6]})
                </Link>
              )}
              {countByLength[4] > 0 && (
                <Link
                  href={`/regiony/${krajSlug}?delka=4`}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedDelka === 4
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                  }`}
                >
                  4leté ({countByLength[4]})
                </Link>
              )}
            </div>
            {selectedDelka && (
              <div className="mt-3 text-sm text-slate-600">
                Zobrazeno {filteredSchools.length} {selectedDelka}letých oborů z celkem {stats.totalSchools}
              </div>
            )}
          </div>

          {/* Legenda - kompaktní na mobilech */}
          <div className="bg-slate-50 p-4 rounded-xl mb-6 text-sm">
            <div className="font-medium text-slate-700 mb-2">Legenda:</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-x-4 gap-y-2 md:items-center">
              {/* Priority */}
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="text-slate-600">1. priorita</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                <span className="text-slate-600">2. priorita</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="text-slate-600">3. priorita</span>
              </div>
              {/* Obtížnost */}
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-4 bg-green-500 rounded"></span>
                <span className="text-slate-600">Snazší</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-4 bg-yellow-500 rounded"></span>
                <span className="text-slate-600">Střední</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-4 bg-red-500 rounded"></span>
                <span className="text-slate-600">Těžké</span>
              </div>
              {/* Další */}
              <div className="flex items-center gap-1.5">
                <span>📝</span>
                <span className="text-slate-600">Extra kritéria</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700">↓</span>
                <span className="text-slate-600">Méně přihlášek</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700">↑</span>
                <span className="text-slate-600">Více přihlášek</span>
              </div>
            </div>
          </div>

          {/* Tabulka škol */}
          <RegionSchoolsTable
            schools={filteredSchools}
            extendedStatsMap={extendedStatsRecord}
            trendDataMap={trendDataRecord}
            krajName={kraj.nazev}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
