'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { SchoolDetail, RelatedSchool } from '@/types/school';

// Info tooltip komponenta - exportujeme pro použití v jiných komponentách
interface InfoTooltipProps {
  title: string;
  children: React.ReactNode;
}

export function InfoTooltip({ title, children }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Zavřít při kliknutí mimo
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <span className="relative inline-flex items-center" ref={tooltipRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ml-1 w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs inline-flex items-center justify-center cursor-help transition-colors flex-shrink-0"
        aria-label={`Nápověda: ${title}`}
      >
        ?
      </button>
      {isOpen && (
        <div className="fixed z-[100] w-80 max-w-[90vw] p-4 bg-slate-800 text-white text-sm rounded-lg shadow-2xl"
             style={{
               top: '50%',
               left: '50%',
               transform: 'translate(-50%, -50%)'
             }}>
          <div className="flex justify-between items-start mb-2">
            <div className="font-semibold text-base">{title}</div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white text-lg leading-none ml-2"
            >
              ×
            </button>
          </div>
          <div className="text-slate-300 text-sm leading-relaxed">{children}</div>
        </div>
      )}
      {/* Overlay pro zavření */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[99] bg-black/20"
          onClick={() => setIsOpen(false)}
        />
      )}
    </span>
  );
}

// Lokální verze createSlug pro client component
function createSlug(name: string, obor?: string): string {
  let slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (obor) {
    const oborSlug = obor
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    slug = `${slug}-${oborSlug}`;
  }

  return slug;
}

// Deduplikace a agregace škol podle ID + počet neevidovaných
interface DeduplicationResult {
  schools: RelatedSchool[];
  missingCount: number;  // počet uchazečů na neevidované obory
  missingPct: number;    // procento uchazečů na neevidované obory
}

function deduplicateSchools(schools: RelatedSchool[]): DeduplicationResult {
  const schoolMap = new Map<string, RelatedSchool>();
  let missingCount = 0;
  let missingPct = 0;

  for (const school of schools) {
    // Školy bez názvu = učební obory bez maturity nebo jiné neevidované
    if (!school.nazev || school.nazev === school.id.split('_')[0]) {
      missingCount += school.count;
      missingPct += school.pct;
      continue;
    }

    const existing = schoolMap.get(school.id);
    if (existing) {
      // Agregovat počty a procenta
      existing.count += school.count;
      existing.pct += school.pct;
    } else {
      schoolMap.set(school.id, { ...school });
    }
  }

  // Seřadit podle procent sestupně
  return {
    schools: Array.from(schoolMap.values()).sort((a, b) => b.pct - a.pct),
    missingCount,
    missingPct
  };
}

interface Props {
  schoolDetail: SchoolDetail | null;
  priorityCounts: number[];
}

