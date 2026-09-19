import { NextRequest, NextResponse } from 'next/server';
import { overAdminToken } from '@/lib/admin';
import { jeDbNastavena, vTransakci } from '@/lib/novinky-db';
import { jeNasPuvod } from '@/lib/portal-relace';
import {
  anonymizujOsobu,
  vymazKontakt,
  dosadSpravce,
  overUdajeOsoby,
  PortalChyba,
  zmenRoli,
  zrusPozvanku,
  zrusRoli,
} from '@/lib/portal-ucty';
import { obnovVerejneSpravce } from '@/lib/portal-api';
import { posliTelegram } from '@/lib/portal-oznameni';

// ============================================================================
// Zásahy administrace do účtů (docs/ucty-portalu-skol-2027.md, 2.4). Leží pod
// /admin, aby dostaly cookie admin_token (path /admin). Každý zásah má důvod
// a vytvoří nový záznam, starý zneplatní.
// ============================================================================

const KDO = 'zandl';

export async function POST(request: NextRequest) {
  if (!overAdminToken(request.cookies.get('admin_token')?.value)) {
    return new NextResponse('Not found', { status: 404 });
  }
  if (!jeNasPuvod(request)) return new NextResponse('Špatný původ požadavku.', { status: 403 });
  const f = await request.formData();
  const pole = (klic: string) => String(f.get(klic) ?? '').trim();
  const redizo = pole('redizo');
  const duvod = pole('duvod');
  const zpet = (parametr: string, text: string) =>
    NextResponse.redirect(
      new URL(`/admin/portal?redizo=${encodeURIComponent(redizo)}&${parametr}=${encodeURIComponent(text)}`, request.url),
      303,
    );

  if (!jeDbNastavena()) return zpet('chyba', 'Databáze není nastavena.');
  if (!duvod) return zpet('chyba', 'Zásah musí mít důvod.');

  try {
    switch (pole('akce')) {
      case 'zmenit': {
        // Souhlas se zveřejněním jména administrace neuděluje, jen na žádost odvolá.
        const overeno = overUdajeOsoby({ email: pole('email'), jmeno: pole('jmeno'), funkce: pole('funkce') });
        if (!overeno.ok) return zpet('chyba', overeno.chyba);
        const { email, jmeno, funkce } = overeno.udaje;
        const zmeny = f.get('odvolat_souhlas') === 'on' ? { email, jmeno, funkce, zverejnit_jmeno: false } : { email, jmeno, funkce };
        await vTransakci((s) => zmenRoli(s, pole('role_id'), zmeny, `admin:${KDO}`, duvod));
        break;
      }
      case 'dosadit': {
        // Dosazený správce začíná bez zveřejněného jména; souhlas dá sám v profilu.
        const overeno = overUdajeOsoby({ email: pole('email'), jmeno: pole('jmeno'), funkce: pole('funkce') });
        if (!overeno.ok) return zpet('chyba', overeno.chyba);
        await vTransakci((s) => dosadSpravce(s, redizo, overeno.udaje, KDO, duvod, f.get('puvodni_editorem') === 'on'));
        break;
      }
      case 'odebrat':
        await vTransakci((s) => zrusRoli(s, pole('role_id'), `admin:${KDO}`, duvod));
        break;
      case 'zrusit_pozvanku':
        await vTransakci((s) => zrusPozvanku(s, pole('pozvanka_id'), redizo, `admin:${KDO}`, duvod));
        break;
      case 'anonymizovat':
        await vTransakci((s) => anonymizujOsobu(s, pole('osoba_id'), KDO, duvod));
        break;
      case 'vymazat_kontakt': {
        const pocet = await vTransakci((s) => vymazKontakt(s, pole('email'), KDO, duvod));
        if (pocet === 0) return zpet('chyba', 'Adresa se v portálu nenašla.');
        break;
      }
      default:
        return zpet('chyba', 'Neznámá akce.');
    }
  } catch (e) {
    if (e instanceof PortalChyba) return zpet('chyba', e.message);
    console.error('❌ Admin portálu:', e);
    return zpet('chyba', 'Zásah selhal, podrobnosti jsou v logu.');
  }

  obnovVerejneSpravce();
  await posliTelegram(`🛠 Admin: ${pole('akce')} u ${redizo} – ${duvod}`);
  return zpet('ok', 'Hotovo.');
}
