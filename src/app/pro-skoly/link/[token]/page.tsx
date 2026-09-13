import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PortalEditace } from '@/components/portal/PortalEditace';
import { overMagicToken } from '@/lib/portal-magic';

export const metadata: Metadata = {
  title: 'Editace profilu školy',
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function PortalMagicLinkPage({ params }: Props) {
  const { token } = await params;
  const redizo = overMagicToken(decodeURIComponent(token));

  if (!redizo) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <div className="max-w-xl mx-auto px-4 py-16 text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-3">Odkaz nefunguje</h1>
            <p className="text-slate-600 mb-6">
              Tento odkaz je neplatný, nebo mu vypršela platnost (72 hodin od odeslání). Požádejte
              si o nový – stačí zadat školní e-mail.
            </p>
            <Link href="/pro-skoly" className="text-blue-600 font-medium hover:underline">
              ← Požádat o nový odkaz
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return <PortalEditace redizo={redizo} auth={{ magic: decodeURIComponent(token) }} />;
}
