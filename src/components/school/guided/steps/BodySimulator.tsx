'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BodySimulatorProps {
  program: any;
  onSubmit: (body: number, breakdown?: { cj: number; ma: number }) => void;
}

export function BodySimulator({ program, onSubmit }: BodySimulatorProps) {
  const [body, setBody] = useState(program.min_body || 500);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [cj, setCj] = useState(50);
  const [ma, setMa] = useState(50);

  // Calculate total from breakdown
  const totalFromBreakdown = (cj * 5 + ma * 5) * 2;

  const getProfileLabel = (value: number) => {
    if (value < 700) return { label: 'Podprůměrné', color: 'text-red-600', emoji: '📖' };
    if (value < 850) return { label: 'Průměrné', color: 'text-amber-600', emoji: '📚' };
    return { label: 'Nadprůměrné', color: 'text-green-600', emoji: '🏆' };
  };

  const profile = getProfileLabel(showBreakdown ? totalFromBreakdown : body);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalBody = showBreakdown ? totalFromBreakdown : body;
    onSubmit(finalBody, showBreakdown ? { cj, ma } : undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Krok 1: Body žáka</h2>
        <p className="text-slate-600">Jaké body očekáváte z jednotných přijímacích zkoušek?</p>
      </div>

      {!showBreakdown ? (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Celkový počet bodů (0-1000)</label>
          <input
            type="range"
            min="0"
            max="1000"
            step="10"
            value={body}
            onChange={(e) => setBody(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="mt-2 text-center">
            <div className="text-4xl font-bold text-slate-900">{body} bodů</div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Český jazyk (0-100)</label>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={cj}
              onChange={(e) => setCj(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="mt-1 text-center text-lg font-semibold text-slate-900">{cj}/100</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Matematika (0-100)</label>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={ma}
              onChange={(e) => setMa(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="mt-1 text-center text-lg font-semibold text-slate-900">{ma}/100</div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-700 mb-1">Celkem</div>
            <div className="text-3xl font-bold text-blue-900">{totalFromBreakdown} bodů</div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
      >
        {showBreakdown ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Zjednodušit
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Upřesnit podle předmětů
          </>
        )}
      </button>

      {/* Profile */}
      <div className="bg-slate-50 rounded-lg p-6 text-center">
        <div className="text-sm text-slate-600 mb-2">Váš profil</div>
        <div className="flex items-center justify-center gap-3">
          <span className="text-4xl">{profile.emoji}</span>
          <div>
            <div className={`text-2xl font-bold ${profile.color}`}>{profile.label}</div>
            <div className="text-sm text-slate-500">
              {showBreakdown ? totalFromBreakdown : body} bodů
            </div>
          </div>
        </div>
      </div>

      {/* Comparison with school */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-900 mb-2">
          <strong>Tato škola:</strong> Min. {program.min_body} bodů
        </div>
        <div className="text-sm text-blue-800">
          {(showBreakdown ? totalFromBreakdown : body) >= program.min_body ? (
            <>✅ Máte dostatek bodů pro tuto školu</>
          ) : (
            <>
              ⚠️ Je potřeba ještě {program.min_body - (showBreakdown ? totalFromBreakdown : body)} bodů
            </>
          )}
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Další krok →
      </button>
    </form>
  );
}
