import { createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Krátká relace pro odkazy z e-mailu (docs/novinky-k-prijimackam-2027.md, §6).
//
// Token z odkazu opravňuje k odhlášení i ke čtení adresy ve správě odběru,
// takže nesmí zůstat v adrese: Matomo měří celý web a hlášení chyby posílá
// aktuální URL. Obslužná cesta ho proto vymění za podepsanou cookie
// `HttpOnly` a přesměruje na adresu bez tokenu.
// ============================================================================

const PLATNOST_S = 30 * 60;

function tajemstvi(): string {
  const s = process.env.NOVINKY_SECRET;
  if (!s) throw new Error('NOVINKY_SECRET není nastaven');
  return s;
}

function podepis(jmeno: string, hodnota: string, exp: number): string {
  return createHmac('sha256', tajemstvi()).update(`${jmeno}.${hodnota}.${exp}`).digest('base64url');
}

/** Vloží podepsanou relaci do odpovědi. */
export function nastavRelaci(odpoved: NextResponse, jmeno: string, hodnota: string): void {
  const exp = Date.now() + PLATNOST_S * 1000;
  odpoved.cookies.set(jmeno, `${hodnota}.${exp}.${podepis(jmeno, hodnota, exp)}`, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: PLATNOST_S,
  });
}

/** Přečte a ověří relaci; vrací uloženou hodnotu, nebo null. */
export function precitRelaci(request: NextRequest, jmeno: string): string | null {
  const cookie = request.cookies.get(jmeno)?.value;
  if (!cookie) return null;
  const casti = cookie.split('.');
  if (casti.length !== 3) return null;
  const [hodnota, exp, podpis] = casti;
  if (Number(exp) < Date.now()) return null;
  let ocekavany: string;
  try {
    ocekavany = podepis(jmeno, hodnota, Number(exp));
  } catch {
    return null;
  }
  const a = Buffer.from(podpis);
  const b = Buffer.from(ocekavany);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return hodnota;
}

export const COOKIE_ODHLASENI = 'novinky_odhlaseni';
export const COOKIE_SPRAVA = 'novinky_sprava';

export const nastavRelaciOdhlaseni = (odpoved: NextResponse, polozkaId: string) =>
  nastavRelaci(odpoved, COOKIE_ODHLASENI, polozkaId);
export const precitRelaciOdhlaseni = (request: NextRequest) =>
  precitRelaci(request, COOKIE_ODHLASENI);
export const nastavRelaciSpravy = (odpoved: NextResponse, polozkaId: string) =>
  nastavRelaci(odpoved, COOKIE_SPRAVA, polozkaId);
export const precitRelaciSpravy = (request: NextRequest) => precitRelaci(request, COOKIE_SPRAVA);
