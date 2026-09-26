import { NextRequest, NextResponse } from 'next/server';
import { dotaz } from '@/lib/novinky-db';
import { overEdu, chyba } from '@/lib/veletrhy-api';
import { detailAkce } from '@/lib/veletrhy-sklad';

// Detail akce s verzí a posledními 20 auditními záznamy (bez e-mailových referencí).

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const odmitnuti = overEdu(request, 'cteni');
  if (odmitnuti) return odmitnuti;
  const { id } = await params;
  try {
    const detail = await detailAkce({ dotaz }, id);
    if (!detail) return chyba(404, 'Akce neexistuje.');
    return NextResponse.json(detail);
  } catch (e) {
    console.error('❌ Veletrhy API: detail akce', e);
    return chyba(500, 'Databáze neodpověděla.');
  }
}
