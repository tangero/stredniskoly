'use client';

import { useEffect } from 'react';
import {
  PRAH_PODILU, PRAH_VIDITELNOSTI_MS, UDALOST_ROZBALEN, UDALOST_VIDET,
  type StavNabidky, type TypStranky,
} from '@/lib/mereni-oddilu';

/**
 * Microsoft Clarity na simulátoru (#329) a na stránkách škol a oborů (#386): heatmapy kliknutí a posouvání, opakovaná a mrtvá kliknutí.
 *
 * - Bez lišty souhlasu a bez cookies: hned po načtení se Clarity pošle signál, že souhlas s ukládáním
 *   není (`consentv2` s `denied`), takže cookies nenastaví nikde, ani mimo EHP.
 * - Jen vyjmenované stránky: skript se načte, až když se zobrazí stránka simulátoru, školy nebo oboru. Web je jedna aplikace,
 *   proto se při odchodu na jinou stránku měření zastaví (`stop`) a při návratu znovu spustí (`start`);
 *   jinak by Clarity měřila i stránky, na které uživatel ze simulátoru přešel.
 * - Maskování: obsah simulátoru je označený `data-clarity-mask` (stránka simulátoru), formuláře
 *   s e-mailem a zadání výsledků testu také; v nastavení projektu Clarity má být navíc režim
 *   maskování „Strict“. Stránky škol a oborů obsahují jen veřejná data, jejich hlavní obsah je
 *   odmaskovaný (`data-clarity-unmask`), aby heatmapy ukazovaly, nad čím se kliká.
 * - Oddíly (`oddily`): prvky s `data-oddil` pošlou událost `oddil_videt:<id>` (aspoň 3 s z poloviny
 *   vidět, jednou za zobrazení stránky) a rozbalovací důkaz při otevření `oddil_rozbalen:<id>`.
 *   Štítky `typ_stranky` a `nabidka` slouží k filtrování. Do událostí jde jen identifikátor oddílu.
 *
 * V CSP (next.config.ts) musí být `https://*.clarity.ms` a `https://c.bing.com` ve `script-src`
 * a `connect-src`, jinak se skript zablokuje tiše.
 */
export const CLARITY_PROJEKT = 'yt39kf0nqw';

type Clarity = ((...args: unknown[]) => void) & { q?: unknown[][] };

type Props = { typStranky?: TypStranky; nabidka?: StavNabidky; oddily?: boolean };

export function MereniClarity({ typStranky, nabidka, oddily = false }: Props = {}) {
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
    if (typStranky) w.clarity('set', 'typ_stranky', typStranky);
    if (nabidka) w.clarity('set', 'nabidka', nabidka);
    return () => { w.clarity?.('stop'); };
  }, [typStranky, nabidka]);

  useEffect(() => {
    if (!oddily) return;
    const w = window as unknown as { clarity?: Clarity };
    const poslat = (udalost: string, id: string) => w.clarity?.('event', `${udalost}:${id}`);
    const videno = new Set<string>();
    const rozbaleno = new Set<string>();
    const casovace = new Map<Element, number>();

    // Oddíl delší než dvě obrazovky nikdy není z poloviny vidět, proto stačí i polovina výšky okna.
    const dostatecneVidet = (e: IntersectionObserverEntry) =>
      e.isIntersecting && (e.intersectionRatio >= PRAH_PODILU || e.intersectionRect.height >= window.innerHeight * PRAH_PODILU);

    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(zaznamy => {
      for (const z of zaznamy) {
        const id = (z.target as HTMLElement).dataset.oddil;
        if (!id || videno.has(id)) continue;
        if (dostatecneVidet(z)) {
          if (casovace.has(z.target)) continue;
          casovace.set(z.target, window.setTimeout(() => {
            casovace.delete(z.target);
            videno.add(id);
            poslat(UDALOST_VIDET, id);
            io?.unobserve(z.target);
          }, PRAH_VIDITELNOSTI_MS));
        } else if (casovace.has(z.target)) {
          window.clearTimeout(casovace.get(z.target));
          casovace.delete(z.target);
        }
      }
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    document.querySelectorAll('[data-oddil]').forEach(el => io?.observe(el));

    // Klik na souhrn zavřeného důkazu (myší i klávesnicí) = rozbalení; úvodní stav `open` se nepočítá.
    const naKlik = (ev: Event) => {
      const souhrn = (ev.target as Element | null)?.closest?.('summary');
      const d = souhrn?.parentElement;
      if (!(d instanceof HTMLDetailsElement) || d.open) return;
      const id = d.dataset.oddil;
      if (!id || rozbaleno.has(id)) return;
      rozbaleno.add(id);
      poslat(UDALOST_ROZBALEN, id);
    };
    document.addEventListener('click', naKlik, true);

    return () => {
      document.removeEventListener('click', naKlik, true);
      casovace.forEach(t => window.clearTimeout(t));
      io?.disconnect();
    };
  }, [oddily]);

  return null;
}
