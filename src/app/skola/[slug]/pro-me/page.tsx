import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getSchoolPageType, getExtendedSchoolStats } from '@/lib/data';
import { krajNames } from '@/types/school';
import { createSlug } from '@/lib/utils';
import { GuidedJourneyWizard } from '@/components/school/guided/GuidedJourneyWizard';

interface Props {
  params: Promise<{ slug: string }>;
}

// ISR config
export const revalidate = 3600;

// Metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pageInfo = await getSchoolPageType(slug);

  if (!pageInfo.school || !pageInfo.program) {
    return { title: 'Škola nenalezena' };
  }

  const school = pageInfo.school;
  const program = pageInfo.program;
  const title = `Je ${school.nazev} pro mě?`;
  const description = `Personalizované doporučení pro ${program.obor} na ${school.nazev}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Přijímačky na střední školy`,
      description,
      type: 'article',
    },
  };
}

export default async function GuidedJourneyPage({ params }: Props) {
  const { slug } = await params;
  const pageInfo = await getSchoolPageType(slug);

  if (!pageInfo.school || !pageInfo.program) {
    notFound();
  }

  const school = pageInfo.school;
  const program = pageInfo.program;
  const redizo = pageInfo.redizo;

  // Load extended stats for calculations
  const extendedStats = await getExtendedSchoolStats(school.id);

  const overviewSlug = `${redizo}-${createSlug(school.nazev)}`;
  const krajSlug = createSlug(krajNames[school.kraj_kod] || school.kraj);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-slate-50">
        {/* Breadcrumb */}
        <div className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <nav className="text-sm text-slate-600">
              <a href="/" className="hover:text-blue-600">
                Domů
              </a>
              <span className="mx-2">/</span>
              <a href="/skoly" className="hover:text-blue-600">
                Školy
              </a>
              <span className="mx-2">/</span>
              <a href={`/regiony/${krajSlug}`} className="hover:text-blue-600">
                {krajNames[school.kraj_kod] || school.kraj}
              </a>
              <span className="mx-2">/</span>
              <a href={`/skola/${overviewSlug}`} className="hover:text-blue-600">
                {school.nazev}
              </a>
              <span className="mx-2">/</span>
              <span className="text-slate-900">Je to pro mě?</span>
            </nav>
          </div>
        </div>

        {/* Wizard */}
        <GuidedJourneyWizard school={school} program={program} extendedStats={extendedStats} overviewSlug={overviewSlug} slug={slug} />
      </main>

      <Footer />
    </div>
  );
}
