import { StatsTab } from '@/components/school/detail/tabs/StatsTab';
import { normalizeSchoolKey, uniqueSchoolIndex } from '@/lib/school-key';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProgramTabs } from '@/components/SchoolDetailClient';
import { InspectionSummary } from '@/components/InspectionSummary';
import { SchoolInfoSection } from '@/components/school-profile/SchoolInfoSection';
import { SchoolPortalSection } from '@/components/school-profile/SchoolPortalSection';
import { getPortalZaznam } from '@/lib/portal-skol';
import { getSchoolPageType, getSchoolOverview, getExtendedStatsForProgram, getProgramsByRedizo, getTrendDataForPrograms, SchoolProgram, YearlyTrendData, getCSIDataByRedizo, getExtractionsByRedizo, getInspisDataByRedizo, get2026DataByRedizo, type School2026Data, getSchoolResultsByRedizo } from '@/lib/data';
import { Applications2026Banner } from '@/components/Applications2026Banner';
import { SchoolResults2026 } from '@/components/SchoolResults2026';
import { VibecordingPromo } from '@/components/VibecordingPromo';
import { getNoteForSchool } from '@/lib/school-notes';
import { getPasmaPrijeti, rokPasemPrijeti } from '@/lib/pasma-prijeti';
import { platnostObdobi, zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import { getSouhrnNabidky } from '@/lib/souhrny-kolo1';
import { PasmaPrijetiCard } from '@/components/school/detail/PasmaPrijetiCard';
import { getDruheKolo } from '@/lib/druhe-kolo';
import { DruheKoloCard } from '@/components/school/detail/DruheKoloCard';
import { SchoolNote } from '@/components/SchoolNote';
import { getProfilOboru } from '@/lib/obor-profil-data';
import { ProfilOboru } from '@/components/obor/ProfilOboru';
import { UlozitObor } from '@/components/obor/UlozitObor';
import { getDemandClass, createSlug } from '@/lib/utils';
import { categoryLabels, categoryColors, krajNames, getSchoolTypeFullName } from '@/types/school';

// V2 Overview komponenty
import {
  OverviewHero,
  QuickFactsCard,
  CSISummaryCard,
  CTASection,
  QuickFact,
} from '@/components/school/overview';

interface Props {
  params: Promise<{ slug: string }>;
}

// =====================
// HYBRID ISR+SSG APPROACH
// =====================
// Pre-generate top 200 nejnavštěvovanějších škol (SSG)
// Zbytek generovat on-demand při prvním requestu (ISR)

// ISR: Revalidate každou hodinu (fresh data)
export const revalidate = 3600; // 1 hodina

// SSG: Pre-generate top 200 škol (podle popularity)
export async function generateStaticParams() {
  const { generateTopSlugs } = await import('@/lib/data');
  const slugs = await generateTopSlugs(200);
  return slugs;
}

// Dynamické SEO metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pageInfo = await getSchoolPageType(slug);

  if (!pageInfo.school) {
    return {
      title: 'Škola nenalezena',
    };
  }

  const school = pageInfo.school;

  // Různé meta tagy pro přehled vs detail
  if (pageInfo.type === 'overview') {
    const title = `${school.nazev} - přehled oborů`;
    const description = `Přehled všech oborů a zaměření školy ${school.nazev}. ${school.obec}, ${krajNames[school.kraj_kod] || school.kraj}`;

    return {
      title,
      description,
      openGraph: {
        title: `${title} | Přijímačky na střední školy`,
        description,
        type: 'article',
        url: `/skola/${slug}`,
      },
      alternates: {
        types: {
          'text/markdown': `/skola/${slug}.md`,
          'application/json': `/skola/${slug}.json`,
        },
      },
    };
  }

  // Detail oboru/zaměření - overview slug pro alternativní formáty (md/json vždy vrací celou školu)
  const overviewSlugMeta = `${pageInfo.redizo}-${createSlug(school.nazev)}`;

  const program = pageInfo.program;
  const oborNazev = program?.zamereni ? `${program.obor} - ${program.zamereni}` : school.obor;
  const title = `${school.nazev} - ${oborNazev}`;
  const description = `Přijímací zkoušky ${school.nazev}: ${oborNazev}. Historické výsledky a přihlášky. ${school.obec}, ${krajNames[school.kraj_kod] || school.kraj}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Přijímačky na střední školy`,
      description,
      type: 'article',
      url: `/skola/${slug}`,
    },
    alternates: {
      types: {
        'text/markdown': `/skola/${overviewSlugMeta}.md`,
        'application/json': `/skola/${overviewSlugMeta}.json`,
      },
    },
  };
}

// Helper pro správné přiřazení 2026 dat k programu/zaměření
function match2026ToProgram(data2026: School2026Data[], program: SchoolProgram): School2026Data | undefined {
  return uniqueSchoolIndex(data2026, row => row.id).get(normalizeSchoolKey(program.id));
}

