import { NextRequest, NextResponse } from 'next/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { moznostiRegistrace, strana, ulozRegistraci, VYZVA_COOKIE, zrusPasskey } from '@/lib/admin-passkey';
import { adminZPozadavku, jeNasPuvod, nastavKratkouCookie, overPodpis, podepis, smazKratkouCookie } from '@/lib/admin-relace';
import { dotaz } from '@/lib/novinky-db';

// Správa passkey přihlášeným vlastníkem (#479): registrace (moznosti, ulozit) a zrušení.
export async function POST(request: NextRequest) {
  if (!(await adminZPozadavku(request))) return NextResponse.json({ chyba: 'Nejsi přihlášený.' }, { status: 401 });
  if (!jeNasPuvod(request)) return NextResponse.json({ chyba: 'Špatný původ požadavku.' }, { status: 403 });
  const telo = (await request.json().catch(() => ({}))) as { krok?: string; odpoved?: RegistrationResponseJSON; nazev?: string; id?: string };
  const s = { dotaz };
  const { rpID, origin } = strana(request.url);
  try {
    if (telo.krok === 'moznosti') {
      const moznosti = await moznostiRegistrace(s, rpID);
      const o = NextResponse.json(moznosti);
      nastavKratkouCookie(o, VYZVA_COOKIE, podepis('passkey-registrace', moznosti.challenge));
      return o;
    }
    if (telo.krok === 'ulozit' && telo.odpoved) {
      const vyzva = overPodpis('passkey-registrace', request.cookies.get(VYZVA_COOKIE)?.value);
      if (!vyzva) return NextResponse.json({ chyba: 'Výzva vypršela, zkus to znovu.' }, { status: 400 });
      await ulozRegistraci(s, telo.odpoved, { vyzva, rpID, origin, nazev: String(telo.nazev ?? '') });
      const o = NextResponse.json({ ok: true });
      smazKratkouCookie(o, VYZVA_COOKIE);
      return o;
    }
    if (telo.krok === 'zrusit' && typeof telo.id === 'string') {
      return NextResponse.json({ ok: await zrusPasskey(s, telo.id) });
    }
  } catch {
    return NextResponse.json({ chyba: 'Passkey se nepodařilo uložit.' }, { status: 400 });
  }
  return NextResponse.json({ chyba: 'Neplatný požadavek.' }, { status: 400 });
}
