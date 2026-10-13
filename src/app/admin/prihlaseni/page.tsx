import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PrihlaseniPasskey } from '@/components/admin/PasskeyTlacitka';
import { adminZCookies } from '@/lib/admin-relace';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Přihlášení do administrace',
  robots: { index: false, follow: false },
};

// Chybové kódy z návratu z GitHubu; text se nikdy nebere z adresy (#479).
const CHYBY: Record<string, string> = {
  nenastaveno: 'Přihlášení ještě není nastavené (chybí proměnné prostředí nebo databáze). Postup je v docs/administrace.md.',
  stav: 'Přihlášení vypršelo nebo nepřišlo z tohoto webu. Zkus to znovu.',
  ucet: 'Tento účet na GitHubu do administrace nemá přístup.',
  dvoufazove: 'Účet na GitHubu nemá zapnuté dvoufázové ověření. Zapni ho na GitHubu a přihlas se znovu.',
  github: 'GitHub přihlášení nedokončil. Zkus to znovu.',
};

interface Props {
  searchParams: Promise<{ chyba?: string; odhlaseno?: string }>;
}

export default async function PrihlaseniPage({ searchParams }: Props) {
  if (await adminZCookies()) redirect('/admin');
  const { chyba, odhlaseno } = await searchParams;
  const text = chyba ? CHYBY[chyba] ?? CHYBY.github : null;
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-md mx-auto px-4 py-16 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Administrace</h1>
            <p className="text-sm text-slate-600 mt-1">Přístup má jen vlastník webu.</p>
          </div>
          {odhlaseno && <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">Odhlášeno.</p>}
          {text && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{text}</p>}
          <PrihlaseniPasskey />
          <div className="text-center text-sm text-slate-500">nebo</div>
          <a href="/admin/prihlaseni/github" className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-center font-medium text-slate-900 hover:bg-slate-50">
            Přihlásit přes GitHub
          </a>
          <p className="text-xs text-slate-500">Přes GitHub se přihlásíš i bez passkey, například po ztrátě telefonu. Účet musí mít zapnuté dvoufázové ověření.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
