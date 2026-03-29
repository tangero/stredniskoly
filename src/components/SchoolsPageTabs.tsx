'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

// ==========================================
// Typy
// ==========================================

interface SchoolEntry {
  id: string;
  nazev: string;
  obor: string;
  obec: string;
  kraj: string;
  kraj_kod: string;
  typ: string;
  delka_studia: number;
  slug: string;
  // 2025 data
  min_body: number;
  prihlasky: number;
  kapacita: number;
  index_poptavky: number;
  obtiznost: number;
  category_code: string;
  // 2026 data
  prihlasky_2026?: number;
  kapacita_2026?: number;
  index_poptavky_2026?: number;
}

interface CityGroupSchool {
  nazev: string;
  slug: string;
}

interface CityStats {
  obec: string;
  groups: Array<{
    label: string;
    sortKey: number;
    prihlasky: number;
    kapacita: number;
    index: number;
    count: number;
    schools: CityGroupSchool[];
  }>;
  totalPrihlasky: number;
  totalKapacita: number;
  totalIndex: number;
}

export interface SchoolsPageTabsProps {
  schools: SchoolEntry[];
}

// ==========================================
// Helpers
// ==========================================

type TabId = 'previs2026' | 'obtiznost2025' | 'mesta';
type DelkaFilter = 'all' | '4' | '6' | '8';
type TypFilter = 'all' | 'GY' | 'GY4' | 'GY6' | 'GY8' | 'SOS' | 'LYC' | 'SOU' | 'NAS';

const delkaColors: Record<number, string> = {
  2: 'bg-slate-500 text-white',
  3: 'bg-slate-500 text-white',
  4: 'bg-blue-600 text-white',
  5: 'bg-blue-600 text-white',
  6: 'bg-violet-600 text-white',
  8: 'bg-emerald-600 text-white',
};

const previsColor = (v: number) =>
  v >= 10 ? 'bg-red-100 text-red-800' :
  v >= 5 ? 'bg-orange-100 text-orange-800' :
  v >= 3 ? 'bg-amber-100 text-amber-800' :
  'bg-slate-100 text-slate-700';

function typLabel(typ: string): string {
  const map: Record<string, string> = {
    GY4: 'Gymnázium', GY6: 'Gymnázium', GY8: 'Gymnázium',
    SOS: 'SOŠ', SOU: 'SOU', LYC: 'Lyceum', NAS: 'Nástavba',
  };
  return map[typ] || typ;
}

function typGroup(typ: string): string {
  if (typ.startsWith('GY')) return 'GY';
  return typ;
}

function cityGroupLabel(typ: string, delka: number): string {
  if (typ.startsWith('GY')) return `Gymnázia ${delka}L`;
  const labels: Record<string, string> = {
    SOS: 'SOŠ', LYC: 'Lycea', SOU: 'SOU', NAS: 'Nástavby',
  };
  return `${labels[typ] || typ} ${delka}L`;
}

function cityGroupSort(typ: string, delka: number): number {
  const typOrder: Record<string, number> = { GY4: 1, GY6: 2, GY8: 3, SOS: 10, LYC: 20, SOU: 30, NAS: 40 };
  return (typOrder[typ] || 50) + delka * 0.1;
}

function matchesFilters(s: SchoolEntry, delka: DelkaFilter, typ: TypFilter): boolean {
  if (delka !== 'all' && s.delka_studia !== parseInt(delka)) return false;
  if (typ !== 'all') {
    if (typ === 'GY' && !s.typ.startsWith('GY')) return false;
    if (typ === 'GY4' && s.typ !== 'GY4') return false;
    if (typ === 'GY6' && s.typ !== 'GY6') return false;
    if (typ === 'GY8' && s.typ !== 'GY8') return false;
    if (!typ.startsWith('GY') && s.typ !== typ) return false;
  }
  return true;
}

// ==========================================
// Komponenta
// ==========================================

