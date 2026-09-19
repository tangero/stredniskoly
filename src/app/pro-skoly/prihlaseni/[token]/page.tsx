import { Metadata } from 'next';
import { PortalHlaska } from '@/components/portal/PortalHlaska';
import { overToken } from '@/lib/portal-magic';

export const metadata: Metadata = {
  title: 'Přihlášení do profilu školy',
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ token: string }>;
}

// Odkaz z e-mailu jen zobrazí tlačítko. Přihlášení a spotřebování odkazu
// proběhne až odesláním formuláře, protože skenery školní pošty odkazy otevírají.
export default async function PortalPrihlaseniPage({ params }: Props) {
  const token = decodeURIComponent((await params).token);
  if (!overToken(token, 'prihlaseni')) {
    return (
      <PortalHlaska nadpis="Odkaz nefunguje">
        <p>Odkaz je neplatný, nebo mu vypršela platnost (72 hodin). Požádejte si o nový.</p>
      </PortalHlaska>
    );
  }
  return (
    <PortalHlaska nadpis="Přihlášení do profilu školy">
      <p>Odkaz platí pro jedno přihlášení. Přihlášení vydrží 30 dní na tomto zařízení.</p>
      <form method="post" action="/api/portal/prihlasit">
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          className="rounded-lg bg-[#0074e4] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#005fbd]"
        >
          Přihlásit se
        </button>
      </form>
    </PortalHlaska>
  );
}
