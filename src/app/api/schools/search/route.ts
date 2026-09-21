import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { adresaNabidkyVeSkole, adresaPrehledu, nabidkySeStrankou } from '@/lib/adresa-oboru.mjs';
import { normalizeSchoolKey, uniqueSchoolIndex } from '@/lib/school-key';
import { getResultsForYear, getSchoolAnalysis, getSchools2026Data } from '@/lib/data';
import { readSchoolIds } from '@/lib/simulator-state';
import { MESTA } from '@/lib/mesta.mjs';

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

export interface NalezeneMesto {
  nazev: string;
  slug: string;
  kraj: string;
  skol: number;
  nabidek: number;
}

let mestaCache: NalezeneMesto[] | null = null;

/**
 * M\u011bsta s vlastn\u00ed str\u00e1nkou p\u0159ehledu, s po\u010dtem \u0161kol a nab\u00eddek.
 *
 * Kdo nap\u00ed\u0161e \u201ePardubice\u201c, hled\u00e1 nej\u010dast\u011bji p\u0159ehled \u0161kol ve m\u011bst\u011b, ne jednu
 * \u0161kolu; bez tohohle by dostal jen seznam nab\u00eddek.
 */
async function getMesta(schools: School[]): Promise<NalezeneMesto[]> {
  if (mestaCache) return mestaCache;
  const skoly = new Map<string, Set<string>>();
  const nabidky = new Map<string, number>();
  for (const s of schools) {
    if (!s.obec) continue;
    if (!skoly.has(s.obec)) skoly.set(s.obec, new Set());
    skoly.get(s.obec)!.add(s.id.split('_')[0]);
    nabidky.set(s.obec, (nabidky.get(s.obec) ?? 0) + 1);
  }
  mestaCache = MESTA.map(m => ({
    nazev: m.nazev,
    slug: m.slug,
    kraj: m.kraj,
    skol: skoly.get(m.nazev)?.size ?? 0,
    nabidek: nabidky.get(m.nazev) ?? 0,
  })).filter(m => m.skol > 0);
  return mestaCache;
}

/** M\u011bsta shoduj\u00edc\u00ed se s dotazem. Shoda od za\u010d\u00e1tku slova, aby \u201epardub\u201c na\u0161lo Pardubice. */
function najdiMesta(mesta: NalezeneMesto[], query: string): NalezeneMesto[] {
  if (!query) return [];
  return mesta
    .filter(m => {
      const n = normalizeText(m.nazev);
      return n.startsWith(query) || n.split(/[\s-]+/).some(slovo => slovo.startsWith(query));
    })
    // P\u0159esn\u00e1 shoda prvn\u00ed, pak podle nab\u00eddky \u0161kol.
    .sort((a, b) => {
      const pa = normalizeText(a.nazev) === query ? 0 : 1;
      const pb = normalizeText(b.nazev) === query ? 0 : 1;
      return pa - pb || b.skol - a.skol;
    })
    .slice(0, 5);
}

