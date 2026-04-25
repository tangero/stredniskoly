'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PromoEvent {
  slug: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  isPaid: boolean;
  price?: number;
  earlyBirdPrice?: number;
  earlyBirdDeadline?: string;
}

function formatCzechDate(iso: string): string {
  const months = ['ledna','února','března','dubna','května','června','července','srpna','září','října','listopadu','prosince'];
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)}. ${months[parseInt(m) - 1]} ${y}`;
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
  const dateStr = formatCzechDate(event.date);
  const timeStr = event.time ? ` v ${event.time}` : '';
  const locationStr = event.location ? `, ${event.location}` : '';

  let priceLabel = '';
  if (event.isPaid && event.price) {
    const now = new Date();
    const ebDeadline = event.earlyBirdDeadline ? new Date(event.earlyBirdDeadline + 'T23:59:59') : null;
    if (event.earlyBirdPrice && ebDeadline && now <= ebDeadline) {
      priceLabel = `${event.earlyBirdPrice.toLocaleString('cs-CZ')} Kč (early bird)`;
    } else {
      priceLabel = `${event.price.toLocaleString('cs-CZ')} Kč`;
    }
  }

  return (
    <div style={{ borderTop: '1px solid #e0e6ed', paddingTop: '20px', marginBottom: '24px' }}>
      <p className="text-xs font-semibold mb-2" style={{ color: '#818c99', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {event.isPaid ? 'Workshop' : 'Akce'} autora webu
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex flex-col gap-1 no-underline"
        style={{ color: '#28313b' }}
      >
        <span className="font-semibold text-sm group-hover:underline" style={{ color: '#0074e4' }}>
          {event.title}
        </span>
        <span className="text-xs" style={{ color: '#818c99' }}>
          {dateStr}{timeStr}{locationStr}
          {priceLabel && <> &middot; {priceLabel}</>}
          {' '}&rarr; vibecoding.cz
        </span>
      </a>
    </div>
  );
}
