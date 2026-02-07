import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

type Point = {
  lat: number;
  lon: number;
};

type PidStop = {
  name: string;
  municipality?: string;
  districtCode?: string;
  lat: number;
  lon: number;
};

type PrahaSchool = {
  key: string;
  redizo: string;
  nazev: string;
  adresa: string;
  ulice?: string;
  mestskaCast?: string | null;
  obory: string[];
  minBodyMin: number | null;
  indexPoptavkyAvg: number | null;
};

type SchoolLocationSource = 'cache' | 'street_stop_match' | 'geocoded' | 'district_centroid';

type SchoolLocation = {
  point: Point;
  source: SchoolLocationSource;
};

type SearchRequest = {
  address?: string;
  maxMinutes?: number;
  limit?: number;
};

type GeocodeResult = {
  point: Point;
  displayName?: string;
  district?: string;
};

const PID_STOPS_URL = 'https://data.pid.cz/stops/json/stops.json';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'stredniskoly-praha-dostupnost/0.1';

const DEFAULT_MAX_MINUTES = 30;
const MAX_LIMIT = 5000;
const MAX_GEOCODES_PER_REQUEST = 70;

// Praha + blízké okolí (pro jistotu při příměstských trasách).
const PRAHA_BBOX = {
  minLat: 49.95,
  maxLat: 50.25,
  minLon: 14.15,
  maxLon: 14.85,
};

let prahaSchoolsCache: PrahaSchool[] | null = null;
let pidStopsCache: PidStop[] | null = null;
let pidStopTokenIndexCache: Map<string, number[]> | null = null;

const geocodeCache = new Map<string, GeocodeResult>();
const geocodeMissCache = new Set<string>();

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/[^a-z0-9]+/g)
    .map(t => t.trim())
    .filter(Boolean);
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function haversineKm(a: Point, b: Point): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const q =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

  return 2 * R * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}

function isLikelyPrahaStop(lat: number, lon: number): boolean {
  return (
    lat >= PRAHA_BBOX.minLat &&
    lat <= PRAHA_BBOX.maxLat &&
    lon >= PRAHA_BBOX.minLon &&
    lon <= PRAHA_BBOX.maxLon
  );
}

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function pickYearData(data: Record<string, unknown>): Record<string, unknown>[] {
  const year2025 = ensureArray<Record<string, unknown>>(data['2025']);
  const year2024 = ensureArray<Record<string, unknown>>(data['2024']);
  return year2025.length > 0 ? year2025 : year2024;
}

