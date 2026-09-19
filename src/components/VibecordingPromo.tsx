'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Upoutávka na akce Vibecodingu z https://www.vibecoding.cz/api/active-promotion.
 *
 * Kontrakt endpointu drží `src/pages/api/active-promotion.ts` ve vibecoding-site;
 * referenční vykreslení je `src/components/EventPromoAdZone.astro` tamtéž. Tahle
 * komponenta ho má následovat, aby se banner choval stejně na všech webech.
 *
 * Dvě věci, na kterých to dřív padalo:
 *
 * 1. **Reklamní slot (`isAd`) nemá termín.** Pole `date` u něj nese dnešní datum jen
 *    proto, aby prošel kontrakt; skutečný termín je v `bannerDescription`. Banner ho
 *    proto u reklamy nesmí zobrazit — jinak vedle sebe stojí dvě různá data.
 * 2. **Obrázek a popisky.** Slot může nést hotovou kreativu (`imageUrl`), vlastní
 *    značku (`badgeLabel`), text tlačítka (`ctaLabel`) a lhůtu (`highlight`).
 */

const PUVOD = 'https://www.vibecoding.cz';
const MESICE = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];

interface PromoEvent {
  slug?: string;
  title: string;
  date: string;
  time?: string | null;
  location?: string;
  city?: string;
  isAd?: boolean;
  isOwn?: boolean;
  isInternal?: boolean;
  isPaid: boolean;
  price?: number | null;
  earlyBirdPrice?: number | null;
  earlyBirdDeadline?: string | null;
  talkTitle?: string;
  externalUrl?: string;
  bannerDescription?: string;
  badgeLabel?: string | null;
  ctaLabel?: string | null;
  highlight?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  dateVariants?: { date: string }[] | null;
  clickUrl?: string | null;
  impressionUrl?: string | null;
}

