'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import resultsMeta from '@/../public/cermat_results_meta.json';
import type { SchoolResult } from '@/lib/data';

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
  const insights = [
    { title: 'Průměr není hranice přijetí', text: 'Skóre popisuje přijaté uchazeče. Samo o sobě neříká, kolik bodů stačilo k přijetí ani jaká bude hranice příští rok.' },
    { title: 'Výsledky oborů s JPZ', text: `Přehled obsahuje ${results.length.toLocaleString('cs-CZ')} oborů a zaměření z ${year}, nikoli všechny střední školy. Zahrnujeme denní nezkrácené obory s kladným zveřejněným průměrem.` },
    { title: 'Srovnatelná škála', text: 'Procentní skór CERMAT dělíme dvěma: ČJ a MA mají škálu 0–50, součet 0–100. U upravených testů to nemusí být původní počet bodů.' },
    { title: 'Připravuj se podle svých potřeb', text: 'Zkus si cvičný test z obou předmětů a projdi vlastní chyby. Průměr přijatých na škole neurčuje, který předmět potřebuješ procvičit ty.' },
  ].map(item => ({ ...item, icon: '', color: 'border-blue-400 bg-blue-50', titleColor: 'text-blue-900', textColor: 'text-slate-700' }));

  return (
    <section className="py-12 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Jak výsledky číst</h2>
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
        <p className="text-sm text-slate-600 mb-4">Nevážené průměry oborových průměrů přijatých; každý obor má stejnou váhu. Meziroční změnu počítáme jen u stejného REDIZO, oboru a zaměření. Změny testů a kritérií mohou ovlivnit srovnání.</p>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Srovnání {year - 1} vs {year} podle typu školy</h2>
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-sm border border-slate-200">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left px-4 py-3 text-sm font-semibold rounded-tl-xl">Typ školy</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">Kapacita</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">Přijatých</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">Průměr skóre oborů (0–100)</th>
                <th className="text-right px-4 py-3 text-sm font-semibold rounded-tr-xl">Δ u spárovaných oborů</th>
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
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Gymnázia podle skóre přijatých</h2>
        <p className="text-slate-500 text-sm mb-6">Seřazeno podle průměrného skóre ČJ+MA přijatých (škála 0–100). Pořadí nehodnotí kvalitu výuky.</p>
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
                <div className="font-semibold text-slate-800 truncate group-hover:text-slate-900">{r.nazev_display || r.nazev}</div>
                <div className="text-xs text-slate-400">{TYP_LABELS[r.school_type] ?? r.school_type} · {r.kraj}{r.zamereni ? ` · ${r.zamereni}` : ''}</div>
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

function AdviceSection({ year }: { year: number }) {
  return (
    <section className="py-10 px-4 bg-slate-900 text-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-3">Připravuješ se na přijímačky {year + 1}?</h2>
        <p className="text-slate-300 mb-5">Historické skóre je jeden z podkladů. Při výběru zvaž obsah oboru, dojíždění a prostředí školy. Kapacity a pravidla bodování si ověř v kritériích pro nový ročník.</p>
        <Link href="/prijimacky-2027" className="inline-block rounded-lg bg-blue-700 px-5 py-3 font-semibold hover:bg-blue-600">Termíny přijímaček 2027 →</Link>
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
        return r.nazev.toLowerCase().includes(q) || (r.nazev_display || '').toLowerCase().includes(q) || r.kraj.toLowerCase().includes(q) || (r.obor || '').toLowerCase().includes(q) || r.zamereni.toLowerCase().includes(q);
      })
      .sort((a, b) => b.cj_ma_prijati - a.cj_ma_prijati)
      .slice(0, 100),
    [results, filterType, filterKraj, searchQuery]
  );

  return (
    <section className="py-12 px-4 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Prohledat zveřejněné výsledky</h2>
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            aria-label="Hledat ve výsledcích"
            type="text"
            placeholder="Hledat školu, obor nebo kraj…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 min-w-48 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          <select
            aria-label="Typ školy"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">Všechny typy</option>
            {TYP_ORDER.map(t => <option key={t} value={t}>{TYP_LABELS[t]}</option>)}
          </select>
          <select
            aria-label="Kraj"
            value={filterKraj}
            onChange={e => setFilterKraj(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">Všechny kraje</option>
            {kraje.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="text-xs text-slate-400 mb-3">
          {filtered.length} oborů a zaměření{filtered.length === 100 ? ' (zobrazeno prvních 100)' : ''}
        </div>
        <div className="flex flex-col gap-2">
          {filtered.map((r, i) => (
            <Link
              key={`${r.redizo}-${r.kkov}-${r.zamereni}-${i}`}
              href={`/skola/${r.redizo}`}
              className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-400 transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 truncate">{r.nazev_display || r.nazev}</div>
                <div className="text-xs text-slate-400">{TYP_LABELS[r.school_type] ?? r.school_type} · {r.kraj}{r.zamereni ? ` · ${r.zamereni}` : ''}</div>
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

  const STORAGE_KEY = `vysledky-filters-${year}`;

  const getInitialFilter = (key: string): string => {
    const fromUrl = searchParams.get(key);
    if (fromUrl) return fromUrl;
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
        return saved[key] || '';
      } catch { return ''; }
    }
    return '';
  };

  const searchQuery = getInitialFilter('q');
  const filterType = getInitialFilter('typ');
  const filterKraj = getInitialFilter('kraj');
  const [rankingType, setRankingType] = useState('GY4');

  useEffect(() => {
    try {
      const filters: Record<string, string> = {};
      if (searchQuery) filters.q = searchQuery;
      if (filterType) filters.typ = filterType;
      if (filterKraj) filters.kraj = filterKraj;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {}
  }, [searchQuery, filterType, filterKraj, STORAGE_KEY]);

  useEffect(() => {
    const hasUrlParams = searchParams.get('q') || searchParams.get('typ') || searchParams.get('kraj');
    if (!hasUrlParams && (searchQuery || filterType || filterKraj)) {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (filterType) params.set('typ', filterType);
      if (filterKraj) params.set('kraj', filterKraj);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const setSearchQuery = useCallback((v: string) => updateParam('q', v), [updateParam]);
  const setFilterType = useCallback((v: string) => updateParam('typ', v), [updateParam]);
  const setFilterKraj = useCallback((v: string) => updateParam('kraj', v), [updateParam]);

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
            Přehled skóre přijatých v oborech s JPZ a srovnání s rokem {year - 1}.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl p-5 text-center">
              <div className="text-4xl font-black">
                {totalKapacita.toLocaleString('cs-CZ')}
              </div>
              <div className="text-slate-400 text-sm mt-1">míst ve zobrazených oborech</div>
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

      <aside className="max-w-4xl mx-auto px-4 pt-6 text-sm text-slate-600">
        <p>Zdroj: <a href={resultsMeta.source.url} className="text-blue-700 underline">CERMAT, první kolo {year}</a> · platnost {new Date(resultsMeta.source.valid_at + 'T12:00:00Z').toLocaleDateString('cs-CZ', { timeZone: 'Europe/Prague' })} · ověřeno {new Date(resultsMeta.source.checked_at + 'T12:00:00Z').toLocaleDateString('cs-CZ', { timeZone: 'Europe/Prague' })}.</p>
        <p className="mt-2">{resultsMeta.schools.toLocaleString('cs-CZ')} škol (REDIZO), {results.length.toLocaleString('cs-CZ')} oborů a zaměření. Dalších {resultsMeta.without_positive_score} oborů v tomto rozsahu nemá kladný zveřejněný průměr a ve skórovém přehledu není. Nejde o celkové počty míst a přijatých v celé ČR.</p>
      </aside>
      {/* ② Jak výsledky číst */}
      <KeyInsights results={results} year={year} />

      {/* ③ Srovnání */}
      <ComparisonTable results={results} year={year} />

      {/* ④ Žebříček */}
      <RankingSection results={results} activeType={rankingType} onTypeChange={setRankingType} />

      {/* ⑤ Rady */}
      <AdviceSection year={year} />

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
