import { NextRequest, NextResponse } from 'next/server';
import { jeDbNastavena } from '@/lib/novinky-db';
import { prihlas, SOUHLAS_VERZE } from '@/lib/novinky-odber';
import { jeEmailPlatny, normalizujEmail, PRIHLASENI_NEUTRALNI_ODPOVED } from '@/lib/novinky-token';
import type { DruhStudia } from '@/lib/novinky-token';
import { jeResendNastaven } from '@/lib/novinky-email';
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

const POVOLENE_DRUHY: DruhStudia[] = ['ss', 'vicelete'];
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
  if (telo.souhlas !== true) {
    return NextResponse.json(
      { error: 'Bez souhlasu odběr nezaložíme. Zaškrtni prosím potvrzení.' },
      { status: 400 },
    );
  }

  const druhy = Array.isArray(telo.druhy)
    ? (telo.druhy.filter((d): d is DruhStudia => POVOLENE_DRUHY.includes(d as DruhStudia)) as DruhStudia[])
    : [];
  const jenKalendar = telo.jenKalendar === true;
  if (druhy.length === 0 && !jenKalendar) {
    return NextResponse.json({ error: 'Vyber prosím, na co se hlásíš.' }, { status: 400 });
  }

  const rocnik = typeof telo.rocnik === 'string' && /^\d{4}$/.test(telo.rocnik) ? telo.rocnik : null;
  if (!rocnik) {
    return NextResponse.json({ error: 'Chybí ročník přijímacího řízení.' }, { status: 400 });
  }
  const kraj = typeof telo.kraj === 'string' && telo.kraj.trim().length > 0 ? telo.kraj.trim().slice(0, 60) : null;
  const zdroj = typeof telo.zdroj === 'string' && POVOLENE_ZDROJE.includes(telo.zdroj) ? telo.zdroj : 'neznamy';
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'neznama';

  try {
    const vysledek = await prihlas({
      email,
      druhy: jenKalendar ? [] : druhy,
      rocnik,
      kraj,
      zdroj,
      ip,
      cilovyRocnik: jenKalendar ? String(Number(rocnik) + 1) : undefined,
    });

    if (vysledek.poslat && vysledek.jti && vysledek.polozkaId) {
      // Odesílá se hned, ale **stejnou cestou jako obsahové zprávy**: dávka,
      // rezervace kvóty, hranice předání. Jinak by formulář obcházel strop
      // a rezervu pro portál. Když to hned nevyjde, položka zůstane ve frontě
      // a doveze ji odesílač (dovezServisni).
      const poslano = await odesliServisni({
        id: vysledek.polozkaId,
        zprava: `novinky/${rocnik}/potvrzeni`,
        email,
        ucel: 'potvrzeni',
        rocnik,
        druhy,
        jti: vysledek.jti,
        jenKalendar,
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
