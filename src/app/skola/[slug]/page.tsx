import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ApplicantChoicesSection, PriorityDistributionBar, ApplicantStrategyAnalysis, AcceptanceByPriority, TestDifficulty, SchoolDifficultyProfile, StatsGrid, CohortDistribution, ProgramTabs } from '@/components/SchoolDetailClient';
import { InspectionSummary } from '@/components/InspectionSummary';
import { SchoolInfoSection } from '@/components/school-profile/SchoolInfoSection';
import { getSchoolPageType, getSchoolOverview, getSchoolDetail, getExtendedSchoolStats, getExtendedStatsForProgram, getSchoolDifficultyProfile, getProgramsByRedizo, getTrendDataForProgram, getTrendDataForPrograms, SchoolProgram, YearlyTrendData, getCSIDataByRedizo, getExtractionsByRedizo, getInspisDataByRedizo, get2026DataByRedizo, type School2026Data } from '@/lib/data';
import { Applications2026Banner } from '@/components/Applications2026Banner';
import { VibecordingPromo } from '@/components/VibecordingPromo';
import { getNoteForSchool } from '@/lib/school-notes';
import { SchoolNote } from '@/components/SchoolNote';
import { getDifficultyClass, getDemandClass, formatNumber, createSlug } from '@/lib/utils';
import { categoryLabels, categoryColors, krajNames, getSchoolTypeFullName } from '@/types/school';

// V2 Overview komponenty
import {
  OverviewHero,
  PriorityCardsGrid,
  QuickFactsCard,
  CSISummaryCard,
  CTASection,
  QuickFact,
} from '@/components/school/overview';
import { calculateAllPriorities } from '@/lib/priorities';

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
  const description = `Přijímací zkoušky ${school.nazev}: ${oborNazev}. Min. body ${program?.min_body || school.min_body}. ${school.obec}, ${krajNames[school.kraj_kod] || school.kraj}`;

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
  const exact = data2026.find(d => d.id === program.id);
  if (exact) return exact;

  const programBaseId = program.id.split('_').slice(0, 2).join('_');
  const candidates = data2026.filter(d => {
    const baseId = d.id.split('_').slice(0, 2).join('_');
    return baseId === programBaseId;
  });

  if (candidates.length <= 1) return candidates[0];

  if (program.zamereni) {
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 3);
    const programWords = norm(program.zamereni);

    let bestMatch: School2026Data | undefined;
    let bestScore = -1;

    for (const c of candidates) {
      const idZamPart = c.id.split('_').slice(2).join(' ');
      if (!idZamPart) continue;
      const candidateWords = norm(idZamPart);
      const score = programWords.filter(w => candidateWords.some(cw => cw.includes(w) || w.includes(cw))).length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = c;
      }
    }
    if (bestMatch && bestScore > 0) return bestMatch;
  }

  return candidates[0];
}

