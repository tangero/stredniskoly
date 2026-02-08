'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface School {
  id: string;
  nazev: string;
  nazev_display: string;
  slug?: string;
  obor: string;
  obec: string;
  ulice?: string;
  adresa?: string;
  kraj: string;
  kraj_kod: string;
  typ: string;
  delka_studia?: number;
  zamereni?: string;
  min_body_2025: number;  // celkové body včetně extra kritérií
  jpz_min: number;        // čisté JPZ body (max 100)
  index_poptavky_2025: number;
}

interface SchoolDetailData {
  total_applicants: number;
  priority_counts: number[];
  prihlasky_priority: number[];
  prijati_priority: number[];
  cj_prumer: number;
  cj_min: number;
  ma_prumer: number;
  ma_min: number;
  min_body: number;
  jpz_min: number;
  index_poptavky: number;
  obtiznost: number;
  kapacita: number;
  prijati: number;
  competing_schools: Array<{
    id: string;
    nazev: string;
    obor: string;
    obec: string;
    overlap_count: number;
    overlap_pct: number;
  }>;
  difficulty_profile: {
    percentile_national: number;
    percentile_type: number;
    z_score_cj: number;
    z_score_ma: number;
    focus_index: number;
    focus_label: string;
    comparison_to_avg: number;
    comparison_to_type: number;
  } | null;
}

type StatusType = 'accepted' | 'borderline' | 'rejected';

function createSlug(name: string, obor?: string, zamereni?: string, delkaStudia?: number): string {
  let slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (obor) {
    let oborSlug = obor
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (delkaStudia) {
      oborSlug = `${oborSlug}-${delkaStudia}lete`;
    }
    slug = `${slug}-${oborSlug}`;
  }

  if (zamereni) {
    const zamereniSlug = zamereni
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    slug = `${slug}-${zamereniSlug}`;
  }

  return slug;
}

function getAdmissionThreshold(school: Pick<School, 'min_body_2025' | 'jpz_min'>): number {
  if (Number.isFinite(school.min_body_2025) && school.min_body_2025 > 0) {
    return school.min_body_2025;
  }
  return school.jpz_min;
}

