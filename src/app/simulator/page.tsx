import { Metadata } from 'next';
import { Suspense } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SimulatorClient } from './SimulatorClient';

export const metadata: Metadata = {
  title: 'Simulátor výběru školy 2027',
  description: 'Vyberte obor a nastavte orientační dojezd veřejnou dopravou. Uložte si školy a prohlédněte si jejich historické výsledky.',
  openGraph: {
    title: 'Simulátor výběru školy 2027 | Přijímačky na střední školy',
    description: 'Obory, orientační dojezd veřejnou dopravou a vlastní výběr škol pro rok 2027.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Simulátor výběru školy 2027',
    description: 'Obory, orientační dojezd veřejnou dopravou a vlastní výběr škol pro rok 2027.',
  },
};

function SimulatorLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12 text-center">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
      <p className="mt-4 text-slate-600">Načítám simulátor...</p>
    </div>
  );
}

export default function SimulatorPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1">
        <Suspense fallback={<SimulatorLoading />}>
          <SimulatorClient />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
