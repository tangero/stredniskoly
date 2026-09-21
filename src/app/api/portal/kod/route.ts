import { NextRequest, NextResponse } from 'next/server';
import { getNazevSkoly } from '@/lib/portal-skol';
import { getIdentifikaceSkoly } from '@/lib/portal-identifikace';
import { jeDbNastavena } from '@/lib/novinky-db';
import { stavKodu } from '@/lib/portal-relace';
import { chyba, ipZPozadavku, jeOmezeno } from '@/lib/portal-api';

// ============================================================================
// Ověření přihlašovacího kódu před založením správce (docs/ucty-portalu-skol-2027.md, 2.2).
// Kód chodí v těle POST, ne v adrese, aby nezůstal v historii ani v lozích.
// ============================================================================

export async function POST(request: NextRequest) {
  if (!jeDbNastavena()) return chyba('Portál pro školy není nakonfigurován.', 503);
  if (jeOmezeno(`kod:${ipZPozadavku(request.headers)}`, 20)) {
    return chyba('Příliš mnoho pokusů. Zkuste to prosím za chvíli.', 429);
  }
  const body = (await request.json().catch(() => ({}))) as { kod?: unknown };
  if (typeof body.kod !== 'string' || !body.kod.trim()) return chyba('Zadejte kód.', 400);

  const { stav, redizo } = await stavKodu(body.kod);
  if (stav === 'neplatny') return NextResponse.json({ stav });
  if (!redizo) return NextResponse.json({ stav, nazev: '', skola: null });
  // Katalog nese jen zkrácený název („Gymnázium“), podle kterého se škola poznat
  // nedá. Kdo se chystá stát správcem, musí vidět plný název, adresu a IČO.
  const nazev = await getNazevSkoly(redizo);
  // Identifikaci potřebuje jen zakládací formulář. U spotřebovaného kódu nebo
  // školy, která už správce má, by se zbytečně četl skoro megabajtový rejstřík
  // a v odpovědi by putovala adresa a IČO ke kódu, se kterým už nikdo nic nesvede.
  if (stav !== 'volny') return NextResponse.json({ stav, nazev, skola: null });
  // Identifikace je ozdoba, uplatnění kódu je podstata: kdyby se nepodařila,
  // formulář se vykreslí bez ní. Škola s platným kódem se nesmí zaseknout na 500.
  let skola = null;
  try {
    skola = await getIdentifikaceSkoly(redizo, nazev);
  } catch (e) {
    console.error('❌ Portál: identifikaci školy nejde sestavit', e);
  }
  return NextResponse.json({ stav, nazev, skola });
}
