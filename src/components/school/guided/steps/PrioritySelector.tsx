'use client';

import { useState } from 'react';
import { Star, Monitor, Globe, Bus, DollarSign, Activity, Award, Users, TrendingUp, Phone, Plane, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrioritySelectorProps {
  onSubmit: (priorities: string[]) => void;
}

const priorities = [
  { id: 'quality', label: 'Kvalita výuky', icon: Star, description: 'ČŠI hodnocení, výsledky maturit' },
  { id: 'equipment', label: 'Moderní vybavení', icon: Monitor, description: 'PC učebny, laboratoře, tablety' },
  { id: 'languages', label: 'Jazyky', icon: Globe, description: 'Více než EN (DE, FR, ES...)' },
  { id: 'accessibility', label: 'Dostupnost', icon: Bus, description: 'Doprava, dojezdový čas' },
  { id: 'tuition', label: 'Školné nízké/žádné', icon: DollarSign, description: 'Finanční náročnost' },
  { id: 'activities', label: 'Zájmové kroužky', icon: Activity, description: 'Sport, hudba, věda' },
  { id: 'reputation', label: 'Dobrá pověst', icon: Award, description: 'ČŠI, reference rodičů' },
  { id: 'small_classes', label: 'Malé třídy', icon: Users, description: 'Individuální přístup' },
  { id: 'results', label: 'Studijní výsledky', icon: TrendingUp, description: '% přijatých na VŠ' },
  { id: 'communication', label: 'Komunikace', icon: Phone, description: 'Online IS, email' },
  { id: 'international', label: 'Mezinárodní', icon: Plane, description: 'Výměnné pobyty, projekty' },
  { id: 'scholarships', label: 'Stipendia', icon: Gift, description: 'Finanční podpora' },
];

export function PrioritySelector({ onSubmit }: PrioritySelectorProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const maxSelections = 5;

  const togglePriority = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((p) => p !== id));
    } else if (selected.length < maxSelections) {
      setSelected([...selected, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.length > 0) {
      onSubmit(selected);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Krok 2: Priority rodiny</h2>
        <p className="text-slate-600">Co je pro vás důležité? (vyberte až {maxSelections})</p>
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
        <span className="text-sm text-slate-600">Vybráno</span>
        <span className={cn('text-lg font-bold', selected.length === maxSelections ? 'text-green-600' : 'text-slate-900')}>
          {selected.length} / {maxSelections}
        </span>
      </div>

      {/* Grid of priorities */}
      <div className="grid md:grid-cols-2 gap-3">
        {priorities.map((priority) => {
          const isSelected = selected.includes(priority.id);
          const Icon = priority.icon;

          return (
            <button
              key={priority.id}
              type="button"
              onClick={() => togglePriority(priority.id)}
              disabled={!isSelected && selected.length >= maxSelections}
              className={cn(
                'flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all',
                isSelected
                  ? 'bg-blue-50 border-blue-600'
                  : 'bg-white border-slate-200 hover:border-blue-300',
                !isSelected && selected.length >= maxSelections && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className={cn('flex-shrink-0 p-2 rounded-lg', isSelected ? 'bg-blue-100' : 'bg-slate-100')}>
                <Icon className={cn('w-5 h-5', isSelected ? 'text-blue-600' : 'text-slate-600')} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn('font-semibold mb-1', isSelected ? 'text-blue-900' : 'text-slate-900')}>
                  {priority.label}
                </div>
                <div className="text-xs text-slate-600">{priority.description}</div>
              </div>
              {isSelected && (
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={selected.length === 0}
        className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Další krok →
      </button>
    </form>
  );
}
