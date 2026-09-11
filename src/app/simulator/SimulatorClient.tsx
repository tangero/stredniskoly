'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MISSING_COMPARISON } from '@/lib/historical-scores';
import { MAX_SELECTION, readScore, readSelection, sharedSimulatorParams } from '@/lib/simulator-state';

interface School {
  id: string;
  nazev: string;
  nazev_display?: string;
  slug: string;
  obor: string;
  delka_studia?: number;
  zamereni?: string;
  obec: string;
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

export function SimulatorClient() {
  const params = useSearchParams();
  const selectionKey = params.get('skoly') || '';
  const selectedIds = readSelection(selectionKey);
  const cj = readScore(params.get('cj'));
  const ma = readScore(params.get('ma'));
  const comparing = params.get('srovnani') === '1';
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
  const [duration, setDuration] = useState('');
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Record<string, School>>({});
  const [missing, setMissing] = useState<string[]>([]);
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [selectionError, setSelectionError] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const shareInput = useRef<HTMLInputElement>(null);

  function updateUrl(changes: Record<string, string | null>, replace = false) {
    const next = new URLSearchParams(window.location.search);
    for (const [key, val] of Object.entries(changes)) {
      if (val === null || val === '') next.delete(key); else next.set(key, val);
    }
    const url = `${window.location.pathname}${next.size ? `?${next}` : ''}`;
    window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
    setShareUrl('');
    setShareMessage('');
  }

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const filter = new URLSearchParams({ search: query, kraj: region, delkaStudia: duration, limit: '20', offset: String(offset) });
        const response = await fetch(`/api/schools/search?${filter}`, { signal: controller.signal });
        if (!response.ok) throw new Error('search');
        const data: SearchResponse = await response.json();
        if (!controller.signal.aborted) setSearch(data);
      } catch {
        if (!controller.signal.aborted) setError('Školy se nepodařilo načíst. Zkuste to znovu.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, region, duration, offset, retry]);

  useEffect(() => {
    const ids = readSelection(selectionKey);
    const controller = new AbortController();
    async function load() {
      setSelectionError('');
      setMissing([]);
      if (!ids.length) { setSelected({}); setSelectionLoading(false); return; }
      setSelectionLoading(true);
      try {
        const response = await fetch(`/api/schools/search?${new URLSearchParams({ ids: JSON.stringify(ids) })}`, { signal: controller.signal });
        if (!response.ok) throw new Error('selection');
        const data: SearchResponse = await response.json();
        if (!controller.signal.aborted) {
          setSelected(Object.fromEntries(data.schools.map(school => [school.id, school])));
          setMissing(data.missingIds || []);
        }
      } catch {
        if (!controller.signal.aborted) setSelectionError('Vybrané obory se nepodařilo načíst. Výběr v odkazu zůstal zachovaný.');
      } finally {
        if (!controller.signal.aborted) setSelectionLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [selectionKey, retry]);

  function toggle(school: School) {
    // Čteme současnou URL i při rychlém opakovaném kliknutí před dalším renderem.
    const ids = readSelection(new URLSearchParams(window.location.search).get('skoly'));
    if (!ids.includes(school.id) && ids.length >= MAX_SELECTION) return;
    const next = ids.includes(school.id) ? ids.filter(id => id !== school.id) : [...ids, school.id];
    setSelected(prev => ({ ...prev, [school.id]: school }));
    updateUrl({ skoly: JSON.stringify(next) });
  }
  function move(id: string, delta: number) {
    const next = readSelection(new URLSearchParams(window.location.search).get('skoly'));
    const from = next.indexOf(id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= next.length) return;
    [next[from], next[to]] = [next[to], next[from]];
    updateUrl({ skoly: JSON.stringify(next) });
  }
  async function share() {
    const url = `${window.location.origin}/simulator?${sharedSimulatorParams(new URLSearchParams(window.location.search))}`;
    setShareUrl(url);
    try { await navigator.clipboard.writeText(url); setShareMessage('Odkaz byl zkopírován.'); }
    catch { setShareMessage('Odkaz označte a zkopírujte ručně.'); }
  }

  return <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
    <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Simulátor: body a historická data</h1>
    <p className="mt-3 max-w-3xl text-slate-600">Najděte obory, které vás zajímají, a prohlédněte si výsledky přijatých. Historický průměr není minimem pro přijetí a neurčuje výsledek přijímacího řízení 2027.</p>

    <section aria-labelledby="scores-heading" className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
      <h2 id="scores-heading" className="text-xl font-semibold">Vaše cvičné body</h2>
      <p className="mt-1 text-sm text-slate-600">Volitelný záznam pro vás. Body nemění nabídku ani pořadí škol.</p>
      <div className="mt-4 flex flex-wrap items-end gap-5">
        {([['cj', 'Čeština', cj], ['ma', 'Matematika', ma]] as const).map(([key, label, score]) => <label key={key} className="block">
          <span className="mb-1 block text-sm font-medium">{label} (0–50)</span>
          <input type="number" min="0" max="50" step="0.5" value={score ?? ''} placeholder="Nezadáno"
            onChange={event => {
              const raw = event.target.value;
              if (raw === '' || readScore(raw) !== null) updateUrl({ [key]: raw }, true);
            }} className="min-h-11 w-36 rounded-lg border border-slate-300 px-3 py-2" />
        </label>)}
        <p className="py-2 text-lg font-semibold">Celkem: {cj !== null && ma !== null ? `${value(cj + ma)} / 100` : 'doplňte oba předměty'}</p>
      </div>
      <p className="mt-4 text-sm text-slate-600">{MISSING_COMPARISON}. Přijetí závisí na kritériích konkrétní školy a výsledcích uchazečů v daném roce.</p>
    </section>

    <section aria-labelledby="selection-heading" className="mt-6 rounded-xl border border-blue-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="selection-heading" className="text-xl font-semibold">Vybrané obory ({selectedIds.length})</h2>
        {selectedIds.length > 0 && <div className="flex flex-wrap gap-2">
          <button className={button} onClick={() => updateUrl({ srovnani: comparing ? null : '1' })} aria-pressed={comparing}>{comparing ? 'Skrýt srovnání' : 'Porovnat historii'}</button>
          <button className={button} onClick={share}>Sdílet odkaz</button>
        </div>}
      </div>
      <p className="mt-2 text-sm text-slate-600">Pořadí upravte podle toho, kam chcete chodit. Tento seznam není přihláška a nic neodesílá do DiPSy.</p>
      {!selectedIds.length && <p className="mt-4 text-slate-600">Přidejte obor z hledání níže. Výběr si můžete uchovat ve sdíleném odkazu.</p>}
      {selectedIds.length >= MAX_SELECTION && <p className="mt-3 text-sm">Výběr obsahuje limit {MAX_SELECTION} oborů. Pro přidání dalšího některý odeberte.</p>}
      {selectionLoading && <p role="status" className="mt-3 text-sm">Načítám vybrané obory…</p>}
      {selectionError && <div role="alert" className="mt-3"><p>{selectionError}</p><button className={`${button} mt-2`} onClick={() => setRetry(n => n + 1)}>Zkusit načíst výběr znovu</button></div>}
      <ol className={`mt-4 grid gap-3 ${comparing ? 'md:grid-cols-2' : ''}`}>
        {selectedIds.map((id, index) => {
          const school = selected[id];
          return <li key={id} className="min-w-0 rounded-lg border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-700">{index + 1}</span>
              <div className="min-w-0 flex-1">
                {school ? <><Link href={`/skola/${school.slug}`} className="font-semibold text-blue-700 underline decoration-blue-200 underline-offset-2">{school.nazev_display || school.nazev}</Link><p className="text-sm text-slate-600">{school.obor}{school.delka_studia ? ` · ${school.delka_studia}leté studium` : ''}{school.zamereni ? ` · ${school.zamereni}` : ''} · {school.obec}</p></> : <><p className="font-medium">{missing.includes(id) ? 'Obor se nepodařilo jednoznačně dohledat' : selectionError ? 'Údaje nejsou načtené' : 'Načítání oboru…'}</p><p className="break-all text-xs text-slate-500">{id}</p></>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={button} disabled={index === 0} onClick={() => move(id, -1)} aria-label={`Posunout obor ${index + 1} výš`}>↑ Výš</button>
              <button className={button} disabled={index === selectedIds.length - 1} onClick={() => move(id, 1)} aria-label={`Posunout obor ${index + 1} níž`}>↓ Níž</button>
              <button className={button} onClick={() => updateUrl({ skoly: JSON.stringify(readSelection(new URLSearchParams(window.location.search).get('skoly')).filter(item => item !== id)) })} aria-label={`Odebrat obor ${index + 1}`}>Odebrat</button>
            </div>
            {comparing && school && <HistoricalFacts school={school} />}
          </li>;
        })}
      </ol>
      {shareUrl && new URL(shareUrl).searchParams.toString() === sharedSimulatorParams(new URLSearchParams(params.toString())).toString() && <div className="mt-4 rounded-lg bg-blue-50 p-3">
        <p role="status" className="mb-2 text-sm">{shareMessage}</p>
        <label className="block text-sm">Odkaz obsahuje vybrané obory a zadané body. Uvidí je každý, komu ho předáte.
          <input ref={shareInput} readOnly value={shareUrl} onFocus={() => shareInput.current?.select()} className="mt-2 min-h-11 w-full rounded border border-blue-200 bg-white p-2" />
        </label>
      </div>}
    </section>

    <section aria-labelledby="search-heading" className="mt-8">
      <h2 id="search-heading" className="text-2xl font-semibold">Najít obor</h2>
      <p className="mt-2 text-sm text-slate-600">Hledání vychází z katalogu 2025 a připojuje jednoznačně spárované výsledky 2026. Není úplnou nabídkou pro rok 2027. Otevření oboru ověřte u školy.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium">Škola, obor nebo město<input value={query} onChange={e => { setQuery(e.target.value); setOffset(0); setLoading(true); }} placeholder="Např. gymnázium Brno" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3" /></label>
        <label className="text-sm font-medium">Kraj<select value={region} onChange={e => { setRegion(e.target.value); setOffset(0); setLoading(true); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="">Všechny kraje</option>{search?.kraje.map(kraj => <option key={kraj.kod} value={kraj.kod}>{kraj.nazev}</option>)}</select></label>
        <label className="text-sm font-medium">Délka studia<select value={duration} onChange={e => { setDuration(e.target.value); setOffset(0); setLoading(true); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="">Všechny délky</option><option value="4">Čtyřleté</option><option value="6">Šestileté</option><option value="8">Osmileté</option></select></label>
      </div>
      {loading ? <p role="status" className="mt-5">Načítám obory…</p> : error ? <div role="alert" className="mt-5"><p>{error}</p><button className={`${button} mt-2`} onClick={() => setRetry(n => n + 1)}>Zkusit načíst školy znovu</button></div> : <>
        <p role="status" className="my-4 text-sm text-slate-600">Nalezeno oborů: {search?.total ?? 0}. Seřazeno podle názvu školy.</p>
        {search?.total === 0 && <p className="rounded-xl bg-white p-5">Tomuto hledání neodpovídá žádný obor. Zkuste jiný název nebo rozšiřte filtry.</p>}
        <ul className="grid gap-4 md:grid-cols-2">
          {search?.schools.map(school => <li key={school.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
            <Link href={`/skola/${school.slug}`} className="font-semibold text-blue-700 underline decoration-blue-200 underline-offset-2">{school.nazev_display || school.nazev}</Link>
            <p className="mt-1 text-sm text-slate-700">{school.obor}{school.delka_studia ? ` · ${school.delka_studia}leté studium` : ''}{school.zamereni ? ` · ${school.zamereni}` : ''}</p>
            <p className="text-sm text-slate-500">{school.obec} · {school.kraj}</p>
            <HistoricalFacts school={school} />
            <button className={`${button} mt-4 w-full`} aria-pressed={selectedIds.includes(school.id)} disabled={!selectedIds.includes(school.id) && selectedIds.length >= MAX_SELECTION} onClick={() => toggle(school)}>{selectedIds.includes(school.id) ? 'Odebrat z výběru' : 'Přidat do výběru'}</button>
          </li>)}
        </ul>
        {search && search.total > 20 && <nav aria-label="Stránky výsledků" className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button className={button} disabled={offset === 0} onClick={() => { setOffset(n => Math.max(0, n - 20)); setLoading(true); }}>Předchozí</button>
          <span className="text-sm">{offset + 1}–{Math.min(offset + 20, search.total)} z {search.total}</span>
          <button className={button} disabled={offset + 20 >= search.total} onClick={() => { setOffset(n => n + 20); setLoading(true); }}>Další</button>
        </nav>}
      </>}
      <p className="mt-6 text-xs leading-relaxed text-slate-500">Výsledky uvádíme jako procentní skór CERMAT přepočtený na škálu 0–50 za předmět a 0–100 celkem. U upravených testů nejde o původní body. Pomlčka znamená chybějící údaj. Průměr není minimum ani doporučený cíl přípravy.</p>
    </section>
  </div>;
}
