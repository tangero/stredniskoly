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
            🎯
          </div>
          <span style={{ color: '#28313b', fontSize: 24, fontWeight: 600 }}>
            Simulátor přijímaček
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
              border: '2px solid #e0e6ed',
              padding: '30px 50px',
              borderRadius: 20,
            }}
          >
            <span style={{ fontSize: 24, color: '#818c99', marginBottom: 8 }}>Čeština</span>
            <span style={{ fontSize: 72, fontWeight: 800, color: '#0074e4' }}>42</span>
            <span style={{ fontSize: 18, color: '#818c99' }}>bodů z 50</span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              border: '2px solid #e0e6ed',
              padding: '30px 50px',
              borderRadius: 20,
            }}
          >
            <span style={{ fontSize: 24, color: '#818c99', marginBottom: 8 }}>Matematika</span>
            <span style={{ fontSize: 72, fontWeight: 800, color: '#003688' }}>38</span>
            <span style={{ fontSize: 18, color: '#818c99' }}>bodů z 50</span>
          </div>
        </div>

        {/* Výsledek */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: '#f2f5f7',
            padding: '25px 60px',
            borderRadius: 20,
          }}
        >
          <span style={{ fontSize: 28, color: '#818c99' }}>Celkové skóre</span>
          <span style={{ fontSize: 80, fontWeight: 800, color: '#0074e4' }}>160</span>
          <span style={{ fontSize: 22, color: '#818c99' }}>z 200 možných bodů</span>
        </div>

        {/* Hlavní text */}
        <h1
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: '#28313b',
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
            color: '#818c99',
            fontSize: 20,
          }}
        >
          prijimackynaskolu.cz/simulator
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
