'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SchoolInspisData } from '@/types/inspis';

interface SchoolTabProps {
  school: any;
  inspis: SchoolInspisData | null;
  extractions: any[];
  csiData: any;
  overviewSlug: string;
}

// Helper functions
function formatTuition(value: number | null): string {
  if (value === null) return 'Neuvedeno';
  if (value === 0) return 'Zdarma';
  return `${value.toLocaleString('cs-CZ')} Kč/rok`;
}

function yesNo(value: boolean | null): string {
  if (value === null) return 'Neuvedeno';
  return value ? 'Ano' : 'Ne';
}

function renderList(values: string[] | null): string {
  if (!values || values.length === 0) return 'Neuvedeno';
  return values.join(', ');
}

// Admission card
function AdmissionCard({ data }: { data: SchoolInspisData }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <h3 className="font-semibold text-slate-900 mb-4">Přijímací řízení</h3>

      <div className="space-y-3 text-sm">
        <div>
          <div className="text-slate-500 mb-1">Forma</div>
          <div className="text-slate-900">{data.prijimaci_zkousky || 'Neuvedeno'}</div>
        </div>

        {data.zkousky_z_predmetu && data.zkousky_z_predmetu.length > 0 && (
          <div>
            <div className="text-slate-500 mb-1">Předměty</div>
            <div className="text-slate-900">{renderList(data.zkousky_z_predmetu)}</div>
          </div>
        )}

        <div>
          <div className="text-slate-500 mb-1">Termín</div>
          <div className="text-slate-900">{data.termin_prijimacich_zkousek || 'Neuvedeno'}</div>
        </div>

        <div className="flex items-center justify-between py-2 border-t border-slate-100">
          <span className="text-slate-600">Přípravné kurzy</span>
          <span className="font-medium text-slate-900">{yesNo(data.pripravne_kurzy)}</span>
        </div>

        <div className="flex items-center justify-between py-2 border-t border-slate-100">
          <span className="text-slate-600">Dny otevřených dveří</span>
          <span className="font-medium text-slate-900">{data.dny_otevrenych_dveri || 'Neuvedeno'}</span>
        </div>
      </div>
    </div>
  );
}

// Languages card
function LanguagesCard({ data }: { data: SchoolInspisData }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <h3 className="font-semibold text-slate-900 mb-4">Jazyky</h3>

      <div className="space-y-3 text-sm">
        {data.vyuka_jazyku && data.vyuka_jazyku.length > 0 && (
          <div>
            <div className="text-slate-500 mb-2">Výuka jazyků</div>
            <div className="flex flex-wrap gap-2">
              {data.vyuka_jazyku.map((lang, idx) => (
                <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600">CLIL metoda</span>
            <span className="font-medium text-slate-900">{yesNo(data.clil_metoda)}</span>
          </div>

          {data.clil_jazyky && data.clil_jazyky.length > 0 && (
            <div className="text-xs text-slate-500 mt-1">V jazycích: {renderList(data.clil_jazyky)}</div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Internet ve výuce</span>
            <span className="font-medium text-slate-900">{yesNo(data.vyuziti_internetu_ve_vyuce)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Facilities card (collapsible)
function FacilitiesCard({ data }: { data: SchoolInspisData }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Vybavení školy</h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          {expanded ? (
            <>
              Skrýt <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              Zobrazit více <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      <div className={cn('space-y-3 text-sm', !expanded && 'max-h-32 overflow-hidden')}>
        {data.odborne_ucebny && data.odborne_ucebny.length > 0 && (
          <div>
            <div className="text-slate-500 mb-1">Odborné učebny</div>
            <div className="text-slate-700">{renderList(data.odborne_ucebny)}</div>
          </div>
        )}

        {data.prostory_telocvik && data.prostory_telocvik.length > 0 && (
          <div>
            <div className="text-slate-500 mb-1">Tělocvik</div>
            <div className="text-slate-700">{renderList(data.prostory_telocvik)}</div>
          </div>
        )}

        <div className="flex items-center justify-between py-2 border-t border-slate-100">
          <span className="text-slate-600">Přístup k PC</span>
          <span className="font-medium text-slate-900">{yesNo(data.pristup_k_pc)}</span>
        </div>

        {data.mista_volny_cas && data.mista_volny_cas.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-slate-500 mb-2">Místa volného času ve škole</div>
            <div className="flex flex-wrap gap-1.5">
              {data.mista_volny_cas.map((place, idx) => (
                <span key={idx} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full">
                  {place}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Activities card (modal trigger)
function ActivitiesCard({ data }: { data: SchoolInspisData }) {
  const hasActivities =
    (data.zajmove_cinnosti && data.zajmove_cinnosti.length > 0) ||
    (data.sportovni_kurzy && data.sportovni_kurzy.length > 0) ||
    (data.specificke_akce && data.specificke_akce.length > 0);

  if (!hasActivities) {
    return null;
  }

  const totalActivities =
    (data.zajmove_cinnosti?.length || 0) +
    (data.sportovni_kurzy?.length || 0) +
    (data.specificke_akce?.length || 0);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <h3 className="font-semibold text-slate-900 mb-4">Aktivity a zájmové kroužky</h3>

      <div className="space-y-2 text-sm">
        {data.zajmove_cinnosti && data.zajmove_cinnosti.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.zajmove_cinnosti.slice(0, 6).map((activity, idx) => (
              <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                {activity}
              </span>
            ))}
          </div>
        )}

        {totalActivities > 6 && (
          <div className="text-xs text-slate-500">a dalších {totalActivities - 6} aktivit...</div>
        )}
      </div>

      {/* TODO: Add modal trigger */}
      <button className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors">
        Zobrazit všech {totalActivities} aktivit
        <ExternalLink className="w-4 h-4" />
      </button>
    </div>
  );
}

// AI Summary card (from extractions)
function AISummaryCard({ extractions }: { extractions: any[] }) {
  if (!extractions || extractions.length === 0) {
    return null;
  }

  const latestExtraction = extractions[0];

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900">🤖 AI shrnutí inspekční zprávy</h3>
        <span className="text-xs px-2 py-1 bg-white/80 rounded text-purple-700">AI</span>
      </div>

      <p className="text-sm text-slate-700 leading-relaxed">
        {latestExtraction.plain_czech_summary || 'Shrnutí není k dispozici'}
      </p>

      {latestExtraction.inspection_date && (
        <div className="mt-3 text-xs text-slate-500">Inspekce: {latestExtraction.inspection_date}</div>
      )}
    </div>
  );
}

// Main SchoolTab component
export function SchoolTab({ school, inspis, extractions, csiData, overviewSlug }: SchoolTabProps) {
  if (!inspis) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Informace o škole nejsou k dispozici.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Summary (if available) */}
      {extractions && extractions.length > 0 && <AISummaryCard extractions={extractions} />}

      {/* Grid layout */}
      <div className="grid md:grid-cols-2 gap-6">
        <AdmissionCard data={inspis} />
        <LanguagesCard data={inspis} />
        <FacilitiesCard data={inspis} />
        <ActivitiesCard data={inspis} />
      </div>

      {/* Link to full inspection report */}
      {extractions && extractions.length > 0 && (
        <div className="text-center">
          <a
            href={`/skola/${overviewSlug}/inspekce`}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            Zobrazit kompletní inspekční zprávu
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
}
