import { ImageResponse } from 'next/og';

// Bez 'edge' runtime: edge wrapper Next.js 16 selhává na chybějícím
// NEXT_DEPLOYMENT_ID a vrací 500, takže odkazy sdílené na sítích
// zůstávaly bez náhledového obrázku. Výchozí runtime generuje obrázek stejně.

export const alt = 'Vyhledávání středních škol, přijímačky a dojíždění';
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
            🎓
          </div>
          <span style={{ color: '#28313b', fontSize: 24, fontWeight: 600 }}>
            prijimackynaskolu.cz
          </span>
        </div>

        {/* Hlavní obsah */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '0 80px',
          }}
        >
          <h1
            style={{
              fontSize: 68,
              fontWeight: 800,
              color: '#28313b',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Najdi si svou střední školu
          </h1>
          <h2
            style={{
              fontSize: 34,
              fontWeight: 400,
              color: '#818c99',
              margin: '20px 0 0 0',
            }}
          >
            Vyhledávání škol, přijímačky i dojíždění na jednom místě
          </h2>
        </div>

        {/* Statistiky */}
        <div
          style={{
            display: 'flex',
            gap: 40,
            marginTop: 50,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              border: '2px solid #e0e6ed',
              padding: '20px 40px',
              borderRadius: 16,
            }}
          >
            <span style={{ fontSize: 48, fontWeight: 800, color: '#0074e4' }}>2 200+</span>
            <span style={{ fontSize: 18, color: '#818c99' }}>oborů</span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              border: '2px solid #e0e6ed',
              padding: '20px 40px',
              borderRadius: 16,
            }}
          >
            <span style={{ fontSize: 48, fontWeight: 800, color: '#0074e4' }}>14</span>
            <span style={{ fontSize: 18, color: '#818c99' }}>krajů ČR</span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              border: '2px solid #e0e6ed',
              padding: '20px 40px',
              borderRadius: 16,
            }}
          >
            <span style={{ fontSize: 48, fontWeight: 800, color: '#0074e4' }}>2025</span>
            <span style={{ fontSize: 18, color: '#818c99' }}>aktuální data</span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            color: '#818c99',
            fontSize: 18,
          }}
        >
          <span style={{ color: '#0074e4', fontWeight: 600 }}>Simulátor</span>
          <span>·</span>
          <span style={{ color: '#0074e4', fontWeight: 600 }}>Vyhledávání škol</span>
          <span>·</span>
          <span style={{ color: '#0074e4', fontWeight: 600 }}>Dostupnost a dojíždění</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
