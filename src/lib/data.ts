import { hasInspectionSummary } from './inspection-availability.mjs';
import { canPublishAcceptedResult } from './result-quality';
import { historicalSubjectAverage, type AdmissionScore } from './admission-metric';
import type { AdmissionContext } from './admission-summary';
import { subjectScore, unavailableAdmissionScores } from './historical-scores';
import { normalizeSchoolKey, uniqueSchoolIndex, vypsanaNabidkaBezZamereni } from './school-key';
import { promises as fs } from 'fs';
import path from 'path';
import { School, SchoolAnalysis, SchoolData, SchoolsData, SchoolDetail, krajNames, CSIDataset, CSISchoolData, InspectionExtraction } from '@/types/school';
import { InspisDataset, SchoolInspisData } from '@/types/inspis';
import { createSlug, createKrajSlug, extractRedizo } from './utils';
import { adresaPrehledu, adresyBezJpzMapa, adresySkolyMapa, obsazeneAdresy } from './adresa-oboru.mjs';
import { nabidkyBezJpzSkoly, obtiznostBezJpz, type NabidkaBezJpz } from './obory-bez-jpz';
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
  // Aktuální nabídka je poslední ročník katalogu. Ročník 2026 nese letošní
  // čísla a u nabídek, které se letos nevypsaly, i loňský záznam s příznakem,
  // aby jejich stránka nezanikla.
  const schoolsRecord = schoolsData as Record<string, unknown>;
  const yearData: Array<Record<string, unknown>> =
    (schoolsRecord['2026'] ?? schoolsRecord['2025']) as Array<Record<string, unknown>> || [];

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
      // Letošní nabídka bez zaměření vedle loňských nevypsaných zaměření (viz getProgramsByRedizo).
      if (vypsanaNabidkaBezZamereni(yearData as { id: string }[], school.id)) {
        const zaznam = yearData.find(r => r.id === school.id);
        result.push({
          ...school,
          nazev_display: (zaznam?.nazev_display as string) || school.nazev,
          kapacita: zaznam?.kapacita as number,
          prihlasky: zaznam?.prihlasky as number,
          prijati: zaznam?.prijati as number,
        });
      }
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

  // Adresa stránky oboru ze sdílené mapy, stejně jako ji rozpoznává getSchoolPageType
  // (kanonický název první školy s REDIZO, přípony -4lete/-8lete u shodných názvů).
  const podleRedizo = new Map<string, School[]>();
  for (const s of result) {
    const redizo = s.id.split('_')[0];
    if (!podleRedizo.has(redizo)) podleRedizo.set(redizo, []);
    podleRedizo.get(redizo)!.push(s);
  }
  for (const [redizo, nabidky] of podleRedizo) {
    const mapa = adresySkolyMapa(redizo, nabidky[0].nazev, nabidky);
    for (const [adresa, n] of mapa) (n as School).adresa_stranky = adresa;
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
  /**
   * Kanonická adresa, na kterou se má trvale přesměrovat. Vzniká u **základní adresy oboru
   * bez zaměření**, kterou nikdo nenavrhl — dřív se pro ni syntetizoval program s klíčem
   * bez přípony zaměření, ten nesedl na souhrn 1. kola a stránka spadla do starší podoby
   * s loňskými čísly. Má-li obor v ročníku jedinou nabídku, míří sem její úplná adresa;
   * u víc nabídek přehled školy. Návrh: docs/adresa-oboru-2027.md, kroky A a B.
   */
  presmerovatNa?: string;
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
  const overviewSlug = adresaPrehledu(redizo, firstSchool.nazev);

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

  // Adresy nabídek skládá sdílený modul, tentýž, kterým je staví generátor sitemapy
  // i vyhledávání. Rozpoznání je pak prosté vyhledání v mapě, ne skládání podle vzorců:
  // dokud si obě strany vzorce opisovaly, mohly se rozejít a rozešly se.
  const adresyNabidek = adresySkolyMapa(redizo, firstSchool.nazev, programs);
  const nabidkaNaAdrese = adresyNabidek.get(slug) as SchoolProgram | undefined;
  if (nabidkaNaAdrese) {
    return { type: nabidkaNaAdrese.zamereni ? 'zamereni' : 'program', redizo, school: firstSchool, program: nabidkaNaAdrese };
  }
  // Nabídky bez JPZ (etapa 3a) mají adresy z vlastní mapy, která dnešní adresy nemění.
  const bezJpz = (await getProgramyBezJpz(redizo, firstSchool.nazev, programs)).find(p => p.adresa === slug);
  if (bezJpz) return { type: 'program', redizo, school: firstSchool, program: bezJpz };
  const slugNabidky = (program: SchoolProgram) => {
    for (const [adresa, n] of adresyNabidek) if (n === program) return adresa;
    return overviewSlug;
  };

  /** Základní adresa oboru bez zaměření: kam patří, když nabídka bez zaměření neexistuje. */
  const misto = (kandidati: SchoolProgram[]) => kandidati.length === 1
    ? { type: 'program' as const, redizo, school: firstSchool, program: null, presmerovatNa: `/skola/${slugNabidky(kandidati[0])}` }
    : { type: 'overview' as const, redizo, school: firstSchool, program: null, presmerovatNa: `/skola/${overviewSlug}#obory` };

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
        if (program) return { type: 'program', redizo, school, program };
        return misto(programs.filter(p => p.obor === school.obor && p.delka_studia === school.delka_studia));
      }
    }

    // Zkusit standardní slug bez délky studia
    const oborSlug = `${redizo}-${createSlug(school.nazev, school.obor)}`;
    if (slug === oborSlug) {
      // Adresa bez délky studia u dvou nabídek téhož názvu bez zaměření nepatří žádné z nich
      // (mapa jim dává -4lete a -8lete); dřív by vybrala první a potichu změnila význam.
      const bezZamereni = programs.filter(p => !p.zamereni && p.obor === school.obor);
      if (bezZamereni.length > 1) return misto(bezZamereni);
      // Najít odpovídající program (bez zaměření)
      const program = programs.find(p => !p.zamereni && p.obor === school.obor);
      if (program) return { type: 'program', redizo, school, program };
      return misto(programs.filter(p => p.obor === school.obor));
    }
  }

  // Obory bez zaměření, které přibyly až v novějším ročníku katalogu, nejsou v school_analysis.json,
  // a proto je smyčka výše nenajde; stránky školy na ně přitom odkazují stejným tvarem adresy.
  const pocetOboruPrograms = new Map<string, number>();
  for (const program of programs) {
    if (!program.zamereni) pocetOboruPrograms.set(program.obor, (pocetOboruPrograms.get(program.obor) || 0) + 1);
  }
  for (const program of programs) {
    if (program.zamereni) continue;
    const sDelkou = (pocetOboruPrograms.get(program.obor) || 0) > 1;
    const oborSlug = `${redizo}-${createSlug(firstSchool.nazev, program.obor, undefined, sDelkou ? program.delka_studia : undefined)}`;
    if (slug === oborSlug) {
      return { type: 'program', redizo, school: firstSchool, program };
    }
  }

  // Adresa nepatří žádné nabídce ročníku. Dřív se pod ní vykreslil přehled školy s kódem 200,
  // takže tentýž obsah měl dvě adresy; nově se na přehled trvale přesměruje. Týká se i adres ze
  // starší sitemapy, které po přepnutí ročníku na žádnou nabídku nevedou.
  if (slug !== overviewSlug) {
    return { type: 'overview', redizo, school: firstSchool, program: null, presmerovatNa: `/skola/${overviewSlug}` };
  }
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
  const yearData = data['2026'] || data['2025'] || data['2024'] || [];

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
  const yearData = data['2026'] || data['2025'] || data['2024'] || [];

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
  /** Ročník, ze kterého pocházejí čísla záznamu. */
  rok?: number;
  /** Ročník zděděných historických ukazatelů (hranice přijetí, kohorty). */
  historicka_data_rok?: number;
  /** Nabídka, kterou škola v aktuálním ročníku nevypsala. */
  nevypsano_2026?: boolean;
  // Matching 2025↔2026
  is_new_2026?: boolean;
  matched_2025_id?: string;
  prev_zamereni_name?: string;
  match_type?: string;
  /**
   * Nabídka bez jednotné přijímací zkoušky (issue #244): celý záznam z `src/data/obory-bez-jpz-2026.json`.
   * Body ani nic na nich postaveného nemá; `min_body` je u ní 0 a nesmí se zobrazit.
   */
  bezJpz?: NabidkaBezJpz;
  /** Adresa stránky nabídky bez JPZ (`adresyBezJpzMapa`); u ostatních nabídek se skládá jako dřív. */
  adresa?: string;
}

