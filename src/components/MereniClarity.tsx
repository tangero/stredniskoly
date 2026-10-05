'use client';

import { useEffect } from 'react';

/**
 * Microsoft Clarity jen na simulátoru (#329): heatmapy kliknutí a posouvání, opakovaná a mrtvá kliknutí.
 *
 * - Bez lišty souhlasu a bez cookies: hned po načtení se Clarity pošle signál, že souhlas s ukládáním
 *   není (`consentv2` s `denied`), takže cookies nenastaví nikde, ani mimo EHP.
 * - Jen simulátor: skript se načte, až když se stránka simulátoru zobrazí. Web je jedna aplikace,
 *   proto se při odchodu na jinou stránku měření zastaví (`stop`) a při návratu znovu spustí (`start`);
 *   jinak by Clarity měřila i stránky, na které uživatel ze simulátoru přešel.
 * - Maskování: obsah simulátoru je označený `data-clarity-mask` (stránka simulátoru), formuláře
 *   s e-mailem také; v nastavení projektu Clarity má být navíc režim maskování „Strict“.
 *
 * V CSP (next.config.ts) musí být `https://*.clarity.ms` a `https://c.bing.com` ve `script-src`
 * a `connect-src`, jinak se skript zablokuje tiše.
 */
export const CLARITY_PROJEKT = 'yt39kf0nqw';

type Clarity = ((...args: unknown[]) => void) & { q?: unknown[][] };

export function MereniClarity() {
  useEffect(() => {
    const w = window as unknown as { clarity?: Clarity };
    if (!w.clarity) {
      const fronta: Clarity = (...args: unknown[]) => { (fronta.q = fronta.q || []).push(args); };
      w.clarity = fronta;
      w.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://www.clarity.ms/tag/${CLARITY_PROJEKT}`;
      s.id = 'clarity-simulator';
      document.head.appendChild(s);
    } else {
      w.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
      w.clarity('start');
    }
    return () => { w.clarity?.('stop'); };
  }, []);
  return null;
}
