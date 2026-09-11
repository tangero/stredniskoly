import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createSlug } from '@/lib/utils';
import { normalizeSchoolKey, uniqueSchoolIndex } from '@/lib/school-key';
import { getResultsForYear, getSchoolAnalysis } from '@/lib/data';
import { readSchoolIds } from '@/lib/simulator-state';

type SchoolsData = Record<string, School[]>;

// Cache pro schools data
let schoolsCache: SchoolsData | null = null;
let krajeCache: Array<{ kod: string; nazev: string }> | null = null;

async function getSchoolsData(): Promise<SchoolsData> {
  if (schoolsCache) return schoolsCache;

  const filePath = path.join(process.cwd(), 'public', 'schools_data.json');
  const data = await fs.readFile(filePath, 'utf-8');
  schoolsCache = JSON.parse(data) as SchoolsData;
  return schoolsCache;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

interface School {
  id: string;
  nazev: string;
  nazev_display?: string;
  obor: string;
  zamereni?: string;
  obec: string;
  ulice?: string;
  adresa?: string;
  kraj: string;
  kraj_kod: string;
  typ: string;
  delka_studia?: number;
  min_body?: number;
  jpz_min_actual?: number;
  index_poptavky?: number;
}

function normalizeZamereni(zamereni?: string): string | undefined {
  const value = (zamereni || '').trim();
  return value.length > 0 ? value : undefined;
}

function buildSlugContext(schools: School[], canonicalSchools: School[]) {
  const oborCountsByRedizo = new Map<string, Map<string, number>>();
  const zamereniCountsByRedizo = new Map<string, Map<string, number>>();

  for (const school of canonicalSchools) {
    const redizo = school.id.split('_')[0];
    const obor = school.obor || '';
    if (!oborCountsByRedizo.has(redizo)) {
      oborCountsByRedizo.set(redizo, new Map<string, number>());
    }
    const oborCounts = oborCountsByRedizo.get(redizo)!;
    oborCounts.set(obor, (oborCounts.get(obor) || 0) + 1);

  }
  for (const school of schools) {
    const redizo = school.id.split('_')[0];
    const obor = school.obor || '';
    const zamereni = normalizeZamereni(school.zamereni);
    if (zamereni) {
      if (!zamereniCountsByRedizo.has(redizo)) {
        zamereniCountsByRedizo.set(redizo, new Map<string, number>());
      }
      const zamereniCounts = zamereniCountsByRedizo.get(redizo)!;
      const key = `${obor}|${zamereni}`;
      zamereniCounts.set(key, (zamereniCounts.get(key) || 0) + 1);
    }
  }

  return { oborCountsByRedizo, zamereniCountsByRedizo };
}

function getSchoolSlug(
  school: School,
  slugContext: ReturnType<typeof buildSlugContext>
): string {
  const redizo = school.id.split('_')[0];
  const zamereni = normalizeZamereni(school.zamereni);
  const obor = school.obor || '';
  const schoolName = school.nazev || '';
  const delkaStudia = school.delka_studia;

  if (zamereni) {
    const zamereniCounts = slugContext.zamereniCountsByRedizo.get(redizo);
    const zamereniKey = `${obor}|${zamereni}`;
    const hasDuplicateZamereni = (zamereniCounts?.get(zamereniKey) || 0) > 1;
    const zamereniSlug = hasDuplicateZamereni
      ? createSlug(schoolName, obor, zamereni, delkaStudia)
      : createSlug(schoolName, obor, zamereni);
    return `${redizo}-${zamereniSlug}`;
  }

  const oborCounts = slugContext.oborCountsByRedizo.get(redizo);
  const hasDuplicateOborName = (oborCounts?.get(obor) || 0) > 1;
  const oborSlug = hasDuplicateOborName
    ? createSlug(schoolName, obor, undefined, delkaStudia)
    : createSlug(schoolName, obor);
  return `${redizo}-${oborSlug}`;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  // Staré minScore/maxScore záměrně nemění výběr ani pořadí výsledků.
  const rawLimit = Number(params.get('limit') ?? 50);
  const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, Math.floor(rawLimit))) : 50;
  const rawOffset = Number(params.get('offset') ?? 0);
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.floor(rawOffset)) : 0;
  try {
    const data = await getSchoolsData();
    const index = uniqueSchoolIndex(data['2025'] || [], s => s.id);
    const schools = Array.from(index.values());
    const canonicalSchools = Object.values(await getSchoolAnalysis());
    const slugContext = buildSlugContext(data['2025'] || [], canonicalSchools);
    const canonicalById = new Map(canonicalSchools.map(s => [s.id, s]));
    const canonicalNames = new Map<string, string>();
    for (const school of canonicalSchools) {
      const redizo = school.id.split('_')[0];
      if (!canonicalNames.has(redizo)) canonicalNames.set(redizo, school.nazev);
    }
    // Jen názvy pro existující adresy profilů. Historická fakta se tímto
    // základním klíčem nikdy nepárují, používají úplné ID níže.
    const routeSchool = (school: School): School => ({ ...school, nazev: school.zamereni
      ? canonicalNames.get(school.id.split('_')[0]) ?? school.nazev
      : canonicalById.get(school.id)?.nazev ?? school.nazev });
    if (!krajeCache) {
      const krajMap = new Map<string, string>();
      schools.forEach(s => { if (s.kraj_kod && s.kraj) krajMap.set(s.kraj_kod, s.kraj.trim()); });
      krajeCache = Array.from(krajMap, ([kod, nazev]) => ({ kod, nazev }))
        .sort((a, b) => a.nazev.localeCompare(b.nazev, 'cs'));
    }
    if (params.get('krajeOnly') === '1') return NextResponse.json({ kraje: krajeCache });

    const results = uniqueSchoolIndex(Array.from(await getResultsForYear(2026)), ([id]) => id);
    const finite = (v: unknown, max = Infinity) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : null;
    const serialize = (s: School, requestedId = s.id) => {
      const result = results.get(normalizeSchoolKey(s.id))?.[1];
      return {
        id: requestedId, nazev: s.nazev, nazev_display: s.nazev_display, obor: s.obor,
        zamereni: normalizeZamereni(s.zamereni), obec: s.obec, ulice: s.ulice, adresa: s.adresa,
        kraj: s.kraj, kraj_kod: s.kraj_kod, typ: s.typ, delka_studia: s.delka_studia,
        slug: getSchoolSlug(routeSchool(s), slugContext),
        history: result ? {
          year: 2026, round: 1, source_valid_at: result.source_valid_at ?? null,
          accepted: finite(result.prijati), capacity: finite(result.kapacita),
          // Import už převedl procentní skór na škálu 0–100. Nedělit podruhé.
          average: finite(result.cj_ma_prijati, 100),
          average_cj: finite(result.cj_prijati, 50), average_ma: finite(result.ma_prijati, 50),
        } : null,
        comparison: { status: 'unavailable', minimum: null },
      };
    };
    if (params.has('ids')) {
      const ids = readSchoolIds(params.get('ids'));
      const found = ids.flatMap(id => {
        const school = index.get(normalizeSchoolKey(id));
        return school ? [serialize(school, id)] : [];
      });
      return NextResponse.json({ schools: found, kraje: krajeCache, total: found.length,
        missingIds: ids.filter(id => !index.has(normalizeSchoolKey(id))), catalogYear: 2025 });
    }
    const query = normalizeText((params.get('search') || '').trim());
    const duration = params.get('delkaStudia');
    const region = params.get('kraj');
    const filtered = schools.filter(s => {
      if (duration && s.delka_studia !== Number(duration)) return false;
      if (region && s.kraj_kod !== region) return false;
      return !query || [s.nazev, s.nazev_display, s.obor, s.zamereni, s.obec, s.ulice, s.adresa]
        .some(value => normalizeText(value || '').includes(query));
    }).sort((a, b) => a.nazev.localeCompare(b.nazev, 'cs') || a.id.localeCompare(b.id, 'cs'));
    return NextResponse.json({ schools: (params.get('simulatorCatalog') === '1' ? filtered : filtered.slice(offset, offset + limit)).map(s => serialize(s)),
      kraje: krajeCache, total: filtered.length, catalogYear: 2025 });
  } catch (error) {
    console.error('Error searching schools:', error);
    return NextResponse.json({ error: 'Školy se nepodařilo načíst.' }, { status: 500 });
  }
}
