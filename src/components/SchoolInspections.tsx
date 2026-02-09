'use client';

import { CSISchoolData } from '@/types/school';

interface SchoolInspectionsProps {
  csiData: CSISchoolData | null;
}

/**
 * Komponenta pro zobrazení inspekčních zpráv ČŠI
 */
export function SchoolInspections({ csiData }: SchoolInspectionsProps) {
  if (!csiData || csiData.inspectionCount === 0) {
    return null;
  }

  // Formátovat datum
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Získat rok z data
  const getYear = (dateStr: string) => {
    return new Date(dateStr).getFullYear();
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">Inspekční zprávy ČŠI</h2>
          <p className="text-sm text-slate-600">
            {csiData.inspectionCount === 1
              ? '1 inspekční zpráva'
              : `${csiData.inspectionCount} inspekční zprávy`}
            {' '}z posledních 10 let
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-blue-500">📅</span>
          <span className="text-slate-700">
            Poslední: {formatDate(csiData.lastInspectionDate!)}
          </span>
        </div>
      </div>

      {/* Seznam inspekčních zpráv */}
      <div className="space-y-3">
        {csiData.inspections.map((inspection, idx) => (
          <div
            key={idx}
            className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-blue-500">📄</span>
                  <span className="font-medium text-slate-900">
                    Inspekce {getYear(inspection.dateFrom)}
                  </span>
                  {idx === 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                      Nejnovější
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-600">
                  {formatDate(inspection.dateFrom)}
                  {' – '}
                  {formatDate(inspection.dateTo)}
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href={inspection.reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Zpráva (PDF) ↗
                </a>
                <a
                  href={inspection.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                >
                  Profil ČŠI ↗
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ O inspekčních zprávách:</strong> Zprávy publikuje{' '}
          <a
            href="https://www.csicr.cz"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium hover:text-blue-900"
          >
            Česká školní inspekce
          </a>
          . Obsahují hodnocení kvality vzdělávání, plnění vzdělávacích cílů a dodržování
          právních předpisů.
        </p>
      </div>
    </div>
  );
}

/**
 * Badge pro zobrazení informace o inspekci (např. v seznamu škol)
 */
interface InspectionBadgeProps {
  csiData: CSISchoolData | null;
}

export function InspectionBadge({ csiData }: InspectionBadgeProps) {
  if (!csiData || csiData.inspectionCount === 0) return null;

  const lastDate = csiData.lastInspectionDate ? new Date(csiData.lastInspectionDate) : null;
  if (!lastDate) return null;

  const now = new Date();
  const yearsDiff = now.getFullYear() - lastDate.getFullYear();

  let badgeText = '';
  let colorClasses = '';

  if (yearsDiff === 0) {
    badgeText = 'Inspekce letos';
    colorClasses = 'bg-green-100 text-green-700 border-green-300';
  } else if (yearsDiff === 1) {
    badgeText = 'Inspekce vloni';
    colorClasses = 'bg-blue-100 text-blue-700 border-blue-300';
  } else if (yearsDiff <= 2) {
    badgeText = 'Inspekce nedávno';
    colorClasses = 'bg-blue-50 text-blue-600 border-blue-200';
  } else {
    badgeText = `${csiData.inspectionCount}× inspekce`;
    colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${colorClasses}`}>
      <span>📋</span>
      {badgeText}
    </div>
  );
}
