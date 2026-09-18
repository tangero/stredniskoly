import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { dotaz, jeDbNastavena, vTransakci } from '@/lib/novinky-db';
import { zrusPodleAdresy } from '@/lib/novinky-odber';
import { otisk } from '@/lib/novinky-token';
import { zapisVysledekPolozky } from '@/lib/novinky-fronta';

// ============================================================================
// Webhooky Resendu (docs/novinky-k-prijimackam-2027.md, krok 8).
//
// Dvě třídy událostí:
//  - **události e-mailu** se párují podle značky `polozka`, jinak podle
//    `resend_id`; nespárovaná událost se uloží a spáruje později,
//  - **potlačení adresy** (`suppression.added`) se nepáruje na položku vůbec,
//    protože nese jen adresu a může vzniknout i ručně u Resendu.
//
// Událost se nejdřív uloží podle `event_id` (idempotentně) a účinky se provedou
// v téže transakci; `zpracovano` se vyplní teprve po nich.
// Adresa se neukládá, jen její otisk a tělo bez adresy.
// ============================================================================

const TRVALE_ZRUSENI = ['email.bounced', 'email.complained', 'suppression.added'];

/** Kolik smí být podpis starý, aby nešlo staré doručení přehrát. */
const TOLERANCE_PODPISU_MS = 5 * 60 * 1000;

/** Ověří podpis webhooku (Svix formát, který Resend používá) i jeho čas. */
function jePodpisPlatny(surove: string, hlavicky: Headers, secret: string): boolean {
  const id = hlavicky.get('svix-id');
  const timestamp = hlavicky.get('svix-timestamp');
  const podpisy = hlavicky.get('svix-signature');
  if (!id || !timestamp || !podpisy) return false;

  // Bez kontroly času by šlo staré doručení přehrát a zrušit odběr, který si
  // člověk mezitím znovu založil.
  const cas = Number(timestamp) * 1000;
  if (!Number.isFinite(cas) || Math.abs(Date.now() - cas) > TOLERANCE_PODPISU_MS) return false;

  const klic = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const ocekavany = createHmac('sha256', klic).update(`${id}.${timestamp}.${surove}`).digest('base64');
  return podpisy.split(' ').some((cast) => {
    const hodnota = cast.split(',')[1] ?? '';
    const a = Buffer.from(hodnota);
    const b = Buffer.from(ocekavany);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

/** Z těla odstraní adresy; do databáze nesmí. */
function bezAdresy(telo: Record<string, unknown>): Record<string, unknown> {
  const kopie: Record<string, unknown> = { ...telo };
  const data = { ...((telo.data as Record<string, unknown>) ?? {}) };
  delete data.to;
  delete data.from;
  delete data.email;
  delete data.bcc;
  delete data.cc;
  kopie.data = data;
  return kopie;
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!jeDbNastavena() || !secret || !process.env.NOVINKY_SECRET) {
    return NextResponse.json({ error: 'Webhook není nakonfigurován.' }, { status: 503 });
  }
  const surove = await request.text();
  if (!jePodpisPlatny(surove, request.headers, secret)) {
    return NextResponse.json({ error: 'Neplatný podpis.' }, { status: 401 });
  }

  let telo: Record<string, unknown>;
  try {
    telo = JSON.parse(surove);
  } catch {
    return NextResponse.json({ error: 'Neplatné tělo.' }, { status: 400 });
  }

  const typ = String(telo.type ?? '');
  const data = (telo.data as Record<string, unknown>) ?? {};
  const eventId = String(request.headers.get('svix-id') ?? data.email_id ?? '');
  if (!typ || !eventId) return NextResponse.json({ error: 'Chybí typ nebo identifikátor.' }, { status: 400 });

  const resendId = typeof data.email_id === 'string' ? data.email_id : null;
  const adresa = Array.isArray(data.to) ? String(data.to[0]) : typeof data.email === 'string' ? data.email : null;
  const znacky = (data.tags as Array<{ name?: string; value?: string }> | undefined) ?? [];
  const polozkaZeZnacky = znacky.find((z) => z.name === 'polozka')?.value ?? null;

  try {
    let zrusitAdresu = false;
    await vTransakci(async (s) => {
      const vlozeno = await s.dotaz(
        `insert into webhook_udalost (event_id, typ, resend_id, email_otisk, polozka_id, telo_bez_adresy)
         values ($1, $2, $3, $4, $5, $6::jsonb)
         on conflict (event_id) do nothing`,
        [
          eventId,
          typ,
          resendId,
          adresa ? otisk(`email:${adresa.toLowerCase()}`) : null,
          polozkaZeZnacky,
          JSON.stringify(bezAdresy(telo)),
        ],
      );
      if (vlozeno.rowCount === 0) return; // už jsme ji zpracovali

      // Výsledek položky doplníme i po uzavření dávky, aby se pozdní událost
      // neztratila; párujeme podle značky, jinak podle resend_id.
      let polozkaId = polozkaZeZnacky;
      if (!polozkaId && resendId) {
        const nalezena = await s.dotaz<{ id: string }>(
          `select id from polozka_odeslani where resend_id = $1 limit 1`,
          [resendId],
        );
        polozkaId = nalezena.rows[0]?.id ?? null;
      }
      if (polozkaId) {
        await zapisVysledekPolozky(s, polozkaId, resendId, typ.replace('email.', ''));
      }
      // Účinek se rozhoduje **uvnitř** stráže: duplicitní doručení sem vůbec
      // nedojde (insert narazil na konflikt a funkce se vrátila dřív), takže
      // opožděný přehraný `email.bounced` nemůže zrušit nově založený odběr.
      zrusitAdresu = TRVALE_ZRUSENI.includes(typ) && Boolean(adresa);
      await s.dotaz(`update webhook_udalost set zpracovano = now() where event_id = $1`, [eventId]);
    });

    // Potlačení adresy a trvalá nedoručitelnost ruší odběr podle adresy,
    // nezávisle na tom, jestli se událost spárovala s položkou. Kdyby proces
    // spadl mezi transakcí a tímto krokem, dožene ho úklid odesílače podle
    // nezpracovaných účinků (viz dokonciUcinkyWebhooku).
    if (zrusitAdresu && adresa) {
      const zrusene = await zrusPodleAdresy(adresa);
      console.log(`✉️ Webhook ${typ}: zrušeno ${zrusene} odběrů podle adresy.`);
      await dotaz(`update webhook_udalost set ucinek_hotov = now() where event_id = $1`, [eventId]);
    } else {
      await dotaz(`update webhook_udalost set ucinek_hotov = now() where event_id = $1`, [eventId]);
    }
  } catch (chyba) {
    console.error('❌ Zpracování webhooku selhalo:', chyba);
    // 500 znamená, že Resend doručení zkusí znovu; `zpracovano` zůstane prázdné.
    return NextResponse.json({ error: 'Zkusíme to znovu.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
