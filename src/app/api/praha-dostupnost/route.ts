import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createSlug } from '@/lib/utils';

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
  lineLabels: string[];
};

type PrahaSchool = {
  key: string;
  redizo: string;
  nazevRaw: string;
  nazev: string;
  adresa: string;
  ulice?: string;
  mestskaCast?: string | null;
  obory: string[];
  minBodyMin: number | null;
  indexPoptavkyAvg: number | null;
  simulatorSchoolId: string | null;
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
  page?: number;
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
const MAX_GEOCODES_PER_REQUEST = 24;
const GEOCODE_TIMEOUT_MS = 2500;
const GEOCODE_CONCURRENCY = 6;
const PAGE_SIZE = 50;

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
let pidLineToStopIndicesCache: Map<string, number[]> | null = null;

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
    nazevRaw: string;
    nazev: string;
    adresa: string;
    ulice?: string;
    mestskaCast?: string | null;
    obory: Set<string>;
    minBodyMin: number | null;
    indexPoptavkySum: number;
    indexPoptavkyCount: number;
    simulatorSchoolId: string | null;
    simulatorSchoolMinBody: number | null;
  }>();

  for (const row of yearData) {
    const krajKod = String(row.kraj_kod ?? '').trim();
    const obec = String(row.obec ?? '').trim();
    if (krajKod !== 'CZ010' && normalizeText(obec) !== 'praha') continue;

    const redizo = String(row.redizo ?? '').trim();
    const nazevRaw = String(row.nazev ?? '').trim();
    const nazev = String(row.nazev_display ?? row.nazev ?? '').trim();
    const adresa = String(row.adresa_plna ?? row.adresa ?? '').trim();
    const ulice = String(row.ulice ?? '').trim() || undefined;
    const mestskaCastRaw = String(row.mestska_cast ?? '').trim();
    const mestskaCast = mestskaCastRaw.length > 0 ? mestskaCastRaw : null;
    const schoolId = String(row.id ?? '').trim();

    if (!redizo || !nazev || !adresa) continue;

    const key = `${redizo}|${adresa}`;
    if (!map.has(key)) {
      map.set(key, {
        redizo,
        nazevRaw: nazevRaw || nazev,
        nazev,
        adresa,
        ulice,
        mestskaCast,
        obory: new Set<string>(),
        minBodyMin: null,
        indexPoptavkySum: 0,
        indexPoptavkyCount: 0,
        simulatorSchoolId: schoolId || null,
        simulatorSchoolMinBody: null,
      });
    }

    const item = map.get(key)!;
    const obor = String(row.obor ?? '').trim();
    if (obor) item.obory.add(obor);

    const minBody = toNumber(row.min_body);
    if (minBody !== null) {
      item.minBodyMin = item.minBodyMin === null ? minBody : Math.min(item.minBodyMin, minBody);
      if (!item.simulatorSchoolId || item.simulatorSchoolMinBody === null || minBody < item.simulatorSchoolMinBody) {
        item.simulatorSchoolId = schoolId || item.simulatorSchoolId;
        item.simulatorSchoolMinBody = minBody;
      }
    } else if (!item.simulatorSchoolId && schoolId) {
      item.simulatorSchoolId = schoolId;
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
    nazevRaw: value.nazevRaw,
    nazev: value.nazev,
    adresa: value.adresa,
    ulice: value.ulice,
    mestskaCast: value.mestskaCast,
    obory: Array.from(value.obory).sort((a, b) => a.localeCompare(b, 'cs')),
    minBodyMin: value.minBodyMin,
    indexPoptavkyAvg: value.indexPoptavkyCount > 0
      ? value.indexPoptavkySum / value.indexPoptavkyCount
      : null,
    simulatorSchoolId: value.simulatorSchoolId,
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

function normalizeLineLabel(raw: unknown): string | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const value = String(raw).trim().toUpperCase().replace(/\s+/g, '');
  if (!value) return null;
  if (value === '0') return null;
  if (value.startsWith('CZ')) return null;

  // Typické PID označení linek: 194, 22, A, B, C, S1, R9, N95, X-A apod.
  const valid = /^(?:[A-Z]{1,2}\d{1,3}|\d{1,3}[A-Z]?|[A-Z]{1,3}|N\d{1,3}|S\d{1,2}|R\d{1,2}|X\d{1,3})$/;
  if (!valid.test(value)) return null;

  return value;
}

function extractLineLabelsFromObject(value: unknown, keyHint = '', out = new Set<string>(), depth = 0): Set<string> {
  if (depth > 5 || value === null || value === undefined) return out;

  const hint = keyHint.toLowerCase();
  const shouldReadScalar =
    hint.includes('line') ||
    hint.includes('route') ||
    hint.includes('linka') ||
    hint.includes('publiccode') ||
    hint.includes('shortname') ||
    hint.includes('lineno') ||
    hint.includes('linenumber') ||
    hint === 'name';

  if (typeof value === 'string' || typeof value === 'number') {
    if (shouldReadScalar) {
      const normalized = normalizeLineLabel(value);
      if (normalized) out.add(normalized);
    }
    return out;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      extractLineLabelsFromObject(item, keyHint, out, depth + 1);
    }
    return out;
  }

  if (typeof value === 'object') {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      extractLineLabelsFromObject(nested, key, out, depth + 1);
    }
  }

  return out;
}

