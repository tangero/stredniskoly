import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getSchoolBySlug, generateAllSlugs } from '@/lib/data';
import { getDifficultyClass, getDemandClass, formatNumber, createSlug } from '@/lib/utils';
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
            <h1 className="text-2xl md:text-4xl font-bold mb-2">{school.nazev}</h1>
            <p className="text-lg md:text-xl opacity-90 mb-4">{school.obor}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm opacity-80">
              <span>{school.obec}, {krajNames[school.kraj_kod] || school.kraj}</span>
              <span>•</span>
              <span>{school.typ} • {school.delka_studia}leté studium</span>
            </div>
            <div className="mt-4">
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
              <div className="text-3xl font-bold text-indigo-600">{school.min_body}</div>
              <div className="text-sm text-slate-600 mt-1">Min. body 2025</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="text-3xl font-bold text-indigo-600">{school.prumer_body?.toFixed(0) || '-'}</div>
              <div className="text-sm text-slate-600 mt-1">Průměr bodů</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="text-3xl font-bold text-indigo-600">{school.index_poptavky.toFixed(1)}</div>
              <div className="text-sm text-slate-600 mt-1">Index poptávky {demand.emoji}</div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="text-3xl font-bold text-indigo-600">{school.kapacita}</div>
              <div className="text-sm text-slate-600 mt-1">Kapacita míst</div>
            </div>
            <div className={`bg-white p-6 rounded-xl shadow-sm text-center border-l-4 ${difficulty.colorClass === 'text-red-600' ? 'border-red-500' : difficulty.colorClass === 'text-yellow-600' ? 'border-yellow-500' : 'border-green-500'}`}>
              <div className={`text-3xl font-bold ${difficulty.colorClass}`}>{school.obtiznost.toFixed(0)}</div>
              <div className="text-sm text-slate-600 mt-1">Obtížnost ({difficulty.label})</div>
            </div>
          </div>

          {/* Přihlášky a přijetí */}
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
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Priority uchazečů</h2>
              <div className="space-y-3">
                {school.priority_pcts.slice(0, 3).map((pct, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{idx + 1}. priorita</span>
                      <span className="font-medium">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${idx === 0 ? 'bg-green-500' : idx === 1 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-500 mt-4">
                {school.priority_pcts[0] > 50
                  ? 'Většina přijatých měla tuto školu jako 1. prioritu.'
                  : 'Škola je častěji volena jako záložní varianta.'}
              </p>
            </div>
          </div>

          {/* Interpretace */}
          <div className="bg-indigo-50 border-l-4 border-indigo-500 p-6 rounded-r-xl mb-8">
            <h3 className="font-semibold text-indigo-800 mb-2">Co to znamená?</h3>
            <p className="text-indigo-700">
              {school.index_poptavky >= 3
                ? `O tuto školu je vysoký zájem (${school.index_poptavky.toFixed(1)}x více přihlášek než míst). Doporučujeme mít záložní variantu.`
                : school.index_poptavky >= 2
                ? `Střední konkurence (${school.index_poptavky.toFixed(1)}x více přihlášek než míst). S dobrými body máte slušnou šanci.`
                : `Nízká konkurence (${school.index_poptavky.toFixed(1)}x). Šance na přijetí jsou vysoké i s průměrnými body.`}
            </p>
          </div>

          {/* Adresa */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Kontakt</h2>
            <div className="space-y-2 text-slate-600">
              <p><strong>Adresa:</strong> {school.adresa_plna || school.adresa}</p>
              <p><strong>Okres:</strong> {school.okres}</p>
              <p><strong>Kraj:</strong> {krajNames[school.kraj_kod] || school.kraj}</p>
              <p><strong>Zřizovatel:</strong> {school.zrizovatel}</p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 text-center">
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
