'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { normalizeSchoolKey } from '@/lib/school-key';
import { matchesSearchLocation, splitByCommute } from '@/lib/simulator-filter';
import { applicationsPerPlace, capacitySummary, rankAdmissionOffers, rankingPages, type AdmissionContext } from '@/lib/admission-summary';
import { MAX_SELECTION, readSelection, selectionForShare, shareUrlFor } from '@/lib/simulator-state';
import { OfferComparisonTable, type ComparisonOffer } from '@/components/simulator/OfferComparisonTable';
import { SavedSelectionBar } from '@/components/simulator/SavedSelectionBar';

interface School {
  id: string;
  nazev: string;
  nazev_display?: string;
  slug: string;
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
const SOURCE = 'https://data.cermat.cz/files/files/JPZ/agregovana_data_skoly/PZ2026_kolo1_skolobory_vysledky.xlsx';
const button = 'min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-blue-600';
const value = (number: number | null | undefined) => number == null ? '—' : number.toLocaleString('cs-CZ', { maximumFractionDigits: 2 });

function HistoricalFacts({ school }: { school: School }) {
  const history = school.history;
  const demand = school.demand;
  const ratio = applicationsPerPlace(demand?.applications, demand?.capacity);
  const context = school.admission_context;
  const summary = capacitySummary(context);
  if (!history && !demand) return <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">Výsledky a přihlášky 2026 se k této nabídce nepodařilo jednoznačně přiřadit. Neznamená to, že je obor snadnější nebo bez zájemců.</p>;
  return <section aria-label="Výsledky přijímání 2026" className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Přijímání 2026 · 1. kolo</p>
    <dl className="mt-3 grid grid-cols-2 gap-4 xl:grid-cols-4">
      <div><dt className="text-sm text-slate-600">Průměr JPZ přijatých</dt><dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value(context ? context.average_accepted : history?.average)}{(context ? context.average_accepted : history?.average) != null && <span className="ml-1 text-sm font-normal text-slate-600">/ 100 bodů</span>}</dd><p className="mt-1 text-xs text-slate-500">Čeština + matematika · {value(context?.tested_accepted)} konajících</p></div>
      <div><dt className="text-sm text-slate-600">Průměr JPZ všech konajících</dt><dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value(context?.average_all)}{context?.average_all != null && <span className="ml-1 text-sm font-normal text-slate-600">/ 100 bodů</span>}</dd><p className="mt-1 text-xs text-slate-500">Oba testy · {value(context?.tested_all)} konajících</p></div>
      <div><dt className="text-sm text-slate-600">Zájem o obor</dt><dd className="mt-1 text-2xl font-bold tabular-nums text-blue-800">{ratio === null ? '—' : ratio.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })}<span className="ml-1 text-sm font-normal text-slate-600">{ratio === null ? '' : 'přihlášek / místo'}</span></dd><p className="mt-1 text-xs text-slate-500">{demand ? `${value(demand.applications)} přihlášek · ${value(demand.capacity)} míst · ${value(demand.first_priority)} na 1. prioritě` : 'Počet přihlášek není ověřen'}</p></div>
      <div><dt className="text-sm text-slate-600">Přijato / kapacita</dt><dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value(context ? context.accepted : history?.accepted)}<span className="mx-1 font-normal text-slate-400">/</span>{value(demand?.capacity ?? history?.capacity)}</dd><p className="mt-1 text-xs text-slate-500">Výsledek prvního kola</p></div>
    </dl>
    {summary && <p className="mt-4 rounded-lg border border-blue-100 bg-white px-3 py-3 text-sm font-medium leading-relaxed text-slate-900">{summary}</p>}
    {context && <div className="mt-4">
      <p className="text-sm font-semibold text-slate-800">Jak dopadly ostatní přihlášky</p>
      <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {([['Přijati na preferovanější obor', context.higher_priority], ['Nepřijati kvůli nedostatku míst', context.capacity_rejected], ['Nesplnili podmínky přijetí', context.conditions_not_met], ['Vzdali se přijetí', context.withdrawn]] as const).map(([label, count]) => <div key={label} className="flex items-baseline justify-between gap-3"><dt className="text-slate-600">{label}</dt><dd className="font-semibold tabular-nums text-slate-900">{value(count)}</dd></div>)}
      </dl>
      {!context.outcomes_complete && <p className="mt-2 text-xs text-slate-600">Rozpad výsledků není úplný nebo nesouhlasí s počtem přihlášek. Souhrnný závěr proto neuvádíme.</p>}
    </div>}
    <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-600">Průměr není bodové minimum. Přihlášky zahrnují všechny priority; jejich počet na místo není osobní šance na přijetí.</p>
    {(!context || context.average_all === null || context.average_accepted === null) && <p className="mt-2 text-xs text-slate-600">Pomlčka znamená chybějící, nejednoznačně přiřazený nebo neověřený údaj, nikoli nulu.</p>}
    <details className="mt-2 text-xs text-slate-600"><summary className="min-h-8 cursor-pointer py-1 text-blue-700">Výsledky předmětů a zdroj</summary>
      <p className="mb-2">Průměry ČJ + MA se týkají konajících oba testy, nikoli všech přihlášek. Skór je přepočten na standardní škálu; u upravených testů nejde o původní body. Nesplnění podmínek nemusí znamenat slabý výsledek JPZ. Přijetí není údaj o skutečném nástupu ke studiu.</p>
      <p>Průměr přijatých: ČJ {value(history?.average_cj)} / 50 · MA {value(history?.average_ma)} / 50.</p>
      <p className="mt-1"><a href={SOURCE} className="underline">CERMAT · výsledky a přihlášky 2026</a>{history?.source_valid_at ? ` · platnost ${history.source_valid_at}` : ''}</p>
    </details>
  </section>;
}

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
    name: school.nazev_display || school.nazev,
    program: school.zamereni ? `${school.obor} · ${school.zamereni}` : school.obor,
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
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());
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

  const catalogIndex = useMemo(() => new Map(catalog?.schools.map(s => [normalizeSchoolKey(s.id), s]) ?? []), [catalog]);
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
    if (duration ? s.delka_studia !== duration : grade === '9' && (s.delka_studia === 8 || s.delka_studia === 6)) return false;
    return matchesSearchLocation(s, { city, region, commute: !!stop }) && (!subjects.length || subjects.includes(s.obor)) &&
      (!query.trim() || normalize([s.obor, s.zamereni].join(' ')).includes(normalize(query.trim())));
  }), [catalog, grade, region, city, stop, subjects, query]);
  const rankingMode = !stop && !city && !region && !subjects.length && !query.trim();
  const ranked = useMemo(() => rankAdmissionOffers(filtered), [filtered]);
  const rankingKey = JSON.stringify([grade, city, region, stop?.stopId, subjects, query]);
  const rankingPageCount = Math.ceil(ranked.length / 20);
  const rankingPage = Math.max(1, Math.min(rankingPagination.key === rankingKey ? rankingPagination.page : 1, rankingPageCount));
  // Změna podmínek zahodí starou stránku i při pozdějším návratu do žebříčku.
  if (rankingPagination.key !== rankingKey) setRankingPagination({ key: rankingKey, page: 1 });
  function goToRankingPage(page: number) {
    setRankingPagination({ key: rankingKey, page });
    document.getElementById('simulator-results')?.scrollIntoView({ block: 'start' });
  }
  const groups = stop ? splitByCommute(filtered, limit, s => estimates.byId.get(normalizeSchoolKey(s.id))?.minutes, s => mapped.has(normalizeSchoolKey(s.id))) : { within: filtered, near: [], unknown: [] };
  const pending = !!stop && !transit;
  // Filtr „jen uložené“ platí nad výsledky hledání, nikoli místo nich.
  const shownOffers = onlySaved ? groups.within.filter(s => savedKeys.has(normalizeSchoolKey(s.id))) : groups.within;
  const tableOffers = shownOffers.slice(0, visible).map(school =>
    toComparisonOffer(school, estimates.byId.get(normalizeSchoolKey(school.id))?.minutes ?? null));
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
    const saved = selectedIds.includes(id);
    if (!saved && selectedIds.length >= MAX_SELECTION) {
      setNotice(`Výběr je zaplněný na ${MAX_SELECTION} oborů. Odeber některý, než přidáš další.`);
      return;
    }
    saveIds(saved ? selectedIds.filter(value => value !== id) : [...selectedIds, id]);
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
  function renderSchool(school: School, near = false) {
    const estimate = transit ? estimates.byId.get(normalizeSchoolKey(school.id)) : undefined;
    const saved = selectedIds.some(id => normalizeSchoolKey(id) === normalizeSchoolKey(school.id));
    const selectedId = selectedIds.find(id => normalizeSchoolKey(id) === normalizeSchoolKey(school.id)) ?? school.id;
    const otherPrograms = (schoolPrograms.get(school.id.split('_')[0]) ?? []).filter(s => s.id !== school.id);
    return <article key={school.id} className="relative my-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 basis-64">
            <h3 className="text-xl font-bold leading-snug text-slate-900 sm:text-2xl"><Link href={`/skola/${school.slug}`} className="hover:text-blue-700 hover:underline">{school.nazev_display || school.nazev}</Link></h3>
            <p className="mt-2 text-lg font-semibold leading-snug text-blue-800"><Link href={`/skola/${school.slug}`} className="hover:underline">{school.obor}</Link></p>
            <p className="mt-1 text-sm font-medium text-slate-700">{school.delka_studia ? `${school.delka_studia}leté studium` : 'Délku studia ověř u školy'}{school.zamereni ? ` · ${school.zamereni}` : ''}</p>
            <p className="mt-2 text-sm text-slate-500">{school.adresa || school.ulice || school.obec}</p>
          </div>
          <button className={`${button} shrink-0 ${saved ? 'border-blue-400 bg-blue-50 text-blue-800' : ''}`} aria-pressed={saved} aria-label={`${saved ? 'Odebrat' : 'Uložit'} ${school.obor}, ${school.nazev}`} onClick={() => toggle(selectedId)}>{saved ? '✓ Uloženo' : '+ Uložit obor'}</button>
        </div>
        {stop && <p className="mt-3 font-medium text-blue-800">{estimate ? `Odhad ${estimate.minutes} min od zastávky` : pending ? 'Dojezd se načítá…' : 'Dojezd v tomto rozsahu není ověřen'}</p>}
        {near && estimate && <p className="mt-1 text-sm text-amber-800">O {estimate.minutes - limit} min nad tvým limitem</p>}
        <p className="mt-2 text-sm text-amber-800">Otevření oboru pro rok 2027 ověř u školy.</p>
        {estimate && <details className="mt-3 text-sm"><summary className="min-h-8 cursor-pointer text-blue-700">Podrobnosti odhadu cesty</summary><p>Ze zastávky {stop?.name} přes {estimate.stopName}; přestupy: {estimate.transfers}, chůze ke škole přibližně {estimate.walkMinutes} min. {estimate.lines.length ? `Linky v modelu: ${estimate.lines.join(', ')}.` : ''}</p><p className="mt-2 text-slate-600">Ranní profil zahrnuje odhad čekání. Není to konkrétní spojení; cestu z domova na výchozí zastávku nezahrnuje.</p></details>}
        <HistoricalFacts school={school} />
        {otherPrograms.length > 0 && <details className="mt-4 border-t border-slate-200 pt-3" onToggle={event => {
          const open = event.currentTarget.open;
          setExpandedSchools(previous => { const next = new Set(previous); if (open) next.add(school.id); else next.delete(school.id); return next; });
        }}>
          <summary className="min-h-11 cursor-pointer py-2 font-semibold text-blue-800">Další nabídky této školy v katalogu ({otherPrograms.length})</summary>
          <p className="mb-3 text-xs text-slate-600">Mohou mít jiné zaměření, délku studia i místo výuky. Zobrazujeme i nabídky mimo zvolené filtry.</p>
          {expandedSchools.has(school.id) && <ul className="divide-y divide-slate-200">{otherPrograms.map(other => {
            const otherId = selectedIds.find(id => normalizeSchoolKey(id) === normalizeSchoolKey(other.id));
            const matching = filtered.some(s => s.id === other.id);
            const trip = transit ? estimates.byId.get(normalizeSchoolKey(other.id)) : undefined;
            const ratio = applicationsPerPlace(other.demand?.applications, other.demand?.capacity);
            return <li key={other.id} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1 basis-52">
                <Link href={`/skola/${other.slug}`} className="font-semibold text-blue-800 hover:underline">{other.obor}{other.zamereni ? ` · ${other.zamereni}` : ''}</Link>
                <p className="mt-1 text-sm text-slate-600">{other.delka_studia ? `${other.delka_studia}leté studium · ` : ''}{other.adresa || other.ulice || other.obec}</p>
                {!matching && <p className="mt-1 text-xs font-medium text-amber-800">Mimo zvolené filtry oboru, typu studia nebo lokality</p>}
                {stop && <p className="mt-1 text-xs text-slate-600">{trip ? `Dojezd: odhad ${trip.minutes} min${trip.minutes > limit ? ' · nad tvým limitem' : ''}` : 'Dojezd v tomto rozsahu není ověřen'}</p>}
              </div><button className={button} aria-pressed={!!otherId} aria-label={`${otherId ? 'Odebrat' : 'Uložit'} další obor ${other.obor}, ${other.delka_studia} let, ${other.zamereni || other.obec}`} onClick={() => toggle(otherId || other.id)}>{otherId ? '✓ Uloženo' : '+ Uložit'}</button></div>
              <p className="mt-2 text-sm text-slate-700">2026 · průměr JPZ přijatých <strong>{value(other.admission_context ? other.admission_context.average_accepted : other.history?.average)} / 100</strong> · zájem <strong>{ratio === null ? 'neznámá' : `${ratio.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} přihlášek / místo`}</strong></p>
            </li>;
          })}</ul>}
        </details>}
      </div>
    </article>;
  }

  return <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
    <nav aria-label="Hledání a výběr" className="mb-7 flex flex-wrap gap-2">
      <Link href="/#vyhledavani" className={button}>Hledat školu nebo město</Link>
      <button className={`${button} ${!showingSelection ? 'border-blue-500 text-blue-800' : ''}`} onClick={() => updateUrl({ vyber: null, srovnani: null })}>Simulátor</button>
      <button className={`${button} ${showingSelection ? 'border-blue-500 text-blue-800' : ''}`} onClick={() => updateUrl({ vyber: '1' })}>Můj výběr ({selectedIds.length})</button>
    </nav>
    <p role="status" className="text-sm text-slate-600">{notice} {storageStatus}</p>
    {showingSelection ? <section className="mt-3">
      <h1 className="text-3xl font-bold">Můj výběr 2027</h1><p className="mt-2 text-slate-600">Uložené obory jsou kandidáti. Tento seznam není přihláška.</p>
      {selectedIds.length > 0 && <div className="my-4"><p className="mb-3 text-sm text-slate-600">Výsledky oborů můžeš porovnat přímo na kartách níže.</p><button className={button} onClick={share}>Sdílet výběr</button></div>}
      {!selectedIds.length && <p className="my-6">Zatím tu nic není. Přidej obor ze simulátoru.</p>}
      {selectedIds.map(id => { const school = catalogIndex.get(normalizeSchoolKey(id)); return school ? renderSchool(school) : <div key={id} className="my-4"><p>{!catalog && !error ? 'Načítám uložený obor…' : 'Uložený obor se nepodařilo jednoznačně dohledat. Výběr zůstal zachovaný.'}</p><button className={button} onClick={() => toggle(id)}>Odebrat nedohledaný obor</button></div>; })}
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
          <p className="mb-4 text-xs text-slate-500">Dostupný katalog 2025 s historií 2026. Úplná nabídka a kritéria 2027 se doplňují.</p>
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
            Body zadej za každý test zvlášť, každý je na škále 0–50. Slouží jen k porovnání s loňskými průměry v tomto prohlížeči;
            nikam se neodesílají a do sdíleného odkazu nepatří. Prázdné pole znamená „nevím“, nikoli nula.
          </p>
          {pending ? <div role="status"><p>{transitError || 'Počítám orientační dojezd…'}</p>{transitError && <button className={`${button} mt-3`} onClick={() => { setTransitError(''); setRetry(retry + 1); }}>Zkusit znovu</button>}</div> : <>
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold" aria-live="polite">{rankingMode ? `${countLabel(ranked.length)} s ověřeným průměrem` : countLabel(groups.within.length)}{stop ? ` do ${limit} min` : ''}</h2><span className="text-xs text-slate-500">{stop ? 'Podle odhadu dojezdu' : rankingMode ? 'Průměr JPZ přijatých · od nejvyššího' : 'Podle názvu školy'}</span></div>
            {!!groups.near.length && <div className="my-5 border-l-4 border-amber-500 bg-amber-50 p-4"><h3 className="font-semibold">Ještě {countLabel(groups.near.length)} těsně za limitem</h3><p className="mt-1 text-sm">Nejbližší je o {(estimates.byId.get(normalizeSchoolKey(groups.near[0].id))?.minutes ?? limit) - limit} min dál. Tvůj limit zůstává {limit} min.</p><div className="mt-3 flex flex-wrap gap-2"><a href="#near-schools" className={button}>Prohlédnout další obory</a>{limit < 180 && <button className={button} onClick={() => changeTime(String(Math.min(180, estimates.byId.get(normalizeSchoolKey(groups.near[groups.near.length - 1].id))?.minutes ?? limit + 10)))}>Zvýšit limit na {Math.min(180, estimates.byId.get(normalizeSchoolKey(groups.near[groups.near.length - 1].id))?.minutes ?? limit + 10)} min</button>}</div></div>}
            {catalog && !groups.within.length && <p className="my-5">V zadaných podmínkách není žádný obor. Zkus rozšířit čas, změnit kraj nebo zrušit některý filtr.</p>}
            {rankingMode && <p className="mt-2 text-sm text-slate-600">Pořadí se týká jednotlivých oborů ve zvolené skupině studia. Výsledky přijatých nejsou hodnocením kvality školy ani šancí na přijetí.</p>}
            {rankingMode ? <>
              <p className="mt-3 text-sm text-slate-500">{ranked.length ? `Zobrazeno ${(rankingPage - 1) * 20 + 1}–${Math.min(rankingPage * 20, ranked.length)} z ${ranked.length} oborů` : 'Pro tuto skupinu zatím nemáme ověřené průměry.'}</p>
              {ranked.slice((rankingPage - 1) * 20, rankingPage * 20).map((s, index) => <div key={s.id}><p className="mt-5 text-sm font-semibold text-blue-800">{(rankingPage - 1) * 20 + index + 1}. v žebříčku</p>{renderSchool(s)}</div>)}
              {rankingPageCount > 1 && <nav aria-label="Stránkování žebříčku" className="my-6 flex flex-wrap items-center gap-2">
                <p className="w-full text-sm text-slate-600">Stránka {rankingPage} z {rankingPageCount}</p>
                <button className={button} disabled={rankingPage === 1} onClick={() => goToRankingPage(rankingPage - 1)}>Předchozí</button>
                {rankingPages(rankingPage, rankingPageCount).map((page, index) => typeof page === 'number' ? <button key={page} className={`${button} ${page === rankingPage ? 'border-blue-600 bg-blue-50 text-blue-800' : ''}`} aria-label={`Stránka ${page}`} aria-current={page === rankingPage ? 'page' : undefined} onClick={() => goToRankingPage(page)}>{page}</button> : <span key={`gap-${index}`} className="px-1">{page}</span>)}
                <button className={button} disabled={rankingPage === rankingPageCount} onClick={() => goToRankingPage(rankingPage + 1)}>Další</button>
              </nav>}
            </> : view === 'table'
              ? <OfferComparisonTable offers={tableOffers} own={ownScore} savedIds={savedKeys} onToggleSave={toggle} />
              : groups.within.slice(0, visible).map(s => renderSchool(s))}
            {!rankingMode && view === 'cards' && groups.within.length > visible && <button className={`${button} my-4`} onClick={() => setVisible(visible + 20)}>Dalších 20 oborů</button>}
            {!rankingMode && view === 'table' && shownOffers.length > visible && <button className={`${button} my-4`} onClick={() => setVisible(visible + 20)}>Dalších 20 oborů</button>}
            {!!groups.near.length && <section id="near-schools" className="mt-8 scroll-mt-8"><h2 className="text-xl font-semibold">Těsně za limitem</h2><p className="mt-1 text-sm text-slate-600">Nejvýš o 10 minut dál, ostatní filtry platí.</p>{groups.near.slice(0, visible).map(s => renderSchool(s, true))}{groups.near.length > visible && <button className={`${button} mt-3`} onClick={() => setVisible(visible + 20)}>Další obory za limitem</button>}</section>}
            {!!groups.unknown.length && <details className="mt-8"><summary className="cursor-pointer font-semibold">Dojezd zatím neověřen ({groups.unknown.length})</summary><p className="mt-2 text-sm text-slate-600">Chybí jednoznačné přiřazení místa výuky k dopravním datům. Neznamená to, že škola není dostupná.</p>{groups.unknown.slice(0, visible).map(s => renderSchool(s))}{groups.unknown.length > visible && <button className={`${button} mt-3`} onClick={() => setVisible(visible + 20)}>Další obory bez ověřeného dojezdu</button>}</details>}
            {stop && <p className="mt-6 text-xs text-slate-500">Nenalezená cesta může znamenat překročení rozsahu i chybějící spoj v podkladech. Pro konkrétní den ověř spojení v jízdním řádu.</p>}
          </>}
        </section>
      </div>
    </>}
    {!catalog && !error && <p role="status" className="mt-5">Načítám katalog…</p>}
    {error && <div role="alert" className="mt-5"><p>{error}</p><button className={button} onClick={() => setRetry(retry + 1)}>Zkusit načíst katalog znovu</button></div>}
  </div>;
}
