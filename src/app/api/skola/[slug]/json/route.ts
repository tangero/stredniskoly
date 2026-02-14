import { NextRequest, NextResponse } from 'next/server';
import { getSchoolPageType, getSchoolOverview, getExtendedSchoolStats, getProgramsByRedizo, getExtractionsByRedizo } from '@/lib/data';
import { krajNames } from '@/types/school';

export const revalidate = 86400;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const pageInfo = await getSchoolPageType(slug);

  if (!pageInfo.school) {
    return NextResponse.json({ error: 'Škola nenalezena' }, { status: 404 });
  }

  const redizo = pageInfo.redizo;
  const overview = await getSchoolOverview(redizo);
  if (!overview) {
    return NextResponse.json({ error: 'Data školy nenalezena' }, { status: 404 });
  }

  const programs = await getProgramsByRedizo(redizo);
  const extractions = await getExtractionsByRedizo(redizo);

  const statsMap = new Map<string, Awaited<ReturnType<typeof getExtendedSchoolStats>>>();
  for (const p of programs) {
    const stats = await getExtendedSchoolStats(p.id);
    if (stats) statsMap.set(p.id, stats);
  }

  const kraj = krajNames[overview.kraj_kod] || overview.kraj;
  const sortedPrograms = [...programs].sort((a, b) => b.min_body - a.min_body);

  const data = {
    nazev: overview.nazev,
    redizo,
    adresa: overview.adresa_plna,
    obec: overview.obec,
    okres: overview.okres,
    kraj,
    zrizovatel: overview.zrizovatel,
    celkova_kapacita: sortedPrograms.reduce((sum, p) => sum + p.kapacita, 0),
    celkem_prihlasek: sortedPrograms.reduce((sum, p) => sum + p.prihlasky, 0),
    url: `https://www.prijimackynaskolu.cz/skola/${slug}`,
    obory: sortedPrograms.map(p => {
      const stats = statsMap.get(p.id);
      return {
        nazev: p.zamereni ? `${p.obor} - ${p.zamereni}` : p.obor,
        typ: p.typ,
        delka_studia: p.delka_studia,
        kapacita: p.kapacita,
        prihlasky: p.prihlasky,
        prijati: p.prijati,
        index_poptavky: p.index_poptavky,
        min_body: p.min_body,
        ...(stats ? {
          cj_prumer: stats.cj_prumer,
          ma_prumer: stats.ma_prumer,
          jpz_min: stats.jpz_min,
          extra_kriteria: stats.hasExtraCriteria,
          extra_body: stats.extra_body,
        } : {}),
      };
    }),
    inspekce: extractions.map(ext => ({
      datum: ext.date,
      shrnutí: ext.plain_czech_summary,
      silne_stranky: ext.strengths?.map(s => ({ tag: s.tag, detail: s.detail })) || [],
      rizika: ext.risks?.map(r => ({ tag: r.tag, detail: r.detail })) || [],
    })),
    zdroj: 'CERMAT JPZ 2025, ČŠI',
  };

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
