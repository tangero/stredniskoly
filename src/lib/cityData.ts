import { promises as fs } from 'fs';
import path from 'path';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const dataDir = path.join(process.cwd(), 'public');

export const MESTA = [
  { nazev: 'Praha', slug: 'praha', kraj: 'Hlavní město Praha' },
  { nazev: 'Brno', slug: 'brno', kraj: 'Jihomoravský kraj' },
  { nazev: 'Ostrava', slug: 'ostrava', kraj: 'Moravskoslezský kraj' },
  { nazev: 'Plzeň', slug: 'plzen', kraj: 'Plzeňský kraj' },
  { nazev: 'Liberec', slug: 'liberec', kraj: 'Liberecký kraj' },
  { nazev: 'Olomouc', slug: 'olomouc', kraj: 'Olomoucký kraj' },
  { nazev: 'Ústí nad Labem', slug: 'usti-nad-labem', kraj: 'Ústecký kraj' },
  { nazev: 'České Budějovice', slug: 'ceske-budejovice', kraj: 'Jihočeský kraj' },
  { nazev: 'Hradec Králové', slug: 'hradec-kralove', kraj: 'Královéhradecký kraj' },
  { nazev: 'Pardubice', slug: 'pardubice', kraj: 'Pardubický kraj' },
  { nazev: 'Havířov', slug: 'havirov', kraj: 'Moravskoslezský kraj' },
  { nazev: 'Zlín', slug: 'zlin', kraj: 'Zlínský kraj' },
  { nazev: 'Kladno', slug: 'kladno', kraj: 'Středočeský kraj' },
  { nazev: 'Most', slug: 'most', kraj: 'Ústecký kraj' },
  { nazev: 'Opava', slug: 'opava', kraj: 'Moravskoslezský kraj' },
  { nazev: 'Frýdek-Místek', slug: 'frydek-mistek', kraj: 'Moravskoslezský kraj' },
  { nazev: 'Karviná', slug: 'karvina', kraj: 'Moravskoslezský kraj' },
  { nazev: 'Jihlava', slug: 'jihlava', kraj: 'Kraj Vysočina' },
  { nazev: 'Děčín', slug: 'decin', kraj: 'Ústecký kraj' },
  { nazev: 'Teplice', slug: 'teplice', kraj: 'Ústecký kraj' },
] as const;

export type MestoSlug = typeof MESTA[number]['slug'];

export interface SchoolTypeStats {
  typ: string;
  label: string;
  kapacita2024: number;
  prihlasky2024: number;
  kapacita2025: number;
  prihlasky2025: number;
  kapacita2026: number;
  prihlasky2026: number;
  prijati2026: number;
  /** Průměr CJ+MA přijatých 2026 (z CERMAT) */
  avgCjMa2026: number | null;
  /** Průměr CJ+MA přijatých 2025 (pro srovnání) */
  avgCjMaPrev: number | null;
  /** Průměrná delta CJ+MA (2026 vs 2025) */
  avgDelta: number | null;
  /** Průměrný rank v rámci typu (percentil 0-100, vyšší = lepší) */
  avgRankPct: number | null;
  /** Počet oborů s CERMAT daty 2026 */
  cermatCount: number;
  /** Celkový počet oborů (ze schools_data 2025) */
  totalCount2025: number;
}

export interface CitySchoolRow {
  id: string;
  redizo: string;
  nazev: string;
  nazev_display: string;
  obor: string;
  zamereni: string;
  typ: string;
  delka_studia: number;
  zrizovatel: string;
  slug: string;
  kapacita2024: number | null;
  prihlasky2024: number | null;
  index2024: number | null;
  min_body2024: number | null;
  kapacita2025: number | null;
  prihlasky2025: number | null;
  index2025: number | null;
  min_body2025: number | null;
  kapacita2026: number | null;
  prihlasky2026: number | null;
  index2026: number | null;
  prijati2026: number | null;
  avgCjMa2026: number | null;
  avgCjMaPrev: number | null;
  delta2026: number | null;
  rankInType2026: number | null;
  typeTotal2026: number | null;
}

export interface NationalTypeStats {
  avgCjMa: number;
  avgCjMaPrev: number;
  count: number;
}