async function loadPrahaSchools(): Promise<PrahaSchool[]> {
  if (prahaSchoolsCache) return prahaSchoolsCache;

  const filePath = path.join(process.cwd(), 'public', 'schools_data.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const yearData = pickYearData(parsed);

  const map = new Map<string, {
    redizo: string;
    nazev: string;
    adresa: string;
    ulice?: string;
    mestskaCast?: string | null;
    obory: Set<string>;
    minBodyMin: number | null;
    indexPoptavkySum: number;
    indexPoptavkyCount: number;
  }>();

  for (const row of yearData) {
    const krajKod = String(row.kraj_kod ?? '').trim();
    const obec = String(row.obec ?? '').trim();
    if (krajKod !== 'CZ010' && normalizeText(obec) !== 'praha') continue;

    const redizo = String(row.redizo ?? '').trim();
    const nazev = String(row.nazev_display ?? row.nazev ?? '').trim();
    const adresa = String(row.adresa_plna ?? row.adresa ?? '').trim();
    const ulice = String(row.ulice ?? '').trim() || undefined;
    const mestskaCastRaw = String(row.mestska_cast ?? '').trim();
    const mestskaCast = mestskaCastRaw.length > 0 ? mestskaCastRaw : null;

    if (!redizo || !nazev || !adresa) continue;

    const key = `${redizo}|${adresa}`;
    if (!map.has(key)) {
      map.set(key, {
        redizo,
        nazev,
        adresa,
        ulice,
        mestskaCast,
        obory: new Set<string>(),
        minBodyMin: null,
        indexPoptavkySum: 0,
        indexPoptavkyCount: 0,
      });
    }

    const item = map.get(key)!;
    const obor = String(row.obor ?? '').trim();
    if (obor) item.obory.add(obor);

    const minBody = toNumber(row.min_body);
    if (minBody !== null) {
      item.minBodyMin = item.minBodyMin === null ? minBody : Math.min(item.minBodyMin, minBody);
    }

    const indexPoptavky = toNumber(row.index_poptavky);
    if (indexPoptavky !== null) {
      item.indexPoptavkySum += indexPoptavky;
      item.indexPoptavkyCount += 1;
    }
  }

  prahaSchoolsCache = Array.from(map.entries()).map(([key, value]) => ({
    key,
    redizo: value.redizo,
    nazev: value.nazev,
    adresa: value.adresa,
    ulice: value.ulice,
    mestskaCast: value.mestskaCast,
    obory: Array.from(value.obory).sort((a, b) => a.localeCompare(b, 'cs')),
    minBodyMin: value.minBodyMin,
    indexPoptavkyAvg: value.indexPoptavkyCount > 0
      ? value.indexPoptavkySum / value.indexPoptavkyCount
      : null,
  }));

  return prahaSchoolsCache;
}

function extractPidStopCandidates(payload: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const seen = new WeakSet<object>();
  const stack: unknown[] = [payload];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;
    if (seen.has(current)) continue;
    seen.add(current);

    if (Array.isArray(current)) {
      for (const item of current) stack.push(item);
      continue;
    }

    const obj = current as Record<string, unknown>;
    const name = obj.name ?? obj.idosName ?? obj.uniqueName;
    const lat = obj.avgLat ?? obj.lat ?? obj.latitude;
    const lon = obj.avgLon ?? obj.lon ?? obj.longitude;

    if (typeof name === 'string' && lat !== undefined && lon !== undefined) {
      out.push(obj);
    }

    for (const value of Object.values(obj)) {
      if (value && typeof value === 'object') {
        stack.push(value);
      }
    }
  }

  return out;
}

