import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getSchoolPageType, getSchoolOverview, getExtractionsByRedizo, getCSIDataByRedizo } from '@/lib/data';
import { createSlug } from '@/lib/utils';
import { krajNames, InspectionExtraction } from '@/types/school';

interface Props {
  params: Promise<{ slug: string }>;
}

// Stránky inspekce se renderují on-demand (ne při buildu),
// aby nepřekročily Vercel deployment size limit (75 MB).
// Po prvním požadavku se cachují.

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pageInfo = await getSchoolPageType(slug);

  if (!pageInfo.school) {
    return { title: 'Inspekce nenalezena' };
  }

  const school = pageInfo.school;
  const title = `Inspekce ČŠI - ${school.nazev}`;
  const description = `Podrobné shrnutí inspekční zprávy ČŠI pro ${school.nazev}, ${school.obec}. AI analýza silných stránek, rizik a doporučení.`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Přijímačky na střední školy`,
      description,
      type: 'article',
      url: `/skola/${slug}/inspekce`,
    },
  };
}

function formatCzechDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HardFactValue({ value }: { value: any }) {
  // Pole stringů (support_services, safety_climate, partnerships_practice)
  if (Array.isArray(value)) {
    return (
      <ul className="space-y-1">
        {value.map((item, i) => (
          <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
            {String(item)}
          </li>
        ))}
      </ul>
    );
  }

  // Objekt s trend/key_numbers/evidence (maturita, absence)
  if (typeof value === 'object' && value !== null) {
    return (
      <div className="space-y-1">
        {value.trend && (
          <p className="text-sm font-medium text-slate-800">{value.trend}</p>
        )}
        {Array.isArray(value.key_numbers) && value.key_numbers.length > 0 && (
          <ul className="space-y-0.5">
            {value.key_numbers.map((item: string, i: number) => (
              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        )}
        {value.evidence && (
          <p className="text-xs text-slate-500 italic mt-1">{value.evidence}</p>
        )}
      </div>
    );
  }

  // Prostý string
  return <p className="text-sm text-slate-700">{String(value)}</p>;
}

function InspectionContent({ extraction }: { extraction: InspectionExtraction }) {
  return (
      <div className="px-6 pb-6 space-y-6">
        {/* Shrnutí */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
          <p className="text-slate-700 leading-relaxed">{extraction.plain_czech_summary}</p>
        </div>

        {/* Kontext školy */}
        {extraction.school_profile?.school_change_summary && (
          <div className="bg-slate-50 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Kontext školy</h4>
            <p className="text-slate-700 text-sm">{extraction.school_profile.school_change_summary}</p>
          </div>
        )}

        {/* Silné stránky */}
        {extraction.strengths.length > 0 && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-bold text-green-700 uppercase tracking-wide mb-3">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Silné stránky
            </h4>
            <div className="space-y-2">
              {extraction.strengths.map((s, i) => (
                <div key={i} className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="font-semibold text-green-800 text-sm">{s.tag}</div>
                  {s.detail && <p className="text-slate-700 text-sm mt-1">{s.detail}</p>}
                  {s.evidence && <p className="text-slate-500 text-xs italic mt-1">{s.evidence}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rizika */}
        {extraction.risks.length > 0 && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-bold text-red-700 uppercase tracking-wide mb-3">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Rizika
            </h4>
            <div className="space-y-2">
              {extraction.risks.map((r, i) => (
                <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="font-semibold text-red-800 text-sm">{r.tag}</div>
                  {r.detail && <p className="text-slate-700 text-sm mt-1">{r.detail}</p>}
                  {r.evidence && <p className="text-slate-500 text-xs italic mt-1">{r.evidence}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Komu škola sedí / Kdo by měl zvážit */}
        <div className="grid md:grid-cols-2 gap-4">
          {extraction.who_school_fits.length > 0 && (
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="text-sm font-bold text-purple-700 mb-2">Komu škola sedí</h4>
              <ul className="space-y-1">
                {extraction.who_school_fits.map((w, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {extraction.who_should_be_cautious.length > 0 && (
            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="text-sm font-bold text-orange-700 mb-2">Kdo by měl zvážit</h4>
              <ul className="space-y-1">
                {extraction.who_should_be_cautious.map((w, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Otázky na den otevřených dveří */}
        {extraction.questions_for_open_day.length > 0 && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="text-sm font-bold text-yellow-700 mb-2">Otázky na den otevřených dveří</h4>
            <ol className="list-decimal list-inside space-y-1">
              {extraction.questions_for_open_day.map((q, i) => (
                <li key={i} className="text-sm text-slate-700">{q}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Hard facts */}
        {Object.keys(extraction.hard_facts).length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Fakta ze zprávy</h4>
            <div className="grid md:grid-cols-2 gap-3">
              {Object.entries(extraction.hard_facts).map(([key, value]) => {
                if (!value) return null;
                const labels: Record<string, string> = {
                  maturita: 'Maturita',
                  absence: 'Absence',
                  support_services: 'Podpůrné služby',
                  safety_climate: 'Bezpečí a klima',
                  partnerships_practice: 'Partnerství a praxe',
                };
                return (
                  <div key={key} className="bg-slate-50 p-3 rounded-lg">
                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">{labels[key] || key}</div>
                    <HardFactValue value={value} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PDF odkaz */}
        {extraction.source_url && (
          <div className="pt-2">
            <a
              href={extraction.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Celá zpráva ČŠI (PDF)
            </a>
          </div>
        )}
      </div>
  );
}

export default async function InspectionPage({ params }: Props) {
  const { slug } = await params;
  const pageInfo = await getSchoolPageType(slug);

  if (!pageInfo.school) {
    notFound();
  }

  const school = pageInfo.school;
  const redizo = pageInfo.redizo;
  const extractions = await getExtractionsByRedizo(redizo);

  if (extractions.length === 0) {
    notFound();
  }

  const overviewSlug = `${redizo}-${createSlug(school.nazev)}`;
  const krajSlug = createSlug(krajNames[school.kraj_kod] || school.kraj);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-3">
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
              <span className="text-slate-900">Inspekce ČŠI</span>
            </nav>
          </div>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-br from-blue-500 via-blue-500 to-blue-600 text-white py-10">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{school.nazev}</h1>
            <p className="text-lg opacity-90">
              Inspekční zprávy ČŠI — podrobné shrnutí
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm opacity-80 mt-3">
              <span>{school.obec}, {krajNames[school.kraj_kod] || school.kraj}</span>
              <span>•</span>
              <span>{extractions.length} {extractions.length === 1 ? 'inspekce' : extractions.length < 5 ? 'inspekce' : 'inspekcí'}</span>
              <span>•</span>
              <Link href={`/skola/${overviewSlug}`} className="underline hover:no-underline">
                Zpět na přehled školy
              </Link>
            </div>
          </div>
        </div>

        {/* Obsah */}
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          {/* Nejnovější inspekce — vždy rozbalená */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-slate-900">
                  Inspekce {formatCzechDate(extractions[0].date)}
                </span>
                {extractions[0].date_to && (
                  <span className="text-sm text-slate-500">
                    – {formatCzechDate(extractions[0].date_to)}
                  </span>
                )}
              </div>
            </div>
            <InspectionContent extraction={extractions[0]} />
          </div>

          {/* Starší inspekce — sbalené */}
          {extractions.slice(1).map((extraction) => (
            <details key={extraction.report_id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <summary className="px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-slate-900">
                    Inspekce {formatCzechDate(extraction.date)}
                  </span>
                  {extraction.date_to && (
                    <span className="text-sm text-slate-500">
                      – {formatCzechDate(extraction.date_to)}
                    </span>
                  )}
                </div>
                <svg className="w-5 h-5 text-slate-400 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>
              <InspectionContent extraction={extraction} />
            </details>
          ))}

          {/* Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              <strong>Upozornění:</strong> Toto shrnutí bylo vytvořeno automaticky pomocí AI na základě inspekčních zpráv
              České školní inspekce. Může obsahovat nepřesnosti. Vždy ověřte informace v originální zprávě ČŠI.
            </p>
          </div>

          {/* Zpět */}
          <div className="text-center pt-4">
            <Link
              href={`/skola/${overviewSlug}`}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Zpět na přehled školy
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
