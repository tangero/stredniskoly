'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { normalizeSchoolKey } from '@/lib/school-key';
import { splitByCommute } from '@/lib/simulator-filter';
import { MISSING_COMPARISON } from '@/lib/historical-scores';
import { MAX_SELECTION, readSelection, sharedSimulatorParams } from '@/lib/simulator-state';

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
  return <div className="mt-3 space-y-2 text-sm">
    {history ? <>
      <p className="font-medium text-slate-700">{history.year} · {history.round}. kolo · přijatí uchazeči</p>
      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
        <div><dt className="text-slate-600">Průměr ČJ + MA</dt><dd className="font-semibold">{value(history.average)} / 100</dd></div>
        <div><dt className="text-slate-600">Přijatí / kapacita</dt><dd className="font-semibold">{value(history.accepted)} / {value(history.capacity)}</dd></div>
        <div><dt className="text-slate-600">Průměr ČJ</dt><dd>{value(history.average_cj)} / 50</dd></div>
        <div><dt className="text-slate-600">Průměr MA</dt><dd>{value(history.average_ma)} / 50</dd></div>
      </dl>
      <p className="text-xs text-slate-500"><a href={SOURCE} className="underline">Zdroj: CERMAT</a>{history.source_valid_at ? ` · platnost ${history.source_valid_at}` : ''}</p>
    </> : <p className="rounded-lg bg-slate-50 p-3 text-slate-600">Pro tento obor nemáme jednoznačně přiřazené výsledky 2026.</p>}
    <p className="text-slate-600"><strong>Osobní porovnání:</strong> {MISSING_COMPARISON}.</p>
  </div>;
}

interface Stop { stopId: string; name: string; context?: string }
interface Estimate { programIds: string[]; minutes: number; walkMinutes: number; transfers: number; lines: string[]; stopName: string }
interface Transit { estimates: Estimate[]; mappedProgramIds: string[]; originName: string }
const STORAGE_KEY = 'prijimacky-vyber-2027';
const field = 'mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-blue-600';
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const countLabel = (n: number) => `${n} ${n === 1 ? 'obor' : n >= 2 && n <= 4 ? 'obory' : 'oborů'}`;

