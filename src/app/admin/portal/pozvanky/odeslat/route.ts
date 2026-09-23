import { NextRequest, NextResponse } from 'next/server';
import { overAdminToken } from '@/lib/admin';
import { jeNasPuvod } from '@/lib/portal-relace';
import { posliPozvankuDoPilotu } from '@/lib/portal-email';
import { kodProSkolu, nactiPozvanky, zapisOdeslano } from '@/lib/portal-pozvanky';

// ============================================================================
// Odeslání pozvánek do pilotu z administrace. Leží pod /admin, aby dostalo
// cookie `admin_token` (path /admin).
//
// Ostrá rozesílka se potvrzuje opsáním počtu škol: tlačítko „ano“ se dá
// odkliknout omylem, číslo ne. Zkouška na vlastní adresu datum nezapisuje,
// protože škola by se pak tvářila jako oslovená, aniž by cokoli dostala.
// ============================================================================

export async function POST(request: NextRequest) {
  if (!overAdminToken(request.cookies.get('admin_token')?.value)) {
    return new NextResponse('Not found', { status: 404 });
  }
  if (!jeNasPuvod(request)) return new NextResponse('Špatný původ požadavku.', { status: 403 });

  const f = await request.formData();
  const pole = (klic: string) => String(f.get(klic) ?? '').trim();
  const zpet = (parametr: 'ok' | 'chyba', text: string) =>
    NextResponse.redirect(new URL(`/admin/portal/pozvanky?${parametr}=${encodeURIComponent(text)}`, request.url), 303);

  const { radky, chybi, pocty } = await nactiPozvanky();
  if (chybi.length > 0) return zpet('chyba', `Chybí vstupy: ${chybi.join(', ')}`);

  if (pole('akce') === 'zkouska') {
    const na = pole('na');
    const skola = radky.find((r) => r.redizo === pole('redizo'));
    if (!na || !skola) return zpet('chyba', 'Zadejte adresu a školu.');
    const kod = await kodProSkolu(skola.redizo);
    if (!kod) return zpet('chyba', `Škola ${skola.nazev} nemá kód.`);

    const ok = await posliPozvankuDoPilotu({ email: na, nazevSkoly: skola.nazev, osloveni: skola.osloveni, kod, vlna: skola.vlna });
    return ok
      ? zpet('ok', `Zkouška odeslána na ${na} (${skola.nazev}). Školám nic nešlo, datum se nezapsalo.`)
      : zpet('chyba', 'Zkoušku se nepodařilo odeslat, podrobnosti jsou v logu.');
  }

  if (pole('akce') !== 'ostra') return zpet('chyba', 'Neznámá akce.');

  // Potvrzení opsáním počtu: kdyby se mezitím počet změnil, neodešle se nic.
  if (pole('potvrzeni') !== String(pocty.kOdeslani)) {
    return zpet('chyba', `Potvrzení nesedí. Opište ${pocty.kOdeslani}, ať je jisté, kolika školám to jde.`);
  }

  const kOdeslani = radky.filter((r) => !r.pozvanka_odeslana && r.maKod && r.email);
  const odeslane: string[] = [];
  const selhale: string[] = [];

  for (const skola of kOdeslani) {
    const kod = await kodProSkolu(skola.redizo);
    if (!kod) {
      selhale.push(skola.nazev);
      continue;
    }
    const ok = await posliPozvankuDoPilotu({
      email: skola.email,
      nazevSkoly: skola.nazev,
      osloveni: skola.osloveni,
      kod,
      vlna: skola.vlna,
      idempotencyKey: `portal-pozvanka-v${skola.vlna ?? 1}-${skola.redizo}`,
    });
    if (ok) {
      odeslane.push(skola.redizo);
      await zapisOdeslano([skola.redizo], new Date().toISOString().slice(0, 10));
    } else {
      selhale.push(skola.nazev);
    }
    await new Promise((r) => setTimeout(r, 600)); // Resend: 2 zprávy za sekundu
  }

  const shrnuti = `Odesláno ${odeslane.length} z ${kOdeslani.length}. Datum je zapsané v data/portal/pilot.json – commitněte ho.`;
  return selhale.length > 0
    ? zpet('chyba', `${shrnuti} Neodesláno: ${selhale.join(', ')}.`)
    : zpet('ok', shrnuti);
}
