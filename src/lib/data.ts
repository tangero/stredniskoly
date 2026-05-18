import { promises as fs } from 'fs';
import path from 'path';
import { School, SchoolAnalysis, SchoolData, SchoolsData, SchoolDetail, krajNames, CSIDataset, CSISchoolData, InspectionExtraction } from '@/types/school';
import { InspisDataset, SchoolInspisData } from '@/types/inspis';
import { createSlug, createKrajSlug, extractRedizo } from './utils';
import { sortSchoolsByPopularity } from './popularity';

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
 * Získá všechny školy rozložené na zaměření (pro vyhledávání)
 * Kombinuje school_analysis.json + schools_data.json aby měl každý záznam zamereni a nazev_display
 */
let searchSchoolsCache: School[] | null = null;
export async function getAllSchoolsForSearch(): Promise<School[]> {
  if (searchSchoolsCache) return searchSchoolsCache;

  const analysis = await getSchoolAnalysis();
  const schoolsData = await getSchoolsData();
  const yearData: Array<Record<string, unknown>> = (schoolsData as Record<string, unknown>)['2025'] as Array<Record<string, unknown>> || [];

  // Vytvořit mapu baseId -> seznam zaměření
  const zamereniMap = new Map<string, Array<Record<string, unknown>>>();
  for (const record of yearData) {
    const id = record.id as string;
    const parts = id.split('_');
    const baseId = parts.length >= 2 ? `${parts[0]}_${parts[1]}` : id;
    if (!zamereniMap.has(baseId)) zamereniMap.set(baseId, []);
    if (record.zamereni) {
      zamereniMap.get(baseId)!.push(record);
    }
  }

  const result: School[] = [];
  for (const school of Object.values(analysis)) {
    const zamereniList = zamereniMap.get(school.id);
    if (zamereniList && zamereniList.length > 0) {
      // Rozložit na zaměření
      for (const z of zamereniList) {
        result.push({
          ...school,
          id: z.id as string,
          nazev_display: (z.nazev_display as string) || school.nazev,
          zamereni: z.zamereni as string,
          kapacita: z.kapacita as number,
          prihlasky: z.prihlasky as number,
          prijati: z.prijati as number,
        });
      }
    } else {
      // Bez zaměření — použít nazev_display z prvního záznamu schools_data pokud existuje
      const detailRecord = yearData.find((r: Record<string, unknown>) => (r.id as string).startsWith(school.id));
      result.push({
        ...school,
        nazev_display: (detailRecord?.nazev_display as string) || school.nazev,
      });
    }
  }

  searchSchoolsCache = result;
  return result;
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
 * Typ stránky školy - přehled nebo detail oboru/zaměření
 */
export type SchoolPageType = 'overview' | 'program' | 'zamereni';

/**
 * Rozpozná typ stránky podle slugu
 * Podporuje i slugy s délkou studia (např. "gymnazium-4lete") pro duplicitní názvy oborů
 */
export async function getSchoolPageType(slug: string): Promise<{
  type: SchoolPageType;
  redizo: string;
  school: School | null;
  program: SchoolProgram | null;
}> {
  const schools = await getAllSchools();
  const redizo = slug.split('-')[0];

  if (!redizo) {
    return { type: 'overview', redizo: '', school: null, program: null };
  }

  // Najít školy s tímto REDIZO
  const schoolsWithRedizo = schools.filter(s => s.id.startsWith(redizo));
  if (schoolsWithRedizo.length === 0) {
    return { type: 'overview', redizo, school: null, program: null };
  }

  const firstSchool = schoolsWithRedizo[0];
  const schoolNameSlug = createSlug(firstSchool.nazev);
  const overviewSlug = `${redizo}-${schoolNameSlug}`;

  // Je to přehled školy (krátký slug bez oboru)?
  if (slug === overviewSlug) {
    return { type: 'overview', redizo, school: firstSchool, program: null };
  }

  // Načíst všechny programy/zaměření
  const programs = await getProgramsByRedizo(redizo);

  // Zjistit duplicitní názvy oborů (stejný název, různá délka studia)
  const oborCounts = new Map<string, number>();
  for (const school of schoolsWithRedizo) {
    oborCounts.set(school.obor, (oborCounts.get(school.obor) || 0) + 1);
  }

  // Zjistit duplicitní kombinace obor+zaměření
  const zamereniCounts = new Map<string, number>();
  for (const program of programs) {
    if (program.zamereni) {
      const key = `${program.obor}|${program.zamereni}`;
      zamereniCounts.set(key, (zamereniCounts.get(key) || 0) + 1);
    }
  }

  // Zkusit najít zaměření (nejdelší slug) - s i bez délky studia
  for (const program of programs) {
    if (program.zamereni) {
      const key = `${program.obor}|${program.zamereni}`;
      const hasDuplicateZamereni = (zamereniCounts.get(key) || 0) > 1;

      // Zkusit slug s délkou studia
      if (hasDuplicateZamereni) {
        const zamereniSlugWithLength = `${redizo}-${createSlug(firstSchool.nazev, program.obor, program.zamereni, program.delka_studia)}`;
        if (slug === zamereniSlugWithLength) {
          return { type: 'zamereni', redizo, school: firstSchool, program };
        }
      }

      // Zkusit standardní slug bez délky studia
      const zamereniSlug = `${redizo}-${createSlug(firstSchool.nazev, program.obor, program.zamereni)}`;
      if (slug === zamereniSlug) {
        return { type: 'zamereni', redizo, school: firstSchool, program };
      }
    }
  }

  // Zkusit najít obor (střední délka slugu) - s i bez délky studia
  for (const school of schoolsWithRedizo) {
    const hasDuplicateName = (oborCounts.get(school.obor) || 0) > 1;

    // Zkusit slug s délkou studia pro duplicitní názvy
    if (hasDuplicateName) {
      const oborSlugWithLength = `${redizo}-${createSlug(school.nazev, school.obor, undefined, school.delka_studia)}`;
      if (slug === oborSlugWithLength) {
        // Najít odpovídající program (bez zaměření, se stejnou délkou studia)
        const program = programs.find(p => !p.zamereni && p.obor === school.obor && p.delka_studia === school.delka_studia);
        return {
          type: 'program',
          redizo,
          school,
          program: program || {
            id: school.id,
            redizo,
            nazev: school.nazev,
            obor: school.obor,
            zamereni: undefined,
            typ: school.typ,
            delka_studia: school.delka_studia,
            kapacita: school.kapacita,
            prihlasky: school.prihlasky,
            prijati: school.prijati,
            min_body: school.min_body,
            index_poptavky: school.index_poptavky,
            obec: school.obec,
          }
        };
      }
    }

    // Zkusit standardní slug bez délky studia
    const oborSlug = `${redizo}-${createSlug(school.nazev, school.obor)}`;
    if (slug === oborSlug) {
      // Najít odpovídající program (bez zaměření)
      const program = programs.find(p => !p.zamereni && p.obor === school.obor);
      return {
        type: 'program',
        redizo,
        school,
        program: program || {
          id: school.id,
          redizo,
          nazev: school.nazev,
          obor: school.obor,
          zamereni: undefined,
          typ: school.typ,
          delka_studia: school.delka_studia,
          kapacita: school.kapacita,
          prihlasky: school.prihlasky,
          prijati: school.prijati,
          min_body: school.min_body,
          index_poptavky: school.index_poptavky,
          obec: school.obec,
        }
      };
    }
  }

  // Fallback - vrátit první školu jako přehled
  return { type: 'overview', redizo, school: firstSchool, program: null };
}

/**
 * Najde školu podle slug (kompatibilita se starým API)
 */
export async function getSchoolBySlug(slug: string): Promise<School | null> {
  const pageInfo = await getSchoolPageType(slug);

  // Pro přehled vrátit první školu
  if (pageInfo.type === 'overview' && pageInfo.school) {
    return pageInfo.school;
  }

  // Pro detail vrátit konkrétní školu
  if (pageInfo.school) {
    return pageInfo.school;
  }

  return null;
}

/**
 * Získá základní info o škole podle REDIZO (pro přehled školy)
 */
export async function getSchoolOverview(redizo: string): Promise<{
  nazev: string;
  adresa: string;
  adresa_plna: string;
  obec: string;
  okres: string;
  kraj: string;
  kraj_kod: string;
  zrizovatel: string;
  programs: SchoolProgram[];
} | null> {
  const schools = await getSchoolsByRedizo(redizo);
  if (schools.length === 0) return null;

  const firstSchool = schools[0];
  const programs = await getProgramsByRedizo(redizo);

  return {
    nazev: firstSchool.nazev,
    adresa: firstSchool.adresa,
    adresa_plna: firstSchool.adresa_plna || firstSchool.adresa,
    obec: firstSchool.obec,
    okres: firstSchool.okres,
    kraj: firstSchool.kraj,
    kraj_kod: firstSchool.kraj_kod,
    zrizovatel: firstSchool.zrizovatel,
    programs,
  };
}

/**
 * Generuje všechny slugy pro statické stránky
 * Včetně přehledů škol a detailů oborů/zaměření
 *
 * Pro programy se stejným názvem ale různou délkou studia (např. "Gymnázium" 4leté a 6leté)
 * se do slugu přidává délka studia, aby byly URL unikátní.
 */
export async function generateAllSlugs(): Promise<{ slug: string }[]> {
  const schools = await getAllSchools();
  const slugs: { slug: string }[] = [];
  const addedSlugs = new Set<string>();

  // Načíst detailní data ze schools_data.json pro zaměření
  const filePath = path.join(dataDir, 'schools_data.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(content);
  const yearData = data['2025'] || data['2024'] || [];

  // Seskupit školy podle REDIZO
  const schoolsByRedizo = new Map<string, School[]>();
  for (const school of schools) {
    const redizo = school.id.split('_')[0];
    if (!schoolsByRedizo.has(redizo)) {
      schoolsByRedizo.set(redizo, []);
    }
    schoolsByRedizo.get(redizo)!.push(school);
  }

  for (const [redizo, schoolList] of schoolsByRedizo) {
    const firstSchool = schoolList[0];
    const schoolNameSlug = createSlug(firstSchool.nazev);

    // 1. Přehled školy (krátký slug: redizo-nazev)
    const overviewSlug = `${redizo}-${schoolNameSlug}`;
    if (!addedSlugs.has(overviewSlug)) {
      slugs.push({ slug: overviewSlug });
      addedSlugs.add(overviewSlug);
    }

    // Zjistit duplicitní názvy oborů (stejný název, různá délka studia)
    const oborCounts = new Map<string, number>();
    for (const school of schoolList) {
      oborCounts.set(school.obor, (oborCounts.get(school.obor) || 0) + 1);
    }

    // 2. Detail oborů (standardní slug: redizo-nazev-obor nebo redizo-nazev-obor-Xlete pro duplicity)
    for (const school of schoolList) {
      const hasDuplicateName = (oborCounts.get(school.obor) || 0) > 1;
      // Pro duplicitní názvy přidat délku studia
      const oborSlug = hasDuplicateName
        ? createSlug(school.nazev, school.obor, undefined, school.delka_studia)
        : createSlug(school.nazev, school.obor);
      const fullSlug = `${redizo}-${oborSlug}`;
      if (!addedSlugs.has(fullSlug)) {
        slugs.push({ slug: fullSlug });
        addedSlugs.add(fullSlug);
      }
    }

    // 3. Detail zaměření (ze schools_data.json)
    // Pro zaměření také kontrolovat duplicitní kombinace obor+zaměření
    const detailedRecords = yearData.filter((s: { redizo: string }) => s.redizo === redizo);
    const zamereniCounts = new Map<string, number>();
    for (const record of detailedRecords) {
      if (record.zamereni) {
        const key = `${record.obor}|${record.zamereni}`;
        zamereniCounts.set(key, (zamereniCounts.get(key) || 0) + 1);
      }
    }

    for (const record of detailedRecords) {
      if (record.zamereni) {
        const key = `${record.obor}|${record.zamereni}`;
        const hasDuplicateZamereni = (zamereniCounts.get(key) || 0) > 1;
        const zamereniSlug = hasDuplicateZamereni
          ? createSlug(firstSchool.nazev, record.obor, record.zamereni, record.delka_studia)
          : createSlug(firstSchool.nazev, record.obor, record.zamereni);
        const fullSlug = `${redizo}-${zamereniSlug}`;
        if (!addedSlugs.has(fullSlug)) {
          slugs.push({ slug: fullSlug });
          addedSlugs.add(fullSlug);
        }
      }
    }
  }

  return slugs;
}

/**
 * Generuje slugy pro top N nejpopulárnějších škol (pro hybrid ISR+SSG)
 *
 * Používá popularity scoring na základě:
 * - Lokace (Praha, Brno = více trafficu)
 * - Typ školy (Gymnázia = více researche)
 * - Počet přihlášek (populární školy)
 * - Obtížnost (prestižní školy)
 *
 * @param count Počet top škol (default: 200)
 */
export async function generateTopSlugs(count: number = 200): Promise<{ slug: string }[]> {
  const schools = await getAllSchools();
  const slugs: { slug: string }[] = [];
  const addedSlugs = new Set<string>();

  // Načíst detailní data ze schools_data.json pro zaměření
  const filePath = path.join(dataDir, 'schools_data.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(content);
  const yearData = data['2025'] || data['2024'] || [];

  // Seskupit školy podle REDIZO
  const schoolsByRedizo = new Map<string, School[]>();
  for (const school of schools) {
    const redizo = school.id.split('_')[0];
    if (!schoolsByRedizo.has(redizo)) {
      schoolsByRedizo.set(redizo, []);
    }
    schoolsByRedizo.get(redizo)!.push(school);
  }

  // Připravit školy pro popularity scoring (jeden záznam per REDIZO)
  const schoolsForScoring = Array.from(schoolsByRedizo.entries()).map(([redizo, schoolList]) => {
    const firstSchool = schoolList[0];
    // Použít agregované metriky pro celou školu
    const totalPrihlasky = schoolList.reduce((sum, s) => sum + (s.prihlasky || 0), 0);
    const avgObtiznost = schoolList.reduce((sum, s) => sum + (s.obtiznost || 0), 0) / schoolList.length;
    const totalKapacita = schoolList.reduce((sum, s) => sum + (s.kapacita || 0), 0);

    return {
      redizo,
      nazev: firstSchool.nazev,
      kraj_kod: firstSchool.kraj_kod,
      obec: firstSchool.obec,
      typ: firstSchool.typ,
      prihlasky: totalPrihlasky,
      obtiznost: avgObtiznost,
      kapacita: totalKapacita,
    };
  });

  // Seřadit podle popularity
  const topSchoolsWithScore = sortSchoolsByPopularity(schoolsForScoring).slice(0, count);

  // Připojit zpět schools z mapy
  const topSchools = topSchoolsWithScore.map(school => ({
    ...school,
    schools: schoolsByRedizo.get(school.redizo)!,
  }));

  console.log(`\n🏆 Generuji slugy pro top ${count} nejpopulárnějších škol...`);
  console.log(`Top 5 škol:`);
  topSchools.slice(0, 5).forEach((school, idx) => {
    console.log(`  ${idx + 1}. [${school.popularityScore} bodů] ${school.nazev} (${school.obec})`);
  });
  console.log('');

  // Generovat slugy pro top školy
  for (const topSchool of topSchools) {
    const redizo = topSchool.redizo;
    const schoolList = topSchool.schools;
    const firstSchool = schoolList[0];
    const schoolNameSlug = createSlug(firstSchool.nazev);

    // 1. Přehled školy
    const overviewSlug = `${redizo}-${schoolNameSlug}`;
    if (!addedSlugs.has(overviewSlug)) {
      slugs.push({ slug: overviewSlug });
      addedSlugs.add(overviewSlug);
    }

    // Zjistit duplicitní názvy oborů
    const oborCounts = new Map<string, number>();
    for (const school of schoolList) {
      oborCounts.set(school.obor, (oborCounts.get(school.obor) || 0) + 1);
    }

    // 2. Detail oborů
    for (const school of schoolList) {
      const hasDuplicateName = (oborCounts.get(school.obor) || 0) > 1;
      const oborSlug = hasDuplicateName
        ? createSlug(school.nazev, school.obor, undefined, school.delka_studia)
        : createSlug(school.nazev, school.obor);
      const fullSlug = `${redizo}-${oborSlug}`;
      if (!addedSlugs.has(fullSlug)) {
        slugs.push({ slug: fullSlug });
        addedSlugs.add(fullSlug);
      }
    }

    // 3. Detail zaměření
    const detailedRecords = yearData.filter((s: { redizo: string }) => s.redizo === redizo);
    const zamereniCounts = new Map<string, number>();
    for (const record of detailedRecords) {
      if (record.zamereni) {
        const key = `${record.obor}|${record.zamereni}`;
        zamereniCounts.set(key, (zamereniCounts.get(key) || 0) + 1);
      }
    }

    for (const record of detailedRecords) {
      if (record.zamereni) {
        const key = `${record.obor}|${record.zamereni}`;
        const hasDuplicateZamereni = (zamereniCounts.get(key) || 0) > 1;
        const zamereniSlug = hasDuplicateZamereni
          ? createSlug(firstSchool.nazev, record.obor, record.zamereni, record.delka_studia)
          : createSlug(firstSchool.nazev, record.obor, record.zamereni);
        const fullSlug = `${redizo}-${zamereniSlug}`;
        if (!addedSlugs.has(fullSlug)) {
          slugs.push({ slug: fullSlug });
          addedSlugs.add(fullSlug);
        }
      }
    }
  }

  console.log(`✅ Vygenerováno ${slugs.length} slugů pro top ${count} škol\n`);

  return slugs;
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
 * Získá všechny obory dané školy (podle REDIZO) ze school_analysis.json
 */
export async function getSchoolsByRedizo(redizo: string): Promise<School[]> {
  const schools = await getAllSchools();
  return schools.filter(s => extractRedizo(s.id) === redizo);
}

/**
 * Typ pro program/zaměření školy z schools_data.json
 */
export interface SchoolProgram {
  id: string;
  redizo: string;
  nazev: string;
  obor: string;
  zamereni?: string;
  typ: string;
  delka_studia: number;
  kapacita: number;
  prihlasky: number;
  prijati: number;
  min_body: number;
  index_poptavky: number;
  obec: string;
  // Matching 2025↔2026
  is_new_2026?: boolean;
  matched_2025_id?: string;
  prev_zamereni_name?: string;
  match_type?: string;
}

/**
 * Získá všechna zaměření/obory dané školy
 * Kombinuje data ze school_analysis.json (obory) a schools_data.json (zaměření)
 *
 * Logika:
 * 1. Načte obory ze school_analysis.json (mají správné slugy a data)
 * 2. Pro každý obor zkontroluje, zda v schools_data.json existují zaměření
 * 3. Pokud ano, rozloží obor na jednotlivá zaměření
 */
export async function getProgramsByRedizo(redizo: string): Promise<SchoolProgram[]> {
  // Načíst obory ze school_analysis.json
  const schoolsFromAnalysis = await getSchoolsByRedizo(redizo);

  // Načíst detailní data ze schools_data.json
  const filePath = path.join(dataDir, 'schools_data.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(content);
  const yearData = data['2025'] || data['2024'] || [];

  // Najít všechny záznamy pro tuto školu v schools_data.json
  const detailedRecords = yearData.filter((s: { redizo: string }) => s.redizo === redizo);

  // Vytvořit mapu: baseId -> seznam zaměření
  const zamereniMap = new Map<string, Array<{
    id: string;
    zamereni: string;
    kapacita: number;
    min_body: number;
    prihlasky: number;
    prijati: number;
  }>>();

  for (const record of detailedRecords) {
    // Extrahovat base ID (redizo_kkov) z plného ID
    const idParts = record.id.split('_');
    const baseId = idParts.length >= 2 ? `${idParts[0]}_${idParts[1]}` : record.id;

    if (!zamereniMap.has(baseId)) {
      zamereniMap.set(baseId, []);
    }

    // Pokud má zaměření, přidat do seznamu
    if (record.zamereni) {
      zamereniMap.get(baseId)!.push({
        id: record.id,
        zamereni: record.zamereni,
        kapacita: record.kapacita,
        min_body: Math.round((record.min_body || 0) / 2),
        prihlasky: record.prihlasky,
        prijati: record.prijati,
      });
    }
  }

  // Vytvořit výsledný seznam programů
  const programs: SchoolProgram[] = [];

  for (const school of schoolsFromAnalysis) {
    const zamereniList = zamereniMap.get(school.id);

    // Matching metadata z school_analysis.json
    const matchingMeta = {
      ...(school.is_new_2026 ? { is_new_2026: true } : {}),
      ...(school.matched_2025_id ? { matched_2025_id: school.matched_2025_id } : {}),
      ...(school.prev_zamereni_name ? { prev_zamereni_name: school.prev_zamereni_name } : {}),
      ...(school.match_type ? { match_type: school.match_type } : {}),
    };

    if (zamereniList && zamereniList.length > 0) {
      // Škola má zaměření - rozložit na jednotlivá zaměření
      for (const z of zamereniList) {
        // Vypočítat index poptávky z dat zaměření (ne z agregovaného oboru)
        const zamereniIndexPoptavky = z.kapacita > 0
          ? Math.round((z.prihlasky / z.kapacita) * 100) / 100
          : school.index_poptavky;
        programs.push({
          id: z.id,
          redizo: redizo,
          nazev: school.nazev,
          obor: school.obor,
          zamereni: z.zamereni,
          typ: school.typ,
          delka_studia: school.delka_studia,
          kapacita: z.kapacita,
          prihlasky: z.prihlasky,
          prijati: z.prijati,
          min_body: z.min_body,
          index_poptavky: zamereniIndexPoptavky,
          obec: school.obec,
          ...matchingMeta,
        });
      }
    } else {
      // Škola nemá zaměření - použít data ze school_analysis.json
      programs.push({
        id: school.id,
        redizo: redizo,
        nazev: school.nazev,
        obor: school.obor,
        zamereni: undefined,
        typ: school.typ,
        delka_studia: school.delka_studia,
        kapacita: school.kapacita,
        prihlasky: school.prihlasky,
        prijati: school.prijati,
        min_body: school.min_body,
        index_poptavky: school.index_poptavky,
        obec: school.obec,
        ...matchingMeta,
      });
    }
  }

  return programs;
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
  // Kohorty přijatých studentů (9 kategorií podle úrovně a profilu)
  cohorts: number[] | null;      // [exc_math, exc_bal, exc_hum, good_math, good_bal, good_hum, low_math, low_bal, low_hum]
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

        // Použít maximum z: skutečné JPZ minimum z dat uchazečů (ale sdílené přes zaměření)
        // a per-zaměření minimum z CERMAT agregátu. MAX zajistí správnou hodnotu i pro
        // školy s více zaměřeními stejného kkov (kde jpz_min_actual je sdílené).
        const jpz_min_from_aggregate = Math.round(min_body_raw / 2);
        const jpz_min = jpz_min_actual > 0
          ? Math.max(jpz_min_actual, jpz_min_from_aggregate)
          : (cj_min + ma_min);
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
          hasExtraCriteria,
          cohorts: school.cohorts || null
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
 * Získá rozšířené statistiky pro konkrétní program/zaměření
 * Na rozdíl od getExtendedSchoolStats, tato funkce hledá přesné ID včetně zaměření
 */
export async function getExtendedStatsForProgram(programId: string): Promise<ExtendedSchoolStats | null> {
  const filePath = path.join(dataDir, 'schools_data.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(content);

  // Hledat přesně podle ID v datech 2025, pak 2024
  for (const year of ['2025', '2024']) {
    if (!data[year]) continue;

    const school = data[year].find((s: { id: string }) => s.id === programId);
    if (school) {
      // Převod z % skórů na skutečné body
      const cj_min = Math.round((school.cj_min || 0) / 2);
      const ma_min = Math.round((school.ma_min || 0) / 2);
      const cj_prumer = Math.round(((school.cj_prumer || 0) / 2) * 10) / 10;
      const ma_prumer = Math.round(((school.ma_prumer || 0) / 2) * 10) / 10;
      const min_body = Math.round((school.min_body || 0) / 2);

      const jpz_min_actual = school.jpz_min_actual || 0;
      // Použít maximum z: skutečné JPZ minimum z dat uchazečů (ale sdílené přes zaměření)
      // a per-zaměření minimum z CERMAT agregátu. MAX zajistí správnou hodnotu i pro
      // školy s více zaměřeními stejného kkov (kde jpz_min_actual je sdílené).
      const jpz_min_from_aggregate = Math.round((school.min_body || 0) / 2);
      const jpz_min = jpz_min_actual > 0
        ? Math.max(jpz_min_actual, jpz_min_from_aggregate)
        : (cj_min + ma_min);
      // cj_at_jpz_min / ma_at_jpz_min jsou platná jen když jpz_min_actual není ze sdíleného zaměření
      const actualIsRepresentative = jpz_min_actual > 0 && jpz_min_actual >= jpz_min_from_aggregate;
      const cj_at_jpz_min = actualIsRepresentative ? (school.cj_at_jpz_min || 0) : 0;
      const ma_at_jpz_min = actualIsRepresentative ? (school.ma_at_jpz_min || 0) : 0;
      const jpz_prumer = Math.round((cj_prumer + ma_prumer) * 10) / 10;

      const extra_body = min_body - jpz_min;
      const hasExtraCriteria = extra_body > 5;

      return {
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
        hasExtraCriteria,
        cohorts: school.cohorts || null
      };
    }
  }

  // Fallback na standardní metodu (pro obory bez zaměření)
  return getExtendedSchoolStats(programId);
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
  prijati2024: number;          // počet přijatých v roce 2024 (pro normalizaci)
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
    prijati: number;
    index_poptavky: number;
    min_body: number;
  }>();

  for (const school of (data['2024'] || [])) {
    const baseId = school.id.split('_').slice(0, 2).join('_');
    data2024Map.set(baseId, {
      prihlasky: school.prihlasky || 0,
      prijati: school.prijati || 0,
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
    const prijati2024 = prev?.prijati || 0;
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
      prijati2024,
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

// Cache pro trend data programů (včetně zaměření)
let trendDataByProgramCache: Map<string, YearlyTrendData> | null = null;

/**
 * Načte trend data pro všechny programy včetně zaměření
 * Na rozdíl od getTrendDataMap, tato funkce používá plné ID (včetně zaměření)
 */
async function getTrendDataByProgramMap(): Promise<Map<string, YearlyTrendData>> {
  if (trendDataByProgramCache) return trendDataByProgramCache;

  const filePath = path.join(dataDir, 'schools_data.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(content);

  trendDataByProgramCache = new Map();

  // Indexovat data 2024 podle plného ID
  const data2024Map = new Map<string, {
    prihlasky: number;
    prijati: number;
    index_poptavky: number;
    min_body: number;
  }>();

  for (const school of (data['2024'] || [])) {
    data2024Map.set(school.id, {
      prihlasky: school.prihlasky || 0,
      prijati: school.prijati || 0,
      index_poptavky: school.index_poptavky || 0,
      min_body: school.min_body || 0
    });
  }

  // Spárovat s daty 2025
  for (const school of (data['2025'] || [])) {
    const prev = data2024Map.get(school.id);

    const prihlasky2025 = school.prihlasky || 0;
    const prihlasky2024 = prev?.prihlasky || 0;
    const prijati2024 = prev?.prijati || 0;
    const indexPoptavky2025 = school.index_poptavky || 0;
    const indexPoptavky2024 = prev?.index_poptavky || 0;
    // min_body jsou v % skórech (0-200), převádíme na skutečné body (0-100)
    const minBody2025 = Math.round((school.min_body || 0) / 2);
    const minBody2024 = Math.round((prev?.min_body || 0) / 2);

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

    trendDataByProgramCache.set(school.id, {
      prihlasky2024,
      prihlasky2025,
      prihlaskyChange,
      prihlaskyDirection,
      prijati2024,
      indexPoptavky2024,
      indexPoptavky2025,
      indexChange: indexPoptavky2025 - indexPoptavky2024,
      minBody2024,
      minBody2025,
      minBodyChange: minBody2025 - minBody2024
    });
  }

  return trendDataByProgramCache;
}

/**
 * Získá trend data pro konkrétní program (včetně zaměření)
 */
export async function getTrendDataForProgram(programId: string): Promise<YearlyTrendData | null> {
  const allTrends = await getTrendDataByProgramMap();
  return allTrends.get(programId) || null;
}

/**
 * Získá trend data pro pole programů (včetně zaměření)
 */
export async function getTrendDataForPrograms(programIds: string[]): Promise<Map<string, YearlyTrendData>> {
  const allTrends = await getTrendDataByProgramMap();
  const result = new Map<string, YearlyTrendData>();

  for (const programId of programIds) {
    const trend = allTrends.get(programId);
    if (trend) {
      result.set(programId, trend);
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
  schoolType: string
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

// ============================================================================
// InspIS PORTÁL Data (file-based)
// ============================================================================

let inspisDataCache: InspisDataset | null = null;

/**
 * Načte InspIS dataset z data/inspis_school_profiles.json (server-side only)
 */
export async function getInspisDataset(): Promise<InspisDataset | null> {
  if (inspisDataCache) return inspisDataCache;

  try {
    const filePath = path.join(process.cwd(), 'data', 'inspis_school_profiles.json');
    const data = await fs.readFile(filePath, 'utf-8');
    inspisDataCache = JSON.parse(data) as InspisDataset;
    return inspisDataCache;
  } catch (error) {
    console.error('Chyba při načítání InspIS datasetu:', error);
    return null;
  }
}

/**
 * Získá InspIS data pro školu podle REDIZO
 */
export async function getInspisDataByRedizo(redizo: string): Promise<SchoolInspisData | null> {
  const dataset = await getInspisDataset();
  if (!dataset) return null;
  return dataset.schools[redizo] || null;
}

// ============================================================================
// Data přihlášek 2026 (1. kolo) – SAMOSTATNÝ soubor applications_2026.json
// ============================================================================

/**
 * Sloučený záznam: dynamická data 2026 + statická data joinnutá z 2025
 */
export interface School2026Data {
  id: string;
  redizo: string;
  nazev: string;
  nazev_display: string;
  obor: string;
  zamereni: string;
  kkov: string;
  typ: string;
  delka_studia: number;
  obec: string;
  kraj: string;
  kraj_kod: string;
  kapacita: number;
  prihlasky: number;
  prihlasky_priority: number[];
  index_poptavky: number;
  is_new?: boolean; // nový obor/zaměření 2026 bez historie
  prev_zamereni_name?: string; // předchozí název zaměření (přejmenování)
}

// ── CERMAT výsledky (roční cyklus) ────────────────────────────────────────────

export interface ResultsMeta {
  latest_year: number;
  available_years: number[];
}

export interface SchoolResult {
  redizo: string;
  kkov: string;
  zamereni: string;
  nazev: string;
  nazev_display?: string;
  kraj: string;
  school_type: string;
  kapacita: number;
  prijati: number;
  cj_ma_prijati: number;
  cj_prijati: number;
  ma_prijati: number;
  cj_ma_prijati_prev: number;
  delta_cj_ma: number | null;
  rank_in_type: number;
  type_total: number;
}

/** Raw záznam z applications_2026.json (jen dynamická data per obor) */
interface Raw2026Record {
  id: string;
  kapacita: number;
  prihlasky: number;
  pp: number[];   // prihlasky_priority (zkrácený klíč)
  idx: number;    // index_poptavky (zkrácený klíč)
  is_new?: boolean; // nový obor/zaměření v 2026 (bez historie 2025)
}

// Cache
let raw2026Cache: Raw2026Record[] | null = null;
let schools2026Cache: School2026Data[] | null = null;
let resultsMetaCache: ResultsMeta | null = null;
const resultsYearCache = new Map<number, Map<string, SchoolResult>>();

/**
 * Načte raw data 2026 z applications_2026.json
 */
async function getRaw2026Data(): Promise<Raw2026Record[]> {
  if (raw2026Cache) return raw2026Cache;
  try {
    const filePath = path.join(dataDir, 'applications_2026.json');
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    raw2026Cache = parsed.data || [];
  } catch {
    raw2026Cache = [];
  }
  return raw2026Cache!;
}

/**
 * Načte data přihlášek 2026 obohacená o statická data ze schools_data.json (2025)
 * Každý obor/zaměření má vlastní záznam s vlastními přihláškami.
 */
export async function getSchools2026Data(): Promise<School2026Data[]> {
  if (schools2026Cache) return schools2026Cache;

  const [rawRecords, schoolsDataContent, analysisData] = await Promise.all([
    getRaw2026Data(),
    fs.readFile(path.join(dataDir, 'schools_data.json'), 'utf-8'),
    getSchoolAnalysis(),
  ]);

  const schoolsData = JSON.parse(schoolsDataContent);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schools2025: any[] = schoolsData['2025'] || [];

  // Index statických dat 2025 podle ID (per obor/zaměření)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const staticIndex = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const staticByBase = new Map<string, any>();
  for (const s of schools2025) {
    staticIndex.set(s.id, s);
    // Index podle base key (REDIZO_KKOV) - první záznam vyhrává
    const base = s.id.split('_').slice(0, 2).join('_');
    if (!staticByBase.has(base)) {
      staticByBase.set(base, s);
    }
  }

  schools2026Cache = rawRecords.map(r => {
    const baseKey = r.id.split('_').slice(0, 2).join('_');
    const analysis = analysisData[baseKey];
    // Lookup: přesné ID → matched_2025_id z analýzy → base key fallback
    const s = staticIndex.get(r.id)
      || (analysis?.matched_2025_id ? staticIndex.get(analysis.matched_2025_id) : null)
      || staticByBase.get(baseKey);
    return {
      id: r.id,
      redizo: s?.redizo || r.id.split('_')[0],
      nazev: s?.nazev || '',
      nazev_display: s?.nazev_display || s?.nazev || '',
      obor: s?.obor || '',
      zamereni: s?.zamereni || '',
      kkov: s?.kkov || '',
      typ: s?.typ || '',
      delka_studia: s?.delka_studia || 4,
      obec: s?.obec || '',
      kraj: s?.kraj || '',
      kraj_kod: s?.kraj_kod || '',
      kapacita: r.kapacita,
      prihlasky: r.prihlasky,
      prihlasky_priority: r.pp,
      index_poptavky: r.idx,
      ...(r.is_new ? { is_new: true } : {}),
      ...(analysis?.prev_zamereni_name ? { prev_zamereni_name: analysis.prev_zamereni_name } : {}),
    };
  });

  return schools2026Cache;
}

/**
 * Získá data 2026 pro konkrétní školu podle ID
 */
export async function get2026DataById(schoolId: string): Promise<School2026Data | null> {
  const allData = await getSchools2026Data();
  // Zkusit přesné ID, pak baseId
  const baseId = schoolId.split('_').slice(0, 2).join('_');
  return allData.find(s => s.id === schoolId) ||
         allData.find(s => s.id.startsWith(baseId)) ||
         null;
}

/**
 * Získá data 2026 pro školu podle REDIZO
 */
export async function get2026DataByRedizo(redizo: string): Promise<School2026Data[]> {
  const allData = await getSchools2026Data();
  return allData.filter(s => s.redizo === redizo);
}

/**
 * Vrátí kombinovaná data pro kalkulačku šancí
 * Spojí data 2026, 2025 a 2024 pro daný program
 */
export async function getChancesData(programId: string): Promise<{
  data2026: School2026Data | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data2025: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data2024: any;
} | null> {
  const [data2026, schoolsDataContent] = await Promise.all([
    get2026DataById(programId),
    fs.readFile(path.join(dataDir, 'schools_data.json'), 'utf-8'),
  ]);

  const schoolsData = JSON.parse(schoolsDataContent);
  const baseId = programId.split('_').slice(0, 2).join('_');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const find = (yearData: any[]) => {
    if (!yearData) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return yearData.find((s: any) => s.id === programId) ||
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           yearData.find((s: any) => s.id.startsWith(baseId)) ||
           null;
  };

  return {
    data2026,
    data2025: find(schoolsData['2025']),
    data2024: find(schoolsData['2024']),
  };
}

// ============================================================================
// ČŠI (Česká školní inspekce) Data
// ============================================================================

// Cache pro ČŠI data
let csiDataCache: CSIDataset | null = null;

/**
 * Načte data ČŠI (inspekční zprávy) z JSON souboru
 */
export async function getCSIData(): Promise<CSIDataset> {
  if (csiDataCache) return csiDataCache;

  try {
    const filePath = path.join(dataDir, 'csi_inspections.json');
    const data = await fs.readFile(filePath, 'utf-8');
    csiDataCache = JSON.parse(data);
    return csiDataCache!;
  } catch (error) {
    console.error('Chyba při načítání ČŠI dat:', error);
    return {};
  }
}

/**
 * Získá inspekční zprávy pro školu podle REDIZO
 */
export async function getCSIDataByRedizo(redizo: string): Promise<CSISchoolData | null> {
  const csiData = await getCSIData();
  return csiData[redizo] || null;
}

/**
 * Zjistí, zda byla škola inspekována v posledních N letech
 */
export function wasInspectedRecently(csiData: CSISchoolData | null, years: number = 2): boolean {
  if (!csiData || !csiData.lastInspectionDate) return false;

  const lastInspection = new Date(csiData.lastInspectionDate);
  const yearsAgo = new Date();
  yearsAgo.setFullYear(yearsAgo.getFullYear() - years);

  return lastInspection >= yearsAgo;
}

/**
 * Získá popisný text pro badge podle data poslední inspekce
 */
export function getInspectionBadgeText(csiData: CSISchoolData | null): string | null {
  if (!csiData || csiData.inspectionCount === 0) return null;

  const lastDate = csiData.lastInspectionDate ? new Date(csiData.lastInspectionDate) : null;
  if (!lastDate) return null;

  const now = new Date();
  const yearsDiff = now.getFullYear() - lastDate.getFullYear();

  if (yearsDiff === 0) return 'Inspekce letos';
  if (yearsDiff === 1) return 'Inspekce vloni';
  if (yearsDiff <= 2) return 'Inspekce nedávno';
  if (yearsDiff <= 5) return `${csiData.inspectionCount}× inspekce za 10 let`;

  return `${csiData.inspectionCount}× inspekce`;
}

// ============================================================================
// AI-extrahovaná inspekční data
// ============================================================================

// Cache pro extrakce inspekčních zpráv
let extractionsCache: Record<string, InspectionExtraction[]> | null = null;

/**
 * Načte a zpracuje inspection_extractions.json + production_reports.json
 * Vrátí mapu redizo -> deduplikované InspectionExtraction[] (nejnovější první)
 */
export async function getInspectionExtractions(): Promise<Record<string, InspectionExtraction[]>> {
  if (extractionsCache) return extractionsCache;

  try {
    const extractionsPath = path.join(process.cwd(), 'data', 'inspection_extractions.json');
    const extractionsRaw = await fs.readFile(extractionsPath, 'utf-8');
    const extractionsData = JSON.parse(extractionsRaw);
    const schools = extractionsData.schools || {};

    // Načíst report URLs z production_reports.json (volitelně)
    const reportUrls: Record<string, string> = {};
    try {
      const reportsPath = path.join(process.cwd(), 'inspekce', 'config', 'production_reports.json');
      const reportsRaw = await fs.readFile(reportsPath, 'utf-8');
      const reportsData = JSON.parse(reportsRaw);
      for (const r of (reportsData.reports || [])) {
        if (r.report_id && r.source_url) {
          reportUrls[r.report_id] = r.source_url;
        }
      }
    } catch {
      // production_reports.json nemusí existovat
    }

    const result: Record<string, InspectionExtraction[]> = {};

    for (const [redizo, inspections] of Object.entries(schools)) {
      const inspList = inspections as Array<{
        report_id: string;
        inspection_from: string;
        inspection_to: string;
        model_id: string;
        parsed_output: {
          for_parents?: {
            plain_czech_summary?: string;
            strengths?: Array<{ tag: string; detail: string; evidence?: string }>;
            risks?: Array<{ tag: string; detail: string; evidence?: string }>;
            who_school_fits?: string[];
            who_should_be_cautious?: string[];
            questions_for_open_day?: string[];
          };
          hard_facts?: Record<string, string>;
          school_profile?: {
            school_type?: string;
            inspection_period?: string;
            school_change_summary?: string;
          };
        };
      }>;

      // Mapovat na InspectionExtraction
      const mapped: (InspectionExtraction & { model_id: string })[] = inspList
        .filter(insp => insp.parsed_output?.for_parents?.plain_czech_summary)
        .map(insp => {
          const fp = insp.parsed_output.for_parents!;
          return {
            report_id: insp.report_id,
            source_url: reportUrls[insp.report_id] || '',
            date: insp.inspection_from || '',
            date_to: insp.inspection_to || '',
            plain_czech_summary: fp.plain_czech_summary || '',
            strengths: fp.strengths || [],
            risks: fp.risks || [],
            who_school_fits: fp.who_school_fits || [],
            who_should_be_cautious: fp.who_should_be_cautious || [],
            questions_for_open_day: fp.questions_for_open_day || [],
            hard_facts: insp.parsed_output.hard_facts || {},
            school_profile: insp.parsed_output.school_profile || {},
            model_id: insp.model_id || '',
          };
        });

      // Deduplikovat per datum inspekce (preferovat claude model)
      const byDate = new Map<string, InspectionExtraction & { model_id: string }>();
      for (const item of mapped) {
        const existing = byDate.get(item.date);
        if (!existing) {
          byDate.set(item.date, item);
        } else if (item.model_id.includes('claude') && !existing.model_id.includes('claude')) {
          byDate.set(item.date, item);
        }
      }

      // Seřadit od nejnovější, odstranit model_id z výstupu
      const deduped = Array.from(byDate.values())
        .sort((a, b) => b.date.localeCompare(a.date))
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(({ model_id: _modelId, ...rest }) => rest);

      if (deduped.length > 0) {
        result[redizo] = deduped;
      }
    }

    extractionsCache = result;
    return result;
  } catch (error) {
    console.error('Chyba při načítání inspekčních extrakcí:', error);
    return {};
  }
}

/**
 * Získá AI-extrahovaná inspekční data pro školu podle REDIZO
 */
export async function getExtractionsByRedizo(redizo: string): Promise<InspectionExtraction[]> {
  const all = await getInspectionExtractions();
  return all[redizo] || [];
}

// ── CERMAT výsledky — funkce ──────────────────────────────────────────────────

export async function getResultsMeta(): Promise<ResultsMeta> {
  if (resultsMetaCache) return resultsMetaCache;
  try {
    const content = await fs.readFile(path.join(dataDir, 'cermat_results_meta.json'), 'utf-8');
    resultsMetaCache = JSON.parse(content);
  } catch {
    resultsMetaCache = { latest_year: 2026, available_years: [2026] };
  }
  return resultsMetaCache!;
}

export async function getResultsForYear(year: number): Promise<Map<string, SchoolResult>> {
  if (resultsYearCache.has(year)) return resultsYearCache.get(year)!;
  try {
    const filePath = path.join(dataDir, `cermat_results_${year}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    const raw = JSON.parse(content) as Record<string, SchoolResult>;

    // Enrich with nazev_display from schools_data.json
    const schoolsData = await getSchoolsData();
    const yearData: Array<Record<string, unknown>> = (schoolsData as Record<string, unknown>)['2025'] as Array<Record<string, unknown>> || [];
    const displayNameByRedizo = new Map<string, string>();
    for (const s of yearData) {
      const redizo = s.redizo as string;
      const nd = s.nazev_display as string;
      if (redizo && nd && !displayNameByRedizo.has(redizo)) {
        displayNameByRedizo.set(redizo, nd);
      }
    }
    for (const result of Object.values(raw)) {
      const displayName = displayNameByRedizo.get(result.redizo);
      if (displayName) {
        result.nazev_display = displayName;
      }
    }

    const map = new Map(Object.entries(raw));
    resultsYearCache.set(year, map);
    return map;
  } catch {
    const empty = new Map<string, SchoolResult>();
    resultsYearCache.set(year, empty);
    return empty;
  }
}

export async function getSchoolResultsByRedizo(redizo: string, year?: number): Promise<SchoolResult[]> {
  const meta = await getResultsMeta();
  const targetYear = year ?? meta.latest_year;
  const allResults = await getResultsForYear(targetYear);
  const found: SchoolResult[] = [];
  for (const [, rec] of allResults) {
    if (rec.redizo === redizo) found.push(rec);
  }
  return found;
}
