import { NextRequest, NextResponse } from 'next/server';
import { jeNasPuvod, zrusRelaci } from '@/lib/portal-relace';

export async function POST(request: NextRequest) {
  // Cizí stránka nesmí uživatele odhlásit (CSRF).
  if (!jeNasPuvod(request)) return new NextResponse('Špatný původ požadavku.', { status: 403 });
  const odpoved = NextResponse.redirect(new URL('/pro-skoly', request.url), 303);
  zrusRelaci(odpoved);
  return odpoved;
}
