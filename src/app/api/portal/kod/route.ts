import { NextRequest, NextResponse } from 'next/server';
import { getNazevSkoly } from '@/lib/portal-skol';
import { getIdentifikaceSkoly } from '@/lib/portal-identifikace';
import { jeDbNastavena } from '@/lib/novinky-db';
import { stavKodu } from '@/lib/portal-relace';
import { chyba, ipZPozadavku, jeOmezeno, odpovedNaChybu } from '@/lib/portal-api';

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

  try {
    // `stavKodu` sahá do databáze. Bez obalu by výpadek Neonu skončil
    // neošetřeným 500 místo hlášky, kterou škola pozná — sousední routy
    // portálu se všechny opírají o `odpovedNaChybu`.
    const { stav, redizo } = await stavKodu(body.kod);
    if (stav === 'neplatny') return NextResponse.json({ stav });
    if (!redizo) return NextResponse.json({ stav, nazev: '', skola: null });
    // Katalog nese jen zkrácený název („Gymnázium“), podle kterého se škola poznat
    // nedá. Kdo se chystá stát správcem, musí vidět plný název, adresu a IČO.
    const nazev = await getNazevSkoly(redizo);
    // Škola bez záznamu v zobrazovaném ročníku katalogu nemá profil k editaci:
    // `getPredvyplnenyProfil` vrátí null a /pro-skoly/profil skončí na „školu
    // neznáme“. Nabídnout založení by znamenalo spálit jednorázový kód na účtu,
    // se kterým se nedá nic dělat a který už nikdo nevrátí. Obě samostatné
    // stránky portálu to takhle odmítají už dřív, tahle cesta na to zapomněla.
    if (!nazev) return NextResponse.json({ stav: 'skola_nenalezena', nazev: '', skola: null });
    // Identifikaci potřebuje jen zakládací formulář. U spotřebovaného kódu nebo
    // školy, která už správce má, by se zbytečně četl skoro megabajtový rejstřík
    // a v odpovědi by putovala adresa a IČO ke kódu, se kterým už nikdo nic nesvede.
    if (stav !== 'volny') return NextResponse.json({ stav, nazev, skola: null });
    const skola = await getIdentifikaceSkoly(redizo, nazev);
    return NextResponse.json({ stav, nazev, skola });
  } catch (e) {
    return odpovedNaChybu(e, 'ověření kódu');
  }
}
