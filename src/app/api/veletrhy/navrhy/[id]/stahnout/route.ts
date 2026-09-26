import { NextRequest, NextResponse } from 'next/server';
import { vTransakci } from '@/lib/novinky-db';
import { overEdu, chyba } from '@/lib/veletrhy-api';
import { navrh, stahniNavrh } from '@/lib/veletrhy-sklad';

// Stažení vlastního návrhu; jde jen, dokud čeká na rozhodnutí.

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const odmitnuti = overEdu(request, 'navrh');
  if (odmitnuti) return odmitnuti;
  const { id } = await params;
  try {
    const n = await vTransakci(async (s) => {
      const puvodni = await navrh(s, id);
      if (!puvodni || puvodni.autor !== 'eduarda') return null;
      return stahniNavrh(s, id, 'eduarda');
    });
    if (!n) return chyba(404, 'Návrh neexistuje.');
    if (n.stav !== 'stazeno') return chyba(409, `Návrh už nečeká (stav ${n.stav}).`, { stav: n.stav });
    return NextResponse.json({ id: n.id, stav: n.stav });
  } catch (e) {
    console.error('❌ Veletrhy API: stažení návrhu', e);
    return chyba(500, 'Databáze neodpověděla.');
  }
}
