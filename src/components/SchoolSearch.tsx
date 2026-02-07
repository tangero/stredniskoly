'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { School } from '@/types/school';

interface SchoolSearchProps {
  schools: School[];
  kraje: { kod: string; nazev: string; slug: string }[];
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

// Aliasy pro školy s pobočkami (PORG má více kampusů pod jedním REDIZO)
const SCHOOL_ALIASES: Array<{
  searchTerms: string[];  // Hledané výrazy
  displayName: string;    // Zobrazený název
  description: string;    // Popis
  slug: string;           // URL slug
}> = [
  {
    searchTerms: ['porg libeň', 'porg liben', 'porg praha 8', 'porg lindnerova'],
    displayName: 'PORG Libeň',
    description: 'Gymnázium 8leté • Praha 8, Lindnerova',
    slug: '600006018-porg-gymnazium-pod-krcskym-lesem-gymnazium-8lete-porg-liben-praha-8',
  },
  {
    searchTerms: ['porg ostrava', 'porg rostislavova'],
    displayName: 'PORG Ostrava',
    description: 'Gymnázium 8leté • Ostrava, Rostislavova',
    slug: '600006018-porg-gymnazium-pod-krcskym-lesem-gymnazium-8lete-porg-ostrava',
  },
  {
    searchTerms: ['porg krč', 'porg krc', 'novy porg', 'nový porg', 'porg praha 4'],
    displayName: 'Nový PORG (Praha-Krč)',
    description: 'Gymnázium 4leté a 8leté • Praha 4, Pod Krčským lesem',
    slug: '600006018-porg-gymnazium-pod-krcskym-lesem',
  },
];

export function SchoolSearch({ schools, kraje }: SchoolSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Získat unikátní obce a okresy
  const locations = useMemo(() => {
    const obceSet = new Set<string>();
    const okresySet = new Set<string>();

    schools.forEach(s => {
      if (s.obec) obceSet.add(s.obec);
      if (s.okres) okresySet.add(s.okres);
    });

    return {
      obce: Array.from(obceSet).sort((a, b) => a.localeCompare(b, 'cs')),
      okresy: Array.from(okresySet).sort((a, b) => a.localeCompare(b, 'cs'))
    };
  }, [schools]);

  // Vyhledávání
  const results = useMemo(() => {
    if (!query || query.length < 2) return { schools: [], aliases: [], kraje: [], obce: [], okresy: [] };

    const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Hledat aliasy (PORG pobočky atd.)
    const matchedAliases = SCHOOL_ALIASES.filter(alias =>
      alias.searchTerms.some(term => {
        const termNorm = term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return termNorm.includes(q) || q.includes(termNorm);
      })
    );

    // Hledat školy
    const matchedSchools = schools
      .filter(s => {
        const nazev = s.nazev.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const obor = s.obor.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const obec = s.obec.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nazev.includes(q) || obor.includes(q) || obec.includes(q);
      })
      .slice(0, 5);

    // Hledat kraje
    const matchedKraje = kraje
      .filter(k => {
        const nazev = k.nazev.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nazev.includes(q);
      })
      .slice(0, 3);

    // Hledat obce
    const matchedObce = locations.obce
      .filter(o => {
        const norm = o.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return norm.includes(q);
      })
      .slice(0, 3);

    // Hledat okresy
    const matchedOkresy = locations.okresy
      .filter(o => {
        const norm = o.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return norm.includes(q);
      })
      .slice(0, 2);

    return {
      schools: matchedSchools,
      aliases: matchedAliases,
      kraje: matchedKraje,
      obce: matchedObce,
      okresy: matchedOkresy
    };
  }, [query, schools, kraje, locations]);

  // Celkový počet výsledků
  const totalResults = results.schools.length + results.aliases.length + results.kraje.length + results.obce.length + results.okresy.length;

  // Zavřít dropdown při kliknutí mimo
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Klávesová navigace
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, totalResults - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Zvýraznění hledaného textu
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const textNorm = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const index = textNorm.indexOf(q);
    if (index === -1) return text;

    return (
      <>
        {text.slice(0, index)}
        <mark className="bg-yellow-200 text-yellow-900">{text.slice(index, index + query.length)}</mark>
        {text.slice(index + query.length)}
      </>
    );
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Hledat školu, obec, okres nebo kraj..."
          className="w-full px-4 py-3 pl-12 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-lg text-slate-900 bg-white"
        />
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {query && (
          <button
            onClick={() => { setQuery(''); setIsOpen(false); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown s výsledky */}
      {isOpen && query.length >= 2 && totalResults > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden max-h-[400px] overflow-y-auto"
        >
          {/* Aliasy (PORG pobočky) */}
          {results.aliases.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50 uppercase tracking-wide">
                Pobočky škol
              </div>
              {results.aliases.map((alias, idx) => (
                <Link
                  key={alias.slug}
                  href={`/skola/${alias.slug}`}
                  className={`block px-4 py-3 hover:bg-blue-50 ${selectedIndex === idx ? 'bg-blue-50' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <div className="font-medium text-slate-900">{highlightMatch(alias.displayName, query)}</div>
                  <div className="text-sm text-slate-600">{alias.description}</div>
                </Link>
              ))}
            </div>
          )}

          {/* Školy */}
          {results.schools.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50 uppercase tracking-wide">
                Školy
              </div>
              {results.schools.map((school, idx) => {
                const slug = `${school.id.split('_')[0]}-${createSlug(school.nazev, school.obor)}`;
                const adjustedIdx = idx + results.aliases.length;
                return (
                  <Link
                    key={school.id}
                    href={`/skola/${slug}`}
                    className={`block px-4 py-3 hover:bg-blue-50 ${selectedIndex === adjustedIdx ? 'bg-blue-50' : ''}`}
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="font-medium text-slate-900">{highlightMatch(school.nazev, query)}</div>
                    <div className="text-sm text-slate-600">{highlightMatch(school.obor, query)}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{school.obec} • {school.kraj}</div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Kraje */}
          {results.kraje.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50 uppercase tracking-wide">
                Kraje
              </div>
              {results.kraje.map((kraj) => (
                <Link
                  key={kraj.kod}
                  href={`/regiony/${kraj.slug}`}
                  className="block px-4 py-3 hover:bg-blue-50"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="font-medium text-slate-900">{highlightMatch(kraj.nazev, query)} kraj</div>
                  <div className="text-xs text-slate-400">Zobrazit všechny školy v kraji</div>
                </Link>
              ))}
            </div>
          )}

          {/* Obce */}
          {results.obce.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50 uppercase tracking-wide">
                Obce
              </div>
              {results.obce.map((obec) => {
                // Najít kraj pro tuto obec
                const schoolInObec = schools.find(s => s.obec === obec);
                const krajSlug = schoolInObec ? kraje.find(k => k.kod === schoolInObec.kraj_kod)?.slug : '';
                return (
                  <Link
                    key={obec}
                    href={`/regiony/${krajSlug}?obec=${encodeURIComponent(obec)}`}
                    className="block px-4 py-3 hover:bg-blue-50"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="font-medium text-slate-900">{highlightMatch(obec, query)}</div>
                    <div className="text-xs text-slate-400">
                      {schools.filter(s => s.obec === obec).length} škol
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Okresy */}
          {results.okresy.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50 uppercase tracking-wide">
                Okresy
              </div>
              {results.okresy.map((okres) => {
                const schoolInOkres = schools.find(s => s.okres === okres);
                const krajSlug = schoolInOkres ? kraje.find(k => k.kod === schoolInOkres.kraj_kod)?.slug : '';
                return (
                  <Link
                    key={okres}
                    href={`/regiony/${krajSlug}?okres=${encodeURIComponent(okres)}`}
                    className="block px-4 py-3 hover:bg-blue-50"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="font-medium text-slate-900">{highlightMatch(okres, query)}</div>
                    <div className="text-xs text-slate-400">
                      {schools.filter(s => s.okres === okres).length} škol v okrese
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Žádné výsledky */}
      {isOpen && query.length >= 2 && totalResults === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl border border-slate-200 p-6 text-center">
          <div className="text-slate-400 text-lg mb-2">Nic nenalezeno</div>
          <div className="text-sm text-slate-500">Zkuste jiný výraz nebo zkontrolujte pravopis</div>
        </div>
      )}
    </div>
  );
}
