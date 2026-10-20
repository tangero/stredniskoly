import { NextResponse } from 'next/server';
import { getPolozkyHledani } from '@/lib/data';

// Položky hledání škol pro pole na titulce, /skoly a /regiony. Vzniká při buildu jako statický soubor,
// aby se nevkládaly do HTML každé stránky; pole je stáhne až při prvním zaměření.
export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json(await getPolozkyHledani(), {
    headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' },
  });
}
