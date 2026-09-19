import { NextRequest, NextResponse } from 'next/server';
import { overToken } from '@/lib/portal-magic';
import { jeDbNastavena, vTransakci } from '@/lib/novinky-db';
import { jeNasPuvod, nastavRelaci } from '@/lib/portal-relace';
import { prijmiPozvanku } from '@/lib/portal-ucty';
import { getNazevSkoly } from '@/lib/portal-skol';
import { posliTelegram } from '@/lib/portal-oznameni';
import { chyba, odpovedNaChybu } from '@/lib/portal-api';

// Přijetí pozvánky: e-mail určuje pozvánka, pozvaný doplní jméno a funkci.
export async function POST(request: NextRequest) {
  if (!jeDbNastavena()) return chyba('Portál pro školy není nakonfigurován.', 503);
  if (!jeNasPuvod(request)) return chyba('Požadavek nepřišel z našeho webu.', 403);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const payload = overToken(String(body.token ?? ''), 'pozvanka');
  if (!payload || typeof payload.pozvanka_id !== 'string') return chyba('Pozvánka už neplatí.', 403);
  try {
    const role = await vTransakci((s) =>
      prijmiPozvanku(s, String(payload.pozvanka_id), String(body.jmeno ?? ''), String(body.funkce ?? '')),
    );
    await posliTelegram(`👥 Přijatá pozvánka: ${role.jmeno} – ${(await getNazevSkoly(role.redizo)) || role.redizo}`);
    const odpoved = NextResponse.json({ ok: true, presmerovat: `/pro-skoly/profil?skola=${role.redizo}` });
    nastavRelaci(odpoved, role.osoba_id);
    return odpoved;
  } catch (e) {
    return odpovedNaChybu(e, 'pozvánka');
  }
}
