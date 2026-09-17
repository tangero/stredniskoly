import { NextResponse } from 'next/server';
import { zobrazeneObdobi } from '@/lib/stav-datovych-sad';
import calendar from '@/data/admissions-2027.json';

// ============================================================================
// Stav odběru pro klientské části webu (patička).
//
// Ročník se bere z registru stavu datových sad, nikdy z letopočtu v kódu, a
// formulář se nabízí jen tehdy, když kalendář toho období má budoucí událost.
// ============================================================================

export const revalidate = 3600;

export async function GET() {
  if (process.env.NOVINKY_ZAPNUTO !== '1') {
    return NextResponse.json({ zapnuto: false });
  }
  const rocnik = await zobrazeneObdobi('msmt-harmonogram');
  const dnes = new Date().toISOString().slice(0, 10);
  const budouci = calendar.groups.some((g) => g.events.some((e) => (e.end ?? e.start) >= dnes));
  if (!rocnik || !budouci) return NextResponse.json({ zapnuto: false });
  return NextResponse.json({ zapnuto: true, rocnik });
}
