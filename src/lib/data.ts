import { promises as fs } from 'fs';
import path from 'path';
import { School, SchoolAnalysis, SchoolData, SchoolsData, krajNames } from '@/types/school';
import { createSlug, createKrajSlug } from './utils';

const dataDir = path.join(process.cwd(), 'public');

let schoolAnalysisCache: SchoolAnalysis | null = null;
let schoolsDataCache: SchoolsData | null = null;

/**
 * Načte school_analysis.json
 */
export async function getSchoolAnalysis(): Promise<SchoolAnalysis> {
  if (schoolAnalysisCache) return schoolAnalysisCache;

  const filePath = path.join(dataDir, 'school_analysis.json');
  const data = await fs.readFile(filePath, 'utf-8');
  schoolAnalysisCache = JSON.parse(data);
  return schoolAnalysisCache!;
}

/**
 * Načte schools_data.json
 */
export async function getSchoolsData(): Promise<SchoolsData> {
  if (schoolsDataCache) return schoolsDataCache;

  const filePath = path.join(dataDir, 'schools_data.json');
  const data = await fs.readFile(filePath, 'utf-8');
  schoolsDataCache = JSON.parse(data);
  return schoolsDataCache!;
}

/**
 * Získá všechny školy jako pole
 */
export async function getAllSchools(): Promise<School[]> {
  const analysis = await getSchoolAnalysis();
  return Object.values(analysis);
}

/**
 * Získá školu podle ID
 */
export async function getSchoolById(id: string): Promise<School | null> {
  const analysis = await getSchoolAnalysis();
  return analysis[id] || null;
}

/**
 * Vytvoří mapu slug -> ID pro všechny školy
 */
export async function getSlugToIdMap(): Promise<Map<string, string>> {
  const schools = await getAllSchools();
  const map = new Map<string, string>();

  for (const school of schools) {
    const slug = createSlug(school.nazev, school.obor);
    // Přidáme REDIZO pro unikátnost
    const fullSlug = `${school.id.split('_')[0]}-${slug}`;
    map.set(fullSlug, school.id);
  }

  return map;
}

/**
 * Najde školu podle slug
 */
export async function getSchoolBySlug(slug: string): Promise<School | null> {
  const schools = await getAllSchools();

  for (const school of schools) {
    const schoolSlug = createSlug(school.nazev, school.obor);
    const fullSlug = `${school.id.split('_')[0]}-${schoolSlug}`;

    if (fullSlug === slug) {
      return school;
    }
  }

  // Fallback: zkusit najít podle REDIZO na začátku
  const redizo = slug.split('-')[0];
  if (redizo) {
    for (const school of schools) {
      if (school.id.startsWith(redizo)) {
        return school;
      }
    }
  }

  return null;
}

/**
 * Generuje všechny slugy pro statické stránky
 */
export async function generateAllSlugs(): Promise<{ slug: string }[]> {
  const schools = await getAllSchools();

  return schools.map(school => {
    const slug = createSlug(school.nazev, school.obor);
    const fullSlug = `${school.id.split('_')[0]}-${slug}`;
    return { slug: fullSlug };
  });
}

/**
 * Získá školy podle kraje
 */
export async function getSchoolsByKraj(krajKod: string): Promise<School[]> {
  const schools = await getAllSchools();
  return schools.filter(s => s.kraj_kod === krajKod);
}

/**
 * Získá školy podle okresu
 */
export async function getSchoolsByOkres(okres: string): Promise<School[]> {
  const schools = await getAllSchools();
  return schools.filter(s => s.okres === okres);
}

/**
 * Získá všechny kraje
 */
export async function getAllKraje(): Promise<{ kod: string; nazev: string; slug: string; count: number }[]> {
  const schools = await getAllSchools();
  const krajCounts = new Map<string, number>();

  for (const school of schools) {
    const count = krajCounts.get(school.kraj_kod) || 0;
    krajCounts.set(school.kraj_kod, count + 1);
  }

  return Object.entries(krajNames).map(([kod, nazev]) => ({
    kod,
    nazev,
    slug: createKrajSlug(kod, nazev),
    count: krajCounts.get(kod) || 0
  }));
}

/**
 * Získá všechny okresy v kraji
 */
export async function getOkresyByKraj(krajKod: string): Promise<{ nazev: string; slug: string; count: number }[]> {
  const schools = await getSchoolsByKraj(krajKod);
  const okresCounts = new Map<string, number>();

  for (const school of schools) {
    if (school.okres) {
      const count = okresCounts.get(school.okres) || 0;
      okresCounts.set(school.okres, count + 1);
    }
  }

  return Array.from(okresCounts.entries())
    .map(([nazev, count]) => ({
      nazev,
      slug: createSlug(nazev),
      count
    }))
    .sort((a, b) => a.nazev.localeCompare(b.nazev, 'cs'));
}

/**
 * Statistiky pro region
 */
export interface RegionStats {
  totalSchools: number;
  totalKapacita: number;
  totalPrihlasky: number;
  avgIndexPoptavky: number;
  avgMinBody: number;
}

export async function getRegionStats(schools: School[]): Promise<RegionStats> {
  if (schools.length === 0) {
    return {
      totalSchools: 0,
      totalKapacita: 0,
      totalPrihlasky: 0,
      avgIndexPoptavky: 0,
      avgMinBody: 0
    };
  }

  const totalKapacita = schools.reduce((sum, s) => sum + (s.kapacita || 0), 0);
  const totalPrihlasky = schools.reduce((sum, s) => sum + (s.prihlasky || 0), 0);
  const avgIndexPoptavky = schools.reduce((sum, s) => sum + (s.index_poptavky || 0), 0) / schools.length;
  const avgMinBody = schools.reduce((sum, s) => sum + (s.min_body || 0), 0) / schools.length;

  return {
    totalSchools: schools.length,
    totalKapacita,
    totalPrihlasky,
    avgIndexPoptavky,
    avgMinBody
  };
}
