import { NextRequest, NextResponse } from 'next/server';
import { nactiOtevrenaDataSkoly } from '@/lib/skola-otevrena-data-server';
import { otevrenaDataMarkdown } from '@/lib/skola-otevrena-data';

// Stejná obnova jako stránka školy, aby otevřená data neukazovala jiný ročník než web.
// CDN drží odpověď jako ISR (s-maxage), prohlížeč ne: zápis v portálu zneplatní jen serverovou cache.
export const revalidate = 43200;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await nactiOtevrenaDataSkoly(slug);
  if (!data) {
    return new NextResponse('# 404 - Škola nenalezena\n', { status: 404, headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
  }
  return new NextResponse(otevrenaDataMarkdown(data), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=43200, stale-while-revalidate=86400' },
  });
}
