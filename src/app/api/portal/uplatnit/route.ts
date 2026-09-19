import { NextRequest, NextResponse } from 'next/server';
import { hashKod, validateKod, getNazevSkoly, getNazevSAdresou } from '@/lib/portal-skol';
import { overMagicToken, portalBaseUrl } from '@/lib/portal-magic';
import { jeDbNastavena, vTransakci } from '@/lib/novinky-db';
import { nastavRelaci } from '@/lib/portal-relace';
import { overUdajeOsoby, uplatniKod, zalozSpravceZRejstriku } from '@/lib/portal-ucty';
import { posliVitejteEmail } from '@/lib/portal-email';
import {
  chyba,
  ipZPozadavku,
  jeOmezeno,
  obnovVerejneSpravce,
  odpovedNaChybu,
  oznamNovehoSpravce,
} from '@/lib/portal-api';
import { nactiEmaily } from '@/lib/portal-magic';

// ============================================================================
// Založení správce profilu školy: přihlašovacím kódem, nebo odkazem na e-mail
// z rejstříku u školy, která správce nemá (docs/ucty-portalu-skol-2027.md, 2.2).
// Po úspěchu vznikne relace, takže správce rovnou pokračuje do profilu.
// ============================================================================

export async function POST(request: NextRequest) {
  if (!jeDbNastavena()) return chyba('Portál pro školy není nakonfigurován.', 503);
  if (jeOmezeno(`uplatnit:${ipZPozadavku(request.headers)}`, 10)) {
    return chyba('Příliš mnoho pokusů. Zkuste to prosím za chvíli.', 429);
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const overeno = overUdajeOsoby(body);
  if (!overeno.ok) return chyba(overeno.chyba, 400);
  const udaje = overeno.udaje;

  try {
    let role;
    let vstup: string;
    if (typeof body.kod === 'string' && body.kod.trim()) {
      const redizo = await validateKod(body.kod);
      if (!redizo) return chyba('Neplatný nebo zrušený kód.', 403);
      const kodHash = hashKod(body.kod);
      role = await vTransakci((s) => uplatniKod(s, kodHash, redizo, udaje));
      vstup = 'kód';
    } else if (typeof body.magic === 'string' && body.magic.trim()) {
      const redizo = overMagicToken(body.magic);
      if (!redizo) return chyba('Odkaz vypršel. Požádejte si o nový na stránce Pro školy.', 403);
      const rejstrikovy = (await nactiEmaily())[redizo]?.[0] ?? '';
      role = await vTransakci((s) => zalozSpravceZRejstriku(s, redizo, udaje, rejstrikovy));
      vstup = 'odkaz z rejstříku';
    } else {
      return chyba('Chybí kód nebo odkaz.', 400);
    }

    obnovVerejneSpravce();
    const nazev = (await getNazevSkoly(role.redizo)) || role.redizo;
    await Promise.all([
      oznamNovehoSpravce(role, (await getNazevSAdresou(role.redizo)) || nazev, vstup),
      posliVitejteEmail({
        email: role.email,
        nazevSkoly: nazev,
        jmeno: role.jmeno,
        profilUrl: `${portalBaseUrl()}/pro-skoly`,
      }),
    ]);

    const odpoved = NextResponse.json({ ok: true, presmerovat: `/pro-skoly/profil?skola=${role.redizo}` });
    nastavRelaci(odpoved, role.osoba_id);
    return odpoved;
  } catch (e) {
    return odpovedNaChybu(e, 'uplatnění');
  }
}
