'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

type ReachableSchool = {
  redizo: string;
  nazev: string;
  adresa: string;
  mestskaCast?: string | null;
  estimatedMinutes: number;
  mhdMinutes: number;
  walkOnlyMinutes: number;
  bestMode: 'walk' | 'mhd';
  distanceKm: number;
  source: 'cache' | 'street_stop_match' | 'geocoded' | 'district_centroid';
  originStop: string;
  schoolStop: string;
  originWalkMinutes: number;
  transitMinutes: number;
  transferMinutes: number;
  schoolWalkMinutes: number;
  routeType: 'direct' | 'transfer' | 'unknown';
  usedLines: string[];
  transferStop?: string;
  oboryPreview: string[];
  oboryCount: number;
  minBodyMin: number | null;
  indexPoptavkyAvg: number | null;
  schoolUrl: string;
  simulatorSchoolId: string | null;
};

type SearchResponse = {
  input: {
    address: string;
    maxMinutes: number;
  };
  origin: {
    lat: number;
    lon: number;
    displayName?: string;
  };
  nearbyStops: Array<{
    name: string;
    distanceMeters: number;
  }>;
  reachableSchools: ReachableSchool[];
  diagnostics: {
    totalSchools: number;
    resolvedSchools: number;
    unresolvedSchools: number;
    geocodedThisRequest: number;
    geocodeCandidates?: number;
    geocodeConcurrency?: number;
    model: string;
    timingsMs?: Record<string, number>;
    notes: string[];
  };
  sources: {
    pidStops: string;
    pidOpenDataInfo: string;
  };
};

function sourceLabel(source: ReachableSchool['source']): string {
  if (source === 'cache') return 'Přesná adresa';
  if (source === 'geocoded') return 'Geokódovaná adresa';
  if (source === 'street_stop_match') return 'Odhad dle názvu ulice/zastávky';
  return 'Odhad dle městské části';
}

function loadingStage(seconds: number): string {
  if (seconds < 2) return 'Načítám zastávky PID a data škol...';
  if (seconds < 5) return 'Geokóduji zadanou adresu a páruji školy k zastávkám...';
  if (seconds < 10) return 'Počítám odhad dojezdu pro všechny školy v Praze...';
  return 'Finalizuji seřazený seznam škol podle času cesty...';
}

function routeLabel(school: ReachableSchool): string {
  if (school.bestMode === 'walk') {
    return 'Nejrychlejší je pěšky';
  }

  if (school.usedLines.length === 0) {
    return 'MHD (linky nelze jednoznačně určit)';
  }

  if (school.routeType === 'direct') {
    return `Přímá linka: ${school.usedLines.join(', ')}`;
  }

  if (school.routeType === 'transfer') {
    const transfer = school.transferStop ? ` (přestup ${school.transferStop})` : '';
    return `Linky: ${school.usedLines.join(' → ')}${transfer}`;
  }

  return `MHD: ${school.usedLines.join(', ')}`;
}

