import { Metadata } from 'next';
import { Suspense } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MereniClarity } from '@/components/MereniClarity';
import { SimulatorClient } from './SimulatorClient';
import { rokPasemPrijeti } from '@/lib/pasma-prijeti';
import { nactiPrevodTestu } from '@/lib/prevod-testu';
import calendar from '@/data/admissions-2027.json';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import type { TerminKriterii } from '@/components/simulator/VyhradySimulatoru';

/** Termín zveřejnění kritérií nového řízení z harmonogramu MŠMT (událost ss-kriteria). */
function terminKriterii(): TerminKriterii | null {
  const e = calendar.groups.flatMap(g => g.events).find(x => x.id === 'ss-kriteria');
  return e?.date && e.start ? { datum: e.date, rok: Number(e.start.slice(0, 4)) } : null;
}

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
  const [rokPasem, prevod, obdobiKriterii] = await Promise.all([rokPasemPrijeti(), nactiPrevodTestu(), zobrazeneObdobi('dipsy-kriteria')]);
  const rokKriterii = obdobiKriterii && /^\d{4}$/.test(obdobiKriterii) ? Number(obdobiKriterii) : null;
  return (
    // Clarity měří jen simulátor (#329); veškerý text a pole stránky se v záznamu maskují.
    <div className="min-h-screen flex flex-col bg-slate-50" data-clarity-mask="true">
      <MereniClarity />
      <Header />

      <main className="flex-1">
        <Suspense fallback={<SimulatorLoading />}>
          <SimulatorClient rokPasem={rokPasem} prevod={prevod} pravidla={calendar.pravidla}
            rokKriterii={rokKriterii} terminKriterii={terminKriterii()} />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
