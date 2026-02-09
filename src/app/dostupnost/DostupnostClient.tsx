'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

type SchoolProgram = {
  id: string;
  obor: string;
  zamereni: string;
  typ: string;
  delkaStudia: number;
  jpzMin: number | null;
  jpzPrumer: number | null;
  indexPoptavky: number | null;
  kapacita: number | null;
  prihlasky: number | null;
};

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
  programs: SchoolProgram[];
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
  context?: string;
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
  const start = bucket * 10;
  const end = start + 9;
  return { label: `${start}-${end} min`, badgeClass };
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

function jpzBadgeColor(jpzMin: number | null): string {
  if (jpzMin === null) return 'bg-slate-100 text-slate-600';
  if (jpzMin >= 70) return 'bg-red-100 text-red-800';
  if (jpzMin >= 50) return 'bg-amber-100 text-amber-800';
  if (jpzMin >= 30) return 'bg-green-100 text-green-800';
  return 'bg-emerald-100 text-emerald-800';
}

function konkurenceLabel(index: number | null): { text: string; color: string } {
  if (index === null) return { text: '—', color: 'text-slate-500' };
  if (index >= 3) return { text: `${index.toFixed(1)}×`, color: 'text-red-600' };
  if (index >= 2) return { text: `${index.toFixed(1)}×`, color: 'text-orange-600' };
  if (index >= 1.5) return { text: `${index.toFixed(1)}×`, color: 'text-yellow-600' };
  return { text: `${index.toFixed(1)}×`, color: 'text-green-600' };
}

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