// Helper pro délku studia badge
function StudyLengthBadge({ delka }: { delka: number }) {
  const colors: Record<number, string> = {
    4: 'bg-blue-100 text-blue-800',
    6: 'bg-blue-100 text-blue-800',
    8: 'bg-blue-100 text-blue-800',
  };

  const delkaSlovy: Record<number, string> = {
    2: 'Dvouleté',
    3: 'Tříleté',
    4: 'Čtyřleté',
    5: 'Pětileté',
    6: 'Šestileté',
    8: 'Osmileté',
  };

  const delkaText = delkaSlovy[delka] || `${delka}leté`;

  return (
    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${colors[delka] || 'bg-slate-100 text-slate-800'}`}>
      {delkaText} studium
    </span>
  );
}

// Komponenta pro kartu oboru v přehledu
function ProgramCard({ program, schoolNazev, redizo, showStudyLength, data2026ForProgram }: {
  program: SchoolProgram;
  schoolNazev: string;
  redizo: string;
  showStudyLength?: boolean;
  trend?: YearlyTrendData | null;
  data2026ForProgram?: School2026Data | null;
}) {
  const demand = getDemandClass(program.index_poptavky);

  // Vytvořit slug pro detail - pokud má duplicitní název, přidat délku studia do slugu
  const programSlug = program.zamereni
    ? showStudyLength
      ? `${redizo}-${createSlug(schoolNazev, program.obor, program.zamereni, program.delka_studia)}`
      : `${redizo}-${createSlug(schoolNazev, program.obor, program.zamereni)}`
    : showStudyLength
      ? `${redizo}-${createSlug(schoolNazev, program.obor, undefined, program.delka_studia)}`
      : `${redizo}-${createSlug(schoolNazev, program.obor)}`;

  const baseName = program.zamereni
    ? `${program.obor} - ${program.zamereni}`
    : program.obor;

  // Pokud má duplikátní název, přidat délku studia
  const displayName = showStudyLength ? `${baseName} (${program.delka_studia}leté)` : baseName;

  const isNew = program.is_new_2026;
  const prevName = program.prev_zamereni_name;
  const has2026 = !!data2026ForProgram;
  const d26 = data2026ForProgram;
  const demand2026 = d26 ? getDemandClass(d26.index_poptavky) : null;

  return (
    <Link
      href={`/skola/${programSlug}`}
      className={`block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border overflow-hidden ${isNew ? 'border-amber-200' : 'border-slate-100'}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div className="min-w-0">
            <h3 className="font-semibold text-lg text-slate-900">{displayName}</h3>
            <p className="text-sm text-slate-500">
              {getSchoolTypeFullName(program.typ, program.obor)}
            </p>
          </div>
          <StudyLengthBadge delka={program.delka_studia} />
        </div>

        {/* Badges - nový obor, přejmenování */}
        <div className="mb-3 text-xs">
          {isNew && (
            <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium mr-2">
              V importu 2026
            </span>
          )}
          {prevName && (
            <span className="text-slate-400">
              dříve &bdquo;{prevName}&ldquo;
            </span>
          )}
        </div>

        {/* Hlavní čísla - 2026 data pokud existují, jinak 2025 */}
        {has2026 ? (
          <>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{d26!.prihlasky}</div>
                <div className="text-xs text-slate-500">Přihlášek 2026</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-700">{d26!.kapacita}</div>
                <div className="text-xs text-slate-500">Míst 2026</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-700">
                  {d26!.index_poptavky.toFixed(1)}× {demand2026?.emoji}
                </div>
                <div className="text-xs text-slate-500">Poptávka</div>
              </div>
            </div>
            {/* Doplňkový řádek s čísly ročníku, ze kterého záznam pochází */}
            <div className="mt-3 pt-3 border-t border-slate-50 grid grid-cols-3 gap-4 text-xs text-slate-400">
              <div className="text-center">
                <span className="font-medium text-red-600">{program.prijati}</span> přijatých {program.rok ?? 2025}
              </div>
              <div className="text-center">
                {program.kapacita} míst {program.rok ?? 2025}
              </div>
              <div className="text-center">
                {program.prihlasky} přihl. {program.rok ?? 2025}
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-700">{program.prijati}</div>
              <div className="text-xs text-slate-500">Přijatí 2025</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-700">{program.kapacita}</div>
              <div className="text-xs text-slate-500">Kapacita 2025</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-700">
                {program.index_poptavky.toFixed(1)}× {demand.emoji}
              </div>
              <div className="text-xs text-slate-500">Poptávka 2025</div>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-sm">
          <span className="text-slate-500">
            2025: {program.prihlasky} přihlášek → {program.prijati} přijatých
          </span>
          <span className="text-blue-600 font-medium">Detail →</span>
        </div>
      </div>
    </Link>
  );
}

export default async function SchoolDetailPage({ params }: Props) {
  const { slug } = await params;
  const pageInfo = await getSchoolPageType(slug);
  const inspisEnabled = process.env.INSPIS_ENABLED !== 'false';
  const overviewV2Enabled = process.env.OVERVIEW_V2_ENABLED !== 'false'; // V2 feature flag
  // Roky dat pro kartu pásem přijetí určuje registr stavu datových sad, ne kód.
  const rokPasem = await rokPasemPrijeti();
  const obdobiNabidky = await zobrazeneObdobi('cermat-prihlasky');
  const rokNabidky = obdobiNabidky ? Number(obdobiNabidky) : null;
  const platnostNabidky = await platnostObdobi('cermat-prihlasky');

  if (!pageInfo.school) {
    notFound();
  }

  const school = pageInfo.school;
  const redizo = pageInfo.redizo;
  const krajSlug = createSlug(krajNames[school.kraj_kod] || school.kraj);

  // =====================
  // PŘEHLED ŠKOLY
  // =====================
  if (pageInfo.type === 'overview') {
    const overview = await getSchoolOverview(redizo);
    if (!overview) notFound();

    // Načíst data ČŠI a AI extrakce
    const [csiData, extractions, inspis, data2026, results2026, portalZaznam] = await Promise.all([
      getCSIDataByRedizo(redizo),
      getExtractionsByRedizo(redizo),
      inspisEnabled ? getInspisDataByRedizo(redizo) : Promise.resolve(null),
      get2026DataByRedizo(redizo),
      getSchoolResultsByRedizo(redizo),
      getPortalZaznam(redizo),
    ]);

    // Seřadit programy podle min_body (nejobtížnější první)
    const sortedPrograms = [...overview.programs].sort((a, b) => a.obor.localeCompare(b.obor, 'cs') || a.id.localeCompare(b.id));

    // Zjistit duplicitní názvy oborů (různá délka studia, ale stejný název)
    const oborCountsOverview = new Map<string, number>();
    for (const p of sortedPrograms) {
      const baseName = p.zamereni ? `${p.obor} - ${p.zamereni}` : p.obor;
      oborCountsOverview.set(baseName, (oborCountsOverview.get(baseName) || 0) + 1);
    }

    // Načíst trend data pro všechny programy
    const programIds = sortedPrograms.map(p => p.id);
    const trendDataMap = await getTrendDataForPrograms(programIds);

    // =====================
    // V2 OVERVIEW (pokud enabled)
    // =====================
    if (overviewV2Enabled && sortedPrograms.length === 1) {
      // Pro školy s 1 oborem použijeme V2 Overview stránku
      const program = sortedPrograms[0];

      // Quick facts pro kartu
      const quickFacts: QuickFact[] = [
        { label: "Přijatí 2025", value: program.prijati },
        { label: "Kapacita 2025", value: program.kapacita },
        { label: "Školné", value: inspis?.rocni_skolne ? `${inspis.rocni_skolne.toLocaleString('cs-CZ')} Kč` : inspis?.rocni_skolne === 0 ? "Zdarma" : "Neuvedeno" },
        { label: "Jazyky", value: inspis?.vyuka_jazyku?.slice(0, 2).join(", ") || "N/A" },
      ];

      // AI summary (první extrakce nebo fallback)
      const aiSummary = extractions.length > 0
        ? extractions[0].plain_czech_summary?.substring(0, 200) || "Škola poskytuje kvalitní vzdělání."
        : "Data z inspekce nejsou k dispozici.";

      const overviewSlug = `${redizo}-${createSlug(overview.nazev)}`;

      return (
        <div className="min-h-screen flex flex-col">
          <Header />

          <main className="flex-1">
            {/* Breadcrumb */}
            <div className="bg-white border-b">
              <div className="max-w-6xl mx-auto px-4 py-3">
                <nav className="text-sm text-slate-600">
                  <Link href="/" className="hover:text-blue-600">Domů</Link>
                  <span className="mx-2">/</span>
                  <Link href="/skoly" className="hover:text-blue-600">Školy</Link>
                  <span className="mx-2">/</span>
                  <Link href={`/regiony/${krajSlug}`} className="hover:text-blue-600">
                    {krajNames[school.kraj_kod] || school.kraj}
                  </Link>
                  <span className="mx-2">/</span>
                  <span className="text-slate-900">{overview.nazev}</span>
                </nav>
              </div>
            </div>

            {/* V2 Hero */}
            <OverviewHero
              schoolName={overview.nazev}
              location={overview.obec}
              kraj={krajNames[overview.kraj_kod] || overview.kraj}
              studyLength={program.delka_studia}
              schoolType={overview.zrizovatel}
              category={school.category_code}
              hasInspection={extractions.length > 0}
              overviewSlug={overviewSlug}
            />

            {/* Vibecoding promo */}
            <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
              <VibecordingPromo />
            </div>

            {/* Obsah */}
            <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
              {/* Banner přihlášek 2026 */}
              {data2026.length > 0 && rokNabidky && (
                <Applications2026Banner
                  data2026={data2026}
                  rok={rokNabidky}
                  platnost={platnostNabidky}
                />
              )}
              <SchoolResults2026 results={results2026} />

              {/* Priority Cards */}
              <StatsTab
                program={program}
                extendedStats={await getExtendedStatsForProgram(program.id)}
                data2026={match2026ToProgram(data2026, program)}
                result2026={results2026.find(r => normalizeSchoolKey(r.offer_id ?? '') === normalizeSchoolKey(program.id))}
                souhrn={await getSouhrnNabidky(program.id)}
              />

              {/* Jak dopadli loňští uchazeči s podobným výsledkem */}
              {rokPasem && (
                <PasmaPrijetiCard
                  data={await getPasmaPrijeti(program.id)}
                  rok={rokPasem}
                  rokNabidky={rokNabidky}
                  vypsana={!!match2026ToProgram(data2026, program)}
                  nova={!!match2026ToProgram(data2026, program)?.is_new}
                />
              )}
              <DruheKoloCard data={await getDruheKolo(program.id, program.zamereni)} />

              {/* Quick Facts */}
              <QuickFactsCard facts={quickFacts} />

              {/* ČŠI Summary */}
              {extractions.length > 0 && (
                <CSISummaryCard
                  summary={aiSummary}
                  reportUrl={`/skola/${overviewSlug}/inspekce`}
                />
              )}

              {/* CTA Buttons */}
              <CTASection
                primaryAction={{
                  label: "Zobrazit detail",
                  href: `/skola/${overviewSlug}/detail`,
                }}
                secondaryAction={{
                  label: "Je to pro mě?",
                  href: `/skola/${overviewSlug}/pro-me`,
                }}
              />

              {/* InspIS profil (optional) */}
              {inspis && <SchoolInfoSection data={inspis} />}

              {/* Údaje potvrzené školou (Portál pro školy) */}
              <SchoolPortalSection zaznam={portalZaznam} />

              {/* Strojově čitelné formáty */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-3 text-xs text-slate-400">
                <span>Otevřená data:</span>
                <a
                  href={`/skola/${overviewSlug}.md`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 hover:border-slate-300 hover:text-slate-600 transition-colors"
                >
                  <span className="font-bold leading-none">M&#8595;</span>
                  Markdown
                </a>
                <a
                  href={`/skola/${overviewSlug}.json`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 hover:border-slate-300 hover:text-slate-600 transition-colors"
                >
                  <span className="font-mono leading-none">&#123; &#125;</span>
                  JSON
                </a>
              </div>
            </div>
          </main>

          <Footer />
        </div>
      );
    }

    // =====================
    // V1 OVERVIEW (fallback)
    // =====================
    return (
      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1">
          {/* Breadcrumb */}
          <div className="bg-white border-b">
            <div className="max-w-6xl mx-auto px-4 py-3">
              <nav className="text-sm text-slate-600">
                <Link href="/" className="hover:text-blue-600">Domů</Link>
                <span className="mx-2">/</span>
                <Link href="/skoly" className="hover:text-blue-600">Školy</Link>
                <span className="mx-2">/</span>
                <Link href={`/regiony/${krajSlug}`} className="hover:text-blue-600">
                  {krajNames[school.kraj_kod] || school.kraj}
                </Link>
                <span className="mx-2">/</span>
                <span className="text-slate-900">{overview.nazev}</span>
              </nav>
            </div>
          </div>

          {/* Header */}
          <div className="bg-gradient-to-br from-blue-500 via-blue-500 to-blue-600 text-white py-12">
            <div className="max-w-6xl mx-auto px-4">
              <h1 className="text-2xl md:text-4xl font-bold mb-4">{overview.nazev}</h1>
              <p className="text-lg opacity-90 mb-4">
                Přehled všech oborů a zaměření
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm opacity-80">
                <span>{overview.obec}, {krajNames[overview.kraj_kod] || overview.kraj}</span>
                <span>•</span>
                <span>{overview.zrizovatel}</span>
                <span>•</span>
                <span>{sortedPrograms.length} {sortedPrograms.length === 1 ? 'obor' : sortedPrograms.length < 5 ? 'obory' : 'oborů'}</span>
              </div>
              {extractions.length > 0 && (
                <div className="mt-4">
                  <Link
                    href={`/skola/${redizo}-${createSlug(overview.nazev)}/inspekce`}
                    className="inline-block px-4 py-1 rounded-full text-sm font-medium bg-white/20 text-white hover:bg-white/30 transition-colors"
                  >
                    Co si o škole myslí Školská inspekce?
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Vibecoding promo */}
          <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
            <VibecordingPromo />
          </div>

          {/* Statistiky přehledu */}
          <div className="max-w-6xl mx-auto px-4 py-8">
            {(() => {
              // Za školu se sčítají jen počty, které nepočítají tytéž uchazeče víckrát: obory, kapacita, přijatí.
              // Přihlášky a poměry na místo patří k jednotlivým oborům (slovník ukazatelů, přihlášky na místo).
              const kapacitaRocniku = data2026.reduce((sum, d) => sum + d.kapacita, 0);
              const prijatiZnami = data2026.length > 0 && data2026.every(d => typeof d.admission_context?.accepted === 'number');
              const prijatiRocniku = prijatiZnami ? data2026.reduce((sum, d) => sum + (d.admission_context?.accepted ?? 0), 0) : null;
              if (!data2026.length || !rokNabidky) {
                return (
                  <p className="mb-8 rounded-xl bg-white p-4 text-sm text-slate-600 shadow-sm">
                    Škola v posledním zveřejněném 1. kole nevypsala obor s jednotnou přijímací zkouškou, který bychom měli v datech.
                    Níže jsou obory z dřívějších ročníků.
                  </p>
                );
              }
              return (
                <div className="mb-8">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-xl bg-white p-4 text-center shadow-sm">
                      <div className="text-3xl font-bold text-blue-600">{data2026.length.toLocaleString('cs-CZ')}</div>
                      <div className="text-sm text-slate-500">Vypsaných oborů a zaměření · {rokNabidky}</div>
                    </div>
                    <div className="rounded-xl bg-white p-4 text-center shadow-sm">
                      <div className="text-3xl font-bold text-slate-700">{kapacitaRocniku.toLocaleString('cs-CZ')}</div>
                      <div className="text-sm text-slate-500">Kapacita míst · {rokNabidky}</div>
                    </div>
                    <div className="rounded-xl bg-white p-4 text-center shadow-sm">
                      <div className="text-3xl font-bold text-slate-700">{prijatiRocniku === null ? '—' : prijatiRocniku.toLocaleString('cs-CZ')}</div>
                      <div className="text-sm text-slate-500">Přijatých v 1. kole · {rokNabidky}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    Přihlášky na místo a první priority uvádíme u jednotlivých oborů níže. Součet za celou školu by sčítal různé konkurzy a tytéž uchazeče počítal víckrát.
                    {platnostNabidky && <> Zdroj: CERMAT, stav k {platnostNabidky.split('-').map(Number).reverse().join('. ')}.</>}
                  </p>
                </div>
              );
            })()}

            {/* Banner přihlášek: jen u jediné nabídky, u více oborů by duplikoval dlaždice a sčítal konkurzy */}
            {data2026.length === 1 && rokNabidky && (
              <Applications2026Banner
                data2026={data2026}
                rok={rokNabidky}
                platnost={platnostNabidky}
              />
            )}
            <SchoolResults2026 results={results2026} />

            {/* Rozdělit programy na ty s 2026 daty a ty pouze z 2025 */}
            {(() => {
              // Matchování programů s 2026 daty
              const programsWith2026: typeof sortedPrograms = [];
              const programsOnly2025: typeof sortedPrograms = [];
              const matched2026BaseIds = new Set<string>();

              for (const p of sortedPrograms) {
                const baseId = normalizeSchoolKey(p.id);
                const has2026 = !!match2026ToProgram(data2026, p);
                if (has2026) {
                  programsWith2026.push(p);
                  matched2026BaseIds.add(baseId);
                } else {
                  programsOnly2025.push(p);
                }
              }

              return (
                <>
                  {/* Obory 2026 */}
                  <h2 className="text-2xl font-bold mb-6">
                    Obory a zaměření
                    {programsWith2026.length > 0 && (
                      <span className="text-base font-normal text-slate-500 ml-2">přijímací řízení 2026</span>
                    )}
                  </h2>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {programsWith2026.map(program => {
                      const baseName = program.zamereni ? `${program.obor} - ${program.zamereni}` : program.obor;
                      const hasDuplicateName = (oborCountsOverview.get(baseName) || 0) > 1;
                      const matching2026 = match2026ToProgram(data2026, program);
                      return (
                        <ProgramCard
                          key={program.id}
                          program={program}
                          schoolNazev={overview.nazev}
                          redizo={redizo}
                          showStudyLength={hasDuplicateName}
                          trend={trendDataMap.get(program.id)}
                          data2026ForProgram={matching2026}
                        />
                      );
                    })}
                  </div>

                  {/* Obory pouze z 2025 (ukončené) */}
                  {programsOnly2025.length > 0 && (
                    <>
                      <h2 className="text-xl font-semibold mb-2 text-slate-600">
                        Obory z roku 2025
                      </h2>
                      <p className="text-sm text-slate-500 mb-4">
                        U těchto oborů nemáme jednoznačnou shodu s importem 2026. Neznamená to, že se neotevírají. Zobrazujeme historii 2025; nabídku 2027 ověřte u školy.
                      </p>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 opacity-75">
                        {programsOnly2025.map(program => {
                          const baseName = program.zamereni ? `${program.obor} - ${program.zamereni}` : program.obor;
                          const hasDuplicateName = (oborCountsOverview.get(baseName) || 0) > 1;
                          return (
                            <ProgramCard
                              key={program.id}
                              program={program}
                              schoolNazev={overview.nazev}
                              redizo={redizo}
                              showStudyLength={hasDuplicateName}
                              trend={trendDataMap.get(program.id)}
                            />
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              );
            })()}

            {/* InspIS profil školy */}
            {inspis && <SchoolInfoSection data={inspis} />}

            {/* Údaje potvrzené školou (Portál pro školy) */}
            <SchoolPortalSection zaznam={portalZaznam} />

            {/* Inspekce ČŠI */}
            <InspectionSummary
              extractions={extractions}
              csiData={csiData}
              schoolSlug={`${redizo}-${createSlug(overview.nazev)}`}
            />

            {/* Kontakt */}
            <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
              <h2 className="text-xl font-semibold mb-4">Kontakt</h2>
              <div className="space-y-2 text-slate-600">
                <p><strong>Adresa:</strong> {overview.adresa_plna}</p>
                <p><strong>Okres:</strong> {overview.okres}</p>
                <p><strong>Kraj:</strong> {krajNames[overview.kraj_kod] || overview.kraj}</p>
                <p><strong>Zřizovatel:</strong> {overview.zrizovatel}</p>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center">
              <Link
                href="/simulator"
                className="inline-block bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Vyzkoušet v simulátoru
              </Link>
            </div>

            {/* Strojově čitelné formáty */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-center gap-3 text-xs text-slate-400">
              <span>Otevřená data:</span>
              <a
                href={`/skola/${slug}.md`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 hover:border-slate-300 hover:text-slate-600 transition-colors"
              >
                <span className="font-bold leading-none">M&#8595;</span>
                Markdown
              </a>
              <a
                href={`/skola/${slug}.json`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 hover:border-slate-300 hover:text-slate-600 transition-colors"
              >
                <span className="font-mono leading-none">&#123; &#125;</span>
                JSON
              </a>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // =====================
  // DETAIL OBORU/ZAMĚŘENÍ
  // =====================
  const program = pageInfo.program;
  if (!program) notFound();

  const category = categoryColors[school.category_code];

  // Načíst další data - pro zaměření použít specifickou funkci
  // Načíst data 2026
  const data2026ForDetail = await get2026DataByRedizo(redizo);
  const program2026 = match2026ToProgram(data2026ForDetail, program);

  const [detailedPrograms, extendedStats, csiData, extractions, programNote, schoolNote, results2026, portalZaznam] = await Promise.all([
    getProgramsByRedizo(redizo),
    getExtendedStatsForProgram(program.id),
    getCSIDataByRedizo(redizo),
    getExtractionsByRedizo(redizo),
    getNoteForSchool(program.id),   // poznámka specifická pro zaměření/obor
    getNoteForSchool(school.id),    // fallback: poznámka pro celý obor (bez zaměření)
    getSchoolResultsByRedizo(redizo),
    getPortalZaznam(redizo),
  ]);
  // Použít zaměření-specifickou poznámku, nebo fallback na obecnou
  const schoolNoteToShow = programNote || schoolNote;

  // Připravit data pro ProgramTabs
  // Zjistit duplicitní názvy oborů (různá délka studia, ale stejný název)
  const oborCounts = new Map<string, number>();
  for (const p of detailedPrograms) {
    const baseName = p.zamereni ? `${p.obor} - ${p.zamereni}` : p.obor;
    oborCounts.set(baseName, (oborCounts.get(baseName) || 0) + 1);
  }

  const programsForTabs = detailedPrograms.map(p => {
    const baseName = p.zamereni ? `${p.obor} - ${p.zamereni}` : p.obor;
    // Pokud je více oborů se stejným názvem, přidat délku studia
    const hasDuplicateName = (oborCounts.get(baseName) || 0) > 1;
    const displayName = hasDuplicateName ? `${baseName} (${p.delka_studia}leté)` : baseName;

    // Pro duplicitní názvy přidat délku studia do slugu
    const programSlug = p.zamereni
      ? hasDuplicateName
        ? `${redizo}-${createSlug(school.nazev, p.obor, p.zamereni, p.delka_studia)}`
        : `${redizo}-${createSlug(school.nazev, p.obor, p.zamereni)}`
      : hasDuplicateName
        ? `${redizo}-${createSlug(school.nazev, p.obor, undefined, p.delka_studia)}`
        : `${redizo}-${createSlug(school.nazev, p.obor)}`;

    return {
      id: p.id,
      nazev: p.nazev,
      obor: displayName,
      typ: p.typ,
      delka_studia: p.delka_studia,
      min_body: p.min_body,
      kapacita: p.kapacita,
      slug: programSlug,
      hasZamereni: !!p.zamereni,
      is_new_2026: p.is_new_2026,
      prev_zamereni_name: p.prev_zamereni_name,
    };
  });

  // Slug pro přehled školy
  const overviewSlug = `${redizo}-${createSlug(school.nazev)}`;
  const displayOborName = program.zamereni && program.zamereni !== program.obor ? `${program.obor} - ${program.zamereni}` : program.obor;

  // JSON-LD strukturovaná data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: school.nazev,
    description: `${displayOborName} - ${school.typ}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: school.obec,
      addressRegion: krajNames[school.kraj_kod] || school.kraj,
      addressCountry: 'CZ',
      streetAddress: school.adresa,
    },
  };

  // Nová stránka oboru ve třech otázkách (docs/vrstvy-stranky-oboru-2027.md).
  // Bez souhrnu 1. kola v zobrazeném ročníku zůstává starší podoba níže.
  const profil = await getProfilOboru(program.id, program.zamereni, redizo);
  if (profil) {
    const krajNazev = krajNames[school.kraj_kod] || school.kraj;
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        <main className="flex-1 bg-[#f4f7fb]">
          <div className="border-b border-slate-200 bg-white">
            <div className="mx-auto max-w-6xl px-4 pb-8 pt-4">
              <nav className="text-[14px] text-slate-500" aria-label="Drobečková navigace">
                <Link href="/" className="hover:text-[#0074e4]">Domů</Link>
                <span className="mx-1.5">/</span>
                <Link href={`/regiony/${krajSlug}`} className="hover:text-[#0074e4]">{krajNazev}</Link>
                <span className="mx-1.5">/</span>
                <Link href={`/skola/${overviewSlug}`} className="hover:text-[#0074e4]">{school.nazev}</Link>
              </nav>

              <div className="mt-6 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
                <div className="min-w-0 max-w-3xl">
                  <p className="text-[17px] font-semibold text-slate-600">
                    <Link href={`/skola/${overviewSlug}`} className="hover:text-[#0074e4]">{school.nazev}</Link>
                  </p>
                  <h1 className="mt-1 text-[32px] font-bold leading-[1.1] text-[#16325c] [text-wrap:balance] md:text-[44px]">
                    {displayOborName}<span className="text-slate-400">, {program.delka_studia}leté</span>
                  </h1>
                  <ul className="mt-4 flex flex-wrap gap-2 text-[14px] text-slate-700">
                    <li className="rounded-full bg-slate-100 px-3 py-1">{school.obec}, {krajNazev}</li>
                    {school.zrizovatel && <li className="rounded-full bg-slate-100 px-3 py-1">zřizovatel: {school.zrizovatel}</li>}
                    {school.prev_zamereni_name && profil.predchoziRok && (
                      <li className="rounded-full bg-slate-100 px-3 py-1">v roce {profil.predchoziRok} jako „{school.prev_zamereni_name}“</li>
                    )}
                  </ul>
                </div>
                <div className="flex flex-col items-start gap-3">
                  <UlozitObor programId={program.id} />
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[15px] font-semibold">
                    <Link href="/simulator" className="text-[#0074e4] hover:underline">Porovnat v simulátoru</Link>
                    <Link href={`/skola/${overviewSlug}`} className="text-[#0074e4] hover:underline">Přehled školy</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ProgramTabs programs={programsForTabs} currentProgramId={program.id} />

          {schoolNoteToShow && (
            <div className="mx-auto max-w-6xl px-4 pt-6">
              <SchoolNote note={schoolNoteToShow} />
            </div>
          )}

          <ProfilOboru data={profil} inspekceHref={extractions.length > 0 ? `/skola/${overviewSlug}/inspekce` : null} />

          <div className="mx-auto max-w-6xl space-y-6 px-4 pb-12">
            <SchoolPortalSection zaznam={portalZaznam} />

            <section className="grid gap-6 rounded-2xl bg-white p-6 shadow-[0_1px_0_#dbe3ec] md:grid-cols-2">
              <div>
                <h2 className="mb-3 text-[20px] font-bold text-[#16325c]">Kontakt</h2>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
                  <dt className="text-slate-500">Adresa</dt><dd className="text-slate-900">{school.adresa_plna || school.adresa}</dd>
                  <dt className="text-slate-500">Okres</dt><dd className="text-slate-900">{school.okres}</dd>
                  <dt className="text-slate-500">Kraj</dt><dd className="text-slate-900">{krajNazev}</dd>
                  <dt className="text-slate-500">Zřizovatel</dt><dd className="text-slate-900">{school.zrizovatel}</dd>
                  {profil.web && (<><dt className="text-slate-500">Web</dt><dd><a href={profil.web} rel="noopener noreferrer" className="break-all font-semibold text-[#0074e4] hover:underline">{profil.web.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a></dd></>)}
                </dl>
              </div>
              <div className="space-y-3 text-[15px] leading-relaxed text-slate-600">
                <h2 className="text-[20px] font-bold text-[#16325c]">Odkud údaje jsou</h2>
                <p>
                  Přijímací řízení: CERMAT, souhrny 1. kola a data o uchazečích. Inspekce: zprávy ČŠI. Kontakt a web: rejstřík škol MŠMT.
                  Jak přijímání a rozřazení uchazečů funguje, vysvětluje stránka <Link href="/jak-funguje-prijimani" className="font-semibold text-[#0074e4] hover:underline">Jak funguje přijímání</Link>.
                </p>
                <p className="flex flex-wrap items-center gap-2 text-[13px] text-slate-500">
                  Otevřená data:
                  <a href={`/skola/${overviewSlug}.md`} className="rounded border border-slate-200 px-2 py-0.5 hover:border-slate-300 hover:text-slate-700">Markdown</a>
                  <a href={`/skola/${overviewSlug}.json`} className="rounded border border-slate-200 px-2 py-0.5 hover:border-slate-300 hover:text-slate-700">JSON</a>
                </p>
              </div>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <nav className="text-sm text-slate-600">
              <Link href="/" className="hover:text-blue-600">Domů</Link>
              <span className="mx-2">/</span>
              <Link href="/skoly" className="hover:text-blue-600">Školy</Link>
              <span className="mx-2">/</span>
              <Link href={`/regiony/${krajSlug}`} className="hover:text-blue-600">
                {krajNames[school.kraj_kod] || school.kraj}
              </Link>
              <span className="mx-2">/</span>
              <Link href={`/skola/${overviewSlug}`} className="hover:text-blue-600">
                {school.nazev}
              </Link>
              <span className="mx-2">/</span>
              <span className="text-slate-900">{displayOborName}</span>
            </nav>
          </div>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-br from-blue-500 via-blue-500 to-blue-600 text-white py-12">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-wrap items-start gap-4 mb-4">
              <h1 className="text-2xl md:text-4xl font-bold">{school.nazev}</h1>
              <StudyLengthBadge delka={program.delka_studia} />
            </div>
            <p className="text-lg md:text-xl opacity-90 mb-2">
              {displayOborName}
            </p>
            {school.prev_zamereni_name && (
              <p className="text-sm opacity-70 mb-2">
                V roce 2025: &bdquo;{school.prev_zamereni_name}&ldquo;
              </p>
            )}
            {school.is_new_2026 && (
              <p className="text-sm mb-2">
                <span className="inline-block px-2 py-0.5 rounded-full bg-amber-400/30 text-amber-100 font-medium text-xs">
                  Obor v importu 2026
                </span>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm opacity-80">
              <span>{school.obec}, {krajNames[school.kraj_kod] || school.kraj}</span>
              <span>•</span>
              <span>{school.zrizovatel}</span>
              <span>•</span>
              <Link href={`/skola/${overviewSlug}`} className="underline hover:no-underline">
                Zpět na přehled školy
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`inline-block px-4 py-1 rounded-full text-sm font-medium ${category.bg} ${category.text}`}>
                {categoryLabels[school.category_code]}
              </span>
              {extractions.length > 0 && (
                <Link
                  href={`/skola/${overviewSlug}/inspekce`}
                  className="inline-block px-4 py-1 rounded-full text-sm font-medium bg-white/20 text-white hover:bg-white/30 transition-colors"
                >
                  Co si o škole myslí Školská inspekce?
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Navigace oborů */}
        <ProgramTabs programs={programsForTabs} currentProgramId={program.id} />

        {/* Poznámka ke škole/oboru */}
        {schoolNoteToShow && (
          <div className="max-w-6xl mx-auto px-4 pt-6">
            <SchoolNote note={schoolNoteToShow} />
          </div>
        )}

        {/* Banner přihlášek 2026 */}
        {program2026 && rokNabidky && (
          <div className="max-w-6xl mx-auto px-4 pt-8">
            <Applications2026Banner
              data2026={[program2026]}
              rok={rokNabidky}
              platnost={platnostNabidky}
              singleProgram
            />
          </div>
        )}
        {results2026.length > 0 && (
          <div className="max-w-6xl mx-auto px-4">
            <SchoolResults2026 results={results2026.filter(r => normalizeSchoolKey(r.offer_id ?? '') === normalizeSchoolKey(program.id))} />
          </div>
        )}

        {/* Oddělovač historických dat */}
        {(
          <div className="max-w-6xl mx-auto px-4 pt-8">
            <div className="bg-slate-100 border border-slate-200 rounded-xl px-6 py-4 flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-700">Data z přijímacího řízení 2025</h2>
                <p className="text-sm text-slate-500">Historický import 2025. Údaje nejsou podmínkami přijetí pro rok 2027.</p>
              </div>
            </div>
          </div>
        )}

        {/* Vibecoding promo */}
        <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
          <VibecordingPromo />
        </div>

        {/* Stats Grid */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          <StatsTab
            program={program}
            extendedStats={extendedStats}
            data2026={program2026}
            result2026={results2026.find(r => normalizeSchoolKey(r.offer_id ?? '') === normalizeSchoolKey(program.id))}
            souhrn={await getSouhrnNabidky(program.id)}
          />
          {rokPasem && (
            <PasmaPrijetiCard
              data={await getPasmaPrijeti(program.id)}
              rok={rokPasem}
              rokNabidky={rokNabidky}
              vypsana={!!program2026}
              nova={!!program2026?.is_new}
            />
          )}
          <DruheKoloCard data={await getDruheKolo(program.id, program.zamereni)} />
          <div className="my-6 rounded-xl bg-white p-6">
            <h2 className="font-semibold">Přijetí a kapacita · {program.rok ?? 2025}</h2>
            <p className="mt-2">Přijatí v roce {program.rok ?? 2025}: {program.prijati}. Kapacita: {program.kapacita} míst.</p>
          </div>

          {/* Interpretace */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl mb-8">
            <h3 className="font-semibold text-blue-800 mb-2">Co to znamená?</h3>
            <p className="text-blue-700">
              V roce {program.rok ?? 2025} bylo na tento obor podáno {program.prihlasky} přihlášek při kapacitě {program.kapacita} míst.
              Počet přihlášek zahrnuje všechny priority. Popisuje poptávku v daném ročníku, nikoli osobní pravděpodobnost přijetí.
              Kritéria pro rok 2027 ověřte u školy.
            </p>
          </div>

          {/* Inspekce ČŠI */}
          <InspectionSummary
            extractions={extractions}
            csiData={csiData}
            schoolSlug={overviewSlug}
          />

          {/* Údaje potvrzené školou (Portál pro školy) */}
          <SchoolPortalSection zaznam={portalZaznam} />

          {/* Adresa */}
          <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
            <h2 className="text-xl font-semibold mb-4">Kontakt</h2>
            <div className="space-y-2 text-slate-600">
              <p><strong>Adresa:</strong> {school.adresa_plna || school.adresa}</p>
              <p><strong>Okres:</strong> {school.okres}</p>
              <p><strong>Kraj:</strong> {krajNames[school.kraj_kod] || school.kraj}</p>
              <p><strong>Zřizovatel:</strong> {school.zrizovatel}</p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              href="/simulator"
              className="inline-block bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Vyzkoušet v simulátoru
            </Link>
          </div>

          {/* Strojově čitelné formáty */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-center gap-3 text-xs text-slate-400">
            <span>Otevřená data:</span>
            <a
              href={`/skola/${overviewSlug}.md`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 hover:border-slate-300 hover:text-slate-600 transition-colors"
            >
              <span className="font-bold leading-none">M&#8595;</span>
              Markdown
            </a>
            <a
              href={`/skola/${overviewSlug}.json`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 hover:border-slate-300 hover:text-slate-600 transition-colors"
            >
              <span className="font-mono leading-none">&#123; &#125;</span>
              JSON
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
