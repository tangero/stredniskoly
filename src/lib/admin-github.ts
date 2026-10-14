// ============================================================================
// Přihlášení do administrace účtem vlastníka na GitHubu (#479). Záložní cesta
// k passkey a jediná cesta k registraci prvního passkey. Projde jen účet
// s číselným id z ADMIN_GITHUB_ID a se zapnutým dvoufázovým ověřením.
// ============================================================================

export const GITHUB_STAV_COOKIE = 'admin_github_stav';

type FetchFn = typeof fetch;

export interface GithubUzivatel {
  id?: number;
  login?: string;
  two_factor_authentication?: boolean;
}

/** Adresa, na kterou se přesměruje k přihlášení. Scope read:user dává údaj o dvoufázovém ověření. */
export function adresaPrihlaseni(stav: string, presmerovani: string, clientId = process.env.ADMIN_GITHUB_CLIENT_ID): string {
  if (!clientId) throw new Error('Chybí ADMIN_GITHUB_CLIENT_ID.');
  const u = new URL('https://github.com/login/oauth/authorize');
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('redirect_uri', presmerovani);
  u.searchParams.set('scope', 'read:user');
  u.searchParams.set('state', stav);
  u.searchParams.set('allow_signup', 'false');
  return u.toString();
}

/**
 * Smí uživatel do administrace? Jen přesné číselné id vlastníka (login jde změnit)
 * a zapnuté dvoufázové ověření. Chybějící údaj znamená odmítnutí.
 */
export function smiDoAdministrace(
  uzivatel: GithubUzivatel,
  ocekavaneId = process.env.ADMIN_GITHUB_ID,
): { ok: true } | { ok: false; duvod: string } {
  if (!ocekavaneId || !/^\d+$/.test(ocekavaneId)) return { ok: false, duvod: 'Administrace nemá nastavený účet vlastníka.' };
  if (typeof uzivatel.id !== 'number' || String(uzivatel.id) !== ocekavaneId) return { ok: false, duvod: 'Tento účet na GitHubu do administrace nemá přístup.' };
  if (uzivatel.two_factor_authentication !== true) return { ok: false, duvod: 'Účet na GitHubu nemá zapnuté dvoufázové ověření.' };
  return { ok: true };
}

/** Vymění kód z GitHubu za přístupový token (jen pro jeden dotaz na /user, neukládá se). */
export async function vymenKod(
  kod: string,
  presmerovani: string,
  fetchFn: FetchFn = fetch,
  clientId = process.env.ADMIN_GITHUB_CLIENT_ID,
  clientSecret = process.env.ADMIN_GITHUB_CLIENT_SECRET,
): Promise<string> {
  if (!clientId || !clientSecret) throw new Error('Chybí ADMIN_GITHUB_CLIENT_ID nebo ADMIN_GITHUB_CLIENT_SECRET.');
  const odp = await fetchFn('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code: kod, redirect_uri: presmerovani }),
    cache: 'no-store',
  });
  const data = (await odp.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (!odp.ok || !data.access_token) throw new Error(`GitHub nevydal token (${data.error || odp.status}).`);
  return data.access_token;
}

export async function nactiUzivatele(token: string, fetchFn: FetchFn = fetch): Promise<GithubUzivatel> {
  const odp = await fetchFn('https://api.github.com/user', {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' },
    cache: 'no-store',
  });
  if (!odp.ok) throw new Error(`GitHub /user: ${odp.status}`);
  return (await odp.json()) as GithubUzivatel;
}