// Helper pro zobrazení trendu min. bodů
function MinBodyTrend({ trend }: { trend: YearlyTrendData | null }) {
  if (!trend || trend.minBody2024 === 0) return null;

  const change = trend.minBodyChange;
  const isUp = change > 0;
  const isDown = change < 0;

  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-slate-400">2024:</span>
      <span className="font-medium text-slate-500">{trend.minBody2024}</span>
      {change !== 0 && (
        <span className={`font-medium ${isDown ? 'text-green-600' : isUp ? 'text-red-600' : 'text-slate-500'}`}>
          ({isDown ? '' : '+'}{change})
        </span>
      )}
    </div>
  );
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
function ProgramCard({ program, schoolNazev, redizo, showStudyLength, trend, data2026ForProgram }: {
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
              Nové 2026
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
            {/* Doplňkový řádek s 2025 daty */}
            <div className="mt-3 pt-3 border-t border-slate-50 grid grid-cols-3 gap-4 text-xs text-slate-400">
              <div className="text-center">
                <span className="font-medium text-red-600">{program.min_body}</span> min. body 2025
              </div>
              <div className="text-center">
                {program.kapacita} míst 2025
              </div>
              <div className="text-center">
                {program.prihlasky} přihl. 2025
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{program.min_body}</div>
              <div className="text-xs text-slate-500">Min. body 2025</div>
              {trend && <MinBodyTrend trend={trend} />}
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
    const [csiData, extractions, inspis, data2026] = await Promise.all([
      getCSIDataByRedizo(redizo),
      getExtractionsByRedizo(redizo),
      inspisEnabled ? getInspisDataByRedizo(redizo) : Promise.resolve(null),
      get2026DataByRedizo(redizo),
    ]);

    // Seřadit programy podle min_body (nejobtížnější první)
    const sortedPrograms = [...overview.programs].sort((a, b) => b.min_body - a.min_body);

    // Spočítat celkovou kapacitu a statistiky
    const totalKapacita = sortedPrograms.reduce((sum, p) => sum + p.kapacita, 0);
    const totalPrihlasky = sortedPrograms.reduce((sum, p) => sum + p.prihlasky, 0);

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

      // Vypočítat priority scores
      const priorities = calculateAllPriorities({
        minBody: program.min_body,
        obtiznost: school.obtiznost,
        indexPoptavky: program.index_poptavky,
        kapacita: program.kapacita,
        prihlasky: program.prihlasky,
        prijati: program.prijati,
        typ: school.typ,
      });

      // Quick facts pro kartu
      const quickFacts: QuickFact[] = [
        { label: "Min. body", value: program.min_body },
        { label: "Kapacita", value: program.kapacita },
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
              {data2026.length > 0 && (
                <Applications2026Banner
                  data2026={data2026}
                  totalKapacita2025={totalKapacita}
                  totalPrihlasky2025={totalPrihlasky}
                />
              )}

              {/* Priority Cards */}
              <PriorityCardsGrid priorities={priorities} />

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
              const has2026 = data2026.length > 0;
              const totalKapacita2026 = has2026 ? data2026.reduce((sum, d) => sum + d.kapacita, 0) : 0;
              const totalPrihlasky2026 = has2026 ? data2026.reduce((sum, d) => sum + d.prihlasky, 0) : 0;
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                    <div className="text-3xl font-bold text-blue-600">{sortedPrograms.length}</div>
                    <div className="text-sm text-slate-500">Oborů/zaměření</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                    <div className="text-3xl font-bold text-slate-700">{has2026 ? totalKapacita2026 : totalKapacita}</div>
                    <div className="text-sm text-slate-500">Celková kapacita {has2026 ? '2026' : '2025'}</div>
                    {has2026 && totalKapacita !== totalKapacita2026 && (
                      <div className="text-xs text-slate-400">(2025: {totalKapacita})</div>
                    )}
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                    <div className="text-3xl font-bold text-slate-700">{has2026 ? totalPrihlasky2026 : totalPrihlasky}</div>
                    <div className="text-sm text-slate-500">Přihlášek {has2026 ? '2026' : '2025'}</div>
                    {has2026 && (
                      <div className="text-xs text-slate-400">(2025: {totalPrihlasky})</div>
                    )}
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                    <div className="text-3xl font-bold text-red-600">
                      {Math.min(...sortedPrograms.map(p => p.min_body))} - {Math.max(...sortedPrograms.map(p => p.min_body))}
                    </div>
                    <div className="text-sm text-slate-500">Rozsah min. bodů 2025</div>
                  </div>
                </div>
              );
            })()}

            {/* Banner přihlášek 2026 */}
            {data2026.length > 0 && (
              <Applications2026Banner
                data2026={data2026}
                totalKapacita2025={totalKapacita}
                totalPrihlasky2025={totalPrihlasky}
              />
            )}

            {/* Rozdělit programy na ty s 2026 daty a ty pouze z 2025 */}
            {(() => {
              // Matchování programů s 2026 daty
              const programsWith2026: typeof sortedPrograms = [];
              const programsOnly2025: typeof sortedPrograms = [];
              const matched2026BaseIds = new Set<string>();

              for (const p of sortedPrograms) {
                const baseId = p.id.split('_').slice(0, 2).join('_');
                const has2026 = data2026.some(d => {
                  const d2026BaseId = d.id.split('_').slice(0, 2).join('_');
                  return d2026BaseId === baseId;
                });
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
                        Tyto obory se v roce 2026 na této škole neotevírají. Zobrazujeme data z roku 2025 pro orientaci.
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

  const difficulty = getDifficultyClass(school.obtiznost);
  const demand = getDemandClass(program.index_poptavky);
  const category = categoryColors[school.category_code];

  // Načíst další data - pro zaměření použít specifickou funkci
  // Načíst data 2026
  const data2026ForDetail = await get2026DataByRedizo(redizo);
  const program2026 = match2026ToProgram(data2026ForDetail, program);

  const [detailedPrograms, schoolDetail, extendedStats, difficultyProfile, trendData, csiData, extractions, programNote, schoolNote] = await Promise.all([
    getProgramsByRedizo(redizo),
    getSchoolDetail(program.id),
    pageInfo.type === 'zamereni'
      ? getExtendedStatsForProgram(program.id)
      : getExtendedSchoolStats(school.id),
    getSchoolDifficultyProfile(program.id, program.typ),
    getTrendDataForProgram(program.id),
    getCSIDataByRedizo(redizo),
    getExtractionsByRedizo(redizo),
    getNoteForSchool(program.id),   // poznámka specifická pro zaměření/obor
    getNoteForSchool(school.id),    // fallback: poznámka pro celý obor (bez zaměření)
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
  const displayOborName = program.zamereni ? `${program.obor} - ${program.zamereni}` : program.obor;

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
                  Nový obor 2026
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
        {program2026 && (
          <div className="max-w-6xl mx-auto px-4 pt-8">
            <Applications2026Banner
              data2026={[program2026]}
              totalKapacita2025={program.kapacita}
              totalPrihlasky2025={program.prihlasky}
              singleProgram
            />
          </div>
        )}

        {/* Oddělovač historických dat */}
        {program2026 && (
          <div className="max-w-6xl mx-auto px-4 pt-8">
            <div className="bg-slate-100 border border-slate-200 rounded-xl px-6 py-4 flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-700">Data z přijímacího řízení 2025</h2>
                <p className="text-sm text-slate-500">Výsledky loňského přijímacího řízení — minimální body, rozložení priorit a strategie uchazečů</p>
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
          <StatsGrid
            totalApplicants={program.prihlasky}
            priority1Count={extendedStats?.prihlasky_priority?.[0] || 0}
            minBody={program.min_body}
            jpzMin={extendedStats?.jpz_min || 0}
            cjAtJpzMin={extendedStats?.cj_at_jpz_min || 0}
            maAtJpzMin={extendedStats?.ma_at_jpz_min || 0}
            hasExtraCriteria={extendedStats?.hasExtraCriteria || false}
            extraBody={extendedStats?.extra_body || 0}
            obtiznost={school.obtiznost}
            indexPoptavky={program.index_poptavky}
            kapacita={program.kapacita}
            trendData={trendData}
            prijati2024={trendData?.prijati2024}
          />

          {/* Priority Distribution Bar */}
          {extendedStats && (
            <div className="mb-8">
              <PriorityDistributionBar
                priorityPcts={school.priority_pcts}
                prihlasky_priority={extendedStats.prihlasky_priority}
                prijati_priority={extendedStats.prijati_priority}
              />
            </div>
          )}

          {/* Kam se hlásí ostatní uchazeči */}
          {schoolDetail && (
            <div className="mb-8">
              <ApplicantChoicesSection
                schoolDetail={schoolDetail}
                priorityCounts={school.priority_counts}
              />
            </div>
          )}

          {/* Analýza strategií uchazečů */}
          {schoolDetail && (
            <div className="mb-8">
              <ApplicantStrategyAnalysis
                schoolDetail={schoolDetail}
                currentSchoolMinBody={program.min_body}
              />
            </div>
          )}

          {/* Šance přijetí podle priority a Náročnost testů */}
          {extendedStats && (
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {extendedStats.prihlasky_priority.length > 0 && extendedStats.prijati_priority.length > 0 && (
                <AcceptanceByPriority
                  prihlasky_priority={extendedStats.prihlasky_priority}
                  prijati_priority={extendedStats.prijati_priority}
                />
              )}
              {(extendedStats.cj_prumer > 0 || extendedStats.ma_prumer > 0) && (
                <TestDifficulty
                  cj_prumer={extendedStats.cj_prumer}
                  cj_at_jpz_min={extendedStats.cj_at_jpz_min}
                  ma_prumer={extendedStats.ma_prumer}
                  ma_at_jpz_min={extendedStats.ma_at_jpz_min}
                  jpz_min={extendedStats.jpz_min}
                />
              )}
            </div>
          )}

          {/* Profily přijatých studentů */}
          {extendedStats?.cohorts && (
            <div className="mb-8">
              <CohortDistribution cohorts={extendedStats.cohorts} />
            </div>
          )}

          {/* Profil náročnosti školy */}
          {difficultyProfile && extendedStats && (
            <div className="mb-8">
              <SchoolDifficultyProfile
                profile={difficultyProfile}
                schoolType={program.typ}
                cjPrumer={extendedStats.cj_prumer}
                maPrumer={extendedStats.ma_prumer}
                jpzMin={extendedStats.jpz_min}
                minBody={program.min_body}
                extraBody={extendedStats.extra_body}
                hasExtraCriteria={extendedStats.hasExtraCriteria}
              />
            </div>
          )}

          {/* Přihlášky a přijetí + Detail body */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Přihlášky a přijetí 2025</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Počet přihlášek:</span>
                  <span className="font-semibold">{formatNumber(program.prihlasky)}</span>
                </div>
                {trendData && trendData.prihlasky2024 > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 pl-4">└ v roce 2024:</span>
                    <span className="font-medium text-slate-600">
                      {formatNumber(trendData.prihlasky2024)}
                      {trendData.prihlaskyChange !== 0 && (
                        <span className={`ml-2 ${trendData.prihlaskyDirection === 'down' ? 'text-green-600' : trendData.prihlaskyDirection === 'up' ? 'text-amber-600' : ''}`}>
                          ({trendData.prihlaskyChange > 0 ? '+' : ''}{trendData.prihlaskyChange.toFixed(0)}%)
                        </span>
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Počet přijatých:</span>
                  <span className="font-semibold">{formatNumber(program.prijati)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Kapacita:</span>
                  <span className="font-semibold">{formatNumber(program.kapacita)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Index poptávky:</span>
                  <span className="font-semibold">{program.index_poptavky.toFixed(2)}× {demand.emoji}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Bodové statistiky</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Min. skóre pro přijetí (2025):</span>
                  <span className="font-semibold text-red-600">{program.min_body}</span>
                </div>
                {trendData && trendData.minBody2024 > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 pl-4">└ v roce 2024:</span>
                    <span className="font-medium text-slate-600">
                      {trendData.minBody2024}
                      {trendData.minBodyChange !== 0 && (
                        <span className={`ml-2 ${trendData.minBodyChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ({trendData.minBodyChange > 0 ? '+' : ''}{trendData.minBodyChange} bodů)
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {extendedStats && extendedStats.hasExtraCriteria && (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 pl-4">└ z toho JPZ (ČJ+MA):</span>
                      <span className="font-medium text-slate-700">{extendedStats.jpz_min}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 pl-4">└ body za další kritéria:</span>
                      <span className="font-medium text-amber-600">+{extendedStats.extra_body}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Obtížnost přijetí:</span>
                  <span className={`font-semibold ${difficulty.colorClass}`}>
                    {school.obtiznost.toFixed(0)} ({difficulty.label})
                  </span>
                </div>
              </div>
              {extendedStats && extendedStats.hasExtraCriteria && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg text-xs text-amber-700">
                  <strong>Poznámka:</strong> Tento obor přidává ke skóre z JPZ ještě body za další kritéria
                  (typicky prospěch na ZŠ). Pro férové srovnání s ostatními školami používáme v percentilech
                  náročnosti pouze čisté JPZ body ({extendedStats.jpz_min} b.).
                </div>
              )}
            </div>
          </div>

          {/* Interpretace */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl mb-8">
            <h3 className="font-semibold text-blue-800 mb-2">Co to znamená?</h3>
            <p className="text-blue-700">
              {program.index_poptavky >= 3
                ? `O tento obor je vysoký zájem (${program.index_poptavky.toFixed(1)}× více přihlášek než míst). Doporučujeme mít záložní variantu.`
                : program.index_poptavky >= 2
                ? `Střední konkurence (${program.index_poptavky.toFixed(1)}× více přihlášek než míst). S dobrými body máte slušnou šanci.`
                : `Nízká konkurence (${program.index_poptavky.toFixed(1)}×). Šance na přijetí jsou vysoké i s průměrnými body.`}
            </p>
          </div>

          {/* Inspekce ČŠI */}
          <InspectionSummary
            extractions={extractions}
            csiData={csiData}
            schoolSlug={overviewSlug}
          />

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
