import { Metadata } from 'next';
import Link from 'next/link';
import { DrobeckyJsonLd } from '@/components/DrobeckyJsonLd';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MESTA, getCityStats } from '@/lib/cityData';
import { popisMesta, titulekMesta } from '@/lib/seo-titulky';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import { dalsiOboryVeMeste, nactiIndexRejstriku } from '@/lib/kontext-prihlasek';
import { getNabidkyBezJpzVeMeste, getSchoolsData } from '@/lib/data';
import { kanonickeNazvySkol, nazvySkolKatalogu } from '@/lib/okruhy-podklad';
import { sestavKartySkol, velikostMesta } from '@/lib/mesto-karty';
import { SkolyPodleSmeru } from '@/components/mesto/SkolyPodleSmeru';
import { zrizovatelPodleRedizo } from '@/lib/simulator-filter';
import { VeletrhVMeste } from '@/components/veletrhy/VeletrhVMeste';
import type { CityStats } from '@/lib/cityData';

// ============================================================================
// Zkouška rozložení stránky města (docs/navrh-prehled-oboru-ve-meste-2027.md,
// oddíl 15). Veřejná stránka /mesto/[mesto] se nemění a parametr nečte, aby
// jí zůstala hodinová revalidace. Sem vede přepis beforeFiles, když adresa
// nese ?varianta=b; v prohlížeči parametr zůstane.
//
// Stránka je nezalistovaná, ne chráněná: kdo zná adresu, otevře ji. Nikde na
// ni nevede odkaz, není v sitemapě (ta má pevný seznam cest) a nese
// `robots: noindex`. Do robots.txt ji zapsat **nesmíme** — zakázané procházení
// by vyhledávači zabránilo `noindex` vůbec přečíst.
// ============================================================================

interface Props {
  params: Promise<{ mesto: string }>;
}

export const revalidate = 3600;

export async function generateStaticParams() {
  return MESTA.map(m => ({ mesto: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mesto: mestoSlug } = await params;
  const meta = MESTA.find(m => m.slug === mestoSlug);
  if (!meta) return { title: 'Město nenalezeno', robots: { index: false, follow: false } };
  const rok = await zobrazeneObdobi('cermat-vysledky');
  const title = titulekMesta(meta.nazev);
  const description = popisMesta(meta.nazev, rok);
  return {
    title: { absolute: title },
    description,
    robots: { index: false, follow: false },
  };
}

function fmt(n: number) {
  return n.toLocaleString('cs-CZ');
}

const sklon = (n: number, a: string, b: string, c: string) => (n === 1 ? a : n >= 2 && n <= 4 ? b : c);

export default async function PrototypMesta({ params }: Props) {
  const { mesto: mestoSlug } = await params;
  const mestoMeta = MESTA.find(m => m.slug === mestoSlug);
  if (!mestoMeta) notFound();

  const stats: CityStats | null = await getCityStats(mestoMeta.nazev);
  if (!stats) notFound();
  const { schools } = stats;

  const rok = Number(await zobrazeneObdobi('cermat-vysledky')) || null;
  const dalsi = await dalsiOboryVeMeste(
    mestoMeta.nazev,
    new Set(schools.map(s => `${s.redizo}_${s.id.split('_')[1] ?? ''}`)),
  );
  const [rejstrik, nazvyKatalogu, kanonickeNazvy, bezJpz] = await Promise.all([
    nactiIndexRejstriku(), nazvySkolKatalogu(), kanonickeNazvySkol(), getNabidkyBezJpzVeMeste(mestoMeta.nazev),
  ]);
  // Stejné karty jako veřejná stránka. Okruhy oborů sem nepatří: na prototypu
  // by opakovaly seznam, zůstávají na stránce oboru.
  const skoly = sestavKartySkol(schools, dalsi.obory, {
    nazvyKatalogu, kanonickeNazvy, adresySidel: rejstrik.identifikace, obec: mestoMeta.nazev,
    zrizovatele: zrizovatelPodleRedizo(await getSchoolsData() as unknown as Record<string, unknown>),
  }, bezJpz);
  const radky = skoly.flatMap(k => k.radky);
  const sCisly = radky.filter(r => r.mista !== null || r.druh === 'jpz');
  const velikost = velikostMesta(sCisly.length);
  const ukazVolbu = velikost !== 'male' && new Set(radky.map(r => r.smer)).size > 1;

  const hlavicka = (
    <>
      <nav aria-label="Drobečková navigace" className="mb-4 text-[14px] text-slate-600">
        <Link href="/" className="hover:text-[#16325c] hover:underline">Domů</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <Link href="/mesto" className="hover:text-[#16325c] hover:underline">Města</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="text-[#16325c]">{mestoMeta.nazev}</span>
      </nav>
      <DrobeckyJsonLd polozky={[{ nazev: 'Domů', cesta: '/' }, { nazev: 'Města', cesta: '/mesto' }, { nazev: mestoMeta.nazev }]} />
      <h1 className="text-[32px] font-bold leading-tight text-[#16325c] md:text-[40px]">Střední školy — {mestoMeta.nazev}</h1>
      <p className="mt-2 max-w-3xl text-[17px] leading-relaxed text-slate-700">
        {mestoMeta.kraj}.{' '}
        {ukazVolbu
          ? 'Nejdřív si vyberte, co se tu dá studovat.'
          : `${fmt(skoly.length)} ${sklon(skoly.length, 'škola', 'školy', 'škol')}, ${fmt(sCisly.length)} ${sklon(sCisly.length, 'obor', 'obory', 'oborů')}.`}
      </p>
      {ukazVolbu && (
        <a
          href="#smer"
          className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-[#0074e4] px-5 text-[15px] font-semibold text-white hover:bg-[#0062c4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0074e4]"
        >
          Vybrat směr studia
        </a>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f9]">
      <Header />
      <main className="flex-1 pb-16">
        <SkolyPodleSmeru
          skoly={skoly}
          rok={rok}
          velikost={velikost}
          hlavicka={hlavicka}
          varianta="b"
        />
        <div className="mx-auto mt-12 max-w-6xl space-y-8 px-4">
          <VeletrhVMeste obec={mestoMeta.nazev} variant="mesto" />
          <section className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700">
            <p>
              <b className="font-semibold text-slate-800">Obtížnost přijetí</b>
              {rok ? ` v 1. kole ${rok}` : ''} říká, kolik soutěžících uchazečů se dostalo, tedy těch, kdo splnili
              podmínky přijetí a nebyli přijati jinam podle vyšší priority na přihlášce. Popisuje jedno kolo,
              ne obtížnost studia ani kvalitu školy.
            </p>
            <p>
              <b className="font-semibold text-slate-800">Chybějící údaj není nula</b> a neznamená, že se tam dostal každý.
            </p>
            <p>
              <b className="font-semibold text-slate-800">Které další obory v okolí uchazeči také volí</b>, tedy obory,
              které měli na přihlášce i uchazeči tohoto oboru, bez ohledu na to, ve které obci leží, je na stránce oboru.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