/**
 * Odkaz a obtížnost učebního oboru podle klíče `REDIZO_KKOV` pro tabulky jiných stránek (obory výš
 * a níž na přihlášce). Jen u škol, které web vede; víc nabídek téhož oboru vede na přehled školy.
 */
export async function oborBezJpzProKlic(klic: string): Promise<{
  href: string; zarazeni: ReturnType<typeof obtiznostBezJpz>; prijati: number | null; soutezici: number | null;
} | null> {
  const [redizo, kkov] = klic.split('_');
  // Levná kontrola nejdřív: `getProgramsByRedizo` čte celý katalog, volá se jen u školy s učebním oborem.
  if (!(await nabidkyBezJpzSkoly(redizo)).some(n => n.kkov === kkov)) return null;
  const skoly = await getSchoolsByRedizo(redizo);
  if (skoly.length === 0) return null;
  const nazev = skoly[0].nazev;
  const programy = (await programyBezJpzSkoly(redizo, nazev)).filter(p => p.bezJpz?.kkov === kkov);
  if (programy.length === 0) return null;
  if (programy.length > 1) return { href: `/skola/${adresaPrehledu(redizo, nazev)}#obory`, zarazeni: null, prijati: null, soutezici: null };
  const n = programy[0].bezJpz!;
  return {
    href: `/skola/${programy[0].adresa}`, zarazeni: obtiznostBezJpz(n), prijati: n.prijati,
    soutezici: n.prijati !== null && n.nepr_kapacita !== null ? n.prijati + n.nepr_kapacita : null,
  };
}

