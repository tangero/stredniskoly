import { NextRequest, NextResponse } from 'next/server';
import { overToken } from '@/lib/portal-magic';
import { jeDbNastavena, vTransakci } from '@/lib/novinky-db';
import { cteni } from '@/lib/portal-relace';
import { PortalChyba, platneRoleOsoby, spotrebujOdkaz, zmenRoli } from '@/lib/portal-ucty';
import { obnovVerejneSpravce } from '@/lib/portal-api';

// Potvrzení nové přihlašovací adresy odkazem z e-mailu (tlačítko, POST).
// Adresa patří osobě, takže se změní ve všech školách, kde má roli.
export async function POST(request: NextRequest) {
  const zpet = (cesta: string) => NextResponse.redirect(new URL(cesta, request.url), 303);
  if (!jeDbNastavena()) return zpet('/pro-skoly');
  const formular = await request.formData().catch(() => null);
  const payload = overToken(String(formular?.get('token') ?? ''), 'email');
  if (!payload || typeof payload.osoba_id !== 'string' || typeof payload.email !== 'string') {
    return zpet('/pro-skoly?chyba=odkaz#vstup');
  }
  if (!(await spotrebujOdkaz(cteni, payload.nonce, 'email'))) return zpet('/pro-skoly?chyba=pouzity#vstup');
  const osobaId = payload.osoba_id;
  const email = payload.email;
  try {
    const nove = await vTransakci(async (s) => {
      const role = await platneRoleOsoby(s, osobaId);
      return Promise.all(role.map((r) => zmenRoli(s, r.id, { email }, 'sam')));
    });
    obnovVerejneSpravce();
    return zpet(`/pro-skoly/profil?skola=${nove[0]?.redizo ?? ''}&zprava=email`);
  } catch (e) {
    if (e instanceof PortalChyba) return zpet('/pro-skoly/profil?zprava=email-neplatny');
    throw e;
  }
}
