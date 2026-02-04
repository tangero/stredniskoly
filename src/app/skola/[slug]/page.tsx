import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ApplicantChoicesSection, PriorityDistributionBar, ApplicantStrategyAnalysis, AcceptanceByPriority, TestDifficulty, SchoolDifficultyProfile, StatsGrid, CohortDistribution, ProgramTabs } from '@/components/SchoolDetailClient';
import { getSchoolPageType, getSchoolOverview, getSchoolDetail, getExtendedSchoolStats, getExtendedStatsForProgram, getSchoolDifficultyProfile, getProgramsByRedizo, SchoolProgram } from '@/lib/data';
import { getDifficultyClass, getDemandClass, formatNumber, createSlug } from '@/lib/utils';
import { categoryLabels, categoryColors, krajNames, getSchoolTypeFullName } from '@/types/school';

interface Props {
  params: Promise<{ slug: string }>;
}

// Generování statických cest pro všechny školy
export async function generateStaticParams() {
  const { generateAllSlugs } = await import('@/lib/data');
  const slugs = await generateAllSlugs();
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
        title: `${title} | Přijímačky na SŠ`,
        description,
        type: 'article',
        url: `/skola/${slug}`,
      },
    };
  }

  // Detail oboru/zaměření
  const program = pageInfo.program;
  const oborNazev = program?.zamereni ? `${program.obor} - ${program.zamereni}` : school.obor;
  const title = `${school.nazev} - ${oborNazev}`;
  const description = `Přijímací zkoušky ${school.nazev}: ${oborNazev}. Min. body ${program?.min_body || school.min_body}. ${school.obec}, ${krajNames[school.kraj_kod] || school.kraj}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Přijímačky na SŠ`,
      description,
      type: 'article',
      url: `/skola/${slug}`,
    },
  };
}

