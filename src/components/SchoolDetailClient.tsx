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

  return (
    <Link
      href={`/skola/${slug}`}
      className={`block px-3 py-2 bg-white rounded-lg hover:bg-slate-50 transition-colors border-l-4 border-slate-200 shadow-sm`}
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
  // Nahrazeno StatsTab: bez ověřené přijímací hranice nevytváříme doporučení.
  return null;
}

// Šance přijetí podle priority
interface AcceptanceByPriorityProps {
  prihlasky_priority: number[];
  prijati_priority: number[];
}

export function AcceptanceByPriority({ prihlasky_priority, prijati_priority }: AcceptanceByPriorityProps) {
  // Nahrazeno StatsTab: bez ověřené přijímací hranice nevytváříme doporučení.
  return null;
}

// Náročnost testů (ČJ vs MA)
interface TestDifficultyProps {
  cj_prumer: number;
  cj_at_jpz_min: number | null;  // ČJ body studenta s nejnižším celkovým JPZ
  ma_prumer: number;
  ma_at_jpz_min: number | null;  // MA body studenta s nejnižším celkovým JPZ
  jpz_min: number | null;        // Skutečné minimum JPZ (cj_at_jpz_min + ma_at_jpz_min)
}

export function TestDifficulty({ cj_prumer, cj_at_jpz_min, ma_prumer, ma_at_jpz_min, jpz_min }: TestDifficultyProps) {
  // Nahrazeno StatsTab: bez ověřené přijímací hranice nevytváříme doporučení.
  return null;
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
  jpzMin: number | null;           // Čisté JPZ body (cj_min + ma_min) - používáno pro srovnání
  minBody: number;          // Celkové skóre pro přijetí
  extraBody: number | null;        // Body za další kritéria (prospěch aj.)
  hasExtraCriteria: boolean | null;// Má obor další kritéria?
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
  // Nahrazeno StatsTab: bez ověřené přijímací hranice nevytváříme doporučení.
  return null;
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
  jpzMin: number | null;              // skutečné minimum JPZ (z jednoho studenta)
  cjAtJpzMin: number | null;          // ČJ body studenta s nejnižším JPZ
  maAtJpzMin: number | null;          // MA body studenta s nejnižším JPZ
  hasExtraCriteria: boolean | null;
  extraBody: number | null;
  obtiznost?: number; // Staré volání tolerujeme; neověřený index se nezobrazuje.
  acceptedCount?: number;
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

export function StatsGrid({
  totalApplicants,
  priority1Count,
  minBody,
  jpzMin,
  cjAtJpzMin,
  maAtJpzMin,
  hasExtraCriteria,
  extraBody,
  acceptedCount,
  indexPoptavky,
  kapacita,
  trendData,
  prijati2024
}: StatsGridProps) {

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

      <div className="bg-white p-6 rounded-xl shadow-sm text-center">
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Historické minimum JPZ 2025</div>
        <p className="text-sm text-slate-600">Pro toto porovnání nemáme ověřený údaj.</p>
        <p className="text-xs text-slate-500 mt-2">Kritéria a bodové hodnocení pro rok 2027 ověřte přímo u školy.</p>
      </div>

      {/* Ověřený počet místo historického indexu bez doloženého výpočtu. */}
      <div className="bg-white p-6 rounded-xl shadow-sm text-center">
        <div className="text-3xl font-bold text-slate-900">{acceptedCount == null ? '—' : formatNumber(acceptedCount)}</div>
        <div className="text-sm text-slate-600 mt-1 flex items-center justify-center">
          Přijatí v roce 2025
          <InfoTooltip title="Historický počet přijatých">
            Počet přijatých na tento obor v datech 2025. Není to počet všech uchazečů, kteří by splnili kritéria, ani osobní šance na přijetí.
          </InfoTooltip>
        </div>
        <p className="mt-3 text-sm text-slate-600">Kapacita {formatNumber(kapacita)} míst</p>
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
      programs: [...progs].sort((a, b) => a.obor.localeCompare(b.obor, 'cs')),
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
                              V importu 2026
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
