import { NextRequest, NextResponse } from 'next/server';
import { jeDbNastavena } from '@/lib/novinky-db';
import { odhlas } from '@/lib/novinky-odber';
import { overToken } from '@/lib/novinky-token';

// ============================================================================
// Odhlášení jedním kliknutím podle RFC 8058
// (docs/novinky-k-prijimackam-2027.md, krok 7).
//
// POST bez cookies a bez přesměrování ruší odběr té zprávy, ze které odkaz
// vede. GET nic neruší, jen ukáže stránku — jinak by odběr zrušil skener,
// který si odkazy v e-mailu automaticky načítá.
// ============================================================================

export async function POST(request: NextRequest) {
  if (!jeDbNastavena() || !process.env.NOVINKY_SECRET) {
    return NextResponse.json({ error: 'Odběr novinek není nakonfigurován.' }, { status: 503 });
  }
  const token = request.nextUrl.searchParams.get('t') ?? '';
  const polozkaId = overToken(token);
  if (!polozkaId) {
    // Odhlašovací odkaz nesmí vracet 500 ani nic prozrazovat.
    return NextResponse.json({ success: true });
  }
  try {
    const vysledek = await odhlas(polozkaId);
    console.log(`✉️ Odhlášení: ${vysledek.ok ? 'provedeno' : 'odkaz neplatí'}, zahozeno ${vysledek.zahozeno}`);
  } catch (chyba) {
    console.error('❌ Odhlášení selhalo:', chyba);
    return NextResponse.json({ error: 'Zkus to prosím za chvíli.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

/** Ruční kliknutí v e-mailu: stránka s potvrzením, žádná změna stavu. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t') ?? '';
  const cil = new URL('/novinky/odhlaseni', request.url);
  if (token) cil.searchParams.set('t', token);
  return NextResponse.redirect(cil);
}
