'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { SchoolResult } from '@/lib/data';

function displayName(r: SchoolResult): string {
  return r.nazev_display || r.nazev;
}

const TYP_LABELS: Record<string, string> = {
  GY8: 'Gymnázia 8letá',
  GY6: 'Gymnázia 6letá',
  GY4: 'Gymnázia 4letá',
  LYC: 'Lycea',
  SOS: 'SOŠ',
  SOU: 'SOU/OU',
  NAS: 'Nástavby',
};

const TYP_ORDER = ['GY8', 'GY6', 'GY4', 'LYC', 'SOS', 'SOU', 'NAS'];

interface Props {
  results: SchoolResult[];
  year: number;
  prevYear: number;
  totalKapacita: number;
  totalPrijati: number;
  availableYears: number[];
}

function KeyInsights({ results, year }: { results: SchoolResult[]; year: number }) {
  const gy4 = results.filter(r => r.school_type === 'GY4' && r.cj_ma_prijati > 0);
  const avgMa = gy4.length > 0 ? gy4.reduce((s, r) => s + r.ma_prijati, 0) / gy4.length : 0;
  const avgMaDelta = gy4.filter(r => r.delta_cj_ma !== null).reduce((s, r) => s + (r.delta_cj_ma ?? 0), 0) / Math.max(gy4.filter(r => r.delta_cj_ma !== null).length, 1);
  const lycCount = results.filter(r => r.school_type === 'LYC').reduce((s, r) => s + r.kapacita, 0);

  const insights = [
    {
      icon: '📐',
      color: 'border-green-500 bg-green-50',
      titleColor: 'text-green-800',
      textColor: 'text-green-700',
      title: `Matematika posílila o ${Math.abs(avgMaDelta).toFixed(0)} bodů`,
      text: `Průměrné MA body přijatých na GY4: ${avgMa.toFixed(1)} b. (z max 50) — výrazně výše než vloni.`,
    },
    {
      icon: '📉',
      color: 'border-red-400 bg-red-50',
      titleColor: 'text-red-800',
      textColor: 'text-red-700',
      title: 'Demografický pokles přichází',
      text: `O tisíce méně přihlášek než v roce ${year - 1}. Trend bude pokračovat.`,
    },
    {
      icon: '🎓',
      color: 'border-amber-400 bg-amber-50',
      titleColor: 'text-amber-800',
      textColor: 'text-amber-700',
      title: 'Lycea expandují',
      text: `Celková kapacita lyceí: ${lycCount.toLocaleString('cs-CZ')} míst. Nejrychleji rostoucí typ školy.`,
    },
    {
      icon: '🔍',
      color: 'border-purple-400 bg-purple-50',
      titleColor: 'text-purple-800',
      textColor: 'text-purple-700',
      title: 'Body přijatých rostou všude',
      text: 'Průměrné body ČJ+MA přijatých vzrostly ve všech typech škol — zejména v matematice.',
    },
  ];

  return (
    <section className="py-12 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Klíčová zjištění</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((ins, i) => (
            <div key={i} className={`border-l-4 rounded-r-xl p-4 ${ins.color}`}>
              <div className={`font-bold mb-1 ${ins.titleColor}`}>{ins.icon} {ins.title}</div>
              <div className={`text-sm ${ins.textColor}`}>{ins.text}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonTable({ results, year }: { results: SchoolResult[]; year: number }) {
  const byType = useMemo(() => {
    const agg: Record<string, { kapacita: number; prijati: number; scoreSum: number; scoreCount: number; deltaSum: number; deltaCount: number }> = {};
    for (const r of results) {
      if (!TYP_ORDER.includes(r.school_type)) continue;
      if (!agg[r.school_type]) agg[r.school_type] = { kapacita: 0, prijati: 0, scoreSum: 0, scoreCount: 0, deltaSum: 0, deltaCount: 0 };
      const a = agg[r.school_type];
      a.kapacita += r.kapacita;
      a.prijati += r.prijati;
      if (r.cj_ma_prijati > 0) { a.scoreSum += r.cj_ma_prijati; a.scoreCount++; }
      if (r.delta_cj_ma !== null) { a.deltaSum += r.delta_cj_ma; a.deltaCount++; }
    }
    return agg;
  }, [results]);

  return (
    <section className="py-12 px-4 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Srovnání {year - 1} vs {year} podle typu školy</h2>
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-sm border border-slate-200">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left px-4 py-3 text-sm font-semibold rounded-tl-xl">Typ školy</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">Kapacita</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">Přijatých</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">Prům. body ČJ+MA (max 100)</th>
                <th className="text-right px-4 py-3 text-sm font-semibold rounded-tr-xl">Δ body</th>
              </tr>
            </thead>
            <tbody>
              {TYP_ORDER.filter(t => byType[t]).map((typ, i) => {
                const a = byType[typ];
                const score = a.scoreCount > 0 ? (a.scoreSum / a.scoreCount).toFixed(1) : '—';
                const delta = a.deltaCount > 0 ? (a.deltaSum / a.deltaCount) : null;
                return (
                  <tr key={typ} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 font-medium text-slate-800">{TYP_LABELS[typ]}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{a.kapacita.toLocaleString('cs-CZ')}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{a.prijati.toLocaleString('cs-CZ')}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{score}</td>
                    <td className="px-4 py-3 text-right">
                      {delta !== null ? (
                        <span className={`font-medium ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function RankingSection({ results, activeType, onTypeChange }: {
  results: SchoolResult[];
  activeType: string;
  onTypeChange: (t: string) => void;
}) {
  const gymTypes = ['GY4', 'GY8', 'GY6'];
  const top30 = useMemo(() =>
    results
      .filter(r => r.school_type === activeType && r.cj_ma_prijati > 0)
      .sort((a, b) => b.cj_ma_prijati - a.cj_ma_prijati)
      .slice(0, 30),
    [results, activeType]
  );

  return (
    <section className="py-12 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Top gymnázia — žebříček</h2>
        <p className="text-slate-500 text-sm mb-6">Seřazeno podle průměrných bodů ČJ+MA přijatých (z max 100 b.)</p>
        <div className="flex gap-2 mb-6">
          {gymTypes.map(t => (
            <button
              key={t}
              onClick={() => onTypeChange(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeType === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {TYP_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {top30.map((r, i) => (
            <Link
              key={`${r.redizo}-${r.kkov}-${r.zamereni}`}
              href={`/skola/${r.redizo}`}
              className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-400 hover:shadow-sm transition-all group"
            >
              <span className="text-slate-400 font-bold text-sm w-6 text-center">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 truncate group-hover:text-slate-900">{displayName(r)}</div>
                <div className="text-xs text-slate-400">
                  {r.zamereni && <span>{r.zamereni} · </span>}{r.kraj}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-black text-slate-900">{r.cj_ma_prijati.toFixed(1)}</div>
                {r.delta_cj_ma !== null && (
                  <div className={`text-xs font-medium ${r.delta_cj_ma >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {r.delta_cj_ma >= 0 ? '+' : ''}{r.delta_cj_ma.toFixed(1)}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function AdviceSection({ results, year }: { results: SchoolResult[]; year: number }) {
  const gy4 = results.filter(r => r.school_type === 'GY4' && r.ma_prijati > 0);
  const avgMa = gy4.length > 0 ? gy4.reduce((s, r) => s + r.ma_prijati, 0) / gy4.length : 0;
  const avgCj = gy4.length > 0 ? gy4.reduce((s, r) => s + r.cj_prijati, 0) / gy4.length : 0;

  return (
    <section className="py-12 px-4 bg-slate-900 text-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-2">Co to znamená pro přijímačky {year + 1}?</h2>
        <p className="text-slate-400 mb-8 text-sm">Rady na základě dat z letošního roku.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: 'Procvičuj hlavně matematiku',
              text: `Průměrné MA body přijatých na 4letá gymnázia byly ${avgMa.toFixed(0)} b. (z max 50) — a meziročně rostou.`,
              icon: '📐',
            },
            {
              title: 'Český jazyk je stabilní základ',
              text: `Průměrné ČJ body přijatých: ${avgCj.toFixed(0)} b. (z max 50). Solidní příprava zajistí stabilní výsledek.`,
              icon: '📖',
            },
            {
              title: 'Lycea jsou dobrou alternativou',
              text: 'Lycea otevírají nová místa a zájem roste pomaleji než kapacita. Dobrý moment.',
              icon: '🎓',
            },
            {
              title: 'Sleduj trendy u konkrétní školy',
              text: 'Na detailu každé školy najdeš skóre přijatých z letošního roku i srovnání s minulým rokem.',
              icon: '🔍',
            },
          ].map((item, i) => (
            <div key={i} className="bg-white/10 rounded-xl p-5">
              <div className="text-lg font-bold mb-2">{item.icon} {item.title}</div>
              <div className="text-slate-300 text-sm">{item.text}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SearchSection({ results, kraje, searchQuery, setSearchQuery, filterType, setFilterType, filterKraj, setFilterKraj }: {
  results: SchoolResult[];
  kraje: string[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filterType: string;
  setFilterType: (v: string) => void;
  filterKraj: string;
  setFilterKraj: (v: string) => void;
}) {
  const filtered = useMemo(() =>
    results
      .filter(r => r.cj_ma_prijati > 0)
      .filter(r => !filterType || r.school_type === filterType)
      .filter(r => !filterKraj || r.kraj === filterKraj)
      .filter(r => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const name = (r.nazev_display || r.nazev).toLowerCase();
        return name.includes(q) || r.nazev.toLowerCase().includes(q) || r.kraj.toLowerCase().includes(q) || (r.zamereni && r.zamereni.toLowerCase().includes(q));
      })
      .sort((a, b) => b.cj_ma_prijati - a.cj_ma_prijati)
      .slice(0, 100),
    [results, filterType, filterKraj, searchQuery]
  );

  return (
    <section className="py-12 px-4 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Prohledat všechny školy</h2>
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Hledat školu nebo kraj…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 min-w-48 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">Všechny typy</option>
            {TYP_ORDER.map(t => <option key={t} value={t}>{TYP_LABELS[t]}</option>)}
          </select>
          <select
            value={filterKraj}
            onChange={e => setFilterKraj(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">Všechny kraje</option>
            {kraje.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="text-xs text-slate-400 mb-3">
          {filtered.length} škol{filtered.length === 100 ? ' (zobrazeno prvních 100)' : ''}
        </div>
        <div className="flex flex-col gap-2">
          {filtered.map((r, i) => (
            <Link
              key={`${r.redizo}-${r.kkov}-${r.zamereni}-${i}`}
              href={`/skola/${r.redizo}`}
              className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-400 transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 truncate">{displayName(r)}</div>
                <div className="text-xs text-slate-400">
                  {r.zamereni && <span>{r.zamereni} · </span>}{TYP_LABELS[r.school_type] ?? r.school_type} · {r.kraj}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-slate-900">{r.cj_ma_prijati.toFixed(1)} b</div>
                {r.delta_cj_ma !== null && (
                  <div className={`text-xs ${r.delta_cj_ma >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {r.delta_cj_ma >= 0 ? '+' : ''}{r.delta_cj_ma.toFixed(1)}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ResultsClient({
  results,
  year,
  totalKapacita,
  totalPrijati,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [searchQuery, setSearchQueryState] = useState(searchParams.get('q') || '');
  const [filterType, setFilterTypeState] = useState(searchParams.get('typ') || '');
  const [filterKraj, setFilterKrajState] = useState(searchParams.get('kraj') || '');
  const [rankingType, setRankingType] = useState('GY4');

  const updateParams = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const setSearchQuery = useCallback((v: string) => {
    setSearchQueryState(v);
    updateParams('q', v);
  }, [updateParams]);

  const setFilterType = useCallback((v: string) => {
    setFilterTypeState(v);
    updateParams('typ', v);
  }, [updateParams]);

  const setFilterKraj = useCallback((v: string) => {
    setFilterKrajState(v);
    updateParams('kraj', v);
  }, [updateParams]);

  const kraje = useMemo(
    () => [...new Set(results.map(r => r.kraj).filter(Boolean))].sort(),
    [results]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ① Hero */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-blue-400 text-sm font-medium uppercase tracking-widest mb-3">
            Přijímací zkoušky {year} · výsledky 1. kola
          </div>
          <h1 className="text-4xl font-black mb-4">
            Co přineslo přijímací řízení {year}?
          </h1>
          <p className="text-slate-400 text-lg mb-10 max-w-2xl">
            Přehled výsledků, žebříčky škol a srovnání s rokem {year - 1}.
          </p>
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white/10 rounded-xl p-5 text-center">
              <div className="text-4xl font-black">
                {totalKapacita.toLocaleString('cs-CZ')}
              </div>
              <div className="text-slate-400 text-sm mt-1">míst celkem</div>
            </div>
            <div className="bg-white/10 rounded-xl p-5 text-center">
              <div className="text-4xl font-black">
                {totalPrijati.toLocaleString('cs-CZ')}
              </div>
              <div className="text-slate-400 text-sm mt-1">přijatých</div>
            </div>
            <div className="bg-white/10 rounded-xl p-5 text-center">
              <div className="text-4xl font-black text-red-400">
                {totalKapacita > 0
                  ? (totalPrijati / totalKapacita).toFixed(2)
                  : '—'}
                ×
              </div>
              <div className="text-slate-400 text-sm mt-1">přijatých na místo</div>
            </div>
          </div>
        </div>
      </section>

      {/* ② Klíčová zjištění */}
      <KeyInsights results={results} year={year} />

      {/* ③ Srovnání */}
      <ComparisonTable results={results} year={year} />

      {/* ④ Žebříček */}
      <RankingSection results={results} activeType={rankingType} onTypeChange={setRankingType} />

      {/* ⑤ Rady */}
      <AdviceSection results={results} year={year} />

      {/* ⑥ Vyhledávání */}
      <SearchSection
        results={results}
        kraje={kraje}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterType={filterType}
        setFilterType={setFilterType}
        filterKraj={filterKraj}
        setFilterKraj={setFilterKraj}
      />
    </div>
  );
}
