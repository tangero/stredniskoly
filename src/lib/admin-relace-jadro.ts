import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { Spojeni } from './novinky-db.ts';

// ============================================================================
// Jádro relací administrace (#479) bez závislosti na Next.js, sdílené s testy.
// Napojení na cookie a stránky je v admin-relace.ts.
// ============================================================================

export const ADMIN_COOKIE = 'admin_relace';
export const PLATNOST_RELACE_MS = 8 * 60 * 60 * 1000;
export const ADMIN_PRODUKCE = 'https://www.prijimackynaskolu.cz';

export type ZpusobPrihlaseni = 'passkey' | 'github';

export interface AdminRelace {
  zpusob: ZpusobPrihlaseni;
  githubLogin: string | null;
  passkeyId: string | null;
  vyprsi: string;
}

export const otisk = (id: string): string => createHash('sha256').update(id, 'utf8').digest('hex');

export async function zapisUdalost(
  s: Spojeni,
  udalost: string,
  zpusob: ZpusobPrihlaseni | null,
  detail: Record<string, unknown> = {},
): Promise<void> {
  await s.dotaz('insert into admin_udalost (udalost, zpusob, detail) values ($1, $2, $3::jsonb)', [
    udalost,
    zpusob,
    JSON.stringify(detail),
  ]);
}

/** Založí relaci a vrátí identifikátor pro cookie (do databáze jde jen otisk). */
export async function zalozRelaci(
  s: Spojeni,
  udaje: { zpusob: ZpusobPrihlaseni; githubLogin?: string | null; passkeyId?: string | null },
  ted = Date.now(),
): Promise<string> {
  const id = randomBytes(32).toString('base64url');
  await s.dotaz(
    `insert into admin_relace (otisk, zpusob, github_login, passkey_id, vytvoreno, vyprsi)
     values ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz)`,
    [
      otisk(id),
      udaje.zpusob,
      udaje.githubLogin ?? null,
      udaje.passkeyId ?? null,
      new Date(ted).toISOString(),
      new Date(ted + PLATNOST_RELACE_MS).toISOString(),
    ],
  );
  await zapisUdalost(s, 'prihlaseni', udaje.zpusob, udaje.githubLogin ? { login: udaje.githubLogin } : {});
  return id;
}

/** Platná relace podle identifikátoru z cookie, jinak null (prošlá, zrušená, neznámá). */
export async function overRelaci(s: Spojeni, id: string | undefined | null, ted = Date.now()): Promise<AdminRelace | null> {
  if (!id || typeof id !== 'string' || id.length > 100) return null;
  const { rows } = await s.dotaz<{ zpusob: ZpusobPrihlaseni; github_login: string | null; passkey_id: string | null; vyprsi: string | Date }>(
    `select zpusob, github_login, passkey_id, vyprsi from admin_relace
     where otisk = $1 and zruseno is null and vyprsi > $2::timestamptz`,
    [otisk(id), new Date(ted).toISOString()],
  );
  const r = rows[0];
  if (!r) return null;
  return { zpusob: r.zpusob, githubLogin: r.github_login, passkeyId: r.passkey_id, vyprsi: new Date(r.vyprsi).toISOString() };
}

export async function zrusRelaci(s: Spojeni, id: string): Promise<void> {
  await s.dotaz('update admin_relace set zruseno = now() where otisk = $1 and zruseno is null', [otisk(id)]);
}

/** Odhlásí všechna zařízení (například po ztrátě telefonu). */
export async function zrusVsechnyRelace(s: Spojeni): Promise<number> {
  const { rowCount } = await s.dotaz('update admin_relace set zruseno = now() where zruseno is null');
  return rowCount;
}

// ----------------------------------------------------------------------------
// Krátkodobé podepsané hodnoty (výzva passkey, stav OAuth) v cookie. Podpis
// HMAC-SHA256 klíčem ADMIN_SECRET, účel a expirace jsou součástí podpisu.
// ----------------------------------------------------------------------------

export const PLATNOST_VYZVY_MS = 10 * 60 * 1000;

export function podepis(ucel: string, hodnota: string, ted = Date.now(), secret = process.env.ADMIN_SECRET): string {
  if (!secret) throw new Error('Chybí ADMIN_SECRET.');
  const telo = Buffer.from(JSON.stringify({ u: ucel, h: hodnota, e: ted + PLATNOST_VYZVY_MS })).toString('base64url');
  const mac = createHmac('sha256', secret).update(telo).digest('base64url');
  return `${telo}.${mac}`;
}

/** Vrátí podepsanou hodnotu, nebo null (špatný podpis, jiný účel, prošlá). */
export function overPodpis(ucel: string, token: string | undefined | null, ted = Date.now(), secret = process.env.ADMIN_SECRET): string | null {
  if (!secret || !token || typeof token !== 'string') return null;
  const [telo, mac] = token.split('.');
  if (!telo || !mac) return null;
  const ocekavany = createHmac('sha256', secret).update(telo).digest();
  let dany: Buffer;
  try {
    dany = Buffer.from(mac, 'base64url');
  } catch {
    return null;
  }
  if (dany.length !== ocekavany.length || !timingSafeEqual(dany, ocekavany)) return null;
  try {
    const p = JSON.parse(Buffer.from(telo, 'base64url').toString('utf8')) as { u?: string; h?: string; e?: number };
    if (p.u !== ucel || typeof p.h !== 'string' || typeof p.e !== 'number' || p.e < ted) return null;
    return p.h;
  } catch {
    return null;
  }
}
