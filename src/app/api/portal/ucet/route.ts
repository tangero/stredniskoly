import { NextRequest, NextResponse } from 'next/server';
import { portalBaseUrl, vytvorToken } from '@/lib/portal-magic';
import { jeDbNastavena, vTransakci } from '@/lib/novinky-db';
import { cteni, jeNasPuvod, prihlasenyZPozadavku } from '@/lib/portal-relace';
import {
  jePlatnyEmail,
  normalizujEmail,
  overUdajeOsoby,
  platneRoleSkoly,
  predejSpravcovstvi,
  vytvorPozvanku,
  zmenRoli,
  zrusPozvanku,
  zrusRoli,
} from '@/lib/portal-ucty';
import { getNazevSAdresou } from '@/lib/portal-skol';
import { posliPotvrzeniEmailu, posliPozvankuEmail } from '@/lib/portal-email';
import { posliTelegram } from '@/lib/portal-oznameni';
import { chyba, domenaSedi, ipZPozadavku, jeOmezeno, obnovVerejneSpravce, odpovedNaChybu } from '@/lib/portal-api';

// ============================================================================
// Akce přihlášené osoby nad účtem a týmem školy (docs/ucty-portalu-skol-2027.md, 2.3).
// Každá změna vytvoří nový záznam a starý zneplatní; kdo ji provedl, je v záznamu.
// ============================================================================

export async function POST(request: NextRequest) {
  if (!jeDbNastavena()) return chyba('Portál pro školy není nakonfigurován.', 503);
  if (!jeNasPuvod(request)) return chyba('Požadavek nepřišel z našeho webu.', 403);
  const prihlaseny = await prihlasenyZPozadavku(request);
  if (!prihlaseny) return chyba('Přihlášení vypršelo. Přihlaste se prosím znovu.', 401);
  if (jeOmezeno(`ucet:${prihlaseny.osobaId}:${ipZPozadavku(request.headers)}`, 30)) {
    return chyba('Příliš mnoho změn najednou. Zkuste to prosím za chvíli.', 429);
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const ja = prihlaseny.role.find((r) => r.redizo === body.redizo);
  if (!ja) return chyba('K profilu této školy nemáte přístup.', 403);
  const jeSpravce = ja.role === 'spravce';
  const nazev = (await getNazevSAdresou(ja.redizo)) || ja.redizo;
  const kdo = `${ja.role}:${ja.id}`;

  /** Role jiné osoby téže školy; cizí ID nepustí. */
  const roleVeSkole = async (id: unknown) =>
    (await platneRoleSkoly(cteni, ja.redizo)).find((r) => r.id === id && r.id !== ja.id) ?? null;

  try {
    switch (body.akce) {
      case 'udaje': {
        const overeno = overUdajeOsoby({ ...body, email: ja.email });
        if (!overeno.ok) return chyba(overeno.chyba, 400);
        const { jmeno, funkce, zverejnit_jmeno } = overeno.udaje;
        await vTransakci((s) => zmenRoli(s, ja.id, { jmeno, funkce, zverejnit_jmeno }, 'sam'));
        if (jeSpravce) obnovVerejneSpravce();
        return NextResponse.json({ ok: true });
      }

      case 'email': {
        const email = normalizujEmail(String(body.email ?? ''));
        if (!jePlatnyEmail(email)) return chyba('Zadejte platnou e-mailovou adresu.', 400);
        if (email === ja.email) return chyba('Tuto adresu už používáte.', 400);
        const token = vytvorToken('email', { osoba_id: prihlaseny.osobaId, email });
        await posliPotvrzeniEmailu({
          email,
          nazevSkoly: nazev,
          odkaz: `${portalBaseUrl()}/pro-skoly/email/${encodeURIComponent(token)}`,
        });
        return NextResponse.json({ ok: true, zprava: `Na ${email} jsme poslali odkaz pro potvrzení.` });
      }

      case 'pozvat': {
        if (!jeSpravce) return chyba('Kolegy zve správce profilu.', 403);
        const pozvanka = await vTransakci((s) => vytvorPozvanku(s, ja, String(body.email ?? '')));
        const token = vytvorToken('pozvanka', { pozvanka_id: pozvanka.id });
        await posliPozvankuEmail({
          email: pozvanka.email,
          nazevSkoly: nazev,
          pozval: `${ja.jmeno}${ja.funkce ? ` (${ja.funkce})` : ''}`,
          odkaz: `${portalBaseUrl()}/pro-skoly/pozvanka/${encodeURIComponent(token)}`,
        });
        const sedi = await domenaSedi(ja.redizo, pozvanka.email);
        await posliTelegram(`✉️ Pozvánka: ${nazev} – ${ja.jmeno} zve ${pozvanka.email}${sedi ? '' : ' ⚠️ doména nesedí'}`);
        return NextResponse.json({ ok: true, zprava: `Pozvánku jsme poslali na ${pozvanka.email}.` });
      }

      case 'zrusit_pozvanku': {
        if (!jeSpravce) return chyba('Pozvánky ruší správce profilu.', 403);
        await vTransakci((s) => zrusPozvanku(s, String(body.pozvanka_id ?? ''), ja.redizo, ja));
        return NextResponse.json({ ok: true });
      }

      case 'odebrat': {
        if (!jeSpravce) return chyba('Kolegy odebírá správce profilu.', 403);
        const cil = await roleVeSkole(body.role_id);
        if (!cil) return chyba('Tohoto člověka v profilu školy nemáme.', 404);
        await vTransakci((s) => zrusRoli(s, cil.id, kdo));
        return NextResponse.json({ ok: true });
      }

      case 'predat': {
        if (!jeSpravce) return chyba('Správcovství předává správce profilu.', 403);
        const cil = await roleVeSkole(body.role_id);
        if (!cil) return chyba('Tohoto člověka v profilu školy nemáme.', 404);
        const novy = await vTransakci((s) => predejSpravcovstvi(s, ja.id, cil.id, kdo));
        obnovVerejneSpravce();
        await posliTelegram(`🔁 Předání správce: ${nazev} – ${ja.jmeno} → ${novy.jmeno}`);
        return NextResponse.json({ ok: true });
      }

      case 'odejit': {
        if (jeSpravce) return chyba('Správce nejdřív předá správcovství kolegovi.', 409);
        await vTransakci((s) => zrusRoli(s, ja.id, 'sam'));
        return NextResponse.json({ ok: true, presmerovat: '/pro-skoly' });
      }

      default:
        return chyba('Neznámá akce.', 400);
    }
  } catch (e) {
    return odpovedNaChybu(e, `účet ${String(body.akce)}`);
  }
}
