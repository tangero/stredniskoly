import type { Metadata } from 'next';
import Link from 'next/link';
import { PortalObalka } from '@/components/portal/PortalEditace';
import { PortalMagicForm } from '@/components/portal/PortalMagicForm';
import { PortalKriteriaForm } from '@/components/portal/PortalKriteriaForm';
import { cteni, prihlasenyZCookies } from '@/lib/portal-relace';
import { getNazevSAdresou } from '@/lib/portal-skol';
import { kriteriaSkoly, oboryProKriteria, overenePodkladyKriterii, predvyplneniZPrepisu, rokyKriterii } from '@/lib/portal-kriteria';
import type { DolozenePravidlo } from '@/lib/kriteria-stav';

export const metadata: Metadata = { title: 'Bodování po oborech – Portál pro školy', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PortalKriteriaPage({ searchParams }: { searchParams: Promise<{ skola?: string }> }) {
  const prihlaseny = await prihlasenyZCookies();
  if (!prihlaseny) return <PortalObalka><h1 className="text-2xl font-bold">Přihlaste se</h1><PortalMagicForm /></PortalObalka>;
  const { skola } = await searchParams;
  const role = skola === undefined ? prihlaseny.role[0] : prihlaseny.role.find((r) => r.redizo === skola);
  if (!role) return <PortalObalka>
    <h1 className="text-2xl font-bold">Školu nemáte ve své správě</h1>
    <p className="mt-2 text-sm text-slate-600">Zkontrolujte odkaz nebo vyberte školu ve svém profilu.</p>
    <Link href="/pro-skoly/profil" className="mt-4 inline-block text-blue-700 underline">Přejít na profil školy</Link>
  </PortalObalka>;
  const { roky, rokPrepisu } = await rokyKriterii();
  const [oboryPoRocich, nazev] = await Promise.all([
    Promise.all(roky.map((r) => oboryProKriteria(role.redizo, r))),
    getNazevSAdresou(role.redizo),
  ]);
  const nabidky: Record<number, Awaited<ReturnType<typeof oboryProKriteria>>> =
    Object.fromEntries(roky.map((r, i) => [r, oboryPoRocich[i]]));
  const predvyplneni = rokPrepisu ? await predvyplneniZPrepisu(oboryPoRocich.flat(), rokPrepisu) : {};
  let ulozena = [] as Awaited<ReturnType<typeof kriteriaSkoly>>;
  let podklady: DolozenePravidlo[] = [];
  let dostupne = true;
  try {
    const [pravidla, zjistena] = await Promise.all([
      Promise.all(roky.map((r) => kriteriaSkoly(cteni, role.redizo, r))),
      overenePodkladyKriterii(cteni, role.redizo, roky),
    ]);
    ulozena = pravidla.flat().map((z) => ({ ...z, platne_od: new Date(z.platne_od).toISOString() }));
    podklady = zjistena.map((p) => ({
      ...p,
      zjistenoAt: new Date(p.zjistenoAt).toISOString(),
      publikovanoAt: p.publikovanoAt ? new Date(p.publikovanoAt).toISOString() : null,
      overenoAt: p.overenoAt ? new Date(p.overenoAt).toISOString() : null,
      novaVerzeAt: p.novaVerzeAt ? new Date(p.novaVerzeAt).toISOString() : null,
    }));
  } catch (error) {
    dostupne = false;
    console.error('Portál: kritéria se nepodařilo načíst', error);
  }
  return <PortalObalka>
    <nav className="mb-5 text-sm text-slate-600"><Link href={`/pro-skoly/profil?skola=${role.redizo}`} className="text-blue-700 hover:underline">Profil školy</Link> / Bodování po oborech</nav>
    <h1 className="mb-2 text-2xl font-bold text-slate-900">Bodování pro {nazev || role.redizo}</h1>
    <p className="mb-6 text-sm text-slate-600">Údaje zadáváte za školu s REDIZO {role.redizo}.{roky.length > 1 ? ` Pravidla ${roky[1]} se do roku ${roky[0]} automaticky nepřenášejí; můžete je ale zkopírovat.` : ''}</p>
    {roky.length === 0
      ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Ročník pro zadávání kritérií teď není určený. Zkuste to prosím později.</p>
      : <PortalKriteriaForm redizo={role.redizo} roky={roky} nabidky={nabidky} ulozena={ulozena} podklady={podklady}
          predvyplneni={predvyplneni} dostupne={dostupne} />}
  </PortalObalka>;
}
