import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createSlug } from '@/lib/utils';

type Point = { lat: number; lon: number };

type TransitGraphData = {
  stops: Record<string, [string, number, number]>;
  edges: Record<string, [string, number][]>;
};

type SchoolLocationsData = {
  schools: Record<string, {
    stop_id: string;
    stop_name: string;
    lat: number;
    lon: number;
    distance_km: number;
  }>;
};

type SchoolDifficultyBand = 'very_high' | 'high' | 'medium' | 'low' | 'very_low' | 'unknown';

type DifficultyThresholds = {
  veryLowMax: number;
  lowMax: number;
  mediumMax: number;
  highMax: number;
};

type AggregatedSchool = {
  redizo: string;
  nazevRaw: string;
  nazev: string;
  adresa: string;
  obec: string;
  kraj: string;
  typ: string;
  obory: string[];
  minBodyMin: number | null;
  difficultyScore: number | null;
  simulatorSchoolId: string | null;
};

type SearchRequest = {
  stopId?: string;
  maxMinutes?: number;
  page?: number;
};

const PAGE_SIZE = 50;
const WALK_SPEED_KMPH = 5.0;
const MAX_WALK_DISTANCE_KM = 1.5;

let graphCache: TransitGraphData | null = null;
let schoolLocationsCache: SchoolLocationsData | null = null;
let allSchoolsCache: AggregatedSchool[] | null = null;
let difficultyThresholdsCache: DifficultyThresholds | null = null;
// Index: stopId → [{redizo, distance_km, schoolLat, schoolLon}]
let stopToSchoolsIndex: Map<string, Array<{ redizo: string; distanceKm: number; lat: number; lon: number }>> | null = null;

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
  const q = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
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

function roundToOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function getDifficultyBand(
  difficultyScore: number | null,
  thresholds: DifficultyThresholds | null,
): SchoolDifficultyBand {
  if (difficultyScore === null || thresholds === null) return 'unknown';
  if (difficultyScore >= thresholds.highMax) return 'very_high';
  if (difficultyScore >= thresholds.mediumMax) return 'high';
  if (difficultyScore >= thresholds.lowMax) return 'medium';
  if (difficultyScore >= thresholds.veryLowMax) return 'low';
  return 'very_low';
}

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function pickYearData(data: Record<string, unknown>): Record<string, unknown>[] {
  const year2025 = ensureArray<Record<string, unknown>>(data['2025']);
  const year2024 = ensureArray<Record<string, unknown>>(data['2024']);
  return year2025.length > 0 ? year2025 : year2024;
}

