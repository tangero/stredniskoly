import { Metadata } from 'next';
import Link from 'next/link';
import { promises as fs } from 'fs';
import path from 'path';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MESTA } from '@/lib/mesta.mjs';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import { MestaSeznam, type MestoKarta } from './MestaSeznam';

export async function generateMetadata(): Promise<Metadata> {
  const rok = await zobrazeneObdobi('cermat-prihlasky');
  const zaRok = rok ? ` v 1. kole ${rok}` : '';
  return {
    alternates: { canonical: '/mesto' },
    title: 'Střední školy podle měst — kompletní přehledy',
    description: `Přehled středních škol v ${MESTA.length} městech: které školy tam jsou a jak těžké bylo se na ně dostat${zaRok}.`,
    openGraph: {
      title: 'Střední školy podle měst',
      description: `Které střední školy jsou ve tvém městě a jak těžké bylo se na ně dostat${zaRok}.`,
    },
  };
}

/**
 * Počty škol a nabídek za města z jednoho průchodu katalogem.
 *
 * Dřív se pro každé město volalo getCityStats, které projde celý katalog;
 * u víc než stovky měst by to build zdržovalo bez užitku, protože karta
 * potřebuje jen dva počty.
 */
async function kartyMest(): Promise<MestoKarta[]> {
  const obdobi = await zobrazeneObdobi('cermat-prihlasky');
  const katalog = JSON.parse(
    await fs.readFile(path.join(process.cwd(), 'public', 'schools_data.json'), 'utf-8'),
  ) as Record<string, { obec?: string; redizo?: string | number }[]>;
  const rocnik = (obdobi && katalog[obdobi]) || katalog['2025'] || [];

  const skoly = new Map<string, Set<string>>();
  const nabidky = new Map<string, number>();
  for (const radek of rocnik) {
    if (!radek.obec) continue;
    if (!skoly.has(radek.obec)) skoly.set(radek.obec, new Set());
    skoly.get(radek.obec)!.add(String(radek.redizo));
    nabidky.set(radek.obec, (nabidky.get(radek.obec) ?? 0) + 1);
  }

  return MESTA.map(m => ({
    nazev: m.nazev,
    slug: m.slug,
    kraj: m.kraj,
    skol: skoly.get(m.nazev)?.size ?? 0,
    nabidek: nabidky.get(m.nazev) ?? 0,
  })).filter(m => m.skol > 0);
}

export default async function MestaPage() {
  const mesta = await kartyMest();
  const rok = await zobrazeneObdobi('cermat-prihlasky');

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
              Střední školy podle měst
            </h1>
            <p className="text-blue-200 text-lg">
              Které školy ve městě jsou a jak těžké bylo se na ně dostat
              {rok ? ` v 1. kole ${rok}` : ''}
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <MestaSeznam mesta={mesta} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
