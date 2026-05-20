import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getResultsMeta, getResultsForYear } from '@/lib/data';
import { ResultsClient } from './ResultsClient';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ year: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `Výsledky přijímacích zkoušek ${year} — přehled škol a oborů`,
    description: `Kompletní přehled výsledků 1. kola přijímacích zkoušek ${year}. Skóre přijatých, žebříčky gymnázií a srovnání s předchozím rokem.`,
  };
}

export default async function VysledkyPage({ params }: Props) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);

  const meta = await getResultsMeta();
  if (!meta.available_years.includes(year)) notFound();

  const resultsMap = await getResultsForYear(year);
  const results = Array.from(resultsMap.values());

  const totalKapacita = results.reduce((s, r) => s + r.kapacita, 0);
  const totalPrijati = results.reduce((s, r) => s + r.prijati, 0);

  return (
    <>
      <Header />
      <main>
        <Suspense fallback={null}>
          <ResultsClient
            results={results}
            year={year}
            prevYear={year - 1}
            totalKapacita={totalKapacita}
            totalPrijati={totalPrijati}
            availableYears={meta.available_years}
          />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
