'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

type ReachableSchool = {
  redizo: string;
  nazev: string;
  adresa: string;
  obec: string;
  kraj: string;
  typy: string[];
  estimatedMinutes: number;
  stopName: string;
  transitMinutes: number;
  walkMinutes: number;
  waitMinutes: number;
  transfers: number;
  usedLines: string[];
  admissionBand: 'very_high' | 'high' | 'medium' | 'low' | 'very_low' | 'unknown';
  obory: string[];
  minBodyMin: number | null;
  difficultyScore: number | null;
  schoolUrl: string;
  simulatorSchoolId: string | null;
};

type SearchResponse = {
  input: {
    stopId: string;
    stopName: string;
    maxMinutes: number;
    page: number;
  };
  origin: {
    stopId: string;
    stopName: string;
    lat: number;
    lon: number;
  };
  reachableSchools: ReachableSchool[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  legends: {
    admissionThresholds: {
      veryLowMax: number;
      lowMax: number;
      mediumMax: number;
      highMax: number;
    } | null;
  };
  diagnostics: {
    totalSchoolsInDb: number;
    reachableStopCount: number;
    model: string;
    timingsMs?: Record<string, number>;
    notes: string[];
  };
};

type StopSuggestion = {
  stopId: string;
  name: string;
  lat: number;
  lon: number;
};

const TYP_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Vše' },
  { value: 'GY4', label: 'Gymnázium 4leté' },
  { value: 'GY6', label: 'Gymnázium 6leté' },
  { value: 'GY8', label: 'Gymnázium 8leté' },
  { value: 'LYC', label: 'Lyceum' },
  { value: 'SOS', label: 'SOŠ' },
  { value: 'SOU', label: 'SOU' },
];

function loadingStage(seconds: number): string {
  if (seconds < 2) return 'Načítám transit graf a data škol...';
  if (seconds < 5) return 'Spouštím Dijkstra algoritmus na grafu zastávek...';
  if (seconds < 10) return 'Hledám školy v dosahu a počítám časy...';
  return 'Finalizuji seřazený seznam škol...';
}

function timeCohort(minutes: number): { label: string; badgeClass: string } {
  const bucket = Math.max(0, Math.floor(minutes / 10));
  const start = bucket * 10;
  const end = start + 9;
  const palette = [
    'bg-emerald-100 text-emerald-800',
    'bg-green-100 text-green-800',
    'bg-sky-100 text-sky-800',
    'bg-cyan-100 text-cyan-800',
    'bg-amber-100 text-amber-800',
    'bg-orange-100 text-orange-800',
    'bg-rose-100 text-rose-800',
    'bg-fuchsia-100 text-fuchsia-800',
  ];
  const badgeClass = palette[Math.min(bucket, palette.length - 1)];
  return { label: `${start}-${end} min`, badgeClass };
}

function admissionRowClass(band: ReachableSchool['admissionBand']): string {
  if (band === 'very_high') return 'bg-emerald-50/70';
  if (band === 'high') return 'bg-lime-50/70';
  if (band === 'medium') return 'bg-amber-50/70';
  if (band === 'low') return 'bg-orange-50/70';
  if (band === 'very_low') return 'bg-rose-50/70';
  return 'bg-slate-50/40';
}

function transferLabel(transfers: number): string {
  if (transfers === 0) return 'bez přestupu';
  if (transfers === 1) return '1 přestup';
  if (transfers >= 2 && transfers <= 4) return `${transfers} přestupy`;
  return `${transfers} přestupů`;
}

function transferBadgeClass(transfers: number): string {
  if (transfers === 0) return 'bg-emerald-100 text-emerald-700';
  if (transfers === 1) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
}

function typLabel(typ: string): string {
  if (typ === 'GY4') return 'Gymnázium 4l';
  if (typ === 'GY6') return 'Gymnázium 6l';
  if (typ === 'GY8') return 'Gymnázium 8l';
  if (typ === 'LYC') return 'Lyceum';
  if (typ === 'SOS') return 'SOŠ';
  if (typ === 'SOU') return 'SOU';
  if (typ === 'KON') return 'Konzervatoř';
  return typ || '—';
}

