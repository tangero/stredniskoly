'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CitySchoolRow } from '@/lib/cityData';

const TYPE_LABELS: Record<string, string> = {
  GY4: 'GY 4-leté', GY6: 'GY 6-leté', GY8: 'GY 8-leté',
  LYC: 'Lyceum', SOS: 'SOŠ', SOU: 'SOU', NAS: 'Nástavba',
};

function RankPct({ rank, total }: { rank: number; total: number }) {
  const pct = Math.round((1 - (rank - 1) / total) * 100);
  const color = pct >= 70 ? 'text-red-600' : pct >= 40 ? 'text-orange-600' : 'text-green-700';
  return (
    <span className={`font-semibold ${color}`} title={`${rank}. z ${total} škol tohoto typu v ČR`}>
      top {100 - pct + 1}%
    </span>
  );
}

function Delta({ val }: { val: number | null }) {
  if (val === null) return <span className="text-slate-300">—</span>;
  if (Math.abs(val) < 0.5) return <span className="text-slate-400 text-xs">≈ stejné</span>;
  const up = val > 0;
  return (
    <span className={`text-xs font-medium ${up ? 'text-red-600' : 'text-green-700'}`}>
      {up ? '↑' : '↓'}{up ? '+' : ''}{val.toFixed(1)}
    </span>
  );
}

interface Props {
  schools: CitySchoolRow[];
}

type SortKey = 'nazev' | 'prihlasky2026' | 'index2026' | 'avgCjMa2026' | 'delta2026';