export function DostupnostClient() {
  const [stopQuery, setStopQuery] = useState('');
  const [selectedStop, setSelectedStop] = useState<StopSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<StopSuggestion[]>([]);
  const [suggestionsTotal, setSuggestionsTotal] = useState(0);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [maxMinutes, setMaxMinutes] = useState(60);
  const [maxMinutesInput, setMaxMinutesInput] = useState('60');
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
  const suggestionsListId = 'stop-suggestions-list';

  const totalFound = result?.pagination.totalItems ?? 0;

  const selectableSimulatorIds = useMemo(() => {
    if (!result) return [];
    return result.reachableSchools
      .map((school) => school.simulatorSchoolId)
      .filter((id): id is string => Boolean(id));
  }, [result]);

  useEffect(() => {
    if (!loading) { setLoadingSeconds(0); return; }
    const interval = window.setInterval(() => { setLoadingSeconds((v) => v + 1); }, 1000);
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
      setSuggestions([]); setSuggestionsTotal(0); setSuggestLoading(false); setShowDropdown(false);
      return;
    }
    let isCurrent = true;
    setSuggestLoading(true);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set('q', query); params.set('limit', '12');
        const response = await fetch(`/api/dostupnost/stop-suggest?${params.toString()}`, { signal: controller.signal });
        if (!isCurrent) return;
        if (!response.ok) { setSuggestLoading(false); setError('Nepodařilo se načíst zastávky. Zkuste to znovu.'); return; }
        const payload = await response.json() as { suggestions?: StopSuggestion[]; totalFound?: number };
        if (!isCurrent) return;
        const items = Array.isArray(payload.suggestions) ? payload.suggestions : [];
        setSuggestions(items); setSuggestionsTotal(payload.totalFound ?? items.length);
        setHighlightIndex(-1); setShowDropdown(items.length > 0); setSuggestLoading(false);
      } catch (err) { if (isCurrent && !(err instanceof Error && err.name === 'AbortError')) { setSuggestLoading(false); setError('Nepodařilo se načíst zastávky. Zkuste to znovu.'); } else if (isCurrent) { setSuggestLoading(false); } }
    }, 150);
    return () => { isCurrent = false; controller.abort(); window.clearTimeout(timer); };
  }, [stopQuery, selectedStop]);

  function cancelLoading() {
    abortRef.current?.abort(); abortRef.current = null;
    if (timeoutRef.current !== null) { window.clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    setLoading(false); setError('Výpočet byl zrušen.');
  }

  async function runSearch(params: { stopId: string; maxMinutes: number; typFilter: string; page: number; clearSelection: boolean }) {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    timeoutTriggeredRef.current = false;
    timeoutRef.current = window.setTimeout(() => { timeoutTriggeredRef.current = true; abortRef.current?.abort(); }, 120000);
    setLoading(true); setLoadingSeconds(0); setError(null);
    try {
      const response = await fetch('/api/dostupnost', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stopId: params.stopId, maxMinutes: params.maxMinutes, typFilter: params.typFilter, page: params.page }),
        signal: abortRef.current.signal,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? 'Nepodařilo se načíst data.'); setResult(null); if (params.clearSelection) setSelectedSimulatorIds([]); return;
      }
      const payload = await response.json();
      setResult(payload as SearchResponse);
      setLastSearch({ stopId: params.stopId, maxMinutes: params.maxMinutes, typFilter: params.typFilter });
      if (params.clearSelection) setSelectedSimulatorIds([]);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError(timeoutTriggeredRef.current ? 'Výpočet trval příliš dlouho a byl ukončen.' : 'Výpočet byl zrušen.');
      } else { setError('Volání API selhalo. Zkuste to prosím za chvíli znovu.'); }
      setResult(null); if (params.clearSelection) setSelectedSimulatorIds([]);
    } finally {
      abortRef.current = null;
      if (timeoutRef.current !== null) { window.clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      setLoading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    if (!selectedStop) { setError('Vyberte výchozí zastávku z nabídky.'); return; }
    await runSearch({ stopId: selectedStop.stopId, maxMinutes, typFilter, page: 1, clearSelection: true });
  }

  function selectSuggestion(suggestion: StopSuggestion) {
    setSelectedStop(suggestion); setStopQuery(suggestion.name);
    setSuggestions([]); setSuggestionsTotal(0); setShowDropdown(false); setHighlightIndex(-1);
  }

  function handleStopQueryChange(value: string) {
    setStopQuery(value);
    if (selectedStop && value !== selectedStop.name) setSelectedStop(null);
  }

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex((prev) => { const next = prev < suggestions.length - 1 ? prev + 1 : 0; scrollToItem(next); return next; }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex((prev) => { const next = prev > 0 ? prev - 1 : suggestions.length - 1; scrollToItem(next); return next; }); }
    else if (e.key === 'Enter' && highlightIndex >= 0) { e.preventDefault(); selectSuggestion(suggestions[highlightIndex]); }
    else if (e.key === 'Escape') { e.preventDefault(); setShowDropdown(false); setHighlightIndex(-1); }
  }, [showDropdown, suggestions, highlightIndex]);

  function scrollToItem(index: number) {
    requestAnimationFrame(() => {
      const container = listRef.current; if (!container) return;
      const item = container.children[index] as HTMLElement | undefined;
      if (item) item.scrollIntoView({ block: 'nearest' });
    });
  }

  function highlightMatch(text: string, query: string): React.ReactNode {
    if (!query.trim()) return text;
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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
      for (const nc of normalized) normChars.push(nc);
    }
    let origStart = -1, origEnd = -1;
    for (let i = 0; i < origChars.length; i++) {
      if (origToNormIndex[i] === matchStart && origStart === -1) origStart = i;
      if (origToNormIndex[i] < matchEnd) origEnd = i + 1;
    }
    if (origStart === -1 || origEnd === -1) return text;
    return <>{text.slice(0, origStart)}<strong className="text-blue-700">{text.slice(origStart, origEnd)}</strong>{text.slice(origEnd)}</>;
  }

  function toggleSimulatorSelection(simulatorSchoolId: string | null) {
    if (!simulatorSchoolId) return;
    setSelectedSimulatorIds((prev) => prev.includes(simulatorSchoolId) ? prev.filter((id) => id !== simulatorSchoolId) : [...prev, simulatorSchoolId]);
  }

  function toggleSelectAllForSimulator() {
    if (!result) return;
    if (selectedSimulatorIds.length === selectableSimulatorIds.length) setSelectedSimulatorIds([]);
    else setSelectedSimulatorIds(Array.from(new Set(selectableSimulatorIds)));
  }

  function openSelectedInSimulator() {
    const ids = Array.from(new Set(selectedSimulatorIds));
    if (ids.length === 0) return;
    const params = new URLSearchParams();
    params.set('skoly', ids.join(',')); params.set('srovnani', '1');
    window.open(`/simulator?${params.toString()}`, '_blank', 'noopener,noreferrer');
  }

  async function goToPage(page: number) {
    if (!lastSearch || loading || page < 1) return;
    await runSearch({ stopId: lastSearch.stopId, maxMinutes: lastSearch.maxMinutes, typFilter: lastSearch.typFilter, page, clearSelection: false });
  }

  return (
    <div className="space-y-6">
      {/* Upozornění na dostupnost dat */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 md:p-5">
        <div className="flex gap-3">
          <span className="text-amber-600 text-xl shrink-0">&#9888;</span>
          <div className="text-sm text-amber-900">
            <p className="font-semibold mb-1">Pokrytí MHD se liší podle regionu</p>
            <p>
              Data o jízdních řádech čerpáme z{' '}
              <a
                href="https://github.com/tangero/jizdni-rady-czech-republic/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline font-medium"
              >
                tangero/jizdni-rady-czech-republic
              </a>
              . Pokrytí městské dopravy není všude stejné, proto níže uvádíme
              aktuální výběr měst s největším pokrytím.
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer font-medium text-amber-800 hover:text-amber-900">
                Zobrazit města s MHD daty
              </summary>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-0.5 text-amber-800">
                <span>Praha</span>
                <span>Brno</span>
                <span>Ostrava</span>
                <span>Plzeň</span>
                <span>Ústí nad Labem</span>
                <span>Děčín</span>
                <span>Teplice</span>
                <span>Karlovy Vary</span>
                <span>Chomutov</span>
                <span>Příbram</span>
                <span>Kladno</span>
                <span>Zlín</span>
                <span>Klatovy</span>
                <span>Beroun</span>
                <span>Kutná Hora</span>
                <span>Hodonín</span>
                <span>Břeclav</span>
                <span>Znojmo</span>
                <span>Kroměříž</span>
                <span>Uherské Hradiště</span>
                <span>Uherský Brod</span>
                <span>Kralupy nad Vltavou</span>
                <span>Brandýs n. L. - Stará Boleslav</span>
                <span>Mělník</span>
                <span>Nymburk</span>
                <span>Kolín</span>
                <span>Mladá Boleslav</span>
                <span>Vsetín</span>
                <span>Varnsdorf</span>
                <span>Liberec</span>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Info panel */}
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

      {/* Search form */}
      <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-sm border p-5 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5 relative" ref={wrapperRef}>
            <label>
              <span className="block text-sm font-medium text-slate-700 mb-1">Výchozí zastávka</span>
              <input type="text" value={stopQuery} onChange={(e) => handleStopQueryChange(e.target.value)}
                onKeyDown={handleInputKeyDown} onFocus={() => { if (suggestions.length > 0 && !selectedStop) setShowDropdown(true); }}
                placeholder="Začněte psát název zastávky..." autoComplete="off" role="combobox" aria-expanded={showDropdown}
                aria-controls={suggestionsListId}
                aria-autocomplete="list" aria-activedescendant={highlightIndex >= 0 ? `stop-option-${highlightIndex}` : undefined}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none" />
            </label>
            {selectedStop && (
              <p className="text-xs text-emerald-700 mt-1">
                Vybrána: {selectedStop.name}
                {selectedStop.context ? ` (${selectedStop.context})` : ''}
              </p>
            )}
            {showDropdown && (
              <div id={suggestionsListId} className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto" role="listbox" ref={listRef}>
                {suggestLoading && suggestions.length === 0 && <div className="px-4 py-3 text-sm text-slate-500">Hledám...</div>}
                {suggestions.map((s, i) => (
                  <button key={s.stopId} id={`stop-option-${i}`} type="button" role="option" aria-selected={i === highlightIndex}
                    onClick={() => selectSuggestion(s)} onMouseEnter={() => setHighlightIndex(i)}
                    className={`w-full text-left px-4 py-2.5 text-sm text-slate-800 border-b border-slate-100 last:border-b-0 transition-colors ${i === highlightIndex ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <span className="block break-words whitespace-normal">{highlightMatch(s.name, stopQuery)}</span>
                    {s.context && (
                      <span className="block mt-0.5 text-xs text-slate-500 break-words whitespace-normal">
                        {s.context}
                      </span>
                    )}
                  </button>
                ))}
                {suggestionsTotal > suggestions.length && (
                  <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">Zobrazeno {suggestions.length} z {suggestionsTotal} výsledků</div>
                )}
              </div>
            )}
            {suggestLoading && !showDropdown && stopQuery.trim().length >= 2 && !selectedStop && <p className="text-xs text-slate-500 mt-1">Hledám zastávky...</p>}
          </div>

          <label className="md:col-span-2">
            <span className="block text-sm font-medium text-slate-700 mb-1">Max dojezd (min)</span>
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={maxMinutesInput}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '').replace(/^0+(\d)/, '$1');
                setMaxMinutesInput(raw);
                const n = parseInt(raw, 10);
                if (!isNaN(n)) setMaxMinutes(n);
              }}
              onBlur={() => {
                const n = Math.max(5, Math.min(180, maxMinutes || 60));
                setMaxMinutes(n);
                setMaxMinutesInput(String(n));
              }}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none" />
          </label>

          <label className="md:col-span-2">
            <span className="block text-sm font-medium text-slate-700 mb-1">Typ školy</span>
            <div className="relative">
              <select value={typFilter} onChange={(e) => setTypFilter(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none">
                {TYP_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          </label>

          <div className="md:col-span-3 flex items-end">
            <div className="w-full flex gap-2">
              <button type="submit" disabled={loading || !selectedStop}
                className="flex-1 rounded-xl bg-blue-600 text-white px-4 py-3 font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                {loading ? `Počítám ${loadingSeconds}s` : 'Vyhledat'}
              </button>
              {loading && (
                <button type="button" onClick={cancelLoading}
                  className="rounded-xl border border-slate-300 bg-white text-slate-700 px-4 py-3 font-medium hover:bg-slate-50 transition-colors">
                  Zrušit
                </button>
              )}
            </div>
          </div>
        </div>

        {loading && (
          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
            <p className="text-sm font-medium text-blue-800">{loadingStage(loadingSeconds)}</p>
            <p className="text-xs text-blue-700 mt-1">Požadavek běží {loadingSeconds}s. První výpočet může trvat déle kvůli načítání grafu.</p>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      </form>

      {/* Results */}
      {result && (
        <section className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">Výsledek pro {result.input.maxMinutes} minut</h2>
                <p className="text-slate-600 text-sm mt-1">
                  Nalezeno <strong>{totalFound}</strong> škol v dojezdovém limitu.
                  Zobrazeno {result.reachableSchools.length} škol (strana {result.pagination.page} z {result.pagination.totalPages}).
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectableSimulatorIds.length > 0 && (
                  <button type="button" onClick={toggleSelectAllForSimulator}
                    className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors">
                    {selectedSimulatorIds.length === selectableSimulatorIds.length ? 'Odznačit vše' : 'Označit vše'}
                  </button>
                )}
                <button type="button" disabled={selectedSimulatorIds.length === 0} onClick={openSelectedInSimulator}
                  className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors">
                  Otevřít v Simulátoru ({selectedSimulatorIds.length})
                </button>
              </div>
            </div>

            {/* Legenda */}
            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-medium text-slate-700">Legenda:</span>
                <span>Body prům = průměrné body JPZ (CJ+MA, max 100)</span>
                <span className="flex items-center gap-1">
                  <InfoTooltip title="Konkurence (Index poptávky)">
                    Poměr přihlášek ke kapacitě. Pod 1,5× = nízká, 1,5-3× = střední, nad 3× = vysoká konkurence.
                  </InfoTooltip>
                  Konkurence = přihlášky / kapacita
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-emerald-100" /> &lt;30
                  <span className="inline-block w-3 h-3 rounded bg-green-100 ml-1" /> 30-49
                  <span className="inline-block w-3 h-3 rounded bg-amber-100 ml-1" /> 50-69
                  <span className="inline-block w-3 h-3 rounded bg-red-100 ml-1" /> 70+ bodů
                </span>
              </div>
            </div>
          </div>

          {/* School cards */}
          <div className="space-y-4">
            {result.reachableSchools.map((school, index) => {
              const cohort = timeCohort(school.estimatedMinutes);
              const rowNum = index + 1 + ((result.pagination.page - 1) * result.pagination.pageSize);
              const rideMin = Math.max(0, school.transitMinutes - school.waitMinutes);
              const isSelected = school.simulatorSchoolId ? selectedSimulatorIds.includes(school.simulatorSchoolId) : false;

              return (
                <div key={school.redizo} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                  {/* Row 1: School name + address */}
                  <div className="p-4 md:p-5 pb-2 md:pb-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label={`Vybrat ${school.nazev} do simulátoru`}
                        checked={isSelected}
                        disabled={!school.simulatorSchoolId}
                        onChange={() => toggleSimulatorSelection(school.simulatorSchoolId)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-slate-400 text-sm font-medium">{rowNum}.</span>
                          <Link href={school.schoolUrl} className="font-semibold text-slate-900 hover:text-blue-600 hover:underline">
                            {school.nazev}
                          </Link>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">{school.adresa || school.obec}{school.kraj ? `, ${school.kraj}` : ''}</p>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Travel info - full width bar */}
                  <div className="mx-4 md:mx-5 mb-3 rounded-xl bg-slate-50 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                      <span className={`inline-flex items-center rounded-lg px-3 py-1 text-base font-bold ${cohort.badgeClass}`}>
                        {school.estimatedMinutes} min
                      </span>
                      <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-sm font-medium ${transferBadgeClass(school.transfers)}`}>
                        {transferLabel(school.transfers)}
                      </span>
                      <span className="text-sm text-slate-600">
                        jízda {rideMin} + čekání {school.waitMinutes} + chůze {school.walkMinutes}
                      </span>
                      {school.usedLines.length > 0 && (
                        <span className="text-sm font-medium text-blue-600">
                          Linky: {linesLabel(school.usedLines)}
                        </span>
                      )}
                      <span className="text-sm text-slate-600">
                        zastávka: {school.stopName}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Programs/fields with details */}
                  {school.programs.length > 0 && (
                    <div className="border-t border-slate-100">
                      {/* Desktop: table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                          <colgroup>
                            <col style={{ width: '40%' }} />
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '15%' }} />
                            <col style={{ width: '15%' }} />
                            <col style={{ width: '20%' }} />
                          </colgroup>
                          <thead className="bg-slate-50 text-slate-600">
                            <tr>
                              <th className="text-left px-4 py-2 font-medium">Obor / zaměření</th>
                              <th className="text-center px-3 py-2 font-medium">Délka</th>
                              <th className="text-center px-3 py-2 font-medium">Typ</th>
                              <th className="text-center px-3 py-2 font-medium">
                                Body prům
                                <InfoTooltip title="Průměrné body JPZ">
                                  Průměrný součet bodů z ČJ + MA všech přijatých. Max 100 bodů. Čím vyšší, tím náročnější škola.
                                </InfoTooltip>
                              </th>
                              <th className="text-center px-3 py-2 font-medium">
                                Konkurence
                                <InfoTooltip title="Index konkurence">
                                  Poměr přihlášek ke kapacitě. Nad 3× = vysoká konkurence.
                                </InfoTooltip>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {school.programs.map((prog, pi) => {
                              const konk = konkurenceLabel(prog.indexPoptavky);
                              return (
                                <tr key={pi} className="border-t border-slate-100 hover:bg-slate-50/50">
                                  <td className="px-4 py-2">
                                    <span className="text-slate-800">{prog.obor}</span>
                                    {prog.zamereni && <span className="text-slate-500 ml-1">— {prog.zamereni}</span>}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      {prog.delkaStudia}L
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span className="text-xs text-slate-600">{typLabel(prog.typ)}</span>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {prog.jpzPrumer !== null ? (
                                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${jpzBadgeColor(prog.jpzPrumer)}`}>
                                        {prog.jpzPrumer}
                                      </span>
                                    ) : <span className="text-slate-400">—</span>}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`font-semibold ${konk.color}`}>{konk.text}</span>
                                    {prog.kapacita !== null && (
                                      <span className="text-xs text-slate-400 ml-1">({prog.kapacita} míst)</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile: compact cards */}
                      <div className="md:hidden divide-y divide-slate-100">
                        {school.programs.map((prog, pi) => {
                          const konk = konkurenceLabel(prog.indexPoptavky);
                          return (
                            <div key={pi} className="px-4 py-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm text-slate-800 font-medium">
                                    {prog.obor}
                                    {prog.zamereni && <span className="text-slate-500 font-normal"> — {prog.zamereni}</span>}
                                  </p>
                                </div>
                                {prog.jpzPrumer !== null && (
                                  <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold ${jpzBadgeColor(prog.jpzPrumer)}`}>
                                    {prog.jpzPrumer}b
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 mt-1 text-xs">
                                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">{prog.delkaStudia}L</span>
                                <span className="text-slate-500">{typLabel(prog.typ)}</span>
                                <span className={`font-semibold ${konk.color}`}>{konk.text}</span>
                                {prog.kapacita !== null && <span className="text-slate-400">{prog.kapacita} míst</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {result.pagination.totalPages > 1 && (
            <div className="bg-white rounded-2xl shadow-sm border p-4 md:p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-slate-600">
                  Strana <strong>{result.pagination.page}</strong> z <strong>{result.pagination.totalPages}</strong>
                </p>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={!result.pagination.hasPrev || loading} onClick={() => goToPage(result.pagination.page - 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors">
                    Předchozí
                  </button>
                  <button type="button" disabled={!result.pagination.hasNext || loading} onClick={() => goToPage(result.pagination.page + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors">
                    Další
                  </button>
                </div>
              </div>
            </div>
          )}

          <details className="bg-white rounded-2xl shadow-sm border p-5 md:p-6">
            <summary className="cursor-pointer font-semibold text-slate-800">Technická poznámka</summary>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>
                Výpočet používá transfer-aware Dijkstra shortest path na celostátním GTFS transit grafu
                s {result.diagnostics.reachableStopCount.toLocaleString('cs-CZ')} dosažitelnými stanicemi.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                {result.diagnostics.notes.map((note) => <li key={note}>{note}</li>)}
              </ul>
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
