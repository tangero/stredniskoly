'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocationCheckerProps {
  school: any;
  onSubmit: (acceptable: 'yes' | 'maybe' | 'no') => void;
}

export function LocationChecker({ school, onSubmit }: LocationCheckerProps) {
  const [acceptable, setAcceptable] = useState<'yes' | 'maybe' | 'no' | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (acceptable) {
      onSubmit(acceptable);
    }
  };

  const options = [
    { value: 'yes', label: 'Ano, v pohodě', emoji: '✅', color: 'border-green-600 bg-green-50' },
    { value: 'maybe', label: 'Trochu daleko', emoji: '⚠️', color: 'border-amber-600 bg-amber-50' },
    { value: 'no', label: 'Příliš daleko', emoji: '❌', color: 'border-red-600 bg-red-50' },
  ] as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Krok 3: Lokalita</h2>
        <p className="text-slate-600">Je tato škola pro vás dobře dostupná?</p>
      </div>

      {/* School location */}
      <div className="bg-slate-50 rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <MapPin className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <div className="font-semibold text-slate-900 mb-1">{school.nazev}</div>
            <div className="text-sm text-slate-600">
              {school.ulice} {school.cislo_or}
            </div>
            <div className="text-sm text-slate-600">
              {school.obec}, {school.psc}
            </div>
            <div className="text-sm text-slate-600 mt-1">{school.kraj}</div>
          </div>
        </div>

        {/* Map link */}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${school.nazev}, ${school.ulice} ${school.cislo_or}, ${school.obec}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          Ukázat na mapě →
        </a>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 Tip: Ověřte si dojezdový čas z vašeho bydliště pomocí{' '}
          <a
            href="https://www.google.com/maps"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            Google Maps
          </a>{' '}
          nebo použijte náš{' '}
          <a href="/dostupnost" className="underline hover:no-underline">
            kalkulátor dostupnosti
          </a>
          .
        </p>
      </div>

      {/* Options */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">Je vzdálenost přijatelná?</label>
        <div className="space-y-3">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setAcceptable(option.value)}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all',
                acceptable === option.value ? option.color : 'bg-white border-slate-200 hover:border-slate-300'
              )}
            >
              <span className="text-2xl">{option.emoji}</span>
              <span className="font-semibold text-slate-900">{option.label}</span>
              {acceptable === option.value && (
                <div className="ml-auto">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={!acceptable}
        className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Další krok →
      </button>
    </form>
  );
}
