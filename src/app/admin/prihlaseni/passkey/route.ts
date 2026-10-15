import { NextRequest, NextResponse } from 'next/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { moznostiPrihlaseni, overPrihlaseni, strana, VYZVA_COOKIE } from '@/lib/admin-passkey';
import { jeNasPuvod, nastavCookie, nastavKratkouCookie, overPodpis, podepis, smazKratkouCookie, zalozRelaci, zapisUdalost } from '@/lib/admin-relace';
import { dotaz, jeDbNastavena } from '@/lib/novinky-db';

// Přihlášení passkey (#479). Krok „moznosti“ vydá výzvu (podepsaná cookie,
// 10 minut), krok „overit“ ověří podpis výzvy a založí relaci.
export async function POST(request: NextRequest) {
  if (!jeNasPuvod(request)) return NextResponse.json({ chyba: 'Špatný původ požadavku.' }, { status: 403 });
  if (!jeDbNastavena()) return NextResponse.json({ chyba: 'Administrace nemá databázi.' }, { status: 503 });
  const telo = (await request.json().catch(() => ({}))) as { krok?: string; odpoved?: AuthenticationResponseJSON };
  const s = { dotaz };
  const { rpID, origin } = strana(request.url);

  if (telo.krok === 'moznosti') {
    try {
      const moznosti = await moznostiPrihlaseni(s, rpID);
      if (!moznosti.allowCredentials?.length) return NextResponse.json({ chyba: 'Zatím není registrovaný žádný passkey. Přihlas se přes GitHub a passkey přidej v Zabezpečení.' }, { status: 409 });
      const o = NextResponse.json(moznosti);
      nastavKratkouCookie(o, VYZVA_COOKIE, podepis('passkey-prihlaseni', moznosti.challenge));
      return o;
    } catch {
      return NextResponse.json({ chyba: 'Přihlášení passkey teď nejde připravit.' }, { status: 503 });
    }
  }

  if (telo.krok === 'overit' && telo.odpoved) {
    const vyzva = overPodpis('passkey-prihlaseni', request.cookies.get(VYZVA_COOKIE)?.value);
    if (!vyzva) return NextResponse.json({ chyba: 'Výzva vypršela, zkus to znovu.' }, { status: 400 });
    try {
      const passkeyId = await overPrihlaseni(s, telo.odpoved, { vyzva, rpID, origin });
      const id = await zalozRelaci(s, { zpusob: 'passkey', passkeyId });
      const o = NextResponse.json({ ok: true });
      smazKratkouCookie(o, VYZVA_COOKIE);
      nastavCookie(o, id);
      return o;
    } catch {
      await zapisUdalost(s, 'odmitnuto', 'passkey', {}).catch(() => {});
      return NextResponse.json({ chyba: 'Passkey se nepodařilo ověřit.' }, { status: 401 });
    }
  }
  return NextResponse.json({ chyba: 'Neplatný požadavek.' }, { status: 400 });
}
