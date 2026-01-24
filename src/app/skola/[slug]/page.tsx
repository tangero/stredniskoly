import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ApplicantChoicesSection, PriorityDistributionBar } from '@/components/SchoolDetailClient';
import { getSchoolBySlug, generateAllSlugs, getSchoolsByRedizo, getSchoolDetail } from '@/lib/data';
import { getDifficultyClass, getDemandClass, formatNumber, createSlug, extractRedizo } from '@/lib/utils';
import { categoryLabels, categoryColors, krajNames } from '@/types/school';

interface Props {
  params: Promise<{ slug: string }>;
}

// Generování statických cest pro všechny školy
export async function generateStaticParams() {
  const slugs = await generateAllSlugs();
  return slugs;
}

// Dynamické SEO metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);

  if (!school) {
    return {
      title: 'Škola nenalezena',
    };
  }

  const title = `${school.nazev} - ${school.obor}`;
  const description = `Přijímací zkoušky ${school.nazev}: Min. body ${school.min_body}, index poptávky ${school.index_poptavky.toFixed(1)}. ${school.obec}, ${krajNames[school.kraj_kod] || school.kraj}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Přijímačky na SŠ`,
      description,
      type: 'article',
      url: `/skola/${slug}`,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `/skola/${slug}`,
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
  return (
    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${colors[delka] || 'bg-slate-100 text-slate-800'}`}>
      {delka}leté • {typ}
    </span>
  );
}

// Difficulty progress bar
function DifficultyBar({ obtiznost }: { obtiznost: number }) {
  const difficulty = getDifficultyClass(obtiznost);
  const percentage = Math.min(100, obtiznost);

  const barColor = obtiznost >= 70 ? 'bg-red-500' :
                   obtiznost >= 45 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm text-center">
      <div className={`text-3xl font-bold ${difficulty.colorClass}`}>{obtiznost.toFixed(0)}</div>
      <div className="text-sm text-slate-600 mt-1">Obtížnost přijetí</div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-3">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className={`text-xs font-medium mt-2 ${difficulty.colorClass}`}>
        {difficulty.label.toUpperCase()}
      </div>
    </div>
  );
}

export default async function SchoolDetailPage({ params }: Props) {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);

  if (!school) {
    notFound();
  }

  const difficulty = getDifficultyClass(school.obtiznost);
  const demand = getDemandClass(school.index_poptavky);
  const category = categoryColors[school.category_code];
  const krajSlug = createSlug(krajNames[school.kraj_kod] || school.kraj);
  const redizo = extractRedizo(school.id);

  // Načíst další data
  const [otherPrograms, schoolDetail] = await Promise.all([
    getSchoolsByRedizo(redizo),
    getSchoolDetail(school.id),
  ]);

  // Filtrovat ostatní obory (vyloučit aktuální)
  const otherProgramsFiltered = otherPrograms.filter(p => p.id !== school.id);

  // JSON-LD strukturovaná data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: school.nazev,
    description: `${school.obor} - ${school.typ}`,
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
              <Link href={`/region/${krajSlug}`} className="hover:text-indigo-600">
                {krajNames[school.kraj_kod] || school.kraj}
              </Link>
              <span className="mx-2">/</span>
              <span className="text-slate-900">{school.nazev}</span>
            </nav>
          </div>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 text-white py-12">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-wrap items-start gap-4 mb-4">
              <h1 className="text-2xl md:text-4xl font-bold">{school.nazev}</h1>
              <StudyLengthBadge typ={school.typ} delka={school.delka_studia} />
            </div>
            <p className="text-lg md:text-xl opacity-90 mb-4">{school.obor}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm opacity-80">
              <span>{school.obec}, {krajNames[school.kraj_kod] || school.kraj}</span>
              <span>•</span>
              <span>{school.zrizovatel}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`inline-block px-4 py-1 rounded-full text-sm font-medium ${category.bg} ${category.text}`}>
                {categoryLabels[school.category_code]}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="text-3xl font-bold text-indigo-600">{formatNumber(school.total_applicants)}</div>
              <div className="text-sm text-slate-600 mt-1">Uchazečů celkem</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="text-3xl font-bold text-indigo-600">{school.min_body}</div>
              <div className="text-sm text-slate-600 mt-1">Min. body 2025</div>
            </div>
            <DifficultyBar obtiznost={school.obtiznost} />
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="text-3xl font-bold text-indigo-600">{school.index_poptavky.toFixed(1)}×</div>
              <div className="text-sm text-slate-600 mt-1">Konkurence</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="text-3xl font-bold text-indigo-600">{school.kapacita}</div>
              <div className="text-sm text-slate-600 mt-1">Kapacita míst</div>
            </div>
          </div>

          {/* Priority Distribution Bar */}
          <div className="mb-8">
            <PriorityDistributionBar priorityPcts={school.priority_pcts} />
          </div>

          {/* Kam se hlásí ostatní uchazeči */}
          <div className="mb-8">
            <ApplicantChoicesSection
              schoolDetail={schoolDetail}
              priorityCounts={school.priority_counts}
            />
          </div>

          {/* Ostatní obory této školy */}
          {otherProgramsFiltered.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
              <h2 className="text-xl font-semibold mb-4">Další obory této školy</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherProgramsFiltered.map(program => {
                  const programSlug = `${extractRedizo(program.id)}-${createSlug(program.nazev, program.obor)}`;
                  const programCategory = categoryColors[program.category_code];
                  const programDifficulty = getDifficultyClass(program.obtiznost);

                  return (
                    <Link
                      key={program.id}
                      href={`/skola/${programSlug}`}
                      className="block p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">{program.obor}</div>
                        <StudyLengthBadge typ={program.typ} delka={program.delka_studia} />
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${programCategory.bg} ${programCategory.text}`}>
                          {categoryLabels[program.category_code]}
                        </span>
                        <div className="text-right">
                          <span className="text-slate-600">Min: </span>
                          <span className="font-medium">{program.min_body} b.</span>
                          <span className={`ml-2 ${programDifficulty.colorClass}`}>
                            ({program.obtiznost.toFixed(0)})
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Přihlášky a přijetí + Detail body */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Přihlášky a přijetí 2025</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Počet přihlášek:</span>
                  <span className="font-semibold">{formatNumber(school.prihlasky)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Počet přijatých:</span>
                  <span className="font-semibold">{formatNumber(school.prijati)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Kapacita:</span>
                  <span className="font-semibold">{formatNumber(school.kapacita)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Uchazečů celkem:</span>
                  <span className="font-semibold">{formatNumber(school.total_applicants)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Index poptávky:</span>
                  <span className="font-semibold">{school.index_poptavky.toFixed(2)}× {demand.emoji}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Bodové statistiky</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Minimální body:</span>
                  <span className="font-semibold text-red-600">{school.min_body}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Průměrné body:</span>
                  <span className="font-semibold">{school.prumer_body?.toFixed(1) || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Obtížnost přijetí:</span>
                  <span className={`font-semibold ${difficulty.colorClass}`}>
                    {school.obtiznost.toFixed(0)} ({difficulty.label})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interpretace */}
          <div className="bg-indigo-50 border-l-4 border-indigo-500 p-6 rounded-r-xl mb-8">
            <h3 className="font-semibold text-indigo-800 mb-2">Co to znamená?</h3>
            <p className="text-indigo-700">
              {school.index_poptavky >= 3
                ? `O tuto školu je vysoký zájem (${school.index_poptavky.toFixed(1)}× více přihlášek než míst). Doporučujeme mít záložní variantu.`
                : school.index_poptavky >= 2
                ? `Střední konkurence (${school.index_poptavky.toFixed(1)}× více přihlášek než míst). S dobrými body máte slušnou šanci.`
                : `Nízká konkurence (${school.index_poptavky.toFixed(1)}×). Šance na přijetí jsou vysoké i s průměrnými body.`}
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
