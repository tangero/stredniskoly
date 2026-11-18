import { NextRequest, NextResponse } from 'next/server';
import { jeDbNastavena } from '@/lib/novinky-db';
import { platneRedizo, prihlasHlidani, SOUHLAS_VERZE, ZPRAVA_POTVRZENI_HLIDANI } from '@/lib/novinky-odber';
import { jeEmailPlatny, normalizujEmail, PRIHLASENI_NEUTRALNI_ODPOVED, jeRezervovanaDomena } from '@/lib/novinky-token';
import { jeResendNastaven } from '@/lib/novinky-email';
import { odesliServisni } from '@/lib/novinky-servisni';
import { urciZdroj } from '@/lib/novinky-zdroje';
import { jeHlidaniZapnuto } from '@/lib/novinky-hlidani-zapnuto';

// ============================================================================
// Přihlášení k hlídání škol (zadání #523, E6; docs/sledovani-skol-2027.md).
//
// Stejně jako přihlášení k termínům: odpověď je vždy stejná, potvrzení má dva
// kroky a do potvrzení se drží jen žádost. Žádost nese seznam škol (RED IZO).
// Hlídání musí být zapnuté (`HLIDANI_ZAPNUTO=1`), až v produkci běží migrace 012.
// ============================================================================

export async function POST(request: NextRequest) {
  if (!jeHlidaniZapnuto() || !jeDbNastavena() || !jeResendNastaven() || !process.env.NOVINKY_SECRET) {
    return NextResponse.json({ error: 'Hlídání škol není zapnuté.' }, { status: 503 });
  }

  let telo: Record<string, unknown>;
  try {
    telo = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 });
  }

  // Skryté pole: vyplněné znamená robota. Odpověď je stejná jako při úspěchu.
  if (typeof telo.website === 'string' && telo.website.length > 0) {
    return NextResponse.json(PRIHLASENI_NEUTRALNI_ODPOVED);
  }

  const email = normalizujEmail(typeof telo.email === 'string' ? telo.email : '');
  if (!jeEmailPlatny(email)) {
    return NextResponse.json({ error: 'Zadej prosím platnou e-mailovou adresu.' }, { status: 400 });
  }
  if (jeRezervovanaDomena(email)) {
    return NextResponse.json(
      { error: 'Testovací domény jako example.com poštovní služba odmítá. Zadej prosím skutečnou adresu.' },
      { status: 400 },
    );
  }
  if (telo.souhlas !== true) {
    return NextResponse.json(
      { error: 'Bez souhlasu hlídání nezaložíme. Zaškrtni prosím potvrzení.' },
      { status: 400 },
    );
  }
  const skoly = platneRedizo(telo.skoly);
  if (!skoly.length) {
    return NextResponse.json({ error: 'Vyber prosím aspoň jednu školu.' }, { status: 400 });
  }

  const zdroj = urciZdroj(telo.zdroj);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'neznama';

  try {
    const vysledek = await prihlasHlidani({ email, zdroj, ip, skoly });
    if (vysledek.poslat && vysledek.jti && vysledek.polozkaId) {
      // Stejná cesta jako potvrzení termínů: dávka, rezervace kvóty, hranice předání.
      const poslano = await odesliServisni({
        id: vysledek.polozkaId,
        zprava: ZPRAVA_POTVRZENI_HLIDANI,
        email,
        ucel: 'potvrzeni',
        rocnik: '',
        jti: vysledek.jti,
        skol: skoly.length,
      });
      if (!poslano.odeslano) {
        console.error(`✉️ Potvrzení hlídání neodešlo hned (${poslano.duvod ?? '?'}), zůstává ve frontě.`);
      }
    } else {
      console.log(`✉️ Potvrzení hlídání se neposílá (${vysledek.duvod ?? 'limit'}).`);
    }
  } catch (chyba) {
    console.error('❌ Žádost o hlídání selhala:', chyba);
    return NextResponse.json({ error: 'Zkus to prosím za chvíli.' }, { status: 500 });
  }

  return NextResponse.json({ ...PRIHLASENI_NEUTRALNI_ODPOVED, souhlasVerze: SOUHLAS_VERZE });
}
