import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { adresaPrihlaseni, GITHUB_STAV_COOKIE } from '@/lib/admin-github';
import { nastavKratkouCookie, podepis } from '@/lib/admin-relace';

// Začátek přihlášení přes GitHub (#479): náhodný stav do podepsané cookie
// a přesměrování na GitHub. Stav chrání návrat proti podvrženému kódu.
export async function GET(request: NextRequest) {
  const stav = randomBytes(24).toString('base64url');
  const zpet = new URL('/admin/prihlaseni/github/zpet', request.url).toString();
  let cil: string;
  try {
    cil = adresaPrihlaseni(stav, zpet);
  } catch {
    return NextResponse.redirect(new URL('/admin/prihlaseni?chyba=nenastaveno', request.url), 303);
  }
  const odpoved = NextResponse.redirect(cil, 303);
  try {
    nastavKratkouCookie(odpoved, GITHUB_STAV_COOKIE, podepis('github', stav));
  } catch {
    return NextResponse.redirect(new URL('/admin/prihlaseni?chyba=nenastaveno', request.url), 303);
  }
  return odpoved;
}
