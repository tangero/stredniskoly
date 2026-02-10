'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: string;
  nazev: string;
  obor: string;
  zamereni?: string;
  obec: string;
  kraj: string;
  slug: string;
}

export function Header() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const navLinks = [
    { href: '/simulator', label: 'Simulátor' },
    { href: '/skoly', label: 'Analýza škol' },
    { href: '/dostupnost', label: 'Dojezdovost MHD' },
    { href: '/regiony', label: 'Regiony' },
    { href: '/jak-vybrat-skolu', label: 'Průvodce' },
    { href: '/jak-funguje-prijimani', label: 'Jak to funguje?' },
    { href: '/issues', label: 'Nahlášené chyby' },
  ];

  // Debounced API search
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const controller = abortRef.current;
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search: q, limit: '8' });
        const res = await fetch(`/api/schools/search?${params}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data.schools || []);
        setShowSuggestions(true);
        setHighlightIndex(-1);
      } catch {}
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [searchQuery]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearchSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setShowSuggestions(false);
    router.push(`/skoly?search=${encodeURIComponent(q)}`);
  }, [searchQuery, router]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') handleSearchSubmit();
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && suggestions[highlightIndex]) {
        setShowSuggestions(false);
        router.push(`/skola/${suggestions[highlightIndex].slug}`);
      } else { handleSearchSubmit(); }
    } else if (e.key === 'Escape') { setShowSuggestions(false); }
  }, [showSuggestions, suggestions, highlightIndex, handleSearchSubmit, router]);

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
      <div style={{ backgroundColor: '#003688' }} className="py-3.5 relative z-40">
        <div className="max-w-3xl mx-auto px-4" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="flex w-full relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              onKeyDown={handleSearchKeyDown}
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
              type="submit"
              className="px-6 py-2.5 text-white font-semibold text-sm uppercase tracking-wide cursor-pointer border-none shrink-0"
              style={{
                backgroundColor: '#0074e4',
                borderRadius: '0 4px 4px 0',
                letterSpacing: '1px',
              }}
            >
              Hledat
            </button>
          </form>
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-4 right-4 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden max-h-[400px] overflow-y-auto z-50">
              {suggestions.map((s, idx) => (
                <Link
                  key={s.id}
                  href={`/skola/${s.slug}`}
                  onClick={() => setShowSuggestions(false)}
                  className={`block px-4 py-3 no-underline hover:bg-blue-50 ${idx === highlightIndex ? 'bg-blue-50' : ''}`}
                >
                  <div className="font-medium text-slate-900">{s.nazev}</div>
                  <div className="text-sm text-slate-600">{s.obor}{s.zamereni ? ` - ${s.zamereni}` : ''}</div>
                  <div className="text-xs text-slate-400">{s.obec} • {s.kraj}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
