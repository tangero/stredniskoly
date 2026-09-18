import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PotvrzeniKlient } from './PotvrzeniKlient';

// ============================================================================
// Potvrzovací stránka: druhý krok potvrzení odběru
// (docs/novinky-k-prijimackam-2027.md, kroky 3 a 4).
//
// Na tuhle adresu se přesměrovává z obslužné cesty, která token vymění za
// krátkou relaci v cookie. Token proto v adrese není a stránka se neměří.
// ============================================================================

export const metadata = {
  title: 'Potvrzení odběru',
  robots: { index: false, follow: false },
};

export default function PotvrzeniPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16">
          <div className="max-w-xl mx-auto px-4">
            <PotvrzeniKlient />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
