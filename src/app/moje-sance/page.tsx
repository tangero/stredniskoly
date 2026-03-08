import { Metadata } from 'next';
import { Suspense } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MojeSanceClient } from './MojeSanceClient';

export const metadata: Metadata = {
  title: 'Moje šance – kalkulačka přijetí na střední školu 2026',
  description: 'Zadejte školy, na které se hlásíte, a zjistěte své šance na přijetí. Porovnání přihlášek 2026 s historickými daty.',
  openGraph: {
    title: 'Moje šance – kalkulačka přijetí | Přijímačky na střední školy',
    description: 'Zjistěte, jaké máte šance na přijetí na vybrané střední školy v roce 2026.',
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
        <Suspense fallback={<Loading />}>
          <MojeSanceClient />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
