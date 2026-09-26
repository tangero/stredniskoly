import { NextRequest, NextResponse } from 'next/server';
import { dotaz } from '@/lib/novinky-db';
import { overEdu, chyba } from '@/lib/veletrhy-api';
import { navrh } from '@/lib/veletrhy-sklad';

// Detail návrhu: stav, případná chyba provedení a důvod zamítnutí.

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const odmitnuti = overEdu(request, 'cteni');
  if (odmitnuti) return odmitnuti;
  const { id } = await params;
  try {
    const n = await navrh({ dotaz }, id);
    if (!n || n.autor !== 'eduarda') return chyba(404, 'Návrh neexistuje.');
    return NextResponse.json(n);
  } catch (e) {
    console.error('❌ Veletrhy API: detail návrhu', e);
    return chyba(500, 'Databáze neodpověděla.');
  }
}
