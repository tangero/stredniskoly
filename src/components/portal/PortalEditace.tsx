import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PortalEditForm } from '@/components/portal/PortalEditForm';
import { getPredvyplnenyProfil, PORTAL_POLE } from '@/lib/portal-skol';

/**
 * Autorizace pro odeslání formuláře: přihlašovací kód, rejstříkový odkaz, nebo
 * relace účtu (`ucet` nese REDIZO, oprávnění ověří server podle cookie).
 */
export type PortalAuth = { kod: string } | { magic: string } | { ucet: string };

export function PortalObalka({ children }: { children: React.ReactNode }) {
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
    <PortalObalka>
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
    </PortalObalka>
  );
}

/** Sdílená editační stránka profilu – používá ji kódová i magic-link varianta. */
export async function PortalEditace({
  redizo,
  auth,
  host = false,
}: {
  redizo: string;
  auth: PortalAuth;
  /** Odkaz z rejstříku u školy, která už má správce: návrh jde a správce se o něm dozví. */
  host?: boolean;
}) {
  const profil = await getPredvyplnenyProfil(redizo);

  if (!profil) {
    return <PortalSkolaNenalezena redizo={redizo} />;
  }

  return (
    <PortalObalka>
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

      {host && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Profil této školy už má správce. Návrh můžete poslat i tak; správci dáme vědět, že přišel.
          Pokud chcete profil upravovat opakovaně, požádejte správce o pozvánku.
        </div>
      )}

      <PortalEditForm auth={auth} profil={profil} pole={PORTAL_POLE} />
    </PortalObalka>
  );
}