function deduplicateStops(stops: PidStop[]): PidStop[] {
  const seen = new Set<string>();
  const out: PidStop[] = [];

  for (const stop of stops) {
    const key = `${normalizeText(stop.name)}|${stop.lat.toFixed(5)}|${stop.lon.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(stop);
  }

  return out;
}

async function loadPidStops(): Promise<PidStop[]> {
  if (pidStopsCache) return pidStopsCache;

  const response = await fetch(PID_STOPS_URL, {
    method: 'GET',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`PID stop list HTTP ${response.status}`);
  }

  const payload = await response.json();
  const candidates = extractPidStopCandidates(payload);

  const stops: PidStop[] = [];
  for (const c of candidates) {
    const name = String(c.name ?? c.idosName ?? c.uniqueName ?? '').trim();
    const lat = toNumber(c.avgLat ?? c.lat ?? c.latitude);
    const lon = toNumber(c.avgLon ?? c.lon ?? c.longitude);
    if (!name || lat === null || lon === null) continue;
    if (!isLikelyPrahaStop(lat, lon)) continue;

    stops.push({
      name,
      municipality: typeof c.municipality === 'string' ? c.municipality : undefined,
      districtCode: typeof c.districtCode === 'string' ? c.districtCode : undefined,
      lat,
      lon,
    });
  }

  pidStopsCache = deduplicateStops(stops);
  pidStopTokenIndexCache = null;
  return pidStopsCache;
}

function getPidStopTokenIndex(stops: PidStop[]): Map<string, number[]> {
  if (pidStopTokenIndexCache) return pidStopTokenIndexCache;

  const index = new Map<string, number[]>();
  for (let i = 0; i < stops.length; i += 1) {
    const tokens = tokenize(stops[i].name).filter(token => token.length >= 4);
    for (const token of tokens) {
      if (!index.has(token)) index.set(token, []);
      index.get(token)!.push(i);
    }
  }

  pidStopTokenIndexCache = index;
  return index;
}

function pickStreet(address: string, ulice?: string): string {
  if (ulice && ulice.trim().length > 0) return ulice.trim();
  const head = address.split(',')[0] ?? '';
  return head.replace(/[0-9]/g, '').trim();
}

function matchStopByStreet(street: string, stops: PidStop[], index: Map<string, number[]>): PidStop | null {
  if (!street) return null;

  const streetNorm = normalizeText(street);
  if (!streetNorm) return null;

  const tokens = tokenize(street).filter(t => t.length >= 4);
  const candidateIndices = new Set<number>();

  for (const token of tokens) {
    const arr = index.get(token);
    if (!arr) continue;
    for (const idx of arr) candidateIndices.add(idx);
  }

  let best: { score: number; stop: PidStop } | null = null;
  for (const idx of candidateIndices) {
    const stop = stops[idx];
    const stopNorm = normalizeText(stop.name);
    let score = 0;

    if (stopNorm === streetNorm) score += 120;
    if (stopNorm.includes(streetNorm) || streetNorm.includes(stopNorm)) score += 45;

    for (const token of tokens) {
      if (token.length < 4) continue;
      if (stopNorm === token) score += 30;
      if (stopNorm.includes(token)) score += 14;
      if (stopNorm.startsWith(token)) score += 8;
    }

    if (score < 20) continue;
    if (!best || score > best.score) {
      best = { score, stop };
    }
  }

  return best?.stop ?? null;
}

async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const key = normalizeText(address);
  if (!key) return null;
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;
  if (geocodeMissCache.has(key)) return null;

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('q', address);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'cz');
  url.searchParams.set('addressdetails', '1');

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      geocodeMissCache.add(key);
      return null;
    }

    const items = await response.json() as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
      address?: Record<string, string>;
    }>;

    if (!Array.isArray(items) || items.length === 0) {
      geocodeMissCache.add(key);
      return null;
    }

    const first = items[0];
    const lat = toNumber(first.lat);
    const lon = toNumber(first.lon);
    if (lat === null || lon === null) {
      geocodeMissCache.add(key);
      return null;
    }

    const district = first.address?.city_district ?? first.address?.suburb ?? undefined;
    const result: GeocodeResult = {
      point: { lat, lon },
      displayName: first.display_name,
      district,
    };

    geocodeCache.set(key, result);
    return result;
  } catch {
    geocodeMissCache.add(key);
    return null;
  }
}

function findNearestStops(point: Point, stops: PidStop[], take: number): Array<{ stop: PidStop; distanceKm: number }> {
  return stops
    .map(stop => ({
      stop,
      distanceKm: haversineKm(point, { lat: stop.lat, lon: stop.lon }),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, take);
}

function estimateTripMinutes(params: {
  originPoint: Point;
  originStops: Array<{ stop: PidStop; distanceKm: number }>;
  schoolPoint: Point;
  schoolStop: PidStop;
}): {
  totalMinutes: number;
  originStop: PidStop;
  originWalkMinutes: number;
  schoolWalkMinutes: number;
  transitMinutes: number;
  transferMinutes: number;
} {
  const WALK_KMPH = 4.8;
  const TRANSIT_KMPH = 22;
  const WAIT_BUFFER = 4;

  const schoolWalkKm = haversineKm(params.schoolPoint, {
    lat: params.schoolStop.lat,
    lon: params.schoolStop.lon,
  });
  const schoolWalkMinutes = (schoolWalkKm / WALK_KMPH) * 60;

  let best: {
    total: number;
    originStop: PidStop;
    originWalkMinutes: number;
    transitMinutes: number;
    transferMinutes: number;
  } | null = null;

  for (const originStopInfo of params.originStops) {
    const transitKm = haversineKm(
      { lat: originStopInfo.stop.lat, lon: originStopInfo.stop.lon },
      { lat: params.schoolStop.lat, lon: params.schoolStop.lon },
    );
    const transitMinutes = (transitKm / TRANSIT_KMPH) * 60;
    const transferMinutes = 3 + Math.min(8, transitKm / 2.5);
    const originWalkMinutes = (originStopInfo.distanceKm / WALK_KMPH) * 60;

    const total = originWalkMinutes + transitMinutes + schoolWalkMinutes + WAIT_BUFFER + transferMinutes;
    if (!best || total < best.total) {
      best = {
        total,
        originStop: originStopInfo.stop,
        originWalkMinutes,
        transitMinutes,
        transferMinutes,
      };
    }
  }

  return {
    totalMinutes: Math.round((best?.total ?? Number.POSITIVE_INFINITY) * 10) / 10,
    originStop: best?.originStop ?? params.originStops[0].stop,
    originWalkMinutes: Math.round((best?.originWalkMinutes ?? 0) * 10) / 10,
    schoolWalkMinutes: Math.round(schoolWalkMinutes * 10) / 10,
    transitMinutes: Math.round((best?.transitMinutes ?? 0) * 10) / 10,
    transferMinutes: Math.round((best?.transferMinutes ?? 0) * 10) / 10,
  };
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export async function POST(request: NextRequest) {
  let payload: SearchRequest = {};
  try {
    payload = (await request.json()) as SearchRequest;
  } catch {
    return NextResponse.json({ error: 'Neplatný JSON payload.' }, { status: 400 });
  }

  const address = (payload.address ?? '').trim();
  const maxMinutesRaw = Number(payload.maxMinutes ?? DEFAULT_MAX_MINUTES);
  const limitRaw = Number(payload.limit);
  const maxMinutes = Number.isFinite(maxMinutesRaw) ? Math.max(5, Math.min(180, maxMinutesRaw)) : DEFAULT_MAX_MINUTES;
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(MAX_LIMIT, limitRaw)) : null;

  if (!address) {
    return NextResponse.json({ error: 'Zadejte výchozí adresu v Praze.' }, { status: 400 });
  }

  try {
    const [schools, stops] = await Promise.all([
      loadPrahaSchools(),
      loadPidStops(),
    ]);

    if (schools.length === 0) {
      return NextResponse.json({ error: 'Nepodařilo se načíst pražské školy.' }, { status: 500 });
    }
    if (stops.length === 0) {
      return NextResponse.json({ error: 'Nepodařilo se načíst PID zastávky.' }, { status: 502 });
    }

    const originGeocode = await geocodeAddress(`${address}, Praha, Česko`);
    if (!originGeocode) {
      return NextResponse.json({
        error: 'Nepodařilo se geokódovat zadanou adresu. Zkuste přesnější zadání.',
      }, { status: 422 });
    }

    const originStops = findNearestStops(originGeocode.point, stops, 6);
    const stopTokenIndex = getPidStopTokenIndex(stops);

    const schoolLocations = new Map<string, SchoolLocation>();
    const unresolvedSchools: PrahaSchool[] = [];

    for (const school of schools) {
      const cacheHit = geocodeCache.get(normalizeText(school.adresa));
      if (cacheHit) {
        schoolLocations.set(school.key, { point: cacheHit.point, source: 'cache' });
        continue;
      }

      const street = pickStreet(school.adresa, school.ulice);
      const matchedStop = matchStopByStreet(street, stops, stopTokenIndex);
      if (matchedStop) {
        schoolLocations.set(school.key, {
          point: { lat: matchedStop.lat, lon: matchedStop.lon },
          source: 'street_stop_match',
        });
      } else {
        unresolvedSchools.push(school);
      }
    }

    const districtNorm = normalizeText(originGeocode.district ?? '');
    unresolvedSchools.sort((a, b) => {
      const aDistrict = normalizeText(a.mestskaCast ?? '');
      const bDistrict = normalizeText(b.mestskaCast ?? '');
      const aScore = districtNorm && aDistrict && aDistrict.includes(districtNorm) ? 1 : 0;
      const bScore = districtNorm && bDistrict && bDistrict.includes(districtNorm) ? 1 : 0;
      if (aScore !== bScore) return bScore - aScore;
      return a.nazev.localeCompare(b.nazev, 'cs');
    });

    let geocodedThisRequest = 0;
    for (const school of unresolvedSchools.slice(0, MAX_GEOCODES_PER_REQUEST)) {
      const geo = await geocodeAddress(`${school.adresa}, Praha, Česko`);
      if (!geo) continue;
      geocodedThisRequest += 1;
      schoolLocations.set(school.key, { point: geo.point, source: 'geocoded' });
    }

    // Fallback: centroid podle městské části z již vyřešených škol.
    const districtPoints = new Map<string, Point[]>();
    for (const school of schools) {
      const loc = schoolLocations.get(school.key);
      if (!loc || !school.mestskaCast) continue;
      const key = normalizeText(school.mestskaCast);
      if (!key) continue;
      if (!districtPoints.has(key)) districtPoints.set(key, []);
      districtPoints.get(key)!.push(loc.point);
    }

    const districtCentroids = new Map<string, Point>();
    for (const [districtKey, points] of districtPoints) {
      const lat = average(points.map(p => p.lat));
      const lon = average(points.map(p => p.lon));
      if (lat !== null && lon !== null) {
        districtCentroids.set(districtKey, { lat, lon });
      }
    }

    for (const school of schools) {
      if (schoolLocations.has(school.key)) continue;
      const districtKey = normalizeText(school.mestskaCast ?? '');
      if (!districtKey) continue;
      const centroid = districtCentroids.get(districtKey);
      if (!centroid) continue;
      schoolLocations.set(school.key, { point: centroid, source: 'district_centroid' });
    }

    const reachable = [];
    for (const school of schools) {
      const loc = schoolLocations.get(school.key);
      if (!loc) continue;

      const nearestSchoolStop = findNearestStops(loc.point, stops, 1)[0];
      if (!nearestSchoolStop) continue;

      const estimate = estimateTripMinutes({
        originPoint: originGeocode.point,
        originStops,
        schoolPoint: loc.point,
        schoolStop: nearestSchoolStop.stop,
      });

      if (!Number.isFinite(estimate.totalMinutes)) continue;
      if (estimate.totalMinutes > maxMinutes) continue;

      const schoolPointDistanceKm = haversineKm(originGeocode.point, loc.point);
      reachable.push({
        redizo: school.redizo,
        nazev: school.nazev,
        adresa: school.adresa,
        mestskaCast: school.mestskaCast,
        estimatedMinutes: estimate.totalMinutes,
        distanceKm: Math.round(schoolPointDistanceKm * 10) / 10,
        source: loc.source,
        originStop: estimate.originStop.name,
        schoolStop: nearestSchoolStop.stop.name,
        originWalkMinutes: estimate.originWalkMinutes,
        transitMinutes: estimate.transitMinutes,
        transferMinutes: estimate.transferMinutes,
        schoolWalkMinutes: estimate.schoolWalkMinutes,
        oboryPreview: school.obory.slice(0, 4),
        oboryCount: school.obory.length,
        minBodyMin: school.minBodyMin,
        indexPoptavkyAvg: school.indexPoptavkyAvg !== null
          ? Math.round(school.indexPoptavkyAvg * 100) / 100
          : null,
      });
    }

    reachable.sort((a, b) => {
      if (a.estimatedMinutes !== b.estimatedMinutes) {
        return a.estimatedMinutes - b.estimatedMinutes;
      }
      return a.nazev.localeCompare(b.nazev, 'cs');
    });

    const resolvedSchools = schoolLocations.size;
    const unresolvedSchoolsCount = schools.length - resolvedSchools;

    return NextResponse.json({
      input: {
        address,
        maxMinutes,
      },
      origin: {
        lat: originGeocode.point.lat,
        lon: originGeocode.point.lon,
        displayName: originGeocode.displayName,
      },
      nearbyStops: originStops.map(item => ({
        name: item.stop.name,
        distanceMeters: Math.round(item.distanceKm * 1000),
      })),
      reachableSchools: limit ? reachable.slice(0, limit) : reachable,
      diagnostics: {
        totalSchools: schools.length,
        resolvedSchools,
        unresolvedSchools: unresolvedSchoolsCount,
        geocodedThisRequest,
        model: 'pid-stop-based-estimate-v1',
        notes: [
          'Výpočet používá PID stop list (open data) + geokódování adres a odhad jízdní doby mezi zastávkami.',
          'Nejde o přesný jízdní řád. Pro produkční přesnost doporučujeme GTFS Connection Scan / RAPTOR precompute.',
        ],
      },
      sources: {
        pidStops: 'https://data.pid.cz/stops/json/stops.json',
        pidOpenDataInfo: 'https://pid.cz/en/opendata/',
      },
    });
  } catch (error) {
    console.error('Praha dostupnost API error:', error);
    return NextResponse.json({
      error: 'Nepodařilo se spočítat dostupnost. Zkuste to prosím znovu.',
    }, { status: 500 });
  }
}
