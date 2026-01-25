import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Simulátor přijímacích zkoušek na střední školy';
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
        {/* Dekorativní elementy */}
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
            🎓
          </div>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 24, fontWeight: 600 }}>
            stredniskoly.cz
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
              fontSize: 72,
              fontWeight: 800,
              color: 'white',
              margin: 0,
              lineHeight: 1.1,
              textShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            Simulátor přijímaček
          </h1>
          <h2
            style={{
              fontSize: 36,
              fontWeight: 400,
              color: 'rgba(255,255,255,0.9)',
              margin: '20px 0 0 0',
            }}
          >
            Zjisti své šance na přijetí na střední školu
          </h2>
        </div>

        {/* Statistiky */}
        <div
          style={{
            display: 'flex',
            gap: 60,
            marginTop: 50,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.15)',
              padding: '20px 40px',
              borderRadius: 16,
            }}
          >
            <span style={{ fontSize: 48, fontWeight: 800, color: 'white' }}>2 200+</span>
            <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)' }}>oborů</span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.15)',
              padding: '20px 40px',
              borderRadius: 16,
            }}
          >
            <span style={{ fontSize: 48, fontWeight: 800, color: 'white' }}>14</span>
            <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)' }}>krajů ČR</span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.15)',
              padding: '20px 40px',
              borderRadius: 16,
            }}
          >
            <span style={{ fontSize: 48, fontWeight: 800, color: 'white' }}>2025</span>
            <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)' }}>aktuální data</span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'rgba(255,255,255,0.7)',
            fontSize: 18,
          }}
        >
          <span>Zadej body z ČJ a MA</span>
          <span style={{ margin: '0 8px' }}>→</span>
          <span>Vyber školy</span>
          <span style={{ margin: '0 8px' }}>→</span>
          <span>Zjisti šance</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