// Funkce pro určení obtížnosti podle min_body (v bodech, max ~100 z JPZ)
function getDifficultyFromMinBody(minBody: number): {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  // Prahy přepočítané na skutečné body (původně pro % škálu)
  if (minBody >= 60) {
    return { label: 'Velmi těžké', color: 'text-red-700', bgColor: 'bg-red-100', borderColor: 'border-red-500' };
  }
  if (minBody >= 45) {
    return { label: 'Těžké', color: 'text-orange-700', bgColor: 'bg-orange-100', borderColor: 'border-orange-500' };
  }
  if (minBody >= 30) {
    return { label: 'Střední', color: 'text-yellow-700', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-500' };
  }
  return { label: 'Snazší', color: 'text-green-700', bgColor: 'bg-green-100', borderColor: 'border-green-500' };
}

function RelatedSchoolCard({ school }: { school: RelatedSchool }) {
  const slug = `${school.id.split('_')[0]}-${createSlug(school.nazev, school.obor)}`;
  const difficulty = getDifficultyFromMinBody(school.min_body);

  return (
    <Link
      href={`/skola/${slug}`}
      className={`block px-3 py-2 bg-white rounded-lg hover:bg-slate-50 transition-colors border-l-4 ${difficulty.borderColor} shadow-sm`}
    >
      {/* Řádek 1: Název školy + procento */}
      <div className="flex justify-between items-center gap-2">
        <div className="font-medium text-slate-900 truncate text-sm">{school.nazev}</div>
        <div className="text-lg font-bold text-blue-600 shrink-0">{school.pct.toFixed(1)}%</div>
      </div>
      {/* Řádek 2: Obor, město, body, počet uchazečů */}
      <div className="flex justify-between items-center gap-2 mt-0.5">
        <div className="text-xs text-slate-500 truncate">
          {school.obor} • {school.obec}
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs">
          <span className="text-slate-500">{school.count} uch.</span>
          <span className={`px-1.5 py-0.5 rounded font-medium ${difficulty.bgColor} ${difficulty.color}`} title="Minimální body pro přijetí">
            min {school.min_body} b.
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ApplicantChoicesSection({ schoolDetail, priorityCounts }: Props) {
  const [selectedPriority, setSelectedPriority] = useState<1 | 2 | 3>(1);

  if (!schoolDetail) {
    return null;
  }

  const p1Count = priorityCounts[0] || 0;
  const p2Count = priorityCounts[1] || 0;
  const p3Count = priorityCounts[2] || 0;

  // Získat data podle vybrané priority
  const getRelatedSchools = () => {
    if (selectedPriority === 1 && schoolDetail.as_p1) {
      // Kombinovat a deduplikovat záložní volby
      const allBackup = [
        ...(schoolDetail.as_p1.backup_p2 || []),
        ...(schoolDetail.as_p1.backup_p3 || [])
      ];
      const backupResult = deduplicateSchools(allBackup);
      return {
        total: schoolDetail.as_p1.total,
        backup: backupResult.schools,
        backupMissing: { count: backupResult.missingCount, pct: backupResult.missingPct },
        label: '1. volbu',
        description: 'Kam dali své záložní volby?'
      };
    }
    if (selectedPriority === 2 && schoolDetail.as_p2) {
      const preferredResult = deduplicateSchools(schoolDetail.as_p2.preferred_p1 || []);
      const backupResult = deduplicateSchools(schoolDetail.as_p2.backup_p3 || []);
      return {
        total: schoolDetail.as_p2.total,
        preferred: preferredResult.schools,
        preferredMissing: { count: preferredResult.missingCount, pct: preferredResult.missingPct },
        backup: backupResult.schools,
        backupMissing: { count: backupResult.missingCount, pct: backupResult.missingPct },
        label: '2. volbu',
        description: 'Jakou měli 1. volbu a kam dali 3. volbu?'
      };
    }
    if (selectedPriority === 3 && schoolDetail.as_p3) {
      // Kombinovat a deduplikovat preferované volby
      const allPreferred = [
        ...(schoolDetail.as_p3.preferred_p1 || []),
        ...(schoolDetail.as_p3.preferred_p2 || [])
      ];
      const preferredResult = deduplicateSchools(allPreferred);
      return {
        total: schoolDetail.as_p3.total,
        preferred: preferredResult.schools,
        preferredMissing: { count: preferredResult.missingCount, pct: preferredResult.missingPct },
        label: '3. volbu',
        description: 'Jaké měli preferované volby?'
      };
    }
    return null;
  };

  const relatedData = getRelatedSchools();

  if (!relatedData || relatedData.total === 0) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold mb-2">Kam se hlásí ostatní uchazeči</h2>
      <p className="text-sm text-slate-600 mb-4">
        Vyberte, jakou prioritu měl tento obor u uchazečů, a uvidíte jejich ostatní volby.
      </p>

      {/* Priority tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedPriority(1)}
          className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 ${
            selectedPriority === 1
              ? 'bg-green-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <span className="hidden sm:inline">Tento obor jako</span> 1. volba
          <span className={`px-2 py-0.5 rounded text-xs ${
            selectedPriority === 1 ? 'bg-green-600' : 'bg-slate-200'
          }`}>
            {p1Count}
          </span>
        </button>
        <button
          onClick={() => setSelectedPriority(2)}
          className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 ${
            selectedPriority === 2
              ? 'bg-yellow-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <span className="hidden sm:inline">Tento obor jako</span> 2. volba
          <span className={`px-2 py-0.5 rounded text-xs ${
            selectedPriority === 2 ? 'bg-yellow-600' : 'bg-slate-200'
          }`}>
            {p2Count}
          </span>
        </button>
        <button
          onClick={() => setSelectedPriority(3)}
          className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 ${
            selectedPriority === 3
              ? 'bg-red-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <span className="hidden sm:inline">Tento obor jako</span> 3. volba
          <span className={`px-2 py-0.5 rounded text-xs ${
            selectedPriority === 3 ? 'bg-red-600' : 'bg-slate-200'
          }`}>
            {p3Count}
          </span>
        </button>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6">
        <p className="text-blue-800">
          <strong>{relatedData.total} uchazečů</strong> dalo tento obor jako svou{' '}
          <strong className={
            selectedPriority === 1 ? 'text-green-600' :
            selectedPriority === 2 ? 'text-yellow-600' : 'text-red-600'
          }>
            {relatedData.label}
          </strong>
          {selectedPriority === 1 ? ' (nejvíce chtěli)' : ''}. {relatedData.description}
        </p>
      </div>

      {/* Related schools - 1 sloupec */}
      <div className="space-y-6">
        {/* Preferred schools (for p2, p3) */}
        {relatedData.preferred && relatedData.preferred.length > 0 && (
          <div>
            <h3 className="font-medium text-sm text-slate-700 mb-3">
              {selectedPriority === 2 ? 'Jejich 1. volba (preferovaná škola):' : 'Jejich preferované volby:'}
            </h3>
            <div className="space-y-2">
              {relatedData.preferred.slice(0, 8).map((school) => (
                <RelatedSchoolCard key={school.id} school={school} />
              ))}
            </div>
            {/* Neevidované obory */}
            {relatedData.preferredMissing && relatedData.preferredMissing.count > 0 && (
              <div className="mt-3 px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-600">
                <span className="font-medium">{relatedData.preferredMissing.pct.toFixed(1)}%</span> uchazečů
                ({relatedData.preferredMissing.count}) si dalo obory bez přijímacích zkoušek (učňovské obory,
                nástavby apod.), které zde neevidujeme.
              </div>
            )}
          </div>
        )}

        {/* Backup schools */}
        {relatedData.backup && relatedData.backup.length > 0 && (
          <div>
            <h3 className="font-medium text-sm text-slate-700 mb-3">
              {selectedPriority === 1 ? 'Jejich záložní volby:' :
               selectedPriority === 2 ? 'Jejich 3. volba (záloha):' : ''}
            </h3>
            <div className="space-y-2">
              {relatedData.backup.slice(0, 8).map((school) => (
                <RelatedSchoolCard key={school.id} school={school} />
              ))}
            </div>
            {/* Neevidované obory */}
            {relatedData.backupMissing && relatedData.backupMissing.count > 0 && (
              <div className="mt-3 px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-600">
                <span className="font-medium">{relatedData.backupMissing.pct.toFixed(1)}%</span> uchazečů
                ({relatedData.backupMissing.count}) si jako zálohu dalo obory bez přijímacích zkoušek
                (učňovské obory, nástavby apod.), které zde neevidujeme.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Analýza strategií uchazečů
interface StrategyAnalysisProps {
  schoolDetail: SchoolDetail | null;
  currentSchoolMinBody: number;
}

interface StrategyCluster {
  name: string;
  emoji: string;
  description: string;
  count: number;
  percentage: number;
  color: string;
  bgColor: string;
}

function calculateWeightedAverage(schools: RelatedSchool[]): number {
  // Filtrovat školy s validními daty
  const validSchools = schools.filter(s => s.nazev && s.nazev !== s.id.split('_')[0] && s.min_body > 0);
  if (validSchools.length === 0) return 0;
  const totalCount = validSchools.reduce((sum, s) => sum + s.count, 0);
  if (totalCount === 0) return 0;
  const weightedSum = validSchools.reduce((sum, s) => sum + s.min_body * s.count, 0);
  return weightedSum / totalCount;
}

// Bezpečný výpočet procenta (max 100%)
function safePercentage(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, (count / total) * 100);
}

export function ApplicantStrategyAnalysis({ schoolDetail, currentSchoolMinBody }: StrategyAnalysisProps) {
  if (!schoolDetail) return null;

  // Analyzovat uchazeče podle jejich strategií
  const strategies: StrategyCluster[] = [];

  // 1. Analyzovat ty, co dali tento obor jako 3. volbu
  if (schoolDetail.as_p3 && schoolDetail.as_p3.total > 0) {
    // Použijeme POUZE preferred_p1 pro konzistentní počítání
    const preferredP1 = (schoolDetail.as_p3.preferred_p1 || []).filter(
      s => s.nazev && s.nazev !== s.id.split('_')[0] && s.min_body > 0
    );

    if (preferredP1.length > 0) {
      const avgPreferredMinBody = calculateWeightedAverage(preferredP1);
      const difficultyGap = avgPreferredMinBody - currentSchoolMinBody;

      // Identifikovat "přeceňující" - ti co měli 1. volbu o 30+ bodů těžší
      const overreachingSchools = preferredP1.filter(s => s.min_body >= currentSchoolMinBody + 30);
      const overreachingCount = overreachingSchools.reduce((sum, s) => sum + s.count, 0);
      const overreachingPct = safePercentage(overreachingCount, schoolDetail.as_p3.total);

      if (overreachingPct > 10 && difficultyGap > 20) {
        strategies.push({
          name: 'Přeceňující síly',
          emoji: '🎯↑',
          description: `${overreachingPct.toFixed(0)}% uchazečů se 3. volbou zde mělo 1. volbu o 30+ bodů těžší. Průměr 1. voleb: ${avgPreferredMinBody.toFixed(0)} b. (rozdíl +${difficultyGap.toFixed(0)} b.)`,
          count: overreachingCount,
          percentage: overreachingPct,
          color: 'text-red-700',
          bgColor: 'bg-red-50'
        });
      }

      // Identifikovat "realistické" - malý rozptyl
      const realisticSchools = preferredP1.filter(s => Math.abs(s.min_body - currentSchoolMinBody) <= 15);
      const realisticCount = realisticSchools.reduce((sum, s) => sum + s.count, 0);
      const realisticPct = safePercentage(realisticCount, schoolDetail.as_p3.total);

      if (realisticPct > 10) {
        strategies.push({
          name: 'Realistická strategie',
          emoji: '⚖️',
          description: `${realisticPct.toFixed(0)}% uchazečů mělo 1. i 3. volbu v podobném rozsahu obtížnosti (±15 bodů).`,
          count: realisticCount,
          percentage: realisticPct,
          color: 'text-green-700',
          bgColor: 'bg-green-50'
        });
      }
    }
  }

  // 2. Analyzovat ty, co dali tento obor jako 1. volbu
  if (schoolDetail.as_p1 && schoolDetail.as_p1.total > 0) {
    // Použijeme POUZE backup_p2 pro konzistentní počítání (ne obě, aby se nepočítalo 2x)
    const backupP2 = (schoolDetail.as_p1.backup_p2 || []).filter(
      s => s.nazev && s.nazev !== s.id.split('_')[0] && s.min_body > 0
    );

    if (backupP2.length > 0) {
      const avgBackupMinBody = calculateWeightedAverage(backupP2);
      const safetyGap = currentSchoolMinBody - avgBackupMinBody;

      // Identifikovat "s pojistkou" - zálohy výrazně jednodušší
      if (safetyGap > 20) {
        const safeBackups = backupP2.filter(s => s.min_body < currentSchoolMinBody - 20);
        const safeCount = safeBackups.reduce((sum, s) => sum + s.count, 0);
        const safePct = safePercentage(safeCount, schoolDetail.as_p1.total);

        if (safePct > 20) {
          strategies.push({
            name: 'Ambiciózní s pojistkou',
            emoji: '🛡️',
            description: `${safePct.toFixed(0)}% uchazečů s 1. volbou zde má 2. volbu o 20+ bodů jednodušší. Průměr 2. voleb: ${avgBackupMinBody.toFixed(0)} b. (rezerva ${safetyGap.toFixed(0)} b.)`,
            count: safeCount,
            percentage: safePct,
            color: 'text-blue-700',
            bgColor: 'bg-blue-50'
          });
        }
      }

      // Identifikovat "riskující" - zálohy podobně těžké nebo těžší
      const riskyBackups = backupP2.filter(s => s.min_body >= currentSchoolMinBody - 10);
      const riskyCount = riskyBackups.reduce((sum, s) => sum + s.count, 0);
      const riskyPct = safePercentage(riskyCount, schoolDetail.as_p1.total);

      if (riskyPct > 20) {
        strategies.push({
          name: 'Riskující',
          emoji: '🎲',
          description: `${riskyPct.toFixed(0)}% uchazečů nemá výrazně jednodušší 2. volbu. Jejich volby jsou podobně náročné.`,
          count: riskyCount,
          percentage: riskyPct,
          color: 'text-orange-700',
          bgColor: 'bg-orange-50'
        });
      }
    }
  }

  // 3. Analyzovat ty, co dali tento obor jako 2. volbu
  if (schoolDetail.as_p2 && schoolDetail.as_p2.total > 0) {
    const preferred = (schoolDetail.as_p2.preferred_p1 || []).filter(
      s => s.nazev && s.nazev !== s.id.split('_')[0] && s.min_body > 0
    );
    const backup = (schoolDetail.as_p2.backup_p3 || []).filter(
      s => s.nazev && s.nazev !== s.id.split('_')[0] && s.min_body > 0
    );

    if (preferred.length > 0 && backup.length > 0) {
      const avgPreferredMinBody = calculateWeightedAverage(preferred);
      const avgBackupMinBody = calculateWeightedAverage(backup);
      const spread = avgPreferredMinBody - avgBackupMinBody;

      // Identifikovat "strategické" - hezký rozptyl od těžké po snadnou
      if (spread > 25 && avgPreferredMinBody > currentSchoolMinBody && avgBackupMinBody < currentSchoolMinBody) {
        strategies.push({
          name: 'Strategický výběr',
          emoji: '📊',
          description: `Uchazeči s 2. volbou zde mají dobrý rozptyl: 1. volba průměrně ${avgPreferredMinBody.toFixed(0)} b., 3. volba ${avgBackupMinBody.toFixed(0)} b. (rozpětí ${spread.toFixed(0)} b.)`,
          count: schoolDetail.as_p2.total,
          percentage: 100,
          color: 'text-blue-700',
          bgColor: 'bg-blue-50'
        });
      }
    }
  }

  if (strategies.length === 0) return null;

  // Seřadit podle procenta
  strategies.sort((a, b) => b.percentage - a.percentage);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold mb-2">Analýza strategií uchazečů</h2>
      <p className="text-sm text-slate-600 mb-4">
        Na základě dat o volbách uchazečů jsme identifikovali tyto vzorce chování:
      </p>

      <div className="space-y-4">
        {strategies.map((strategy, idx) => (
          <div key={idx} className={`p-4 rounded-lg border-l-4 ${strategy.bgColor}`} style={{ borderLeftColor: strategy.color.replace('text-', '').replace('-700', '-500') }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{strategy.emoji}</span>
              <h3 className={`font-semibold ${strategy.color}`}>{strategy.name}</h3>
              <span className="text-sm text-slate-500">({strategy.count} uchazečů)</span>
            </div>
            <p className="text-sm text-slate-700">{strategy.description}</p>
          </div>
        ))}
      </div>

      {/* Vysvětlení */}
      <div className="mt-6 p-4 bg-slate-50 rounded-lg">
        <h4 className="font-medium text-slate-700 mb-2">Co to znamená pro vás?</h4>
        <ul className="text-sm text-slate-600 space-y-1">
          <li>• <strong>Přeceňující síly</strong> - uchazeči, kteří možná přecenili své schopnosti a museli se spokojit se záložní volbou</li>
          <li>• <strong>Ambiciózní s pojistkou</strong> - chytří uchazeči, kteří mají silnou 1. volbu, ale i bezpečnou zálohu</li>
          <li>• <strong>Realistická strategie</strong> - uchazeči volící školy podobné obtížnosti, bez velkých skoků</li>
          <li>• <strong>Riskující</strong> - uchazeči bez výrazné pojistky, všechny volby jsou náročné</li>
        </ul>
      </div>
    </div>
  );
}

// Šance přijetí podle priority
interface AcceptanceByPriorityProps {
  prihlasky_priority: number[];
  prijati_priority: number[];
}

export function AcceptanceByPriority({ prihlasky_priority, prijati_priority }: AcceptanceByPriorityProps) {
  // Spočítat šance pro každou prioritu
  const chances = prihlasky_priority.map((prihlasky, idx) => {
    const prijati = prijati_priority[idx] || 0;
    if (prihlasky === 0) return null;
    return {
      priority: idx + 1,
      prihlasky,
      prijati,
      chance: (prijati / prihlasky) * 100
    };
  }).filter(Boolean) as { priority: number; prihlasky: number; prijati: number; chance: number }[];

  // Filtrovat pouze priority s daty (až 5 - u škol s talentovými zkouškami)
  const relevantChances = chances.filter(c => c.priority <= 5 && c.prihlasky > 0);

  if (relevantChances.length === 0) return null;

  // Zjistit, jestli máme rozšířené priority (4. a 5.)
  const hasExtendedPriorities = relevantChances.some(c => c.priority > 3);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold mb-2">Statistika přijetí podle priority</h2>
      <p className="text-sm text-slate-600 mb-4">
        Jaká byla úspěšnost uchazečů s různou prioritou? Priorita sama o sobě šanci neovlivňuje — o přijetí rozhodují body z testů.{hasExtendedPriorities && ' (4. a 5. priorita je možná u škol s talentovými zkouškami)'}
      </p>

      <div className="space-y-4">
        {relevantChances.map(({ priority, prihlasky, prijati, chance }) => {
          // Barvy pro všech 5 priorit
          const getBgClass = (p: number) => {
            if (p === 1) return 'bg-green-500';
            if (p === 2) return 'bg-yellow-500';
            if (p === 3) return 'bg-red-500';
            if (p === 4) return 'bg-purple-500';
            return 'bg-blue-500';
          };

          const getTextClass = (p: number) => {
            if (p === 1) return 'text-green-600';
            if (p === 2) return 'text-yellow-600';
            if (p === 3) return 'text-red-600';
            if (p === 4) return 'text-purple-600';
            return 'text-blue-600';
          };

          const getLightBgClass = (p: number) => {
            if (p === 1) return 'bg-green-50';
            if (p === 2) return 'bg-yellow-50';
            if (p === 3) return 'bg-red-50';
            if (p === 4) return 'bg-purple-50';
            return 'bg-blue-50';
          };

          const getPriorityLabel = (p: number) => {
            if (p === 1) return 'První';
            if (p === 2) return 'Druhá';
            if (p === 3) return 'Třetí';
            if (p === 4) return 'Čtvrtá';
            return 'Pátá';
          };

          return (
            <div key={priority} className={`p-4 rounded-lg ${getLightBgClass(priority)}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${getBgClass(priority)}`}>
                    {priority}.
                  </span>
                  <span className="font-medium">
                    {getPriorityLabel(priority)} priorita
                  </span>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-bold ${getTextClass(priority)}`}>
                    {chance.toFixed(0)}%
                  </span>
                  <span className="text-sm text-slate-500 ml-2">šance</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full ${getBgClass(priority)}`}
                  style={{ width: `${Math.min(100, chance)}%` }}
                />
              </div>

              <div className="text-sm text-slate-600">
                {prijati} přijato z {prihlasky} přihlášek
              </div>
            </div>
          );
        })}
      </div>

      {/* Interpretace */}
      <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-600 rounded-r-lg">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Priorita neurčuje šanci na přijetí — ta závisí výhradně na výsledku zkoušky. Priorita rozhoduje pouze o tom, na kterou školu nastoupíte, pokud jste přijati na více škol. Statistické rozdíly mezi prioritami odrážejí profil uchazečů, ne vliv priority na přijetí.
        </p>
      </div>
    </div>
  );
}

// Náročnost testů (ČJ vs MA)
interface TestDifficultyProps {
  cj_prumer: number;
  cj_at_jpz_min: number;  // ČJ body studenta s nejnižším celkovým JPZ
  ma_prumer: number;
  ma_at_jpz_min: number;  // MA body studenta s nejnižším celkovým JPZ
  jpz_min: number;        // Skutečné minimum JPZ (cj_at_jpz_min + ma_at_jpz_min)
}

export function TestDifficulty({ cj_prumer, cj_at_jpz_min, ma_prumer, ma_at_jpz_min, jpz_min }: TestDifficultyProps) {
  // Pokud nemáme data, nezobrazovat
  if (!cj_prumer && !ma_prumer) return null;

  const maxPoints = 50; // Maximum bodů z jednoho JPZ testu
  const cjPct = (cj_prumer / maxPoints) * 100;
  const maPct = (ma_prumer / maxPoints) * 100;

  // Rozdíl mezi průměry - pro zajímavost o profilu studentů
  const diff = Math.abs(cj_prumer - ma_prumer);
  const harderSubject = cj_prumer > ma_prumer ? 'čeština' : 'matematika';

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold mb-2">Výsledky testů přijatých</h2>
      <p className="text-sm text-slate-600 mb-4">
        Průměrné body přijatých a výsledky studenta s nejnižším celkovým skóre.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Čeština */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-blue-800">Čeština</span>
            <span className="text-xs text-blue-600">max 50 b.</span>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Průměr přijatých:</span>
                <span className="font-bold text-blue-700">{cj_prumer.toFixed(1)} b.</span>
              </div>
              <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${cjPct}%` }} />
              </div>
            </div>

            {cj_at_jpz_min > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Min. přijatý student:</span>
                <span className="font-medium text-blue-600">{cj_at_jpz_min} b.</span>
              </div>
            )}
          </div>
        </div>

        {/* Matematika */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-blue-800">Matematika</span>
            <span className="text-xs text-blue-600">max 50 b.</span>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Průměr přijatých:</span>
                <span className="font-bold text-blue-700">{ma_prumer.toFixed(1)} b.</span>
              </div>
              <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${maPct}%` }} />
              </div>
            </div>

            {ma_at_jpz_min > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Min. přijatý student:</span>
                <span className="font-medium text-blue-600">{ma_at_jpz_min} b.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Celkový součet */}
      <div className="mt-4 p-4 bg-slate-100 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-slate-700">Minimální JPZ pro přijetí:</span>
          <span className="text-xl font-bold text-slate-900">{jpz_min} bodů</span>
        </div>
        {cj_at_jpz_min > 0 && ma_at_jpz_min > 0 && (
          <div className="text-xs text-slate-500 mt-1">
            (ČJ {cj_at_jpz_min} + MA {ma_at_jpz_min} = {jpz_min} bodů z max. 100)
          </div>
        )}
      </div>

      {/* Interpretace */}
      {diff > 5 && (
        <div className="mt-4 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg">
          <p className="text-sm text-amber-800">
            <strong>Zajímavost:</strong> Na této škole mají přijatí studenti v průměru lepší výsledky
            z <strong>{harderSubject}</strong> (o {diff.toFixed(1)} bodů více).
            {harderSubject === 'čeština' ? (
              <> Připravte se důkladněji na český jazyk.</>
            ) : (
              <> Věnujte více času přípravě na matematiku.</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// Profil náročnosti školy
interface DifficultyProfileProps {
  profile: {
    percentilOverall: number;
    percentilInType: number;
    rankInType: number;
    totalInType: number;
    focusIndex: number;
    focusLabel: string;
    z_cj: number;
    z_ma: number;
    cjDiffFromAvg: number;
    maDiffFromAvg: number;
    minBodyDiffFromAvg: number;
    cjDiffFromType: number;
    maDiffFromType: number;
    minBodyDiffFromType: number;
    nationalStats: {
      cjMean: number;
      maMean: number;
      minBodyMean: number;
    };
    typeStats: {
      cjMean: number;
      maMean: number;
      minBodyMean: number;
      typeName: string;
    };
  };
  schoolType: string;
  cjPrumer: number;
  maPrumer: number;
  jpzMin: number;           // Čisté JPZ body (cj_min + ma_min) - používáno pro srovnání
  minBody: number;          // Celkové skóre pro přijetí
  extraBody: number;        // Body za další kritéria (prospěch aj.)
  hasExtraCriteria: boolean;// Má obor další kritéria?
}

// Mapování typů škol na české názvy
const typeNames: Record<string, string> = {
  'GY4': '4letých gymnázií',
  'GY6': '6letých gymnázií',
  'GY8': '8letých gymnázií',
  'SOS': 'středních odborných škol',
  'SOŠ': 'středních odborných škol',
  'SOU': 'středních odborných učilišť',
  'LYC': 'lyceí',
};

export function SchoolDifficultyProfile({ profile, schoolType, cjPrumer, maPrumer, jpzMin, minBody, extraBody, hasExtraCriteria }: DifficultyProfileProps) {
  const typeName = typeNames[schoolType] || schoolType;

  // Barva pro percentil
  const getPercentilColor = (p: number) => {
    if (p >= 90) return 'text-red-600';
    if (p >= 75) return 'text-orange-600';
    if (p >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Barva pro zaměření
  const getFocusColor = (index: number) => {
    if (index > 0.5) return 'text-blue-600';
    if (index > 0.2) return 'text-blue-500';
    if (index > -0.2) return 'text-slate-600';
    if (index > -0.5) return 'text-blue-500';
    return 'text-blue-600';
  };

  // Pozice na škále zaměření (-2 až +2 -> 0% až 100%)
  const focusPosition = Math.min(100, Math.max(0, ((profile.focusIndex + 2) / 4) * 100));

  // Formátování rozdílu
  const formatDiff = (diff: number) => {
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}`;
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Náročnost přijetí na školu</h2>
      <p className="text-sm text-slate-600 mb-4">
        Jak těžké je se na školu dostat (podle bodů potřebných k přijetí), nikoliv jak náročné je studium.
      </p>

      {/* Percentily náročnosti */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Celkový percentil */}
        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="text-sm text-slate-600 mb-1">
            V rámci celé ČR
            <InfoTooltip title="Náročnost přijetí (celostátní percentil)">
              Ukazuje, jak je obtížné se na školu dostat ve srovnání se <strong>všemi školami v ČR</strong>.
              Hodnota 90% znamená, že škola má vyšší požadavky na přijetí než 90% všech škol.
              Počítáno podle minimálního počtu bodů potřebných pro přijetí.
            </InfoTooltip>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${getPercentilColor(profile.percentilOverall)}`}>
              {profile.percentilOverall.toFixed(0)}%
            </span>
            <span className="text-sm text-slate-500">percentil</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full ${
                profile.percentilOverall >= 90 ? 'bg-red-500' :
                profile.percentilOverall >= 75 ? 'bg-orange-500' :
                profile.percentilOverall >= 50 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${profile.percentilOverall}%` }}
            />
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {profile.percentilOverall >= 90 ? 'Patří mezi top 10% nejtěžších' :
             profile.percentilOverall >= 75 ? 'Nadprůměrně náročná' :
             profile.percentilOverall >= 50 ? 'Průměrná náročnost' : 'Podprůměrná náročnost'}
          </div>
        </div>

        {/* Percentil v rámci typu */}
        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="text-sm text-slate-600 mb-1">
            Mezi {typeName}
            <InfoTooltip title="Náročnost přijetí (mezi stejným typem škol)">
              Porovnání <strong>pouze se školami stejného typu</strong> ({profile.totalInType} škol v celé ČR).
              <br /><br />
              Gymnázia jsou obecně náročnější než SOŠ, proto je relevantní porovnávat v rámci typu.
              <br /><br />
              Hodnota 80% mezi gymnázii znamená více než 80% mezi všemi školami.
              Tento percentil je přesnější než srovnání v rámci kraje, protože zohledňuje typ školy.
            </InfoTooltip>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${getPercentilColor(profile.percentilInType)}`}>
              {profile.percentilInType.toFixed(0)}%
            </span>
            <span className="text-sm text-slate-500">percentil</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full ${
                profile.percentilInType >= 90 ? 'bg-red-500' :
                profile.percentilInType >= 75 ? 'bg-orange-500' :
                profile.percentilInType >= 50 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${profile.percentilInType}%` }}
            />
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {profile.rankInType}. nejnáročnější z {profile.totalInType} škol tohoto typu
          </div>
        </div>
      </div>

      {/* Index zaměření */}
      <div className="p-4 bg-gradient-to-r from-blue-50 via-slate-50 to-blue-50 rounded-lg mb-6">
        <div className="text-sm text-slate-600 mb-2">
          Zaměření oboru
          <InfoTooltip title="Index zaměření">
            Ukazuje, zda přijatí studenti excelují více v <strong>češtině</strong> (humanitní) nebo <strong>matematice</strong> (technické zaměření).
            <br /><br />
            Index je vypočten jako rozdíl normalizovaných skóre (z-skóre) pro oba předměty.
            Tím eliminujeme vliv různé obtížnosti testů v daném roce.
            <br /><br />
            • Index &gt; +0.5: silně matematické<br />
            • Index -0.2 až +0.2: vyvážené<br />
            • Index &lt; -0.5: silně humanitní
          </InfoTooltip>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-600">Humanitní</span>
          <span className={`text-lg font-bold ${getFocusColor(profile.focusIndex)}`}>
            {profile.focusLabel}
          </span>
          <span className="text-sm font-medium text-blue-600">Matematické</span>
        </div>

        {/* Škála */}
        <div className="relative h-3 bg-gradient-to-r from-blue-300 via-slate-300 to-blue-300 rounded-full">
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-slate-700 rounded-full shadow"
            style={{ left: `calc(${focusPosition}% - 8px)` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>-2</span>
          <span>-1</span>
          <span>0</span>
          <span>+1</span>
          <span>+2</span>
        </div>

        <div className="mt-3 text-sm text-slate-600">
          <strong>Index: {profile.focusIndex > 0 ? '+' : ''}{profile.focusIndex.toFixed(2)}</strong>
          {' '}
          <span className="text-slate-400">
            (z<sub>čj</sub>={profile.z_cj > 0 ? '+' : ''}{profile.z_cj.toFixed(2)}, z<sub>ma</sub>={profile.z_ma > 0 ? '+' : ''}{profile.z_ma.toFixed(2)})
          </span>
          <InfoTooltip title="Z-skóre">
            <strong>Z-skóre</strong> udává, o kolik směrodatných odchylek je hodnota nad/pod průměrem.
            <br /><br />
            • z = 0: přesně průměr<br />
            • z = +1: o 1 odchylku nad průměrem (lepší než ~84% škol)<br />
            • z = +2: o 2 odchylky nad průměrem (lepší než ~98% škol)<br />
            • z = -1: o 1 odchylku pod průměrem
          </InfoTooltip>
        </div>
      </div>

      {/* Info o extra kritériích */}
      {hasExtraCriteria && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <div className="font-medium text-amber-800">Tento obor používá další kritéria</div>
              <p className="text-sm text-amber-700 mt-1">
                Kromě bodů z JPZ ({jpzMin} b.) tento obor přidává <strong>+{extraBody} bodů</strong> za další kritéria
                (typicky prospěch na ZŠ). Celkové min. skóre pro přijetí je {minBody} b.
              </p>
              <p className="text-xs text-amber-600 mt-2">
                Pro férové srovnání náročnosti mezi obory používáme pouze čisté JPZ body.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Srovnání s průměry */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Srovnání s celostátním průměrem */}
        <div className="p-4 border rounded-lg">
          <div className="text-sm font-medium text-slate-700 mb-3">
            vs. celostátní průměr
            <InfoTooltip title="Srovnání s celostátním průměrem">
              Porovnání průměrných výsledků přijatých studentů této školy s <strong>průměrem všech škol v ČR</strong>.
              <br /><br />
              • <strong>Čeština/Matematika:</strong> Průměrné body přijatých studentů z daného předmětu<br />
              • <strong>Min. JPZ:</strong> Minimální čisté body z JPZ (bez prospěchu aj.)<br /><br />
              Zelená (+) = nad průměrem, červená (-) = pod průměrem
            </InfoTooltip>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Čeština:</span>
              <span>
                {cjPrumer.toFixed(1)} b.
                <span className={profile.cjDiffFromAvg >= 0 ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                  ({formatDiff(profile.cjDiffFromAvg)})
                </span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Matematika:</span>
              <span>
                {maPrumer.toFixed(1)} b.
                <span className={profile.maDiffFromAvg >= 0 ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                  ({formatDiff(profile.maDiffFromAvg)})
                </span>
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-slate-600">Min. JPZ body:</span>
              <span>
                {jpzMin} b.
                <span className={profile.minBodyDiffFromAvg >= 0 ? 'text-orange-600 ml-1' : 'text-green-600 ml-1'}>
                  ({formatDiff(profile.minBodyDiffFromAvg)})
                </span>
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Průměr: ČJ {profile.nationalStats.cjMean.toFixed(0)} b., MA {profile.nationalStats.maMean.toFixed(0)} b., min JPZ {profile.nationalStats.minBodyMean.toFixed(0)} b.
          </div>
        </div>

        {/* Srovnání s typem */}
        <div className="p-4 border rounded-lg">
          <div className="text-sm font-medium text-slate-700 mb-3">
            vs. průměr {typeName}
            <InfoTooltip title="Srovnání s průměrem typu">
              Porovnání s <strong>průměrem škol stejného typu</strong> (např. jen gymnázia nebo jen SOŠ).
              <br /><br />
              Toto srovnání je relevantnější, protože gymnázia a SOŠ mají odlišné nároky.
              Škola může být nadprůměrná celostátně, ale průměrná mezi gymnázii.
            </InfoTooltip>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Čeština:</span>
              <span>
                {cjPrumer.toFixed(1)} b.
                <span className={profile.cjDiffFromType >= 0 ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                  ({formatDiff(profile.cjDiffFromType)})
                </span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Matematika:</span>
              <span>
                {maPrumer.toFixed(1)} b.
                <span className={profile.maDiffFromType >= 0 ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                  ({formatDiff(profile.maDiffFromType)})
                </span>
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-slate-600">Min. JPZ body:</span>
              <span>
                {jpzMin} b.
                <span className={profile.minBodyDiffFromType >= 0 ? 'text-orange-600 ml-1' : 'text-green-600 ml-1'}>
                  ({formatDiff(profile.minBodyDiffFromType)})
                </span>
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Průměr typu: ČJ {profile.typeStats.cjMean.toFixed(0)} b., MA {profile.typeStats.maMean.toFixed(0)} b., min JPZ {profile.typeStats.minBodyMean.toFixed(0)} b.
          </div>
        </div>
      </div>

      {/* Interpretace */}
      <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-600 rounded-r-lg">
        <p className="text-sm text-blue-800">
          <strong>Co to znamená:</strong>{' '}
          {profile.percentilOverall >= 90 ? (
            <>Tato škola patří mezi 10% nejtěžších v ČR. </>
          ) : profile.percentilOverall >= 75 ? (
            <>Škola je nadprůměrně náročná. </>
          ) : profile.percentilOverall >= 50 ? (
            <>Škola má průměrnou náročnost. </>
          ) : (
            <>Škola je podprůměrně náročná, dobré šance na přijetí. </>
          )}
          {Math.abs(profile.focusIndex) > 0.3 && (
            profile.focusIndex > 0 ? (
              <>Přijatí studenti excelují v matematice více než v češtině (oproti celostátnímu průměru), což naznačuje {profile.focusIndex > 0.5 ? 'silné ' : ''}technické/přírodovědné zaměření.</>
            ) : (
              <>Přijatí studenti excelují v češtině více než v matematice (oproti celostátnímu průměru), což naznačuje {profile.focusIndex < -0.5 ? 'silné ' : ''}humanitní zaměření.</>
            )
          )}
          {Math.abs(profile.focusIndex) <= 0.3 && (
            <>Škola má vyvážené nároky na oba předměty.</>
          )}
        </p>
      </div>

      {/* Odkaz na vysvětlení */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
        <strong>Tip:</strong> O přijetí rozhoduje výhradně váš počet bodů z testů, nikoliv pořadí škol na přihlášce.
        Soustřeďte se na přípravu na testy.{' '}
        <Link href="/jak-funguje-prijimani" className="underline hover:text-blue-600 font-medium">
          Jak funguje přijímací řízení →
        </Link>
      </div>
    </div>
  );
}

// Priority distribution bar component
interface PriorityDistributionBarProps {
  priorityPcts: number[];
  prihlasky_priority?: number[];
  prijati_priority?: number[];
}

export function PriorityDistributionBar({ priorityPcts, prihlasky_priority, prijati_priority }: PriorityDistributionBarProps) {
  const p1 = priorityPcts[0] || 0;
  const p2 = priorityPcts[1] || 0;
  const p3 = priorityPcts[2] || 0;
  const p4 = priorityPcts[3] || 0;
  const p5 = priorityPcts[4] || 0;

  // Spočítáme šance přijetí a rozložení přijatých
  // Podpora až 5 priorit (u škol s talentovými zkouškami)
  const hasAcceptanceData = prihlasky_priority && prijati_priority &&
    prihlasky_priority.length >= 3 && prijati_priority.length >= 3;

  const acceptanceChances: { priority: number; chance: number; prijato: number; prihlaseno: number }[] = [];
  const acceptedPcts: number[] = [0, 0, 0, 0, 0];
  let totalPrijati = 0;

  if (hasAcceptanceData) {
    // Spočítat celkový počet přijatých ze všech priorit (až 5)
    const maxPriorities = Math.min(prihlasky_priority.length, prijati_priority.length, 5);
    totalPrijati = prijati_priority.slice(0, maxPriorities).reduce((a, b) => a + b, 0);

    // Projít všechny dostupné priority (až 5)
    for (let i = 0; i < maxPriorities; i++) {
      const prihlaseno = prihlasky_priority[i] || 0;
      const prijato = prijati_priority[i] || 0;
      const chance = prihlaseno > 0 ? (prijato / prihlaseno) * 100 : 0;
      acceptanceChances.push({ priority: i + 1, chance, prijato, prihlaseno });
      acceptedPcts[i] = totalPrijati > 0 ? (prijato / totalPrijati) * 100 : 0;
    }
  }

  // Zjistit, jestli máme data pro 4. nebo 5. prioritu (školy s talentovými zkouškami)
  const hasExtendedPriorities = (p4 > 0 || p5 > 0) ||
    (prihlasky_priority && (prihlasky_priority[3] > 0 || prihlasky_priority[4] > 0));

  // Zjistíme, z kterých priorit se nepřijímá
  const noAcceptanceFrom = acceptanceChances.filter(c => c.prihlaseno > 0 && c.chance === 0);
  const lowAcceptanceFrom = acceptanceChances.filter(c => c.chance > 0 && c.chance < 10);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold mb-2">Rozložení priorit uchazečů</h2>
      <p className="text-sm text-slate-600 mb-4">
        Jak uchazeči tuto školu volí na své přihlášce (1., 2. nebo 3. priorita{hasExtendedPriorities ? ', případně 4. nebo 5. priorita u škol s talentovými zkouškami' : ''}).
      </p>

      {/* Stacked bar - přihlášky */}
      <div className="mb-2 text-xs text-slate-500 font-medium">Přihlášky:</div>
      <div className="h-10 rounded-lg overflow-hidden flex mb-4">
        {p1 > 0 && (
          <div
            className="bg-green-500 flex items-center justify-center text-white text-sm font-medium"
            style={{ width: `${p1}%` }}
          >
            {p1.toFixed(1)}%
          </div>
        )}
        {p2 > 0 && (
          <div
            className="bg-yellow-500 flex items-center justify-center text-white text-sm font-medium"
            style={{ width: `${p2}%` }}
          >
            {p2.toFixed(1)}%
          </div>
        )}
        {p3 > 0 && (
          <div
            className="bg-red-500 flex items-center justify-center text-white text-sm font-medium"
            style={{ width: `${p3}%` }}
          >
            {p3.toFixed(1)}%
          </div>
        )}
        {p4 > 0 && (
          <div
            className="bg-purple-500 flex items-center justify-center text-white text-sm font-medium"
            style={{ width: `${p4}%` }}
          >
            {p4.toFixed(1)}%
          </div>
        )}
        {p5 > 0 && (
          <div
            className="bg-blue-500 flex items-center justify-center text-white text-sm font-medium"
            style={{ width: `${p5}%` }}
          >
            {p5.toFixed(1)}%
          </div>
        )}
      </div>

      {/* Stacked bar - přijatí */}
      {hasAcceptanceData && totalPrijati > 0 && (
        <>
          <div className="mb-2 text-xs text-slate-500 font-medium">Přijatí:</div>
          <div className="h-10 rounded-lg overflow-hidden flex mb-4">
            {acceptedPcts[0] > 0 && (
              <div
                className="bg-green-600 flex items-center justify-center text-white text-sm font-medium"
                style={{ width: `${acceptedPcts[0]}%` }}
              >
                {acceptedPcts[0].toFixed(0)}%
              </div>
            )}
            {acceptedPcts[1] > 0 && (
              <div
                className="bg-yellow-600 flex items-center justify-center text-white text-sm font-medium"
                style={{ width: `${acceptedPcts[1]}%` }}
              >
                {acceptedPcts[1].toFixed(0)}%
              </div>
            )}
            {acceptedPcts[2] > 0 && (
              <div
                className="bg-red-600 flex items-center justify-center text-white text-sm font-medium"
                style={{ width: `${acceptedPcts[2]}%` }}
              >
                {acceptedPcts[2].toFixed(0)}%
              </div>
            )}
            {acceptedPcts[3] > 0 && (
              <div
                className="bg-purple-600 flex items-center justify-center text-white text-sm font-medium"
                style={{ width: `${acceptedPcts[3]}%` }}
              >
                {acceptedPcts[3].toFixed(0)}%
              </div>
            )}
            {acceptedPcts[4] > 0 && (
              <div
                className="bg-blue-600 flex items-center justify-center text-white text-sm font-medium"
                style={{ width: `${acceptedPcts[4]}%` }}
              >
                {acceptedPcts[4].toFixed(0)}%
              </div>
            )}
            {acceptedPcts.every(p => p === 0) && (
              <div className="bg-slate-300 flex items-center justify-center text-slate-600 text-sm font-medium w-full">
                Žádní přijatí
              </div>
            )}
          </div>
        </>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm mb-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <span>1. priorita</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
          <span>2. priorita</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span>3. priorita</span>
        </div>
        {hasExtendedPriorities && (
          <>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
              <span>4. priorita</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span>5. priorita</span>
            </div>
          </>
        )}
      </div>

      {/* Interpretation */}
      <div className={`mt-4 p-4 rounded-r-lg border-l-4 ${
        noAcceptanceFrom.length > 0 ? 'bg-red-50 border-red-500' :
        lowAcceptanceFrom.length > 0 ? 'bg-amber-50 border-amber-500' :
        'bg-slate-50 border-slate-300'
      }`}>
        <p className="text-slate-700">
          {p1 > 50 ? (
            <>Škola je <strong className="text-green-600">první volbou</strong> pro většinu uchazečů. </>
          ) : p1 > 30 ? (
            <>Škola má <strong className="text-yellow-600">rovnoměrné</strong> rozložení přihlášek. </>
          ) : (
            <>Škola je častěji volena jako <strong className="text-red-600">záložní varianta</strong>. </>
          )}

          {noAcceptanceFrom.length > 0 && (
            <strong className="text-red-600">
              Pozor: Z {noAcceptanceFrom.map(c => `${c.priority}. priority`).join(' a ')} nebyl nikdo přijat!
            </strong>
          )}

          {noAcceptanceFrom.length === 0 && lowAcceptanceFrom.length > 0 && (
            <span className="text-amber-700">
              Uchazeči z {lowAcceptanceFrom.map(c => `${c.priority}. priority`).join(' a ')} mají velmi nízkou šanci (pod 10%).
            </span>
          )}

          {noAcceptanceFrom.length === 0 && lowAcceptanceFrom.length === 0 && hasAcceptanceData && (
            <span className="text-green-700">
              Uchazeči jsou přijímáni ze všech priorit.
            </span>
          )}
        </p>
      </div>

      {/* Odkaz na vysvětlení */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
        <strong>Důležité:</strong> O přijetí rozhoduje výhradně počet bodů, nikoliv pořadí škol na přihlášce.
        Priority ovlivňují pouze to, kam nastoupíte v případě přijetí na více škol.{' '}
        <Link href="/jak-funguje-prijimani" className="underline hover:text-blue-600 font-medium">
          Zjistěte více o přijímacím řízení →
        </Link>
      </div>
    </div>
  );
}

// Stats Grid komponenta s tooltips
interface StatsGridProps {
  totalApplicants: number;
  priority1Count: number;
  minBody: number;
  jpzMin: number;              // skutečné minimum JPZ (z jednoho studenta)
  cjAtJpzMin: number;          // ČJ body studenta s nejnižším JPZ
  maAtJpzMin: number;          // MA body studenta s nejnižším JPZ
  hasExtraCriteria: boolean;
  extraBody: number;
  obtiznost: number;
  indexPoptavky: number;
  kapacita: number;
  // Trend data pro varování o oscilaci
  trendData?: {
    prihlasky2024: number;
    prihlasky2025: number;
    prihlaskyChange: number;
    minBody2024: number;
    minBody2025: number;
    minBodyChange: number;
  } | null;
  prijati2024?: number;  // počet přijatých v roce 2024 (pro normalizaci)
}

// Helper pro formátování čísel
function formatNumber(num: number): string {
  return num.toLocaleString('cs-CZ');
}

// Helper pro obtížnost
function getDifficultyInfo(obtiznost: number): { label: string; colorClass: string; barColor: string } {
  if (obtiznost >= 70) {
    return { label: 'TĚŽKÉ', colorClass: 'text-red-600', barColor: 'bg-red-500' };
  }
  if (obtiznost >= 45) {
    return { label: 'STŘEDNÍ', colorClass: 'text-yellow-600', barColor: 'bg-yellow-500' };
  }
  return { label: 'SNADNÉ', colorClass: 'text-green-600', barColor: 'bg-green-500' };
}

export function StatsGrid({
  totalApplicants,
  priority1Count,
  minBody,
  jpzMin,
  cjAtJpzMin,
  maAtJpzMin,
  hasExtraCriteria,
  extraBody,
  obtiznost,
  indexPoptavky,
  kapacita,
  trendData,
  prijati2024
}: StatsGridProps) {
  const difficulty = getDifficultyInfo(obtiznost);
  const percentage = Math.min(100, obtiznost);

  // Detekce oscilace přihlášek (normalizovaná na počet přijatých)
  // Pokud se "konkurence na místo" mění výrazně, může jít o efekt kyvadla
  let oscillationWarning: { type: 'up' | 'down'; message: string; detail: string } | null = null;

  if (trendData && trendData.prihlasky2024 > 0 && prijati2024 && prijati2024 > 0) {
    // Počet přijatých v 2025 odhadneme z kapacity (není ideální, ale data o přijatých 2025 máme)
    const prijati2025 = kapacita; // přibližně

    // Konkurence = přihlášky / přijatí
    const konkurence2024 = trendData.prihlasky2024 / prijati2024;
    const konkurence2025 = trendData.prihlasky2025 / prijati2025;

    // Změna konkurence v procentech
    const konkurenceChange = ((konkurence2025 - konkurence2024) / konkurence2024) * 100;

    // Threshold pro varování: 25% změna normalizované konkurence
    if (Math.abs(konkurenceChange) >= 25) {
      if (konkurenceChange < 0) {
        // Letos méně přihlášek (relativně)
        oscillationWarning = {
          type: 'down',
          message: '2025: Výrazně méně zájemců',
          detail: `V roce 2024 bylo ${trendData.prihlasky2024} přihlášek na ${prijati2024} míst (${konkurence2024.toFixed(1)}× konkurence). V roce 2025 je to ${trendData.prihlasky2025} přihlášek (${konkurence2025.toFixed(1)}×). Příští rok může zájem opět vzrůst – rodiče reagují na loňské statistiky.`
        };
      } else {
        // V roce 2025 více přihlášek (relativně)
        oscillationWarning = {
          type: 'up',
          message: '2025: Výrazně více zájemců',
          detail: `V roce 2024 bylo ${trendData.prihlasky2024} přihlášek na ${prijati2024} míst (${konkurence2024.toFixed(1)}× konkurence). V roce 2025 je to ${trendData.prihlasky2025} přihlášek (${konkurence2025.toFixed(1)}×). Příští rok může zájem klesnout – rodiče reagují na loňské statistiky.`
        };
      }
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
      {/* Uchazeči - sloučeno */}
      <div className="bg-white p-6 rounded-xl shadow-sm text-center">
        <div className="text-3xl font-bold text-blue-600">{formatNumber(totalApplicants)}</div>
        <div className="text-sm text-slate-600 mt-1 flex items-center justify-center">
          Uchazečů celkem
          <InfoTooltip title="Počet uchazečů">
            <strong>Celkový počet unikátních uchazečů</strong>, kteří tento obor zahrnuli do své přihlášky
            (na jakékoliv prioritě 1-3).
            <br /><br />
            Jeden uchazeč = jedna osoba, bez ohledu na to, kolik přihlášek podal.
          </InfoTooltip>
        </div>
        <div className="text-xs text-slate-500 mt-2">
          Na 1. místo dalo obor <span className="font-semibold text-green-600">{formatNumber(priority1Count)}</span> uchazečů
        </div>
      </div>

      {/* Min. body z JPZ */}
      <div className="bg-white p-6 rounded-xl shadow-sm text-center">
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Min. bodů z JPZ 2025</div>
        <div className="text-2xl font-bold text-blue-600">
          ČJ {cjAtJpzMin} <span className="text-slate-400">/</span> MA {maAtJpzMin}
        </div>
        <div className="text-xs text-slate-500 mt-1">(z max. 50 / 50)</div>
        <div className="text-xs text-slate-600 mt-2 flex items-center justify-center">
          celkem z JPZ: <span className="font-semibold ml-1">{jpzMin} b.</span>
          <InfoTooltip title="Minimální JPZ body pro přijetí">
            Toto jsou <strong>skutečné body z testů</strong> přijatého studenta s nejnižším JPZ skóre.
            <br /><br />
            ČJ {cjAtJpzMin} + MA {maAtJpzMin} = <strong>{jpzMin} bodů</strong> (z max. 100)
            <br /><br />
            Pokud dosáhnete alespoň tohoto skóre z JPZ testů, máte reálnou šanci na přijetí.
          </InfoTooltip>
        </div>
        {hasExtraCriteria && (
          <>
            <div className="text-xs text-slate-600 mt-1">
              min. celkové skóre: <span className="font-semibold text-amber-600">{minBody} b.</span>
            </div>
            <div className="text-xs text-amber-600 mt-1 flex items-center justify-center">
              +{extraBody} b. za další kritéria
              <InfoTooltip title="Dodatečná kritéria">
                Tento obor přidává ke skóre z JPZ ještě <strong>+{extraBody} bodů</strong> za další kritéria
                (typicky prospěch na ZŠ).
                <br /><br />
                Student s nejnižším JPZ ({jpzMin} b.) měl navíc {extraBody} bodů za prospěch,
                a tak dosáhl celkového skóre {minBody} bodů.
                <br /><br />
                Konkrétní kritéria a jejich váhu nastudujte na stránkách školy.
              </InfoTooltip>
            </div>
          </>
        )}
      </div>

      {/* Obtížnost přijetí */}
      <div className="bg-white p-6 rounded-xl shadow-sm text-center">
        <div className={`text-3xl font-bold ${difficulty.colorClass}`}>{obtiznost.toFixed(0)}</div>
        <div className="text-sm text-slate-600 mt-1 flex items-center justify-center">
          Obtížnost přijetí
          <InfoTooltip title="Index obtížnosti přijetí">
            <strong>Náročnost přijetí</strong> na škálu 0-100, kde:
            <br /><br />
            • <span className="text-green-400">0-44 = SNADNÉ</span> - vysoká šance na přijetí
            <br />
            • <span className="text-yellow-400">45-69 = STŘEDNÍ</span> - průměrná konkurence
            <br />
            • <span className="text-red-400">70-100 = TĚŽKÉ</span> - vysoká konkurence
            <br /><br />
            Index zohledňuje poměr přihlášek ke kapacitě a historické údaje o přijímání.
          </InfoTooltip>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-3">
          <div
            className={`h-full rounded-full ${difficulty.barColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className={`text-xs font-medium mt-2 ${difficulty.colorClass}`}>
          {difficulty.label}
        </div>
      </div>

      {/* Konkurence + Kapacita (sloučeno) */}
      <div className="bg-white p-6 rounded-xl shadow-sm text-center">
        <div className="text-2xl font-bold text-blue-600">
          {indexPoptavky.toFixed(1)}× <span className="text-slate-400 font-normal text-lg">na</span> {kapacita}
        </div>
        <div className="text-sm text-slate-600 mt-1 flex items-center justify-center">
          Konkurence / Kapacita
          <InfoTooltip title="Konkurence a kapacita">
            <strong>Konkurence {indexPoptavky.toFixed(1)}×</strong> znamená, že na jedno místo připadá
            přibližně {indexPoptavky.toFixed(1)} přihlášek.
            <br /><br />
            • Pod 1.5× - nízká konkurence<br />
            • 1.5-3× - střední konkurence<br />
            • Nad 3× - vysoká konkurence
            <br /><br />
            <strong>Kapacita {kapacita} míst</strong> je maximální počet studentů,
            které může škola přijmout do prvního ročníku.
          </InfoTooltip>
        </div>
      </div>

      {/* Varování o oscilaci přihlášek - jako karta v gridu */}
      {oscillationWarning && (
        <div className={`p-6 rounded-xl shadow-sm text-center border-2 ${
          oscillationWarning.type === 'down'
            ? 'bg-amber-50 border-amber-300'
            : 'bg-orange-50 border-orange-300'
        }`}>
          <div className="text-3xl mb-1">
            {oscillationWarning.type === 'down' ? '📉' : '📈'}
          </div>
          <div className={`text-sm font-semibold ${
            oscillationWarning.type === 'down' ? 'text-amber-800' : 'text-orange-800'
          }`}>
            {oscillationWarning.type === 'down' ? 'Méně' : 'Více'} zájemců
          </div>
          <div className={`text-xs mt-1 flex items-center justify-center ${
            oscillationWarning.type === 'down' ? 'text-amber-600' : 'text-orange-600'
          }`}>
            oproti 2024
            <InfoTooltip title={oscillationWarning.type === 'down' ? 'Pokles zájmu v 2025' : 'Nárůst zájmu v 2025'}>
              {oscillationWarning.detail}
              <br /><br />
              <strong>Tip:</strong> Tato oscilace je běžná. Rodiče reagují na loňské statistiky a příští rok se trend může obrátit.
            </InfoTooltip>
          </div>
        </div>
      )}
    </div>
  );
}

// Komponenta pro zobrazení kohort přijatých studentů
interface CohortDistributionProps {
  cohorts: number[] | null;
}

const COHORT_CONFIG = [
  { name: 'Výborný matematik', short: 'Výb. mat.', color: 'bg-blue-500', textColor: 'text-blue-700' },
  { name: 'Výborný vyvážený', short: 'Výb. vyv.', color: 'bg-blue-600', textColor: 'text-blue-700' },
  { name: 'Výborný humanitní', short: 'Výb. hum.', color: 'bg-blue-500', textColor: 'text-blue-700' },
  { name: 'Dobrý matematik', short: 'Dob. mat.', color: 'bg-blue-400', textColor: 'text-blue-600' },
  { name: 'Dobrý vyvážený', short: 'Dob. vyv.', color: 'bg-blue-400', textColor: 'text-blue-600' },
  { name: 'Dobrý humanitní', short: 'Dob. hum.', color: 'bg-blue-400', textColor: 'text-blue-600' },
  { name: 'Slabší matematik', short: 'Sl. mat.', color: 'bg-blue-300', textColor: 'text-blue-500' },
  { name: 'Slabší vyvážený', short: 'Sl. vyv.', color: 'bg-slate-300', textColor: 'text-slate-500' },
  { name: 'Slabší humanitní', short: 'Sl. hum.', color: 'bg-blue-300', textColor: 'text-blue-500' },
];

// Komponenta pro navigaci mezi obory školy
interface ProgramTabsProps {
  programs: Array<{
    id: string;
    nazev: string;
    obor: string;
    typ: string;
    delka_studia: number;
    min_body: number;
    kapacita?: number;
    slug: string;
    hasZamereni?: boolean;
    is_new_2026?: boolean;
    prev_zamereni_name?: string;
  }>;
  currentProgramId: string;
}

const delkaLabels: Record<number, { label: string; sublabel: string; color: string }> = {
  2: { label: '2leté', sublabel: 'nástavbové', color: 'bg-slate-500' },
  3: { label: '3leté', sublabel: 'učební obory', color: 'bg-slate-500' },
  4: { label: '4leté', sublabel: 'z 9. třídy', color: 'bg-blue-600' },
  5: { label: '5leté', sublabel: 'z 9. třídy', color: 'bg-blue-600' },
  6: { label: '6leté', sublabel: 'ze 7. třídy', color: 'bg-violet-600' },
  8: { label: '8leté', sublabel: 'z 5. třídy', color: 'bg-emerald-600' },
};

export function ProgramTabs({ programs, currentProgramId }: ProgramTabsProps) {
  if (programs.length <= 1) return null;

  const hasZamereni = programs.some(p => p.hasZamereni);

  // Seskupit podle délky studia
  const groups = new Map<number, typeof programs>();
  for (const p of programs) {
    if (!groups.has(p.delka_studia)) groups.set(p.delka_studia, []);
    groups.get(p.delka_studia)!.push(p);
  }
  // Seřadit skupiny (kratší první), uvnitř skupiny podle min. bodů desc
  const sortedGroups = [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([delka, progs]) => ({
      delka,
      programs: [...progs].sort((a, b) => b.min_body - a.min_body),
    }));

  const hasMixedLengths = sortedGroups.length > 1;
  const totalKapacita = programs.reduce((sum, p) => sum + (p.kapacita || 0), 0);

  return (
    <div className="bg-slate-50 border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Hlavička */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center">
            {hasZamereni ? 'Zaměření' : 'Obory'} školy
            <span className="ml-1.5 text-slate-400 font-normal">
              {programs.length} {programs.length === 1 ? 'obor' : programs.length < 5 ? 'obory' : 'oborů'}
              {totalKapacita > 0 && ` · ${totalKapacita} míst celkem`}
            </span>
            <InfoTooltip title="Co znamená hodnota na konci řádku">
              Jde o <strong>minimum bodů z JPZ</strong> přijatého studenta v roce 2025 — nejnižší bodový
              zisk z testů ČJ+MA, se kterým se uchazeč ještě dostal (max 100 b., 50 b. za předmět).
              <br /><br />
              Pokud škola udílí body i za prospěch nebo školní zkoušku, může být celkové minimum
              pro přijetí ještě vyšší (viz detail oboru).
              <br /><br />
              <strong>Pozn.:</strong> Data 2026 ještě nejsou kompletní — minima pro přijetí 2026
              se objeví, až CERMAT zveřejní výsledky 1. kola.
            </InfoTooltip>
          </h2>
        </div>

        {/* Skupiny podle délky studia */}
        <div className="space-y-3">
          {sortedGroups.map(({ delka, programs: groupPrograms }) => {
            const info = delkaLabels[delka] || { label: `${delka}leté`, sublabel: '', color: 'bg-slate-500' };
            return (
              <div key={delka}>
                {/* Hlavička skupiny - jen pokud jsou smíšené délky */}
                {hasMixedLengths && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold text-white ${info.color}`}>
                      {info.label}
                    </span>
                    <span className="text-xs text-slate-400">{info.sublabel}</span>
                  </div>
                )}

                {/* Řádky oborů */}
                <div className="space-y-1">
                  {groupPrograms.map(program => {
                    const isActive = program.id === currentProgramId;
                    return (
                      <Link
                        key={program.id}
                        href={`/skola/${program.slug}`}
                        className={`
                          group flex items-center gap-3 px-3 py-2 rounded-lg transition-all
                          ${isActive
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                          }
                        `}
                      >
                        {/* Název + délka studia */}
                        <span className={`flex-1 min-w-0 text-sm font-medium truncate ${isActive ? 'text-white' : ''}`}>
                          {program.obor}
                          <span className={`ml-1.5 inline-flex px-1.5 py-0 rounded text-[10px] font-semibold ${
                            isActive ? 'bg-white/20 text-white' : `${info.color} text-white`
                          }`}>
                            {program.delka_studia}leté
                          </span>
                          {program.is_new_2026 && (
                            <span className={`ml-1 inline-flex px-1.5 py-0 rounded text-[10px] font-semibold ${
                              isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                            }`}>
                              Nové 2026
                            </span>
                          )}
                          {program.prev_zamereni_name && (
                            <span className={`ml-1.5 text-xs font-normal ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>
                              (dříve {program.prev_zamereni_name})
                            </span>
                          )}
                        </span>

                        {/* Metriky */}
                        <span className={`flex-shrink-0 text-xs tabular-nums ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                          {program.kapacita ? `${program.kapacita} míst` : ''}
                        </span>
                        <span className={`flex-shrink-0 w-16 text-xs tabular-nums text-right font-medium ${isActive ? 'text-white' : 'text-red-600'}`}>
                          {program.min_body} b.
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CohortDistribution({ cohorts }: CohortDistributionProps) {
  if (!cohorts || cohorts.every(c => c === 0)) {
    return null;
  }

  const total = cohorts.reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  // Seskupit podle úrovně a profilu
  const byLevel = [
    { name: 'Výborní', count: cohorts[0] + cohorts[1] + cohorts[2], color: 'text-green-600' },
    { name: 'Dobří', count: cohorts[3] + cohorts[4] + cohorts[5], color: 'text-blue-600' },
    { name: 'Slabší', count: cohorts[6] + cohorts[7] + cohorts[8], color: 'text-slate-500' },
  ];

  const byProfile = [
    { name: 'Matematici', count: cohorts[0] + cohorts[3] + cohorts[6], color: 'text-blue-600' },
    { name: 'Vyvážení', count: cohorts[1] + cohorts[4] + cohorts[7], color: 'text-blue-600' },
    { name: 'Humanitní', count: cohorts[2] + cohorts[5] + cohorts[8], color: 'text-blue-600' },
  ];

  // Najít dominantní kohorty (>10%)
  const significantCohorts = cohorts
    .map((count, idx) => ({ count, idx, pct: (count / total) * 100 }))
    .filter(c => c.pct >= 5)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        Profily přijatých studentů
        <InfoTooltip title="Profily studentů">
          Rozdělení přijatých studentů podle jejich výsledků v testech JPZ.
          <br /><br />
          <strong>Úroveň</strong> = celková úspěšnost (průměr ČJ a MA, normalizovaný)
          <br />
          <strong>Profil</strong> = relativní síla v předmětech (matematik má lepší MA než ČJ vzhledem k populaci)
          <br /><br />
          Data jsou <strong>normalizovaná</strong> - zohledňují, že test z matematiky je těžší než z češtiny.
        </InfoTooltip>
      </h3>

      {/* Souhrnné statistiky */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Podle úrovně */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Podle úrovně</div>
          <div className="space-y-1">
            {byLevel.map(level => {
              const pct = (level.count / total) * 100;
              return (
                <div key={level.name} className="flex items-center text-sm">
                  <span className={`w-20 ${level.color} font-medium`}>{level.name}</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden mx-2">
                    <div
                      className={`h-full ${level.name === 'Výborní' ? 'bg-green-500' : level.name === 'Dobří' ? 'bg-blue-500' : 'bg-slate-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-slate-600">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Podle profilu */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Podle profilu</div>
          <div className="space-y-1">
            {byProfile.map(profile => {
              const pct = (profile.count / total) * 100;
              return (
                <div key={profile.name} className="flex items-center text-sm">
                  <span className={`w-20 ${profile.color} font-medium`}>{profile.name}</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden mx-2">
                    <div
                      className={`h-full ${profile.name === 'Matematici' ? 'bg-blue-500' : profile.name === 'Humanitní' ? 'bg-blue-500' : 'bg-blue-600'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-slate-600">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailní rozložení - kompaktní horizontální bar */}
      <div className="mt-4">
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Detailní rozložení ({total} přijatých)</div>
        <div className="h-6 flex rounded-full overflow-hidden">
          {cohorts.map((count, idx) => {
            const pct = (count / total) * 100;
            if (pct < 1) return null;
            return (
              <div
                key={idx}
                className={`${COHORT_CONFIG[idx].color} relative group`}
                style={{ width: `${pct}%` }}
                title={`${COHORT_CONFIG[idx].name}: ${count} (${pct.toFixed(0)}%)`}
              >
                {pct >= 8 && (
                  <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                    {pct.toFixed(0)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {/* Legenda - jen významné kohorty */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
          {significantCohorts.slice(0, 5).map(({ idx, pct }) => (
            <div key={idx} className="flex items-center">
              <div className={`w-3 h-3 rounded ${COHORT_CONFIG[idx].color} mr-1`} />
              <span className={COHORT_CONFIG[idx].textColor}>{COHORT_CONFIG[idx].short}</span>
              <span className="text-slate-400 ml-1">({pct.toFixed(0)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
