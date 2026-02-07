'use client';

import { useState } from 'react';
import Link from 'next/link';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { href: '/simulator', label: 'Simulátor' },
    { href: '/skoly', label: 'Analýza škol' },
    { href: '/dostupnost', label: 'Dojezdovost MHD' },
    { href: '/regiony', label: 'Regiony' },
    { href: '/jak-vybrat-skolu', label: 'Průvodce' },
    { href: '/jak-funguje-prijimani', label: 'Jak to funguje?' },
  ];

  return (
    <>
      {/* Navbar */}
      <nav className="bg-white shadow-md" style={{ height: '72px' }}>
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
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex w-full">
            <input
              type="text"
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
              className="px-6 py-2.5 text-white font-semibold text-sm uppercase tracking-wide cursor-pointer border-none shrink-0"
              style={{
                backgroundColor: '#0074e4',
                borderRadius: '0 4px 4px 0',
                letterSpacing: '1px',
              }}
            >
              Hledat
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
