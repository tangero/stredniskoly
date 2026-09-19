import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import { overToken, vytvorToken, PLATNOST_TOKENU_MS, portalBaseUrl } from './portal-magic';
import { dotaz, jeDbNastavena } from './novinky-db';
import { platneRoleOsoby, spravceSkoly, type PortalRole } from './portal-ucty';
import { hashKod, validateKod } from './portal-skol';
import type { Spojeni } from './novinky-db';

// ============================================================================
// Relace přihlášené osoby portálu (docs/ucty-portalu-skol-2027.md, oddíl 2.2).
//
// Cookie nese jen podepsané osoba_id a expiraci. Role se při každém požadavku
// čtou znovu z databáze, takže zrušení v administraci platí okamžitě.
// ============================================================================

export const RELACE_COOKIE = 'portal_relace';

/** Spojení nad sdíleným poolem pro čtení mimo transakci. */
export const cteni: Spojeni = { dotaz };

export function nastavRelaci(odpoved: NextResponse, osobaId: string): void {
  odpoved.cookies.set(RELACE_COOKIE, vytvorToken('relace', { osoba_id: osobaId }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(PLATNOST_TOKENU_MS.relace / 1000),
  });
}

export function zrusRelaci(odpoved: NextResponse): void {
  odpoved.cookies.set(RELACE_COOKIE, '', { path: '/', maxAge: 0 });
}

function osobaZTokenu(token: string | undefined): string | null {
  if (!token) return null;
  const payload = overToken(token, 'relace');
  return typeof payload?.osoba_id === 'string' ? payload.osoba_id : null;
}

export interface Prihlaseny {
  osobaId: string;
  role: PortalRole[];
}

/** Přihlášená osoba s platnými rolemi (server komponenty). Bez rolí = nepřihlášen. */
export async function prihlasenyZCookies(): Promise<Prihlaseny | null> {
  if (!jeDbNastavena()) return null;
  const osobaId = osobaZTokenu((await cookies()).get(RELACE_COOKIE)?.value);
  if (!osobaId) return null;
  const role = await platneRoleOsoby(cteni, osobaId);
  return role.length > 0 ? { osobaId, role } : null;
}

/** Přihlášená osoba z požadavku API. */
export async function prihlasenyZPozadavku(request: NextRequest): Promise<Prihlaseny | null> {
  if (!jeDbNastavena()) return null;
  const osobaId = osobaZTokenu(request.cookies.get(RELACE_COOKIE)?.value);
  if (!osobaId) return null;
  const role = await platneRoleOsoby(cteni, osobaId);
  return role.length > 0 ? { osobaId, role } : null;
}

/**
 * Ochrana proti CSRF u POST s cookie: požadavek musí přijít z našeho webu.
 * SameSite=Lax sám nestačí na starší prohlížeče a na formuláře z poddomén.
 */
export function jeNasPuvod(request: NextRequest): boolean {
  const puvod = request.headers.get('origin');
  if (!puvod) return false;
  const povolene = new Set([portalBaseUrl(), new URL(request.url).origin]);
  return povolene.has(puvod.replace(/\/$/, ''));
}

/** Stav přihlašovacího kódu: kódy jsou v data/portal/kody.json, spotřebování v databázi. */
export type StavKodu = 'volny' | 'uplatnen' | 'skola_ma_spravce' | 'neplatny';

export async function stavKodu(kod: string): Promise<{ stav: StavKodu; redizo?: string }> {
  const redizo = await validateKod(kod);
  if (!redizo) return { stav: 'neplatny' };
  const pouzity = await cteni.dotaz(`select 1 from portal_kod_uplatneni where kod_hash = $1`, [hashKod(kod)]);
  if (pouzity.rowCount > 0) return { stav: 'uplatnen', redizo };
  if (await spravceSkoly(cteni, redizo)) return { stav: 'skola_ma_spravce', redizo };
  return { stav: 'volny', redizo };
}

