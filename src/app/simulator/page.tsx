import { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SimulatorClient } from './SimulatorClient';

export const metadata: Metadata = {
  title: 'Simulátor přijímacích zkoušek',
  description: 'Zadejte své body z českého jazyka a matematiky a zjistěte, na které střední školy máte šanci se dostat.',
  openGraph: {
    title: 'Simulátor přijímacích zkoušek | Přijímačky na SŠ',
    description: 'Zjistěte své šance na přijetí na střední školu.',
  },
};

export default function SimulatorPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white py-8">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Simulátor přijímacích zkoušek</h1>
            <p className="opacity-90">
              Zadejte své body a zjistěte šance na přijetí
            </p>
          </div>
        </div>

        <SimulatorClient />
      </main>

      <Footer />
    </div>
  );
}
