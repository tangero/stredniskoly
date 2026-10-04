import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MESTA, getCityStats } from '@/lib/cityData';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import { dalsiOboryVeMeste, nactiIndexRejstriku } from '@/lib/kontext-prihlasek';
import { getSchoolAnalysis, getSchoolsData } from '@/lib/data';
import { rocnikyKatalogu } from '@/lib/school-key';
import { nazevSUlici, sestavKartySkol, velikostMesta } from '@/lib/mesto-karty';
import { SkolyPodleSmeru } from '@/components/mesto/SkolyPodleSmeru';
import { zrizovatelPodleRedizo } from '@/lib/simulator-filter';
import { VeletrhVMeste } from '@/components/veletrhy/VeletrhVMeste';
import type { CityStats } from '@/lib/cityData';

interface Props {
  params: Promise<{ mesto: string }>;
}

// Stránka nese veletrh ve městě (VeletrhVMeste). Akce končí půlnocí, ne
// změnou dat, takže značka `veletrhy` nestačí: bez časové revalidace by
// proběhlá akce visela až do dalšího nasazení. Klientské skrytí schová
// blok až po poslední zobrazené akci. Hodina jako na /veletrhy.
export const revalidate = 3600;

export async function generateStaticParams() {
  return MESTA.map(m => ({ mesto: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { mesto: mestoSlug } = await params;
  const meta = MESTA.find(m => m.slug === mestoSlug);
  if (!meta) return { title: 'Město nenalezeno' };
  // Ročník z registru, nikdy napevno (CLAUDE.md, Stav datových sad, pravidlo 1).
  const rok = await zobrazeneObdobi('cermat-vysledky');
  const zaRok = rok ? ` ${rok}` : '';
  return {
    alternates: { canonical: `/mesto/${meta.slug}` },
    title: `Střední školy ${meta.nazev} — kompletní přehled`,
    description: `Střední školy ${meta.nazev}: co se tu dá studovat po školách a směrech, jak těžké bylo se na obory dostat v 1. kole${zaRok} a počty míst.`,
    openGraph: {
      title: `Střední školy ${meta.nazev} — kompletní přehled`,
      description: `Střední školy ${meta.nazev}: které školy nabízejí co a jak těžké bylo se na ně dostat v 1. kole${zaRok}.`,
    },
  };
}

function fmt(n: number) {
  return n.toLocaleString('cs-CZ');
}

const sklon = (n: number, a: string, b: string, c: string) => (n === 1 ? a : n >= 2 && n <= 4 ? b : c);

/** Název školy s ulicí podle REDIZO z katalogu (`nazevSUlici`), ročníky podle registru (`rocnikyKatalogu`). */
async function nazvySkolKatalogu(): Promise<Map<string, string>> {
  const data = await getSchoolsData() as unknown as Record<string, Array<Record<string, unknown>>>;
  const skoly = new Map<string, string>();
  for (const rocnik of rocnikyKatalogu(Object.keys(data), await zobrazeneObdobi('cermat-vysledky'))) {
    for (const z of data[rocnik] ?? []) {
      const redizo = String(z.redizo ?? '');
      const nazev = z.nazev ? nazevSUlici(String(z.nazev), String(z.ulice ?? '')) : String(z.nazev_display ?? '');
      if (redizo && nazev && !skoly.has(redizo)) skoly.set(redizo, nazev);
    }
  }
  return skoly;
}

export default async function MestoPage({ params }: Props) {
  const { mesto: mestoSlug } = await params;
  const mestoMeta = MESTA.find(m => m.slug === mestoSlug);
  if (!mestoMeta) notFound();

  const stats: CityStats | null = await getCityStats(mestoMeta.nazev);
  if (!stats) notFound();
  const { schools } = stats;

  // Ročník z registru; obtížnost přijetí stojí na souhrnech 1. kola téhož ročníku.
  const rok = Number(await zobrazeneObdobi('cermat-vysledky')) || null;
  // Obory, které katalog nevede (učební obory, konzervatoře). Klíče z katalogu se předají,
  // aby se nabídka nezdvojila; podkladem je soupis oborů ročníku, ne souběžné volby.
  const dalsi = await dalsiOboryVeMeste(
    mestoMeta.nazev,
    new Set(schools.map(s => `${s.redizo}_${s.id.split('_')[1] ?? ''}`)),
  );
  const [rejstrik, nazvyKatalogu, analyza] = await Promise.all([
    nactiIndexRejstriku(), nazvySkolKatalogu(), getSchoolAnalysis(),
  ]);
  const kanonickeNazvy = new Map<string, string>();
  for (const s of Object.values(analyza)) {
    const redizo = s.id.split('_')[0];
    if (!kanonickeNazvy.has(redizo)) kanonickeNazvy.set(redizo, s.nazev);
  }

  const skoly = sestavKartySkol(schools, dalsi.obory, {
    nazvyKatalogu, kanonickeNazvy, adresySidel: rejstrik.identifikace,
    zrizovatele: zrizovatelPodleRedizo(await getSchoolsData() as unknown as Record<string, unknown>),
  });
  const pocetNabidek = skoly.flatMap(k => k.radky).filter(r => r.druh === 'jpz').length;
  const pocetDalsich = dalsi.obory.length;

  const hlavicka = (
    <>
      <nav aria-label="Drobečková navigace" className="mb-4 text-[14px] text-[#c3d3ea]">
        <Link href="/" className="hover:text-white hover:underline">Domů</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <Link href="/mesto" className="hover:text-white hover:underline">Města</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="text-white">{mestoMeta.nazev}</span>
      </nav>
      <h1 className="text-[32px] font-bold leading-tight md:text-[40px]">Střední školy — {mestoMeta.nazev}</h1>
      <p className="mt-2 max-w-3xl text-[17px] leading-relaxed text-[#dbe5f3]">
        {mestoMeta.kraj}. {fmt(skoly.length)} {sklon(skoly.length, 'škola', 'školy', 'škol')},{' '}
        {fmt(pocetNabidek)} {sklon(pocetNabidek, 'obor', 'obory', 'oborů')} s jednotnou zkouškou
        {pocetDalsich > 0 && (
          <> a {fmt(pocetDalsich)} {sklon(pocetDalsich, 'další obor', 'další obory', 'dalších oborů')}, většinou učebních</>
        )}.
      </p>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f9]">
      <Header />

      <main className="flex-1 pb-16">
        <SkolyPodleSmeru
          skoly={skoly}
          rok={rok}
          velikost={velikostMesta(pocetNabidek)}
          hlavicka={hlavicka}
        />

        <div className="mx-auto mt-12 max-w-6xl space-y-10 px-4">
          {/* Nejbližší veletrh středních škol ve městě, nejvýš dvě akce podle
              data. Bez potvrzené akce komponenta nevykreslí nic. */}
          <VeletrhVMeste obec={mestoMeta.nazev} variant="mesto" />

          <section>
            <h2 className="mb-3 text-[20px] font-bold text-[#16325c]">Jak číst přehled</h2>
            <div className="space-y-2">
              <Vysvetlivka title="Co je obtížnost přijetí?">
                Slovní zařazení podle toho, kolik soutěžících uchazečů se na obor dostalo, tedy těch,
                kdo splnili požadavky školy a nedostali se na obor, který měli na přihlášce výš. Stupně
                jsou: místo pro všechny (nikdo nebyl odmítnut kvůli kapacitě), dostala se většina
                (aspoň dvě třetiny), středně těžké (polovina až dvě třetiny), těžké (třetina až
                polovina) a velmi těžké (méně než třetina). Popisuje jeden ročník, ne kvalitu školy
                ani obtížnost studia, a neříká, jakou šanci má konkrétní uchazeč. U oborů s méně než
                deseti soutěžícími se neuvádí. Podíl, předchozí ročník a body přijatých jsou na
                stránce oboru.
              </Vysvetlivka>
              <Vysvetlivka title="Co jsou směry studia?">
                Obory seskupené podle toho, co se v nich učí, podle číselníku oborů MŠMT. Lycea jsou
                zařazená podle předmětu (technické lyceum k technice, zdravotnické ke zdravotnictví),
                víceletá gymnázia zvlášť, protože se na ně hlásí žáci 5. a 7. třídy. Pořadí směrů nic
                neříká o tom, kam je těžší se dostat.
              </Vysvetlivka>
              <Vysvetlivka title="Proč některý obor nemá údaje?">
                Obory bez jednotné zkoušky, například učební obory s výučním listem, a několik dalších
                oborů přehled zatím nezahrnuje a nemají u nás vlastní stránku; víme o nich jen název.
                {dalsi.minUchazecu !== null && (
                  <> Známe je z přihlášek, takže obory, o které se hlásilo méně než {dalsi.minUchazecu} uchazečů, v přehledu chybí.</>
                )}{' '}
                Obor, který škola v zobrazeném ročníku nevypsala, zůstane bez údajů.{' '}
                <b>Chybějící údaj není nula</b> a neznamená, že se tam dostal každý.
              </Vysvetlivka>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Vysvetlivka({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-[12px] border border-[#dde4ee] bg-white">
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-[#f5f8fc]">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className="shrink-0 text-slate-500 transition-transform duration-150 group-open:rotate-90">
          <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[15px] font-semibold text-slate-800">{title}</span>
      </summary>
      <div className="px-4 pb-4 text-[15px] leading-relaxed text-slate-700">{children}</div>
    </details>
  );
}
