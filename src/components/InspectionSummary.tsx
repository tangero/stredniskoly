'use client';

import Link from 'next/link';
import { InspectionExtraction, CSISchoolData } from '@/types/school';

interface InspectionSummaryProps {
  extractions: InspectionExtraction[];
  csiData: CSISchoolData | null;
  schoolSlug: string;  // overview slug školy (pro link na /skola/[slug]/inspekce)
}

/**
 * Kompaktní blok "Co zjistila inspekce" na stránce školy.
 * Zobrazí shrnutí z AI extrakce + tagy silných stránek/rizik.
 * Pokud extrakce nejsou dostupné, zobrazí fallback z CSI dat.
 */
export function InspectionSummary({ extractions, csiData, schoolSlug }: InspectionSummaryProps) {
  // Pokud máme AI extrakci, zobrazit kompaktní box
  if (extractions.length > 0) {
    const latest = extractions[0];
    return <ExtractionBox extraction={latest} schoolSlug={schoolSlug} />;
  }

  // Fallback: pouze CSI data bez AI extrakce
  if (csiData && csiData.inspectionCount > 0) {
    return <CSIFallback csiData={csiData} />;
  }

  return null;
}

function formatCzechDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('cs-CZ', {
    month: 'long',
    year: 'numeric',
  });
}

const MAX_TAGS = 3;

function ExtractionBox({ extraction, schoolSlug }: { extraction: InspectionExtraction; schoolSlug: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-8">
      <div className="flex items-start justify-between mb-3">
        <h2 className="text-xl font-semibold text-slate-900">Co zjistila inspekce</h2>
        <span className="text-sm text-slate-500 whitespace-nowrap ml-4">
          {formatCzechDate(extraction.date)}
        </span>
      </div>

      {/* Shrnutí */}
      <p className="text-slate-700 leading-relaxed mb-4">
        {extraction.plain_czech_summary}
      </p>

      {/* Tagy silných stránek */}
      {extraction.strengths.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {extraction.strengths.slice(0, MAX_TAGS).map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-sm rounded-full border border-green-200"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              {s.tag}
            </span>
          ))}
        </div>
      )}

      {/* Tagy rizik */}
      {extraction.risks.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {extraction.risks.slice(0, MAX_TAGS).map((r, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-sm rounded-full border border-amber-200"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              {r.tag}
            </span>
          ))}
        </div>
      )}

      {/* Link na podrobné shrnutí */}
      <div className="flex items-center gap-4 mb-3">
        <Link
          href={`/skola/${schoolSlug}/inspekce`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-lg transition-colors"
        >
          Podrobné shrnutí inspekce
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* AI disclaimer */}
      <p className="text-xs text-slate-400">
        Shrnutí vytvořeno automaticky na základě inspekční zprávy ČŠI. Ověřte v originální zprávě.
      </p>
    </div>
  );
}

function CSIFallback({ csiData }: { csiData: CSISchoolData }) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const latest = csiData.inspections[0];
  if (!latest) return null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-8">
      <div className="flex items-start justify-between mb-3">
        <h2 className="text-xl font-semibold text-slate-900">Inspekce ČŠI</h2>
        <span className="text-sm text-slate-500">
          {csiData.inspectionCount} {csiData.inspectionCount === 1 ? 'zpráva' : csiData.inspectionCount < 5 ? 'zprávy' : 'zpráv'}
        </span>
      </div>

      <div className="space-y-2">
        {csiData.inspections.slice(0, 3).map((inspection, idx) => (
          <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
            <span className="text-sm text-slate-600">
              {formatDate(inspection.dateFrom)} – {formatDate(inspection.dateTo)}
            </span>
            <div className="flex gap-2">
              <a
                href={inspection.reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Zpráva (PDF)
              </a>
              <a
                href={inspection.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Profil ČŠI
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
