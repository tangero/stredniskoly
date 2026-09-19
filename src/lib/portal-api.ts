import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { nactiEmaily } from './portal-magic';
import { domenaSediSeSkolou, posliTelegram } from './portal-oznameni';
import { PortalChyba, type PortalRole } from './portal-ucty';

// ============================================================================
// Společné kusy API tras účtů portálu (docs/ucty-portalu-skol-2027.md).
// ============================================================================

/** Tag cache veřejného „profil spravuje“; zneplatní se při každé změně správce. */
export const TAG_SPRAVCI = 'portal-spravci';

export function obnovVerejneSpravce(): void {
  try {
    // expire: 0 = zahodit hned; profil 'max' by ještě jednou ukázal starého správce.
    revalidateTag(TAG_SPRAVCI, { expire: 0 });
  } catch {
    // Mimo požadavek Next.js (testy) není co obnovovat.
  }
}

// In-memory omezení četnosti, stejný vzor jako /api/portal-magic. Na Vercelu
// platí jen v rámci jedné instance; proti hádání kódů stačí délka kódu.
const casy = new Map<string, number[]>();
export function jeOmezeno(klic: string, max = 10, oknoMs = 15 * 60 * 1000): boolean {
  const ted = Date.now();
  const nedavne = (casy.get(klic) || []).filter((t) => ted - t < oknoMs);
  if (nedavne.length >= max) {
    casy.set(klic, nedavne);
    return true;
  }
  nedavne.push(ted);
  casy.set(klic, nedavne);
  return false;
}

export function ipZPozadavku(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export function chyba(zprava: string, status: number): NextResponse {
  return NextResponse.json({ error: zprava }, { status });
}

/** PortalChyba → 409 s hláškou pro uživatele, ostatní → 500 do logu. */
export function odpovedNaChybu(e: unknown, kontext: string): NextResponse {
  if (e instanceof PortalChyba) return chyba(e.message, 409);
  console.error(`❌ Portál (${kontext}):`, e);
  return chyba('Něco se pokazilo. Zkuste to prosím znovu, případně napište na patrick@zandl.cz.', 500);
}

// ----------------------------------------------------------------------------
// Varování podle domény (oddíl 2.5)
// ----------------------------------------------------------------------------

let weby: Record<string, string> | null = null;
async function webSkoly(redizo: string): Promise<string | null> {
  if (!weby) {
    try {
      const obsah = await fs.readFile(path.join(process.cwd(), 'public', 'skoly_web.json'), 'utf-8');
      weby = (JSON.parse(obsah).weby ?? {}) as Record<string, string>;
    } catch {
      weby = {};
    }
  }
  return weby[redizo] ?? null;
}

export async function domenaSedi(redizo: string, email: string): Promise<boolean> {
  const emaily = (await nactiEmaily())[redizo] ?? [];
  return domenaSediSeSkolou(email, emaily, await webSkoly(redizo));
}

// ----------------------------------------------------------------------------
// Telegram
// ----------------------------------------------------------------------------

export async function oznamNovehoSpravce(role: PortalRole, nazevSkoly: string, vstup: string): Promise<void> {
  const sedi = await domenaSedi(role.redizo, role.email);
  await posliTelegram(
    [
      `🏫 Nový správce profilu (${vstup})`,
      `${nazevSkoly} (${role.redizo})`,
      `${role.jmeno}${role.funkce ? `, ${role.funkce}` : ''}`,
      `${role.email} ${sedi ? '✅ doména sedí se školou' : '⚠️ doména NESEDÍ se školou'}`,
      `jméno veřejně: ${role.zverejnit_jmeno ? 'ano' : 'ne'}`,
    ].join('\n'),
  );
}
