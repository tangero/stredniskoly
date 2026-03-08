'use client';

import Link from 'next/link';
import { CheckCircle, AlertCircle, XCircle, ArrowRight } from 'lucide-react';

interface PersonalizedResultsProps {
  school: any;
  program: any;
  extendedStats: any;
  overviewSlug: string;
  slug: string;
  data: {
    userBody: number;
    bodyBreakdown?: { cj: number; ma: number };
    selectedPriorities: string[];
    locationAcceptable: 'yes' | 'maybe' | 'no' | null;
    budget: number;
  };
}

export function PersonalizedResults({ school, program, extendedStats, data, overviewSlug, slug }: PersonalizedResultsProps) {
  // Calculate match score (0-100)
  const calculateMatchScore = () => {
    let score = 0;

    // Body factor (40 points)
    const bodyDiff = data.userBody - program.min_body;
    if (bodyDiff >= 50) score += 40;
    else if (bodyDiff >= 0) score += 30;
    else if (bodyDiff >= -50) score += 15;
    else score += 5;

    // Location factor (30 points)
    if (data.locationAcceptable === 'yes') score += 30;
    else if (data.locationAcceptable === 'maybe') score += 15;
    else score += 0;

    // Cost factor (20 points)
    const estimatedCost = 23000;
    if (data.budget >= estimatedCost) score += 20;
    else if (data.budget >= estimatedCost * 0.8) score += 10;
    else score += 0;

    // Priorities factor (10 points) - simplified
    if (data.selectedPriorities.length >= 3) score += 10;

    return Math.round(score);
  };

  const matchScore = calculateMatchScore();

  const getMatchLabel = (score: number) => {
    if (score >= 80) return { label: 'VELMI DOBRÁ SHODA', color: 'text-green-600', emoji: '✅' };
    if (score >= 60) return { label: 'DOBRÁ SHODA', color: 'text-blue-600', emoji: '👍' };
    if (score >= 40) return { label: 'STŘEDNÍ SHODA', color: 'text-amber-600', emoji: '⚠️' };
    return { label: 'NÍZKÁ SHODA', color: 'text-red-600', emoji: '❌' };
  };

  const matchLabel = getMatchLabel(matchScore);

  // Generate reasons
  const reasons = {
    pros: [] as string[],
    cons: [] as string[],
  };

  // Body reasons
  const bodyDiff = data.userBody - program.min_body;
  if (bodyDiff >= 50) {
    reasons.pros.push(`Máte výrazně více bodů než minimum (${data.userBody} vs ${program.min_body})`);
  } else if (bodyDiff >= 0) {
    reasons.pros.push(`Splňujete bodové požadavky (${data.userBody} vs ${program.min_body})`);
  } else if (bodyDiff >= -50) {
    reasons.cons.push(`Chybí vám ${Math.abs(bodyDiff)} bodů do minima`);
  } else {
    reasons.cons.push(`Výrazně pod minimem - chybí ${Math.abs(bodyDiff)} bodů`);
  }

  // Location reasons
  if (data.locationAcceptable === 'yes') {
    reasons.pros.push('Škola je pro vás dobře dostupná');
  } else if (data.locationAcceptable === 'maybe') {
    reasons.cons.push('Škola je trochu daleko, zvažte dojezdový čas');
  } else {
    reasons.cons.push('Škola je příliš daleko od vašeho bydliště');
  }

  // Cost reasons
  const estimatedCost = 23000;
  if (data.budget >= estimatedCost) {
    reasons.pros.push('Náklady jsou v rámci vašeho rozpočtu');
  } else {
    reasons.cons.push(`Náklady přesahují rozpočet o ~${(estimatedCost - data.budget).toLocaleString('cs-CZ')} Kč`);
  }

  // slug is already the full program slug (e.g. "600170047-skolaeupraha-lipi-verejnospravni-cinnost")
  const detailSlug = slug;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Váš výsledek</h2>
        <p className="text-slate-600">Personalizované hodnocení shody</p>
      </div>

      {/* Match score */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 text-center">
        <div className="text-sm text-slate-600 mb-2">Match Score</div>
        <div className="mb-4">
          <div className="text-6xl font-bold text-slate-900 mb-2">{matchScore}</div>
          <div className="text-sm text-slate-600">/ 100</div>
        </div>

        {/* Progress bar */}
        <div className="max-w-md mx-auto mb-4">
          <div className="h-4 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-1000"
              style={{ width: `${matchScore}%` }}
            />
          </div>
        </div>

        <div className={`text-2xl font-bold ${matchLabel.color} flex items-center justify-center gap-2`}>
          <span>{matchLabel.emoji}</span>
          <span>{matchLabel.label}</span>
        </div>
      </div>

      {/* Pros and Cons */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Pros */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Proč se hodí
          </h3>
          {reasons.pros.length > 0 ? (
            <ul className="space-y-2">
              {reasons.pros.map((reason, idx) => (
                <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-green-700">Žádné výrazné výhody</p>
          )}
        </div>

        {/* Cons */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="font-semibold text-amber-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Co zvážit
          </h3>
          {reasons.cons.length > 0 ? (
            <ul className="space-y-2">
              {reasons.cons.map((reason, idx) => (
                <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">!</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-amber-700">Žádné výrazné nevýhody</p>
          )}
        </div>
      </div>

      {/* Action checklist */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Co dělat dál?</h3>
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
            <input type="checkbox" className="mt-1 w-4 h-4 accent-blue-600" />
            <div>
              <div className="font-medium text-slate-900">Navštívit dny otevřených dveří</div>
              <div className="text-sm text-slate-600">Poznejte školu osobně</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
            <input type="checkbox" className="mt-1 w-4 h-4 accent-blue-600" />
            <div>
              <div className="font-medium text-slate-900">Projít si detailní statistiky</div>
              <div className="text-sm text-slate-600">Trendy, konkurence, přijímací řízení</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
            <input type="checkbox" className="mt-1 w-4 h-4 accent-blue-600" />
            <div>
              <div className="font-medium text-slate-900">Přihlásit se na přípravné kurzy</div>
              <div className="text-sm text-slate-600">Pokud škola nabízí</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
            <input type="checkbox" className="mt-1 w-4 h-4 accent-blue-600" />
            <div>
              <div className="font-medium text-slate-900">Vybrat záložní školy</div>
              <div className="text-sm text-slate-600">Doporučujeme 2-3 další školy</div>
            </div>
          </label>
        </div>
      </div>

      {/* CTA buttons */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link
          href={`/skola/${detailSlug}/detail`}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Zobrazit detail školy
          <ArrowRight className="w-5 h-5" />
        </Link>

        <Link
          href={`/skola/${overviewSlug}`}
          className="flex items-center justify-center gap-2 bg-white text-blue-600 border-2 border-blue-600 font-semibold py-3 px-6 rounded-lg hover:bg-blue-50 transition-colors"
        >
          Zpět na přehled
        </Link>
      </div>
    </div>
  );
}
