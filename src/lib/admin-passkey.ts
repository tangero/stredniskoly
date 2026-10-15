import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type { AuthenticationResponseJSON, AuthenticatorTransportFuture, RegistrationResponseJSON } from '@simplewebauthn/server';
import { zapisUdalost } from './admin-relace-jadro.ts';
import type { Spojeni } from './novinky-db.ts';

// ============================================================================
// Passkey vlastníka do administrace (#479, WebAuthn přes @simplewebauthn/server).
// Registrovat smí jen přihlášený vlastník; přihlášení ověřuje podpis výzvy
// veřejným klíčem z databáze a vždy vyžaduje ověření uživatele (otisk, Face ID, PIN).
// ============================================================================

export const VYZVA_COOKIE = 'admin_passkey_vyzva';
const RP_NAZEV = 'Přijímačky na školu: administrace';
// Jediný uživatel (vlastník): pevné id, aby se passkey z různých zařízení vázaly k jedné osobě.
const UZIVATEL_ID = new TextEncoder().encode('prijimacky-vlastnik');

export interface Passkey {
  id: string;
  nazev: string;
  vytvoreno: string;
  naposledy: string | null;
}

interface RadekPasskey {
  id: string;
  verejny_klic: string;
  pocitadlo: string | number;
  transporty: string[] | null;
}

/** Strana WebAuthn podle adresy požadavku: rpID je doména, origin celý původ. */
export function strana(url: string): { rpID: string; origin: string } {
  const u = new URL(url);
  return { rpID: u.hostname, origin: u.origin };
}

export async function seznamPasskey(s: Spojeni): Promise<Passkey[]> {
  const { rows } = await s.dotaz<{ id: string; nazev: string; vytvoreno: string | Date; naposledy: string | Date | null }>(
    'select id, nazev, vytvoreno, naposledy from admin_passkey where zruseno is null order by vytvoreno',
  );
  return rows.map((r) => ({
    id: r.id,
    nazev: r.nazev,
    vytvoreno: new Date(r.vytvoreno).toISOString(),
    naposledy: r.naposledy ? new Date(r.naposledy).toISOString() : null,
  }));
}

async function platne(s: Spojeni): Promise<RadekPasskey[]> {
  const { rows } = await s.dotaz<RadekPasskey>('select id, verejny_klic, pocitadlo, transporty from admin_passkey where zruseno is null');
  return rows;
}

const transporty = (t: string[] | null) => (t || []) as AuthenticatorTransportFuture[];

export async function moznostiRegistrace(s: Spojeni, rpID: string) {
  return generateRegistrationOptions({
    rpName: RP_NAZEV,
    rpID,
    userName: 'vlastnik',
    userDisplayName: 'Vlastník webu',
    userID: UZIVATEL_ID,
    attestationType: 'none',
    excludeCredentials: (await platne(s)).map((p) => ({ id: p.id, transports: transporty(p.transporty) })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  });
}

/** Ověří registraci a uloží passkey. Vrací jeho id. */
export async function ulozRegistraci(
  s: Spojeni,
  odpoved: RegistrationResponseJSON,
  o: { vyzva: string; rpID: string; origin: string; nazev: string },
): Promise<string> {
  const v = await verifyRegistrationResponse({
    response: odpoved,
    expectedChallenge: o.vyzva,
    expectedOrigin: o.origin,
    expectedRPID: o.rpID,
    requireUserVerification: true,
  });
  if (!v.verified || !v.registrationInfo) throw new Error('Registrace passkey neprošla ověřením.');
  const c = v.registrationInfo.credential;
  const nazev = o.nazev.trim().slice(0, 60) || 'Passkey';
  await s.dotaz(
    `insert into admin_passkey (id, verejny_klic, pocitadlo, transporty, nazev) values ($1, $2, $3, $4, $5)`,
    [c.id, Buffer.from(c.publicKey).toString('base64url'), c.counter, c.transports ?? [], nazev],
  );
  await zapisUdalost(s, 'passkey_pridan', null, { nazev });
  return c.id;
}

export async function moznostiPrihlaseni(s: Spojeni, rpID: string) {
  return generateAuthenticationOptions({
    rpID,
    userVerification: 'required',
    allowCredentials: (await platne(s)).map((p) => ({ id: p.id, transports: transporty(p.transporty) })),
  });
}

/** Ověří přihlášení passkey; vrací id passkey, nebo vyhodí chybu. Posune počítadlo. */
export async function overPrihlaseni(
  s: Spojeni,
  odpoved: AuthenticationResponseJSON,
  o: { vyzva: string; rpID: string; origin: string },
): Promise<string> {
  const p = (await platne(s)).find((x) => x.id === odpoved.id);
  if (!p) throw new Error('Neznámý nebo zrušený passkey.');
  const v = await verifyAuthenticationResponse({
    response: odpoved,
    expectedChallenge: o.vyzva,
    expectedOrigin: o.origin,
    expectedRPID: o.rpID,
    requireUserVerification: true,
    credential: {
      id: p.id,
      publicKey: new Uint8Array(Buffer.from(p.verejny_klic, 'base64url')),
      counter: Number(p.pocitadlo),
      transports: transporty(p.transporty),
    },
  });
  if (!v.verified) throw new Error('Přihlášení passkey neprošlo ověřením.');
  await s.dotaz('update admin_passkey set pocitadlo = $2, naposledy = now() where id = $1', [p.id, v.authenticationInfo.newCounter]);
  return p.id;
}

export async function zrusPasskey(s: Spojeni, id: string): Promise<boolean> {
  const { rows } = await s.dotaz<{ nazev: string }>('update admin_passkey set zruseno = now() where id = $1 and zruseno is null returning nazev', [id]);
  if (!rows[0]) return false;
  await zapisUdalost(s, 'passkey_zrusen', null, { nazev: rows[0].nazev });
  return true;
}
