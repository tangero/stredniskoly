import { NextRequest, NextResponse } from 'next/server';
import { jeDbNastavena } from '@/lib/novinky-db';
import { prehledPodlePolozky, spravaProved } from '@/lib/novinky-odber';
import type { AkceSpravy } from '@/lib/novinky-odber';
import { uplnyNazevZRejstriku } from '@/lib/rejstrik-nazev-skoly';
import { overToken } from '@/lib/novinky-token';
import { nastavRelaciSpravy, precitRelaciSpravy } from '@/lib/novinky-relace';

// ============================================================================
// Správa odběru z odkazu v e-mailu (docs/novinky-k-prijimackam-2027.md, krok 7).
// GET vrátí přehled odběrů (termíny a hlídané školy), POST zruší všechno (`vse`),
// termíny (`terminy`), hlídání (`hlidani`) nebo jednu školu (`skola` + `redizo`).
// ============================================================================

/**
 * Vstup z e-mailu: `?t=…` vymění token za krátkou relaci v cookie a přesměruje
 * na stránku **bez tokenu**, aby token neskončil v analytice ani v hlášení
 * chyby. Bez tokenu vrací přehled podle relace.
 */
export async function GET(request: NextRequest) {
  if (!jeDbNastavena() || !process.env.NOVINKY_SECRET) {
    return NextResponse.json({ error: 'Odběr novinek není nakonfigurován.' }, { status: 503 });
  }
  const token = request.nextUrl.searchParams.get('t');
  if (token) {
    const zTokenu = overToken(token);
    const cil = new URL('/novinky/sprava', request.url);
    if (!zTokenu) {
      cil.searchParams.set('stav', 'neplatny');
      return NextResponse.redirect(cil);
    }
    const odpoved = NextResponse.redirect(cil);
    nastavRelaciSpravy(odpoved, zTokenu);
    return odpoved;
  }

  const polozkaId = precitRelaciSpravy(request);
  if (!polozkaId) return NextResponse.json({ error: 'Odkaz vypršel.' }, { status: 400 });

  const prehled = await prehledPodlePolozky(polozkaId, uplnyNazevZRejstriku);
  if (!prehled) return NextResponse.json({ error: 'Odběr už neexistuje.' }, { status: 404 });
  return NextResponse.json(prehled);
}

export async function POST(request: NextRequest) {
  if (!jeDbNastavena() || !process.env.NOVINKY_SECRET) {
    return NextResponse.json({ error: 'Odběr novinek není nakonfigurován.' }, { status: 503 });
  }
  const polozkaId = precitRelaciSpravy(request);
  if (!polozkaId) return NextResponse.json({ error: 'Odkaz vypršel.' }, { status: 400 });

  let telo: Record<string, unknown> = {};
  try {
    telo = await request.json();
  } catch {
    // Prázdné tělo znamená odhlášení všeho.
  }
  let akce: AkceSpravy | null = null;
  if (telo.akce === 'vse' || telo.akce === 'terminy' || telo.akce === 'hlidani') {
    akce = { akce: telo.akce };
  } else if (telo.akce === 'skola' && typeof telo.redizo === 'string' && /^\d{6,10}$/.test(telo.redizo)) {
    akce = { akce: 'skola', redizo: telo.redizo };
  }
  if (!akce) {
    return NextResponse.json({ error: 'Neznámá akce.' }, { status: 400 });
  }
  // Zrušení nikdy nespouští e-mail ani potvrzení (P7); odpověď říká, co zbývá.
  const zbyva = await spravaProved(polozkaId, akce);
  return NextResponse.json({ success: zbyva !== null, zbyva });
}