/** Data jsou statická, výsledek pro školu se proto pamatuje (tabulky oborů na přihlášce ho čtou opakovaně). */
const bezJpzCache = new Map<string, Promise<SchoolProgram[]>>();
function programyBezJpzSkoly(redizo: string, nazev: string): Promise<SchoolProgram[]> {
  const klic = `${redizo}|${nazev}`;
  if (!bezJpzCache.has(klic)) bezJpzCache.set(klic, getProgramsByRedizo(redizo).then(jpz => getProgramyBezJpz(redizo, nazev, jpz)));
  return bezJpzCache.get(klic)!;
}

/**
 * Nabídky bez JPZ jedné školy jako programy s vlastní adresou (etapa 3a). Volá se jen tam, kde se
 * mají ukázat (stránka školy, záložky oborů, rozpoznání adresy), ne z `getProgramsByRedizo`, který
 * čtou i jiné části webu. `programyJpz` drží adresy, které se nesmí změnit.
 */
export async function getProgramyBezJpz(redizo: string, nazevSkoly: string, programyJpz: SchoolProgram[]): Promise<SchoolProgram[]> {
  const nabidky = await nabidkyBezJpzSkoly(redizo);
  if (nabidky.length === 0) return [];
  const obsazene = obsazeneAdresy(redizo, nazevSkoly, programyJpz);
  const vstup = nabidky.map(n => ({ id: n.id, obor: n.obor, zamereni: n.zamereni || undefined, delka_studia: n.delka ?? 0, nabidka: n }));
  const programy: SchoolProgram[] = [];
  for (const [adresa, v] of adresyBezJpzMapa(redizo, nazevSkoly, vstup, obsazene) as Map<string, typeof vstup[number]>) {
    const n = v.nabidka;
    programy.push({
      id: n.id, redizo, nazev: nazevSkoly, obor: n.obor,
      zamereni: n.zamereni && n.zamereni.toLocaleLowerCase('cs') !== n.obor.toLocaleLowerCase('cs') ? n.zamereni : undefined,
      typ: n.typ_skoly, delka_studia: n.delka ?? 0,
      kapacita: n.kapacita ?? 0, prihlasky: n.prihlasky ?? 0, prijati: n.prijati ?? 0, min_body: 0,
      index_poptavky: n.index_poptavky ?? 0, obec: n.obec, rok: undefined,
      bezJpz: n, adresa,
    });
  }
  return programy.sort((a, b) => a.obor.localeCompare(b.obor, 'cs') || a.delka_studia - b.delka_studia || a.id.localeCompare(b.id));
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
  const yearData = data['2026'] || data['2025'] || data['2024'] || [];

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
    rok?: number;
    historicka_data_rok?: number;
    nevypsano_2026?: boolean;
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
        rok: record.rok,
        historicka_data_rok: record.historicka_data_rok,
        nevypsano_2026: record.nevypsano_2026,
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

    // Letošní nabídka bez zaměření vedle loňských zaměření, která škola letos nevypsala
    // (mapa nabídek je nespárovala, např. loňské „Denní“ a „Kombinovaná“): bez vlastní
    // stránky by letošní čísla nikde nebyla a stránky zaměření by nesly jen loňská.
    const letosBezZamereni = vypsanaNabidkaBezZamereni(detailedRecords, school.id)
      ? detailedRecords.find((r: { id: string }) => r.id === school.id)
      : undefined;

    if (zamereniList && zamereniList.length > 0) {
      if (letosBezZamereni) {
        // Čísla z vlastního záznamu nabídky, ne agregát oboru ze school_analysis.json.
        const r = letosBezZamereni;
        programs.push({
          id: school.id, redizo, nazev: school.nazev, obor: school.obor, zamereni: undefined,
          typ: school.typ, delka_studia: school.delka_studia, kapacita: r.kapacita,
          prihlasky: r.prihlasky, prijati: r.prijati, min_body: Math.round((r.min_body || 0) / 2),
          index_poptavky: r.kapacita > 0 ? Math.round((r.prihlasky / r.kapacita) * 100) / 100 : school.index_poptavky,
          obec: school.obec,
          ...(r.rok ? { rok: r.rok } : {}),
          ...(r.historicka_data_rok ? { historicka_data_rok: r.historicka_data_rok } : {}),
          ...matchingMeta,
        });
      }
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
          // Ročník putuje s čísly, aby je stránka nepopsala cizím rokem
          ...(z.rok ? { rok: z.rok } : {}),
          ...(z.historicka_data_rok ? { historicka_data_rok: z.historicka_data_rok } : {}),
          ...(z.nevypsano_2026 ? { nevypsano_2026: true } : {}),
          ...matchingMeta,
        });
      }
    } else {
      // Škola nemá zaměření. Čísla vypsané nabídky z vlastního záznamu katalogu, stejně jako
      // u zaměření a u nabídky bez zaměření výše: school_analysis.json je starší zpracování
      // a u 737 z 1 845 oborů neslo místa jiného ročníku (AKADEMIA Gy: 20 místo 10 v roce 2026).
      // Nevypsaná nabídka si nechává poslední známá čísla se štítkem „naposledy {rok}“.
      const vlastni = detailedRecords.find((r: { id: string }) => r.id === school.id) as
        { rok?: number; nevypsano_2026?: boolean; kapacita?: number; prihlasky?: number; prijati?: number } | undefined;
      const letos = vlastni && !vlastni.nevypsano_2026 && typeof vlastni.kapacita === 'number' ? vlastni : undefined;
      programs.push({
        id: school.id,
        redizo: redizo,
        nazev: school.nazev,
        obor: school.obor,
        zamereni: undefined,
        typ: school.typ,
        delka_studia: school.delka_studia,
        kapacita: letos ? letos.kapacita! : school.kapacita,
        prihlasky: letos?.prihlasky ?? school.prihlasky,
        prijati: letos?.prijati ?? school.prijati,
        min_body: school.min_body,
        index_poptavky: letos && letos.kapacita! > 0 && typeof letos.prihlasky === 'number'
          ? Math.round((letos.prihlasky / letos.kapacita!) * 100) / 100
          : school.index_poptavky,
        obec: school.obec,
        // U nevypsané nabídky rok, kdy ji škola vypsala naposledy (štítek „naposledy {rok}“);
        // u vypsané rok katalogu, ze kterého teď čísla jsou. Bez záznamu katalogu rok chybí,
        // protože čísla ze school_analysis.json by jinak dostala cizí ročník.
        ...(vlastni?.nevypsano_2026 ? { nevypsano_2026: true, ...(vlastni.rok ? { rok: vlastni.rok } : {}) } : {}),
        ...(letos?.rok ? { rok: letos.rok } : {}),
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
  subjectAverages: { cj: AdmissionScore; ma: AdmissionScore };
  prihlasky_priority: number[];  // přihlášky podle priority
  prijati_priority: number[];    // přijatí podle priority
  cj_prumer: number;             // průměr z češtiny (0-50 bodů)
  cj_min: number;                // nezávislé minimum z češtiny (0-50 bodů) - POZOR: může být z jiného studenta než ma_min!
  ma_prumer: number;             // průměr z matematiky (0-50 bodů)
  ma_min: number;                // nezávislé minimum z matematiky (0-50 bodů) - POZOR: může být z jiného studenta než cj_min!
  // Skutečná data z raw dat jednotlivých uchazečů
  jpz_min: number | null;               // Bez ověřené populace minimum není k dispozici
  cj_at_jpz_min: number | null;         // ČJ body studenta s nejnižším JPZ
  ma_at_jpz_min: number | null;         // MA body studenta s nejnižším JPZ
  jpz_prumer: number;            // Čistý JPZ průměr (cj_prumer + ma_prumer, max 100)
  min_body: number | null;              // Neznámé bez ověřených kritérií školy
  extra_body: number | null;            // Body za další kritéria (prospěch, školní zkouška)
  hasExtraCriteria: boolean | null; // Bez ověřených kritérií neznámé
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
  const data = JSON.parse(await fs.readFile(path.join(dataDir, 'schools_data.json'), 'utf-8')) as Record<string, Array<{
    id: string; cj_prumer?: number; ma_prumer?: number; cj_min?: number; ma_min?: number;
    prihlasky_priority?: number[]; prijati_priority?: number[];
  }>>;
  // Jeden označený ročník, přesná jednoznačná identita včetně zaměření.
  // Žádný fallback na jiný rok ani na samotné REDIZO+KKOV.
  const index = uniqueSchoolIndex(data['2025'] || [], school => school.id);
  const result = new Map<string, ExtendedSchoolStats>();
  for (const [id, school] of index) {
    const subjectAverages = {
      cj: historicalSubjectAverage({ value: school.cj_prumer, unit: 'percent_0_100', field: 'cj_prumer', offerId: id }),
      ma: historicalSubjectAverage({ value: school.ma_prumer, unit: 'percent_0_100', field: 'ma_prumer', offerId: id }),
    };
    // Přechodné číselné aliasy pro dosud nemigrované konzumenty; žádný další převod.
    const cj_prumer = subjectAverages.cj.value;
    const ma_prumer = subjectAverages.ma.value;
    const cj_min = subjectScore(school.cj_min);
    const ma_min = subjectScore(school.ma_min);
    if (cj_prumer === null || ma_prumer === null || cj_min === null || ma_min === null) continue;
    result.set(id, {
      subjectAverages,
      prihlasky_priority: school.prihlasky_priority || [],
      prijati_priority: school.prijati_priority || [],
      cj_prumer, ma_prumer, cj_min, ma_min,
      jpz_prumer: Math.round((cj_prumer + ma_prumer) * 10) / 10,
      ...unavailableAdmissionScores(),
    });
  }
  schoolsDataByIdCache = result;
  return result;
}

export async function getExtendedSchoolStats(schoolId: string): Promise<ExtendedSchoolStats | null> {
  return (await getSchoolsDataById()).get(normalizeSchoolKey(schoolId)) ?? null;
}

export async function getExtendedStatsForProgram(programId: string): Promise<ExtendedSchoolStats | null> {
  return getExtendedSchoolStats(programId);
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


// Cache pro trend data programů (včetně zaměření)
let trendDataByProgramCache: Map<string, YearlyTrendData> | null = null;

/**
 * Načte trend data pro všechny programy včetně zaměření
 * Používá plné ID nabídky včetně zaměření.
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

  for (const school of uniqueSchoolIndex<{ id: string; prihlasky: number; prijati: number; index_poptavky: number; min_body: number }>(data['2024'] || [], row => row.id).values()) {
    data2024Map.set(normalizeSchoolKey(school.id), {
      prihlasky: school.prihlasky || 0,
      prijati: school.prijati || 0,
      index_poptavky: school.index_poptavky || 0,
      min_body: school.min_body || 0
    });
  }

  // Spárovat s daty 2025
  for (const school of uniqueSchoolIndex<{ id: string; prihlasky: number; prijati: number; index_poptavky: number; min_body: number }>(data['2025'] || [], row => row.id).values()) {
    const prev = data2024Map.get(normalizeSchoolKey(school.id));
    if (!prev || !Number.isInteger(prev.prihlasky) || prev.prihlasky <= 0 || !Number.isInteger(school.prihlasky) || school.prihlasky < 0) continue;

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

    trendDataByProgramCache.set(normalizeSchoolKey(school.id), {
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
  return allTrends.get(normalizeSchoolKey(programId)) || null;
}

/**
 * Získá trend data pro pole programů (včetně zaměření)
 */
export async function getTrendDataForPrograms(programIds: string[]): Promise<Map<string, YearlyTrendData>> {
  const allTrends = await getTrendDataByProgramMap();
  const result = new Map<string, YearlyTrendData>();

  for (const programId of programIds) {
    const trend = allTrends.get(normalizeSchoolKey(programId));
    if (trend) {
      result.set(programId, trend);
    }
  }

  return result;
}

/**
 * Profil náročnosti školy
 */

/** Historický žebříček používal součet nezávislých minim různých lidí.
 * Bez ověřené srovnatelné populace ho nelze vracet ani nahrazovat heuristikou.
 */

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
    const dataset = JSON.parse(data) as InspisDataset;
    await pouzijInspisOpravy(dataset);
    inspisDataCache = dataset;
    return inspisDataCache;
  } catch (error) {
    console.error('Chyba při načítání InspIS datasetu:', error);
    return null;
  }
}

/**
 * Přičte ruční opravy z data/inspis_opravy.json (např. počet žáků, který škola
 * opravila e-mailem). Import InspIS přepisuje celý datový soubor, proto opravy
 * žijí zvlášť a import je nepřepíše.
 */
async function pouzijInspisOpravy(dataset: InspisDataset): Promise<void> {
  let opravy: Record<string, Record<string, { hodnota: unknown; zdroj: string; datum: string }>>;
  try {
    const filePath = path.join(process.cwd(), 'data', 'inspis_opravy.json');
    opravy = (JSON.parse(await fs.readFile(filePath, 'utf-8')) as { skoly?: typeof opravy }).skoly ?? {};
  } catch {
    return;
  }
  for (const [redizo, pole] of Object.entries(opravy)) {
    const skola = dataset.schools[redizo] as (SchoolInspisData & Record<string, unknown>) | undefined;
    if (!skola) continue;
    for (const [klic, o] of Object.entries(pole)) {
      if (!(klic in skola)) continue;
      skola[klic] = o.hodnota;
      skola.opravy = { ...skola.opravy, [klic]: { zdroj: o.zdroj, datum: o.datum } };
    }
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
/**
 * Záznam nabídky v ročníku 2025 podle identifikátoru katalogu.
 * Slouží ke srovnání vývoje mezi ročníky; identifikátory jsou stabilní,
 * takže sedí i na nabídku, které se mezi roky změnil text zaměření.
 */
export async function get2025RecordById(id: string): Promise<
  { prihlasky?: number; kapacita?: number; prijati?: number } | undefined
> {
  const filePath = path.join(dataDir, 'schools_data.json');
  const content = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(content);
  const rok2025: Array<{ id: string; prihlasky?: number; kapacita?: number; prijati?: number }> =
    data['2025'] || [];
  const zaznam = rok2025.find(z => z.id === id);
  if (!zaznam) return undefined;
  return { prihlasky: zaznam.prihlasky, kapacita: zaznam.kapacita, prijati: zaznam.prijati };
}

export interface School2026Data {
  source_id: string;
  ulice?: string;
  psc?: string;
  izo?: string;
  forma?: string;
  jazyk?: string;
  admission_context?: AdmissionContext;
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
  offer_id?: string;
  redizo: string;
  kkov: string;
  zamereni: string;
  nazev: string;
  nazev_display?: string;
  obor?: string;
  source_valid_at?: string;
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
  source_id: string;
  ulice?: string;
  psc?: string;
  izo?: string;
  forma?: string;
  jazyk?: string;
  admission_context?: AdmissionContext;
  redizo: string;
  kkov: string;
  nazev: string;
  obor: string;
  zamereni: string;
  typ: string;
  obec: string;
  kraj: string;
  kraj_kod: string;
  delka_studia: number;
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

  const [rawRecords, schoolsDataContent] = await Promise.all([
    getRaw2026Data(),
    fs.readFile(path.join(dataDir, 'schools_data.json'), 'utf-8'),
  ]);

  const schoolsData = JSON.parse(schoolsDataContent);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schools2025: any[] = schoolsData['2025'] || [];

  const staticIndex = uniqueSchoolIndex(schools2025, s => s.id);

  schools2026Cache = rawRecords.map(r => {
    const s = staticIndex.get(normalizeSchoolKey(r.id));
    return {
      id: r.id,
      source_id: r.source_id,
      ulice: r.ulice, psc: r.psc, izo: r.izo, forma: r.forma, jazyk: r.jazyk,
      redizo: r.redizo,
      nazev: r.nazev,
      nazev_display: s?.nazev_display || r.nazev,
      obor: r.obor,
      zamereni: r.zamereni,
      kkov: r.kkov,
      typ: r.typ,
      delka_studia: r.delka_studia,
      obec: r.obec,
      kraj: r.kraj,
      kraj_kod: r.kraj_kod,
      kapacita: r.kapacita,
      prihlasky: r.prihlasky,
      prihlasky_priority: r.pp,
      admission_context: r.admission_context,
      index_poptavky: r.idx,
      ...(r.is_new ? { is_new: true } : {}),
    };
  });

  return schools2026Cache;
}

/**
 * Získá data 2026 pro konkrétní školu podle ID
 */
export async function get2026DataById(schoolId: string): Promise<School2026Data | null> {
  const allData = await getSchools2026Data();
  return uniqueSchoolIndex(allData, s => s.id).get(normalizeSchoolKey(schoolId)) ?? null;
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
  // Párujeme úplný klíč, nikoli první zaměření stejného KKOV.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const find = (yearData: any[]) => uniqueSchoolIndex(yearData || [], s => s.id).get(normalizeSchoolKey(programId)) ?? null;

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
        .filter(hasInspectionSummary)
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
    const applications = year === 2026 ? uniqueSchoolIndex(await getSchools2026Data(), row => row.id) : null;
    const map = new Map<string, SchoolResult>();
    for (const [id, row] of uniqueSchoolIndex(Object.entries(raw), ([id]) => id).values()) {
      const context = applications?.get(normalizeSchoolKey(id))?.admission_context;
      // Stejná ochrana jako simulátor: zadržený průměr se nesmí obnovit z druhého souboru.
      if (year === 2026 && !canPublishAcceptedResult(row, context)) continue;
      map.set(id, { ...row, offer_id: id, delta_cj_ma: null });
    }
    // Po vyřazení neplatných řádků přepočítat i pořadí a jmenovatel skupiny.
    const groups = new Map<string, SchoolResult[]>();
    for (const row of map.values()) groups.set(row.school_type, [...(groups.get(row.school_type) ?? []), row]);
    for (const rows of groups.values()) {
      rows.sort((a, b) => b.cj_ma_prijati - a.cj_ma_prijati || a.offer_id!.localeCompare(b.offer_id!));
      rows.forEach((row, index) => { row.rank_in_type = index + 1; row.type_total = rows.length; });
    }
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
