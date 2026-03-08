'use client';

import { useState } from 'react';
import { DollarSign } from 'lucide-react';

interface CostCalculatorProps {
  school: any;
  program: any;
  onSubmit: (budget: number) => void;
}

export function CostCalculator({ school, program, onSubmit }: CostCalculatorProps) {
  const [budget, setBudget] = useState(20000);

  // Estimated costs
  const tuition = 0; // Most public schools are free
  const textbooks = 2000;
  const supplies = 1000;
  const meals = 15000;
  const transport = 5000;
  const total = tuition + textbooks + supplies + meals + transport;

  const isAffordable = budget >= total;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(budget);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Krok 4: Finance</h2>
        <p className="text-slate-600">Kolik můžete ročně investovat do studia?</p>
      </div>

      {/* Budget slider */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">Roční rozpočet (Kč)</label>
        <input
          type="range"
          min="0"
          max="100000"
          step="1000"
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="mt-2 text-center">
          <div className="text-4xl font-bold text-slate-900">{budget.toLocaleString('cs-CZ')} Kč/rok</div>
        </div>
      </div>

      {/* School tuition */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-green-900">Školné</span>
          <span className="text-lg font-bold text-green-900">{tuition} Kč/rok ✅</span>
        </div>
        <div className="text-xs text-green-700 mt-1">Zřizovatel: {school.zrizovatel || 'veřejný'}</div>
      </div>

      {/* Cost breakdown */}
      <div className="bg-slate-50 rounded-lg p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Odhadované náklady
        </h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Učebnice</span>
            <span className="font-medium text-slate-900">~{textbooks.toLocaleString('cs-CZ')} Kč</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Pomůcky</span>
            <span className="font-medium text-slate-900">~{supplies.toLocaleString('cs-CZ')} Kč</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Strava (odhad)</span>
            <span className="font-medium text-slate-900">~{meals.toLocaleString('cs-CZ')} Kč</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Doprava (odhad)</span>
            <span className="font-medium text-slate-900">~{transport.toLocaleString('cs-CZ')} Kč</span>
          </div>

          <div className="pt-3 border-t border-slate-200">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-900">Celkem</span>
              <span className="text-xl font-bold text-slate-900">~{total.toLocaleString('cs-CZ')} Kč/rok</span>
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-500">* Odhady se mohou lišit</div>
      </div>

      {/* Affordability check */}
      <div
        className={`rounded-lg p-4 border-2 ${
          isAffordable ? 'bg-green-50 border-green-600' : 'bg-amber-50 border-amber-600'
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">{isAffordable ? '✅' : '⚠️'}</span>
          <div>
            <div className="font-semibold mb-1">{isAffordable ? 'V rozpočtu' : 'Nad rozpočtem'}</div>
            <div className="text-sm">
              {isAffordable ? (
                <>Vaš rozpočet pokrývá odhadované náklady.</>
              ) : (
                <>
                  Odhadované náklady přesahují váš rozpočet o ~
                  {(total - budget).toLocaleString('cs-CZ')} Kč. Zvažte úpravu rozpočtu nebo hledání stipendií.
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Zobrazit výsledky →
      </button>
    </form>
  );
}
