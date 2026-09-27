import type { Metadata } from 'next';
import Link from 'next/link';
import { PortalObalka } from '@/components/portal/PortalEditace';
import { PortalMagicForm } from '@/components/portal/PortalMagicForm';
import { PortalKriteriaForm } from '@/components/portal/PortalKriteriaForm';
import { cteni, prihlasenyZCookies } from '@/lib/portal-relace';
import { getNazevSAdresou } from '@/lib/portal-skol';
import { kriteriaSkoly, oboryProKriteria, overenePodkladyKriterii } from '@/lib/portal-kriteria';
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
  const [obory2026, obory2027, nazev] = await Promise.all([
    oboryProKriteria(role.redizo, 2026),
    oboryProKriteria(role.redizo, 2027),
    getNazevSAdresou(role.redizo),
  ]);
  let ulozena = [] as Awaited<ReturnType<typeof kriteriaSkoly>>;
  let podklady: DolozenePravidlo[] = [];
  let dostupne = true;
  try {
    const [pravidla2026, pravidla2027, zjistena] = await Promise.all([
      kriteriaSkoly(cteni, role.redizo, 2026),
      kriteriaSkoly(cteni, role.redizo, 2027),
      overenePodkladyKriterii(cteni, role.redizo, [2026, 2027]),
    ]);
    ulozena = [...pravidla2026, ...pravidla2027];
    ulozena = ulozena.map((z) => ({ ...z, platne_od: new Date(z.platne_od).toISOString() }));
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
    <p className="mb-6 text-sm text-slate-600">Údaje zadáváte za školu s REDIZO {role.redizo}. Historická pravidla 2026 se automaticky nepřenášejí do roku 2027.</p>
    <PortalKriteriaForm redizo={role.redizo} nabidky={{ 2026: obory2026, 2027: obory2027 }} ulozena={ulozena} podklady={podklady} dostupne={dostupne} />
  </PortalObalka>;
}
