import { Metadata } from 'next';
import { PortalHlaska } from '@/components/portal/PortalHlaska';
import { PortalPozvankaForm } from '@/components/portal/PortalPozvankaForm';
import { overToken } from '@/lib/portal-magic';
import { getNazevSkoly } from '@/lib/portal-skol';
import { jeDbNastavena } from '@/lib/novinky-db';
import { cteni } from '@/lib/portal-relace';
import { nactiPozvanku } from '@/lib/portal-ucty';

export const metadata: Metadata = {
  title: 'Pozvánka do profilu školy',
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function PortalPozvankaPage({ params }: Props) {
  const token = decodeURIComponent((await params).token);
  const payload = overToken(token, 'pozvanka');
  const pozvanka =
    payload && typeof payload.pozvanka_id === 'string' && jeDbNastavena()
      ? await nactiPozvanku(cteni, payload.pozvanka_id)
      : null;

  if (!pozvanka) {
    return (
      <PortalHlaska nadpis="Pozvánka už neplatí">
        <p>
          Pozvánka vypršela (platí 7 dní), byla zrušena, nebo už byla přijata. O novou požádejte
          správce profilu školy.
        </p>
      </PortalHlaska>
    );
  }

  const nazev = (await getNazevSkoly(pozvanka.redizo)) || pozvanka.redizo;
  return (
    <PortalHlaska nadpis={`Pozvánka do profilu: ${nazev}`}>
      <p>Po přijetí budete moct upravovat údaje o škole. Každý návrh před zveřejněním projde redakce.</p>
      <PortalPozvankaForm token={token} email={pozvanka.email} />
    </PortalHlaska>
  );
}
