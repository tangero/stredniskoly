import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest, NextResponse } from 'next/server';
import { dotaz, jeDbNastavena, type Spojeni } from './novinky-db.ts';
import { ADMIN_COOKIE, ADMIN_PRODUKCE, PLATNOST_RELACE_MS, PLATNOST_VYZVY_MS, overRelaci, type AdminRelace } from './admin-relace-jadro.ts';

// ============================================================================
// Relace administrace (#479, docs/administrace.md). Nahrazuje token v adrese:
// cookie nese jen náhodný identifikátor, databáze jeho SHA-256 otisk, takže
// ani únik databáze nedává platné cookie. Přihlásit lze passkey nebo účtem
// vlastníka na GitHubu (admin-github.ts, admin-passkey.ts). Jádro bez Next.js
// je v admin-relace-jadro.ts.
// ============================================================================

export * from './admin-relace-jadro.ts';

const cteni: Spojeni = { dotaz };

export function nastavCookie(odpoved: NextResponse, id: string): void {
  odpoved.cookies.set(ADMIN_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin',
    maxAge: Math.floor(PLATNOST_RELACE_MS / 1000),
  });
}

export function smazCookie(odpoved: NextResponse): void {
  odpoved.cookies.set(ADMIN_COOKIE, '', { path: '/admin', maxAge: 0 });
}

/** Přihlášený vlastník ve stránce (server komponenta), jinak null. */
export async function adminZCookies(): Promise<AdminRelace | null> {
  // cookies() nejdřív a mimo try: dělá stránku dynamickou a její výjimku při
  // statickém vykreslení nesmí nic spolknout (jinak by Next stránku předvykreslil).
  const id = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!jeDbNastavena() || !id) return null;
  try {
    return await overRelaci(cteni, id);
  } catch {
    return null;
  }
}

/** Stránka administrace: bez platné relace přesměruje na přihlášení. */
export async function vyzadujAdmina(): Promise<AdminRelace> {
  const relace = await adminZCookies();
  if (!relace) redirect('/admin/prihlaseni');
  return relace;
}

/** Přihlášený vlastník v API route, jinak null. */
export async function adminZPozadavku(request: NextRequest): Promise<AdminRelace | null> {
  if (!jeDbNastavena()) return null;
  try {
    return await overRelaci(cteni, request.cookies.get(ADMIN_COOKIE)?.value);
  } catch {
    return null;
  }
}

/** Ochrana akcí proti CSRF: požadavek musí přijít z tohoto webu. */
export function jeNasPuvod(request: NextRequest): boolean {
  const puvod = request.headers.get('origin');
  if (!puvod) return false;
  const povolene = new Set([ADMIN_PRODUKCE, new URL(request.url).origin]);
  return povolene.has(puvod.replace(/\/$/, ''));
}

export function nastavKratkouCookie(odpoved: NextResponse, jmeno: string, hodnota: string): void {
  odpoved.cookies.set(jmeno, hodnota, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin',
    maxAge: Math.floor(PLATNOST_VYZVY_MS / 1000),
  });
}

export function smazKratkouCookie(odpoved: NextResponse, jmeno: string): void {
  odpoved.cookies.set(jmeno, '', { path: '/admin', maxAge: 0 });
}
