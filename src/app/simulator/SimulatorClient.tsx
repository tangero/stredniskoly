'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { normalizeSchoolKey } from '@/lib/school-key';
import { nazevNabidky } from '@/lib/obor-profil';
import { matchesSearchLocation, splitByCommute } from '@/lib/simulator-filter';
import { rankAdmissionOffers, rankingPages, type AdmissionContext } from '@/lib/admission-summary';
import { MAX_SELECTION, readSelection, selectionForShare, shareUrlFor } from '@/lib/simulator-state';
import { OfferComparisonTable, type ComparisonOffer } from '@/components/simulator/OfferComparisonTable';
import { SavedSelectionBar } from '@/components/simulator/SavedSelectionBar';

interface School {
  id: string;
  nazev: string;
  nazev_display?: string;
  slug: string;
  href?: string;
  obor: string;
  delka_studia?: number;
  zamereni?: string;
  obec: string;
  adresa?: string;
  ulice?: string;
  kraj: string;
  admission_context: AdmissionContext | null;
  demand: { first_priority: number | null; year: number; round: number; applications: number | null; capacity: number | null } | null;
  history: {
    year: number;
    round: number;
    source_valid_at: string | null;
    accepted: number | null;
    capacity: number | null;
    average: number | null;
    average_cj: number | null;
    average_ma: number | null;
  } | null;
}
interface SearchResponse {
  schools: School[];
  kraje: Array<{ kod: string; nazev: string }>;
  total: number;
  missingIds?: string[];
}
const button = 'min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-blue-600';
interface Stop { stopId: string; name: string; context?: string }
interface Estimate { programIds: string[]; minutes: number; walkMinutes: number; transfers: number; lines: string[]; stopName: string }
interface Transit { estimates: Estimate[]; mappedProgramIds: string[]; originName: string }
const STORAGE_KEY = 'prijimacky-vyber-2027';
const field = 'mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-blue-600';
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const countLabel = (n: number) => `${n} ${n === 1 ? 'obor' : n >= 2 && n <= 4 ? 'obory' : 'oborů'}`;

/** Prázdné pole znamená „nevím“, nikoli nula bodů. */
function readOwnScore(raw: string): number | null {
  if (!raw.trim()) return null;
  const number = Number(raw.replace(',', '.'));
  return Number.isFinite(number) && number >= 0 && number <= 50 ? number : null;
}

function toComparisonOffer(school: School, commuteMinutes: number | null): ComparisonOffer {
  const context = school.admission_context;
  return {
    id: school.id,
    slug: school.slug,
    href: school.href,
    name: school.nazev_display || school.nazev,
    program: nazevNabidky(school.obor, school.zamereni, school.delka_studia),
    place: school.adresa || school.ulice || school.obec,
    acceptedTotal: context ? context.average_accepted : school.history?.average ?? null,
    acceptedCzech: school.history?.average_cj ?? null,
    acceptedMaths: school.history?.average_ma ?? null,
    applications: school.demand?.applications ?? null,
    capacity: school.demand?.capacity ?? school.history?.capacity ?? null,
    commuteMinutes,
  };
}

