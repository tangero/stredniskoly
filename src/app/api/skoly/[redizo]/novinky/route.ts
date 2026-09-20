import { NextRequest, NextResponse } from 'next/server';
import { novinkySkoly } from '@/lib/skolni-novinky';

// ============================================================================
// Novinky z webu školy pro blok na stránce školy.
//
// Proč vlastní endpoint a ne součást staticky generované stránky
// (docs/skolske-novinky-rss-2027.md, oddíl 3.6, nález F6 čtvrté oponentury):
// `revalidatePath` ani výjimka při čtení databáze nezmizí z už vygenerované
// ISR stránky – ta se obslouží bez dotazu do databáze a při chybě během
// revalidace servíruje dál poslední úspěšný výsledek. Vypnutí vadné položky
// přepínačem by se tak nemuselo projevit.
//
// Kontrakt (zúžený podle P4 páté oponentury):
//   * pro **nová načtení** bloku je maximální stáří 60 sekund a vypnutí
//     položky nebo zdroje se do 60 sekund projeví;
//   * už otevřená stránka se sama neobnovuje – HTTP hlavička na to nemá vliv;
//   * chyba čtení databáze vrací **chybový stav, ne prázdný seznam**: blok se
//     nezobrazí a nikdy netvrdí „škola nemá novinky". Chyba se necachuje.
// ============================================================================

export const dynamic = 'force-dynamic';

const CACHE = 's-maxage=60, stale-while-revalidate=0';
const BEZ_CACHE = 'no-store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ redizo: string }> },
) {
  const { redizo } = await params;
  if (!/^\d{6,12}$/.test(redizo)) {
    return NextResponse.json({ error: 'Neplatné REDIZO.' }, { status: 400, headers: { 'Cache-Control': BEZ_CACHE } });
  }

  try {
    const novinky = await novinkySkoly(redizo);
    if (novinky === null) {
      // Databáze není nakonfigurovaná. Jiný stav než výpadek (jiný alarm
      // v dohledu), ale pro čtenáře stejný důsledek: blok se nerenderuje.
      return NextResponse.json(
        { stav: 'nenakonfigurovano' },
        { status: 503, headers: { 'Cache-Control': BEZ_CACHE } },
      );
    }
    return NextResponse.json(
      { stav: 'ok', ...novinky },
      { headers: { 'Cache-Control': CACHE } },
    );
  } catch {
    // Text výjimky ven nejde: může nést připojovací řetězec.
    return NextResponse.json(
      { stav: 'chyba' },
      { status: 503, headers: { 'Cache-Control': BEZ_CACHE } },
    );
  }
}
