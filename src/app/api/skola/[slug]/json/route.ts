import { NextRequest, NextResponse } from 'next/server';
import { nactiOtevrenaDataSkoly } from '@/lib/skola-otevrena-data-server';
import { hlavickyOtevrenychDat } from '@/lib/skola-otevrena-data';

// Stejná obnova jako stránka školy, aby otevřená data neukazovala jiný ročník než web.
// Cache-Control nenastavujeme: Next ho odvodí z revalidate a na Vercelu k odpovědi přidá značky
// cache, takže zápis v portálu zneplatní i ji. Ruční s-maxage by na CDN značce unikl.
export const revalidate = 43200;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await nactiOtevrenaDataSkoly(slug);
  if (!data) return NextResponse.json({ error: 'Škola nenalezena' }, { status: 404 });
  return NextResponse.json(data, { headers: hlavickyOtevrenychDat(data, 'application/json') });
}
