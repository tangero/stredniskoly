import { Metadata } from 'next';
import { Suspense } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SimulatorClient } from './SimulatorClient';
import { VibecordingPromo } from '@/components/VibecordingPromo';

export const metadata: Metadata = {
  title: 'Simulátor přijímacích zkoušek',
  description: 'Zadejte body z češtiny a matematiky a prohlédněte si historická data škol. Historická data nejsou zárukou přijetí.',
  openGraph: {
    title: 'Simulátor přijímacích zkoušek | Přijímačky na střední školy',
    description: 'Body z češtiny a matematiky a historická data škol. Historická data nejsou zárukou přijetí.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Simulátor přijímacích zkoušek',
    description: 'Body z češtiny a matematiky a historická data škol. Historická data nejsou zárukou přijetí.',
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
        <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
          <VibecordingPromo />
        </div>
        <Suspense fallback={<SimulatorLoading />}>
          <SimulatorClient />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
