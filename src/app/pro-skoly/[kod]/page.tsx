import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PortalEditace } from '@/components/portal/PortalEditace';
import { validateKod } from '@/lib/portal-skol';

export const metadata: Metadata = {
  title: 'Editace profilu školy',
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ kod: string }>;
}

export default async function PortalEditaceKodPage({ params }: Props) {
  const { kod } = await params;
  const redizo = await validateKod(decodeURIComponent(kod));

  if (!redizo) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <div className="max-w-xl mx-auto px-4 py-16 text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-3">Neplatný kód</h1>
            <p className="text-slate-600 mb-6">
              Tento přihlašovací kód neznáme, nebo byl zrušený. Zkontrolujte překlepy – kód má tvar
              XXXX-XXXX-XXXX. Pokud problém trvá, napište nám na{' '}
              <a href="mailto:patrick@zandl.cz" className="text-blue-600 hover:underline">
                patrick@zandl.cz
              </a>
              .
            </p>
            <Link href="/pro-skoly" className="text-blue-600 font-medium hover:underline">
              ← Zpět na zadání kódu
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return <PortalEditace redizo={redizo} auth={{ kod: decodeURIComponent(kod) }} />;
}
