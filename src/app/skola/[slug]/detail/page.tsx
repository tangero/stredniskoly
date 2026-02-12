import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import {
  getSchoolPageType,
  getSchoolDetail,
  getExtendedSchoolStats,
  getProgramsByRedizo,
  getCSIDataByRedizo,
  getExtractionsByRedizo,
  getInspisDataByRedizo,
} from '@/lib/data';
import { krajNames } from '@/types/school';
import { createSlug } from '@/lib/utils';

// V2 Detail komponenty
import { DetailHero } from '@/components/school/detail/DetailHero';
import { DetailTabs } from '@/components/school/detail/DetailTabs';

interface Props {
  params: Promise<{ slug: string }>;
}

// ISR config
export const revalidate = 3600;

// Metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pageInfo = await getSchoolPageType(slug);

  if (!pageInfo.school) {
    return { title: 'Škola nenalezena' };
  }

  const school = pageInfo.school;
  const title = `${school.nazev} - Detail`;
  const description = `Detailní informace, statistiky a srovnání pro ${school.nazev}`;

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

export default async function SchoolDetailPageV2({ params }: Props) {
  const { slug } = await params;
  const pageInfo = await getSchoolPageType(slug);

  if (!pageInfo.school) {
    notFound();
  }

  const school = pageInfo.school;
  const redizo = pageInfo.redizo;

  // Pro overview typ (více oborů) - redirect na overview page
  if (pageInfo.type === 'overview') {
    redirect(`/skola/${slug}`);
  }

  // Detail oboru
  const program = pageInfo.program;
  if (!program) {
    notFound();
  }

  // Načíst všechna potřebná data
  const [detailedPrograms, schoolDetail, extendedStats, csiData, extractions, inspis] =
    await Promise.all([
      getProgramsByRedizo(redizo),
      getSchoolDetail(program.id),
      getExtendedSchoolStats(school.id),
      getCSIDataByRedizo(redizo),
      getExtractionsByRedizo(redizo),
      getInspisDataByRedizo(redizo),
    ]);

  const overviewSlug = `${redizo}-${createSlug(school.nazev)}`;
  const krajSlug = createSlug(krajNames[school.kraj_kod] || school.kraj);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-3">
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
              <span className="text-slate-900">Detail</span>
            </nav>
          </div>
        </div>

        {/* Detail Hero */}
        <DetailHero
          schoolName={school.nazev}
          programName={program.zamereni ? `${program.obor} - ${program.zamereni}` : program.obor}
          location={school.obec}
          kraj={krajNames[school.kraj_kod] || school.kraj}
          minBody={program.min_body}
          indexPoptavky={program.index_poptavky}
          studyLength={program.delka_studia}
          overviewSlug={overviewSlug}
        />

        {/* Detail Tabs */}
        <DetailTabs
          school={school}
          program={program}
          programs={detailedPrograms}
          schoolDetail={schoolDetail}
          extendedStats={extendedStats}
          csiData={csiData}
          extractions={extractions}
          inspis={inspis}
          overviewSlug={overviewSlug}
        />
      </main>

      <Footer />
    </div>
  );
}
