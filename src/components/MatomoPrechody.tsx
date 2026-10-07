'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Zobrazení stránky v Matomu i při přechodu v aplikaci (#405, fáze 1; SEO audit z 20. 9. 2026, bod 5).
 *
 * Skript v layoutu měří jen první načtení dokumentu. Odkazy Next.js přecházejí bez nového načtení, takže
 * Matomo další stránky návštěvy neviděl a hloubka návštěvy vycházela podhodnocená. Komponenta pošle
 * `trackPageView` při každé změně cesty, ne při změně parametrů: filtry simulátoru a přehledů mění
 * adresu přes `history.replaceState` a každá změna filtru by jinak vypadala jako nová stránka.
 * První načtení přeskočí, to už změřil skript v layoutu. Bez `_paq` (jiná doména, blokátor) nic nedělá.
 */
export function MatomoPrechody() {
  const cesta = usePathname();
  const predchozi = useRef<string | null>(null);

  useEffect(() => {
    const adresa = window.location.href;
    const odkud = predchozi.current;
    predchozi.current = adresa;
    if (odkud === null) return;
    const paq = (window as unknown as { _paq?: unknown[][] })._paq;
    if (!paq) return;
    // Titulek nové stránky Next.js dosadí až po vykreslení; krátká prodleva ho zachytí.
    const casovac = window.setTimeout(() => {
      paq.push(['setReferrerUrl', odkud]);
      paq.push(['setCustomUrl', window.location.href]);
      paq.push(['setDocumentTitle', document.title]);
      paq.push(['trackPageView']);
    }, 100);
    return () => window.clearTimeout(casovac);
  }, [cesta]);

  return null;
}
