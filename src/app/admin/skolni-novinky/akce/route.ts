import { NextRequest, NextResponse } from 'next/server';
import { overAdminToken } from '@/lib/admin';
import { dotaz, jeDbNastavena } from '@/lib/novinky-db';
import { jeNasPuvod } from '@/lib/portal-relace';

/** Ruční skrytí či obnovení článku, auditované v tabulce přepínačů. */
export async function POST(request: NextRequest) {
  if (!overAdminToken(request.cookies.get('admin_token')?.value)) {
    return new NextResponse('Not found', { status: 404 });
  }
  if (!jeNasPuvod(request)) return new NextResponse('Špatný původ požadavku.', { status: 403 });
  const f = await request.formData();
  const id = String(f.get('id') ?? '').trim();
  const akce = String(f.get('akce') ?? '').trim();
  const duvod = String(f.get('duvod') ?? '').trim();
  const zpet = (redizo: string, parametr: 'ok' | 'chyba', zprava: string) =>
    NextResponse.redirect(new URL(`/admin/skolni-novinky?redizo=${encodeURIComponent(redizo)}&${parametr}=${encodeURIComponent(zprava)}`, request.url), 303);
  if (!jeDbNastavena()) return zpet('', 'chyba', 'Databáze není nastavena.');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    || !['skryt', 'obnovit'].includes(akce) || !duvod || duvod.length > 300) {
    return zpet('', 'chyba', 'Neplatná akce nebo chybí důvod.');
  }
  try {
    const { rows } = await dotaz<{ redizo: string }>('select redizo from skola_novinka where id = $1', [id]);
    const redizo = rows[0]?.redizo;
    if (!redizo) return zpet('', 'chyba', 'Článek se nenašel.');
    await dotaz(
      `insert into skola_prepinac (klic, hodnota, zdroj_zmeny, duvod)
       values ($1, $2::jsonb, 'admin', $3)
       on conflict (klic) do update set hodnota = excluded.hodnota,
         zmeneno = now(), zdroj_zmeny = excluded.zdroj_zmeny, duvod = excluded.duvod`,
      [`polozka:${id}`, akce === 'skryt' ? 'false' : 'true', duvod],
    );
    return zpet(redizo, 'ok', akce === 'skryt' ? 'Článek je skrytý.' : 'Článek je znovu viditelný.');
  } catch {
    return zpet('', 'chyba', 'Změnu se nepodařilo uložit.');
  }
}