async function loadGraph(): Promise<TransitGraphData> {
  if (graphCache) return graphCache;
  const filePath = path.join(process.cwd(), 'data', 'transit_graph.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  graphCache = JSON.parse(raw) as TransitGraphData;
  return graphCache;
}

async function loadSchoolLocations(): Promise<SchoolLocationsData> {
  if (schoolLocationsCache) return schoolLocationsCache;
  const filePath = path.join(process.cwd(), 'data', 'school_locations.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  schoolLocationsCache = JSON.parse(raw) as SchoolLocationsData;
  return schoolLocationsCache;
}

async function loadAllSchools(): Promise<AggregatedSchool[]> {
  if (allSchoolsCache) return allSchoolsCache;

  const filePath = path.join(process.cwd(), 'public', 'schools_data.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const yearData = pickYearData(parsed);

  const redizoDifficultyMap = new Map<string, number>();
  try {
    const analysisPath = path.join(process.cwd(), 'public', 'school_analysis.json');
    const analysisRaw = await fs.readFile(analysisPath, 'utf-8');
    const analysisParsed = JSON.parse(analysisRaw) as Record<string, unknown>;
    const diffAgg = new Map<string, { sum: number; count: number }>();

    for (const entry of Object.values(analysisParsed)) {
      if (!entry || typeof entry !== 'object') continue;
      const row = entry as Record<string, unknown>;
      const redizo = String(row.redizo ?? '').trim();
      const obtiznost = toNumber(row.obtiznost);
      if (!redizo || obtiznost === null) continue;
      if (!diffAgg.has(redizo)) diffAgg.set(redizo, { sum: 0, count: 0 });
      const item = diffAgg.get(redizo)!;
      item.sum += obtiznost;
      item.count += 1;
    }

    for (const [redizo, stats] of diffAgg.entries()) {
      if (stats.count <= 0) continue;
      redizoDifficultyMap.set(redizo, stats.sum / stats.count);
    }
  } catch {
    // analysis unavailable
  }

  const map = new Map<string, {
    redizo: string;
    nazevRaw: string;
    nazev: string;
    adresa: string;
    obec: string;
    kraj: string;
    typ: string;
    obory: Set<string>;
    minBodyMin: number | null;
    simulatorSchoolId: string | null;
    simulatorSchoolMinBody: number | null;
  }>();

  for (const row of yearData) {
    const redizo = String(row.redizo ?? '').trim();
    const nazevRaw = String(row.nazev ?? '').trim();
    const nazev = String(row.nazev_display ?? row.nazev ?? '').trim();
    const adresa = String(row.adresa_plna ?? row.adresa ?? '').trim();
    const obec = String(row.obec ?? '').trim();
    const kraj = String(row.kraj ?? '').trim();
    const typ = String(row.typ ?? '').trim();
    const schoolId = String(row.id ?? '').trim();

    if (!redizo || !nazev) continue;

    if (!map.has(redizo)) {
      map.set(redizo, {
        redizo,
        nazevRaw: nazevRaw || nazev,
        nazev,
        adresa,
        obec,
        kraj,
        typ,
        obory: new Set<string>(),
        minBodyMin: null,
        simulatorSchoolId: schoolId || null,
        simulatorSchoolMinBody: null,
      });
    }

    const item = map.get(redizo)!;
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
  }

  allSchoolsCache = Array.from(map.values()).map((value) => ({
    redizo: value.redizo,
    nazevRaw: value.nazevRaw,
    nazev: value.nazev,
    adresa: value.adresa,
    obec: value.obec,
    kraj: value.kraj,
    typ: value.typ,
    obory: Array.from(value.obory).sort((a, b) => a.localeCompare(b, 'cs')),
    minBodyMin: value.minBodyMin,
    difficultyScore: redizoDifficultyMap.get(value.redizo) ?? null,
    simulatorSchoolId: value.simulatorSchoolId,
  }));

  const difficultyValues = allSchoolsCache
    .map((item) => item.difficultyScore)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    .sort((a, b) => a - b);

  const q20 = quantile(difficultyValues, 0.2);
  const q40 = quantile(difficultyValues, 0.4);
  const q60 = quantile(difficultyValues, 0.6);
  const q80 = quantile(difficultyValues, 0.8);

  difficultyThresholdsCache = (q20 !== null && q40 !== null && q60 !== null && q80 !== null)
    ? { veryLowMax: roundToOne(q20), lowMax: roundToOne(q40), mediumMax: roundToOne(q60), highMax: roundToOne(q80) }
    : null;

  return allSchoolsCache;
}

function buildStopToSchoolsIndex(
  schoolLocations: SchoolLocationsData,
  graph: TransitGraphData,
): Map<string, Array<{ redizo: string; distanceKm: number; lat: number; lon: number }>> {
  if (stopToSchoolsIndex) return stopToSchoolsIndex;

  const index = new Map<string, Array<{ redizo: string; distanceKm: number; lat: number; lon: number }>>();

  // Pre-compute lat/lon bounding box margin for MAX_WALK_DISTANCE_KM
  // 1.5 km ≈ 0.0135° lat, ≈ 0.022° lon at 50°N
  const LAT_MARGIN = 0.015;
  const LON_MARGIN = 0.025;

  // Build spatial grid for stops (cell size ~0.02° ≈ 2km)
  const CELL_SIZE = 0.02;
  const stopGrid = new Map<string, Array<[string, number, number]>>();
  for (const [stopId, [, stopLat, stopLon]] of Object.entries(graph.stops)) {
    const cellKey = `${Math.floor(stopLat / CELL_SIZE)},${Math.floor(stopLon / CELL_SIZE)}`;
    if (!stopGrid.has(cellKey)) stopGrid.set(cellKey, []);
    stopGrid.get(cellKey)!.push([stopId, stopLat, stopLon]);
  }

  for (const [redizo, schoolLoc] of Object.entries(schoolLocations.schools)) {
    const primaryStopId = schoolLoc.stop_id;
    const schoolLat = schoolLoc.lat;
    const schoolLon = schoolLoc.lon;

    // Add primary mapped stop
    if (!index.has(primaryStopId)) index.set(primaryStopId, []);
    index.get(primaryStopId)!.push({
      redizo,
      distanceKm: schoolLoc.distance_km,
      lat: schoolLat,
      lon: schoolLon,
    });

    // Check nearby grid cells
    const minCellLat = Math.floor((schoolLat - LAT_MARGIN) / CELL_SIZE);
    const maxCellLat = Math.floor((schoolLat + LAT_MARGIN) / CELL_SIZE);
    const minCellLon = Math.floor((schoolLon - LON_MARGIN) / CELL_SIZE);
    const maxCellLon = Math.floor((schoolLon + LON_MARGIN) / CELL_SIZE);

    for (let cLat = minCellLat; cLat <= maxCellLat; cLat++) {
      for (let cLon = minCellLon; cLon <= maxCellLon; cLon++) {
        const cellStops = stopGrid.get(`${cLat},${cLon}`);
        if (!cellStops) continue;

        for (const [stopId, stopLat, stopLon] of cellStops) {
          if (stopId === primaryStopId) continue;
          const dist = haversineKm({ lat: schoolLat, lon: schoolLon }, { lat: stopLat, lon: stopLon });
          if (dist <= MAX_WALK_DISTANCE_KM) {
            if (!index.has(stopId)) index.set(stopId, []);
            index.get(stopId)!.push({ redizo, distanceKm: dist, lat: schoolLat, lon: schoolLon });
          }
        }
      }
    }
  }

  stopToSchoolsIndex = index;
  return index;
}

function dijkstra(
  edges: Record<string, [string, number][]>,
  startId: string,
  maxMinutes: number,
): Map<string, number> {
  const dist = new Map<string, number>();
  dist.set(startId, 0);
  const visited = new Set<string>();

  // Simple priority queue using sorted array — sufficient for 36k nodes
  const pq: [number, string][] = [[0, startId]];

  while (pq.length > 0) {
    // Find minimum (avoid full sort: just find min index)
    let minIdx = 0;
    for (let i = 1; i < pq.length; i++) {
      if (pq[i][0] < pq[minIdx][0]) minIdx = i;
    }
    const [d, u] = pq[minIdx];
    pq[minIdx] = pq[pq.length - 1];
    pq.pop();

    if (visited.has(u)) continue;
    visited.add(u);
    if (d > maxMinutes) continue;

    const neighbors = edges[u];
    if (!neighbors) continue;

    for (const [neighbor, travelTime] of neighbors) {
      const nd = d + travelTime;
      if (nd > maxMinutes) continue;
      if (!dist.has(neighbor) || nd < dist.get(neighbor)!) {
        dist.set(neighbor, nd);
        pq.push([nd, neighbor]);
      }
    }
  }

  return dist;
}

export async function POST(request: NextRequest) {
  let payload: SearchRequest = {};
  try {
    payload = (await request.json()) as SearchRequest;
  } catch {
    return NextResponse.json({ error: 'Neplatný JSON payload.' }, { status: 400 });
  }

  const stopId = (payload.stopId ?? '').trim();
  const maxMinutesRaw = Number(payload.maxMinutes ?? 60);
  const pageRaw = Number(payload.page ?? 1);
  const maxMinutes = Number.isFinite(maxMinutesRaw) ? Math.max(5, Math.min(180, maxMinutesRaw)) : 60;
  const requestedPage = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;

  if (!stopId) {
    return NextResponse.json({ error: 'Vyberte výchozí zastávku.' }, { status: 400 });
  }

  try {
    const requestStartedAt = Date.now();
    const timings: Record<string, number> = {};

    let phaseStart = Date.now();
    const [graph, schoolLocations, schools] = await Promise.all([
      loadGraph(),
      loadSchoolLocations(),
      loadAllSchools(),
    ]);
    timings.loadDataMs = Date.now() - phaseStart;

    if (!graph.stops[stopId]) {
      return NextResponse.json({ error: 'Zadaná zastávka nebyla nalezena v grafu.' }, { status: 404 });
    }

    const [startName, startLat, startLon] = graph.stops[stopId];

    phaseStart = Date.now();
    const reachableStops = dijkstra(graph.edges, stopId, maxMinutes);
    timings.dijkstraMs = Date.now() - phaseStart;

    phaseStart = Date.now();
    const stopSchoolIndex = buildStopToSchoolsIndex(schoolLocations, graph);
    timings.buildIndexMs = Date.now() - phaseStart;

    phaseStart = Date.now();
    const schoolsMap = new Map(schools.map((s) => [s.redizo, s]));

    // For each school find the best reachable stop
    const bestSchoolTimes = new Map<string, {
      transitMinutes: number;
      walkMinutes: number;
      totalMinutes: number;
      stopId: string;
      stopName: string;
    }>();

    for (const [reachableStopId, transitMin] of reachableStops) {
      const nearbySchools = stopSchoolIndex.get(reachableStopId);
      if (!nearbySchools) continue;

      const stopInfo = graph.stops[reachableStopId];
      if (!stopInfo) continue;
      const stopName = stopInfo[0];

      for (const { redizo, distanceKm } of nearbySchools) {
        if (distanceKm > MAX_WALK_DISTANCE_KM) continue;
        const walkMin = (distanceKm / WALK_SPEED_KMPH) * 60;
        const totalMin = transitMin + walkMin;
        if (totalMin > maxMinutes) continue;

        const existing = bestSchoolTimes.get(redizo);
        if (!existing || totalMin < existing.totalMinutes) {
          bestSchoolTimes.set(redizo, {
            transitMinutes: transitMin,
            walkMinutes: Math.round(walkMin * 10) / 10,
            totalMinutes: Math.round(totalMin * 10) / 10,
            stopId: reachableStopId,
            stopName,
          });
        }
      }
    }
    timings.findSchoolsMs = Date.now() - phaseStart;

    phaseStart = Date.now();
    const reachableSchools: Array<Record<string, unknown>> = [];

    for (const [redizo, timing] of bestSchoolTimes) {
      const school = schoolsMap.get(redizo);
      if (!school) continue;

      const schoolSlug = `${school.redizo}-${createSlug(school.nazevRaw || school.nazev)}`;
      reachableSchools.push({
        redizo: school.redizo,
        nazev: school.nazev,
        obec: school.obec,
        kraj: school.kraj,
        typ: school.typ,
        estimatedMinutes: Math.round(timing.totalMinutes),
        stopName: timing.stopName,
        transitMinutes: timing.transitMinutes,
        walkMinutes: Math.round(timing.walkMinutes),
        admissionBand: getDifficultyBand(school.difficultyScore, difficultyThresholdsCache),
        oboryPreview: school.obory.slice(0, 4),
        oboryCount: school.obory.length,
        minBodyMin: school.minBodyMin,
        difficultyScore: school.difficultyScore !== null ? roundToOne(school.difficultyScore) : null,
        schoolUrl: `/skola/${schoolSlug}`,
        simulatorSchoolId: school.simulatorSchoolId,
      });
    }

    reachableSchools.sort((a, b) => {
      const aMin = a.estimatedMinutes as number;
      const bMin = b.estimatedMinutes as number;
      if (aMin !== bMin) return aMin - bMin;
      return (a.nazev as string).localeCompare(b.nazev as string, 'cs');
    });
    timings.sortMs = Date.now() - phaseStart;

    const totalItems = reachableSchools.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const page = Math.max(1, Math.min(requestedPage, totalPages));
    const pageStart = (page - 1) * PAGE_SIZE;
    const pageItems = reachableSchools.slice(pageStart, pageStart + PAGE_SIZE);

    timings.totalMs = Date.now() - requestStartedAt;

    return NextResponse.json({
      input: {
        stopId,
        stopName: startName,
        maxMinutes,
        page,
      },
      origin: {
        stopId,
        stopName: startName,
        lat: startLat,
        lon: startLon,
      },
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
        admissionThresholds: difficultyThresholdsCache,
      },
      diagnostics: {
        totalSchoolsInDb: schools.length,
        reachableStopCount: reachableStops.size,
        model: 'dijkstra-transit-graph-v1',
        timingsMs: timings,
        notes: [
          'Výpočet používá Dijkstra shortest path na celostátním GTFS transit grafu (spojenka.cz).',
          'Časy hran v grafu jsou průměrné jízdní doby mezi zastávkami.',
          'Chůze ze zastávky ke škole je počítána rychlostí 5 km/h, max 1,5 km.',
          'Nejde o přesný jízdní řád — nezohledňuje čekání na spoje ani přestupní časy.',
          'Pro přesnější výsledky doporučujeme ověřit konkrétní spojení na spojenka.cz.',
        ],
      },
    });
  } catch (error) {
    console.error('Dostupnost API error:', error);
    return NextResponse.json({
      error: 'Nepodařilo se spočítat dostupnost. Zkuste to prosím znovu.',
    }, { status: 500 });
  }
}