interface School {
  source_id?: string;
  catalog_year?: number;
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

/**
 * Adresu nabídky skládá sdílený modul (src/lib/adresa-oboru.mjs), tentýž, kterým ji
 * rozpoznává data.ts a staví generátor sitemapy. Do 19. 9. 2026 měl tenhle soubor
 * vlastní kopii pravidla, navíc nad loňským ročníkem, takže vyhledávání posílalo jinam
 * než odkazy na webu. Rozbor: docs/adresa-oboru-2027.md, krok D.
 */
function adresySkolPodleRedizo(nabidky: School[]) {
  const podleRedizo = new Map<string, School[]>();
  for (const n of nabidky) {
    const redizo = n.id.split('_')[0];
    if (!podleRedizo.has(redizo)) podleRedizo.set(redizo, []);
    podleRedizo.get(redizo)!.push(n);
  }
  return podleRedizo;
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
    const legacyIndex = uniqueSchoolIndex(data['2025'] || [], s => s.id);
    const current = await getSchools2026Data();
    // Katalog 2026 stojí na vlastních záznamech CERMAT, nikoli na shodě s historií.
    // Staré položky ponecháváme dostupné pro uložené odkazy, ne v běžném hledání.
    const schools: School[] = current.map(row => ({
      ...row, nazev_display: [row.nazev, row.ulice].filter(Boolean).join(' · '), catalog_year: 2026,
      adresa: [row.ulice, row.obec].filter(Boolean).join(', '),
      // Adresa ze zdroje 2026; nepotvrzuje místo výuky pro novou sezónu.
    }));
    const index = uniqueSchoolIndex(schools, s => s.id);
    const canonicalSchools = Object.values(await getSchoolAnalysis());
    const canonicalById = new Map(canonicalSchools.map(s => [s.id, s]));
    const canonicalNames = new Map<string, string>();
    for (const school of canonicalSchools) {
      const redizo = school.id.split('_')[0];
      if (!canonicalNames.has(redizo)) canonicalNames.set(redizo, school.nazev);
    }
    // Název školy pro adresu bere stejný zdroj jako data.ts, tedy school_analysis.json;
    // jinak by vyhledávání složilo adresu, kterou aplikace nerozpozná.
    const nabidkyPodleRedizo = adresySkolPodleRedizo(schools);
    const proModul = (s: School) => ({
      id: s.id, obor: s.obor || '', delka_studia: s.delka_studia,
      zamereni: normalizeZamereni(s.zamereni) || undefined,
    });

    // Které nabídky vůbec mají stránku oboru, rozhoduje sdílený modul: pravidlo je jedno
    // a platí i pro generátor sitemapy, takže odkaz nikdy nemíří na adresu, která se přesměruje.
    const znaZakladniKlic = (zaklad: string) => canonicalById.has(zaklad);
    const seStrankou = new Map<string, Set<string>>();
    for (const [redizo, nabidky] of nabidkyPodleRedizo) {
      seStrankou.set(redizo, new Set(nabidkySeStrankou(nabidky.map(proModul), znaZakladniKlic).map(n => String(n.id))));
    }

    const adresaPro = (school: School): string => {
      const redizo = school.id.split('_')[0];
      const nazev = canonicalNames.get(redizo) ?? canonicalById.get(school.id)?.nazev ?? school.nazev;
      const prehled = adresaPrehledu(redizo, nazev);
      const povolene = seStrankou.get(redizo);
      if (!povolene?.has(school.id)) return prehled;
      const nabidky = (nabidkyPodleRedizo.get(redizo) ?? []).map(proModul).filter(n => povolene.has(String(n.id)));
      const moje = nabidky.find(n => n.id === school.id);
      if (!moje) return prehled;
      return adresaNabidkyVeSkole(redizo, nazev, moje, nabidky) ?? prehled;
    };
    if (!krajeCache) {
      const krajMap = new Map<string, string>();
      schools.forEach(s => { if (s.kraj_kod && s.kraj) krajMap.set(s.kraj_kod, s.kraj.trim()); });
      krajeCache = Array.from(krajMap, ([kod, nazev]) => ({ kod, nazev }))
        .sort((a, b) => a.nazev.localeCompare(b.nazev, 'cs'));
    }
    if (params.get('krajeOnly') === '1') return NextResponse.json({ kraje: krajeCache });

    const results = uniqueSchoolIndex(Array.from(await getResultsForYear(2026)), ([id]) => id);
    const applications = uniqueSchoolIndex(await getSchools2026Data(), s => s.id);
    const finite = (v: unknown, max = Infinity) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : null;
    const serialize = (s: School, requestedId = s.id) => {
      const result = results.get(normalizeSchoolKey(s.id))?.[1];
      const application = applications.get(normalizeSchoolKey(s.id));
      return {
        admission_context: application?.admission_context ?? null,
        demand: application ? { year: 2026, round: 1, applications: finite(application.prihlasky), first_priority: finite(application.prihlasky_priority?.[0]), capacity: finite(application.kapacita) } : null,
        id: requestedId, nazev: s.nazev, nazev_display: s.nazev_display, obor: s.obor,
        zamereni: normalizeZamereni(s.zamereni), obec: s.obec, ulice: s.ulice, adresa: s.adresa,
        kraj: s.kraj, kraj_kod: s.kraj_kod, typ: s.typ, delka_studia: s.delka_studia,
        slug: adresaPro(s),
        // Odkaz míří vždy na stránku oboru: /nabidka/2026/… je od 19. 9. 2026 jen přesměrování.
        href: `/skola/${adresaPro(s)}`,
        catalog_year: s.catalog_year ?? 2025,
        offer_2027_status: 'unverified',
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
        const school = index.get(normalizeSchoolKey(id)) ?? legacyIndex.get(normalizeSchoolKey(id));
        return school ? [serialize(school, id)] : [];
      });
      return NextResponse.json({ schools: found, kraje: krajeCache, total: found.length,
        missingIds: ids.filter(id => !index.has(normalizeSchoolKey(id)) && !legacyIndex.has(normalizeSchoolKey(id))), catalogYear: 2026 });
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
    const mesta = najdiMesta(await getMesta(schools), query);
    return NextResponse.json({ schools: (params.get('simulatorCatalog') === '1' ? filtered : filtered.slice(offset, offset + limit)).map(s => serialize(s)),
      mesta, kraje: krajeCache, total: filtered.length, catalogYear: 2026 });
  } catch (error) {
    console.error('Error searching schools:', error);
    return NextResponse.json({ error: 'Školy se nepodařilo načíst.' }, { status: 500 });
  }
}
