'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Search, TrendingUp, TrendingDown, Minus, Users, Target, BarChart3, Shield, AlertTriangle, CheckCircle, Info, ChevronDown, X } from 'lucide-react';
import { analyzeCombination, type SchoolApplication2026, type CombinationAnalysis, type ChanceResult } from '@/lib/chances';

interface SearchResult {
  id: string;
  slug: string;
  nazev: string;
  nazev_display: string;
  obor: string;
  zamereni: string;
  obec: string;
  kraj: string;
  typ: string;
  delka_studia: number;
  kapacita: number;
  prihlasky: number;
  index_poptavky: number;
}

interface SchoolFullData {
  id: string;
  slug: string;
  nazev: string;
  nazev_display: string;
  obor: string;
  zamereni: string;
  obec: string;
  kraj: string;
  typ: string;
  delka_studia: number;
  kapacita_2026: number;
  prihlasky_2026: number;
  prihlasky_priority_2026: number[];
  index_poptavky_2026: number;
  kapacita_2025: number;
  prihlasky_2025: number;
  prijati_2025: number;
  min_body_2025: number;
  prumer_body_2025: number;
  index_poptavky_2025: number;
  prihlasky_priority_2025?: number[];
  prijati_priority_2025?: number[];
  kapacita_2024?: number;
  prihlasky_2024?: number;
  prijati_2024?: number;
  min_body_2024?: number;
  index_poptavky_2024?: number;
}

