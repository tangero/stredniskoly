import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PortalEditForm } from '@/components/portal/PortalEditForm';
import { getPredvyplnenyProfil, PORTAL_POLE } from '@/lib/portal-skol';

/** Autorizace pro odeslání formuláře: přihlašovací kód nebo magic token. */
export type PortalAuth = { kod: string } | { magic: string };

function Obalka({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-10">{children}</div>
      </main>
      <Footer />
    </div>
  );
}

/** Stav „kód je platný, ale škola není v katalogu 2026“. */
export function PortalSkolaNenalezena({ redizo }: { redizo: string }) {
  return (
    <Obalka>
      <div className="max-w-xl mx-auto py-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Školu jsme nenašli</h1>
        <p className="text-slate-600 mb-6">
          Přístup je platný, ale školu s REDIZO {redizo} nemáme v katalogu 2026. Napište nám na{' '}
          <a href="mailto:patrick@zandl.cz" className="text-blue-600 hover:underline">
            patrick@zandl.cz
          </a>
          .
        </p>
        <Link href="/pro-skoly" className="text-blue-600 font-medium hover:underline">
          ← Zpět na Portál pro školy
        </Link>
      </div>
    </Obalka>
  );
}

/** Sdílená editační stránka profilu – používá ji kódová i magic-link varianta. */
export async function PortalEditace({ redizo, auth }: { redizo: string; auth: PortalAuth }) {
  const profil = await getPredvyplnenyProfil(redizo);

  if (!profil) {
    return <PortalSkolaNenalezena redizo={redizo} />;
  }

  return (
    <Obalka>
      <nav className="text-sm text-slate-600 mb-6">
        <Link href="/pro-skoly" className="hover:text-blue-600">
          Portál pro školy
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900">Kontrola údajů</span>
      </nav>

      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">{profil.nazev}</h1>
      <p className="text-slate-500 mb-2">
        REDIZO {profil.redizo}
        {profil.obec && <> · {profil.obec}</>}
        {profil.kraj && <> · {profil.kraj} kraj</>}
      </p>
      <p className="text-sm text-slate-500 mb-8">
        Zkontrolujte a doplňte údaje o škole. Po odeslání je zkontroluje redakce a schválené
        údaje se zobrazí na stránce školy se značkou „potvrzeno školou“.
      </p>

      <PortalEditForm auth={auth} profil={profil} pole={PORTAL_POLE} />
    </Obalka>
  );
}
