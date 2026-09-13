import { NextRequest, NextResponse } from 'next/server';
import { overAdminToken } from '@/lib/admin';

// Vstupní bod pro /admin: ověří token z URL, nastaví HttpOnly cookie
// a přesměruje na čisté /admin. Token se tak nikdy neobjeví ve vyrenderovaném
// HTML (Next.js jinak do RSC payloadu vypisuje URL požadavku včetně query).
// Špatný/chybějící token → 404, stránka neprozrazuje svou existenci.

const COOKIE_NAME = 'admin_token';
const COOKIE_MAX_AGE_S = 12 * 60 * 60; // 12 hodin

export async function GET(request: NextRequest) {
  const k = request.nextUrl.searchParams.get('k');

  if (!overAdminToken(k)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const response = NextResponse.redirect(new URL('/admin', request.url), 303);
  response.cookies.set(COOKIE_NAME, k!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_S,
    path: '/admin',
  });
  return response;
}
