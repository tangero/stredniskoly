import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { validateKod } from './portal-skol.ts';
import type { PortalKodZaznam } from './portal-skol.ts';

// ============================================================================
// Magic link pro Portál pro školy (§2.2 návrhu docs/portal-pro-skoly-2027.md)
// Bezstavový token: base64url(JSON {redizo, exp, nonce}) + HMAC-SHA256 podpis.
// Tajný klíč je v env PORTAL_MAGIC_SECRET; token ani klíč nikdy nepatří do logů.
// ============================================================================

export const MAGIC_TOKEN_PLATNOST_MS = 72 * 60 * 60 * 1000; // 72 hodin
export const PORTAL_PRODUKCNI_BASE_URL = 'https://www.prijimackynaskolu.cz';

/** Neutrální odpověď magic endpointu – vždy stejná, ať e-mail známe, nebo ne (anti-enumerace). */
export const MAGIC_NEUTRALNI_ODPOVED = {
  success: true,
  zprava: 'Pokud adresu známe, poslali jsme na ni odkaz pro úpravu profilu školy.',
} as const;

interface MagicPayload {
  redizo: string;
  exp: number; // unix ms
  nonce: string;
}

function base64url(data: string | Buffer): string {
  return Buffer.from(data).toString('base64url');
}

function podepis(payloadB64: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(payloadB64).digest();
}

/**
 * Vytvoří magic token pro REDIZO. Bez PORTAL_MAGIC_SECRET hodí výjimku
 * (API route ji odchytí a vrátí 503, stejný vzor jako GITHUB_TOKEN).
 */
export function vytvorMagicToken(redizo: string, secret = process.env.PORTAL_MAGIC_SECRET): string {
  if (!secret) {
    throw new Error('Chybí PORTAL_MAGIC_SECRET.');
  }
  const payload: MagicPayload = {
    redizo,
    exp: Date.now() + MAGIC_TOKEN_PLATNOST_MS,
    nonce: randomBytes(16).toString('hex'),
  };
  const payloadB64 = base64url(JSON.stringify(payload));
  const podpis = podepis(payloadB64, secret).toString('base64url');
  return `${payloadB64}.${podpis}`;
}

/**
 * Ověří podpis (constant-time) a expiraci; vrátí REDIZO nebo null.
 * Bez PORTAL_MAGIC_SECRET vrací null.
 */
export function overMagicToken(token: string, secret = process.env.PORTAL_MAGIC_SECRET): string | null {
  if (!secret) return null;
  if (typeof token !== 'string') return null;
  const [payloadB64, podpisB64] = token.split('.');
  if (!payloadB64 || !podpisB64) return null;

  let podpis: Buffer;
  try {
    podpis = Buffer.from(podpisB64, 'base64url');
  } catch {
    return null;
  }
  const ocekavany = podepis(payloadB64, secret);
  if (podpis.length !== ocekavany.length || !timingSafeEqual(podpis, ocekavany)) {
    return null;
  }

  let payload: MagicPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
  if (!payload || typeof payload.redizo !== 'string' || typeof payload.exp !== 'number') {
    return null;
  }
  if (payload.exp <= Date.now()) return null; // expirovaný
  return payload.redizo;
}

/** Sestaví plný odkaz pro e-mail. Base URL z env PORTAL_BASE_URL, fallback produkční doména. */
export function magicOdkaz(redizo: string): string {
  const base = (process.env.PORTAL_BASE_URL || PORTAL_PRODUKCNI_BASE_URL).replace(/\/$/, '');
  return `${base}/pro-skoly/link/${vytvorMagicToken(redizo)}`;
}

// ----------------------------------------------------------------------------
// Lookup e-mailu v rejstříkové mapě (data/portal/emaily.json)
// ----------------------------------------------------------------------------

export function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

export async function nactiEmaily(): Promise<Record<string, string[]>> {
  try {
    const obsah = await fs.readFile(path.join(process.cwd(), 'data', 'portal', 'emaily.json'), 'utf-8');
    return JSON.parse(obsah) as Record<string, string[]>;
  } catch {
    return {};
  }
}

/** Najde REDIZO podle e-mailové adresy; vrátí null, když adresu neznáme. */
export async function najdiRedizoPodleEmailu(
  email: string,
  mapa?: Record<string, string[]>,
): Promise<string | null> {
  const norm = normalizeEmail(email);
  if (!norm) return null;
  const data = mapa ?? (await nactiEmaily());
  for (const [redizo, emaily] of Object.entries(data)) {
    if (emaily.includes(norm)) return redizo;
  }
  return null;
}

// ----------------------------------------------------------------------------
// Společné rozresolvování autorizace pro /api/portal-skoly: kód NEBO magic token
// ----------------------------------------------------------------------------

export type PortalKanal = 'kod' | 'magic-link';

/**
 * Přijme buď přihlašovací kód, nebo magic token; vrátí REDIZO a kanál,
 * kterým škola přišla. Token ani kód se nikam nezapisuje.
 */
export async function resolvePortalAuth(
  body: { kod?: unknown; magic?: unknown },
  kody?: PortalKodZaznam[],
): Promise<{ redizo: string; kanal: PortalKanal } | null> {
  if (typeof body.kod === 'string' && body.kod.trim()) {
    const redizo = await validateKod(body.kod, kody);
    return redizo ? { redizo, kanal: 'kod' } : null;
  }
  if (typeof body.magic === 'string' && body.magic.trim()) {
    const redizo = overMagicToken(body.magic);
    return redizo ? { redizo, kanal: 'magic-link' } : null;
  }
  return null;
}
