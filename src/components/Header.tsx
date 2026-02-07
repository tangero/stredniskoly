'use client';

import { useState } from 'react';
import Link from 'next/link';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { href: '/simulator', label: 'Simulátor' },
    { href: '/skoly', label: 'Analýza škol' },
    { href: '/dostupnost', label: 'Dojezdovost', labelFull: 'Do jaké školy dojedete MHD' },
    { href: '/regiony', label: 'Regiony' },
    { href: '/jak-vybrat-skolu', label: 'Průvodce', labelFull: 'Jak vybrat a uspět' },
    { href: '/jak-funguje-prijimani', label: 'Jak to funguje?' },
  ];

  return (
    <header className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold hover:opacity-90 transition-opacity">
            Přijímačky na střední školy
          </Link>

          {/* Desktop navigace */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:underline underline-offset-4"
              >
                {link.labelFull || link.label}
              </Link>
            ))}
          </div>

          {/* Hamburger tlačítko pro mobily */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 -mr-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Otevřít menu"
            aria-expanded={isMenuOpen}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </nav>

        {/* Mobilní menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-white/20">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="py-2 px-3 -mx-3 hover:bg-white/10 rounded-lg transition-colors text-base"
                >
                  {link.labelFull || link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
