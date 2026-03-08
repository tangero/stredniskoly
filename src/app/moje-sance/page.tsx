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
        <div className="bg-gradient-to-br from-blue-500 via-blue-500 to-blue-600 text-white py-12">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-2xl md:text-4xl font-bold mb-3">Moje šance</h1>
            <p className="text-lg opacity-90 max-w-2xl">
              Zadejte školy, na které se hlásíte, a zjistěte počty přihlášek.
            </p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center max-w-2xl mx-auto">
            <div className="text-5xl mb-4">🔧</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Aktualizujeme data</h2>
            <p className="text-slate-600 mb-4">
              Právě probíhá aktualizace dat přihlášek 2026 z CERMATu.
              Funkce bude dostupná dnes večer s čerstvými čísly.
            </p>
            <p className="text-sm text-slate-400">
              Děkujeme za trpělivost a za vaše hlášení nepřesností.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
