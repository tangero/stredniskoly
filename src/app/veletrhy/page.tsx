import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import {
  zobrazitelneAkce,
  krajeSAkcemi,
  cesskyDen,
  overSezonuProtiRegistru,
  OVERENO_K,
} from '@/lib/veletrhy';
import { VeletrhySeznam, type VeletrhKarta } from './VeletrhySeznam';

export const metadata: Metadata = {
  alternates: { canonical: '/veletrhy' },
  title: 'Veletrhy a přehlídky středních škol — přehled akcí',
  description:
    'Kde se dá potkat víc středních škol najednou: veletrhy a přehlídky po krajích, s městy, termíny a odkazy na pořadatele.',
  openGraph: {
    title: 'Veletrhy a přehlídky středních škol',
    description: 'Přehled akcí, kde se na jednom místě představí střední školy z kraje.',
  },
};

// Seznam se mění tím, jak akce probíhají, ne tím, že se změní data.
// Bez revalidace by stránka zůstala v podobě, v jaké se postavila při
// buildu, a proběhlá akce by na ní visela až do příštího nasazení.
// Hodinu po půlnoci ji navíc odfiltruje klient, viz VeletrhySeznam.
export const revalidate = 3600;

function formatujDatum(iso: string): string {
  const [r, m, d] = iso.split('-');
  return `${Number(d)}. ${Number(m)}. ${r}`;
}

export default async function VeletrhyPage() {
  // Období bere stránka z registru datových sad, ne z názvu souboru.
  // Když se rozejdou, seznam se nezobrazí: loňské akce vydávané za letošní
  // jsou horší než prázdná stránka.
  const sezonaSedi = (await overSezonuProtiRegistru()) !== null;
  const akce = sezonaSedi ? zobrazitelneAkce() : [];
  const kraje = sezonaSedi ? krajeSAkcemi() : [];

  const karty: VeletrhKarta[] = akce.map((a) => ({
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

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <nav className="text-sm text-blue-100 mb-3">
            <Link href="/" className="hover:underline">
              Úvod
            </Link>
            <span className="mx-2">›</span>
            <span>Veletrhy a přehlídky</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold">Veletrhy a přehlídky středních škol</h1>
          <p className="mt-3 text-blue-50 max-w-2xl">
            Veletrh středních škol je akce, kde se na jednom místě představí školy z kraje najednou. Za jedno
            odpoledne tam jde obejít školy, které byste jinak objížděli po jedné celý podzim.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        <section>
          {sezonaSedi ? (
            <VeletrhySeznam akce={karty} kraje={kraje} den={cesskyDen()} />
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <p className="font-medium text-gray-900">Přehled akcí právě připravujeme.</p>
              <p className="mt-2 text-gray-700">
                Termíny na novou sezónu sbíráme a ověřujeme u pořadatelů. Než budou hotové,
                neukazujeme tu nic — loňské akce vydávané za letošní by vás poslaly na akci, která
                se nekoná.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-gray-900">Co si na veletrhu zjistit</h2>
          <p className="mt-2 text-gray-700">
            Na veletrhu stojí vedle sebe desítky škol a čas u každého stánku je krátký. Vyplatí se mít pár
            otázek připravených dopředu a odpovědi si zapisovat — po třetí škole se začnou plést.
          </p>
          <ul className="mt-4 space-y-2 text-gray-700 list-disc list-inside">
            <li>Kolik uchazečů se loni hlásilo a kolik se jich dostalo?</li>
            <li>Co se dá studovat dál po tomhle oboru a kam jdou absolventi nejčastěji?</li>
            <li>Jak vypadá běžný den — kolik hodin týdně, kolik praxe, kolik domácí přípravy?</li>
            <li>Co škola dělá, když žák látku nestíhá?</li>
            <li>Kdy je den otevřených dveří, kde je vidět budova a učitelé v běžném provozu?</li>
          </ul>
          <p className="mt-4 text-sm text-gray-600">
            V katalogu škol najdete také otázky vycházející ze zpracovaných inspekčních zpráv.{' '}
            <Link href="/skoly" className="text-blue-600 hover:underline">
              Vyhledat školu
            </Link>
          </p>
        </section>

        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Přehled není úplný</h2>
          <p className="mt-2 text-gray-700">
            Vznikl vlastní rešerší a zdaleka nepokrývá všechno. Když akci ve svém okolí nevidíte, neznamená to,
            že se nekoná — znamená to, že jsme ji nedohledali.
          </p>
          <p className="mt-3">
            <Link
              href="/veletrhy/nahlasit"
              className="inline-block rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Víte o akci, která tu chybí? Nahlaste nám ji
            </Link>
          </p>
          <p className="mt-3 text-sm text-gray-600">
            Údaje jsme naposledy ověřovali {formatujDatum(OVERENO_K)}. Termín a podmínky si před cestou
            ověřte na stránce pořadatele.
          </p>
        </section>
      </div>

      <Footer />
    </div>
  );
}
