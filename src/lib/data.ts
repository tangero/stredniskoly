import { promises as fs } from 'fs';
import path from 'path';
import { School, SchoolAnalysis, SchoolData, SchoolsData, SchoolDetail, krajNames } from '@/types/school';
import { createSlug, createKrajSlug, extractRedizo } from './utils';

const dataDir = path.join(process.cwd(), 'public');

let schoolAnalysisCache: SchoolAnalysis | null = null;
let schoolsDataCache: SchoolsData | null = null;

/**
 * Načte school_analysis.json a převede % skóry na skutečné body
 *
 * Data z CERMATu jsou v % skórech (0-100 za předmět, 0-200 celkem).
 * Převádíme na skutečné body z JPZ testu (max 50+50=100 bodů).
 */
export async function getSchoolAnalysis(): Promise<SchoolAnalysis> {
  if (schoolAnalysisCache) return schoolAnalysisCache;

  const filePath = path.join(dataDir, 'school_analysis.json');
  const data = await fs.readFile(filePath, 'utf-8');
  const rawData = JSON.parse(data) as SchoolAnalysis;

  // Převést % skóry na skutečné body (dělit 2)
  const convertedData: SchoolAnalysis = {};
  for (const [key, school] of Object.entries(rawData)) {
    convertedData[key] = {
      ...school,
      min_body: Math.round(school.min_body / 2),
      prumer_body: Math.round((school.prumer_body / 2) * 10) / 10,
    };
  }

  schoolAnalysisCache = convertedData;
  return schoolAnalysisCache;
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

/**
 * Získá všechny obory dané školy (podle REDIZO)
 */
export async function getSchoolsByRedizo(redizo: string): Promise<School[]> {
  const schools = await getAllSchools();
  return schools.filter(s => extractRedizo(s.id) === redizo);
}

/**
 * Načte detailní data školy z school_details a převede min_body z % na body
 */
export async function getSchoolDetail(schoolId: string): Promise<SchoolDetail | null> {
  try {
    // Převést ID na formát souboru (nahradit / za -)
    const fileId = schoolId.replace(/\//g, '-');
    const filePath = path.join(dataDir, 'school_details', `${fileId}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    const rawData = JSON.parse(data) as SchoolDetail;

    // Pomocná funkce pro převod min_body v RelatedSchool
    const convertRelatedSchools = (schools?: Array<{ id: string; count: number; pct: number; nazev: string; obor: string; obec: string; min_body: number }>) => {
      if (!schools) return undefined;
      return schools.map(s => ({
        ...s,
        min_body: Math.round(s.min_body / 2)
      }));
    };

    // Převést min_body ve všech souvisejících školách
    return {
      id: rawData.id,
      as_p1: rawData.as_p1 ? {
        total: rawData.as_p1.total,
        backup_p2: convertRelatedSchools(rawData.as_p1.backup_p2),
        backup_p3: convertRelatedSchools(rawData.as_p1.backup_p3),
      } : undefined,
      as_p2: rawData.as_p2 ? {
        total: rawData.as_p2.total,
        preferred_p1: convertRelatedSchools(rawData.as_p2.preferred_p1),
        backup_p3: convertRelatedSchools(rawData.as_p2.backup_p3),
      } : undefined,
      as_p3: rawData.as_p3 ? {
        total: rawData.as_p3.total,
        preferred_p1: convertRelatedSchools(rawData.as_p3.preferred_p1),
        preferred_p2: convertRelatedSchools(rawData.as_p3.preferred_p2),
      } : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Získá data z původního schools_data.json pro historická data
 */
export async function getSchoolHistoricalData(redizo: string): Promise<{
  data2024?: SchoolData;
  data2025?: SchoolData;
} | null> {
  try {
    const filePath = path.join(dataDir, 'schools_data.json');
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Hledat v datech pro roky 2024 a 2025
    let data2024: SchoolData | undefined;
    let data2025: SchoolData | undefined;

    if (data['2024']) {
      data2024 = data['2024'].find((s: SchoolData) => s.redizo === redizo);
    }
    if (data['2025']) {
      data2025 = data['2025'].find((s: SchoolData) => s.redizo === redizo);
    }

    return { data2024, data2025 };
  } catch {
    return null;
  }
}

/**
 * Rozšířená data o statistikách testů z schools_data.json
 *
 * DŮLEŽITÉ: Data z CERMATu jsou v % skórech (0-100 za předmět).
 * Tato data jsou převedena na skutečné body z JPZ testu:
 * - ČJ test: max 50 bodů
 * - MA test: max 50 bodů
 * - JPZ celkem: max 100 bodů
 */
export interface ExtendedSchoolStats {
  prihlasky_priority: number[];  // přihlášky podle priority
  prijati_priority: number[];    // přijatí podle priority
  cj_prumer: number;             // průměr z češtiny (0-50 bodů)
  cj_min: number;                // nezávislé minimum z češtiny (0-50 bodů) - POZOR: může být z jiného studenta než ma_min!
  ma_prumer: number;             // průměr z matematiky (0-50 bodů)
  ma_min: number;                // nezávislé minimum z matematiky (0-50 bodů) - POZOR: může být z jiného studenta než cj_min!
  // Skutečná data z raw dat jednotlivých uchazečů
  jpz_min: number;               // SKUTEČNÉ minimum JPZ bodů (z jednoho studenta, max 100)
  cj_at_jpz_min: number;         // ČJ body studenta s nejnižším JPZ
  ma_at_jpz_min: number;         // MA body studenta s nejnižším JPZ
  jpz_prumer: number;            // Čistý JPZ průměr (cj_prumer + ma_prumer, max 100)
  min_body: number;              // Celkové body pro přijetí (JPZ + extra kritéria)
  extra_body: number;            // Body za další kritéria (prospěch, školní zkouška)
  hasExtraCriteria: boolean;     // Má škola další kritéria? (extra_body > 5)
}

// Cache pro schools_data indexovaný podle ID
let schoolsDataByIdCache: Map<string, ExtendedSchoolStats> | null = null;

/**
 * Načte a indexuje schools_data.json podle ID školy
 */
async function getSchoolsDataById(): Promise<Map<string, ExtendedSchoolStats>> {
  if (schoolsDataByIdCache) return schoolsDataByIdCache;

  const filePath = path.join(dataDir, 'schools_data.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(content);

  schoolsDataByIdCache = new Map();

  // Projít všechny roky a indexovat podle ID
  for (const year of Object.keys(data)) {
    for (const school of data[year]) {
      // Normalizovat ID (odstranit zaměření za _)
      const baseId = school.id.split('_').slice(0, 2).join('_');

      // Uložit data (preferovat novější rok - 2025)
      if (!schoolsDataByIdCache.has(baseId) || year === '2025') {
        // Data z CERMATu jsou v % skórech (0-100), převádíme na skutečné body
        // JPZ test má max 50 bodů za předmět, takže % skór dělíme 2
        const cj_min_raw = school.cj_min || 0;
        const ma_min_raw = school.ma_min || 0;
        const cj_prumer_raw = school.cj_prumer || 0;
        const ma_prumer_raw = school.ma_prumer || 0;
        const min_body_raw = school.min_body || 0;

        // Převod z % skórů na skutečné body (% / 2 = body z 50)
        const cj_min = Math.round(cj_min_raw / 2);
        const ma_min = Math.round(ma_min_raw / 2);
        const cj_prumer = Math.round((cj_prumer_raw / 2) * 10) / 10; // 1 desetinné místo
        const ma_prumer = Math.round((ma_prumer_raw / 2) * 10) / 10;

        // SKUTEČNÉ JPZ minimum (z raw dat jednotlivých uchazečů)
        // Toto je skutečné JPZ skóre studenta s nejnižším JPZ, ne součet nezávislých minim!
        const jpz_min_actual = school.jpz_min_actual || 0;
        const cj_at_jpz_min = school.cj_at_jpz_min || 0;
        const ma_at_jpz_min = school.ma_at_jpz_min || 0;

        // Použít skutečné JPZ minimum, pokud je k dispozici, jinak fallback na součet nezávislých minim
        const jpz_min = jpz_min_actual > 0 ? jpz_min_actual : (cj_min + ma_min);
        const jpz_prumer = Math.round((cj_prumer + ma_prumer) * 10) / 10;

        // Celkové body pro přijetí (také převedeno z % škály)
        const min_body = Math.round(min_body_raw / 2);

        // Extra body = rozdíl mezi celkovým skóre a skutečným JPZ minimem
        const extra_body = min_body - jpz_min;
        const hasExtraCriteria = extra_body > 5; // Threshold 5 bodů

        schoolsDataByIdCache.set(baseId, {
          prihlasky_priority: school.prihlasky_priority || [],
          prijati_priority: school.prijati_priority || [],
          cj_prumer,
          cj_min,
          ma_prumer,
          ma_min,
          jpz_min,
          cj_at_jpz_min,
          ma_at_jpz_min,
          jpz_prumer,
          min_body,
          extra_body,
          hasExtraCriteria
        });
      }
    }
  }

  return schoolsDataByIdCache;
}

/**
 * Získá rozšířené statistiky pro školu
 */
export async function getExtendedSchoolStats(schoolId: string): Promise<ExtendedSchoolStats | null> {
  const dataById = await getSchoolsDataById();

  // Normalizovat ID (formát: 600001431_79-41-K/41)
  const baseId = schoolId.split('_').slice(0, 2).join('_');

  return dataById.get(baseId) || null;
}

/**
 * Získá rozšířené statistiky pro pole škol (efektivnější než jednotlivé volání)
 */
export async function getExtendedSchoolStatsForSchools(schoolIds: string[]): Promise<Map<string, ExtendedSchoolStats>> {
  const dataById = await getSchoolsDataById();
  const result = new Map<string, ExtendedSchoolStats>();

  for (const schoolId of schoolIds) {
    const baseId = schoolId.split('_').slice(0, 2).join('_');
    const stats = dataById.get(baseId);
    if (stats) {
      result.set(schoolId, stats);
    }
  }

  return result;
}

/**
 * Trend data - porovnání mezi roky
 */
export interface YearlyTrendData {
  prihlasky2024: number;
  prihlasky2025: number;
  prihlaskyChange: number;      // procentuální změna
  prihlaskyDirection: 'up' | 'down' | 'stable';
  indexPoptavky2024: number;
  indexPoptavky2025: number;
  indexChange: number;          // rozdíl indexů
  minBody2024: number;
  minBody2025: number;
  minBodyChange: number;        // rozdíl bodů
}

// Cache pro trend data
let trendDataCache: Map<string, YearlyTrendData> | null = null;

/**
 * Načte a spočítá trend data pro všechny školy
 */
async function getTrendDataMap(): Promise<Map<string, YearlyTrendData>> {
  if (trendDataCache) return trendDataCache;

  const filePath = path.join(dataDir, 'schools_data.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(content);

  trendDataCache = new Map();

  // Indexovat data 2024 podle ID
  const data2024Map = new Map<string, {
    prihlasky: number;
    index_poptavky: number;
    min_body: number;
  }>();

  for (const school of (data['2024'] || [])) {
    const baseId = school.id.split('_').slice(0, 2).join('_');
    data2024Map.set(baseId, {
      prihlasky: school.prihlasky || 0,
      index_poptavky: school.index_poptavky || 0,
      min_body: school.min_body || 0
    });
  }

  // Spárovat s daty 2025
  for (const school of (data['2025'] || [])) {
    const baseId = school.id.split('_').slice(0, 2).join('_');
    const prev = data2024Map.get(baseId);

    const prihlasky2025 = school.prihlasky || 0;
    const prihlasky2024 = prev?.prihlasky || 0;
    const indexPoptavky2025 = school.index_poptavky || 0;
    const indexPoptavky2024 = prev?.index_poptavky || 0;
    const minBody2025 = school.min_body || 0;
    const minBody2024 = prev?.min_body || 0;

    // Spočítat změny
    let prihlaskyChange = 0;
    let prihlaskyDirection: 'up' | 'down' | 'stable' = 'stable';

    if (prihlasky2024 > 0) {
      prihlaskyChange = ((prihlasky2025 - prihlasky2024) / prihlasky2024) * 100;
      if (prihlaskyChange > 5) {
        prihlaskyDirection = 'up';
      } else if (prihlaskyChange < -5) {
        prihlaskyDirection = 'down';
      }
    }

    trendDataCache.set(baseId, {
      prihlasky2024,
      prihlasky2025,
      prihlaskyChange,
      prihlaskyDirection,
      indexPoptavky2024,
      indexPoptavky2025,
      indexChange: indexPoptavky2025 - indexPoptavky2024,
      minBody2024,
      minBody2025,
      minBodyChange: minBody2025 - minBody2024
    });
  }

  return trendDataCache;
}

/**
 * Získá trend data pro pole škol
 */
export async function getTrendDataForSchools(schoolIds: string[]): Promise<Map<string, YearlyTrendData>> {
  const allTrends = await getTrendDataMap();
  const result = new Map<string, YearlyTrendData>();

  for (const schoolId of schoolIds) {
    const baseId = schoolId.split('_').slice(0, 2).join('_');
    const trend = allTrends.get(baseId);
    if (trend) {
      result.set(schoolId, trend);
    }
  }

  return result;
}

/**
 * Profil náročnosti školy
 */
export interface SchoolDifficultyProfile {
  // Percentily náročnosti
  percentilOverall: number;        // Percentil mezi všemi školami
  percentilInType: number;         // Percentil v rámci typu (GY4, SOŠ, ...)
  rankInType: number;              // Pořadí v typu
  totalInType: number;             // Celkem škol daného typu

  // Index zaměření (normalizovaný)
  focusIndex: number;              // z_ma - z_cj (kladný = matematické)
  focusLabel: string;              // Textový popis zaměření
  z_cj: number;                    // Z-skóre pro ČJ
  z_ma: number;                    // Z-skóre pro MA

  // Srovnání s průměrem
  cjDiffFromAvg: number;           // Rozdíl ČJ od celostátního průměru
  maDiffFromAvg: number;           // Rozdíl MA od celostátního průměru
  minBodyDiffFromAvg: number;      // Rozdíl min_body od průměru

  // Srovnání s typem
  cjDiffFromType: number;          // Rozdíl ČJ od průměru typu
  maDiffFromType: number;          // Rozdíl MA od průměru typu
  minBodyDiffFromType: number;     // Rozdíl min_body od průměru typu

  // Celostátní statistiky (pro kontext)
  nationalStats: {
    cjMean: number;
    cjStd: number;
    maMean: number;
    maStd: number;
    minBodyMean: number;
    minBodyStd: number;
  };

  // Statistiky typu
  typeStats: {
    cjMean: number;
    maMean: number;
    minBodyMean: number;
    typeName: string;
  };
}

// Cache pro celostátní statistiky
let nationalStatsCache: {
  cjMean: number;
  cjStd: number;
  maMean: number;
  maStd: number;
  minBodyMean: number;
  minBodyStd: number;
  minBodySorted: number[];
  // Nová pole pro čisté JPZ body (porovnatelné mezi školami)
  jpzMinMean: number;
  jpzMinStd: number;
  jpzMinSorted: number[];
  byType: Map<string, {
    cjValues: number[];
    maValues: number[];
    minBodyValues: number[];
    jpzMinValues: number[];  // čisté JPZ body pro typ
  }>;
} | null = null;

/**
 * Spočítá celostátní statistiky (s cache)
 */
async function getNationalStats() {
  if (nationalStatsCache) return nationalStatsCache;

  const filePath = path.join(dataDir, 'schools_data.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(content);

  const cjValues: number[] = [];
  const maValues: number[] = [];
  const minBodyValues: number[] = [];
  const jpzMinValues: number[] = [];  // čisté JPZ body
  const byType = new Map<string, {
    cjValues: number[];
    maValues: number[];
    minBodyValues: number[];
    jpzMinValues: number[];
  }>();

  // Sbíráme data z roku 2025 a převádíme z % skórů na skutečné body
  for (const school of (data['2025'] || [])) {
    // Převod z % skórů (0-100) na skutečné body (0-50 za předmět)
    const cj = (school.cj_prumer || 0) / 2;
    const ma = (school.ma_prumer || 0) / 2;
    const minBody = (school.min_body || 0) / 2;
    const cj_min = (school.cj_min || 0) / 2;
    const ma_min = (school.ma_min || 0) / 2;
    const jpzMin = cj_min + ma_min;  // čisté JPZ body (max 100)
    const typ = school.typ || 'Neznámý';

    if (cj > 0 && ma > 0 && minBody > 0 && jpzMin > 0) {
      cjValues.push(cj);
      maValues.push(ma);
      minBodyValues.push(minBody);
      jpzMinValues.push(jpzMin);

      if (!byType.has(typ)) {
        byType.set(typ, { cjValues: [], maValues: [], minBodyValues: [], jpzMinValues: [] });
      }
      const typeData = byType.get(typ)!;
      typeData.cjValues.push(cj);
      typeData.maValues.push(ma);
      typeData.minBodyValues.push(minBody);
      typeData.jpzMinValues.push(jpzMin);
    }
  }

  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const std = (arr: number[]) => {
    const m = mean(arr);
    return Math.sqrt(arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / arr.length);
  };

  nationalStatsCache = {
    cjMean: mean(cjValues),
    cjStd: std(cjValues),
    maMean: mean(maValues),
    maStd: std(maValues),
    minBodyMean: mean(minBodyValues),
    minBodyStd: std(minBodyValues),
    minBodySorted: [...minBodyValues].sort((a, b) => a - b),
    // Nové statistiky pro čisté JPZ body
    jpzMinMean: mean(jpzMinValues),
    jpzMinStd: std(jpzMinValues),
    jpzMinSorted: [...jpzMinValues].sort((a, b) => a - b),
    byType
  };

  return nationalStatsCache;
}

/**
 * Získá profil náročnosti školy
 * DŮLEŽITÉ: Percentily jsou počítány z čistých JPZ bodů (cj_min + ma_min),
 * aby bylo možné férově porovnávat školy s různými kritérii.
 */
export async function getSchoolDifficultyProfile(
  schoolId: string,
  schoolType: string,
  minBody: number
): Promise<SchoolDifficultyProfile | null> {
  const stats = await getExtendedSchoolStats(schoolId);
  if (!stats || stats.cj_prumer === 0 || stats.ma_prumer === 0) {
    return null;
  }

  const national = await getNationalStats();

  // Z-skóre
  const z_cj = (stats.cj_prumer - national.cjMean) / national.cjStd;
  const z_ma = (stats.ma_prumer - national.maMean) / national.maStd;
  const focusIndex = z_ma - z_cj;

  // Label pro zaměření
  let focusLabel: string;
  if (focusIndex > 0.5) {
    focusLabel = 'Silně matematicky zaměřená';
  } else if (focusIndex > 0.2) {
    focusLabel = 'Mírně matematicky zaměřená';
  } else if (focusIndex > -0.2) {
    focusLabel = 'Vyvážená';
  } else if (focusIndex > -0.5) {
    focusLabel = 'Mírně humanitně zaměřená';
  } else {
    focusLabel = 'Silně humanitně zaměřená';
  }

  // KLÍČOVÁ ZMĚNA: Percentily počítáme z jpz_min (čisté JPZ body), ne z min_body
  // To umožňuje férové porovnání škol bez ohledu na to, zda přidávají body za prospěch
  const jpzMin = stats.jpz_min;
  const belowCount = national.jpzMinSorted.filter(x => x < jpzMin).length;
  const percentilOverall = (belowCount / national.jpzMinSorted.length) * 100;

  // Statistiky typu - také používáme jpz_min
  const typeData = national.byType.get(schoolType);
  const mean = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  let percentilInType = 0;
  let rankInType = 0;
  let totalInType = 0;
  let typeCjMean = 0;
  let typeMaMean = 0;
  let typeJpzMinMean = 0;

  if (typeData && typeData.jpzMinValues.length > 0) {
    const sortedType = [...typeData.jpzMinValues].sort((a, b) => a - b);
    const belowInType = sortedType.filter(x => x < jpzMin).length;
    percentilInType = (belowInType / sortedType.length) * 100;
    rankInType = sortedType.length - belowInType;
    totalInType = sortedType.length;
    typeCjMean = mean(typeData.cjValues);
    typeMaMean = mean(typeData.maValues);
    typeJpzMinMean = mean(typeData.jpzMinValues);
  }

  return {
    percentilOverall,
    percentilInType,
    rankInType,
    totalInType,
    focusIndex,
    focusLabel,
    z_cj,
    z_ma,
    cjDiffFromAvg: stats.cj_prumer - national.cjMean,
    maDiffFromAvg: stats.ma_prumer - national.maMean,
    // Pro srovnání min_body používáme jpz_min (porovnatelné)
    minBodyDiffFromAvg: jpzMin - national.jpzMinMean,
    cjDiffFromType: stats.cj_prumer - typeCjMean,
    maDiffFromType: stats.ma_prumer - typeMaMean,
    minBodyDiffFromType: jpzMin - typeJpzMinMean,
    nationalStats: {
      cjMean: national.cjMean,
      cjStd: national.cjStd,
      maMean: national.maMean,
      maStd: national.maStd,
      minBodyMean: national.jpzMinMean,  // Používáme jpzMinMean pro kontext
      minBodyStd: national.jpzMinStd
    },
    typeStats: {
      cjMean: typeCjMean,
      maMean: typeMaMean,
      minBodyMean: typeJpzMinMean,  // Používáme jpzMinMean pro kontext
      typeName: schoolType
    }
  };
}
