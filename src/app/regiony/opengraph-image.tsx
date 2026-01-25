import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Přehled středních škol podle krajů ČR';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Logo */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}
          >
            🗺️
          </div>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 24, fontWeight: 600 }}>
            Regiony ČR
          </span>
        </div>

        {/* Hlavní text */}
        <h1
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: 'white',
            margin: 0,
            textAlign: 'center',
            textShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          Střední školy podle krajů
        </h1>
        <p
          style={{
            fontSize: 32,
            color: 'rgba(255,255,255,0.9)',
            margin: '20px 0 50px 0',
          }}
        >
          Vyberte kraj a prozkoumejte školy ve vašem regionu
        </p>

        {/* Mřížka krajů */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            justifyContent: 'center',
            maxWidth: 900,
          }}
        >
          {[
            'Praha',
            'Středočeský',
            'Jihočeský',
            'Plzeňský',
            'Karlovarský',
            'Ústecký',
            'Liberecký',
            'Královéhradecký',
            'Pardubický',
            'Vysočina',
            'Jihomoravský',
            'Olomoucký',
            'Zlínský',
            'Moravskoslezský',
          ].map((kraj) => (
            <div
              key={kraj}
              style={{
                background: 'rgba(255,255,255,0.15)',
                padding: '12px 20px',
                borderRadius: 12,
                fontSize: 18,
                color: 'white',
                fontWeight: 500,
              }}
            >
              {kraj}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            color: 'rgba(255,255,255,0.6)',
            fontSize: 20,
          }}
        >
          stredniskoly.cz/regiony
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
