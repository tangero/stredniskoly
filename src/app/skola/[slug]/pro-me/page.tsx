import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSchoolPageType } from '@/lib/data';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = { title: 'Je tento obor pro mě?', description: 'Co zvážit při výběru oboru a kde porovnat historické výsledky.' };
export default async function GuidedJourneyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { school, program } = await getSchoolPageType(slug);
  if (!school || !program) notFound();
  const query = new URLSearchParams({ skoly: JSON.stringify([program.id]) });
  return <div className="min-h-screen flex flex-col"><Header /><main className="mx-auto max-w-3xl px-4 py-10 flex-1">
    <h1 className="text-3xl font-bold">Je {program.obor} pro mě?</h1>
    <p className="mt-3 text-lg">{school.nazev}</p>
    <p className="mt-6">Samotné body z cvičného testu nestačí k odhadu přijetí. Ověřte aktuální kritéria školy a porovnejte také obsah výuky a každodenní dojíždění.</p>
    <ul className="my-6 list-disc space-y-3 pl-6"><li>Zajímají vás předměty a zaměření tohoto oboru?</li><li>Vyhovuje vám dojezd, prostředí školy a případné školné?</li><li>Máte od školy potvrzené podmínky a nabídku pro rok 2027?</li></ul>
    <div className="flex flex-wrap gap-4"><Link className="rounded-lg bg-blue-600 px-5 py-3 text-white" href={`/simulator?${query}`}>Porovnat obor v simulátoru</Link><Link className="px-5 py-3 text-blue-700" href={`/skola/${slug}`}>Zpět na profil oboru</Link></div>
  </main><Footer /></div>;
}
