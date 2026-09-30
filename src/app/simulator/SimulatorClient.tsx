'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { normalizeSchoolKey } from '@/lib/school-key';
import { nazevNabidky } from '@/lib/obor-profil';
import { DRUHY_ZRIZOVATELE, matchesSearchLocation, matchesZrizovatel, splitByCommute, type DruhZrizovatele } from '@/lib/simulator-filter';
import type { AdmissionContext } from '@/lib/admission-summary';
import { MAX_SELECTION, readSelection, selectionForShare, shareUrlFor } from '@/lib/simulator-state';
import { SeznamNabidek, type NabidkaSimulatoru } from '@/components/simulator/SeznamNabidek';
import { hodnotaHranice, radekPasmaNabidky, nactiIndexPasem, polohaVuciPasmu, seradNabidky, type IndexPasem } from '@/lib/poloha-vuci-pasmu';
import { SavedSelectionBar } from '@/components/simulator/SavedSelectionBar';
import { StrategiePrihlasek } from '@/components/simulator/StrategiePrihlasek';
import { VyhradaNahore, VyhradySimulatoru, type TerminKriterii } from '@/components/simulator/VyhradySimulatoru';
import { navrhniPojistku, posunVPoradi, talentovaZPasem, type PravidlaPrihlasek } from '@/lib/strategie-prihlasek';
import { useZadaneTesty, ZadaniTestu } from '@/components/obor/ZadaniTestu';
import { TRIDA_TAU, type DruhTestu, type PrevodDruhu, type PrevodTestu } from '@/lib/prevod-testu-vypocet';

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
  zrizovatel?: string | null;
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

/** Druh testu podle toho, po které třídě uchazeč hledá; „všechny typy“ nemají jeden. */
const DRUH_PODLE_TRIDY: Record<string, DruhTestu | undefined> = { '9': '4', '7': '6', '5': '8' };

function prevodDruhu(prevod: PrevodTestu | null, druh: DruhTestu): PrevodDruhu | null {
  const terminy = prevod?.druhy[druh];
  return prevod && terminy ? { rok_testu: prevod.rok_testu, rok_cile: prevod.rok_cile, terminy } : null;
}

/** Popisek uloženého oboru, který v katalogu není: dohledávání běží, nebo skončilo bez výsledku. */
export function popisekNedohledaneho(stav: 'probiha' | 'hotovo' | 'selhalo'): string {
  if (stav === 'probiha') return 'Uložený obor se dohledává';
  if (stav === 'selhalo') return 'Uložený obor se nepodařilo načíst';
  return 'Uložený obor se už nenabízí nebo ho nenacházíme';
}

/** Jeden popisek oboru pro výběr i strategii, ať se tentýž obor nejmenuje na dvou místech jinak. */
function popisekOboru(school: School): string {
  const n = toNabidka(school);
  return `${n.program} · ${n.nazev}`;
}

function toNabidka(school: School): NabidkaSimulatoru {
  return {
    id: school.id,
    slug: school.slug,
    href: school.href,
    nazev: school.nazev_display || school.nazev,
    program: nazevNabidky(school.obor, school.zamereni, school.delka_studia),
    obec: school.obec,
    zamereni: school.zamereni || undefined,
  };
}

export interface SimulatorClientProps {
  /** Rok zobrazených pásem 1. kola z registru (sada cermat-uchazeci-kolo1). */
  rokPasem: number | null;
  /** Převodní tabulky testů TAU pro všechny druhy (sada cermat-prevod-testu). */
  prevod: PrevodTestu | null;
  /** Počet přihlášek z bloku pravidla v admissions-2027.json (sada msmt-harmonogram). */
  pravidla: PravidlaPrihlasek;
  /** Rok přepsaných kritérií (sada dipsy-kriteria). */
  rokKriterii: number | null;
  /** Kdy školy zveřejní kritéria nového řízení (harmonogram, ss-kriteria). */
  terminKriterii: TerminKriterii | null;
}