export function SimulatorClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [scoreCj, setScoreCj] = useState(35);
  const [scoreMa, setScoreMa] = useState(35);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [krajFilter, setKrajFilter] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [delkaStudia, setDelkaStudia] = useState<number | null>(4);
  const [schoolDetails, setSchoolDetails] = useState<Map<string, SchoolDetailData>>(new Map());
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());
  // Cache pro vybrané školy (aby zůstaly dostupné i po změně filtrů)
  const [selectedSchoolsCache, setSelectedSchoolsCache] = useState<Map<string, School>>(new Map());
  const didHydrateFromUrl = useRef(false);

  // Pro zpětnou kompatibilitu
  const selectedSchools = useMemo(() => new Set(selectedSchoolIds), [selectedSchoolIds]);

  // DnD sensory
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Srovnání je řízeno URL parametrem
  const showStrategy = searchParams.get('srovnani') === '1';

  // Funkce pro otevření/zavření srovnání s aktualizací URL
  const openStrategy = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('srovnani', '1');
    router.push(`/simulator?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const closeStrategy = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('srovnani');
    const newUrl = params.toString() ? `/simulator?${params.toString()}` : '/simulator';
    router.push(newUrl, { scroll: false });
  }, [router, searchParams]);

  // Celkové skóre JPZ = ČJ + MA (max 50 + 50 = 100 bodů)
  const totalScore = scoreCj + scoreMa;

  // Předvyplnění z URL (sdílený odkaz: ?cj=..&ma=..&skoly=id1,id2)
  useEffect(() => {
    const cjParam = searchParams.get('cj');
    const maParam = searchParams.get('ma');
    const skolyParam = searchParams.get('skoly');

    if (cjParam) {
      const cj = parseInt(cjParam, 10);
      if (Number.isFinite(cj)) {
        setScoreCj(Math.min(50, Math.max(0, cj)));
      }
    }

    if (maParam) {
      const ma = parseInt(maParam, 10);
      if (Number.isFinite(ma)) {
        setScoreMa(Math.min(50, Math.max(0, ma)));
      }
    }

    if (skolyParam) {
      const ids = Array.from(
        new Set(
          skolyParam
            .split(',')
            .map(id => id.trim())
            .filter(id => id.length > 0)
        )
      ).slice(0, 30);

      setSelectedSchoolIds(prev => {
        if (prev.length === ids.length && prev.every((v, i) => v === ids[i])) {
          return prev;
        }
        return ids;
      });
    } else if (!didHydrateFromUrl.current) {
      setSelectedSchoolIds([]);
    }

    didHydrateFromUrl.current = true;
  }, [searchParams]);

  // Dotáhnout metadata vybraných škol podle ID (i mimo aktuální filtry)
  useEffect(() => {
    if (selectedSchoolIds.length === 0) return;

    const missing = selectedSchoolIds.filter(id => !selectedSchoolsCache.has(id));
    if (missing.length === 0) return;

    const controller = new AbortController();
    const params = new URLSearchParams();
    params.set('ids', missing.join(','));
    params.set('limit', String(Math.min(100, missing.length)));

    fetch(`/api/schools/search?${params.toString()}`, { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data?.schools) return;
        setSelectedSchoolsCache(prev => {
          const next = new Map(prev);
          (data.schools as School[]).forEach((school) => next.set(school.id, school));
          return next;
        });
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          console.error('Error preloading selected schools:', err);
        }
      });

    return () => controller.abort();
  }, [selectedSchoolIds, selectedSchoolsCache]);

  // Načíst detaily školy z API
  const fetchSchoolDetails = useCallback(async (schoolId: string) => {
    if (schoolDetails.has(schoolId) || loadingDetails.has(schoolId)) return;

    setLoadingDetails(prev => new Set(prev).add(schoolId));

    try {
      const response = await fetch(`/api/school-details/${encodeURIComponent(schoolId)}`);
      if (response.ok) {
        const data = await response.json();
        setSchoolDetails(prev => new Map(prev).set(schoolId, data));
      }
    } catch (error) {
      console.error('Error fetching school details:', error);
    } finally {
      setLoadingDetails(prev => {
        const next = new Set(prev);
        next.delete(schoolId);
        return next;
      });
    }
  }, [schoolDetails, loadingDetails]);

  // Načíst detaily pro všechny vybrané školy
  useEffect(() => {
    selectedSchoolIds.forEach(id => {
      if (!schoolDetails.has(id) && !loadingDetails.has(id)) {
        fetchSchoolDetails(id);
      }
    });
  }, [selectedSchoolIds, schoolDetails, loadingDetails, fetchSchoolDetails]);

  // Drag & drop handler
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSelectedSchoolIds((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  // Načtení škol při změně filtrů (debounced)
  useEffect(() => {
    const controller = new AbortController();

    const fetchSchools = async () => {
      const params = new URLSearchParams();
      params.set('minScore', String(Math.max(0, totalScore - 25)));
      params.set('maxScore', String(Math.min(100, totalScore + 25)));
      params.set('limit', '50');

      if (delkaStudia) params.set('delkaStudia', String(delkaStudia));
      if (krajFilter) params.set('kraj', krajFilter);
      if (searchTerm) params.set('search', searchTerm);

      try {
        const res = await fetch(`/api/schools/search?${params.toString()}`, {
          signal: controller.signal
        });
        const data = await res.json();
        setSchools(data.schools || []);
      } catch (err: unknown) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error('Error loading schools:', err);
        }
      }
    };

    // Debounce hledání
    const timeoutId = setTimeout(fetchSchools, searchTerm ? 300 : 0);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [totalScore, delkaStudia, krajFilter, searchTerm]);

  const [kraje, setKraje] = useState<Array<[string, string]>>([]);

  // Načtení seznamu krajů při startu
  useEffect(() => {
    fetch('/api/schools/search?krajeOnly=1')
      .then(res => res.json())
      .then(data => {
        if (data.kraje) {
          setKraje(data.kraje.map((k: { kod: string; nazev: string }) => [k.kod, k.nazev]));
        }
        setLoading(false);

        // Zobrazit onboarding při první návštěvě
        const hasVisited = localStorage.getItem('simulator_visited');
        if (!hasVisited) {
          setShowOnboarding(true);
          localStorage.setItem('simulator_visited', 'true');
        }
      })
      .catch(err => {
        console.error('Error loading kraje:', err);
        setLoading(false);
      });
  }, []);

  const getStatus = useCallback((minBody: number): { status: StatusType; label: string; color: string } => {
    const diff = totalScore - minBody;
    if (diff >= 10) return { status: 'accepted', label: 'Vysoká šance', color: 'green' };
    if (diff >= -10) return { status: 'borderline', label: 'Na hraně', color: 'yellow' };
    return { status: 'rejected', label: 'Malá šance', color: 'red' };
  }, [totalScore]);

  // Doporučené školy - filtrování provádí API, zde pouze použijeme data
  const recommendedSchools = useMemo(() => {
    // Data jsou již filtrována a seřazena na serveru
    return schools;
  }, [schools]);

  // Kategorizované doporučené školy
  const categorizedSchools = useMemo(() => {
    const accepted: School[] = [];
    const borderline: School[] = [];
    const rejected: School[] = [];

    recommendedSchools.forEach(school => {
      const status = getStatus(getAdmissionThreshold(school));
      if (status.status === 'accepted') accepted.push(school);
      else if (status.status === 'borderline') borderline.push(school);
      else rejected.push(school);
    });

    return { accepted, borderline, rejected };
  }, [recommendedSchools, getStatus]);

  const selectedSchoolsList = useMemo(() => {
    // Zachovat pořadí podle selectedSchoolIds, použít cache
    return selectedSchoolIds
      .map(id => selectedSchoolsCache.get(id))
      .filter((s): s is School => s !== undefined);
  }, [selectedSchoolsCache, selectedSchoolIds]);

  const stats = useMemo(() => {
    let accepted = 0, borderline = 0, rejected = 0;
    selectedSchoolsList.forEach(school => {
      const status = getStatus(getAdmissionThreshold(school));
      if (status.status === 'accepted') accepted++;
      else if (status.status === 'borderline') borderline++;
      else rejected++;
    });
    return { accepted, borderline, rejected };
  }, [selectedSchoolsList, getStatus]);

  const toggleSchool = useCallback((id: string) => {
    setSelectedSchoolIds(prev => {
      if (prev.includes(id)) {
        // Odebrat z výběru
        setSelectedSchoolsCache(cache => {
          const next = new Map(cache);
          next.delete(id);
          return next;
        });
        return prev.filter(x => x !== id);
      } else {
        // Přidat do výběru - najít školu a uložit do cache
        const school = schools.find(s => s.id === id);
        if (school) {
          setSelectedSchoolsCache(cache => new Map(cache).set(id, school));
        }
        return [...prev, id];
      }
    });
  }, [schools]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-slate-600">Načítám data...</p>
      </div>
    );
  }

  return (
    <>
      {/* Fullscreen Strategy Modal */}
      {showStrategy && selectedSchools.size > 0 && (
        <div className="fixed inset-0 bg-slate-900/95 z-50 overflow-auto">
          <div className="min-h-screen p-4 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Srovnání vybraných oborů</h2>
                <p className="text-slate-400 mt-1">
                  Tvoje JPZ skóre: <span className="text-white font-bold">{totalScore} bodů</span> (ČJ: {scoreCj}, MA: {scoreMa})
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('cj', scoreCj.toString());
                    url.searchParams.set('ma', scoreMa.toString());
                    url.searchParams.set('skoly', selectedSchoolIds.join(','));
                    navigator.clipboard.writeText(url.toString());
                    alert('Odkaz zkopírován do schránky!');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Sdílet
                </button>
                <button
                  onClick={closeStrategy}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Verdikt */}
            <div className={`rounded-xl p-4 mb-6 ${
              stats.accepted > 0 ? 'bg-green-500/20 border border-green-500/30' :
              stats.borderline > 0 ? 'bg-yellow-500/20 border border-yellow-500/30' :
              'bg-red-500/20 border border-red-500/30'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {stats.accepted > 0 ? '✅' : stats.borderline > 0 ? '⚠️' : '❌'}
                </span>
                <div>
                  {stats.accepted > 0 ? (
                    <p className="text-white">
                      <strong>Dobrá strategie!</strong> Na {stats.accepted} {stats.accepted === 1 ? 'obor' : stats.accepted < 5 ? 'obory' : 'oborů'} máš vysokou šanci.
                      {stats.borderline > 0 && ` Dalších ${stats.borderline} je na hraně.`}
                      {stats.rejected > 0 && ` U ${stats.rejected} je šance malá.`}
                    </p>
                  ) : stats.borderline > 0 ? (
                    <p className="text-white">
                      <strong>Riskantní strategie!</strong> Všechny obory jsou na hraně. Doporučujeme přidat záložní variantu s nižšími nároky.
                    </p>
                  ) : (
                    <p className="text-white">
                      <strong>Problematická strategie!</strong> Na vybrané obory máš malou šanci. Zvaž přidání jednodušších oborů.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Tip */}
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 mb-6">
              <p className="text-blue-200 text-sm">
                <strong>💡 Přetahování:</strong> Kartu můžeš chytit kdekoliv (kromě křížku vpravo nahoře) a přetáhnout na nové pořadí priority. Pořadí neovlivňuje šanci na přijetí, určuje jen výsledné přiřazení školy.
              </p>
            </div>

            {/* Srovnávací tabulka s Drag & Drop */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <div className="overflow-x-auto pb-4">
                <SortableContext items={selectedSchoolIds}>
                  <div className="flex gap-4 min-w-max">
                    {selectedSchoolsList.map((school, idx) => (
                      <SortableSchoolCard
                        key={school.id}
                        school={school}
                        index={idx}
                        totalScore={totalScore}
                        getStatus={getStatus}
                        toggleSchool={toggleSchool}
                        closeStrategy={closeStrategy}
                        details={schoolDetails.get(school.id)}
                        isLoading={loadingDetails.has(school.id)}
                      />
                    ))}

                    {/* Přidat další obor */}
                    <button
                      onClick={closeStrategy}
                      className="border-2 border-dashed border-slate-600 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors min-h-[300px] w-[320px] shrink-0"
                    >
                      <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="font-medium">Přidat další obor</span>
                      <span className="text-sm mt-1">do srovnání</span>
                    </button>
                  </div>
                </SortableContext>
              </div>
            </DndContext>
          </div>
        </div>
      )}

      {/* Onboarding modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md p-8 shadow-2xl">
            <h3 className="text-2xl font-bold mb-4">Jak funguje simulátor?</h3>
            <div className="space-y-4 text-slate-700">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">1</div>
                <div>
                  <strong>Zadej body</strong> z českého jazyka a matematiky (0-50)
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">2</div>
                <div>
                  <strong>Prohlédni si doporučené školy</strong> podle tvého skóre
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">3</div>
                <div>
                  <strong>Přidej školy do výběru</strong> a sleduj své šance
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowOnboarding(false)}
              className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Rozumím, začít
            </button>
          </div>
        </div>
      )}

      {/* Hero section - zadání bodů */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-blue-600 text-white py-10 lg:py-14 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <div className="text-center mb-6">
            <h2 className="text-2xl lg:text-3xl font-bold mb-2">
              Kolik bodů jsi získal?
            </h2>
            <p className="opacity-90">
              Zadej výsledky a okamžitě uvidíš školy, kam máš šanci
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            {/* Výběr délky studia */}
            <div className="mb-6">
              <label className="block text-white/80 text-sm font-medium mb-3 text-center">
                Jaký typ studia hledáš?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => setDelkaStudia(null)}
                  className={`py-3 px-4 rounded-xl font-medium transition-all ${
                    delkaStudia === null
                      ? 'bg-white text-blue-700 shadow-lg'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Všechny
                </button>
                <button
                  onClick={() => setDelkaStudia(8)}
                  className={`py-3 px-4 rounded-xl font-medium transition-all ${
                    delkaStudia === 8
                      ? 'bg-white text-blue-700 shadow-lg'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Osmileté
                </button>
                <button
                  onClick={() => setDelkaStudia(6)}
                  className={`py-3 px-4 rounded-xl font-medium transition-all ${
                    delkaStudia === 6
                      ? 'bg-white text-blue-700 shadow-lg'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Šestileté
                </button>
                <button
                  onClick={() => setDelkaStudia(4)}
                  className={`py-3 px-4 rounded-xl font-medium transition-all ${
                    delkaStudia === 4
                      ? 'bg-white text-blue-700 shadow-lg'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Čtyřleté
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {/* Český jazyk */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Český jazyk
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="50"
                    value={scoreCj}
                    onChange={(e) => setScoreCj(Math.min(50, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full text-3xl lg:text-4xl font-bold bg-white text-slate-900 rounded-xl p-4 text-center border-4 border-transparent focus:border-yellow-400 focus:ring-0 focus:outline-none transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">/ 50</span>
                </div>
              </div>

              {/* Matematika */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Matematika
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="50"
                    value={scoreMa}
                    onChange={(e) => setScoreMa(Math.min(50, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full text-3xl lg:text-4xl font-bold bg-white text-slate-900 rounded-xl p-4 text-center border-4 border-transparent focus:border-yellow-400 focus:ring-0 focus:outline-none transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">/ 50</span>
                </div>
              </div>
            </div>

            {/* Celkové skóre */}
            <div className="bg-white rounded-xl p-5 text-center">
              <div className="text-sm text-slate-600 font-medium mb-1">CELKOVÉ SKÓRE JPZ</div>
              <div className="text-5xl lg:text-6xl font-black bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent">
                {totalScore}
              </div>
              <div className="text-slate-500 text-sm">z 100 možných bodů</div>

              {/* Progress bar */}
              <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                  style={{ width: `${totalScore}%` }}
                ></div>
              </div>

              {/* Quick stats */}
              <div className="mt-3 text-xs text-slate-500">
                Průměrné minimum pro přijetí: ~34 bodů · Top gymnázia: 80+ bodů
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hlavní obsah */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Info boxy */}
        <div className="space-y-4 mb-6">
          <div className="bg-sky-50 border-l-4 border-sky-500 p-4 rounded-r-xl">
            <p className="text-sm text-sky-800">
              <strong>Jak funguje přijímání:</strong> Vaše šance závisí pouze na bodech, ne na pořadí priorit.
              Priorita určuje jen to, na kterou školu budete přiřazeni, pokud se dostanete nad čáru u více škol.
              {' '}<Link href="/jak-funguje-prijimani" className="underline font-medium">Zjistit více →</Link>
            </p>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
            <p className="text-sm text-amber-900">
              <strong>💡 Extra kritéria:</strong> Některé školy hodnotí i prospěch, olympiády nebo jiné úspěchy.
              Pokud vidíte číslo ve formátu "min 33 (+38)", znamená to: <strong>33 bodů z JPZ testů + 38 bodů za extra kritéria = 71 bodů celkem</strong>.
              Simulátor počítá s celkovým minimem, ale zobrazuje i rozdělení.
            </p>
          </div>
        </div>

        {/* Statistiky výběru - sticky na mobilu */}
        {selectedSchools.size > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6 sticky top-0 z-40 border-b-2 border-blue-500">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold">Tvůj výběr ({selectedSchools.size})</h2>
                <div className="flex gap-1">
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    ✓ {stats.accepted}
                  </span>
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                    ~ {stats.borderline}
                  </span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                    ✗ {stats.rejected}
                  </span>
                </div>
              </div>
              <button
                onClick={() => openStrategy()}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-lg font-medium text-sm hover:from-blue-700 hover:to-blue-700 transition-all shadow-md"
              >
                📋 Zobrazit srovnání
              </button>
            </div>
          </div>
        )}

        {/* Filtry a vyhledávání */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Vyhledávání */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Hledej školu, město, obor..."
                className="w-full pl-10 pr-10 py-3 border-2 border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-0 focus:outline-none transition-colors bg-white"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Kraj */}
            <div className="md:w-64">
              <select
                value={krajFilter}
                onChange={(e) => setKrajFilter(e.target.value)}
                className="w-full py-3 px-4 border-2 border-slate-200 rounded-xl text-slate-900 focus:border-blue-500 focus:ring-0 focus:outline-none transition-colors bg-white"
              >
                <option value="">Všechny kraje</option>
                {kraje.map(([kod, nazev]) => (
                  <option key={kod} value={kod}>{nazev}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Info o filtrech */}
          {(searchTerm || krajFilter || delkaStudia) && (
            <div className="mt-3 flex items-center justify-between text-sm flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-600">
                  Nalezeno: <strong>{recommendedSchools.length}</strong> škol
                </span>
                {delkaStudia && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    delkaStudia === 8 ? 'bg-blue-100 text-blue-700' :
                    delkaStudia === 6 ? 'bg-blue-100 text-blue-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {delkaStudia}leté
                  </span>
                )}
                {krajFilter && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                    {kraje.find(k => k[0] === krajFilter)?.[1] || krajFilter}
                  </span>
                )}
              </div>
              <button
                onClick={() => { setSearchTerm(''); setKrajFilter(''); setDelkaStudia(null); }}
                className="text-blue-600 hover:underline"
              >
                Zrušit filtry
              </button>
            </div>
          )}
        </div>

        {/* Grid: Vybrané školy + Doporučené školy */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Levý panel - vybrané školy */}
          <div className="lg:col-span-1 space-y-4">
            {selectedSchools.size > 0 ? (
              <>
                {/* CTA pro srovnání */}
                <button
                  onClick={() => openStrategy()}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-600 rounded-xl shadow-lg p-4 text-white hover:from-blue-700 hover:to-blue-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h2 className="font-semibold flex items-center gap-2">
                        <span>📋</span> Tvoje strategie
                      </h2>
                      <p className="text-white/80 text-sm mt-1">
                        {selectedSchools.size} {selectedSchools.size === 1 ? 'obor vybrán' : selectedSchools.size < 5 ? 'obory vybrány' : 'oborů vybráno'}
                      </p>
                    </div>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <span className="px-2 py-1 bg-green-400/30 text-green-100 rounded text-xs font-medium">
                      ✓ {stats.accepted}
                    </span>
                    <span className="px-2 py-1 bg-yellow-400/30 text-yellow-100 rounded text-xs font-medium">
                      ~ {stats.borderline}
                    </span>
                    <span className="px-2 py-1 bg-red-400/30 text-red-100 rounded text-xs font-medium">
                      ✗ {stats.rejected}
                    </span>
                  </div>
                </button>

                {/* Seznam vybraných škol */}
                <div className="bg-white rounded-xl shadow-sm p-4">
                  <h2 className="font-semibold mb-3 text-sm text-slate-600">Vybrané obory</h2>
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {selectedSchoolsList.map(school => {
                      const admissionMin = getAdmissionThreshold(school);
                      const status = getStatus(admissionMin);
                      const diff = totalScore - admissionMin;
                      const slug = school.slug || `${school.id.split('_')[0]}-${createSlug(school.nazev, school.obor, school.zamereni, school.delka_studia)}`;
                      const colors: Record<string, string> = {
                        green: 'border-green-500 bg-green-50',
                        yellow: 'border-yellow-500 bg-yellow-50',
                        red: 'border-red-500 bg-red-50'
                      };
                      const hasExtraCriteria = school.jpz_min > 0 && admissionMin - school.jpz_min > 5;
                      return (
                        <div key={school.id} className={`p-2 rounded-lg border-l-4 ${colors[status.color] || ''}`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <Link href={`/skola/${slug}`} className="font-medium text-sm hover:text-blue-600 block truncate">
                                {school.nazev_display || school.nazev}
                              </Link>
                              <div className="text-xs text-slate-600 truncate">
                                {school.obor}{school.zamereni ? ` – ${school.zamereni.replace(/_/g, ' ')}` : ''}
                              </div>
                              {hasExtraCriteria && (
                                <div className="text-[10px] text-slate-500 mt-0.5" title={`JPZ minimum: ${school.jpz_min} bodů + extra kritéria: ${admissionMin - school.jpz_min} bodů`}>
                                  JPZ {school.jpz_min} + extra {admissionMin - school.jpz_min}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <span className={`text-sm font-bold ${
                                status.color === 'green' ? 'text-green-700' :
                                status.color === 'yellow' ? 'text-yellow-700' : 'text-red-700'
                              }`}>
                                {diff > 0 ? '+' : ''}{diff}
                              </span>
                              <button
                                onClick={() => toggleSchool(school.id)}
                                className="text-slate-400 hover:text-red-600 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-slate-50 rounded-xl p-6 text-center border-2 border-dashed border-slate-300 sticky top-20">
                <div className="text-4xl mb-3">🎓</div>
                <h3 className="font-semibold mb-2">Zatím nic nevybráno</h3>
                <p className="text-sm text-slate-600">
                  Klikni na školu vpravo pro přidání do výběru
                </p>
              </div>
            )}
          </div>

          {/* Pravý panel - doporučené školy */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <span>🎯 Obory pro tebe</span>
                <span className="text-sm font-normal text-slate-500">
                  (podle skóre {totalScore} bodů)
                </span>
              </h2>

              {recommendedSchools.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold mb-2">Žádné školy nenalezeny</h3>
                  <p className="text-slate-600 mb-4">
                    Zkus změnit hledaný výraz nebo filtry
                  </p>
                  <button
                    onClick={() => { setSearchTerm(''); setKrajFilter(''); }}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Zrušit všechny filtry
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Vysoká šance */}
                  {categorizedSchools.accepted.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                        <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-xs">✓</span>
                        Vysoká šance ({categorizedSchools.accepted.length} oborů)
                      </h3>
                      <div className="space-y-1">
                        {categorizedSchools.accepted.map(school => (
                          <SchoolCard
                            key={school.id}
                            school={school}
                            status="accepted"
                            yourScore={totalScore}
                            isSelected={selectedSchools.has(school.id)}
                            onToggle={() => toggleSchool(school.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Na hraně */}
                  {categorizedSchools.borderline.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-yellow-700 mb-2 flex items-center gap-2">
                        <span className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center text-xs">~</span>
                        Na hraně ({categorizedSchools.borderline.length} oborů)
                      </h3>
                      <div className="space-y-1">
                        {categorizedSchools.borderline.map(school => (
                          <SchoolCard
                            key={school.id}
                            school={school}
                            status="borderline"
                            yourScore={totalScore}
                            isSelected={selectedSchools.has(school.id)}
                            onToggle={() => toggleSchool(school.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Malá šance */}
                  {categorizedSchools.rejected.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                        <span className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-xs">✗</span>
                        Malá šance ({categorizedSchools.rejected.length} oborů)
                      </h3>
                      <div className="space-y-1">
                        {categorizedSchools.rejected.map(school => (
                          <SchoolCard
                            key={school.id}
                            school={school}
                            status="rejected"
                            yourScore={totalScore}
                            isSelected={selectedSchools.has(school.id)}
                            onToggle={() => toggleSchool(school.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Komponenta pro kartu školy
interface SchoolCardProps {
  school: School;
  status: StatusType;
  yourScore: number;
  isSelected: boolean;
  onToggle: () => void;
}

function SchoolCard({ school, status, yourScore, isSelected, onToggle }: SchoolCardProps) {
  const admissionMin = getAdmissionThreshold(school);
  const diff = yourScore - admissionMin;
  const slug = school.slug || `${school.id.split('_')[0]}-${createSlug(school.nazev, school.obor, school.zamereni, school.delka_studia)}`;

  const colors = {
    accepted: {
      bg: 'bg-green-50 hover:bg-green-100',
      border: isSelected ? 'border-2 border-green-500' : 'border border-green-200',
      diff: 'text-green-700'
    },
    borderline: {
      bg: 'bg-yellow-50 hover:bg-yellow-100',
      border: isSelected ? 'border-2 border-yellow-500' : 'border border-yellow-200',
      diff: 'text-yellow-700'
    },
    rejected: {
      bg: 'bg-red-50 hover:bg-red-100',
      border: isSelected ? 'border-2 border-red-500' : 'border border-red-200',
      diff: 'text-red-700'
    }
  };

  const c = colors[status];

  return (
    <div
      onClick={onToggle}
      className={`${c.bg} ${c.border} rounded-lg px-3 py-2 cursor-pointer transition-all`}
    >
      {/* Desktop layout - jedna řádka */}
      <div className="hidden sm:flex items-center gap-2 text-sm">
        {/* Checkbox */}
        {isSelected && (
          <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded flex items-center justify-center shrink-0">
            ✓
          </span>
        )}

        {/* Délka studia badge */}
        {school.delka_studia && (
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${
            school.delka_studia === 8 ? 'bg-blue-100 text-blue-700' :
            school.delka_studia === 6 ? 'bg-blue-100 text-blue-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {school.delka_studia}l
          </span>
        )}

        {/* Obor - hlavní info */}
        <Link
          href={`/skola/${slug}`}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-slate-900 hover:text-blue-600 shrink-0"
        >
          {school.obor}
        </Link>

        {school.zamereni && (
          <>
            <span className="text-slate-300">–</span>
            <span className="text-slate-500 text-xs shrink-0">{school.zamereni.replace(/_/g, ' ')}</span>
          </>
        )}

        <span className="text-slate-300">·</span>

        {/* Název školy */}
        <span className="text-slate-600 truncate">
          {school.nazev_display || school.nazev}
        </span>

        <span className="text-slate-300">·</span>

        {/* Lokace */}
        <span className="text-slate-500 shrink-0">{school.obec}</span>

        {/* Spacer */}
        <div className="flex-1 min-w-0"></div>

        {/* Body */}
        <span className="text-xs text-slate-400 shrink-0">
          {school.jpz_min > 0 && school.min_body_2025 - school.jpz_min > 5 ? (
            <span title={`JPZ: ${school.jpz_min} bodů + extra kritéria: ${school.min_body_2025 - school.jpz_min} bodů`}>
              min {school.jpz_min} (+{school.min_body_2025 - school.jpz_min})
            </span>
          ) : (
            `min ${admissionMin}`
          )}
        </span>
        <span className={`font-bold shrink-0 ${c.diff}`}>
          {diff > 0 ? '+' : ''}{diff}
        </span>
      </div>

      {/* Mobile layout - dvě řádky */}
      <div className="sm:hidden">
        {/* Řádek 1: badges + obor + body */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {isSelected && (
              <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded flex items-center justify-center shrink-0">
                ✓
              </span>
            )}
            {school.delka_studia && (
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${
                school.delka_studia === 8 ? 'bg-blue-100 text-blue-700' :
                school.delka_studia === 6 ? 'bg-blue-100 text-blue-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {school.delka_studia}l
              </span>
            )}
            <Link
              href={`/skola/${slug}`}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-slate-900 hover:text-blue-600 truncate text-sm"
            >
              {school.obor}
            </Link>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-slate-400">
              {school.jpz_min > 0 && school.min_body_2025 - school.jpz_min > 5 ? (
                <span title={`JPZ: ${school.jpz_min} bodů + extra: ${school.min_body_2025 - school.jpz_min}`}>
                  {school.jpz_min}(+{school.min_body_2025 - school.jpz_min})
                </span>
              ) : (
                `min ${admissionMin}`
              )}
            </span>
            <span className={`font-bold text-sm ${c.diff}`}>
              {diff > 0 ? '+' : ''}{diff}
            </span>
          </div>
        </div>
        {/* Řádek 2: zaměření (pokud existuje) + škola + obec */}
        <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
          {school.zamereni && (
            <>
              <span className="text-slate-600 font-medium shrink-0">{school.zamereni.replace(/_/g, ' ')}</span>
              <span className="text-slate-300">·</span>
            </>
          )}
          <span className="truncate">{school.nazev_display || school.nazev}</span>
          <span className="text-slate-300">·</span>
          <span className="shrink-0">{school.obec}</span>
        </div>
      </div>
    </div>
  );
}

// Sortable School Card pro srovnání
interface SortableSchoolCardProps {
  school: School;
  index: number;
  totalScore: number;
  getStatus: (minBody: number) => { status: StatusType; label: string; color: string };
  toggleSchool: (id: string) => void;
  closeStrategy: () => void;
  details?: SchoolDetailData;
  isLoading: boolean;
}

function SortableSchoolCard({
  school,
  index,
  totalScore,
  getStatus,
  toggleSchool,
  closeStrategy,
  details,
  isLoading,
}: SortableSchoolCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: school.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const admissionMin = getAdmissionThreshold(school);
  const status = getStatus(admissionMin);
  const diff = totalScore - admissionMin;
  const slug = school.slug || `${school.id.split('_')[0]}-${createSlug(school.nazev, school.obor, school.zamereni, school.delka_studia)}`;

  const statusColors = {
    accepted: 'from-green-600 to-green-700 border-green-500',
    borderline: 'from-yellow-600 to-yellow-700 border-yellow-500',
    rejected: 'from-red-600 to-red-700 border-red-500'
  };

  // Priority heatmap colors
  const getPriorityColor = (pct: number) => {
    if (pct >= 40) return 'bg-red-500';
    if (pct >= 25) return 'bg-orange-500';
    if (pct >= 15) return 'bg-yellow-500';
    if (pct >= 5) return 'bg-green-500';
    return 'bg-slate-600';
  };

  // Priority analysis
  const getPriorityAnalysis = () => {
    if (!details?.priority_counts) return null;
    const total = details.priority_counts.reduce((a, b) => a + b, 0);
    if (total === 0) return null;

    const firstPrioPct = Math.round((details.priority_counts[0] / total) * 100);

    if (firstPrioPct >= 50) return { text: 'Většina uchazečů dává jako 1. prioritu', color: 'text-red-300' };
    if (firstPrioPct >= 30) return { text: 'Silná konkurence na 1. prioritě', color: 'text-orange-300' };
    if (firstPrioPct >= 15) return { text: 'Vyvážené rozložení priorit', color: 'text-yellow-300' };
    return { text: 'Často jako záložní volba', color: 'text-green-300' };
  };

  const priorityAnalysis = getPriorityAnalysis();

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className={`bg-gradient-to-b ${statusColors[status.status]} border-2 rounded-2xl overflow-hidden w-[320px] shrink-0 cursor-grab active:cursor-grabbing ${isDragging ? 'shadow-2xl ring-4 ring-white/30' : ''}`}
    >
      {/* Header s drag handle a pořadím */}
      <div className="bg-black/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold text-white">
            {index + 1}
          </div>
          <span className="text-white/80 text-sm">
            {index === 0 ? '1. priorita' : `${index + 1}. priorita`}
          </span>
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('Odebrat tento obor ze srovnání?')) {
              toggleSchool(school.id);
            }
          }}
          className="p-1 text-white/60 hover:text-white transition-colors"
          title="Odebrat ze srovnání"
          aria-label="Odebrat obor ze srovnání"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Obsah karty */}
      <div className="p-4 text-white">
        {/* Název a obor - fixní výška pro zarovnání */}
        <div className="h-[84px] mb-2">
          <Link href={`/skola/${slug}`} className="block hover:underline" onClick={closeStrategy}>
            <h3 className="font-bold text-lg leading-tight line-clamp-2">{school.nazev_display || school.nazev}</h3>
            <p className="text-white/80 text-sm truncate">
              {school.obor}{school.zamereni ? ` – ${school.zamereni.replace(/_/g, ' ')}` : ''}
            </p>
          </Link>
        </div>
        <p className="text-white/60 text-xs mb-4">{school.obec} · {school.kraj?.trim()}</p>

        {/* Hlavní metrika - rozdíl bodů */}
        <div className="bg-black/20 rounded-xl p-4 mb-4 text-center">
          <div className="text-4xl font-black mb-1">
            {diff > 0 ? '+' : ''}{diff}
          </div>
          <div className="text-white/70 text-sm">
            {status.status === 'accepted' ? 'bodů nad hranicí' :
             status.status === 'borderline' ? 'bodů od hranice' :
             'bodů pod hranicí'}
          </div>
          <div className={`mt-2 inline-block px-3 py-1 rounded-full text-sm font-medium ${
            status.status === 'accepted' ? 'bg-green-400/30 text-green-100' :
            status.status === 'borderline' ? 'bg-yellow-400/30 text-yellow-100' :
            'bg-red-400/30 text-red-100'
          }`}>
            {status.status === 'accepted' ? '✓ Vysoká šance' :
             status.status === 'borderline' ? '~ Na hraně' :
             '✗ Malá šance'}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin w-6 h-6 border-2 border-white/30 border-t-white rounded-full mx-auto"></div>
            <p className="text-white/50 text-sm mt-2">Načítám data...</p>
          </div>
        ) : details ? (
          <>
            {/* Uchazeči */}
            <div className="bg-black/20 rounded-lg p-3 mb-3">
              <h4 className="text-xs font-medium text-white/60 uppercase mb-2">Uchazeči</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xl font-bold">{details.total_applicants}</div>
                  <div className="text-white/60 text-xs">celkem</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{details.priority_counts?.[0] || 0}</div>
                  <div className="text-white/60 text-xs">na 1. místě</div>
                </div>
              </div>
            </div>

            {/* Obtížnost přijetí */}
            {details.difficulty_profile && (
              <div className="bg-black/20 rounded-lg p-3 mb-3">
                <h4 className="text-xs font-medium text-white/60 uppercase mb-2">Obtížnost</h4>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 bg-white/10 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 h-2 rounded-full"
                      style={{ width: `${details.difficulty_profile.percentile_national}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold">{details.difficulty_profile.percentile_national}%</span>
                </div>
                <p className="text-xs text-white/70">
                  {details.difficulty_profile.percentile_national >= 90 ? 'Velmi náročná škola (top 10%)' :
                   details.difficulty_profile.percentile_national >= 75 ? 'Nadprůměrně náročná' :
                   details.difficulty_profile.percentile_national >= 50 ? 'Průměrná náročnost' :
                   details.difficulty_profile.percentile_national >= 25 ? 'Podprůměrná náročnost' :
                   'Nízká náročnost'}
                </p>
              </div>
            )}

            {/* Rozložení priorit - heatmapa */}
            <div className="bg-black/20 rounded-lg p-3 mb-3">
              <h4 className="text-xs font-medium text-white/60 uppercase mb-2">Rozložení priorit</h4>
              <div className="flex gap-1 mb-2">
                {details.priority_counts?.map((count, i) => {
                  const total = details.priority_counts.reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={i} className="flex-1 text-center">
                      <div className={`h-8 ${getPriorityColor(pct)} rounded flex items-center justify-center text-xs font-bold`}>
                        {pct > 0 ? `${pct}%` : '-'}
                      </div>
                      <div className="text-[10px] text-white/50 mt-1">{i + 1}.</div>
                    </div>
                  );
                })}
              </div>
              {priorityAnalysis && (
                <p className={`text-xs ${priorityAnalysis.color}`}>{priorityAnalysis.text}</p>
              )}
            </div>

            {/* Výsledky testů přijatých - JPZ body (max 100 na test) */}
            {(details.cj_min > 0 || details.ma_min > 0) && (
              <div className="bg-black/20 rounded-lg p-3 mb-3">
                <h4 className="text-xs font-medium text-white/60 uppercase mb-2">JPZ body přijatých</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-white/70 text-xs mb-1">Čeština</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-white">{details.cj_min}</span>
                      <span className="text-white/50 text-xs">min</span>
                    </div>
                    {details.cj_prumer > 0 && (
                      <div className="text-xs text-white/50">{Math.round(details.cj_prumer)} prům.</div>
                    )}
                  </div>
                  <div>
                    <div className="text-white/70 text-xs mb-1">Matematika</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-white">{details.ma_min}</span>
                      <span className="text-white/50 text-xs">min</span>
                    </div>
                    {details.ma_prumer > 0 && (
                      <div className="text-xs text-white/50">{Math.round(details.ma_prumer)} prům.</div>
                    )}
                  </div>
                </div>
                {/* JPZ minimum celkem */}
                <div className="mt-2 pt-2 border-t border-white/10">
                  <div className="flex justify-between items-baseline">
                    <span className="text-white/70 text-xs">JPZ celkem (ČJ + MA):</span>
                    <span className="text-white font-bold">{details.jpz_min} bodů</span>
                  </div>
                  {/* Extra kritéria pokud existují */}
                  {admissionMin - details.jpz_min > 5 && (
                    <>
                      <div className="flex justify-between items-baseline mt-1">
                        <span className="text-white/70 text-xs">Extra kritéria:</span>
                        <span className="text-yellow-300 font-bold">+{admissionMin - details.jpz_min} bodů</span>
                      </div>
                      <div className="flex justify-between items-baseline mt-1 pt-1 border-t border-white/10">
                        <span className="text-white/70 text-xs">Celkové minimum:</span>
                        <span className="text-white font-bold text-lg">{admissionMin} bodů</span>
                      </div>
                      <div className="text-[10px] text-yellow-200/60 mt-2 text-center">
                        Extra body: prospěch, olympiády, aj.
                      </div>
                    </>
                  )}
                </div>
                <div className="text-[10px] text-white/40 mt-2 text-center">
                  max 50 bodů na test, celkem max 100
                </div>
              </div>
            )}

            {/* Zaměření oboru - humanitní vs matematické */}
            {details.difficulty_profile && (
              <div className="bg-black/20 rounded-lg p-3 mb-3">
                <h4 className="text-xs font-medium text-white/60 uppercase mb-2">Zaměření oboru</h4>
                <div className="relative h-6 bg-white/10 rounded-full overflow-hidden">
                  {/* Pozadí s gradientem */}
                  <div className="absolute inset-0 flex">
                    <div className="flex-1 bg-blue-500/30"></div>
                    <div className="flex-1 bg-blue-500/30"></div>
                  </div>
                  {/* Střední čára */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30"></div>
                  {/* Indikátor pozice */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-white/50"
                    style={{
                      left: `${Math.max(5, Math.min(95, 50 + (details.difficulty_profile.focus_index * 30)))}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-white/50 mt-1">
                  <span>Humanitní</span>
                  <span>Matematické</span>
                </div>
                <p className="text-xs text-white/80 text-center mt-2 font-medium">{details.difficulty_profile.focus_label}</p>
              </div>
            )}

            {/* Konkurenční školy */}
            {details.competing_schools && details.competing_schools.length > 0 && (
              <div className="bg-black/20 rounded-lg p-3 mb-3">
                <h4 className="text-xs font-medium text-white/60 uppercase mb-2">Kam se hlásí ostatní</h4>
                <div className="space-y-1">
                  {details.competing_schools.slice(0, 5).map((cs) => (
                    <div key={cs.id} className="flex items-center justify-between text-xs">
                      <span className="text-white/80 truncate flex-1 mr-2">
                        {cs.nazev} · {cs.obor}
                      </span>
                      <span className="text-white/60 shrink-0">{cs.overlap_count} uchazečů</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-white/40 mt-2">Počet společných uchazečů</p>
              </div>
            )}
          </>
        ) : (
          /* Základní data bez detailů */
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-white/70">Min. skóre k přijetí:</span>
              <span className="font-semibold">{admissionMin} bodů</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Tvoje JPZ skóre:</span>
              <span className="font-semibold">{totalScore} bodů</span>
            </div>
            <div className="border-t border-white/20 my-2"></div>
            <div className="flex justify-between">
              <span className="text-white/70">Konkurence:</span>
              <span className={`font-semibold ${
                school.index_poptavky_2025 >= 3 ? 'text-red-300' :
                school.index_poptavky_2025 >= 2 ? 'text-yellow-300' : 'text-green-300'
              }`}>
                {school.index_poptavky_2025?.toFixed(1) || '?'}× převis
              </span>
            </div>
          </div>
        )}

        {/* Link na detail */}
        <Link
          href={`/skola/${slug}`}
          onClick={closeStrategy}
          className="mt-4 block w-full text-center bg-white/20 hover:bg-white/30 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Zobrazit detail →
        </Link>
      </div>
    </div>
  );
}
