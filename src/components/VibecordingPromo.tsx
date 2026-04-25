'use client';

import { useEffect, useState } from 'react';

interface PromoEvent {
  slug: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  city?: string;
  isPaid: boolean;
  price?: number;
  earlyBirdPrice?: number;
  earlyBirdDeadline?: string;
  bannerDescription?: string;
  dateVariants?: { date: string }[] | null;
}

const MONTHS = ['ledna','února','března','dubna','května','června','července','srpna','září','října','listopadu','prosince'];

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)}. ${MONTHS[parseInt(m) - 1]} ${y}`;
}

export function VibecordingPromo() {
  const [event, setEvent] = useState<PromoEvent | null>(null);

  useEffect(() => {
    fetch('https://www.vibecoding.cz/api/active-promotion')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.slug) setEvent(data); })
      .catch(() => {});
  }, []);

  if (!event) return null;

  const url = `https://www.vibecoding.cz/akce/${event.slug}/?utm_source=prijimackynaskolu&utm_medium=web&utm_campaign=event-promo`;
  const city = event.city || (event.location?.includes(',') ? event.location.split(',').slice(-1)[0].trim() : event.location || '');
  const dateText = [
    formatDate(event.date),
    city,
    event.dateVariants && event.dateVariants.length > 1 ? 'a další termíny' : null,
  ].filter(Boolean).join(' · ');

  if (event.isPaid) {
    // Tmavý workshop banner
    let earlyText = '';
    if (event.earlyBirdPrice && event.earlyBirdDeadline) {
      const deadline = new Date(event.earlyBirdDeadline + 'T23:59:59');
      if (new Date() <= deadline) {
        const [,em,ed] = event.earlyBirdDeadline.split('-');
        earlyText = `Early bird — do ${parseInt(ed)}. ${MONTHS[parseInt(em) - 1]}.`;
      }
    }

    return (
      <div style={{ borderTop: '1px solid #e0e6ed', paddingTop: '20px', marginBottom: '24px' }}>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a2332 0%, #1e3a4f 100%)',
            borderRadius: '10px',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap' as const,
          }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' as const }}>
                <span style={{ background: '#0074e4', color: '#fff', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', padding: '2px 8px', borderRadius: '3px' }}>Workshop</span>
                <span style={{ color: '#9cb3c9', fontSize: '12px' }}>{dateText}</span>
              </div>
              <div style={{ color: '#fff', fontSize: '16px', fontWeight: 700, lineHeight: 1.3, marginBottom: event.bannerDescription ? '4px' : 0 }}>{event.title}</div>
              {event.bannerDescription && <div style={{ color: '#9cb3c9', fontSize: '13px' }}>{event.bannerDescription}</div>}
              {earlyText && <div style={{ color: '#0074e4', fontSize: '12px', fontStyle: 'italic', marginTop: '4px' }}>{earlyText}</div>}
            </div>
            <div style={{ flexShrink: 0 }}>
              <span style={{ background: '#0074e4', color: '#fff', fontSize: '13px', fontWeight: 600, padding: '8px 18px', borderRadius: '6px', display: 'inline-block' }}>Detaily →</span>
            </div>
          </div>
        </a>
      </div>
    );
  }

  // Kompaktní "Naše akce" banner
  return (
    <div style={{ borderTop: '1px solid #e0e6ed', paddingTop: '20px', marginBottom: '24px' }}>
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          background: '#f5f7f9',
          border: '1px solid #e0e6ed',
          borderRadius: '10px',
          padding: '14px 18px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '3px', minWidth: 0 }}>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#fff', background: '#0074e4', padding: '2px 8px', borderRadius: '3px', width: 'fit-content' }}>Naše akce</span>
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#28313b', lineHeight: 1.3 }}>{event.title}</span>
            <span style={{ fontSize: '13px', color: '#818c99' }}>{dateText}</span>
            {event.bannerDescription && <span style={{ fontSize: '13px', color: '#818c99' }}>{event.bannerDescription}</span>}
          </div>
          <div style={{ flexShrink: 0 }}>
            <span style={{ background: '#0074e4', color: '#fff', fontSize: '13px', fontWeight: 600, padding: '7px 16px', borderRadius: '6px', display: 'inline-block', whiteSpace: 'nowrap' as const }}>Detaily →</span>
          </div>
        </div>
      </a>
    </div>
  );
}