export function SimulatorClient({ rokPasem, prevod, pravidla, rokKriterii, terminKriterii }: SimulatorClientProps) {
  const params = useSearchParams();
  const showingSelection = params.get('vyber') === '1' || params.get('srovnani') === '1';
  // Uložený výběr je stav aplikace, nikoli obsah adresy: odkaz už celý výběr neunese.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [onlySaved, setOnlySaved] = useState(false);
  const [razeni, setRazeni] = useState<'dojezd' | 'hranice'>('dojezd');
  const [pasma, setPasma] = useState<IndexPasem | null>(null);
  const [pasmaChyba, setPasmaChyba] = useState('');
  const [legacySaved, setLegacySaved] = useState<School[]>([]);
  // Stav dohledání uložených oborů mimo aktuální katalog: po skončení (i neúspěšném) už „dohledává se“ neplatí.
  const [vysledekDohledani, setVysledekDohledani] = useState<{ klic: string; stav: 'hotovo' | 'selhalo' } | null>(null);
  const [catalog, setCatalog] = useState<SearchResponse | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [grade, setGrade] = useState('9');
  // Druh testu jen pro „všechny typy“; jinak ho určuje třída.
  const [druhVolba, setDruhVolba] = useState<DruhTestu>('4');
  const druh = DRUH_PODLE_TRIDY[grade] ?? druhVolba;
  const prevodVybraneho = useMemo(() => prevodDruhu(prevod, druh), [prevod, druh]);
  // Stejný klíč úložiště jako proužek na stránce oboru: co uchazeč zadal tam, platí i tady.
  const testy = useZadaneTesty({ druh, prevod: prevodVybraneho, rok: rokPasem ?? 0, pamatovat: rokPasem !== null });
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [zrizovatele, setZrizovatele] = useState<DruhZrizovatele[]>([]);
  const [stopQuery, setStopQuery] = useState('');
  const [stop, setStop] = useState<Stop | null>(null);
  const [suggestions, setSuggestions] = useState<Stop[]>([]);
  const [stopStatus, setStopStatus] = useState('');
  const [limit, setLimit] = useState(45);
  const [minuteInput, setMinuteInput] = useState('45');
  const [transitResult, setTransitResult] = useState<{ key: string; data: Transit } | null>(null);
  const [transitError, setTransitError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    // Index pásem jen s rokem z registru; body uchazeče neodcházejí na server.
    if (rokPasem === null) return;
    const controller = new AbortController();
    fetch(`/simulator_pasma_${rokPasem}.json`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { if (!controller.signal.aborted) { setPasma(nactiIndexPasem(data)); setPasmaChyba(''); } })
      .catch(() => { if (!controller.signal.aborted) setPasmaChyba('Výsledky 1. kola se nepodařilo načíst, obory proto neřadíme do skupin.'); });
    return () => controller.abort();
  }, [rokPasem, retry]);

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

  const klicePlatnych = useMemo(() => new Set((catalog?.schools ?? []).map(s => normalizeSchoolKey(s.id))), [catalog]);
  const catalogIndex = useMemo(() => new Map([...legacySaved, ...(catalog?.schools ?? [])].map(s => [normalizeSchoolKey(s.id), s])), [catalog, legacySaved]);
  useEffect(() => {
    if (!catalog) return;
    const keys = new Set(catalog.schools.map(s => normalizeSchoolKey(s.id)));
    const missing = selectedIds.filter(id => !keys.has(normalizeSchoolKey(id)));
    if (!missing.length) return;
    const klicDohledani = JSON.stringify(missing);
    const controller = new AbortController();
    Promise.all(Array.from({ length: Math.ceil(missing.length / 100) }, (_, i) => {
      const params = new URLSearchParams({ ids: JSON.stringify(missing.slice(i * 100, (i + 1) * 100)) });
      return fetch(`/api/schools/search?${params}`, { signal: controller.signal }).then(r => {
        if (!r.ok) throw new Error('lookup');
        return r.json() as Promise<SearchResponse>;
      });
    })).then(parts => { setLegacySaved(parts.flatMap(p => p.schools)); setVysledekDohledani({ klic: klicDohledani, stav: 'hotovo' }); }).catch(error => {
      if (error.name !== 'AbortError') {
        setVysledekDohledani({ klic: klicDohledani, stav: 'selhalo' });
        setNotice('Část staršího výběru se nepodařilo načíst. Uložené položky zůstávají zachované.');
      }
    });
    return () => controller.abort();
  }, [catalog, selectedIds]);
  // Stav dohledání patří k právě chybějícím oborům; po změně výběru se dohledává znovu.
  const chybejici = catalog ? selectedIds.filter(id => !catalog.schools.some(s => normalizeSchoolKey(s.id) === normalizeSchoolKey(id))) : selectedIds;
  const dohledani: 'probiha' | 'hotovo' | 'selhalo' = vysledekDohledani && vysledekDohledani.klic === JSON.stringify(chybejici)
    ? vysledekDohledani.stav : 'probiha';
  const savedKeys = useMemo(() => new Set(selectedIds.map(normalizeSchoolKey)), [selectedIds]);
  // Odkaz měříme podle hotové adresy, protože identifikátory mají různou délku.
  const shareableIds = useMemo(
    () => typeof window === 'undefined' ? selectedIds : selectionForShare(selectedIds, window.location.origin),
    [selectedIds],
  );
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
  const cities = useMemo(() => Array.from(new Set(catalog?.schools.map(s => s.obec.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'cs')), [catalog]);
  const filtered = useMemo(() => (catalog?.schools ?? []).filter(s => {
    const duration = grade === '5' ? 8 : grade === '7' ? 6 : null;
    if (duration ? s.delka_studia !== duration : grade === '9' && s.delka_studia !== 4 && s.delka_studia !== 5) return false;
    return matchesSearchLocation(s, { city, region, commute: !!stop }) && (!subjects.length || subjects.includes(s.obor)) &&
      matchesZrizovatel(s, zrizovatele) &&
      (!query.trim() || normalize([s.obor, s.zamereni].join(' ')).includes(normalize(query.trim())));
  }), [catalog, grade, region, city, stop, subjects, zrizovatele, query]);
  // Bez zastávky, obce i kraje se celá země neukazuje: 2 800 nabídek by nikomu nepomohlo.
  const needsPlace = !onlySaved && !stop && !city && !region;
  const resultCandidates = onlySaved ? filtered.filter(s => savedKeys.has(normalizeSchoolKey(s.id))) : filtered;
  const groups = stop ? splitByCommute(resultCandidates, limit, s => estimates.byId.get(normalizeSchoolKey(s.id))?.minutes, s => mapped.has(normalizeSchoolKey(s.id))) : { within: resultCandidates, near: [], unknown: [] };
  const pending = !!stop && !transit;
  // Filtr „jen uložené“ platí nad výsledky hledání, nikoli místo nich.
  const shownOffers = onlySaved ? groups.within.filter(s => savedKeys.has(normalizeSchoolKey(s.id))) : groups.within;
  const minPrijatych = pasma?.min_prijatych_pro_hranici ?? 10;
  // Pásmo jen pro nabídky aktuálního katalogu: u starších uložených nemáme doloženou shodu formy studia.
  const radekPasma = (n: { id: string }) => radekPasmaNabidky(n.id, klicePlatnych, normalizeSchoolKey, pasma?.data);
  const minutyDojezdu = (n: { id: string }) => estimates.byId.get(normalizeSchoolKey(n.id))?.minutes;
  // Při více testech rozhoduje nejhorší výsledek (rozhodnutí zadavatele 4).
  const bodySkupiny = testy.nejhorsi;
  const poloha = pasma && bodySkupiny !== null && rokPasem !== null
    ? (n: { id: string }) => polohaVuciPasmu(bodySkupiny, radekPasma(n), Number(druh), minPrijatych)
    : null;
  const poradiVyberu = new Map(selectedIds.map((id, i) => [normalizeSchoolKey(id), i]));
  function seznam(offers: School[], zpusob: 'dojezd' | 'hranice' = razeni, vyber = onlySaved) {
    // Mezi zvažovanými znamená výchozí řazení pořadí nastavené šipkami ve strategii.
    const podleVyberu = vyber && zpusob === 'dojezd';
    const serazene = seradNabidky(offers.map(toNabidka), zpusob, {
      minuty: minutyDojezdu, nazev: n => `${n.nazev} ${n.program}`, hranice: n => hodnotaHranice(radekPasma(n), minPrijatych),
      // V pohledu „jen zvažované“ platí pořadí nastavené šipkami ve strategii.
      poradiVyberu: podleVyberu ? n => poradiVyberu.get(normalizeSchoolKey(n.id)) : undefined,
    });
    return <SeznamNabidek
      nabidky={serazene} poloha={poloha} radek={radekPasma} minuty={minutyDojezdu}
      rok={rokPasem ?? 0} rokKriterii={pasma?.rok_kriterii ?? null} minPrijatych={minPrijatych}
      isSaved={id => savedKeys.has(normalizeSchoolKey(id))} onToggleSave={toggle}
    />;
  }
  const skupinaPodleId = (id: string) => poloha ? polohaVuciPasmu(bodySkupiny!, radekPasma({ id }), Number(druh), minPrijatych).skupina : null;
  // Nedohledaný obor zůstává ve výběru na svém místě, jinak by se ostatní posunuly a číslovaly špatně.
  // Druh zkoušky bereme z pásem; bez nich (nebo bez dohledaného oboru) ho neznáme a kontrola se pozastaví.
  const polozkyStrategie = selectedIds.map(id => {
    const school = catalogIndex.get(normalizeSchoolKey(id));
    if (!school) return { id, label: popisekNedohledaneho(dohledani), skupina: null, talentova: null };
    const n = toNabidka(school);
    return { id, label: popisekOboru(school), href: n.href ?? `/skola/${n.slug}`, skupina: skupinaPodleId(id), talentova: talentovaZPasem(pasma, radekPasma({ id })) };
  });
  const oboryZvazovanych = new Set(polozkyStrategie.flatMap(p => { const s = catalogIndex.get(normalizeSchoolKey(p.id)); return s ? [s.obor] : []; }));
  // Pojistku navrhujeme jen z hledání omezeného místem: obory z celé země nikomu nepomohou.
  const kandidatiPojistky = stop ? filtered.filter(s => (minutyDojezdu(s) ?? Infinity) <= limit) : city || region ? filtered : [];
  const navrhyPojistky = poloha ? navrhniPojistku(kandidatiPojistky, id => savedKeys.has(normalizeSchoolKey(id)), oboryZvazovanych, {
    skupina: s => skupinaPodleId(s.id), minuty: minutyDojezdu, nazev: s => s.nazev_display || s.nazev,
  }).map(s => { const n = toNabidka(s); return { id: s.id, label: `${n.program} · ${n.nazev}, ${n.obec}`, href: n.href ?? `/skola/${n.slug}` }; }) : [];
  function move(id: string, smer: -1 | 1) { saveIds(posunVPoradi(selectedIds, id, smer)); }
  const savedItems = selectedIds.map(id => {
    const school = catalogIndex.get(normalizeSchoolKey(id));
    return { id, label: school ? popisekOboru(school) : popisekNedohledaneho(dohledani) };
  });

  function changeTime(raw: string) {
    setMinuteInput(raw);
    const number = Number(raw);
    if (raw.trim() && Number.isInteger(number) && number >= 5 && number <= 180) {
      setLimit(number); setTransitError('');
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
    setNotice(saved ? 'Obor odebrán ze zvažovaných.' : 'Obor přidán mezi zvažované.');
  }
  async function share() {
    const url = shareUrlFor(shareableIds, window.location.origin);
    setShareUrl(url);
    const trimmed = selectedIds.length - shareableIds.length;
    const note = trimmed > 0 ? ` Odkaz nese ${shareableIds.length} z ${selectedIds.length} oborů; zbytek se do adresy nevejde.` : '';
    try { await navigator.clipboard.writeText(url); setNotice(`Odkaz zkopírován.${note}`); }
    catch { setNotice(`Odkaz označ a zkopíruj ručně.${note}`); }
  }
  const krok1 = rokPasem === null ? null : <section aria-labelledby="krok-1" className="mt-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
    <h2 id="krok-1" className="text-xl font-bold text-slate-900">1. Udělej si cvičný test</h2>
    <p className="mt-1 text-sm text-slate-600">
      Cvičný test, tedy test z minulých přijímaček v aplikaci CERMAT TAU. Jen u testů, které umíme převést,
      poznáš, kolik bodů by to bylo v roce {rokPasem}.
    </p>
    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Pro který test zadáváš výsledky">
      {(['4', '6', '8'] as DruhTestu[]).map(d => (
        <button key={d} type="button" className={`${button} ${druh === d ? 'border-blue-500 bg-blue-50 text-blue-800' : ''}`} aria-pressed={druh === d}
          onClick={() => { setDruhVolba(d); if (grade !== 'all') { setGrade(String(TRIDA_TAU[d])); } }}>
          Test pro {TRIDA_TAU[d]}. třídu
        </button>
      ))}
    </div>
    <p className="mt-2 text-sm text-slate-600">
      {druh === '4' ? 'Čtyřleté obory' : druh === '6' ? 'Šestiletá gymnázia' : 'Osmiletá gymnázia'} přijímají podle
      testu pro {TRIDA_TAU[druh]}. třídu. Hlásíš-li se i na jiný typ školy, přepni test a zadej jeho výsledek zvlášť;
      oba zůstanou uložené.
    </p>
    <div className="mt-3">
      <ZadaniTestu
        stav={testy} druh={druh} rok={rokPasem} prevodVstup={prevodVybraneho} pamatovat
        kdeJeVysledek="Ve výsledcích se počítá s" slouceni="nejhorsi"
        poznamkaUlozeni="Platí i pro proužek na stránkách oborů se stejným testem."
      />
    </div>
  </section>;
  const vyhrady = rokPasem === null ? null : <VyhradySimulatoru rokPasem={rokPasem} rokKriterii={rokKriterii} terminKriterii={terminKriterii} jinyTest={testy.nektereJiny} />;
  const razeniControls = (vyber = onlySaved) => <div className="mb-4 mt-4">
    {rokPasem !== null && <VyhradaNahore rokPasem={rokPasem} />}
    {bodySkupiny === null && rokPasem !== null && <p className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
      Zadej výsledek cvičného testu v kroku 1 a obory se rozdělí podle toho, jak by ses s ním dostal v 1. kole {rokPasem}.
    </p>}
    {pasmaChyba && <p className="mb-3 text-sm text-rose-700">{pasmaChyba}</p>}
    {bodySkupiny !== null && testy.platne.length > 1 && <p className="mb-3 text-sm text-slate-600">Máš víc testů; do skupin řadíme podle nejhoršího z nich.</p>}
    <label className="block text-sm font-medium">Seřadit
      <select className={`${field} sm:max-w-xs`} value={razeni} onChange={e => setRazeni(e.target.value === 'hranice' ? 'hranice' : 'dojezd')}>
        <option value="dojezd">{vyber ? 'podle tvého pořadí' : stop ? 'podle dojezdu' : 'podle názvu školy'}</option>
        <option value="hranice">od nejvyšší hranice přijetí</option>
      </select>
    </label>
    {razeni === 'hranice' && <p className="mt-2 max-w-2xl text-xs text-slate-600">
      Řadíme podle nejnižšího výsledku přijatých{rokPasem !== null ? ` v 1. kole ${rokPasem}` : ''}; obory s méně než {minPrijatych} přijatými jsou na konci.
      Těžší přijetí neznamená lepší školu: kvalitu ukazuje maturita a inspekce na stránce školy.
    </p>}
  </div>;

  return <div className="mx-auto max-w-[1600px] px-4 py-6 sm:py-10">
    <nav aria-label="Hledání a výběr" className="mb-7 flex flex-wrap gap-2">
      <Link href="/#vyhledavani" className={button}>Hledat školu nebo město</Link>
      <button className={`${button} ${!showingSelection ? 'border-blue-500 text-blue-800' : ''}`} onClick={() => updateUrl({ vyber: null, srovnani: null })}>Simulátor přijímaček</button>
      <button className={`${button} ${showingSelection ? 'border-blue-500 text-blue-800' : ''}`} onClick={() => updateUrl({ vyber: '1' })}>Zvažované obory ({selectedIds.length})</button>
    </nav>
    <p role="status" className="text-sm text-slate-600">{notice} {storageStatus}</p>
    {showingSelection ? <section className="mt-3">
      <h1 className="text-3xl font-bold">Zvažované obory</h1><p className="mt-2 text-slate-600">Zvažované obory, tedy obory uložené hvězdičkou, jen v tomto prohlížeči. Tento seznam není přihláška.</p>
      {selectedIds.length > 0 && <div className="my-4"><p className="mb-3 text-sm text-slate-600">Výsledky oborů můžeš porovnat níže.</p><button className={button} onClick={share}>Sdílet zvažované obory</button></div>}
      {!selectedIds.length && <p className="my-6">Zatím tu nic není. Přidej obor ze simulátoru.</p>}
      {krok1}
      {rokPasem !== null && <StrategiePrihlasek
        polozky={polozkyStrategie} pravidla={pravidla} rok={rokPasem}
        onMove={move} navrhyPojistky={navrhyPojistky} onAdd={toggle}
      />}
      {razeniControls(true)}
      {seznam(selectedIds.flatMap(id => { const school = catalogIndex.get(normalizeSchoolKey(id)); return school ? [school] : []; }), razeni, true)}
      {selectedIds.map(id => { const school = catalogIndex.get(normalizeSchoolKey(id)); return school ? null : <div key={id} className="my-4"><p>{!catalog && !error ? 'Načítám uložený obor…' : 'Uložený obor se nepodařilo jednoznačně dohledat. Výběr zůstal zachovaný.'}</p><button className={button} onClick={() => toggle(id)}>Odebrat nedohledaný obor</button></div>; })}
      {vyhrady}
      {shareUrl && <label className="mt-4 block text-sm">Odkaz obsahuje jen výběr oborů a zobrazí ho každý, komu jej předáš. Zastávka ani dojezd se nesdílejí.<input className={field} value={shareUrl} readOnly onFocus={e => e.target.select()} /></label>}
    </section> : <>
      <p className="text-sm font-semibold text-blue-700">SIMULÁTOR PŘIJÍMAČEK 2027</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Které školy mi vyhovují?</h1>
      <p className="mt-3 text-slate-600">Zkus změnit obor nebo délku cesty. Uvidíš, jaké možnosti přibudou.</p>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Po které třídě hledáš">{[['9', 'Po 9. třídě'], ['7', 'Po 7. třídě'], ['5', 'Po 5. třídě'], ['all', 'Všechny typy']].map(([id, label]) => <button key={id} className={`${button} ${grade === id ? 'border-blue-500 bg-blue-50 text-blue-800' : ''}`} aria-pressed={grade === id} onClick={() => { setGrade(id); }}>{label}</button>)}</div>
      {krok1}
      <button className={`${button} mt-4 w-full lg:hidden`} aria-expanded={filtersOpen} aria-controls="simulator-filters" onClick={() => setFiltersOpen(!filtersOpen)}>Upravit podmínky · {stop ? `do ${limit} min` : 'bez dojezdu'} · {subjects.length ? countLabel(subjects.length) : 'všechny obory'}</button>
      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside id="simulator-filters" className={`${filtersOpen ? 'block' : 'hidden'} border-t-2 border-blue-600 pt-4 lg:block`}>
          <h2 className="text-lg font-semibold">Co je pro tebe důležité?</h2>
          <label className="mt-4 block text-sm font-medium">Co tě zajímá<select className={field} value="" onChange={e => { if (e.target.value) setSubjects([...subjects, e.target.value]); }}><option value="">{subjects.length ? 'Přidat další obor…' : 'Všechny obory · vyber obor'}</option>{availableSubjects.filter(s => !subjects.includes(s)).map(s => <option key={s}>{s}</option>)}</select></label>
          {subjects.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{subjects.map(s => <button className={`${button} text-left text-blue-800`} key={s} aria-label={`Zrušit filtr ${s}`} onClick={() => { setSubjects(subjects.filter(value => value !== s)); }}>{s} ×</button>)}</div>}
          <p className="mt-2 text-xs text-slate-500">Názvy z dostupného katalogu. Vybrané obory se kombinují jako alternativy.</p>
          <label className="mt-4 block text-sm font-medium">Upřesnit obor nebo zaměření<input className={field} value={query} onChange={e => { setQuery(e.target.value); }} placeholder="Např. jazyky" /></label>
          <fieldset className="mt-4">
            <legend className="text-sm font-medium">Zřizovatel školy</legend>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">{DRUHY_ZRIZOVATELE.map(d => <label key={d.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-blue-700" checked={zrizovatele.includes(d.id)} onChange={e => { setZrizovatele(e.target.checked ? [...zrizovatele, d.id] : zrizovatele.filter(z => z !== d.id)); }} />{d.label}</label>)}</div>
            <p className="mt-1 text-xs text-slate-500">Zřizovatel je ten, kdo školu založil a odpovídá za ni. Soukromé a církevní školy mohou vybírat školné. {zrizovatele.length ? 'Obory, u kterých zřizovatele neznáme, se teď nezobrazují.' : 'Bez výběru ukazujeme všechny.'}</p>
          </fieldset>
          <label className="mt-4 block text-sm font-medium">Kraj školy<select disabled={!!stop} className={`${field} disabled:bg-slate-100 disabled:text-slate-500`} value={region} onChange={e => { setRegion(e.target.value); }}><option value="">Všechny kraje</option>{catalog?.kraje.map(kraj => <option key={kraj.kod}>{kraj.nazev}</option>)}</select></label>
          <label className="mt-4 block text-sm font-medium">Město nebo obec školy<select className={field} value={city} onChange={e => { setCity(e.target.value); }}><option value="">Všechna města a obce</option>{cities.map(name => <option key={name}>{name}</option>)}</select></label>
          {stop && <p className="mt-2 text-sm text-blue-800">Při hledání podle dojezdu kraj výsledky neomezuje, město ano. Po vypnutí dojezdu se kraj znovu použije.</p>}
          <label className="mt-5 block text-sm font-medium">Výchozí zastávka<input className={field} autoComplete="off" value={stopQuery} onChange={e => { setStopQuery(e.target.value); setStop(null); setSuggestions([]); setStopStatus(e.target.value.trim().length >= 2 ? 'Hledám zastávky…' : ''); setTransitError(''); }} placeholder="Zadej zastávku nebo obec" /></label>
          {!stop && suggestions.length > 0 && <ul className="mt-1 rounded-lg border border-slate-300 bg-white">{suggestions.map(item => <li key={item.stopId}><button className="min-h-11 w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-blue-50" onClick={() => { setStop(item); setStopQuery(item.name); setSuggestions([]); setStopStatus(''); setTransitError(''); }}>{item.name}<span className="block text-xs text-slate-500">{item.context}</span></button></li>)}</ul>}
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
            <p className="font-semibold text-blue-900">{stop ? `Hledáš podle dojezdu: do ${limit} min ze zastávky ${stop.name}${city ? `, jen obec ${city}` : ''}` : city ? `Hledáš školy v obci: ${city}` : region ? `Hledáš školy v kraji: ${region}` : onlySaved ? 'Ukazuješ jen uložené obory' : 'Zvol město nebo zastávku'}</p>
            <p className="mt-1 text-slate-600">{stop ? 'Bez omezení krajem. Zvolený typ studia a obory platí dál.' : needsPlace ? 'Vyber město, kraj nebo výchozí zastávku a ukážeme obory v okolí.' : `Bez omezení dojezdem.${city && region ? ` Současně platí kraj: ${region}.` : ''}`}</p>
            {(city || (!stop && region)) && <button className="mt-2 min-h-11 text-blue-700 underline" onClick={() => { setCity(''); setRegion(''); }}>Zrušit územní omezení</button>}
          </div>
          <p className="mb-4 text-xs text-slate-500">{rokPasem !== null ? `Nabídky doložené v 1. kole ${rokPasem}, v rozsahu` : 'Nabídky v rozsahu'} denních nezkrácených oborů s povinnou JPZ. Úplná nabídka a kritéria pro nové řízení se doplňují.</p>
          <div className="mb-4">
            <SavedSelectionBar
              items={savedItems}
              storageStatus={storageStatus}
              onlySaved={onlySaved}
              onToggleOnlySaved={() => { setOnlySaved(!onlySaved); }}
              onRemove={toggle}
              onShare={share}
              shareableCount={shareableIds.length}
            />
            {shareUrl && <label className="mt-3 block text-sm">Odkaz obsahuje jen uložené obory. Zadané body ani zastávka se nesdílejí.
              <input className={field} value={shareUrl} readOnly onFocus={e => e.target.select()} /></label>}
          </div>
          {razeniControls()}
          {pending ? <div role="status"><p>{transitError || 'Počítám orientační dojezd…'}</p>{transitError && <button className={`${button} mt-3`} onClick={() => { setTransitError(''); setRetry(retry + 1); }}>Zkusit znovu</button>}</div> : <>
            {needsPlace ? <p className="my-5">Zvol město, kraj nebo výchozí zastávku. Obory z celé země najednou neukazujeme.</p> : <>
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold" aria-live="polite">{countLabel(shownOffers.length)}{stop ? ` do ${limit} min` : ''}</h2></div>
            {!!groups.near.length && <div className="my-5 border-l-4 border-amber-500 bg-amber-50 p-4"><h3 className="font-semibold">Ještě {countLabel(groups.near.length)} těsně za limitem</h3><p className="mt-1 text-sm">Nejbližší je o {(estimates.byId.get(normalizeSchoolKey(groups.near[0].id))?.minutes ?? limit) - limit} min dál. Tvůj limit zůstává {limit} min.</p><div className="mt-3 flex flex-wrap gap-2"><a href="#near-schools" className={button}>Prohlédnout další obory</a>{limit < 180 && <button className={button} onClick={() => changeTime(String(Math.min(180, estimates.byId.get(normalizeSchoolKey(groups.near[groups.near.length - 1].id))?.minutes ?? limit + 10)))}>Zvýšit limit na {Math.min(180, estimates.byId.get(normalizeSchoolKey(groups.near[groups.near.length - 1].id))?.minutes ?? limit + 10)} min</button>}</div></div>}
            {catalog && !shownOffers.length && <p className="my-5">V zadaných podmínkách není žádný obor. Zkus rozšířit čas, změnit město nebo zrušit některý filtr.</p>}
            <div className="mt-4">{seznam(shownOffers)}</div>
            {!!groups.near.length && <section id="near-schools" className="mt-8 scroll-mt-8"><h2 className="text-xl font-semibold">Těsně za limitem</h2><p className="mt-1 text-sm text-slate-600">Nejvýš o 10 minut dál, ostatní filtry platí.</p><div className="mt-3">{seznam(groups.near)}</div></section>}
            {!!groups.unknown.length && <details className="mt-8"><summary className="cursor-pointer font-semibold">Dojezd zatím neověřen ({groups.unknown.length})</summary><p className="mt-2 text-sm text-slate-600">Chybí jednoznačné přiřazení místa výuky k dopravním datům. Neznamená to, že škola není dostupná.</p><div className="mt-3">{seznam(groups.unknown)}</div></details>}
            {stop && <p className="mt-6 text-xs text-slate-500">Nenalezená cesta může znamenat překročení rozsahu i chybějící spoj v podkladech. Pro konkrétní den ověř spojení v jízdním řádu.</p>}
            </>}
          </>}
          {vyhrady}
        </section>
      </div>
    </>}
    {!catalog && !error && <p role="status" className="mt-5">Načítám katalog…</p>}
    {error && <div role="alert" className="mt-5"><p>{error}</p><button className={button} onClick={() => setRetry(retry + 1)}>Zkusit načíst katalog znovu</button></div>}
  </div>;
}
