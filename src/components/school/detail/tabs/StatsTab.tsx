'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Users, Trophy, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TestDifficultyModal } from '../modals/TestDifficultyModal';
import { CohortsModal } from '../modals/CohortsModal';

interface StatsTabProps {
  school: any;
  program: any;
  extendedStats: any;
}

// Trend comparison component
function TrendComparisonCard({ program }: { program: any }) {
  const minBodyChange = program.min_body_change || 0;
  const prihlasenChange = program.prihlasen_change || 0;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
      <h3 className="font-semibold text-slate-900">Vývoj</h3>

      {/* Min. body trend */}
      <div>
        <div className="text-sm text-slate-600 mb-2">Minimální body</div>
        <div className="flex items-baseline gap-4">
          <div className="text-2xl font-bold text-slate-900">{program.min_body}</div>
          {minBodyChange !== 0 && (
            <div
              className={cn(
                'flex items-center gap-1 text-sm font-medium',
                minBodyChange > 0 ? 'text-red-600' : 'text-green-600'
              )}
            >
              {minBodyChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {minBodyChange > 0 ? '+' : ''}
              {minBodyChange}
            </div>
          )}
        </div>
      </div>

      {/* Přihlášky trend */}
      <div>
        <div className="text-sm text-slate-600 mb-2">Počet přihlášek</div>
        <div className="flex items-baseline gap-4">
          <div className="text-2xl font-bold text-slate-900">{program.prihlasen || 'N/A'}</div>
          {prihlasenChange !== 0 && (
            <div
              className={cn(
                'flex items-center gap-1 text-sm font-medium',
                prihlasenChange > 0 ? 'text-amber-600' : 'text-slate-600'
              )}
            >
              {prihlasenChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {prihlasenChange > 0 ? '+' : ''}
              {prihlasenChange}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Priority distribution component
function PriorityDistributionCard({ extendedStats }: { extendedStats: any }) {
  if (!extendedStats?.priority_pcts) {
    return null;
  }

  const priorities = [
    { label: '1. priorita', value: extendedStats.priority_pcts[0] || 0 },
    { label: '2. priorita', value: extendedStats.priority_pcts[1] || 0 },
    { label: '3. priorita', value: extendedStats.priority_pcts[2] || 0 },
    { label: '4. priorita', value: extendedStats.priority_pcts[3] || 0 },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <h3 className="font-semibold text-slate-900 mb-4">Kam si uchazeči dali školu</h3>

      <div className="space-y-3">
        {priorities.map((priority, idx) => (
          <div key={idx}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600">{priority.label}</span>
              <span className="font-medium text-slate-900">{priority.value}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${priority.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-slate-500">
        💡 Podíl priorit ukazuje zájem uchazečů, nikoliv šanci na přijetí — ta závisí výhradně na bodech ze zkoušky
      </div>
    </div>
  );
}

// Acceptance by priority component
function AcceptanceByPriorityCard({ extendedStats }: { extendedStats: any }) {
  if (!extendedStats?.prihlasky_priority || !extendedStats?.prijati_priority) {
    return null;
  }

  const calculateAcceptanceRate = (accepted: number, applied: number) => {
    if (!applied || applied === 0) return 0;
    return Math.round((accepted / applied) * 100);
  };

  const priorities = [
    {
      label: '1. priorita',
      applied: extendedStats.prihlasky_priority[0] || 0,
      accepted: extendedStats.prijati_priority[0] || 0,
    },
    {
      label: '2. priorita',
      applied: extendedStats.prihlasky_priority[1] || 0,
      accepted: extendedStats.prijati_priority[1] || 0,
    },
    {
      label: '3. priorita',
      applied: extendedStats.prihlasky_priority[2] || 0,
      accepted: extendedStats.prijati_priority[2] || 0,
    },
    {
      label: '4. priorita',
      applied: extendedStats.prihlasky_priority[3] || 0,
      accepted: extendedStats.prijati_priority[3] || 0,
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <h3 className="font-semibold text-slate-900 mb-4">Šance přijetí podle priority</h3>

      <div className="space-y-3">
        {priorities.map((priority, idx) => {
          const rate = calculateAcceptanceRate(priority.accepted, priority.applied);
          return (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-sm text-slate-600">{priority.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-900">{rate}%</span>
                <span className="text-xs text-slate-500">
                  ({priority.accepted}/{priority.applied})
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="text-sm text-blue-900">
          💡 <strong>Tip:</strong> O přijetí rozhoduje výhradně váš počet bodů z testů, nikoliv pořadí škol na přihlášce. Priorita určuje, na kterou školu nastoupíte, pokud jste přijati na více škol.
        </div>
      </div>
    </div>
  );
}

// Test difficulty preview component (triggers modal)
function TestDifficultyCard({ extendedStats, onOpenModal }: { extendedStats: any; onOpenModal: () => void }) {
  if (!extendedStats?.cj_prumer && !extendedStats?.ma_prumer) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <h3 className="font-semibold text-slate-900 mb-4">Náročnost přijímaček</h3>

      <div className="space-y-3">
        {extendedStats.cj_prumer && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">ČJ průměr</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-slate-900">
                {Math.round(extendedStats.cj_prumer)}/100
              </span>
              <span className="text-xs text-slate-500">
                {extendedStats.cj_prumer > 65 ? '(lehčí)' : extendedStats.cj_prumer > 50 ? '(střední)' : '(těžší)'}
              </span>
            </div>
          </div>
        )}

        {extendedStats.ma_prumer && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">MA průměr</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-slate-900">
                {Math.round(extendedStats.ma_prumer)}/100
              </span>
              <span className="text-xs text-slate-500">
                {extendedStats.ma_prumer > 65 ? '(lehčí)' : extendedStats.ma_prumer > 50 ? '(střední)' : '(těžší)'}
              </span>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onOpenModal}
        className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
      >
        Zobrazit detail
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// Cohort definitions for the 9 categories
const COHORT_DEFS = [
  { label: 'Výborný matematik', emoji: '🧮', level: 'Výborní' },
  { label: 'Výborný vyvážený', emoji: '⭐', level: 'Výborní' },
  { label: 'Výborný humanitní', emoji: '📖', level: 'Výborní' },
  { label: 'Dobrý matematik', emoji: '📐', level: 'Dobří' },
  { label: 'Dobrý vyvážený', emoji: '👍', level: 'Dobří' },
  { label: 'Dobrý humanitní', emoji: '📝', level: 'Dobří' },
  { label: 'Slabší matematik', emoji: '🔢', level: 'Slabší' },
  { label: 'Slabší vyvážený', emoji: '📚', level: 'Slabší' },
  { label: 'Slabší humanitní', emoji: '✏️', level: 'Slabší' },
];

// Transform raw cohorts number[] into structured data
function parseCohorts(raw: number[] | null) {
  if (!raw || raw.length === 0) return null;
  const total = raw.reduce((s, v) => s + v, 0);
  if (total === 0) return null;
  return COHORT_DEFS.map((def, i) => ({
    ...def,
    count: raw[i] || 0,
    percentage: Math.round(((raw[i] || 0) / total) * 100),
  })).filter(c => c.count > 0);
}

// Cohorts preview component (triggers modal)
function CohortsCard({ extendedStats, onOpenModal }: { extendedStats: any; onOpenModal: () => void }) {
  const cohorts = parseCohorts(extendedStats?.cohorts);
  if (!cohorts || cohorts.length === 0) return null;

  const top3 = cohorts.slice(0, 3);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <h3 className="font-semibold text-slate-900 mb-4">Profily přijatých studentů</h3>

      <div className="space-y-2">
        {top3.map((cohort, idx) => (
          <div key={idx} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{cohort.emoji}</span>
              <span className="text-sm text-slate-700">{cohort.label}</span>
            </div>
            <span className="text-sm font-medium text-slate-900">{cohort.percentage}%</span>
          </div>
        ))}
      </div>

      <button
        onClick={onOpenModal}
        className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
      >
        Zobrazit detail
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// Main StatsTab component
export function StatsTab({ school, program, extendedStats }: StatsTabProps) {
  const [testDifficultyOpen, setTestDifficultyOpen] = useState(false);
  const [cohortsOpen, setCohortsOpen] = useState(false);

  return (
    <>
      <div className="space-y-6">
        {/* Trend comparison */}
        <TrendComparisonCard program={program} />

        {/* Grid layout for cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <PriorityDistributionCard extendedStats={extendedStats} />
          <AcceptanceByPriorityCard extendedStats={extendedStats} />
          <TestDifficultyCard extendedStats={extendedStats} onOpenModal={() => setTestDifficultyOpen(true)} />
          <CohortsCard extendedStats={extendedStats} onOpenModal={() => setCohortsOpen(true)} />
        </div>
      </div>

      {/* Modals */}
      <TestDifficultyModal
        isOpen={testDifficultyOpen}
        onClose={() => setTestDifficultyOpen(false)}
        extendedStats={extendedStats}
      />
      <CohortsModal isOpen={cohortsOpen} onClose={() => setCohortsOpen(false)} extendedStats={extendedStats} />
    </>
  );
}
