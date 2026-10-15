import { NextRequest, NextResponse } from 'next/server';
import { GITHUB_STAV_COOKIE, nactiUzivatele, smiDoAdministrace, vymenKod } from '@/lib/admin-github';
import { nastavCookie, overPodpis, smazKratkouCookie, zalozRelaci, zapisUdalost } from '@/lib/admin-relace';
import { dotaz, jeDbNastavena } from '@/lib/novinky-db';

// Návrat z GitHubu (#479): ověří stav, vymění kód za token, zkontroluje účet
// vlastníka a dvoufázové ověření a založí relaci. Token GitHubu se neukládá.
export async function GET(request: NextRequest) {
  const chyba = (kod: string) => {
    const o = NextResponse.redirect(new URL(`/admin/prihlaseni?chyba=${kod}`, request.url), 303);
    smazKratkouCookie(o, GITHUB_STAV_COOKIE);
    return o;
  };
  if (!jeDbNastavena()) return chyba('nenastaveno');
  const kod = request.nextUrl.searchParams.get('code');
  const stav = request.nextUrl.searchParams.get('state');
  const ocekavany = overPodpis('github', request.cookies.get(GITHUB_STAV_COOKIE)?.value);
  if (!kod || !stav || !ocekavany || stav !== ocekavany) return chyba('stav');

  const s = { dotaz };
  try {
    const zpet = new URL('/admin/prihlaseni/github/zpet', request.url).toString();
    const uzivatel = await nactiUzivatele(await vymenKod(kod, zpet));
    const smi = smiDoAdministrace(uzivatel);
    if (!smi.ok) {
      await zapisUdalost(s, 'odmitnuto', 'github', { login: uzivatel.login ?? null, duvod: smi.duvod });
      return chyba(uzivatel.two_factor_authentication !== true && String(uzivatel.id) === process.env.ADMIN_GITHUB_ID ? 'dvoufazove' : 'ucet');
    }
    const id = await zalozRelaci(s, { zpusob: 'github', githubLogin: uzivatel.login ?? null });
    const o = NextResponse.redirect(new URL('/admin', request.url), 303);
    smazKratkouCookie(o, GITHUB_STAV_COOKIE);
    nastavCookie(o, id);
    return o;
  } catch {
    return chyba('github');
  }
}
