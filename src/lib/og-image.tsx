import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import resultsMeta from '../../public/cermat_results_meta.json';

export const ogSize = { width: 1200, height: 630 };

const cards = {
  home: {
    title: ['Najdi si svou', 'střední školu'],
    description: ['Školy, obory a dojíždění.', 'Podklady pro tvoje rozhodnutí.'],
    labels: ['Přijímání 2027', `Výsledky ${resultsMeta.latest_year}`],
    footer: 'Kalendář přijímaček a historické výsledky škol',
    path: '',
  },
  regions: {
    title: ['Střední školy', 'podle krajů'],
    description: ['Prozkoumej školy ve svém okolí.', 'Porovnej obory i možnosti dojíždění.'],
    labels: ['14 krajů ČR', 'Školy a obory'],
    footer: 'Najdi místo, kde chceš studovat',
    path: '/regiony',
  },
  simulator: {
    title: ['Simulátor', 'přijímaček'],
    description: ['Zadej body z češtiny a matematiky.', 'Prohlédni si historická data škol.'],
    labels: ['Čeština', 'Matematika'],
    footer: 'Historická data nejsou zárukou přijetí',
    path: '/simulator',
  },
} as const;

// Full local fonts include Czech glyphs. No request-time font CDN or emoji fallback.
// Keep the default Node runtime: the former edge wrapper returned HTTP 500.
export async function createOgImage(kind: keyof typeof cards) {
  const [regular, bold, illustration] = await Promise.all([
    readFile(join(process.cwd(), 'public/og/fonts/NotoSans-Regular.ttf')),
    readFile(join(process.cwd(), 'public/og/fonts/NotoSans-Bold.ttf')),
    readFile(join(process.cwd(), 'public/og/school-illustration.png')),
  ]);
  const card = cards[kind];

  return new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#ffffff', color: '#17324d', fontFamily: 'Noto Sans', padding: '40px 56px', borderTop: '8px solid #0074e4' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 44, flexShrink: 0 }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <rect width="36" height="36" rx="10" fill="#0074e4" />
          <path d="M8 10C12 9 15 10 18 12C21 10 24 9 28 10V25C24 24 21 25 18 27C15 25 12 24 8 25V10Z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
          <path d="M18 12V27" stroke="white" strokeWidth="2" />
        </svg>
        <span style={{ fontSize: 23, fontWeight: 700 }}>Přijímačky na školu</span>
      </div>

      <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 662, flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 64, lineHeight: 1.13, fontWeight: 700, letterSpacing: '-2px' }}>
            {card.title.map((line) => <span key={line}>{line}</span>)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 24, fontSize: 27, lineHeight: 1.5, color: '#526779' }}>
            {card.description.map((line) => <span key={line}>{line}</span>)}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            {card.labels.map((label) => (
              <span key={label} style={{ display: 'flex', padding: '10px 18px', borderRadius: 9, fontSize: 22, fontWeight: 700, color: '#005fbf', background: '#edf5ff' }}>{label}</span>
            ))}
          </div>
        </div>
        {/* Native img is required by ImageResponse; this is not a browser image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${illustration.toString('base64')}`} alt="" width={400} height={400} style={{ objectFit: 'contain' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, borderTop: '1px solid #dde6ef', paddingTop: 17 }}>
        <span style={{ fontSize: 20, color: '#526779' }}>{card.footer}</span>
        <span style={{ fontSize: 21, fontWeight: 700, color: '#0074e4' }}>prijimackynaskolu.cz{card.path}</span>
      </div>
    </div>,
    {
      ...ogSize,
      fonts: [
        { name: 'Noto Sans', data: regular, style: 'normal', weight: 400 },
        { name: 'Noto Sans', data: bold, style: 'normal', weight: 700 },
      ],
    },
  );
}