function linesLabel(lines: string[]): string {
  if (lines.length === 0) return '';
  return lines.join(' → ');
}

export function DostupnostClient() {
  const [stopQuery, setStopQuery] = useState('');
  const [selectedStop, setSelectedStop] = useState<StopSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<StopSuggestion[]>([]);
  const [suggestionsTotal, setSuggestionsTotal] = useState(0);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [maxMinutes, setMaxMinutes] = useState(60);
  const [typFilter, setTypFilter] = useState('');
  const [lastSearch, setLastSearch] = useState<{
    stopId: string;
    maxMinutes: number;
    typFilter: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [selectedSimulatorIds, setSelectedSimulatorIds] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const timeoutTriggeredRef = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const totalFound = result?.pagination.totalItems ?? 0;

  const selectableSimulatorIds = useMemo(() => {
    if (!result) return [];
    return result.reachableSchools
      .map((school) => school.simulatorSchoolId)
      .filter((id): id is string => Boolean(id));
  }, [result]);

  const admissionThresholds = result?.legends.admissionThresholds ?? null;

  useEffect(() => {
    if (!loading) {
      setLoadingSeconds(0);
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingSeconds((v) => v + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  useEffect(() => {
    const query = stopQuery.trim();
    if (query.length < 2 || selectedStop) {
      setSuggestions([]);
      setSuggestionsTotal(0);
      setSuggestLoading(false);
      setShowDropdown(false);
      return;
    }

    let isCurrent = true;
    setSuggestLoading(true);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set('q', query);
        params.set('limit', '12');
        const response = await fetch(`/api/dostupnost/stop-suggest?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!isCurrent) return;
        if (!response.ok) {
          setSuggestLoading(false);
          return;
        }
        const payload = await response.json() as { suggestions?: StopSuggestion[]; totalFound?: number };
        if (!isCurrent) return;
        const items = Array.isArray(payload.suggestions) ? payload.suggestions : [];
        setSuggestions(items);
        setSuggestionsTotal(payload.totalFound ?? items.length);
        setHighlightIndex(-1);
        setShowDropdown(items.length > 0);
        setSuggestLoading(false);
      } catch {
        if (isCurrent) setSuggestLoading(false);
      }
    }, 150);

    return () => {
      isCurrent = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [stopQuery, selectedStop]);

  function cancelLoading() {
    abortRef.current?.abort();
    abortRef.current = null;
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setLoading(false);
    setError('Výpočet byl zrušen.');
  }

  async function runSearch(params: {
    stopId: string;
    maxMinutes: number;
    typFilter: string;
    page: number;
    clearSelection: boolean;
  }) {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    timeoutTriggeredRef.current = false;
    timeoutRef.current = window.setTimeout(() => {
      timeoutTriggeredRef.current = true;
      abortRef.current?.abort();
    }, 120000);

    setLoading(true);
    setLoadingSeconds(0);
    setError(null);

    try {
      const response = await fetch('/api/dostupnost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stopId: params.stopId,
          maxMinutes: params.maxMinutes,
          typFilter: params.typFilter,
          page: params.page,
        }),
        signal: abortRef.current.signal,
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error ?? 'Nepodařilo se načíst data.');
        setResult(null);
        if (params.clearSelection) setSelectedSimulatorIds([]);
        return;
      }

      setResult(payload as SearchResponse);
      setLastSearch({
        stopId: params.stopId,
        maxMinutes: params.maxMinutes,
        typFilter: params.typFilter,
      });
      if (params.clearSelection) setSelectedSimulatorIds([]);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError(timeoutTriggeredRef.current
          ? 'Výpočet trval příliš dlouho a byl ukončen.'
          : 'Výpočet byl zrušen.');
      } else {
        setError('Volání API selhalo. Zkuste to prosím za chvíli znovu.');
      }
      setResult(null);
      if (params.clearSelection) setSelectedSimulatorIds([]);
    } finally {
      abortRef.current = null;
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setLoading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;

    if (!selectedStop) {
      setError('Vyberte výchozí zastávku z nabídky.');
      return;
    }

    await runSearch({
      stopId: selectedStop.stopId,
      maxMinutes,
      typFilter,
      page: 1,
      clearSelection: true,
    });
  }

  function selectSuggestion(suggestion: StopSuggestion) {
    setSelectedStop(suggestion);
    setStopQuery(suggestion.name);
    setSuggestions([]);
    setSuggestionsTotal(0);
    setShowDropdown(false);
    setHighlightIndex(-1);
  }

  function handleStopQueryChange(value: string) {
    setStopQuery(value);
    if (selectedStop && value !== selectedStop.name) {
      setSelectedStop(null);
    }
  }

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => {
        const next = prev < suggestions.length - 1 ? prev + 1 : 0;
        scrollToItem(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => {
        const next = prev > 0 ? prev - 1 : suggestions.length - 1;
        scrollToItem(next);
        return next;
      });
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[highlightIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowDropdown(false);
      setHighlightIndex(-1);
    }
  }, [showDropdown, suggestions, highlightIndex]);

  function scrollToItem(index: number) {
    requestAnimationFrame(() => {
      const container = listRef.current;
      if (!container) return;
      const item = container.children[index] as HTMLElement | undefined;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function highlightMatch(text: string, query: string): React.ReactNode {
    if (!query.trim()) return text;
    const norm = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const textNorm = norm(text);
    const queryNorm = norm(query.trim());
    const matchStart = textNorm.indexOf(queryNorm);
    if (matchStart === -1) return text;
    const matchEnd = matchStart + queryNorm.length;
    const origChars = [...text];
    const normChars: string[] = [];
    const origToNormIndex: number[] = [];
    for (const ch of origChars) {
      const normalized = ch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      origToNormIndex.push(normChars.length);
      for (const nc of normalized) {
        normChars.push(nc);
      }
    }
    let origStart = -1;
    let origEnd = -1;
    for (let i = 0; i < origChars.length; i++) {
      if (origToNormIndex[i] === matchStart && origStart === -1) origStart = i;
      if (origToNormIndex[i] < matchEnd) origEnd = i + 1;
    }
    if (origStart === -1 || origEnd === -1) return text;
    return (
      <>
        {text.slice(0, origStart)}
        <strong className="text-blue-700">{text.slice(origStart, origEnd)}</strong>
        {text.slice(origEnd)}
      </>
    );
  }

  function toggleSimulatorSelection(simulatorSchoolId: string | null) {
    if (!simulatorSchoolId) return;
    setSelectedSimulatorIds((prev) => (
      prev.includes(simulatorSchoolId)
        ? prev.filter((id) => id !== simulatorSchoolId)
        : [...prev, simulatorSchoolId]
    ));
  }

  function toggleSelectAllForSimulator() {
    if (!result) return;
    if (selectedSimulatorIds.length === selectableSimulatorIds.length) {
      setSelectedSimulatorIds([]);
    } else {
      setSelectedSimulatorIds(Array.from(new Set(selectableSimulatorIds)));
    }
  }

  function openSelectedInSimulator() {
    const ids = Array.from(new Set(selectedSimulatorIds));
    if (ids.length === 0) return;
    const params = new URLSearchParams();
    params.set('skoly', ids.join(','));
    params.set('srovnani', '1');
    window.open(`/simulator?${params.toString()}`, '_blank', 'noopener,noreferrer');
  }

  async function goToPage(page: number) {
    if (!lastSearch) return;
    if (loading) return;
    if (page < 1) return;
    await runSearch({
      stopId: lastSearch.stopId,
      maxMinutes: lastSearch.maxMinutes,
      typFilter: lastSearch.typFilter,
      page,
      clearSelection: false,
    });
  }

  return (
    <div className="space-y-6">
      {/* Informacni panel a navod */}
      <div className="bg-white rounded-2xl shadow-sm border p-5 md:p-6">
        <h3 className="font-semibold text-slate-800 mb-3">Jak to funguje</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-700">
          <div>
            <p className="font-medium text-slate-800 mb-2">Postup:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Zadejte název zastávky (autobus, vlak, metro, tramvaj)</li>
              <li>Vyberte maximální dojezdový čas a typ školy</li>
              <li>Klikněte na Vyhledat</li>
              <li>Vyberte zajímavé školy a otevřete je v Simulátoru</li>
            </ol>
          </div>
          <div>
            <p className="font-medium text-slate-800 mb-2">Jak počítáme časy:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Dijkstra routing na celostátním GTFS grafu (35 000+ zastávek)</li>
              <li>Zahrnujeme čekání na spoj (headway/2 z ranního profilu Po 7-8h)</li>
              <li>Přestupní penalizace 2 min za každý přestup</li>
              <li>Chůze ke škole max 1,5 km rychlostí 5 km/h</li>
              <li>Slouží jako odhad, ne přesný jízdní řád</li>
            </ul>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-sm border p-5 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5 relative" ref={wrapperRef}>
            <label>
              <span className="block text-sm font-medium text-slate-700 mb-1">
                Výchozí zastávka
              </span>
              <input
                type="text"
                value={stopQuery}
                onChange={(e) => handleStopQueryChange(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onFocus={() => {
                  if (suggestions.length > 0 && !selectedStop) setShowDropdown(true);
                }}
                placeholder="Začněte psát název zastávky..."
                autoComplete="off"
                role="combobox"
                aria-expanded={showDropdown}
                aria-autocomplete="list"
                aria-activedescendant={highlightIndex >= 0 ? `stop-option-${highlightIndex}` : undefined}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </label>
            {selectedStop && (
              <p className="text-xs text-emerald-700 mt-1">
                Vybrána: {selectedStop.name}
              </p>
            )}
            {showDropdown && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto" role="listbox" ref={listRef}>
                {suggestLoading && suggestions.length === 0 && (
                  <div className="px-4 py-3 text-sm text-slate-500">Hledám...</div>
                )}
                {suggestions.map((s, i) => (
                  <button
                    key={s.stopId}
                    id={`stop-option-${i}`}
                    type="button"
                    role="option"
                    aria-selected={i === highlightIndex}
                    onClick={() => selectSuggestion(s)}
                    onMouseEnter={() => setHighlightIndex(i)}
                    className={`w-full text-left px-4 py-2.5 text-sm text-slate-800 border-b border-slate-100 last:border-b-0 transition-colors truncate ${
                      i === highlightIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="break-words whitespace-normal">{highlightMatch(s.name, stopQuery)}</span>
                  </button>
                ))}
                {suggestionsTotal > suggestions.length && (
                  <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">
                    Zobrazeno {suggestions.length} z {suggestionsTotal} výsledků
                  </div>
                )}
              </div>
            )}
            {suggestLoading && !showDropdown && stopQuery.trim().length >= 2 && !selectedStop && (
              <p className="text-xs text-slate-500 mt-1">Hledám zastávky...</p>
            )}
          </div>

          <label className="md:col-span-2">
            <span className="block text-sm font-medium text-slate-700 mb-1">
              Max dojezd (min)
            </span>
            <input
              type="number"
              min={5}
              max={180}
              value={maxMinutes}
              onChange={(e) => setMaxMinutes(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            />
          </label>

          <label className="md:col-span-2">
            <span className="block text-sm font-medium text-slate-700 mb-1">
              Typ školy
            </span>
            <select
              value={typFilter}
              onChange={(e) => setTypFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            >
              {TYP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>

          <div className="md:col-span-3 flex items-end">
            <div className="w-full flex gap-2">
              <button
                type="submit"
                disabled={loading || !selectedStop}
                className="flex-1 rounded-xl bg-blue-600 text-white px-4 py-3 font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? `Počítám ${loadingSeconds}s` : 'Vyhledat'}
              </button>
              {loading && (
                <button
                  type="button"
                  onClick={cancelLoading}
                  className="rounded-xl border border-slate-300 bg-white text-slate-700 px-4 py-3 font-medium hover:bg-slate-50 transition-colors"
                >
                  Zrušit
                </button>
              )}
            </div>
          </div>
        </div>

        {loading && (
          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
            <p className="text-sm font-medium text-blue-800">
              {loadingStage(loadingSeconds)}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Požadavek běží {loadingSeconds}s. První výpočet může trvat déle kvůli načítání grafu.
            </p>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </form>

      {result && (
        <section className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                  Výsledek pro {result.input.maxMinutes} minut
                </h2>
                <p className="text-slate-600 text-sm mt-1">
                  Nalezeno <strong>{totalFound}</strong> škol v dojezdovém limitu.
                  Zobrazeno {result.reachableSchools.length} škol (strana {result.pagination.page} z {result.pagination.totalPages}).
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <p className="font-medium text-slate-700">Výchozí zastávka</p>
                <p className="text-slate-600 mt-1 break-words">{result.origin.stopName}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <p className="font-medium text-slate-700">Dosažitelné stanice</p>
                <p className="text-slate-600 mt-1">{result.diagnostics.reachableStopCount.toLocaleString('cs-CZ')}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <p className="font-medium text-slate-700">Model výpočtu</p>
                <p className="text-slate-600 mt-1">{result.diagnostics.model}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="px-5 py-4 md:px-6 border-b bg-slate-50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-800">
                  Školy v limitu seřazené podle času dojezdu
                </h3>
                <div className="flex items-center gap-2">
                  {selectableSimulatorIds.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAllForSimulator}
                      className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      {selectedSimulatorIds.length === selectableSimulatorIds.length ? 'Odznačit vše' : 'Označit vše'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={selectedSimulatorIds.length === 0}
                    onClick={openSelectedInSimulator}
                    className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                  >
                    Otevřít v Simulátoru ({selectedSimulatorIds.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop tabulka */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="text-center p-3">
                      <input
                        type="checkbox"
                        aria-label="Vybrat/odznačit vše"
                        checked={selectableSimulatorIds.length > 0 && selectedSimulatorIds.length === selectableSimulatorIds.length}
                        onChange={toggleSelectAllForSimulator}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="text-left p-3">#</th>
                    <th className="text-left p-3">Škola</th>
                    <th className="text-right p-3">Čas a trasa</th>
                    <th className="text-left p-3">Adresa</th>
                  </tr>
                </thead>
                <tbody>
                  {result.reachableSchools.map((school, index) => {
                    const cohort = timeCohort(school.estimatedMinutes);
                    const rowNum = index + 1 + ((result.pagination.page - 1) * result.pagination.pageSize);
                    const rideMin = Math.max(0, school.transitMinutes - school.waitMinutes);
                    return (
                      <tr key={school.redizo} className={`border-t ${admissionRowClass(school.admissionBand)}`}>
                        <td className="p-3 text-center align-top">
                          <input
                            type="checkbox"
                            aria-label={`Vybrat ${school.nazev} do simulátoru`}
                            checked={school.simulatorSchoolId ? selectedSimulatorIds.includes(school.simulatorSchoolId) : false}
                            disabled={!school.simulatorSchoolId}
                            onChange={() => toggleSimulatorSelection(school.simulatorSchoolId)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="p-3 text-slate-500 align-top">{rowNum}</td>
                        <td className="p-3 align-top">
                          <Link href={school.schoolUrl} className="font-medium text-slate-900 hover:text-blue-600 hover:underline">
                            {school.nazev}
                          </Link>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {school.typy.map((t) => (
                              <span key={t} className="inline-block text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">{typLabel(t)}</span>
                            ))}
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            {school.obory.join(', ')}
                          </p>
                          {typeof school.difficultyScore === 'number' && (
                            <p className="text-xs text-slate-600 mt-1">Náročnost: {school.difficultyScore.toFixed(1)}</p>
                          )}
                          {typeof school.minBodyMin === 'number' && (
                            <p className="text-xs text-slate-600 mt-1">Min. body: {school.minBodyMin}</p>
                          )}
                        </td>
                        <td className="p-3 text-right align-top">
                          <span className={`inline-block rounded-lg px-2.5 py-1 text-sm font-semibold ${cohort.badgeClass}`}>
                            {school.estimatedMinutes} min
                          </span>
                          <span className={`inline-block rounded-lg px-2 py-0.5 text-xs ml-1 ${transferBadgeClass(school.transfers)}`}>
                            {transferLabel(school.transfers)}
                          </span>
                          <p className="text-xs text-slate-500 mt-1">
                            jízda {rideMin} + čekání {school.waitMinutes} + chůze {school.walkMinutes}
                          </p>
                          {school.usedLines.length > 0 && (
                            <p className="text-xs text-blue-600 mt-1">
                              Linky: {linesLabel(school.usedLines)}
                            </p>
                          )}
                          <p className="text-xs text-slate-500 mt-0.5">
                            zastávka: {school.stopName}
                          </p>
                        </td>
                        <td className="p-3 text-sm text-slate-600 align-top">
                          <p>{school.adresa || '—'}</p>
                          <p className="text-xs text-slate-500 mt-1">{school.obec}{school.kraj ? `, ${school.kraj}` : ''}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobilní karty */}
            <div className="md:hidden divide-y">
              {result.reachableSchools.map((school, index) => {
                const cohort = timeCohort(school.estimatedMinutes);
                const rowNum = index + 1 + ((result.pagination.page - 1) * result.pagination.pageSize);
                const rideMin = Math.max(0, school.transitMinutes - school.waitMinutes);
                return (
                  <div key={school.redizo} className={`p-4 ${admissionRowClass(school.admissionBand)}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <input
                          type="checkbox"
                          aria-label={`Vybrat ${school.nazev} do simulátoru`}
                          checked={school.simulatorSchoolId ? selectedSimulatorIds.includes(school.simulatorSchoolId) : false}
                          disabled={!school.simulatorSchoolId}
                          onChange={() => toggleSimulatorSelection(school.simulatorSchoolId)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <Link href={school.schoolUrl} className="font-medium text-slate-900 hover:text-blue-600 hover:underline">
                          {rowNum}. {school.nazev}
                        </Link>
                      </div>
                      <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold ${cohort.badgeClass}`}>
                        {school.estimatedMinutes} min
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{school.adresa || school.obec}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {school.typy.map((t) => (
                        <span key={t} className="inline-block text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">{typLabel(t)}</span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{school.obory.join(', ')}</p>
                    {typeof school.difficultyScore === 'number' && (
                      <p className="text-xs text-slate-600 mt-1">Náročnost: {school.difficultyScore.toFixed(1)}</p>
                    )}
                    {typeof school.minBodyMin === 'number' && (
                      <p className="text-xs text-slate-600 mt-1">Min. body: {school.minBodyMin}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      <span className={`inline-block rounded px-1.5 py-0.5 mr-1 ${transferBadgeClass(school.transfers)}`}>
                        {transferLabel(school.transfers)}
                      </span>
                      jízda {rideMin} + čekání {school.waitMinutes} + chůze {school.walkMinutes} min
                    </p>
                    {school.usedLines.length > 0 && (
                      <p className="text-xs text-blue-600 mt-1">Linky: {linesLabel(school.usedLines)}</p>
                    )}
                    <p className="text-xs text-slate-500">zastávka: {school.stopName}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {result.pagination.totalPages > 1 && (
            <div className="bg-white rounded-2xl shadow-sm border p-4 md:p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-slate-600">
                  Strana <strong>{result.pagination.page}</strong> z <strong>{result.pagination.totalPages}</strong>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!result.pagination.hasPrev || loading}
                    onClick={() => goToPage(result.pagination.page - 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                  >
                    Předchozí
                  </button>
                  <button
                    type="button"
                    disabled={!result.pagination.hasNext || loading}
                    onClick={() => goToPage(result.pagination.page + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                  >
                    Další
                  </button>
                </div>
              </div>
            </div>
          )}

          <details className="bg-white rounded-2xl shadow-sm border p-5 md:p-6">
            <summary className="cursor-pointer font-semibold text-slate-800">
              Technická poznámka
            </summary>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>
                Výpočet používá transfer-aware Dijkstra shortest path na celostátním GTFS transit grafu
                s {result.diagnostics.reachableStopCount.toLocaleString('cs-CZ')} dosažitelnými stanicemi.
                Slouží jako rychlý shortlist, ne jako přesný jízdní řád.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                {result.diagnostics.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              {result.diagnostics.timingsMs && (
                <p className="text-xs text-slate-500">
                  Časy: {Object.entries(result.diagnostics.timingsMs).map(([k, v]) => `${k}=${v}ms`).join(', ')}
                </p>
              )}
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
