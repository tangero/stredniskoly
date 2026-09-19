import { StatsTab } from '@/components/school/detail/tabs/StatsTab';
import { normalizeSchoolKey, uniqueSchoolIndex } from '@/lib/school-key';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProgramTabs } from '@/components/ProgramTabs';
import { InspectionSummary } from '@/components/InspectionSummary';
import { SchoolPortalSection } from '@/components/school-profile/SchoolPortalSection';
import { getPortalZaznam } from '@/lib/portal-skol';
import { spravceProfilu } from '@/lib/portal-verejne';
import { getSchoolPageType, getSchoolOverview, getExtendedStatsForProgram, getProgramsByRedizo, SchoolProgram, getCSIDataByRedizo, getExtractionsByRedizo, get2026DataByRedizo, type School2026Data, getSchoolResultsByRedizo } from '@/lib/data';
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
import { getProfilSkoly } from '@/lib/skola-profil-data';
import { ProfilSkoly } from '@/components/skola/ProfilSkoly';
import { getProfilOboru } from '@/lib/obor-profil-data';
import { ProfilOboru } from '@/components/obor/ProfilOboru';
import { UlozitObor } from '@/components/obor/UlozitObor';
import { createSlug } from '@/lib/utils';
import { categoryLabels, categoryColors, krajNames } from '@/types/school';


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
  const oborNazev = program?.zamereni ? `${program.obor} - ${program.zamereni}` : program?.obor ?? school.obor;
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

export default async function SchoolDetailPage({ params }: Props) {
  const { slug } = await params;
  const pageInfo = await getSchoolPageType(slug);
  // Roky dat pro kartu pásem přijetí určuje registr stavu datových sad, ne kód.
  const rokPasem = await rokPasemPrijeti();
  const obdobiNabidky = await zobrazeneObdobi('cermat-prihlasky');
  const rokNabidky = obdobiNabidky ? Number(obdobiNabidky) : null;
  const platnostNabidky = await platnostObdobi('cermat-prihlasky');

  if (!pageInfo.school) {
    notFound();
  }

  // Základní adresa oboru bez zaměření nemá vlastní stránku: obor má jedinou kanonickou
  // adresu (docs/adresa-oboru-2027.md, kroky A a B). Trvale, protože adresy jsou indexované.
  if (pageInfo.presmerovatNa) {
    permanentRedirect(pageInfo.presmerovatNa);
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

    // Stránka školy v pěti otázkách (docs/stranka-skoly-2027.md) nahrazuje obě starší podoby přehledu.
      const nabidky2026 = await get2026DataByRedizo(redizo);
      const programy = [...overview.programs].sort((a, b) => a.obor.localeCompare(b.obor, 'cs') || b.delka_studia - a.delka_studia || a.id.localeCompare(b.id));
      const vypsane = new Set(programy.filter(p => match2026ToProgram(nabidky2026, p)).map(p => p.id));
      const prehled = `/skola/${redizo}-${createSlug(overview.nazev)}`;
      const profil = await getProfilSkoly(redizo, overview.nazev, programy, vypsane);
      return (
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <ProfilSkoly
              data={profil}
              skola={{
                nazev: overview.nazev,
                adresa: overview.adresa_plna || overview.adresa,
                obec: overview.obec,
                okres: overview.okres,
                kraj: krajNames[overview.kraj_kod] || overview.kraj,
                zrizovatel: overview.zrizovatel,
              }}
              odkazy={{ prehled, kraj: `/regiony/${krajSlug}`, inspekce: profil.inspekce ? `${prehled}/inspekce` : null }}
            />
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

  const [detailedPrograms, extendedStats, csiData, extractions, programNote, schoolNote, results2026, portalZaznam, spravceProfiluSkoly] = await Promise.all([
    getProgramsByRedizo(redizo),
    getExtendedStatsForProgram(program.id),
    getCSIDataByRedizo(redizo),
    getExtractionsByRedizo(redizo),
    getNoteForSchool(program.id),   // poznámka specifická pro zaměření/obor
    getNoteForSchool(school.id),    // fallback: poznámka pro celý obor (bez zaměření)
    getSchoolResultsByRedizo(redizo),
    getPortalZaznam(redizo),
    spravceProfilu(redizo),
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
      zakladniNazev: baseName,
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

          {/* Propagace služeb, které platí provoz webu: povinná součást všech stránek, nahoře */}
          <div className="mx-auto max-w-6xl px-4 pt-2">
            <VibecordingPromo />
          </div>

          <ProgramTabs programs={programsForTabs} currentProgramId={program.id} />

          {schoolNoteToShow && (
            <div className="mx-auto max-w-6xl px-4 pt-6">
              <SchoolNote note={schoolNoteToShow} />
            </div>
          )}

          <ProfilOboru data={profil} inspekceHref={extractions.length > 0 ? `/skola/${overviewSlug}/inspekce` : null} skolaHref={`/skola/${overviewSlug}`} />

          <div className="mx-auto max-w-6xl space-y-6 px-4 pb-12">
            <SchoolPortalSection zaznam={portalZaznam} spravce={spravceProfiluSkoly} />

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
                  Jak přijímání a rozřazení uchazečů funguje, vysvětluje stránka <Link href="/jak-vybrat-skolu#jak-se-rozhoduje" className="font-semibold text-[#0074e4] hover:underline">Jak funguje přijímání</Link>.
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
                {/* Ročník se bere z dat nabídky, nikdy z letopočtu v kódu; do 19. 9. 2026 tu stálo
                    napevno 2025, ačkoli registr zobrazoval jiné období. Když ročník neznáme,
                    neuvádí se — tvrdit rok, který nemáme čím doložit, je horší než mlčet. */}
                <h2 className="text-lg font-bold text-slate-700">
                  Data z přijímacího řízení{program.rok ? ` ${program.rok}` : ''}
                </h2>
                <p className="text-sm text-slate-500">
                  {program.rok && rokNabidky && program.rok < rokNabidky
                    ? `Poslední ročník, ve kterém se obor vypisoval, je ${program.rok}; web jinak zobrazuje ${rokNabidky}.`
                    : 'Údaje popisují uvedené přijímací řízení, nejsou podmínkami přijetí pro další ročník.'}
                </p>
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
            <h2 className="font-semibold">Přijetí a kapacita{program.rok ? ` · ${program.rok}` : ''}</h2>
            <p className="mt-2">Přijatí{program.rok ? ` v roce ${program.rok}` : ''}: {program.prijati}. Kapacita: {program.kapacita} míst.</p>
          </div>

          {/* Interpretace */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl mb-8">
            <h3 className="font-semibold text-blue-800 mb-2">Co to znamená?</h3>
            <p className="text-blue-700">
              {program.rok ? `V roce ${program.rok} bylo` : 'Bylo'} na tento obor podáno {program.prihlasky} přihlášek při kapacitě {program.kapacita} míst.
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
          <SchoolPortalSection zaznam={portalZaznam} spravce={spravceProfiluSkoly} />

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
