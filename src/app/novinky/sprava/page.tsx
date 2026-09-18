import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SpravaKlient } from './SpravaKlient';

// ============================================================================
// Správa odběru z odkazu v e-mailu (docs/novinky-k-prijimackam-2027.md, krok 7).
// Odhlášení všech účelů je tady, ne v odkazu pro odhlášení jedním kliknutím.
// ============================================================================

export const metadata = { title: 'Správa odběru', robots: { index: false, follow: false } };

export default function SpravaPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16">
          <div className="max-w-xl mx-auto px-4">
            <SpravaKlient />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
