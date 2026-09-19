import { NextRequest, NextResponse } from 'next/server';
import { overToken } from '@/lib/portal-magic';
import { jeDbNastavena, vTransakci } from '@/lib/novinky-db';
import { cteni } from '@/lib/portal-relace';
import { PortalChyba, spotrebujOdkaz, zmenRoli } from '@/lib/portal-ucty';

// Potvrzení nové přihlašovací adresy odkazem z e-mailu (tlačítko, POST).
export async function POST(request: NextRequest) {
  const zpet = (cesta: string) => NextResponse.redirect(new URL(cesta, request.url), 303);
  if (!jeDbNastavena()) return zpet('/pro-skoly');
  const formular = await request.formData().catch(() => null);
  const payload = overToken(String(formular?.get('token') ?? ''), 'email');
  if (!payload || typeof payload.role_id !== 'string' || typeof payload.email !== 'string') {
    return zpet('/pro-skoly?chyba=odkaz#vstup');
  }
  if (!(await spotrebujOdkaz(cteni, payload.nonce, 'email'))) return zpet('/pro-skoly?chyba=pouzity#vstup');
  try {
    const nova = await vTransakci((s) => zmenRoli(s, String(payload.role_id), { email: String(payload.email) }, 'sam'));
    return zpet(`/pro-skoly/profil?skola=${nova.redizo}&zprava=email`);
  } catch (e) {
    if (e instanceof PortalChyba) return zpet('/pro-skoly/profil?zprava=email-neplatny');
    throw e;
  }
}
