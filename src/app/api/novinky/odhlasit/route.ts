import { NextRequest, NextResponse } from 'next/server';
import { jeDbNastavena } from '@/lib/novinky-db';
import { odhlas } from '@/lib/novinky-odber';
import { overToken } from '@/lib/novinky-token';
import { nastavRelaciOdhlaseni, precitRelaciOdhlaseni } from '@/lib/novinky-relace';

// ============================================================================
// Odhlášení jedním kliknutím podle RFC 8058
// (docs/novinky-k-prijimackam-2027.md, krok 7).
//
// POST bez cookies a bez přesměrování ruší odběr té zprávy, ze které odkaz
// vede. GET nic neruší, jen ukáže stránku — jinak by odběr zrušil skener,
// který si odkazy v e-mailu automaticky načítá.
// ============================================================================

export async function POST(request: NextRequest) {
  if (!jeDbNastavena() || !process.env.NOVINKY_SECRET) {
    return NextResponse.json({ error: 'Odběr novinek není nakonfigurován.' }, { status: 503 });
  }
  // Relace z cookie (běžné kliknutí na stránce), jinak token z adresy: tak
  // přichází odhlášení jedním kliknutím z poštovního klienta.
  const polozkaId = precitRelaciOdhlaseni(request) ?? overToken(request.nextUrl.searchParams.get('t') ?? '');
  if (!polozkaId) {
    // Neplatný odkaz **nesmí tvrdit, že odhlášení proběhlo**: tiché selhání
    // práva odhlásit se je horší než chybová odpověď.
    return NextResponse.json(
      { error: 'Odkaz už neplatí. Odhlásit se jde ve správě odběru z novějšího e-mailu.' },
      { status: 400 },
    );
  }
  try {
    const vysledek = await odhlas(polozkaId);
    console.log(`✉️ Odhlášení: ${vysledek.ok ? 'provedeno' : 'odkaz neplatí'}, zahozeno ${vysledek.zahozeno}`);
  } catch (chyba) {
    console.error('❌ Odhlášení selhalo:', chyba);
    return NextResponse.json({ error: 'Zkus to prosím za chvíli.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

/**
 * Ruční kliknutí v e-mailu: token se vymění za krátkou relaci v cookie a
 * adresa se přesměruje **bez tokenu**. Token opravňuje k odhlášení i ke čtení
 * adresy ve správě, takže nesmí skončit v Matomu ani v hlášení chyby.
 * Stránka sama nic nemění; odhlášení potvrzuje člověk až tlačítkem.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t') ?? '';
  const polozkaId = overToken(token);
  const cil = new URL('/novinky/odhlaseni', request.url);
  if (!polozkaId) {
    cil.searchParams.set('stav', 'neplatny');
    return NextResponse.redirect(cil);
  }
  const odpoved = NextResponse.redirect(cil);
  nastavRelaciOdhlaseni(odpoved, polozkaId);
  return odpoved;
}
