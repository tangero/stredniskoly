import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import {
  zobrazitelneAkce,
  overSezonuProtiRegistru,
  overenoK,
} from '@/lib/veletrhy';
import { cesskyDen, formatujDen } from '@/lib/veletrhy-pocty';
import { nactiAkce } from '@/lib/veletrhy-zdroj';
import { VeletrhySeznam, type VeletrhKarta } from '../../veletrhy/VeletrhySeznam';

// ============================================================================
// Varianta B přehledu veletrhů, souběžně s /veletrhy (varianta A).
//
// Nezalistovaná, ne chráněná: kdo zná adresu, otevře ji. Nikde na ni nevede
// odkaz, není v sitemapě a nese `robots: noindex`. Do robots.txt ji zapsat
// nesmíme — zakázané procházení by vyhledávači zabránilo noindex přečíst.
//
// `/veletrhy?varianta=b` se sem přepíše (next.config.ts). Bez parametru
// veřejná stránka zůstává varianta A a dál se sestavuje po hodinách.
// Přepis nikoho do skupiny nepřiřazuje.
// ============================================================================

export const metadata: Metadata = {
  title: 'Veletrhy a přehlídky středních škol',
  robots: { index: false, follow: false },
};

export const revalidate = 3600;

function OtazkyKeStanku() {
  return (
    <aside>
      <h2 className="text-lg font-semibold text-gray-900">Co si na veletrhu zjistit</h2>
      <p className="mt-2 text-gray-700">
        Na veletrhu stojí vedle sebe desítky škol a čas u každého stánku je krátký. Vyplatí se mít pár
        otázek připravených dopředu a odpovědi si zapisovat — po třetí škole se začnou plést.
      </p>
      <ul className="mt-4 space-y-2 text-gray-700 list-disc list-inside">
        <li>Kolik uchazečů se hlásilo a kolik se jich dostalo?</li>
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
    </aside>
  );
}

export default async function VeletrhyVariantaB() {
  const sezonaSedi = (await overSezonuProtiRegistru()) !== null;
  const vsechny = await nactiAkce();
  const akce = sezonaSedi ? zobrazitelneAkce(new Date(), vsechny) : [];

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
    <div className="min-h-screen bg-gray-50" data-varianta="b">
      <Header />

      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <nav className="text-sm text-gray-500 mb-3">
            <Link href="/" className="hover:underline">
              Úvod
            </Link>
            <span className="mx-2">›</span>
            <span>Veletrhy a přehlídky</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Veletrhy a přehlídky středních škol</h1>
          <p className="mt-3 max-w-2xl text-gray-700">
            Veletrh středních škol, tedy akce, kde se na jednom místě představí školy z kraje najednou.
            Za jedno odpoledne tam jde obejít školy, které byste jinak objížděli po jedné celý podzim.
          </p>
          <p className="mt-4">
            <a href="#kde" className="text-blue-700 underline underline-offset-4 hover:text-blue-800">
              Vybrat kraj
            </a>
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {sezonaSedi ? (
          <VeletrhySeznam varianta="b" otazky={<OtazkyKeStanku />} akce={karty} den={cesskyDen()} />
        ) : (
          <>
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <p className="font-medium text-gray-900">Přehled akcí právě připravujeme.</p>
              <p className="mt-2 text-gray-700">
                Termíny na novou sezónu sbíráme a ověřujeme u pořadatelů. Než budou hotové,
                neukazujeme tu nic — akce z minulé sezóny vydávané za aktuální by vás poslaly
                na akci, která se nekoná.
              </p>
            </div>
            <OtazkyKeStanku />
          </>
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
            Údaje jsme naposledy ověřovali {formatujDen(overenoK(vsechny))}. Termín a podmínky si před cestou
            ověřte na stránce pořadatele.
          </p>
        </section>
      </div>

      <Footer />
    </div>
  );
}
