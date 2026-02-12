'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';
import { cn, createSlug } from '@/lib/utils';

interface CompetitionTabProps {
  school: any;
  program: any;
  schoolDetail: any;
}

// Competing school card
function CompetingSchoolCard({ competingSchool, currentMinBody }: { competingSchool: any; currentMinBody: number }) {
  const difficulty = competingSchool.min_body - currentMinBody;
  const slug = `${competingSchool.redizo}-${createSlug(competingSchool.nazev)}-${createSlug(competingSchool.obor)}`;

  return (
    <Link
      href={`/skola/${slug}/detail`}
      className="block bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-slate-900 truncate">{competingSchool.nazev}</h4>
          <p className="text-sm text-slate-600 truncate">{competingSchool.obor}</p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            <div className="text-slate-500">
              {competingSchool.percentage}% uchazečů ({competingSchool.count} lidí)
            </div>

            <div
              className={cn(
                'flex items-center gap-1 font-medium',
                difficulty < 0 ? 'text-green-600' : difficulty > 0 ? 'text-red-600' : 'text-slate-600'
              )}
            >
              {difficulty < 0 ? (
                <>
                  <TrendingDown className="w-3 h-3" />
                  {Math.abs(difficulty)} bodů lehčí
                </>
              ) : difficulty > 0 ? (
                <>
                  <TrendingUp className="w-3 h-3" />
                  +{difficulty} bodů těžší
                </>
              ) : (
                'Stejná obtížnost'
              )}
            </div>
          </div>
        </div>

        <div className="text-lg font-bold text-slate-900">{competingSchool.min_body}</div>
      </div>
    </Link>
  );
}

// Strategic insights card
function StrategicInsightsCard({ schoolDetail, currentSchool }: { schoolDetail: any; currentSchool: any }) {
  if (!schoolDetail?.kam_se_hlasi || schoolDetail.kam_se_hlasi.length === 0) {
    return null;
  }

  // Find easier and harder alternatives
  const easierSchools = schoolDetail.kam_se_hlasi.filter((s: any) => s.min_body < currentSchool.min_body).slice(0, 2);
  const harderSchools = schoolDetail.kam_se_hlasi.filter((s: any) => s.min_body > currentSchool.min_body).slice(0, 2);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <span>💡</span>
        Strategické tipy
      </h3>

      <div className="space-y-4">
        {/* Good strategy */}
        <div>
          <div className="flex items-start gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-slate-900">Dobrá strategie</div>
              <ul className="mt-1 space-y-1 text-sm text-slate-700">
                <li>• Tuto školu dát jako 1. nebo 2. prioritu</li>
                {easierSchools.length > 0 && (
                  <li>
                    • Jako 3. nebo 4. zvolit {easierSchools[0].nazev} (lehčí záložní varianta)
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Risky strategy */}
        <div>
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-slate-900">Riziková strategie</div>
              <ul className="mt-1 space-y-1 text-sm text-slate-700">
                <li>• Hlásit se jen na školy s {currentSchool.min_body}+ body</li>
                <li>• Nemít záložní variantu s nižšími body</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Difficulty comparison chart
function DifficultyComparisonChart({ schools, currentSchool }: { schools: any[]; currentSchool: any }) {
  const maxBody = Math.max(...schools.map((s) => s.min_body), currentSchool.min_body);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <h3 className="font-semibold text-slate-900 mb-4">Srovnání náročnosti</h3>

      <div className="space-y-3">
        {schools.slice(0, 5).map((school, idx) => (
          <div key={idx}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600 truncate flex-1 mr-2">{school.nazev}</span>
              <span className="font-medium text-slate-900">{school.min_body}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className={cn(
                  'h-2 rounded-full transition-all',
                  school.redizo === currentSchool.redizo ? 'bg-blue-600' : 'bg-slate-300'
                )}
                style={{ width: `${(school.min_body / maxBody) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main CompetitionTab component
export function CompetitionTab({ school, program, schoolDetail }: CompetitionTabProps) {
  const [showAll, setShowAll] = useState(false);

  if (!schoolDetail?.kam_se_hlasi || schoolDetail.kam_se_hlasi.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Data o konkurenčních školách nejsou k dispozici.</p>
      </div>
    );
  }

  const competingSchools = schoolDetail.kam_se_hlasi;
  const displayedSchools = showAll ? competingSchools : competingSchools.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Strategic insights */}
      <StrategicInsightsCard schoolDetail={schoolDetail} currentSchool={program} />

      {/* Competing schools list */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Kam se hlásí ostatní uchazeči</h3>
        <p className="text-sm text-slate-600 mb-6">Školy, kam se hlásí zároveň s touto školou</p>

        <div className="space-y-3">
          {displayedSchools.map((competingSchool: any, idx: number) => (
            <CompetingSchoolCard key={idx} competingSchool={competingSchool} currentMinBody={program.min_body} />
          ))}
        </div>

        {competingSchools.length > 5 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            Zobrazit všech {competingSchools.length} škol
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Difficulty comparison */}
      <DifficultyComparisonChart schools={competingSchools} currentSchool={program} />
    </div>
  );
}
