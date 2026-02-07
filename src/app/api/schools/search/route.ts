import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createSlug } from '@/lib/utils';

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

function deduplicateById(schools: School[]): School[] {
  const byId = new Map<string, School>();
  for (const school of schools) {
    if (!byId.has(school.id)) {
      byId.set(school.id, school);
    }
  }
  return Array.from(byId.values());
}

function buildSlugContext(schools: School[]) {
  const oborCountsByRedizo = new Map<string, Map<string, number>>();
  const zamereniCountsByRedizo = new Map<string, Map<string, number>>();

  for (const school of schools) {
    const redizo = school.id.split('_')[0];
    const obor = school.obor || '';
    const zamereni = normalizeZamereni(school.zamereni);

    if (!oborCountsByRedizo.has(redizo)) {
      oborCountsByRedizo.set(redizo, new Map<string, number>());
    }
    const oborCounts = oborCountsByRedizo.get(redizo)!;
    oborCounts.set(obor, (oborCounts.get(obor) || 0) + 1);

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
  const searchParams = request.nextUrl.searchParams;

  // Parametry filtrace
  const minScore = parseInt(searchParams.get('minScore') || '0');
  const maxScore = parseInt(searchParams.get('maxScore') || '100');
  const delkaStudia = searchParams.get('delkaStudia');
  const kraj = searchParams.get('kraj');
  const search = searchParams.get('search') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const krajeOnly = searchParams.get('krajeOnly') === '1';
  const idsParam = searchParams.get('ids') || '';

  try {
    const data = await getSchoolsData();
    const year = data['2025'] ? '2025' : '2024';
    const schoolsRaw: School[] = data[year] || [];
    const schools = deduplicateById(schoolsRaw);
    const slugContext = buildSlugContext(schools);

    // Generovat seznam krajů (cachováno)
    if (!krajeCache) {
      const krajMap = new Map<string, string>();
      schools.forEach(s => {
        if (s.kraj_kod && s.kraj) {
          krajMap.set(s.kraj_kod, s.kraj.trim());
        }
      });
      krajeCache = Array.from(krajMap.entries())
        .map(([kod, nazev]) => ({ kod, nazev }))
        .sort((a, b) => a.nazev.localeCompare(b.nazev, 'cs'));
    }

    // Pokud je požadován pouze seznam krajů, vrátit
    if (krajeOnly) {
      return NextResponse.json({ kraje: krajeCache });
    }

    // Přímé načtení podle konkrétních ID (pro předvýběr v simulátoru)
    if (idsParam) {
      const requestedIds = Array.from(
        new Set(
          idsParam
            .split(',')
            .map(v => v.trim())
            .filter(v => v.length > 0 && v.length <= 220)
        )
      ).slice(0, 200);

      const byId = new Map<string, School>();
      schools.forEach(s => byId.set(s.id, s));

      const byIds = requestedIds
        .map(id => byId.get(id))
        .filter((s): s is School => Boolean(s))
        .map(s => ({
          id: s.id,
          nazev: s.nazev,
          nazev_display: s.nazev_display,
          obor: s.obor,
          zamereni: normalizeZamereni(s.zamereni),
          obec: s.obec,
          ulice: s.ulice,
          adresa: s.adresa,
          kraj: s.kraj,
          kraj_kod: s.kraj_kod,
          typ: s.typ,
          delka_studia: s.delka_studia,
          slug: getSchoolSlug(s, slugContext),
          min_body_2025: s.min_body || 0,
          jpz_min: s.jpz_min_actual || s.min_body || 0,
          index_poptavky_2025: s.index_poptavky || 0,
        }));

      return NextResponse.json({
        schools: byIds,
        kraje: krajeCache,
        total: byIds.length,
      });
    }

    // Filtrování škol
    const searchNorm = search ? normalizeText(search) : '';
    const delkaFilter = delkaStudia ? parseInt(delkaStudia) : null;

    const filtered = schools
      .filter(s => {
        // JPZ min body
        const jpzMin = s.jpz_min_actual || s.min_body || 0;

        // Filtr podle délky studia
        if (delkaFilter && s.delka_studia !== delkaFilter) return false;

        // Filtr podle kraje
        if (kraj && s.kraj_kod !== kraj) return false;

        // Filtr podle hledání
        if (searchNorm) {
          const nazev = normalizeText(s.nazev || '');
          const nazevDisplay = normalizeText(s.nazev_display || '');
          const obor = normalizeText(s.obor || '');
          const zamereni = normalizeText(normalizeZamereni(s.zamereni) || '');
          const obec = normalizeText(s.obec || '');
          const ulice = normalizeText(s.ulice || '');
          const adresa = normalizeText(s.adresa || '');

          if (!nazev.includes(searchNorm) &&
              !nazevDisplay.includes(searchNorm) &&
              !obor.includes(searchNorm) &&
              !zamereni.includes(searchNorm) &&
              !obec.includes(searchNorm) &&
              !ulice.includes(searchNorm) &&
              !adresa.includes(searchNorm)) {
            return false;
          }
        }

        // Filtr podle bodového rozmezí (pokud není hledání)
        if (!searchNorm) {
          if (jpzMin < minScore || jpzMin > maxScore) return false;
        }

        return true;
      })
      .map(s => ({
        id: s.id,
        nazev: s.nazev,
        nazev_display: s.nazev_display,
        obor: s.obor,
        zamereni: normalizeZamereni(s.zamereni),
        obec: s.obec,
        ulice: s.ulice,
        adresa: s.adresa,
        kraj: s.kraj,
        kraj_kod: s.kraj_kod,
        typ: s.typ,
        delka_studia: s.delka_studia,
        slug: getSchoolSlug(s, slugContext),
        min_body_2025: s.min_body || 0,
        jpz_min: s.jpz_min_actual || s.min_body || 0,
        index_poptavky_2025: s.index_poptavky || 0,
      }))
      .sort((a, b) => {
        // Řadit podle vzdálenosti od středu rozmezí
        const center = (minScore + maxScore) / 2;
        const diffA = Math.abs(a.jpz_min - center);
        const diffB = Math.abs(b.jpz_min - center);
        return diffA - diffB;
      })
      .slice(0, limit);

    return NextResponse.json({
      schools: filtered,
      kraje: krajeCache,
      total: filtered.length,
    });
  } catch (error) {
    console.error('Error searching schools:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