export function SchoolsPageTabs({ schools }: SchoolsPageTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('previs2026');
  const [delkaFilter, setDelkaFilter] = useState<DelkaFilter>('all');
  const [typFilter, setTypFilter] = useState<TypFilter>('all');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'previs2026', label: 'Nejžádanější obory 2026' },
    { id: 'obtiznost2025', label: 'Obtížnost přijetí 2025' },
    { id: 'mesta', label: 'Převys podle měst' },
  ];

  const handleTabChange = (tabId: TabId) => {
    // Reset granular GY filter when leaving města tab
    if (activeTab === 'mesta' && tabId !== 'mesta' && (typFilter === 'GY4' || typFilter === 'GY6' || typFilter === 'GY8')) {
      setTypFilter('GY');
    }
    // Reset délka filter when entering města tab (not used there)
    if (tabId === 'mesta' && delkaFilter !== 'all') {
      setDelkaFilter('all');
    }
    setActiveTab(tabId);
  };

  const delkaButtons: { value: DelkaFilter; label: string }[] = [
    { value: 'all', label: 'Všechny' },
    { value: '4', label: '4leté' },
    { value: '6', label: '6leté' },
    { value: '8', label: '8leté' },
  ];

  const typButtons: { value: TypFilter; label: string }[] = [
    { value: 'all', label: 'Všechny typy' },
    { value: 'GY', label: 'Gymnázia' },
    { value: 'SOS', label: 'SOŠ' },
    { value: 'LYC', label: 'Lycea' },
    { value: 'SOU', label: 'SOU' },
  ];

  const typButtonsMesta: { value: TypFilter; label: string }[] = [
    { value: 'all', label: 'Všechny typy' },
    { value: 'GY', label: 'Gymnázia (vše)' },
    { value: 'GY4', label: 'Gymnázia 4L' },
    { value: 'GY6', label: 'Gymnázia 6L' },
    { value: 'GY8', label: 'Gymnázia 8L' },
    { value: 'SOS', label: 'SOŠ' },
    { value: 'LYC', label: 'Lycea' },
    { value: 'SOU', label: 'SOU' },
  ];

  // Filtrované školy
  const filtered = useMemo(() =>
    schools.filter(s => matchesFilters(s, delkaFilter, typFilter)),
    [schools, delkaFilter, typFilter]
  );

  // Převys 2026 - Top 100
  const previs2026 = useMemo(() =>
    [...filtered]
      .filter(s => (s.prihlasky_2026 || 0) > 0 && (s.kapacita_2026 || 0) > 0)
      .sort((a, b) => (b.index_poptavky_2026 || 0) - (a.index_poptavky_2026 || 0))
      .slice(0, 100),
    [filtered]
  );

  // Obtížnost 2025 - Top 100
  const obtiznost2025 = useMemo(() =>
    [...filtered]
      .filter(s => s.prihlasky > 0)
      .sort((a, b) => b.obtiznost - a.obtiznost)
      .slice(0, 100),
    [filtered]
  );

  // Převys podle měst
  const cityStats = useMemo(() => {
    // Jen školy s 2026 daty (délka filter se nepoužívá pro města)
    const withData = schools.filter(s =>
      (s.prihlasky_2026 || 0) > 0 && (s.kapacita_2026 || 0) > 0 &&
      matchesFilters(s, 'all', typFilter)
    );

    // Seskupit podle města
    const byCity = new Map<string, SchoolEntry[]>();
    for (const s of withData) {
      const key = s.obec;
      if (!byCity.has(key)) byCity.set(key, []);
      byCity.get(key)!.push(s);
    }

    // Pro každé město seskupit podle typ+délka
    const result: CityStats[] = [];
    for (const [obec, citySchools] of byCity) {
      if (citySchools.length < 1) continue;

      const groupMap = new Map<string, { prihlasky: number; kapacita: number; count: number; sortKey: number; schools: CityGroupSchool[] }>();
      for (const s of citySchools) {
        const label = cityGroupLabel(s.typ, s.delka_studia);
        const sortKey = cityGroupSort(s.typ, s.delka_studia);
        if (!groupMap.has(label)) groupMap.set(label, { prihlasky: 0, kapacita: 0, count: 0, sortKey, schools: [] });
        const g = groupMap.get(label)!;
        g.prihlasky += s.prihlasky_2026 || 0;
        g.kapacita += s.kapacita_2026 || 0;
        g.count += 1;
        // Deduplicate by nazev (multiple obory from same school)
        if (!g.schools.some(x => x.nazev === s.nazev)) {
          g.schools.push({ nazev: s.nazev, slug: s.slug });
        }
      }

      const groups = [...groupMap.entries()]
        .map(([label, g]) => ({
          label,
          sortKey: g.sortKey,
          prihlasky: g.prihlasky,
          kapacita: g.kapacita,
          index: g.kapacita > 0 ? g.prihlasky / g.kapacita : 0,
          count: g.count,
          schools: g.schools,
        }))
        .filter(g => g.kapacita > 0)
        .sort((a, b) => a.sortKey - b.sortKey);

      const totalP = groups.reduce((s, g) => s + g.prihlasky, 0);
      const totalK = groups.reduce((s, g) => s + g.kapacita, 0);

      result.push({
        obec,
        groups,
        totalPrihlasky: totalP,
        totalKapacita: totalK,
        totalIndex: totalK > 0 ? totalP / totalK : 0,
      });
    }

    return result.sort((a, b) => b.totalIndex - a.totalIndex);
  }, [schools, typFilter]);

  return (
    <div>
      {/* Tabová navigace */}
      <div className="flex flex-wrap gap-1 mb-6 bg-slate-100 p-1 rounded-lg">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtry */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {activeTab !== 'mesta' && (
          <div className="flex flex-wrap gap-1">
            {delkaButtons.map(btn => (
              <button
                key={btn.value}
                onClick={() => setDelkaFilter(btn.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  delkaFilter === btn.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {(activeTab === 'mesta' ? typButtonsMesta : typButtons).map(btn => (
            <button
              key={btn.value}
              onClick={() => setTypFilter(btn.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                typFilter === btn.value
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Převys 2026 */}
      {activeTab === 'previs2026' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="text-xl font-semibold">Nejžádanější studijní obory 2026</h2>
            <p className="text-slate-600 text-sm mt-1">
              Obory s nejvyšším poměrem přihlášek na místo v 1. kole přijímacího řízení 2026.
              Zobrazeno {previs2026.length} oborů.
            </p>
          </div>

          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-slate-600 w-8">#</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Škola</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Obor</th>
                  <th className="text-center px-3 py-2 font-medium text-slate-600">Délka</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Město</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Přihlášek</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Míst</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Převys</th>
                </tr>
              </thead>
              <tbody>
                {previs2026.map((s, idx) => (
                  <tr key={s.id} className="border-t hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <Link href={`/skola/${s.slug}`} className="text-blue-600 hover:underline font-medium">
                        {s.nazev}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{s.obor}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${delkaColors[s.delka_studia] || 'bg-slate-200 text-slate-700'}`}>
                        {s.delka_studia}L
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{s.obec}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{(s.prihlasky_2026 || 0).toLocaleString('cs-CZ')}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{(s.kapacita_2026 || 0).toLocaleString('cs-CZ')}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-sm font-bold ${previsColor(s.index_poptavky_2026 || 0)}`}>
                        {(s.index_poptavky_2026 || 0).toFixed(1)}×
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y">
            {previs2026.map((s, idx) => (
              <div key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-400 text-sm font-medium shrink-0">{idx + 1}.</span>
                    <Link href={`/skola/${s.slug}`} className="text-blue-600 hover:underline font-medium text-sm truncate">
                      {s.nazev}
                    </Link>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded text-sm font-bold shrink-0 ${previsColor(s.index_poptavky_2026 || 0)}`}>
                    {(s.index_poptavky_2026 || 0).toFixed(1)}×
                  </span>
                </div>
                <div className="text-sm text-slate-600 mb-1 truncate">{s.obor}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`inline-block px-2 py-0.5 rounded font-bold ${delkaColors[s.delka_studia] || 'bg-slate-200 text-slate-700'}`}>
                    {s.delka_studia}L
                  </span>
                  <span className="text-slate-500">{s.obec}</span>
                  <span className="ml-auto text-slate-700">{(s.prihlasky_2026 || 0).toLocaleString('cs-CZ')} přihl.</span>
                  <span className="text-slate-500">{(s.kapacita_2026 || 0).toLocaleString('cs-CZ')} míst</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Obtížnost 2025 */}
      {activeTab === 'obtiznost2025' && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="text-xl font-semibold">Nejobtížnější obory 2025</h2>
            <p className="text-slate-600 text-sm mt-1">
              Seřazeno podle indexu obtížnosti přijetí (kombinace min. bodů, poptávky a selektivity).
              Zobrazeno {obtiznost2025.length} oborů.
            </p>
          </div>

          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-slate-600 w-8">#</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Škola</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Obor</th>
                  <th className="text-center px-3 py-2 font-medium text-slate-600">Délka</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Město</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Min. body</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Převys</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Obtížnost</th>
                </tr>
              </thead>
              <tbody>
                {obtiznost2025.map((s, idx) => {
                  const diffColor = s.obtiznost >= 80 ? 'bg-red-100 text-red-800' :
                                    s.obtiznost >= 60 ? 'bg-orange-100 text-orange-800' :
                                    s.obtiznost >= 40 ? 'bg-amber-100 text-amber-800' :
                                    'bg-slate-100 text-slate-700';
                  return (
                    <tr key={s.id} className="border-t hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <Link href={`/skola/${s.slug}`} className="text-blue-600 hover:underline font-medium">
                          {s.nazev}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{s.obor}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${delkaColors[s.delka_studia] || 'bg-slate-200 text-slate-700'}`}>
                          {s.delka_studia}L
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500">{s.obec}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{s.min_body}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.index_poptavky.toFixed(1)}×</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-sm font-bold ${diffColor}`}>
                          {s.obtiznost.toFixed(0)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y">
            {obtiznost2025.map((s, idx) => {
              const diffColor = s.obtiznost >= 80 ? 'bg-red-100 text-red-800' :
                                s.obtiznost >= 60 ? 'bg-orange-100 text-orange-800' :
                                s.obtiznost >= 40 ? 'bg-amber-100 text-amber-800' :
                                'bg-slate-100 text-slate-700';
              return (
                <div key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-slate-400 text-sm font-medium shrink-0">{idx + 1}.</span>
                      <Link href={`/skola/${s.slug}`} className="text-blue-600 hover:underline font-medium text-sm truncate">
                        {s.nazev}
                      </Link>
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded text-sm font-bold shrink-0 ${diffColor}`}>
                      {s.obtiznost.toFixed(0)}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 mb-1 truncate">{s.obor}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`inline-block px-2 py-0.5 rounded font-bold ${delkaColors[s.delka_studia] || 'bg-slate-200 text-slate-700'}`}>
                      {s.delka_studia}L
                    </span>
                    <span className="text-slate-500">{s.obec}</span>
                    <span className="ml-auto text-slate-700 font-medium">min. {s.min_body}b</span>
                    <span className="text-slate-500">{s.index_poptavky.toFixed(1)}× převis</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Převys podle měst */}
      {activeTab === 'mesta' && (
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Převys poptávky podle měst (2026)</h2>
            <p className="text-slate-600 text-sm mt-1">
              Agregovaná data za všechny školy v daném městě, rozdělená podle typu a délky studia.
            </p>
          </div>

          <div className="space-y-4">
            {cityStats.map(city => (
              <div key={city.obec} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b bg-slate-50 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">{city.obec}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{city.totalPrihlasky.toLocaleString('cs-CZ')} přihl.</span>
                    <span>{city.totalKapacita.toLocaleString('cs-CZ')} míst</span>
                    <span className={`font-bold px-2 py-0.5 rounded ${previsColor(city.totalIndex)}`}>
                      {city.totalIndex.toFixed(1)}× celkem
                    </span>
                  </div>
                </div>
                <div className="divide-y">
                  {city.groups.map(g => {
                    const barWidth = Math.min(100, (g.index / Math.max(...city.groups.map(x => x.index))) * 100);
                    const isSingleSchool = g.schools.length === 1;
                    return (
                      <div key={g.label} className="px-5 py-2.5">
                        <div className="flex items-center gap-4">
                          <span className="w-32 text-sm font-medium shrink-0">
                            {isSingleSchool ? (
                              <Link href={`/skola/${g.schools[0].slug}`} className="text-blue-600 hover:underline">
                                {g.label}
                              </Link>
                            ) : (
                              <span className="text-slate-700">{g.label}</span>
                            )}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="h-5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  g.index >= 5 ? 'bg-red-400' : g.index >= 3 ? 'bg-orange-400' : 'bg-blue-400'
                                }`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                          <span className="w-20 text-right text-xs text-slate-500 tabular-nums shrink-0">
                            {g.prihlasky.toLocaleString('cs-CZ')} / {g.kapacita.toLocaleString('cs-CZ')}
                          </span>
                          <span className={`w-14 text-right font-bold text-sm shrink-0 ${
                            g.index >= 5 ? 'text-red-600' : g.index >= 3 ? 'text-orange-600' : 'text-blue-600'
                          }`}>
                            {g.index.toFixed(1)}×
                          </span>
                          <span className="w-16 text-right text-xs text-slate-400 shrink-0">
                            {g.count} {g.count === 1 ? 'obor' : g.count < 5 ? 'obory' : 'oborů'}
                          </span>
                        </div>
                        {!isSingleSchool && (
                          <div className="mt-1 ml-32 pl-4 text-[11px] text-slate-400 leading-snug">
                            {g.schools.map((school, si) => (
                              <span key={school.slug}>
                                {si > 0 && ', '}
                                <Link href={`/skola/${school.slug}`} className="text-slate-500 hover:text-blue-600 hover:underline">
                                  {school.nazev}
                                </Link>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
