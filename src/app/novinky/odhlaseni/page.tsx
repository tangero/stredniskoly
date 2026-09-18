import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { OdhlaseniKlient } from './OdhlaseniKlient';

// ============================================================================
// Stránka odhlášení. Samotné načtení stránky odběr **neruší**: kdyby ho rušilo,
// zrušil by ho skener, který si odkazy v e-mailu automaticky otevírá
// (docs/novinky-k-prijimackam-2027.md, krok 7).
// ============================================================================

export const metadata = { title: 'Odhlášení z odběru', robots: { index: false, follow: false } };

export default function OdhlaseniPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16">
          <div className="max-w-xl mx-auto px-4">
            <OdhlaseniKlient />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