function deduplicateStops(stops: PidStop[]): PidStop[] {
  const map = new Map<string, PidStop>();

  for (const stop of stops) {
    const key = `${normalizeText(stop.name)}|${stop.lat.toFixed(5)}|${stop.lon.toFixed(5)}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, stop);
      continue;
    }

    if (stop.lineLabels.length > 0) {
      existing.lineLabels = Array.from(new Set([...existing.lineLabels, ...stop.lineLabels])).sort((a, b) => a.localeCompare(b));
    }
  }

  return Array.from(map.values());
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

    const lineLabels = Array.from(extractLineLabelsFromObject(c)).sort((a, b) => a.localeCompare(b));

    stops.push({
      name,
      municipality: typeof c.municipality === 'string' ? c.municipality : undefined,
      districtCode: typeof c.districtCode === 'string' ? c.districtCode : undefined,
      lat,
      lon,
      lineLabels,
    });
  }

  pidStopsCache = deduplicateStops(stops);
  pidStopTokenIndexCache = null;
  pidLineToStopIndicesCache = null;
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

function getPidLineToStopIndices(stops: PidStop[]): Map<string, number[]> {
  if (pidLineToStopIndicesCache) return pidLineToStopIndicesCache;

  const map = new Map<string, number[]>();
  for (let i = 0; i < stops.length; i += 1) {
    for (const line of stops[i].lineLabels) {
      if (!map.has(line)) map.set(line, []);
      map.get(line)!.push(i);
    }
  }

  pidLineToStopIndicesCache = map;
  return map;
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
    const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);

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

type StopDistanceInfo = {
  stop: PidStop;
  stopIndex: number;
  distanceKm: number;
};

type TransitPathInference = {
  routeType: 'direct' | 'transfer' | 'unknown';
  lines: string[];
  transferCount: number;
  transferStop?: string;
};

function findNearestStops(point: Point, stops: PidStop[], take: number): StopDistanceInfo[] {
  return stops
    .map((stop, stopIndex) => ({
      stop,
      stopIndex,
      distanceKm: haversineKm(point, { lat: stop.lat, lon: stop.lon }),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, take);
}

function inferTransitPath(
  origin: StopDistanceInfo,
  destination: StopDistanceInfo,
  stops: PidStop[],
  lineToStopIndices: Map<string, number[]>,
): TransitPathInference {
  const originLines = origin.stop.lineLabels;
  const destinationLines = destination.stop.lineLabels;

  if (originLines.length === 0 || destinationLines.length === 0) {
    return {
      routeType: 'unknown',
      lines: [],
      transferCount: 1,
    };
  }

  const destinationLineSet = new Set(destinationLines);
  const direct = originLines.filter(line => destinationLineSet.has(line));
  if (direct.length > 0) {
    return {
      routeType: 'direct',
      lines: direct.slice(0, 3),
      transferCount: 0,
    };
  }

  const originCandidates = originLines.slice(0, 10);
  const destinationCandidates = destinationLines.slice(0, 10);

  let bestTransfer: {
    lineA: string;
    lineB: string;
    transferStop: string;
    score: number;
  } | null = null;

  for (const lineA of originCandidates) {
    const aStops = lineToStopIndices.get(lineA);
    if (!aStops || aStops.length === 0) continue;
    const aSet = new Set(aStops);

    for (const lineB of destinationCandidates) {
      if (lineA === lineB) continue;
      const bStops = lineToStopIndices.get(lineB);
      if (!bStops || bStops.length === 0) continue;
      const bSet = new Set(bStops);

      const smaller = aStops.length <= bStops.length ? aStops : bStops;
      for (const candidateIndex of smaller) {
        if (!aSet.has(candidateIndex)) continue;
        if (!bSet.has(candidateIndex)) continue;

        const transfer = stops[candidateIndex];
        const score =
          haversineKm(
            { lat: origin.stop.lat, lon: origin.stop.lon },
            { lat: transfer.lat, lon: transfer.lon },
          ) +
          haversineKm(
            { lat: transfer.lat, lon: transfer.lon },
            { lat: destination.stop.lat, lon: destination.stop.lon },
          );

        if (!bestTransfer || score < bestTransfer.score) {
          bestTransfer = {
            lineA,
            lineB,
            transferStop: transfer.name,
            score,
          };
        }
      }
    }
  }

  if (bestTransfer) {
    return {
      routeType: 'transfer',
      lines: [bestTransfer.lineA, bestTransfer.lineB],
      transferCount: 1,
      transferStop: bestTransfer.transferStop,
    };
  }

  return {
    routeType: 'unknown',
    lines: Array.from(new Set([...originLines.slice(0, 2), ...destinationLines.slice(0, 2)])).slice(0, 4),
    transferCount: 1,
  };
}

function estimateTripMinutes(params: {
  originStops: StopDistanceInfo[];
  schoolPoint: Point;
  schoolStop: StopDistanceInfo;
  allStops: PidStop[];
  lineToStopIndices: Map<string, number[]>;
}): {
  totalMinutes: number;
  originStop: PidStop;
  originWalkMinutes: number;
  schoolWalkMinutes: number;
  transitMinutes: number;
  transferMinutes: number;
  routeType: TransitPathInference['routeType'];
  lines: string[];
  transferStop?: string;
} {
  const WALK_KMPH = 4.8;
  const TRANSIT_KMPH = 22;
  const WAIT_BUFFER = 4;

  const schoolWalkKm = haversineKm(params.schoolPoint, {
    lat: params.schoolStop.stop.lat,
    lon: params.schoolStop.stop.lon,
  });
  const schoolWalkMinutes = (schoolWalkKm / WALK_KMPH) * 60;

  let best: {
    baseTotal: number;
    transitKm: number;
    originStopInfo: StopDistanceInfo;
    originWalkMinutes: number;
    transitMinutes: number;
    genericTransferMinutes: number;
  } | null = null;

  for (const originStopInfo of params.originStops) {
    const transitKm = haversineKm(
      { lat: originStopInfo.stop.lat, lon: originStopInfo.stop.lon },
      { lat: params.schoolStop.stop.lat, lon: params.schoolStop.stop.lon },
    );
    const transitMinutes = (transitKm / TRANSIT_KMPH) * 60;
    const genericTransferMinutes = 4 + Math.min(4, transitKm / 5);
    const originWalkMinutes = (originStopInfo.distanceKm / WALK_KMPH) * 60;

    const baseTotal = originWalkMinutes + transitMinutes + schoolWalkMinutes + WAIT_BUFFER + genericTransferMinutes;
    if (!best || baseTotal < best.baseTotal) {
      best = {
        baseTotal,
        transitKm,
        originStopInfo,
        originWalkMinutes,
        transitMinutes,
        genericTransferMinutes,
      };
    }
  }

  if (!best) {
    return {
      totalMinutes: Number.POSITIVE_INFINITY,
      originStop: params.originStops[0].stop,
      originWalkMinutes: 0,
      schoolWalkMinutes: 0,
      transitMinutes: 0,
      transferMinutes: 0,
      routeType: 'unknown',
      lines: [],
    };
  }

  const path = inferTransitPath(
    best.originStopInfo,
    params.schoolStop,
    params.allStops,
    params.lineToStopIndices,
  );

  let transferMinutes = best.genericTransferMinutes;
  if (path.routeType === 'direct') {
    transferMinutes = 1.5 + Math.min(3, best.transitKm / 5);
  } else if (path.routeType === 'transfer') {
    transferMinutes = 6 + Math.min(3, best.transitKm / 6);
  }

  const totalMinutes = best.originWalkMinutes + best.transitMinutes + schoolWalkMinutes + WAIT_BUFFER + transferMinutes;

  return {
    totalMinutes: Math.round(totalMinutes),
    originStop: best.originStopInfo.stop,
    originWalkMinutes: Math.round(best.originWalkMinutes),
    schoolWalkMinutes: Math.round(schoolWalkMinutes),
    transitMinutes: Math.round(best.transitMinutes),
    transferMinutes: Math.round(transferMinutes),
    routeType: path.routeType,
    lines: path.lines,
    transferStop: path.transferStop,
  };
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function quantile(sortedValues: number[], q: number): number | null {
  if (sortedValues.length === 0) return null;
  if (sortedValues.length === 1) return sortedValues[0];

  const clampedQ = Math.max(0, Math.min(1, q));
  const pos = (sortedValues.length - 1) * clampedQ;
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  if (lower === upper) return sortedValues[lower];
  const weight = pos - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  worker: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (values.length === 0) return [];
  const safeConcurrency = Math.max(1, Math.min(concurrency, values.length));
  const out = new Array<R>(values.length);
  let pointer = 0;

  async function run() {
    while (true) {
      const index = pointer;
      pointer += 1;
      if (index >= values.length) break;
      out[index] = await worker(values[index], index);
    }
  }

  await Promise.all(Array.from({ length: safeConcurrency }, () => run()));
  return out;
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
  const pageRaw = Number(payload.page ?? 1);
  const maxMinutes = Number.isFinite(maxMinutesRaw) ? Math.max(5, Math.min(180, maxMinutesRaw)) : DEFAULT_MAX_MINUTES;
  const requestedPage = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;

  if (!address) {
    return NextResponse.json({ error: 'Zadejte výchozí adresu v Praze.' }, { status: 400 });
  }

  try {
    const requestStartedAt = Date.now();
    const timings: Record<string, number> = {};

    let phaseStartedAt = Date.now();
    const [schools, stops] = await Promise.all([
      loadPrahaSchools(),
      loadPidStops(),
    ]);
    timings.loadDataMs = Date.now() - phaseStartedAt;

    if (schools.length === 0) {
      return NextResponse.json({ error: 'Nepodařilo se načíst pražské školy.' }, { status: 500 });
    }
    if (stops.length === 0) {
      return NextResponse.json({ error: 'Nepodařilo se načíst PID zastávky.' }, { status: 502 });
    }

    phaseStartedAt = Date.now();
    const originGeocode = await geocodeAddress(`${address}, Praha, Česko`);
    timings.geocodeOriginMs = Date.now() - phaseStartedAt;
    if (!originGeocode) {
      return NextResponse.json({
        error: 'Nepodařilo se geokódovat zadanou adresu. Zkuste přesnější zadání.',
      }, { status: 422 });
    }

    const originStops = findNearestStops(originGeocode.point, stops, 6);
    const stopTokenIndex = getPidStopTokenIndex(stops);
    const lineToStopIndices = getPidLineToStopIndices(stops);

    const schoolLocations = new Map<string, SchoolLocation>();
    const unresolvedSchools: PrahaSchool[] = [];

    phaseStartedAt = Date.now();
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
    timings.matchStreetStopMs = Date.now() - phaseStartedAt;

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
    const geocodeCandidates = unresolvedSchools.slice(0, MAX_GEOCODES_PER_REQUEST);

    phaseStartedAt = Date.now();
    const geocodedSchools = await mapWithConcurrency(
      geocodeCandidates,
      GEOCODE_CONCURRENCY,
      async (school) => {
        const geo = await geocodeAddress(`${school.adresa}, Praha, Česko`);
        return { school, geo };
      },
    );
    timings.geocodeSchoolsMs = Date.now() - phaseStartedAt;

    for (const item of geocodedSchools) {
      if (!item.geo) continue;
      geocodedThisRequest += 1;
      schoolLocations.set(item.school.key, { point: item.geo.point, source: 'geocoded' });
    }

    // Fallback: centroid podle městské části z již vyřešených škol.
    phaseStartedAt = Date.now();
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
    timings.districtFallbackMs = Date.now() - phaseStartedAt;

    phaseStartedAt = Date.now();
    const reachable = [];
    for (const school of schools) {
      const loc = schoolLocations.get(school.key);
      if (!loc) continue;

      const nearestSchoolStop = findNearestStops(loc.point, stops, 1)[0];
      if (!nearestSchoolStop) continue;

      const estimate = estimateTripMinutes({
        originStops,
        schoolPoint: loc.point,
        schoolStop: nearestSchoolStop,
        allStops: stops,
        lineToStopIndices,
      });

      if (!Number.isFinite(estimate.totalMinutes)) continue;

      const walkOnlyMinutes = Math.round((haversineKm(originGeocode.point, loc.point) / 4.8) * 60);
      const walkIsFaster = walkOnlyMinutes + 1 < estimate.totalMinutes;
      const fastestMinutes = walkIsFaster ? walkOnlyMinutes : estimate.totalMinutes;
      if (fastestMinutes > maxMinutes) continue;

      const schoolPointDistanceKm = haversineKm(originGeocode.point, loc.point);
      const schoolSlug = `${school.redizo}-${createSlug(school.nazevRaw || school.nazev)}`;
      reachable.push({
        redizo: school.redizo,
        nazev: school.nazev,
        adresa: school.adresa,
        mestskaCast: school.mestskaCast,
        estimatedMinutes: fastestMinutes,
        mhdMinutes: estimate.totalMinutes,
        walkOnlyMinutes,
        bestMode: walkIsFaster ? 'walk' : 'mhd',
        distanceKm: Math.round(schoolPointDistanceKm * 10) / 10,
        source: loc.source,
        originStop: estimate.originStop.name,
        schoolStop: nearestSchoolStop.stop.name,
        originWalkMinutes: estimate.originWalkMinutes,
        transitMinutes: estimate.transitMinutes,
        transferMinutes: estimate.transferMinutes,
        schoolWalkMinutes: estimate.schoolWalkMinutes,
        routeType: estimate.routeType,
        usedLines: estimate.lines,
        transferStop: estimate.transferStop,
        admissionBand: 'unknown' as 'very_high' | 'high' | 'medium' | 'low' | 'very_low' | 'unknown',
        oboryPreview: school.obory.slice(0, 4),
        oboryCount: school.obory.length,
        minBodyMin: school.minBodyMin,
        indexPoptavkyAvg: school.indexPoptavkyAvg !== null
          ? Math.round(school.indexPoptavkyAvg * 100) / 100
          : null,
        schoolUrl: `/skola/${schoolSlug}`,
        simulatorSchoolId: school.simulatorSchoolId,
      });
    }
    timings.computeReachableMs = Date.now() - phaseStartedAt;

    reachable.sort((a, b) => {
      if (a.estimatedMinutes !== b.estimatedMinutes) {
        return a.estimatedMinutes - b.estimatedMinutes;
      }
      return a.nazev.localeCompare(b.nazev, 'cs');
    });

    const minBodyValues = reachable
      .map(item => item.minBodyMin)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
      .sort((a, b) => a - b);

    const q20 = quantile(minBodyValues, 0.2);
    const q40 = quantile(minBodyValues, 0.4);
    const q60 = quantile(minBodyValues, 0.6);
    const q80 = quantile(minBodyValues, 0.8);

    const admissionThresholds = (q20 !== null && q40 !== null && q60 !== null && q80 !== null)
      ? {
          veryLowMax: Math.round(q20),
          lowMax: Math.round(q40),
          mediumMax: Math.round(q60),
          highMax: Math.round(q80),
        }
      : null;

    if (admissionThresholds) {
      for (const item of reachable) {
        if (item.minBodyMin === null) {
          item.admissionBand = 'unknown';
        } else if (item.minBodyMin >= admissionThresholds.highMax) {
          item.admissionBand = 'very_high';
        } else if (item.minBodyMin >= admissionThresholds.mediumMax) {
          item.admissionBand = 'high';
        } else if (item.minBodyMin >= admissionThresholds.lowMax) {
          item.admissionBand = 'medium';
        } else if (item.minBodyMin >= admissionThresholds.veryLowMax) {
          item.admissionBand = 'low';
        } else {
          item.admissionBand = 'very_low';
        }
      }
    }

    const totalItems = reachable.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const page = Math.max(1, Math.min(requestedPage, totalPages));
    const pageStart = (page - 1) * PAGE_SIZE;
    const pageItems = reachable.slice(pageStart, pageStart + PAGE_SIZE);

    const resolvedSchools = schoolLocations.size;
    const unresolvedSchoolsCount = schools.length - resolvedSchools;
    timings.totalMs = Date.now() - requestStartedAt;

    return NextResponse.json({
      input: {
        address,
        maxMinutes,
        page,
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
      reachableSchools: pageItems,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      legends: {
        admissionThresholds,
      },
      diagnostics: {
        totalSchools: schools.length,
        resolvedSchools,
        unresolvedSchools: unresolvedSchoolsCount,
        geocodedThisRequest,
        geocodeCandidates: geocodeCandidates.length,
        geocodeConcurrency: GEOCODE_CONCURRENCY,
        model: 'pid-stop-based-estimate-v1',
        timingsMs: timings,
        notes: [
          'Výpočet používá PID stop list (open data) + geokódování adres a odhad jízdní doby mezi zastávkami.',
          'Identifikace linek MHD je odhad z linek dostupných u výchozí a cílové zastávky (případně 1 přestup).',
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
