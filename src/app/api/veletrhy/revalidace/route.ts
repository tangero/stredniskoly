import { NextRequest, NextResponse } from 'next/server';
import { jeTokenPlatny } from '@/lib/veletrhy-api';
import { obnovVeletrhy } from '@/lib/veletrhy-zdroj';

// ============================================================================
// Zneplatnění cache veletrhů po změně dat mimo Next.js (SQL revize, skript).
// Web čte akce přes cache s tagem `veletrhy` bez časové platnosti, takže
// zápis do tabulky `veletrh_akce` bez tohoto volání se na webu neprojeví.
//
// POST = zavolá obnovVeletrhy(). Nic nečte ani nezapisuje do databáze.
// Chráněno `CRON_SECRET` (hlavička Authorization: Bearer), jako migrace.
// ============================================================================

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const dodany = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jeTokenPlatny(dodany, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Neautorizováno.' }, { status: 401 });
  }
  obnovVeletrhy();
  return NextResponse.json({ ok: true });
}
