import { NextRequest, NextResponse } from 'next/server';
import { overToken } from '@/lib/portal-magic';
import { jeDbNastavena } from '@/lib/novinky-db';
import { cteni, nastavRelaci } from '@/lib/portal-relace';
import { platneRoleOsoby, spotrebujOdkaz, zapisUdalost } from '@/lib/portal-ucty';
import { getNazevSkoly } from '@/lib/portal-skol';
import { posliTelegram } from '@/lib/portal-oznameni';

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
  const formular = await request.formData().catch(() => null);
  const token = String(formular?.get('token') ?? '');
  const payload = overToken(token, 'prihlaseni');
  if (!payload || typeof payload.osoba_id !== 'string') return zpet(request, '/pro-skoly?chyba=odkaz#vstup');

  if (!(await spotrebujOdkaz(cteni, payload.nonce, 'prihlaseni'))) {
    return zpet(request, '/pro-skoly?chyba=pouzity#vstup');
  }
  const role = await platneRoleOsoby(cteni, payload.osoba_id);
  if (role.length === 0) return zpet(request, '/pro-skoly?chyba=bez-role#vstup');

  // První přihlášení osoby (mimo založení kódem) hlásíme na Telegram.
  const drivejsi = await cteni.dotaz(
    `select 1 from portal_udalost u join portal_role r on r.id = u.role_id
      where r.osoba_id = $1 and u.typ = 'prihlaseni' limit 1`,
    [payload.osoba_id],
  );
  for (const r of role) await zapisUdalost(cteni, r.redizo, r.id, 'prihlaseni');
  if (drivejsi.rowCount === 0) {
    const nazvy = await Promise.all(role.map((r) => getNazevSkoly(r.redizo)));
    await posliTelegram(`🔑 První přihlášení: ${role[0].jmeno} (${role[0].role}) – ${nazvy.join(', ')}`);
  }

  const odpoved = zpet(request, `/pro-skoly/profil?skola=${role[0].redizo}`);
  nastavRelaci(odpoved, payload.osoba_id);
  return odpoved;
}