// Komponenta pro vyhledávání školy
function SchoolSearchInput({
  priority,
  selectedSchool,
  onSelect,
  onRemove,
}: {
  priority: number;
  selectedSchool: SchoolFullData | null;
  onSelect: (school: SearchResult) => void;
  onRemove: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const searchSchools = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/chances?search=${encodeURIComponent(searchQuery)}`, {
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setIsOpen(true);
      }
    } catch {
      // Aborted or error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchSchools(query), 300);
    return () => clearTimeout(timer);
  }, [query, searchSchools]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (selectedSchool) {
    return (
      <div className="bg-white border border-blue-200 rounded-lg p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0">
                {priority}
              </span>
              <h4 className="font-semibold text-slate-900 truncate">{selectedSchool.nazev_display}</h4>
            </div>
            <p className="text-sm text-slate-600 ml-8">
              {selectedSchool.obor}{selectedSchool.zamereni ? ` – ${selectedSchool.zamereni}` : ''}
              <span className="text-slate-400"> · {selectedSchool.obec}</span>
            </p>
            <div className="flex gap-4 mt-2 ml-8 text-xs text-slate-500">
              <span>{selectedSchool.prihlasky_2026} přihlášek</span>
              <span>{selectedSchool.kapacita_2026} míst</span>
              <span className="font-medium">{selectedSchool.index_poptavky_2026.toFixed(1)}× poptávka</span>
            </div>
          </div>
          <button
            onClick={onRemove}
            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
            aria-label="Odebrat školu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-white text-xs font-bold flex-shrink-0">
          {priority}
        </span>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            placeholder={`Hledejte ${priority}. školu...`}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 left-8 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-72 overflow-y-auto">
          {results.map((school) => (
            <button
              key={school.id}
              onClick={() => {
                onSelect(school);
                setQuery('');
                setResults([]);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-50 last:border-b-0 transition-colors"
            >
              <div className="font-medium text-sm text-slate-900">{school.nazev_display}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {school.obor}{school.zamereni ? ` – ${school.zamereni}` : ''}
                <span className="text-slate-400"> · {school.obec}</span>
                <span className="ml-2 font-medium">{school.index_poptavky.toFixed(1)}× poptávka</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute z-50 left-8 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-4 text-sm text-slate-500 text-center">
          Žádné výsledky pro &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}

// Komponenta pro výsledkovou kartu školy
function SchoolResultCard({ result }: { result: ChanceResult }) {
  const [expanded, setExpanded] = useState(false);
  const s = result.school;

  const trendIcon = result.trendDirection === 'up' ? <TrendingUp className="w-4 h-4" /> :
                     result.trendDirection === 'down' ? <TrendingDown className="w-4 h-4" /> :
                     <Minus className="w-4 h-4" />;

  const trendColorClass = result.trendDirection === 'up' ? 'text-red-600' :
                           result.trendDirection === 'down' ? 'text-green-600' :
                           'text-slate-500';

  const chanceBarWidth = Math.max(5, result.estimatedChancePct);
  const chanceBarColor = result.chanceLevel === 'high' ? 'bg-green-500' :
                          result.chanceLevel === 'medium' ? 'bg-amber-500' :
                          result.chanceLevel === 'low' ? 'bg-orange-500' :
                          'bg-red-500';

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0">
                {s.priority}
              </span>
              <Link
                href={`/skola/${s.slug}`}
                className="font-semibold text-slate-900 hover:text-blue-600 transition-colors truncate"
              >
                {s.nazev}
              </Link>
            </div>
            <p className="text-sm text-slate-500 ml-8">
              {s.obor} · {s.obec}
            </p>
          </div>
        </div>

        {/* Šance bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-slate-700">Odhad šancí na přijetí</span>
            <span className={`text-sm font-bold ${result.chanceColor}`}>
              {result.estimatedChancePct} %
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${chanceBarColor}`}
              style={{ width: `${chanceBarWidth}%` }}
            />
          </div>
          <div className="text-xs text-slate-500 mt-1">{result.chanceLabel}</div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-lg font-bold text-slate-900">{s.prihlasky_2026}</div>
            <div className="text-xs text-slate-500">Přihlášek 2026</div>
            <div className={`text-xs font-medium mt-0.5 flex items-center justify-center gap-0.5 ${trendColorClass}`}>
              {trendIcon}
              {result.trendLabel}
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-lg font-bold text-slate-900">{s.kapacita_2026}</div>
            <div className="text-xs text-slate-500">Míst</div>
            <div className={`text-xs font-medium mt-0.5 ${result.demandColor}`}>
              {s.index_poptavky_2026.toFixed(1)}× poptávka
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-lg font-bold text-red-600">{result.estimatedMinScore}</div>
            <div className="text-xs text-slate-500">Odhad min. bodů</div>
            <div className="text-xs text-slate-400 mt-0.5">
              (2025: {s.min_body_2025})
            </div>
          </div>
        </div>
      </div>

      {/* Expandable detail */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-3 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <span>Podrobnosti</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-100">
          {/* Priority breakdown 2026 */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Přihlášky podle priority (2026)</h4>
            <div className="space-y-1.5">
              {s.prihlasky_priority_2026.map((count, i) => {
                const pct = s.prihlasky_2026 > 0 ? (count / s.prihlasky_2026 * 100) : 0;
                if (count === 0 && i > 2) return null;
                return (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-20 text-slate-500">{i + 1}. priorita</span>
                    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-slate-600 font-medium">{count}</span>
                    <span className="w-12 text-right text-slate-400">{pct.toFixed(0)} %</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Historické srovnání */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Srovnání s předchozími roky</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 text-slate-500 font-medium">Rok</th>
                    <th className="text-right py-2 text-slate-500 font-medium">Přihlášky</th>
                    <th className="text-right py-2 text-slate-500 font-medium">Kapacita</th>
                    <th className="text-right py-2 text-slate-500 font-medium">Index</th>
                    <th className="text-right py-2 text-slate-500 font-medium">Min. body</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100 bg-blue-50/50 font-medium">
                    <td className="py-2 text-blue-700">2026</td>
                    <td className="py-2 text-right">{s.prihlasky_2026}</td>
                    <td className="py-2 text-right">{s.kapacita_2026}</td>
                    <td className="py-2 text-right">{s.index_poptavky_2026.toFixed(1)}×</td>
                    <td className="py-2 text-right text-slate-400">—</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2">2025</td>
                    <td className="py-2 text-right">{s.prihlasky_2025}</td>
                    <td className="py-2 text-right">{s.kapacita_2025}</td>
                    <td className="py-2 text-right">{s.index_poptavky_2025.toFixed(1)}×</td>
                    <td className="py-2 text-right">{s.min_body_2025}</td>
                  </tr>
                  {s.prihlasky_2024 !== undefined && s.prihlasky_2024 > 0 && (
                    <tr>
                      <td className="py-2">2024</td>
                      <td className="py-2 text-right">{s.prihlasky_2024}</td>
                      <td className="py-2 text-right">{s.kapacita_2024}</td>
                      <td className="py-2 text-right">{s.index_poptavky_2024?.toFixed(1)}×</td>
                      <td className="py-2 text-right">{s.min_body_2024}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* P1 analýza */}
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-sm">
              <span className="font-medium text-blue-800">Analýza 1. priorit:</span>{' '}
              <span className="text-blue-700">
                {result.p1Applicants2026} uchazečů má tuto školu jako 1. volbu
                {s.kapacita_2026 > 0 && (
                  <> ({result.p1Ratio.toFixed(1)}× kapacita jen z P1)</>
                )}
              </span>
            </div>
          </div>

          <Link
            href={`/skola/${s.slug}`}
            className="block text-center text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors"
          >
            Zobrazit detail školy →
          </Link>
        </div>
      )}
    </div>
  );
}

// Komponenta pro celkové hodnocení
function CombinationResult({ analysis }: { analysis: CombinationAnalysis }) {
  const riskIcon = analysis.overallRisk === 'safe' ? <CheckCircle className="w-6 h-6" /> :
                   analysis.overallRisk === 'balanced' ? <Shield className="w-6 h-6" /> :
                   <AlertTriangle className="w-6 h-6" />;

  const riskBgColor = analysis.overallRisk === 'safe' ? 'bg-green-50 border-green-200' :
                      analysis.overallRisk === 'balanced' ? 'bg-blue-50 border-blue-200' :
                      analysis.overallRisk === 'risky' ? 'bg-orange-50 border-orange-200' :
                      'bg-red-50 border-red-200';

  const riskIconColor = analysis.overallRisk === 'safe' ? 'text-green-600' :
                        analysis.overallRisk === 'balanced' ? 'text-blue-600' :
                        analysis.overallRisk === 'risky' ? 'text-orange-600' :
                        'text-red-600';

  return (
    <div className="space-y-6">
      {/* Celkové hodnocení */}
      <div className={`border rounded-xl p-6 ${riskBgColor}`}>
        <div className="flex items-start gap-4">
          <div className={riskIconColor}>
            {riskIcon}
          </div>
          <div>
            <h3 className={`font-bold text-lg ${analysis.riskColor}`}>
              {analysis.riskLabel}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {analysis.riskDescription}
            </p>
          </div>
        </div>

        {analysis.suggestions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200/50">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Doporučení</h4>
            <ul className="space-y-1">
              {analysis.suggestions.map((suggestion, i) => (
                <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Jednotlivé školy */}
      <div className="space-y-4">
        {analysis.results.map((result) => (
          <SchoolResultCard key={result.school.id} result={result} />
        ))}
      </div>
    </div>
  );
}

export function MojeSanceClient() {
  const [schools, setSchools] = useState<(SchoolFullData | null)[]>([null, null, null]);
  const [analysis, setAnalysis] = useState<CombinationAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSelectSchool = async (index: number, searchResult: SearchResult) => {
    // Načíst plná data
    try {
      const res = await fetch(`/api/chances?id=${encodeURIComponent(searchResult.id)}`);
      if (res.ok) {
        const fullData: SchoolFullData = await res.json();
        const newSchools = [...schools];
        newSchools[index] = fullData;
        setSchools(newSchools);
        setAnalysis(null); // Reset analýzy
      }
    } catch {
      // Error loading school data
    }
  };

  const handleRemoveSchool = (index: number) => {
    const newSchools = [...schools];
    newSchools[index] = null;
    setSchools(newSchools);
    setAnalysis(null);
  };

  const handleAnalyze = () => {
    const selectedSchools = schools.filter((s): s is SchoolFullData => s !== null);
    if (selectedSchools.length === 0) return;

    setIsAnalyzing(true);

    // Převést na SchoolApplication2026 formát
    const applications: SchoolApplication2026[] = selectedSchools.map((s, i) => ({
      id: s.id,
      redizo: s.id.split('_')[0],
      nazev: s.nazev_display || s.nazev,
      nazev_display: s.nazev_display,
      obor: s.obor,
      zamereni: s.zamereni,
      obec: s.obec,
      kraj: s.kraj,
      typ: s.typ,
      delka_studia: s.delka_studia,
      slug: s.slug,
      priority: i + 1,
      kapacita_2026: s.kapacita_2026,
      prihlasky_2026: s.prihlasky_2026,
      prihlasky_priority_2026: s.prihlasky_priority_2026,
      index_poptavky_2026: s.index_poptavky_2026,
      kapacita_2025: s.kapacita_2025,
      prihlasky_2025: s.prihlasky_2025,
      prijati_2025: s.prijati_2025,
      min_body_2025: s.min_body_2025,
      prumer_body_2025: s.prumer_body_2025,
      index_poptavky_2025: s.index_poptavky_2025,
      prihlasky_priority_2025: s.prihlasky_priority_2025,
      prijati_priority_2025: s.prijati_priority_2025,
      kapacita_2024: s.kapacita_2024,
      prihlasky_2024: s.prihlasky_2024,
      prijati_2024: s.prijati_2024,
      min_body_2024: s.min_body_2024,
      index_poptavky_2024: s.index_poptavky_2024,
    }));

    const result = analyzeCombination(applications);
    setAnalysis(result);
    setIsAnalyzing(false);
  };

  const selectedCount = schools.filter(s => s !== null).length;

  return (
    <>
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-500 via-blue-500 to-blue-600 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-2xl md:text-4xl font-bold mb-3">Moje šance</h1>
          <p className="text-lg opacity-90 max-w-2xl">
            Zadejte školy, na které se hlásíte, a zjistěte své šance na přijetí.
            Porovnáme aktuální počty přihlášek 2026 s historickými daty.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Výběr škol */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Vaše přihlášky</h2>
          <p className="text-sm text-slate-500 mb-4">
            Vyberte až 3 školy v pořadí vaší priority (1 = nejvyšší priorita).
          </p>

          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <SchoolSearchInput
                key={i}
                priority={i + 1}
                selectedSchool={schools[i]}
                onSelect={(result) => handleSelectSchool(i, result)}
                onRemove={() => handleRemoveSchool(i)}
              />
            ))}
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleAnalyze}
              disabled={selectedCount === 0 || isAnalyzing}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? 'Analyzuji...' : 'Zjistit šance'}
            </button>
            {selectedCount > 0 && (
              <span className="text-sm text-slate-500">
                {selectedCount} {selectedCount === 1 ? 'škola vybrána' : selectedCount < 5 ? 'školy vybrány' : 'škol vybráno'}
              </span>
            )}
          </div>
        </div>

        {/* Info box */}
        {!analysis && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-800 mb-1">Jak kalkulačka funguje?</h3>
                <p className="text-sm text-blue-700">
                  Porovnáváme aktuální počty přihlášek v 1. kole 2026 s výsledky z let 2024 a 2025.
                  Na základě historického poměru přihlášek, kapacit a úspěšnosti přijetí odhadujeme
                  vaše šance. Odhady jsou orientační – skutečné výsledky závisí na vašem skóre z přijímacích zkoušek.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Výsledky */}
        {analysis && <CombinationResult analysis={analysis} />}

        {/* Disclaimer */}
        {analysis && (
          <div className="mt-6 p-4 bg-amber-50 rounded-xl text-xs text-amber-700">
            <strong>Upozornění:</strong> Odhady šancí jsou orientační a vycházejí z historických dat.
            Skutečné výsledky závisí na vašem skóre z přijímacích zkoušek, na dalších kritériích školy
            a na tom, kolik uchazečů se vzdá přijetí na jiné školy. Kapacity škol se mohou měnit do 7. května 2026.
            Data přihlášek 2026 pocházejí z portálu{' '}
            <a href="https://data.cermat.cz" className="underline hover:text-amber-900" target="_blank" rel="noopener noreferrer">
              data.cermat.cz
            </a>.
          </div>
        )}
      </div>
    </>
  );
}