export function PrahaDostupnostClient() {
  const [address, setAddress] = useState('');
  const [maxMinutes, setMaxMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [selectedSimulatorIds, setSelectedSimulatorIds] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const timeoutTriggeredRef = useRef(false);

  const totalFound = result?.reachableSchools.length ?? 0;

  const qualityPct = useMemo(() => {
    if (!result || result.diagnostics.totalSchools === 0) return 0;
    return Math.round((result.diagnostics.resolvedSchools / result.diagnostics.totalSchools) * 100);
  }, [result]);

  const selectableSimulatorIds = useMemo(() => {
    if (!result) return [];
    return result.reachableSchools
      .map((school) => school.simulatorSchoolId)
      .filter((id): id is string => Boolean(id));
  }, [result]);

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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    if (loading) return;

    const normalizedAddress = address.trim();
    if (!normalizedAddress) {
      setError('Zadejte prosím výchozí adresu v Praze.');
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    timeoutTriggeredRef.current = false;
    timeoutRef.current = window.setTimeout(() => {
      timeoutTriggeredRef.current = true;
      abortRef.current?.abort();
    }, 65000);

    setLoading(true);
    setLoadingSeconds(0);
    setError(null);

    try {
      const response = await fetch('/api/praha-dostupnost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: normalizedAddress,
          maxMinutes,
        }),
        signal: abortRef.current.signal,
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error ?? 'Nepodařilo se načíst data.');
        setResult(null);
        setSelectedSimulatorIds([]);
        return;
      }

      setResult(payload as SearchResponse);
      setSelectedSimulatorIds([]);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError(timeoutTriggeredRef.current
          ? 'Výpočet trval příliš dlouho a byl ukončen. Zkuste přesnější adresu.'
          : 'Výpočet byl zrušen.');
      } else {
        setError('Volání API selhalo. Zkuste to prosím za chvíli znovu.');
      }
      setResult(null);
      setSelectedSimulatorIds([]);
    } finally {
      abortRef.current = null;
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setLoading(false);
    }
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

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-sm border p-5 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <label className="md:col-span-7">
            <span className="block text-sm font-medium text-slate-700 mb-1">
              Výchozí adresa v Praze
            </span>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Např. Vinohradská 179, Praha 3"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </label>

          <label className="md:col-span-3">
            <span className="block text-sm font-medium text-slate-700 mb-1">
              Limit dojezdu (min)
            </span>
            <input
              type="number"
              min={5}
              max={180}
              value={maxMinutes}
              onChange={(e) => setMaxMinutes(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </label>

          <div className="md:col-span-2 flex items-end">
            <div className="w-full flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-indigo-600 text-white px-4 py-3 font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
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
          <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2">
            <p className="text-sm font-medium text-indigo-800">
              {loadingStage(loadingSeconds)}
            </p>
            <p className="text-xs text-indigo-700 mt-1">
              Požadavek běží {loadingSeconds}s. První výpočet může trvat déle kvůli geokódování škol.
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
                </p>
              </div>
              <div className="text-sm text-slate-600">
                Pokrytí adres: <strong>{qualityPct}%</strong>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <p className="font-medium text-slate-700">Vstupní adresa</p>
                <p className="text-slate-600 mt-1 break-words">
                  {result.origin.displayName || result.input.address}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <p className="font-medium text-slate-700">Nejbližší zastávky PID</p>
                <div className="mt-1 space-y-1">
                  {result.nearbyStops.slice(0, 3).map((stop) => (
                    <p key={stop.name} className="text-slate-600">
                      {stop.name} ({stop.distanceMeters} m)
                    </p>
                  ))}
                </div>
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
                    className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
                  >
                    Otevřít v Simulátoru ({selectedSimulatorIds.length})
                  </button>
                </div>
              </div>
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="text-center p-3">✓</th>
                    <th className="text-left p-3">#</th>
                    <th className="text-left p-3">Škola</th>
                    <th className="text-left p-3">Městská část</th>
                    <th className="text-right p-3">Čas</th>
                    <th className="text-left p-3">Trasa</th>
                    <th className="text-left p-3">Adresa</th>
                  </tr>
                </thead>
                <tbody>
                  {result.reachableSchools.map((school, index) => (
                    <tr key={`${school.redizo}-${school.adresa}`} className="border-t hover:bg-slate-50">
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Vybrat ${school.nazev} do simulátoru`}
                          checked={school.simulatorSchoolId ? selectedSimulatorIds.includes(school.simulatorSchoolId) : false}
                          disabled={!school.simulatorSchoolId}
                          onChange={() => toggleSimulatorSelection(school.simulatorSchoolId)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-3 text-slate-500">{index + 1}</td>
                      <td className="p-3">
                        <Link href={school.schoolUrl} className="font-medium text-slate-900 hover:text-indigo-600 hover:underline">
                          {school.nazev}
                        </Link>
                        <p className="text-xs text-slate-500 mt-1">
                          REDIZO {school.redizo} | {sourceLabel(school.source)}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {school.oboryPreview.join(', ')}
                          {school.oboryCount > school.oboryPreview.length ? ` +${school.oboryCount - school.oboryPreview.length}` : ''}
                        </p>
                      </td>
                      <td className="p-3 text-sm text-slate-600">{school.mestskaCast || 'Neuvedeno'}</td>
                      <td className="p-3 text-right">
                        <span className="inline-block rounded-lg px-2.5 py-1 text-sm font-semibold bg-indigo-100 text-indigo-700">
                          {school.estimatedMinutes.toFixed(1)} min
                        </span>
                        <p className="text-xs mt-1">
                          {school.bestMode === 'walk' ? (
                            <span className="text-emerald-700 font-medium">Pěšky nejrychleji</span>
                          ) : (
                            <span className="text-indigo-700 font-medium">Nejrychleji MHD</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">
                          pěšky {school.walkOnlyMinutes.toFixed(1)} | MHD {school.mhdMinutes.toFixed(1)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{school.distanceKm.toFixed(1)} km vzdušně</p>
                      </td>
                      <td className="p-3 text-sm text-slate-600">
                        <p>{routeLabel(school)}</p>
                        {school.bestMode === 'mhd' ? (
                          <>
                            <p className="text-xs text-slate-500 mt-1">{school.originStop} → {school.schoolStop}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              pěšky {school.originWalkMinutes.toFixed(1)} + MHD {school.transitMinutes.toFixed(1)} + přestupní čas {school.transferMinutes.toFixed(1)} + pěšky {school.schoolWalkMinutes.toFixed(1)}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-slate-500 mt-1">
                            MHD alternativa: {school.originStop} → {school.schoolStop} ({school.mhdMinutes.toFixed(1)} min)
                          </p>
                        )}
                      </td>
                      <td className="p-3 text-sm text-slate-600">{school.adresa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y">
              {result.reachableSchools.map((school, index) => (
                <div key={`${school.redizo}-${school.adresa}`} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <input
                        type="checkbox"
                        aria-label={`Vybrat ${school.nazev} do simulátoru`}
                        checked={school.simulatorSchoolId ? selectedSimulatorIds.includes(school.simulatorSchoolId) : false}
                        disabled={!school.simulatorSchoolId}
                        onChange={() => toggleSimulatorSelection(school.simulatorSchoolId)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <Link href={school.schoolUrl} className="font-medium text-slate-900 hover:text-indigo-600 hover:underline">
                      {index + 1}. {school.nazev}
                      </Link>
                    </div>
                    <span className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold bg-indigo-100 text-indigo-700">
                      {school.estimatedMinutes.toFixed(1)} min
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{school.adresa}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {routeLabel(school)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    pěšky {school.walkOnlyMinutes.toFixed(1)} | MHD {school.mhdMinutes.toFixed(1)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {sourceLabel(school.source)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <details className="bg-white rounded-2xl shadow-sm border p-5 md:p-6">
            <summary className="cursor-pointer font-semibold text-slate-800">
              Technická poznámka a kvalita výpočtu
            </summary>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>
                Odhad používá PID zastávky + geokódování adres škol a zadané adresy. Výpočet slouží jako rychlý shortlist,
                ne jako přesný jízdní řád.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                {result.diagnostics.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <p>
                Zdroj PID stop list:{' '}
                <a href={result.sources.pidStops} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                  {result.sources.pidStops}
                </a>
              </p>
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
