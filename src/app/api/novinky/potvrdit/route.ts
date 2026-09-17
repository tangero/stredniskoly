import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { jeDbNastavena, dotaz } from '@/lib/novinky-db';
import { najdiAktivniZadost, potvrd } from '@/lib/novinky-odber';
import { overToken, vytvorToken, odhlasovaciOdkaz, VYZVA_PLATNOST_MS } from '@/lib/novinky-token';
import { odesliDavku, sestavTeloDavky, jeResendNastaven } from '@/lib/novinky-email';
import { uvitaciEmail } from '@/lib/novinky-sablony';
import type { DruhStudia } from '@/lib/novinky-token';
import calendar from '@/data/admissions-2027.json';

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
    ? NextResponse.json({ success: true, rocnik: vysledek.rocnik })
    : NextResponse.json({ error: vysledek.duvod ?? 'Potvrzení se nepovedlo.' }, { status: 400 });
  odpoved.cookies.delete(COOKIE);

  if (vysledek.ok && vysledek.uvitaniPolozkaId && vysledek.email && jeResendNastaven()) {
    try {
      await posliUvitani({
        polozkaId: vysledek.uvitaniPolozkaId,
        email: vysledek.email,
        rocnik: vysledek.rocnik ?? zadost.volby.rocnik,
        druhy: zadost.volby.druhy,
      });
    } catch (chyba) {
      // Fronta uvítání drží; odešle ho nejbližší běh odesílače.
      console.error('✉️ Uvítací e-mail se neodeslal hned:', chyba);
    }
  }
  return odpoved;
}

/** Uvítání se posílá hned po potvrzení; položka ve frontě je záloha. */
async function posliUvitani(para: {
  polozkaId: string;
  email: string;
  rocnik: string;
  druhy: DruhStudia[];
}): Promise<void> {
  const token = vytvorToken(para.polozkaId, VYZVA_PLATNOST_MS);
  const sablona = uvitaciEmail({
    rocnik: para.rocnik,
    druhy: para.druhy,
    terminy: nejblizsiTerminy(para.druhy),
    spravaOdkaz: `https://www.prijimackynaskolu.cz/novinky/sprava?t=${encodeURIComponent(token)}`,
    odhlasitOdkaz: odhlasovaciOdkaz(token),
  });
  const telo = sestavTeloDavky([
    { polozkaId: para.polozkaId, email: para.email, ...sablona, odhlasovaciToken: token },
  ]);
  const odeslano = await odesliDavku(telo, `uvitani/${para.polozkaId}`);
  if (odeslano.ok) {
    await dotaz(
      `update polozka_odeslani
          set stav = 'odeslana', odeslano = now(), predano_v = now(), resend_id = $2
        where id = $1`,
      [para.polozkaId, odeslano.idEmailu[0] ?? null],
    );
  }
}

/**
 * Nejbližší termíny z kalendáře MŠMT. Letopočet se nikde nepíše napevno,
 * bere se ze souboru kalendáře.
 */
function nejblizsiTerminy(druhy: DruhStudia[]): Array<{ nazev: string; datum: string }> {
  const dnes = new Date().toISOString().slice(0, 10);
  const skupiny = calendar.groups.filter((g) =>
    druhy.includes('ss') || druhy.includes('vicelete') ? g.id !== 'konzervatore' : true,
  );
  const udalosti = skupiny
    .flatMap((g) => g.events)
    .filter((e) => (e.end ?? e.start) >= dnes)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 6);
  return udalosti.map((e) => ({ nazev: e.title, datum: e.date }));
}
