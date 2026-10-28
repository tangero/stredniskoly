import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { zobrazitelneAkce, overSezonuProtiRegistru, overenoK } from '@/lib/veletrhy';
import { cesskyDen, formatujDen, metaVeletrhuKraje, rocnikAkci } from '@/lib/veletrhy-pocty';
import { nactiAkce } from '@/lib/veletrhy-zdroj';
import { nadpisKraje, vsechnyKraje } from '@/lib/kraje.mjs';
import { createKrajSlug } from '@/lib/utils';
import { VeletrhySeznam, type VeletrhKarta } from '../VeletrhySeznam';

// Krajské podstránky přehledu veletrhů (#545): stejný zdroj a stejný seznam jako oddíl kraje na /veletrhy,
// jen s vlastním titulkem a popiskem pro místní dotazy.

export const revalidate = 3600;
export const dynamicParams = false;

interface Props {
  params: Promise<{ kraj: string }>;
}

const KRAJE = vsechnyKraje().map((k) => ({ ...k, slug: createKrajSlug(k.kod, k.nazev) }));

export function generateStaticParams() {
  return KRAJE.map((k) => ({ kraj: k.slug }));
}

async function nactiProKraj(slug: string) {
  const kraj = KRAJE.find((k) => k.slug === slug);
  if (!kraj) return null;
  // Stejná podmínka jako na /veletrhy: bez shody s registrem se akce neukazují.
  const sezonaSedi = (await overSezonuProtiRegistru()) !== null;
  const vsechny = await nactiAkce();
  const potvrzene = vsechny.filter((a) => a.terminPotvrzen && a.start !== null);
  const dnes = cesskyDen();
  const nadchazejici = sezonaSedi ? zobrazitelneAkce(new Date(), vsechny).filter((a) => a.krajKod === kraj.kod) : [];
  const probehle = sezonaSedi
    ? potvrzene.filter((a) => a.krajKod === kraj.kod && (a.end ?? a.start)! < dnes)
    : [];
  const rocnik = rocnikAkci(potvrzene.map((a) => ({ start: a.start!, end: (a.end ?? a.start)! })));
  return { kraj, sezonaSedi, nadchazejici, probehle, rocnik };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kraj: slug } = await params;
  const data = await nactiProKraj(slug);
  if (!data) return { title: 'Kraj nenalezen' };
  const { title, description } = metaVeletrhuKraje(data.kraj.kod, data.nadchazejici, data.rocnik);
  return {
    alternates: { canonical: `/veletrhy/${data.kraj.slug}` },
    title: { absolute: title },
    description,
    openGraph: { title, description },
  };
}

export default async function VeletrhyKrajPage({ params }: Props) {
  const { kraj: slug } = await params;
  const data = await nactiProKraj(slug);
  if (!data) notFound();
  const { kraj, sezonaSedi, nadchazejici, probehle } = data;
  const nadpis = nadpisKraje(kraj.kod);

  const karty: VeletrhKarta[] = nadchazejici.map((a) => ({
    id: a.id,
    nazev: a.nazev,
    poradatel: a.poradatel,
    mesto: a.mesto,
    online: a.online,
    krajKod: a.krajKod,
    misto: a.misto,
    start: a.start!,
    end: (a.end ?? a.start)!,
    datum: a.datum!,
    cas: a.cas,
    url: a.url!,
    terminPribligny: a.terminPribligny,
    zdrojJenAgregator: a.zdrojJenAgregator,
    poznamkaTerminu: a.poznamkaTerminu,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <nav className="text-sm text-gray-500 mb-3">
            <Link href="/" className="hover:underline">
              Úvod
            </Link>
            <span className="mx-2">›</span>
            <Link href="/veletrhy" className="hover:underline">
              Veletrhy a přehlídky
            </Link>
            <span className="mx-2">›</span>
            <span>{nadpis}</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Veletrhy středních škol: {nadpis}</h1>
          <p className="mt-3 max-w-2xl text-gray-700">
            Veletrh středních škol, tedy akce, kde se na jednom místě představí školy z kraje najednou.
          </p>
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link href="/veletrhy" className="text-blue-700 underline underline-offset-4 hover:text-blue-800">
              Veletrhy ve všech krajích
            </Link>
            <Link href={`/regiony/${kraj.slug}`} className="text-blue-700 underline underline-offset-4 hover:text-blue-800">
              Střední školy v kraji
            </Link>
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {sezonaSedi ? (
          <VeletrhySeznam akce={karty} den={cesskyDen()} bezVyberuKraje />
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <p className="font-medium text-gray-900">Přehled akcí právě připravujeme.</p>
            <p className="mt-2 text-gray-700">
              Termíny na novou sezónu sbíráme a ověřujeme u pořadatelů. Než budou hotové, neukazujeme tu nic.
            </p>
          </div>
        )}

        {probehle.length > 0 && (
          <section aria-label="Proběhlé akce">
            <h2 className="text-xl font-semibold text-gray-900">Proběhlé akce</h2>
            <ul className="mt-3 space-y-2 text-gray-700">
              {probehle.map((a) => (
                <li key={a.id}>
                  {a.nazev}
                  {a.mesto && !a.online ? `, ${a.mesto}` : ''} — {a.datum}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="border-t border-gray-200 pt-8">
          <h2 className="text-xl font-semibold text-gray-900">Přehled není úplný</h2>
          <p className="mt-2 max-w-2xl text-gray-700">
            Vznikl vlastní rešerší a zdaleka nepokrývá všechno. Když akci ve svém okolí nevidíte, neznamená to,
            že se nekoná — znamená to, že jsme ji nedohledali.
          </p>
          <p className="mt-4">
            <Link
              href="/veletrhy/nahlasit"
              className="inline-block rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Víte o akci, která tu chybí? Nahlaste nám ji
            </Link>
          </p>
          <p className="mt-3 text-sm text-gray-600">
            Termín a podmínky si před cestou ověřte na stránce pořadatele.{' '}
            {nadchazejici.length > 0 && `Údaje jsme naposledy ověřovali ${formatujDen(overenoK(nadchazejici))}.`}
          </p>
        </section>
      </div>

      <Footer />
    </div>
  );
}
