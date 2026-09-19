import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalEditace, PortalObalka, PortalSkolaNenalezena } from '@/components/portal/PortalEditace';
import { PortalHlaska } from '@/components/portal/PortalHlaska';
import { PortalMagicForm } from '@/components/portal/PortalMagicForm';
import { PortalZalozeni } from '@/components/portal/PortalZalozeni';
import { getNazevSkoly, validateKod } from '@/lib/portal-skol';
import { jeDbNastavena } from '@/lib/novinky-db';
import { prihlasenyZCookies, stavKodu } from '@/lib/portal-relace';

export const metadata: Metadata = {
  title: 'Profil školy',
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ kod: string }>;
}

// Adresa s kódem zůstává kvůli starším odkazům. Nový vstup je formulář na /pro-skoly,
// který kód posílá v těle požadavku (docs/ucty-portalu-skol-2027.md, 2.2).
export default async function PortalKodPage({ params }: Props) {
  const kod = decodeURIComponent((await params).kod);

  // Bez databáze účtů funguje portál postaru: kód rovnou otevírá formulář.
  if (!jeDbNastavena()) {
    const redizo = await validateKod(kod);
    if (redizo) return <PortalEditace redizo={redizo} auth={{ kod }} />;
    return <NeplatnyKod />;
  }

  const { stav, redizo } = await stavKodu(kod);
  if (stav === 'neplatny' || !redizo) return <NeplatnyKod />;

  const prihlaseny = await prihlasenyZCookies();
  if (prihlaseny?.role.some((r) => r.redizo === redizo)) redirect(`/pro-skoly/profil?skola=${redizo}`);

  const nazev = await getNazevSkoly(redizo);
  if (!nazev) return <PortalSkolaNenalezena redizo={redizo} />;

  if (stav === 'volny') {
    return (
      <PortalObalka>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">{nazev}</h1>
        <PortalZalozeni nazevSkoly={nazev} auth={{ kod }} />
      </PortalObalka>
    );
  }

  return (
    <PortalHlaska nadpis="Profil školy už má správce">
      <p>
        Kód pro {nazev} už byl použit. Pokud jste správce vy, pošleme vám odkaz pro přihlášení. Kolegy
        do profilu zve správce z nastavení účtu.
      </p>
      <PortalMagicForm />
    </PortalHlaska>
  );
}

const NeplatnyKod = () => (
  <PortalHlaska nadpis="Neplatný kód">
    <p>
      Tento přihlašovací kód neznáme, nebo byl zrušený. Zkontrolujte překlepy, kód má tvar
      XXXX-XXXX-XXXX. Pokud problém trvá, napište nám na{' '}
      <a href="mailto:patrick@zandl.cz" className="text-blue-600 hover:underline">
        patrick@zandl.cz
      </a>
      .
    </p>
  </PortalHlaska>
);
