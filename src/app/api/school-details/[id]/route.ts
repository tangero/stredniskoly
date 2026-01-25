import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface SchoolDetail {
  total_applicants: number;
  priority_counts: number[];
  prihlasky_priority: number[];
  prijati_priority: number[];
  cj_prumer: number;
  cj_min: number;
  ma_prumer: number;
  ma_min: number;
  min_body: number;
  jpz_min: number;
  index_poptavky: number;
  obtiznost: number;
  kapacita: number;
  prijati: number;
  competing_schools: Array<{
    id: string;
    nazev: string;
    obor: string;
    obec: string;
    overlap_count: number;
    overlap_pct: number;
  }>;
  difficulty_profile: {
    percentile_national: number;
    percentile_type: number;
    z_score_cj: number;
    z_score_ma: number;
    focus_index: number;
    focus_label: string;
    comparison_to_avg: number;
    comparison_to_type: number;
  } | null;
}

// Cache pro schools_data
let schoolsCache: any = null;
let schoolAnalysisCache: any = null;

async function getSchoolsData() {
  if (schoolsCache) return schoolsCache;

  const filePath = path.join(process.cwd(), 'public', 'schools_data.json');
  const data = await fs.readFile(filePath, 'utf-8');
  schoolsCache = JSON.parse(data);
  return schoolsCache;
}

async function getSchoolAnalysis() {
  if (schoolAnalysisCache) return schoolAnalysisCache;

  try {
    const filePath = path.join(process.cwd(), 'public', 'school_analysis.json');
    const data = await fs.readFile(filePath, 'utf-8');
    schoolAnalysisCache = JSON.parse(data);
    return schoolAnalysisCache;
  } catch {
    return null;
  }
}

