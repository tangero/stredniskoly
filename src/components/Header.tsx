'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: string;
  nazev: string;
  obor: string;
  obec: string;
  kraj: string;
  slug: string;
  delka_studia?: number;
}

interface Kraj {
  kod: string;
  nazev: string;
}

const SEARCH_MIN_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 450;
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const SEARCH_CACHE_MAX_ITEMS = 100;

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [kraje, setKraje] = useState<Kraj[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const searchCacheRef = useRef<Map<string, { expiresAt: number; results: SearchResult[] }>>(new Map());
  const router = useRouter();

  const navLinks = [
    { href: '/simulator', label: 'Simulátor' },
    { href: '/skoly', label: 'Analýza škol' },
    { href: '/dostupnost', label: 'Dojezdovost MHD' },
    { href: '/regiony', label: 'Regiony' },
    { href: '/jak-vybrat-skolu', label: 'Průvodce' },
    { href: '/jak-funguje-prijimani', label: 'Jak to funguje?' },
    { href: '/issues', label: 'Nahlášené chyby' },
  ];

  // Načíst seznam krajů
  useEffect(() => {
    fetch('/api/schools/search?krajeOnly=1')
      .then(res => res.json())
      .then(data => {
        if (data.kraje) {
          setKraje(data.kraje);
        }
      })
      .catch(err => console.error('Chyba při načítání krajů:', err));
  }, []);

  // Vyhledávání s debounce
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query || query.length < SEARCH_MIN_LENGTH) return;

    const cacheKey = normalizeText(query);
    const cached = searchCacheRef.current.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      setSearchResults(cached.results);
      setIsSearchOpen(cached.results.length > 0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      fetch(`/api/schools/search?search=${encodeURIComponent(query)}&limit=10`, { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          if (!Array.isArray(data.schools)) return;
          const results = data.schools as SearchResult[];
          if (searchCacheRef.current.size >= SEARCH_CACHE_MAX_ITEMS) {
            const oldestKey = searchCacheRef.current.keys().next().value;
            if (oldestKey) searchCacheRef.current.delete(oldestKey);
          }
          searchCacheRef.current.set(cacheKey, {
            expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
            results,
          });
          setSearchResults(results);
          setIsSearchOpen(results.length > 0);
        })
        .catch(err => {
          if (err instanceof Error && err.name === 'AbortError') return;
          console.error('Chyba při vyhledávání:', err);
        })
        .finally(() => setIsLoading(false));
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  // Zavřít dropdown při kliknutí mimo
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrovat kraje podle hledání
  const matchedKraje = useMemo(() => {
    if (!searchQuery || searchQuery.length < SEARCH_MIN_LENGTH) return [];
    const q = normalizeText(searchQuery);
    return kraje
      .filter(k => {
        const nazev = normalizeText(k.nazev);
        return nazev.includes(q);
      })
      .slice(0, 3);
  }, [searchQuery, kraje]);

  // Zvýraznění hledaného textu
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const q = normalizeText(query);
    const textNorm = normalizeText(text);
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

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/skoly?search=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
      setSearchResults([]);
      setIsLoading(false);
      setSearchQuery('');
    }
  };

  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim().length < SEARCH_MIN_LENGTH) {
      setSearchResults([]);
      setIsSearchOpen(false);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  return (
    <>
      {/* Navbar */}
      <nav className="bg-white shadow-md relative z-50" style={{ height: '72px' }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-10 h-full flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 no-underline shrink-0">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="6" fill="#0074e4"/>
              <path d="M20 8L8 18H12V30H18V23H22V30H28V18H32L20 8Z" fill="white"/>
              <rect x="17" y="12" width="6" height="4" rx="1" fill="#0074e4"/>
            </svg>
            <span className="text-lg" style={{ color: '#28313b' }}>
              Přijímačky na{' '}
              <strong className="font-bold">školu</strong>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-semibold no-underline transition-colors hover:opacity-80"
                style={{ color: '#0074e4' }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <a
              href="https://www.hlidacstatu.cz"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-block text-xs font-medium no-underline px-3 py-1.5 rounded"
              style={{ color: '#818c99', border: '1px solid #e0e6ed' }}
            >
              Hlídač státu
            </a>

            {/* Hamburger */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 -mr-2 rounded-lg transition-colors"
              style={{ color: '#28313b' }}
              aria-label="Otevřít menu"
              aria-expanded={isMenuOpen}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="lg:hidden bg-white border-t shadow-lg" style={{ borderColor: '#e0e6ed' }}>
            <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="py-2.5 px-3 -mx-3 rounded text-base font-semibold no-underline transition-colors"
                  style={{ color: '#0074e4' }}
                >
                  {link.label}
                </Link>
              ))}
              <a
                href="https://www.hlidacstatu.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="md:hidden mt-2 pt-3 text-sm no-underline"
                style={{ color: '#818c99', borderTop: '1px solid #e0e6ed' }}
              >
                Hlídač státu
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* Search bar */}
      <div style={{ backgroundColor: '#003688' }} className="py-3.5">
        <div className="max-w-3xl mx-auto px-4 relative">
          <div className="flex w-full">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchQueryChange(e.target.value)}
              onFocus={() => searchQuery.trim().length >= SEARCH_MIN_LENGTH && setIsSearchOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Hledej školu, obor, město nebo kraj..."
              className="hs-search flex-1 px-4 py-2.5 border-none outline-none"
              style={{
                borderRadius: '4px 0 0 4px',
                fontSize: '16px',
                color: '#28313b',
                backgroundColor: '#ffffff',
              }}
            />
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim()}
              className="px-6 py-2.5 text-white font-semibold text-sm uppercase tracking-wide cursor-pointer border-none shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#0074e4',
                borderRadius: '0 4px 4px 0',
                letterSpacing: '1px',
              }}
            >
              {isLoading ? 'Hledám...' : 'Hledat'}
            </button>
          </div>

          {/* Dropdown s výsledky */}
          {isSearchOpen && searchQuery.trim().length >= SEARCH_MIN_LENGTH && (searchResults.length > 0 || matchedKraje.length > 0) && (
            <div
              ref={searchDropdownRef}
              className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden max-h-[400px] overflow-y-auto"
            >
              {/* Kraje */}
              {matchedKraje.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50 uppercase tracking-wide">
                    Kraje
                  </div>
                  {matchedKraje.map((kraj) => (
                    <Link
                      key={kraj.kod}
                      href={`/regiony/${normalizeText(kraj.nazev).replace(/\s+/g, '-')}`}
                      className="block px-4 py-3 hover:bg-blue-50 no-underline"
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                    >
                      <div className="font-medium text-slate-900">{highlightMatch(kraj.nazev, searchQuery)} kraj</div>
                      <div className="text-xs text-slate-400">Zobrazit všechny školy v kraji</div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Školy */}
              {searchResults.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50 uppercase tracking-wide">
                    Školy a obory
                  </div>
                  {searchResults.map((school) => (
                    <Link
                      key={school.id}
                      href={`/skola/${school.slug}`}
                      className="block px-4 py-3 hover:bg-blue-50 no-underline"
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                    >
                      <div className="font-medium text-slate-900">
                        {highlightMatch(school.nazev, searchQuery)}
                        {school.obor && (
                          <>
                            <span className="text-slate-400 mx-1.5">•</span>
                            <span className="text-slate-700 font-normal">
                              {highlightMatch(school.obor, searchQuery)}
                              {school.delka_studia && (
                                <span className="text-slate-500 text-sm ml-1">({school.delka_studia}leté)</span>
                              )}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{school.obec} • {school.kraj}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Žádné výsledky */}
          {isSearchOpen && searchQuery.trim().length >= SEARCH_MIN_LENGTH && !isLoading && searchResults.length === 0 && matchedKraje.length === 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl border border-slate-200 p-6 text-center">
              <div className="text-slate-400 text-lg mb-2">Nic nenalezeno</div>
              <div className="text-sm text-slate-500">Zkuste jiný výraz nebo zkontrolujte pravopis</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
