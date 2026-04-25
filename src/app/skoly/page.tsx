import { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SchoolSearch } from '@/components/SchoolSearch';
import { VibecordingPromo } from '@/components/VibecordingPromo';
import { getAllSchools, getAllSchoolsForSearch, getAllKraje, getSchoolAnalysis } from '@/lib/data';
import { createSlug } from '@/lib/utils';
import { SchoolsPageTabs } from '@/components/SchoolsPageTabs';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Nejžádanější studijní obory',
  description: 'Žebříček nejžádanějších středoškolských oborů v ČR. Převis poptávky 2026, obtížnost přijetí, statistiky podle měst.',
  openGraph: {
    title: 'Nejžádanější studijní obory | Přijímačky na střední školy',
    description: 'Žebříček nejžádanějších středoškolských oborů v ČR.',
  },
};

export default async function SchoolsPage() {
  const [schools, searchSchools, kraje, analysis] = await Promise.all([
    getAllSchools(),
    getAllSchoolsForSearch(),
    getAllKraje(),
    getSchoolAnalysis(),
  ]);

  // Celkové statistiky
  const totalKapacita = schools.reduce((sum, s) => sum + s.kapacita, 0);
  const totalPrihlasky2026 = Object.values(analysis).reduce((sum, s) => sum + (s.prihlasky_2026 || 0), 0);
  const totalKapacita2026 = Object.values(analysis).reduce((sum, s) => sum + (s.kapacita_2026 || 0), 0);
  const schoolsWith2026 = Object.values(analysis).filter(s => (s.prihlasky_2026 || 0) > 0).length;

  // Připravit data pro client komponentu
  const schoolEntries = schools.map(s => {
    const sa = analysis[s.id];
    const slug = `${s.id.split('_')[0]}-${createSlug(s.nazev, s.obor)}`;
    return {
      id: s.id,
      nazev: s.nazev,
      obor: s.obor,
      obec: s.obec,
      kraj: s.kraj,
      kraj_kod: s.kraj_kod,
      typ: s.typ,
      delka_studia: s.delka_studia,
      slug,
      min_body: s.min_body,
      prihlasky: s.prihlasky,
      kapacita: s.kapacita,
      index_poptavky: s.index_poptavky,
      obtiznost: s.obtiznost,
      category_code: s.category_code,
      prihlasky_2026: sa?.prihlasky_2026 || 0,
      kapacita_2026: sa?.kapacita_2026 || 0,
      index_poptavky_2026: sa?.index_poptavky_2026 || 0,
    };
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="py-0 text-white py-12">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Nejžádanější studijní obory</h1>
            <p className="text-lg opacity-90 mb-8">
              Přehled {schools.length.toLocaleString('cs-CZ')} oborů a zaměření na středních školách v ČR
            </p>

            {/* Vyhledávání */}
            <SchoolSearch schools={searchSchools} kraje={kraje} />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
          <VibecordingPromo />
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Stats overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-lg shadow-sm text-center">
              <div className="text-3xl font-bold text-blue-600">{schoolsWith2026.toLocaleString('cs-CZ')}</div>
              <div className="text-sm text-slate-600">Oborů s daty 2026</div>
            </div>
            <div className="bg-white p-5 rounded-lg shadow-sm text-center">
              <div className="text-3xl font-bold text-blue-600">
                {Math.round(totalPrihlasky2026 / 1000)}k
              </div>
              <div className="text-sm text-slate-600">Přihlášek 2026</div>
            </div>
            <div className="bg-white p-5 rounded-lg shadow-sm text-center">
              <div className="text-3xl font-bold text-blue-600">
                {Math.round(totalKapacita2026 / 1000)}k
              </div>
              <div className="text-sm text-slate-600">Míst 2026</div>
            </div>
            <div className="bg-white p-5 rounded-lg shadow-sm text-center">
              <div className="text-3xl font-bold text-blue-600">
                {totalKapacita2026 > 0 ? (totalPrihlasky2026 / totalKapacita2026).toFixed(1) : '—'}×
              </div>
              <div className="text-sm text-slate-600">Prům. převis 2026</div>
            </div>
          </div>

          {/* Taby s žebříčky */}
          <SchoolsPageTabs schools={schoolEntries} />

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
