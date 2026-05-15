'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
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

export function ResultsClient({
  results,
  year,
  totalKapacita,
  totalPrijati,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterKraj, setFilterKraj] = useState('');
  const [rankingType, setRankingType] = useState('GY4');

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

      {/* Placeholder pro sekce Task 7 */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-slate-400 text-center">
          Další sekce budou doplněny v Task 7…
        </div>
      </section>
    </div>
  );
}