function formatujDatum(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)}. ${MESICE[parseInt(m) - 1]} ${y}`;
}

/**
 * Povolená cesta ke kreativě, stejný seznam jako `safeImageUrl` v referenci.
 * Vrací absolutní adresu, protože běžíme na jiné doméně než zdroj obrázku.
 */
function bezpecnyObrazek(cesta: string | null | undefined): string | null {
  const u = String(cesta || '');
  if (!u || u.includes('..') || u.includes('//') || u.includes('\\')) return null;
  const promoMedia = /^\/promo-media\/[A-Za-z0-9][A-Za-z0-9_-]{2,80}(\?v=\d+)?$/;
  const obrazky = /^\/images\/[A-Za-z0-9._/-]+\.(jpe?g|png|webp|gif)(\?v=\d+)?$/i;
  return promoMedia.test(u) || obrazky.test(u) ? `${PUVOD}${u}` : null;
}

function sOdkazem(zaklad: string | null | undefined, surface: string): string | null {
  if (!zaklad) return null;
  try {
    const url = new URL(zaklad, PUVOD);
    url.searchParams.set('site', 'prijimackynaskolu');
    url.searchParams.set('surface', surface);
    return url.toString();
  } catch {
    return zaklad;
  }
}

export function VibecordingPromo({ surface = 'article' }: { surface?: string }) {
  const [event, setEvent] = useState<PromoEvent | null>(null);
  const ramec = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${PUVOD}/api/active-promotion`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data?.slug || data?.isAd) setEvent(data); })
      .catch(() => {});
  }, []);

  // Zobrazení se hlásí až když je banner aspoň z poloviny vidět, stejně jako v referenci.
  useEffect(() => {
    const adresa = sOdkazem(event?.impressionUrl, surface);
    const prvek = ramec.current;
    if (!adresa || !prvek) return;
    let odeslano = false;
    const posli = () => {
      if (odeslano) return;
      odeslano = true;
      try {
        const url = new URL(adresa);
        url.searchParams.set('view_id', crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
        if (navigator.sendBeacon) navigator.sendBeacon(url.toString());
        else fetch(url.toString(), { method: 'POST', keepalive: true }).catch(() => {});
      } catch { /* měření nesmí shodit stránku */ }
    };
    if (!('IntersectionObserver' in window)) { posli(); return; }
    const pozorovatel = new IntersectionObserver(zaznamy => {
      if (zaznamy.some(z => z.isIntersecting && z.intersectionRatio >= 0.5)) {
        pozorovatel.disconnect();
        posli();
      }
    }, { threshold: [0.5] });
    pozorovatel.observe(prvek);
    return () => pozorovatel.disconnect();
  }, [event, surface]);

  if (!event) return null;

  const odkaz = sOdkazem(event.clickUrl, surface)
    ?? event.externalUrl
    ?? (event.slug ? `${PUVOD}/akce/${event.slug}/?utm_source=prijimackynaskolu&utm_medium=web&utm_campaign=event-promo` : PUVOD);

  // Nové okno je tu vždy: vibecoding.cz je z pohledu tohohle webu cizí doména, i když
  // ho reference považuje za interní. `isInternal` u nás rozhoduje jen o rel=sponsored —
  // upoutávka na vlastní akci pořadatele není placená reklama třetí strany.
  const placenaCizi = event.isAd && !event.isInternal;
  const atributyOdkazu = {
    target: '_blank',
    rel: placenaCizi ? 'noopener noreferrer sponsored' : 'noopener noreferrer',
  };

  const ramecStyl = { borderTop: '1px solid #e0e6ed', paddingTop: '20px', marginBottom: '24px' } as const;

  // ------------------------------------------------------------------ reklamní slot
  if (event.isAd) {
    const obrazek = bezpecnyObrazek(event.imageUrl);
    if (obrazek) {
      return (
        <div ref={ramec} style={ramecStyl}>
          <a href={odkaz} {...atributyOdkazu} style={{ display: 'block', textDecoration: 'none' }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- kreativa je na cizí doméně, next/image ji neoptimalizuje */}
            <img
              src={obrazek}
              alt={event.imageAlt || event.title}
              loading="lazy"
              decoding="async"
              style={{ display: 'block', width: '100%', height: 'auto', borderRadius: '10px' }}
            />
          </a>
        </div>
      );
    }
    return (
      <div ref={ramec} style={ramecStyl}>
        <a href={odkaz} {...atributyOdkazu} style={{ textDecoration: 'none', display: 'block' }}>
          <div style={kartaStyl}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
              <span style={znackaStyl}>{event.badgeLabel || 'Tip'}</span>
              <span style={nazevStyl}>{event.title}</span>
              {/* Termín reklamy je v popisku, pole `date` u ní nic neznamená. */}
              {event.bannerDescription && <span style={popisStyl}>{event.bannerDescription}</span>}
              {event.highlight && <span style={{ ...popisStyl, color: '#0074e4', fontStyle: 'italic' }}>{event.highlight}</span>}
            </div>
            <div style={{ flexShrink: 0 }}>
              <span style={tlacitkoStyl}>{event.ctaLabel || 'Více →'}</span>
            </div>
          </div>
        </a>
      </div>
    );
  }

  // ------------------------------------------------------------------ vlastní akce
  const mesto = event.city || (event.location?.includes(',') ? event.location.split(',').slice(-1)[0].trim() : event.location || '');
  const popisTerminu = [
    formatujDatum(event.date),
    mesto,
    event.dateVariants && event.dateVariants.length > 1 ? 'a další termíny' : null,
  ].filter(Boolean).join(' · ');

  if (event.isPaid) {
    let lhuta = '';
    if (event.earlyBirdPrice && event.earlyBirdDeadline) {
      const konec = new Date(`${event.earlyBirdDeadline}T23:59:59`);
      if (new Date() <= konec) {
        const [, m, d] = event.earlyBirdDeadline.split('-');
        lhuta = `Early bird — do ${parseInt(d)}. ${MESICE[parseInt(m) - 1]}.`;
      }
    }
    return (
      <div ref={ramec} style={ramecStyl}>
        <a href={odkaz} {...atributyOdkazu} style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a2332 0%, #1e3a4f 100%)',
            borderRadius: '10px', padding: '18px 22px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span style={{ ...znackaStyl, background: '#0074e4' }}>{event.badgeLabel || 'Workshop'}</span>
                <span style={{ color: '#9cb3c9', fontSize: '12px' }}>{popisTerminu}</span>
              </div>
              <div style={{ color: '#fff', fontSize: '16px', fontWeight: 700, lineHeight: 1.3, marginBottom: event.bannerDescription ? '4px' : 0 }}>{event.title}</div>
              {event.bannerDescription && <div style={{ color: '#9cb3c9', fontSize: '13px' }}>{event.bannerDescription}</div>}
              {lhuta && <div style={{ color: '#0074e4', fontSize: '12px', fontStyle: 'italic', marginTop: '4px' }}>{lhuta}</div>}
            </div>
            <div style={{ flexShrink: 0 }}>
              <span style={{ ...tlacitkoStyl, padding: '8px 18px' }}>{event.ctaLabel || 'Detaily →'}</span>
            </div>
          </div>
        </a>
      </div>
    );
  }

  // Cizí akce, na které někdo z Vibecodingu vystupuje, nese název přednášky.
  const nazev = event.isOwn === false && event.talkTitle ? `${event.title}: ${event.talkTitle}` : event.title;
  return (
    <div ref={ramec} style={ramecStyl}>
      <a href={odkaz} {...atributyOdkazu} style={{ textDecoration: 'none', display: 'block' }}>
        <div style={kartaStyl}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
            <span style={znackaStyl}>{event.badgeLabel || (event.isOwn === false ? 'Vystupuji' : 'Naše akce')}</span>
            <span style={nazevStyl}>{nazev}</span>
            <span style={popisStyl}>{popisTerminu}</span>
            {event.bannerDescription && <span style={popisStyl}>{event.bannerDescription}</span>}
          </div>
          <div style={{ flexShrink: 0 }}>
            <span style={tlacitkoStyl}>{event.ctaLabel || 'Detaily →'}</span>
          </div>
        </div>
      </a>
    </div>
  );
}

const kartaStyl = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
  background: '#f5f7f9', border: '1px solid #e0e6ed', borderRadius: '10px', padding: '14px 18px',
} as const;

const znackaStyl = {
  fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
  color: '#fff', background: '#0074e4', padding: '2px 8px', borderRadius: '3px', width: 'fit-content',
} as const;

const nazevStyl = { fontSize: '15px', fontWeight: 600, color: '#28313b', lineHeight: 1.3 } as const;
const popisStyl = { fontSize: '13px', color: '#818c99' } as const;
const tlacitkoStyl = {
  background: '#0074e4', color: '#fff', fontSize: '13px', fontWeight: 600, padding: '7px 16px',
  borderRadius: '6px', display: 'inline-block', whiteSpace: 'nowrap',
} as const;
