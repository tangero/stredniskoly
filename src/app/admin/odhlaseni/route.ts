import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminZPozadavku, jeNasPuvod, smazCookie, zapisUdalost, zrusRelaci, zrusVsechnyRelace } from '@/lib/admin-relace';
import { dotaz } from '@/lib/novinky-db';

// Odhlášení (#479): formulář s polem `vse=1` odhlásí všechna zařízení.
export async function POST(request: NextRequest) {
  const relace = await adminZPozadavku(request);
  if (!relace) return NextResponse.redirect(new URL('/admin/prihlaseni', request.url), 303);
  if (!jeNasPuvod(request)) return new NextResponse('Špatný původ požadavku.', { status: 403 });
  const vse = String((await request.formData().catch(() => null))?.get('vse') ?? '') === '1';
  const s = { dotaz };
  if (vse) await zrusVsechnyRelace(s);
  else await zrusRelaci(s, request.cookies.get(ADMIN_COOKIE)?.value ?? '');
  await zapisUdalost(s, vse ? 'odhlaseni_vse' : 'odhlaseni', relace.zpusob);
  const o = NextResponse.redirect(new URL('/admin/prihlaseni?odhlaseno=1', request.url), 303);
  smazCookie(o);
  return o;
}