export function CitySchoolsTable({ schools }: Props) {
  const [filter, setFilter] = useState<string>('vse');
  const [sort, setSort] = useState<SortKey>('prihlasky2026');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const types = [...new Set(schools.map(s => s.typ))].filter(Boolean).sort();

  const filtered = schools.filter(s => filter === 'vse' || s.typ === filter);

  const sorted = [...filtered].sort((a, b) => {
    let va: number | string | null = null;
    let vb: number | string | null = null;
    if (sort === 'nazev') { va = a.nazev_display; vb = b.nazev_display; }
    else if (sort === 'prihlasky2026') { va = a.prihlasky2026 ?? a.prihlasky2025 ?? 0; vb = b.prihlasky2026 ?? b.prihlasky2025 ?? 0; }
    else if (sort === 'index2026') { va = a.index2026 ?? a.index2025 ?? 0; vb = b.index2026 ?? b.index2025 ?? 0; }
    else if (sort === 'avgCjMa2026') { va = a.avgCjMa2026 ?? -1; vb = b.avgCjMa2026 ?? -1; }
    else if (sort === 'delta2026') { va = a.delta2026 ?? -999; vb = b.delta2026 ?? -999; }

    if (typeof va === 'string' && typeof vb === 'string') {
      return sortDir === 'asc' ? va.localeCompare(vb, 'cs') : vb.localeCompare(va, 'cs');
    }
    const na = (va as number) ?? 0;
    const nb = (vb as number) ?? 0;
    return sortDir === 'asc' ? na - nb : nb - na;
  });

  const toggleSort = (key: SortKey) => {
    if (sort === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSort(key); setSortDir('desc'); }
  };

  const SortTh = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th
      className="text-right px-3 py-2 font-medium text-slate-600 cursor-pointer hover:text-blue-600 select-none whitespace-nowrap"
      onClick={() => toggleSort(k)}
    >
      {children}{sort === k ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
    </th>
  );

  return (
    <div>
      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilter('vse')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === 'vse' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          Vše ({schools.length})
        </button>
        {types.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            {TYPE_LABELS[t] || t} ({schools.filter(s => s.typ === t).length})
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th
                className="text-left px-3 py-2 font-medium text-slate-600 cursor-pointer hover:text-blue-600 select-none"
                onClick={() => toggleSort('nazev')}
              >
                Škola / obor{sort === 'nazev' ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
              </th>
              <th className="text-center px-3 py-2 font-medium text-slate-600 whitespace-nowrap">Typ</th>
              <th className="text-right px-3 py-2 font-medium text-slate-600 whitespace-nowrap">Kapacita 2026</th>
              <SortTh k="prihlasky2026">Přihlášky 2026</SortTh>
              <SortTh k="index2026">Index</SortTh>
              <SortTh k="avgCjMa2026">ČJ+MA průměr b. (max 100)</SortTh>
              <SortTh k="delta2026">Δ vs 2025</SortTh>
              <th className="text-right px-3 py-2 font-medium text-slate-600 whitespace-nowrap">Pořadí v ČR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map(row => {
              const schoolSlug = `${row.redizo}-${row.nazev_display.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
              const has2026 = row.prihlasky2026 !== null;
              return (
                <tr key={row.id} className={`hover:bg-slate-50 ${!has2026 ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-2">
                    <Link href={`/skola/${schoolSlug}`} className="font-medium text-blue-600 hover:underline">
                      {row.nazev_display}
                    </Link>
                    <div className="text-xs text-slate-500">{row.obor}{row.zamereni ? ` — ${row.zamereni}` : ''}</div>
                    {!has2026 && <span className="text-xs text-amber-600">data 2025</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-xs bg-slate-100 text-slate-700 rounded px-1.5 py-0.5">{TYPE_LABELS[row.typ] || row.typ}</span>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {row.kapacita2026 ?? row.kapacita2025 ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {row.prihlasky2026 ?? row.prihlasky2025 ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {(() => {
                      const idx = row.index2026 ?? row.index2025;
                      if (idx === null) return <span className="text-slate-300">—</span>;
                      const color = idx >= 3 ? 'text-red-600' : idx >= 2 ? 'text-orange-600' : 'text-green-700';
                      return <span className={`font-semibold ${color}`}>{idx.toFixed(1)}×</span>;
                    })()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.avgCjMa2026 !== null
                      ? <span className="font-semibold">{row.avgCjMa2026.toFixed(1)}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Delta val={row.delta2026} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.rankInType2026 && row.typeTotal2026
                      ? <RankPct rank={row.rankInType2026} total={row.typeTotal2026} />
                      : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {sorted.map(row => {
          const schoolSlug = `${row.redizo}-${row.nazev_display.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
          const has2026 = row.prihlasky2026 !== null;
          const idx = row.index2026 ?? row.index2025;
          return (
            <div key={row.id} className={`bg-white rounded-xl border border-slate-200 p-4 ${!has2026 ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <Link href={`/skola/${schoolSlug}`} className="font-semibold text-blue-600 hover:underline text-sm">
                    {row.nazev_display}
                  </Link>
                  <div className="text-xs text-slate-500 mt-0.5">{row.obor}{row.zamereni ? ` — ${row.zamereni}` : ''}</div>
                </div>
                <span className="text-xs bg-slate-100 text-slate-700 rounded px-1.5 py-0.5 shrink-0">{TYPE_LABELS[row.typ] || row.typ}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center bg-slate-50 rounded p-2">
                  <div className="font-bold text-slate-900">{row.prihlasky2026 ?? row.prihlasky2025 ?? '—'}</div>
                  <div className="text-slate-500">přihlášek</div>
                </div>
                <div className="text-center bg-slate-50 rounded p-2">
                  <div className={`font-bold ${idx !== null && idx >= 3 ? 'text-red-600' : idx !== null && idx >= 2 ? 'text-orange-600' : 'text-green-700'}`}>
                    {idx !== null ? `${idx.toFixed(1)}×` : '—'}
                  </div>
                  <div className="text-slate-500">index</div>
                </div>
                <div className="text-center bg-slate-50 rounded p-2">
                  <div className="font-bold text-slate-900">
                    {row.avgCjMa2026 !== null ? row.avgCjMa2026.toFixed(1) : '—'}
                  </div>
                  <div className="text-slate-500">ČJ+MA b. (max 100)</div>
                </div>
              </div>
              {!has2026 && <div className="mt-2 text-xs text-amber-600">Zobrazena data 2025 (2026 nedostupná)</div>}
            </div>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <div className="text-center text-slate-500 py-8">Žádné školy pro vybraný filtr.</div>
      )}
    </div>
  );
}
