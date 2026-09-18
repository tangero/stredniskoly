import { NextRequest, NextResponse } from 'next/server';
import { jeDbNastavena } from '@/lib/novinky-db';
import { prihlas, SOUHLAS_VERZE } from '@/lib/novinky-odber';
import { jeEmailPlatny, normalizujEmail, PRIHLASENI_NEUTRALNI_ODPOVED, jeRezervovanaDomena } from '@/lib/novinky-token';
import { jeResendNastaven } from '@/lib/novinky-email';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import { odesliServisni } from '@/lib/novinky-servisni';

// ============================================================================
// Přihlášení k odběru novinek (docs/novinky-k-prijimackam-2027.md, krok 1).
//
// Odpověď je **vždy stejná**, ať adresu známe, nebo ne, a ať se e-mail odeslal,
// nebo narazil na limit. Jinak by formulář prozradil, kdo odběr má.
//
// Potvrzovací e-mail se posílá hned v tomto požadavku; fronta je záloha, když
// se odeslání nepovede (cílová doba doručení je do minuty).
// ============================================================================

const POVOLENE_ZDROJE = [
  'titulka-karta',
  'titulka-pas',
  'paticka',
  'kalendar',
  'novinky',
  'simulator',
  'pruvodce',
  'skola',
];

export async function POST(request: NextRequest) {
  if (!jeDbNastavena() || !jeResendNastaven() || !process.env.NOVINKY_SECRET) {
    return NextResponse.json({ error: 'Odběr novinek není nakonfigurován.' }, { status: 503 });
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
      { error: 'Bez souhlasu odběr nezaložíme. Zaškrtni prosím potvrzení.' },
      { status: 400 },
    );
  }

  const zdroj = typeof telo.zdroj === 'string' && POVOLENE_ZDROJE.includes(telo.zdroj) ? telo.zdroj : 'neznamy';
  // Ročník se bere z registru, ne z formuláře: odběr je jeden a běží dál.
  const rocnik = (await zobrazeneObdobi('msmt-harmonogram')) ?? '';
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'neznama';

  try {
    const vysledek = await prihlas({ email, zdroj, ip });

    if (vysledek.poslat && vysledek.jti && vysledek.polozkaId) {
      // Odesílá se hned, ale **stejnou cestou jako obsahové zprávy**: dávka,
      // rezervace kvóty, hranice předání. Jinak by formulář obcházel strop
      // a rezervu pro portál. Když to hned nevyjde, položka zůstane ve frontě
      // a doveze ji odesílač (dovezServisni).
      const poslano = await odesliServisni({
        id: vysledek.polozkaId,
        zprava: 'novinky/potvrzeni',
        email,
        ucel: 'potvrzeni',
        rocnik,
        jti: vysledek.jti,
      });
      if (!poslano.odeslano) {
        console.error(`✉️ Potvrzení neodešlo hned (${poslano.duvod ?? '?'}), zůstává ve frontě.`);
      }
    } else {
      console.log(`✉️ Potvrzovací e-mail se neposílá (${vysledek.duvod ?? 'limit'}).`);
    }
  } catch (chyba) {
    console.error('❌ Přihlášení k odběru selhalo:', chyba);
    return NextResponse.json({ error: 'Zkus to prosím za chvíli.' }, { status: 500 });
  }

  return NextResponse.json({ ...PRIHLASENI_NEUTRALNI_ODPOVED, souhlasVerze: SOUHLAS_VERZE });
}
