import { Metadata } from 'next';
import { Suspense } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MojeSanceClient } from './MojeSanceClient';
import { VibecordingPromo } from '@/components/VibecordingPromo';

export const metadata: Metadata = {
  title: 'Moje šance – historická konkurence na středních školách',
  description: 'Porovnejte historické přihlášky, kapacity a výsledky vybraných oborů. Data 2026 nejsou osobní pravděpodobností přijetí v roce 2027.',
  openGraph: {
    title: 'Moje šance – srovnání historických dat',
    description: 'Srovnání historické konkurence u vybraných oborů středních škol.',
  },
};

function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 text-center">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
      <p className="mt-4 text-slate-600">Načítám kalkulačku...</p>
    </div>
  );
}

export default function MojeSancePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
          <VibecordingPromo />
        </div>
        <Suspense fallback={<Loading />}>
          <MojeSanceClient />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
