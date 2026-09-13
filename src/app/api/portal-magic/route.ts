import { NextRequest, NextResponse } from 'next/server';
import {
  najdiRedizoPodleEmailu,
  magicOdkaz,
  normalizeEmail,
  MAGIC_NEUTRALNI_ODPOVED,
} from '@/lib/portal-magic';
import { getNazevSkoly } from '@/lib/portal-skol';
import { posliMagicLinkEmail } from '@/lib/portal-email';

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
  const redizo = await najdiRedizoPodleEmailu(email);
  if (redizo) {
    const nazev = await getNazevSkoly(redizo);
    const odeslano = await posliMagicLinkEmail({
      email,
      nazevSkoly: nazev || 'vaší školy',
      odkaz: magicOdkaz(redizo),
    });
    console.log(`✉️ Magic link pro REDIZO z rejstříku: ${odeslano ? 'odeslán' : 'selhalo'}`);
  }

  return NextResponse.json(MAGIC_NEUTRALNI_ODPOVED);
}
