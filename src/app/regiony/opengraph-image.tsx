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
          backgroundColor: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Header bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            backgroundColor: '#0074e4',
          }}
        />

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
              backgroundColor: '#0074e4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              color: 'white',
              fontWeight: 700,
            }}
          >
            🗺️
          </div>
          <span style={{ color: '#28313b', fontSize: 24, fontWeight: 600 }}>
            prijimackynaskolu.cz
          </span>
        </div>

        {/* Hlavní text */}
        <h1
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: '#28313b',
            margin: 0,
            textAlign: 'center',
          }}
        >
          Střední školy podle krajů
        </h1>
        <p
          style={{
            fontSize: 32,
            color: '#818c99',
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
                border: '2px solid #e0e6ed',
                padding: '12px 20px',
                borderRadius: 12,
                fontSize: 18,
                color: '#28313b',
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
            color: '#818c99',
            fontSize: 20,
          }}
        >
          prijimackynaskolu.cz/regiony
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
