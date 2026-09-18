import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { jeDbNastavena } from '@/lib/novinky-db';
import { najdiAktivniZadost, potvrd } from '@/lib/novinky-odber';
import { overToken } from '@/lib/novinky-token';
import { jeResendNastaven } from '@/lib/novinky-email';
import { odesliServisni } from '@/lib/novinky-servisni';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';

// ============================================================================
// Potvrzení odběru dvěma kroky (docs/novinky-k-prijimackam-2027.md, kroky 3 a 4).
//
// GET  = obslužná cesta: ověří token, vymění ho za krátkou relaci v cookie
//        HttpOnly a přesměruje na stránku bez tokenu. **Nic nezakládá**, takže
//        robot poštovního systému odběr nevytvoří (RFC 8058).
// POST = teprve tady odběr vzniká, a to jako aktivní krok člověka.
// ============================================================================

const COOKIE = 'novinky_potvrzeni';
const COOKIE_PLATNOST_S = 30 * 60;

/** Relace nese jti a je podepsaná, aby ji nešlo podstrčit. */
function podepisRelaci(jti: string, secret: string): string {
  const exp = Date.now() + COOKIE_PLATNOST_S * 1000;
  const zaklad = `${jti}.${exp}`;
  const podpis = createHmac('sha256', secret).update(zaklad).digest('base64url');
  return `${zaklad}.${podpis}`;
}

function precitRelaci(hodnota: string | undefined, secret: string): string | null {
  if (!hodnota) return null;
  const casti = hodnota.split('.');
  if (casti.length !== 3) return null;
  const [jti, exp, podpis] = casti;
  const ocekavany = createHmac('sha256', secret).update(`${jti}.${exp}`).digest('base64url');
  const a = Buffer.from(podpis);
  const b = Buffer.from(ocekavany);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now()) return null;
  return jti;
}

export async function GET(request: NextRequest) {
  const secret = process.env.NOVINKY_SECRET;
  if (!jeDbNastavena() || !secret) {
    return NextResponse.redirect(new URL('/novinky?stav=nenastaveno', request.url));
  }
  const token = request.nextUrl.searchParams.get('t') ?? '';
  const jti = overToken(token);
  if (!jti) {
    return NextResponse.redirect(new URL('/novinky/potvrzeni?stav=neplatny', request.url));
  }
  const zadost = await najdiAktivniZadost(jti);
  if (!zadost) {
    return NextResponse.redirect(new URL('/novinky/potvrzeni?stav=propadl', request.url));
  }

  // Token z adresy zmizí hned: do analytiky ani do logů nesmí.
  const odpoved = NextResponse.redirect(new URL('/novinky/potvrzeni', request.url));
  odpoved.cookies.set(COOKIE, podepisRelaci(jti, secret), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_PLATNOST_S,
  });
  return odpoved;
}

export async function POST(request: NextRequest) {
  const secret = process.env.NOVINKY_SECRET;
  if (!jeDbNastavena() || !secret) {
    return NextResponse.json({ error: 'Odběr novinek není nakonfigurován.' }, { status: 503 });
  }
  const jti = precitRelaci(request.cookies.get(COOKIE)?.value, secret);
  if (!jti) {
    return NextResponse.json({ error: 'Odkaz vypršel. Přihlas se prosím znovu.' }, { status: 400 });
  }
  // Platnost i vazbu údajů ověřujeme podruhé, ne jen v GET.
  const zadost = await najdiAktivniZadost(jti);
  if (!zadost) {
    return NextResponse.json({ error: 'Odkaz už byl použit nebo propadl.' }, { status: 400 });
  }

  const vysledek = await potvrd(jti);
  const odpoved = vysledek.ok
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: vysledek.duvod ?? 'Potvrzení se nepovedlo.' }, { status: 400 });
  odpoved.cookies.delete(COOKIE);

  if (vysledek.ok && vysledek.uvitaniPolozkaId && vysledek.email && jeResendNastaven()) {
    try {
      // Stejná cesta jako u obsahových zpráv: dávka, rezervace kvóty, hranice
      // předání. Když to hned nevyjde, uvítání dožene odesílač z fronty.
      const rocnik = (await zobrazeneObdobi('msmt-harmonogram')) ?? '';
      await odesliServisni({
        id: vysledek.uvitaniPolozkaId,
        zprava: vysledek.uvitaniZprava ?? 'novinky/uvitani',
        email: vysledek.email,
        ucel: 'uvitani',
        rocnik,
      });
    } catch (chyba) {
      // Fronta uvítání drží; odešle ho nejbližší běh odesílače.
      console.error('✉️ Uvítací e-mail se neodeslal hned:', chyba);
    }
  }
  return odpoved;
}