// Helper pro délku studia badge
function StudyLengthBadge({ typ, delka }: { typ: string; delka: number }) {
  const colors: Record<number, string> = {
    4: 'bg-blue-100 text-blue-800',
    6: 'bg-purple-100 text-purple-800',
    8: 'bg-indigo-100 text-indigo-800',
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
function ProgramCard({ program, schoolNazev, redizo }: { program: SchoolProgram; schoolNazev: string; redizo: string }) {
  const difficulty = getDifficultyClass(program.index_poptavky * 20); // Přibližný odhad obtížnosti
  const demand = getDemandClass(program.index_poptavky);

  // Vytvořit slug pro detail
  const programSlug = program.zamereni
    ? `${redizo}-${createSlug(schoolNazev, program.obor, program.zamereni)}`
    : `${redizo}-${createSlug(schoolNazev, program.obor)}`;

  const displayName = program.zamereni
    ? `${program.obor} - ${program.zamereni}`
    : program.obor;

  return (
    <Link
      href={`/skola/${programSlug}`}
      className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="font-semibold text-lg text-slate-900">{displayName}</h3>
            <p className="text-sm text-slate-500">
              {getSchoolTypeFullName(program.typ, program.obor)}
            </p>
          </div>
          <StudyLengthBadge typ={program.typ} delka={program.delka_studia} />
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{program.min_body}</div>
            <div className="text-xs text-slate-500">Min. body</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-700">{program.kapacita}</div>
            <div className="text-xs text-slate-500">Kapacita</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-700">
              {program.index_poptavky.toFixed(1)}× {demand.emoji}
            </div>
            <div className="text-xs text-slate-500">Poptávka</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-sm">
          <span className="text-slate-500">
            {program.prihlasky} přihlášek → {program.prijati} přijatých
          </span>
          <span className="text-indigo-600 font-medium">Detail →</span>
        </div>
      </div>
    </Link>
  );
}

export default async function SchoolDetailPage({ params }: Props) {
  const { slug } = await params;
  const pageInfo = await getSchoolPageType(slug);

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

    // Seřadit programy podle min_body (nejobtížnější první)
    const sortedPrograms = [...overview.programs].sort((a, b) => b.min_body - a.min_body);

    // Spočítat celkovou kapacitu a statistiky
    const totalKapacita = sortedPrograms.reduce((sum, p) => sum + p.kapacita, 0);
    const totalPrihlasky = sortedPrograms.reduce((sum, p) => sum + p.prihlasky, 0);

    return (
      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1">
          {/* Breadcrumb */}
          <div className="bg-white border-b">
            <div className="max-w-6xl mx-auto px-4 py-3">
              <nav className="text-sm text-slate-600">
                <Link href="/" className="hover:text-indigo-600">Domů</Link>
                <span className="mx-2">/</span>
                <Link href="/skoly" className="hover:text-indigo-600">Školy</Link>
                <span className="mx-2">/</span>
                <Link href={`/regiony/${krajSlug}`} className="hover:text-indigo-600">
                  {krajNames[school.kraj_kod] || school.kraj}
                </Link>
                <span className="mx-2">/</span>
                <span className="text-slate-900">{overview.nazev}</span>
              </nav>
            </div>
          </div>

          {/* Header */}
          <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 text-white py-12">
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
            </div>
          </div>

          {/* Statistiky přehledu */}
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                <div className="text-3xl font-bold text-indigo-600">{sortedPrograms.length}</div>
                <div className="text-sm text-slate-500">Oborů/zaměření</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                <div className="text-3xl font-bold text-slate-700">{totalKapacita}</div>
                <div className="text-sm text-slate-500">Celková kapacita</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                <div className="text-3xl font-bold text-slate-700">{totalPrihlasky}</div>
                <div className="text-sm text-slate-500">Přihlášek celkem</div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                <div className="text-3xl font-bold text-red-600">
                  {Math.min(...sortedPrograms.map(p => p.min_body))} - {Math.max(...sortedPrograms.map(p => p.min_body))}
                </div>
                <div className="text-sm text-slate-500">Rozsah min. bodů</div>
              </div>
            </div>

            {/* Seznam oborů */}
            <h2 className="text-2xl font-bold mb-6">Obory a zaměření</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {sortedPrograms.map(program => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  schoolNazev={overview.nazev}
                  redizo={redizo}
                />
              ))}
            </div>

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
                className="inline-block bg-indigo-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
              >
                Vyzkoušet v simulátoru
              </Link>
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
  const [detailedPrograms, schoolDetail, extendedStats, difficultyProfile] = await Promise.all([
    getProgramsByRedizo(redizo),
    getSchoolDetail(program.id),
    pageInfo.type === 'zamereni'
      ? getExtendedStatsForProgram(program.id)
      : getExtendedSchoolStats(school.id),
    getSchoolDifficultyProfile(school.id, school.typ, program.min_body),
  ]);

  // Připravit data pro ProgramTabs
  const programsForTabs = detailedPrograms.map(p => {
    const displayName = p.zamereni ? `${p.obor} - ${p.zamereni}` : p.obor;
    const programSlug = p.zamereni
      ? `${redizo}-${createSlug(school.nazev, p.obor, p.zamereni)}`
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
              <Link href="/" className="hover:text-indigo-600">Domů</Link>
              <span className="mx-2">/</span>
              <Link href="/skoly" className="hover:text-indigo-600">Školy</Link>
              <span className="mx-2">/</span>
              <Link href={`/regiony/${krajSlug}`} className="hover:text-indigo-600">
                {krajNames[school.kraj_kod] || school.kraj}
              </Link>
              <span className="mx-2">/</span>
              <Link href={`/skola/${overviewSlug}`} className="hover:text-indigo-600">
                {school.nazev}
              </Link>
              <span className="mx-2">/</span>
              <span className="text-slate-900">{displayOborName}</span>
            </nav>
          </div>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 text-white py-12">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-wrap items-start gap-4 mb-4">
              <h1 className="text-2xl md:text-4xl font-bold">{school.nazev}</h1>
              <StudyLengthBadge typ={program.typ} delka={program.delka_studia} />
            </div>
            <p className="text-lg md:text-xl opacity-90 mb-4">
              {displayOborName}
            </p>
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
            </div>
          </div>
        </div>

        {/* Navigace oborů */}
        <ProgramTabs programs={programsForTabs} currentProgramId={program.id} />

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
                schoolType={school.typ}
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
                  <span className="text-slate-600">Min. skóre pro přijetí:</span>
                  <span className="font-semibold text-red-600">{program.min_body}</span>
                </div>
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
          <div className="bg-indigo-50 border-l-4 border-indigo-500 p-6 rounded-r-xl mb-8">
            <h3 className="font-semibold text-indigo-800 mb-2">Co to znamená?</h3>
            <p className="text-indigo-700">
              {program.index_poptavky >= 3
                ? `O tento obor je vysoký zájem (${program.index_poptavky.toFixed(1)}× více přihlášek než míst). Doporučujeme mít záložní variantu.`
                : program.index_poptavky >= 2
                ? `Střední konkurence (${program.index_poptavky.toFixed(1)}× více přihlášek než míst). S dobrými body máte slušnou šanci.`
                : `Nízká konkurence (${program.index_poptavky.toFixed(1)}×). Šance na přijetí jsou vysoké i s průměrnými body.`}
            </p>
          </div>

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
              className="inline-block bg-indigo-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Vyzkoušet v simulátoru
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
