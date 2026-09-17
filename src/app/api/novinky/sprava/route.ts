import { NextRequest, NextResponse } from 'next/server';
import { jeDbNastavena } from '@/lib/novinky-db';
import { odhlasVse, prehledPodlePolozky } from '@/lib/novinky-odber';
import { overToken } from '@/lib/novinky-token';

// ============================================================================
// Správa odběru z odkazu v e-mailu (docs/novinky-k-prijimackam-2027.md, krok 7).
// GET vrátí přehled odběrů, POST s akcí `vse` odhlásí všechny účely.
// ============================================================================

export async function GET(request: NextRequest) {
  if (!jeDbNastavena() || !process.env.NOVINKY_SECRET) {
    return NextResponse.json({ error: 'Odběr novinek není nakonfigurován.' }, { status: 503 });
  }
  const polozkaId = overToken(request.nextUrl.searchParams.get('t') ?? '');
  if (!polozkaId) return NextResponse.json({ error: 'Odkaz vypršel.' }, { status: 400 });

  const prehled = await prehledPodlePolozky(polozkaId);
  if (!prehled) return NextResponse.json({ error: 'Odběr už neexistuje.' }, { status: 404 });
  return NextResponse.json(prehled);
}

export async function POST(request: NextRequest) {
  if (!jeDbNastavena() || !process.env.NOVINKY_SECRET) {
    return NextResponse.json({ error: 'Odběr novinek není nakonfigurován.' }, { status: 503 });
  }
  const polozkaId = overToken(request.nextUrl.searchParams.get('t') ?? '');
  if (!polozkaId) return NextResponse.json({ error: 'Odkaz vypršel.' }, { status: 400 });

  let telo: Record<string, unknown> = {};
  try {
    telo = await request.json();
  } catch {
    // Prázdné tělo znamená odhlášení všeho.
  }
  if (telo.akce !== 'vse') {
    return NextResponse.json({ error: 'Neznámá akce.' }, { status: 400 });
  }
  const ok = await odhlasVse(polozkaId);
  return NextResponse.json({ success: ok });
}
