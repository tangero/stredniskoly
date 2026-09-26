import { timingSafeEqual } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { ipZPozadavku, jeOmezeno } from './portal-api';
import { jeDbNastavena } from './novinky-db';

// ============================================================================
// Společné pro API veletrhů (docs/veletrhy-api-2027.md, oddíly 4 a 9).
//
// Token Eduardy (`VELETRHY_EDA_TOKEN`) umí jen číst a navrhovat. Schvalovat
// neumí: schválení jde podepsaným odkazem z e-mailu, nebo přes /admin.
// Chybějící token znamená, že API nic nepovolí.
// ============================================================================

const HODINA = 60 * 60 * 1000;

/** Timing-safe porovnání s nastaveným tajemstvím; bez něj vždy false. */
export function jeTokenPlatny(dodany: string, ocekavany: string | undefined): boolean {
  if (!ocekavany || !dodany) return false;
  const a = Buffer.from(dodany);
  const b = Buffer.from(ocekavany);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function chyba(status: number, error: string, extra: Record<string, unknown> = {}, headers?: HeadersInit) {
  return NextResponse.json({ error, ...extra }, { status, headers });
}

/**
 * Ověří token Eduardy a limity. Vrací odpověď s chybou, nebo null, když
 * požadavek smí pokračovat. `druh` rozlišuje limit čtení a zakládání.
 */
export function overEdu(request: NextRequest, druh: 'cteni' | 'navrh'): NextResponse | null {
  const ip = ipZPozadavku(request.headers);
  const dodany = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jeTokenPlatny(dodany, process.env.VELETRHY_EDA_TOKEN)) {
    // Neplatný token: 10 pokusů za 15 minut na IP, pak 429.
    if (jeOmezeno(`veletrhy-token:${ip}`, 10, 15 * 60 * 1000)) {
      return chyba(429, 'Příliš mnoho neplatných pokusů.', {}, { 'Retry-After': '900' });
    }
    return chyba(401, 'Neautorizováno.');
  }
  const [max, klic] = druh === 'navrh' ? [30, 'veletrhy-navrh'] : [300, 'veletrhy-cteni'];
  if (jeOmezeno(klic, max, HODINA)) {
    return chyba(429, 'Překročen hodinový limit.', {}, { 'Retry-After': '3600' });
  }
  if (!jeDbNastavena()) return chyba(503, 'DATABASE_URL není nastavený.');
  return null;
}
