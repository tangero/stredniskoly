'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { School, categoryLabels, categoryColors } from '@/types/school';
import { ExtendedSchoolStats, YearlyTrendData } from '@/lib/data';

// Info tooltip komponenta
function InfoTooltip({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="ml-1 w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs inline-flex items-center justify-center cursor-help transition-colors flex-shrink-0"
        aria-label={`Nápověda: ${title}`}
      >
        ?
      </button>
      {isOpen && (
        <div className="fixed z-[100] w-80 max-w-[90vw] p-4 bg-slate-800 text-white text-sm rounded-lg shadow-2xl"
             style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <div className="flex justify-between items-start mb-2">
            <div className="font-semibold text-base">{title}</div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white text-lg leading-none ml-2">×</button>
          </div>
          <div className="text-slate-300 text-sm leading-relaxed">{children}</div>
        </div>
      )}
      {isOpen && <div className="fixed inset-0 z-[99] bg-black/20" onClick={() => setIsOpen(false)} />}
    </span>
  );
}

// Lokální verze createSlug
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

// Helper komponenty
function StudyLengthBadge({ delka }: { delka: number }) {
  const colors: Record<number, string> = {
    4: 'bg-blue-100 text-blue-800',
    6: 'bg-blue-100 text-blue-800',
    8: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${colors[delka] || 'bg-slate-100 text-slate-800'}`}>
      {delka}L
    </span>
  );
}

function MiniPriorityBar({ pcts }: { pcts: number[] }) {
  const p1 = pcts[0] || 0;
  const p2 = pcts[1] || 0;
  const p3 = pcts[2] || 0;

  return (
    <div className="w-full">
      <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-200">
        {p1 > 0 && <div className="bg-green-500 h-full" style={{ width: `${p1}%` }} />}
        {p2 > 0 && <div className="bg-yellow-500 h-full" style={{ width: `${p2}%` }} />}
        {p3 > 0 && <div className="bg-red-500 h-full" style={{ width: `${p3}%` }} />}
      </div>
    </div>
  );
}

// Prahy přepočítané na skutečné body (původně pro % škálu)
function getDifficultyBorder(minBody: number): string {
  if (minBody >= 60) return 'border-l-red-500';
  if (minBody >= 45) return 'border-l-orange-500';
  if (minBody >= 30) return 'border-l-yellow-500';
  return 'border-l-green-500';
}

function getZrizovatelBadge(zrizovatel: string): { label: string; class: string } | null {
  if (zrizovatel.toLowerCase().includes('soukrom')) {
    return { label: 'Soukromá', class: 'bg-amber-100 text-amber-800' };
  }
  if (zrizovatel.toLowerCase().includes('církev') || zrizovatel.toLowerCase().includes('arcibiskup')) {
    return { label: 'Církevní', class: 'bg-violet-100 text-violet-800' };
  }
  return null;
}

// Typ pro třídění
type SortKey = 'nazev' | 'jpz' | 'skore' | 'kapacita' | 'konkurence' | 'p1' | 'obtiznost' | 'trend';
type SortDir = 'asc' | 'desc';

// Ikona pro třídění
function SortIcon({ active, direction }: { active: boolean; direction: SortDir }) {
  return (
    <span className={`ml-1 inline-block ${active ? 'text-blue-600' : 'text-slate-300'}`}>
      {direction === 'asc' ? '↑' : '↓'}
    </span>
  );
}

interface Props {
  schools: School[];
  extendedStatsMap: Record<string, ExtendedSchoolStats>;
  trendDataMap: Record<string, YearlyTrendData>;
  krajName: string;
}

// Komponenta pro zobrazení trendu
function TrendIndicator({ trend }: { trend: YearlyTrendData | undefined }) {
  if (!trend || trend.prihlasky2024 === 0) {
    return <span className="text-slate-400">-</span>;
  }

  const change = trend.prihlaskyChange;
  const direction = trend.prihlaskyDirection;

  // Barva a ikona podle směru
  let colorClass = 'text-slate-500';
  let icon = '→';
  let bgClass = 'bg-slate-100';

  if (direction === 'up') {
    // Nárůst přihlášek = větší konkurence = horší pro uchazeče
    colorClass = 'text-red-600';
    icon = '↑';
    bgClass = 'bg-red-50';
  } else if (direction === 'down') {
    // Pokles přihlášek = menší konkurence = lepší pro uchazeče
    colorClass = 'text-green-600';
    icon = '↓';
    bgClass = 'bg-green-50';
  }

  return (
    <div className={`text-center px-2 py-1 rounded ${bgClass}`}>
      <div className={`font-semibold ${colorClass}`}>
        {icon} {Math.abs(change).toFixed(0)}%
      </div>
      <div className="text-xs text-slate-500">
        {trend.prihlasky2024} → {trend.prihlasky2025}
      </div>
    </div>
  );
}

const ITEMS_PER_PAGE = 20;

// Sortable header component - must be outside of RegionSchoolsTable
function SortableHeader({
  label,
  sortKeyName,
  tooltip,
  sortKey,
  sortDir,
  onSort
}: {
  label: string;
  sortKeyName: SortKey;
  tooltip?: React.ReactNode;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  return (
    <th
      className="p-3 font-medium text-slate-600 text-sm cursor-pointer hover:bg-slate-100 select-none"
      onClick={() => onSort(sortKeyName)}
    >
      <div className="flex items-center justify-center">
        {label}
        <SortIcon active={sortKey === sortKeyName} direction={sortKey === sortKeyName ? sortDir : 'desc'} />
        {tooltip}
      </div>
    </th>
  );
}

export function RegionSchoolsTable({ schools, extendedStatsMap, trendDataMap, krajName }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('jpz');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Funkce pro třídění
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    // Reset na první stránku při změně třídění
    setCurrentPage(1);
  };

  // Seřazená data
  const sortedSchools = useMemo(() => {
    return [...schools].sort((a, b) => {
      const statsA = extendedStatsMap[a.id];
      const statsB = extendedStatsMap[b.id];
      const trendA = trendDataMap[a.id];
      const trendB = trendDataMap[b.id];

      let valA: number | string = 0;
      let valB: number | string = 0;

      switch (sortKey) {
        case 'nazev':
          valA = a.nazev;
          valB = b.nazev;
          break;
        case 'jpz':
          valA = statsA?.jpz_min || 0;
          valB = statsB?.jpz_min || 0;
          break;
        case 'skore':
          valA = statsA?.jpz_prumer || a.prumer_body;
          valB = statsB?.jpz_prumer || b.prumer_body;
          break;
        case 'kapacita':
          valA = a.kapacita;
          valB = b.kapacita;
          break;
        case 'konkurence':
          valA = a.index_poptavky;
          valB = b.index_poptavky;
          break;
        case 'p1':
          valA = a.priority_pcts[0] || 0;
          valB = b.priority_pcts[0] || 0;
          break;
        case 'obtiznost':
          valA = a.obtiznost;
          valB = b.obtiznost;
          break;
        case 'trend':
          valA = trendA?.prihlaskyChange || 0;
          valB = trendB?.prihlaskyChange || 0;
          break;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDir === 'asc'
          ? valA.localeCompare(valB, 'cs')
          : valB.localeCompare(valA, 'cs');
      }

      return sortDir === 'asc'
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });
  }, [schools, extendedStatsMap, trendDataMap, sortKey, sortDir]);

  // Stránkování
  const totalPages = Math.ceil(sortedSchools.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSchools = sortedSchools.slice(startIndex, endIndex);

  // Generování čísel stránek pro zobrazení
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-6 border-b flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold">Školy v {krajName} kraji</h2>
          <p className="text-sm text-slate-500 mt-1">
            Zobrazeno {startIndex + 1}–{Math.min(endIndex, sortedSchools.length)} z {sortedSchools.length} škol
          </p>
        </div>
        <span className="text-sm text-slate-500">
          Kliknutím na záhlaví sloupce změníte řazení
        </span>
      </div>

      {/* Desktop tabulka */}
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th
                className="text-left p-3 font-medium text-slate-600 text-sm cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('nazev')}
              >
                Škola a obor
                <SortIcon active={sortKey === 'nazev'} direction={sortKey === 'nazev' ? sortDir : 'asc'} />
              </th>
              <th className="text-center p-3 font-medium text-slate-600 text-sm w-12">Délka</th>
              <th className="text-left p-3 font-medium text-slate-600 text-sm">
                <div className="flex items-center">
                  Kategorie
                  <InfoTooltip title="Kategorie a priority">
                    <strong>Kategorie</strong> určuje typ studijního programu.
                    <br /><br />
                    <strong>Heatmapa priorit</strong> pod kategorií ukazuje, jak často je tento obor volen jako:
                    <br />
                    • <span className="text-green-400">Zelená</span> = 1. priorita (nejvíce chtěná)
                    <br />
                    • <span className="text-yellow-400">Žlutá</span> = 2. priorita
                    <br />
                    • <span className="text-red-400">Červená</span> = 3. priorita (záloha)
                  </InfoTooltip>
                </div>
              </th>
              <SortableHeader
                label="Body min"
                sortKeyName="jpz"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                tooltip={
                  <InfoTooltip title="Minimální body pro přijetí">
                    <strong>Minimální počet bodů z JPZ</strong> s jakým byl někdo přijat.
                    <br /><br />
                    Menší čísla = body jednoho studenta (ČJ / MA).
                    <br /><br />
                    Maximum: 100 bodů (50 ČJ + 50 MA)
                  </InfoTooltip>
                }
              />
              <SortableHeader
                label="Body průměr"
                sortKeyName="skore"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                tooltip={
                  <InfoTooltip title="Průměrné body přijatých">
                    <strong>Průměrné body z JPZ</strong> všech přijatých studentů.
                    <br /><br />
                    <span className="text-amber-400">📝</span> = obor má dodatečná kritéria (prospěch aj.)
                  </InfoTooltip>
                }
              />
              <SortableHeader label="Kapacita" sortKeyName="kapacita" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortableHeader
                label="Konkurence"
                sortKeyName="konkurence"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                tooltip={
                  <InfoTooltip title="Index konkurence">
                    <strong>Poměr přihlášek ke kapacitě</strong>.
                    <br /><br />
                    • Pod 1.5× = nízká konkurence
                    <br />
                    • 1.5-3× = střední konkurence
                    <br />
                    • Nad 3× = vysoká konkurence
                  </InfoTooltip>
                }
              />
              <SortableHeader
                label="1. volba"
                sortKeyName="p1"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                tooltip={
                  <InfoTooltip title="Procento 1. voleb">
                    Kolik procent uchazečů dalo tento obor jako svou <strong>první volbu</strong>.
                    <br /><br />
                    Vyšší číslo = škola je pro uchazeče atraktivnější.
                  </InfoTooltip>
                }
              />
              <SortableHeader
                label="Trend"
                sortKeyName="trend"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                tooltip={
                  <InfoTooltip title="Meziroční trend přihlášek">
                    <strong>Změna počtu přihlášek</strong> mezi lety 2024 a 2025.
                    <br /><br />
                    • <span className="text-green-400">↓ Pokles</span> = menší konkurence letos, lepší šance
                    <br />
                    • <span className="text-red-400">↑ Nárůst</span> = větší konkurence letos
                    <br /><br />
                    <strong>Tip:</strong> Školy s vysokou konkurencí v předchozích letech mívají
                    příští rok pokles přihlášek (lidé se bojí). Naopak školy s nízkou konkurencí
                    mohou příští rok zažít nárůst.
                  </InfoTooltip>
                }
              />
            </tr>
          </thead>
          <tbody>
            {paginatedSchools.map((school) => {
              const slug = `${school.id.split('_')[0]}-${createSlug(school.nazev, school.obor)}`;
              const category = categoryColors[school.category_code];
              const zrizovatel = getZrizovatelBadge(school.zrizovatel);
              const stats = extendedStatsMap[school.id];
              const trend = trendDataMap[school.id];
              const jpzMin = stats?.jpz_min || 0;
              const hasExtra = stats?.hasExtraCriteria || false;
              const borderColor = getDifficultyBorder(jpzMin || school.min_body);

              // Barva konkurence
              let konkurenceColor = 'text-green-600';
              let konkurenceIcon = '↓';
              if (school.index_poptavky >= 3) {
                konkurenceColor = 'text-red-600';
                konkurenceIcon = '↑↑';
              } else if (school.index_poptavky >= 2) {
                konkurenceColor = 'text-orange-600';
                konkurenceIcon = '↑';
              } else if (school.index_poptavky >= 1.5) {
                konkurenceColor = 'text-yellow-600';
                konkurenceIcon = '→';
              }

              return (
                <tr key={school.id} className={`border-t hover:bg-slate-50 border-l-4 ${borderColor}`}>
                  {/* Škola a obor */}
                  <td className="p-3">
                    <Link href={`/skola/${slug}`} className="group">
                      <div className="font-medium text-blue-600 group-hover:underline">{school.nazev}</div>
                      <div className="text-sm text-slate-600">{school.obor}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        {school.obec}
                        {zrizovatel && (
                          <span className={`px-1.5 py-0.5 rounded text-xs ${zrizovatel.class}`}>
                            {zrizovatel.label}
                          </span>
                        )}
                      </div>
                    </Link>
                  </td>

                  {/* Délka */}
                  <td className="p-3 text-center">
                    <StudyLengthBadge delka={school.delka_studia} />
                  </td>

                  {/* Kategorie + heatmapa */}
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${category.bg} ${category.text}`}>
                      {categoryLabels[school.category_code]}
                    </span>
                    <div className="mt-1.5">
                      <MiniPriorityBar pcts={school.priority_pcts} />
                    </div>
                  </td>

                  {/* Body min */}
                  <td className="p-3 text-center">
                    {stats ? (
                      <div>
                        <div className="text-lg font-bold text-slate-900">{jpzMin}</div>
                        <div className="text-xs text-slate-500">
                          {stats.cj_at_jpz_min}/{stats.ma_at_jpz_min}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  {/* Body průměr */}
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className={`text-lg font-bold ${hasExtra ? 'text-amber-600' : 'text-slate-900'}`}>
                        {stats?.jpz_prumer || school.prumer_body}
                      </span>
                      {hasExtra && (
                        <span title="Obor má dodatečná kritéria (prospěch aj.)" className="cursor-help">
                          📝
                        </span>
                      )}
                    </div>
                    {hasExtra && stats && (
                      <div className="text-xs text-amber-600">+{stats.extra_body} extra</div>
                    )}
                  </td>

                  {/* Kapacita */}
                  <td className="p-3 text-center">
                    <div className="font-medium">{school.kapacita}</div>
                    <div className="text-xs text-slate-500">míst</div>
                  </td>

                  {/* Konkurence */}
                  <td className="p-3 text-center">
                    <div className={`font-semibold ${konkurenceColor}`}>
                      {school.index_poptavky.toFixed(1)}× {konkurenceIcon}
                    </div>
                    <div className="text-xs text-slate-500">{school.total_applicants} uch.</div>
                  </td>

                  {/* 1. volba */}
                  <td className="p-3 text-center">
                    <span className={`font-semibold ${
                      school.priority_pcts[0] >= 50 ? 'text-green-600' :
                      school.priority_pcts[0] >= 30 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {school.priority_pcts[0]?.toFixed(0) || 0}%
                    </span>
                  </td>

                  {/* Trend */}
                  <td className="p-3">
                    <TrendIndicator trend={trend} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile karty */}
      <div className="md:hidden space-y-3 p-4">
        {paginatedSchools.map((school) => {
          const slug = `${school.id.split('_')[0]}-${createSlug(school.nazev, school.obor)}`;
          const category = categoryColors[school.category_code];
          const zrizovatel = getZrizovatelBadge(school.zrizovatel);
          const stats = extendedStatsMap[school.id];
          const trend = trendDataMap[school.id];
          const jpzMin = stats?.jpz_min || 0;
          const hasExtra = stats?.hasExtraCriteria || false;
          const borderColor = getDifficultyBorder(jpzMin || school.min_body);

          // Mini trend badge pro mobilní kartu
          const trendBadge = trend && trend.prihlasky2024 > 0 ? (
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              trend.prihlaskyDirection === 'down' ? 'bg-green-100 text-green-700' :
              trend.prihlaskyDirection === 'up' ? 'bg-red-100 text-red-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              {trend.prihlaskyDirection === 'down' ? '↓' : trend.prihlaskyDirection === 'up' ? '↑' : '→'}
              {Math.abs(trend.prihlaskyChange).toFixed(0)}%
            </span>
          ) : null;

          return (
            <Link
              key={school.id}
              href={`/skola/${slug}`}
              className={`block bg-white p-4 rounded-lg shadow-sm border-l-4 ${borderColor} hover:bg-slate-50`}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <StudyLengthBadge delka={school.delka_studia} />
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${category.bg} ${category.text}`}>
                      {categoryLabels[school.category_code]}
                    </span>
                    {zrizovatel && (
                      <span className={`px-1.5 py-0.5 rounded text-xs ${zrizovatel.class}`}>
                        {zrizovatel.label}
                      </span>
                    )}
                    {hasExtra && <span title="Dodatečná kritéria">📝</span>}
                    {trendBadge}
                  </div>
                  <div className="font-medium text-slate-900 truncate">{school.nazev}</div>
                  <div className="text-sm text-slate-600 truncate">{school.obor}</div>
                  <div className="text-xs text-slate-400 mt-1">{school.obec}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-blue-600">{jpzMin || school.min_body}</div>
                  <div className="text-xs text-slate-500">JPZ bodů</div>
                  {hasExtra && (
                    <div className="text-xs text-amber-600">skóre: {school.min_body}</div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Kapacita:</span>
                    <span className="font-medium ml-1">{school.kapacita}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Konkurence:</span>
                    <span className="font-medium ml-1">{school.index_poptavky.toFixed(1)}×</span>
                  </div>
                </div>
                <div className="w-16">
                  <MiniPriorityBar pcts={school.priority_pcts} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Stránkování */}
      {totalPages > 1 && (
        <div className="p-4 border-t bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-600">
            Stránka {currentPage} z {totalPages}
          </div>
          <div className="flex items-center gap-1">
            {/* Předchozí */}
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 1
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              ← Předchozí
            </button>

            {/* Čísla stránek */}
            <div className="hidden sm:flex items-center gap-1">
              {getPageNumbers().map((page, idx) => (
                typeof page === 'number' ? (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                ) : (
                  <span key={idx} className="px-2 text-slate-400">...</span>
                )
              ))}
            </div>

            {/* Další */}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === totalPages
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Další →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
