import { NextRequest, NextResponse } from 'next/server';
import { overToken } from '@/lib/portal-magic';
import { jeDbNastavena, vTransakci } from '@/lib/novinky-db';
import { jeNasPuvod } from '@/lib/portal-relace';
import { PortalChyba, platneRoleOsoby, spotrebujOdkaz, zmenRoli } from '@/lib/portal-ucty';
import { obnovVerejneSpravce } from '@/lib/portal-api';

// Potvrzení nové přihlašovací adresy odkazem z e-mailu (tlačítko, POST).
// Adresa patří osobě, takže se změní ve všech školách, kde má roli.
export async function POST(request: NextRequest) {
  const zpet = (cesta: string) => NextResponse.redirect(new URL(cesta, request.url), 303);
  if (!jeDbNastavena()) return zpet('/pro-skoly');
  if (!jeNasPuvod(request)) return zpet('/pro-skoly?chyba=odkaz#vstup');
  const formular = await request.formData().catch(() => null);
  const payload = overToken(String(formular?.get('token') ?? ''), 'email');
  if (!payload || typeof payload.osoba_id !== 'string' || typeof payload.email !== 'string') {
    return zpet('/pro-skoly?chyba=odkaz#vstup');
  }
  const osobaId = payload.osoba_id;
  const email = payload.email;
  try {
    // Odkaz se spotřebuje ve stejné transakci jako změna: když změna selže,
    // odkaz zůstane platný.
    const vysledek = await vTransakci(async (s) => {
      const role = await platneRoleOsoby(s, osobaId);
      if (role.length === 0) return { stav: 'bez-role' as const };
      if (!(await spotrebujOdkaz(s, payload.nonce, 'email'))) return { stav: 'pouzity' as const };
      const nove: Awaited<ReturnType<typeof zmenRoli>>[] = [];
      for (const r of role) nove.push(await zmenRoli(s, r.id, { email }, 'sam'));
      return { stav: 'ok' as const, nove };
    });
    if (vysledek.stav !== 'ok') return zpet(`/pro-skoly?chyba=${vysledek.stav}#vstup`);
    obnovVerejneSpravce();
    return zpet(`/pro-skoly/profil?skola=${vysledek.nove[0].redizo}&zprava=email`);
  } catch (e) {
    if (e instanceof PortalChyba) return zpet('/pro-skoly/profil?zprava=email-neplatny');
    throw e;
  }
}