export function SimulatorClient() {
  const params = useSearchParams();
  const selectionKey = params.get('skoly') || '';
  const selectedIds = readSelection(selectionKey);
  const showingSelection = params.get('vyber') === '1' || params.get('srovnani') === '1';
  const comparing = params.get('srovnani') === '1';
  const [catalog, setCatalog] = useState<SearchResponse | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [grade, setGrade] = useState('9');
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
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
    // URL má přednost; sdílený výběr nepřepíšeme obsahem zařízení.
    if (new URLSearchParams(window.location.search).has('skoly')) return;
    try {
      const ids = readSelection(localStorage.getItem(STORAGE_KEY));
      if (ids.length) {
        const next = new URLSearchParams(window.location.search);
        next.set('skoly', JSON.stringify(ids));
        window.history.replaceState(null, '', `${window.location.pathname}?${next}`);
      }
    } catch { /* Další pokus o uložení zobrazí chybu přímo u akce. */ }
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
  const filtered = useMemo(() => (catalog?.schools ?? []).filter(s => {
    const duration = grade === '5' ? 8 : grade === '7' ? 6 : null;
    if (duration ? s.delka_studia !== duration : grade === '9' && (s.delka_studia === 8 || s.delka_studia === 6)) return false;
    return (!region || s.kraj.trim() === region) && (!subjects.length || subjects.includes(s.obor)) &&
      (!query || normalize([s.nazev_display || s.nazev, s.obor, s.zamereni, s.obec].join(' ')).includes(normalize(query)));
  }), [catalog, grade, region, subjects, query]);
  const groups = stop ? splitByCommute(filtered, limit, s => estimates.byId.get(normalizeSchoolKey(s.id))?.minutes, s => mapped.has(normalizeSchoolKey(s.id))) : { within: filtered, near: [], unknown: [] };
  const pending = !!stop && !transit;

  function changeTime(raw: string) {
    setMinuteInput(raw);
    const number = Number(raw);
    if (raw.trim() && Number.isInteger(number) && number >= 5 && number <= 180) {
      setLimit(number); setVisible(20); setTransitError('');
    }
  }
  function saveIds(ids: string[]) {
    updateUrl({ skoly: JSON.stringify(ids) });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); setStorageStatus('Uloženo v tomto prohlížeči.'); }
    catch { setStorageStatus('Uložení do prohlížeče selhalo. Výběr zůstává v odkazu; zkopíruj si ho přes Sdílet.'); }
  }
  function toggle(id: string) {
    const ids = readSelection(new URLSearchParams(window.location.search).get('skoly'));
    if (!ids.includes(id) && ids.length >= MAX_SELECTION) { setNotice(`Můžeš uložit nejvýš ${MAX_SELECTION} oborů.`); return; }
    saveIds(ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]);
    setNotice(ids.includes(id) ? 'Obor odebrán z výběru.' : 'Obor přidán do výběru.');
  }
  async function share() {
    const shared = sharedSimulatorParams(new URLSearchParams(window.location.search));
    shared.delete('cj'); shared.delete('ma'); shared.set('vyber', '1');
    const url = `${window.location.origin}/simulator?${shared}`;
    setShareUrl(url);
    try { await navigator.clipboard.writeText(url); setNotice('Odkaz zkopírován.'); }
    catch { setNotice('Odkaz označ a zkopíruj ručně.'); }
  }
  function renderSchool(school: School, near = false, selection = false) {
    const estimate = transit ? estimates.byId.get(normalizeSchoolKey(school.id)) : undefined;
    const saved = selectedIds.some(id => normalizeSchoolKey(id) === normalizeSchoolKey(school.id));
    const selectedId = selectedIds.find(id => normalizeSchoolKey(id) === normalizeSchoolKey(school.id)) ?? school.id;
    return <article key={school.id} className="flex items-start justify-between gap-3 border-b border-slate-200 py-5">
      <div className="min-w-0 flex-1">
        <Link href={`/skola/${school.slug}`} className="text-lg font-semibold text-slate-900 hover:text-blue-700 hover:underline">{school.obor}</Link>
        <p className="mt-1 text-sm text-slate-600">{school.nazev_display || school.nazev} · {school.obec}{school.adresa || school.ulice ? ` · ${school.adresa || school.ulice}` : ''}</p>
        <p className="mt-1 text-sm text-slate-600">{school.delka_studia ? `${school.delka_studia}leté studium` : 'Délku studia ověř u školy'}{school.zamereni ? ` · ${school.zamereni}` : ''}</p>
        {stop && <p className="mt-3 font-medium text-blue-800">{estimate ? `Odhad ${estimate.minutes} min od zastávky` : pending ? 'Dojezd se načítá…' : 'Dojezd v tomto rozsahu není ověřen'}</p>}
        {near && estimate && <p className="mt-1 text-sm text-amber-800">O {estimate.minutes - limit} min nad tvým limitem</p>}
        <p className="mt-2 text-sm text-amber-800">Otevření oboru pro rok 2027 ověř u školy.</p>
        {estimate && <details className="mt-3 text-sm"><summary className="min-h-8 cursor-pointer text-blue-700">Podrobnosti odhadu cesty</summary><p>Ze zastávky {stop?.name} přes {estimate.stopName}; přestupy: {estimate.transfers}, chůze ke škole přibližně {estimate.walkMinutes} min. {estimate.lines.length ? `Linky v modelu: ${estimate.lines.join(', ')}.` : ''}</p><p className="mt-2 text-slate-600">Ranní profil zahrnuje odhad čekání. Není to konkrétní spojení; cestu z domova na výchozí zastávku nezahrnuje.</p></details>}
        {selection && comparing ? <HistoricalFacts school={school} /> : <details className="mt-3"><summary className="min-h-8 cursor-pointer text-sm text-blue-700">Přijímání a historické výsledky</summary><HistoricalFacts school={school} /><p className="mt-2 text-sm">Historický průměr není minimem ani předpovědí přijetí.</p></details>}
      </div>
      <button className={`${button} shrink-0 ${saved ? 'border-blue-400 bg-blue-50 text-blue-800' : ''}`} aria-pressed={saved} aria-label={`${saved ? 'Odebrat' : 'Uložit'} ${school.obor}, ${school.nazev}`} onClick={() => toggle(selectedId)}>{saved ? '✓ Uloženo' : '+ Uložit'}</button>
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
      {selectedIds.length > 0 && <div className="my-4 flex flex-wrap gap-2"><button className={button} onClick={() => updateUrl({ srovnani: comparing ? null : '1' })}>{comparing ? 'Skrýt porovnání historie' : 'Porovnat historii'}</button><button className={button} onClick={share}>Sdílet výběr</button></div>}
      {!selectedIds.length && <p className="my-6">Zatím tu nic není. Přidej obor ze simulátoru.</p>}
      {selectedIds.map(id => { const school = catalogIndex.get(normalizeSchoolKey(id)); return school ? renderSchool(school, false, true) : <div key={id} className="my-4"><p>{!catalog && !error ? 'Načítám uložený obor…' : 'Uložený obor se nepodařilo jednoznačně dohledat. Výběr zůstal zachovaný.'}</p><button className={button} onClick={() => toggle(id)}>Odebrat nedohledaný obor</button></div>; })}
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
          <label className="mt-4 block text-sm font-medium">Upřesnit obor nebo lokalitu<input className={field} value={query} onChange={e => { setQuery(e.target.value); setVisible(20); }} placeholder="Např. jazyky, Brno" /></label>
          <label className="mt-4 block text-sm font-medium">Kraj<select className={field} value={region} onChange={e => { setRegion(e.target.value); setVisible(20); }}><option value="">Všechny kraje</option>{catalog?.kraje.map(kraj => <option key={kraj.kod}>{kraj.nazev}</option>)}</select></label>
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
        <section aria-label="Výsledky simulátoru" className="min-w-0">
          <p className="mb-4 text-xs text-slate-500">Dostupný katalog 2025 s historií 2026. Úplná nabídka a kritéria 2027 se doplňují.</p>
          {pending ? <div role="status"><p>{transitError || 'Počítám orientační dojezd…'}</p>{transitError && <button className={`${button} mt-3`} onClick={() => { setTransitError(''); setRetry(retry + 1); }}>Zkusit znovu</button>}</div> : <>
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold" aria-live="polite">{countLabel(groups.within.length)}{stop ? ` do ${limit} min` : ''}</h2><span className="text-xs text-slate-500">{stop ? 'Podle odhadu dojezdu' : 'Podle názvu školy'}</span></div>
            {!!groups.near.length && <div className="my-5 border-l-4 border-amber-500 bg-amber-50 p-4"><h3 className="font-semibold">Ještě {countLabel(groups.near.length)} těsně za limitem</h3><p className="mt-1 text-sm">Nejbližší je o {(estimates.byId.get(normalizeSchoolKey(groups.near[0].id))?.minutes ?? limit) - limit} min dál. Tvůj limit zůstává {limit} min.</p><div className="mt-3 flex flex-wrap gap-2"><a href="#near-schools" className={button}>Prohlédnout další obory</a>{limit < 180 && <button className={button} onClick={() => changeTime(String(Math.min(180, estimates.byId.get(normalizeSchoolKey(groups.near[groups.near.length - 1].id))?.minutes ?? limit + 10)))}>Zvýšit limit na {Math.min(180, estimates.byId.get(normalizeSchoolKey(groups.near[groups.near.length - 1].id))?.minutes ?? limit + 10)} min</button>}</div></div>}
            {catalog && !groups.within.length && <p className="my-5">V zadaných podmínkách není žádný obor. Zkus rozšířit čas, změnit kraj nebo zrušit některý filtr.</p>}
            {groups.within.slice(0, visible).map(s => renderSchool(s))}
            {groups.within.length > visible && <button className={`${button} my-4`} onClick={() => setVisible(visible + 20)}>Dalších 20 oborů</button>}
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
