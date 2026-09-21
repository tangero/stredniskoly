import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalEditace, PortalObalka, PortalSkolaNenalezena } from '@/components/portal/PortalEditace';
import { PortalHlaska } from '@/components/portal/PortalHlaska';
import { PortalZalozeni } from '@/components/portal/PortalZalozeni';
import { PortalHlavickaSkoly } from '@/components/portal/PortalHlavickaSkoly';
import { overMagicToken } from '@/lib/portal-magic';
import { getIdentifikaceSkoly } from '@/lib/portal-identifikace';
import { getNazevSkoly } from '@/lib/portal-skol';
import { jeDbNastavena } from '@/lib/novinky-db';
import { cteni, prihlasenyZCookies } from '@/lib/portal-relace';
import { spravceSkoly } from '@/lib/portal-ucty';

export const metadata: Metadata = {
  title: 'Profil školy',
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ token: string }>;
}

// Odkaz na e-mail školy z rejstříku (docs/ucty-portalu-skol-2027.md, 2.2):
// škola bez správce → založení správce; škola se správcem → návrh jako host (odkaz platí do vypršení, správce dostane upozornění)
// jako host, o kterém se správce dozví.
export default async function PortalMagicLinkPage({ params }: Props) {
  const token = decodeURIComponent((await params).token);
  const redizo = overMagicToken(token);

  if (!redizo) {
    return (
      <PortalHlaska nadpis="Odkaz nefunguje">
        <p>
          Tento odkaz je neplatný, nebo mu vypršela platnost (72 hodin od odeslání). Požádejte si o
          nový, stačí zadat školní e-mail.
        </p>
      </PortalHlaska>
    );
  }

  if (!jeDbNastavena()) return <PortalEditace redizo={redizo} auth={{ magic: token }} />;

  const prihlaseny = await prihlasenyZCookies();
  if (prihlaseny?.role.some((r) => r.redizo === redizo)) redirect(`/pro-skoly/profil?skola=${redizo}`);

  const nazev = await getNazevSkoly(redizo);
  if (!nazev) return <PortalSkolaNenalezena redizo={redizo} />;

  if (!(await spravceSkoly(cteni, redizo))) {
    return (
      <PortalObalka>
        <PortalHlavickaSkoly skola={await getIdentifikaceSkoly(redizo, nazev)} vstup="odkaz" />
        {/* Hlavička nad formulářem školu jmenuje plným názvem z rejstříku;
            věta ve formuláři by pod ní zopakovala zkratku z katalogu. */}
        <PortalZalozeni nazevSkoly="" auth={{ magic: token }} />
      </PortalObalka>
    );
  }

  return <PortalEditace redizo={redizo} auth={{ magic: token }} host />;
}
