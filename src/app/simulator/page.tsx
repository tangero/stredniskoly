import { Metadata } from 'next';
import { Suspense } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SimulatorClient } from './SimulatorClient';
import { rokPasemPrijeti } from '@/lib/pasma-prijeti';
import { nactiPrevodTestu } from '@/lib/prevod-testu';

export const metadata: Metadata = {
  alternates: { canonical: '/simulator' },
  title: 'Simulátor přijímaček 2027',
  description: 'Zadejte výsledek cvičného testu, vyberte obor a nastavte orientační dojezd veřejnou dopravou. Uložte si obory a prohlédněte si jejich výsledky přijímacího řízení.',
  openGraph: {
    title: 'Simulátor přijímaček 2027 | Přijímačky na střední školy',
    description: 'Výsledek cvičného testu, obory, orientační dojezd veřejnou dopravou a vlastní výběr oborů pro rok 2027.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Simulátor přijímaček 2027',
    description: 'Výsledek cvičného testu, obory, orientační dojezd veřejnou dopravou a vlastní výběr oborů pro rok 2027.',
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

export default async function SimulatorPage() {
  // Roky z registru: pásma ze sady cermat-uchazeci-kolo1, převod ze sady cermat-prevod-testu.
  const [rokPasem, prevod] = await Promise.all([rokPasemPrijeti(), nactiPrevodTestu()]);
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1">
        <Suspense fallback={<SimulatorLoading />}>
          <SimulatorClient rokPasem={rokPasem} prevod={prevod} />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
