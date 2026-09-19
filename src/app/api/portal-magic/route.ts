import { NextRequest, NextResponse } from 'next/server';
import {
  najdiVsechnaRedizoPodleEmailu,
  magicOdkaz,
  normalizeEmail,
  vytvorToken,
  portalBaseUrl,
  MAGIC_NEUTRALNI_ODPOVED,
} from '@/lib/portal-magic';
import { getNazevSkoly } from '@/lib/portal-skol';
import { posliOdkazyEmail, type OdkazSkoly } from '@/lib/portal-email';
import { jeDbNastavena } from '@/lib/novinky-db';
import { cteni } from '@/lib/portal-relace';
import { osobyPodleEmailu, platneRoleOsoby, spravceSkoly, zapisUdalost } from '@/lib/portal-ucty';

// In-memory rate limiting: 5 požadavků za 15 minut na IP, 3 na e-mail
// (stejný vzor jako src/app/api/bug-report/route.ts)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(identifier: string, max = RATE_LIMIT_MAX): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(identifier) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  rateLimitMap.set(identifier, recent);

  if (recent.length >= max) {
    return true;
  }

  recent.push(now);
  rateLimitMap.set(identifier, recent);
  return false;
}

export async function POST(request: NextRequest) {
  // Bez obou klíčů portál není nakonfigurován (vzor GITHUB_TOKEN v bug-report)
  if (!process.env.RESEND_API_KEY || !process.env.PORTAL_MAGIC_SECRET) {
    return NextResponse.json(
      { error: 'Portál pro školy není nakonfigurován.' },
      { status: 503 },
    );
  }

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Příliš mnoho požadavků. Zkuste to prosím za chvíli.' },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const email = normalizeEmail(typeof body.email === 'string' ? body.email : '');
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Zadejte platnou e-mailovou adresu.' }, { status: 400 });
  }

  if (isRateLimited(`email:${email}`, 3)) {
    return NextResponse.json(
      { error: 'Příliš mnoho požadavků z této adresy. Zkuste to prosím později.' },
      { status: 429 },
    );
  }

  // Odpověď je vždy stejná, ať adresu známe, nebo ne (žádná enumerace)
  try {
    const polozky = await odkazyProEmail(email);
    if (polozky.length > 0) {
      const odeslano = await posliOdkazyEmail(email, polozky);
      console.log(`✉️ Odkazy do portálu (${polozky.length}): ${odeslano ? 'odeslány' : 'selhalo'}`);
    }
  } catch (e) {
    // Chyba databáze nesmí prozradit, zda adresu známe.
    console.error('❌ Portál: sestavení odkazů selhalo:', e);
  }

  return NextResponse.json(MAGIC_NEUTRALNI_ODPOVED);
}

/**
 * Co pošleme na zadanou adresu (docs/ucty-portalu-skol-2027.md, oddíl 2.2):
 * osobě s účtem přihlašovací odkaz, rejstříkové adrese vstup za každou její
 * školu (sdílená adresa = víc škol), kromě škol, kde už tatáž osoba roli má.
 */
async function odkazyProEmail(email: string): Promise<OdkazSkoly[]> {
  const polozky: OdkazSkoly[] = [];
  const skolyOsoby = new Set<string>();
  const base = portalBaseUrl();

  if (jeDbNastavena()) {
    for (const osobaId of await osobyPodleEmailu(cteni, email)) {
      const role = await platneRoleOsoby(cteni, osobaId);
      if (role.length === 0) continue;
      role.forEach((r) => skolyOsoby.add(r.redizo));
      const nazvy = await Promise.all(role.map((r) => getNazevSkoly(r.redizo)));
      polozky.push({
        nazevSkoly: nazvy.map((n, i) => n || role[i].redizo).join(', '),
        odkaz: `${base}/pro-skoly/prihlaseni/${vytvorToken('prihlaseni', { osoba_id: osobaId })}`,
        popis: 'Přihlášení do profilu, který spravujete',
      });
    }
  }

  for (const redizo of await najdiVsechnaRedizoPodleEmailu(email)) {
    if (skolyOsoby.has(redizo)) continue;
    const spravce = jeDbNastavena() ? await spravceSkoly(cteni, redizo) : null;
    polozky.push({
      nazevSkoly: (await getNazevSkoly(redizo)) || 'vaše škola',
      odkaz: magicOdkaz(redizo),
      popis: spravce
        ? 'Profil školy už má správce; návrh úprav můžete poslat i tak'
        : 'Založení profilu školy, kterou budete spravovat',
    });
    if (jeDbNastavena()) await zapisUdalost(cteni, redizo, null, 'odkaz_vyzadan', { rejstrik: true });
  }
  return polozky;
}
