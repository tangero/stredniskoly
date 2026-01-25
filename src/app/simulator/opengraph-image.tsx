import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Simulátor přijímacích zkoušek - zadej body a zjisti šance';
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
            🎯
          </div>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 24, fontWeight: 600 }}>
            Simulátor
          </span>
        </div>

        {/* Simulace vstupů */}
        <div
          style={{
            display: 'flex',
            gap: 40,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'white',
              padding: '30px 50px',
              borderRadius: 20,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <span style={{ fontSize: 24, color: '#64748b', marginBottom: 8 }}>Čeština</span>
            <span style={{ fontSize: 72, fontWeight: 800, color: '#667eea' }}>42</span>
            <span style={{ fontSize: 18, color: '#94a3b8' }}>bodů z 50</span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'white',
              padding: '30px 50px',
              borderRadius: 20,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <span style={{ fontSize: 24, color: '#64748b', marginBottom: 8 }}>Matematika</span>
            <span style={{ fontSize: 72, fontWeight: 800, color: '#764ba2' }}>38</span>
            <span style={{ fontSize: 18, color: '#94a3b8' }}>bodů z 50</span>
          </div>
        </div>

        {/* Výsledek */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.15)',
            padding: '25px 60px',
            borderRadius: 20,
          }}
        >
          <span style={{ fontSize: 28, color: 'rgba(255,255,255,0.8)' }}>Celkové skóre</span>
          <span style={{ fontSize: 80, fontWeight: 800, color: 'white' }}>160</span>
          <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.7)' }}>z 200 možných bodů</span>
        </div>

        {/* Hlavní text */}
        <h1
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: 'white',
            margin: '40px 0 0 0',
            textAlign: 'center',
          }}
        >
          Zadej své body a zjisti šance na přijetí
        </h1>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            color: 'rgba(255,255,255,0.6)',
            fontSize: 20,
          }}
        >
          stredniskoly.cz/simulator
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
