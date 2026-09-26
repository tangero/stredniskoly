import { NextRequest, NextResponse } from 'next/server';
import { dotaz } from '@/lib/novinky-db';
import { overEdu, chyba } from '@/lib/veletrhy-api';
import { akceSVerzi } from '@/lib/veletrhy-sklad';
import { SEZONA, zobrazitelneAkce } from '@/lib/veletrhy';

// Seznam akcí s verzí pro Eduardu (docs/veletrhy-api-2027.md, oddíl 4.1).
// Bez ?vse=1 jen to, co web právě ukazuje; s ním i nepotvrzené a proběhlé.

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const odmitnuti = overEdu(request, 'cteni');
  if (odmitnuti) return odmitnuti;
  try {
    const vse = await akceSVerzi({ dotaz }, SEZONA);
    const zobrazene = new Set(zobrazitelneAkce(new Date(), vse.map((x) => x.akce)).map((a) => a.id));
    const akce = request.nextUrl.searchParams.get('vse') === '1' ? vse : vse.filter((x) => zobrazene.has(x.akce.id));
    return NextResponse.json({
      sezona: SEZONA,
      akce: akce.map((x) => ({ ...x.akce, verze: x.verze, zobrazena: zobrazene.has(x.akce.id) })),
    });
  } catch (e) {
    console.error('❌ Veletrhy API: seznam akcí', e);
    return chyba(500, 'Databáze neodpověděla.');
  }
}
