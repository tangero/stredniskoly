'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SchoolDetail, RelatedSchool } from '@/types/school';

// Lokální verze createSlug pro client component
function createSlug(name: string, obor?: string): string {
  let slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (obor) {
    const oborSlug = obor
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    slug = `${slug}-${oborSlug}`;
  }

  return slug;
}

// Deduplikace a agregace škol podle ID
function deduplicateSchools(schools: RelatedSchool[]): RelatedSchool[] {
  const schoolMap = new Map<string, RelatedSchool>();

  for (const school of schools) {
    const existing = schoolMap.get(school.id);
    if (existing) {
      // Agregovat počty a procenta
      existing.count += school.count;
      existing.pct += school.pct;
    } else {
      schoolMap.set(school.id, { ...school });
    }
  }

  // Seřadit podle procent sestupně
  return Array.from(schoolMap.values()).sort((a, b) => b.pct - a.pct);
}

interface Props {
  schoolDetail: SchoolDetail | null;
  priorityCounts: number[];
}

function RelatedSchoolCard({ school }: { school: RelatedSchool }) {
  const slug = `${school.id.split('_')[0]}-${createSlug(school.nazev, school.obor)}`;

  return (
    <Link
      href={`/skola/${slug}`}
      className="block p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border-l-4 border-indigo-400"
    >
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="font-medium">{school.nazev}</div>
          <div className="text-sm text-slate-600">{school.obor} • {school.obec}</div>
        </div>
        <div className="text-right ml-4">
          <div className="text-lg font-bold text-indigo-600">{school.pct.toFixed(1)}%</div>
          <div className="text-xs text-slate-500">{school.count} uch. • min: {school.min_body} b.</div>
        </div>
      </div>
    </Link>
  );
}

