import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { NahlasitForm } from './NahlasitForm';

export const metadata: Metadata = {
  alternates: { canonical: '/veletrhy/nahlasit' },
  title: 'Nahlásit veletrh nebo přehlídku středních škol',
  description:
    'Víte o veletrhu nebo přehlídce středních škol, která v našem přehledu chybí? Nahlaste nám ji, ověříme ji a doplníme.',
  robots: { index: true, follow: true },
};

export default function NahlasitPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <nav className="text-sm text-blue-100 mb-3">
            <Link href="/" className="hover:underline">
              Úvod
            </Link>
            <span className="mx-2">›</span>
            <Link href="/veletrhy" className="hover:underline">
              Veletrhy a přehlídky
            </Link>
            <span className="mx-2">›</span>
            <span>Nahlásit akci</span>
          </nav>
          <h1 className="text-3xl font-bold">Nahlásit akci</h1>
          <p className="mt-3 text-blue-50">
            Náš přehled vznikl vlastní rešerší a úplný není. Víte o veletrhu, přehlídce nebo burze středních
            škol, která tam chybí? Napište nám o ní.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-5 text-gray-700">
          <p>
            <strong className="text-gray-900">Nahlásit může kdokoli</strong> — pořadatel, výchovná poradkyně
            i rodič, který akci viděl na plakátě.
          </p>
          <p className="mt-2">
            Každou akci před zveřejněním ověříme na stránce pořadatele. Proto se na webu neobjeví hned a proto
            po vás chceme odkaz.
          </p>
        </div>

        <NahlasitForm />
      </div>

      <Footer />
    </div>
  );
}
