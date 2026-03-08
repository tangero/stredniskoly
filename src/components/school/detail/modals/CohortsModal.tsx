'use client';

import { Modal } from '@/components/ui/Modal';

interface CohortsModalProps {
  isOpen: boolean;
  onClose: () => void;
  extendedStats: any;
}

const COHORT_DEFS = [
  { label: 'Výborný matematik', emoji: '🧮', level: 'Výborní', description: 'Silný v matematice, celkově výborný' },
  { label: 'Výborný vyvážený', emoji: '⭐', level: 'Výborní', description: 'Vyrovnané výsledky, celkově výborný' },
  { label: 'Výborný humanitní', emoji: '📖', level: 'Výborní', description: 'Silný v češtině, celkově výborný' },
  { label: 'Dobrý matematik', emoji: '📐', level: 'Dobří', description: 'Silný v matematice, celkově dobrý' },
  { label: 'Dobrý vyvážený', emoji: '👍', level: 'Dobří', description: 'Vyrovnané výsledky, celkově dobrý' },
  { label: 'Dobrý humanitní', emoji: '📝', level: 'Dobří', description: 'Silný v češtině, celkově dobrý' },
  { label: 'Slabší matematik', emoji: '🔢', level: 'Slabší', description: 'Silný v matematice, celkově slabší' },
  { label: 'Slabší vyvážený', emoji: '📚', level: 'Slabší', description: 'Vyrovnané výsledky, celkově slabší' },
  { label: 'Slabší humanitní', emoji: '✏️', level: 'Slabší', description: 'Silný v češtině, celkově slabší' },
];

function parseCohorts(raw: number[] | null) {
  if (!raw || raw.length === 0) return null;
  const total = raw.reduce((s, v) => s + v, 0);
  if (total === 0) return null;
  return {
    total,
    cohorts: COHORT_DEFS.map((def, i) => ({
      ...def,
      count: raw[i] || 0,
      percentage: Math.round(((raw[i] || 0) / total) * 100),
    })).filter(c => c.count > 0),
  };
}

export function CohortsModal({ isOpen, onClose, extendedStats }: CohortsModalProps) {
  const parsed = parseCohorts(extendedStats?.cohorts);
  if (!parsed) return null;

  const { total, cohorts } = parsed;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Profily přijatých studentů" size="xl">
      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-slate-50 rounded-lg p-4 text-center">
          <div className="text-sm text-slate-600 mb-1">Celkem přijato</div>
          <div className="text-3xl font-bold text-slate-900">{total} studentů</div>
        </div>

        {/* Cohorts grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {cohorts.map((cohort, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-lg p-5 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{cohort.emoji}</span>
                  <div>
                    <h3 className="font-semibold text-slate-900">{cohort.label}</h3>
                    <p className="text-sm text-slate-500">{cohort.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{cohort.percentage}%</div>
                  <div className="text-xs text-slate-500">{cohort.count} studentů</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Insight */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="font-medium text-blue-900 mb-2">💡 Co to znamená?</div>
          <p className="text-sm text-blue-800">
            Profily ukazují, jaké typy studentů se na tuto školu dostávají. Pokud patříte do vyššího profilu,
            máte velmi vysokou šanci na přijetí. Nižší profily mají nižší šanci, ale stále je možné se dostat.
          </p>
        </div>
      </div>
    </Modal>
  );
}