export interface CityStats {
  mesto: typeof MESTA[number];
  schools: CitySchoolRow[];
  byType: SchoolTypeStats[];
  national: Record<string, NationalTypeStats>;
  totals: {
    kapacita2024: number; prihlasky2024: number;
    kapacita2025: number; prihlasky2025: number;
    kapacita2026: number; prihlasky2026: number;
    prijati2026: number;
    nationalIndex2026: number;
    nationalKapacita2026: number;
    nationalPrihlasky2026: number;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawSchool = Record<string, any>;

const TYPE_LABELS: Record<string, string> = {
  GY4: 'Gymnázium 4-leté',
  GY6: 'Gymnázium 6-leté',
  GY8: 'Gymnázium 8-leté',
  LYC: 'Lyceum',
  SOS: 'Střední odborná škola',
  SOU: 'Střední odborné učiliště',
  NAS: 'Nástavbové studium',
};

const TYPE_ORDER = ['GY8', 'GY6', 'GY4', 'LYC', 'SOS', 'SOU', 'NAS'];

export async function getCityStats(mestoNazev: string): Promise<CityStats | null> {
  const mestoMeta = MESTA.find(m => m.nazev === mestoNazev);
  if (!mestoMeta) return null;

  const [schoolsDataRaw, apps2026Raw, cermat2026Raw] = await Promise.all([
    fs.readFile(path.join(dataDir, 'schools_data.json'), 'utf-8'),
    fs.readFile(path.join(dataDir, 'applications_2026.json'), 'utf-8'),
    fs.readFile(path.join(dataDir, 'cermat_results_2026.json'), 'utf-8'),
  ]);

  const schoolsData = JSON.parse(schoolsDataRaw) as { '2024': RawSchool[]; '2025': RawSchool[] };
  const apps2026Parsed = JSON.parse(apps2026Raw);
  const cermat2026 = JSON.parse(cermat2026Raw) as Record<string, RawSchool>;

  const all2024: RawSchool[] = schoolsData['2024'] || [];
  const all2025: RawSchool[] = schoolsData['2025'] || [];
  const apps2026Map = new Map<string, RawSchool>(
    (apps2026Parsed.data || []).map((r: RawSchool) => [r.id, r])
  );

  const city2024 = all2024.filter(s => s.obec === mestoNazev);
  const city2025 = all2025.filter(s => s.obec === mestoNazev);

  const map2024 = new Map<string, RawSchool>(city2024.map(s => [s.id, s]));
  const map2025 = new Map<string, RawSchool>(city2025.map(s => [s.id, s]));

  // Build per-school rows (based on 2025 as primary)
  const rows: CitySchoolRow[] = city2025.map(s25 => {
    const s24 = map2024.get(s25.id);
    const app26 = apps2026Map.get(s25.id);
    const cer26 = cermat2026[s25.id];

    const slug = `${s25.redizo}-${slugify(s25.nazev)}-${slugify(s25.obor)}`;

    return {
      id: s25.id,
      redizo: s25.redizo,
      nazev: s25.nazev,
      nazev_display: s25.nazev_display || s25.nazev,
      obor: s25.obor,
      zamereni: s25.zamereni || '',
      typ: s25.typ || '',
      delka_studia: s25.delka_studia || 4,
      zrizovatel: s25.zrizovatel || '',
      slug,
      kapacita2024: s24?.kapacita ?? null,
      prihlasky2024: s24?.prihlasky ?? null,
      index2024: s24 ? (s24.index_poptavky ?? null) : null,
      min_body2024: s24?.min_body ?? null,
      kapacita2025: s25.kapacita ?? null,
      prihlasky2025: s25.prihlasky ?? null,
      index2025: s25.index_poptavky ?? null,
      min_body2025: s25.min_body ?? null,
      kapacita2026: app26?.kapacita ?? null,
      prihlasky2026: app26?.prihlasky ?? null,
      index2026: app26?.idx ?? null,
      prijati2026: cer26?.prijati ?? null,
      avgCjMa2026: cer26?.cj_ma_prijati ?? null,
      avgCjMaPrev: cer26?.cj_ma_prijati_prev ?? null,
      delta2026: cer26?.delta_cj_ma ?? null,
      rankInType2026: cer26?.rank_in_type ?? null,
      typeTotal2026: cer26?.type_total ?? null,
    };
  });

  // Group by type and aggregate
  const typeMap = new Map<string, CitySchoolRow[]>();
  for (const row of rows) {
    const t = row.typ || 'SOS';
    if (!typeMap.has(t)) typeMap.set(t, []);
    typeMap.get(t)!.push(row);
  }

  const byType: SchoolTypeStats[] = TYPE_ORDER
    .filter(t => typeMap.has(t))
    .map(typ => {
      const items = typeMap.get(typ)!;
      const sum = (fn: (r: CitySchoolRow) => number | null) => {
        const vals = items.map(fn).filter((v): v is number => v !== null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) : 0;
      };
      const avg = (fn: (r: CitySchoolRow) => number | null) => {
        const vals = items.map(fn).filter((v): v is number => v !== null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      };

      const cermatItems = items.filter(r => r.avgCjMa2026 !== null);

      return {
        typ,
        label: TYPE_LABELS[typ] || typ,
        kapacita2024: sum(r => r.kapacita2024),
        prihlasky2024: sum(r => r.prihlasky2024),
        kapacita2025: sum(r => r.kapacita2025),
        prihlasky2025: sum(r => r.prihlasky2025),
        kapacita2026: sum(r => r.kapacita2026),
        prihlasky2026: sum(r => r.prihlasky2026),
        prijati2026: sum(r => r.prijati2026),
        avgCjMa2026: avg(r => r.avgCjMa2026),
        avgCjMaPrev: avg(r => r.avgCjMaPrev),
        avgDelta: avg(r => r.delta2026),
        avgRankPct: cermatItems.length
          ? cermatItems.reduce((acc, r) => acc + (1 - (r.rankInType2026! - 1) / r.typeTotal2026!) * 100, 0) / cermatItems.length
          : null,
        cermatCount: cermatItems.length,
        totalCount2025: items.length,
      };
    });

  // National stats by type (from cermat2026)
  const national: Record<string, NationalTypeStats> = {};
  for (const [, c] of Object.entries(cermat2026)) {
    const t = c.school_type as string;
    if (!national[t]) national[t] = { avgCjMa: 0, avgCjMaPrev: 0, count: 0 };
    national[t].avgCjMa += c.cj_ma_prijati;
    national[t].avgCjMaPrev += (c.cj_ma_prijati_prev || c.cj_ma_prijati);
    national[t].count += 1;
  }
  for (const t of Object.keys(national)) {
    national[t].avgCjMa = national[t].avgCjMa / national[t].count;
    national[t].avgCjMaPrev = national[t].avgCjMaPrev / national[t].count;
  }

  // National totals (from apps2026)
  const allApps = apps2026Parsed.data || [];
  const nationalKapacita2026 = allApps.reduce((s: number, r: RawSchool) => s + r.kapacita, 0);
  const nationalPrihlasky2026 = allApps.reduce((s: number, r: RawSchool) => s + r.prihlasky, 0);

  const totals = {
    kapacita2024: city2024.reduce((s, r) => s + (r.kapacita || 0), 0),
    prihlasky2024: city2024.reduce((s, r) => s + (r.prihlasky || 0), 0),
    kapacita2025: city2025.reduce((s, r) => s + (r.kapacita || 0), 0),
    prihlasky2025: city2025.reduce((s, r) => s + (r.prihlasky || 0), 0),
    kapacita2026: rows.reduce((s, r) => s + (r.kapacita2026 || 0), 0),
    prihlasky2026: rows.reduce((s, r) => s + (r.prihlasky2026 || 0), 0),
    prijati2026: rows.reduce((s, r) => s + (r.prijati2026 || 0), 0),
    nationalIndex2026: nationalKapacita2026 ? nationalPrihlasky2026 / nationalKapacita2026 : 2.95,
    nationalKapacita2026,
    nationalPrihlasky2026,
  };

  return { mesto: mestoMeta, schools: rows, byType, national, totals };
}
