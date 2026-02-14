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
    return new NextResponse('# 404 - Škola nenalezena\n', {
      status: 404,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    });
  }

  const redizo = pageInfo.redizo;
  const overview = await getSchoolOverview(redizo);
  if (!overview) {
    return new NextResponse('# 404 - Data školy nenalezena\n', {
      status: 404,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    });
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
  const totalKapacita = sortedPrograms.reduce((sum, p) => sum + p.kapacita, 0);
  const totalPrihlasky = sortedPrograms.reduce((sum, p) => sum + p.prihlasky, 0);

  let md = '';

  md += `# ${overview.nazev}\n\n`;
  md += `> Střední škola v obci ${overview.obec}, ${kraj}\n\n`;

  md += `## Základní informace\n\n`;
  md += `- **Adresa:** ${overview.adresa_plna}\n`;
  md += `- **Obec:** ${overview.obec}\n`;
  md += `- **Okres:** ${overview.okres}\n`;
  md += `- **Kraj:** ${kraj}\n`;
  md += `- **Zřizovatel:** ${overview.zrizovatel}\n`;
  md += `- **Počet oborů:** ${sortedPrograms.length}\n`;
  md += `- **Celková kapacita:** ${totalKapacita} míst\n`;
  md += `- **Celkem přihlášek:** ${totalPrihlasky}\n\n`;

  md += `## Obory a přijímací řízení 2025\n\n`;

  for (const program of sortedPrograms) {
    const label = program.zamereni
      ? `${program.obor} - ${program.zamereni}`
      : program.obor;
    const delkaSlovy: Record<number, string> = {
      2: 'dvouleté', 3: 'tříleté', 4: 'čtyřleté',
      5: 'pětileté', 6: 'šestileté', 8: 'osmileté',
    };
    const delka = delkaSlovy[program.delka_studia] || `${program.delka_studia}leté`;

    md += `### ${label}\n\n`;
    md += `- **Typ:** ${program.typ}, ${delka} studium\n`;
    md += `- **Kapacita:** ${program.kapacita} míst\n`;
    md += `- **Přihlášek:** ${program.prihlasky}\n`;
    md += `- **Přijatých:** ${program.prijati}\n`;
    md += `- **Index poptávky:** ${program.index_poptavky.toFixed(1)}× (přihlášek na 1 místo)\n`;
    md += `- **Minimální body pro přijetí:** ${program.min_body} z 100 (JPZ)\n`;

    const stats = statsMap.get(program.id);
    if (stats) {
      md += `- **Průměr ČJ:** ${stats.cj_prumer} bodů z 50\n`;
      md += `- **Průměr MA:** ${stats.ma_prumer} bodů z 50\n`;
      if (stats.hasExtraCriteria) {
        md += `- **Extra kritéria:** Ano (${stats.extra_body} bodů navíc k JPZ)\n`;
      }
    }

    const konkurence = program.index_poptavky >= 3
      ? 'Vysoká konkurence'
      : program.index_poptavky >= 2
        ? 'Střední konkurence'
        : 'Nízká konkurence';
    md += `- **Obtížnost přijetí:** ${konkurence}\n\n`;
  }

  if (extractions.length > 0) {
    md += `## Hodnocení České školní inspekce (ČŠI)\n\n`;
    for (const ext of extractions) {
      md += `### Inspekce ${ext.date || ''}\n\n`;
      if (ext.plain_czech_summary) md += `${ext.plain_czech_summary}\n\n`;
      if (ext.strengths && ext.strengths.length > 0) {
        md += `**Silné stránky:**\n`;
        for (const s of ext.strengths) md += `- ${s.tag}: ${s.detail}\n`;
        md += `\n`;
      }
      if (ext.risks && ext.risks.length > 0) {
        md += `**Rizika:**\n`;
        for (const r of ext.risks) md += `- ${r.tag}: ${r.detail}\n`;
        md += `\n`;
      }
    }
  }

  md += `---\n\n`;
  md += `*Data: CERMAT JPZ 2025, ČŠI. Zdroj: [přijímačky na školu](https://www.prijimackynaskolu.cz/skola/${slug})*\n`;

  return new NextResponse(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
