import { NextRequest, NextResponse } from 'next/server';
import { overToken } from '@/lib/portal-magic';
import { jeDbNastavena, vTransakci } from '@/lib/novinky-db';
import { jeNasPuvod, nastavRelaci } from '@/lib/portal-relace';
import { platneRoleOsoby, spotrebujOdkaz, zapisUdalost } from '@/lib/portal-ucty';

// ============================================================================
// Přihlášení odkazem z e-mailu. Odkaz vede na stránku s tlačítkem a teprve
// jeho odeslání (POST) odkaz spotřebuje: skenery odkazů ve školní poště
// (Outlook Safe Links) otevírají odkazy metodou GET a jinak by je spálily.
// ============================================================================

function zpet(request: NextRequest, cesta: string): NextResponse {
  return NextResponse.redirect(new URL(cesta, request.url), 303);
}

export async function POST(request: NextRequest) {
  if (!jeDbNastavena()) return zpet(request, '/pro-skoly?chyba=nenastaveno');
  if (!jeNasPuvod(request)) return zpet(request, '/pro-skoly?chyba=odkaz#vstup');
  const formular = await request.formData().catch(() => null);
  const token = String(formular?.get('token') ?? '');
  const payload = overToken(token, 'prihlaseni');
  if (!payload || typeof payload.osoba_id !== 'string') return zpet(request, '/pro-skoly?chyba=odkaz#vstup');
  const osobaId = payload.osoba_id;

  // Spotřebování odkazu a záznam přihlášení v jedné transakci: když zápis
  // selže, odkaz zůstane platný a jde ho použít znovu.
  const vysledek = await vTransakci(async (s) => {
    const role = await platneRoleOsoby(s, osobaId);
    if (role.length === 0) return { stav: 'bez-role' as const };
    if (!(await spotrebujOdkaz(s, payload.nonce, 'prihlaseni'))) return { stav: 'pouzity' as const };
    for (const r of role) await zapisUdalost(s, r.redizo, r.id, 'prihlaseni');
    return { stav: 'ok' as const, role };
  });
  if (vysledek.stav !== 'ok') return zpet(request, `/pro-skoly?chyba=${vysledek.stav}#vstup`);

  const { role } = vysledek;

  const odpoved = zpet(request, `/pro-skoly/profil?skola=${role[0].redizo}`);
  nastavRelaci(odpoved, osobaId);
  return odpoved;
}