export function ApplicantChoicesSection({ schoolDetail, priorityCounts }: Props) {
  const [selectedPriority, setSelectedPriority] = useState<1 | 2 | 3>(1);

  if (!schoolDetail) {
    return null;
  }

  const p1Count = priorityCounts[0] || 0;
  const p2Count = priorityCounts[1] || 0;
  const p3Count = priorityCounts[2] || 0;

  // Získat data podle vybrané priority
  const getRelatedSchools = () => {
    if (selectedPriority === 1 && schoolDetail.as_p1) {
      // Kombinovat a deduplikovat záložní volby
      const allBackup = [
        ...(schoolDetail.as_p1.backup_p2 || []),
        ...(schoolDetail.as_p1.backup_p3 || [])
      ];
      return {
        total: schoolDetail.as_p1.total,
        backup: deduplicateSchools(allBackup),
        label: '1. volbu',
        description: 'Kam dali své záložní volby?'
      };
    }
    if (selectedPriority === 2 && schoolDetail.as_p2) {
      return {
        total: schoolDetail.as_p2.total,
        preferred: deduplicateSchools(schoolDetail.as_p2.preferred_p1 || []),
        backup: deduplicateSchools(schoolDetail.as_p2.backup_p3 || []),
        label: '2. volbu',
        description: 'Jakou měli 1. volbu a kam dali 3. volbu?'
      };
    }
    if (selectedPriority === 3 && schoolDetail.as_p3) {
      // Kombinovat a deduplikovat preferované volby
      const allPreferred = [
        ...(schoolDetail.as_p3.preferred_p1 || []),
        ...(schoolDetail.as_p3.preferred_p2 || [])
      ];
      return {
        total: schoolDetail.as_p3.total,
        preferred: deduplicateSchools(allPreferred),
        label: '3. volbu',
        description: 'Jaké měli preferované volby?'
      };
    }
    return null;
  };

  const relatedData = getRelatedSchools();

  if (!relatedData || relatedData.total === 0) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold mb-2">Kam se hlásí ostatní uchazeči</h2>
      <p className="text-sm text-slate-600 mb-4">
        Vyberte, jakou prioritu měl tento obor u uchazečů, a uvidíte jejich ostatní volby.
      </p>

      {/* Priority tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedPriority(1)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            selectedPriority === 1
              ? 'bg-green-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Tento obor jako 1. volba
          <span className={`px-2 py-0.5 rounded text-xs ${
            selectedPriority === 1 ? 'bg-green-600' : 'bg-slate-200'
          }`}>
            {p1Count}
          </span>
        </button>
        <button
          onClick={() => setSelectedPriority(2)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            selectedPriority === 2
              ? 'bg-yellow-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Tento obor jako 2. volba
          <span className={`px-2 py-0.5 rounded text-xs ${
            selectedPriority === 2 ? 'bg-yellow-600' : 'bg-slate-200'
          }`}>
            {p2Count}
          </span>
        </button>
        <button
          onClick={() => setSelectedPriority(3)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            selectedPriority === 3
              ? 'bg-red-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Tento obor jako 3. volba
          <span className={`px-2 py-0.5 rounded text-xs ${
            selectedPriority === 3 ? 'bg-red-600' : 'bg-slate-200'
          }`}>
            {p3Count}
          </span>
        </button>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6">
        <p className="text-blue-800">
          <strong>{relatedData.total} uchazečů</strong> dalo tento obor jako svou{' '}
          <strong className={
            selectedPriority === 1 ? 'text-green-600' :
            selectedPriority === 2 ? 'text-yellow-600' : 'text-red-600'
          }>
            {relatedData.label}
          </strong>
          {selectedPriority === 1 ? ' (nejvíce chtěli)' : ''}. {relatedData.description}
        </p>
      </div>

      {/* Related schools - 1 sloupec */}
      <div className="space-y-6">
        {/* Preferred schools (for p2, p3) */}
        {relatedData.preferred && relatedData.preferred.length > 0 && (
          <div>
            <h3 className="font-medium text-sm text-slate-700 mb-3">
              {selectedPriority === 2 ? 'Jejich 1. volba (preferovaná škola):' : 'Jejich preferované volby:'}
            </h3>
            <div className="space-y-2">
              {relatedData.preferred.slice(0, 8).map((school) => (
                <RelatedSchoolCard key={school.id} school={school} />
              ))}
            </div>
          </div>
        )}

        {/* Backup schools */}
        {relatedData.backup && relatedData.backup.length > 0 && (
          <div>
            <h3 className="font-medium text-sm text-slate-700 mb-3">
              {selectedPriority === 1 ? 'Jejich záložní volby:' :
               selectedPriority === 2 ? 'Jejich 3. volba (záloha):' : ''}
            </h3>
            <div className="space-y-2">
              {relatedData.backup.slice(0, 8).map((school) => (
                <RelatedSchoolCard key={school.id} school={school} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Priority distribution bar component
export function PriorityDistributionBar({ priorityPcts }: { priorityPcts: number[] }) {
  const p1 = priorityPcts[0] || 0;
  const p2 = priorityPcts[1] || 0;
  const p3 = priorityPcts[2] || 0;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Rozložení priorit uchazečů</h2>

      {/* Stacked bar */}
      <div className="h-10 rounded-lg overflow-hidden flex mb-4">
        {p1 > 0 && (
          <div
            className="bg-green-500 flex items-center justify-center text-white text-sm font-medium"
            style={{ width: `${p1}%` }}
          >
            {p1.toFixed(1)}%
          </div>
        )}
        {p2 > 0 && (
          <div
            className="bg-yellow-500 flex items-center justify-center text-white text-sm font-medium"
            style={{ width: `${p2}%` }}
          >
            {p2.toFixed(1)}%
          </div>
        )}
        {p3 > 0 && (
          <div
            className="bg-red-500 flex items-center justify-center text-white text-sm font-medium"
            style={{ width: `${p3}%` }}
          >
            {p3.toFixed(1)}%
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <span>1. priorita: {p1.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
          <span>2. priorita: {p2.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span>3. priorita: {p3.toFixed(1)}%</span>
        </div>
      </div>

      {/* Interpretation */}
      <div className="mt-4 p-4 bg-slate-50 border-l-4 border-slate-300 rounded-r-lg">
        <p className="text-slate-700">
          {p1 > 50 ? (
            <>Škola má <strong className="text-green-600">silnou pozici první volby</strong>. Většina uchazečů ji chce nejvíce.</>
          ) : p1 > 30 ? (
            <>Škola má <strong className="text-yellow-600">vyvážené</strong> rozložení priorit. Přijímá uchazeče ze všech priorit.</>
          ) : (
            <>Škola je častěji volena jako <strong className="text-red-600">záložní varianta</strong>. Uchazeči ji dávají spíše jako 2. nebo 3. volbu.</>
          )}
        </p>
      </div>
    </div>
  );
}