export function SimulatorClient() {
  const params = useSearchParams();
  const showingSelection = params.get('vyber') === '1' || params.get('srovnani') === '1';
  // Uložený výběr je stav aplikace, nikoli obsah adresy: odkaz už celý výběr neunese.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ownCzech, setOwnCzech] = useState('');
  const [ownMaths, setOwnMaths] = useState('');
  const [onlySaved, setOnlySaved] = useState(false);
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [legacySaved, setLegacySaved] = useState<School[]>([]);
  const [catalog, setCatalog] = useState<SearchResponse | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [grade, setGrade] = useState('9');
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [stopQuery, setStopQuery] = useState('');
  const [stop, setStop] = useState<Stop | null>(null);
  const [suggestions, setSuggestions] = useState<Stop[]>([]);
  const [stopStatus, setStopStatus] = useState('');
  const [limit, setLimit] = useState(45);
  const [minuteInput, setMinuteInput] = useState('45');
  const [transitResult, setTransitResult] = useState<{ key: string; data: Transit } | null>(null);
  const [transitError, setTransitError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visible, setVisible] = useState(20);
  const [rankingPagination, setRankingPagination] = useState({ key: '', page: 1 });
  const [notice, setNotice] = useState('');
  const [storageStatus, setStorageStatus] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const routeKey = stop ? `${stop.stopId}:${limit}` : '';
  const transit = transitResult?.key === routeKey ? transitResult.data : null;

  function updateUrl(changes: Record<string, string | null>, replace = false) {
    const next = new URLSearchParams(window.location.search);
    for (const [key, val] of Object.entries(changes)) {
      if (val === null) next.delete(key); else next.set(key, val);
    }
    window.history[replace ? 'replaceState' : 'pushState'](null, '', `${window.location.pathname}?${next}`);
    setShareUrl('');
  }

  useEffect(() => {
    // Sdílený odkaz má přednost a přidá se k tomu, co už v zařízení je;
    // příjemce odkazu tak nepřijde o vlastní rozpracovaný výběr.
    let stored: string[] = [];
    try { stored = readSelection(localStorage.getItem(STORAGE_KEY)); }
    catch { setStorageStatus('Uložený výběr se z tohoto prohlížeče nepodařilo načíst.'); }
    const shared = readSelection(new URLSearchParams(window.location.search).get('skoly'));
    const merged = Array.from(new Set([...stored, ...shared])).slice(0, MAX_SELECTION);
    if (merged.length) setSelectedIds(merged);
    if (shared.length && shared.some(id => !stored.includes(id))) {
      setNotice('Obory ze sdíleného odkazu jsme přidali k tvému výběru.');
      writeStorage(merged);
    }
    // Adresa dál nenese výběr: odkaz už ho v úplnosti unést nemůže.
    if (new URLSearchParams(window.location.search).has('skoly')) {
      const next = new URLSearchParams(window.location.search);
      next.delete('skoly');
      const query = next.toString();
      window.history.replaceState(null, '', query ? `${window.location.pathname}?${query}` : window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/schools/search?simulatorCatalog=1', { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { if (!controller.signal.aborted) { setCatalog(data); setError(''); } })
      .catch(() => { if (!controller.signal.aborted) setError('Katalog se nepodařilo načíst.'); });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    if (stop || stopQuery.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/dostupnost/stop-suggest?q=${encodeURIComponent(stopQuery)}&limit=8`, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!controller.signal.aborted) { setSuggestions(data.suggestions); setStopStatus(data.suggestions.length ? '' : 'Žádná zastávka nenalezena. Zkus obec nebo jiný název.'); }
      } catch { if (!controller.signal.aborted) setStopStatus('Zastávky se nepodařilo načíst. Zkus zadání změnit.'); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [stopQuery, stop]);

  useEffect(() => {
    if (!stop) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/dostupnost', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stopId: stop.stopId, maxMinutes: limit, view: 'simulator' }), signal: controller.signal });
        if (!response.ok) throw new Error();
        const data: Transit = await response.json();
        if (!controller.signal.aborted) { setTransitResult({ key: routeKey, data }); setTransitError(''); }
      } catch { if (!controller.signal.aborted) setTransitError('Dojezd se nepodařilo vypočítat. Zkus to znovu nebo hledej bez dojezdu.'); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [stop, limit, routeKey, retry]);

  const catalogIndex = useMemo(() => new Map([...legacySaved, ...(catalog?.schools ?? [])].map(s => [normalizeSchoolKey(s.id), s])), [catalog, legacySaved]);
  useEffect(() => {
    if (!catalog) return;
    const keys = new Set(catalog.schools.map(s => normalizeSchoolKey(s.id)));
    const missing = selectedIds.filter(id => !keys.has(normalizeSchoolKey(id)));
    if (!missing.length) return;
    const controller = new AbortController();
    Promise.all(Array.from({ length: Math.ceil(missing.length / 100) }, (_, i) => {
      const params = new URLSearchParams({ ids: JSON.stringify(missing.slice(i * 100, (i + 1) * 100)) });
      return fetch(`/api/schools/search?${params}`, { signal: controller.signal }).then(r => {
        if (!r.ok) throw new Error('lookup');
        return r.json() as Promise<SearchResponse>;
      });
    })).then(parts => setLegacySaved(parts.flatMap(p => p.schools))).catch(error => {
      if (error.name !== 'AbortError') setNotice('Část staršího výběru se nepodařilo načíst. Uložené položky zůstávají zachované.');
    });
    return () => controller.abort();
  }, [catalog, selectedIds]);
  const savedKeys = useMemo(() => new Set(selectedIds.map(normalizeSchoolKey)), [selectedIds]);
  // Odkaz měříme podle hotové adresy, protože identifikátory mají různou délku.
  const shareableIds = useMemo(
    () => typeof window === 'undefined' ? selectedIds : selectionForShare(selectedIds, window.location.origin),
    [selectedIds],
  );
  const ownScore = useMemo(() => ({
    czech: readOwnScore(ownCzech),
    maths: readOwnScore(ownMaths),
  }), [ownCzech, ownMaths]);
  const estimates = useMemo(() => {
    const result = new Map<string, Estimate>();
    const duplicates = new Set<string>();
    for (const estimate of transit?.estimates ?? []) for (const id of estimate.programIds) {
      const key = normalizeSchoolKey(id);
      if (result.has(key)) duplicates.add(key); else result.set(key, estimate);
    }
    // Nejednoznačné místo výuky nemá zvolený nejkratší dojezd.
    for (const key of duplicates) result.delete(key);
    return { byId: result, duplicates };
  }, [transit]);
  const mapped = useMemo(() => new Set((transit?.mappedProgramIds ?? []).map(normalizeSchoolKey).filter(id => !estimates.duplicates.has(id))), [transit, estimates]);
  const availableSubjects = useMemo(() => Array.from(new Set(catalog?.schools.map(s => s.obor).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'cs')), [catalog]);
  const schoolPrograms = useMemo(() => {
    const index = new Map<string, School[]>();
    for (const school of catalog?.schools ?? []) {
      const key = school.id.split('_')[0];
      const programs = index.get(key) ?? [];
      programs.push(school); index.set(key, programs);
    }
    return index;
  }, [catalog]);
  const cities = useMemo(() => Array.from(new Set(catalog?.schools.map(s => s.obec.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'cs')), [catalog]);
  const filtered = useMemo(() => (catalog?.schools ?? []).filter(s => {
    const duration = grade === '5' ? 8 : grade === '7' ? 6 : null;
    if (duration ? s.delka_studia !== duration : grade === '9' && s.delka_studia !== 4 && s.delka_studia !== 5) return false;
    return matchesSearchLocation(s, { city, region, commute: !!stop }) && (!subjects.length || subjects.includes(s.obor)) &&
      (!query.trim() || normalize([s.obor, s.zamereni].join(' ')).includes(normalize(query.trim())));
  }), [catalog, grade, region, city, stop, subjects, query]);
  const rankingMode = !onlySaved && !stop && !city && !region && !subjects.length && !query.trim();
  const ranked = useMemo(() => rankAdmissionOffers(filtered), [filtered]);
  const rankingKey = JSON.stringify([grade, city, region, stop?.stopId, subjects, query, onlySaved]);
  const rankingPageCount = Math.ceil(ranked.length / 20);
  const rankingPage = Math.max(1, Math.min(rankingPagination.key === rankingKey ? rankingPagination.page : 1, rankingPageCount));
  // Změna podmínek zahodí starou stránku i při pozdějším návratu do žebříčku.
  if (rankingPagination.key !== rankingKey) setRankingPagination({ key: rankingKey, page: 1 });
  function goToRankingPage(page: number) {
    setRankingPagination({ key: rankingKey, page });
    document.getElementById('simulator-results')?.scrollIntoView({ block: 'start' });
  }
  const resultCandidates = onlySaved ? filtered.filter(s => savedKeys.has(normalizeSchoolKey(s.id))) : filtered;
  const groups = stop ? splitByCommute(resultCandidates, limit, s => estimates.byId.get(normalizeSchoolKey(s.id))?.minutes, s => mapped.has(normalizeSchoolKey(s.id))) : { within: resultCandidates, near: [], unknown: [] };
  const pending = !!stop && !transit;
  // Filtr „jen uložené“ platí nad výsledky hledání, nikoli místo nich.
  const shownOffers = onlySaved ? groups.within.filter(s => savedKeys.has(normalizeSchoolKey(s.id))) : groups.within;
  function comparison(offers: School[]) {
    return <OfferComparisonTable offers={offers.map(school => ({
      ...toComparisonOffer(school, estimates.byId.get(normalizeSchoolKey(school.id))?.minutes ?? null),
      otherOffers: (schoolPrograms.get(school.id.split('_')[0]) ?? []).filter(other => other.id !== school.id).map(other => toComparisonOffer(other, null)),
    }))} own={ownScore} savedIds={savedKeys} onToggleSave={toggle} view={view} />;
  }
  const savedItems = selectedIds.map(id => {
    const school = catalogIndex.get(normalizeSchoolKey(id));
    return { id, label: school ? `${school.obor} · ${school.nazev_display || school.nazev}` : 'Uložený obor se dohledává' };
  });

  function changeTime(raw: string) {
    setMinuteInput(raw);
    const number = Number(raw);
    if (raw.trim() && Number.isInteger(number) && number >= 5 && number <= 180) {
      setLimit(number); setVisible(20); setTransitError('');
    }
  }
  function writeStorage(ids: string[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); setStorageStatus('Uloženo v tomto prohlížeči.'); }
    catch { setStorageStatus('Uložení do prohlížeče selhalo. Výběr platí jen do zavření stránky; ulož si ho přes Sdílet.'); }
  }
  function saveIds(ids: string[]) {
    setSelectedIds(ids);
    setShareUrl('');
    writeStorage(ids);
  }
  function toggle(id: string) {
    const actualId = selectedIds.find(value => normalizeSchoolKey(value) === normalizeSchoolKey(id)) ?? id;
    const saved = selectedIds.includes(actualId);
    if (!saved && selectedIds.length >= MAX_SELECTION) {
      setNotice(`Výběr je zaplněný na ${MAX_SELECTION} oborů. Odeber některý, než přidáš další.`);
      return;
    }
    saveIds(saved ? selectedIds.filter(value => value !== actualId) : [...selectedIds, id]);
    setNotice(saved ? 'Obor odebrán z výběru.' : 'Obor přidán do výběru.');
  }
  async function share() {
    const url = shareUrlFor(shareableIds, window.location.origin);
    setShareUrl(url);
    const trimmed = selectedIds.length - shareableIds.length;
    const note = trimmed > 0 ? ` Odkaz nese ${shareableIds.length} z ${selectedIds.length} oborů; zbytek se do adresy nevejde.` : '';
    try { await navigator.clipboard.writeText(url); setNotice(`Odkaz zkopírován.${note}`); }
    catch { setNotice(`Odkaz označ a zkopíruj ručně.${note}`); }
  }
  const scoreControls = <>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm font-medium">Moje čeština
                <input className={`${field} w-28`} inputMode="decimal" value={ownCzech} onChange={e => setOwnCzech(e.target.value)} placeholder="z 50" aria-describedby="own-score-help" />
              </label>
              <label className="text-sm font-medium">Moje matematika
                <input className={`${field} w-28`} inputMode="decimal" value={ownMaths} onChange={e => setOwnMaths(e.target.value)} placeholder="z 50" aria-describedby="own-score-help" />
              </label>
            </div>
            <div className="flex gap-2" role="group" aria-label="Podoba výsledků">
              <button className={`${button} ${view === 'table' ? 'border-blue-500 bg-blue-50 text-blue-800' : ''}`} aria-pressed={view === 'table'} onClick={() => setView('table')}>Tabulka</button>
              <button className={`${button} ${view === 'cards' ? 'border-blue-500 bg-blue-50 text-blue-800' : ''}`} aria-pressed={view === 'cards'} onClick={() => setView('cards')}>Karty</button>
            </div>
          </div>
          <p id="own-score-help" className="mb-4 text-xs text-slate-600">
            Body zadej za každý test zvlášť, každý je na škále 0–50. Slouží jen k porovnání s průměry z roku 2026 v tomto prohlížeči;
            nikam se neodesílají a do sdíleného odkazu nepatří. Prázdné pole znamená „nevím“, nikoli nula.
          </p>
  </>;

  return <div className="mx-auto max-w-[1600px] px-4 py-6 sm:py-10">
    <nav aria-label="Hledání a výběr" className="mb-7 flex flex-wrap gap-2">
      <Link href="/#vyhledavani" className={button}>Hledat školu nebo město</Link>
      <button className={`${button} ${!showingSelection ? 'border-blue-500 text-blue-800' : ''}`} onClick={() => updateUrl({ vyber: null, srovnani: null })}>Simulátor</button>
      <button className={`${button} ${showingSelection ? 'border-blue-500 text-blue-800' : ''}`} onClick={() => updateUrl({ vyber: '1' })}>Můj výběr ({selectedIds.length})</button>
    </nav>
    <p role="status" className="text-sm text-slate-600">{notice} {storageStatus}</p>
    {showingSelection ? <section className="mt-3">
      <h1 className="text-3xl font-bold">Můj výběr 2027</h1><p className="mt-2 text-slate-600">Uložené obory jsou kandidáti. Tento seznam není přihláška.</p>
      {selectedIds.length > 0 && <div className="my-4"><p className="mb-3 text-sm text-slate-600">Výsledky oborů můžeš porovnat níže.</p><button className={button} onClick={share}>Sdílet výběr</button></div>}
      {!selectedIds.length && <p className="my-6">Zatím tu nic není. Přidej obor ze simulátoru.</p>}
      {scoreControls}
      {comparison(selectedIds.flatMap(id => { const school = catalogIndex.get(normalizeSchoolKey(id)); return school ? [school] : []; }))}
      {selectedIds.map(id => { const school = catalogIndex.get(normalizeSchoolKey(id)); return school ? null : <div key={id} className="my-4"><p>{!catalog && !error ? 'Načítám uložený obor…' : 'Uložený obor se nepodařilo jednoznačně dohledat. Výběr zůstal zachovaný.'}</p><button className={button} onClick={() => toggle(id)}>Odebrat nedohledaný obor</button></div>; })}
      {shareUrl && <label className="mt-4 block text-sm">Odkaz obsahuje jen výběr oborů a zobrazí ho každý, komu jej předáš. Zastávka ani dojezd se nesdílejí.<input className={field} value={shareUrl} readOnly onFocus={e => e.target.select()} /></label>}
    </section> : <>
      <p className="text-sm font-semibold text-blue-700">SIMULÁTOR 2027</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Které školy mi vyhovují?</h1>
      <p className="mt-3 text-slate-600">Zkus změnit obor nebo délku cesty. Uvidíš, jaké možnosti přibudou.</p>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Po které třídě hledáš">{[['9', 'Po 9. třídě'], ['7', 'Po 7. třídě'], ['5', 'Po 5. třídě'], ['all', 'Všechny typy']].map(([id, label]) => <button key={id} className={`${button} ${grade === id ? 'border-blue-500 bg-blue-50 text-blue-800' : ''}`} aria-pressed={grade === id} onClick={() => { setGrade(id); setVisible(20); }}>{label}</button>)}</div>
      <button className={`${button} mt-4 w-full lg:hidden`} aria-expanded={filtersOpen} aria-controls="simulator-filters" onClick={() => setFiltersOpen(!filtersOpen)}>Upravit podmínky · {stop ? `do ${limit} min` : 'bez dojezdu'} · {subjects.length ? countLabel(subjects.length) : 'všechny obory'}</button>
      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside id="simulator-filters" className={`${filtersOpen ? 'block' : 'hidden'} border-t-2 border-blue-600 pt-4 lg:block`}>
          <h2 className="text-lg font-semibold">Co je pro tebe důležité?</h2>
          <label className="mt-4 block text-sm font-medium">Co tě zajímá<select className={field} value="" onChange={e => { if (e.target.value) setSubjects([...subjects, e.target.value]); setVisible(20); }}><option value="">{subjects.length ? 'Přidat další obor…' : 'Všechny obory · vyber obor'}</option>{availableSubjects.filter(s => !subjects.includes(s)).map(s => <option key={s}>{s}</option>)}</select></label>
          {subjects.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{subjects.map(s => <button className={`${button} text-left text-blue-800`} key={s} aria-label={`Zrušit filtr ${s}`} onClick={() => { setSubjects(subjects.filter(value => value !== s)); setVisible(20); }}>{s} ×</button>)}</div>}
          <p className="mt-2 text-xs text-slate-500">Názvy z dostupného katalogu. Vybrané obory se kombinují jako alternativy.</p>
          <label className="mt-4 block text-sm font-medium">Upřesnit obor nebo zaměření<input className={field} value={query} onChange={e => { setQuery(e.target.value); setVisible(20); }} placeholder="Např. jazyky" /></label>
          <label className="mt-4 block text-sm font-medium">Kraj školy<select disabled={!!stop} className={`${field} disabled:bg-slate-100 disabled:text-slate-500`} value={region} onChange={e => { setRegion(e.target.value); setVisible(20); }}><option value="">Všechny kraje</option>{catalog?.kraje.map(kraj => <option key={kraj.kod}>{kraj.nazev}</option>)}</select></label>
          <label className="mt-4 block text-sm font-medium">Město nebo obec školy<select disabled={!!stop} className={`${field} disabled:bg-slate-100 disabled:text-slate-500`} value={city} onChange={e => { setCity(e.target.value); setVisible(20); }}><option value="">Všechna města a obce</option>{cities.map(name => <option key={name}>{name}</option>)}</select></label>
          {stop && <p className="mt-2 text-sm text-blue-800">Při hledání podle dojezdu město ani kraj škol neomezují výsledky. Po vypnutí dojezdu se tvé územní filtry znovu použijí.</p>}
          <label className="mt-5 block text-sm font-medium">Výchozí zastávka<input className={field} autoComplete="off" value={stopQuery} onChange={e => { setStopQuery(e.target.value); setStop(null); setSuggestions([]); setStopStatus(e.target.value.trim().length >= 2 ? 'Hledám zastávky…' : ''); setTransitError(''); }} placeholder="Zadej zastávku nebo obec" /></label>
          {!stop && suggestions.length > 0 && <ul className="mt-1 rounded-lg border border-slate-300 bg-white">{suggestions.map(item => <li key={item.stopId}><button className="min-h-11 w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-blue-50" onClick={() => { setStop(item); setStopQuery(item.name); setSuggestions([]); setStopStatus(''); setTransitError(''); setVisible(20); }}>{item.name}<span className="block text-xs text-slate-500">{item.context}</span></button></li>)}</ul>}
          <p role="status" className="mt-1 text-sm text-slate-600">{stopStatus}</p>
          {stop && <button className={`${button} mt-2`} onClick={() => { setStop(null); setStopQuery(''); setTransitError(''); }}>Hledat bez dojezdu</button>}
          <label className="mt-4 block text-sm font-medium" htmlFor="commute-minutes">Čas na cestu tam v MHD</label>
          <div className="flex items-center gap-2"><input id="commute-minutes" className={`${field} max-w-24`} type="number" min="5" max="180" step="1" value={minuteInput} onChange={e => changeTime(e.target.value)} onBlur={() => setMinuteInput(String(limit))} /><span className="text-sm">minut</span></div>
          <input aria-label="Nastavit čas na cestu tam v MHD" className="mt-3 min-h-11 w-full accent-blue-700" type="range" min="5" max="180" value={limit} onChange={e => changeTime(e.target.value)} />
          <div className="flex gap-2">{[30, 45, 60].map(n => <button key={n} className={`${button} flex-1 px-2`} onClick={() => changeTime(String(n))}>{n} min</button>)}</div>
          <p className="mt-3 text-xs leading-relaxed text-slate-600">{stop ? 'Odhad od vybrané zastávky včetně čekání a chůze ke škole. Cestu z domova na zastávku připočti. Zahrnuje dostupné vlaky a autobusy, nejen MHD. Pokrytí se liší podle regionu.' : 'Pro použití časového limitu vyber výchozí zastávku.'}</p>
        </aside>
        <section id="simulator-results" aria-label="Výsledky simulátoru" className="min-w-0 scroll-mt-4">
          <div className="mb-4 border-l-2 border-blue-500 pl-3 text-sm" role="status">
            <p className="font-semibold text-blue-900">{stop ? `Hledáš podle dojezdu: do ${limit} min ze zastávky ${stop.name}` : city ? `Hledáš školy v obci: ${city}` : region ? `Hledáš školy v kraji: ${region}` : rankingMode ? 'Žebříček škol podle výsledků JPZ 2026' : 'Hledáš školy v celé ČR'}</p>
            <p className="mt-1 text-slate-600">{stop ? 'Bez omezení městem nebo krajem. Zvolený typ studia a obory platí dál.' : rankingMode ? 'Vyber obor, město, kraj nebo dojezd a zobrazíme školy podle tvých podmínek.' : `Bez omezení dojezdem.${city && region ? ` Současně platí kraj: ${region}.` : ''}`}</p>
            {!stop && (city || region) && <button className="mt-2 min-h-11 text-blue-700 underline" onClick={() => { setCity(''); setRegion(''); setVisible(20); }}>Zrušit územní omezení</button>}
          </div>
          <p className="mb-4 text-xs text-slate-500">Nabídky doložené v 1. kole 2026, v rozsahu denních nezkrácených oborů s povinnou JPZ. Úplná nabídka a kritéria 2027 se doplňují.</p>
          <div className="mb-4">
            <SavedSelectionBar
              items={savedItems}
              storageStatus={storageStatus}
              onlySaved={onlySaved}
              onToggleOnlySaved={() => { setOnlySaved(!onlySaved); setVisible(20); }}
              onRemove={toggle}
              onShare={share}
              shareableCount={shareableIds.length}
            />
            {shareUrl && <label className="mt-3 block text-sm">Odkaz obsahuje jen uložené obory. Zadané body ani zastávka se nesdílejí.
              <input className={field} value={shareUrl} readOnly onFocus={e => e.target.select()} /></label>}
          </div>
          {scoreControls}
          {pending ? <div role="status"><p>{transitError || 'Počítám orientační dojezd…'}</p>{transitError && <button className={`${button} mt-3`} onClick={() => { setTransitError(''); setRetry(retry + 1); }}>Zkusit znovu</button>}</div> : <>
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold" aria-live="polite">{rankingMode ? `${countLabel(ranked.length)} s ověřeným průměrem` : countLabel(groups.within.length)}{stop ? ` do ${limit} min` : ''}</h2><span className="text-xs text-slate-500">{stop ? 'Podle odhadu dojezdu' : rankingMode ? 'Průměr JPZ přijatých · od nejvyššího' : 'Podle názvu školy'}</span></div>
            {!!groups.near.length && <div className="my-5 border-l-4 border-amber-500 bg-amber-50 p-4"><h3 className="font-semibold">Ještě {countLabel(groups.near.length)} těsně za limitem</h3><p className="mt-1 text-sm">Nejbližší je o {(estimates.byId.get(normalizeSchoolKey(groups.near[0].id))?.minutes ?? limit) - limit} min dál. Tvůj limit zůstává {limit} min.</p><div className="mt-3 flex flex-wrap gap-2"><a href="#near-schools" className={button}>Prohlédnout další obory</a>{limit < 180 && <button className={button} onClick={() => changeTime(String(Math.min(180, estimates.byId.get(normalizeSchoolKey(groups.near[groups.near.length - 1].id))?.minutes ?? limit + 10)))}>Zvýšit limit na {Math.min(180, estimates.byId.get(normalizeSchoolKey(groups.near[groups.near.length - 1].id))?.minutes ?? limit + 10)} min</button>}</div></div>}
            {catalog && !groups.within.length && <p className="my-5">V zadaných podmínkách není žádný obor. Zkus rozšířit čas, změnit kraj nebo zrušit některý filtr.</p>}
            {rankingMode && <p className="mt-2 text-sm text-slate-600">Pořadí se týká jednotlivých oborů ve zvolené skupině studia. Výsledky přijatých nejsou hodnocením kvality školy ani šancí na přijetí.</p>}
            {rankingMode ? <>
              <p className="mt-3 text-sm text-slate-500">{ranked.length ? `Zobrazeno ${(rankingPage - 1) * 20 + 1}–${Math.min(rankingPage * 20, ranked.length)} z ${ranked.length} oborů` : 'Pro tuto skupinu zatím nemáme ověřené průměry.'}</p>
              {comparison(ranked.slice((rankingPage - 1) * 20, rankingPage * 20))}
              {rankingPageCount > 1 && <nav aria-label="Stránkování žebříčku" className="my-6 flex flex-wrap items-center gap-2">
                <p className="w-full text-sm text-slate-600">Stránka {rankingPage} z {rankingPageCount}</p>
                <button className={button} disabled={rankingPage === 1} onClick={() => goToRankingPage(rankingPage - 1)}>Předchozí</button>
                {rankingPages(rankingPage, rankingPageCount).map((page, index) => typeof page === 'number' ? <button key={page} className={`${button} ${page === rankingPage ? 'border-blue-600 bg-blue-50 text-blue-800' : ''}`} aria-label={`Stránka ${page}`} aria-current={page === rankingPage ? 'page' : undefined} onClick={() => goToRankingPage(page)}>{page}</button> : <span key={`gap-${index}`} className="px-1">{page}</span>)}
                <button className={button} disabled={rankingPage === rankingPageCount} onClick={() => goToRankingPage(rankingPage + 1)}>Další</button>
              </nav>}
            </> : comparison(shownOffers.slice(0, visible))}
            {!rankingMode && shownOffers.length > visible && <button className={`${button} my-4`} onClick={() => setVisible(visible + 20)}>Dalších 20 oborů</button>}
            {!!groups.near.length && <section id="near-schools" className="mt-8 scroll-mt-8"><h2 className="text-xl font-semibold">Těsně za limitem</h2><p className="mt-1 text-sm text-slate-600">Nejvýš o 10 minut dál, ostatní filtry platí.</p>{comparison(groups.near.slice(0, visible))}{groups.near.length > visible && <button className={`${button} mt-3`} onClick={() => setVisible(visible + 20)}>Další obory za limitem</button>}</section>}
            {!!groups.unknown.length && <details className="mt-8"><summary className="cursor-pointer font-semibold">Dojezd zatím neověřen ({groups.unknown.length})</summary><p className="mt-2 text-sm text-slate-600">Chybí jednoznačné přiřazení místa výuky k dopravním datům. Neznamená to, že škola není dostupná.</p>{comparison(groups.unknown.slice(0, visible))}{groups.unknown.length > visible && <button className={`${button} mt-3`} onClick={() => setVisible(visible + 20)}>Další obory bez ověřeného dojezdu</button>}</details>}
            {stop && <p className="mt-6 text-xs text-slate-500">Nenalezená cesta může znamenat překročení rozsahu i chybějící spoj v podkladech. Pro konkrétní den ověř spojení v jízdním řádu.</p>}
          </>}
        </section>
      </div>
    </>}
    {!catalog && !error && <p role="status" className="mt-5">Načítám katalog…</p>}
    {error && <div role="alert" className="mt-5"><p>{error}</p><button className={button} onClick={() => setRetry(retry + 1)}>Zkusit načíst katalog znovu</button></div>}
  </div>;
}