async function getSchoolDetailFile(schoolId: string) {
  try {
    // Soubory mají pomlčku místo lomítka v názvu
    const fileName = schoolId.replace(/\//g, '-');
    const filePath = path.join(process.cwd(), 'public', 'school_details', `${fileName}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function calculateDifficultyProfile(school: any, allSchools: any[]) {
  const jpzMin = (school.cj_min || 0) + (school.ma_min || 0);
  if (!jpzMin) return null;

  // Získat všechny školy se stejným typem
  const sameTypeSchools = allSchools.filter(s => s.typ === school.typ && ((s.cj_min || 0) + (s.ma_min || 0)) > 0);
  const allWithJpz = allSchools.filter(s => ((s.cj_min || 0) + (s.ma_min || 0)) > 0);

  // Percentily
  const nationalRank = allWithJpz.filter(s => ((s.cj_min || 0) + (s.ma_min || 0)) < jpzMin).length;
  const typeRank = sameTypeSchools.filter(s => ((s.cj_min || 0) + (s.ma_min || 0)) < jpzMin).length;

  const percentileNational = Math.round((nationalRank / allWithJpz.length) * 100);
  const percentileType = sameTypeSchools.length > 1
    ? Math.round((typeRank / sameTypeSchools.length) * 100)
    : 50;

  // Průměry pro z-skóre
  const avgCj = allWithJpz.reduce((sum, s) => sum + (s.cj_min || 0), 0) / allWithJpz.length;
  const avgMa = allWithJpz.reduce((sum, s) => sum + (s.ma_min || 0), 0) / allWithJpz.length;

  const stdCj = Math.sqrt(allWithJpz.reduce((sum, s) => sum + Math.pow((s.cj_min || 0) - avgCj, 2), 0) / allWithJpz.length) || 1;
  const stdMa = Math.sqrt(allWithJpz.reduce((sum, s) => sum + Math.pow((s.ma_min || 0) - avgMa, 2), 0) / allWithJpz.length) || 1;

  const zScoreCj = ((school.cj_min || 0) - avgCj) / stdCj;
  const zScoreMa = ((school.ma_min || 0) - avgMa) / stdMa;

  // Focus index (-1 = humanitní, +1 = matematický)
  const focusIndex = (zScoreMa - zScoreCj) / 2;
  let focusLabel = 'Vyvážený';
  if (focusIndex > 0.5) focusLabel = 'Matematicky zaměřený';
  else if (focusIndex > 0.2) focusLabel = 'Mírně matematický';
  else if (focusIndex < -0.5) focusLabel = 'Humanitně zaměřený';
  else if (focusIndex < -0.2) focusLabel = 'Mírně humanitní';

  // Srovnání s průměrem
  const avgJpz = allWithJpz.reduce((sum, s) => sum + ((s.cj_min || 0) + (s.ma_min || 0)), 0) / allWithJpz.length;
  const avgTypeJpz = sameTypeSchools.length > 0
    ? sameTypeSchools.reduce((sum, s) => sum + ((s.cj_min || 0) + (s.ma_min || 0)), 0) / sameTypeSchools.length
    : avgJpz;

  return {
    percentile_national: percentileNational,
    percentile_type: percentileType,
    z_score_cj: Math.round(zScoreCj * 100) / 100,
    z_score_ma: Math.round(zScoreMa * 100) / 100,
    focus_index: Math.round(focusIndex * 100) / 100,
    focus_label: focusLabel,
    comparison_to_avg: Math.round(jpzMin - avgJpz),
    comparison_to_type: Math.round(jpzMin - avgTypeJpz),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const schoolsData = await getSchoolsData();
    const year = schoolsData['2025'] ? '2025' : '2024';
    const schools = schoolsData[year] || [];

    const school = schools.find((s: any) => s.id === id);
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Načíst detail školy (konkurenční školy)
    const detailFile = await getSchoolDetailFile(id);

    // Načíst analysis pro rozšířená data
    const analysis = await getSchoolAnalysis();
    const schoolAnalysis = analysis?.schools?.[id];

    // Spočítat profil náročnosti
    const difficultyProfile = calculateDifficultyProfile(school, schools);

    // Konkurenční školy - agregace ze všech priorit
    let competingSchools: any[] = [];
    if (detailFile) {
      // Mapa pro agregaci škol
      const schoolMap = new Map<string, { count: number; school: any }>();

      // Pomocná funkce pro přidání škol do mapy
      const addSchools = (schools: any[]) => {
        if (!Array.isArray(schools)) return;
        schools.forEach((s: any) => {
          if (s.id === id) return; // Přeskočit sebe sama
          const existing = schoolMap.get(s.id);
          if (existing) {
            existing.count += s.count || 0;
          } else {
            schoolMap.set(s.id, {
              count: s.count || 0,
              school: s
            });
          }
        });
      };

      // Agregovat ze všech priorit
      if (detailFile.as_p1) {
        addSchools(detailFile.as_p1.backup_p2 || []);
        addSchools(detailFile.as_p1.backup_p3 || []);
      }
      if (detailFile.as_p2) {
        addSchools(detailFile.as_p2.preferred_p1 || []);
        addSchools(detailFile.as_p2.backup_p3 || []);
      }
      if (detailFile.as_p3) {
        addSchools(detailFile.as_p3.preferred_p1 || []);
        addSchools(detailFile.as_p3.preferred_p2 || []);
      }

      // Převést mapu na pole a seřadit
      competingSchools = Array.from(schoolMap.values())
        .map(({ count, school }) => ({
          id: school.id,
          nazev: school.nazev || 'Neznámá škola',
          obor: school.obor || '',
          obec: school.obec || '',
          overlap_count: count,
          overlap_pct: school.pct || 0,
        }))
        .sort((a, b) => b.overlap_count - a.overlap_count)
        .slice(0, 5);
    }

    // Použít prihlasky_priority jako priority_counts pokud priority_counts chybí nebo je prázdné
    const priorityCounts = school.priority_counts && school.priority_counts.some((x: number) => x > 0)
      ? school.priority_counts
      : school.prihlasky_priority || schoolAnalysis?.prihlasky_priority || [0, 0, 0, 0, 0];

    const result: SchoolDetail = {
      total_applicants: school.total_applicants || school.prihlasky || 0,
      priority_counts: priorityCounts,
      prihlasky_priority: school.prihlasky_priority || schoolAnalysis?.prihlasky_priority || [0, 0, 0, 0, 0],
      prijati_priority: school.prijati_priority || schoolAnalysis?.prijati_priority || [0, 0, 0, 0, 0],
      cj_prumer: school.cj_prumer || schoolAnalysis?.cj_prumer || 0,
      cj_min: school.cj_min || schoolAnalysis?.cj_min || 0,
      ma_prumer: school.ma_prumer || schoolAnalysis?.ma_prumer || 0,
      ma_min: school.ma_min || schoolAnalysis?.ma_min || 0,
      min_body: school.min_body || 0,
      jpz_min: (school.cj_min || 0) + (school.ma_min || 0),
      index_poptavky: school.index_poptavky || 0,
      obtiznost: school.obtiznost || 0,
      kapacita: school.kapacita || 0,
      prijati: school.prijati || 0,
      competing_schools: competingSchools,
      difficulty_profile: difficultyProfile,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching school details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
