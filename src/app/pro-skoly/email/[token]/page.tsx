import { Metadata } from 'next';
import { PortalHlaska } from '@/components/portal/PortalHlaska';
import { overToken } from '@/lib/portal-magic';

export const metadata: Metadata = {
  title: 'Potvrzení e-mailu',
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function PortalEmailPage({ params }: Props) {
  const token = decodeURIComponent((await params).token);
  const payload = overToken(token, 'email');
  if (!payload || typeof payload.email !== 'string') {
    return (
      <PortalHlaska nadpis="Odkaz nefunguje">
        <p>Odkaz je neplatný, nebo mu vypršela platnost (72 hodin). Změnu adresy zadejte znovu v nastavení účtu.</p>
      </PortalHlaska>
    );
  }
  return (
    <PortalHlaska nadpis="Potvrzení nové adresy">
      <p>
        Po potvrzení budete odkazy pro přihlášení dostávat na <strong>{payload.email}</strong>.
      </p>
      <form method="post" action="/api/portal/email">
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          className="rounded-lg bg-[#0074e4] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#005fbd]"
        >
          Potvrdit adresu
        </button>
      </form>
    </PortalHlaska>
  );
}
