import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'crypto';

// ============================================================================
// Podepsané odkazy a otisky pro odběr novinek
// (docs/novinky-k-prijimackam-2027.md, oddíl 6).
//
// Token nese jen `jti` žádosti a její expiraci; adresa ani volby v něm nejsou,
// protože leží v tabulce zadost_o_potvrzeni. Tajemství je v NOVINKY_SECRET.
// Token ani tajemství nikdy nepatří do logů.
//
// Otisky adres jsou HMAC se stejným tajemstvím, ne prostý SHA-256: prostý
// otisk adresy jde zkoušet slovníkem a nesmí se nazývat anonymizací.
// ============================================================================

export const ZADOST_PLATNOST_MS = 72 * 60 * 60 * 1000; // 72 hodin
export const VYZVA_PLATNOST_MS = 30 * 24 * 60 * 60 * 1000; // 30 dnů
export const NOVINKY_BASE_URL = 'https://www.prijimackynaskolu.cz';

/** Neutrální odpověď přihlašovacího endpointu – vždy stejná (anti-enumerace). */
export const PRIHLASENI_NEUTRALNI_ODPOVED = {
  success: true,
  zprava: 'Poslali jsme ti e-mail s odkazem, kterým odběr potvrdíš.',
} as const;

export type Ucel = 'novinky' | 'kalendar' | 'novy_rocnik';
export type DruhStudia = 'ss' | 'vicelete';

interface TokenPayload {
  jti: string;
  exp: number; // unix ms
}

function base64url(data: string | Buffer): string {
  return Buffer.from(data).toString('base64url');
}

function podepis(payloadB64: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(payloadB64).digest();
}

function tajemstvi(secret?: string): string {
  const s = secret ?? process.env.NOVINKY_SECRET;
  if (!s) throw new Error('NOVINKY_SECRET není nastaven');
  return s;
}

/** Nový identifikátor žádosti. Je i klíčem proti druhému použití odkazu. */
export function noveJti(): string {
  return randomUUID();
}

/**
 * Token pro potvrzovací odkaz. Platnost se řídí účelem: žádost z formuláře
 * 72 hodin, výzva k novému ročníku 30 dnů od odeslání výzvy.
 */
export function vytvorToken(
  jti: string,
  platnostMs: number = ZADOST_PLATNOST_MS,
  secret?: string,
): string {
  const payload: TokenPayload = { jti, exp: Date.now() + platnostMs };
  const payloadB64 = base64url(JSON.stringify(payload));
  return `${payloadB64}.${base64url(podepis(payloadB64, tajemstvi(secret)))}`;
}

/**
 * Ověří podpis a expiraci a vrátí `jti`, nebo null. Platnost žádosti se pak
 * ověřuje ještě v databázi, protože token sám o jejím stavu nic neví.
 */
export function overToken(token: string, secret?: string): string | null {
  const casti = token.split('.');
  if (casti.length !== 2) return null;
  const [payloadB64, podpisB64] = casti;

  let ocekavany: Buffer;
  try {
    ocekavany = podepis(payloadB64, tajemstvi(secret));
  } catch {
    return null;
  }
  const dodany = Buffer.from(podpisB64, 'base64url');
  if (dodany.length !== ocekavany.length) return null;
  if (!timingSafeEqual(dodany, ocekavany)) return null;

  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (typeof payload.jti !== 'string' || typeof payload.exp !== 'number') return null;
  if (payload.exp < Date.now()) return null;
  return payload.jti;
}

/** Odkaz, kterým člověk otevře potvrzovací stránku. */
export function potvrzovaciOdkaz(token: string, base = NOVINKY_BASE_URL): string {
  return `${base}/api/novinky/potvrdit?t=${encodeURIComponent(token)}`;
}

/** Odkaz pro odhlášení jedním kliknutím (RFC 8058) z jedné konkrétní zprávy. */
export function odhlasovaciOdkaz(token: string, base = NOVINKY_BASE_URL): string {
  return `${base}/api/novinky/odhlasit?t=${encodeURIComponent(token)}`;
}

/** Otisk adresy nebo IP pro limity a doklady. HMAC, ne prostý hash. */
export function otisk(hodnota: string, secret?: string): string {
  return createHmac('sha256', tajemstvi(secret)).update(hodnota).digest('hex');
}

/** Normalizace adresy: malá písmena, bez okolních mezer. */
export function normalizujEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Základní kontrola podoby adresy, stejná jako v portálu pro školy. */
export function jeEmailPlatny(email: string): boolean {
  return email.length > 0 && email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Náhodný identifikátor pro dávku, položku nebo doklad. */
export function noveId(): string {
  return randomUUID();
}

/** Krátká relace mezi ověřením odkazu a potvrzením (cookie HttpOnly). */
export function novaRelace(): string {
  return randomBytes(32).toString('base64url');
}
